'use strict';

const express = require('express');
const router  = express.Router({ mergeParams: true });
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { randomUUID } = require('crypto');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ── Storage ──────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads', req.params.caseId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${randomUUID()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    // Permissive filter for all evidence types
    const ok = [
      'image/jpeg', 'image/png', 'image/webp', 'image/heic',
      'application/pdf',
      'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg', 'audio/webm', 'audio/x-m4a', 'audio/m4a', 'audio/aac', 'audio/mp3',
      'video/mp4', 'video/quicktime',
    ];
    ok.includes(file.mimetype) ? cb(null, true) : cb(new Error('Unsupported file type: ' + file.mimetype));
  },
});

// ── Gemini Forensic Extraction ───────────────────────────────────────────────

const EXTRACTION_PROMPT = `You are a Forensic Evidence AI. The following file contains legal evidence.

Extract ALL of the following:
- dates (any date or time mentioned, even informal)
- names (people, organizations)
- locations (places, addresses)
- incident_keywords (briefly tag events: e.g., "threat", "assault", "payment")
- summary (one precise sentence describing why this file is legally important)

Rules:
- Be thorough. Extract ALL dates and names.
- Return ONLY a raw JSON object.

Format:
{
  "dates": ["March 14", "9:42 PM"],
  "names": ["Rahul Sharma"],
  "locations": ["Lajpat Nagar"],
  "incident_keywords": ["threatened", "pushed"],
  "summary": "WhatsApp screenshot from March 14th showing a threatening message from Rahul Sharma."
}`;

async function runForensicExtraction(filePath, mimeType) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // REVERTED to gemini-2.5-flash as it was the version that successfully worked initially.
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');

    const result = await model.generateContent([
      { inlineData: { data: base64Data, mimeType } },
      { text: EXTRACTION_PROMPT },
    ]);

    const responseText = result.response.text();
    const jsonStart = responseText.indexOf('{');
    const jsonEnd   = responseText.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) return null;

    return JSON.parse(responseText.slice(jsonStart, jsonEnd + 1));
  } catch (err) {
    console.error('[FORENSIC] Extraction failed:', err.message);
    return null;
  }
}

// ── POST /api/cases/:caseId/uploads ──────────────────────────────────────────

router.post('/', upload.array('files', 5), async (req, res) => {
  try {
    const enrichedFiles = await Promise.all(
      req.files.map(async (f) => {
        const baseFile = {
          filename:     f.filename,
          originalName: f.originalname,
          mimeType:     f.mimetype,
          size:         f.size,
          url:          `/uploads/${req.params.caseId}/${f.filename}`,
          exifDate:     null,
          forensicIntel: null,
        };

        const supported = [
          'image/jpeg', 'image/png', 'image/webp',
          'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg', 'audio/webm', 'audio/x-m4a', 'audio/m4a', 'audio/aac', 'audio/mp3',
          'application/pdf',
        ];

        if (supported.includes(f.mimetype)) {
          const intel = await runForensicExtraction(f.path, f.mimetype);
          baseFile.forensicIntel = intel;
          if (intel?.dates?.length > 0) baseFile.exifDate = intel.dates[0];
        }

        return baseFile;
      })
    );

    res.json({ files: enrichedFiles });
  } catch (err) {
    console.error('[UPLOADS] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
