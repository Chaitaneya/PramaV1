const express = require('express');
const router = express.Router();
const ShareLink = require('../models/ShareLink');
const AuditLog = require('../models/AuditLog');
const Case = require('../models/Case');
const Session = require('../models/Session');
const { decrypt } = require('../utils/encryption');

// ──────────────────────────────────────────────
//  GET /api/share/:token — Public access to shared case
//  This is the endpoint external institutions hit
// ──────────────────────────────────────────────
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const share = await ShareLink.findOne({ token });

    if (!share) {
      return res.status(404).json({ error: 'Share link not found or invalid.' });
    }
    if (share.isRevoked) {
      return res.status(403).json({ error: 'This share link has been revoked by the case owner.' });
    }
    if (share.expiresAt < new Date()) {
      return res.status(410).json({ error: 'This share link has expired.', expiredAt: share.expiresAt });
    }

    // Log access for chain-of-custody
    share.accessLog.push({
      accessedAt: new Date(),
      ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    });
    await share.save();

    // Audit log
    await AuditLog.create({
      caseId: share.caseId,
      action: 'SHARE_ACCESSED',
      actor: share.recipientOrg,
      details: {
        token,
        recipientOrg: share.recipientOrg,
        recipientRole: share.recipientRole,
        accessCount: share.accessLog.length,
      },
      ipAddress: req.ip,
    });

    // Fetch case data
    const caseData = await Case.findOne({ caseId: share.caseId });
    if (!caseData) {
      return res.status(404).json({ error: 'Case no longer exists.' });
    }

    // Build response based on permissions
    const response = {
      caseId: share.caseId,
      clientName: caseData.clientName,
      jurisdiction: caseData.baseLayer?.jurisdiction || null,
      hearingDate: caseData.hearingDate,
      status: caseData.status,
      sharedBy: share.createdBy,
      recipientOrg: share.recipientOrg,
      recipientRole: share.recipientRole,
      expiresAt: share.expiresAt,
      accessCount: share.accessLog.length,
      permissions: share.permissions,
    };

    // Timeline data or deposits
    if (share.permissions.timeline || share.permissions.deposits || share.permissions.media) {
      // Try to get cached stitch data — or return basic deposit summary
      const sessions = await Session.find({ caseId: share.caseId }).sort({ timestamp: 1 });
      const deposits = [];
      let depositCount = 0;

      sessions.forEach((s, sIdx) => {
        s.deposits.forEach(d => {
          depositCount++;
          if (share.permissions.deposits) {
            try {
              deposits.push({
                id: d._id.toString(),
                text: decrypt(d.content),
                tag: d.sensoryTag,
                session: sIdx + 1,
                timestamp: d.addedAt,
                attachments: share.permissions.media ? (d.attachments || []) : [],
              });
            } catch {
              deposits.push({
                id: d._id.toString(),
                text: '[Encrypted — decryption unavailable]',
                tag: d.sensoryTag,
                session: sIdx + 1,
                timestamp: d.addedAt,
                attachments: [],
              });
            }
          }
        });
      });

      response.depositCount = depositCount;
      response.sessionCount = sessions.length;

      if (share.permissions.deposits) {
        response.deposits = deposits;
      }
    }

    res.json(response);

  } catch (err) {
    console.error('[SHARE] Access error:', err);
    res.status(500).json({ error: 'Failed to access shared case.', details: err.message });
  }
});

// ──────────────────────────────────────────────
//  PUT /api/share/:token/revoke — Revoke a share link
// ──────────────────────────────────────────────
router.put('/:token/revoke', async (req, res) => {
  try {
    const { token } = req.params;
    const share = await ShareLink.findOneAndUpdate(
      { token },
      { isRevoked: true },
      { returnDocument: 'after' }
    );

    if (!share) {
      return res.status(404).json({ error: 'Share link not found.' });
    }

    // Audit log
    await AuditLog.create({
      caseId: share.caseId,
      action: 'SHARE_REVOKED',
      actor: 'Lawyer',
      details: { token, recipientOrg: share.recipientOrg },
      ipAddress: req.ip,
    });

    console.log(`[SHARE] Revoked link ${token} for case ${share.caseId}`);
    res.json({ success: true, message: 'Share link revoked.' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
