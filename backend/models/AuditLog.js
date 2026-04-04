const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  caseId:    { type: String, required: true, index: true },
  action:    {
    type: String,
    required: true,
    enum: [
      'SHARE_CREATED',
      'SHARE_ACCESSED',
      'SHARE_REVOKED',
      'EXPORT_PDF',
      'EXPORT_JSON_LD',
      'DEPOSIT_ADDED',
      'CASE_CREATED',
      'CASE_DELETED',
      'STITCH_GENERATED',
      'NARRATIVE_GENERATED',
    ],
  },
  actor:     { type: String, default: 'System' },        // who performed the action
  details:   { type: mongoose.Schema.Types.Mixed },       // flexible payload
  ipAddress: { type: String },
  timestamp: { type: Date, default: Date.now },
});

// Index for efficient case-level queries sorted by time
AuditLogSchema.index({ caseId: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
