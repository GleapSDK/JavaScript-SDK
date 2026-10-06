/**
 * Dashboard origins that may drive the product tour / tooltip builder (admin mode).
 *
 * The dashboard moved from app.gleap.io to app.gleap.ai; both serve the same app.
 * Exact string match only: never a suffix or wildcard check, which `evilgleap.ai`
 * or `app.gleap.ai.evil.com` could pass.
 */
export const GLEAP_ADMIN_ORIGINS = Object.freeze(['https://app.gleap.ai', 'https://app.gleap.io']);

export const GLEAP_DEFAULT_ADMIN_ORIGIN = 'https://app.gleap.ai';

/**
 * @param {*} origin - a MessageEvent origin.
 * @returns {boolean} true only for an exact allowlisted dashboard origin.
 */
export const isGleapAdminOrigin = (origin) => typeof origin === 'string' && GLEAP_ADMIN_ORIGINS.indexOf(origin) !== -1;

/**
 * The origin the builder iframe is loaded from: the dashboard origin that opened the
 * admin session, falling back to the default dashboard.
 * @param {*} origin - the origin of the validated opener message.
 * @returns {string}
 */
export const resolveGleapAdminOrigin = (origin) => (isGleapAdminOrigin(origin) ? origin : GLEAP_DEFAULT_ADMIN_ORIGIN);
