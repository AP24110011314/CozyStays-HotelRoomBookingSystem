# Implementation Plan

## Phase 0: Project Setup & Configuration
- [ ] Create `server/` and `client/` directories with package.json
- [ ] Create `server/.env.example`, `client/.env.example` per SETUP_MAC.md
- [ ] Create real `server/.env`, `client/.env` with PORT=5001, generated JWT_SECRET, placeholder SMTP
- [ ] Add `.env` to `.gitignore`
- [ ] Add npm scripts: server (dev, start, seed, test, lint, reconcile), client (dev, build, preview, test, lint)
- [ ] Install all dependencies
- [ ] Configure ESLint (airbnb-base for server, react for client), Prettier
- [ ] Configure Vitest (server + client)
- [ ] Initialize git repo

**Commit**: `phase-0: project setup, config, dependencies`

## Phase 1: Database Models & Core Config
- [ ] `server/src/config/env.js` — typed config, single env access point
- [ ] `server/src/config/db.js` — Mongoose connection
- [ ] `server/src/config/mail.js` — Nodemailer transporter (Mailtrap + Ethereal fallback)
- [ ] Models: `User`, `Room`, `Booking`, `RoomNight`, `EmailOutbox` with indexes
- [ ] Unique index on `RoomNight { room: 1, date: 1 }`
- [ ] `server/src/utils/errors.js` — `AppError` class, error codes
- [ ] `server/src/utils/dates.js` — UTC date-only helpers, range generation
- [ ] `server/src/utils/reference.js` — `HB-XXXXXX` generator
- [ ] `server/src/utils/jwt.js` — sign, verify
- [ ] Global error middleware

**Commit**: `phase-1: models, config, core utils`

## Phase 2: Authentication
- [ ] `authService`: register, login, me
- [ ] `authController`: register, login, me
- [ ] `authRoutes`: POST /register, POST /login, GET /me
- [ ] Middleware: `authenticate` (JWT → req.user), `authorize(...roles)`
- [ ] Validation schemas (Zod) for register, login
- [ ] Tests: register, login, me, validation, duplicate email, invalid creds

**Commit**: `phase-2: auth (register, login, me, JWT, roles)`

## Phase 3: Room Catalog (Admin + Public)
- [ ] `roomService`: CRUD, toggle, list with filters
- [ ] `roomController`: all endpoints
- [ ] `roomRoutes`: public GET /rooms, GET /rooms/:id, GET /rooms/:id/unavailable-dates; admin POST/PATCH/DELETE /admin/rooms
- [ ] Validation schemas
- [ ] Availability service integration (filter by RoomNight)
- [ ] Tests: CRUD, filters, pagination, sorting, unavailable dates, admin auth

**Commit**: `phase-3: room catalog (public search, admin CRUD, availability)`

## Phase 4: Booking Management
- [ ] `bookingService`: create, list (status tabs), detail, modify, cancel, derived status, canCancel
- [ ] `bookingController`: all endpoints
- [ ] `bookingRoutes`: guest POST/GET/PATCH/DELETE /bookings; admin GET/DELETE /admin/bookings
- [ ] Concurrency-safe create via RoomNight unique index
- [ ] Modify: claim new nights first, release old last
- [ ] Cancel: 48h window, idempotent, admin bypass
- [ ] Validation schemas
- [ ] Tests: all CRUD, status derivation, 48h window, concurrency (mandatory), modify logic

**Commit**: `phase-4: booking management (create, list, modify, cancel, concurrency)`

## Phase 5: Email System
- [ ] `EmailOutbox` model (already in Phase 1)
- [ ] `emailService`: enqueueConfirmation, enqueueModification, enqueueCancellation, template rendering, .ics generation
- [ ] `emailWorker.js`: 15s interval, atomic claim, exponential backoff, max 5 attempts, stuck recovery (10min)
- [ ] Worker startup in `server/src/index.js`
- [ ] Mailtrap/Ethereal transporter
- [ ] Tests: enqueue, templates, .ics, retry backoff, max attempts, stuck recovery, non-blocking

**Commit**: `phase-5: email system (outbox, worker, templates, .ics, retry)`

## Phase 6: Admin Dashboard
- [ ] `adminService`: stats, occupancy, failed emails list, retry
- [ ] `adminController`: all endpoints
- [ ] `adminRoutes`: GET /admin/stats, GET /admin/occupancy, GET/POST /admin/failed-emails
- [ ] Occupancy calendar: month view, per-room nights
- [ ] Tests: stats, occupancy, failed emails, retry

**Commit**: `phase-6: admin dashboard (stats, occupancy, failed emails)`

## Phase 7: Client Application
- [ ] Vite + React + Tailwind setup
- [ ] Axios instance + interceptors
- [ ] TanStack Query provider + hooks (all API endpoints)
- [ ] AuthContext + login/register forms
- [ ] Pages: Home, RoomsList, RoomDetail, Login, Register, MyBookings, BookingDetail, BookingConfirm
- [ ] Admin pages: Dashboard, RoomsManage, BookingsManage, OccupancyCalendar, FailedEmails
- [ ] Components: UI primitives, RoomCard, BookingCard, DateRangePicker, Modal, Table, StatsCard, OccupancyCalendar
- [ ] React Day Picker integration with unavailable dates
- [ ] Tests: component tests, hook tests, smoke tests

**Commit**: `phase-7: client application (all pages, components, state)`

## Phase 8: Seed Script & Final Verification
- [ ] `server/seeds/seed.js`: admin, 2 guests, 20 rooms, 8 bookings + RoomNights
- [ ] Refuses when `NODE_ENV=production`
- [ ] `npm run reconcile` script to fix orphaned RoomNights
- [ ] Run full test suite (server + client)
- [ ] Run lint (server + client)
- [ ] Manual QA checklist (TESTING.md)
- [ ] Verify: health endpoint, client loads, booking → email, double-book blocked

**Commit**: `phase-8: seed, reconcile, final verification`

---

## Decisions
*Decisions made when docs were ambiguous — recorded here for traceability.*

1. **JWT expiry**: 15 minutes (configurable via JWT_EXPIRES_IN), no refresh token — simple, matches spec "JWT" without specifying refresh.
2. **Price storage**: Cents (integers) — avoids floating-point, matches DATABASE_SCHEMA.md.
3. **Booking status**: Derived on read, not stored — single source of truth, no sync issues.
4. **RoomNight unique index**: `{ room: 1, date: 1 }` — natural lock for concurrency, no transactions needed.
5. **Email worker**: In-process, 15s interval — spec says "in-process worker", no separate process needed.
6. **Ethereal fallback**: Auto-create test account if no SMTP creds — enables email testing without Mailtrap.
7. **Date format**: ISO 8601 UTC throughout (YYYY-MM-DDT00:00:00.000Z) — matches "UTC date-only everywhere".
8. **Reference format**: `HB-` + 6 uppercase alphanumeric — `HB-XXXXXX` per spec.
9. **bcrypt cost**: 12 — per spec.
10. **CORS**: Exact CLIENT_URL only — per spec.
11. **Pagination defaults**: page=1, limit=10, max=50 — standard, matches API_SPEC.md.
12. **Sort options**: priceAsc, priceDesc, name, type — per API_SPEC.md.
13. **Admin bypass on cancel**: Full bypass of 48h window — per PRD "admin bypass".
14. **Idempotent cancel**: Returns booking without error if already cancelled — per spec.
15. **Stuck email recovery**: 10 minutes — per EMAIL_SYSTEM.md.
16. **Seed refusal**: Check `NODE_ENV === 'production'` — per spec.