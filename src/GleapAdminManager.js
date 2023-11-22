export default class GleapAdminManager {
  libraryInstance = null;
  lastUrl = undefined;
  injectedFrame = false;
  gleapFrameContainer = null;
  gleapFrame = null;
  configData = null;
  status = "navigate";

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

      this.sendMessageToTourBuilder({
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
            self.sendMessageToTourBuilder({
              name: "element-picked",
              data: {
                selector
              }
            });
          };

          self.injectFrame();
          self.setFrameHeight("loading");
        }
      }
    });
  }

  setFrameHeight(state) {
    if (this.gleapFrameContainer) {
      var height = "";
      if (state === "picker" || state === "navigate") {
        height = "65px";
      } else if (state === "editor") {
        height = "100vh";
      } else {
        height = "0px";
      }
      this.gleapFrameContainer.style.height = height;
    }
  }

  start() {
    if (typeof window === "undefined") {
      return;
    }

    if (window.gleapAdminDisabled) {
      return;
    }

    var self = this;

    // Add window message listener.
    window.addEventListener("message", (event) => {
      if (!event.origin || !event.origin === "https://app.gleap.io") {
        return;
      }

      try {
        const data = JSON.parse(event.data);
        if (data.type === "admin") {
          if (data.name === "load") {
            self.configData = data.data;
            self.loadAdminScript();
          }
        }

        if (data.type === "tourbuilder") {
          if (data.name === "loaddata") {
            this.sendMessageToTourBuilder({
              name: "data",
              data: self.configData,
            });
          }

          if (data.name === "save") {
            this.sendMessage({
              name: "save",
              data: data.data,
            });
          }

          if (data.name === "status-changed") {
            self.status = data.data;
            this.setFrameHeight(self.status);
            self.libraryInstance.stopPicker();

            if (self.status === "picker") {
              self.libraryInstance.startPicker();
            }
          }
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
      if (window && window.opener) {
        window.opener.postMessage(JSON.stringify({
          ...data,
          type: "admin"
        }), "*");
      }
    } catch (e) { }
  }

  sendMessageToTourBuilder(data) {
    try {
      if (this.gleapFrame && this.gleapFrame.contentWindow) {
        this.gleapFrame.contentWindow.postMessage(JSON.stringify({
          ...data,
          type: "tourbuilder"
        }), "*");
      }
    } catch (e) { }
  }

  injectFrame = () => {
    if (this.injectedFrame) {
      return;
    }
    this.injectedFrame = true;

    // Inject widget HTML.
    var elem = document.createElement("div");
    elem.className =
      "gleap-admin-frame-container";
    elem.innerHTML = `<iframe src="https://app.gleap.io/producttourbuilder" class="gleap-admin-frame" scrolling="no" title="Gleap Admin Window" allow="autoplay; encrypted-media; fullscreen;" frameborder="0"></iframe>`;
    document.body.appendChild(elem);

    this.gleapFrameContainer = elem;
    this.gleapFrame = document.querySelector(".gleap-admin-frame");
  };
}
