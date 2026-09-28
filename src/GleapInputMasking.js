// Which form field values the SDK may send to Gleap. Screenshots (ScreenCapture.js) and session
// replays (GleapReplayRecorder.js) share this rule, so a value that is masked in one is masked in
// the other. A masked value becomes one '*' per character, the same as rrweb's own masking.
// Screenshots also use the markers below to leave out blocked elements and to mask text.

// Always masked, whatever the replay options say: password fields, and fields whose autocomplete
// token names a secret, a card number or a card security code.
const SENSITIVE_AUTOCOMPLETE_TOKENS = ['current-password', 'new-password', 'one-time-code', 'cc-number', 'cc-csc'];

// Also masked when the field, or an element around it, carries a mask marker: rrweb's rr-mask
// class (documented for the JavaScript SDK), gl-mask (the class replays used before 16.2.5,
// documented for Ionic Capacitor), or a site's own maskTextClass / maskTextSelector from
// Gleap.setReplayOptions. Screenshots also mask the text inside them.
const MASK_MARKER_SELECTOR = '.rr-mask, .gl-mask';

// Field values only: the SDK's original gleap-ignore="value" attribute.
const VALUE_MASK_MARKER_SELECTOR = '[gleap-ignore="value"]';

// Elements screenshots capture as an empty placeholder of the same size, the way replays record
// rr-block elements (gl-block is the class replays used before 16.2.5). A site's own blockClass /
// blockSelector count as well.
const BLOCK_MARKER_SELECTOR = '.rr-block, .gl-block';

// Input types whose value is a button label or a fixed value, not something the user typed. rrweb
// never masks them either; masking them would turn button labels into asterisks.
const FIXED_VALUE_INPUT_TYPES = ['checkbox', 'radio', 'submit', 'button', 'reset'];

const toKindMap = (kinds) =>
  kinds.reduce((map, kind) => {
    map[kind] = true;
    return map;
  }, {});

// The field kinds rrweb masks for maskAllInputs: true.
const ALL_FIELD_KINDS = [
  'color',
  'date',
  'datetime-local',
  'email',
  'month',
  'number',
  'range',
  'search',
  'tel',
  'text',
  'time',
  'url',
  'week',
  'textarea',
  'select',
  'password',
];
const ALL_FIELD_KINDS_MAP = toKindMap(ALL_FIELD_KINDS);

// rrweb only calls maskInputFn for the field kinds listed in maskInputOptions, so replays list
// every kind a marker or an autocomplete token can sit on and let getFieldValueMask decide. Select
// menus stay out: listing them makes rrweb drop the selected option from every snapshot, so a
// marked select is masked in screenshots but, as before, not in replays.
const REPLAY_ROUTED_KINDS = toKindMap(ALL_FIELD_KINDS.filter((kind) => kind !== 'select').concat(['hidden']));

export const maskValue = (value) => '*'.repeat(value === null || value === undefined ? 0 : String(value).length);

// rrweb marks a password field data-rr-is-password when a "show password" toggle turns it into a
// text field, and keeps masking it. Follow that marker too.
const getFieldType = (element) => {
  if (element.hasAttribute && element.hasAttribute('data-rr-is-password')) {
    return 'password';
  }
  return element.type ? String(element.type).toLowerCase() : '';
};

const isSensitiveField = (element) => {
  if (getFieldType(element) === 'password') {
    return true;
  }

  const autocomplete = element.getAttribute && element.getAttribute('autocomplete');
  if (!autocomplete) {
    return false;
  }

  return autocomplete
    .toLowerCase()
    .split(/\s+/)
    .some((token) => SENSITIVE_AUTOCOMPLETE_TOKENS.indexOf(token) >= 0);
};

const matchesSelector = (element, selector) => {
  try {
    return !!selector && element.matches(selector);
  } catch (exp) {
    return false;
  }
};

// className is a string or a RegExp, like rrweb's blockClass and maskTextClass options.
const hasClass = (element, className) => {
  if (!className || !element.classList) {
    return false;
  }

  if (typeof className === 'string') {
    return element.classList.contains(className);
  }

  if (typeof className.test === 'function') {
    for (let i = 0; i < element.classList.length; i++) {
      if (className.test(element.classList[i])) {
        return true;
      }
    }
  }

  return false;
};

// Tests the element and its ancestors, continuing from a shadow root to its host, so a marker on
// a container also covers the fields inside web components.
const someAncestor = (element, test) => {
  let current = element;
  while (current) {
    if (current.nodeType === 1 && test(current)) {
      return true;
    }
    current = current.parentElement || (current.parentNode && current.parentNode.host) || null;
  }
  return false;
};

/**
 * Whether the element itself is a mask marker (its ancestors are not tested).
 * @param {Element} element
 * @param {object} options The site's Gleap.setReplayOptions.
 */
export const isMaskMarker = (element, options) => {
  options = options || {};
  return (
    matchesSelector(element, MASK_MARKER_SELECTOR) ||
    hasClass(element, options.maskTextClass) ||
    matchesSelector(element, options.maskTextSelector)
  );
};

/**
 * Whether the element itself is blocked (its ancestors are not tested): rr-block, gl-block, or the
 * blockClass / blockSelector replay options.
 * @param {Element} element
 * @param {object} options The site's Gleap.setReplayOptions.
 */
export const isBlockedElement = (element, options) => {
  options = options || {};
  return (
    matchesSelector(element, BLOCK_MARKER_SELECTOR) ||
    hasClass(element, options.blockClass) ||
    matchesSelector(element, options.blockSelector)
  );
};

const hasMaskMarker = (element, options) =>
  someAncestor(element, (el) => isMaskMarker(el, options) || matchesSelector(el, VALUE_MASK_MARKER_SELECTOR));

// The field kinds rrweb masks for these replay options: all of them for maskAllInputs, otherwise
// the kinds in maskInputOptions, which default to password fields.
const resolveMaskInputOptions = (options) => {
  if (options.maskAllInputs === true) {
    return ALL_FIELD_KINDS_MAP;
  }
  if (options.maskInputOptions !== undefined) {
    return options.maskInputOptions || {};
  }
  return { password: true };
};

const isMaskedByOptions = (element, options) => {
  const kinds = resolveMaskInputOptions(options);
  const tagName = element.tagName ? element.tagName.toLowerCase() : '';
  return !!(kinds[tagName] || kinds[getFieldType(element)]);
};

/**
 * How a form field's value may be captured.
 * @param {Element} element An INPUT, TEXTAREA or SELECT element.
 * @param {object} options The site's Gleap.setReplayOptions.
 * @returns {null|function} null when the value can be sent as it is, otherwise a function that
 * returns what is sent in place of a value.
 */
export const getFieldValueMask = (element, options) => {
  options = options || {};

  if (!element) {
    return maskValue;
  }

  if (FIXED_VALUE_INPUT_TYPES.indexOf(getFieldType(element)) >= 0) {
    return null;
  }

  if (isSensitiveField(element) || hasMaskMarker(element, options)) {
    return maskValue;
  }

  if (!isMaskedByOptions(element, options)) {
    return null;
  }

  // A site's own maskInputFn formats the fields its options mask, as it does in replays. It never
  // decides about the fields above.
  const customMask = options.maskInputFn;
  if (typeof customMask !== 'function') {
    return maskValue;
  }
  return (value) => {
    try {
      return customMask(value, element);
    } catch (exp) {
      return maskValue(value);
    }
  };
};

// rrweb's text mask: every character but whitespace becomes '*', so words keep their length and
// lines keep their breaks.
const maskTextContent = (text) => String(text).replace(/[\S]/g, '*');

/**
 * How the text inside a mask marker is captured: the site's maskTextFn, as rrweb calls it in
 * replays, otherwise rrweb's own mask.
 * @param {object} options The site's Gleap.setReplayOptions.
 * @returns {function(string, Element): string}
 */
export const getTextMask = (options) => {
  const customMask = options && options.maskTextFn;
  if (typeof customMask !== 'function') {
    return maskTextContent;
  }
  return (text, element) => {
    try {
      const masked = customMask(text, element);
      return typeof masked === 'string' ? masked : maskTextContent(text);
    } catch (exp) {
      return maskTextContent(text);
    }
  };
};

/**
 * The rrweb record options that apply getFieldValueMask to replays.
 * @param {object} options The site's Gleap.setReplayOptions.
 */
export const getReplayMaskingOptions = (options) => {
  options = options || {};

  const maskInputFn = (text, element) => {
    const mask = getFieldValueMask(element, options);
    return mask ? mask(text) : text;
  };

  // With maskAllInputs rrweb sends every field kind through maskInputFn already.
  if (options.maskAllInputs === true) {
    return { maskInputFn };
  }

  return {
    maskInputFn,
    maskInputOptions: {
      ...resolveMaskInputOptions(options),
      ...REPLAY_ROUTED_KINDS,
    },
  };
};
