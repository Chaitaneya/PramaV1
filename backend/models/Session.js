const mongoose = require('mongoose');

const DepositSchema = new mongoose.Schema({
  content: { type: String, required: true }, // Encrypted payload
  sensoryTag: { type: String, enum: ['Visual', 'Auditory', 'Olfactory', 'Somatic', 'General'], required: true, default: 'General' },
  addedAt: { type: Date, default: Date.now }
});

const SessionSchema = new mongoose.Schema({
  caseId: { type: String, required: true, ref: 'Case', field: 'caseId' },
  timestamp: { type: Date, default: Date.now },
  deposits: [DepositSchema],
  isClosed: { type: Boolean, default: false }
});

module.exports = mongoose.model('Session', SessionSchema);
