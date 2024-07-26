import Gleap, {
  GleapStreamedEvent,
  GleapAudioManager,
  GleapNotificationManager,
  GleapCustomActionManager,
  GleapEventManager,
  GleapMarkerManager,
  GleapFeedback,
  GleapFeedbackButtonManager,
  GleapTranslationManager,
  GleapSession,
  GleapConfigManager,
  GleapCustomDataManager,
  GleapMetaDataManager,
  GleapConsoleLogManager,
  GleapNetworkIntercepter,
  GleapTagManager,
  GleapBannerManager,
} from "./Gleap";
import { widgetMaxHeight } from "./UI";
import { runFunctionWhenDomIsReady } from "./GleapHelper";

export default class GleapFrameManager {
  frameUrl = "https://messenger-app.gleap.io";
  gleapFrameContainer = null;
  gleapFrame = null;
  comReady = false;
  injectedFrame = false;
  widgetOpened = false;
  listeners = [];
  appMode = "widget";
  markerManager = undefined;
  escListener = undefined;
  frameHeight = 0;
  queue = [];
  urlHandler = function (url, newTab) {
    if (url && url.length > 0) {
      if (newTab) {
        window.open(url, "_blank").focus();
      } else {
        window.location.href = url;
      }
    }
  };

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
    if (typeof window !== "undefined") {
      function appHeight() {
        try {
          const doc = document.documentElement;
          doc.style.setProperty("--glvh", window.innerHeight * 0.01 + "px");
        } catch (e) {}
      }

      try {
        window.addEventListener("resize", appHeight);
        appHeight();
      } catch (e) {}
    }
  }

  setUrlHandler(handler) {
    this.urlHandler = handler;
  }

  isSurvey() {
    return (
      this.appMode === "survey" ||
      this.appMode === "survey_full" ||
      this.appMode === "survey_web"
    );
  }

  setAppMode(appMode) {
    this.appMode = appMode;
    this.updateFrameStyle();

    const innerContainer = document.querySelector(
      ".gleap-frame-container-inner"
    );
    if (
      (this.appMode === "widget" ||
        this.appMode === "survey_full" ||
        this.appMode === "survey_web") &&
      innerContainer
    ) {
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

  destroy() {
    if (this.gleapFrame) {
      this.gleapFrame.remove();
    }
    if (this.gleapFrameContainer) {
      this.gleapFrameContainer.remove();
    }
    this.injectedFrame = false;
    this.widgetOpened = false;
    this.markerManager = undefined;
    this.gleapFrameContainer = null;
    this.gleapFrame = null;
  }

  isOpened() {
    return this.widgetOpened || this.markerManager != null;
  }

  autoWhiteListCookieManager = () => {
    if (window && window.cmp_block_ignoredomains) {
      window.cmp_block_ignoredomains.concat(["messenger-app.gleap.io"]);
    }
  };

  injectFrame = () => {
    if (this.injectedFrame) {
      return;
    }
    this.injectedFrame = true;

    this.autoWhiteListCookieManager();

    // Inject the frame manager after it has been loaded.
    runFunctionWhenDomIsReady(() => {
      GleapConfigManager.getInstance().onConfigLoaded(() => {
        // Apply CSS.
        GleapConfigManager.getInstance().applyStylesFromConfig();

        // Inject widget HTML.
        var elem = document.createElement("div");
        elem.className =
          "gleap-frame-container gleap-frame-container--hidden gl-block";
        elem.innerHTML = `<div class="gleap-frame-container-inner"><iframe src="${this.frameUrl}" class="gleap-frame" scrolling="yes" allow="autoplay; encrypted-media; fullscreen;" frameborder="0"></iframe></div>`;
        document.body.appendChild(elem);

        this.gleapFrameContainer = elem;
        this.gleapFrame = document.querySelector(".gleap-frame");

        this.updateFrameStyle();

        // Show loading preview for widget app mode.
        if (this.appMode === "widget") {
          this.showFrameContainer(true);
        }
      });
    });
  };

  showImage = (url) => {
    runFunctionWhenDomIsReady(() => {
      var elem = document.createElement("div");
      elem.className = "gleap-image-view";
      elem.innerHTML = `<div class="gleap-image-view-close">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zm97.9-320l-17 17-47 47 47 47 17 17L320 353.9l-17-17-47-47-47 47-17 17L158.1 320l17-17 47-47-47-47-17-17L192 158.1l17 17 47 47 47-47 17-17L353.9 192z"/></svg>
      </div><img class="gleap-image-view-image" src="${url}" />`;
      document.body.appendChild(elem);

      const closeElement = () => {
        elem.remove();
      };

      const close = elem.querySelector(".gleap-image-view-close");
      close.addEventListener("click", () => {
        closeElement();
      });

      elem.addEventListener("click", (e) => {
        if (e.target === elem) {
          closeElement();
        }
      });
    });
  };

  updateFrameStyle = () => {
    if (!this.gleapFrameContainer) {
      return;
    }

    const surveyStyle = "gleap-frame-container--survey";
    const extendedStyle = "gleap-frame-container--extended";
    const surveyFullStyle = "gleap-frame-container--survey-full";
    const classicStyle = "gleap-frame-container--classic";
    const classicStyleLeft = "gleap-frame-container--classic-left";
    const modernStyleLeft = "gleap-frame-container--modern-left";
    const noButtonStyleLeft = "gleap-frame-container--no-button";
    const allStyles = [
      classicStyle,
      classicStyleLeft,
      extendedStyle,
      modernStyleLeft,
      noButtonStyleLeft,
      surveyStyle,
      surveyFullStyle,
    ];
    for (let i = 0; i < allStyles.length; i++) {
      this.gleapFrameContainer.classList.remove(allStyles[i]);
    }

    var styleToApply = undefined;
    const flowConfig = GleapConfigManager.getInstance().getFlowConfig();
    if (
      flowConfig.feedbackButtonPosition ===
        GleapFeedbackButtonManager.FEEDBACK_BUTTON_CLASSIC ||
      flowConfig.feedbackButtonPosition ===
        GleapFeedbackButtonManager.FEEDBACK_BUTTON_CLASSIC_BOTTOM
    ) {
      styleToApply = classicStyle;
    }
    if (
      flowConfig.feedbackButtonPosition ===
      GleapFeedbackButtonManager.FEEDBACK_BUTTON_CLASSIC_LEFT
    ) {
      styleToApply = classicStyleLeft;
    }
    if (
      flowConfig.feedbackButtonPosition ===
      GleapFeedbackButtonManager.FEEDBACK_BUTTON_BOTTOM_LEFT
    ) {
      styleToApply = modernStyleLeft;
    }
    if (GleapFeedbackButtonManager.getInstance().buttonHidden === null) {
      if (
        flowConfig.feedbackButtonPosition ===
        GleapFeedbackButtonManager.FEEDBACK_BUTTON_NONE
      ) {
        styleToApply = noButtonStyleLeft;
      }
    } else {
      if (GleapFeedbackButtonManager.getInstance().buttonHidden) {
        styleToApply = noButtonStyleLeft;
      }
    }
    if (styleToApply) {
      this.gleapFrameContainer.classList.add(styleToApply);
    }

    if (this.appMode === "survey") {
      this.gleapFrameContainer.classList.add(surveyStyle);
    }
    if (this.appMode === "survey_full" || this.appMode === "survey_web") {
      this.gleapFrameContainer.classList.add(surveyFullStyle);
    }
    if (this.appMode === "extended") {
      this.gleapFrameContainer.classList.add(extendedStyle);
    }

    this.gleapFrameContainer.setAttribute(
      "dir",
      GleapTranslationManager.getInstance().isRTLLayout ? "rtl" : "ltr"
    );
  };

  showFrameContainer(showLoader) {
    if (!this.gleapFrameContainer) {
      return;
    }

    const flowConfig = GleapConfigManager.getInstance().getFlowConfig();
    const loadingClass = "gleap-frame-container--loading";
    if (this.gleapFrameContainer.classList) {
      this.gleapFrameContainer.classList.remove(
        "gleap-frame-container--hidden"
      );
      if (showLoader) {
        this.gleapFrameContainer.classList.add(loadingClass);

        if (flowConfig.disableBGFade) {
          this.gleapFrameContainer.classList.add(
            "gleap-frame-container--loading-nofade"
          );
        }
        if (flowConfig.disableBGGradient) {
          this.gleapFrameContainer.classList.add(
            "gleap-frame-container--loading-nogradient"
          );
        }
      } else {
        this.gleapFrameContainer.classList.remove(loadingClass);
      }

      setTimeout(() => {
        this.gleapFrameContainer.classList.add(
          "gleap-frame-container--animate"
        );
      }, 500);
    }

    this.widgetOpened = true;
    this.updateUI();
  }

  runWidgetShouldOpenCallback() {
    if (!this.gleapFrameContainer) {
      return;
    }

    this.workThroughQueue();

    Gleap.getInstance().setGlobalDataItem("snapshotPosition", {
      x: window.scrollX,
      y: window.scrollY,
    });

    this.showFrameContainer(false);
    this.updateWidgetStatus();

    GleapEventManager.notifyEvent("open");
    this.registerEscListener();
  }

  updateUI() {
    // Clear notifications only when not opening a survey.
    GleapNotificationManager.getInstance().clearAllNotifications(
      this.isSurvey()
    );
    GleapNotificationManager.getInstance().setNotificationCount(0);
    GleapFeedbackButtonManager.getInstance().updateFeedbackButtonState();
  }

  showWidget() {
    setTimeout(() => {
      if (this.gleapFrameContainer) {
        this.runWidgetShouldOpenCallback();
      } else {
        GleapFrameManager.getInstance().injectFrame();
      }
      this.updateUI();
    }, 0);
  }

  updateWidgetStatus() {
    this.sendMessage({
      name: "widget-status-update",
      data: {
        isWidgetOpen: this.widgetOpened,
      },
    });
  }

  hideMarkerManager() {
    if (this.markerManager) {
      this.markerManager.clear();
      this.markerManager = null;
    }
  }

  hideWidget() {
    // Prevent for survey web.
    if (this.appMode === "survey_web") {
      return;
    }

    this.hideMarkerManager();
    if (this.gleapFrameContainer) {
      this.gleapFrameContainer.classList.add("gleap-frame-container--hidden");
      this.gleapFrameContainer.classList.remove(
        "gleap-frame-container--animate"
      );
    }
    this.widgetOpened = false;
    this.updateWidgetStatus();
    GleapFeedbackButtonManager.getInstance().updateFeedbackButtonState();
    GleapEventManager.notifyEvent("close");
    GleapNotificationManager.getInstance().reloadNotificationsFromCache();

    this.unregisterEscListener();

    if (typeof window !== "undefined" && typeof window.focus !== "undefined") {
      window.focus();
    }
  }

  sendMessage(data, queue = false) {
    try {
      this.gleapFrame = document.querySelector(".gleap-frame");
      if (this.comReady && this.gleapFrame && this.gleapFrame.contentWindow) {
        this.gleapFrame.contentWindow.postMessage(JSON.stringify(data), "*");
      } else {
        if (queue) {
          this.queue.push(data);
        }
      }
    } catch (e) {}
  }

  sendSessionUpdate() {
    this.sendMessage({
      name: "session-update",
      data: {
        sessionData: GleapSession.getInstance().getSession(),
        apiUrl: GleapSession.getInstance().apiUrl,
        sdkKey: GleapSession.getInstance().sdkKey,
      },
    });
  }

  sendConfigUpdate() {
    this.sendMessage({
      name: "config-update",
      data: {
        config: GleapConfigManager.getInstance().getFlowConfig(),
        aiTools: GleapConfigManager.getInstance().getAiTools(),
        overrideLanguage:
          GleapTranslationManager.getInstance().getOverrideLanguage(),
      },
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
    const workQueue = [...this.queue];
    this.queue = [];
    for (let i = 0; i < workQueue.length; i++) {
      this.sendMessage(workQueue[i], true);
    }
  }

  startCommunication() {
    // Listen for messages.
    this.addMessageListener((data) => {
      if (data.name === "ping") {
        this.comReady = true;
        this.sendConfigUpdate();
        this.sendSessionUpdate();
        this.workThroughQueue();
        setTimeout(() => {
          this.runWidgetShouldOpenCallback();
        }, 300);
      }

      if (data.name === "play-ping") {
        GleapAudioManager.ping();
      }

      if (data.name === "open-image") {
        this.showImage(data.data.url);
      }

      if (data.name === "page-changed") {
        if (
          data.data &&
          (data.data.name === "newsdetails" || data.data.name === "appextended")
        ) {
          this.setAppMode("extended");
        } else {
          if (this.appMode === "extended") {
            this.setAppMode("widget");
          }
        }
      }

      if (data.name === "collect-ticket-data") {
        var ticketData = {
          customData: GleapCustomDataManager.getInstance().getCustomData(),
          metaData: GleapMetaDataManager.getInstance().getMetaData(),
          consoleLog: GleapConsoleLogManager.getInstance().getLogs(),
          networkLogs: GleapNetworkIntercepter.getInstance().getRequests(),
          customEventLog: GleapStreamedEvent.getInstance().getEventArray(),
          formData: GleapCustomDataManager.getInstance().getTicketAttributes(),
        };

        // Add tags
        const tags = GleapTagManager.getInstance().getTags();
        if (tags && tags.length > 0) {
          ticketData.tags = tags;
        }

        this.sendMessage({
          name: "collect-ticket-data",
          data: ticketData,
        });
      }

      if (data.name === "height-update") {
        this.frameHeight = data.data;

        const innerContainer = document.querySelector(
          ".gleap-frame-container-inner"
        );
        if (
          (this.appMode === "survey" ||
            this.appMode === "survey_full" ||
            this.appMode === "survey_web") &&
          innerContainer
        ) {
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
        const newTab = data.newTab ? true : false;
        this.urlHandler(url, newTab);
      }

      if (data.name === "run-custom-action") {
        GleapCustomActionManager.triggerCustomAction(data.data);
      }

      if (data.name === "close-widget") {
        this.hideWidget();
      }

      if (data.name === "tool-execution") {
        GleapEventManager.notifyEvent("tool-execution", data.data);
      }

      if (data.name === "send-feedback") {
        const formData = data.data.formData;
        const action = data.data.action;
        const outboundId = data.data.outboundId;
        const spamToken = data.data.spamToken;

        const feedback = new GleapFeedback(
          action.feedbackType,
          "MEDIUM",
          formData,
          false,
          action.excludeData,
          outboundId,
          spamToken
        );
        feedback
          .sendFeedback()
          .then((feedbackData) => {
            this.sendMessage({
              name: "feedback-sent",
              data: feedbackData,
            });
            GleapEventManager.notifyEvent("feedback-sent", formData);
          })
          .catch((error) => {
            this.sendMessage({
              name: "feedback-sending-failed",
              data: "Something went wrong, please try again.",
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
      if (
        event.origin !== this.frameUrl &&
        event.origin !== GleapBannerManager.getInstance().bannerUrl
      ) {
        return;
      }

      try {
        const data = JSON.parse(event.data);
        for (var i = 0; i < this.listeners.length; i++) {
          if (this.listeners[i]) {
            this.listeners[i](data);
          }
        }
      } catch (exp) {}
    });
  }

  addMessageListener(callback) {
    this.listeners.push(callback);
  }
}
