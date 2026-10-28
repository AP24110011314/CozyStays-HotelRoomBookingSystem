# Hotel Booking System

A full-stack hotel/room booking system built with Node.js, Express, MongoDB, React, and Vite.

## Stack
- **Server**: Express, Mongoose, Zod, JWT, bcryptjs, Helmet, CORS, Rate-limit, Morgan, Nodemailer
- **Client**: React 18, Vite, Tailwind CSS, React Router, TanStack Query, Axios, React Hook Form + Zod, React Day Picker, date-fns
- **Database**: MongoDB Atlas (cloud database, default) or local MongoDB (optional alternative)
- **Tests**: Vitest, Supertest, mongodb-memory-server (server); Vitest, React Testing Library (client)

## Quick Start

### Prerequisites
- macOS, Node 20+
- MongoDB Atlas cluster connection URI (default) or optional local MongoDB (`brew install mongodb-community@7.0`)

### Setup
```bash
# 1. Server
cd server
cp .env.example .env
# Configure MONGODB_URI with your Atlas connection string and set JWT_SECRET
npm install
npm run seed -- --yes
npm run dev

# 2. Client (separate terminal)
cd ../client
cp .env.example .env
npm install
npm run dev
```

### URLs
- API: http://localhost:5001
- Client: http://localhost:5173
- Health: http://localhost:5001/api/health

### Default Accounts
- Admin: `admin@hotel.test` / `Admin@12345`
- Guests: `guest1@test.com` / `Guest@12345`, `guest2@test.com` / `Guest@12345`

## Scripts
| Location | Command | Description |
|----------|---------|-------------|
| `server/` | `npm run dev` | Start dev server (nodemon) |
| `server/` | `npm run start` | Start production server |
| `server/` | `npm run seed` | Seed database (refuses in production) |
| `server/` | `npm run test` | Run tests |
| `server/` | `npm run lint` | Run ESLint |
| `server/` | `npm run reconcile` | Fix orphaned RoomNight rows |
| `client/` | `npm run dev` | Start Vite dev server |
| `client/` | `npm run build` | Production build |
| `client/` | `npm run preview` | Preview production build |
| `client/` | `npm run test` | Run tests |
| `client/` | `npm run lint` | Run ESLint |

## Project Structure
```
Hotel Booking/
├── server/
│   ├── src/
│   │   ├── config/         # env, db, mail
│   │   ├── controllers/    # Thin request handlers
│   │   ├── middleware/     # auth, validation, error handling
│   │   ├── models/         # Mongoose models
│   │   ├── routes/         # Route definitions
│   │   ├── services/       # Business logic (only here)
│   │   ├── utils/          # Helpers (jwt, dates, reference gen)
│   │   ├── workers/        # Email worker
│   │   └── index.js        # App entry
│   ├── seeds/              # Seed script
│   ├── tests/              # Vitest tests
│   └── package.json
├── client/
│   ├── src/
│   │   ├── api/            # Axios + TanStack Query hooks
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom hooks
│   │   ├── utils/          # Helpers (date, format)
│   │   ├── contexts/       # React contexts (auth)
│   │   └── main.jsx        # Entry
│   ├── tests/              # Vitest tests
│   └── package.json
└── docs/
    ├── PRD.md
    ├── ARCHITECTURE.md
    ├── DATABASE_SCHEMA.md
    ├── AVAILABILITY_LOGIC.md
    ├── API_SPEC.md
    ├── EMAIL_SYSTEM.md
    ├── FRONTEND_SPEC.md
    ├── TESTING.md
    ├── SETUP_MAC.md
    └── IMPLEMENTATION_PLAN.md
```

## Documentation
See `docs/` for complete specifications:
- [PRD](docs/PRD.md) — Product requirements
- [Architecture](docs/ARCHITECTURE.md) — System design
- [Database Schema](docs/DATABASE_SCHEMA.md) — Collections & indexes
- [Availability Logic](docs/AVAILABILITY_LOGIC.md) — Date ranges, overlap, concurrency
- [API Spec](docs/API_SPEC.md) — Endpoints, schemas, errors
- [Email System](docs/EMAIL_SYSTEM.md) — Outbox, worker, templates
- [Frontend Spec](docs/FRONTEND_SPEC.md) — Pages, components, state
- [Testing](docs/TESTING.md) — Test matrices, QA checklist
- [Setup macOS](docs/SETUP_MAC.md) — Local environment
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md) — Phase-by-phase tasks

## Media Credits
- Hotel photography: Photo by [Edvin Johansson](https://unsplash.com/photos/9A6Sr-5iaZs) on [Unsplash](https://unsplash.com) (Unsplash License, free for commercial and non-commercial use).

## License
MIT