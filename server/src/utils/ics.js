export function generateICS(booking, room, user, type = 'confirmation') {
  const uid = `${booking.reference}@hotel-booking`;
  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const dtstart = new Date(booking.checkIn).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const dtend = new Date(booking.checkOut).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  let summary, description, status, method;
  if (type === 'cancellation') {
    summary = `CANCELLED: ${room.name} - ${booking.reference}`;
    description = `This booking has been cancelled.`;
    status = 'CANCELLED';
    method = 'CANCEL';
  } else {
    summary = `${room.name} - ${booking.reference}`;
    description = `Guests: ${booking.guests}\nTotal: ${formatPrice(booking.totalPrice)}`;
    status = 'CONFIRMED';
    method = 'REQUEST';
  }

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Hotel Booking//EN
METHOD:${method}
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

// Need formatPrice
import { formatPrice } from './format.js';