const mongoose = require('mongoose');

const DepositSchema = new mongoose.Schema({
  depositId:  { type: String },
  content:    { type: String, required: true },
  sensoryTag: { type: String, enum: ['Visual','Auditory','Olfactory','Somatic','General'], required: true, default: 'General' },
  addedAt:    { type: Date, default: Date.now },
  attachments: [{
    filename:     String,
    originalName: String,
    mimeType:     String,
    size:         Number,
    url:          String,
    exifDate:     String,
  }],
});

const SessionSchema = new mongoose.Schema({
  caseId: { type: String, required: true, ref: 'Case', field: 'caseId' },
  timestamp: { type: Date, default: Date.now },
  deposits: [DepositSchema],
  isClosed: { type: Boolean, default: false }
});

module.exports = mongoose.model('Session', SessionSchema);
