export const TOKEN_STORAGE_KEY = 'cozystays_token';
const LEGACY_STORAGE_KEYS = ['token', 'hotel_booking_token', 'stayhub_token'];

export function getStoredToken() {
  try {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) return token;

    // Check and silently migrate legacy keys
    for (const legacyKey of LEGACY_STORAGE_KEYS) {
      const legacyToken = localStorage.getItem(legacyKey);
      if (legacyToken) {
        localStorage.setItem(TOKEN_STORAGE_KEY, legacyToken);
        localStorage.removeItem(legacyKey);
        return legacyToken;
      }
    }
  } catch {
    // localStorage might not be available or throw in certain sandboxes
  }
  return null;
}

export function setStoredToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      for (const legacyKey of LEGACY_STORAGE_KEYS) {
        localStorage.removeItem(legacyKey);
      }
    } else {
      removeStoredToken();
    }
  } catch {
    // ignore
  }
}

export function removeStoredToken() {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    for (const legacyKey of LEGACY_STORAGE_KEYS) {
      localStorage.removeItem(legacyKey);
    }
  } catch {
    // ignore
  }
}
