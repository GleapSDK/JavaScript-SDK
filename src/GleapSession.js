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
import { GLEAP_DEFAULT_REGION, GLEAP_REGIONS, resolveGleapRegion } from './GleapRegions';

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

  injectSession = (http) => {
    if (http && this.session) {
      http.setRequestHeader('Api-Token', this.sdkKey);
      http.setRequestHeader('Gleap-Id', this.session.gleapId);
      http.setRequestHeader('Gleap-Hash', this.session.gleapHash);
    }
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
    if (session.fileAccessToken) this.openRequestedProtectedFile();
    clearTimeout(this.fileRefreshTimeout);
    if (session.fileAccessToken && this.lastIdentify?.userHash) {
      this.fileRefreshTimeout = setTimeout(() => {
        if (this.lastIdentify) {
          const { userId, userData, userHash } = this.lastIdentify;
          this.identifySession(userId, userData, userHash, true)?.catch?.(() => {});
        }
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
      const { userId, userData, userHash } = this.lastIdentify;
      this.identifySession(userId, userData, userHash, true)?.catch?.(() => {});
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

      const { userId, userData, userHash } = this.lastIdentify;
      const result = this.identifySession(userId, userData, userHash);
      if (result && typeof result.catch === 'function') {
        result.catch(() => {});
      }
    } catch (exp) {}
  };

  startSession = (attemp = 0) => {
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

    const self = this;
    const http = new XMLHttpRequest();
    http.open('POST', self.apiUrl + '/sessions');
    http.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
    http.setRequestHeader('Api-Token', self.sdkKey);
    try {
      if (this.session && this.session.gleapId && this.session.gleapHash) {
        http.setRequestHeader('Gleap-Id', this.session.gleapId);
        http.setRequestHeader('Gleap-Hash', this.session.gleapHash);
      }
    } catch (exp) {}
    http.onreadystatechange = function (e) {
      if (http.readyState === 4) {
        if (http.status === 200 || http.status === 201) {
          try {
            const sessionData = JSON.parse(http.responseText);
            self.validateSession(sessionData);
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

  notifySessionReady() {
    if (this.onSessionReadyListener.length > 0) {
      for (var i = 0; i < this.onSessionReadyListener.length; i++) {
        this.onSessionReadyListener[i]();
      }
    }
    this.onSessionReadyListener = [];

    // Send session update to frame.
    GleapFrameManager.getInstance().sendSessionUpdate();
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
    return new Promise((resolve, reject) => {
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
        } catch (exp) {}

        http.onerror = () => {
          reject();
        };
        http.onreadystatechange = function (e) {
          if (http.readyState === 4) {
            if (http.status === 200 || http.status === 201) {
              try {
                const sessionData = JSON.parse(http.responseText);
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
    });
  };

  identifySession = (userId, userData, userHash, refreshFileSession = false) => {
    // Remember the args before any early-out: a no-op identify against a
    // session that later gets recreated must still be replayable.
    this.lastIdentify = { userId, userData, userHash };

    const sessionNeedsUpdate = this.checkIfSessionNeedsUpdate(userId, userData);
    const needsFileIdentity = !!userHash && this.session?.authenticatedFilesRequired && (!this.session?.fileAccessToken || Date.parse(this.session.fileAccessExpiresAt) <= Date.now());
    if (!sessionNeedsUpdate && !refreshFileSession && !needsFileIdentity) {
      return;
    }

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
        } catch (exp) {}

        self.identifyInFlight = true;

        http.onerror = () => {
          self.identifyInFlight = false;
          reject();
        };
        http.onreadystatechange = function (e) {
          if (http.readyState === 4) {
            self.identifyInFlight = false;
            if (http.status === 200 || http.status === 201) {
              try {
                const sessionData = JSON.parse(http.responseText);
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
            lang: GleapTranslationManager.getInstance().getActiveLanguage(),
            deviceType: getDeviceType(),
            platform: 'web',
          })
        );
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
