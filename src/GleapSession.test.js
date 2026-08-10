import GleapSession from './GleapSession';
import { saveToGleapCache, loadFromGleapCache } from './GleapHelper';

// The session manager only needs the sibling managers to exist; none of the
// paths under test depend on their behavior beyond being callable.
jest.mock('./Gleap', () => ({
  GleapBannerManager: { getInstance: jest.fn(() => ({ removeBannerUI: jest.fn() })) },
  GleapEventManager: { notifyEvent: jest.fn() },
  GleapFrameManager: {
    getInstance: jest.fn(() => ({ sendMessage: jest.fn(), sendSessionUpdate: jest.fn() })),
  },
  GleapModalManager: { getInstance: jest.fn(() => ({ hideModal: jest.fn() })) },
  GleapNotificationManager: {
    getInstance: jest.fn(() => ({ clearAllNotifications: jest.fn(), setNotificationCount: jest.fn() })),
  },
  GleapStreamedEvent: { getInstance: jest.fn(() => ({ restart: jest.fn(), stop: jest.fn() })) },
  GleapTranslationManager: { getInstance: jest.fn(() => ({ getActiveLanguage: () => 'en' })) },
}));

jest.mock('./ChecklistNetworkManager', () => ({
  __esModule: true,
  default: { getInstance: jest.fn(() => ({ clearCache: jest.fn() })) },
}));

jest.mock('./AgentNetworkManager', () => ({
  __esModule: true,
  default: { getInstance: jest.fn(() => ({ clearCache: jest.fn() })) },
}));

jest.mock('./GleapTooltipManager', () => ({
  __esModule: true,
  default: { getInstance: jest.fn(() => ({ destroy: jest.fn(), load: jest.fn() })) },
}));

jest.mock('./GleapHelper', () => ({
  eraseGleapCookie: jest.fn(),
  getDeviceType: jest.fn(() => 'desktop'),
  getGleapCookie: jest.fn(() => null),
  loadFromGleapCache: jest.fn(() => null),
  saveToGleapCache: jest.fn(),
  setGleapCookie: jest.fn(),
}));

// Minimal XHR double: tests drive responses explicitly via respond()/error().
class MockXhr {
  static instances = [];

  constructor() {
    MockXhr.instances.push(this);
    this.headers = {};
    this.readyState = 0;
  }

  open(method, url) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(key, value) {
    this.headers[key] = value;
  }

  send(body) {
    this.body = body;
  }

  respond(status, responseText) {
    this.status = status;
    this.responseText = responseText || '';
    this.readyState = 4;
    if (this.onreadystatechange) {
      this.onreadystatechange();
    }
  }

  error() {
    if (this.onerror) {
      this.onerror();
    }
  }
}

const CACHED_IDENTIFIED_SESSION = {
  gleapId: 'gleap-id-1',
  gleapHash: 'gleap-hash-1',
  userId: 'user-1',
  email: 'bec@example.com',
  name: 'Bec',
};

const identifyRequests = () => MockXhr.instances.filter((xhr) => xhr.url && xhr.url.endsWith('/sessions/identify'));

// Stateful cache double so clearSession's persisted null is observable on the
// next load, like the real localStorage-backed cache.
let cacheStore = {};
const seedCachedSession = () => {
  cacheStore['session-sdk-key'] = { ...CACHED_IDENTIFIED_SESSION };
};

const buildSession = () => {
  const session = new GleapSession();
  session.sdkKey = 'sdk-key';
  return session;
};

beforeEach(() => {
  jest.useFakeTimers();
  MockXhr.instances = [];
  global.XMLHttpRequest = MockXhr;
  // No dispatchEvent on purpose: validateSession guards on its existence, and
  // node has no CustomEvent to construct.
  global.window = { addEventListener: jest.fn() };
  cacheStore = {};
  loadFromGleapCache.mockReset().mockImplementation((key) => (key in cacheStore ? cacheStore[key] : null));
  saveToGleapCache.mockReset().mockImplementation((key, value) => {
    cacheStore[key] = value;
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('startSession failure handling', () => {
  it.each([503, 0])('keeps the cached identified session on a transient failure (status %s) and retries with it', (status) => {
    seedCachedSession();
    const session = buildSession();

    session.startSession();
    expect(session.ready).toBe(true);

    MockXhr.instances[0].respond(status);

    // Identity survives the failed renewal.
    expect(session.session.gleapId).toBe('gleap-id-1');
    expect(session.session.userId).toBe('user-1');
    expect(session.ready).toBe(true);
    expect(saveToGleapCache).not.toHaveBeenCalledWith(expect.anything(), null);

    // The retry re-sends the same session credentials.
    jest.advanceTimersByTime(10 * 1000);
    const retry = MockXhr.instances[1];
    expect(retry).toBeDefined();
    expect(retry.headers['Gleap-Id']).toBe('gleap-id-1');
    expect(retry.headers['Gleap-Hash']).toBe('gleap-hash-1');
  });

  it('clears the session when the server explicitly rejects it (4xx)', () => {
    seedCachedSession();
    const session = buildSession();

    session.startSession();
    MockXhr.instances[0].respond(404);

    expect(session.session.gleapId).toBe(null);
    expect(session.ready).toBe(false);
    expect(saveToGleapCache).toHaveBeenCalledWith(expect.anything(), null);

    // Retry happens without stale credentials.
    jest.advanceTimersByTime(0);
    const retry = MockXhr.instances[1];
    expect(retry).toBeDefined();
    expect(retry.headers['Gleap-Id']).toBeUndefined();
  });

  it('still retries via clearSession when there is no cached session to preserve', () => {
    const session = buildSession();

    session.startSession();
    MockXhr.instances[0].respond(503);

    expect(session.session.gleapId).toBe(null);
    jest.advanceTimersByTime(0);
    expect(MockXhr.instances.length).toBe(2);
  });

  it('does not retry and does not clear on 429', () => {
    seedCachedSession();
    const session = buildSession();

    session.startSession();
    MockXhr.instances[0].respond(429);

    expect(session.session.gleapId).toBe('gleap-id-1');
    jest.advanceTimersByTime(60 * 60 * 1000);
    expect(MockXhr.instances.length).toBe(1);
  });
});

describe('identify replay', () => {
  it('replays a consumed identify when the session is recreated anonymously', () => {
    seedCachedSession();
    const session = buildSession();
    session.startSession();

    // Matches the cached identity, so this is consumed as a no-op.
    session.identifySession('user-1', { email: 'bec@example.com', name: 'Bec' });
    expect(identifyRequests().length).toBe(0);

    // The session gets recreated without identity (e.g. renewal failed and a
    // fresh anonymous session came back).
    session.validateSession({ gleapId: 'gleap-id-2', gleapHash: 'gleap-hash-2' });

    const replays = identifyRequests();
    expect(replays.length).toBe(1);
    expect(replays[0].headers['Gleap-Id']).toBe('gleap-id-2');
    expect(JSON.parse(replays[0].body).userId).toBe('user-1');
  });

  it('does not replay after clearSession (logout)', () => {
    seedCachedSession();
    const session = buildSession();
    session.startSession();

    session.identifySession('user-1', { email: 'bec@example.com', name: 'Bec' });
    session.clearSession(0, false);

    session.validateSession({ gleapId: 'gleap-id-3', gleapHash: 'gleap-hash-3' });
    expect(identifyRequests().length).toBe(0);
  });

  it('does not replay when the recreated session is already identified', () => {
    seedCachedSession();
    const session = buildSession();
    session.startSession();

    session.identifySession('user-1', { email: 'bec@example.com', name: 'Bec' });
    session.validateSession({
      gleapId: 'gleap-id-4',
      gleapHash: 'gleap-hash-4',
      userId: 'user-1',
      email: 'bec@example.com',
    });

    expect(identifyRequests().length).toBe(0);
  });
});
