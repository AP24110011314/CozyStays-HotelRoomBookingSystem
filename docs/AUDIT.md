# Audit Report — Hotel Booking System

**Date**: 2026-10-27
**Auditor**: Claude Code

---

## Summary

| Status | Count |
|--------|-------|
| DONE | 28 |
| PARTIAL | 8 |
| MISSING | 32 |
| BROKEN | 5 |
| **Total** | **73** |

---

## Phase-by-Phase Audit

### Phase 0: Project Setup & Configuration

| Item | Status | Note |
|------|--------|------|
| `server/` and `client/` directories with package.json | DONE | Both exist with correct structure |
| `server/.env.example` per SETUP_MAC.md | DONE | Complete with all required vars |
| `client/.env.example` per SETUP_MAC.md | DONE | Has VITE_API_URL |
| Real `server/.env` with JWT_SECRET | DONE | Generated secret present |
| Real `client/.env` | DONE | Present |
| `.env` in `.gitignore` | DONE | Root .gitignore includes .env |
| npm scripts: server (dev, start, seed, test, lint, reconcile) | DONE | All defined in package.json |
| npm scripts: client (dev, build, preview, test, lint) | DONE | All defined in package.json |
| Install all dependencies | DONE | node_modules present in both |
| Configure ESLint (airbnb-base for server, react for client) | DONE | eslint.config.js in both |
| Configure Prettier | DONE | .prettierrc in both |
| Configure Vitest (server + client) | DONE | vitest.config.js in both |
| Initialize git repo | DONE | Git history exists |

### Phase 1: Database Models & Core Config

| Item | Status | Note |
|------|--------|------|
| `server/src/config/env.js` — typed config, single env access | DONE | Complete, validates JWT_SECRET |
| `server/src/config/db.js` — Mongoose connection | DONE | Connection handling + SIGINT/SIGTERM |
| `server/src/config/mail.js` — Nodemailer transporter (Mailtrap + Ethereal fallback) | DONE | Complete with fallback logic |
| Model: `User` with indexes | DONE | Email unique index, passwordHash select:false |
| Model: `Room` with indexes | DONE | Active, type indexes |
| Model: `Booking` with indexes | DONE | User, room, reference unique, status indexes |
| Model: `RoomNight` with unique `{ room: 1, date: 1 }` | DONE | Critical concurrency lock index |
| Model: `EmailOutbox` with indexes | DONE | Status+nextRetryAt, lockedAt indexes |
| `server/src/utils/errors.js` — `AppError` class, error codes | DONE | All codes from API_SPEC.md |
| `server/src/utils/dates.js` — UTC date-only helpers, range generation | DONE | All required functions present |
| `server/src/utils/reference.js` — `HB-XXXXXX` generator | DONE | 6 uppercase alphanumeric |
| `server/src/utils/jwt.js` — sign, verify, decode | DONE | Uses env config |
| Global error middleware | BROKEN | Undefined `req`/`res` in notFoundHandler |

### Phase 2: Authentication

| Item | Status | Note |
|------|--------|------|
| `authService`: register, login, me | DONE | bcrypt cost 12, JWT tokens |
| `authController`: register, login, me | MISSING | File doesn't exist |
| `authRoutes`: POST /register, POST /login, GET /me | PARTIAL | Routes exist, import missing controller |
| Middleware: `authenticate` (JWT → req.user) | DONE | Verifies token, attaches user |
| Middleware: `authorize(...roles)` | DONE | Checks role, returns 403 |
| Validation schemas (Zod) for register, login | DONE | In routes/auth.js |
| Tests: register, login, me, validation, duplicate email, invalid creds | MISSING | No test files exist |

### Phase 3: Room Catalog (Admin + Public)

| Item | Status | Note |
|------|--------|------|
| `roomService`: CRUD, toggle, list with filters | DONE | Complete with availability check |
| `roomController`: all endpoints | MISSING | File doesn't exist |
| `roomRoutes`: public GET /rooms, GET /rooms/:id, GET /rooms/:id/unavailable-dates; admin POST/PATCH/DELETE /admin/rooms | PARTIAL | Routes exist, import missing controller |
| Validation schemas | DONE | In routes/rooms.js |
| Availability service integration (filter by RoomNight) | DONE | In roomService.searchRooms |
| Tests: CRUD, filters, pagination, sorting, unavailable dates, admin auth | MISSING | No test files exist |

### Phase 4: Booking Management

| Item | Status | Note |
|------|--------|------|
| `bookingService`: create, list, detail, modify, cancel, derived status, canCancel | MISSING | File doesn't exist |
| `bookingController`: all endpoints | MISSING | File doesn't exist |
| `bookingRoutes`: guest POST/GET/PATCH/DELETE /bookings; admin GET/DELETE /admin/bookings | PARTIAL | Routes exist, import missing controller |
| Concurrency-safe create via RoomNight unique index | MISSING | Logic belongs in bookingService |
| Modify: claim new nights first, release old last | MISSING | Logic belongs in bookingService |
| Cancel: 48h window, idempotent, admin bypass | MISSING | Logic belongs in bookingService |
| Validation schemas | DONE | In routes/bookings.js |
| Tests: all CRUD, status derivation, 48h window, concurrency (mandatory), modify logic | MISSING | No test files exist |

### Phase 5: Email System

| Item | Status | Note |
|------|--------|------|
| `EmailOutbox` model | DONE | Complete (in Phase 1) |
| `emailService`: enqueueConfirmation, enqueueModification, enqueueCancellation, template rendering, .ics generation | MISSING | File doesn't exist |
| `emailWorker.js`: 15s interval, atomic claim, exponential backoff, max 5 attempts, stuck recovery (10min) | MISSING | File doesn't exist |
| Worker startup in `server/src/index.js` | BROKEN | Imports non-existent module |
| Mailtrap/Ethereal transporter | DONE | In config/mail.js |
| Tests: enqueue, templates, .ics, retry backoff, max attempts, stuck recovery, non-blocking | MISSING | No test files exist |

### Phase 6: Admin Dashboard

| Item | Status | Note |
|------|--------|------|
| `adminService`: stats, occupancy, failed emails list, retry | MISSING | File doesn't exist |
| `adminController`: all endpoints | MISSING | File doesn't exist |
| `adminRoutes`: GET /admin/stats, GET /admin/occupancy, GET/POST /admin/failed-emails | PARTIAL | Routes exist, import missing controller |
| Occupancy calendar: month view, per-room nights | MISSING | Logic belongs in adminService |
| Tests: stats, occupancy, failed emails, retry | MISSING | No test files exist |

### Phase 7: Client Application

| Item | Status | Note |
|------|--------|------|
| Vite + React + Tailwind setup | PARTIAL | Config files exist, no source code |
| Axios instance + interceptors | MISSING | No source files |
| TanStack Query provider + hooks (all API endpoints) | MISSING | No source files |
| AuthContext + login/register forms | MISSING | No source files |
| Pages: Home, RoomsList, RoomDetail, Login, Register, MyBookings, BookingDetail, BookingConfirm | MISSING | No source files |
| Admin pages: Dashboard, RoomsManage, BookingsManage, OccupancyCalendar, FailedEmails | MISSING | No source files |
| Components: UI primitives, RoomCard, BookingCard, DateRangePicker, Modal, Table, StatsCard, OccupancyCalendar | MISSING | No source files |
| React Day Picker integration with unavailable dates | MISSING | No source files |
| Tests: component tests, hook tests, smoke tests | MISSING | Only setup.js exists |

### Phase 8: Seed Script & Final Verification

| Item | Status | Note |
|------|--------|------|
| `server/seeds/seed.js`: admin, 2 guests, 20 rooms, 8 bookings + RoomNights | MISSING | Directory empty |
| Refuses when `NODE_ENV=production` | MISSING | Script doesn't exist |
| `npm run reconcile` script to fix orphaned RoomNights | MISSING | File doesn't exist |
| Run full test suite (server + client) | MISSING | No tests exist |
| Run lint (server + client) | BROKEN | Server lint fails (missing imports), client lint fails (no files) |
| Manual QA checklist (TESTING.md) | MISSING | Can't run without implementation |

---

## Specific Requirements Check

### API Endpoints (from API_SPEC.md)

| Endpoint | Status | Note |
|----------|--------|------|
| GET /api/health | DONE | Route + handler in health.js |
| POST /api/auth/register | PARTIAL | Route exists, controller missing |
| POST /api/auth/login | PARTIAL | Route exists, controller missing |
| GET /api/auth/me | PARTIAL | Route exists, controller missing |
| GET /api/rooms (search) | PARTIAL | Route exists, controller missing |
| GET /api/rooms/:id | PARTIAL | Route exists, controller missing |
| GET /api/rooms/:id/unavailable-dates | PARTIAL | Route exists, controller missing |
| POST /api/admin/rooms | PARTIAL | Route exists, controller missing |
| PATCH /api/admin/rooms/:id | PARTIAL | Route exists, controller missing |
| PATCH /api/admin/rooms/:id/toggle | PARTIAL | Route exists, controller missing |
| DELETE /api/admin/rooms/:id | PARTIAL | Route exists, controller missing |
| POST /api/bookings | PARTIAL | Route exists, controller missing |
| GET /api/bookings | PARTIAL | Route exists, controller missing |
| GET /api/bookings/:id | PARTIAL | Route exists, controller missing |
| PATCH /api/bookings/:id | PARTIAL | Route exists, controller missing |
| DELETE /api/bookings/:id | PARTIAL | Route exists, controller missing |
| GET /api/admin/bookings | PARTIAL | Route exists, controller missing |
| DELETE /api/admin/bookings/:id | PARTIAL | Route exists, controller missing |
| GET /api/admin/stats | PARTIAL | Route exists, controller missing |
| GET /api/admin/occupancy | PARTIAL | Route exists, controller missing |
| GET /api/admin/failed-emails | PARTIAL | Route exists, controller missing |
| POST /api/admin/failed-emails/:id/retry | PARTIAL | Route exists, controller missing |

### Database Indexes (from DATABASE_SCHEMA.md)

| Index | Status | Note |
|-------|--------|------|
| users: `{ email: 1 }` unique | DONE | In User model |
| rooms: `{ active: 1 }` | DONE | In Room model |
| rooms: `{ type: 1 }` | DONE | In Room model |
| bookings: `{ user: 1, createdAt: -1 }` | DONE | In Booking model |
| bookings: `{ room: 1, checkIn: 1 }` | DONE | In Booking model |
| bookings: `{ reference: 1 }` unique | DONE | In Booking model |
| bookings: `{ status: 1 }` | DONE | In Booking model |
| room_nights: `{ room: 1, date: 1 }` **UNIQUE** | DONE | Critical for concurrency |
| email_outbox: `{ status: 1, nextRetryAt: 1 }` | DONE | In EmailOutbox model |
| email_outbox: `{ lockedAt: 1 }` | DONE | For stuck recovery |

### Mandatory Test Matrices (from TESTING.md)

| Test | Status | Note |
|------|--------|------|
| Availability Overlap Table (7 cases) | MISSING | No tests exist |
| Concurrency Test (10 parallel → 1 success, 9×409) | MISSING | No tests exist |
| Email Retry Tests (backoff, max attempts, stuck recovery, non-blocking) | MISSING | No tests exist |

### Booking Logic Verification

| Requirement | Status | Note |
|-------------|--------|------|
| Modify claims new nights before releasing old ones | MISSING | bookingService missing |
| Modify leaves booking unchanged on 409 | MISSING | bookingService missing |
| Cancel enforces 48h window | MISSING | bookingService missing |
| Cancel bypasses window for admins | MISSING | bookingService missing |
| Cancel is idempotent | MISSING | bookingService missing |
| Booking price computed server-side | MISSING | bookingService missing |
| passwordHash never returned | DONE | User model has select:false |
| Role checks on booking routes | DONE | Routes use authenticate middleware |
| Ownership checks on booking routes | PARTIAL | Routes exist, controller logic missing |
| Role checks on admin routes | DONE | Routes use authorize('admin') |

### Email System Verification

| Requirement | Status | Note |
|-------------|--------|------|
| Outbox rows created on create, modify, cancel | MISSING | emailService missing |
| Worker claims atomically (findOneAndUpdate) | MISSING | emailWorker missing |
| Exponential backoff (1m, 5m, 15m, 1h, 6h) | MISSING | emailWorker missing |
| Max 5 attempts | MISSING | emailWorker missing |
| Stuck-row recovery (>10min in sending) | MISSING | emailWorker missing |
| Failure never blocks/rolls back booking | MISSING | emailService missing |
| .ics attachment correct format | MISSING | emailService missing |
| HTML escapes user text | MISSING | emailService missing |
| Worker skipped when NODE_ENV=test | MISSING | emailWorker missing |

### Frontend Verification (from FRONTEND_SPEC.md)

| Requirement | Status | Note |
|-------------|--------|------|
| Every route exists with ProtectedRoute/AdminRoute | MISSING | No client code |
| URL-synced search filters | MISSING | No client code |
| Disabled unavailable dates in picker | MISSING | No client code |
| 409 conflict banner | MISSING | No client code |
| Disabled-cancel explanation | MISSING | No client code |
| Loading skeletons | MISSING | No client code |
| Empty states | MISSING | No client code |
| Layout works at 375px | MISSING | No client code |

### Admin Features Verification

| Requirement | Status | Note |
|-------------|--------|------|
| Stats: total rooms, active bookings, occupancy %, revenue (30d) | MISSING | adminService missing |
| Rooms CRUD with modal | MISSING | No client code |
| Bookings table with filters | MISSING | No client code |
| Occupancy calendar | MISSING | No client code |
| Failed emails list with retry | MISSING | No client code |

### Seed & Reconcile

| Requirement | Status | Note |
|-------------|--------|------|
| Seed script works, idempotent | MISSING | File doesn't exist |
| Seed refuses when NODE_ENV=production | MISSING | File doesn't exist |
| `npm run reconcile` exists | MISSING | File doesn't exist |

### Environment Files

| Requirement | Status | Note |
|-------------|--------|------|
| .env.example in server/ | DONE | Complete |
| .env.example in client/ | DONE | Has VITE_API_URL |
| .env in .gitignore | DONE | Root .gitignore |
| npm scripts from SETUP_MAC.md exist | DONE | All defined |

---

## Prioritized Fix List

### CRITICAL (BROKEN - blocks everything)

1. **Fix errorHandler.js** — undefined `req`/`res` in notFoundHandler
2. **Fix index.js imports** — remove or implement missing controllers/worker imports
3. **Create all 4 controllers** (auth, rooms, bookings, admin) — routes import them

### HIGH (MISSING core business logic)

4. **Create bookingService** — create, list, detail, modify, cancel, derived status, canCancel, concurrency
5. **Create emailService** — enqueueConfirmation, enqueueModification, enqueueCancellation, templates, .ics
6. **Create emailWorker.js** — 15s interval, atomic claim, backoff, max 5 attempts, stuck recovery
7. **Create adminService** — stats, occupancy, failed emails list, retry
8. **Wire email worker startup** in index.js (conditional on NODE_ENV !== 'test')

### MEDIUM (MISSING features)

9. **Create seed script** — admin, 2 guests, 20 rooms, 8 bookings + RoomNights, refuses in production
10. **Create reconcile script** — fix orphaned RoomNights
11. **Write server tests** — all mandatory matrices + unit/integration tests
12. **Fix server lint** — resolve import errors

### HIGH (MISSING entire client)

13. **Build complete client application** — all pages, components, hooks, contexts, API layer
14. **Write client tests** — component, hook, smoke tests
15. **Fix client lint/build** — create entry points

### LOW (POLISH)

16. **Run full verification** — seed, start server+client, manual QA checklist
17. **Update IMPLEMENTATION_PLAN.md** checklists as items complete
18. **Update AUDIT.md** with final statuses

---

## Decisions Made During Audit

1. **No existing controllers** — All route files import from `../controllers/` but the directory is empty. Must create all 4 controllers.
2. **No booking service** — Core business logic for bookings is completely missing.
3. **No email system implementation** — Only the model and mail config exist; service and worker are missing.
4. **No admin service** — Admin dashboard endpoints have no implementation.
5. **No client code at all** — The client directory has only empty subdirectories and config files.
6. **No tests anywhere** — Both server and client test directories are empty (except client setup.js).
7. **Lint failures** — Server has 13 errors (missing imports, undefined variables); client has no files to lint.
8. **MongoDB not installed** — Need to install mongodb-community@7.0 for local development.

---

## Next Steps

Start with CRITICAL fixes to make the server runnable, then implement core services (booking, email, admin), then build the client application, then write tests, then final verification.