  const express = require('express');
  const router = express.Router({ mergeParams: true });
  const Session = require('../models/Session');
  const Case = require('../models/Case');
  const { decrypt } = require('../utils/encryption');
  const OpenAI = require('openai').default;
  const crypto = require('crypto');

  // Simple in-memory cache for Groq responses
  // Key: md5 hash of depositsPayload + baseLayer
  // Value: The full timeline/forensic structured response
  const serverCache = new Map();

  // ──────────────────────────────────────────────
  //  Prama Narrative Architect – Compact System Instruction
  // ──────────────────────────────────────────────
  const SYSTEM_INSTRUCTION = `You are a Forensic Legal AI and Expert Translator. You transform fragmented, multilingual memory deposits into a structured, English-only legal chronology.

### PRIMARY DIRECTIVE:
For every memory deposit provided, you MUST perform two simultaneous actions:
1. TRANSLATION: If the text is in Hindi, Hinglish, or any other language, translate it into clear, formal English. You MUST retain the first-person ("I") perspective.
2. CHRONOLOGY: Use the "Base Layer" anchors to calculate the exact YYYY-MM-DD date.

### THE TRANSLATION PROTOCOL:
- FIELD "english": This field MUST be 100% English. No Hindi script allowed. 
- Example (Hindi): "gaadi se utri tab tk subah ho chuki thi" -> "By the time I got out of the car, it was already morning."
- Example (English): "I saw him" -> "I saw him."

### THE TEMPORAL LOGIC PROTOCOL:
- Use the "Base Layer" provided in the User Message as your calendar skeleton.
- "Diwali (Nov 1, 2025)" + "two days after" = "2025-11-03".
- "New Year's Eve" = Dec 31. "New Year's morning" = Jan 01 (next year).
- If "Known Window" is 2026 and text says "Valentine's Day", date is "2026-02-14".
- "PRECISION" RULES:
    - "Exact": Specific date found.
    - "Approximate": Only month/season/vague time (e.g., "In the summer").
    - "Relative": Anchored to a holiday/event but exact day is a guess.
    - "None": No time markers at all (date = null).

### OUTPUT RULES:
- Output ONLY a raw JSON object. 
- No conversation, no markdown backticks, no "Here is your JSON".
- Ensure every "id" from the input is accounted for.

### FORMAT:
{
  "deposits": [
    {
      "id": "original_id",
      "english": "Translated English Text",
      "date": "YYYY-MM-DD or null",
      "precision": "Exact|Approximate|Relative|None",
      "tag": "original_tag"
    }
  ]
}`;

  // ──────────────────────────────────────────────
  //  Robust JSON extractor
  // ──────────────────────────────────────────────
  function extractJSON(raw) {
    let cleaned = raw
      .replace(/```json[\s\S]*?```/g, m => m.replace(/```json|```/g, ''))
      .replace(/```[\s\S]*?```/g,    m => m.replace(/```/g, ''))
      .trim();

    const jsonStart = cleaned.indexOf('{');
    const jsonEnd   = cleaned.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error(`No JSON object found in model response. Raw preview: ${raw.slice(0, 300)}`);
    }
    return cleaned.slice(jsonStart, jsonEnd + 1);
  }

  // ──────────────────────────────────────────────
  //  POST /api/cases/:caseId/stitch/generate
  // ──────────────────────────────────────────────
  router.post('/generate', async (req, res) => {
    try {
      const caseId = decodeURIComponent(req.params.caseId);
      console.log('[STITCH] 1. Request received for:', caseId);
      console.log('[STITCH] GROQ_API_KEY present:', !!process.env.GROQ_API_KEY);

      if (!process.env.GROQ_API_KEY) {
        return res.status(500).json({ error: 'GROQ_API_KEY is missing.' });
      }

      // 1. Fetch Case
      console.log('[STITCH] 2. Fetching case from MongoDB...');
      const caseData = await Case.findOne({ caseId });
      if (!caseData) {
        return res.status(404).json({ error: `Case not found: "${caseId}"` });
      }
      console.log('[STITCH] 3. Case found:', caseData.clientName);

      const baseLayer = {
        startDate:            caseData.baseLayer?.startDate            || null,
        endDate:              caseData.baseLayer?.endDate              || null,
        location:             caseData.baseLayer?.location             || null,
        jurisdiction:         caseData.baseLayer?.jurisdiction         || null,
        knownWindow:          caseData.baseLayer?.knownWindow          || null,
        anchorDays:           caseData.baseLayer?.anchorDays           || null,
        environmentalContext: caseData.baseLayer?.environmentalContext || null,
      };

      // 2. Fetch & decrypt deposits
      console.log('[STITCH] 4. Fetching sessions...');
      const sessions = await Session.find({ caseId }).sort({ timestamp: 1 });
      console.log('[STITCH] 5. Sessions found:', sessions.length);
      if (!sessions || sessions.length === 0) {
        return res.status(400).json({ error: 'No sessions found to stitch. Please record deposits first.' });
      }

      const memoryDeposits = [];
      let decryptionFailures = 0;

      sessions.forEach((s, sIdx) => {
        s.deposits.forEach(d => {
          try {
            const decryptedContent = decrypt(d.content);
            memoryDeposits.push({
              depositId:    d._id.toString(),
              sessionIndex: sIdx + 1,
              sensoryTag:   d.sensoryTag,
              timestamp:    d.addedAt ? d.addedAt.toISOString() : null,
              content:      decryptedContent,
              attachments:  d.attachments || [],
            });
          } catch (e) {
            decryptionFailures++;
            console.error(`[STITCH] Decryption failed for deposit ${d._id}:`, e.message);
          }
        });
      });
      console.log('[STITCH] 6. Deposits decrypted:', memoryDeposits.length, '| Failures:', decryptionFailures);

      if (memoryDeposits.length === 0) {
        return res.status(500).json({
          error: 'All deposits failed to decrypt.',
          details: `ENCRYPTION_KEY in your .env may have changed since deposits were saved. ${decryptionFailures} deposit(s) affected.`,
        });
      }

      const currentDate = new Date().toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });

      const depositsPayload = memoryDeposits.map(d => ({
        id:   d.depositId,
        tag:  d.sensoryTag,
        ts:   d.timestamp,
        text: d.content,
      }));

      const currentPayloadString = JSON.stringify({ baseLayer, depositsPayload });
      const cacheKey = crypto.createHash('md5').update(currentPayloadString).digest('hex');

      const force = req.query.force === 'true';

      if (!force && serverCache.has(cacheKey)) {
        console.log('⚡ Using server-side cache for Groq (Deposits unchanged)');
        const cachedResponse = serverCache.get(cacheKey);
        return res.json({
          ...cachedResponse,
          meta: {
            caseId,
            clientName:    caseData.clientName,
            hearingDate:   caseData.hearingDate,
            totalDeposits: memoryDeposits.length,
            placements:    caseData.placements || [],
            baseLayer:     baseLayer,
          }
        });
      }

      // Build a simpler user message — just deposits + base layer, no complex instructions
      const userMessage = `TODAY'S DATE: ${currentDate}

  Base Layer (use these to calculate dates):
  ${JSON.stringify(baseLayer, null, 1)}

  Memory Deposits (process each one individually):
  ${JSON.stringify(depositsPayload, null, 1)}

  Return ONE entry per deposit in the "deposits" array. Translate Hindi to English. Calculate dates using the Base Layer.`;

      // 4. Call Groq API via OpenAI-compatible client
      const groq = new OpenAI({
        apiKey:  process.env.GROQ_API_KEY,
        baseURL: 'https://api.groq.com/openai/v1',
      });

      let completion;
      try {
        console.log('📤 Calling Groq API (llama-3.1-8b-instant)...');
        completion = await groq.chat.completions.create({
          model: 'llama-3.1-8b-instant',
          temperature: 0,
          seed: 42,
          max_tokens: 3500,
          messages: [
            { role: 'system', content: SYSTEM_INSTRUCTION },
            { role: 'user',   content: userMessage },
          ],
        });
        const finishReason = completion.choices?.[0]?.finish_reason;
        console.log(`✅ Groq API call succeeded (finish_reason: ${finishReason})`);
        if (finishReason === 'length') {
          console.warn('⚠️  Response was TRUNCATED at token limit.');
        }
      } catch (apiErr) {
        console.error('❌ Groq API Error:', apiErr.message);

        if (apiErr.status === 429) {
          return res.status(429).json({
            error: 'Groq Rate Limit',
            details: 'Too many requests. Groq free tier allows 30 req/min — please wait a moment and try again.',
            code: 'RATE_LIMITED',
          });
        }
        if (apiErr.status === 401 || apiErr.status === 403) {
          return res.status(401).json({
            error: 'Groq Authentication Failed',
            details: 'Your GROQ_API_KEY is invalid. Get a free key at https://console.groq.com/keys',
            code: 'AUTH_FAILED',
          });
        }
        return res.status(500).json({
          error: 'Groq API call failed',
          details: apiErr.message,
          code: apiErr.code,
        });
      }

      const responseText = completion.choices?.[0]?.message?.content;
      if (!responseText) {
        return res.status(500).json({ error: 'Groq returned an empty response.' });
      }

      console.log('Groq response received.');
      let aiResult;
      try {
        const jsonString = extractJSON(responseText);
        aiResult = JSON.parse(jsonString);
      } catch (parseErr) {
        console.error('Failed to parse Groq response as JSON:', parseErr.message);
        console.error('Raw response preview:', responseText.slice(0, 500));
        return res.status(500).json({
          error:      'Groq API returned an unparseable response.',
          details:    parseErr.message,
          rawPreview: responseText.slice(0, 300),
        });
      }

      if (aiResult.error) {
        return res.status(422).json({ error: aiResult.error });
      }

      // ═══════════════════════════════════════════════════════════════
      //  SERVER-SIDE POST-PROCESSING (deterministic — no LLM guessing)
      // ═══════════════════════════════════════════════════════════════
      const aiDeposits = aiResult.deposits || [];
      console.log(`[STITCH] AI returned ${aiDeposits.length} processed deposits.`);

      // Step A: Build a lookup from deposit id → AI result
      const aiLookup = {};
      aiDeposits.forEach(d => { aiLookup[d.id] = d; });

      // Step B: For any deposit the AI missed, create a fallback using the raw text
      memoryDeposits.forEach(d => {
        if (!aiLookup[d.depositId]) {
          console.warn(`[STITCH] AI missed deposit ${d.depositId}, using raw text.`);
          aiLookup[d.depositId] = {
            id: d.depositId,
            english: d.content,
            date: null,
            precision: 'None',
            tag: d.sensoryTag,
          };
        }
      });

      // Step C: Conflict Detection
      // Find deposits that talk about the same incident but give different dates.
      // We detect this by checking if any deposit explicitly references/corrects another.
      // Simple heuristic: look for keywords like "actually", "not New Year", etc. that
      // reference the same incident as an earlier deposit with a different date.
      const forensicAlerts = [];
      const conflictGroups = new Map(); // dateKey → [depositIds]

      // Gather all dated deposits and group by rough similarity
      const datedDeposits = memoryDeposits
        .map(d => ({ ...d, ai: aiLookup[d.depositId] }))
        .filter(d => d.ai.date);

      // Check for vase/incident-style conflicts: if deposit text mentions correcting a date
      memoryDeposits.forEach(d => {
        const text = (d.content || '').toLowerCase();
        const ai = aiLookup[d.depositId];
        // If a deposit contains corrective language ("actually", "not new year", "I think it was")
        // AND references an incident that another deposit also describes
        if ((text.includes('actually') || text.includes('not new year') || text.includes('i think it was')) && ai.date) {
          // Find other deposits that might describe the same incident
          memoryDeposits.forEach(other => {
            if (other.depositId === d.depositId) return;
            const otherAi = aiLookup[other.depositId];
            const otherText = (other.content || '').toLowerCase();
            // Check if they share incident keywords (vase, broke, threw, shattered, etc.)
            const sharedKeywords = ['vase', 'threw', 'shattered', 'broke', 'incident', 'glass'];
            const thisHas = sharedKeywords.some(k => text.includes(k));
            const otherHas = sharedKeywords.some(k => otherText.includes(k));
            if (thisHas && otherHas && otherAi.date && otherAi.date !== ai.date) {
              // CONFLICT FOUND
              const groupKey = sharedKeywords.filter(k => text.includes(k) && otherText.includes(k)).join('+');
              if (!conflictGroups.has(groupKey)) conflictGroups.set(groupKey, new Set());
              conflictGroups.get(groupKey).add(d.depositId);
              conflictGroups.get(groupKey).add(other.depositId);
            }
          });
        }
      });

      // Build a set of all conflicting deposit IDs
      const conflictingDepositIds = new Set();
      conflictGroups.forEach((ids, key) => {
        ids.forEach(id => conflictingDepositIds.add(id));
        const depositTexts = [...ids].map(id => {
          const ai = aiLookup[id];
          return `Deposit says "${ai.english?.slice(0, 60)}..." (date: ${ai.date})`;
        });
        forensicAlerts.push({
          type: 'Contradiction',
          description: `Conflicting dates for the same incident: ${depositTexts.join(' vs. ')}`,
        });
      });

      // Step D: Build the timeline
      const timeline = [];

      memoryDeposits.forEach(d => {
        const ai = aiLookup[d.depositId];
        const isConflict = conflictingDepositIds.has(d.depositId);
        const hasDate = ai.date && ai.date !== 'null' && ai.precision !== 'None';

        if (hasDate) {
          // ANCHORED event (or CONFLICT event that still has a date)
          timeline.push({
            date:           ai.date,
            timePrecision:  isConflict ? 'Clarification Needed' : ai.precision,
            event:          ai.english || d.content,
            sourceIds:      [d.depositId],
            sensoryContext: [d.sensoryTag],
            isConflict:     isConflict,
            conflictDetails: isConflict ? `This deposit conflicts with another deposit about the same incident. Check Forensic Alerts.` : null,
            isFloating:     false,
          });
        } else {
          // FLOATING — truly no date
          timeline.push({
            date:             'Unanchored',
            timePrecision:    'Temporal Gap',
            event:            ai.english || d.content,
            sourceIds:        [d.depositId],
            sensoryContext:   [d.sensoryTag],
            reasonForGapping: ai.reasonForGapping || 'No temporal context found in deposit.',
            isConflict:       false,
            isFloating:       true,
          });
        }
      });

      // Step E: Sort anchored events chronologically
      timeline.sort((a, b) => {
        if (a.isFloating && !b.isFloating) return 1;
        if (!a.isFloating && b.isFloating) return -1;
        if (a.isFloating && b.isFloating) return 0;
        return new Date(a.date) - new Date(b.date);
      });

      // Build depositIndex
      const depositIndex = {};
      memoryDeposits.forEach(d => {
        depositIndex[d.depositId] = {
          id:          d.depositId,
          text:        d.content,
          tag:         d.sensoryTag,
          timestamp:   d.timestamp,
          session:     d.sessionIndex,
          attachments: d.attachments || [],
        };
      });

      // Cache the response
      serverCache.set(cacheKey, {
        timeline,
        forensicAlerts,
        deposits: depositIndex,
      });

      console.log(`Stitch complete (Groq/Llama): ${timeline.length} events (${timeline.filter(e=>!e.isFloating).length} anchored, ${timeline.filter(e=>e.isFloating).length} floating, ${conflictingDepositIds.size} conflicts).`);

      return res.json({
        timeline,
        forensicAlerts,
        deposits: depositIndex,
        meta: {
          totalDeposits:      memoryDeposits.length,
          decryptionFailures,
          provider:    'Groq — Llama 3.1 8B Instant',
          clientName:  caseData.clientName  || null,
          hearingDate: caseData.hearingDate  || null,
          placements:  caseData.placements   || [],
          baseLayer:   baseLayer,
        },
      });

    } catch (err) {
      console.error('Unhandled stitching error:', err);
      return res.status(500).json({ error: 'Failed to generate narrative.', details: err.message });
    }
  });

  // ──────────────────────────────────────────────
  //  POST /api/cases/:caseId/stitch/narrative
  //  Generates a flowing legal story from the lawyer's merged timeline
  // ──────────────────────────────────────────────
  const NARRATIVE_SYSTEM = `You are a senior legal writer specialising in victim statements and affidavits. You will receive a structured timeline of events from a legal case. Your task is to write a flowing, first-person-adjacent legal narrative that tells the full story of the case.

  RULES:
  1. Write in a formal, empathetic legal prose style — as if this will be read by a judge.
  2. Connect events into paragraphs, preserving the exact words from the event descriptions. Do not hallucinate or infer new facts.
  3. Where an event is marked [UNANCHORED] or [PLACED-UNVERIFIED], include it in the narrative but note it with: "(The exact timing of the following is unconfirmed)"
  4. Where marked [CONFLICT], note: "(Conflicting accounts exist regarding the following)"
  5. Where there is a [GAP] section, write: "The record is silent on this period. The following details could not be placed with certainty on the timeline: [list the floating events]"
  6. Begin the narrative with: "STATEMENT OF FACTS" followed by a line break.
  7. Write in flowing paragraphs — not bullet points. Each paragraph should cover a period or theme.
  8. End with: "The foregoing constitutes the complete factual record as reconstructed from available evidence."
  9. Return ONLY the narrative text. No JSON. No markdown headers. No formatting symbols.`;

  router.post('/narrative', async (req, res) => {
    try {
      const { mergedTimeline = [], unplacedFloating = [], clientName, hearingDate, baseLayer } = req.body;

      if (!process.env.GROQ_API_KEY) {
        return res.status(500).json({ error: 'GROQ_API_KEY is missing.' });
      }
      if (mergedTimeline.length === 0) {
        return res.status(400).json({ error: 'No timeline events provided.' });
      }

      const groq = new OpenAI({
        apiKey:  process.env.GROQ_API_KEY,
        baseURL: 'https://api.groq.com/openai/v1',
      });

      // Format timeline for the narrative prompt
      const timelineText = mergedTimeline.map((ev, i) => {
        const tag = ev.isConflict     ? '[CONFLICT]'
                  : ev.isPlaced       ? '[PLACED-UNVERIFIED]'
                  : '[ANCHORED]';
        return `${i + 1}. ${tag} Date: ${ev.date} — ${ev.desc}`;
      }).join('\n');

      const gapText = unplacedFloating.length > 0
        ? '\n\nUNANCHORED EVENTS (could not be placed in timeline):\n' +
          unplacedFloating.map((ev, i) => `GAP ${i + 1}: ${ev.desc}`).join('\n')
        : '';

      const userMsg = `Case: ${clientName || 'Unknown Subject'}${hearingDate ? `\nHearing: ${new Date(hearingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}

  BASE LAYER CONTRAINTS (Case Skeleton):
  ${JSON.stringify(baseLayer || {}, null, 1)}

  MERGED TIMELINE:
  ${timelineText}${gapText}

  Write the full legal narrative now.`;

      const callGroq = async (messages, maxTok) => {
        return groq.chat.completions.create({
          model: 'llama-3.1-8b-instant',
          temperature: 0.3,
          max_tokens: maxTok,
          messages,
        });
      };

      const messages = [
        { role: 'system', content: NARRATIVE_SYSTEM },
        { role: 'user',   content: userMsg },
      ];

      let completion = await callGroq(messages, 4096);
      const finishReason = completion.choices?.[0]?.finish_reason;

      // If truncated, retry with shorter input (keep only first 20 events)
      if (finishReason === 'length' && mergedTimeline.length > 20) {
        console.warn('⚠️  Narrative truncated — retrying with first 20 events');
        const truncatedText = mergedTimeline.slice(0, 20).map((ev, i) => {
          const tag = ev.isConflict ? '[CONFLICT]' : ev.isPlaced ? '[PLACED-UNVERIFIED]' : '[ANCHORED]';
          return `${i + 1}. ${tag} Date: ${ev.date} — ${ev.desc}`;
        }).join('\n') + '\n\n[Note: Timeline was abbreviated for length — full record has more events]';

        const truncatedMsg = userMsg.replace(timelineText, truncatedText);
        completion = await callGroq([
          { role: 'system', content: NARRATIVE_SYSTEM },
          { role: 'user',   content: truncatedMsg },
        ], 4096);
      }

      const narrative = completion.choices?.[0]?.message?.content;
      if (!narrative) return res.status(500).json({ error: 'Narrative generation returned empty response.' });

      console.log(`✅ Narrative generated (${narrative.length} chars)`);
      return res.json({ narrative, truncated: finishReason === 'length' });

    } catch (err) {
      console.error('Narrative generation error:', err);
      if (err.status === 429) return res.status(429).json({ error: 'Rate limit — wait a moment and retry.', code: 'RATE_LIMITED' });
      return res.status(500).json({ error: 'Narrative generation failed.', details: err.message });
    }
  });

  module.exports = router;
