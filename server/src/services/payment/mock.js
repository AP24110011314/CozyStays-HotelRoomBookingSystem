export const mockProvider = {
  name: 'mock',

  async createOrder({ amount, currency = 'INR', receipt = '', notes = {} }) {
    const orderId = `mock_order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return {
      orderId,
      amount,
      currency,
      keyId: 'mock_public_key',
      provider: 'mock',
      receipt,
      notes,
    };
  },

  async verifyPayment({ orderId, paymentId, signature, mockSuccess = true }) {
    if (mockSuccess === false || signature === 'invalid_signature') {
      return { valid: false, error: 'Mock payment rejected or invalid signature' };
    }
    const resolvedPaymentId = paymentId || `mock_pay_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return {
      valid: true,
      paymentId: resolvedPaymentId,
      orderId,
    };
  },

  async verifyWebhook({ payload, signature }) {
    if (signature === 'invalid_webhook_signature') {
      return { valid: false, error: 'Invalid webhook signature' };
    }
    const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
    return {
      valid: true,
      event: data?.event || 'payment.captured',
      data: data?.payload || data,
    };
  },

  async refund({ paymentId, amount }) {
    const refundId = `mock_rfnd_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return {
      refundId,
      amount,
      status: 'processed',
      paymentId,
    };
  },
};
