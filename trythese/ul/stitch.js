const express = require('express');
const router = express.Router({ mergeParams: true });
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
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
//  Robust JSON extractor — handles ```json fences,
//  partial text preambles, and whitespace
// ──────────────────────────────────────────────
function extractJSON(raw) {
  // Strip markdown fences if present
  let cleaned = raw.replace(/```json[\s\S]*?```/g, match => match.replace(/```json|```/g, ''))
                   .replace(/```[\s\S]*?```/g, match => match.replace(/```/g, ''))
                   .trim();

  // If the model added preamble text before the JSON, find the first '{' 
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd   = cleaned.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error(`No JSON object found in model response. Raw: ${raw.slice(0, 300)}`);
  }
  return cleaned.slice(jsonStart, jsonEnd + 1);
}

// ──────────────────────────────────────────────
//  POST /api/cases/:caseId/stitch/generate
// ──────────────────────────────────────────────
router.post('/generate', async (req, res) => {
  try {
    // FIX 1: Decode URI components — caseIds with spaces/parens/colons arrive encoded
    const caseId = decodeURIComponent(req.params.caseId);
    console.log("Stitching request received for case:", caseId);
    console.log("GEMINI_API_KEY present:", !!process.env.GEMINI_API_KEY);
    console.log("ENCRYPTION_KEY present:", !!process.env.ENCRYPTION_KEY);

    if (!process.env.GEMINI_API_KEY) {
      console.error("FATAL: GEMINI_API_KEY is missing from .env");
      return res.status(500).json({ error: 'GEMINI_API_KEY is missing from server configuration.' });
    }

    // FIX 2: Warn loudly if ENCRYPTION_KEY is not set — random key = all decryptions fail
    if (!process.env.ENCRYPTION_KEY) {
      console.error("WARNING: ENCRYPTION_KEY is not set in .env. Deposits encrypted in a previous server session cannot be decrypted.");
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

    // 2. Fetch all sessions & build decrypted deposit payload
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
        } catch (decryptionError) {
          decryptionFailures++;
          console.error(`Decryption failed for deposit ${d._id}:`, decryptionError.message);
          // Don't crash — skip this deposit
        }
      });
    });

    // FIX 3: If ALL deposits failed to decrypt, return a clear error instead of
    // sending an empty payload to Gemini which causes a confusing 500
    if (memoryDeposits.length === 0) {
      return res.status(500).json({
        error: 'All deposits failed to decrypt.',
        details: `This usually means ENCRYPTION_KEY in your .env changed since the deposits were saved. ${decryptionFailures} deposit(s) affected. Please ensure ENCRYPTION_KEY is a fixed value in your .env file.`,
      });
    }

    if (decryptionFailures > 0) {
      console.warn(`Warning: ${decryptionFailures} deposit(s) could not be decrypted and were skipped.`);
    }

    // 3. Build the input payload for Gemini
    const inputPayload = { baseLayer, memoryDeposits };
    const userMessage = `Apply the Prama Narrative Architect protocol to the following memory deposits and temporal anchors:\n\n${JSON.stringify(inputPayload, null, 2)}`;

    // 4. Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ];

    // FIX 4: 'gemini-1.5-flash-latest' is deprecated/invalid on many keys.
    // Use 'gemini-1.5-flash' (stable) or 'gemini-2.0-flash' if you have access.
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: SYSTEM_INSTRUCTION,
      safetySettings,
    });

    // 5. Call Gemini
    let result;
    try {
      result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });
    } catch (aiErr) {
      console.error('Gemini API call failed:', aiErr);

      // FIX 5: Structured error responses for common Gemini failures
      const status = aiErr.status || aiErr.httpStatus;
      if (status === 404) {
        return res.status(500).json({
          error: 'Gemini model not found (404).',
          details: 'The model "gemini-1.5-flash" is not available for your API key or region. Try "gemini-2.0-flash" or verify your API key at aistudio.google.com.',
        });
      }
      if (status === 400) {
        return res.status(500).json({
          error: 'Gemini rejected the request (400).',
          details: aiErr.message,
        });
      }
      if (status === 429) {
        return res.status(429).json({
          error: 'Gemini rate limit hit. Please wait a moment and try again.',
        });
      }
      return res.status(500).json({
        error: 'Gemini API call failed.',
        details: aiErr.message,
      });
    }

    // 6. Parse the response
    let responseText;
    try {
      responseText = result.response.text();
    } catch (textErr) {
      // This happens when the response was blocked by safety filters despite BLOCK_NONE
      console.error('Could not extract text from Gemini response:', textErr);
      const blockReason = result.response?.promptFeedback?.blockReason;
      return res.status(500).json({
        error: 'Gemini response was blocked or empty.',
        details: blockReason ? `Block reason: ${blockReason}` : 'No response text returned.',
      });
    }

    // FIX 6: Robust JSON extraction — handles preamble text and code fences
    let structured;
    try {
      const jsonString = extractJSON(responseText);
      structured = JSON.parse(jsonString);
    } catch (parseErr) {
      console.error('Failed to parse Gemini response as JSON:', parseErr.message);
      console.error('Raw response was:', responseText.slice(0, 500));
      return res.status(500).json({
        error: 'Gemini returned an unparseable response.',
        details: parseErr.message,
        rawPreview: responseText.slice(0, 300),
      });
    }

    // 7. Validate structure — Gemini sometimes returns { error: "..." }
    if (structured.error) {
      console.warn('Gemini returned an error object:', structured.error);
      return res.status(422).json({ error: structured.error });
    }

    // 8. Assemble the final timeline
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

    console.log(`Stitch complete: ${timeline.length} events, ${(structured.forensicAlerts || []).length} alerts.`);

    return res.json({
      timeline,
      forensicAlerts: structured.forensicAlerts || [],
      floatingEvents:  structured.floatingEvents  || [],
      meta: {
        totalDeposits:      memoryDeposits.length,
        decryptionFailures,
      },
    });

  } catch (err) {
    console.error('Unhandled stitching error:', err);
    return res.status(500).json({ error: 'Failed to generate narrative.', details: err.message });
  }
});

module.exports = router;
