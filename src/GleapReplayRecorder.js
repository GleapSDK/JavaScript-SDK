import { isMobile } from "./GleapHelper";
import { rrwebRecord } from "./RRWebRecorder.js";

export default class GleapReplayRecorder {
  startDate = undefined;
  events = [];
  stopFunction = undefined;

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

  constructor() { }

  /**
   * Start replays
   * @returns 
   */
  start() {
    this.stop();

    this.startDate = Date.now();
    var events = this.events;

    try {
      this.stopFunction = rrwebRecord({
        emit(event) {
          events.push(event);
        },
        recordCanvas: true,
        blockClass: "gl-block",
        ignoreClass: "gl-ignore",
        maskTextClass: "gl-mask",
      });
    } catch (e) { }
  }

  /**
   * Stop replays
   * @returns 
   */
  stop() {
    if (this.stopFunction) {
      this.stopFunction();
    }

    this.startDate = undefined;
    this.events = [];
  }

  /**
   * Get the current replay data
   * @returns {Promise<void>}
   */
  getReplayData() {
    const replayResult = {
      startDate: this.startDate,
      events: this.events,
      baseUrl: window.location.origin,
      width: window.innerWidth,
      height: window.innerHeight,
      isMobile: isMobile(),
      type: 'rrweb',
    };

    return replayResult;
  }
}
