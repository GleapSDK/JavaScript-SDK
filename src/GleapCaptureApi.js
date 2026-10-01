import {
  GleapConfigManager,
  GleapConsoleLogManager,
  GleapCustomDataManager,
  GleapMetaDataManager,
  GleapNetworkIntercepter,
  GleapReplayRecorder,
  GleapSession,
  GleapStreamedEvent,
} from './Gleap';
import { packEvents } from './GleapCaptureRecorder';
import { CAPTURE_PLATFORM, CAPTURE_SDK_TYPE, getSdkVersion } from './GleapCaptureSettings';
import { toJsonParts } from './GleapCaptureTasks';

// Server calls and the log bundle of capture requests (contract §4 and §9). Every call resolves
// (never rejects) with { status, data }; status 0 means no answer.

// The /logs body limit is 20 MB; stay below it.
const MAX_LOGS_BODY_BYTES = 19 * 1024 * 1024;
// Log entries this long before a recording started still count as part of it.
const RECORDING_LOG_LEAD_MS = 10 * 1000;
const JSON_TIMEOUT_MS = 30 * 1000;
// A large body gets more time: 30 s plus a second per 64 KB.
const timeoutForSize = (bytes) => JSON_TIMEOUT_MS + Math.ceil((bytes || 0) / (64 * 1024)) * 1000;

const DEFAULT_INCLUDE = {
  consoleLog: true,
  networkLogs: true,
  customData: true,
  metaData: true,
  customEventLog: true,
  replays: false,
};

const capturePath = (requestId, action) =>
  '/v3/shared/capture-requests/' + encodeURIComponent(String(requestId)) + '/' + action;

const parseJson = (text) => {
  try {
    return text ? JSON.parse(text) : null;
  } catch (exp) {
    return null;
  }
};

/**
 * Sends a JSON (or pre-encoded) body to the API with the session headers.
 * @returns {Promise<{status: number, data: any}>}
 */
export const sendCaptureApiRequest = (method, path, body, options = {}) =>
  new Promise((resolve) => {
    let settled = false;
    const done = (status, data) => {
      if (!settled) {
        settled = true;
        resolve({ status, data });
      }
    };

    try {
      const session = GleapSession.getInstance();
      const xhr = new XMLHttpRequest();
      xhr.open(method, session.apiUrl + path);
      xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
      if (options.gzip) {
        xhr.setRequestHeader('Content-Encoding', 'gzip');
      }
      session.injectSession(xhr);
      xhr.timeout = options.timeoutMs || JSON_TIMEOUT_MS;
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          done(xhr.status, parseJson(xhr.responseText));
        }
      };
      xhr.onerror = () => done(0, null);
      xhr.ontimeout = () => done(0, null);
      xhr.send(body === undefined ? null : body);
    } catch (exp) {
      done(0, null);
    }
  });

/**
 * The request as the server has it ({ status, expiresAt, ... }).
 */
export const getCaptureRequest = (requestId) =>
  sendCaptureApiRequest('GET', '/v3/shared/capture-requests/' + encodeURIComponent(String(requestId)));

const postJson = (requestId, action, payload) =>
  sendCaptureApiRequest('POST', capturePath(requestId, action), JSON.stringify(payload || {}));

export const claimCaptureRequest = (requestId, payload) => postJson(requestId, 'claim', payload);

/**
 * Reports a non-final outcome ('declined' | 'unsupported' | 'failed' | 'released'); releases the claim.
 */
export const reportCaptureEvent = (requestId, type, reason) => {
  const payload = { type };
  if (reason) {
    payload.reason = String(reason).slice(0, 200);
  }
  return postJson(requestId, 'event', payload);
};

export const completeCaptureRequest = (requestId, payload) => postJson(requestId, 'complete', payload);

const gzipBlob = (blob) => {
  try {
    if (typeof CompressionStream === 'function' && typeof Response === 'function' && typeof blob.stream === 'function') {
      return new Response(blob.stream().pipeThrough(new CompressionStream('gzip'))).blob().catch(() => null);
    }
  } catch (exp) {}
  return Promise.resolve(null);
};

// The replay's events packed (in slices) if they aren't yet.
const withPackedReplay = (bundle) => {
  const replay = bundle.webReplay;
  if (!replay || replay.packed || !Array.isArray(replay.events)) {
    return Promise.resolve(bundle);
  }
  return packEvents(replay.events).then((packed) => {
    if (!packed) {
      return bundle;
    }
    return Object.assign({}, bundle, { webReplay: Object.assign({}, replay, { events: packed, packed: true }) });
  });
};

// Serialized in slices into a Blob (no single huge string), then gzipped when the browser can.
const encodeJson = (value) =>
  toJsonParts(value).then((parts) => {
    const blob = new Blob(parts, { type: 'application/json' });
    return gzipBlob(blob).then((gzipped) =>
      gzipped ? { body: gzipped, gzip: true, size: gzipped.size } : { body: blob, gzip: false, size: blob.size }
    );
  });

/**
 * The request body for a log bundle: gzip when the browser can (CompressionStream), plain JSON
 * otherwise. A bundle over the size limit goes without its replay; null when it is still too large.
 * The main thread is never blocked for long: packing and serializing run in slices.
 * @returns {Promise<{body: Blob, gzip: boolean, size: number}|null>}
 */
export const encodeLogsBundle = (bundle) =>
  withPackedReplay(bundle)
    .then((ready) => encodeJson(ready))
    .then((encoded) => {
      if (encoded.size <= MAX_LOGS_BODY_BYTES) {
        return encoded;
      }
      if (!bundle.webReplay) {
        return null;
      }
      const withoutReplay = Object.assign({}, bundle);
      delete withoutReplay.webReplay;
      return encodeJson(withoutReplay).then((smaller) => (smaller.size <= MAX_LOGS_BODY_BYTES ? smaller : null));
    });

export const postCaptureLogs = (requestId, bundle) =>
  encodeLogsBundle(bundle).then((encoded) =>
    encoded
      ? sendCaptureApiRequest('POST', capturePath(requestId, 'logs'), encoded.body, {
          gzip: encoded.gzip,
          timeoutMs: timeoutForSize(encoded.size),
        })
      : { status: 413, data: null }
  );

/**
 * Uploads one file to /uploads/attachments (the endpoint the Messenger uses for attachments).
 * @param {File|Blob} file
 * @param {function(number)} onProgress 0..1
 * @returns {{promise: Promise<string>, abort: function}} resolves with the file URL
 */
export const uploadCaptureFile = (file, fileName, onProgress) => {
  let xhr = null;
  const promise = new Promise((resolve, reject) => {
    try {
      const session = GleapSession.getInstance();
      const formData = new FormData();
      formData.append('file', file, fileName);
      xhr = new XMLHttpRequest();
      xhr.open('POST', session.apiUrl + '/uploads/attachments');
      session.injectSession(xhr);
      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && event.total > 0) {
            onProgress(Math.min(1, event.loaded / event.total));
          }
        };
      }
      xhr.onreadystatechange = () => {
        if (xhr.readyState !== 4) {
          return;
        }
        const data = parseJson(xhr.responseText);
        if (xhr.status === 200 && data && Array.isArray(data.fileUrls) && typeof data.fileUrls[0] === 'string') {
          resolve(data.fileUrls[0]);
        } else {
          reject(new Error(xhr.status === 413 ? 'file-too-large' : 'upload-failed-' + xhr.status));
        }
      };
      xhr.onerror = () => reject(new Error('upload-failed'));
      xhr.onabort = () => reject(new Error('upload-aborted'));
      xhr.send(formData);
    } catch (exp) {
      reject(exp);
    }
  });
  return {
    promise,
    abort: () => {
      try {
        if (xhr) {
          xhr.abort();
        }
      } catch (exp) {}
    },
  };
};

export const normalizeInclude = (include) => {
  const result = Object.assign({}, DEFAULT_INCLUDE);
  if (include && typeof include === 'object') {
    Object.keys(DEFAULT_INCLUDE).forEach((key) => {
      if (typeof include[key] === 'boolean') {
        result[key] = include[key];
      }
    });
  }
  return result;
};

const entryTime = (entry) => {
  if (!entry) {
    return NaN;
  }
  const value = entry.date;
  if (value instanceof Date) {
    return value.getTime();
  }
  return typeof value === 'string' || typeof value === 'number' ? new Date(value).getTime() : NaN;
};

const withinWindow = (entries, from, to) => {
  if (!Array.isArray(entries)) {
    return [];
  }
  if (!from) {
    return entries.slice();
  }
  return entries.filter((entry) => {
    const time = entryTime(entry);
    // Entries without a usable date stay in.
    return isNaN(time) || (time >= from && time <= to);
  });
};

const webReplaysEnabled = () => {
  try {
    const flowConfig = GleapConfigManager.getInstance().getFlowConfig();
    return !!(flowConfig && flowConfig.enableWebReplays);
  } catch (exp) {
    return false;
  }
};

/**
 * The log bundle for /logs (contract §9): the data a bug report carries, from the same collectors,
 * limited to what `include` asks for. Never takes a screenshot. With a recording window only the
 * entries of that window (and a short lead-in) are included.
 * @param {{include?: object, windowStart?: number, windowEnd?: number, deviceId?: string}} options
 */
export const buildLogsBundle = (options = {}) => {
  const include = normalizeInclude(options.include);
  const now = Date.now();
  const windowEnd = options.windowEnd || now;
  const filterFrom = options.windowStart ? options.windowStart - RECORDING_LOG_LEAD_MS : 0;
  const bundle = {};

  const collect = (key, read) => {
    try {
      bundle[key] = read();
    } catch (exp) {}
  };

  if (include.consoleLog) {
    collect('consoleLog', () => withinWindow(GleapConsoleLogManager.getInstance().getLogs(), filterFrom, windowEnd));
  }
  if (include.networkLogs) {
    collect('networkLogs', () => withinWindow(GleapNetworkIntercepter.getInstance().getRequests(), filterFrom, windowEnd));
  }
  if (include.customData) {
    collect('customData', () => GleapCustomDataManager.getInstance().getCustomData());
  }
  if (include.metaData) {
    collect('metaData', () => GleapMetaDataManager.getInstance().getMetaData());
  }
  if (include.customEventLog) {
    collect('customEventLog', () => withinWindow(GleapStreamedEvent.getInstance().getEventArray(), filterFrom, windowEnd));
  }
  if (include.replays && webReplaysEnabled()) {
    try {
      // Unpacked here (cheap); encodeLogsBundle packs it in slices.
      const replay = GleapReplayRecorder.getInstance().getReplaySnapshot();
      if (replay && replay.startDate && Array.isArray(replay.events) && replay.events.length > 0) {
        bundle.webReplay = replay;
      }
    } catch (exp) {}
  }

  let windowStart = options.windowStart;
  if (!windowStart) {
    try {
      windowStart = GleapMetaDataManager.getInstance().sessionStart.getTime();
    } catch (exp) {
      windowStart = now;
    }
  }

  bundle.capturedAt = new Date(now).toISOString();
  bundle.windowStart = new Date(windowStart).toISOString();
  bundle.windowEnd = new Date(windowEnd).toISOString();
  bundle.platform = CAPTURE_PLATFORM;
  bundle.sdkType = CAPTURE_SDK_TYPE;
  bundle.sdkVersion = getSdkVersion();
  if (options.deviceId) {
    bundle.deviceId = options.deviceId;
  }
  return bundle;
};
