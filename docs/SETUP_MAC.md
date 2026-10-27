# macOS Setup Guide

## Prerequisites
- macOS (tested on 13+)
- Homebrew: `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`
- Node 20+: `brew install node@20` → `echo 'export PATH="/opt/homebrew/opt/node@20/bin:$PATH"' >> ~/.zshrc`
- MongoDB Atlas (Cloud database, default) or optional local MongoDB (`brew install mongodb-community@7.0`)

## Database Configuration

### MongoDB Atlas (Default)
1. Create a cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Under **Network Access**, add your current IP address (or `0.0.0.0/0` for development).
3. Under **Database Access**, create a database user and password.
4. Obtain your connection string and add it to `server/.env` as `MONGODB_URI`:
   `mongodb+srv://<db_user>:<db_password>@<cluster>.mongodb.net/hotel_booking?retryWrites=true&w=majority`

### Local MongoDB (Optional Alternative)
```bash
# Start local service if preferring local database
brew services start mongodb-community@7.0
```

## Project Setup
```bash
cd /Users/ammu/Projects/Hotel\ Booking

# Server
cd server
cp .env.example .env
# Edit server/.env with your MONGODB_URI and JWT_SECRET
npm install
npm run seed -- --yes
npm run dev

# Client
cd ../client
cp .env.example .env
npm install
npm run dev
```

## Environment Files

### `server/.env.example`
```bash
PORT=5001
NODE_ENV=development
MONGODB_URI=mongodb+srv://<db_user>:<db_password>@<cluster>.mongodb.net/hotel_booking?retryWrites=true&w=majority
JWT_SECRET=generate-with-openssl-rand-base64-32
JWT_EXPIRES_IN=15m
CLIENT_URL=http://localhost:5173
CANCELLATION_WINDOW_HOURS=48
MAX_STAY_NIGHTS=30

# SMTP (Mailtrap)
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-mailtrap-user
SMTP_PASS=your-mailtrap-pass
SMTP_FROM=noreply@hotel-booking.test
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