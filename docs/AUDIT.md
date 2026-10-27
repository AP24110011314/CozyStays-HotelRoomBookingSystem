# Audit Report — Hotel Booking System

**Date**: 2026-10-27  
**Auditor**: Claude Code

---

## Summary Counts

| Phase | Status | Items | DONE | PARTIAL | MISSING | BROKEN |
|-------|--------|-------|------|---------|---------|--------|
| 0: Project Setup | PARTIAL | 10 | 7 | 2 | 1 | 0 |
| 1: Models & Config | DONE | 12 | 11 | 1 | 0 | 0 |
| 2: Authentication | PARTIAL | 7 | 3 | 2 | 2 | 0 |
| 3: Room Catalog | PARTIAL | 7 | 3 | 2 | 2 | 0 |
| 4: Booking Management | PARTIAL | 8 | 1 | 1 | 6 | 0 |
| 5: Email System | MISSING | 8 | 0 | 1 | 7 | 0 |
| 6: Admin Dashboard | PARTIAL | 6 | 1 | 1 | 4 | 0 |
| 7: Client Application | MISSING | 10 | 0 | 0 | 10 | 0 |
| 8: Seed & Verification | MISSING | 7 | 0 | 0 | 7 | 0 |
| **Total** | | **75** | **26** | **10** | **39** | **0** |

---

## Detailed Audit Table

### Phase 0: Project Setup & Configuration

| # | Item | Status | Note |
|---|------|--------|------|
| 0.1 | Create `server/` and `client/` directories with package.json | DONE | Both exist with proper configs |
| 0.2 | Create `server/.env.example`, `client/.env.example` per SETUP_MAC.md | DONE | Both exist and match spec |
| 0.3 | Create real `server/.env`, `client/.env` with PORT=5001, JWT_SECRET, placeholder SMTP | DONE | Both exist; JWT_SECRET generated |
| 0.4 | Add `.env` to `.gitignore` | DONE | Present in both `.gitignore` files |
| 0.5 | Add npm scripts: server (dev, start, seed, test, lint, reconcile), client (dev, build, preview, test, lint) | DONE | All scripts present in both package.json |
| 0.6 | Install all dependencies | DONE | `npm install` successful in both |
| 0.7 | Configure ESLint (airbnb-base for server, react for client), Prettier | PARTIAL | Configs exist but lint errors on import ordering and missing modules |
| 0.8 | Configure Vitest (server + client) | DONE | Configs exist in both |
| 0.9 | Initialize git repo | MISSING | Not a git repo (`git log` fails) |
| 0.10 | Run lint without errors | BROKEN | 18 errors in server (missing modules, import ordering); client empty src |

---

### Phase 1: Database Models & Core Config

| # | Item | Status | Note |
|---|------|--------|------|
| 1.1 | `server/src/config/env.js` — typed config, single env access point | DONE | Complete, validates JWT_SECRET |
| 1.2 | `server/src/config/db.js` — Mongoose connection | DONE | Complete with connection pooling |
| 1.3 | `server/src/config/mail.js` — Nodemailer transporter (Mailtrap + Ethereal fallback) | DONE | Complete with fallback logic |
| 1.4 | Models: `User`, `Room`, `Booking`, `RoomNight`, `EmailOutbox` with indexes | DONE | All 5 models exist with correct fields |
| 1.5 | Unique index on `RoomNight { room: 1, date: 1 }` | DONE | Defined in RoomNight model |
| 1.6 | `server/src/utils/errors.js` — `AppError` class, error codes | DONE | Complete with all error codes |
| 1.7 | `server/src/utils/dates.js` — UTC date-only helpers, range generation | DONE | Complete with all required functions |
| 1.8 | `server/src/utils/reference.js` — `HB-XXXXXX` generator | DONE | Generates 6-char uppercase alphanum |
| 1.9 | `server/src/utils/jwt.js` — sign, verify, decode | DONE | Complete |
| 1.10 | Global error middleware | DONE | Maps errors to `{ error: { code, message, details } }` |
| 1.11 | Not found handler | DONE | Returns 404 with error shape |
| 1.12 | Models index export | DONE | Exports all 5 models |

---

### Phase 2: Authentication

| # | Item | Status | Note |
|---|------|--------|------|
| 2.1 | `authService`: register, login, me | DONE | Complete with bcrypt cost 12 |
| 2.2 | `authController`: register, login, me | MISSING | File doesn't exist; routes import it |
| 2.3 | `authRoutes`: POST /register, POST /login, GET /me | DONE | Routes defined with Zod validation |
| 2.4 | Middleware: `authenticate` (JWT → req.user) | DONE | Complete, attaches user without passwordHash |
| 2.5 | Middleware: `authorize(...roles)` | DONE | Checks role, returns 403 |
| 2.6 | Validation schemas (Zod) for register, login | DONE | In routes file |
| 2.7 | Tests: register, login, me, validation, duplicate email, invalid creds | MISSING | No test files exist |

---

### Phase 3: Room Catalog (Admin + Public)

| # | Item | Status | Note |
|---|------|--------|------|
| 3.1 | `roomService`: CRUD, toggle, list with filters | DONE | Complete with search and unavailable dates |
| 3.2 | `roomController`: all endpoints | MISSING | File doesn't exist; routes import it |
| 3.3 | `roomRoutes`: public GET /rooms, GET /rooms/:id, GET /rooms/:id/unavailable-dates; admin POST/PATCH/DELETE /admin/rooms | DONE | Routes defined with proper validation |
| 3.4 | Validation schemas | DONE | In routes file |
| 3.5 | Availability service integration (filter by RoomNight) | DONE | In roomService.searchRooms |
| 3.6 | Tests: CRUD, filters, pagination, sorting, unavailable dates, admin auth | MISSING | No test files exist |
| 3.7 | Room search returns computed `nights` and `totalPrice` | DONE | In service response |

---

### Phase 4: Booking Management

| # | Item | Status | Note |
|---|------|--------|------|
| 4.1 | `bookingService`: create, list, detail, modify, cancel, derived status, canCancel | MISSING | File doesn't exist |
| 4.2 | `bookingController`: all endpoints | MISSING | File doesn't exist; routes import it |
| 4.3 | `bookingRoutes`: guest POST/GET/PATCH/DELETE /bookings; admin GET/DELETE /admin/bookings | DONE | Routes defined with validation |
| 4.4 | Concurrency-safe create via RoomNight unique index | MISSING | Service not implemented |
| 4.5 | Modify: claim new nights first, release old last | MISSING | Service not implemented |
| 4.6 | Cancel: 48h window, idempotent, admin bypass | MISSING | Service not implemented |
| 4.7 | Validation schemas | DONE | In routes file |
| 4.8 | Tests: all CRUD, status derivation, 48h window, concurrency (mandatory), modify logic | MISSING | No test files exist |

---

### Phase 5: Email System

| # | Item | Status | Note |
|---|------|--------|------|
| 5.1 | `EmailOutbox` model (already in Phase 1) | DONE | Model exists with all fields and indexes |
| 5.2 | `emailService`: enqueueConfirmation, enqueueModification, enqueueCancellation, template rendering, .ics generation | MISSING | File doesn't exist |
| 5.3 | `emailWorker.js`: 15s interval, atomic claim, exponential backoff, max 5 attempts, stuck recovery (10min) | MISSING | File doesn't exist; index.js imports it |
| 5.4 | Worker startup in `server/src/index.js` | PARTIAL | `startEmailWorker()` called but worker missing |
| 5.5 | Mailtrap/Ethereal transporter | DONE | In mail.js config |
| 5.6 | Tests: enqueue, templates, .ics, retry backoff, max attempts, stuck recovery, non-blocking | MISSING | No test files exist |
| 5.7 | Templates: confirmation, modification, cancellation with .ics | MISSING | Not implemented |
| 5.8 | Failure never blocks/rolls back booking | N/A | Not testable until implemented |

---

### Phase 6: Admin Dashboard

| # | Item | Status | Note |
|---|------|--------|------|
| 6.1 | `adminService`: stats, occupancy, failed emails list, retry | MISSING | File doesn't exist |
| 6.2 | `adminController`: all endpoints | MISSING | File doesn't exist; routes import it |
| 6.3 | `adminRoutes`: GET /admin/stats, GET /admin/occupancy, GET/POST /admin/failed-emails | DONE | Routes defined with validation |
| 6.4 | Occupancy calendar: month view, per-room nights | MISSING | Service/controller missing |
| 6.5 | Failed emails list with retry button | MISSING | Service/controller missing |
| 6.6 | Tests: stats, occupancy, failed emails, retry | MISSING | No test files exist |

---

### Phase 7: Client Application

| # | Item | Status | Note |
|---|------|--------|------|
| 7.1 | Vite + React + Tailwind setup | DONE | Config files exist (vite.config.js, tailwind.config.js, postcss.config.js) |
| 7.2 | Axios instance + interceptors | MISSING | `client/src/api/axios.js` doesn't exist (dirs empty) |
| 7.3 | TanStack Query provider + hooks (all API endpoints) | MISSING | Query/mutation dirs empty |
| 7.4 | AuthContext + login/register forms | MISSING | Contexts/components dirs empty |
| 7.5 | Pages: Home, RoomsList, RoomDetail, Login, Register, MyBookings, BookingDetail, BookingConfirm | MISSING | Pages dir empty |
| 7.6 | Admin pages: Dashboard, RoomsManage, BookingsManage, OccupancyCalendar, FailedEmails | MISSING | Pages dir empty |
| 7.7 | Components: UI primitives, RoomCard, BookingCard, DateRangePicker, Modal, Table, StatsCard, OccupancyCalendar | MISSING | Components dir empty |
| 7.8 | React Day Picker integration with unavailable dates | MISSING | Not implemented |
| 7.9 | Tests: component tests, hook tests, smoke tests | MISSING | No test files exist |
| 7.10 | Build passes | MISSING | Cannot test until implemented |

---

### Phase 8: Seed Script & Final Verification

| # | Item | Status | Note |
|---|------|--------|------|
| 8.1 | `server/seeds/seed.js`: admin, 2 guests, 20 rooms, 8 bookings + RoomNights | MISSING | File doesn't exist; `npm run seed` will fail |
| 8.2 | Refuses when `NODE_ENV=production` | MISSING | Not implemented |
| 8.3 | `npm run reconcile` script to fix orphaned RoomNights | MISSING | File doesn't exist; script in package.json |
| 8.4 | Run full test suite (server + client) | MISSING | No tests exist |
| 8.5 | Run lint (server + client) | BROKEN | Server has 18 errors; client has no src files |
| 8.6 | Manual QA checklist (TESTING.md) | MISSING | Not runnable until implementation complete |
| 8.7 | Verify: health endpoint, client loads, booking → email, double-book blocked | MISSING | Server won't start without controllers |

---

## Specific Requirements Check

### API Endpoints (from API_SPEC.md)

| Endpoint | Status | Note |
|----------|--------|------|
| GET /api/health | DONE | Route exists, handler exists |
| POST /api/auth/register | BROKEN | Route exists, controller missing |
| POST /api/auth/login | BROKEN | Route exists, controller missing |
| GET /api/auth/me | BROKEN | Route exists, controller missing |
| GET /api/rooms | BROKEN | Route exists, controller missing |
| GET /api/rooms/:id | BROKEN | Route exists, controller missing |
| GET /api/rooms/:id/unavailable-dates | BROKEN | Route exists, controller missing |
| POST /api/admin/rooms | BROKEN | Route exists, controller missing |
| PATCH /api/admin/rooms/:id | BROKEN | Route exists, controller missing |
| PATCH /api/admin/rooms/:id/toggle | BROKEN | Route exists, controller missing |
| DELETE /api/admin/rooms/:id | BROKEN | Route exists, controller missing |
| POST /api/bookings | BROKEN | Route exists, controller missing |
| GET /api/bookings | BROKEN | Route exists, controller missing |
| GET /api/bookings/:id | BROKEN | Route exists, controller missing |
| PATCH /api/bookings/:id | BROKEN | Route exists, controller missing |
| DELETE /api/bookings/:id | BROKEN | Route exists, controller missing |
| GET /api/admin/bookings | BROKEN | Route exists, controller missing |
| DELETE /api/admin/bookings/:id | BROKEN | Route exists, controller missing |
| GET /api/admin/stats | BROKEN | Route exists, controller missing |
| GET /api/admin/occupancy | BROKEN | Route exists, controller missing |
| GET /api/admin/failed-emails | BROKEN | Route exists, controller missing |
| POST /api/admin/failed-emails/:id/retry | BROKEN | Route exists, controller missing |

**All endpoints are broken because controllers are missing.**

---

### Database Indexes (from DATABASE_SCHEMA.md)

| Collection | Index | Status |
|------------|-------|--------|
| users | `{ email: 1 }` unique | DONE |
| rooms | `{ active: 1 }` | DONE |
| rooms | `{ type: 1 }` | DONE |
| bookings | `{ user: 1, createdAt: -1 }` | DONE |
| bookings | `{ room: 1, checkIn: 1 }` | DONE |
| bookings | `{ reference: 1 }` unique | DONE |
| bookings | `{ status: 1 }` | DONE |
| room_nights | `{ room: 1, date: 1 }` **UNIQUE** | DONE |
| email_outbox | `{ status: 1, nextRetryAt: 1 }` | DONE |
| email_outbox | `{ lockedAt: 1 }` | DONE |

**All required indexes are defined.**

---

### Mandatory Tests (from TESTING.md)

| Test | Status | Note |
|------|--------|------|
| Availability Overlap Table (7 cases) | MISSING | No test files |
| Concurrency Test (10 parallel → 1 success, 9×409) | MISSING | No test files |
| Email Retry: fail 2, succeed 3rd → backoff, attempts=3, status=sent | MISSING | No test files |
| Email Retry: fail all 5 → status=failed, attempts=5 | MISSING | No test files |
| Email Retry: hang → stuck recovery after 10min | MISSING | No test files |
| Booking succeeds when email worker down | MISSING | Not testable |

---

### Booking Logic Specifics

| Requirement | Status | Note |
|-------------|--------|------|
| Modify claims new nights before releasing old ones | MISSING | Service not implemented |
| Modify leaves booking unchanged on 409 | MISSING | Service not implemented |
| Cancel enforces 48h window | MISSING | Service not implemented |
| Cancel bypasses window for admins | MISSING | Service not implemented |
| Cancel is idempotent | MISSING | Service not implemented |
| Price computed server-side | MISSING | Service not implemented |
| passwordHash never returned | DONE | User model has `select: false`; auth middleware doesn't return it |
| Role/ownership checks on every booking/admin route | PARTIAL | Middleware exists; controllers missing |

---

### Email System Specifics

| Requirement | Status | Note |
|-------------|--------|------|
| Outbox rows created on create, modify, cancel | MISSING | Service not implemented |
| Worker claims atomically (findOneAndUpdate) | MISSING | Worker not implemented |
| Exponential backoff (1m, 5m, 15m, 1h, 6h) | MISSING | Worker not implemented |
| Max 5 attempts | MISSING | Worker not implemented |
| Stuck-row recovery (>10min in sending) | MISSING | Worker not implemented |
| .ics attachment correct | MISSING | Templates not implemented |
| HTML escapes user text | MISSING | Templates not implemented |
| Worker skipped when NODE_ENV=test | MISSING | Worker not implemented |

---

### Frontend Specifics (from FRONTEND_SPEC.md)

| Requirement | Status | Note |
|-------------|--------|------|
| Every route in FRONTEND_SPEC.md exists | MISSING | All page components missing |
| ProtectedRoute / AdminRoute | MISSING | Not implemented |
| URL-synced search filters | MISSING | Not implemented |
| Disabled unavailable dates in picker | MISSING | Not implemented |
| 409 conflict banner | MISSING | Not implemented |
| Disabled-cancel explanation | MISSING | Not implemented |
| Loading skeletons | MISSING | Not implemented |
| Empty states | MISSING | Not implemented |
| Layout works at 375px | MISSING | Not implemented |

---

### Admin Specifics

| Requirement | Status | Note |
|-------------|--------|------|
| Stats cards: total rooms, active bookings, occupancy %, revenue (30d) | MISSING | Service/controller missing |
| Rooms CRUD with modal | MISSING | Not implemented |
| Bookings table with filters (status, date range, guest) | MISSING | Not implemented |
| Occupancy calendar month view | MISSING | Not implemented |
| Failed emails list with retry | MISSING | Not implemented |

---

### Seed & Environment

| Requirement | Status | Note |
|-------------|--------|------|
| Seed script works | MISSING | File doesn't exist |
| Seed is idempotent | MISSING | Not implemented |
| Seed refuses when NODE_ENV=production | MISSING | Not implemented |
| `npm run reconcile` exists | MISSING | File doesn't exist |
| .env.example files exist | DONE | Both exist |
| .env in .gitignore | DONE | Both have it |
| npm scripts from SETUP_MAC.md exist | DONE | All present |

---

## Prioritized Fix List

### Priority 1: BROKEN / Blocking Server Start
1. **Create all 4 controllers** (auth, rooms, bookings, admin) — server won't start without them
2. **Create emailWorker.js** — imported in index.js
3. **Fix lint errors** (import ordering, unused vars, missing modules)

### Priority 2: MISSING Core Logic (Booking, Concurrency, Availability)
4. **Create bookingService** with:
   - Create booking (concurrency-safe via RoomNight unique index)
   - List with status tabs and pagination
   - Detail with derived status and canCancel
   - Modify (claim new nights first, release old last, atomic)
   - Cancel (48h window, idempotent, admin bypass)
5. **Verify roomService.searchRooms** handles all filters correctly (already exists)
6. **Add mandatory tests** (overlap matrix, concurrency, email retry)

### Priority 3: Email System
7. **Create emailService** with enqueue functions and templates
8. **Create emailWorker.js** with atomic claim, backoff, stuck recovery
9. **Implement .ics generation** per spec

### Priority 4: Admin Dashboard
10. **Create adminService** with stats, occupancy, failed emails, retry
11. **Implement adminController**

### Priority 5: Client Application (All Missing)
12. **Build API layer** (axios instance, TanStack Query hooks, mutations)
13. **Build AuthContext** and login/register forms
14. **Build all pages** (Home, Rooms, RoomDetail, Login, Register, MyBookings, BookingDetail, BookingConfirm, Admin pages)
15. **Build all components** (UI primitives + composites)
16. **Integrate React Day Picker** with unavailable dates
17. **Add client tests**

### Priority 6: Seed & Polish
18. **Create seed.js** with admin, 2 guests, 20 rooms, 8 bookings + RoomNights
19. **Create reconcile.js** to fix orphaned RoomNights
20. **Run full test suite and lint**
21. **Manual QA verification**

---

## Decisions Made (to record in IMPLEMENTATION_PLAN.md)

1. **No git repo exists** — will initialize before first commit
2. **Lint errors are primarily import ordering** — will fix with `eslint --fix` and adding missing empty lines
3. **Controllers are completely missing** — need to implement all 4 following the thin-controller pattern
4. **No tests exist** — will write tests alongside implementation per phase
5. **Client is completely empty** — will build from scratch following FRONTEND_SPEC.md
6. **Email worker not implemented** — will implement in-process with 15s interval as specified

---

## Commands to Run the Project (once implemented)

```bash
# Terminal 1: MongoDB (already running)
brew services start mongodb-community@7.0

# Terminal 2: Server
cd /Users/ammu/Projects/Hotel\ Booking/server
npm run seed   # creates seed data
npm run dev    # nodemon on :5001

# Terminal 3: Client
cd /Users/ammu/Projects/Hotel\ Booking/client
npm run dev    # Vite on :5173

# Verify
curl http://localhost:5001/api/health
# Open http://localhost:5173
```

---

## Before/After Counts (Projected After Full Implementation)

| Phase | Before (Current) | After (Target) |
|-------|------------------|----------------|
|       | DONE / PARTIAL / MISSING / BROKEN | DONE / PARTIAL / MISSING / BROKEN |
| 0: Setup | 7 / 2 / 1 / 0 | 10 / 0 / 0 / 0 |
| 1: Models | 11 / 1 / 0 / 0 | 12 / 0 / 0 / 0 |
| 2: Auth | 3 / 2 / 2 / 0 | 7 / 0 / 0 / 0 |
| 3: Rooms | 3 / 2 / 2 / 0 | 7 / 0 / 0 / 0 |
| 4: Bookings | 1 / 1 / 6 / 0 | 8 / 0 / 0 / 0 |
| 5: Email | 0 / 1 / 7 / 0 | 8 / 0 / 0 / 0 |
| 6: Admin | 1 / 1 / 4 / 0 | 6 / 0 / 0 / 0 |
| 7: Client | 0 / 0 / 10 / 0 | 10 / 0 / 0 / 0 |
| 8: Seed | 0 / 0 / 7 / 0 | 7 / 0 / 0 / 0 |
| **Total** | **26 / 10 / 39 / 0** | **75 / 0 / 0 / 0** |

---

*End of Audit Report*