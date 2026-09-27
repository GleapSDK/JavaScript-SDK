import { serializeBounded } from './GleapLogFormatter';
import {
  BODY_NOT_CAPTURED,
  DEFAULT_NETWORK_LOG_BLACKLIST,
  isBlacklistedUrl,
  normalizeStringList,
  sanitizeNetworkLogs,
} from './GleapNetworkLogSanitizer';

export const MAX_BODY_SIZE = 150000;
export const BODY_PENDING = '[body pending]';
export const BINARY_BODY_OMITTED = '[binary body omitted]';
export const STREAMING_BODY_OMITTED = '[streaming body omitted]';

// Checked before the text types: text/event-stream contains "text/", stream+json contains "json".
const STREAMING_CONTENT_TYPES = [
  'text/event-stream',
  'application/x-ndjson',
  'application/stream+json',
  'multipart/x-mixed-replace',
  'grpc',
];
const TEXT_CONTENT_TYPES = ['json', 'xml', 'text/', 'javascript', 'x-www-form-urlencoded', 'graphql'];

// Exact byte counts of truncated strings are only computed up to this length.
const MAX_COUNTED_LENGTH = 1000000;
// FormData text fields are shortened so the summary stays parseable (and redactable) JSON.
const MAX_FORM_FIELD_LENGTH = 10000;

/**
 * "stream", "text", "binary", or "unknown" when there is no content type.
 * @param {string} contentType
 */
export const classifyContentType = (contentType) => {
  if (typeof contentType !== 'string' || contentType.trim().length === 0) {
    return 'unknown';
  }
  const value = contentType.toLowerCase();
  for (let i = 0; i < STREAMING_CONTENT_TYPES.length; i++) {
    if (value.indexOf(STREAMING_CONTENT_TYPES[i]) !== -1) {
      return 'stream';
    }
  }
  for (let i = 0; i < TEXT_CONTENT_TYPES.length; i++) {
    if (value.indexOf(TEXT_CONTENT_TYPES[i]) !== -1) {
      return 'text';
    }
  }
  return 'binary';
};

const now = () => {
  try {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      return performance.now();
    }
  } catch (exp) {}
  return Date.now();
};

const elapsedSince = (start) => Math.max(0, Math.round(now() - start));

const truncationMarker = (totalBytes) =>
  '\n… [truncated, ' + (typeof totalBytes === 'number' ? totalBytes : 'more than ' + MAX_BODY_SIZE) + ' bytes]';

const utf8Length = (text) => {
  let bytes = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 0x80) {
      bytes += 1;
    } else if (code < 0x800) {
      bytes += 2;
    } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4;
        i++;
      } else {
        bytes += 3;
      }
    } else {
      bytes += 3;
    }
  }
  return bytes;
};

/**
 * Keeps the first 150 000 characters of a text body and marks the cut.
 * @param {string} text
 */
export const capText = (text) => {
  if (typeof text !== 'string') {
    return '';
  }
  if (text.length <= MAX_BODY_SIZE) {
    return text;
  }
  let end = MAX_BODY_SIZE;
  const lastCode = text.charCodeAt(end - 1);
  if (lastCode >= 0xd800 && lastCode <= 0xdbff) {
    // Do not split a surrogate pair.
    end -= 1;
  }
  return text.slice(0, end) + truncationMarker(text.length <= MAX_COUNTED_LENGTH ? utf8Length(text) : undefined);
};

const findHeaderName = (headers, name) => {
  const lowerName = name.toLowerCase();
  const names = Object.keys(headers);
  for (let i = 0; i < names.length; i++) {
    if (names[i].toLowerCase() === lowerName) {
      return names[i];
    }
  }
  return undefined;
};

// Repeated headers (any casing) are joined with ", ", as they are sent.
const appendHeader = (headers, name, value) => {
  const existingName = findHeaderName(headers, name);
  if (existingName !== undefined) {
    headers[existingName] = headers[existingName] + ', ' + value;
  } else {
    headers[name] = value;
  }
};

const getHeader = (headers, name) => {
  const existingName = headers ? findHeaderName(headers, name) : undefined;
  return existingName !== undefined ? headers[existingName] : '';
};

/**
 * Headers instance, [name, value] pairs or a plain object -> { name: "value" }.
 */
export const normalizeHeaders = (input) => {
  const headers = {};
  if (!input || typeof input !== 'object') {
    return headers;
  }
  try {
    if (typeof input.forEach === 'function' && typeof input.get === 'function') {
      input.forEach((value, name) => {
        appendHeader(headers, String(name), String(value));
      });
    } else if (Array.isArray(input)) {
      for (let i = 0; i < input.length; i++) {
        if (input[i] && input[i].length >= 2) {
          appendHeader(headers, String(input[i][0]), String(input[i][1]));
        }
      }
    } else {
      const names = Object.keys(input);
      for (let i = 0; i < names.length; i++) {
        appendHeader(headers, names[i], String(input[names[i]]));
      }
    }
  } catch (exp) {}
  return headers;
};

const parseXhrHeaders = (raw) => {
  const headers = {};
  if (typeof raw !== 'string') {
    return headers;
  }
  const lines = raw.trim().split(/[\r\n]+/);
  for (let i = 0; i < lines.length; i++) {
    const separator = lines[i].indexOf(':');
    if (separator > 0) {
      appendHeader(headers, lines[i].slice(0, separator).trim(), lines[i].slice(separator + 1).trim());
    }
  }
  return headers;
};

/**
 * Resolves a relative request url against the document, as fetch and XHR do.
 */
export const resolveUrl = (url) => {
  const value = String(url);
  try {
    const base =
      typeof document !== 'undefined' && document.baseURI
        ? document.baseURI
        : typeof window !== 'undefined' && window.location
          ? window.location.href
          : undefined;
    return new URL(value, base).href;
  } catch (exp) {
    return value;
  }
};

const createDecoder = (contentType) => {
  const match = /charset\s*=\s*"?([^";\s]+)/i.exec(contentType || '');
  if (match) {
    try {
      return new TextDecoder(match[1]);
    } catch (exp) {}
  }
  return new TextDecoder('utf-8');
};

/**
 * Decodes the head of a body. Without a content type the bytes must be valid UTF-8 text,
 * anything else counts as binary.
 * @param {Uint8Array} bytes
 * @param {string} contentType
 * @param {boolean} requireUtf8
 * @param {number} [totalBytes] full size when known, for the truncation marker
 */
const decodeBytes = (bytes, contentType, requireUtf8, totalBytes) => {
  const truncated = bytes.byteLength > MAX_BODY_SIZE || (typeof totalBytes === 'number' && totalBytes > MAX_BODY_SIZE);
  const head = bytes.byteLength > MAX_BODY_SIZE ? bytes.subarray(0, MAX_BODY_SIZE) : bytes;
  let text;
  try {
    // stream: true leaves out a multi-byte character cut at the end of a truncated head.
    if (requireUtf8) {
      text = new TextDecoder('utf-8', { fatal: true }).decode(head, { stream: truncated });
      if (text.indexOf('\u0000') !== -1) {
        return BINARY_BODY_OMITTED;
      }
    } else {
      text = createDecoder(contentType).decode(head, { stream: truncated });
    }
  } catch (exp) {
    return requireUtf8 ? BINARY_BODY_OMITTED : BODY_NOT_CAPTURED;
  }
  if (!truncated) {
    return text;
  }
  return text + truncationMarker(typeof totalBytes === 'number' ? totalBytes : undefined);
};

/**
 * Reads at most ~150 KB of a stream (a tee'd clone), then cancels it. Never buffers an
 * unbounded body.
 * @returns {Promise<string>}
 */
const readStreamHead = (stream, contentType, requireUtf8) => {
  const reader = stream.getReader();
  const chunks = [];
  let received = 0;

  const finish = (complete) => {
    const bytes = new Uint8Array(received);
    let offset = 0;
    for (let i = 0; i < chunks.length; i++) {
      bytes.set(chunks[i], offset);
      offset += chunks[i].byteLength;
    }
    return decodeBytes(bytes, contentType, requireUtf8, complete ? received : undefined);
  };

  const pump = () =>
    reader.read().then((result) => {
      if (result.done) {
        return finish(true);
      }
      const chunk = result.value;
      if (chunk && chunk.byteLength > 0) {
        chunks.push(chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk));
        received += chunk.byteLength;
      }
      if (received > MAX_BODY_SIZE) {
        try {
          reader.cancel().catch(() => {});
        } catch (exp) {}
        return finish(false);
      }
      return pump();
    });

  return pump();
};

const readBlobHead = (blob, contentType, requireUtf8) => {
  const head = blob.size > MAX_BODY_SIZE ? blob.slice(0, MAX_BODY_SIZE + 1) : blob;
  let reading;
  if (typeof head.arrayBuffer === 'function') {
    reading = head.arrayBuffer();
  } else {
    reading = new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(head);
    });
  }
  return reading.then((buffer) => decodeBytes(new Uint8Array(buffer), contentType, requireUtf8, blob.size));
};

const summarizeFormData = (formData) => {
  const summary = {};
  formData.forEach((value, name) => {
    let text;
    if (typeof value === 'string') {
      text = value.length > MAX_FORM_FIELD_LENGTH ? value.slice(0, MAX_FORM_FIELD_LENGTH) + '… [truncated]' : value;
    } else {
      text =
        '[file ' +
        (value && value.name ? value.name : 'blob') +
        ', ' +
        (value && typeof value.size === 'number' ? value.size : 0) +
        ' bytes' +
        (value && value.type ? ', ' + value.type : '') +
        ']';
    }
    if (Object.prototype.hasOwnProperty.call(summary, name)) {
      summary[name] = [].concat(summary[name], text);
    } else {
      Object.defineProperty(summary, name, { value: text, enumerable: true, writable: true, configurable: true });
    }
  });
  return capText(JSON.stringify(summary));
};

const objectTag = (value) => Object.prototype.toString.call(value);

/**
 * A request body as loggable text: { text } or, when it has to be read first,
 * { text: "[body pending]", promise }.
 */
export const describeRequestBody = (body, contentType) => {
  if (body === undefined || body === null) {
    return { text: '' };
  }

  try {
    const kind = classifyContentType(contentType);
    if (kind === 'stream') {
      return { text: STREAMING_BODY_OMITTED };
    }
    if (typeof body === 'string') {
      return { text: kind === 'binary' ? BINARY_BODY_OMITTED : capText(body) };
    }

    const tag = objectTag(body);
    if (tag === '[object URLSearchParams]') {
      return { text: capText(body.toString()) };
    }
    if (tag === '[object FormData]') {
      return { text: summarizeFormData(body) };
    }
    if (tag === '[object ReadableStream]') {
      return { text: STREAMING_BODY_OMITTED };
    }
    if (tag === '[object Blob]' || tag === '[object File]') {
      const blobType = contentType || body.type || '';
      const blobKind = classifyContentType(blobType);
      if (blobKind === 'stream') {
        return { text: STREAMING_BODY_OMITTED };
      }
      if (blobKind === 'binary') {
        return { text: BINARY_BODY_OMITTED };
      }
      return { text: BODY_PENDING, promise: readBlobHead(body, blobType, blobKind === 'unknown') };
    }
    if (tag === '[object ArrayBuffer]' || (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(body))) {
      if (kind === 'binary') {
        return { text: BINARY_BODY_OMITTED };
      }
      const bytes =
        tag === '[object ArrayBuffer]'
          ? new Uint8Array(body)
          : new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
      return { text: decodeBytes(bytes, contentType, kind === 'unknown', bytes.byteLength) };
    }
    if (tag === '[object Document]' || tag === '[object HTMLDocument]' || tag === '[object XMLDocument]') {
      return { text: BODY_NOT_CAPTURED };
    }

    // fetch and XHR send any other value as its string form.
    return { text: kind === 'binary' ? BINARY_BODY_OMITTED : capText(String(body)) };
  } catch (exp) {
    return { text: BODY_NOT_CAPTURED };
  }
};

// The body of a Request passed to fetch(), read from a clone taken before fetch consumes it.
const describeRequestObjectBody = (request, method, contentType) => {
  if (method === 'GET' || method === 'HEAD' || request.body === null) {
    return { text: '' };
  }
  const kind = classifyContentType(contentType);
  if (kind === 'stream') {
    return { text: STREAMING_BODY_OMITTED };
  }
  if (kind === 'binary') {
    return { text: BINARY_BODY_OMITTED };
  }
  if (request.bodyUsed) {
    return { text: BODY_NOT_CAPTURED };
  }

  const clone = request.clone();
  if (clone.body && typeof clone.body.getReader === 'function') {
    return { text: BODY_PENDING, promise: readStreamHead(clone.body, contentType, kind === 'unknown') };
  }
  // Browsers without request streams hold the body in memory already.
  return {
    text: BODY_PENDING,
    promise: clone.arrayBuffer().then((buffer) => {
      const bytes = new Uint8Array(buffer);
      return bytes.byteLength === 0 ? '' : decodeBytes(bytes, contentType, kind === 'unknown', bytes.byteLength);
    }),
  };
};

const applyBody = (target, field, body) => {
  target[field] = body.text;
  if (body.promise) {
    body.promise.then(
      (text) => {
        target[field] = text;
      },
      () => {
        target[field] = BODY_NOT_CAPTURED;
      }
    );
  }
};

const describeError = (error) => {
  try {
    if (error && typeof error === 'object') {
      const name = error.name ? String(error.name) : 'Error';
      const message = error.message ? String(error.message) : '';
      return message ? name + ': ' + message : name;
    }
    return String(error);
  } catch (exp) {
    return 'Error';
  }
};

const xhrFailureText = (failure, xhr) => {
  if (failure === 'abort') {
    return 'AbortError: The request was aborted.';
  }
  if (failure === 'timeout') {
    return 'TimeoutError: The request timed out' + (xhr.timeout ? ' after ' + xhr.timeout + ' ms.' : '.');
  }
  if (typeof failure === 'string' && failure.indexOf(':') !== -1) {
    return failure;
  }
  // XHR does not say why (offline, DNS, CORS, ...).
  return 'NetworkError: The request failed.';
};

const describeXhrResponse = (xhr, headers) => {
  const kind = classifyContentType(getHeader(headers, 'content-type'));
  if (kind === 'stream') {
    return STREAMING_BODY_OMITTED;
  }

  const responseType = xhr.responseType;
  if (responseType === '' || responseType === 'text') {
    if (kind === 'binary') {
      return BINARY_BODY_OMITTED;
    }
    const text = xhr.responseText;
    if (typeof text !== 'string') {
      return '';
    }
    if (kind === 'unknown' && text.slice(0, MAX_BODY_SIZE).indexOf('\u0000') !== -1) {
      return BINARY_BODY_OMITTED;
    }
    return capText(text);
  }
  if (responseType === 'json') {
    if (xhr.response === null || xhr.response === undefined) {
      return '';
    }
    const serialized = serializeBounded(xhr.response, MAX_BODY_SIZE);
    return serialized.truncated ? serialized.text + truncationMarker() : serialized.text;
  }
  if (responseType === 'document') {
    return BODY_NOT_CAPTURED;
  }
  return BINARY_BODY_OMITTED;
};

const performanceTimeOrigin = (performance) => {
  if (typeof performance.timeOrigin === 'number' && performance.timeOrigin > 0) {
    return performance.timeOrigin;
  }
  if (performance.timing && performance.timing.navigationStart > 0) {
    return performance.timing.navigationStart;
  }
  return Date.now() - performance.now();
};

class GleapNetworkIntercepter {
  requestId = 0;
  requests = {};
  externalRequests = [];
  maxRequests = 30;
  localFilters = [];
  remoteFilters = [];
  localBlacklist = [];
  remoteBlacklist = [];
  initialized = false;
  stopped = false;
  loadAllResources = false;

  // GleapNetworkIntercepter singleton
  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new GleapNetworkIntercepter();
    }
    return this.instance;
  }

  setLoadAllResources(loadAllResources) {
    this.loadAllResources = loadAllResources;
  }

  /**
   * Replaces the externally attached network logs (Gleap.attachNetworkLogs).
   * @param {Array} requests
   */
  setExternalRequests(requests) {
    const result = [];
    if (Array.isArray(requests)) {
      for (let i = 0; i < requests.length; i++) {
        try {
          // A copy: the report must not change when the app mutates its array, and an entry
          // that cannot be serialized would break the whole report.
          const copy = JSON.parse(JSON.stringify(requests[i]));
          if (copy && typeof copy === 'object' && !Array.isArray(copy)) {
            result.push(copy);
          }
        } catch (exp) {}
      }
    }
    this.externalRequests = result;
  }

  /**
   * The captured, attached and (timing only) resource requests, blacklisted entries dropped
   * and redacted with the current settings.
   * @returns {Array}
   */
  getRequests() {
    try {
      const requests = [];
      const ids = Object.keys(this.requests);
      for (let i = 0; i < ids.length; i++) {
        if (this.requests[ids[i]]) {
          requests.push(this.requests[ids[i]]);
        }
      }
      if (Array.isArray(this.externalRequests)) {
        for (let i = 0; i < this.externalRequests.length; i++) {
          requests.push(this.externalRequests[i]);
        }
      }

      return sanitizeNetworkLogs(requests.concat(this.getResourceRequests(requests)), {
        propsToIgnore: this.getFilters(),
        blacklist: this.getBlacklist(),
      });
    } catch (exp) {
      return [];
    }
  }

  // Timing-only entries from the Resource Timing API for requests the logger did not capture
  // (sent before it started, or every resource with sendNetworkResources).
  getResourceRequests(capturedRequests) {
    const result = [];
    try {
      if (
        typeof window === 'undefined' ||
        !window.performance ||
        typeof window.performance.getEntriesByType !== 'function'
      ) {
        return result;
      }

      const capturedUrls = {};
      for (let i = 0; i < capturedRequests.length; i++) {
        const request = capturedRequests[i];
        if (request && typeof request.url === 'string') {
          capturedUrls['url:' + resolveUrl(request.url)] = true;
        }
      }

      // Blacklisted resources (the SDK's own requests) are skipped before the cap below.
      const blacklist = this.getBlacklist();
      const timeOrigin = performanceTimeOrigin(window.performance);
      const resources = window.performance.getEntriesByType('resource');
      for (let i = 0; i < resources.length; i++) {
        const resource = resources[i];
        if (!resource || !resource.name) {
          continue;
        }
        if (!this.loadAllResources && ['xmlhttprequest', 'fetch'].indexOf(resource.initiatorType) === -1) {
          continue;
        }
        if (capturedUrls['url:' + resource.name] || isBlacklistedUrl(resource.name, blacklist)) {
          continue;
        }
        const start = timeOrigin + resource.startTime;
        result.push({
          type: 'RESOURCE',
          date: new Date(isFinite(start) ? start : Date.now()).toISOString(),
          url: resource.name,
          duration: Math.round(resource.duration),
          initiatorType: resource.initiatorType,
        });
      }
    } catch (exp) {}

    return result.length > this.maxRequests ? result.slice(result.length - this.maxRequests) : result;
  }

  setMaxRequests(maxRequests) {
    if (maxRequests > 70) {
      maxRequests = 70;
    }
    this.maxRequests = maxRequests;
  }

  setStopped(stopped) {
    this.stopped = stopped;
  }

  /**
   * Props to remove from logged requests, set by Gleap.setNetworkLogPropsToIgnore.
   * Each call replaces the previous list.
   */
  setFilters(filters) {
    this.localFilters = normalizeStringList(filters);
  }

  /**
   * Props to remove from logged requests, from the project settings (replaced on each config apply).
   */
  setRemoteFilters(filters) {
    this.remoteFilters = normalizeStringList(filters);
  }

  /**
   * Urls (substrings) to leave out of the logs, set by Gleap.setNetworkLogsBlacklist.
   * Each call replaces the previous list.
   */
  setBlacklist(blacklist) {
    this.localBlacklist = normalizeStringList(blacklist);
  }

  /**
   * Urls (substrings) to leave out of the logs, from the project settings (replaced on each config apply).
   */
  setRemoteBlacklist(blacklist) {
    this.remoteBlacklist = normalizeStringList(blacklist);
  }

  getFilters() {
    return normalizeStringList(this.remoteFilters.concat(this.localFilters));
  }

  getBlacklist() {
    return normalizeStringList(DEFAULT_NETWORK_LOG_BLACKLIST.concat(this.remoteBlacklist, this.localBlacklist));
  }

  isCapturing() {
    return this.initialized && !this.stopped;
  }

  cleanRequests() {
    var keys = Object.keys(this.requests);
    if (keys.length > this.maxRequests) {
      var keysToRemove = keys.slice(0, keys.length - this.maxRequests);
      for (var i = 0; i < keysToRemove.length; i++) {
        delete this.requests[keysToRemove[i]];
      }
    }
  }

  // Blacklisted urls (the SDK's own traffic included) are not recorded at all, so they never
  // take a slot of the ring buffer. getRequests filters again with the settings at that time.
  createRequest(method, url) {
    if (isBlacklistedUrl(url, this.getBlacklist())) {
      return null;
    }

    const request = {
      date: new Date().toISOString(),
      type: method,
      url: url,
      request: {
        headers: {},
        payload: '',
      },
    };
    this.requests[++this.requestId] = request;
    this.cleanRequests();
    return request;
  }

  start() {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    try {
      this.interceptXhr();
    } catch (exp) {}
    try {
      this.interceptFetch();
    } catch (exp) {}
  }

  interceptFetch() {
    if (typeof window === 'undefined' || typeof window.fetch !== 'function') {
      return;
    }

    const self = this;
    const originalFetch = window.fetch;
    window.fetch = function (input, init) {
      if (!self.isCapturing()) {
        return originalFetch.apply(this, arguments);
      }

      let started = null;
      try {
        started = self.startFetch(input, init);
      } catch (exp) {}

      let promise;
      try {
        promise = originalFetch.apply(this, arguments);
      } catch (error) {
        if (started) {
          try {
            self.failFetch(started, error);
          } catch (exp) {}
        }
        throw error;
      }

      // Observe the app's own promise without chaining it: the app gets exactly what fetch
      // returned, and a rejection it does not handle stays unhandled as before.
      if (started && promise && typeof promise.then === 'function') {
        try {
          promise.then(
            (response) => {
              try {
                self.finishFetch(started, response);
              } catch (exp) {}
            },
            (error) => {
              try {
                self.failFetch(started, error);
              } catch (exp) {}
            }
          );
        } catch (exp) {}
      }
      return promise;
    };
  }

  startFetch(input, init) {
    const start = now();
    const isRequestObject = typeof Request !== 'undefined' && input instanceof Request;
    let method = init && init.method ? init.method : isRequestObject ? input.method : 'GET';
    method = String(method || 'GET').toUpperCase();

    const request = this.createRequest(method, resolveUrl(isRequestObject ? input.url : input));
    if (!request) {
      return null;
    }

    // Headers in init replace the ones of a Request, as in fetch.
    request.request.headers = normalizeHeaders(
      init && init.headers !== undefined ? init.headers : isRequestObject ? input.headers : undefined
    );

    const contentType = getHeader(request.request.headers, 'content-type');
    let body = { text: '' };
    try {
      if (init && init.body !== undefined && init.body !== null) {
        body = describeRequestBody(init.body, contentType);
      } else if (isRequestObject) {
        body = describeRequestObjectBody(input, method, contentType);
      }
    } catch (exp) {
      body = { text: BODY_NOT_CAPTURED };
    }
    applyBody(request.request, 'payload', body);

    return { request: request, start: start };
  }

  finishFetch(started, response) {
    const request = started.request;
    request.duration = elapsedSince(started.start);
    request.success = true;

    const headers = normalizeHeaders(response && response.headers);
    const record = {
      status: response ? response.status : 0,
      statusText: response && response.statusText ? response.statusText : '',
      headers: headers,
      responseText: BODY_PENDING,
    };
    request.response = record;

    const setText = (text) => {
      record.responseText = text;
    };

    try {
      if (!response || response.type === 'opaque' || response.type === 'opaqueredirect') {
        return setText(BODY_NOT_CAPTURED);
      }
      if (response.body === null) {
        return setText('');
      }

      const contentType = getHeader(headers, 'content-type');
      const kind = classifyContentType(contentType);
      if (kind === 'stream') {
        return setText(STREAMING_BODY_OMITTED);
      }
      if (kind === 'binary') {
        return setText(BINARY_BODY_OMITTED);
      }

      // Read a clone, never the app's response, and at most ~150 KB of it.
      const clone = response.clone();
      if (clone.body && typeof clone.body.getReader === 'function') {
        readStreamHead(clone.body, contentType, kind === 'unknown').then(setText, () => setText(BODY_NOT_CAPTURED));
        return;
      }

      // Without response streams only a small body of known size is read in full.
      const contentLength = parseInt(getHeader(headers, 'content-length'), 10);
      if (typeof clone.text === 'function' && contentLength >= 0 && contentLength <= MAX_BODY_SIZE) {
        clone.text().then(
          (text) => setText(capText(text)),
          () => setText(BODY_NOT_CAPTURED)
        );
        return;
      }
      setText(BODY_NOT_CAPTURED);
    } catch (exp) {
      setText(BODY_NOT_CAPTURED);
    }
  }

  failFetch(started, error) {
    const request = started.request;
    request.duration = elapsedSince(started.start);
    request.success = false;
    request.response = {
      errorText: describeError(error),
    };
  }

  interceptXhr() {
    if (typeof XMLHttpRequest === 'undefined' || typeof WeakMap === 'undefined') {
      return;
    }

    const self = this;
    const states = new WeakMap();
    const proto = XMLHttpRequest.prototype;
    const nativeOpen = proto.open;
    const nativeSend = proto.send;
    const nativeSetRequestHeader = proto.setRequestHeader;

    // Logging must never alter or break the request: every hook is guarded and always calls
    // the native method with the original arguments.
    proto.open = function (method, url) {
      try {
        self.onXhrOpen(states, this, method, url);
      } catch (exp) {}
      return nativeOpen.apply(this, arguments);
    };

    proto.setRequestHeader = function (name, value) {
      try {
        const state = states.get(this);
        if (state && state.capture && !state.request) {
          appendHeader(state.headers, String(name), String(value));
        }
      } catch (exp) {}
      return nativeSetRequestHeader.apply(this, arguments);
    };

    proto.send = function (body) {
      let created = false;
      try {
        created = self.onXhrSend(states, this, body);
      } catch (exp) {}
      try {
        return nativeSend.apply(this, arguments);
      } catch (error) {
        // Synchronous requests throw instead of firing error events.
        if (created) {
          try {
            self.finishXhr(this, states.get(this), describeError(error));
          } catch (exp) {}
        }
        throw error;
      }
    };
  }

  onXhrOpen(states, xhr, method, url) {
    let state = states.get(xhr);
    if (!state) {
      state = { listening: false };
      states.set(xhr, state);
    }

    // open() on a used XHR drops the previous request without firing further events. When it
    // is called from a handler of the finished request (readyState DONE), that one completed.
    if (state.request && !state.finished) {
      const replaced = xhr.readyState === 4 ? undefined : 'AbortError: The request was replaced by a new one.';
      this.finishXhr(xhr, state, replaced);
    }

    state.request = null;
    state.finished = false;
    state.failure = null;
    state.headersAt = null;
    state.method = String(method || 'GET').toUpperCase();
    state.url = resolveUrl(url);
    state.headers = {};
    state.capture = this.isCapturing() && !isBlacklistedUrl(state.url, this.getBlacklist());

    if (state.capture && !state.listening) {
      state.listening = true;
      this.listenToXhr(xhr, state);
    }
  }

  // One set of listeners per XHR instance, however often it is reused. The end events of a
  // request are dispatched while readyState is DONE; when an app handler that ran before ours
  // already re-opened the XHR for the next request, they belong to the old one and are skipped.
  listenToXhr(xhr, state) {
    const self = this;
    const setFailure = (failure) => () => {
      if (xhr.readyState === 4) {
        state.failure = failure;
      }
    };
    xhr.addEventListener('readystatechange', () => {
      try {
        if (xhr.readyState === 2 && state.request && !state.finished) {
          self.recordXhrHeaders(xhr, state);
        }
      } catch (exp) {}
    });
    xhr.addEventListener('error', setFailure('error'));
    xhr.addEventListener('abort', setFailure('abort'));
    xhr.addEventListener('timeout', setFailure('timeout'));
    xhr.addEventListener('loadend', () => {
      try {
        if (xhr.readyState === 4) {
          self.finishXhr(xhr, state);
        }
      } catch (exp) {}
    });
  }

  // Returns true when this call started recording a request.
  onXhrSend(states, xhr, body) {
    const state = states.get(xhr);
    if (!state || !state.capture || state.request || !this.isCapturing()) {
      return false;
    }

    const start = now();
    const request = this.createRequest(state.method, state.url);
    if (!request) {
      state.capture = false;
      return false;
    }

    request.request.headers = Object.assign({}, state.headers);
    const hasBody = state.method !== 'GET' && state.method !== 'HEAD';
    applyBody(
      request.request,
      'payload',
      hasBody ? describeRequestBody(body, getHeader(state.headers, 'content-type')) : { text: '' }
    );

    state.request = request;
    state.start = start;
    return true;
  }

  recordXhrHeaders(xhr, state) {
    state.headersAt = now();
    const request = state.request;
    request.duration = Math.max(0, Math.round(state.headersAt - state.start));
    request.success = true;
    request.response = {
      status: xhr.status,
      statusText: xhr.statusText || '',
      headers: parseXhrHeaders(xhr.getAllResponseHeaders()),
      responseText: BODY_PENDING,
    };
  }

  finishXhr(xhr, state, errorText) {
    if (!state || !state.request || state.finished) {
      return;
    }
    state.finished = true;

    const request = state.request;
    const failure = errorText || state.failure || (xhr.status === 0 ? 'error' : null);
    if (failure) {
      request.duration = elapsedSince(state.start);
      request.success = false;
      request.response = {
        errorText: xhrFailureText(failure, xhr),
      };
      return;
    }

    request.duration = state.headersAt ? Math.max(0, Math.round(state.headersAt - state.start)) : elapsedSince(state.start);
    request.success = true;
    const headers = parseXhrHeaders(xhr.getAllResponseHeaders());
    let responseText;
    try {
      responseText = describeXhrResponse(xhr, headers);
    } catch (exp) {
      responseText = BODY_NOT_CAPTURED;
    }
    request.response = {
      status: xhr.status,
      statusText: xhr.statusText || '',
      headers: headers,
      responseText: responseText,
    };
  }
}

export default GleapNetworkIntercepter;
