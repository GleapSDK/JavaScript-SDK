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

/**
 * `document.querySelector` for stored selectors. Never throws: an invalid
 * selector resolves to `null`, like one that matches nothing.
 */
export const querySelectorSafe = (selector, root = document) => {
  const found = runFirstValid(selector, (variant) => root.querySelector(variant));
  return found ? found.result : null;
};

/**
 * `document.querySelectorAll` for stored selectors. Never throws.
 */
export const querySelectorAllSafe = (selector, root = document) => {
  const found = runFirstValid(selector, (variant) => root.querySelectorAll(variant));
  return found ? found.result : [];
};

/**
 * `element.matches` for stored selectors. Never throws.
 */
export const matchesSelectorSafe = (element, selector) => {
  const found = runFirstValid(selector, (variant) => element.matches(variant));
  return found ? found.result : false;
};
