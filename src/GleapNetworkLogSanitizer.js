// Redaction for network log entries, applied when the log array is built (report, messenger
// collect-ticket-data), so a remote config that arrives later still applies to buffered entries.
// Pure: never mutates its input and never throws for a malformed entry.

export const DEFAULT_NETWORK_LOG_BLACKLIST = ['gleap.io', 'gleap.ai'];
export const REDACTED_VALUE = '[REDACTED]';
export const BODY_NOT_CAPTURED = '[body not captured]';

// Credentials are masked (key kept, value replaced) whatever the project settings say.
const ALWAYS_MASKED_HEADERS = ['authorization', 'proxy-authorization', 'cookie', 'set-cookie'];

// Guards the recursive walks against pathological nesting. A body nested deeper than this is
// dropped instead of being sent unredacted.
const MAX_JSON_DEPTH = 500;

// "a=1&b=2" without a content type (a URLSearchParams body sent without an explicit header).
const FORM_BODY_PATTERN = /^[^\s=&]+=[^\s&]*(?:&[^\s=&]+=[^\s&]*)*$/;

/**
 * Keeps the non-empty strings of a list, trimmed and deduplicated (first occurrence wins).
 * @param {*} list
 * @returns {string[]}
 */
export const normalizeStringList = (list) => {
  const result = [];
  if (typeof list === 'string') {
    list = [list];
  }
  if (!Array.isArray(list)) {
    return result;
  }

  for (let i = 0; i < list.length; i++) {
    if (typeof list[i] !== 'string') {
      continue;
    }
    const value = list[i].trim();
    if (value.length > 0 && result.indexOf(value) === -1) {
      result.push(value);
    }
  }
  return result;
};

/**
 * True when the url contains any blacklist entry (substring match).
 */
export const isBlacklistedUrl = (url, blacklist) => {
  if (typeof url !== 'string' || !Array.isArray(blacklist)) {
    return false;
  }
  for (let i = 0; i < blacklist.length; i++) {
    const entry = blacklist[i];
    if (typeof entry === 'string' && entry.length > 0 && url.indexOf(entry) !== -1) {
      return true;
    }
  }
  return false;
};

const buildRules = (propsToIgnore) => {
  const props = normalizeStringList(propsToIgnore).map((prop) => prop.toLowerCase());
  const paths = [];
  for (let i = 0; i < props.length; i++) {
    if (props[i].indexOf('.') !== -1) {
      const segments = props[i].split('.');
      if (segments.every((segment) => segment.length > 0)) {
        paths.push(segments);
      }
    }
  }
  return { props, paths };
};

const hasProp = (rules, name) => typeof name === 'string' && rules.props.indexOf(name.toLowerCase()) !== -1;

const headersFromPairs = (pairs) => {
  const headers = {};
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    if (!Array.isArray(pair) || pair.length < 2) {
      return null;
    }
    const name = String(pair[0]);
    headers[name] = headers[name] !== undefined ? headers[name] + ', ' + pair[1] : pair[1];
  }
  return headers;
};

// Returns the redacted copy, or null when nothing had to change.
const redactHeaderObject = (headers, rules) => {
  const result = {};
  let changed = false;
  const names = Object.keys(headers);
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    if (hasProp(rules, name)) {
      changed = true;
      continue;
    }
    if (ALWAYS_MASKED_HEADERS.indexOf(name.toLowerCase()) !== -1 && headers[name] !== REDACTED_VALUE) {
      result[name] = REDACTED_VALUE;
      changed = true;
    } else {
      result[name] = headers[name];
    }
  }
  return changed ? result : null;
};

/**
 * Removes headers named like a prop (case-insensitive) and masks credential headers.
 * Accepts the header object the SDK records, and the JSON string / [name, value] pair list
 * shapes external (attachNetworkLogs) entries sometimes carry.
 */
export const redactHeaders = (headers, rules) => {
  if (typeof headers === 'string') {
    let parsed;
    try {
      parsed = JSON.parse(headers);
    } catch (exp) {
      return headers;
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return headers;
    }
    const redacted = redactHeaderObject(parsed, rules);
    return redacted ? JSON.stringify(redacted) : headers;
  }

  if (Array.isArray(headers)) {
    const fromPairs = headersFromPairs(headers);
    return fromPairs ? redactHeaderObject(fromPairs, rules) || fromPairs : headers;
  }

  if (!headers || typeof headers !== 'object') {
    return headers;
  }

  return redactHeaderObject(headers, rules) || Object.assign({}, headers);
};

const getHeaderValue = (headers, headerName) => {
  if (!headers || typeof headers !== 'object' || Array.isArray(headers)) {
    return '';
  }
  const names = Object.keys(headers);
  for (let i = 0; i < names.length; i++) {
    if (names[i].toLowerCase() === headerName) {
      return typeof headers[names[i]] === 'string' ? headers[names[i]] : '';
    }
  }
  return '';
};

const decodeParamName = (rawName) => {
  const name = rawName.replace(/\+/g, ' ');
  try {
    return decodeURIComponent(name);
  } catch (exp) {
    return name;
  }
};

/**
 * Removes the params named like a prop (case-insensitive) from "a=1&b=2". Kept params keep
 * their original encoding. Returns the input string when nothing was removed.
 */
export const redactParams = (query, rules) => {
  if (typeof query !== 'string' || query.length === 0 || rules.props.length === 0) {
    return query;
  }

  const parts = query.split('&');
  const kept = [];
  let changed = false;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const separator = part.indexOf('=');
    const name = decodeParamName(separator === -1 ? part : part.slice(0, separator));
    if (part.length > 0 && hasProp(rules, name)) {
      changed = true;
    } else {
      kept.push(part);
    }
  }
  return changed ? kept.join('&') : query;
};

/**
 * Removes query params named like a prop. The fragment is kept as is.
 */
export const redactUrl = (url, rules) => {
  if (typeof url !== 'string' || rules.props.length === 0) {
    return url;
  }

  const hashIndex = url.indexOf('#');
  const beforeHash = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const queryIndex = beforeHash.indexOf('?');
  if (queryIndex === -1) {
    return url;
  }

  const query = beforeHash.slice(queryIndex + 1);
  const redactedQuery = redactParams(query, rules);
  if (redactedQuery === query) {
    return url;
  }

  return (
    beforeHash.slice(0, queryIndex) +
    (redactedQuery.length > 0 ? '?' + redactedQuery : '') +
    (hashIndex === -1 ? '' : url.slice(hashIndex))
  );
};

const checkDepth = (depth) => {
  if (depth > MAX_JSON_DEPTH) {
    throw new Error('Network log body is nested too deeply to redact.');
  }
};

// Deletes every key named like a prop, at any depth (objects inside arrays too).
const removeKeysEverywhere = (node, rules, depth) => {
  checkDepth(depth);
  let changed = false;
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      if (node[i] && typeof node[i] === 'object' && removeKeysEverywhere(node[i], rules, depth + 1)) {
        changed = true;
      }
    }
    return changed;
  }

  const keys = Object.keys(node);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (hasProp(rules, key)) {
      delete node[key];
      changed = true;
    } else if (node[key] && typeof node[key] === 'object' && removeKeysEverywhere(node[key], rules, depth + 1)) {
      changed = true;
    }
  }
  return changed;
};

// Deletes the key at a dotted path from the root. Arrays on the way are walked element by
// element, so "items.token" also covers { items: [{ token }] } and a root array.
const removePath = (node, segments, index, depth) => {
  checkDepth(depth);
  let changed = false;
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      if (node[i] && typeof node[i] === 'object' && removePath(node[i], segments, index, depth + 1)) {
        changed = true;
      }
    }
    return changed;
  }

  const isLast = index === segments.length - 1;
  const keys = Object.keys(node);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (key.toLowerCase() !== segments[index]) {
      continue;
    }
    if (isLast) {
      delete node[key];
      changed = true;
    } else if (node[key] && typeof node[key] === 'object' && removePath(node[key], segments, index + 1, depth + 1)) {
      changed = true;
    }
  }
  return changed;
};

const removeJsonProps = (root, rules) => {
  let changed = removeKeysEverywhere(root, rules, 0);
  for (let i = 0; i < rules.paths.length; i++) {
    if (removePath(root, rules.paths[i], 0, 0)) {
      changed = true;
    }
  }
  return changed;
};

const isFormBody = (body, contentType) => {
  if (contentType) {
    return contentType.toLowerCase().indexOf('application/x-www-form-urlencoded') !== -1;
  }
  return FORM_BODY_PATTERN.test(body);
};

/**
 * Removes props from a request payload / response text:
 * JSON bodies at any depth (plus dotted paths from the root), form bodies by param name.
 * A body that is unchanged, or that does not parse (e.g. truncated), is returned untouched.
 */
export const redactBody = (body, contentType, rules) => {
  if (rules.props.length === 0 || body === null || body === undefined) {
    return body;
  }

  try {
    if (typeof body === 'string') {
      const firstChar = body.trim().charAt(0);
      if (firstChar === '{' || firstChar === '[') {
        let parsed;
        try {
          parsed = JSON.parse(body);
        } catch (exp) {
          parsed = undefined;
        }
        if (parsed && typeof parsed === 'object') {
          return removeJsonProps(parsed, rules) ? JSON.stringify(parsed) : body;
        }
      }

      if (isFormBody(body, contentType)) {
        return redactParams(body, rules);
      }
      return body;
    }

    if (typeof body === 'object') {
      // External entries may carry an already parsed body.
      const copy = JSON.parse(JSON.stringify(body));
      if (copy && typeof copy === 'object') {
        removeJsonProps(copy, rules);
      }
      return copy;
    }
  } catch (exp) {
    // Never send a body that could not be redacted.
    return BODY_NOT_CAPTURED;
  }

  return body;
};

/**
 * Returns a redacted copy of one network log entry.
 */
export const redactNetworkLog = (entry, rules) => {
  const result = Object.assign({}, entry);

  if (typeof result.url === 'string') {
    result.url = redactUrl(result.url, rules);
  }

  if (result.request && typeof result.request === 'object' && !Array.isArray(result.request)) {
    const request = Object.assign({}, result.request);
    // Read the content type before the headers are redacted: a prop may remove it.
    const contentType = getHeaderValue(request.headers, 'content-type');
    if (request.headers !== undefined) {
      request.headers = redactHeaders(request.headers, rules);
    }
    if (request.payload !== undefined) {
      request.payload = redactBody(request.payload, contentType, rules);
    }
    result.request = request;
  }

  if (result.response && typeof result.response === 'object' && !Array.isArray(result.response)) {
    const response = Object.assign({}, result.response);
    const contentType = getHeaderValue(response.headers, 'content-type');
    if (response.headers !== undefined) {
      response.headers = redactHeaders(response.headers, rules);
    }
    if (response.responseText !== undefined) {
      response.responseText = redactBody(response.responseText, contentType, rules);
    }
    result.response = response;
  }

  return result;
};

/**
 * Drops blacklisted entries (default gleap.io / gleap.ai plus the given blacklist) and redacts
 * the rest: headers named like a prop are removed and credential headers masked, props are
 * removed from JSON / form bodies and from URL query params. Prop names match case-insensitively.
 * @param {Array} entries network log entries
 * @param {{ propsToIgnore?: string[], blacklist?: string[] }} options
 * @returns {Array} redacted copies, in the same order
 */
export const sanitizeNetworkLogs = (entries, options) => {
  const result = [];
  if (!Array.isArray(entries)) {
    return result;
  }

  const rules = buildRules(options && options.propsToIgnore);
  const blacklist = normalizeStringList(DEFAULT_NETWORK_LOG_BLACKLIST.concat((options && options.blacklist) || []));

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      continue;
    }
    if (isBlacklistedUrl(entry.url, blacklist)) {
      continue;
    }
    try {
      result.push(redactNetworkLog(entry, rules));
    } catch (exp) {
      // Leave out an entry that cannot be redacted rather than sending it as is.
    }
  }

  return result;
};
