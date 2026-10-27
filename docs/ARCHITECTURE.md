# Architecture

## High-Level Structure
```
Hotel Booking/
├── server/          # Express API
│   └── src/
│       ├── config/         # Environment, DB, Mail config
│       ├── controllers/    # Request handlers (thin)
│       ├── middleware/     # Auth, validation, errors
│       ├── models/         # Mongoose models
│       ├── routes/         # Route definitions
│       ├── services/       # Business logic (ONLY here)
│       ├── utils/          # Helpers (JWT, dates, refs)
│       ├── workers/        # Background workers (email)
│       └── index.js        # Entry point
├── client/          # React + Vite
│   └── src/
│       ├── api/            # Axios instance, TanStack Query hooks
│       ├── components/     # Reusable UI components
│       ├── pages/          # Page-level components
│       ├── hooks/          # Custom React hooks
│       ├── utils/          # Formatters, date helpers
│       ├── contexts/       # React Context (Auth)
│       └── main.jsx        # Entry point
└── docs/            # Specification documents
```

## Server Layer Responsibilities

### Routes (`server/src/routes/`)
- Define endpoints, HTTP methods
- Mount middleware: `validate(schema)`, `authenticate`, `authorize(roles)`
- Delegate to controllers

### Validation (`server/src/middleware/validate.js`)
- Zod schemas for body, query, params
- Returns 400 with `{ error: { code: 'VALIDATION_ERROR', message, details } }`

### Authentication (`server/src/middleware/auth.js`)
- `authenticate`: Verify JWT, attach `req.user = { id, email, role }`
- `authorize(...roles)`: Check `req.user.role` ∈ roles, else 403

### Controllers (`server/src/controllers/`)
- Parse `req.body`, `req.query`, `req.params`, `req.user`
- Call **one** service method
- Format response: `{ data, meta? }` or error
- **No business logic**

### Services (`server/src/services/`)
- **All business logic lives here**
- Pure functions (async) taking parsed inputs
- Call models, other services
- Throw `AppError(code, message, details?)` for known errors
- Handle concurrency, transactions (RoomNight unique index)

### Models (`server/src/models/`)
- Mongoose schemas, indexes, statics, methods
- No business logic beyond validators

### Utils (`server/src/utils/`)
- `jwt.js`: sign, verify, decode
- `dates.js`: UTC date-only helpers, range generation, overlap
- `reference.js`: `HB-XXXXXX` generator
- `errors.js`: `AppError` class, error codes enum

### Workers (`server/src/workers/`)
- `emailWorker.js`: Interval-based, atomic claim, backoff, retry

### Config (`server/src/config/`)
- `env.js`: **Single source of truth for `process.env`**
- `db.js`: Mongoose connection
- `mail.js`: Nodemailer transporter

## Client Layer Responsibilities

### API (`client/src/api/`)
- `axios.js`: Base instance, interceptors (auth header, 401 → logout)
- `queries/`: TanStack Query hooks per resource (rooms, bookings, auth, admin)
- `mutations/`: React Query mutations for write operations

### Components (`client/src/components/`)
- **UI primitives**: Button, Input, Modal, Table, Card, Badge, Select, DatePicker wrapper
- **Composite**: RoomCard, BookingCard, StatsCard, OccupancyCalendar
- **Forms**: RoomForm, BookingForm, LoginForm, RegisterForm

### Pages (`client/src/pages/`)
- Public: Home, Rooms, RoomDetail, Login, Register
- Protected (guest): MyBookings, BookingDetail, BookingConfirm
- Admin: Dashboard, RoomsManage, BookingsManage, OccupancyCalendar, FailedEmails

### Hooks (`client/src/hooks/`)
- `useAuth()`: User state, login, logout, register
- `useAvailability()`: Search params, debounced fetch
- `useDateRange()`: checkIn/checkOut state with React Day Picker

### Contexts (`client/src/contexts/`)
- `AuthContext`: User, token, methods; persists in localStorage

### Utils (`client/src/utils/`)
- `format.js`: Currency, date, reference display
- `dates.js`: Client-side UTC date helpers (mirror server)

## Data Flow Example: Create Booking
```
POST /api/bookings
  → validate(schema)
  → authenticate
  → controller.createBooking(req, res)
      → service.createBooking(userId, data)
          → check room exists & active
          → generate nights[] = [checkIn, checkOut)
          → RoomNight.insertMany(nights.map(d => ({ room, date: d })))  // unique index handles conflict
          → create Booking doc (server-computed price, reference)
          → enqueue confirmation email (EmailOutbox.insert)
          → return booking
      → res.status(201).json({ data: booking })
```

## Error Handling
- `AppError` thrown in services → caught in global error middleware
- Maps to `{ error: { code, message, details } }` with HTTP status
- Codes: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `ROOM_UNAVAILABLE`, `CANCEL_WINDOW_EXPIRED`, `INTERNAL_ERROR`

## Concurrency Strategy
- **No MongoDB transactions**
- RoomNight `{ room, date }` unique index = natural lock
- `insertMany` with `ordered: false` → catches duplicate key errors
- Service checks inserted count === requested nights; if not, delete any inserted, throw `ROOM_UNAVAILABLE`

## Environment
- `server/src/config/env.js` exports typed config object
- All `process.env` access **only** in this file
- Client: `import.meta.env.VITE_*` for public vars