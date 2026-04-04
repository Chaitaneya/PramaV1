const mongoose = require('mongoose');

const CaseSchema = new mongoose.Schema({
  caseId: { type: String, required: true, unique: true },
  clientName: { type: String, required: true },
  hearingDate: { type: Date }, // Upcoming hearing date
  lawyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional future use
  baseLayer: {
    startDate: { type: String }, // optional timeline info
    endDate: { type: String },
    location: { type: String },
    jurisdiction: { type: String },
    knownWindow: { type: String }, // e.g., the time around which it happened
    anchorDays: { type: String }, // special days like bday
    environmentalContext: { type: String },
    medicalHistory: { type: String },
    digitalFootprint: { type: String },
    priorReports: { type: String }
  },
  status: { type: String, enum: ['Collecting', 'Synthesized', 'Finalized', 'Under Review'], default: 'Collecting' },
  placements: [{
    floatingKey:     { type: String },
    insertAfterDate: { type: String },
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Case', CaseSchema);
