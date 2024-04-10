import { loadIcon } from "./UI";
import GleapAdminHelper from "./GleapAdminHelper";

export default class GleapAdminManager {
  libraryInstance = null;
  lastUrl = undefined;
  injectedFrame = false;
  gleapFrameContainer = null;
  gleapCollapseUI = null;
  injectedCollapseUI = false;
  gleapFrame = null;
  configData = null;
  adminHelper = null;
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

  initAdminHelper() {
    const self = this;

    self.adminHelper = new GleapAdminHelper();

    try {
      self.adminHelper.onElementPicked = (selector) => {
        self.toggleCollapseUI(true);
        self.sendMessageToTourBuilder({
          name: "element-picked",
          data: {
            selector
          }
        });
      };
    } catch (e) {
      console.log(e);
    }

    self.injectFrame();
    self.injectCollapseUI();
    self.setFrameHeight("loading");
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
            self.initAdminHelper();
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

          if (data.name === "click") {
            try {
              document.querySelector(data.data.selector).click();
            } catch (e) {
              console.log(e);
            }
          }

          if (data.name === "status-changed") {
            self.status = data.data;
            this.setFrameHeight(self.status);
            self.adminHelper.stopPicker();

            if (self.status === "picker") {
              self.adminHelper.startPicker();
            }
          }
        }
      } catch (exp) {}
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

  toggleCollapseUI = (onlyIfActive = false) => {
    const COLLAPSE_UI_ACTIVE_CLASS = "gleap-admin-collapse-ui-active";
    const FRAME_CONTAINER_ACTIVE_CLASS = "gleap-admin-frame-container-active";

    // Helper function to check if an element has an active class
    const isActive = (element, activeClass) => element && element.classList.contains(activeClass);

    // Check if onlyIfActive is true and if the UI elements are already inactive
    if (onlyIfActive && (!isActive(this.gleapCollapseUI, COLLAPSE_UI_ACTIVE_CLASS) || !isActive(this.gleapFrameContainer, FRAME_CONTAINER_ACTIVE_CLASS))) {
      return; // Return early without toggling the UI
    }

    // Toggle the UI elements
    if (this.gleapCollapseUI) {
      this.gleapCollapseUI.classList.toggle(COLLAPSE_UI_ACTIVE_CLASS);
    }
    if (this.gleapFrameContainer) {
      this.gleapFrameContainer.classList.toggle(FRAME_CONTAINER_ACTIVE_CLASS);
    }
  }

  injectCollapseUI = () => {
    if (this.injectedCollapseUI) {
      return;
    }
    this.injectedCollapseUI = true;

    // Inject widget HTML.
    var elem = document.createElement("div");
    elem.className =
      "gleap-admin-collapse-ui";
    elem.innerHTML = `<div class="gleap-admin-collapse-ui-icon">
    ${loadIcon("arrowdown")}
    </div>`;
    document.body.appendChild(elem);

    this.gleapCollapseUI = elem;

    elem.addEventListener("click", () => {
      this.toggleCollapseUI();
    });
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
