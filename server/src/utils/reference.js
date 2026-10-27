const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function generateReference() {
  let ref = 'HB-';
  for (let i = 0; i < 6; i++) {
    ref += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return ref;
}