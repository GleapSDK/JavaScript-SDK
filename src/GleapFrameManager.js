import AutoConfig from "./AutoConfig";
import GleapEventManager from "./GleapEventManager";
import GleapFeedbackButtonManager from "./GleapFeedbackButtonManager";
import GleapSession from "./GleapSession";
import StreamedEvent from "./StreamedEvent";

export default class GleapFrameManager {
  gleapFrameContainer = null;
  gleapFrame = null;
  injectedFrame = false;
  widgetOpened = false;
  listeners = [];
  frameURL = "http://localhost:3000";

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
    elem.className = "gleap-frame-container gleap-frame-container--hidden";
    elem.innerHTML = `<iframe src="${this.frameURL}" class="gleap-frame" scrolling="no" title="Gleap Widget Window" allow="autoplay; encrypted-media; fullscreen;" frameborder="0"></iframe>`;
    document.body.appendChild(elem);

    this.gleapFrameContainer = elem;
    this.gleapFrame = document.querySelector(".gleap-frame");
  };

  showWidget() {
    this.gleapFrameContainer.classList.remove('gleap-frame-container--hidden');
    this.widgetOpened = true;
    GleapEventManager.notifyEvent("open");
  }

  hideWidget() {
    this.gleapFrameContainer.classList.add('gleap-frame-container--hidden');
    this.widgetOpened = false;
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
        StreamedEvent.getInstance().start();

        // Inject the widget buttons
        GleapFeedbackButtonManager.getInstance().injectFeedbackButton();

        // Answer with config.
        this.sendMessage({
          name: "config-update",
          data: AutoConfig.getInstance().getFlowConfig()
        });

        this.sendMessage({
          name: "actions-update",
          data: AutoConfig.getInstance().getProjectActions()
        });

        this.sendMessage({
          name: "session-update",
          data: GleapSession.getInstance().getSession()
        });
      }

      if (data.name === "height-update") {
        this.gleapFrameContainer.style.maxHeight = data.data + "px";
      }

      if (data.name === "send-form") {
        const formData = data.data;

        setTimeout(() => {
          this.sendMessage({
            name: "form-sent"
          });
        }, 2000);
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
