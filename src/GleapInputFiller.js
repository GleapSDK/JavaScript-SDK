// Input types that hold typed text. Everything else (checkbox, radio, file,
// range, buttons, ...) is skipped: typing into those cannot help and firing
// events on them could toggle app state.
const TEXT_INPUT_TYPES = [
  'text',
  'email',
  'password',
  'search',
  'tel',
  'url',
  'number',
  'date',
  'datetime-local',
  'month',
  'week',
  'time',
];

const FILLABLE_SELECTOR = `${TEXT_INPUT_TYPES.map((type) => `input[type="${type}" i]`).join(
  ', '
)}, input:not([type]), textarea, [contenteditable]`;

const isContentEditable = (element) =>
  element.isContentEditable === true ||
  (typeof element.getAttribute === 'function' && element.getAttribute('contenteditable') !== null);

const isFillable = (element) => {
  if (!element || !element.tagName) {
    return false;
  }

  const tag = element.tagName.toLowerCase();
  if (tag === 'input') {
    return TEXT_INPUT_TYPES.indexOf((element.getAttribute('type') || 'text').toLowerCase()) >= 0;
  }
  if (tag === 'textarea') {
    return true;
  }

  return isContentEditable(element);
};

/**
 * Finds the element that can actually hold text.
 *
 * The element picker frequently lands on a wrapper (`.v-field`, a styled div,
 * a label) instead of the input itself, so the first fillable descendant is
 * used in that case.
 *
 * @param { Element } element the element referenced by the tour step
 * @return { Element | null }
 */
export const resolveInputTarget = (element) => {
  if (!element) {
    return null;
  }

  if (isFillable(element)) {
    return element;
  }

  const nested = typeof element.querySelector === 'function' ? element.querySelector(FILLABLE_SELECTOR) : null;
  return nested && isFillable(nested) ? nested : null;
};

/**
 * Returns the prototype value setter for an element, if it has one.
 *
 * Frameworks such as React replace `value` on the instance to track changes.
 * Assigning `element.value` then writes into their tracker instead of the DOM,
 * so the native setter is used.
 */
const getNativeValueSetter = (element) => {
  if (typeof window === 'undefined') {
    return null;
  }

  const prototype =
    window.HTMLTextAreaElement && element instanceof window.HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement && element instanceof window.HTMLInputElement
        ? window.HTMLInputElement.prototype
        : null;

  if (!prototype) {
    return null;
  }

  return Object.getOwnPropertyDescriptor(prototype, 'value')?.set ?? null;
};

const dispatch = (element, type) => {
  try {
    element.dispatchEvent(new Event(type, { bubbles: true }));
  } catch (e) {}
};

/**
 * Writes a value into an element the same way a keystroke would, so that
 * frameworks listening for `input` pick the change up.
 *
 * @param { Element } element a resolved input, textarea or contenteditable
 * @param { String } value the full value the element should hold
 */
export const setInputValue = (element, value) => {
  if (!element) {
    return;
  }

  const tag = (element.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea') {
    const nativeSetter = getNativeValueSetter(element);
    if (nativeSetter) {
      nativeSetter.call(element, value);
    } else {
      element.value = value;
    }
  } else {
    element.textContent = value;
  }

  dispatch(element, 'input');
};

/**
 * Types a value into an element character by character.
 *
 * `onDone` is always called, also when the element cannot hold text, so a tour
 * never stalls on a step that picked the wrong node.
 *
 * @param { Element } element the element referenced by the tour step
 * @param { String } value the text to type
 * @param { Object } options `charDelay` in ms and an `onDone` callback
 */
export const typeIntoElement = (element, value, options = {}) => {
  const { charDelay = 100, onDone } = options;
  const target = resolveInputTarget(element);
  const text = value ?? '';

  if (!target) {
    onDone && onDone();
    return;
  }

  let index = 0;
  const finish = () => {
    dispatch(target, 'change');
    onDone && onDone();
  };

  const typeCharacter = () => {
    // Runs inside a timeout, so an exception here would strand the tour on this
    // step forever. Give up on the typing instead and let the tour move on.
    try {
      if (index < text.length) {
        index++;
        setInputValue(target, text.slice(0, index));
        setTimeout(typeCharacter, charDelay);
      } else {
        finish();
      }
    } catch (e) {
      finish();
    }
  };

  typeCharacter();
};
