# Implementation Plan

## Phase 0: Project Setup & Configuration
- [x] Create `server/` and `client/` directories with package.json
- [x] Create `server/.env.example`, `client/.env.example` per SETUP_MAC.md
- [x] Create real `server/.env`, `client/.env` with PORT=5001, generated JWT_SECRET, placeholder SMTP
- [x] Add `.env` to `.gitignore`
- [x] Add npm scripts: server (dev, start, seed, test, lint, reconcile), client (dev, build, preview, test, lint)
- [x] Install all dependencies
- [x] Configure ESLint (airbnb-base for server, react for client), Prettier
- [x] Configure Vitest (server + client)
- [x] Initialize git repo

**Commit**: `phase-0: project setup, config, dependencies`

## Phase 1: Database Models & Core Config
- [x] `server/src/config/env.js` — typed config, single env access point, Zod validated
- [x] `server/src/config/db.js` — Mongoose connection to Atlas, syncIndexes(), unique index verification
- [x] `server/src/config/mail.js` — Nodemailer transporter (Mailtrap + Ethereal fallback)
- [x] Models: `User`, `Room`, `Booking`, `RoomNight`, `EmailOutbox` with indexes
- [x] Unique index on `RoomNight { room: 1, date: 1 }`
- [x] `server/src/utils/errors.js` — `AppError` class, error codes
- [x] `server/src/utils/dates.js` — UTC date-only helpers, range generation
- [x] `server/src/utils/reference.js` — `HB-XXXXXX` generator
- [x] `server/src/utils/jwt.js` — sign, verify
- [x] Global error middleware

**Commit**: `phase-1: models, config, core utils`

## Phase 2: Authentication
- [x] `authService`: register, login, me
- [x] `authController`: register, login, me
- [x] `authRoutes`: POST /register, POST /login, GET /me
- [x] Middleware: `authenticate` (JWT → req.user), `authorize(...roles)`
- [x] Validation schemas (Zod) for register, login
- [x] Tests: register, login, me, validation, duplicate email, invalid creds

**Commit**: `phase-2: auth (register, login, me, JWT, roles)`

## Phase 3: Room Catalog (Admin + Public)
- [x] `roomService`: CRUD, toggle, list with filters, guarded delete (prevents deleting active/future booked rooms)
- [x] `roomController`: all endpoints
- [x] `roomRoutes`: public GET /rooms, GET /rooms/:id, GET /rooms/:id/unavailable-dates; admin GET/POST/PATCH/DELETE /admin/rooms
- [x] Validation schemas
- [x] Availability service integration (filter by RoomNight)
- [x] Tests: CRUD, filters, pagination, sorting, unavailable dates, admin auth

**Commit**: `phase-3: room catalog (public search, admin CRUD, availability)`

## Phase 4: Booking Management
- [x] `bookingService`: create, list (status tabs), detail, modify, cancel, derived status, canCancel
- [x] `bookingController`: all endpoints
- [x] `bookingRoutes`: guest POST/GET/PATCH/DELETE /bookings; admin GET/DELETE /admin/bookings
- [x] Concurrency-safe create via RoomNight unique index
- [x] Modify: claim new nights first, release old last
- [x] Cancel: cancellation window rule (env configurable), idempotent, admin bypass
- [x] Validation schemas
- [x] Tests: all CRUD, status derivation, 48h window, concurrency (mandatory), modify logic

**Commit**: `phase-4: booking management (create, list, modify, cancel, concurrency)`

## Phase 5: Email System
- [x] `EmailOutbox` model (already in Phase 1)
- [x] `emailService`: enqueueConfirmation, enqueueModification, enqueueCancellation, template rendering with HTML escaping, .ics generation, dynamic CLIENT_URL links
- [x] `emailWorker.js`: 15s interval, atomic claim, exponential backoff, max 5 attempts, stuck recovery (10min)
- [x] Worker startup in `server/src/index.js`
- [x] Mailtrap/Ethereal transporter
- [x] Tests: enqueue, templates, .ics, retry backoff, max attempts, stuck recovery, non-blocking

**Commit**: `phase-5: email system (outbox, worker, templates, .ics, retry)`

## Phase 6: Admin Dashboard
- [x] `adminService`: stats (bookingsToday, checkInsToday, occupancy next 30 days, revenue this month), occupancy, failed emails list, retry, listRooms, listBookings
- [x] `adminController`: all endpoints
- [x] `adminRoutes`: GET /admin/stats, GET /admin/rooms, GET /admin/occupancy, GET/POST /admin/failed-emails, GET/DELETE /admin/bookings
- [x] Occupancy calendar: month view, per-room nights
- [x] Tests: stats, occupancy, failed emails, retry

**Commit**: `phase-6: admin dashboard (stats, occupancy, failed emails)`

## Phase 7: Client Application
- [x] Vite + React + Tailwind setup (strictly light-theme only, no dark mode, color-scheme: light)
- [x] Axios instance + interceptors reading VITE_API_URL
- [x] TanStack Query provider + hooks (all API endpoints)
- [x] AuthContext + login/register forms
- [x] Pages: Home/Rooms, RoomDetail, Login, Register, MyBookings, BookingDetail, BookingCreate, NotFound (404)
- [x] Admin pages: Dashboard, RoomsManage (modal, search, guarded delete), BookingsManage (filter by status, room, dates, search, detail, modify, cancel), OccupancyCalendar, FailedEmails (with retry button)
- [x] Components: UI primitives, RoomCard (4:3 aspect ratio, Lucide amenity icons, lazy load), DateRangePicker (1 month on mobile, 2 on desktop), Mobile filter drawer, sticky booking bar on mobile, min 44px tap targets
- [x] React Day Picker integration with unavailable dates
- [x] Custom hotel favicon (SVG, ICO, PNGs), webmanifest, OG tags, useDocumentTitle hook
- [x] Tests: component tests, hook tests, smoke tests (29 passing)

**Commit**: `phase-7: client application (all pages, components, state, mobile-first light theme)`

## Phase 8: Seed Script & Final Verification
- [x] `server/seeds/seed.js`: admin, 2 guests, 20 rooms (4 types: single, double, deluxe, suite), 8 bookings + 24 RoomNights
- [x] Cloud safety: requires explicit `--yes` flag or interactive confirmation, reports document counts before and after
- [x] Refuses when `NODE_ENV=production`
- [x] `npm run reconcile` script to fix orphaned RoomNights
- [x] Run full test suite (server 32 passed + client 29 passed)
- [x] Run lint (server 0 errors + client 0 errors)
- [x] Run client production build (`vite build` passes)
- [x] Manual QA checklist (TESTING.md)
- [x] Verify: health endpoint, client loads, booking → email, double-book blocked, Atlas DB connected

**Commit**: `phase-8: seed, reconcile, final verification`

---

## Decisions
*Decisions made when docs were ambiguous — recorded here for traceability.*

1. **JWT expiry**: 15 minutes (configurable via JWT_EXPIRES_IN), no refresh token — simple, matches spec "JWT" without specifying refresh.
2. **Price storage**: Cents/Paise (integers) — avoids floating-point, matches DATABASE_SCHEMA.md.
3. **Booking status**: Derived on read, not stored — single source of truth, no sync issues.
4. **RoomNight unique index**: `{ room: 1, date: 1 }` — natural lock for concurrency, no transactions needed.
5. **Email worker**: In-process, 15s interval — spec says "in-process worker", no separate process needed.
6. **Ethereal fallback**: Auto-create test account if no SMTP creds — enables email testing without Mailtrap.
7. **Date format**: ISO 8601 UTC throughout (YYYY-MM-DDT00:00:00.000Z) — matches "UTC date-only everywhere".
8. **Reference format**: `HB-` + 6 uppercase alphanumeric — `HB-XXXXXX` per spec.
9. **bcrypt cost**: 12 — per spec.
10. **CORS**: Support comma-separated CLIENT_URL list in env.js to allow multiple origins.
11. **Pagination defaults**: page=1, limit=10, max=50 — standard, matches API_SPEC.md.
12. **Sort options**: priceAsc, priceDesc, name, type — per API_SPEC.md.
13. **Admin bypass on cancel**: Full bypass of 48h window — per PRD "admin bypass".
14. **Idempotent cancel**: Returns booking without error if already cancelled — per spec.
15. **Stuck email recovery**: 10 minutes — per EMAIL_SYSTEM.md.
16. **Seed refusal**: Check `NODE_ENV === 'production'` — per spec.
17. **MongoDB Atlas as Default**: Default database is MongoDB Atlas cloud cluster via `MONGODB_URI` in `.env`. Local MongoDB is kept as an optional alternative. No fallback to `127.0.0.1` exists.
18. **Cloud Database Seed Safety**: Requires explicit `--yes` flag or prompt, logs database name and document count deltas, refuses on production.
19. **Guarded Room Deletion**: Deletion of rooms with active or future confirmed bookings is blocked with 409 Conflict error.
20. **Admin Rooms Route**: Added `GET /api/admin/rooms` with pagination and search to allow administrative catalog management without requiring public checkIn/checkOut query parameters.
21. **Light Theme Only Enforcement**: Forced `color-scheme: light` globally via CSS and HTML meta tags. All dark mode classes and selectors removed.
22. **Mobile Layout Optimizations**: Date range picker displays 1 month on mobile (<768px) and 2 months on desktop; filter panel functions as bottom sheet drawer with active-filter count badge; room details includes sticky bottom booking bar on mobile.
23. **Dual Payment Methods**: Checkout supports "Pay online" (cards, UPI, netbanking) and "Pay at hotel".
24. **Payment Provider Abstraction**: Pluggable provider interface (`mock` and `razorpay`). `mock` provider simulates interactive checkout with "Pay successfully" and "Fail payment" buttons for automated and manual zero-credential testing; `razorpay` uses official Razorpay SDK in test mode.
25. **Currency Handling**: Configurable `CURRENCY` (default `INR`). Seed prices configured in realistic rupee denominations (₹1,500 to ₹15,000/night). Formatted in UI via `Intl.NumberFormat`. Razorpay minor units stored and computed as integer paise (paise = rupees * 100).
26. **Zero Card Data Storage**: Server and database never accept, handle, or store sensitive card numbers or CVV. Public key ID sent to client; secret keys verified exclusively on server. Warning emitted at startup if live keys (`rzp_live_`) are loaded in non-production.
27. **Hold and Expiry Lifecycle**: Online bookings hold nights with `status: pending_payment` and `holdExpiresAt = now + PAYMENT_HOLD_MINUTES` (default 15m). Background hold-reaper worker runs every 60s and lazy evaluation frees abandoned inventory automatically.
28. **Paid Booking Modification Rules**: Modification of a paid online booking is permitted only when new total <= paid total, with the differential automatically refunded. When new total is higher, returns 409 `PAYMENT_REQUIRED_FOR_CHANGE` instructing the guest to cancel and rebook.
29. **Idempotent Verification & Cancellation Refunds**: Timing-safe HMAC signature verification on `POST /api/payments/verify`. Cancelling a paid booking inside window triggers automatic provider refund and records refund reference; admin cancel bypasses window and refunds.