// `data-pf="x"` typed into the selector field instead of `[data-pf="x"]`.
const BARE_ATTRIBUTE_SELECTOR = /^[A-Za-z_][\w-]*\s*[~|^$*]?=\s*(?:"[^"]*"|'[^']*'|[^\s"'\]]+)$/;

/**
 * Selectors a stored tour step may hold, most literal first.
 *
 * Steps can carry hand typed text, so besides the stored string this tries the
 * two mistakes seen in the wild: an attribute without its brackets and an id
 * containing unescaped colons.
 */
const selectorVariants = (selector) => {
  const trimmed = selector.trim();
  const variants = [trimmed];
  if (BARE_ATTRIBUTE_SELECTOR.test(trimmed)) {
    variants.push(`[${trimmed}]`);
  }
  variants.push(trimmed.replace(/(#[^#\s]+)/g, (match) => match.replace(/:/g, '\\:')));
  return variants;
};

// Tooltips test selectors on every DOM mutation; warn about each one once.
const warnedSelectors = {};

const runFirstValid = (selector, fn) => {
  if (typeof selector !== 'string' || !selector.trim()) {
    return null;
  }

  const variants = selectorVariants(selector);
  for (let i = 0; i < variants.length; i++) {
    try {
      return { result: fn(variants[i]) };
    } catch (e) {}
  }

  if (!warnedSelectors[selector]) {
    warnedSelectors[selector] = true;
    try {
      console.warn('[Gleap] Invalid selector:', selector);
    } catch (e) {}
  }
  return null;
};

// `host >>> inner` continues inside the open shadow root of `host`. Plain CSS
// cannot cross that boundary, so web components (a Vue or Lit widget mounted in
// a shadow root) would otherwise be unreachable for tours.
export const SHADOW_SEPARATOR = '>>>';

const hasShadowPath = (selector) => typeof selector === 'string' && selector.indexOf(SHADOW_SEPARATOR) >= 0;

const queryAllIn = (selector, root) => {
  const found = runFirstValid(selector, (variant) => root.querySelectorAll(variant));
  return found ? found.result : [];
};

const queryShadowPath = (selector, root) => {
  const parts = selector.split(SHADOW_SEPARATOR);
  let roots = [root];

  for (let i = 0; i < parts.length - 1; i++) {
    const nextRoots = [];
    for (let j = 0; j < roots.length; j++) {
      const hosts = queryAllIn(parts[i], roots[j]);
      for (let k = 0; k < hosts.length; k++) {
        if (hosts[k].shadowRoot) {
          nextRoots.push(hosts[k].shadowRoot);
        }
      }
    }
    roots = nextRoots;
  }

  const matches = [];
  for (let j = 0; j < roots.length; j++) {
    const found = queryAllIn(parts[parts.length - 1], roots[j]);
    for (let k = 0; k < found.length; k++) {
      matches.push(found[k]);
    }
  }
  return matches;
};

/**
 * `document.querySelector` for stored selectors. Never throws: an invalid
 * selector resolves to `null`, like one that matches nothing.
 */
export const querySelectorSafe = (selector, root = document) => {
  if (hasShadowPath(selector)) {
    return queryShadowPath(selector, root)[0] || null;
  }
  const found = runFirstValid(selector, (variant) => root.querySelector(variant));
  return found ? found.result : null;
};

/**
 * `document.querySelectorAll` for stored selectors. Never throws.
 */
export const querySelectorAllSafe = (selector, root = document) => {
  if (hasShadowPath(selector)) {
    return queryShadowPath(selector, root);
  }
  return queryAllIn(selector, root);
};

/**
 * `element.matches` for stored selectors. Never throws.
 */
export const matchesSelectorSafe = (element, selector) => {
  if (hasShadowPath(selector)) {
    const parts = selector.split(SHADOW_SEPARATOR);
    let current = element;
    for (let i = parts.length - 1; i >= 0; i--) {
      if (!current || !matchesSelectorSafe(current, parts[i])) {
        return false;
      }
      const root = typeof current.getRootNode === 'function' ? current.getRootNode() : null;
      current = root && root.host ? root.host : null;
    }
    return true;
  }
  const found = runFirstValid(selector, (variant) => element.matches(variant));
  return found ? found.result : false;
};
