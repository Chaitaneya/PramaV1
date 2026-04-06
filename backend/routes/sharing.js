const express = require('express');
const router = express.Router({ mergeParams: true });
const crypto = require('crypto');
const ShareLink = require('../models/ShareLink');
const AuditLog = require('../models/AuditLog');
const Case = require('../models/Case');
const Session = require('../models/Session');
const { decrypt } = require('../utils/encryption');
const auth = require('../middleware/auth');

router.use(auth);

// ──────────────────────────────────────────────
//  POST /api/cases/:caseId/share — Create a share link
// ──────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const caseId = decodeURIComponent(req.params.caseId);
    const { recipientOrg, recipientRole, permissions, expiryDays, consentNote } = req.body;

    if (!recipientOrg || !recipientRole || !consentNote) {
      return res.status(400).json({ error: 'recipientOrg, recipientRole, and consentNote are required.' });
    }

    // Verify case exists and belongs to the logged-in lawyer
    const caseData = await Case.findOne({ caseId, lawyerId: req.userId });
    if (!caseData) return res.status(404).json({ error: 'Case not found or access denied.' });

    const token = crypto.randomUUID();
    const days = Math.min(Math.max(parseInt(expiryDays) || 7, 1), 30); // 1-30 days
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const shareLink = new ShareLink({
      token,
      caseId,
      recipientOrg,
      recipientRole,
      permissions: {
        timeline:  permissions?.timeline  !== false,
        narrative: permissions?.narrative === true,
        deposits:  permissions?.deposits  === true,
        media:     permissions?.media     === true,
        canAddDeposits: permissions?.canAddDeposits === true,
      },
      expiresAt,
      consentNote,
      createdBy: req.userId,
    });

    await shareLink.save();

    // Audit log
    await AuditLog.create({
      caseId,
      action: 'SHARE_CREATED',
      actor: 'Lawyer',
      details: {
        token,
        recipientOrg,
        recipientRole,
        expiresAt,
        permissions: shareLink.permissions,
      },
      ipAddress: req.ip,
    });

    console.log(`[SHARE] Created link for case ${caseId} → ${recipientOrg} (expires: ${expiresAt.toISOString()})`);

    res.status(201).json({
      token,
      shareUrl: `/shared/${token}`,
      expiresAt,
      recipientOrg,
      recipientRole,
    });

  } catch (err) {
    console.error('[SHARE] Create error:', err);
    res.status(500).json({ error: 'Failed to create share link.', details: err.message });
  }
});

// ──────────────────────────────────────────────
//  GET /api/cases/:caseId/shares — List share links for a case
// ──────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const caseId = decodeURIComponent(req.params.caseId);
    const caseData = await Case.findOne({ caseId, lawyerId: req.userId });
    if (!caseData) return res.status(404).json({ error: 'Case not found or access denied.' });

    const shares = await ShareLink.find({ caseId }).sort({ createdAt: -1 });
    res.json(shares);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
//  GET /api/cases/:caseId/audit — Get audit trail
// ──────────────────────────────────────────────
router.get('/audit', async (req, res) => {
  try {
    const caseId = decodeURIComponent(req.params.caseId);
    const caseData = await Case.findOne({ caseId, lawyerId: req.userId });
    if (!caseData) return res.status(404).json({ error: 'Case not found or access denied.' });

    const logs = await AuditLog.find({ caseId }).sort({ timestamp: -1 }).limit(100);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
