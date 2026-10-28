# PRD — Product Requirements Document

## Overview
A full-stack hotel booking system allowing guests to search available rooms, make bookings, manage reservations, and receive email confirmations. Admins manage rooms, view bookings, monitor occupancy, and handle failed emails.

## User Roles
- **Guest**: Register, login, search rooms, book, modify/cancel own bookings, view history.
- **Admin**: All guest permissions + room CRUD, booking management (all), occupancy calendar, email retry, stats dashboard.

## Core Features

### 1. Authentication
- Register (email, password, name) → JWT + role `guest`
- Login → JWT
- `/auth/me` → current user profile
- Passwords: bcrypt cost 12
- JWT: access token, 15min expiry (configurable), HS256

### 2. Room Catalog
- **Fields**: name, type (single/double/suite), description, basePrice, maxGuests, amenities[], photos[], active (boolean)
- **Admin CRUD**: Create, read, update, delete, toggle active
- **Public**: List active rooms with filters, get single room

### 3. Availability Search
- Input: checkIn, checkOut, guests (optional), price range, type, amenities
- Stay = nights `[checkIn, checkOut)` — check-out day is FREE
- UTC date-only (no timezone)
- Output: rooms with `nights`, `totalPrice` (basePrice × nights), pagination, sorting
- **Unavailable dates endpoint** for date picker blocking

### 4. Booking Management
- **Create**: Server computes price, generates reference `HB-XXXXXX`, claims RoomNight rows atomically
- **List mine**: Tabs by status (upcoming/active/past/cancelled), pagination
- **Detail**: Full booking + room info + computed `canCancel`
- **Modify**: Change dates/guests — claim new nights first, release old nights last (atomic)
- **Cancel**: 48h window before checkIn (admin bypass), idempotent, releases RoomNight rows
- **Derived status**: `upcoming` | `active` | `completed` | `cancelled`
- **Concurrency**: 10 parallel requests same room/dates → exactly 1 success, 9 × 409 `ROOM_UNAVAILABLE`, no orphan rows

### 5. Email System
- **EmailOutbox** collection: to, subject, html, text, attachments, status, attempts, lastError, nextRetryAt
- **Worker**: 15s interval, atomic claim (findOneAndUpdate), exponential backoff (1m, 5m, 15m, 1h, 6h), max 5 attempts
- **Stuck recovery**: Rows claimed >10min without completion → re-queue
- **Templates**: Booking confirmation, modification, cancellation — each with `.ics` attachment
- **Dev**: Mailtrap SMTP. No creds → Ethereal test account, log preview URL
- **Failure never blocks/rolls back booking**

### 6. Admin Dashboard
- **Stats cards**: Total rooms, active bookings, occupancy %, revenue (30d)
- **Rooms table**: CRUD with create/edit modal, active toggle
- **Bookings table**: Filters (status, date range, guest), cancel action
- **Occupancy calendar**: Month view, per-room night occupancy
- **Failed emails**: List with retry button

### 7. Seed Script
- Admin: `admin@hotel.test` / `Admin@12345`
- Two guests: `guest1@test.com`, `guest2@test.com` / `Guest@12345`
- 20 rooms (mix of types)
- 8 sample bookings with matching RoomNight rows
- **Refuses to run when `NODE_ENV=production`**

### 8. Payment Processing (In Scope)
- **Payment Methods**: Pay online (Cards, UPI, Netbanking via Razorpay or simulated Mock Provider) and Pay at hotel.
- **Provider Architecture**: Swappable provider interface (`mock` or `razorpay`) configured via `PAYMENT_PROVIDER`.
- **Payment Lifecycle**: `pending` → `paid` / `pay_at_hotel` / `failed` / `refunded` / `partially_refunded`.
- **Hold & Expiry**: Online booking creates `pending_payment` status and holds `RoomNight` rows until `holdExpiresAt` (default 15 mins). Worker releases nights and expires bookings if unpaid.
- **Idempotent Verification**: Timing-safe HMAC signature verification on `POST /api/payments/verify`, backup via webhook.
- **Cancellation & Refunds**: Cancelling a paid booking inside window triggers automatic provider refund. Modifying to lower price triggers differential refund; modifying to higher price returns 409 prompting rebook.
- **Admin Management**: Payments list, manual mark-as-paid for pay-at-hotel bookings, and manual full/partial refund actions.

## Non-Functional
- No Docker, no Redis, no multi-doc transactions
- macOS, Node 20+, MongoDB Atlas
- Server port 5001 (AirPlay on 5000), Client 5173
- CORS: exact CLIENT_URL only
- ES modules throughout

## Out of Scope (Stretch)
- Reviews, multi-property, loyalty, PWA, i18n, SMS, channel manager