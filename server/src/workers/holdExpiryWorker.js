import { expirePendingHolds } from '../services/payment.service.js';

let intervalId = null;

export function startHoldExpiryWorker(intervalMs = 60 * 1000) {
  if (process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST)) {
    return;
  }

  if (intervalId) {
    clearInterval(intervalId);
  }

  intervalId = setInterval(async () => {
    try {
      const expiredCount = await expirePendingHolds();
      if (expiredCount > 0) {
        console.log(`[HoldExpiryWorker] Expired ${expiredCount} hold(s) and released room nights.`);
      }
    } catch (err) {
      console.error('[HoldExpiryWorker] Error during hold expiry check:', err);
    }
  }, intervalMs);

  console.log(`[HoldExpiryWorker] Started with interval ${intervalMs / 1000}s`);
}

export function stopHoldExpiryWorker() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
