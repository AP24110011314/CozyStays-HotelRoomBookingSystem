import env from '../config/env.js';
import { EmailOutbox } from '../models/index.js';
import { Room, User } from '../models/index.js';
import { formatPrice, formatDate } from '../utils/format.js';
import { generateICS } from '../utils/ics.js';
import { dateRange } from '../utils/dates.js';

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const EMAIL_TEMPLATES = {
  confirmation: (booking, room, user, nights) => {
    const bookingUrl = `${env.clientUrl}/bookings/${booking._id}`;
    return {
      subject: `Booking Confirmed — ${booking.reference}`,
      html: `
        <h1>Booking Confirmed</h1>
        <p>Dear ${escapeHtml(user.name)},</p>
        <p>Your booking has been confirmed. Here are the details:</p>
        <ul>
          <li><strong>Reference:</strong> ${escapeHtml(booking.reference)}</li>
          <li><strong>Room:</strong> ${escapeHtml(room.name)} (${escapeHtml(room.type)})</li>
          <li><strong>Check-in:</strong> ${escapeHtml(formatDate(booking.checkIn))}</li>
          <li><strong>Check-out:</strong> ${escapeHtml(formatDate(booking.checkOut))}</li>
          <li><strong>Nights:</strong> ${nights.length}</li>
          <li><strong>Guests:</strong> ${booking.guests}</li>
          <li><strong>Total:</strong> ${escapeHtml(formatPrice(booking.totalPrice))}</li>
        </ul>
        <p><strong>Cancellation Policy:</strong> Free cancellation up to ${env.cancellationWindowHours} hours before check-in.</p>
        <p><a href="${bookingUrl}">View your booking details online</a></p>
        <p>We look forward to your stay!</p>
      `,
      text: `
Booking Confirmed

Dear ${user.name},

Your booking has been confirmed. Here are the details:

Reference: ${booking.reference}
Room: ${room.name} (${room.type})
Check-in: ${formatDate(booking.checkIn)}
Check-out: ${formatDate(booking.checkOut)}
Nights: ${nights.length}
Guests: ${booking.guests}
Total: ${formatPrice(booking.totalPrice)}

Cancellation Policy: Free cancellation up to ${env.cancellationWindowHours} hours before check-in.

View your booking details online: ${bookingUrl}

We look forward to your stay!
      `,
    };
  },

  modification: (booking, room, user, nights, oldData) => {
    const bookingUrl = `${env.clientUrl}/bookings/${booking._id}`;
    return {
      subject: `Booking Modified — ${booking.reference}`,
      html: `
        <h1>Booking Modified</h1>
        <p>Dear ${escapeHtml(user.name)},</p>
        <p>Your booking has been modified. Here are the changes:</p>
        <table border="1" cellpadding="5" cellspacing="0">
          <tr><th></th><th>Old</th><th>New</th></tr>
          <tr><td>Check-in</td><td>${escapeHtml(formatDate(oldData.checkIn))}</td><td>${escapeHtml(formatDate(booking.checkIn))}</td></tr>
          <tr><td>Check-out</td><td>${escapeHtml(formatDate(oldData.checkOut))}</td><td>${escapeHtml(formatDate(booking.checkOut))}</td></tr>
          <tr><td>Nights</td><td>${dateRange(oldData.checkIn, oldData.checkOut).length}</td><td>${nights.length}</td></tr>
          <tr><td>Guests</td><td>${oldData.guests}</td><td>${booking.guests}</td></tr>
          <tr><td>Total</td><td>${escapeHtml(formatPrice(room.basePrice * dateRange(oldData.checkIn, oldData.checkOut).length))}</td><td>${escapeHtml(formatPrice(booking.totalPrice))}</td></tr>
        </table>
        <p><strong>Room:</strong> ${escapeHtml(room.name)} (${escapeHtml(room.type)})</p>
        <p><strong>Reference:</strong> ${escapeHtml(booking.reference)}</p>
        <p><a href="${bookingUrl}">View your updated booking online</a></p>
      `,
      text: `
Booking Modified

Dear ${user.name},

Your booking has been modified. Here are the changes:

Check-in: ${formatDate(oldData.checkIn)} -> ${formatDate(booking.checkIn)}
Check-out: ${formatDate(oldData.checkOut)} -> ${formatDate(booking.checkOut)}
Nights: ${dateRange(oldData.checkIn, oldData.checkOut).length} -> ${nights.length}
Guests: ${oldData.guests} -> ${booking.guests}
Total: ${formatPrice(room.basePrice * dateRange(oldData.checkIn, oldData.checkOut).length)} -> ${formatPrice(booking.totalPrice)}

Room: ${room.name} (${room.type})
Reference: ${booking.reference}

View your updated booking online: ${bookingUrl}
      `,
    };
  },

  cancellation: (booking, room, user, nights) => {
    const bookingUrl = `${env.clientUrl}/bookings/${booking._id}`;
    return {
      subject: `Booking Cancelled — ${booking.reference}`,
      html: `
        <h1>Booking Cancelled</h1>
        <p>Dear ${escapeHtml(user.name)},</p>
        <p>Your booking has been cancelled. Here are the details:</p>
        <ul>
          <li><strong>Reference:</strong> ${escapeHtml(booking.reference)}</li>
          <li><strong>Room:</strong> ${escapeHtml(room.name)} (${escapeHtml(room.type)})</li>
          <li><strong>Check-in:</strong> ${escapeHtml(formatDate(booking.checkIn))}</li>
          <li><strong>Check-out:</strong> ${escapeHtml(formatDate(booking.checkOut))}</li>
          <li><strong>Nights:</strong> ${nights.length}</li>
          <li><strong>Guests:</strong> ${booking.guests}</li>
          <li><strong>Total:</strong> ${escapeHtml(formatPrice(booking.totalPrice))}</li>
        </ul>
        <p>If you are eligible for a refund, it will be processed according to our policy.</p>
        <p><a href="${bookingUrl}">View booking status online</a></p>
      `,
      text: `
Booking Cancelled

Dear ${user.name},

Your booking has been cancelled. Here are the details:

Reference: ${booking.reference}
Room: ${room.name} (${room.type})
Check-in: ${formatDate(booking.checkIn)}
Check-out: ${formatDate(booking.checkOut)}
Nights: ${nights.length}
Guests: ${booking.guests}
Total: ${formatPrice(booking.totalPrice)}

If you are eligible for a refund, it will be processed according to our policy.

View booking status online: ${bookingUrl}
      `,
    };
  },
};

export async function enqueueConfirmationEmail(booking) {
  const room = await Room.findById(booking.room);
  const user = await User.findById(booking.user);
  const nights = dateRange(booking.checkIn, booking.checkOut);

  const template = EMAIL_TEMPLATES.confirmation(booking, room, user, nights);

  await EmailOutbox.create({
    to: user.email,
    subject: template.subject,
    html: template.html,
    text: template.text,
    attachments: [{
      filename: `booking-${booking.reference}.ics`,
      content: generateICS(booking, room, user, 'confirmation'),
      contentType: 'text/calendar',
    }],
  });
}

export async function enqueueModificationEmail(booking, oldData) {
  const room = await Room.findById(booking.room);
  const user = await User.findById(booking.user);
  const nights = dateRange(booking.checkIn, booking.checkOut);

  const template = EMAIL_TEMPLATES.modification(booking, room, user, nights, oldData);

  await EmailOutbox.create({
    to: user.email,
    subject: template.subject,
    html: template.html,
    text: template.text,
    attachments: [{
      filename: `booking-${booking.reference}.ics`,
      content: generateICS(booking, room, user, 'modification'),
      contentType: 'text/calendar',
    }],
  });
}

export async function enqueueCancellationEmail(booking) {
  const room = await Room.findById(booking.room);
  const user = await User.findById(booking.user);
  const nights = dateRange(booking.checkIn, booking.checkOut);

  const template = EMAIL_TEMPLATES.cancellation(booking, room, user, nights);

  await EmailOutbox.create({
    to: user.email,
    subject: template.subject,
    html: template.html,
    text: template.text,
    attachments: [{
      filename: `booking-${booking.reference}.ics`,
      content: generateICS(booking, room, user, 'cancellation'),
      contentType: 'text/calendar',
    }],
  });
}