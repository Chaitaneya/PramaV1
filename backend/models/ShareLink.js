const mongoose = require('mongoose');

const AccessLogEntry = new mongoose.Schema({
  accessedAt: { type: Date, default: Date.now },
  ipAddress:  { type: String, default: 'unknown' },
  userAgent:  { type: String },
}, { _id: false });

const ShareLinkSchema = new mongoose.Schema({
  token:         { type: String, required: true, unique: true, index: true },
  caseId:        { type: String, required: true, ref: 'Case' },
  recipientOrg:  { type: String, required: true },  // e.g. "Delhi Police Station 14"
  recipientRole: {
    type: String,
    enum: ['Police', 'Medical', 'Legal', 'Shelter', 'Court', 'NGO', 'Client', 'Other'],
    required: true,
  },
  permissions: {
    timeline:  { type: Boolean, default: true },
    narrative: { type: Boolean, default: false },
    deposits:  { type: Boolean, default: false },
    media:     { type: Boolean, default: false },
    canAddDeposits: { type: Boolean, default: false },
  },
  expiresAt:   { type: Date, required: true },
  isRevoked:   { type: Boolean, default: false },
  createdBy:   { type: String, default: 'Lawyer' },   // future: replace with user ID
  consentNote: { type: String, required: true },       // confirms survivor consent
  accessLog:   [AccessLogEntry],
  createdAt:   { type: Date, default: Date.now },
});

// Virtual: is this link currently valid?
ShareLinkSchema.virtual('isValid').get(function () {
  return !this.isRevoked && this.expiresAt > new Date();
});

// Ensure virtuals are included in JSON
ShareLinkSchema.set('toJSON', { virtuals: true });
ShareLinkSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ShareLink', ShareLinkSchema);
