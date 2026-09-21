import { isMobile } from './GleapHelper';
import { record } from '@rrweb/record';
import { pack } from '@rrweb/packer';

// rrweb EventType.Meta. On every checkout (see checkoutEveryNms) rrweb emits a
// Meta immediately followed by a FullSnapshot, both flagged isCheckout. The
// Meta therefore reliably marks the start of a fresh, self-contained checkpoint.
const RRWEB_META_EVENT_TYPE = 4;

// Take a fresh full snapshot every few minutes. This lets us trim the buffer to
// whole checkpoints instead of letting it grow unbounded for the lifetime of a
// long-lived single-page-app session.
const CHECKOUT_EVERY_MS = 5 * 60 * 1000;

// Retain at most this many checkpoints (~10-15 min of history). Every retained
// checkpoint begins with a Meta + FullSnapshot, so the replay is always
// self-contained and never starts mid-mutation.
const MAX_CHECKPOINTS = 3;

// Checkpoints bound the buffer in time only. A page that re-renders constantly,
// or inlines large stylesheets into every full snapshot, still collected tens of
// MB within those minutes: held in the host page's memory, then uploaded with
// the report. Cap the (approximate, uncompressed) serialized size as well.
const MAX_BUFFER_SIZE = 10 * 1024 * 1024;

// A fresh checkpoint serializes the whole DOM, so a page that outgrows the
// budget faster than this keeps its current checkpoint until the interval is up.
const MIN_FORCED_CHECKOUT_INTERVAL_MS = 30 * 1000;

const RRWEB_FULL_SNAPSHOT_EVENT_TYPE = 2;

// Allocation-free stand-in for JSON.stringify(value).length. It runs on every
// recorded event, so it must stay cheap next to rrweb's own serialization.
export const approximateSize = (value) => {
  if (typeof value === 'string') {
    return value.length + 2;
  }
  if (value === null || typeof value !== 'object') {
    return typeof value === 'number' ? String(value).length : 5;
  }

  let size = 2;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      size += approximateSize(value[i]) + 1;
    }
    return size;
  }
  for (const key in value) {
    size += key.length + 4 + approximateSize(value[key]);
  }
  return size;
};

export default class GleapReplayRecorder {
  startDate = undefined;
  // Events grouped into checkpoint segments so out-of-window checkpoints can be
  // dropped without ever cutting off the full snapshot a replay needs to start.
  segments = [[]];
  // Approximate serialized size per segment, and of the newest segment's
  // incremental events (everything after its Meta + FullSnapshot).
  segmentSizes = [0];
  incrementalSize = 0;
  lastForcedCheckout = 0;
  forcedCheckoutTimeout = undefined;
  stopFunction = undefined;
  customOptions = {};

  // GleapReplayRecorder singleton
  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new GleapReplayRecorder();
      return this.instance;
    } else {
      return this.instance;
    }
  }

  constructor() {}

  setOptions(options) {
    this.customOptions = options;

    // Re-apply immediately if we're already recording, so options set after the
    // recorder has started still take effect (otherwise they would only apply on
    // the next start). Restarting resets the rolling buffer.
    if (this.stopFunction) {
      this.start();
    }
  }

  /**
   * Start replays
   * @returns
   */
  start() {
    this.stop();

    this.startDate = Date.now();
    this.resetBuffer();

    var options = {
      inlineStylesheet: true,
      // Privacy: by default only password inputs are masked (rrweb's default), so
      // replays keep form values that are useful when debugging. Sites that want
      // every input masked can opt in via Gleap.setReplayOptions({ maskAllInputs: true }).
      // Per-element control uses rrweb's default class names: rr-block (replaced
      // with a same-size placeholder), rr-ignore (skipped) and rr-mask (text masked).
      // Strip non-visual DOM (scripts, comments, head meta) to shrink the payload.
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
      dataURLOptions: {
        quality: 0.7,
      },
      recordCanvas: false,
      // Roll a new full snapshot periodically so long sessions stay bounded.
      checkoutEveryNms: CHECKOUT_EVERY_MS,
      sampling: {
        scroll: 150,
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
      collectFonts: false,
      recordCrossOriginIframes: false,
    };

    try {
      this.stopFunction = record({
        ...options,
        ...this.customOptions,
        emit: (event, isCheckout) => {
          // A checkout Meta starts a new self-contained checkpoint. Open a fresh
          // segment and drop the oldest checkpoints beyond the retention cap.
          if (isCheckout && event && event.type === RRWEB_META_EVENT_TYPE) {
            this.segments.push([]);
            this.segmentSizes.push(0);
            this.incrementalSize = 0;
            while (this.segments.length > MAX_CHECKPOINTS) {
              this.dropOldestSegment();
            }
          }

          const size = approximateSize(event);
          this.segments[this.segments.length - 1].push(event);
          this.segmentSizes[this.segmentSizes.length - 1] += size;
          if (event && event.type !== RRWEB_META_EVENT_TYPE && event.type !== RRWEB_FULL_SNAPSHOT_EVENT_TYPE) {
            this.incrementalSize += size;
          }

          this.enforceBufferSize();
        },
      });
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * Starts recording only if it isn't already running.
   *
   * The recorder is started eagerly at SDK init and then again once the config
   * confirms web replays are enabled. Without this guard that second call (and
   * the cached-vs-server config double apply) would call start(), which tears
   * down and rebuilds the rolling buffer, throwing away everything captured so
   * far.
   */
  startIfNotRunning() {
    if (this.stopFunction) {
      return;
    }

    this.start();
  }

  /**
   * Stop replays
   * @returns
   */
  stop() {
    if (this.stopFunction) {
      this.stopFunction();
      this.stopFunction = undefined;
    }

    this.startDate = undefined;
    this.resetBuffer();
  }

  resetBuffer() {
    clearTimeout(this.forcedCheckoutTimeout);
    this.forcedCheckoutTimeout = undefined;
    this.segments = [[]];
    this.segmentSizes = [0];
    this.incrementalSize = 0;
  }

  dropOldestSegment() {
    this.segments.shift();
    this.segmentSizes.shift();
  }

  getBufferSize() {
    let size = 0;
    for (let i = 0; i < this.segmentSizes.length; i++) {
      size += this.segmentSizes[i];
    }
    return size;
  }

  /**
   * Keeps the buffer within MAX_BUFFER_SIZE. Whole checkpoints go first, oldest
   * first; the newest always stays, because a replay needs its full snapshot.
   */
  enforceBufferSize() {
    while (this.segments.length > 1 && this.getBufferSize() > MAX_BUFFER_SIZE) {
      this.dropOldestSegment();
    }

    // The newest checkpoint alone is over budget because its incremental events
    // outgrew it: start a fresh one, which lets the pass above drop this one and
    // keeps the most recent activity. A full snapshot that is over budget by
    // itself never triggers this, otherwise every checkpoint would force the next.
    if (this.getBufferSize() > MAX_BUFFER_SIZE && this.incrementalSize > MAX_BUFFER_SIZE / 2) {
      this.scheduleForcedCheckout();
    }
  }

  scheduleForcedCheckout() {
    if (this.forcedCheckoutTimeout) {
      return;
    }

    // Deferred on purpose: this runs inside rrweb's emit callback, and taking a
    // snapshot from there would re-enter the recorder mid-mutation.
    const wait = Math.max(0, this.lastForcedCheckout + MIN_FORCED_CHECKOUT_INTERVAL_MS - Date.now());
    this.forcedCheckoutTimeout = setTimeout(() => {
      this.forcedCheckoutTimeout = undefined;
      this.lastForcedCheckout = Date.now();
      try {
        record.takeFullSnapshot(true);
      } catch (e) {}
    }, wait);
  }

  /**
   * Get the current replay data
   * @returns {Promise<void>}
   */
  getReplayData() {
    // Flatten the checkpoint segments back into one ordered event stream.
    const events = [].concat(...this.segments);

    // Compress each event with @rrweb/packer to shrink the uploaded and stored
    // payload; the player decompresses via unpackFn. If packing ever throws we
    // fall back to raw events so a replay is never lost.
    let outputEvents = events;
    let packed = false;
    try {
      outputEvents = events.map((event) => pack(event));
      packed = true;
    } catch (e) {
      outputEvents = events;
      packed = false;
    }

    const replayResult = {
      startDate: this.startDate,
      events: outputEvents,
      packed,
      baseUrl: window.location.origin,
      width: window.innerWidth,
      height: window.innerHeight,
      isMobile: isMobile(),
      type: 'rrweb',
    };

    return replayResult;
  }
}
