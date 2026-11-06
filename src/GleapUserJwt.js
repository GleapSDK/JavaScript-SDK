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

/**
 * Reads `{ sid, exp }` from a grant (the server-signed session credential an
 * identify returns) without verifying it. Null for anything that is not a JWT.
 */
export const decodeGrant = (grant) => {
  if (!isUserJwt(grant)) {
    return null;
  }
  try {
    const payload = JSON.parse(decodeSegment(grant.split('.')[1]));
    if (!payload || typeof payload !== 'object') {
      return null;
    }
    return {
      sid: typeof payload.sid === 'string' ? payload.sid : null,
      iat: typeof payload.iat === 'number' ? payload.iat : null,
      exp: typeof payload.exp === 'number' ? payload.exp : null,
    };
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

// Claims that change on every mint without changing who the token names or what it says.
const VOLATILE_CLAIMS = ['iat', 'exp', 'nbf', 'jti'];

const stableStringify = (value) => {
  if (Array.isArray(value)) {
    return '[' + value.map(stableStringify).join(',') + ']';
  }
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map((key) => JSON.stringify(key) + ':' + stableStringify(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
};

/**
 * A fingerprint of what an identity token says: its `kid` and its claims
 * without iat/exp/nbf/jti. A backend that mints a fresh token per page load
 * for the same user and data gets the same fingerprint, so the identify is not
 * sent again; a changed claim (email, plan, ...) or key does change it.
 * Null for anything that is not a JWT.
 */
export const identityFingerprintOf = (token) => {
  if (!isUserJwt(token)) {
    return null;
  }
  try {
    const [header, payload] = token.split('.').slice(0, 2).map((segment) => JSON.parse(decodeSegment(segment)));
    const claims = { ...(payload && typeof payload === 'object' ? payload : {}) };
    VOLATILE_CLAIMS.forEach((claim) => delete claims[claim]);
    return fingerprintOf(stableStringify({ kid: header && header.kid !== undefined ? header.kid : null, claims }));
  } catch (exp) {
    return fingerprintOf(token);
  }
};

/** The identify refusal code in a 401 body (contract §3: token_expired, token_invalid, signature_required) or a 400 `identity_mismatch`, or null. */
export const identifyRefusalOf = (status, responseText) => {
  if (typeof responseText !== 'string') {
    return null;
  }
  if (status === 400) {
    return responseText.indexOf('identity_mismatch') !== -1 ? 'identity_mismatch' : null;
  }
  if (status !== 401) {
    return null;
  }
  if (responseText.indexOf('token_expired') !== -1) {
    return 'token_expired';
  }
  if (responseText.indexOf('token_invalid') !== -1) {
    return 'token_invalid';
  }
  if (responseText.indexOf('signature_required') !== -1) {
    return 'signature_required';
  }
  return null;
};
