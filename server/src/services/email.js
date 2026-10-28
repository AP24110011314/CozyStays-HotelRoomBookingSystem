import env from '../config/env.js';
import { EmailOutbox } from '../models/index.js';
import { Room, User } from '../models/index.js';
import { formatPrice, formatDate } from '../utils/format.js';
import { generateICS } from '../utils/ics.js';
import { dateRange } from '../utils/dates.js';
import { wrapEmailTemplate } from '../emails/theme.js';

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
    const isOnline = booking.paymentMethod === 'online';
    const paymentMethodLabel = isOnline ? 'Paid Online' : 'Pay at Hotel';
    const paymentStatusLabel = isOnline
      ? 'Paid'
      : 'Pending payment at check-in';
    const paymentAmountLabel = isOnline
      ? `Amount Paid: ${formatPrice(booking.totalPrice)}`
      : `Amount to Pay at Hotel: ${formatPrice(booking.totalPrice)}`;

    const contentHtml = `
      <p>Dear ${escapeHtml(user.name)},</p>
      <p>Your booking has been confirmed. Here are the details:</p>
      <ul style="padding-left: 20px; line-height: 1.8;">
        <li><strong>Reference:</strong> ${escapeHtml(booking.reference)}</li>
        <li><strong>Room:</strong> ${escapeHtml(room.name)} (${escapeHtml(room.type)})</li>
        <li><strong>Check-in:</strong> ${escapeHtml(formatDate(booking.checkIn))}</li>
        <li><strong>Check-out:</strong> ${escapeHtml(formatDate(booking.checkOut))}</li>
        <li><strong>Nights:</strong> ${nights.length}</li>
        <li><strong>Guests:</strong> ${booking.guests}</li>
        <li><strong>Total:</strong> ${escapeHtml(formatPrice(booking.totalPrice))}</li>
        <li><strong>Payment Method:</strong> ${escapeHtml(paymentMethodLabel)}</li>
        <li><strong>Payment Status:</strong> ${escapeHtml(paymentStatusLabel)}</li>
        <li><strong>${escapeHtml(paymentAmountLabel)}</strong></li>
      </ul>
      <p><strong>Cancellation Policy:</strong> Free cancellation up to ${env.cancellationWindowHours} hours before check-in.</p>
      <p>We look forward to welcoming you to ${escapeHtml(env.appName)}!</p>
    `;

    return {
      subject: `Booking Confirmed — ${booking.reference} | ${env.appName}`,
      html: wrapEmailTemplate({
        title: 'Booking Confirmed',
        content: contentHtml,
        ctaLabel: 'View Your Booking',
        ctaUrl: bookingUrl,
        appName: env.appName,
      }),
      text: `
Booking Confirmed — ${env.appName}

Dear ${user.name},

Your booking has been confirmed. Here are the details:

Reference: ${booking.reference}
Room: ${room.name} (${room.type})
Check-in: ${formatDate(booking.checkIn)}
Check-out: ${formatDate(booking.checkOut)}
Nights: ${nights.length}
Guests: ${booking.guests}
Total: ${formatPrice(booking.totalPrice)}
Payment Method: ${paymentMethodLabel}
Payment Status: ${paymentStatusLabel}
${paymentAmountLabel}

Cancellation Policy: Free cancellation up to ${env.cancellationWindowHours} hours before check-in.

View your booking details online: ${bookingUrl}

We look forward to your stay!

Warm regards,
The ${env.appName} Team
      `.trim(),
    };
  },

  modification: (booking, room, user, nights, oldData) => {
    const bookingUrl = `${env.clientUrl}/bookings/${booking._id}`;
    const oldTotal = room.basePrice * dateRange(oldData.checkIn, oldData.checkOut).length;
    const newTotal = booking.totalPrice;
    const diff = oldTotal - newTotal;
    const isOnline = booking.paymentMethod === 'online';
    let refundNoticeHtml = '';
    let refundNoticeText = '';

    if (isOnline && diff > 0) {
      refundNoticeHtml = `<p><strong>Refund Issued:</strong> A difference of ${escapeHtml(formatPrice(diff))} has been refunded to your original payment method (expected in 5–7 business days).</p>`;
      refundNoticeText = `Refund Issued: A difference of ${formatPrice(diff)} has been refunded to your original payment method (expected in 5–7 business days).\n`;
    }

    const contentHtml = `
      <p>Dear ${escapeHtml(user.name)},</p>
      <p>Your booking has been modified. Here are the changes:</p>
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%; border-color: #E5E0D8; margin: 16px 0;">
        <tr style="background-color: #FAF9F6;"><th style="padding: 8px; text-align: left;">Field</th><th style="padding: 8px; text-align: left;">Old</th><th style="padding: 8px; text-align: left;">New</th></tr>
        <tr><td style="padding: 8px;">Check-in</td><td style="padding: 8px;">${escapeHtml(formatDate(oldData.checkIn))}</td><td style="padding: 8px;">${escapeHtml(formatDate(booking.checkIn))}</td></tr>
        <tr><td style="padding: 8px;">Check-out</td><td style="padding: 8px;">${escapeHtml(formatDate(oldData.checkOut))}</td><td style="padding: 8px;">${escapeHtml(formatDate(booking.checkOut))}</td></tr>
        <tr><td style="padding: 8px;">Nights</td><td style="padding: 8px;">${dateRange(oldData.checkIn, oldData.checkOut).length}</td><td style="padding: 8px;">${nights.length}</td></tr>
        <tr><td style="padding: 8px;">Guests</td><td style="padding: 8px;">${oldData.guests}</td><td style="padding: 8px;">${booking.guests}</td></tr>
        <tr><td style="padding: 8px;">Total</td><td style="padding: 8px;">${escapeHtml(formatPrice(oldTotal))}</td><td style="padding: 8px;">${escapeHtml(formatPrice(booking.totalPrice))}</td></tr>
      </table>
      ${refundNoticeHtml}
      <p><strong>Room:</strong> ${escapeHtml(room.name)} (${escapeHtml(room.type)})</p>
      <p><strong>Reference:</strong> ${escapeHtml(booking.reference)}</p>
    `;

    return {
      subject: `Booking Modified — ${booking.reference} | ${env.appName}`,
      html: wrapEmailTemplate({
        title: 'Booking Modified',
        content: contentHtml,
        ctaLabel: 'View Updated Booking',
        ctaUrl: bookingUrl,
        appName: env.appName,
      }),
      text: `
Booking Modified — ${env.appName}

Dear ${user.name},

Your booking has been modified. Here are the changes:

Check-in: ${formatDate(oldData.checkIn)} -> ${formatDate(booking.checkIn)}
Check-out: ${formatDate(oldData.checkOut)} -> ${formatDate(booking.checkOut)}
Nights: ${dateRange(oldData.checkIn, oldData.checkOut).length} -> ${nights.length}
Guests: ${oldData.guests} -> ${booking.guests}
Total: ${formatPrice(oldTotal)} -> ${formatPrice(booking.totalPrice)}
${refundNoticeText}
Room: ${room.name} (${room.type})
Reference: ${booking.reference}

View your updated booking online: ${bookingUrl}

Warm regards,
The ${env.appName} Team
      `.trim(),
    };
  },

  cancellation: (booking, room, user, nights) => {
    const bookingUrl = `${env.clientUrl}/bookings/${booking._id}`;
    const isOnline = booking.paymentMethod === 'online';
    const isPaid = ['paid', 'partially_refunded', 'refunded'].includes(booking.paymentStatus);
    let refundInfoHtml = '';
    let refundInfoText = '';

    if (isOnline && isPaid) {
      refundInfoHtml = `<p><strong>Refund Amount:</strong> ${escapeHtml(formatPrice(booking.totalPrice))} has been credited to your payment provider and should reflect in your account within 5–7 business days.</p>`;
      refundInfoText = `Refund Amount: ${formatPrice(booking.totalPrice)} has been credited to your payment provider and should reflect in your account within 5–7 business days.\n`;
    } else if (booking.paymentMethod === 'pay_at_hotel') {
      refundInfoHtml = `<p><strong>Payment Notice:</strong> This was a Pay at Hotel reservation. No charges were made.</p>`;
      refundInfoText = `Payment Notice: This was a Pay at Hotel reservation. No charges were made.\n`;
    }

    const contentHtml = `
      <p>Dear ${escapeHtml(user.name)},</p>
      <p>Your booking has been cancelled. Here are the details:</p>
      <ul style="padding-left: 20px; line-height: 1.8;">
        <li><strong>Reference:</strong> ${escapeHtml(booking.reference)}</li>
        <li><strong>Room:</strong> ${escapeHtml(room.name)} (${escapeHtml(room.type)})</li>
        <li><strong>Check-in:</strong> ${escapeHtml(formatDate(booking.checkIn))}</li>
        <li><strong>Check-out:</strong> ${escapeHtml(formatDate(booking.checkOut))}</li>
        <li><strong>Nights:</strong> ${nights.length}</li>
        <li><strong>Guests:</strong> ${booking.guests}</li>
        <li><strong>Total:</strong> ${escapeHtml(formatPrice(booking.totalPrice))}</li>
      </ul>
      ${refundInfoHtml}
    `;

    return {
      subject: `Booking Cancelled — ${booking.reference} | ${env.appName}`,
      html: wrapEmailTemplate({
        title: 'Booking Cancelled',
        content: contentHtml,
        ctaLabel: 'View Booking Status',
        ctaUrl: bookingUrl,
        appName: env.appName,
      }),
      text: `
Booking Cancelled — ${env.appName}

Dear ${user.name},

Your booking has been cancelled. Here are the details:

Reference: ${booking.reference}
Room: ${room.name} (${room.type})
Check-in: ${formatDate(booking.checkIn)}
Check-out: ${formatDate(booking.checkOut)}
Nights: ${nights.length}
Guests: ${booking.guests}
Total: ${formatPrice(booking.totalPrice)}

${refundInfoText}
View booking status online: ${bookingUrl}

Warm regards,
The ${env.appName} Team
      `.trim(),
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