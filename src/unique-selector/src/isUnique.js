/**
 * Checks if the selector is unique
 * @param  { Object } element
 * @param  { String } selector
 * @return { Array }
 */
export function isUnique(el, selector) {
  if (!Boolean(selector)) return false;
  // The element's own tree: its shadow root when it lives in one.
  const root = typeof el.getRootNode === 'function' ? el.getRootNode() : el.ownerDocument;
  const elems = (root && root.querySelectorAll ? root : el.ownerDocument).querySelectorAll(selector);
  return elems.length === 1 && elems[0] === el;
}
