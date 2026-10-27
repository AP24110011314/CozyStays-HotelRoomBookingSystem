import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema({
  filename: String,
  content: mongoose.Schema.Types.Mixed,
  contentType: String,
}, { _id: false });

const emailOutboxSchema = new mongoose.Schema({
  to: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  html: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  attachments: [attachmentSchema],
  status: {
    type: String,
    enum: ['pending', 'sending', 'sent', 'failed'],
    default: 'pending',
  },
  attempts: {
    type: Number,
    default: 0,
  },
  maxAttempts: {
    type: Number,
    default: 5,
  },
  lastError: String,
  nextRetryAt: {
    type: Date,
    default: Date.now,
  },
  lockedAt: Date,
  lockedBy: String,
  sentAt: Date,
}, {
  timestamps: true,
});

emailOutboxSchema.index({ status: 1, nextRetryAt: 1 });
emailOutboxSchema.index({ lockedAt: 1 });

export const EmailOutbox = mongoose.model('EmailOutbox', emailOutboxSchema);