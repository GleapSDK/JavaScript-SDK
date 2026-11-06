// "Show me" (Kai's show_me chat card): the Messenger opens a page of the app with
// `?gleap_highlight=<label>`. On that page the SDK finds the button or field with that visible label,
// scrolls to it and outlines it for a few seconds. The label comes from an AI answer, so the match
// is by text (exact first, then the closest label sharing most of its words), never a selector.
// Kept free of SDK imports: Gleap.checkForUrlParams calls it, the tests drive it with a plain DOM.

export const HIGHLIGHT_PARAM = 'gleap_highlight';

const OVERLAY_ID = 'gleap-highlight-overlay';
const STYLE_ID = 'gleap-highlight-styles';
const DEFAULT_COLOR = '#485BFF';
// The page may still be rendering (SPA): look again until it shows up.
const FIND_TIMEOUT_MS = 10000;
const FIND_INTERVAL_MS = 300;
const SHOW_MS = 6000;
// Labels are short; a longer text is a paragraph or a container, not the thing to press.
const MAX_LABEL_LENGTH = 160;
const MAX_TARGET_LENGTH = 120;
// Climb at most this far from a text node: "Save as <b>draft</b>" splits one label over two nodes.
const MAX_CLIMB = 3;

const STOPWORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in', 'into', 'of', 'on', 'or', 'the', 'to', 'with', 'your', 'my',
]);

const INTERACTIVE_SELECTOR =
  'button, a[href], input, select, textarea, label, summary, [role="button"], [role="link"], [role="switch"], [role="checkbox"], [role="radio"], [role="tab"], [role="menuitem"], [role="option"], [contenteditable="true"]';

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'SVG', 'HEAD', 'TITLE', 'META', 'IFRAME']);

export const normalizeLabel = (value) =>
  `${value ?? ''}`
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

const wordsOf = (normalized) => normalized.split(' ').filter((word) => word && !STOPWORDS.has(word));

/**
 * How well a label matches the target, 0 (no match) to 100 (the same text). Exact beats "the label
 * contains the target as whole words" beats "most of the words are the same" (an AI may write
 * "Post as draft" for a toggle labelled "Save as draft").
 */
export const scoreLabel = (label, target) => {
  const a = normalizeLabel(label);
  const b = normalizeLabel(target);
  if (!a || !b || a.length > MAX_LABEL_LENGTH) return 0;
  if (a === b) return 100;
  if (` ${a} `.includes(` ${b} `)) {
    // The shorter the rest of the label, the closer.
    return 60 + Math.round(30 * (b.length / a.length));
  }
  const targetWords = wordsOf(b);
  const labelWords = wordsOf(a);
  if (targetWords.length === 0 || labelWords.length === 0) return 0;
  const labelSet = new Set(labelWords);
  const shared = targetWords.filter((word) => labelSet.has(word)).length;
  // Most of the target and most of the label: one shared word in a long sentence is no match.
  const ofTarget = shared / targetWords.length;
  const ofLabel = shared / labelWords.length;
  if (shared === 0 || ofTarget < 0.5 || ofLabel < 0.5) return 0;
  return Math.round(50 * Math.min(ofTarget, ofLabel));
};

const isGleapElement = (element) => {
  try {
    return !!element.closest('.gleap-frame-container, .bb-feedback-button, [id^="gleap"], [class^="gleap"], #copilot-pointer-container');
  } catch (exp) {
    return false;
  }
};

const defaultIsVisible = (element) => {
  try {
    if (!element.getClientRects || element.getClientRects().length === 0) return false;
    const style = window.getComputedStyle(element);
    return style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0';
  } catch (exp) {
    return false;
  }
};

/** The texts an element is known by: its own text, and the accessible names a screen reader would read. */
const labelsOf = (element) => {
  const labels = [];
  ['aria-label', 'title', 'placeholder', 'alt'].forEach((attribute) => {
    const value = element.getAttribute && element.getAttribute(attribute);
    if (value) labels.push(value);
  });
  if (element.tagName === 'INPUT' && ['button', 'submit', 'reset'].includes(`${element.type}`.toLowerCase()) && element.value) {
    labels.push(element.value);
  }
  const text = element.textContent;
  if (text && text.length <= MAX_LABEL_LENGTH * 2) labels.push(text);
  return labels;
};

/** The control a label names (a toggle next to "Save as draft"), else the element itself. */
const controlOf = (element) => {
  try {
    if (element.tagName === 'LABEL' && element.control) return element;
    const label = element.closest('label');
    if (label) return label;
  } catch (exp) {}
  return element;
};

/**
 * The visible element on the page whose label matches `target` best, or null. Candidates are the
 * elements that hold matching text (and up to MAX_CLIMB parents, while they stay label-sized) plus
 * the elements named by an attribute; ties go to the interactive one, then the smaller one.
 */
export const findHighlightTarget = (target, { root, isVisible = defaultIsVisible } = {}) => {
  const doc = root || (typeof document !== 'undefined' ? document : null);
  if (!doc || !normalizeLabel(target)) return null;
  const body = doc.body || doc;

  const candidates = new Set();
  try {
    const walker = (doc.ownerDocument || doc).createTreeWalker(body, 4 /* NodeFilter.SHOW_TEXT */);
    let node = walker.nextNode();
    while (node) {
      if (node.nodeValue && node.nodeValue.trim()) {
        let element = node.parentElement;
        for (let depth = 0; element && depth < MAX_CLIMB; depth += 1) {
          if (element === body || SKIP_TAGS.has(element.tagName.toUpperCase())) break;
          if ((element.textContent || '').length > MAX_LABEL_LENGTH * 2) break;
          candidates.add(element);
          element = element.parentElement;
        }
      }
      node = walker.nextNode();
    }
    body.querySelectorAll('[aria-label], [title], [placeholder], input[type="button"], input[type="submit"], img[alt]').forEach((element) =>
      candidates.add(element)
    );
  } catch (exp) {
    return null;
  }

  let best = null;
  candidates.forEach((element) => {
    if (isGleapElement(element)) return;
    const score = Math.max(0, ...labelsOf(element).map((label) => scoreLabel(label, target)));
    if (score === 0) return;
    let interactive = false;
    try {
      interactive = element.matches(INTERACTIVE_SELECTOR) || !!element.closest(INTERACTIVE_SELECTOR);
    } catch (exp) {}
    const size = (element.textContent || '').length;
    const better =
      !best ||
      score > best.score ||
      (score === best.score && interactive && !best.interactive) ||
      (score === best.score && interactive === best.interactive && size < best.size);
    if (better && isVisible(element)) {
      best = { element, score, interactive, size };
    }
  });
  return best ? controlOf(best.element) : null;
};

/** The label to highlight from a URL's query string, or null. */
export const readHighlightParam = (search) => {
  try {
    const value = new URLSearchParams(search || '').get(HIGHLIGHT_PARAM);
    const label = `${value ?? ''}`.trim();
    return label ? label.slice(0, MAX_TARGET_LENGTH) : null;
  } catch (exp) {
    return null;
  }
};

/** Takes the parameter out of the address bar (a reload must not highlight again). Keeps the router's state. */
export const stripHighlightParam = () => {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(HIGHLIGHT_PARAM)) return;
    url.searchParams.delete(HIGHLIGHT_PARAM);
    window.history.replaceState(window.history.state, '', url.toString());
  } catch (exp) {}
};

const injectStyles = (color) => {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
#${OVERLAY_ID} {
  position: fixed;
  pointer-events: none;
  z-index: 2147483600;
  border: 3px solid ${color};
  border-radius: 10px;
  box-shadow: 0 0 0 4px ${color}33, 0 0 24px ${color}66;
  transition: opacity 0.3s ease;
  animation: gleap-highlight-pulse 1.2s ease-in-out 3;
}
@keyframes gleap-highlight-pulse {
  0%, 100% { box-shadow: 0 0 0 4px ${color}33, 0 0 24px ${color}66; }
  50% { box-shadow: 0 0 0 10px ${color}22, 0 0 32px ${color}88; }
}
@media (prefers-reduced-motion: reduce) {
  #${OVERLAY_ID} { animation: none; }
}`;
  document.head.appendChild(style);
};

let activeCleanup = null;

/** Removes the outline (the next highlight, a click, a key, or the timer). */
export const clearHighlight = () => {
  if (activeCleanup) {
    const cleanup = activeCleanup;
    activeCleanup = null;
    cleanup();
  }
};

/** Scrolls to the element and outlines it for a few seconds. The outline follows scrolling and resizing. */
export const showHighlight = (element, { color } = {}) => {
  if (!element || typeof document === 'undefined') return;
  clearHighlight();
  const hex = /^#[0-9a-f]{6}$/i.test(color || '') ? color : DEFAULT_COLOR;
  injectStyles(hex);

  try {
    element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  } catch (exp) {}
  // A smooth scroll can be cut short (the app scrolls itself, the tab is in the background): jump there.
  const scrollCheck = window.setTimeout(() => {
    try {
      const rect = element.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) element.scrollIntoView({ block: 'center', inline: 'nearest' });
    } catch (exp) {}
  }, 800);

  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.setAttribute('aria-hidden', 'true');
  document.body.appendChild(overlay);

  let frame = null;
  const place = () => {
    const rect = element.getBoundingClientRect();
    const pad = 6;
    overlay.style.top = `${rect.top - pad}px`;
    overlay.style.left = `${rect.left - pad}px`;
    overlay.style.width = `${rect.width + pad * 2}px`;
    overlay.style.height = `${rect.height + pad * 2}px`;
    overlay.style.opacity = element.isConnected ? '1' : '0';
  };
  const follow = () => {
    place();
    frame = window.requestAnimationFrame(follow);
  };
  follow();
  // Scroll and resize too: requestAnimationFrame pauses while the tab is in the background.
  window.addEventListener('scroll', place, true);
  window.addEventListener('resize', place);

  const dismiss = () => clearHighlight();
  const timer = window.setTimeout(() => {
    overlay.style.opacity = '0';
    window.setTimeout(dismiss, 300);
  }, SHOW_MS);
  // The click that follows the highlight is usually on the element itself: let it through, then fade.
  window.addEventListener('pointerdown', dismiss, true);
  window.addEventListener('keydown', dismiss, true);

  activeCleanup = () => {
    window.clearTimeout(timer);
    window.clearTimeout(scrollCheck);
    if (frame) window.cancelAnimationFrame(frame);
    window.removeEventListener('scroll', place, true);
    window.removeEventListener('resize', place);
    window.removeEventListener('pointerdown', dismiss, true);
    window.removeEventListener('keydown', dismiss, true);
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  };
};

let pendingSearch = null;

/**
 * Highlights the element labelled `label` once it is on the page: looks every FIND_INTERVAL_MS
 * for up to FIND_TIMEOUT_MS, then gives up silently (the page is open; nothing else to do).
 */
export const highlightWhenReady = (label, { color, timeoutMs = FIND_TIMEOUT_MS, intervalMs = FIND_INTERVAL_MS, isVisible } = {}) => {
  if (pendingSearch) pendingSearch();
  const started = Date.now();
  let timer = null;
  let stopped = false;
  const stop = () => {
    stopped = true;
    if (timer) window.clearTimeout(timer);
    pendingSearch = null;
  };
  pendingSearch = stop;
  const attempt = () => {
    if (stopped) return;
    const element = findHighlightTarget(label, { isVisible });
    if (element) {
      stop();
      showHighlight(element, { color });
      return;
    }
    if (Date.now() - started >= timeoutMs) {
      stop();
      return;
    }
    timer = window.setTimeout(attempt, intervalMs);
  };
  attempt();
};

/** Gleap.checkForUrlParams: the page was opened from a "Show me" card. */
export const checkForHighlightParam = ({ color } = {}) => {
  if (typeof window === 'undefined') return false;
  const label = readHighlightParam(window.location.search);
  if (!label) return false;
  stripHighlightParam();
  highlightWhenReady(label, { color });
  return true;
};
