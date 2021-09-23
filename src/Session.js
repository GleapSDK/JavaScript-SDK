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

  clearSession = () => {
    try {
      localStorage.removeItem(`bb-session-id`);
      localStorage.removeItem(`bb-session-hash`);
      localStorage.removeItem(`bb-session-type`);
    } catch (exp) {}
  };

  startSession = (data) => {
    const self = this;
    return new Promise((resolve, reject) => {
      const http = new XMLHttpRequest();
      http.open("POST", this.apiUrl + "/sessions/start");
      http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      http.setRequestHeader("Api-Token", this.sdkKey);

      // Set the guest id & hash
      try {
        const sessionType = localStorage.getItem(`bb-session-type`);
        if (sessionType === "GUEST") {
          const guestId = localStorage.getItem(`bb-session-id`);
          const guestHash = localStorage.getItem(`bb-session-hash`);
          if (guestId && guestHash) {
            http.setRequestHeader("Guest-Id", guestId);
            http.setRequestHeader("Guest-Hash", guestHash);
          }
        }
      } catch (exp) {}

      // Additionally set the user id
      if (data && data.userId) {
        http.setRequestHeader("User-Id", data.userId);
      }
      if (data && data.userHash) {
        http.setRequestHeader("User-Hash", data.userHash);
      }

      // Create user data.
      var userData = {};
      if (data && data.name) {
        userData["name"] = data.name;
      }
      if (data && data.email) {
        userData["email"] = data.email;
      }

      http.onerror = (error) => {
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

              resolve(sessionData);
            } catch (exp) {
              reject(exp);
            }
          } else {
            reject();
          }
        }
      };
      http.send(JSON.stringify(userData));
    });
  };
}
