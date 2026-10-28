# API Specification

## Base
- **URL**: `http://localhost:5001/api`
- **Auth**: `Authorization: Bearer <jwt>`
- **Content-Type**: `application/json`
- **Error shape**: `{ error: { code, message, details? } }`

## Error Codes
| Code | HTTP | Description |
|------|------|-------------|
| `VALIDATION_ERROR` | 400 | Zod validation failed |
| `UNAUTHORIZED` | 401 | Missing/invalid/expired token |
| `FORBIDDEN` | 403 | Role mismatch |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Duplicate (email, reference) |
| `ROOM_UNAVAILABLE` | 409 | Dates booked |
| `CANCEL_WINDOW_EXPIRED` | 409 | <48h to check-in |
| `INTERNAL_ERROR` | 500 | Unexpected |

## Auth
### POST `/auth/register`
**Body**: `{ email, password, name }`
**Response 201**: `{ data: { user: { id, email, name, role }, token } }`

### POST `/auth/login`
**Body**: `{ email, password }`
**Response 200**: `{ data: { user: { id, email, name, role }, token } }`

### GET `/auth/me`
**Auth**: required
**Response 200**: `{ data: { user: { id, email, name, role } } }`

## Config (Public)
### GET `/config/public`
**Auth**: none
**Response 200**: `{ data: { cancellationWindowHours, currency, checkInTime, checkOutTime, paymentMethods, paymentHoldMinutes } }`

## Rooms (Public)
### GET `/rooms`
**Query**: `checkIn`, `checkOut` (required), `guests`, `minPrice`, `maxPrice`, `type`, `amenities` (comma-separated), `sort` (priceAsc|priceDesc|name|type), `page`, `limit`
**Response 200**: `{ data: RoomWithPrice[], meta: { page, limit, total, totalPages } }`

**RoomWithPrice**: `{ id, name, type, description, basePrice, maxGuests, amenities, photos, nights, totalPrice }`

### GET `/rooms/:id`
**Response 200**: `{ data: Room }` (full room, no price calc)

### GET `/rooms/:id/unavailable-dates`
**Query**: `from`, `to` (required, ISO date)
**Response 200**: `{ data: { unavailableDates: string[] } }` (ISO dates)

## Rooms (Admin)
### POST `/admin/rooms`
**Auth**: admin
**Body**: `{ name, type, description, basePrice, maxGuests, amenities[], photos[] }`
**Response 201**: `{ data: Room }`

### PATCH `/admin/rooms/:id`
**Auth**: admin
**Body**: partial room fields
**Response 200**: `{ data: Room }`

### PATCH `/admin/rooms/:id/toggle`
**Auth**: admin
**Response 200**: `{ data: Room }`

### DELETE `/admin/rooms/:id`
**Auth**: admin
**Response 204**: empty

## Bookings (Guest)
### POST `/bookings`
**Auth**: guest
**Body**: `{ roomId, checkIn, checkOut, guests, paymentMethod? }` (`paymentMethod`: `'online'` | `'pay_at_hotel'`, default `'pay_at_hotel'`)
**Response 201**: `{ data: BookingWithRoom, payment?: { provider, orderId, amount, currency, keyId } }`

**BookingWithRoom**: `{ id, reference, room: RoomSummary, checkIn, checkOut, guests, totalPrice, status, paymentMethod, paymentStatus, holdExpiresAt, canCancel, createdAt }`

### GET `/bookings`
**Auth**: guest
**Query**: `status` (upcoming|active|completed|cancelled|pending_payment|expired), `page`, `limit`
**Response 200**: `{ data: BookingWithRoom[], meta: { page, limit, total, totalPages } }`

### GET `/bookings/:id`
**Auth**: guest (owner) or admin
**Response 200**: `{ data: BookingWithRoom }`

### POST `/bookings/:id/pay`
**Auth**: guest (owner) or admin
**Response 200**: `{ data: { provider, orderId, amount, currency, keyId, holdExpiresAt } }`

### PATCH `/bookings/:id`
**Auth**: guest (owner) or admin
**Body**: `{ checkIn?, checkOut?, guests? }` (at least one)
**Response 200**: `{ data: BookingWithRoom, refund?: { amount, status } }`

### DELETE `/bookings/:id`
**Auth**: guest (owner) or admin
**Response 200**: `{ data: BookingWithRoom, refund?: { amount, status } }` (cancelled)

## Payments
### POST `/payments/verify`
**Auth**: guest (owner)
**Body**: `{ bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature }` (or `{ bookingId, mockSuccess: true }` for mock provider)
**Response 200**: `{ data: { booking: BookingWithRoom, payment: Payment } }`

### POST `/payments/webhook`
**Auth**: none (HMAC signature in `X-Razorpay-Signature` verified with `RAZORPAY_WEBHOOK_SECRET`)
**Body**: raw JSON payload
**Response 200**: `{ received: true }`

### GET `/payments/booking/:bookingId`
**Auth**: guest (owner) or admin
**Response 200**: `{ data: Payment }`

## Bookings & Payments (Admin)
### GET `/admin/bookings`
**Auth**: admin
**Query**: `status`, `paymentStatus`, `from`, `to`, `guestEmail`, `page`, `limit`
**Response 200**: `{ data: BookingWithRoom[], meta }`

### DELETE `/admin/bookings/:id`
**Auth**: admin
**Response 200**: `{ data: BookingWithRoom, refund?: { amount, status } }` (cancelled, bypasses 48h)

### GET `/admin/payments`
**Auth**: admin
**Query**: `status`, `from`, `to`, `q`, `page`, `limit`
**Response 200**: `{ data: Payment[], meta }`

### POST `/admin/bookings/:id/mark-paid`
**Auth**: admin
**Body**: `{ amount?, note? }`
**Response 200**: `{ data: { booking: BookingWithRoom, payment: Payment } }`

### POST `/admin/payments/:id/refund`
**Auth**: admin
**Body**: `{ amount?, reason? }`
**Response 200**: `{ data: { payment: Payment, refund: { providerRefundId, amount } } }`

## Admin Dashboard
### GET `/admin/stats`
**Auth**: admin
**Response 200**: `{ data: { totalRooms, activeBookings, occupancyPct, revenue30d } }`

### GET `/admin/occupancy`
**Auth**: admin
**Query**: `month` (YYYY-MM), `roomId?`
**Response 200**: `{ data: { month, rooms: [{ id, name, nights: { date, booked }[] }] } }`

### GET `/admin/failed-emails`
**Auth**: admin
**Query**: `page`, `limit`
**Response 200**: `{ data: EmailOutbox[], meta }`

### POST `/admin/failed-emails/:id/retry`
**Auth**: admin
**Response 200**: `{ data: EmailOutbox }` (re-queued)

## Health
### GET `/health`
**Response 200**: `{ status: 'ok', timestamp }`

## Reference
- All dates in request/response: ISO 8601 UTC (`YYYY-MM-DDT00:00:00.000Z`)
- Prices in **cents** (integers)
- Pagination: `page` (1-indexed), `limit` (default 10, max 50)
- Sort: `priceAsc`, `priceDesc`, `name`, `type`