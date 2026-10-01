import Gleap, {
  GleapFrameManager,
  GleapMetaDataManager,
  GleapAiChatbarManager,
  GleapNotificationManager,
  GleapSession,
  GleapAdminManager,
  GleapEventManager,
  GleapCaptureManager,
} from './Gleap';
import { getWebSocketCaps } from './GleapCaptureSettings';
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
const BACKOFF_JITTER = 0.2;
// A longer Retry-After from the server applies, up to this long.
const PING_MAX_RETRY_AFTER_MS = 5 * 60 * 1000;
const SESSION_STARTED_EVENT = 'sessionStarted';
// WebSocket reconnects: 1 s, doubled per failed connection up to 60 s, each ±20 %.
const WS_RECONNECT_FIRST_MS = 1000;
const WS_RECONNECT_MAX_MS = 60 * 1000;
// A connection that stayed open this long, or received a message, starts the backoff over.
const WS_STABLE_MS = 10 * 1000;

// `firstMs` doubled `doublings` times up to `maxMs`, times a factor between 0.8 and 1.2 (from `random`
// in [0, 1)), never more than `maxMs`.
const jitteredBackoff = (firstMs, doublings, maxMs, random) => {
  const base = Math.min(firstMs * Math.pow(2, Math.min(Math.max(doublings, 0), 16)), maxMs);
  const factor = 1 - BACKOFF_JITTER + 2 * BACKOFF_JITTER * Math.min(Math.max(random, 0), 1);
  return Math.min(base * factor, maxMs);
};

const isOffline = () => typeof navigator !== 'undefined' && !!navigator && navigator.onLine === false;

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
  // The pending reconnect (never more than one), the failed connections in a row, and when the
  // current socket opened (Date.now(), 0 while not open).
  reconnectTimeout = null;
  reconnectAttempts = 0;
  socketOpenedAt = 0;
  networkListenersAdded = false;
  handleOpenBound = null;
  handleErrorBound = null;
  handleMessageBound = null;
  handleCloseBound = null;
  handleOnlineBound = null;

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
    this.handleOnlineBound = this.handleOnline.bind(this);
  }

  // Closes the socket on purpose: its listeners go first, so this close never schedules a reconnect.
  cleanupWebSocket() {
    this.clearReconnectTimeout();

    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    if (this.pingWS) {
      clearInterval(this.pingWS);
      this.pingWS = null;
    }
    this.socketOpenedAt = 0;

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

    const session = GleapSession.getInstance().session;
    this.connectedWebSocketGleapId = session ? session.gleapId : null;

    if (!session || !session.gleapId || !GleapSession.getInstance().sdkKey) {
      return;
    }

    // What this page can capture for capture requests (contract §4, "SDK realtime").
    let caps = '';
    try {
      const capabilities = getWebSocketCaps();
      if (capabilities.length > 0) {
        caps = '&caps=' + capabilities.join(',');
      }
    } catch (exp) {}

    this.socket = new WebSocket(
      `${GleapSession.getInstance().wsApiUrl}?gleapId=${
        GleapSession.getInstance().session.gleapId
      }&gleapHash=${GleapSession.getInstance().session.gleapHash}&apiKey=${
        GleapSession.getInstance().sdkKey
      }&sdkVersion=${SDK_VERSION}${caps}`
    );
    this.socket.addEventListener('open', this.handleOpenBound);
    this.socket.addEventListener('message', this.handleMessageBound);
    this.socket.addEventListener('error', this.handleErrorBound);
    this.socket.addEventListener('close', this.handleCloseBound);
    this.addNetworkListeners();
  }

  clearReconnectTimeout() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Reconnects after 1 s, then 2, 4, 8, 16, 32 and at most 60 s (±20 %) while connections keep
   * failing. Nothing is scheduled while the browser is offline: the 'online' event reconnects.
   */
  scheduleReconnect() {
    this.clearReconnectTimeout();
    if (isOffline()) {
      return;
    }

    const delay = GleapStreamedEvent.reconnectDelay(this.reconnectAttempts, Math.random());
    this.reconnectAttempts += 1;
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      if (!isOffline()) {
        this.initWebSocket();
      }
    }, delay);
  }

  addNetworkListeners() {
    if (this.networkListenersAdded || typeof window === 'undefined' || !window || typeof window.addEventListener !== 'function') {
      return;
    }
    window.addEventListener('online', this.handleOnlineBound);
    this.networkListenersAdded = true;
  }

  removeNetworkListeners() {
    if (!this.networkListenersAdded) {
      return;
    }
    try {
      window.removeEventListener('online', this.handleOnlineBound);
    } catch (exp) {}
    this.networkListenersAdded = false;
  }

  // Back online: reconnect right away, with a fresh backoff.
  handleOnline() {
    if (this.socket && this.socket.readyState === this.socket.OPEN) {
      return;
    }
    this.reconnectAttempts = 0;
    this.initWebSocket();
  }

  handleOpen(event) {
    this.socketOpenedAt = Date.now();
    if (this.pingWS) {
      clearInterval(this.pingWS);
    }
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
    this.reconnectAttempts = 0;
    this.processMessage(JSON.parse(event.data));
  }

  handleError(error) {}

  // The connection dropped (the SDK's own closes remove this listener first): reconnect with backoff,
  // which starts over only after a connection that stayed open for 10 s or received a message.
  handleClose(event) {
    if (this.socketOpenedAt && Date.now() - this.socketOpenedAt >= WS_STABLE_MS) {
      this.reconnectAttempts = 0;
    }
    this.cleanupWebSocket();
    this.scheduleReconnect();
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

      // A log request from a teammate, AI agent or workflow (capture requests, kind 'logs').
      if (message.name === 'capture-request' && GleapCaptureManager) {
        GleapCaptureManager.getInstance().handleServerRequest(message.data);
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
    this.cleanupWebSocket();
    this.removeNetworkListeners();
    this.reconnectAttempts = 0;
    // So the next restart() connects again.
    this.connectedWebSocketGleapId = null;
  }

  cleanupMainLoop() {
    if (this.mainLoopTimeout) {
      clearTimeout(this.mainLoopTimeout);
      this.mainLoopTimeout = null;
    }
  }

  restart() {
    // Only reconnect websockets when needed. The new connection cancels a pending reconnect, so a
    // stale one can't replace it later.
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
   * right away. After a network error, a timeout, 408, 429 or a 5xx the events stay queued, any other
   * error answer drops them; either way the requests back off (see pingDidFinish) and the loop ticks
   * in between do nothing.
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
   * backoff. A network error, a timeout, 408, 429 or a 5xx keeps them queued, any other answer drops
   * them. After a failure the next ping waits 3 s, doubled per failure in a row
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

    // The server refused these events for good (e.g. 400, 401, 413): drop them, so they do not
    // hold back the rest of the queue. The next ping still backs off.
    if (!GleapStreamedEvent.isRetryablePingStatus(status)) {
      this.removeSentEvents(sentEvents);
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
    return jitteredBackoff(PING_BACKOFF_FIRST_MS, failures - 1, PING_BACKOFF_MAX_MS, random);
  }

  /**
   * The delay (ms) before the next WebSocket reconnect after `attempts` failed connections in a row:
   * 1 s doubled per attempt up to 60 s, times a factor between 0.8 and 1.2 (from `random` in [0, 1)),
   * never more than 60 s.
   */
  static reconnectDelay(attempts, random) {
    return jitteredBackoff(WS_RECONNECT_FIRST_MS, attempts, WS_RECONNECT_MAX_MS, random);
  }

  /**
   * Whether a failed ping is worth sending again: no answer (network error, timeout), 408, 429 or
   * a 5xx. Other error answers mean the server will not take these events.
   */
  static isRetryablePingStatus(status) {
    return !status || status === 408 || status === 429 || status >= 500;
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
