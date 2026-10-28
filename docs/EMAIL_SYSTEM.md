# Email System

## Overview
Decoupled email delivery via `EmailOutbox` collection + in-process worker. Booking operations **never wait** for email; they enqueue and return immediately.

## EmailOutbox Collection
See [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md#email_outbox)

## Worker
- **Interval**: 15 seconds
- **Claim**: Atomic `findOneAndUpdate` — `status: 'pending'`, `nextRetryAt <= now`, `lockedAt: null` → set `status: 'sending'`, `lockedAt: now`, `lockedBy: workerId`
- **Send**: Nodemailer with transporter
- **Success**: `status: 'sent'`, `sentAt: now`, `lockedAt: null`
- **Failure**: Increment `attempts`, set `lastError`, `nextRetryAt = now + backoff(attempts)`, `status: 'pending'` (or `'failed'` if max attempts), `lockedAt: null`
- **Backoff schedule** (attempts 1→5): 1min, 5min, 15min, 1hr, 6hr
- **Stuck recovery**: Any doc with `status: 'sending'` AND `lockedAt < now - 10min` → reset to `status: 'pending'`, `lockedAt: null`, `lockedBy: null`

## Templates
All templates receive: `booking`, `room`, `user`, `nights`, `totalPrice`, `reference`

### 1. Booking Confirmation
- **Trigger**: Dispatched only when the booking is `confirmed` (for Pay at Hotel, dispatched immediately upon booking creation; for Pay Online, dispatched upon successful payment verification).
- **Subject**: `Booking Confirmed — {{reference}}`
- **HTML**: Booking details, room info, stay dates, guest count, price summary, payment method (`Pay Online` or `Pay at Hotel`), payment status, amount paid / due at check-in, provider reference, and cancellation policy.
- **Text**: Plain-text version with full payment summary
- **Attachment**: `booking-{{reference}}.ics`

### 2. Booking Modification
- **Subject**: `Booking Modified — {{reference}}`
- **HTML**: Old vs new dates/guests/price, room info, payment adjustment summary (including any automatic refund amount credited back to original payment method).
- **Attachment**: Updated `.ics`

### 3. Booking Cancellation
- **Subject**: `Booking Cancelled — {{reference}}`
- **HTML**: Cancelled booking details, refund breakdown (refund amount, provider refund ID, and estimated timeline of 5–7 business days for online card/UPI payments; or "No charges applied" for pay-at-hotel).
- **Attachment**: Cancellation `.ics`

## .ics Generation
```javascript
function generateICS(booking, room, user, type = 'confirmation') {
  const uid = `${booking.reference}@hotel-booking`;
  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const dtstart = booking.checkIn.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const dtend = booking.checkOut.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  let summary, description, status;
  if (type === 'cancellation') {
    summary = `CANCELLED: ${room.name} - ${booking.reference}`;
    description = `This booking has been cancelled.`;
    status = 'CANCELLED';
  } else {
    summary = `${room.name} - ${booking.reference}`;
    description = `Guests: ${booking.guests}\nTotal: ${formatPrice(booking.totalPrice)}`;
    status = 'CONFIRMED';
  }
  
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Hotel Booking//EN
METHOD:${type === 'cancellation' ? 'CANCEL' : 'REQUEST'}
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${dtstamp}
DTSTART:${dtstart}
DTEND:${dtend}
SUMMARY:${summary}
DESCRIPTION:${description}
STATUS:${status}
LOCATION:${room.name}
END:VEVENT
END:VCALENDAR`;
}
```

## Dev SMTP
- **Mailtrap**: Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` in `.env`
- **Fallback**: If no SMTP creds → create Ethereal test account on startup, log preview URL for each email
- **From**: `noreply@hotel-booking.test` (configurable)

## Enqueue Functions (called from services)
```javascript
async function enqueueConfirmationEmail(booking) {
  const room = await Room.findById(booking.room);
  const user = await User.findById(booking.user);
  const nights = dateRange(booking.checkIn, booking.checkOut);
  
  await EmailOutbox.create({
    to: user.email,
    subject: `Booking Confirmed — ${booking.reference}`,
    html: renderConfirmationTemplate(booking, room, user, nights),
    text: renderConfirmationText(booking, room, user, nights),
    attachments: [{
      filename: `booking-${booking.reference}.ics`,
      content: generateICS(booking, room, user, 'confirmation'),
      contentType: 'text/calendar'
    }]
  });
}

// Similar for modification, cancellation
```

## Worker Startup
```javascript
// server/src/workers/emailWorker.js
setInterval(processQueue, 15000);

// Also run once on startup
processQueue();
```

## Testing Requirements
- **Retry test**: Simulate SMTP failure → verify backoff schedule, max attempts, stuck recovery
- **Non-blocking test**: Booking creation succeeds even when email worker is down
- **Template test**: Verify .ics attaches correctly, parses in calendar apps