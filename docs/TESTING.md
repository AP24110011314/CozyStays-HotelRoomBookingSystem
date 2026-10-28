# Testing Specification

## Server Tests (Vitest + Supertest + mongodb-memory-server)

### Unit Tests — Services
| Service | Tests |
|---------|-------|
| `authService` | register (hashes password, returns token), login (validates password, returns token), me |
| `roomService` | CRUD, toggle active, list with filters |
| `bookingService` | create (price computed, reference format, RoomNight claimed), list (status tabs, pagination), detail, modify (claim new first, release old last), cancel (48h window, idempotent, admin bypass), derived status, canCancel |
| `availabilityService` | search (filters, sort, pagination, nights/totalPrice), unavailable dates |
| `emailService` | enqueue (confirmation, modification, cancellation), template rendering, .ics generation |
| `adminService` | stats, occupancy, failed emails list, retry |

### Integration Tests — Routes
| Route | Tests |
|-------|-------|
| `POST /auth/register` | 201 + token, 400 validation, 409 duplicate email |
| `POST /auth/login` | 200 + token, 401 invalid creds, 400 validation |
| `GET /auth/me` | 200 user, 401 no token, 401 invalid token |
| `GET /rooms` | 200 with filters, pagination, computed fields |
| `GET /rooms/:id` | 200 room, 404 not found |
| `GET /rooms/:id/unavailable-dates` | 200 dates array |
| `POST /admin/rooms` | 201 (admin), 403 (guest), 400 validation |
| `PATCH /admin/rooms/:id` | 200, 403, 404 |
| `PATCH /admin/rooms/:id/toggle` | 200 toggles |
| `DELETE /admin/rooms/:id` | 204, 403, 404 |
| `POST /bookings` | 201 + booking, 400 validation, 409 ROOM_UNAVAILABLE, 401 unauth |
| `GET /bookings` | 200 tabs + pagination, 401 |
| `GET /bookings/:id` | 200 (owner), 403 (other guest), 200 (admin) |
| `PATCH /bookings/:id` | 200 modify, 409 ROOM_UNAVAILABLE, 403, 400 |
| `DELETE /bookings/:id` | 200 cancel, 409 CANCEL_WINDOW_EXPIRED, 403, 404, idempotent |
| `GET /admin/bookings` | 200 filters + pagination |
| `DELETE /admin/bookings/:id` | 200 bypasses 48h |
| `GET /admin/stats` | 200 stats |
| `GET /admin/occupancy` | 200 month grid |
| `GET /admin/failed-emails` | 200 list |
| `POST /admin/failed-emails/:id/retry` | 200 re-queues |

### Mandatory Matrix Tests
1. **Availability Overlap Table** (from AVAILABILITY_LOGIC.md)
   - 7 test cases covering all overlap scenarios

2. **Concurrency Test**
   - Spawn 10 parallel `POST /bookings` for same room/dates
   - Assert: exactly 1 × 201, 9 × 409 ROOM_UNAVAILABLE
   - Assert: RoomNight count = nights (no orphans)
   - Assert: Booking count = 1

3. **Email Retry Tests**
   - Mock transporter to fail first 2 attempts, succeed on 3rd → verify backoff, attempts=3, status=sent
   - Mock transporter to fail all 5 → verify status=failed, attempts=5
   - Mock transporter to hang (timeout) → verify stuck recovery re-queues after 10min
   - Verify booking creation succeeds when email worker is down

### 4. Payment Test Suite (mongodb-memory-server + Mock Provider)
- **Pay at Hotel**: `POST /bookings` creates confirmed booking and Payment `pay_at_hotel`.
- **Online Hold**: `POST /bookings` creates `pending_payment`, holds nights (concurrent guest receives 409), and sets `holdExpiresAt`.
- **Signature Verification**: Valid signature confirms booking; invalid signature rejected; amount mismatch rejected; duplicate calls idempotent.
- **Hold Expiry**: Expiry cron releases `RoomNight` rows; room reappears in search; late confirmation handles re-claim or refund.
- **Webhook Handling**: Webhook signature verification and idempotent event processing (`payment.captured`, `payment.failed`, `refund.processed`).
- **Cancellation Refund**: Cancelling paid booking in window issues provider refund; admin cancel bypasses window and refunds.
- **Modification Refund / Restriction**: Lower total automatically refunds difference; higher total returns 409 `PAYMENT_REQUIRED_FOR_CHANGE`.
- **Security**: Client amount is never trusted; server always computes total from room price and dates.

### Test Utilities
- `createTestUser(role)` → returns { user, token }
- `createTestRoom(overrides)` → returns room
- `createTestBooking(user, room, dates)` → returns booking + RoomNights
- `dateRange(checkIn, checkOut)` → array of Date objects (UTC midnight)
- `mockTransporter` — configurable mock for nodemailer

## Client Tests (Vitest + React Testing Library)

### Component Tests
| Component | Tests |
|-----------|-------|
| `LoginForm` | submits, shows errors, redirects on success |
| `RegisterForm` | validates, submits, password match |
| `RoomCard` | renders price, nights, total, book button |
| `BookingCard` | shows status, cancel button when canCancel |
| `DateRangePicker` | selects range, disables unavailable dates |
| `RoomForm` (admin) | creates, edits, validates |
| `BookingForm` | validates dates, guests |
| `OccupancyCalendar` | renders month, highlights booked cells |
| `StatsCard` | displays value, label |
| `Modal` | opens, closes, traps focus |
| `Toast` | shows success/error |

### Hook Tests
| Hook | Tests |
|------|-------|
| `useAuth` | login/logout updates context, persists token |
| `useAvailability` | fetches on param change, caches |
| `useDateRange` | manages checkIn/checkOut state |

### Page Tests (Smoke)
- `/rooms` loads, filters work, pagination works
- `/rooms/:id` shows details, booking widget works
- `/bookings` tabs switch, list renders
- `/admin` stats load, navigation works

## E2E Tests (Optional — Manual QA Checklist)

### Manual QA Checklist
- [ ] `GET /api/health` returns `{ status: 'ok' }`
- [ ] Client loads at `http://localhost:5173`
- [ ] Register → login → JWT stored → `/auth/me` works
- [ ] Search rooms with dates → results show nights & totalPrice
- [ ] Date picker shows unavailable dates from API
- [ ] Book room → success → reference `HB-XXXXXX` → email in Mailtrap/Ethereal
- [ ] Book same room/dates twice → 2nd returns 409 ROOM_UNAVAILABLE
- [ ] My Bookings: tabs filter correctly
- [ ] Modify booking (extend dates) → claims new nights, releases old
- [ ] Cancel booking >48h before → success, RoomNights released
- [ ] Cancel booking <48h before → 409 CANCEL_WINDOW_EXPIRED
- [ ] Admin login → dashboard shows stats
- [ ] Admin creates room → appears in list, toggle works
- [ ] Admin cancels any booking (bypasses 48h)
- [ ] Occupancy calendar shows booked nights per room
- [ ] Failed emails page shows stuck/failed, retry works
- [ ] Seed script runs, creates 20 rooms, 8 bookings, 3 users
- [ ] Seed refuses when `NODE_ENV=production`
- [ ] `npm run test` passes in both server/ and client/
- [ ] `npm run lint` passes in both

## Test Commands
```bash
# Server
cd server
npm run test        # all tests
npm run test:watch  # watch mode
npm run test:coverage

# Client
cd client
npm run test
npm run test:watch
npm run test:coverage
```

## Coverage Targets
- Services: 90%+
- Routes: 80%+
- Components: 70%+
- Overall: 80%+