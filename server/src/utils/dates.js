export function toUTCDateOnly(date) {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function dateRange(checkIn, checkOut) {
  const start = toUTCDateOnly(checkIn);
  const end = toUTCDateOnly(checkOut);
  const dates = [];
  let current = new Date(start);
  while (current < end) {
    dates.push(new Date(current));
    current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
  }
  return dates;
}

export function diffInDays(start, end) {
  const s = toUTCDateOnly(start);
  const e = toUTCDateOnly(end);
  return Math.round((e - s) / (24 * 60 * 60 * 1000));
}

export function isOverlap(aCheckIn, aCheckOut, bCheckIn, bCheckOut) {
  return aCheckIn < bCheckOut && bCheckIn < aCheckOut;
}

export function formatISO(date) {
  return toUTCDateOnly(date).toISOString();
}

export function parseISO(dateString) {
  return toUTCDateOnly(dateString);
}

export function isFutureOrToday(date) {
  const today = toUTCDateOnly(new Date());
  return toUTCDateOnly(date) >= today;
}