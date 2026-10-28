import crypto from 'crypto';

import Razorpay from 'razorpay';

import env from '../../config/env.js';
import { AppError } from '../../utils/errors.js';

let razorpayInstance = null;

function getRazorpayInstance() {
  if (!razorpayInstance) {
    if (!env.razorpayKeyId || !env.razorpayKeySecret) {
      throw new AppError('INTERNAL_ERROR', 'Razorpay credentials not configured');
    }
    razorpayInstance = new Razorpay({
      key_id: env.razorpayKeyId,
      key_secret: env.razorpayKeySecret,
    });
  }
  return razorpayInstance;
}

export const razorpayProvider = {
  name: 'razorpay',

  async createOrder({ amount, currency = 'INR', receipt = '', notes = {} }) {
    const razorpay = getRazorpayInstance();
    const order = await razorpay.orders.create({
      amount: Math.round(amount), // in paise (integer)
      currency,
      receipt,
      notes,
    });

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: env.razorpayKeyId,
      provider: 'razorpay',
    };
  },

  async verifyPayment({ orderId, paymentId, signature }) {
    if (!orderId || !paymentId || !signature) {
      return { valid: false, error: 'Missing payment verification credentials' };
    }

    try {
      const body = `${orderId}|${paymentId}`;
      const expectedSignature = crypto
        .createHmac('sha256', env.razorpayKeySecret)
        .update(body)
        .digest('hex');

      const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');
      const signatureBuffer = Buffer.from(signature, 'utf-8');

      if (expectedBuffer.length !== signatureBuffer.length) {
        return { valid: false, error: 'Invalid signature length' };
      }

      const isValid = crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
      return {
        valid: isValid,
        paymentId,
        orderId,
        error: isValid ? null : 'Signature verification failed',
      };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  },

  async verifyWebhook({ payload, signature }) {
    if (!env.razorpayWebhookSecret || !signature) {
      return { valid: false, error: 'Webhook secret or signature missing' };
    }

    try {
      const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const expectedSignature = crypto
        .createHmac('sha256', env.razorpayWebhookSecret)
        .update(body)
        .digest('hex');

      const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');
      const signatureBuffer = Buffer.from(signature, 'utf-8');

      if (expectedBuffer.length !== signatureBuffer.length) {
        return { valid: false, error: 'Invalid signature length' };
      }

      const isValid = crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
      const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;

      return {
        valid: isValid,
        event: parsed.event,
        data: parsed.payload,
        error: isValid ? null : 'Webhook signature verification failed',
      };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  },

  async refund({ paymentId, amount, notes = {} }) {
    const razorpay = getRazorpayInstance();
    const refundData = {
      amount: Math.round(amount),
      notes,
    };

    const refund = await razorpay.payments.refund(paymentId, refundData);
    return {
      refundId: refund.id,
      amount: refund.amount,
      status: refund.status,
      paymentId,
    };
  },
};
