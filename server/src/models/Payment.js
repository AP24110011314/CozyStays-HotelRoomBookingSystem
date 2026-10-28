import mongoose from 'mongoose';

const refundSchema = new mongoose.Schema({
  providerRefundId: { type: String, required: true },
  amount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const paymentSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: 'INR',
      uppercase: true,
    },
    method: {
      type: String,
      enum: ['online', 'pay_at_hotel'],
      required: true,
    },
    provider: {
      type: String,
      enum: ['razorpay', 'mock', null],
      default: null,
    },
    providerOrderId: {
      type: String,
    },
    providerPaymentId: {
      type: String,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded', 'pay_at_hotel'],
      default: 'pending',
      required: true,
      index: true,
    },
    refundedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    refunds: [refundSchema],
    failureReason: {
      type: String,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ providerOrderId: 1 }, { unique: true, sparse: true });
paymentSchema.index({ providerPaymentId: 1 }, { unique: true, sparse: true });
paymentSchema.index({ user: 1, createdAt: -1 });

export const Payment = mongoose.model('Payment', paymentSchema);
