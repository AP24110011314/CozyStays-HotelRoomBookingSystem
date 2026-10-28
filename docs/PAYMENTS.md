# Payment Processing Specification

## 1. Overview
The Hotel Booking System supports two distinct payment methods at checkout:
1. **Pay Online**: Instant payment processing via Cards, UPI, and Netbanking using Razorpay (or a built-in Mock provider for test environments without API keys).
2. **Pay at Hotel**: The guest confirms their stay immediately and pays in person during check-in or checkout.

---

## 2. Payment Providers

The payment layer is decoupled behind a unified provider interface (`server/src/services/payment/index.js`):

```javascript
interface PaymentProvider {
  createOrder({ amount, currency, receipt, notes }): Promise<{ orderId, amount, currency, keyId }>;
  verifyPayment({ orderId, paymentId, signature }): Promise<{ valid, error }>;
  verifyWebhook({ payload, signature }): Promise<{ valid, event, data }>;
  refund({ paymentId, amount, notes }): Promise<{ refundId, amount, status }>;
}
```

Configured via `PAYMENT_PROVIDER`:
- **`mock`** (Default): Complete in-memory simulation requiring no API keys. Opens an interactive checkout modal in the frontend with "Pay successfully" and "Fail payment" actions. Generates deterministic mock order IDs and payment IDs (`mock_order_...`, `mock_pay_...`).
- **`razorpay`**: Integrates with Razorpay Orders and Payments API using the official `razorpay` npm package. Requires `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET`.

---

## 3. Data Models

### `Payment` Collection
```javascript
{
  _id: ObjectId,
  booking: ObjectId,         // Ref: bookings, required
  user: ObjectId,            // Ref: users, required
  amount: Number,            // Integer minor units (paise in INR, cents in USD)
  currency: String,          // 'INR', 'USD', etc. (default: 'INR')
  method: String,            // 'online' | 'pay_at_hotel'
  provider: String,          // 'razorpay' | 'mock' | null
  providerOrderId: String,   // Razorpay order ID or mock order ID
  providerPaymentId: String, // Razorpay payment ID or mock payment ID
  status: String,            // 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded' | 'pay_at_hotel'
  refundedAmount: Number,    // Total refunded in minor units, default 0
  refunds: [{
    providerRefundId: String,
    amount: Number,
    createdAt: Date
  }],
  failureReason: String,
  paidAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```
**Indexes**:
- `{ booking: 1 }`
- `{ providerOrderId: 1 }` (unique, sparse)
- `{ providerPaymentId: 1 }` (unique, sparse)
- `{ user: 1, createdAt: -1 }`
- `{ status: 1 }`

### `Booking` Schema Additions
- `paymentMethod`: `'online'` | `'pay_at_hotel'`
- `paymentStatus`: `'pending'` | `'paid'` | `'failed'` | `'refunded'` | `'partially_refunded'` | `'pay_at_hotel'`
- `holdExpiresAt`: Date (set only for `pending_payment` online bookings)
- `status`: `'pending_payment'` | `'confirmed'` | `'cancelled'` | `'expired'`

---

## 4. Payment Workflows

### A. Pay at Hotel
1. Guest selects "Pay at hotel" on `/booking/create`.
2. `POST /api/bookings` is called with `{ roomId, checkIn, checkOut, guests, paymentMethod: 'pay_at_hotel' }`.
3. Nights are claimed atomically via `RoomNight.insertMany`.
4. Booking is created directly with `status: 'confirmed'`, `paymentMethod: 'pay_at_hotel'`, and `paymentStatus: 'pay_at_hotel'`.
5. A `Payment` document is created with `status: 'pay_at_hotel'`.
6. Confirmation email is enqueued immediately.
7. Admin can later record payment receipt upon guest arrival via `POST /api/admin/bookings/:id/mark-paid`.

### B. Pay Online
1. Guest selects "Pay online" on `/booking/create`.
2. `POST /api/bookings` is called with `{ roomId, checkIn, checkOut, guests, paymentMethod: 'online' }`.
3. Nights are claimed atomically via `RoomNight.insertMany` to prevent concurrent double-booking.
4. Booking is created with `status: 'pending_payment'`, `paymentMethod: 'online'`, `paymentStatus: 'pending'`, and `holdExpiresAt = now + PAYMENT_HOLD_MINUTES` (default 15m).
5. A payment order is initiated with the configured payment provider.
6. The API returns `{ data: booking, payment: { provider, orderId, amount, currency, keyId } }`.
7. Client opens Razorpay Checkout (or Mock Checkout dialog) with a live countdown timer showing remaining hold time.
8. On checkout completion:
   - Client sends `POST /api/payments/verify` with `{ bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature }` (or mock payload).
   - Server validates HMAC-SHA256 signature timing-safely (`crypto.timingSafeEqual`).
   - Server verifies the captured amount matches server-calculated booking total.
   - Server transitions `Payment.status = 'paid'`, `Booking.status = 'confirmed'`, `Booking.paymentStatus = 'paid'`, clears `holdExpiresAt`.
   - Confirmation email is enqueued.

### C. Hold Expiry & Automatic Release
- **Worker Schedule**: An in-process background worker runs every 60 seconds.
- **Query**: Searches for bookings where `status === 'pending_payment'` and `holdExpiresAt < now`.
- **Action**:
  - Updates `Booking.status = 'expired'`, `Booking.paymentStatus = 'failed'`.
  - Updates `Payment.status = 'failed'`, `failureReason = 'Hold expired'`.
  - Deletes held `RoomNight` records (`RoomNight.deleteMany({ booking: bookingId })`).
  - The room instantly becomes available for search again.
- **Lazy Expiry**: If a guest opens an expired booking in `/bookings/:id`, lazy evaluation triggers the exact same cleanup.

### D. Cancellations & Automatic Refunds
- **Paid Online Bookings within Cancellation Window**:
  - `DELETE /api/bookings/:id` computes eligibility (before check-in minus `CANCELLATION_WINDOW_HOURS`).
  - Calls provider refund API for the full captured amount.
  - Releases all `RoomNight` rows.
  - Updates `Booking.status = 'cancelled'`, `Payment.status = 'refunded'`, `Payment.refundedAmount = total`.
  - Enqueues cancellation email with refund reference and expected timeline (5–7 business days).
- **Admin Cancellation**: Always bypasses the cancellation window and initiates provider refund.
- **Fault Tolerance**: If provider refund fails (e.g. network timeout), booking is still marked cancelled to free up the room, while payment records `failureReason` and is flagged in the admin panel for manual resolution.

### E. Modifications & Price Adjustments
- If a guest modifies stay dates on a paid online booking:
  - If new total **<** paid amount: new nights claimed, old nights released, difference refunded via provider, modification email sent.
  - If new total **==** paid amount: stay dates updated, no financial transaction needed.
  - If new total **>** paid amount: server rejects with 409 `PAYMENT_REQUIRED_FOR_CHANGE` directing the guest to cancel and rebook.

---

## 5. Webhook Integration

### Route: `POST /api/payments/webhook`
- Middleware parses request as `express.raw({ type: 'application/json' })`.
- Verifies `X-Razorpay-Signature` against `RAZORPAY_WEBHOOK_SECRET`.
- Handled events:
  - `payment.captured`: Confirms booking if client verification had failed or disconnected.
  - `payment.failed`: Records failure reason and updates payment status.
  - `refund.processed`: Confirms provider refund completion.
- Operations are strictly idempotent: processing the same event multiple times produces identical state.

### Local Webhook Testing with Tunnel:
```bash
# Using ngrok
ngrok http 5001

# In Razorpay Dashboard -> Settings -> Webhooks:
# URL: https://<your-subdomain>.ngrok-free.app/api/payments/webhook
# Secret: matches RAZORPAY_WEBHOOK_SECRET in server/.env
# Events: payment.captured, payment.failed, refund.processed
```

---

## 6. Environment Variables

| Variable | Type | Default | Description |
|---|---|---|---|
| `CURRENCY` | String | `INR` | ISO currency code for pricing & formatting |
| `CHECK_IN_TIME` | String | `2:00 PM` | Hotel standard check-in time |
| `CHECK_OUT_TIME` | String | `11:00 AM` | Hotel standard check-out time |
| `PAYMENT_PROVIDER` | Enum | `mock` | `mock` (no keys required) or `razorpay` |
| `RAZORPAY_KEY_ID` | String | — | Required if `PAYMENT_PROVIDER=razorpay` |
| `RAZORPAY_KEY_SECRET` | String | — | Required if `PAYMENT_PROVIDER=razorpay` |
| `RAZORPAY_WEBHOOK_SECRET` | String | — | Required if `PAYMENT_PROVIDER=razorpay` |
| `PAYMENT_HOLD_MINUTES` | Number | `15` | Minutes to hold unpaid inventory before auto-release |

---

## 7. Test Cards & Testing Details

### Mock Provider (`PAYMENT_PROVIDER=mock`)
- Requires zero API keys or external accounts.
- Modal opens with order breakdown and interactive "Pay successfully" and "Fail payment" buttons.

### Razorpay Test Mode (`PAYMENT_PROVIDER=razorpay`)
- **Card**: `4111 1111 1111 1111` (Visa), any expiry date in future, CVV `123`, OTP `123456`
- **UPI**: `success@razorpay`
- **Netbanking**: Any simulated test bank (e.g. HDFC, ICICI, SBI)

