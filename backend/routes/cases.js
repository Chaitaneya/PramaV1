const express = require('express');
const router = express.Router();
const Case = require('../models/Case');
const Session = require('../models/Session');
const auth = require('../middleware/auth');

router.use(auth);

// Get cases (optional status filter)
router.get('/', async (req, res) => {
  try {
    const filter = { lawyerId: req.userId };
    if (req.query.status) {
      filter.status = { $in: req.query.status.split(',') };
    }
    const cases = await Case.find(filter).sort({ hearingDate: 1, createdAt: -1 });
    res.json(cases);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get case statistics
router.get('/stats', async (req, res) => {
  try {
    const filter = { lawyerId: req.userId };
    const collecting = await Case.countDocuments({ ...filter, status: 'Collecting' });
    const review = await Case.countDocuments({ ...filter, status: 'Under Review' });
    const completed = await Case.countDocuments({ ...filter, status: { $in: ['Synthesized', 'Finalized'] } });

    res.json({ collecting, review, completed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new case
router.post('/', async (req, res) => {
  try {
    const newCase = new Case({
      caseId: req.body.caseId,
      clientName: req.body.clientName,
      hearingDate: req.body.hearingDate ? new Date(req.body.hearingDate) : null,
      baseLayer: req.body.baseLayer || {},
      status: 'Collecting',
      lawyerId: req.userId,
    });
    const saved = await newCase.save();
    res.status(201).json(saved);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'A case with this Case ID already exists. Please choose a different ID.' });
    }
    res.status(400).json({ error: err.message });
  }
});

// Update Hearing Date
router.put('/:id/hearing', async (req, res) => {
  try {
    const updated = await Case.findOneAndUpdate(
      { caseId: req.params.id, lawyerId: req.userId },
      { hearingDate: req.body.hearingDate ? new Date(req.body.hearingDate) : null },
      { returnDocument: 'after' }
    );
    if (!updated) return res.status(404).json({ error: 'Case not found or access denied' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get a specific case
router.get('/:id', async (req, res) => {
  try {
    const single = await Case.findOne({ caseId: req.params.id, lawyerId: req.userId });
    if (!single) return res.status(404).json({ error: 'Case not found or access denied' });
    res.json(single);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Case
router.delete('/:id', async (req, res) => {
  try {
    const caseId = req.params.id;
    const deletedCase = await Case.findOne({ caseId, lawyerId: req.userId });
    if (deletedCase) {
      await Session.deleteMany({ caseId: deletedCase._id });
      await Case.deleteOne({ _id: deletedCase._id });
      return res.json({ success: true });
    }
    res.status(404).json({ error: 'Case not found or access denied' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save/update lawyer's event placements
router.put('/:id/placements', async (req, res) => {
  try {
    const updated = await Case.findOneAndUpdate(
      { caseId: req.params.id, lawyerId: req.userId },
      { placements: req.body.placements || [] },
      { returnDocument: 'after' }
    );
    if (!updated) return res.status(404).json({ error: 'Case not found or access denied' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all pending deposits for review
router.get('/:id/pending-deposits', async (req, res) => {
  try {
    const caseId = req.params.id;
    const caseData = await Case.findOne({ caseId, lawyerId: req.userId });
    if (!caseData) return res.status(404).json({ error: 'Case not found or access denied' });

    const sessions = await Session.find({ caseId });
    const pending = [];
    sessions.forEach(s => {
      s.deposits.forEach(d => {
        if (d.status === 'pending') {
          pending.push({
            _id: d._id,
            sessionId: s._id,
            content: d.content, // Note: Encryption might need to be handled if viewing raw
            sensoryTag: d.sensoryTag,
            addedAt: d.addedAt
          });
        }
      });
    });
    res.json(pending);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update deposit status (Approve/Reject)
router.put('/:id/deposits/:depositId/status', async (req, res) => {
  try {
    const { id, depositId } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'

    const caseData = await Case.findOne({ caseId: id, lawyerId: req.userId });
    if (!caseData) return res.status(404).json({ error: 'Case not found or access denied' });

    const session = await Session.findOne({ 'deposits._id': depositId, caseId: id });
    if (!session) return res.status(404).json({ error: 'Deposit not found' });

    const deposit = session.deposits.id(depositId);
    deposit.status = status;
    await session.save();

    res.json({ success: true, status: deposit.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
