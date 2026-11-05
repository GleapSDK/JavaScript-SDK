// Identity tokens (Gleap.setUserJwt): HS256 JWTs signed by the app's backend.
// The SDK only reads the payload; the server checks the signature.

export const MAX_USER_JWT_LENGTH = 4096;

const SEGMENT = /^[A-Za-z0-9_-]+$/;

const decodeSegment = (segment) => {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  // UTF-8 bytes to a JS string (names with umlauts, emoji, ...).
  return decodeURIComponent(
    binary
      .split('')
      .map((char) => '%' + ('0' + char.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
};

/** True for a string shaped like a JWT (three non-empty base64url segments, at most 4096 chars). */
export const isUserJwt = (token) => {
  if (typeof token !== 'string' || token.length > MAX_USER_JWT_LENGTH) {
    return false;
  }
  const segments = token.split('.');
  return segments.length === 3 && segments.every((segment) => SEGMENT.test(segment));
};

/**
 * Reads `{ userId, exp }` from a JWT's payload without verifying it.
 * `userId` (or `user_id`) must be a non-empty string or a finite number; it comes back as a string.
 * Returns null for anything else.
 */
export const decodeUserJwt = (token) => {
  if (!isUserJwt(token)) {
    return null;
  }
  try {
    const payload = JSON.parse(decodeSegment(token.split('.')[1]));
    if (!payload || typeof payload !== 'object') {
      return null;
    }
    const userId = payload.userId ?? payload.user_id;
    const validUserId = (typeof userId === 'string' && userId.length > 0) || (typeof userId === 'number' && isFinite(userId));
    if (!validUserId) {
      return null;
    }
    return { userId: String(userId), exp: typeof payload.exp === 'number' ? payload.exp : null };
  } catch (exp) {
    return null;
  }
};

/** A short non-reversible fingerprint (djb2), so "this token was sent" can be remembered without storing it. */
export const fingerprintOf = (value) => {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash + value.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
};

/** The identify refusal code in a 401 body (contract §3), or null. */
export const identifyRefusalOf = (status, responseText) => {
  if (status !== 401 || typeof responseText !== 'string') {
    return null;
  }
  if (responseText.indexOf('token_expired') !== -1) {
    return 'token_expired';
  }
  if (responseText.indexOf('token_invalid') !== -1) {
    return 'token_invalid';
  }
  return null;
};
