const express = require('express');
const router = express.Router({ mergeParams: true }); // to access :caseId
const Session = require('../models/Session');
const { encrypt, decrypt } = require('../utils/encryption');

// Get sessions for a case
router.get('/', async (req, res) => {
  try {
    const sessions = await Session.find({ caseId: req.params.caseId }).sort({ timestamp: 1 });
    // Decrypt deposits before sending to client
    const decryptedSessions = sessions.map(session => {
      const s = session.toObject();
      s.deposits = s.deposits.map(d => ({
        ...d,
        content: d.content ? decrypt(d.content) : d.content
      }));
      return s;
    });
    res.json(decryptedSessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a session with a deposit
router.post('/', async (req, res) => {
  try {
    const { content, sensoryTag, attachments } = req.body;
    const encryptedContent = encrypt(content);
    let session = await Session.findOne({ caseId: req.params.caseId, isClosed: false });
    if (!session) session = new Session({ caseId: req.params.caseId });

    session.deposits.push({
      depositId:   `dep_${Date.now()}`,
      content:     encryptedContent,
      sensoryTag,
      attachments: attachments || [],
    });

    await session.save();
    res.status(201).json({ message: 'Deposit saved' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Close a session manually
router.post('/end', async (req, res) => {
  try {
    const session = await Session.findOneAndUpdate(
      { caseId: req.params.caseId, isClosed: false },
      { $set: { isClosed: true } },
      { returnDocument: 'after' }
    );
    res.json({ message: 'Session closed', session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
