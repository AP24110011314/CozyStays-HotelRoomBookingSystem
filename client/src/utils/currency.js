/**
 * Currency formatting utility for Indian Rupees (INR)
 */

export function formatINR(amountInPaise) {
  if (amountInPaise === null || amountInPaise === undefined) return '₹0';
  const rupees = amountInPaise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rupees);
}

export function formatINRWithDecimals(amountInPaise) {
  if (amountInPaise === null || amountInPaise === undefined) return '₹0.00';
  const rupees = amountInPaise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

export function formatINRCompact(amountInPaise) {
  if (amountInPaise === null || amountInPaise === undefined) return '₹0';
  const rupees = amountInPaise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(rupees);
}