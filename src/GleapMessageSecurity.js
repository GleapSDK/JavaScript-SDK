// Message / link hardening between the host page and the Gleap frames.

// Links the SDK opens on the host page come from the widget, banners, modals,
// the chatbar and Gleap.openURL. Navigating the host page to a `javascript:`
// URL runs script in the customer's origin, so only plain web / mail / phone
// links (and relative ones) are opened by the default handler.
const SAFE_SCHEMES = ['http:', 'https:', 'mailto:', 'tel:'];

// Never handed to any handler, not even a custom Gleap.setUrlHandler one.
const SCRIPT_SCHEMES = ['javascript:', 'vbscript:', 'data:'];

// Parsed the way the browser will navigate it (tabs/newlines and leading
// spaces are stripped, so `java\tscript:` is caught too). Relative links
// resolve against a dummy https base, i.e. count as https.
const urlProtocol = (url) => {
  if (typeof url !== 'string' || !url.trim()) {
    return null;
  }
  try {
    return new URL(url, 'https://relative.invalid/').protocol.toLowerCase();
  } catch (e) {
    return null;
  }
};

/**
 * Whether the default url handler may open this link.
 * @param {*} url
 * @returns {boolean}
 */
export const isSafeNavigationUrl = (url) => {
  const protocol = urlProtocol(url);
  return !!protocol && SAFE_SCHEMES.includes(protocol);
};

/**
 * Whether a link would run script (or is not a usable link at all).
 * @param {*} url
 * @returns {boolean}
 */
export const isScriptUrl = (url) => {
  const protocol = urlProtocol(url);
  return !protocol || SCRIPT_SCHEMES.includes(protocol);
};

/**
 * Exact origin match against a configured URL (e.g. the banner URL). A
 * substring check also accepted look-alike origins such as
 * `https://outboundmedia.gl` for `https://outboundmedia.gleap.io`.
 * @param {string} origin event.origin
 * @param {string} url the configured URL (may include a path)
 * @returns {boolean}
 */
export const originMatchesUrl = (origin, url) => {
  if (typeof origin !== 'string' || !origin || origin === 'null' || typeof url !== 'string') {
    return false;
  }
  try {
    return new URL(url).origin === origin;
  } catch (e) {
    return false;
  }
};

/**
 * The targetOrigin for posting into a frame we bootstrapped from `url`.
 * Bootstrapped through about:blank the frame shares our origin, so messages are
 * pinned to it; a frame that fell back to loading `url` directly is pinned to
 * that URL's origin. '*' only when the frame's origin is opaque or unknown.
 * @param {HTMLIFrameElement} iframe
 * @param {string} url
 * @returns {string}
 */
export const frameTargetOrigin = (iframe, url) => {
  try {
    // Readable only while the frame is same-origin (the about:blank bootstrap).
    // window.origin is the document's (inherited) origin; location.origin of a
    // fresh about:blank frame is "null" until the bootstrap writes it.
    const frameWindow = iframe.contentWindow;
    const origin = frameWindow.origin || frameWindow.location.origin;
    return origin && origin !== 'null' ? origin : '*';
  } catch (e) {
    // Cross-origin: the src fallback.
  }
  try {
    const origin = new URL(url).origin;
    return origin && origin !== 'null' ? origin : '*';
  } catch (e) {
    return '*';
  }
};
