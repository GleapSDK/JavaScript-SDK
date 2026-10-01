import { record } from '@rrweb/record';
import { pack } from '@rrweb/packer';
import { GleapConsoleLogManager, GleapNetworkIntercepter, GleapReplayRecorder } from './Gleap';
import { isMobile } from './GleapHelper';
import { isBlockedElement, isMaskMarker } from './GleapInputMasking';
import { approximateSize } from './GleapReplayRecorder';
import { fixWebmDuration } from './GleapWebmDuration';

// Recordings for capture requests (contract §8): the screen through getDisplayMedia + MediaRecorder
// on desktop browsers, a page recording (rrweb) where there is no getDisplayMedia (phones, tablets).
// A timeline digest of what happened goes along with both.

const VIDEO_BITS_PER_SECOND = 2500000;
const AUDIO_BITS_PER_SECOND = 64000;
const TIMESLICE_MS = 1000;
// A page recording stops by itself before it gets unreasonably large (approximate JSON size).
const MAX_PAGE_RECORDING_SIZE = 25 * 1024 * 1024;
const MAX_TIMELINE_ENTRIES = 200;

// Contract order, with H.264 as avc3 ahead of avc1: avc3 carries its parameters in-band, so a
// resolution change while recording (a resized window, the browser's sharing bar appearing) keeps
// the file valid; Chrome reports an error for avc1 then. With a microphone the same containers are
// tried with an audio codec first.
const VIDEO_MIME_TYPES = [
  'video/mp4;codecs=avc3',
  'video/mp4;codecs=avc1',
  'video/mp4',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
];
const AUDIO_VIDEO_MIME_TYPES = [
  'video/mp4;codecs=avc3,mp4a.40.2',
  'video/mp4;codecs=avc1,mp4a.40.2',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

export const pickRecorderMimeType = (withAudio) => {
  const candidates = withAudio ? AUDIO_VIDEO_MIME_TYPES.concat(VIDEO_MIME_TYPES) : VIDEO_MIME_TYPES;
  try {
    if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
      for (let i = 0; i < candidates.length; i++) {
        if (MediaRecorder.isTypeSupported(candidates[i])) {
          return candidates[i];
        }
      }
    }
  } catch (exp) {}
  return '';
};

const stopTracks = (stream) => {
  try {
    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (exp) {}
      });
    }
  } catch (exp) {}
};

/**
 * Asks for the screen to record. Must run synchronously inside the Start click (user activation).
 * Chromium offers the current tab first; Firefox and Safari show their own picker.
 */
export const requestDisplayStream = (chromium) => {
  const video = { frameRate: { ideal: 15, max: 30 } };
  const options = { video, audio: false };
  if (chromium) {
    video.displaySurface = 'browser';
    options.preferCurrentTab = true;
    options.selfBrowserSurface = 'include';
    options.surfaceSwitching = 'include';
  }
  let promise;
  try {
    promise = navigator.mediaDevices.getDisplayMedia(options);
  } catch (error) {
    promise = Promise.reject(error);
  }
  promise.catch(() => {});
  return promise;
};

/**
 * A screen recording from a getDisplayMedia stream. Stops on stop(), at maxDurationSec, and when
 * the browser's "Stop sharing" ends the track; every track, timer and listener is released on
 * every path.
 */
export class DisplayRecording {
  stream = null;
  micStream = null;
  videoTrack = null;
  recorder = null;
  chunks = [];
  mimeType = '';
  timer = null;
  startedAt = 0;
  endedAt = 0;
  settings = {};
  finished = false;
  recorderStopped = false;
  stopTimeout = null;
  onEndedBound = null;

  /**
   * @param {{maxDurationSec: number, onTick: function(number), onStop: function(object), onError: function(Error), onReleased?: function()}} options
   * onReleased: the screen is no longer captured (on every path; may be called more than once).
   */
  constructor(options) {
    this.options = options;
  }

  /**
   * @param {MediaStream} stream from requestDisplayStream
   * @param {boolean} withMicrophone
   * @returns {Promise<{hasMicrophone: boolean}>}
   */
  start(stream, withMicrophone) {
    this.stream = stream;
    this.videoTrack = stream.getVideoTracks()[0] || null;
    if (!this.videoTrack) {
      return Promise.reject(new Error('no-video-track'));
    }
    try {
      this.settings = this.videoTrack.getSettings ? this.videoTrack.getSettings() : {};
    } catch (exp) {
      this.settings = {};
    }

    const microphone = withMicrophone
      ? navigator.mediaDevices
          .getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: false,
          })
          // Recording goes on without sound.
          .catch(() => null)
      : Promise.resolve(null);

    return microphone.then((micStream) => {
      this.micStream = micStream;
      const micTrack = micStream ? micStream.getAudioTracks()[0] || null : null;
      if (this.finished || !this.videoTrack || this.videoTrack.readyState === 'ended') {
        this.cleanup();
        throw new Error('stopped-before-start');
      }

      const tracks = [this.videoTrack];
      if (micTrack) {
        tracks.push(micTrack);
      }
      this.mimeType = pickRecorderMimeType(!!micTrack);
      const recorderOptions = { videoBitsPerSecond: VIDEO_BITS_PER_SECOND };
      if (this.mimeType) {
        recorderOptions.mimeType = this.mimeType;
      }
      if (micTrack) {
        recorderOptions.audioBitsPerSecond = AUDIO_BITS_PER_SECOND;
      }
      try {
        this.recorder = new MediaRecorder(new MediaStream(tracks), recorderOptions);
      } catch (error) {
        this.cleanup();
        throw error;
      }
      this.recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };
      this.recorder.onstop = () => {
        this.recorderStopped = true;
        this.finish();
      };
      this.recorder.onerror = (event) => this.fail((event && event.error) || new Error('recorder-error'));

      // The browser's "Stop sharing" ends the track: that is a Stop.
      this.onEndedBound = () => this.stop();
      this.videoTrack.addEventListener('ended', this.onEndedBound);

      try {
        this.recorder.start(TIMESLICE_MS);
      } catch (error) {
        this.cleanup();
        throw error;
      }
      this.startedAt = Date.now();
      const maxMs = this.options.maxDurationSec * 1000;
      this.timer = setInterval(() => {
        const elapsed = Date.now() - this.startedAt;
        try {
          this.options.onTick(Math.floor(elapsed / 1000));
        } catch (exp) {}
        if (elapsed >= maxMs) {
          this.stop();
        }
      }, 250);
      return { hasMicrophone: !!micTrack };
    });
  }

  setMicrophoneEnabled(enabled) {
    try {
      if (this.micStream) {
        this.micStream.getAudioTracks().forEach((track) => {
          track.enabled = !!enabled;
        });
      }
    } catch (exp) {}
  }

  stop() {
    if (this.finished || this.stopTimeout) {
      return;
    }
    this.endedAt = this.endedAt || Date.now();
    this.clearTimer();
    if (!this.recorder || this.recorderStopped) {
      this.finish();
      return;
    }
    try {
      if (this.recorder.state !== 'inactive') {
        this.recorder.stop();
      }
    } catch (exp) {}
    // Ends the browser's sharing indicator and the microphone right away.
    this.releaseTracks();
    // The last chunk and then 'stop' follow (also when the recorder stopped by itself because the
    // shared screen ended); finish then. Just in case 'stop' never comes:
    this.stopTimeout = setTimeout(() => this.finish(), 3000);
  }

  finish() {
    if (this.finished) {
      return;
    }
    this.finished = true;
    this.endedAt = this.endedAt || Date.now();
    const type = (this.recorder && this.recorder.mimeType) || this.mimeType || 'video/webm';
    const baseType = type.indexOf('mp4') !== -1 ? 'video/mp4' : 'video/webm';
    const blob = new Blob(this.chunks, { type: baseType });
    this.chunks = [];
    this.cleanup();
    const result = {
      blob,
      type: baseType,
      fileName: 'screen-recording.' + (baseType === 'video/mp4' ? 'mp4' : 'webm'),
      startedAt: this.startedAt,
      endedAt: this.endedAt,
      durationMs: Math.max(0, this.endedAt - this.startedAt),
      width: this.settings.width,
      height: this.settings.height,
      // 'tab' only for a browser tab; windows and screens (and browsers that don't say) are 'display'.
      method: this.settings.displaySurface === 'browser' ? 'tab' : 'display',
    };
    if (blob.size === 0) {
      this.options.onError(new Error('empty-recording'));
      return;
    }
    const deliver = (finalBlob) => {
      result.blob = finalBlob;
      try {
        this.options.onStop(result);
      } catch (error) {
        try {
          this.options.onError(error);
        } catch (exp) {}
      }
    };
    if (baseType !== 'video/webm') {
      deliver(blob);
      return;
    }
    // WebM from MediaRecorder has no duration, so players couldn't seek it (MP4 has one). The patch
    // falls back to the file as recorded on any problem.
    fixWebmDuration(blob, result.durationMs).then(deliver);
  }

  fail(error) {
    if (this.finished) {
      return;
    }
    this.finished = true;
    this.chunks = [];
    this.cleanup();
    try {
      this.options.onError(error);
    } catch (exp) {}
  }

  /**
   * Discards the recording.
   */
  cancel() {
    this.finished = true;
    this.chunks = [];
    try {
      if (this.recorder && this.recorder.state !== 'inactive') {
        this.recorder.stop();
      }
    } catch (exp) {}
    this.cleanup();
  }

  clearTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.stopTimeout) {
      clearTimeout(this.stopTimeout);
      this.stopTimeout = null;
    }
  }

  releaseTracks() {
    if (this.videoTrack && this.onEndedBound) {
      try {
        this.videoTrack.removeEventListener('ended', this.onEndedBound);
      } catch (exp) {}
    }
    this.onEndedBound = null;
    stopTracks(this.stream);
    stopTracks(this.micStream);
    // Nothing more can be recorded (the recorder stopped first): the privacy veil may go.
    if (this.options.onReleased) {
      try {
        this.options.onReleased();
      } catch (exp) {}
    }
  }

  cleanup() {
    this.clearTimer();
    this.releaseTracks();
    if (this.recorder) {
      this.recorder.ondataavailable = null;
      this.recorder.onstop = null;
      this.recorder.onerror = null;
    }
    this.recorder = null;
    this.stream = null;
    this.micStream = null;
    this.videoTrack = null;
  }
}

const combineSelectors = (selectors) =>
  selectors
    .filter((selector) => {
      if (typeof selector !== 'string' || !selector.trim()) {
        return false;
      }
      try {
        document.createDocumentFragment().querySelector(selector);
        return true;
      } catch (exp) {
        return false;
      }
    })
    .join(', ') || null;

/**
 * A page recording (rrweb) with every input masked and without canvas. The file has exactly the
 * shape of a bug report's webReplay, so the dashboard's replay player shows it.
 */
export class PageRecording {
  events = [];
  size = 0;
  stopFunction = null;
  timer = null;
  startedAt = 0;
  endedAt = 0;
  finished = false;
  resumeReplay = false;
  width = 0;
  height = 0;

  /**
   * @param {{maxDurationSec: number, privacyOptions: object, maskSelectors: string[], onTick: function(number), onStop: function(object), onError: function(Error)}} options
   */
  constructor(options) {
    this.options = options;
  }

  start() {
    const privacyOptions = this.options.privacyOptions || {};
    // rrweb records one session per page: the session replay pauses meanwhile, keeping its buffer.
    this.resumeReplay = GleapReplayRecorder.getInstance().pauseForCapture();
    this.startedAt = Date.now();
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    try {
      this.stopFunction = record({
        emit: (event) => {
          if (this.finished) {
            return;
          }
          this.events.push(event);
          this.size += approximateSize(event);
          if (this.size > MAX_PAGE_RECORDING_SIZE) {
            setTimeout(() => this.stop(), 0);
          }
        },
        maskAllInputs: true,
        blockClass: privacyOptions.blockClass || 'rr-block',
        blockSelector: combineSelectors(
          ['.gl-block', privacyOptions.blockSelector].concat(this.options.maskSelectors || [])
        ),
        maskTextClass: privacyOptions.maskTextClass || 'rr-mask',
        maskTextSelector: combineSelectors(['.gl-mask', privacyOptions.maskTextSelector]),
        inlineStylesheet: true,
        recordCanvas: false,
        collectFonts: false,
        recordCrossOriginIframes: false,
        slimDOMOptions: {
          script: true,
          comment: true,
          headFavicon: true,
          headWhitespace: true,
          headMetaDescKeywords: true,
          headMetaSocial: true,
          headMetaRobots: true,
          headMetaHttpEquiv: true,
          headMetaVerification: true,
        },
        dataURLOptions: { quality: 0.7 },
        sampling: {
          scroll: 150,
          input: 'last',
          mouseInteraction: {
            MouseUp: false,
            MouseDown: false,
            Click: true,
            ContextMenu: true,
            DblClick: true,
            Focus: true,
            Blur: true,
            TouchStart: true,
            TouchEnd: false,
          },
        },
      });
    } catch (error) {
      this.cleanup();
      throw error;
    }
    if (!this.stopFunction) {
      this.cleanup();
      throw new Error('page-recording-unavailable');
    }

    const maxMs = this.options.maxDurationSec * 1000;
    this.timer = setInterval(() => {
      const elapsed = Date.now() - this.startedAt;
      try {
        this.options.onTick(Math.floor(elapsed / 1000));
      } catch (exp) {}
      if (elapsed >= maxMs) {
        this.stop();
      }
    }, 250);
  }

  stop() {
    if (this.finished) {
      return;
    }
    this.finished = true;
    this.endedAt = Date.now();
    this.cleanup();

    let events = this.events;
    let packed = false;
    try {
      events = this.events.map((event) => pack(event));
      packed = true;
    } catch (exp) {
      events = this.events;
    }
    this.events = [];
    const replay = {
      startDate: this.startedAt,
      events,
      packed,
      baseUrl: window.location.origin,
      width: this.width,
      height: this.height,
      isMobile: isMobile(),
      type: 'rrweb',
    };
    let blob;
    try {
      blob = new Blob([JSON.stringify(replay)], { type: 'application/json' });
    } catch (error) {
      this.options.onError(error);
      return;
    }
    this.options.onStop({
      blob,
      type: 'application/json',
      fileName: 'page-recording.json',
      startedAt: this.startedAt,
      endedAt: this.endedAt,
      durationMs: Math.max(0, this.endedAt - this.startedAt),
      width: this.width,
      height: this.height,
      method: 'rrweb',
    });
  }

  cancel() {
    this.finished = true;
    this.events = [];
    this.cleanup();
  }

  cleanup() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.stopFunction) {
      try {
        this.stopFunction();
      } catch (exp) {}
      this.stopFunction = null;
    }
    if (this.resumeReplay) {
      this.resumeReplay = false;
      try {
        GleapReplayRecorder.getInstance().resumeAfterCapture();
      } catch (exp) {}
    }
  }
}

const ACTIONABLE_SELECTOR =
  'a, button, input, select, textarea, label, summary, [role="button"], [role="link"], [role="menuitem"], [role="tab"], [role="checkbox"], [role="option"], [role="switch"]';

const collapse = (text, max) => {
  const value = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  return value.length > max ? value.slice(0, max - 1) + '…' : value;
};

const isPrivate = (element, privacyOptions) => {
  let current = element;
  while (current) {
    if (current.nodeType === 1) {
      try {
        if (isBlockedElement(current, privacyOptions) || isMaskMarker(current, privacyOptions)) {
          return true;
        }
      } catch (exp) {}
    }
    current = current.parentElement || (current.parentNode && current.parentNode.host) || null;
  }
  return false;
};

const fieldName = (field) =>
  collapse(
    field.getAttribute('aria-label') ||
      (field.labels && field.labels[0] && field.labels[0].textContent) ||
      field.getAttribute('placeholder') ||
      field.getAttribute('name') ||
      field.id ||
      field.type ||
      field.tagName.toLowerCase(),
    60
  );

/**
 * How an element is named in the timeline: its role plus a short accessible name. Never a field
 * value, and no text inside masked or blocked elements.
 */
export const describeElement = (element, privacyOptions) => {
  if (!element || element.nodeType !== 1) {
    return 'element';
  }
  const tag = element.tagName.toLowerCase();
  const role = element.getAttribute('role') || (tag === 'a' ? 'link' : tag);
  if (tag === 'input' || tag === 'select' || tag === 'textarea') {
    return (
      (element.type === 'checkbox' || element.type === 'radio' ? element.type : 'field') + ' "' + fieldName(element) + '"'
    );
  }
  if (isPrivate(element, privacyOptions)) {
    return role;
  }
  const name = collapse(
    element.getAttribute('aria-label') ||
      element.getAttribute('title') ||
      element.getAttribute('alt') ||
      element.textContent,
    60
  );
  return name ? role + ' "' + name + '"' : role;
};

const pagePath = (href) => {
  try {
    const url = new URL(href);
    return collapse(url.pathname + url.search + url.hash, 150);
  } catch (exp) {
    return collapse(href, 150);
  }
};

/**
 * The timeline digest of a recording: clicks, inputs (without values), navigations, console errors
 * and failed requests, with t in ms since the recording started.
 */
export class CaptureTimeline {
  entries = [];
  startedAt = 0;
  listeners = [];
  urlTimer = null;
  lastUrl = '';
  lastInputField = null;
  lastInputAt = 0;

  constructor({ privacyOptions, isOwnElement }) {
    this.privacyOptions = privacyOptions || {};
    this.isOwnElement = isOwnElement || (() => false);
  }

  add(type, label, at) {
    if (this.entries.length >= MAX_TIMELINE_ENTRIES) {
      return;
    }
    this.entries.push({ t: Math.max(0, (at || Date.now()) - this.startedAt), type, label: collapse(label, 200) });
  }

  // The control the event belongs to (through shadow roots), or null.
  target(event) {
    try {
      const path = event.composedPath ? event.composedPath() : [event.target];
      for (let i = 0; i < path.length; i++) {
        const node = path[i];
        if (node && node.nodeType === 1 && node.matches && node.matches(ACTIONABLE_SELECTOR)) {
          return node;
        }
      }
    } catch (exp) {}
    return null;
  }

  start(startedAt) {
    this.startedAt = startedAt || Date.now();
    this.lastUrl = window.location.href;
    const listen = (target, type, handler) => {
      target.addEventListener(type, handler, { capture: true, passive: true });
      this.listeners.push(() => target.removeEventListener(type, handler, { capture: true, passive: true }));
    };
    listen(document, 'click', (event) => {
      try {
        if (this.isOwnElement(event.target)) {
          return;
        }
        const control = this.target(event);
        // Only controls are named; other elements go by their tag, without their text.
        const label = control
          ? describeElement(control, this.privacyOptions)
          : event.target && event.target.tagName
            ? event.target.tagName.toLowerCase()
            : 'page';
        this.add('click', 'Clicked ' + label);
      } catch (exp) {}
    });
    const onInput = (event) => {
      try {
        const field = this.target(event);
        if (!field || this.isOwnElement(event.target)) {
          return;
        }
        // One entry per field while the customer keeps typing in it.
        const now = Date.now();
        if (field === this.lastInputField && now - this.lastInputAt < 5000) {
          this.lastInputAt = now;
          return;
        }
        this.lastInputField = field;
        this.lastInputAt = now;
        this.add(
          'input',
          (event.type === 'change' ? 'Changed ' : 'Typed in ') + describeElement(field, this.privacyOptions)
        );
      } catch (exp) {}
    };
    listen(document, 'input', onInput);
    listen(document, 'change', onInput);
    const checkUrl = () => {
      try {
        const href = window.location.href;
        if (href !== this.lastUrl) {
          this.lastUrl = href;
          this.add('navigation', 'Navigated to ' + pagePath(href));
        }
      } catch (exp) {}
    };
    listen(window, 'popstate', checkUrl);
    listen(window, 'hashchange', checkUrl);
    this.urlTimer = setInterval(checkUrl, 500);
  }

  /**
   * Stops listening and adds the console errors and failed requests of the recording window.
   * @returns {Array<{t: number, type: string, label: string}>}
   */
  stop(endedAt) {
    const end = endedAt || Date.now();
    this.listeners.forEach((remove) => {
      try {
        remove();
      } catch (exp) {}
    });
    this.listeners = [];
    if (this.urlTimer) {
      clearInterval(this.urlTimer);
      this.urlTimer = null;
    }

    const inWindow = (date) => {
      const time = new Date(date).getTime();
      return time >= this.startedAt && time <= end ? time : null;
    };
    try {
      GleapConsoleLogManager.getInstance()
        .getLogs()
        .forEach((entry) => {
          const time = entry && entry.priority === 'ERROR' ? inWindow(entry.date) : null;
          if (time !== null) {
            this.add('error', String(entry.log || '').split('\n')[0], time);
          }
        });
    } catch (exp) {}
    try {
      GleapNetworkIntercepter.getInstance()
        .getRequests()
        .forEach((request) => {
          if (!request || request.type === 'RESOURCE') {
            return;
          }
          const status = request.response && request.response.status;
          const failed = request.success === false || (typeof status === 'number' && status >= 400);
          const time = failed ? inWindow(request.date) : null;
          if (time !== null) {
            this.add(
              'network-error',
              (request.type || 'GET') + ' ' + pagePath(request.url) + ' → ' + (status || 'failed'),
              time
            );
          }
        });
    } catch (exp) {}

    return this.entries.sort((a, b) => a.t - b.t);
  }

  get interactions() {
    return this.entries.filter((entry) => entry.type === 'click' || entry.type === 'input').length;
  }
}
