import Gleap from "./Gleap";
import { loadFromGleapCache, saveToGleapCache } from "./GleapHelper";

export default class GleapSession {
  apiUrl = "https://api.gleap.io";
  widgetUrl = "https://widget.gleap.io";
  sdkKey = null;
  session = {
    gleapId: null,
    gleapHash: null,
    name: "",
    email: "",
    userId: "",
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
   * Returns the Gleap session object.
   * @returns 
   */
  getSession() {
    return this.session;
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

  clearSession = (renewSession = true) => {
    try {
      localStorage.removeItem(`bb-remember-reportedBy`);
      saveToGleapCache(`session-${this.sdkKey}`, null);
    } catch (exp) {}

    this.session = {
      id: null,
      hash: null,
      type: null,
      name: "",
      email: "",
    };

    // Start guest session.
    if (renewSession) {
      this.startSession();
    }
  };

  validateSession = (session) => {
    if (!session) {
      return;
    }

    saveToGleapCache(`session-${this.sdkKey}`, session);

    this.session = session;
    this.ready = true;

    // Optionally update UI.
    const userNameInfo = document.querySelector("#bb-user-name");
    if (userNameInfo) {
      if (session.name && Gleap.getInstance().showUserName) {
        userNameInfo.textContent = session.name;
      } else {
        userNameInfo.textContent = "";
      }
    }

    this.notifySessionReady();
  };

  startSession = () => {
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
      http.setRequestHeader("App-Widget", Gleap.getInstance().widgetOnly);
    } catch (exp) {}
    http.onerror = (error) => {
      self.clearSession(false);
    };
    http.onreadystatechange = function (e) {
      if (http.readyState === XMLHttpRequest.DONE) {
        if (http.status === 200 || http.status === 201) {
          try {
            const sessionData = JSON.parse(http.responseText);
            self.validateSession(sessionData);
          } catch (exp) {}
        } else {
          self.clearSession(false);
        }
      }
    };
    http.send(JSON.stringify({}));
  };

  notifySessionReady() {
    console.log(this);
    if (this.onSessionReadyListener.length > 0) {
      for (var i = 0; i < this.onSessionReadyListener.length; i++) {
        this.onSessionReadyListener[i]();
      }
    }
    this.onSessionReadyListener = [];
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

  identifySession = (userId, userData) => {
    if (!this.checkIfSessionNeedsUpdate(userId, userData)) {
      return;
    }

    const self = this;
    return new Promise((resolve, reject) => {
      // Wait for gleap session to be ready.
      this.setOnSessionReady(function () {
        if (!self.session.gleapId || !self.session.gleapHash) {
          return reject();
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
          if (http.readyState === XMLHttpRequest.DONE) {
            if (http.status === 200 || http.status === 201) {
              try {
                const sessionData = JSON.parse(http.responseText);
                self.validateSession(sessionData);

                resolve(sessionData);
              } catch (exp) {
                reject(exp);
              }
            } else {
              self.clearSession(true);
              reject();
            }
          }
        };
        http.send(
          JSON.stringify({
            ...userData,
            userId,
          })
        );
      });
    });
  };
}
