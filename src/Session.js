export default class Session {
  apiUrl = "https://api.gleap.io";
  sdkKey = null;
  session = {
    id: null,
    hash: null,
    type: null,
    name: "",
    email: "",
  };
  ready = false;
  onSessionReadyListener = [];

  // Session singleton
  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new Session();
      return this.instance;
    } else {
      return this.instance;
    }
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
    if (http) {
      http.setRequestHeader("Api-Token", this.sdkKey);
      http.setRequestHeader("Gleap-Id", this.session.id);
      http.setRequestHeader("Gleap-Hash", this.session.hash);
    }
  };

  clearSession = (renewSession = true) => {
    try {
      localStorage.removeItem(`bb-session-id`);
      localStorage.removeItem(`bb-session-hash`);
      localStorage.removeItem(`bb-session-type`);
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

  startSession = (userId, userHash, userData) => {
    const self = this;
    return new Promise((resolve, reject) => {
      const http = new XMLHttpRequest();
      http.open("POST", this.apiUrl + "/sessions");
      http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      http.setRequestHeader("Api-Token", this.sdkKey);

      // Set the guest id & hash
      try {
        const sessionType = localStorage.getItem(`bb-session-type`);
        const sessionId = localStorage.getItem(`bb-session-id`);
        const sessionHash = localStorage.getItem(`bb-session-hash`);
        if (sessionType === "GUEST") {
          if (sessionId && sessionHash) {
            http.setRequestHeader("Guest-Id", sessionId);
            http.setRequestHeader("Guest-Hash", sessionHash);
          }
        } else {
          // Existing session from cache.
          if (sessionId && sessionHash && !userId && !userHash) {
            http.setRequestHeader("User-Id", sessionId);
            http.setRequestHeader("User-Hash", sessionHash);
          }
        }
      } catch (exp) {}

      // Additionally set the user id
      if (userId && userHash) {
        http.setRequestHeader("User-Id", userId);
        http.setRequestHeader("User-Hash", userHash);
      }

      http.onerror = (error) => {
        self.clearSession(false);
        reject();
      };
      http.onreadystatechange = function (e) {
        if (http.readyState === XMLHttpRequest.DONE) {
          if (http.status === 200 || http.status === 201) {
            try {
              const sessionData = JSON.parse(http.responseText);

              try {
                localStorage.setItem(`bb-session-id`, sessionData.id);
                localStorage.setItem(`bb-session-hash`, sessionData.hash);
                localStorage.setItem(`bb-session-type`, sessionData.type);
              } catch (exp) {}

              self.session = sessionData;
              self.ready = true;

              // Session is ready. Notify all subscribers.
              if (self.onSessionReadyListener.length > 0) {
                for (var i = 0; i < self.onSessionReadyListener.length; i++) {
                  self.onSessionReadyListener[i]();
                }
              }
              self.onSessionReadyListener = [];

              resolve(sessionData);
            } catch (exp) {
              reject(exp);
            }
          } else {
            self.clearSession(false);
            reject();
          }
        }
      };
      http.send(JSON.stringify(userData));
    });
  };
}
