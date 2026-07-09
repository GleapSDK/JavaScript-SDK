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

export default class GleapReplayRecorder {
  startDate = undefined;
  // Events grouped into checkpoint segments so out-of-window checkpoints can be
  // dropped without ever cutting off the full snapshot a replay needs to start.
  segments = [[]];
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
    this.segments = [[]];

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
            while (this.segments.length > MAX_CHECKPOINTS) {
              this.segments.shift();
            }
          }

          this.segments[this.segments.length - 1].push(event);
        },
      });
    } catch (e) {
      console.error(e);
    }
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
    this.segments = [[]];
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
