const express = require('express');
const router  = express.Router({ mergeParams: true });
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { randomUUID } = require('crypto');

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
    const ok = ['image/jpeg','image/png','image/webp','image/heic',
                'application/pdf','audio/mpeg','audio/wav','audio/mp4',
                'video/mp4','video/quicktime'];
    ok.includes(file.mimetype) ? cb(null, true) : cb(new Error('Unsupported file type'));
  },
});

// POST /api/cases/:caseId/uploads
router.post('/', upload.array('files', 5), (req, res) => {
  try {
    const files = req.files.map(f => ({
      filename:     f.filename,
      originalName: f.originalname,
      mimeType:     f.mimetype,
      size:         f.size,
      url:          `/uploads/${req.params.caseId}/${f.filename}`,
      exifDate:     null,
    }));
    res.json({ files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
