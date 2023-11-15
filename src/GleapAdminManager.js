
export default class GleapAdminManager {
  libraryInstance = null;
  lastUrl = undefined;

  // GleapAdminManager singleton
  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new GleapAdminManager();
    }
    return this.instance;
  }

  logCurrentPage() {
    const currentUrl = window.location.href;
    if (currentUrl && currentUrl !== this.lastUrl) {
      this.lastUrl = currentUrl;

      this.sendMessage({
        name: "page-changed",
        data: {
          page: currentUrl,
        }
      });
    }
  }

  startPageListener() {
    const self = this;
    setInterval(function () {
      self.logCurrentPage();
    }, 1000);
  }

  loadScript(url, callback) {
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;

    script.onload = function () {
      if (typeof callback === 'function') {
        callback();
      }
    };

    script.onreadystatechange = function () {
      if (this.readyState === 'complete' || this.readyState === 'loaded') {
        script.onload();
      }
    };

    document.head.appendChild(script);
  }

  loadAdminScript() {
    var self = this;
    this.loadScript('https://jsadminhelper.gleap.io/index.js', function () {
      if (window.GleapHelper) {
        self.libraryInstance = new window.GleapHelper.default();
        if (self.libraryInstance) {
          self.libraryInstance.onElementPicked = (selector) => {
            self.sendMessage({
              name: "element-picked",
              data: {
                selector
              }
            });
          };
        }
      }
    });
  }

  start() {
    var self = this;

    // Add window message listener.
    window.addEventListener("message", (event) => {
      if (!event.origin || !(event.origin === "https://app.gleap.io" || event.origin.startsWith("http://localhost"))) {
        return;
      }

      try {
        const data = JSON.parse(event.data);
        if (data.type !== "admin") {
          return;
        }

        if (data.name === "load") {
          self.loadAdminScript();
        }

        if (data.name === "pick") {
          self.libraryInstance.startPicker();
        }

        if (data.name === "navigate") {
          self.libraryInstance.stopPicker();
        }
      } catch (exp) { }
    });

    this.sendMessage({
      name: "init",
    });

    this.startPageListener();
  }

  sendMessage(data) {
    try {
      if (window && window.parent) {
        window.parent.postMessage(JSON.stringify({
          ...data,
          type: "admin"
        }), "*");
      }
    } catch (e) { }
  }

}
