import ChecklistNetworkManager from "./ChecklistNetworkManager";
import {
  GleapBannerManager,
  GleapEventManager,
  GleapFrameManager,
  GleapModalManager,
  GleapNotificationManager,
  GleapStreamedEvent,
  GleapTranslationManager,
} from "./Gleap";
import {
  eraseGleapCookie,
  getDeviceType,
  getGleapCookie,
  loadFromGleapCache,
  saveToGleapCache,
  setGleapCookie,
} from "./GleapHelper";
import GleapTooltipManager from "./GleapTooltipManager";

export default class GleapSession {
  apiUrl = "https://api.gleap.io";
  wsApiUrl = "wss://ws.gleap.io";
  sdkKey = null;
  updatingSession = false;
  useCookies = false;
  session = {
    gleapId: null,
    gleapHash: null,
    name: "",
    email: "",
    userId: "",
    phone: "",
    value: 0,
  };
  ready = false;
  onSessionReadyListener = [];

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
   * Returns the current session name.
   * @returns string
   */
  getName() {
    try {
      return this.session.name
        ? this.session.name
            .split(" ")[0]
            .split("@")[0]
            .split(".")[0]
            .split("+")[0]
        : "";
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
      http.setRequestHeader("Api-Token", this.sdkKey);
      http.setRequestHeader("Gleap-Id", this.session.gleapId);
      http.setRequestHeader("Gleap-Hash", this.session.gleapHash);
    }
  };

  clearSession = (attemp = 0, retry = true) => {
    if (this.session && this.session.gleapHash) {
      GleapEventManager.notifyEvent(
        "unregister-pushmessage-group",
        `gleapuser-${this.session.gleapHash}`
      );
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
      name: "",
      email: "",
      userId: "",
      phone: "",
      value: 0,
    };

    GleapFrameManager.getInstance().sendMessage(
      {
        name: "session-cleared",
      },
      true
    );
    GleapNotificationManager.getInstance().clearAllNotifications(false);
    GleapNotificationManager.getInstance().setNotificationCount(0);
    GleapBannerManager.getInstance().removeBannerUI();
    GleapModalManager.getInstance().hideModal();

    if (retry) {
      if (!isNaN(attemp)) {
        // Exponentially retry to renew session.
        const newTimeout = Math.pow(attemp, 2) * 10;
        setTimeout(() => {
          this.startSession(attemp + 1);
        }, newTimeout * 1000);
      }
    }
  };

  validateSession = (session) => {
    if (!session || !session.gleapId) {
      return;
    }

    let sessionChanged = false;
    if (this.session?.gleapId !== session?.gleapId) {
      sessionChanged = true;
    }

    // Unregister previous group.
    if (this.session && this.session.gleapHash) {
      GleapEventManager.notifyEvent(
        "unregister-pushmessage-group",
        `gleapuser-${this.session.gleapHash}`
      );
    }

    saveToGleapCache(`session-${this.sdkKey}`, session);
    if (this.useCookies) {
      setGleapCookie(
        `session-${this.sdkKey}`,
        encodeURIComponent(JSON.stringify(session)),
        365
      );
    }

    this.session = session;
    this.ready = true;

    // Register new push group.
    if (this.session && this.session.gleapHash) {
      GleapEventManager.notifyEvent(
        "register-pushmessage-group",
        `gleapuser-${this.session.gleapHash}`
      );
    }

    if (sessionChanged) {
      // Load tooltips.
      setTimeout(() => {
        // Clear cache first, as the session context has changed.
        ChecklistNetworkManager.getInstance().clearCache();

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

      if (typeof window.dispatchEvent === "function") {
        window.dispatchEvent(new CustomEvent("session-updated"));
      }
    }

    this.notifySessionReady();
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
    if (
      !(this.session && this.session.gleapId && this.session.gleapId.length > 0)
    ) {
      const cachedSession = loadFromGleapCache(`session-${this.sdkKey}`);
      if (cachedSession) {
        this.validateSession(cachedSession);
      }
    }

    const self = this;
    const http = new XMLHttpRequest();
    http.open("POST", self.apiUrl + "/sessions");
    http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    http.setRequestHeader("Api-Token", self.sdkKey);
    try {
      if (this.session && this.session.gleapId && this.session.gleapHash) {
        http.setRequestHeader("Gleap-Id", this.session.gleapId);
        http.setRequestHeader("Gleap-Hash", this.session.gleapHash);
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
            self.clearSession(attemp, true);
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
        if (
          JSON.stringify(this.session[userDataKey]) !==
          JSON.stringify(userData[userDataKey])
        ) {
          // Check custom data for a match.
          if (
            !(
              this.session.customData &&
              JSON.stringify(this.session.customData[userDataKey]) ===
                JSON.stringify(userData[userDataKey])
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
          return reject("Session not ready yet.");
        }

        const http = new XMLHttpRequest();
        http.open("POST", self.apiUrl + "/sessions/partialupdate");
        http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        http.setRequestHeader("Api-Token", self.sdkKey);
        try {
          http.setRequestHeader("Gleap-Id", self.session.gleapId);
          http.setRequestHeader("Gleap-Hash", self.session.gleapHash);
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
            type: "js",
            sdkVersion: SDK_VERSION,
            ws: true,
          })
        );
      });
    });
  };

  identifySession = (userId, userData, userHash) => {
    const sessionNeedsUpdate = this.checkIfSessionNeedsUpdate(userId, userData);
    if (!sessionNeedsUpdate) {
      return;
    }

    const self = this;
    return new Promise((resolve, reject) => {
      // Wait for gleap session to be ready.
      this.setOnSessionReady(function () {
        if (!self.session.gleapId || !self.session.gleapHash) {
          return reject("Session not ready yet.");
        }

        const http = new XMLHttpRequest();
        http.open("POST", self.apiUrl + "/sessions/identify");
        http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        http.setRequestHeader("Api-Token", self.sdkKey);
        try {
          http.setRequestHeader("Gleap-Id", self.session.gleapId);
          http.setRequestHeader("Gleap-Hash", self.session.gleapHash);
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

        var dataToSend = {
          ...userData,
        };

        if (userData.customData) {
          delete dataToSend["customData"];
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
          return reject("Session not ready yet.");
        }

        const http = new XMLHttpRequest();
        http.open("POST", self.apiUrl + "/outbound/producttours");
        http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        http.setRequestHeader("Api-Token", self.sdkKey);
        try {
          http.setRequestHeader("Gleap-Id", self.session.gleapId);
          http.setRequestHeader("Gleap-Hash", self.session.gleapHash);
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
          return reject("Session not ready yet.");
        }

        const http = new XMLHttpRequest();
        http.open("POST", self.apiUrl + "/outbound/producttourvalidation");
        http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        http.setRequestHeader("Api-Token", self.sdkKey);
        try {
          http.setRequestHeader("Gleap-Id", self.session.gleapId);
          http.setRequestHeader("Gleap-Hash", self.session.gleapHash);
        } catch (exp) {}

        http.onerror = () => {
          reject();
        };
        http.onreadystatechange = function (e) {
          if (http.readyState === 4) {
            if (http.status === 200 || http.status === 201) {
              try {
                const tourData = JSON.parse(http.responseText);
                if (
                  tourData &&
                  tourData.status === "live" &&
                  tourData.passedPageFilter
                ) {
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
