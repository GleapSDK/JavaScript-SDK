import ChecklistNetworkManager from './ChecklistNetworkManager';
import AgentNetworkManager from './AgentNetworkManager';
import {
  GleapBannerManager,
  GleapEventManager,
  GleapFrameManager,
  GleapModalManager,
  GleapNotificationManager,
  GleapStreamedEvent,
  GleapTranslationManager,
} from './Gleap';
import {
  eraseGleapCookie,
  getDeviceType,
  getGleapCookie,
  loadFromGleapCache,
  saveToGleapCache,
  setGleapCookie,
} from './GleapHelper';
import GleapTooltipManager from './GleapTooltipManager';
import GleapAiChatbarManager from './GleapAiChatbarManager';
import { GLEAP_DEFAULT_REGION, GLEAP_REGIONS, resolveGleapRegion } from './GleapRegions';
import { decodeGrant, decodeUserJwt, fingerprintOf, identityFingerprintOf, identifyRefusalOf, isUserJwt } from './GleapUserJwt';

const AUTH_TOKEN_NAME = /^[a-zA-Z][a-zA-Z0-9_-]{0,39}$/;
const JWT_PROVIDER_TIMEOUT_MS = 10 * 1000;
const JWT_PROVIDER_BACKOFF_MS = 30 * 1000;
const JWT_REFRESH_WINDOW_MS = 5 * 60 * 1000;
// Cookie lifetime for a grant without an exp claim (the server's default session max age).
const GRANT_FALLBACK_LIFETIME_DAYS = 7;
// Grant refresh: a minute before the grant's own lifetime runs out, never
// sooner than 30 s after it arrived, at most one refresh identify a minute.
const GRANT_REFRESH_MARGIN_MS = 60 * 1000;
const GRANT_REFRESH_MIN_DELAY_MS = 30 * 1000;
const GRANT_REFRESH_MIN_INTERVAL_MS = 60 * 1000;
// A refresh that failed or could not run yet is tried again after this pause.
const GRANT_REFRESH_RETRY_MS = 60 * 1000;
const SIGNATURE_REQUIRED_WARNING =
  'Gleap: this project enforces identity verification and the identify had no valid signature (signature_required). Pass a token from your backend to setUserJwt.';

export default class GleapSession {
  region = GLEAP_DEFAULT_REGION;
  apiUrl = GLEAP_REGIONS[GLEAP_DEFAULT_REGION].apiUrl;
  wsApiUrl = GLEAP_REGIONS[GLEAP_DEFAULT_REGION].wsApiUrl;
  // Left undefined by default so the messenger keeps its environment/default
  // realtime hostname. Set explicitly by setRegion or Gleap.setRealtimeHost.
  realtimeHost = undefined;
  sdkKey = null;
  updatingSession = false;
  fileRefreshTimeout = null;
  useCookies = true;
  localStorageDisabled = false;
  session = {
    gleapId: null,
    gleapHash: null,
    name: '',
    email: '',
    userId: '',
    phone: '',
    value: 0,
  };
  ready = false;
  onSessionReadyListener = [];
  // Last Gleap.identify() arguments, kept so an identify that was consumed
  // against a session that later gets recreated (transient /sessions failure,
  // explicit server rejection) can be replayed against the new session.
  // Memory-only on purpose: cleared on clearSession so a logged-out user is
  // never re-identified from stale state.
  lastIdentify = null;
  identifyInFlight = false;
  // `<gleapId>:<userId>` once an identify with a userHash for that user landed on
  // that session (memory, plus the cache unless localStorage is disabled).
  // An unchanged identify is skipped, but a session identified without a hash
  // before (an older app version, identity verification switched on later, a
  // sign-up identified before it could get one) still has to send the hash
  // once: only that request lets the server mark the contact as proved.
  // Keyed by user, never by the hash itself, so no credential is stored. An
  // identity token (JWT) adds a fingerprint of the token, so a new token is
  // sent once even when the user and the data are unchanged.
  signedIdentity = null;
  // Gleap.setUserJwtProvider: asked for a fresh identity token when the stored
  // one expired or is about to. One call at a time, then a pause after a failure.
  jwtProvider = null;
  jwtProviderRequest = null;
  jwtProviderFailedAt = 0;
  // Gleap.setAuthTokens: memory only; resent when a signed identify lands on
  // a session they were not sent to yet.
  authTokens = {};
  authTokensSentFor = null;
  // identify / updateContact requests still waiting for the server. A survey
  // started meanwhile would get the previous contact (Surveys 2.0 skips the
  // contact questions an identified contact already answered), so showSurvey
  // waits for them (onContactSettled).
  pendingContactUpdates = 0;
  contactSettledListeners = [];
  // Bumped whenever an identify / updateContact result (or a logout) replaces the session. A
  // /sessions response for a request sent before that describes the previous contact and is dropped.
  contactVersion = 0;
  // The grant: the server-signed session credential a signed identify returns
  // (`identity.grant`). Sent as `Gleap-Grant` on every request and handed to
  // the messenger next to (never inside) the session. Kept out of `session`,
  // which is persisted to localStorage; stored only in the
  // `gleap-grant-<apiKey>` cookie (when cookies are on) so a reload and a
  // help center on the same domain stay signed.
  grant = null;
  grantRefreshTimeout = null;
  // When the current grant is due for a refresh (ms, device clock), when the
  // last refresh identify went out, and whether one is still running.
  grantRefreshAt = null;
  lastGrantRefreshAt = 0;
  grantRefreshInFlight = false;
  // How the last identify failed ('refused' when a refusal was logged, else
  // 'network error' / 'HTTP <status>'), for setUserJwt's log line.
  lastIdentifyFailure = null;
  // Gleap.initialize(projectId, { sessionDuration }): asks the server for a
  // shorter grant (ms). Sent with every identify.
  sessionDuration = null;
  // Bumped only by clearSession (logout, destroy, rejected session). An
  // identify answer sent under an older generation is dropped, so a late
  // answer cannot bring back the user who just logged out.
  logoutGeneration = 0;
  // Signed mode (`identity.mode === 'signed'`) on an identified session
  // without a live grant: one identify per session load fetches the grant,
  // even when this exact identify was sent before (a returning user whose
  // project switched to Signed after they were identified).
  signedModeIdentifySent = false;
  lastSignedModeIdentifyAt = 0;
  // The same answer when no token is at hand (setUserJwt's token lives in
  // memory only, so a reload has none) but a JWT provider is set: the
  // provider is asked once per session load for a token to identify with.
  signedModeProviderAsked = false;
  // An identify that failed on the network or with a server error: replayed
  // once the browser comes back online.
  identifyFailedTransiently = false;
  onlineListenerAdded = false;
  // Fingerprint of the last userId + token/hash the server refused (memory
  // only, never the token itself): an app that identifies on every render
  // does not send the same refused token again and again.
  refusedIdentity = null;

  // GleapSession singleton
  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new GleapSession();
      return this.instance;
    } else {
      return this.instance;
    }
  }

  /**
   * Sets the data region. Applies the region's apiUrl, wsApiUrl and
   * realtimeHost at once. Unknown regions are ignored with a warning.
   * @param {string} region "eu" | "us" (case-insensitive)
   * @returns {boolean} true if the region was applied.
   */
  setRegion(region) {
    const regionKey = resolveGleapRegion(region);
    if (!regionKey) {
      console.warn(
        `Gleap: Unknown region "${region}". Supported regions: ${Object.keys(GLEAP_REGIONS).join(', ')}. Region not changed.`
      );
      return false;
    }

    const hosts = GLEAP_REGIONS[regionKey];
    this.region = regionKey;
    this.apiUrl = hosts.apiUrl;
    this.wsApiUrl = hosts.wsApiUrl;
    this.realtimeHost = hosts.realtimeHost;

    return true;
  }

  /**
   * Returns the current data region.
   * @returns {string}
   */
  getRegion() {
    return this.region;
  }

  /**
   * Returns the current session name.
   * @returns string
   */
  getName() {
    try {
      return this.session.name ? this.session.name.split(' ')[0].split('@')[0].split('.')[0].split('+')[0] : '';
    } catch (exp) {
      return this.session.name;
    }
  }

  /**
   * Returns the Gleap session object.
   * @returns
   */
  getSession() {
    return this.session;
  }

  /**
   * Returns the Gleap session object.
   * @returns
   */
  getGleapId() {
    if (this.session && this.session.gleapId) {
      return this.session.gleapId;
    }

    return null;
  }

  /**
   * Determines if the current session is a identified user.
   * @returns boolean
   */
  isUser() {
    if (this.session && this.session.userId) {
      return true;
    }
    return false;
  }

  constructor() {}

  setOnSessionReady = (onSessionReady) => {
    if (this.ready) {
      onSessionReady();
    } else {
      this.onSessionReadyListener.push(onSessionReady);
    }
  };

  /**
   * Counts an identify / updateContact request until it settles. The session
   * it returns is applied (validateSession, session-update to the messenger)
   * before the listeners run.
   */
  trackContactUpdate = (request) => {
    this.pendingContactUpdates++;
    const settle = () => {
      this.pendingContactUpdates = Math.max(0, this.pendingContactUpdates - 1);
      if (this.pendingContactUpdates > 0) {
        return;
      }
      const listeners = this.contactSettledListeners;
      this.contactSettledListeners = [];
      for (let i = 0; i < listeners.length; i++) {
        listeners[i]();
      }
    };
    request.then(settle, settle);
    return request;
  };

  /**
   * Runs `callback` once no identify / updateContact request is in flight, or
   * after `timeoutMs` at the latest.
   */
  onContactSettled = (callback, timeoutMs = 5000) => {
    if (this.pendingContactUpdates === 0) {
      callback();
      return;
    }
    let done = false;
    let timer = null;
    const run = () => {
      if (done) {
        return;
      }
      done = true;
      clearTimeout(timer);
      callback();
    };
    timer = setTimeout(run, timeoutMs);
    this.contactSettledListeners.push(run);
  };

  injectSession = (http) => {
    if (http && this.session) {
      http.setRequestHeader('Api-Token', this.sdkKey);
      http.setRequestHeader('Gleap-Id', this.session.gleapId);
      http.setRequestHeader('Gleap-Hash', this.session.gleapHash);
      this.injectGrant(http);
    }
  };

  /** Adds the `Gleap-Grant` header to an XHR, when there is a grant. */
  injectGrant = (http) => {
    if (http && this.grant) {
      try {
        http.setRequestHeader('Gleap-Grant', this.grant);
      } catch (exp) {}
    }
  };

  /** Adds the `Gleap-Grant` entry to a fetch headers object, when there is a grant. */
  addGrantHeader = (headers) => {
    if (headers && this.grant) {
      headers['Gleap-Grant'] = this.grant;
    }
    return headers;
  };

  grantCookieName = () => `gleap-grant-${this.sdkKey}`;

  /**
   * Replaces the grant (null drops it), writes or erases its cookie and, when
   * it changed and `push` is set, hands it to the messenger frames.
   */
  setGrant = (grant, push = true) => {
    const next = typeof grant === 'string' && grant.length > 0 ? grant : null;
    if (next === this.grant) {
      return;
    }
    this.grant = next;
    if (this.useCookies) {
      try {
        if (next) {
          const decoded = decodeGrant(next);
          const days =
            decoded && decoded.exp !== null
              ? (decoded.exp * 1000 - Date.now()) / (24 * 60 * 60 * 1000)
              : GRANT_FALLBACK_LIFETIME_DAYS;
          if (days > 0) {
            setGleapCookie(this.grantCookieName(), encodeURIComponent(next), days, true);
          } else {
            eraseGleapCookie(this.grantCookieName());
          }
        } else {
          eraseGleapCookie(this.grantCookieName());
        }
      } catch (exp) {}
    }
    this.scheduleGrantRefresh(next ? Date.now() : null);
    if (push) {
      this.pushSessionUpdate();
    }
  };

  /** True while the grant's exp lies in the future (or it has none). */
  hasLiveGrant = () => {
    if (!this.grant) {
      return false;
    }
    const decoded = decodeGrant(this.grant);
    return !!decoded && (decoded.exp === null || decoded.exp * 1000 > Date.now());
  };

  /**
   * When to renew a grant: a minute before its own lifetime (exp - iat) runs
   * out, counted from `receivedAt` on the device clock, so a skewed clock
   * cannot make it due at once. Never sooner than 30 s after receipt. A grant
   * restored from its cookie has no receipt time: the device clock decides,
   * still at least 30 s out. Null when the grant never expires.
   */
  grantRefreshTime = (decoded, receivedAt) => {
    if (!decoded || decoded.exp === null) {
      return null;
    }
    const now = Date.now();
    const remaining =
      receivedAt && decoded.iat !== null && decoded.exp > decoded.iat
        ? (decoded.exp - decoded.iat) * 1000 - (now - receivedAt)
        : decoded.exp * 1000 - now;
    return now + Math.max(GRANT_REFRESH_MIN_DELAY_MS, remaining - GRANT_REFRESH_MARGIN_MS);
  };

  /**
   * Schedules sending the last signed identify again (through the JWT provider
   * when its token expires soon) for a new grant. `receivedAt`: when the
   * server handed the grant out (Date.now()), or null for a restored one.
   */
  scheduleGrantRefresh = (receivedAt = null) => {
    clearTimeout(this.grantRefreshTimeout);
    this.grantRefreshTimeout = null;
    this.grantRefreshAt = this.grantRefreshTime(this.grant ? decodeGrant(this.grant) : null, receivedAt);
    if (this.grantRefreshAt !== null) {
      this.armGrantRefresh(this.grant, this.grantRefreshAt);
    }
  };

  armGrantRefresh = (grant, at) => {
    clearTimeout(this.grantRefreshTimeout);
    // setTimeout overflows above ~24.8 days; the callback re-arms until `at`.
    const delay = Math.min(Math.max(0, at - Date.now()), 2147483647);
    this.grantRefreshTimeout = setTimeout(() => {
      this.grantRefreshTimeout = null;
      if (this.grant !== grant) {
        return;
      }
      const now = Date.now();
      if (at - now > 1000) {
        this.armGrantRefresh(grant, at);
        return;
      }
      // One refresh at a time; the identify already on its way brings the next
      // grant. Should it fail, the grant is looked at again in a minute.
      if (this.grantRefreshInFlight || this.identifyInFlight) {
        this.armGrantRefresh(grant, now + GRANT_REFRESH_RETRY_MS);
        return;
      }
      if (now - this.lastGrantRefreshAt < GRANT_REFRESH_MIN_INTERVAL_MS) {
        this.armGrantRefresh(grant, this.lastGrantRefreshAt + GRANT_REFRESH_MIN_INTERVAL_MS);
        return;
      }
      // Nothing to send (logged out, or identified without a token or hash).
      if (!this.lastIdentify || !this.lastIdentify.userHash) {
        return;
      }
      this.lastGrantRefreshAt = now;
      this.grantRefreshInFlight = true;
      const done = () => {
        this.grantRefreshInFlight = false;
        // Failed, or answered without a new grant: try again in a minute.
        // A new grant has armed its own refresh (setGrant), a dropped one needs none.
        if (this.grant === grant && !this.grantRefreshTimeout) {
          this.armGrantRefresh(grant, Date.now() + GRANT_REFRESH_RETRY_MS);
        }
      };
      Promise.resolve(
        this.withFreshIdentify(({ userId, userData, userHash }) => this.identifySession(userId, userData, userHash, true))
      ).then(done, done);
    }, delay);
  };

  /** Sends the session (and the grant) to the widget and the AI chatbar frames. */
  pushSessionUpdate = () => {
    try {
      GleapFrameManager.getInstance().sendSessionUpdate();
    } catch (exp) {}
    try {
      // Only a chatbar that exists: getInstance() would create one.
      GleapAiChatbarManager.instance?.sendSessionUpdateIfReady();
    } catch (exp) {}
  };

  /** Gleap.setUseCookies: turning cookies off also erases a grant cookie written before. */
  setUseCookies = (useCookies) => {
    this.useCookies = useCookies;
    if (!useCookies) {
      this.eraseGrantCookie();
    }
  };

  eraseGrantCookie = () => {
    if (!this.sdkKey) {
      return;
    }
    try {
      eraseGleapCookie(this.grantCookieName());
    } catch (exp) {}
  };

  /** A page reload: picks the grant up from its cookie when it belongs to the current session. */
  restoreGrant = () => {
    if (!this.useCookies) {
      // setUseCookies(false) before initialize: a cookie from an earlier visit must not linger.
      this.eraseGrantCookie();
      return;
    }
    if (this.grant || !this.session || !this.session.gleapId) {
      return;
    }
    try {
      const cookie = getGleapCookie(this.grantCookieName());
      if (!cookie) {
        return;
      }
      const grant = decodeURIComponent(cookie);
      const decoded = decodeGrant(grant);
      if (decoded && decoded.sid === this.session.gleapId) {
        this.grant = grant;
        this.scheduleGrantRefresh(null);
      }
    } catch (exp) {}
  };

  /**
   * Takes `identity.grant` out of a session response so it never lands in the
   * persisted session. Returns `{ session, grant }`; `grant` is undefined when
   * the response says nothing about it.
   */
  extractGrant = (session) => {
    if (!session || !session.identity || typeof session.identity !== 'object' || !('grant' in session.identity)) {
      return { session, grant: undefined };
    }
    const { grant, ...identity } = session.identity;
    return { session: { ...session, identity }, grant: grant || null };
  };

  clearSession = (attemp = 0, retry = true) => {
    clearTimeout(this.fileRefreshTimeout);
    this.openingProtectedFile = null;
    if (this.session?.fileAccessToken) {
      try {
        const revoke = new XMLHttpRequest();
        revoke.open('POST', this.apiUrl + '/files/session/revoke');
        revoke.setRequestHeader('X-File-Session', this.session.fileAccessToken);
        revoke.send();
      } catch (_) { /* Local logout still clears credentials if offline. */ }
    }
    if (this.session && this.session.gleapHash) {
      GleapEventManager.notifyEvent('unregister-pushmessage-group', `gleapuser-${this.session.gleapHash}`);
    }

    try {
      saveToGleapCache(`session-${this.sdkKey}`, null);
    } catch (exp) {}

    if (this.useCookies) {
      try {
        eraseGleapCookie(`session-${this.sdkKey}`);
      } catch (exp) {}
    }

    this.ready = false;
    this.session = {
      gleapId: null,
      gleapHash: null,
      name: '',
      email: '',
      userId: '',
      phone: '',
      value: 0,
    };
    // Explicit teardown (logout, destroy, server-rejected session): forget the
    // replay state so the next session can't inherit a stale identity.
    this.lastIdentify = null;
    this.identifyInFlight = false;
    this.forgetSignedIdentity();
    this.authTokens = {};
    this.authTokensSentFor = null;
    this.setGrant(null, false);
    this.contactVersion++;
    this.logoutGeneration++;
    this.signedModeIdentifySent = false;
    this.signedModeProviderAsked = false;
    this.identifyFailedTransiently = false;

    GleapFrameManager.getInstance().sendMessage(
      {
        name: 'session-cleared',
      },
      true
    );
    GleapNotificationManager.getInstance().clearAllNotifications(false);
    GleapNotificationManager.getInstance().setNotificationCount(0);
    GleapBannerManager.getInstance().removeBannerUI();
    GleapModalManager.getInstance().hideModal();

    if (retry) {
      this.scheduleSessionRetry(attemp);
    }
  };

  scheduleSessionRetry = (attemp = 0) => {
    if (isNaN(attemp)) {
      return;
    }

    // Exponentially retry to renew session.
    const newTimeout = Math.pow(attemp, 2) * 10;
    setTimeout(() => {
      this.startSession(attemp + 1);
    }, newTimeout * 1000);
  };

  openRequestedProtectedFile = () => {
    const fileId = new URLSearchParams(window.location?.search || '').get('gleapFile');
    if (!/^[a-f0-9]{24}$/.test(fileId || '') || this.openingProtectedFile === fileId) return;
    this.openingProtectedFile = fileId;
    const token = this.session.fileAccessToken;
    const request = new XMLHttpRequest();
    request.open('GET', `${this.apiUrl}/files/${fileId}/location`);
    request.setRequestHeader('X-File-Session', this.session.fileAccessToken);
    request.onload = () => {
      if (this.session?.fileAccessToken !== token) return;
      if (request.status !== 200) { this.openingProtectedFile = null; return; }
      try {
        const { shareToken } = JSON.parse(request.responseText);
        const frame = GleapFrameManager.getInstance();
        frame.setAppMode('widget');
        frame.sendMessage({ name: 'open-conversation', data: { shareToken } }, true);
        frame.showWidget();
      } catch { this.openingProtectedFile = null; }
    };
    request.onerror = () => { this.openingProtectedFile = null; };
    request.send();
  };

  validateSession = (session) => {
    if (!session || !session.gleapId) {
      return;
    }

    const extracted = this.extractGrant(session);
    session = extracted.session;
    if (extracted.grant !== undefined) {
      this.setGrant(extracted.grant, false);
    }
    // Signed mode answering "not signed" while a grant was sent: the server
    // rejected it (secret rotation, region move, revoked key) although its own
    // exp still looks live. Drop it (memory + cookie) so the answer's caller
    // re-identifies with the held token instead of sending a dead grant until
    // it expires locally.
    const answeredIdentity = session.identity;
    if (
      this.grant &&
      answeredIdentity &&
      typeof answeredIdentity === 'object' &&
      answeredIdentity.mode === 'signed' &&
      answeredIdentity.signed === false
    ) {
      this.setGrant(null, false);
    }
    // A grant names its session (`sid`): another session never inherits it.
    if (this.grant) {
      const decodedGrant = decodeGrant(this.grant);
      if (!decodedGrant || decodedGrant.sid !== session.gleapId) {
        this.setGrant(null, false);
      }
    }

    // Ordinary session refreshes must not discard the independently verified,
    // short-lived file session. Never carry it across an identity change.
    if (!session.fileAccessToken && session.gleapId === this.session?.gleapId &&
        session.userId === this.session?.userId && Date.parse(this.session.fileAccessExpiresAt) > Date.now()) {
      session = { ...session, fileAccessToken: this.session.fileAccessToken, fileAccessExpiresAt: this.session.fileAccessExpiresAt };
    }
    let sessionChanged = false;
    if (this.session?.gleapId !== session?.gleapId) {
      sessionChanged = true;
    }

    // Unregister previous group.
    if (this.session && this.session.gleapHash) {
      GleapEventManager.notifyEvent('unregister-pushmessage-group', `gleapuser-${this.session.gleapHash}`);
    }

    if (!this.localStorageDisabled) {
      saveToGleapCache(`session-${this.sdkKey}`, session);
    }
    if (this.useCookies) {
      setGleapCookie(`session-${this.sdkKey}`, encodeURIComponent(JSON.stringify(session)), 365);
    }

    this.session = session;
    this.ready = true;
    // A cached session: its grant cookie is read before the session-ready
    // listeners run, so an identify queued before initialize sees it.
    this.restoreGrant();
    if (session.fileAccessToken) this.openRequestedProtectedFile();
    clearTimeout(this.fileRefreshTimeout);
    if (session.fileAccessToken && this.lastIdentify?.userHash) {
      this.fileRefreshTimeout = setTimeout(() => {
        this.withFreshIdentify(({ userId, userData, userHash }) => {
          this.identifySession(userId, userData, userHash, true)?.catch?.(() => {});
        });
      }, Math.max(0, Date.parse(session.fileAccessExpiresAt) - Date.now() - 5 * 60 * 1000));
    }

    // Register new push group.
    if (this.session && this.session.gleapHash) {
      GleapEventManager.notifyEvent('register-pushmessage-group', `gleapuser-${this.session.gleapHash}`);
    }

    if (sessionChanged) {
      // Load tooltips.
      setTimeout(() => {
        // Clear cache first, as the session context has changed.
        ChecklistNetworkManager.getInstance().clearCache();
        AgentNetworkManager.getInstance().clearCache();

        // Initially track.
        GleapStreamedEvent.getInstance().restart();

        const tooltipManager = GleapTooltipManager.getInstance();
        if (tooltipManager) {
          try {
            tooltipManager.destroy();
          } catch (exp) {}

          tooltipManager.load();
        }
      }, 0);

      if (typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('session-updated'));
      }
    }

    this.notifySessionReady();

    if (sessionChanged) {
      this.replayIdentifyIfNeeded();
    }
    if (session.authenticatedFilesRequired && !session.fileAccessToken && this.lastIdentify?.userHash && !this.identifyInFlight) {
      this.withFreshIdentify(({ userId, userData, userHash }) => {
        this.identifySession(userId, userData, userHash, true)?.catch?.(() => {});
      });
    }
  };

  /**
   * Re-runs the last identify against the current session when a session
   * change left it anonymous. Covers the case where Gleap.identify() was
   * already consumed (no-op against a cached identified session, or its
   * request failed) before the session got recreated — without this, an SPA
   * that identifies once per boot stays a guest until the next full reload.
   */
  replayIdentifyIfNeeded = () => {
    try {
      if (!this.lastIdentify || !this.lastIdentify.userId) {
        return;
      }
      if (this.identifyInFlight) {
        return;
      }
      if (this.session && this.session.userId) {
        return;
      }

      this.withFreshIdentify(({ userId, userData, userHash }) => {
        if (this.identifyInFlight || (this.session && this.session.userId)) {
          return;
        }
        this.identifySession(userId, userData, userHash)?.catch?.(() => {});
      });
    } catch (exp) {}
  };

  /** Listens for the browser coming back online (once per instance). */
  listenForOnline = () => {
    if (this.onlineListenerAdded) {
      return;
    }
    try {
      if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('online', this.handleOnline);
        this.onlineListenerAdded = true;
      }
    } catch (exp) {}
  };

  /** Back online: sends an identify again that failed on the network or with a server error. */
  handleOnline = () => {
    if (!this.identifyFailedTransiently || this.identifyInFlight || !this.lastIdentify) {
      return;
    }
    this.identifyFailedTransiently = false;
    try {
      Promise.resolve(
        this.withFreshIdentify(({ userId, userData, userHash }) => {
          if (this.identifyInFlight) {
            return;
          }
          return this.trackContactUpdate(this.sendIdentify(userId, userData, userHash, true));
        })
      ).catch(() => {});
    } catch (exp) {}
  };

  /**
   * Signed mode on an identified session without a live grant (none, expired,
   * or dropped because the server answered "not signed"), with a token
   * or hash at hand and no identify for it this session load yet (at most one
   * a minute).
   */
  needsSignedModeIdentify = () => {
    if (this.signedModeIdentifySent || this.identifyInFlight) {
      return false;
    }
    const identity = this.session && this.session.identity;
    if (!this.session || !this.session.userId || !identity || identity.mode !== 'signed') {
      return false;
    }
    if (!this.lastIdentify || !this.lastIdentify.userHash || this.hasLiveGrant()) {
      return false;
    }
    return Date.now() - this.lastSignedModeIdentifyAt >= GRANT_REFRESH_MIN_INTERVAL_MS;
  };

  markSignedModeIdentify = () => {
    this.signedModeIdentifySent = true;
    this.lastSignedModeIdentifyAt = Date.now();
  };

  /**
   * A /sessions answer in signed mode without a grant: sends the held identify
   * once for one. Without a held token, asks the JWT provider for one instead.
   */
  identifyForSignedModeIfNeeded = () => {
    if (!this.needsSignedModeIdentify()) {
      this.identifyWithProviderForSignedModeIfNeeded();
      return;
    }
    this.markSignedModeIdentify();
    try {
      Promise.resolve(
        this.withFreshIdentify(({ userId, userData, userHash }) =>
          this.trackContactUpdate(this.sendIdentify(userId, userData, userHash, true))
        )
      ).catch(() => {});
    } catch (exp) {}
  };

  /**
   * Signed mode on an identified session without a live grant, with no token
   * at hand (a reload after setUserJwt, or an identify without one) but a JWT
   * provider set, and the provider not asked for it this session load yet.
   */
  needsSignedModeProviderIdentify = () => {
    if (this.signedModeProviderAsked || this.signedModeIdentifySent || this.identifyInFlight || !this.jwtProvider) {
      return false;
    }
    const identity = this.session && this.session.identity;
    if (!this.session || !this.session.userId || !identity || identity.mode !== 'signed') {
      return false;
    }
    if ((this.lastIdentify && this.lastIdentify.userHash) || this.hasLiveGrant()) {
      return false;
    }
    return Date.now() - this.lastSignedModeIdentifyAt >= GRANT_REFRESH_MIN_INTERVAL_MS;
  };

  /**
   * Restores a signed session from the JWT provider alone: asks it once per
   * session load and identifies with the token like setUserJwt (a token for
   * another user than the session's goes through identity_mismatch). No
   * token: nothing happens. Returns a Promise that never rejects (undefined
   * when nothing was asked).
   */
  identifyWithProviderForSignedModeIfNeeded = () => {
    if (!this.needsSignedModeProviderIdentify()) {
      return;
    }
    this.signedModeProviderAsked = true;
    const generationAtAsk = this.logoutGeneration;
    return this.requestUserJwt()
      .then((token) => {
        if (!token || this.logoutGeneration !== generationAtAsk || this.identifyInFlight) {
          return;
        }
        // The app passed a token meanwhile, or the session no longer needs one.
        const identity = this.session && this.session.identity;
        if (
          (this.lastIdentify && this.lastIdentify.userHash) ||
          !this.session ||
          !this.session.userId ||
          !identity ||
          identity.mode !== 'signed' ||
          this.hasLiveGrant()
        ) {
          return;
        }
        return this.setUserJwt(token);
      })
      .catch(() => {});
  };

  /** Memory-only fingerprint of a refused identify (never the token itself). */
  refusedIdentityOf = (userId, userHash) => `${userId}:${userHash ? fingerprintOf(userHash) : ''}`;

  /**
   * Runs `send` with the last identify. When it carries an identity token
   * that expires within 5 minutes and a JWT provider is set, asks the
   * provider first and sends the fresh token instead. Synchronous otherwise.
   * Returns what `send` returned (a Promise of it after a provider call).
   */
  withFreshIdentify = (send) => {
    const identify = this.lastIdentify;
    if (!identify) {
      return;
    }
    const token = decodeUserJwt(identify.userHash);
    const expiresSoon = token && token.exp !== null && token.exp * 1000 - Date.now() < JWT_REFRESH_WINDOW_MS;
    if (!expiresSoon || !this.jwtProvider) {
      return send(identify);
    }
    return this.requestUserJwt().then((fresh) => {
      // A logout or another identify meanwhile wins.
      if (this.lastIdentify !== identify) {
        return;
      }
      return send(fresh ? { ...identify, userId: decodeUserJwt(fresh).userId, userHash: fresh } : identify);
    });
  };

  setUserJwtProvider = (provider) => {
    if (provider !== null && typeof provider !== 'function') {
      console.warn('Gleap: setUserJwtProvider expects a function returning a token (or a Promise of one).');
      return;
    }
    this.jwtProvider = provider;
    this.jwtProviderFailedAt = 0;
    // Set after the /sessions answer arrived: a signed session can still be restored.
    if (this.ready) {
      try {
        this.identifyWithProviderForSignedModeIfNeeded();
      } catch (exp) {}
    }
  };

  /**
   * Asks the JWT provider for a fresh identity token. Resolves with the token,
   * or null (no provider, failure, timeout, or still pausing after a failure).
   * Never rejects.
   */
  requestUserJwt = () => {
    if (!this.jwtProvider) {
      return Promise.resolve(null);
    }
    if (this.jwtProviderRequest) {
      return this.jwtProviderRequest;
    }
    if (this.jwtProviderFailedAt && Date.now() - this.jwtProviderFailedAt < JWT_PROVIDER_BACKOFF_MS) {
      return Promise.resolve(null);
    }

    const provider = this.jwtProvider;
    let timer = null;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('timed out after 10 s')), JWT_PROVIDER_TIMEOUT_MS);
    });
    const request = Promise.race([Promise.resolve().then(() => provider()), timeout])
      .then((token) => {
        if (token === null || token === undefined) {
          // No token right now (logged out): no warning, same pause as a failure.
          this.jwtProviderFailedAt = Date.now();
          return null;
        }
        const decoded = decodeUserJwt(token);
        if (!decoded) {
          throw new Error('it did not return a JWT with a userId');
        }
        if (decoded.exp !== null && decoded.exp * 1000 <= Date.now()) {
          throw new Error('it returned an expired token');
        }
        this.jwtProviderFailedAt = 0;
        return token;
      })
      .catch((error) => {
        this.jwtProviderFailedAt = Date.now();
        console.warn(`Gleap: the JWT provider failed (${error && error.message ? error.message : error}). Asking again in 30 s at the earliest.`);
        return null;
      })
      .finally(() => {
        clearTimeout(timer);
        this.jwtProviderRequest = null;
      });
    this.jwtProviderRequest = request;
    return request;
  };

  startSession = (attemp = 0) => {
    this.listenForOnline();
    // Check if we already have a session cookie.
    try {
      if (this.useCookies) {
        const sessionCookie = getGleapCookie(`session-${this.sdkKey}`);
        if (sessionCookie) {
          const sessionData = JSON.parse(decodeURIComponent(sessionCookie));
          this.validateSession(sessionData);
        }
      }
    } catch (exp) {}

    // Try to load session from local storage, if not already loaded.
    if (!this.localStorageDisabled && !(this.session && this.session.gleapId && this.session.gleapId.length > 0)) {
      const cachedSession = loadFromGleapCache(`session-${this.sdkKey}`);
      if (cachedSession) {
        this.validateSession(cachedSession);
      }
    }
    this.restoreGrant();

    const self = this;
    const contactVersionAtSend = this.contactVersion;
    const http = new XMLHttpRequest();
    http.open('POST', self.apiUrl + '/sessions');
    http.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
    http.setRequestHeader('Api-Token', self.sdkKey);
    try {
      if (this.session && this.session.gleapId && this.session.gleapHash) {
        http.setRequestHeader('Gleap-Id', this.session.gleapId);
        http.setRequestHeader('Gleap-Hash', this.session.gleapHash);
        this.injectGrant(http);
      }
    } catch (exp) {}
    http.onreadystatechange = function (e) {
      if (http.readyState === 4) {
        // Gleap.identify() is sent right away against a cached session, so its answer (the new
        // contact) can land first. This older answer must not switch back to the previous contact
        // (or clear the new one).
        if (self.contactVersion !== contactVersionAtSend) {
          return;
        }
        if (http.status === 200 || http.status === 201) {
          try {
            const sessionData = JSON.parse(http.responseText);
            self.validateSession(sessionData);
            self.identifyForSignedModeIfNeeded();
          } catch (exp) {}
        } else {
          if (http.status !== 429) {
            // Only an explicit 4xx tells us the stored session itself was
            // rejected. Anything else (status 0 = offline/connection cut,
            // 5xx, gateway errors during API deploys) is transient: keep the
            // cached session — identity included — and retry with the same
            // Gleap-Id/Gleap-Hash instead of discarding it for a brand-new
            // anonymous session.
            const sessionRejected = http.status >= 400 && http.status < 500;

            if (!sessionRejected && self.session && self.session.gleapId) {
              self.scheduleSessionRetry(attemp);
            } else {
              self.clearSession(attemp, true);
            }
          }
        }
      }
    };
    http.send(
      JSON.stringify({
        lang: GleapTranslationManager.getInstance().getActiveLanguage(),
        deviceType: getDeviceType(),
        platform: 'web',
      })
    );
  };

  /**
   * Switches to another contact's session, handed over by the widget after a
   * verified email (the "Verify email" workflow step). The server checks the
   * gleapId/gleapHash pair; anything it refuses leaves the current session as
   * it is. An app that identifies its users keeps its own identity.
   */
  adoptSession = (data) => {
    if (!data || typeof data.gleapId !== 'string' || typeof data.gleapHash !== 'string') {
      return;
    }
    if (this.lastIdentify && this.lastIdentify.userId) {
      return;
    }
    if (this.session && this.session.gleapId === data.gleapId) {
      return;
    }

    const self = this;
    const http = new XMLHttpRequest();
    http.open('POST', self.apiUrl + '/sessions');
    http.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
    http.setRequestHeader('Api-Token', self.sdkKey);
    http.setRequestHeader('Gleap-Id', data.gleapId);
    http.setRequestHeader('Gleap-Hash', data.gleapHash);
    http.onreadystatechange = function () {
      if (http.readyState === 4 && (http.status === 200 || http.status === 201)) {
        try {
          const sessionData = JSON.parse(http.responseText);
          if (sessionData && sessionData.gleapId === data.gleapId) {
            self.contactVersion++;
            self.validateSession(sessionData);
          }
        } catch (exp) {}
      }
    };
    http.send(
      JSON.stringify({
        lang: GleapTranslationManager.getInstance().getActiveLanguage(),
        deviceType: getDeviceType(),
        platform: 'web',
      })
    );
  };

  notifySessionReady() {
    if (this.onSessionReadyListener.length > 0) {
      for (var i = 0; i < this.onSessionReadyListener.length; i++) {
        this.onSessionReadyListener[i]();
      }
    }
    this.onSessionReadyListener = [];

    // Send session update (and the grant) to the frames.
    this.pushSessionUpdate();
  }

  checkIfSessionNeedsUpdate = (userId, userData) => {
    if (!this.session || !this.session.userId || !userId) {
      return true;
    }

    try {
      if (this.session.userId.toString() !== userId.toString()) {
        return true;
      }
    } catch (exp) {}

    return this.checkIfSessionDataNeedsUpdate(userData);
  };

  checkIfSessionDataNeedsUpdate = (userData) => {
    // Every identify / update sends the active language, so a language switch
    // in the app (an <html lang> change in an SPA, setLanguage) must not be
    // skipped as "nothing changed".
    if (this.session && this.session.lang && this.session.lang !== GleapTranslationManager.getInstance().getActiveLanguage()) {
      return true;
    }

    if (userData) {
      var userDataKeys = Object.keys(userData);
      for (var i = 0; i < userDataKeys.length; i++) {
        var userDataKey = userDataKeys[i];
        if (JSON.stringify(this.session[userDataKey]) !== JSON.stringify(userData[userDataKey])) {
          // Check custom data for a match.
          if (
            !(
              this.session.customData &&
              JSON.stringify(this.session.customData[userDataKey]) === JSON.stringify(userData[userDataKey])
            )
          ) {
            return true;
          }
        }
      }
    }

    return false;
  };

  updateSession = (userData) => {
    // Check if session needs update.
    const sessionNeedsUpdate = this.checkIfSessionDataNeedsUpdate(userData);
    if (!sessionNeedsUpdate) {
      return;
    }

    const self = this;
    return this.trackContactUpdate(new Promise((resolve, reject) => {
      // Wait for gleap session to be ready.
      this.setOnSessionReady(function () {
        if (!self.session.gleapId || !self.session.gleapHash) {
          return reject('Session not ready yet.');
        }

        const http = new XMLHttpRequest();
        http.open('POST', self.apiUrl + '/sessions/partialupdate');
        http.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
        http.setRequestHeader('Api-Token', self.sdkKey);
        try {
          http.setRequestHeader('Gleap-Id', self.session.gleapId);
          http.setRequestHeader('Gleap-Hash', self.session.gleapHash);
          self.injectGrant(http);
        } catch (exp) {}

        const generationAtSend = self.logoutGeneration;
        http.onerror = () => {
          reject();
        };
        http.onreadystatechange = function (e) {
          if (http.readyState === 4) {
            // A logout meanwhile: this answer describes the previous contact.
            if (self.logoutGeneration !== generationAtSend) {
              return reject();
            }
            if (http.status === 200 || http.status === 201) {
              try {
                const sessionData = JSON.parse(http.responseText);
                self.contactVersion++;
                self.validateSession(sessionData);
                resolve(sessionData);
              } catch (exp) {
                reject(exp);
              }
            } else {
              reject();
            }
          }
        };

        http.send(
          JSON.stringify({
            data: {
              ...userData,
              lang: GleapTranslationManager.getInstance().getActiveLanguage(),
              deviceType: getDeviceType(),
              platform: 'web',
            },
            type: 'js',
            sdkVersion: SDK_VERSION,
            ws: true,
          })
        );
      });
    }));
  };

  signedIdentityKey = () => `signed-identify-${this.sdkKey}`;

  // An identity token adds a fingerprint of what it says (kid + claims without
  // iat/exp/nbf/jti): a token re-minted per page load for the same user and
  // data is not sent again, a changed claim is.
  signedIdentityOf = (gleapId, userId, userHash) =>
    isUserJwt(userHash) ? `${gleapId}:${userId}:${identityFingerprintOf(userHash)}` : `${gleapId}:${userId}`;

  // `granted`: the identify returned a grant, so a later identify without one
  // (cookie gone, grant expired) has to be sent again to get a new one.
  rememberSignedIdentity = (sessionData, userId, userHash, granted = false) => {
    if (!sessionData || !sessionData.gleapId || userId === undefined || userId === null) {
      return;
    }
    this.signedIdentity = this.signedIdentityOf(sessionData.gleapId, userId, userHash) + (granted ? '#grant' : '');
    if (!this.localStorageDisabled) {
      try {
        saveToGleapCache(this.signedIdentityKey(), this.signedIdentity);
      } catch (exp) {}
    }
  };

  forgetSignedIdentity = () => {
    this.signedIdentity = null;
    try {
      saveToGleapCache(this.signedIdentityKey(), null);
    } catch (exp) {}
  };

  /** A userHash this session has not been identified with yet for this user. */
  needsSignedIdentify = (userId, userHash) => {
    if (!userHash || userId === undefined || userId === null || !this.session || !this.session.gleapId) {
      return false;
    }
    if (!this.signedIdentity && !this.localStorageDisabled) {
      try {
        this.signedIdentity = loadFromGleapCache(this.signedIdentityKey());
      } catch (exp) {}
    }
    const expected = this.signedIdentityOf(this.session.gleapId, userId, userHash);
    if (this.signedIdentity === expected + '#grant') {
      return !this.hasLiveGrant();
    }
    return this.signedIdentity !== expected;
  };

  identifySession = (userId, userData, userHash, refreshFileSession = false) => {
    // Remember the args before any early-out: a no-op identify against a
    // session that later gets recreated must still be replayable.
    const identify = { userId, userData, userHash };
    this.lastIdentify = identify;

    // Called before initialize: decide once the (cached) session and its
    // grant are loaded, so a live cached grant does not cost an identify.
    if (!this.ready && !(this.session && this.session.gleapId)) {
      return this.trackContactUpdate(
        new Promise((resolve, reject) => {
          this.setOnSessionReady(() => {
            // A newer identify or a logout meanwhile wins.
            if (this.lastIdentify !== identify) {
              return resolve();
            }
            Promise.resolve(this.identifySession(userId, userData, userHash, refreshFileSession)).then(resolve, reject);
          });
        })
      );
    }

    // The server refused exactly this token or hash before: not again on every render.
    if (this.refusedIdentity !== null && this.refusedIdentity === this.refusedIdentityOf(userId, userHash)) {
      return;
    }

    const sessionNeedsUpdate = this.checkIfSessionNeedsUpdate(userId, userData);
    const needsFileIdentity = !!userHash && this.session?.authenticatedFilesRequired && (!this.session?.fileAccessToken || Date.parse(this.session.fileAccessExpiresAt) <= Date.now());
    const signedMode = this.needsSignedModeIdentify();
    if (!sessionNeedsUpdate && !refreshFileSession && !needsFileIdentity && !signedMode && !this.needsSignedIdentify(userId, userHash)) {
      return;
    }
    if (signedMode) {
      this.markSignedModeIdentify();
    }

    return this.trackContactUpdate(this.sendIdentify(userId, userData, userHash, true));
  };

  /**
   * POST /sessions/identify. An expired identity token is renewed through the
   * JWT provider and the request retried once (`renewExpiredJwt`). A token for
   * another user than the session's (400 identity_mismatch) drops the local
   * session and retries once as a fresh visitor (`restartOnMismatch`), which
   * the server merges into the token's contact.
   */
  sendIdentify = (userId, userData, userHash, renewExpiredJwt, restartOnMismatch = true) => {
    const self = this;
    return new Promise((resolve, reject) => {
      // Wait for gleap session to be ready.
      this.setOnSessionReady(function () {
        if (!self.session.gleapId || !self.session.gleapHash) {
          return reject('Session not ready yet.');
        }

        const http = new XMLHttpRequest();
        http.open('POST', self.apiUrl + '/sessions/identify');
        http.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
        http.setRequestHeader('Api-Token', self.sdkKey);
        try {
          http.setRequestHeader('Gleap-Id', self.session.gleapId);
          http.setRequestHeader('Gleap-Hash', self.session.gleapHash);
          self.injectGrant(http);
        } catch (exp) {}

        self.identifyInFlight = true;
        self.lastIdentifyFailure = null;
        const generationAtSend = self.logoutGeneration;
        // A logout (clearSession) since this identify went out: its answer is
        // for the user who logged out and is dropped.
        const loggedOutMeanwhile = () => {
          if (self.logoutGeneration === generationAtSend) {
            return false;
          }
          self.lastIdentifyFailure = 'superseded';
          return true;
        };

        http.onerror = () => {
          if (loggedOutMeanwhile()) {
            return reject();
          }
          self.identifyInFlight = false;
          self.lastIdentifyFailure = 'network error';
          self.identifyFailedTransiently = true;
          reject();
        };
        http.onreadystatechange = function (e) {
          if (http.readyState === 4) {
            if (loggedOutMeanwhile()) {
              return reject();
            }
            self.identifyInFlight = false;
            if (http.status === 200 || http.status === 201) {
              self.identifyFailedTransiently = false;
              try {
                const sessionData = JSON.parse(http.responseText);
                self.contactVersion++;
                if (userHash) {
                  self.rememberSignedIdentity(sessionData, userId, userHash, !!(sessionData && sessionData.identity && sessionData.identity.grant));
                }
                self.validateSession(sessionData);
                if (userHash) {
                  self.resendAuthTokensIfNeeded();
                }
                resolve(sessionData);
              } catch (exp) {
                reject(exp);
              }
            } else {
              // An identity token refusal never clears the session (contract §3).
              const refusal = identifyRefusalOf(http.status, http.responseText);
              if (refusal === 'token_expired' && renewExpiredJwt && self.jwtProvider) {
                resolve(
                  self.requestUserJwt().then((token) => {
                    // No token, or a logout / another identify meanwhile: nothing to retry.
                    if (!token || !self.lastIdentify || self.lastIdentify.userHash !== userHash) {
                      if (!token) {
                        console.warn('Gleap: the identity token has expired and the JWT provider returned no fresh one.');
                      }
                      self.lastIdentifyFailure = 'refused';
                      return Promise.reject();
                    }
                    const renewedUserId = decodeUserJwt(token).userId;
                    self.lastIdentify = { userId: renewedUserId, userData, userHash: token };
                    return self.sendIdentify(renewedUserId, userData, token, false, restartOnMismatch);
                  })
                );
                return;
              }
              if (refusal === 'identity_mismatch' && restartOnMismatch && self.lastIdentify && self.lastIdentify.userHash === userHash) {
                resolve(self.restartAsVisitorAndIdentify(userId, userData, userHash, renewExpiredJwt));
                return;
              }
              if (refusal === 'identity_mismatch') {
                console.warn('Gleap: the identity token names another user than this session, and a fresh session was refused too (identity_mismatch).');
              }
              if (refusal === 'token_expired') {
                console.warn('Gleap: the identity token has expired. Pass a fresh one to Gleap.setUserJwt, or set Gleap.setUserJwtProvider.');
              } else if (refusal === 'token_invalid') {
                console.warn('Gleap: the identity token was refused (token_invalid): check the signing key and the userId claim.');
              } else if (refusal === 'signature_required') {
                console.warn(SIGNATURE_REQUIRED_WARNING);
              }
              if (refusal === 'token_expired' || refusal === 'token_invalid' || refusal === 'signature_required') {
                self.refusedIdentity = self.refusedIdentityOf(userId, userHash);
              }
              // Another user than the session's was refused: they must not keep
              // the previous user's session. Start over as a visitor.
              if (
                refusal === 'signature_required' &&
                self.session &&
                self.session.userId &&
                String(self.session.userId) !== String(userId)
              ) {
                self.clearSession(0, true);
              }
              if (!refusal && (http.status === 0 || http.status >= 500)) {
                self.identifyFailedTransiently = true;
              }
              self.lastIdentifyFailure = refusal ? 'refused' : `HTTP ${http.status}`;
              reject();
            }
          }
        };

        var dataToSend = {
          ...userData,
        };

        if (userData.customData) {
          delete dataToSend['customData'];
          dataToSend = {
            ...dataToSend,
            ...userData.customData,
          };
        }

        http.send(
          JSON.stringify({
            ...dataToSend,
            userId,
            userHash,
            ...(self.sessionDuration ? { sessionDuration: self.sessionDuration } : {}),
            lang: GleapTranslationManager.getInstance().getActiveLanguage(),
            deviceType: getDeviceType(),
            platform: 'web',
          })
        );
      });
    });
  };

  /**
   * identity_mismatch: like clearIdentity (session, grant, cookies gone; the
   * provider stays), but the pending identify and the auth tokens are kept,
   * then a fresh visitor session is started and the identify sent once more.
   */
  restartAsVisitorAndIdentify = (userId, userData, userHash, renewExpiredJwt) => {
    const pendingIdentify = this.lastIdentify;
    const pendingAuthTokens = { ...this.authTokens };
    this.clearSession(0, false);
    this.lastIdentify = pendingIdentify;
    this.authTokens = pendingAuthTokens;
    // Queued before the new session exists, so it runs as soon as it is ready
    // (and replayIdentifyIfNeeded then sees the identify in flight).
    const retry = this.sendIdentify(userId, userData, userHash, renewExpiredJwt, false);
    this.startSession();
    return retry;
  };

  /** Gleap.setSessionDuration / initialize(projectId, { sessionDuration }): a positive number of milliseconds, or null to drop it. */
  setSessionDuration = (sessionDuration) => {
    if (sessionDuration === undefined || sessionDuration === null) {
      this.sessionDuration = null;
      return;
    }
    if (typeof sessionDuration !== 'number' || !isFinite(sessionDuration) || sessionDuration <= 0) {
      console.warn('Gleap: sessionDuration expects a positive number of milliseconds. Ignored.');
      return;
    }
    this.sessionDuration = Math.round(sessionDuration);
  };

  setUserJwt = (token) => {
    const decoded = decodeUserJwt(token);
    if (!decoded) {
      console.warn(
        'Gleap: setUserJwt expects a JWT (three base64url parts, at most 4096 characters) whose payload has a userId (or user_id). Nothing was sent.'
      );
      return Promise.resolve();
    }
    // Never rejects: a refusal is logged where it is read, anything else here.
    let sent;
    try {
      sent = Promise.resolve(this.identifySession(decoded.userId, {}, token));
    } catch (error) {
      sent = Promise.reject(error);
    }
    return sent
      .then(
        () => {},
        (error) => {
          if (this.lastIdentifyFailure === 'refused' || this.lastIdentifyFailure === 'superseded') {
            return;
          }
          const reason = error ? (error.message || error) : this.lastIdentifyFailure || 'unknown error';
          console.warn(`Gleap: setUserJwt could not identify the user (${reason}). Nothing changed; call it again later.`);
        }
      );
  };

  /**
   * Gleap.setAuthTokens: stores per-user tokens for the project's API tools on
   * the signed contact. `null` removes a token.
   */
  setAuthTokens = (tokens) => {
    if (!tokens || typeof tokens !== 'object' || Array.isArray(tokens)) {
      console.warn('Gleap: setAuthTokens expects an object of { name: token }.');
      return Promise.resolve();
    }
    const change = {};
    Object.keys(tokens).forEach((name) => {
      const value = tokens[name];
      if (!AUTH_TOKEN_NAME.test(name)) {
        console.warn(`Gleap: auth token name "${name}" skipped: use a letter followed by up to 39 letters, digits, _ or -.`);
        return;
      }
      if (value !== null && typeof value !== 'string') {
        console.warn(`Gleap: auth token "${name}" skipped: the value must be a string, or null to remove it.`);
        return;
      }
      change[name] = value;
      if (value === null) {
        delete this.authTokens[name];
      } else {
        this.authTokens[name] = value;
      }
    });
    if (Object.keys(change).length === 0) {
      return Promise.resolve();
    }
    return this.postAuthTokens(change);
  };

  resendAuthTokensIfNeeded = () => {
    if (Object.keys(this.authTokens).length > 0 && this.authTokensSentFor !== this.session.gleapId) {
      this.postAuthTokens({ ...this.authTokens });
    }
  };

  /** POST /sessions/auth-tokens once the session is ready and no identify is in flight. Never rejects. */
  postAuthTokens = (tokens) => {
    const self = this;
    return new Promise((resolve) => {
      this.setOnSessionReady(() => {
        this.onContactSettled(() => {
          if (!self.session.gleapId || !self.session.gleapHash) {
            return resolve();
          }
          const gleapId = self.session.gleapId;
          const http = new XMLHttpRequest();
          http.open('POST', self.apiUrl + '/sessions/auth-tokens');
          http.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
          self.injectSession(http);
          http.onerror = () => resolve();
          http.onreadystatechange = function () {
            if (http.readyState !== 4) {
              return;
            }
            if (http.status === 200 || http.status === 201) {
              self.authTokensSentFor = gleapId;
            } else if (http.status === 401) {
              console.warn('Gleap: auth tokens need a signed identity: call Gleap.setUserJwt first. They are kept and sent after the next signed identify.');
            }
            resolve();
          };
          http.send(JSON.stringify({ tokens }));
        });
      });
    });
  };

  startProductTourConfig = (tourId) => {
    const self = this;
    return new Promise((resolve, reject) => {
      this.setOnSessionReady(function () {
        if (!self.session.gleapId || !self.session.gleapHash) {
          return reject('Session not ready yet.');
        }

        const http = new XMLHttpRequest();
        http.open('POST', self.apiUrl + '/outbound/producttours');
        http.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
        http.setRequestHeader('Api-Token', self.sdkKey);
        try {
          http.setRequestHeader('Gleap-Id', self.session.gleapId);
          http.setRequestHeader('Gleap-Hash', self.session.gleapHash);
          self.injectGrant(http);
        } catch (exp) {}

        http.onerror = () => {
          reject();
        };
        http.onreadystatechange = function (e) {
          if (http.readyState === 4) {
            if (http.status === 200 || http.status === 201) {
              try {
                const tourData = JSON.parse(http.responseText);
                if (tourData && tourData.config) {
                  resolve(tourData.config);
                }
              } catch (exp) {
                reject(exp);
              }
            } else {
              reject();
            }
          }
        };
        http.send(
          JSON.stringify({
            outboundId: tourId,
          })
        );
      });
    });
  };

  validateProductTour = (tourId) => {
    const self = this;
    return new Promise((resolve, reject) => {
      this.setOnSessionReady(function () {
        if (!self.session.gleapId || !self.session.gleapHash) {
          return reject('Session not ready yet.');
        }

        const http = new XMLHttpRequest();
        http.open('POST', self.apiUrl + '/outbound/producttourvalidation');
        http.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
        http.setRequestHeader('Api-Token', self.sdkKey);
        try {
          http.setRequestHeader('Gleap-Id', self.session.gleapId);
          http.setRequestHeader('Gleap-Hash', self.session.gleapHash);
          self.injectGrant(http);
        } catch (exp) {}

        http.onerror = () => {
          reject();
        };
        http.onreadystatechange = function (e) {
          if (http.readyState === 4) {
            if (http.status === 200 || http.status === 201) {
              try {
                const tourData = JSON.parse(http.responseText);
                if (tourData && tourData.status === 'live' && tourData.passedPageFilter) {
                  resolve(tourData.config);
                } else {
                  reject();
                }
              } catch (exp) {
                reject(exp);
              }
            } else {
              reject();
            }
          }
        };
        http.send(
          JSON.stringify({
            outboundId: tourId,
            currentUrl: window?.location?.href,
          })
        );
      });
    });
  };
}
