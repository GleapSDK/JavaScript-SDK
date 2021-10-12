export default class Session {
  apiUrl = "https://api.gleap.io";
  sdkKey = null;
  session = {
    gleapId: null,
    gleapHash: null,
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
    if (http && this.session) {
      http.setRequestHeader("Api-Token", this.sdkKey);
      http.setRequestHeader("Gleap-Id", this.session.gleapId);
      http.setRequestHeader("Gleap-Hash", this.session.gleapHash);
    }
  };

  clearSession = (renewSession = true) => {
    try {
      localStorage.removeItem(`gleap-id`);
      localStorage.removeItem(`gleap-hash`);
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

  startSession = () => {
    const self = this;
    return new Promise((resolve, reject) => {
      const http = new XMLHttpRequest();
      http.open("POST", self.apiUrl + "/sessions");
      http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      http.setRequestHeader("Api-Token", self.sdkKey);
      try {
        const gleapId = localStorage.getItem(`gleap-id`);
        const gleapHash = localStorage.getItem(`gleap-hash`);
        if (gleapId && gleapHash) {
          http.setRequestHeader("Gleap-Id", gleapId);
          http.setRequestHeader("Gleap-Hash", gleapHash);
        }
      } catch (exp) {}

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
                localStorage.setItem(`gleap-id`, sessionData.gleapId);
                localStorage.setItem(`gleap-hash`, sessionData.gleapHash);
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
      http.send(JSON.stringify({}));
    });
  };

  identifySession = (userId, userData) => {
    const self = this;
    return new Promise((resolve, reject) => {
      // Wait for gleap session to be ready.
      this.setOnSessionReady(function () {
        const http = new XMLHttpRequest();
        http.open("POST", self.apiUrl + "/sessions/identify");
        http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        http.setRequestHeader("Api-Token", self.sdkKey);
        try {
          const gleapId = localStorage.getItem(`gleap-id`);
          const gleapHash = localStorage.getItem(`gleap-hash`);
          if (gleapId && gleapHash) {
            http.setRequestHeader("Gleap-Id", gleapId);
            http.setRequestHeader("Gleap-Hash", gleapHash);
          }
        } catch (exp) {}

        http.onerror = () => {
          reject();
        };
        http.onreadystatechange = function (e) {
          if (http.readyState === XMLHttpRequest.DONE) {
            if (http.status === 200 || http.status === 201) {
              try {
                const sessionData = JSON.parse(http.responseText);

                try {
                  localStorage.setItem(`gleap-id`, sessionData.gleapId);
                  localStorage.setItem(`gleap-hash`, sessionData.gleapHash);
                } catch (exp) {}

                self.session = sessionData;
                self.ready = true;

                // Optionally update UI.
                const userNameInfo = document.querySelector("#bb-user-name");
                if (userNameInfo && sessionData.name) {
                  userNameInfo.textContent = sessionData.name;
                }

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
