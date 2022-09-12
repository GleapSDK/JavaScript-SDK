import { GleapFrameManager, GleapNotificationManager } from "./Gleap";
import { loadFromGleapCache, saveToGleapCache } from "./GleapHelper";

export default class GleapSession {
  apiUrl = "https://api.gleap.io";
  sdkKey = null;
  updatingSession = false;
  session = {
    gleapId: null,
    gleapHash: null,
    name: "",
    email: "",
    userId: "",
    phone: "",
    value: 0
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
      return this.session.name ? this.session.name.split(' ')[0].split('@')[0].split('.')[0].split('+')[0] : "";
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

  constructor() { }

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
    try {
      saveToGleapCache(`session-${this.sdkKey}`, null);
    } catch (exp) { }

    GleapFrameManager.getInstance().sendMessage({
      name: "session-cleared"
    }, true);

    this.session = {
      id: null,
      hash: null,
      type: null,
      name: "",
      email: "",
      phone: "",
      value: 0,
    };

    if (retry) {
      if (!isNaN(attemp)) {
        // Exponentially retry to renew session.
        const newTimeout = (Math.pow(attemp, 2) * 10) + 10;
        setTimeout(() => {
          this.startSession(attemp + 1);
        }, newTimeout * 1000);
      }
    }
  };

  validateSession = (session) => {
    if (!session) {
      return;
    }

    saveToGleapCache(`session-${this.sdkKey}`, session);

    this.session = session;
    this.ready = true;

    this.notifySessionReady();
  };

  startSession = (attemp = 0) => {
    // Check if session is already ready.
    const cachedSession = loadFromGleapCache(`session-${this.sdkKey}`);
    if (cachedSession) {
      this.validateSession(cachedSession);
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
    } catch (exp) { }
    http.onreadystatechange = function (e) {
      if (http.readyState === 4) {
        if (http.status === 200 || http.status === 201) {
          try {
            const sessionData = JSON.parse(http.responseText);
            self.validateSession(sessionData);
          } catch (exp) { }
        } else {
          if (http.status !== 429) {
            self.clearSession(attemp, true);
          }
        }
      }
    };
    http.send(JSON.stringify({}));
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
    } catch (exp) { }

    if (userData) {
      var userDataKeys = Object.keys(userData);
      for (var i = 0; i < userDataKeys.length; i++) {
        var userDataKey = userDataKeys[i];
        if (this.session[userDataKey] !== userData[userDataKey]) {
          return true;
        }
      }
    }

    return false;
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
          return reject("No session ready to identify. This usually means that you called clearSession() directly before calling this method.");
        }
        
        const http = new XMLHttpRequest();
        http.open("POST", self.apiUrl + "/sessions/identify");
        http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        http.setRequestHeader("Api-Token", self.sdkKey);
        try {
          http.setRequestHeader("Gleap-Id", self.session.gleapId);
          http.setRequestHeader("Gleap-Hash", self.session.gleapHash);
        } catch (exp) { }

        http.onerror = () => {
          reject();
        };
        http.onreadystatechange = function (e) {
          if (http.readyState === 4) {
            if (http.status === 200 || http.status === 201) {
              try {
                const sessionData = JSON.parse(http.responseText);
                self.validateSession(sessionData);

                GleapNotificationManager.getInstance().clearAllNotifications(true);
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
            ...userData,
            userId,
            userHash,
          })
        );
      });
    });
  };
}
