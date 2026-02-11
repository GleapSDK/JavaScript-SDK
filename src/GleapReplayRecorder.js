import { isMobile } from './GleapHelper';
import { record } from '@rrweb/record';

export default class GleapReplayRecorder {
  startDate = undefined;
  events = [];
  bufferSize = 0;
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
  }

  /**
   * Start replays
   * @returns
   */
  start() {
    this.stop();

    this.startDate = Date.now();
    var events = this.events;

    var options = {
      inlineStylesheet: true,
      blockClass: 'gl-block',
      ignoreClass: 'gl-ignore',
      maskTextClass: 'gl-mask',
      dataURLOptions: {
        quality: 0.7,
      },
      recordCanvas: false,
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
        emit(rrwebEvent) {
          const { event } = ensureMaxMessageSize(rrwebEvent);
          events.push(event);
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
    }

    this.startDate = undefined;
    this.events = [];
    this.bufferSize = 0;
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

export function ensureMaxMessageSize(data) {
  let stringifiedData = JSON.stringify(data);
  if (stringifiedData.length > 4000000) {
    const dataURIRegex = /data:([\w\/\-\.]+);(\w+),([^)"]*)/gim;
    const matches = stringifiedData.matchAll(dataURIRegex);
    for (const match of matches) {
      if (match[1].toLocaleLowerCase().slice(0, 6) === 'image/') {
        stringifiedData = stringifiedData.replace(
          match[0],
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAQSURBVHgBAQUA+v8ABRg5/wHSAVZN1mnaAAAAAElFTkSuQmCC'
        );
      } else {
        stringifiedData = stringifiedData.replace(match[0], '');
      }
    }
  }
  return { event: JSON.parse(stringifiedData), size: stringifiedData.length };
}
