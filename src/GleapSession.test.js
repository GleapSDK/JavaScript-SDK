import GleapSession from './GleapSession';
import { saveToGleapCache, loadFromGleapCache, setGleapCookie, eraseGleapCookie, getGleapCookie } from './GleapHelper';

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

jest.mock('./GleapAiChatbarManager', () => ({
  __esModule: true,
  default: { instance: null },
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

describe('identify with a userHash on a session identified without one', () => {
  const USER_DATA = { email: 'bec@example.com', name: 'Bec' };
  const respondIdentified = (xhr) => xhr.respond(200, JSON.stringify({ ...CACHED_IDENTIFIED_SESSION }));

  it('sends the hashed identify once, although the cached session already has this user and data', () => {
    seedCachedSession();
    const session = buildSession();
    session.startSession();

    session.identifySession('user-1', USER_DATA, 'verified-hmac');

    expect(identifyRequests()).toHaveLength(1);
    expect(JSON.parse(identifyRequests()[0].body).userHash).toBe('verified-hmac');
    respondIdentified(identifyRequests()[0]);

    // The next page load: same cached session, same identify, nothing to prove again.
    const nextBoot = buildSession();
    nextBoot.startSession();
    nextBoot.identifySession('user-1', USER_DATA, 'verified-hmac');
    expect(identifyRequests()).toHaveLength(1);
  });

  it('sends it again when the hashed identify failed', () => {
    seedCachedSession();
    const session = buildSession();
    session.startSession();
    session.identifySession('user-1', USER_DATA, 'verified-hmac')?.catch?.(() => {});
    identifyRequests()[0].respond(503);

    const nextBoot = buildSession();
    nextBoot.startSession();
    nextBoot.identifySession('user-1', USER_DATA, 'verified-hmac');
    expect(identifyRequests()).toHaveLength(2);
  });

  it('still skips an unchanged identify without a hash', () => {
    seedCachedSession();
    const session = buildSession();
    session.startSession();
    session.identifySession('user-1', USER_DATA);
    expect(identifyRequests()).toHaveLength(0);
  });

  it('forgets the proof on logout', () => {
    seedCachedSession();
    const session = buildSession();
    session.startSession();
    session.identifySession('user-1', USER_DATA, 'verified-hmac');
    respondIdentified(identifyRequests()[0]);

    session.clearSession(0, false);
    seedCachedSession();
    const nextBoot = buildSession();
    nextBoot.startSession();
    nextBoot.identifySession('user-1', USER_DATA, 'verified-hmac');
    expect(identifyRequests()).toHaveLength(2);
  });
});

describe('user switch in the same browser', () => {
  const OTHER_USER_SESSION = {
    gleapId: 'gleap-id-b',
    gleapHash: 'gleap-hash-b',
    userId: 'user-2',
    email: 'other@example.com',
  };
  const sessionsRequest = () => MockXhr.instances.find((xhr) => xhr.url && xhr.url.endsWith('/sessions'));

  it('keeps the new contact when the older /sessions answer for the cached contact lands last', () => {
    seedCachedSession();
    const session = buildSession();
    session.startSession();
    session.identifySession('user-2', { email: 'other@example.com' });

    identifyRequests()[0].respond(200, JSON.stringify(OTHER_USER_SESSION));
    sessionsRequest().respond(200, JSON.stringify(CACHED_IDENTIFIED_SESSION));

    expect(session.session.userId).toBe('user-2');
    expect(session.session.gleapId).toBe('gleap-id-b');
    expect(cacheStore['session-sdk-key'].userId).toBe('user-2');
  });

  it('does not clear the new contact when the older /sessions request is rejected', () => {
    seedCachedSession();
    const session = buildSession();
    session.startSession();
    session.identifySession('user-2', { email: 'other@example.com' });

    identifyRequests()[0].respond(200, JSON.stringify(OTHER_USER_SESSION));
    sessionsRequest().respond(404);

    expect(session.session.userId).toBe('user-2');
    expect(session.ready).toBe(true);
  });

  it('still applies the /sessions answer when no identify replaced the session', () => {
    seedCachedSession();
    const session = buildSession();
    session.startSession();
    sessionsRequest().respond(200, JSON.stringify({ ...CACHED_IDENTIFIED_SESSION, name: 'Bec Renamed' }));

    expect(session.session.name).toBe('Bec Renamed');
  });

  it('holds a flow start until the identify has landed', () => {
    seedCachedSession();
    const session = buildSession();
    session.startSession();
    session.identifySession('user-2', { email: 'other@example.com' });

    const started = jest.fn(() => session.session.userId);
    session.onContactSettled(started);
    expect(started).not.toHaveBeenCalled();

    identifyRequests()[0].respond(200, JSON.stringify(OTHER_USER_SESSION));
    return Promise.resolve().then(() => {
      expect(started).toHaveBeenCalledTimes(1);
      expect(started.mock.results[0].value).toBe('user-2');
    });
  });
});

describe('authenticated file sessions', () => {
  it('keeps partial session updates independent of file identification', () => {
    const session = buildSession();
    session.validateSession({ ...CACHED_IDENTIFIED_SESSION });
    expect(() => session.updateSession({ email: CACHED_IDENTIFIED_SESSION.email })).not.toThrow();
  });
  it('does not postpone file refresh when ordinary session polling repeats', () => {
    const session = buildSession();
    session.lastIdentify = { userId: 'user-1', userData: {}, userHash: 'verified-hmac' };
    session.validateSession({ ...CACHED_IDENTIFIED_SESSION, fileAccessToken: 'file-session', fileAccessExpiresAt: new Date(Date.now() + 900000).toISOString() });
    jest.advanceTimersByTime(300000);
    session.validateSession({ ...CACHED_IDENTIFIED_SESSION });
    jest.advanceTimersByTime(300000);
    expect(identifyRequests()).toHaveLength(1);
  });
  it('re-verifies an unchanged cached identity when the project now requires authenticated files', () => {
    const session = buildSession();
    session.validateSession({ ...CACHED_IDENTIFIED_SESSION, authenticatedFilesRequired: true });
    session.identifySession('user-1', { email: 'bec@example.com', name: 'Bec' }, 'verified-hmac');
    expect(identifyRequests()).toHaveLength(1);
    expect(JSON.parse(identifyRequests()[0].body).userHash).toBe('verified-hmac');
  });
  it('preserves a still-valid file session on ordinary refresh but never across identity changes', () => {
    const session = buildSession();
    session.validateSession({ ...CACHED_IDENTIFIED_SESSION, fileAccessToken: 'file-session', fileAccessExpiresAt: new Date(Date.now() + 900000).toISOString() });
    session.validateSession({ ...CACHED_IDENTIFIED_SESSION });
    expect(session.session.fileAccessToken).toBe('file-session');
    session.validateSession({ ...CACHED_IDENTIFIED_SESSION, gleapId: 'different', userId: 'different-user' });
    expect(session.session.fileAccessToken).toBeUndefined();
  });
  it('refreshes file authentication with identity proof before its 15 minute expiry', () => {
    const session = buildSession();
    session.lastIdentify = { userId: 'user-1', userData: { email: 'bec@example.com' }, userHash: 'verified-hmac' };
    session.validateSession({ ...CACHED_IDENTIFIED_SESSION, fileAccessToken: 'file-session', fileAccessExpiresAt: new Date(Date.now() + 900000).toISOString() });
    jest.advanceTimersByTime(600000);
    expect(identifyRequests()).toHaveLength(1);
    expect(JSON.parse(identifyRequests()[0].body).userHash).toBe('verified-hmac');
  });
  it('revokes the file session on logout and cancels credential refresh', () => {
    const session = buildSession();
    session.validateSession({ ...CACHED_IDENTIFIED_SESSION, fileAccessToken: 'file-session', fileAccessExpiresAt: new Date(Date.now() + 900000).toISOString() });
    session.clearSession(0, false);
    const revoke = MockXhr.instances.find((xhr) => xhr.url.endsWith('/files/session/revoke'));
    expect(revoke.headers['X-File-Session']).toBe('file-session');
    expect(session.session.fileAccessToken).toBeUndefined();
    expect(session.lastIdentify).toBeNull();
  });
});

describe('identity tokens (setUserJwt)', () => {
  const b64url = (value) => Buffer.from(value).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const jwtOf = (payload) => `${b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${b64url(JSON.stringify(payload))}.c2ln`;
  const inSeconds = (seconds) => Math.floor(Date.now() / 1000) + seconds;
  const flush = async () => {
    for (let i = 0; i < 10; i++) {
      await Promise.resolve();
    }
  };
  const respondIdentified = (xhr) => xhr.respond(200, JSON.stringify({ ...CACHED_IDENTIFIED_SESSION }));
  const refusal = (code) => JSON.stringify({ status: 401, title: 'Unauthorized', detail: { value: code, message: code } });

  let warn;
  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    warn.mockRestore();
  });

  const readySession = () => {
    seedCachedSession();
    const session = buildSession();
    session.startSession();
    return session;
  };

  it('sends the decoded userId with the token as userHash and no contact fields', () => {
    const session = readySession();
    const token = jwtOf({ userId: 'user-1', email: 'ignored@example.com', exp: inSeconds(3600) });
    session.setUserJwt(token);

    expect(identifyRequests()).toHaveLength(1);
    const body = JSON.parse(identifyRequests()[0].body);
    expect(body.userId).toBe('user-1');
    expect(body.userHash).toBe(token);
    expect(body.email).toBeUndefined();
    expect(body.name).toBeUndefined();
  });

  it('refuses a bad token with a warning and no request', async () => {
    const session = readySession();
    await session.setUserJwt('not-a-jwt');
    await session.setUserJwt(jwtOf({ email: 'no-user@example.com' }));
    expect(identifyRequests()).toHaveLength(0);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('sends an unchanged token once, a re-minted one not again, and a token with changed claims once more', () => {
    const session = readySession();
    const first = jwtOf({ userId: 'user-1', plan: 'pro', iat: inSeconds(0), exp: inSeconds(3600) });
    session.setUserJwt(first);
    respondIdentified(identifyRequests()[0]);
    session.setUserJwt(first);
    expect(identifyRequests()).toHaveLength(1);

    // A backend that mints a fresh token per page load: same user and claims, new iat/exp/jti.
    session.setUserJwt(jwtOf({ userId: 'user-1', plan: 'pro', iat: inSeconds(60), exp: inSeconds(7200), jti: 'n2' }));
    expect(identifyRequests()).toHaveLength(1);

    const changed = jwtOf({ userId: 'user-1', plan: 'enterprise', exp: inSeconds(7200) });
    session.setUserJwt(changed);
    expect(identifyRequests()).toHaveLength(2);
    expect(JSON.parse(identifyRequests()[1].body).userHash).toBe(changed);
    respondIdentified(identifyRequests()[1]);
    session.setUserJwt(changed);
    expect(identifyRequests()).toHaveLength(2);
  });

  it('logs signature_required and resolves', async () => {
    const session = readySession();
    const done = session.setUserJwt(jwtOf({ userId: 'user-1' }));
    identifyRequests()[0].respond(401, refusal('signature_required'));
    await expect(done).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      'Gleap: this project enforces identity verification and the identify had no valid signature (signature_required). Pass a token from your backend to setUserJwt.'
    );
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('never rejects on a network error or a server error, and logs once', async () => {
    const session = readySession();
    const offline = session.setUserJwt(jwtOf({ userId: 'user-1' }));
    identifyRequests()[0].error();
    await expect(offline).resolves.toBeUndefined();
    expect(warn).toHaveBeenLastCalledWith(expect.stringContaining('network error'));

    const unavailable = session.setUserJwt(jwtOf({ userId: 'user-1', plan: 'x' }));
    identifyRequests()[1].respond(503, '');
    await expect(unavailable).resolves.toBeUndefined();
    expect(warn).toHaveBeenLastCalledWith(expect.stringContaining('HTTP 503'));
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('keeps the legacy hash identify keyed by user only', () => {
    const session = readySession();
    session.identifySession('user-1', { email: 'bec@example.com' }, 'verified-hmac');
    respondIdentified(identifyRequests()[0]);
    expect(cacheStore['signed-identify-sdk-key']).toBe('gleap-id-1:user-1');
  });

  it('on token_expired asks the provider once and retries with the new token', async () => {
    const session = readySession();
    const fresh = jwtOf({ userId: 'user-1', exp: inSeconds(3600) });
    const provider = jest.fn(() => Promise.resolve(fresh));
    session.setUserJwtProvider(provider);

    const done = session.setUserJwt(jwtOf({ userId: 'user-1', exp: inSeconds(-10) }));
    identifyRequests()[0].respond(401, refusal('token_expired'));
    await flush();

    expect(provider).toHaveBeenCalledTimes(1);
    expect(identifyRequests()).toHaveLength(2);
    expect(JSON.parse(identifyRequests()[1].body).userHash).toBe(fresh);
    respondIdentified(identifyRequests()[1]);
    await expect(done).resolves.toBeUndefined();
    expect(session.lastIdentify.userHash).toBe(fresh);
  });

  it('retries only once and shares one provider call', async () => {
    const session = readySession();
    const provider = jest.fn(() => Promise.resolve(jwtOf({ userId: 'user-1', exp: inSeconds(-5) })));
    session.setUserJwtProvider(provider);

    const done = session.setUserJwt(jwtOf({ userId: 'user-1', exp: inSeconds(-10) }));
    const parallel = [session.requestUserJwt(), session.requestUserJwt()];
    identifyRequests()[0].respond(401, refusal('token_expired'));
    await flush();
    await Promise.all(parallel);
    expect(provider).toHaveBeenCalledTimes(1);

    identifyRequests()[1].respond(401, refusal('token_expired'));
    await expect(done).resolves.toBeUndefined();
    expect(identifyRequests()).toHaveLength(2);
  });

  it('pauses 30 s after a provider failure', async () => {
    const session = buildSession();
    const provider = jest.fn(() => Promise.reject(new Error('offline')));
    session.setUserJwtProvider(provider);

    expect(await session.requestUserJwt()).toBeNull();
    expect(await session.requestUserJwt()).toBeNull();
    expect(provider).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(30 * 1000);
    await session.requestUserJwt();
    expect(provider).toHaveBeenCalledTimes(2);
  });

  it('gives up on a provider after 10 s', async () => {
    const session = buildSession();
    session.setUserJwtProvider(() => new Promise(() => {}));
    const pending = session.requestUserJwt();
    jest.advanceTimersByTime(10 * 1000);
    expect(await pending).toBeNull();
  });

  it.each(['token_expired', 'token_invalid'])('keeps the local session on %s', async (code) => {
    const session = readySession();
    const done = session.setUserJwt(jwtOf({ userId: 'user-1' }));
    identifyRequests()[0].respond(401, refusal(code));
    await expect(done).resolves.toBeUndefined();

    expect(session.session.gleapId).toBe('gleap-id-1');
    expect(session.ready).toBe(true);
    expect(saveToGleapCache).not.toHaveBeenCalledWith('session-sdk-key', null);
    expect(warn).toHaveBeenCalled();
  });

  it('asks the provider before a file-access renewal when the token expires within 5 minutes', async () => {
    const session = buildSession();
    const fresh = jwtOf({ userId: 'user-1', exp: inSeconds(3600) });
    const provider = jest.fn(() => fresh);
    session.setUserJwtProvider(provider);
    session.lastIdentify = { userId: 'user-1', userData: {}, userHash: jwtOf({ userId: 'user-1', exp: inSeconds(60) }) };
    session.validateSession({ ...CACHED_IDENTIFIED_SESSION, fileAccessToken: 'file-session', fileAccessExpiresAt: new Date(Date.now() + 900000).toISOString() });

    jest.advanceTimersByTime(600000);
    await flush();
    expect(provider).toHaveBeenCalledTimes(1);
    expect(identifyRequests()).toHaveLength(1);
    expect(JSON.parse(identifyRequests()[0].body).userHash).toBe(fresh);
  });

  it('clearIdentity drops the token and auth tokens but keeps the provider', () => {
    const session = readySession();
    const provider = jest.fn();
    session.setUserJwtProvider(provider);
    session.setUserJwt(jwtOf({ userId: 'user-1' }));
    session.authTokens = { backend: 'secret' };
    session.clearSession(0, false);
    expect(session.lastIdentify).toBeNull();
    expect(session.authTokens).toEqual({});
    expect(session.jwtProvider).toBe(provider);
  });
});

describe('auth tokens (setAuthTokens)', () => {
  const authTokenRequests = () => MockXhr.instances.filter((xhr) => xhr.url && xhr.url.endsWith('/sessions/auth-tokens'));
  let warn;
  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    warn.mockRestore();
  });

  const readySession = () => {
    seedCachedSession();
    const session = buildSession();
    session.startSession();
    return session;
  };

  it('skips invalid names with a warning and sends the rest with the session headers', () => {
    const session = readySession();
    session.setAuthTokens({ backend: 'a', '1bad': 'b', 'has space': 'c', ['x'.repeat(41)]: 'd', crm_v2: 'e', number: 5 });

    expect(warn).toHaveBeenCalledTimes(4);
    expect(authTokenRequests()).toHaveLength(1);
    const request = authTokenRequests()[0];
    expect(JSON.parse(request.body)).toEqual({ tokens: { backend: 'a', crm_v2: 'e' } });
    expect(request.headers['Gleap-Id']).toBe('gleap-id-1');
    expect(request.headers['Gleap-Hash']).toBe('gleap-hash-1');
    expect(request.headers['Api-Token']).toBe('sdk-key');
  });

  it('sends nothing when every name is invalid', () => {
    const session = readySession();
    session.setAuthTokens({ '-x': 'a' });
    expect(authTokenRequests()).toHaveLength(0);
  });

  it('a null value deletes the token from memory and is sent as null', () => {
    const session = readySession();
    session.setAuthTokens({ backend: 'a', crm: 'b' });
    session.setAuthTokens({ crm: null });
    expect(session.authTokens).toEqual({ backend: 'a' });
    expect(JSON.parse(authTokenRequests()[1].body)).toEqual({ tokens: { crm: null } });
  });

  it('warns on 401 and keeps the session', async () => {
    const session = readySession();
    const done = session.setAuthTokens({ backend: 'a' });
    authTokenRequests()[0].respond(401, '{"detail":{"value":"signature_required"}}');
    await done;
    expect(warn).toHaveBeenCalledTimes(1);
    expect(session.session.gleapId).toBe('gleap-id-1');
  });

  it('resends the tokens after a signed identify on a session they were not sent to', async () => {
    const session = readySession();
    session.setAuthTokens({ backend: 'a' });
    authTokenRequests()[0].respond(401, '{}');
    await Promise.resolve();

    session.identifySession('user-9', {}, 'verified-hmac');
    identifyRequests()[0].respond(200, JSON.stringify({ gleapId: 'gleap-id-9', gleapHash: 'gleap-hash-9', userId: 'user-9' }));
    await Promise.resolve();
    await Promise.resolve();

    expect(authTokenRequests()).toHaveLength(2);
    expect(authTokenRequests()[1].headers['Gleap-Id']).toBe('gleap-id-9');
    expect(JSON.parse(authTokenRequests()[1].body)).toEqual({ tokens: { backend: 'a' } });
  });
});

describe('grant (signed session credential)', () => {
  const b64url = (value) => Buffer.from(value).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const jwtOf = (payload) => `${b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${b64url(JSON.stringify(payload))}.c2ln`;
  const inSeconds = (seconds) => Math.floor(Date.now() / 1000) + seconds;
  const flush = async () => {
    for (let i = 0; i < 10; i++) {
      await Promise.resolve();
    }
  };
  const grantFor = (sid, exp = inSeconds(3600)) => jwtOf({ sid, uid: 'user-1', kid: 'k1', kind: 'jwt', iat: inSeconds(0), exp });
  const respondWithGrant = (xhr, grant, extra = {}) =>
    xhr.respond(200, JSON.stringify({ ...CACHED_IDENTIFIED_SESSION, ...extra, identity: { signed: true, kid: 'k1', kind: 'jwt', grant } }));

  let warn;
  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    setGleapCookie.mockClear();
    eraseGleapCookie.mockClear();
    getGleapCookie.mockReset().mockImplementation(() => null);
  });
  afterEach(() => {
    warn.mockRestore();
  });

  const readySession = () => {
    seedCachedSession();
    const session = buildSession();
    session.startSession();
    return session;
  };

  it('keeps the grant out of the persisted session and sends it on later requests', () => {
    const session = readySession();
    const grant = grantFor('gleap-id-1');
    session.setUserJwt(jwtOf({ userId: 'user-1', exp: inSeconds(3600) }));
    respondWithGrant(identifyRequests()[0], grant);

    expect(session.grant).toBe(grant);
    expect(JSON.stringify(session.session)).not.toContain(grant);
    expect(JSON.stringify(cacheStore['session-sdk-key'])).not.toContain(grant);
    const sessionCookieWrites = setGleapCookie.mock.calls.filter(([name]) => name === 'session-sdk-key');
    expect(sessionCookieWrites.every(([, value]) => !decodeURIComponent(value).includes(grant))).toBe(true);
    expect(setGleapCookie).toHaveBeenCalledWith('gleap-grant-sdk-key', encodeURIComponent(grant), expect.any(Number), true);

    session.updateSession({ name: 'Other' });
    const update = MockXhr.instances.find((xhr) => xhr.url.endsWith('/sessions/partialupdate'));
    expect(update.headers['Gleap-Grant']).toBe(grant);
    const xhr = new MockXhr();
    session.injectSession(xhr);
    expect(xhr.headers['Gleap-Grant']).toBe(grant);
  });

  it('restores the grant from its cookie only for the same session', () => {
    getGleapCookie.mockImplementation((name) => (name === 'gleap-grant-sdk-key' ? encodeURIComponent(grantFor('gleap-id-1')) : null));
    const session = readySession();
    expect(session.grant).toBe(grantFor('gleap-id-1'));
    expect(MockXhr.instances[0].headers['Gleap-Grant']).toBe(grantFor('gleap-id-1'));

    getGleapCookie.mockImplementation((name) => (name === 'gleap-grant-sdk-key' ? encodeURIComponent(grantFor('someone-else')) : null));
    const other = readySession();
    expect(other.grant).toBe(null);
  });

  it('drops the grant when the session changes to another gleapId', () => {
    const session = readySession();
    session.setUserJwt(jwtOf({ userId: 'user-1', exp: inSeconds(3600) }));
    respondWithGrant(identifyRequests()[0], grantFor('gleap-id-1'));
    session.validateSession({ gleapId: 'gleap-id-2', gleapHash: 'gleap-hash-2' });
    expect(session.grant).toBe(null);
  });

  it('clearSession drops the grant and erases its cookie', () => {
    const session = readySession();
    session.setUserJwt(jwtOf({ userId: 'user-1', exp: inSeconds(3600) }));
    respondWithGrant(identifyRequests()[0], grantFor('gleap-id-1'));
    const provider = jest.fn();
    session.setUserJwtProvider(provider);
    session.clearSession(0, false);
    expect(session.grant).toBe(null);
    expect(eraseGleapCookie).toHaveBeenCalledWith('gleap-grant-sdk-key');
    expect(session.jwtProvider).toBe(provider);
  });

  it('identifies again when the stored grant is gone, not when it is live', () => {
    const session = readySession();
    const token = jwtOf({ userId: 'user-1', exp: inSeconds(3600) });
    session.setUserJwt(token);
    respondWithGrant(identifyRequests()[0], grantFor('gleap-id-1'));
    session.setUserJwt(token);
    expect(identifyRequests()).toHaveLength(1);

    session.setGrant(null, false);
    session.setUserJwt(token);
    expect(identifyRequests()).toHaveLength(2);
  });

  it('identity_mismatch: drops the session and retries once as a fresh visitor', async () => {
    const session = readySession();
    session.setAuthTokens({ backend: 'abc' });
    const token = jwtOf({ userId: 'user-2', exp: inSeconds(3600) });
    session.setUserJwt(token).catch(() => {});
    identifyRequests()[0].respond(400, JSON.stringify({ error: { details: { value: 'identity_mismatch' } } }));
    await flush();

    expect(session.session.gleapId).toBe(null);
    const sessionsRequests = MockXhr.instances.filter((xhr) => xhr.url.endsWith('/sessions'));
    const fresh = sessionsRequests[sessionsRequests.length - 1];
    expect(fresh.headers['Gleap-Id']).toBeUndefined();
    fresh.respond(200, JSON.stringify({ gleapId: 'gleap-id-new', gleapHash: 'gleap-hash-new' }));

    expect(identifyRequests()).toHaveLength(2);
    expect(identifyRequests()[1].headers['Gleap-Id']).toBe('gleap-id-new');
    expect(JSON.parse(identifyRequests()[1].body).userHash).toBe(token);
    expect(session.authTokens).toEqual({ backend: 'abc' });

    identifyRequests()[1].respond(400, JSON.stringify({ error: { details: { value: 'identity_mismatch' } } }));
    await flush();
    expect(identifyRequests()).toHaveLength(2);
    expect(session.session.gleapId).toBe('gleap-id-new');
  });

  describe('refresh', () => {
    const shortGrant = (lifetimeSeconds, iatOffset = 0) =>
      jwtOf({ sid: 'gleap-id-1', uid: 'user-1', kid: 'k1', kind: 'jwt', iat: inSeconds(iatOffset), exp: inSeconds(iatOffset + lifetimeSeconds) });
    const signIn = (session, grant) => {
      session.setUserJwt(jwtOf({ userId: 'user-1', exp: inSeconds(3600) }));
      respondWithGrant(identifyRequests()[identifyRequests().length - 1], grant);
    };

    it('renews a minute before the grant lifetime ends, counted from receipt', async () => {
      const session = readySession();
      signIn(session, shortGrant(3600));
      jest.advanceTimersByTime(3540 * 1000 - 1);
      expect(identifyRequests()).toHaveLength(1);
      jest.advanceTimersByTime(1);
      await flush();
      expect(identifyRequests()).toHaveLength(2);
    });

    it('a 60-70 s grant waits 30 s and renews at most once a minute (no loop)', async () => {
      const session = readySession();
      signIn(session, shortGrant(65));
      jest.advanceTimersByTime(29 * 1000);
      expect(identifyRequests()).toHaveLength(1);
      jest.advanceTimersByTime(1000);
      await flush();
      expect(identifyRequests()).toHaveLength(2);

      // The refresh answers with another short grant: the next refresh waits for the minute.
      jest.advanceTimersByTime(1000);
      respondWithGrant(identifyRequests()[1], shortGrant(65, 1));
      await flush();
      jest.advanceTimersByTime(30 * 1000);
      await flush();
      expect(identifyRequests()).toHaveLength(2);
      jest.advanceTimersByTime(29 * 1000);
      await flush();
      expect(identifyRequests()).toHaveLength(3);
    });

    it('a fast device clock does not make a fresh grant due at once', async () => {
      const session = readySession();
      // Issued by a server whose clock is two hours behind the device: exp already lies in the device's past.
      signIn(session, shortGrant(3600, -7200));
      jest.advanceTimersByTime(60 * 1000);
      await flush();
      expect(identifyRequests()).toHaveLength(1);
      jest.advanceTimersByTime(3480 * 1000);
      await flush();
      expect(identifyRequests()).toHaveLength(2);
    });

    it('skips while a refresh is in flight', async () => {
      const session = readySession();
      signIn(session, shortGrant(65));
      jest.advanceTimersByTime(30 * 1000);
      await flush();
      expect(identifyRequests()).toHaveLength(2);
      expect(session.grantRefreshInFlight).toBe(true);
      // Re-arming for the same grant while the refresh runs sends nothing more.
      session.armGrantRefresh(session.grant, Date.now());
      jest.advanceTimersByTime(120 * 1000);
      await flush();
      expect(identifyRequests()).toHaveLength(2);
      identifyRequests()[1].error();
      await flush();
      expect(session.grantRefreshInFlight).toBe(false);
    });
  });

  it('sends sessionDuration with identify', () => {
    const session = readySession();
    session.setSessionDuration(60 * 60 * 1000);
    session.setUserJwt(jwtOf({ userId: 'user-1', exp: inSeconds(3600) }));
    expect(JSON.parse(identifyRequests()[0].body).sessionDuration).toBe(3600000);
  });
});
