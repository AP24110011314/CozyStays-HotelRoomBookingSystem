# CLAUDE.md — Rules for this Project

## Core Principles
- **Documentation is source of truth**: All docs in `docs/` are authoritative. If code and docs conflict, fix the code.
- **No feature creep**: Implement exactly what the docs specify. No stretch goals unless explicitly asked.
- **Simplicity wins**: When docs are ambiguous, pick the simplest option consistent with these rules. Note the decision in `docs/IMPLEMENTATION_PLAN.md` under "Decisions".
- **Verify before advancing**: Run tests + lint for each phase. Tick the phase checklist. Commit with message `phase-N: summary`.

## Architecture
- **Layered**: `routes` → `validate(zod)` → `auth` → `controllers` → `services` → `models`
- **Business logic only in services**. Controllers are thin: parse, call service, format response.
- **Env access only in `server/src/config/env.js`**. Never `process.env` elsewhere.
- **Error shape**: `{ error: { code, message, details } }` — always.
- **Never trust client**: Prices, user IDs, roles computed server-side.
- **Never return `passwordHash`**.

## Data & Concurrency
- **MongoDB local**: `mongodb://127.0.0.1:27017/hotel_booking`
- **No multi-document transactions**. Double-booking prevention = unique index on `RoomNight { room, date }`.
- **UTC date-only everywhere**. Stay occupies nights `[checkIn, checkOut)`. Check-out day is free.
- **Idempotent cancel**: Safe to call repeatedly.

## Auth & Security
- **JWT** in `Authorization: Bearer <token>`. Roles: `guest`, `admin`.
- **bcryptjs cost 12**.
- **Helmet, CORS (exact CLIENT_URL), rate-limit, morgan**.
- **Reference format**: `HB-XXXXXX` (6 uppercase alphanum).

## Email System
- **EmailOutbox collection** + in-process worker (15s interval).
- **Atomic claim**, exponential backoff, max 5 attempts, stuck-row recovery.
- **Failure never blocks/rolls back booking**.
- **Mailtrap SMTP** in dev. Ethereal fallback if no creds.
- **Templates**: confirmation, modification, cancellation. `.ics` attachment.

## Testing
- **Vitest + Supertest + mongodb-memory-server** (server).
- **Vitest + React Testing Library** (client).
- **Mandatory matrices**: availability overlap table, concurrency test (10 parallel → 1 success, 9×409), email retry tests.
- Write tests as you go.

## Environment
- **macOS, Node 20+**. No Docker, no Redis.
- **Server port**: `process.env.PORT` default `5001` (AirPlay on 5000).
- **Client dev**: `5173`.
- **ES modules** everywhere (`"type": "module"`).

## Git
- Commit after each verified phase: `phase-N: summary`.
- Attribution lines on commits/PRs (injected by harness).