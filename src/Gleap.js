import { injectStyledCSS } from "./UI";
import GleapNetworkIntercepter from "./GleapNetworkIntercepter";
import { gleapDataParser } from "./GleapHelper";
import GleapSession from "./GleapSession";
import GleapStreamedEvent from "./GleapStreamedEvent";
import GleapConfigManager from "./GleapConfigManager";
import GleapFeedback from "./GleapFeedback";
import GleapFrameManager from "./GleapFrameManager";
import GleapMetaDataManager from "./GleapMetaDataManager";
import GleapConsoleLogManager from "./GleapConsoleLogManager";
import GleapClickListener from "./GleapClickListener";
import GleapCrashDetector from "./GleapCrashDetector";
import GleapFeedbackButtonManager from "./GleapFeedbackButtonManager";
import GleapCustomDataManager from "./GleapCustomDataManager";
import GleapEventManager from "./GleapEventManager";
import GleapCustomActionManager from "./GleapCustomActionManager";
import GleapRageClickDetector from "./GleapRageClickDetector";
import GleapReplayRecorder from "./GleapReplayRecorder";
import GleapMarkerManager from "./GleapMarkerManager";
import GleapTranslationManager from "./GleapTranslationManager";
import GleapShortcutListener from "./GleapShortcutListener";

if (typeof HTMLCanvasElement !== "undefined" && HTMLCanvasElement.prototype) {
  HTMLCanvasElement.prototype.__originalGetContext =
    HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, options) {
    return this.__originalGetContext(type, {
      ...options,
      preserveDrawingBuffer: true,
    });
  };
}

class Gleap {
  initialized = false;
  offlineMode = false;

  // Global data
  globalData = {
    screenRecordingData: null,
    webReplay: null,
    snapshotPosition: {
      x: 0,
      y: 0,
    }
  };

  // Gleap singleton
  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new Gleap();
      return this.instance;
    } else {
      return this.instance;
    }
  }

  /**
   * Main constructor
   */
  constructor() {
    if (typeof window !== "undefined") {
      // Make sure all instances are ready.
      GleapMetaDataManager.getInstance();
      GleapConsoleLogManager.getInstance().start();
      GleapClickListener.getInstance().start();
      GleapCrashDetector.getInstance().start();
      GleapRageClickDetector.getInstance().start();
    }
  }

  /**
   * Attaches external network logs that get merged with the internal network logs.
   * @param {*} externalConsoleLogs
   */
  static attachNetworkLogs(externalConsoleLogs) {
    GleapNetworkIntercepter.getInstance().externalConsoleLogs =
      externalConsoleLogs;
  }

  /**
   * Active the Gleap offline mode.
   * @param {*} offlineMode
   */
  static setOfflineMode(offlineMode) {
    const instance = this.getInstance();
    instance.offlineMode = offlineMode;
  }

  /**
   * Revert console log overwrite
   */
  static disableConsoleLogOverwrite() {
    GleapConsoleLogManager.getInstance().stop();
  }

  /**
   * Initializes the SDK
   * @param {*} sdkKey
   */
  static initialize(sdkKey) {
    const instance = this.getInstance();
    if (instance.initialized) {
      console.warn("Gleap already initialized.");
      return;
    }
    instance.initialized = true;

    // Start session
    const sessionInstance = GleapSession.getInstance();
    sessionInstance.sdkKey = sdkKey;
    sessionInstance.setOnSessionReady(() => {
      // Run auto configuration.
      GleapConfigManager.getInstance().start()
        .then(() => {
          if (
            document.readyState === "complete" ||
            document.readyState === "loaded" ||
            document.readyState === "interactive"
          ) {
            instance.postInitialization();
          } else {
            document.addEventListener("DOMContentLoaded", function (event) {
              instance.postInitialization();
            });
          }
        })
        .catch(function (err) {
          console.warn("Failed to initialize Gleap.");
        });
    });
    sessionInstance.startSession();
  }

  /**
   * Indentifies the user session
   * @param {string} userId
   * @param {*} userData
   */
  static identify(userId, userData) {
    return GleapSession.getInstance().identifySession(
      userId,
      gleapDataParser(userData)
    );
  }

  /**
   * Clears the current user session
   */
  static clearIdentity() {
    GleapSession.getInstance().clearSession();
  }

  /**
   * Widget opened status
   * @returns {boolean} isOpened
   */
  static isOpened() {
    return GleapFrameManager.getInstance().isOpened();
  }

  /**
   * Hides any open Gleap dialogs.
   */
  static hide() {
    GleapFrameManager.getInstance().hideWidget();
  }

  /**
   * Starts the Gleap flow.
   */
  static open() {
    GleapFrameManager.getInstance().showWidget();
  }

  /**
   * Logs a custom event
   * @param {string} name
   * @param {any} data
   */
  static logEvent(name, data) {
    GleapStreamedEvent.getInstance().logEvent(name, data);
  }

  /**
   * Prefills a specific form field.
   * @param {*} key 
   * @param {*} value 
   */
  static preFillForm(key, value) {
    GleapFrameManager.getInstance().sendMessage({
      name: "prefill-form-data",
      data: {
        formKey: key,
        data: value
      }
    });
  }

  /**
   * Register events for Gleap.
   * @param {*} eventName
   * @param {*} callback
   */
  static on(eventName, callback) {
    GleapEventManager.on(eventName, callback);
  }

  /**
   * Enable or disable shortcuts
   * @param {boolean} enabled
   */
  static enableShortcuts(enabled) {
    if (enabled) {
      GleapShortcutListener.getInstance().start();
    } else {
      GleapShortcutListener.getInstance().stop();
    }
  }

  /**
   * Show or hide the feedback button
   * @param {*} show
   * @returns
   */
  static showFeedbackButton(show) {
    GleapFeedbackButtonManager.getInstance().toggleFeedbackButton(show);
  }

  /**
   * Enables the network logger.
   */
  static setNetworkLogFilters(filters) {
    GleapNetworkIntercepter.getInstance().setFilters(filters);
  }

  /**
   * Sets the app version code.
   * @param {string} appVersionCode
   */
  static setAppVersionCode(appVersionCode) {
    GleapMetaDataManager.setAppVersionCode(appVersionCode);
  }

  /**
   * Sets the app version code.
   * @param {string} appVersionCode
   */
  static setAppBuildNumber(appBuildNumber) {
    GleapMetaDataManager.setAppBuildNumber(appBuildNumber);
  }

  /**
   * Set a custom api url.
   * @param {string} apiUrl
   */
  static setApiUrl(apiUrl) {
    GleapSession.getInstance().apiUrl = apiUrl;
  }

  /**
   * Set a custom widget api url.
   * @param {string} widgetUrl
   */
  static setWidgetUrl(widgetUrl) {
    GleapSession.getInstance().widgetUrl = widgetUrl;
  }

  /**
   * Set custom data that will be attached to the bug-report.
   * @param {*} data
   */
  static attachCustomData(data) {
    GleapCustomDataManager.getInstance().attachCustomData(data);
  }

  /**
   * Add one key value pair to the custom data object
   * @param {*} key The key of the custom data entry you want to add.
   * @param {*} value The custom data you want to add.
   */
  static setCustomData(key, value) {
    GleapCustomDataManager.getInstance().setCustomData(key, value);
  }

  /**
   * Remove one key value pair of the custom data object
   * @param {*} key The key of the custom data entry you want to remove.
   */
  static removeCustomData(key) {
    GleapCustomDataManager.getInstance().removeCustomData(key);
  }

  /**
   * Clear the custom data
   */
  static clearCustomData() {
    GleapCustomDataManager.getInstance().clearCustomData();
  }

  /**
   * Override the browser language.
   * @param {string} language country code with two letters
   */
  static setLanguage(language) {
    GleapTranslationManager.getInstance().setOverrideLanguage(language);
  }

  /**
   * Register custom action
   * @param {*} action
   */
  static registerCustomAction(customAction) {
    GleapCustomActionManager.registerCustomAction(customAction);
  }

  /**
   * Triggers a custom action
   * @param {*} actionName
   */
  static triggerCustomAction(name) {
    GleapCustomActionManager.triggerCustomAction(name);
  }

  /**
   * Sets a custom color scheme.
   * @param {string} primaryColor
   */
  static setStyles(
    primaryColor,
    headerColor,
    buttonColor,
    backgroundColor = "#ffffff",
    borderRadius = 20,
  ) {
    if (
      document.readyState === "complete" ||
      document.readyState === "loaded" ||
      document.readyState === "interactive"
    ) {
      injectStyledCSS(
        primaryColor,
        headerColor,
        buttonColor,
        borderRadius,
        backgroundColor
      );
    } else {
      document.addEventListener("DOMContentLoaded", function (event) {
        injectStyledCSS(
          primaryColor,
          headerColor,
          buttonColor,
          borderRadius,
          backgroundColor
        );
      });
    }
  }

  /**
   * Reports a bug silently
   * @param {*} description
   * @param {*} priority
   * @param {*} type
   * @deprecated Please use sendSilentReport instead.
   */
  static sendSilentBugReportWithType(
    description,
    priority = "MEDIUM",
    type = "BUG"
  ) {
    return Gleap.sendSilentReport(
      {
        description: description,
      },
      priority,
      type
    );
  }

  /**
   * Reports a bug silently
   * @param {*} description
   * @param {*} priority
   * @deprecated Please use sendSilentReport instead.
   */
  static sendSilentBugReport(description, priority = "MEDIUM") {
    return Gleap.sendSilentReport(
      {
        description: description,
      },
      priority,
      "BUG"
    );
  }

  /**
   * Sends a silent feedback report
   * @param {*} formData
   * @param {*} priority
   * @param {*} feedbackType
   * @param {*} excludeData
   */
  static sendSilentReport(
    formData,
    priority = "MEDIUM",
    feedbackType = "BUG",
    excludeData = {}
  ) {
    const sessionInstance = GleapSession.getInstance();
    if (!sessionInstance.ready) {
      return;
    }

    var newFormData = formData ? formData : {};
    if (sessionInstance.session.email) {
      newFormData.reportedBy = sessionInstance.session.email;
    }

    GleapEventManager.notifyEvent("sending-silent-report");
    const feedback = new GleapFeedback(feedbackType, priority, newFormData, false, excludeData ? excludeData : {});
    feedback.sendFeedback().then(() => {
      GleapEventManager.notifyEvent("silent-report-sent");
    }).catch((error) => {
      GleapEventManager.notifyEvent("failed-sending-silent-report");
    });
  }

  /**
   * Starts the bug reporting flow.
   */
  static startFeedbackFlow(feedbackFlow, options = {}) {
    const { actionOutboundId, autostartDrawing, hideBackButton } = options;
    const sessionInstance = GleapSession.getInstance();
    if (!sessionInstance.ready) {
      return;
    }

    // Initially set scroll position
    Gleap.getInstance().setGlobalDataItem("snapshotPosition", {
      x: window.scrollX,
      y: window.scrollY,
    });

    GleapFrameManager.getInstance().sendMessage({
      name: "start-feedbackflow",
      data: {
        flow: feedbackFlow,
        actionOutboundId: actionOutboundId,
        hideBackButton: hideBackButton,
      }
    });

    if (autostartDrawing) {
      GleapFrameManager.getInstance().showDrawingScreen("screenshot");
    } else {
      GleapFrameManager.getInstance().showWidget();
    }
  }

  isLiveMode() {
    if (this.offlineMode === true) {
      return false;
    }

    var hostname = window.location.hostname;
    const isLocalHost = ["localhost", "127.0.0.1", "0.0.0.0", "", "::1"].includes(hostname) ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.0.") ||
      hostname.endsWith(".local") ||
      !hostname.includes(".");
    return !isLocalHost;
  }

  /**
   * Post initialization
   */
  postInitialization() {
    // Load session.
    const onGleapReady = function () {
      GleapFrameManager.getInstance().injectFrame();
    }
    GleapSession.getInstance().setOnSessionReady(onGleapReady.bind(this));
  }

  /**
   * Performs an action.
   * @param {*} action 
   */
  performAction(action) {
    if (action && action.outbound && action.actionType) {
      Gleap.startFeedbackFlow(action.actionType, {
        actionOutboundId: action.outbound,
        hideBackButton: true
      });
    }
  }

  /**
   * Sets a global data value
   * @param {*} key 
   * @param {*} value 
   */
  setGlobalDataItem(key, value) {
    this.globalData[key] = value;
  }

  /**
   * Gets a global data value
   * @param {*} key 
   * @returns 
   */
  getGlobalDataItem(key) {
    return this.globalData[key];
  }

  /**
   * Takes the current replay and assigns it to the global data array.
   */
  takeCurrentReplay() {
    GleapReplayRecorder.getInstance().getReplayData().then((replayData) => {
      if (replayData) {
        this.setGlobalDataItem("webReplay", replayData);
      }
    }).catch((exp) => { });
  }
}

// Check for unperformed Gleap actions.
if (typeof window !== "undefined") {
  const GleapActions = window.GleapActions;
  if (GleapActions && GleapActions.length > 0) {
    for (var i = 0; i < GleapActions.length; i++) {
      const GLAction = GleapActions[i];
      if (GLAction && GLAction.e && Gleap[GLAction.e]) {
        Gleap[GLAction.e].apply(Gleap, GLAction.a);
      }
    }
  }
}

export { GleapNetworkIntercepter, GleapShortcutListener, GleapMarkerManager, GleapTranslationManager, GleapReplayRecorder, GleapFeedback, GleapConsoleLogManager, GleapRageClickDetector, GleapCustomActionManager, GleapEventManager, GleapCustomDataManager, GleapFeedbackButtonManager, GleapCrashDetector, GleapClickListener, GleapSession, GleapStreamedEvent, GleapConfigManager, GleapFrameManager, GleapMetaDataManager };
export default Gleap;
