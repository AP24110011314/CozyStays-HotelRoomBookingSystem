# Availability Logic

## Date Model
- **All dates are UTC date-only**: `YYYY-MM-DDT00:00:00.000Z`
- No timezone conversions anywhere
- `checkIn` = first night, `checkOut` = first **free** night
- Stay occupies nights: `[checkIn, checkOut)` — half-open interval
- **Number of nights** = `diffInDays(checkOut, checkIn)`
- Example: checkIn `2025-06-10`, checkOut `2025-06-13` → nights: 10, 11, 12 (3 nights)

## Overlap Definition
Two stays overlap **iff**:
```
stayA.checkIn < stayB.checkOut  AND  stayB.checkIn < stayA.checkOut
```
Equivalently: their night sets intersect.

## Availability Query
A room is **available** for `[checkIn, checkOut)` iff:
```
NO RoomNight exists WHERE room = :roomId AND date IN nights[checkIn, checkOut)
```
Implementation: `RoomNight.find({ room, date: { $gte: checkIn, $lt: checkOut } })` → empty = available

## Search Filters
Input: `checkIn`, `checkOut`, `guests?`, `minPrice?`, `maxPrice?`, `type?`, `amenities?`, `sort?`, `page?`, `limit?`

Algorithm:
1. Validate `checkIn < checkOut`, both future (or today for checkIn)
2. Compute `nights = dateRange(checkIn, checkOut)`
3. Find candidate rooms:
   - `active: true`
   - `maxGuests >= guests` (if provided)
   - `basePrice` in range (if provided)
   - `type` matches (if provided)
   - `amenities: { $all: amenities }` (if provided)
4. For each candidate, check availability (step 2 query) — **can be optimized with aggregation**
4a. Exclude rooms with ANY RoomNight in the range
5. For available rooms, compute:
   - `nights = nights.length`
   - `totalPrice = basePrice * nights`
6. Sort: `priceAsc`, `priceDesc`, `name`, `type` (default: `priceAsc`)
7. Paginate: `skip = (page-1)*limit`, `limit` (default 10, max 50)
8. Return: `{ data: RoomWithPrice[], meta: { page, limit, total, totalPages } }`

## Unavailable Dates Endpoint
`GET /api/rooms/:id/unavailable-dates?from=2025-06-01&to=2025-08-31`
- Returns: `{ data: { unavailableDates: ['2025-06-10', '2025-06-11', ...] } }`
- Queries RoomNight for room in `[from, to)` range
- Used by date picker to disable booked nights

## Concurrency-Safe Booking Creation
```
function createBooking(userId, roomId, checkIn, checkOut, guests):
  nights = dateRange(checkIn, checkOut)
  room = Room.findById(roomId)
  if !room || !room.active: throw NOT_FOUND
  if guests > room.maxGuests: throw VALIDATION_ERROR

  // Atomic claim via unique index
  roomNightDocs = nights.map(d => ({ room: roomId, date: d, booking: tempId }))
  try:
    inserted = await RoomNight.insertMany(roomNightDocs, { ordered: false })
  catch (e):
    if e.code === 11000:  // duplicate key
      // Clean up any partial inserts
      await RoomNight.deleteMany({ room: roomId, date: { $in: nights } })
      throw ROOM_UNAVAILABLE
    throw

  if inserted.length !== nights.length:
    await RoomNight.deleteMany({ room: roomId, date: { $in: nights } })
    throw ROOM_UNAVAILABLE

  // Success — create booking
  booking = await Booking.create({
    reference: generateRef(),
    user: userId,
    room: roomId,
    checkIn, checkOut, guests,
    totalPrice: room.basePrice * nights.length,
    status: 'upcoming'
  })

  // Update RoomNight with real booking ID
  await RoomNight.updateMany(
    { room: roomId, date: { $in: nights } },
    { $set: { booking: booking._id } }
  )

  // Enqueue email (non-blocking)
  enqueueConfirmationEmail(booking)

  return booking
```

## Payment Hold & Expiry Logic (Online Bookings)
For online payments, rooms must be protected from double-booking while the guest completes payment without permanently locking inventory if the guest abandons checkout.

### 1. Atomic Hold Creation
- When `POST /api/bookings` is called with `paymentMethod: 'online'`:
  - `RoomNight` rows for `[checkIn, checkOut)` are claimed atomically via the unique index `{ room: 1, date: 1 }`.
  - The booking is created with `status: 'pending_payment'`, `paymentMethod: 'online'`, `paymentStatus: 'pending'`, and `holdExpiresAt = new Date(Date.now() + env.paymentHoldMinutes * 60 * 1000)`.
  - A payment order is initiated with the configured payment provider (`mock` or `razorpay`).
  - Other guests searching for these dates will receive 409 `ROOM_UNAVAILABLE` while the hold is active.

### 2. Hold Expiry & Automatic Release
- **Background Worker**: An in-process cron/interval job runs every 60 seconds:
  ```javascript
  const expiredBookings = await Booking.find({
    status: 'pending_payment',
    holdExpiresAt: { $lt: new Date() }
  });
  for (const b of expiredBookings) {
    b.status = 'expired';
    b.paymentStatus = 'failed';
    await b.save();
    await RoomNight.deleteMany({ booking: b._id });
    await Payment.updateMany({ booking: b._id, status: 'pending' }, { status: 'failed', failureReason: 'Hold expired' });
  }
  ```
- **Lazy Expiry on Access**:
  - Whenever `GET /api/bookings/:id` or `POST /api/bookings/:id/pay` is invoked on a `pending_payment` booking where `now > holdExpiresAt`, the booking is lazily expired and its `RoomNight` records are purged.
- **Verification Guard**:
  - If payment verification succeeds after the hold has expired, the server attempts an atomic re-claim of `RoomNight` rows.
  - If another guest has since claimed any of those nights, verification fails with 409 `ROOM_UNAVAILABLE` and triggers an automatic refund of the captured funds.

## Modify Booking (Change Dates/Guests)
```
function modifyBooking(bookingId, userId, newCheckIn, newCheckOut, newGuests):
  booking = Booking.findById(bookingId)
  if !booking: throw NOT_FOUND
  if booking.user !== userId && userRole !== 'admin': throw FORBIDDEN
  if booking.status === 'cancelled': throw VALIDATION_ERROR
  if booking.status === 'completed': throw VALIDATION_ERROR

  newNights = dateRange(newCheckIn, newCheckOut)
  oldNights = dateRange(booking.checkIn, booking.checkOut)

  // Nights to ADD (new - old)
  addedNights = newNights.filter(d => !oldNights.includes(d))
  // Nights to REMOVE (old - new)
  removedNights = oldNights.filter(d => !newNights.includes(d))

  // 1. CLAIM NEW NIGHTS FIRST
  if addedNights.length > 0:
    try:
      await RoomNight.insertMany(
        addedNights.map(d => ({ room: booking.room, date: d, booking: booking._id })),
        { ordered: false }
      )
    catch (e):
      if e.code === 11000:
        await RoomNight.deleteMany({ room: booking.room, date: { $in: addedNights } })
        throw ROOM_UNAVAILABLE
      throw

  // 2. RELEASE OLD NIGHTS LAST
  if removedNights.length > 0:
    await RoomNight.deleteMany({ room: booking.room, date: { $in: removedNights } })

  // 3. Update booking
  booking.checkIn = newCheckIn
  booking.checkOut = newCheckOut
  booking.guests = newGuests
  booking.totalPrice = room.basePrice * newNights.length
  await booking.save()

  // Enqueue modification email
  enqueueModificationEmail(booking)

  return booking
```

## Cancel Booking
```
function cancelBooking(bookingId, userId, isAdmin):
  booking = Booking.findById(bookingId)
  if !booking: throw NOT_FOUND
  if booking.user !== userId && !isAdmin: throw FORBIDDEN
  if booking.status === 'cancelled': return booking  // idempotent

  // 48h window: checkIn - now > 48 hours (admin bypass)
  if !isAdmin:
    const hoursUntilCheckIn = (booking.checkIn - now()) / (1000*60*60)
    if hoursUntilCheckIn <= 48: throw CANCEL_WINDOW_EXPIRED

  // Release RoomNights
  await RoomNight.deleteMany({ booking: bookingId })

  // Update booking
  booking.status = 'cancelled'
  booking.cancelledAt = now()
  await booking.save()

  // Enqueue cancellation email
  enqueueCancellationEmail(booking)

  return booking
```

## Derived Status & canCancel
```
function getDerivedStatus(booking):
  const now = new Date()  // UTC
  if booking.status === 'cancelled': return 'cancelled'
  if now >= booking.checkOut: return 'completed'
  if now >= booking.checkIn: return 'active'
  return 'upcoming'

function canCancel(booking, isAdmin):
  if booking.status === 'cancelled': return false
  if isAdmin: return true
  const hoursUntilCheckIn = (booking.checkIn - now()) / (1000*60*60)
  return hoursUntilCheckIn > 48
```

## Overlap Test Matrix (Mandatory)
| Stay A | Stay B | Overlap? |
|--------|--------|----------|
| 10-13  | 13-15  | No (checkOut = checkIn) |
| 10-13  | 12-14  | Yes |
| 10-13  | 9-11   | Yes |
| 10-13  | 9-14   | Yes |
| 10-13  | 11-12  | Yes |
| 10-10  | 10-11  | No (zero nights) |
| 10-13  | 10-13  | Yes (identical) |