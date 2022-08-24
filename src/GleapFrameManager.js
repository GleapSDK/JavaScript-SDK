import { GleapStreamedEvent, GleapAudioManager, GleapNotificationManager, GleapCustomActionManager, GleapEventManager, GleapMarkerManager, GleapFeedback, GleapFeedbackButtonManager, GleapTranslationManager, GleapSession, GleapConfigManager } from "./Gleap";
import { widgetMaxHeight } from "./UI";

export default class GleapFrameManager {
  frameUrl = "https://messenger.gleap.io";
  gleapFrameContainer = null;
  gleapFrame = null;
  injectedFrame = false;
  widgetOpened = false;
  listeners = [];
  appMode = "widget";
  markerManager = undefined;
  escListener = undefined;
  frameHeight = 0;
  queue = [];

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

  setAppMode(appMode) {
    this.appMode = appMode;
    this.updateFrameStyle();

    const innerContainer = document.querySelector(".gleap-frame-container-inner");
    if ((appMode === "widget" || appMode === "survey_full") && innerContainer) {
      innerContainer.style.maxHeight = `${widgetMaxHeight}px`;
    }
  }

  registerEscListener() {
    if (this.escListener) {
      return;
    }

    this.escListener = (evt) => {
      evt = evt || window.event;
      if (evt.key === "Escape") {
        this.hideWidget();
      }
    };
    document.addEventListener("keydown", this.escListener);
  }

  unregisterEscListener() {
    if (this.escListener) {
      document.removeEventListener("keydown", this.escListener);
      this.escListener = null;
    }
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
    elem.innerHTML = `<div class="gleap-frame-container-inner"><iframe src="${this.frameUrl}" class="gleap-frame" scrolling="yes" title="Gleap Widget Window" allow="autoplay; encrypted-media; fullscreen;" frameborder="0"></iframe></div>`;
    document.body.appendChild(elem);

    this.gleapFrameContainer = elem;
    this.gleapFrame = document.querySelector(".gleap-frame");

    this.updateFrameStyle();
  };

  updateFrameStyle = () => {
    if (!this.gleapFrameContainer) {
      return;
    }

    const surveyStyle = "gleap-frame-container--survey";
    const surveyFullStyle = "gleap-frame-container--survey-full";
    const classicStyle = "gleap-frame-container--classic";
    const classicStyleLeft = "gleap-frame-container--classic-left";
    const modernStyleLeft = "gleap-frame-container--modern-left";
    const allStyles = [classicStyle, classicStyleLeft, modernStyleLeft, surveyStyle, surveyFullStyle];
    for (let i = 0; i < allStyles.length; i++) {
      this.gleapFrameContainer.classList.remove(allStyles[i]);
    }

    var styleToApply = undefined;
    const flowConfig = GleapConfigManager.getInstance().getFlowConfig();
    if (flowConfig.feedbackButtonPosition === GleapFeedbackButtonManager.FEEDBACK_BUTTON_CLASSIC ||
      flowConfig.feedbackButtonPosition === GleapFeedbackButtonManager.FEEDBACK_BUTTON_CLASSIC_BOTTOM) {
      styleToApply = classicStyle;
    }
    if (flowConfig.feedbackButtonPosition === GleapFeedbackButtonManager.FEEDBACK_BUTTON_CLASSIC_LEFT) {
      styleToApply = classicStyleLeft;
    }
    if (flowConfig.feedbackButtonPosition === GleapFeedbackButtonManager.FEEDBACK_BUTTON_BOTTOM_LEFT) {
      styleToApply = modernStyleLeft;
    }
    if (styleToApply) {
      this.gleapFrameContainer.classList.add(styleToApply);
    }

    if (this.appMode === "survey") {
      this.gleapFrameContainer.classList.add(surveyStyle);
    }
    if (this.appMode === "survey_full") {
      this.gleapFrameContainer.classList.add(surveyFullStyle);
    }

    this.gleapFrameContainer.setAttribute("dir", GleapTranslationManager.getInstance().isRTLLayout ? "rtl" : "ltr");
  }

  showWidget() {
    if (this.gleapFrameContainer.classList) {
      this.gleapFrameContainer.classList.remove('gleap-frame-container--hidden');

      setTimeout(() => {
        this.gleapFrameContainer.classList.add('gleap-frame-container--animate');
      }, 500);
    }

    this.widgetOpened = true;
    this.updateWidgetStatus();
    GleapNotificationManager.getInstance().clearAllNotifications();
    GleapNotificationManager.getInstance().setNotificationCount(0);
    GleapFeedbackButtonManager.getInstance().updateFeedbackButtonState();
    GleapEventManager.notifyEvent("open");
    this.registerEscListener();
  }

  updateWidgetStatus() {
    this.sendMessage({
      name: "widget-status-update",
      data: {
        isWidgetOpen: this.widgetOpened,
      }
    });
  }

  hideMarkerManager() {
    if (this.markerManager) {
      this.markerManager.clear();
      this.markerManager = null;
    }
  }

  hideWidget() {
    this.hideMarkerManager();
    if (this.gleapFrameContainer) {
      this.gleapFrameContainer.classList.add('gleap-frame-container--hidden');
      this.gleapFrameContainer.classList.remove('gleap-frame-container--animate');
    }
    this.widgetOpened = false;
    this.updateWidgetStatus();
    GleapFeedbackButtonManager.getInstance().updateFeedbackButtonState();
    GleapEventManager.notifyEvent("close");
    this.unregisterEscListener();

    if (typeof window !== "undefined" && typeof window.focus !== "undefined") {
      window.focus();
    }
  }

  sendMessage(data, queue = false) {
    if (this.gleapFrame) {
      this.gleapFrame.contentWindow.postMessage(JSON.stringify(data), "*");
    } else {
      if (queue) {
        this.queue.push(data);
      }
    }
  };

  sendSessionUpdate() {
    this.sendMessage({
      name: "session-update",
      data: {
        sessionData: GleapSession.getInstance().getSession(),
        apiUrl: GleapSession.getInstance().apiUrl,
        sdkKey: GleapSession.getInstance().sdkKey,
      }
    });
  }

  sendConfigUpdate() {
    this.sendMessage({
      name: "config-update",
      data: {
        config: GleapConfigManager.getInstance().getFlowConfig(),
        actions: GleapConfigManager.getInstance().getProjectActions(),
        overrideLanguage: GleapTranslationManager.getInstance().getOverrideLanguage(),
      }
    });

    this.updateFrameStyle();
  }

  showDrawingScreen(type) {
    this.hideWidget();

    // Show screen drawing.
    this.markerManager = new GleapMarkerManager(type);
    this.markerManager.show((success) => {
      if (!success) {
        this.hideMarkerManager();
      }
      this.showWidget();
    });
  }

  workThroughQueue() {
    for (let i = 0; i < this.queue.length; i++) {
      this.sendMessage(this.queue[i]);
    }
    this.queue = [];
  }

  startCommunication() {
    // Listen for messages.
    this.addMessageListener((data) => {
      if (data.name === "ping") {
        GleapStreamedEvent.getInstance().start();

        // Inject the widget buttons
        GleapFeedbackButtonManager.getInstance().injectFeedbackButton();

        // Inject the notification container
        GleapNotificationManager.getInstance().injectNotificationUI();

        this.sendConfigUpdate();
        this.sendSessionUpdate();
        this.workThroughQueue();
      }

      if (data.name === "play-ping") {
        GleapAudioManager.ping();
      }

      if (data.name === "height-update") {
        this.frameHeight = data.data;

        const innerContainer = document.querySelector(".gleap-frame-container-inner");
        if ((this.appMode === "survey" || this.appMode === "survey_full") && innerContainer) {
          innerContainer.style.maxHeight = `${this.frameHeight}px`;
        }
      }

      if (data.name === "notify-event") {
        GleapEventManager.notifyEvent(data.data.type, data.data.data);
      }

      if (data.name === "cleanup-drawings") {
        this.hideMarkerManager();
      }

      if (data.name === "open-url") {
        const url = data.data;
        if (url && url.length > 0) {
          window.open(url, '_blank').focus();
        }
      }

      if (data.name === "run-custom-action") {
        GleapCustomActionManager.triggerCustomAction(data.data);
      }

      if (data.name === "close-widget") {
        this.hideWidget();
      }

      if (data.name === "send-feedback") {
        const formData = data.data.formData;
        const action = data.data.action;
        const outboundId = data.data.outboundId;
        const spamToken = data.data.spamToken;

        const feedback = new GleapFeedback(action.feedbackType, "MEDIUM", formData, false, action.excludeData, outboundId, spamToken);
        feedback.sendFeedback().then((feedbackData) => {
          this.sendMessage({
            name: "feedback-sent",
            data: feedbackData
          });
          GleapEventManager.notifyEvent("feedback-sent", formData);
        }).catch((error) => {
          this.sendMessage({
            name: "feedback-sending-failed",
            data: "Something went wrong, please try again."
          });
          GleapEventManager.notifyEvent("error-while-sending");
        });
      }

      if (data.name === "start-screen-drawing") {
        this.showDrawingScreen(data.data);
      }
    });

    // Add window message listener.
    window.addEventListener("message", (event) => {
      if (event.origin !== this.frameUrl) {
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
