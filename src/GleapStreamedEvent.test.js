import Gleap, { GleapMetaDataManager, GleapNotificationManager, GleapSession } from './Gleap';
import GleapStreamedEvent from './GleapStreamedEvent';

// Stub the barrel so the real GleapStreamedEvent loads without a DOM or the
// SDK_VERSION Webpack global.
jest.mock('./Gleap', () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
  GleapFrameManager: { getInstance: jest.fn(() => ({ isOpened: () => false })) },
  GleapMetaDataManager: { getInstance: jest.fn(() => ({})) },
  GleapAiChatbarManager: { getInstance: jest.fn(() => ({})) },
  GleapNotificationManager: { getInstance: jest.fn() },
  GleapSession: { getInstance: jest.fn(() => ({})) },
  GleapAdminManager: { getInstance: jest.fn(() => ({})) },
  GleapEventManager: { notifyEvent: jest.fn() },
}));

jest.mock('./GleapHelper', () => ({
  gleapDataParser: (data) => data,
}));

describe('startPageListener — notification page-rule re-evaluation (#141052)', () => {
  let checkPageRulesForUrl;

  beforeEach(() => {
    jest.useFakeTimers();
    checkPageRulesForUrl = jest.fn();
    GleapNotificationManager.getInstance.mockReturnValue({ checkPageRulesForUrl });
    global.window = { location: { href: 'https://app.example.com/a' } };
  });

  afterEach(() => {
    jest.useRealTimers();
    delete global.window;
  });

  test('re-evaluates page rules every tick, even with page tracking disabled', () => {
    Gleap.getInstance.mockReturnValue({ disablePageTracking: true });
    const streamer = new GleapStreamedEvent();
    const logEventSpy = jest.spyOn(streamer, 'logEvent');

    streamer.startPageListener();

    jest.advanceTimersByTime(1000);
    expect(checkPageRulesForUrl).toHaveBeenCalledWith('https://app.example.com/a');
    // disablePageTracking must only suppress pageView streaming, not page rules.
    expect(logEventSpy).not.toHaveBeenCalled();

    global.window.location.href = 'https://app.example.com/b';
    jest.advanceTimersByTime(1000);
    expect(checkPageRulesForUrl).toHaveBeenLastCalledWith('https://app.example.com/b');
  });

  test('still streams pageView events when page tracking is enabled', () => {
    Gleap.getInstance.mockReturnValue({ disablePageTracking: false });
    const streamer = new GleapStreamedEvent();
    const logEventSpy = jest.spyOn(streamer, 'logEvent');

    streamer.startPageListener();
    jest.advanceTimersByTime(1000);

    expect(logEventSpy).toHaveBeenCalledWith('pageView', { page: 'https://app.example.com/a' });
    expect(checkPageRulesForUrl).toHaveBeenCalledWith('https://app.example.com/a');
  });
});

describe('event pings', () => {
  let requests;

  class FakeXHR {
    constructor() {
      this.readyState = 0;
      this.status = 0;
      this.responseHeaders = {};
      requests.push(this);
    }
    open(method, url) {
      this.url = url;
      this.readyState = 1;
    }
    setRequestHeader() {}
    getResponseHeader(name) {
      return this.responseHeaders[name] ?? null;
    }
    send(body) {
      this.events = JSON.parse(body).events;
    }
    respond(status, headers = {}) {
      this.status = status;
      this.responseHeaders = headers;
      this.readyState = 4;
      this.onreadystatechange();
    }
    fail() {
      this.readyState = 4;
      this.onreadystatechange();
      this.onerror();
    }
    abort() {
      this.aborted = true;
      this.fail();
    }
  }

  let sessionInstance;
  const createStreamer = () => {
    const streamer = new GleapStreamedEvent();
    streamer.socket = { readyState: 1, OPEN: 1 };
    return streamer;
  };
  const names = (events) => events.map((event) => event.name);
  const lastRequest = () => requests[requests.length - 1];
  // Advances the clock and runs a loop tick; true when that tick sent a ping.
  const tickAfter = (streamer, ms) => {
    const count = requests.length;
    jest.advanceTimersByTime(ms);
    streamer.streamEvents();
    return requests.length > count;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    requests = [];
    global.XMLHttpRequest = FakeXHR;
    global.SDK_VERSION = 'test';
    sessionInstance = {
      ready: true,
      session: { gleapId: 'id', gleapHash: 'hash' },
      apiUrl: 'https://api.test',
      injectSession: jest.fn(),
    };
    GleapSession.getInstance.mockReturnValue(sessionInstance);
    GleapMetaDataManager.getInstance.mockReturnValue({ getSessionDuration: () => 1 });
    // No jitter: every delay is exactly its base value.
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    delete global.XMLHttpRequest;
    delete global.SDK_VERSION;
  });

  test('no ping without a session, events stay queued', () => {
    const streamer = createStreamer();
    streamer.logEvent('a');

    sessionInstance.ready = false;
    streamer.streamEvents();
    sessionInstance.ready = true;
    sessionInstance.session = { gleapId: null, gleapHash: null };
    streamer.streamEvents();
    expect(requests).toHaveLength(0);
    expect(names(streamer.streamedEventArray)).toEqual(['a']);

    sessionInstance.session = { gleapId: 'id', gleapHash: 'hash' };
    streamer.streamEvents();
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe('https://api.test/sessions/events');
  });

  test('one ping in flight at a time, a hanging ping times out after 30 s and keeps its events', () => {
    const streamer = createStreamer();
    streamer.logEvent('a');
    streamer.streamEvents();
    streamer.logEvent('b');
    expect(tickAfter(streamer, 29999)).toBe(false);

    // Timed out: aborted, counted as a failure, the events stay and go again after the backoff.
    jest.advanceTimersByTime(1);
    expect(requests[0].aborted).toBe(true);
    expect(names(streamer.streamedEventArray)).toEqual(['a', 'b']);
    expect(tickAfter(streamer, 2999)).toBe(false);
    expect(tickAfter(streamer, 1)).toBe(true);
    expect(names(lastRequest().events)).toEqual(['a', 'b']);
  });

  test('backs off 3, 6, 12, 24, 48, 60 s on 429, 5xx, 408 and network errors, and resets after a 2xx', () => {
    const streamer = createStreamer();
    streamer.logEvent('a');
    streamer.streamEvents();

    const failures = [(r) => r.respond(429), (r) => r.respond(503), (r) => r.respond(408), (r) => r.fail()];
    [3000, 6000, 12000, 24000, 48000, 60000, 60000].forEach((delay, i) => {
      failures[i % failures.length](lastRequest());
      expect(names(streamer.streamedEventArray)).toEqual(['a']);
      expect(tickAfter(streamer, delay - 1)).toBe(false);
      expect(tickAfter(streamer, 1)).toBe(true);
    });

    lastRequest().respond(204);
    streamer.logEvent('b');
    streamer.streamEvents();
    lastRequest().respond(429);
    expect(tickAfter(streamer, 2999)).toBe(false);
    expect(tickAfter(streamer, 1)).toBe(true);
  });

  test('jitter stays within ±20 % and the delay never exceeds 60 s', () => {
    expect(GleapStreamedEvent.pingBackoffDelay(1, 0)).toBe(2400);
    expect(GleapStreamedEvent.pingBackoffDelay(1, 0.999999)).toBeCloseTo(3600, 0);
    expect(GleapStreamedEvent.pingBackoffDelay(5, 0)).toBe(38400);
    expect(GleapStreamedEvent.pingBackoffDelay(5, 0.999999)).toBeCloseTo(57600, 0);
    expect(GleapStreamedEvent.pingBackoffDelay(6, 0)).toBe(48000);
    expect(GleapStreamedEvent.pingBackoffDelay(6, 0.999999)).toBe(60000);
    expect(GleapStreamedEvent.pingBackoffDelay(50, 0.999999)).toBe(60000);
  });

  test('honours Retry-After in seconds and as an HTTP date, capped at 5 minutes', () => {
    const streamer = createStreamer();
    streamer.logEvent('a');
    streamer.streamEvents();

    // Seconds, longer than the 3 s backoff.
    lastRequest().respond(429, { 'Retry-After': '20' });
    expect(tickAfter(streamer, 19999)).toBe(false);
    expect(tickAfter(streamer, 1)).toBe(true);

    // HTTP date, 90 s from now.
    lastRequest().respond(503, { 'Retry-After': new Date(Date.now() + 90000).toUTCString() });
    expect(tickAfter(streamer, 89999)).toBe(false);
    expect(tickAfter(streamer, 1)).toBe(true);

    // An hour is capped at 5 minutes.
    lastRequest().respond(429, { 'Retry-After': '3600' });
    expect(tickAfter(streamer, 299999)).toBe(false);
    expect(tickAfter(streamer, 1)).toBe(true);

    // A shorter Retry-After than the backoff (now 24 s) does not shorten it.
    lastRequest().respond(429, { 'Retry-After': '1' });
    expect(tickAfter(streamer, 23999)).toBe(false);
    expect(tickAfter(streamer, 1)).toBe(true);
  });

  test('a 2xx removes exactly the sent events, events tracked meanwhile stay', () => {
    const streamer = createStreamer();
    streamer.logEvent('a');
    streamer.logEvent('b');
    streamer.streamEvents();
    streamer.logEvent('c');

    lastRequest().respond(200);
    expect(names(streamer.streamedEventArray)).toEqual(['c']);
    // Not sent right away: 'c' was not queued when the ping went out.
    expect(requests).toHaveLength(1);
    streamer.streamEvents();
    expect(names(lastRequest().events)).toEqual(['c']);
  });

  test('sends at most 100 events per ping, oldest first, and the rest right after a 2xx', () => {
    const streamer = createStreamer();
    for (let i = 0; i < 250; i++) {
      streamer.logEvent(`e${i}`);
    }
    streamer.streamEvents();
    expect(lastRequest().events).toHaveLength(100);
    expect(lastRequest().events[0].name).toBe('e0');

    // A failed ping does not send the next batch.
    lastRequest().respond(500);
    expect(requests).toHaveLength(1);
    tickAfter(streamer, 3000);

    lastRequest().respond(200);
    expect(requests).toHaveLength(3);
    expect(names(lastRequest().events).slice(0, 2)).toEqual(['e100', 'e101']);
    lastRequest().respond(200);
    expect(names(lastRequest().events)).toHaveLength(50);
    lastRequest().respond(200);
    expect(requests).toHaveLength(4);
    expect(streamer.streamedEventArray).toHaveLength(0);
  });

  test('drops the events of a ping the server refuses (other 4xx) and still backs off', () => {
    const streamer = createStreamer();
    streamer.logEvent('a');
    streamer.streamEvents();
    streamer.logEvent('b');
    lastRequest().respond(413);
    expect(names(streamer.streamedEventArray)).toEqual(['b']);
    expect(tickAfter(streamer, 2999)).toBe(false);
    expect(tickAfter(streamer, 1)).toBe(true);
    expect(names(lastRequest().events)).toEqual(['b']);
  });

  test('keeps a ping at about 256 KB, a larger event goes alone', () => {
    const streamer = createStreamer();
    const data = (kb) => ({ text: 'x'.repeat(kb * 1024) });
    streamer.logEvent('big', data(300));
    streamer.logEvent('a', data(100));
    streamer.logEvent('b', data(100));
    streamer.logEvent('c', data(100));

    streamer.streamEvents();
    expect(names(lastRequest().events)).toEqual(['big']);
    lastRequest().respond(200);
    expect(names(lastRequest().events)).toEqual(['a', 'b']);
    lastRequest().respond(200);
    expect(names(lastRequest().events)).toEqual(['c']);
  });

  test('caps the queue at 500 events, dropping the oldest but keeping the session start', () => {
    const streamer = createStreamer();
    streamer.logEvent('sessionStarted');
    for (let i = 0; i < 600; i++) {
      streamer.logEvent(`e${i}`);
    }
    expect(streamer.streamedEventArray).toHaveLength(500);
    expect(names(streamer.streamedEventArray.slice(0, 2))).toEqual(['sessionStarted', 'e101']);
    expect(streamer.streamedEventArray[499].name).toBe('e599');
  });
});

describe('WebSocket reconnects', () => {
  let sockets;
  let sessionInstance;
  let online;
  let navigatorDescriptor;

  class FakeWebSocket {
    constructor(url) {
      this.url = url;
      this.OPEN = 1;
      this.readyState = 0;
      this.listeners = {};
      sockets.push(this);
    }
    addEventListener(type, listener) {
      (this.listeners[type] = this.listeners[type] || []).push(listener);
    }
    removeEventListener(type, listener) {
      this.listeners[type] = (this.listeners[type] || []).filter((l) => l !== listener);
    }
    emit(type, event = {}) {
      (this.listeners[type] || []).slice().forEach((listener) => listener(event));
    }
    send() {}
    open() {
      this.readyState = 1;
      this.emit('open');
    }
    // Closed by the SDK: the browser still fires 'close' at the listeners left on it.
    close() {
      this.closedBySdk = true;
      this.readyState = 3;
      this.emit('close', { code: 1005 });
    }
    // Dropped by the network or the server.
    drop() {
      this.readyState = 3;
      this.emit('close', { code: 1006 });
    }
  }

  const createStreamer = () => {
    const streamer = new GleapStreamedEvent();
    streamer.initWebSocket();
    return streamer;
  };
  const latest = () => sockets[sockets.length - 1];
  // Advances the clock; true when a new socket was opened in that time.
  const reconnectsAfter = (ms) => {
    const count = sockets.length;
    jest.advanceTimersByTime(ms);
    return sockets.length > count;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    sockets = [];
    online = true;
    global.WebSocket = FakeWebSocket;
    global.SDK_VERSION = 'test';
    global.window = new EventTarget();
    navigatorDescriptor = Object.getOwnPropertyDescriptor(global, 'navigator');
    Object.defineProperty(global, 'navigator', { configurable: true, get: () => ({ onLine: online }) });
    sessionInstance = { session: { gleapId: 'id', gleapHash: 'hash' }, sdkKey: 'key', wsApiUrl: 'wss://ws.test' };
    GleapSession.getInstance.mockReturnValue(sessionInstance);
    // No jitter: every delay is exactly its base value.
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    delete global.WebSocket;
    delete global.SDK_VERSION;
    delete global.window;
    delete global.navigator;
    if (navigatorDescriptor) {
      Object.defineProperty(global, 'navigator', navigatorDescriptor);
    }
  });

  test('reconnects after 1, 2, 4, 8, 16, 32 and at most 60 s, with ±20 % jitter', () => {
    createStreamer();
    [1000, 2000, 4000, 8000, 16000, 32000, 60000, 60000].forEach((delay) => {
      latest().drop();
      expect(reconnectsAfter(delay - 1)).toBe(false);
      expect(reconnectsAfter(1)).toBe(true);
    });

    expect(GleapStreamedEvent.reconnectDelay(0, 0)).toBe(800);
    expect(GleapStreamedEvent.reconnectDelay(0, 0.999999)).toBeCloseTo(1200, 0);
    expect(GleapStreamedEvent.reconnectDelay(5, 0)).toBe(25600);
    expect(GleapStreamedEvent.reconnectDelay(5, 0.999999)).toBeCloseTo(38400, 0);
    expect(GleapStreamedEvent.reconnectDelay(6, 0)).toBe(48000);
    expect(GleapStreamedEvent.reconnectDelay(6, 0.999999)).toBe(60000);
    expect(GleapStreamedEvent.reconnectDelay(100, 0.999999)).toBe(60000);
  });

  test('the backoff starts over only after a connection stayed open 10 s or received a message', () => {
    createStreamer();
    latest().drop();
    expect(reconnectsAfter(1000)).toBe(true);

    // Accepted, then closed before 10 s: still backs off.
    latest().open();
    jest.advanceTimersByTime(9999);
    latest().drop();
    expect(reconnectsAfter(1999)).toBe(false);
    expect(reconnectsAfter(1)).toBe(true);

    // Open for 10 s: 1 s again.
    latest().open();
    jest.advanceTimersByTime(10000);
    latest().drop();
    expect(reconnectsAfter(999)).toBe(false);
    expect(reconnectsAfter(1)).toBe(true);

    // A message counts as a working connection too.
    latest().drop();
    expect(reconnectsAfter(2000)).toBe(true);
    latest().open();
    latest().emit('message', { data: JSON.stringify({ name: 'noop' }) });
    latest().drop();
    expect(reconnectsAfter(999)).toBe(false);
    expect(reconnectsAfter(1)).toBe(true);
  });

  test('only one reconnect is pending, and a new connection (restart after identify) cancels it', () => {
    const streamer = createStreamer();
    latest().open();
    latest().drop();
    streamer.handleClose({});
    // Just the reconnect: no second one and no ping interval of the dropped socket.
    expect(jest.getTimerCount()).toBe(1);

    jest.spyOn(streamer, 'trackInitialEvents').mockImplementation(() => {});
    jest.spyOn(streamer, 'runEventStreamLoop').mockImplementation(() => {});
    sessionInstance.session = { gleapId: 'id2', gleapHash: 'hash2' };
    streamer.restart();
    expect(sockets).toHaveLength(2);
    const fresh = latest();
    fresh.open();

    // The stale reconnect never fires to replace the fresh socket.
    expect(reconnectsAfter(120000)).toBe(false);
    expect(fresh.closedBySdk).toBeUndefined();
    expect(fresh.url).toContain('gleapId=id2');
  });

  test('offline: no reconnect until the browser is back online, then right away with a fresh backoff', () => {
    createStreamer();
    latest().drop();
    expect(reconnectsAfter(1000)).toBe(true);
    latest().drop();

    // Offline while a reconnect is pending: it does not connect, and nothing retries.
    online = false;
    expect(reconnectsAfter(10 * 60 * 1000)).toBe(false);

    online = true;
    window.dispatchEvent(new Event('online'));
    expect(sockets).toHaveLength(3);
    latest().drop();
    expect(reconnectsAfter(999)).toBe(false);
    expect(reconnectsAfter(1)).toBe(true);

    // A drop while offline schedules nothing.
    online = false;
    latest().drop();
    expect(jest.getTimerCount()).toBe(0);

    // Back online with an open socket: it is kept.
    online = true;
    window.dispatchEvent(new Event('online'));
    latest().open();
    window.dispatchEvent(new Event('online'));
    expect(sockets).toHaveLength(5);
    expect(latest().closedBySdk).toBeUndefined();
  });

  test('closes by the SDK itself never reconnect', () => {
    const streamer = createStreamer();
    const first = latest();
    first.open();
    streamer.cleanupWebSocket();
    expect(first.closedBySdk).toBe(true);
    expect(reconnectsAfter(120000)).toBe(false);

    // Gleap.destroy(): closes the socket, and 'online' no longer reconnects.
    streamer.initWebSocket();
    const second = latest();
    second.open();
    streamer.stop();
    expect(second.closedBySdk).toBe(true);
    expect(reconnectsAfter(120000)).toBe(false);
    window.dispatchEvent(new Event('online'));
    expect(sockets).toHaveLength(2);
  });
});
