/**
 * Currency formatting utility using Intl.NumberFormat
 */

export function formatCurrency(amount, currency = 'INR', options = {}) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return currency === 'INR' ? '₹0' : '0';
  }
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency || 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options,
  }).format(amount);
}

export function formatINR(amount) {
  return formatCurrency(amount, 'INR');
}

export function formatINRWithDecimals(amount, currency = 'INR') {
  return formatCurrency(amount, currency, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatINRCompact(amount, currency = 'INR') {
  return formatCurrency(amount, currency, {
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}