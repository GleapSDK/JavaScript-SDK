import { GleapStreamedEvent, GleapEventManager, GleapMarkerManager, GleapFeedback, GleapFeedbackButtonManager, GleapSession, GleapConfigManager } from "./Gleap";

export default class GleapFrameManager {
  gleapFrameContainer = null;
  gleapFrame = null;
  injectedFrame = false;
  widgetOpened = false;
  listeners = [];
  frameURL = "http://localhost:3000";
  markerManager = undefined;

  // GleapFrameManager singleton
  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new GleapFrameManager();
    }
    return this.instance;
  }

  constructor() {
    this.startCommunication();
  }

  isOpened() {
    return this.widgetOpened;
  }

  injectFrame = () => {
    if (this.injectedFrame) {
      return;
    }
    this.injectedFrame = true;

    var elem = document.createElement("div");
    elem.className = "gleap-frame-container gleap-frame-container--hidden gleap-hidden";
    elem.innerHTML = `<div class="gleap-frame-container-inner"><iframe src="${this.frameURL}" class="gleap-frame" scrolling="no" title="Gleap Widget Window" allow="autoplay; encrypted-media; fullscreen;" frameborder="0"></iframe></div>`;
    document.body.appendChild(elem);

    this.gleapFrameContainer = elem;
    this.gleapFrame = document.querySelector(".gleap-frame");
  };

  showWidget() {
    this.gleapFrameContainer.classList.remove('gleap-frame-container--hidden');
    this.widgetOpened = true;
    GleapFeedbackButtonManager.getInstance().updateFeedbackButtonState();
    GleapEventManager.notifyEvent("open");
  }

  hideMarkerManager() {
    // Reset marker manager
    if (this.markerManager) {
      this.markerManager.clear();
      this.markerManager = null;
    }
  }

  hideWidget() {
    this.hideMarkerManager();
    this.gleapFrameContainer.classList.add('gleap-frame-container--hidden');
    this.widgetOpened = false;
    GleapFeedbackButtonManager.getInstance().updateFeedbackButtonState();
    GleapEventManager.notifyEvent("close");
  }

  sendMessage(data) {
    if (this.gleapFrame) {
      this.gleapFrame.contentWindow.postMessage(JSON.stringify(data), "*");
    }
  };

  startCommunication() {
    // Listen for messages.
    this.addMessageListener((data) => {
      if (data.name === "ping") {
        GleapStreamedEvent.getInstance().start();

        // Inject the widget buttons
        GleapFeedbackButtonManager.getInstance().injectFeedbackButton();

        // Answer with config.
        this.sendMessage({
          name: "config-update",
          data: {
            config: GleapConfigManager.getInstance().getFlowConfig(),
            actions: GleapConfigManager.getInstance().getProjectActions()
          }
        });

        this.sendMessage({
          name: "session-update",
          data: {
            sessionData: GleapSession.getInstance().getSession(),
            apiUrl: GleapSession.getInstance().apiUrl,
            sdkKey: GleapSession.getInstance().sdkKey,
          }
        });
      }

      if (data.name === "height-update") {
        this.gleapFrameContainer.style.maxHeight = data.data + "px";
      }

      if (data.name === "cleanup-drawings") {
        this.hideMarkerManager();
      }

      if (data.name === "close-widget") {
        this.hideWidget();
      }

      if (data.name === "send-feedback") {
        const formData = data.data.formData;
        const action = data.data.action;

        const feedback = new GleapFeedback(action.feedbackType, "MEDIUM", formData, false, action.excludeData);
        feedback.sendFeedback().then(() => {
          this.sendMessage({
            name: "feedback-sent"
          });
        }).catch((error) => {
          this.sendMessage({
            name: "feedback-sending-failed",
            data: "Error sending data."
          });
        });
      }

      if (data.name === "start-screen-drawing") {
        this.hideWidget();

        // Show screen drawing.
        this.markerManager = new GleapMarkerManager(data.data);
        this.markerManager.show((success) => {
          if (!success) {
            this.hideMarkerManager();
          }
          this.showWidget();
        });
      }
    });

    // Add window message listener.
    window.addEventListener("message", (event) => {
      if (event.origin !== this.frameURL) {
        return;
      }

      try {
        const data = JSON.parse(event.data);
        for (var i = 0; i < this.listeners.length; i++) {
          if (this.listeners[i]) {
            this.listeners[i](data);
          }
        }
      } catch (exp) { }
    });
  }

  addMessageListener(callback) {
    this.listeners.push(callback);
  }
}
