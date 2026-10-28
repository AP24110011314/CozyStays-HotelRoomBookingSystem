import env from '../../config/env.js';

import { mockProvider } from './mock.js';
import { razorpayProvider } from './razorpay.js';

export function getPaymentProvider() {
  if (env.paymentProvider === 'razorpay') {
    return razorpayProvider;
  }
  return mockProvider;
}

export default getPaymentProvider();
