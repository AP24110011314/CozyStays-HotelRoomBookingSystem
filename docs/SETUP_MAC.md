# macOS Setup Guide

## Prerequisites
- macOS (tested on 13+)
- Homebrew: `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`
- Node 20+: `brew install node@20` → `echo 'export PATH="/opt/homebrew/opt/node@20/bin:$PATH"' >> ~/.zshrc`
- MongoDB 7.0: `brew install mongodb-community@7.0`

## MongoDB
```bash
# Start service
brew services start mongodb-community@7.0

# Verify
mongosh --eval "db.runCommand({ connectionStatus: 1 })"

# Database created automatically on first write: hotel_booking
# Connection string: mongodb://127.0.0.1:27017/hotel_booking
```

## Project Setup
```bash
cd /Users/ammu/Projects/Hotel\ Booking

# Server
cd server
cp .env.example .env
npm install

# Client
cd ../client
cp .env.example .env
npm install
```

## Environment Files

### `server/.env.example`
```bash
PORT=5001
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/hotel_booking
JWT_SECRET=generate-with-openssl-rand-base64-32
JWT_EXPIRES_IN=15m
CLIENT_URL=http://localhost:5173

# SMTP (Mailtrap)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-mailtrap-user
SMTP_PASS=your-mailtrap-pass
SMTP_FROM=noreply@hotel-booking.test

# Optional: Ethereal fallback if no SMTP creds
```

### `client/.env.example`
```bash
VITE_API_URL=http://localhost:5001/api
```

## Generate JWT Secret
```bash
openssl rand -base64 32
# Paste output into server/.env JWT_SECRET
```

## Mailtrap Setup (Development)
1. Create account at https://mailtrap.io
2. Create inbox → get SMTP credentials
3. Add to `server/.env`
4. Emails appear in Mailtrap inbox

## Running
```bash
# Terminal 1: MongoDB (if not service)
# mongod --dbpath /opt/homebrew/var/mongodb

# Terminal 2: Server
cd server
npm run seed   # creates admin, guests, rooms, bookings
npm run dev    # nodemon on :5001

# Terminal 3: Client
cd client
npm run dev    # Vite on :5173
```

## Verify
- API: http://localhost:5001/api/health → `{ "status": "ok" }`
- Client: http://localhost:5173
- Login: `admin@hotel.test` / `Admin@12345`
- Guest: `guest1@test.com` / `Guest@12345`

## Useful Commands
```bash
# MongoDB shell
mongosh hotel_booking

# View collections
show collections
db.users.find()
db.rooms.find()
db.bookings.find()
db.room_nights.find()
db.email_outbox.find()

# Reset database
mongosh hotel_booking --eval "db.dropDatabase()"

# Stop MongoDB
brew services stop mongodb-community@7.0
```

## Troubleshooting
- **Port 5000 in use**: AirPlay Receiver (System Settings → General → AirDrop & Handoff → AirPlay Receiver → Off). Server uses 5001.
- **MongoDB connection refused**: `brew services restart mongodb-community@7.0`
- **Node version**: `node -v` → must be 20+
- **Permission errors**: `chmod -R 755 /opt/homebrew/var/mongodb`