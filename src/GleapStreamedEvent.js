import Gleap, {
  GleapFrameManager,
  GleapMetaDataManager,
  GleapAiChatbarManager,
  GleapNotificationManager,
  GleapSession,
  GleapAdminManager,
  GleapEventManager,
} from './Gleap';
import { gleapDataParser } from './GleapHelper';

// At most this many events wait for a ping; the oldest ones (other than a session start) make room.
const MAX_QUEUED_EVENTS = 500;
// One ping carries the oldest events up to these limits; the rest follows once it was delivered.
const MAX_EVENTS_PER_PING = 100;
const MAX_PING_BYTES = 256 * 1024;
// A ping still without an answer after this long counts as failed.
const PING_TIMEOUT_MS = 30 * 1000;
// After failed pings: 3 s, doubled per failure up to 60 s, each ±20 % so clients don't retry in step.
const PING_BACKOFF_FIRST_MS = 3 * 1000;
const PING_BACKOFF_MAX_MS = 60 * 1000;
const PING_BACKOFF_JITTER = 0.2;
// A longer Retry-After from the server applies, up to this long.
const PING_MAX_RETRY_AFTER_MS = 5 * 60 * 1000;
const SESSION_STARTED_EVENT = 'sessionStarted';

let textEncoder = null;
const byteLength = (text) => {
  try {
    if (!textEncoder && typeof TextEncoder !== 'undefined') {
      textEncoder = new TextEncoder();
    }
    if (textEncoder) {
      return textEncoder.encode(text).length;
    }
  } catch (exp) {}
  return text.length;
};

export default class GleapStreamedEvent {
  eventArray = [];
  // Events waiting for a ping, oldest first.
  streamedEventArray = [];
  eventMaxLength = 500;
  // The ping waiting for its answer, 0 when none is: never more than one at a time.
  pingInFlight = 0;
  lastPingId = 0;
  // Failed pings in a row, and the time (Date.now()) before which no ping goes out.
  pingFailures = 0;
  pingRetryAt = 0;
  lastUrl = undefined;
  mainLoopTimeout = null;
  socket = null;
  connectedWebSocketGleapId = null;
  connectionTimeout = null;
  pingWS = null;
  handleOpenBound = null;
  handleErrorBound = null;
  handleMessageBound = null;
  handleCloseBound = null;

  // GleapStreamedEvent singleton
  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new GleapStreamedEvent();
      return this.instance;
    } else {
      return this.instance;
    }
  }

  constructor() {
    this.handleOpenBound = this.handleOpen.bind(this);
    this.handleErrorBound = this.handleError.bind(this);
    this.handleMessageBound = this.handleMessage.bind(this);
    this.handleCloseBound = this.handleClose.bind(this);
  }

  cleanupWebSocket() {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    if (this.pingWS) {
      clearInterval(this.pingWS);
    }

    if (this.socket) {
      this.socket.removeEventListener('open', this.handleOpenBound);
      this.socket.removeEventListener('error', this.handleErrorBound);
      this.socket.removeEventListener('message', this.handleMessageBound);
      this.socket.removeEventListener('close', this.handleCloseBound);
      this.socket.close();
      this.socket = null;
    }
  }

  initWebSocket() {
    this.cleanupWebSocket();

    this.connectedWebSocketGleapId = GleapSession.getInstance().session.gleapId;

    if (!GleapSession.getInstance().session || !GleapSession.getInstance().sdkKey) {
      return;
    }

    this.socket = new WebSocket(
      `${GleapSession.getInstance().wsApiUrl}?gleapId=${
        GleapSession.getInstance().session.gleapId
      }&gleapHash=${GleapSession.getInstance().session.gleapHash}&apiKey=${
        GleapSession.getInstance().sdkKey
      }&sdkVersion=${SDK_VERSION}`
    );
    this.socket.addEventListener('open', this.handleOpenBound);
    this.socket.addEventListener('message', this.handleMessageBound);
    this.socket.addEventListener('error', this.handleErrorBound);
    this.socket.addEventListener('close', this.handleCloseBound);
  }

  handleOpen(event) {
    this.pingWS = setInterval(() => {
      if (this.socket.readyState === this.socket.OPEN) {
        this.socket.send('PING');
        this.socket.send(0x9);
      }
    }, 10000);

    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  handleMessage(event) {
    this.processMessage(JSON.parse(event.data));
  }

  handleError(error) {}

  handleClose(event) {
    setTimeout(() => {
      this.initWebSocket();
    }, 5000);
  }

  processMessage(message) {
    try {
      if (GleapAdminManager.getInstance().initialized) {
        return;
      }

      if (message.name === 'update') {
        const { a, u, ai, rc } = message.data;

        const isOpened = GleapFrameManager.getInstance().isOpened();

        // A conversation was read (possibly in another tab): drop its pending
        // notification bubbles + shared cache entries BEFORE applying new
        // actions, so a stale popup can't outlive the read.
        if (rc) {
          GleapNotificationManager.getInstance().clearNotificationsForConversation(rc);
        }

        // Apply the chatbar config BEFORE performing actions, so a notification
        // delivered in the same update is routed with up-to-date availability.
        // Otherwise the first post-(re)connect chatbar pill leaks to the widget
        // because config.enabled isn't set yet when showNotification runs.
        if (ai) {
          GleapAiChatbarManager.getInstance().setConfig({
            enabled: ai.e ?? false,
            placeholder: ai.p,
            quickActions: ai.a,
            style: ai.s,
            workflowId: ai.w ?? null,
          });
        }

        if (a) {
          const listOfActionsWhereIgnoreOpened = ['banner', 'modal'];
          const filteredActions = a.filter(
            (action) => !isOpened || listOfActionsWhereIgnoreOpened.includes(action?.actionType?.toLowerCase())
          );

          Gleap.getInstance().performActions(filteredActions);
        }

        if (u != null) {
          GleapNotificationManager.getInstance().setNotificationCount(u);
        }
      }

      if (message.name === 'checklist' && message?.data && window) {
        const checklistData = message.data;
        const completedSteps = checklistData.completedSteps ?? [];
        const completedStepsBefore = checklistData.completedStepsBefore ?? [];
        if (completedSteps.length > completedStepsBefore.length) {
          for (let i = 0; i < completedSteps.length; i++) {
            const step = checklistData?.steps?.find((step) => step.id === completedSteps[i]);
            if (!step) {
              continue;
            }
            const stepIndex = i;
            if (!completedStepsBefore.includes(step)) {
              GleapEventManager.notifyEvent('checklist-step-completed', {
                checklistId: checklistData.id,
                outboundId: checklistData.outboundId,
                stepId: step.id,
                stepIndex: stepIndex,
                step: step,
                completedSteps: checklistData.completedSteps,
                status: checklistData.status,
                data: checklistData,
              });
            }
          }
        }
        if (checklistData.status === 'done') {
          GleapEventManager.notifyEvent('checklist-completed', {
            checklistId: checklistData.id,
            outboundId: checklistData.outboundId,
            completedSteps: checklistData.completedSteps,
            status: checklistData.status,
            data: checklistData,
          });
        }
        if (typeof window.dispatchEvent === 'function') {
          window.dispatchEvent(new CustomEvent('checkListUpdate', { detail: message.data }));
        }
      }
    } catch (exp) {}
  }

  getEventArray() {
    return this.eventArray;
  }

  stop() {
    this.cleanupMainLoop();
  }

  cleanupMainLoop() {
    if (this.mainLoopTimeout) {
      clearTimeout(this.mainLoopTimeout);
      this.mainLoopTimeout = null;
    }
  }

  restart() {
    // Only reconnect websockets when needed.
    if (this.connectedWebSocketGleapId !== GleapSession.getInstance().session.gleapId) {
      this.initWebSocket();
    }

    this.cleanupMainLoop();
    this.trackInitialEvents();
    this.runEventStreamLoop();
  }

  start() {
    this.startPageListener();
  }

  trackInitialEvents() {
    GleapStreamedEvent.getInstance().logEvent('sessionStarted');
    GleapStreamedEvent.getInstance().logCurrentPage();
  }

  logCurrentPage() {
    if (Gleap.getInstance().disablePageTracking) {
      return;
    }

    const currentUrl = window.location.href;
    if (currentUrl && currentUrl !== this.lastUrl) {
      this.lastUrl = currentUrl;
      this.logEvent('pageView', {
        page: currentUrl,
      });
    }
  }

  startPageListener() {
    const self = this;
    setInterval(function () {
      self.logCurrentPage();

      // Re-evaluate notification page rules on URL changes so bubbles hide
      // on excluded pages and come back on allowed ones. Deliberately outside
      // logCurrentPage: disablePageTracking only disables pageView streaming,
      // not page rules.
      try {
        GleapNotificationManager.getInstance().checkPageRulesForUrl(window.location.href);
      } catch (exp) {}
    }, 1000);
  }

  logEvent(name, data) {
    var log = {
      name,
      date: new Date(),
    };
    if (data) {
      log.data = gleapDataParser(data);
    }
    this.eventArray.push(log);
    this.streamedEventArray.push(log);

    // Check max size of event log
    if (this.eventArray.length > this.eventMaxLength) {
      this.eventArray.shift();
    }

    this.trimStreamedEvents();
  }

  // Keeps the events waiting for a ping at the limit: the oldest one that is not a session start
  // makes room, or the oldest one when all are.
  trimStreamedEvents() {
    while (this.streamedEventArray.length > MAX_QUEUED_EVENTS) {
      const index = this.streamedEventArray.findIndex((event) => !event || event.name !== SESSION_STARTED_EVENT);
      this.streamedEventArray.splice(index !== -1 ? index : 0, 1);
    }
  }

  runEventStreamLoop = () => {
    const self = this;
    try {
      this.streamEvents();
    } catch (exp) {}

    this.mainLoopTimeout = setTimeout(function () {
      self.runEventStreamLoop();
    }, 2500);
  };

  /**
   * Streams the queued events to the backend: only with a session and an open WebSocket, one
   * request at a time, the oldest events first and at most 100 events or about 256 KB per request.
   * Events leave the queue once a 2xx answer delivered them, and the rest of a longer queue follows
   * right away. After a 429, a 5xx, any other error answer, a network error or a timeout the events
   * stay queued and the requests back off (see pingDidFinish); the loop ticks in between do nothing.
   */
  streamEvents = () => {
    const sessionInstance = GleapSession.getInstance();
    const session = sessionInstance.session;
    if (!sessionInstance.ready || !session || !session.gleapId || !session.gleapHash) {
      return;
    }

    if (this.pingInFlight || Date.now() < this.pingRetryAt) {
      return;
    }

    // Nothing to stream.
    if (this.streamedEventArray.length === 0) {
      return;
    }

    // Sockets not connected.
    if (!this.socket || this.socket.readyState !== this.socket.OPEN) {
      return;
    }

    const { events, hasMore } = this.nextPingBatch();
    if (events.length === 0) {
      return;
    }

    this.lastPingId += 1;
    const pingId = this.lastPingId;
    this.pingInFlight = pingId;

    const http = new XMLHttpRequest();
    let timeout = null;
    // Runs once per ping: later calls find another (or no) ping in flight.
    const finish = () => {
      clearTimeout(timeout);
      this.pingDidFinish(pingId, events, hasMore, http);
    };
    timeout = setTimeout(() => {
      try {
        http.abort();
      } catch (exp) {}
      finish();
    }, PING_TIMEOUT_MS);

    try {
      http.open('POST', sessionInstance.apiUrl + '/sessions/events');
      http.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
      sessionInstance.injectSession(http);
      http.onerror = finish;
      http.onreadystatechange = function () {
        if (http.readyState === 4) {
          finish();
        }
      };

      http.send(
        JSON.stringify({
          time: GleapMetaDataManager.getInstance().getSessionDuration(),
          events,
          opened: GleapFrameManager.getInstance().isOpened(),
          type: 'js',
          sdkVersion: SDK_VERSION,
          ws: true,
        })
      );
    } catch (exp) {
      finish();
    }
  };

  /**
   * The answer to a ping (or its timeout). A 2xx removes exactly the events it carried and resets the
   * backoff. Anything else keeps them queued; the next ping waits 3 s, doubled per failure in a row
   * up to 60 s, each ±20 %, or the server's longer Retry-After (up to 5 minutes).
   */
  pingDidFinish(pingId, sentEvents, hasMore, http) {
    // Nobody waits for this answer any more.
    if (this.pingInFlight !== pingId) {
      return;
    }
    this.pingInFlight = 0;

    const status = http.status;
    if (status >= 200 && status < 300) {
      this.pingFailures = 0;
      this.pingRetryAt = 0;
      this.removeSentEvents(sentEvents);
      if (hasMore) {
        this.streamEvents();
      }
      return;
    }

    let retryAfter = -1;
    try {
      retryAfter = GleapStreamedEvent.parseRetryAfter(http.getResponseHeader('Retry-After'));
    } catch (exp) {}
    this.pingFailures += 1;
    let delay = GleapStreamedEvent.pingBackoffDelay(this.pingFailures, Math.random());
    if (retryAfter > 0) {
      delay = Math.max(delay, Math.min(retryAfter, PING_MAX_RETRY_AFTER_MS));
    }
    this.pingRetryAt = Date.now() + delay;
  }

  // The oldest queued events for one ping: at most 100, and no more than about 256 KB of JSON (a
  // single larger event goes alone). An event that cannot be sent as JSON is dropped, so it does not
  // hold back the others.
  nextPingBatch() {
    const events = [];
    const broken = [];
    // The brackets of the array, and a comma per event.
    let bytes = 2;
    for (let i = 0; i < this.streamedEventArray.length && events.length < MAX_EVENTS_PER_PING; i++) {
      const event = this.streamedEventArray[i];
      let size;
      try {
        size = byteLength(JSON.stringify(event)) + 1;
      } catch (exp) {
        broken.push(event);
        continue;
      }
      if (events.length > 0 && bytes + size > MAX_PING_BYTES) {
        break;
      }
      events.push(event);
      bytes += size;
    }
    if (broken.length > 0) {
      this.streamedEventArray = this.streamedEventArray.filter((event) => broken.indexOf(event) === -1);
    }
    return { events, hasMore: events.length < this.streamedEventArray.length };
  }

  // Removes exactly the delivered events; events tracked while the ping was in flight wait for the next one.
  removeSentEvents(sentEvents) {
    const sent = new Set(sentEvents);
    this.streamedEventArray = this.streamedEventArray.filter((event) => !sent.has(event));
  }

  /**
   * The delay (ms) after `failures` failed pings in a row: 3 s doubled per failure up to 60 s, times a
   * factor between 0.8 and 1.2 (from `random` in [0, 1)), never more than 60 s.
   */
  static pingBackoffDelay(failures, random) {
    const doublings = Math.min(Math.max(failures - 1, 0), 5);
    const base = Math.min(PING_BACKOFF_FIRST_MS * Math.pow(2, doublings), PING_BACKOFF_MAX_MS);
    const factor = 1 - PING_BACKOFF_JITTER + 2 * PING_BACKOFF_JITTER * Math.min(Math.max(random, 0), 1);
    return Math.min(base * factor, PING_BACKOFF_MAX_MS);
  }

  /**
   * A Retry-After value (delay-seconds or an HTTP date) in ms from `now`: 0 for a date in the past,
   * -1 without a valid value.
   */
  static parseRetryAfter(value, now = Date.now()) {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (!trimmed) {
      return -1;
    }
    if (/^\d+$/.test(trimmed)) {
      return parseInt(trimmed, 10) * 1000;
    }
    const date = Date.parse(trimmed);
    return isNaN(date) ? -1 : Math.max(0, date - now);
  }
}
