const express = require('express');
const router = express.Router();
const Case = require('../models/Case');
const Session = require('../models/Session');

// Get cases (optional status filter)
router.get('/', async (req, res) => {
  try {
    const filter = req.query.status ? { status: { $in: req.query.status.split(',') } } : {};
    const cases = await Case.find(filter).sort({ hearingDate: 1, createdAt: -1 });
    res.json(cases);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get case statistics
router.get('/stats', async (req, res) => {
  try {
    const collecting = await Case.countDocuments({ status: 'Collecting' });
    const review = await Case.countDocuments({ status: 'Under Review' });
    const completed = await Case.countDocuments({ status: { $in: ['Synthesized', 'Finalized'] } });

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
      status: 'Collecting'
    });
    const saved = await newCase.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update Hearing Date
router.put('/:id/hearing', async (req, res) => {
  try {
    const updated = await Case.findOneAndUpdate(
      { caseId: req.params.id },
      { hearingDate: req.body.hearingDate ? new Date(req.body.hearingDate) : null },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get a specific case
router.get('/:id', async (req, res) => {
  try {
    const single = await Case.findOne({ caseId: req.params.id });
    if (!single) return res.status(404).json({ error: 'Case not found' });
    res.json(single);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Case
router.delete('/:id', async (req, res) => {
  try {
    const caseId = req.params.id;
    const deletedCase = await Case.findOne({ caseId });
    if (deletedCase) {
      await Session.deleteMany({ caseId: deletedCase._id });
      await Case.deleteOne({ _id: deletedCase._id });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
