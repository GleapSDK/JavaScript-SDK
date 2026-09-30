// Turns console arguments (and other runtime values) into one readable log line.
// Never throws, and bounds its work: output stops growing once the budget is used up, so
// logging a huge object or string does not stringify megabytes.

const MAX_ITEMS = 100;
const MAX_ERROR_CAUSES = 3;
const BUDGET_EXCEEDED = { budgetExceeded: true };

const objectTag = (value) => {
  try {
    return Object.prototype.toString.call(value);
  } catch (exp) {
    return '[object Object]';
  }
};

// Cross-realm safe (errors thrown in iframes fail instanceof Error).
const isErrorLike = (value) => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  if (typeof Error !== 'undefined' && value instanceof Error) {
    return true;
  }
  const tag = objectTag(value);
  return (tag === '[object Error]' || tag === '[object DOMException]') && typeof value.message === 'string';
};

const isDomNode = (value) =>
  !!value && typeof value === 'object' && typeof value.nodeType === 'number' && typeof value.nodeName === 'string';

const isWindow = (value) => !!value && typeof value === 'object' && value.window === value && !!value.document;

const functionName = (fn) => {
  let name = '';
  try {
    name = fn.name;
  } catch (exp) {}
  return '[Function ' + (name ? name : '(anonymous)') + ']';
};

const describeNode = (node) => {
  if (node.nodeType === 1) {
    let description = '<' + String(node.nodeName).toLowerCase();
    if (typeof node.id === 'string' && node.id.length > 0) {
      description += '#' + node.id;
    }
    let className = '';
    if (typeof node.className === 'string') {
      className = node.className;
    } else if (typeof node.getAttribute === 'function') {
      // SVG elements expose className as an SVGAnimatedString.
      className = node.getAttribute('class') || '';
    }
    const classes = className.trim().split(/\s+/).filter(Boolean).slice(0, 5);
    for (let i = 0; i < classes.length; i++) {
      description += '.' + classes[i];
    }
    return description + '>';
  }
  if (node.nodeType === 3) {
    const text = String(node.nodeValue || '').trim();
    return '#text "' + (text.length > 40 ? text.slice(0, 40) + '…' : text) + '"';
  }
  return String(node.nodeName).toLowerCase();
};

/**
 * "Name: message" followed by the stack. Chrome's stack already starts with the message,
 * Firefox and Safari list only the frames.
 * @param {*} error
 * @returns {string}
 */
export const formatError = (error, causeDepth) => {
  try {
    let name = 'Error';
    let message = '';
    let stack = '';
    try {
      name = error.name ? String(error.name) : 'Error';
      message = error.message !== undefined && error.message !== null ? String(error.message) : '';
      stack = typeof error.stack === 'string' ? error.stack.trim() : '';
    } catch (exp) {}

    const head = message.length > 0 ? name + ': ' + message : name;
    let text = head;
    if (stack.length > 0) {
      const stackHasMessage = message.length > 0 ? stack.indexOf(message) !== -1 : stack.indexOf(name) === 0;
      text = stackHasMessage ? stack : head + '\n' + stack;
    }

    const depth = causeDepth || 0;
    let cause;
    try {
      cause = error.cause;
    } catch (exp) {}
    if (cause !== undefined && cause !== null && depth < MAX_ERROR_CAUSES) {
      text += '\nCaused by: ' + (isErrorLike(cause) ? formatError(cause, depth + 1) : formatValue(cause, 1000));
    }
    return text;
  } catch (exp) {
    return 'Error';
  }
};

const createState = (maxLength, maxDepth) => ({
  parts: [],
  length: 0,
  maxLength: maxLength,
  maxDepth: maxDepth,
  seen: [],
  truncated: false,
});

const push = (state, text) => {
  const remaining = state.maxLength - state.length;
  if (text.length > remaining) {
    state.parts.push(text.slice(0, Math.max(0, remaining)));
    state.length = state.maxLength;
    state.truncated = true;
    throw BUDGET_EXCEEDED;
  }
  state.parts.push(text);
  state.length += text.length;
};

const pushString = (state, value) => {
  // Quote only what can still fit, so a multi-megabyte string is never escaped in full.
  const remaining = state.maxLength - state.length;
  push(state, JSON.stringify(value.length > remaining ? value.slice(0, remaining) : value));
};

const readProperty = (object, key) => {
  try {
    return { value: object[key] };
  } catch (exp) {
    return { failed: true };
  }
};

const constructorName = (value) => {
  try {
    const proto = Object.getPrototypeOf(value);
    if (!proto || proto === Object.prototype) {
      return '';
    }
    const ctor = proto.constructor;
    return ctor && typeof ctor.name === 'string' && ctor.name !== 'Object' ? ctor.name : '';
  } catch (exp) {
    return '';
  }
};

const serializeEntries = (state, open, close, count, getEntry, depth) => {
  push(state, open);
  const shown = Math.min(count, MAX_ITEMS);
  for (let i = 0; i < shown; i++) {
    if (i > 0) {
      push(state, ',');
    }
    getEntry(i, depth + 1);
  }
  if (count > shown) {
    push(state, ',… ' + (count - shown) + ' more');
  }
  push(state, close);
};

const serialize = (state, value, depth) => {
  const type = typeof value;
  if (value === null) {
    push(state, 'null');
    return;
  }
  if (type === 'string') {
    pushString(state, value);
    return;
  }
  if (type === 'number' || type === 'boolean' || type === 'undefined') {
    push(state, String(value));
    return;
  }
  if (type === 'bigint') {
    push(state, value.toString() + 'n');
    return;
  }
  if (type === 'symbol') {
    push(state, value.toString());
    return;
  }
  if (type === 'function') {
    push(state, functionName(value));
    return;
  }

  if (state.seen.indexOf(value) !== -1) {
    push(state, '"[Circular]"');
    return;
  }

  if (isErrorLike(value)) {
    let name = 'Error';
    let message = '';
    try {
      name = String(value.name || 'Error');
      message = String(value.message || '');
    } catch (exp) {}
    pushString(state, message ? name + ': ' + message : name);
    return;
  }
  if (isDomNode(value)) {
    push(state, describeNode(value));
    return;
  }
  if (isWindow(value)) {
    push(state, '[Window]');
    return;
  }

  const tag = objectTag(value);
  if (tag === '[object Date]') {
    const time = value.getTime();
    pushString(state, isNaN(time) ? 'Invalid Date' : value.toISOString());
    return;
  }
  if (tag === '[object RegExp]') {
    push(state, String(value));
    return;
  }
  if (tag === '[object Promise]' || tag === '[object WeakMap]' || tag === '[object WeakSet]') {
    push(state, tag.slice(8, -1));
    return;
  }
  if (tag === '[object ArrayBuffer]' || tag === '[object SharedArrayBuffer]') {
    push(state, tag.slice(8, -1) + '(' + value.byteLength + ')');
    return;
  }
  if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView && ArrayBuffer.isView(value)) {
    push(state, tag.slice(8, -1) + '(' + (typeof value.length === 'number' ? value.length : value.byteLength) + ')');
    return;
  }

  if (depth >= state.maxDepth) {
    push(state, Array.isArray(value) ? '[Array]' : '[Object]');
    return;
  }

  state.seen.push(value);
  try {
    if (Array.isArray(value)) {
      serializeEntries(
        state,
        '[',
        ']',
        value.length,
        (i, childDepth) => {
          const item = readProperty(value, i);
          if (item.failed) {
            push(state, '"[unreadable]"');
          } else {
            serialize(state, item.value, childDepth);
          }
        },
        depth
      );
      return;
    }

    if (tag === '[object Map]') {
      const entries = [];
      value.forEach((entryValue, entryKey) => {
        if (entries.length < MAX_ITEMS) {
          entries.push([entryKey, entryValue]);
        }
      });
      serializeEntries(
        state,
        'Map(' + value.size + '){',
        '}',
        value.size,
        (i, childDepth) => {
          serialize(state, entries[i][0], childDepth);
          push(state, ' => ');
          serialize(state, entries[i][1], childDepth);
        },
        depth
      );
      return;
    }

    if (tag === '[object Set]') {
      const items = [];
      value.forEach((item) => {
        if (items.length < MAX_ITEMS) {
          items.push(item);
        }
      });
      serializeEntries(
        state,
        'Set(' + value.size + ')[',
        ']',
        value.size,
        (i, childDepth) => serialize(state, items[i], childDepth),
        depth
      );
      return;
    }

    // URL, moment, Decimal, ... describe themselves.
    if (typeof value.toJSON === 'function') {
      let json;
      try {
        json = value.toJSON();
      } catch (exp) {
        json = value;
      }
      if (json !== value) {
        serialize(state, json, depth);
        return;
      }
    }

    const keys = Object.keys(value);
    const name = constructorName(value);
    serializeEntries(
      state,
      (name ? name + ' ' : '') + '{',
      '}',
      keys.length,
      (i, childDepth) => {
        pushString(state, keys[i]);
        push(state, ':');
        const property = readProperty(value, keys[i]);
        if (property.failed) {
          push(state, '"[unreadable]"');
        } else {
          serialize(state, property.value, childDepth);
        }
      },
      depth
    );
  } finally {
    state.seen.pop();
  }
};

/**
 * Serializes a value as compact JSON-like text (valid JSON for JSON data), stopping once
 * maxLength characters are written.
 * @returns {{ text: string, truncated: boolean }}
 */
export const serializeBounded = (value, maxLength, maxDepth) => {
  const state = createState(maxLength, typeof maxDepth === 'number' ? maxDepth : Infinity);
  try {
    serialize(state, value, 0);
  } catch (exp) {
    if (exp !== BUDGET_EXCEEDED) {
      return { text: state.parts.join('') + '[unserializable]', truncated: false };
    }
  }
  return { text: state.parts.join(''), truncated: state.truncated };
};

/**
 * One console argument as text: strings as they are, errors with their stack, objects as
 * compact JSON (depth 4, circular references marked), DOM elements as <tag#id.class>.
 * @param {*} value
 * @param {number} maxLength
 * @returns {string}
 */
export const formatValue = (value, maxLength) => {
  const limit = typeof maxLength === 'number' && maxLength > 0 ? maxLength : 5000;
  try {
    if (typeof value === 'string') {
      return value.length > limit ? value.slice(0, limit) : value;
    }
    if (value === null || value === undefined || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (typeof value === 'bigint') {
      return value.toString() + 'n';
    }
    if (typeof value === 'symbol') {
      return value.toString();
    }
    if (typeof value === 'function') {
      return functionName(value);
    }
    if (isErrorLike(value)) {
      const text = formatError(value);
      return text.length > limit ? text.slice(0, limit) : text;
    }
    if (isDomNode(value)) {
      return describeNode(value);
    }
    if (objectTag(value) === '[object Date]') {
      const time = value.getTime();
      return isNaN(time) ? 'Invalid Date' : value.toISOString();
    }
    return serializeBounded(value, limit, 4).text;
  } catch (exp) {
    try {
      return objectTag(value);
    } catch (innerExp) {
      return '[unserializable]';
    }
  }
};

const toNumber = (value) => {
  try {
    if (typeof value === 'bigint') {
      return value;
    }
    if (typeof value === 'symbol') {
      return NaN;
    }
    return Number(value);
  } catch (exp) {
    return NaN;
  }
};

const formatInteger = (value) => {
  const number = toNumber(value);
  if (typeof number === 'bigint') {
    return number.toString() + 'n';
  }
  if (isNaN(number)) {
    return 'NaN';
  }
  return String(number < 0 ? Math.ceil(number) : Math.floor(number));
};

const formatFloat = (value) => {
  const number = toNumber(value);
  return typeof number === 'bigint' ? String(Number(number)) : String(number);
};

/**
 * Formats console arguments into one line, applying printf-style substitutions
 * (%s %d %i %f %o %O %j, %c drops its CSS argument) in a leading format string.
 * @param {ArrayLike<*>} args
 * @param {number} maxLength
 * @returns {string}
 */
export const formatLogArgs = (args, maxLength) => {
  const limit = typeof maxLength === 'number' && maxLength > 0 ? maxLength : 5000;
  try {
    if (!args || args.length === 0) {
      return '';
    }

    let output = '';
    let index = 0;
    const first = args[0];
    if (typeof first === 'string' && args.length > 1 && first.indexOf('%') !== -1) {
      index = 1;
      for (let i = 0; i < first.length && output.length <= limit; i++) {
        const char = first.charAt(i);
        if (char !== '%' || i === first.length - 1) {
          output += char;
          continue;
        }

        const specifier = first.charAt(i + 1);
        if (specifier === '%') {
          output += '%';
          i++;
          continue;
        }
        if ('sdifoOjc'.indexOf(specifier) === -1 || index >= args.length) {
          output += char;
          continue;
        }

        const arg = args[index++];
        i++;
        const remaining = Math.max(1, limit - output.length);
        if (specifier === 's') {
          output += formatValue(arg, remaining);
        } else if (specifier === 'd' || specifier === 'i') {
          output += formatInteger(arg);
        } else if (specifier === 'f') {
          output += formatFloat(arg);
        } else if (specifier !== 'c') {
          output += typeof arg === 'string' ? JSON.stringify(arg.slice(0, remaining)) : formatValue(arg, remaining);
        }
      }
    }

    for (; index < args.length && output.length <= limit; index++) {
      if (output.length > 0) {
        output += ' ';
      }
      output += formatValue(args[index], Math.max(1, limit - output.length));
    }

    return output.length > limit ? output.slice(0, limit) : output;
  } catch (exp) {
    return '[unserializable console arguments]';
  }
};
