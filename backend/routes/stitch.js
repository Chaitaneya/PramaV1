const express = require('express');
const router = express.Router({ mergeParams: true });
const Session = require('../models/Session');
const Case = require('../models/Case');
const { decrypt } = require('../utils/encryption');

// ──────────────────────────────────────────────
//  Prama Narrative Architect – System Instruction
// ──────────────────────────────────────────────
const SYSTEM_INSTRUCTION = `You are the Prama Narrative Architect. Your sole purpose is to transform fragmented, non-linear memory deposits into a high-fidelity, chronological Statement of Facts for legal use. You sit at the intersection of Neurobiology (understanding that trauma is remembered in snapshots) and Jurisprudence (the requirement for linear evidence).

INPUT DATA STRUCTURE:
You will receive a JSON payload containing:

Base Layer: A set of "Temporal Anchors" (Known dates, birthdays, locations).

Memory Deposits: An array of fragmented notes, each with a depositId, a sensoryTag, and a timestamp (when it was recorded).

CORE OPERATING CONSTRAINTS (NON-NEGOTIABLE):

ZERO HALLUCINATION: Do not invent bridge sentences. If Deposit A is at 9:00 PM and Deposit B is at 11:00 PM, do not assume what happened at 10:00 PM.

VERBATIM FIDELITY: Retain the user's original language. Do not "sanitize" or "professionalize" the tone. If the user said "pushed," do not write "assaulted." If the user said "scared," do not write "terrified."

SOURCE MAPPING: Every single event in your output must be linked to a sourceId. If an event is synthesized from two deposits, list both IDs.

CONFLICT IDENTIFICATION: If Session 1 says "Blue Car" and Session 3 says "Black Truck," do not choose one. Mark the entry with "isConflict": true and include both versions.

GAP ACKNOWLEDGMENT: If an event cannot be placed on the timeline with at least 80% certainty based on the Base Layer anchors, place it in a "FloatingEvents" category. Do not guess.

THE STITCHING LOGIC:

Use the Base Layer (e.g., "Lunar New Year = Jan 29") to calculate relative dates (e.g., "Two days after the fireworks" = Jan 31).

Prioritize Sensory Metadata to group events. If an Olfactory tag (smell) and a Somatic tag (physical feeling) share a temporal context, link them.

Look for Cross-Session Overlap. If the user adds a detail in Session 4 that completes a sentence from Session 1, merge them into a single chronological entry.

OUTPUT FORMAT (STRICT JSON ONLY - NO MARKDOWN, NO BACKTICKS):
Return ONLY a raw JSON object. Do not wrap it in markdown code blocks. Do not add any explanation before or after. The JSON must have this exact structure:

{
  "structuredTimeline": [
    {
      "estimatedDate": "ISO-8601 or YYYY-MM-DD",
      "timePrecision": "Exact | Approximate | Relative",
      "eventDescription": "Verbatim-style summary of the fragments",
      "sourceIds": ["deposit_id_1", "deposit_id_2"],
      "sensoryContext": ["Visual", "Auditory"],
      "isConflict": false,
      "conflictDetails": null
    }
  ],
  "floatingEvents": [
    {
      "reasonForGapping": "No temporal markers found",
      "eventDescription": "...",
      "sourceIds": ["deposit_id_x"]
    }
  ],
  "forensicAlerts": [
    {
      "type": "Inconsistency",
      "description": "User mentioned 'Front Door' in Session 1 and 'Back Window' in Session 2 regarding entry point."
    }
  ]
}

TONE & STYLE:

Clinical/Forensic: No adjectives unless provided by the user.

Objective: You are a mirror, not a narrator.

Transparent: If a date is a guess based on context, you must label it Approximate.

FAILURE PROTOCOL:
If the input is too corrupted, nonsensical, or lacks any temporal anchors to even begin a timeline, still return valid JSON but with empty structuredTimeline, all deposits in floatingEvents, and a forensicAlert of type "InsufficientAnchors".`;

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
    console.log("Stitching request received for case (xAI Reasoning):", caseId);
    console.log("XAI_API_KEY present:", !!process.env.XAI_API_KEY);

    if (!process.env.XAI_API_KEY) {
      return res.status(500).json({ error: 'XAI_API_KEY is missing from server configuration.' });
    }

    // 1. Fetch Case for Base Layer
    const caseData = await Case.findOne({ caseId });
    if (!caseData) {
      return res.status(404).json({ error: `Case not found for caseId: "${caseId}"` });
    }

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
    const sessions = await Session.find({ caseId }).sort({ timestamp: 1 });
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
          });
        } catch (e) {
          decryptionFailures++;
          console.error(`Decryption failed for deposit ${d._id}:`, e.message);
        }
      });
    });

    if (memoryDeposits.length === 0) {
      return res.status(500).json({
        error: 'All deposits failed to decrypt.',
        details: `ENCRYPTION_KEY in your .env may have changed since deposits were saved. ${decryptionFailures} deposit(s) affected.`,
      });
    }

    // 3. Build input payload for Grok Reasoning
    const inputPayload = { baseLayer, memoryDeposits };
    const userMessage  = `Apply the Prama Narrative Architect protocol to the following memory deposits and temporal anchors:\n\n${JSON.stringify(inputPayload, null, 2)}`;

    // 4. Call xAI reasoning endpoint (/v1/responses)
    const xaiResponse = await fetch('https://api.x.ai/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.XAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'grok-4.20-reasoning',
        input: `${SYSTEM_INSTRUCTION}\n\n${userMessage}`
      })
    });

    if (!xaiResponse.ok) {
      const errorText = await xaiResponse.text();
      console.error('xAI reasoning API call failed:', errorText);
      return res.status(500).json({ 
        error: `xAI API failed with status ${xaiResponse.status}`,
        details: errorText.slice(0, 500)
      });
    }

    const result = await xaiResponse.json();
    console.log('xAI reasoning response received.');

    // 5. Extract text content based on reasoning output schema
    // Reasoning models often return a slightly different schema. We'll be robust.
    const responseText = result.message || result.text || result.response || result.message?.content;

    if (!responseText) {
      console.error('xAI returned an unexpected response structure:', JSON.stringify(result, null, 2));
      return res.status(500).json({ error: 'xAI Reasoning returned an empty or unexpected response.' });
    }

    // 6. Parse JSON using our robust extractor
    let structured;
    try {
      const jsonString = extractJSON(responseText);
      structured = JSON.parse(jsonString);
    } catch (parseErr) {
      console.error('Failed to parse Grok Reasoning response as JSON:', parseErr.message);
      console.error('Raw response preview:', responseText.slice(0, 500));
      return res.status(500).json({
        error:      'Grok Reasoning returned an unparseable response.',
        details:    parseErr.message,
        rawPreview: responseText.slice(0, 300),
      });
    }

    // Check for explicit AI error blocks
    if (structured.error) {
      return res.status(422).json({ error: structured.error });
    }

    // 7. Assemble the final timeline for Prama
    const timeline = [
      ...(structured.structuredTimeline || []).map(ev => ({
        date:           ev.estimatedDate,
        timePrecision:  ev.timePrecision,
        event:          ev.eventDescription,
        sourceIds:      ev.sourceIds      || [],
        sensoryContext: ev.sensoryContext || [],
        isConflict:     ev.isConflict     || false,
        conflictDetails: ev.conflictDetails || null,
      })),
      ...(structured.floatingEvents || []).map(ev => ({
        date:             'Floating',
        timePrecision:    'Gapped',
        event:            `[FLOAT] ${ev.eventDescription}`,
        sourceIds:        ev.sourceIds || [],
        reasonForGapping: ev.reasonForGapping,
        isConflict:       false,
      })),
    ];

    console.log(`Stitch complete (xAI Reasoning): ${timeline.length} events.`);

    return res.json({
      timeline,
      forensicAlerts: structured.forensicAlerts || [],
      floatingEvents:  structured.floatingEvents  || [],
      meta: {
        totalDeposits:      memoryDeposits.length,
        decryptionFailures,
        provider: 'xAI Grok-4.20-Reasoning (High Context Reasoning Endpoint)'
      },
    });

  } catch (err) {
    console.error('Unhandled stitching error:', err);
    return res.status(500).json({ error: 'Failed to generate narrative via xAI Reasoning Fix.', details: err.message });
  }
});

module.exports = router;
