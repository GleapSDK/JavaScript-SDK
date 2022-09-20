import { injectStyledCSS } from "./UI";
import GleapNetworkIntercepter from "./GleapNetworkIntercepter";
import { gleapDataParser, runFunctionWhenDomIsReady } from "./GleapHelper";
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
import GleapPreFillManager from "./GleapPreFillManager";
import GleapNotificationManager from "./GleapNotificationManager";
import GleapAudioManager from "./GleapAudioManager";

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
  static silentCrashReportSent = false;
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
   * Sets the development environment
   * @param {*} environment
   */
  static setEnvironment(environment) {
    GleapMetaDataManager.getInstance().environment = environment;
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
   * Revert console log overwrite.
   */
  static disableConsoleLogOverwrite() {
    GleapConsoleLogManager.getInstance().stop();
  }

  /**
   * Attaches external network logs.
   */
  static attachNetworkLogs(networkLogs) {
    GleapNetworkIntercepter.getInstance().externalRequests = gleapDataParser(networkLogs);
  }

  /**
  * Add entry to logs.
  * @param {*} message
  * @param {*} logLevel
  * @returns
  */
  static log(message, logLevel = "INFO") {
    GleapConsoleLogManager.getInstance().addLog(message, logLevel);
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
      setTimeout(() => {
        GleapConfigManager.getInstance().start()
          .then(() => {
            // Inject the Gleap frame.
            GleapFrameManager.getInstance().injectFrame();
          })
          .catch(function (err) {
            console.warn("Failed to initialize Gleap.");
          });
      }, 0);
    });
    sessionInstance.startSession();
  }

  /**
   * Destroy
   * @returns 
   */
  static destroy() {
    GleapReplayRecorder.getInstance().stop();
    GleapStreamedEvent.getInstance().stop();
    GleapFrameManager.getInstance().destroy();
    GleapFeedbackButtonManager.getInstance().toggleFeedbackButton(false);
    GleapNotificationManager.getInstance().clearAllNotifications(true);
    GleapSession.getInstance().clearSession(0, false);
  }

  /**
   * Indentifies the user session
   * @param {string} userId
   * @param {*} userData
   */
  static identify(userId, userData, userHash) {
    return GleapSession.getInstance().identifySession(
      userId,
      gleapDataParser(userData),
      userHash
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
   * Sets the maximum network request count.
   */
  static setMaxNetworkRequests(maxRequests) {
    GleapNetworkIntercepter.getInstance().setMaxRequests(maxRequests);
  }

  /**
   * Closes any open Gleap dialogs.
   */
  static close() {
    GleapFrameManager.getInstance().hideWidget();
  }

  /**
   * Starts the Gleap flow.
   */
  static open() {
    GleapFrameManager.getInstance().setAppMode("widget");
    GleapFrameManager.getInstance().showWidget();
  }

  /**
   * Logs a custom event
   * @param {string} name
   * @param {any} data
   */
  static trackEvent(name, data) {
    GleapStreamedEvent.getInstance().logEvent(name, data);
  }

  /**
   * Logs a custom event
   * @param {string} name
   * @param {any} data
   * @deprecated Please use trackEvent instead.
   */
  static logEvent(name, data) {
    GleapStreamedEvent.getInstance().logEvent(name, data);
  }

  /**
   * Prefills a specific form field.
   * @param {*} key 
   * @param {*} value 
   */
  static preFillForm(data) {
    const cleanedData = gleapDataParser(data);
    GleapPreFillManager.getInstance().formPreFill = cleanedData;
    GleapFrameManager.getInstance().sendMessage({
      name: "prefill-form-data",
      data: cleanedData
    }, true);
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
   * Set a custom frame api url.
   * @param {string} frameUrl
   */
  static setFrameUrl(frameUrl) {
    GleapFrameManager.getInstance().frameUrl = frameUrl;
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
    runFunctionWhenDomIsReady(() => {
      injectStyledCSS(
        primaryColor,
        headerColor,
        buttonColor,
        borderRadius,
        backgroundColor
      );
    });
  }

  /**
   * Sends a silent feedback report
   * @param {*} formData
   * @param {*} priority
   * @param {*} excludeData
   */
  static sendSilentCrashReport(
    description = "",
    priority = "MEDIUM",
    excludeData = {
      screenshot: true,
      replays: true,
      attachments: true,
    }
  ) {
    return Gleap.sendSilentCrashReportWithFormData(
      {
        description
      },
      priority,
      excludeData
    );
  }

  /**
   * Sends a silent feedback report
   * @param {*} formData
   * @param {*} priority
   * @param {*} excludeData
   */
  static sendSilentCrashReportWithFormData(
    formData,
    priority = "MEDIUM",
    excludeData = {
      screenshot: true,
      replays: true,
      attachments: true,
    }
  ) {
    if (this.silentCrashReportSent) {
      return;
    }

    this.silentCrashReportSent = true;
    setTimeout(() => {
      this.silentCrashReportSent = false;
    }, 10000);

    const excludeDataCleaned = excludeData ? gleapDataParser(excludeData) : {};
    const sessionInstance = GleapSession.getInstance();
    if (!sessionInstance.ready) {
      return;
    }

    var newFormData = formData ? formData : {};
    if (sessionInstance.session.email) {
      newFormData.reportedBy = sessionInstance.session.email;
    }

    const feedback = new GleapFeedback("CRASH", priority, newFormData, true, excludeDataCleaned);
    feedback.sendFeedback().then(() => { }).catch((error) => { });
  }

  /**
   * Starts the bug reporting flow.
   */
  static startFeedbackFlow(feedbackFlow, showBackButton) {
    Gleap.startFeedbackFlowWithOptions(feedbackFlow, {
      hideBackButton: !showBackButton,
    });
  }

  /**
   * Starts the bug reporting flow.
   */
  static startFeedbackFlowWithOptions(feedbackFlow, options = {}, isSurvey = false) {
    const { actionOutboundId, autostartDrawing, hideBackButton, format } = options;
    const sessionInstance = GleapSession.getInstance();
    if (!sessionInstance.ready) {
      return;
    }

    // Initially set scroll position
    Gleap.getInstance().setGlobalDataItem("snapshotPosition", {
      x: window.scrollX,
      y: window.scrollY,
    });

    var action = "start-feedbackflow";
    if (isSurvey) {
      action = "start-survey";
    }

    GleapFrameManager.getInstance().setAppMode(isSurvey ? format : "widget");

    GleapFrameManager.getInstance().sendMessage({
      name: action,
      data: {
        flow: feedbackFlow,
        actionOutboundId: actionOutboundId,
        hideBackButton: hideBackButton,
        format,
      }
    });

    if (autostartDrawing) {
      GleapFrameManager.getInstance().showDrawingScreen("screenshot");
    } else {
      GleapFrameManager.getInstance().showWidget();
    }
  }

  /**
   * Opens a conversation
   */
  static openConversation(shareToken) {
    if (!shareToken) {
      return;
    }

    GleapFrameManager.getInstance().sendMessage({
      name: "open-conversation",
      data: {
        shareToken,
      }
    });

    GleapFrameManager.getInstance().showWidget();
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

  softReInitialize() {
    GleapFeedbackButtonManager.getInstance().injectedFeedbackButton = false;
    GleapFrameManager.getInstance().injectedFrame = false;

    // Reload config.
    GleapConfigManager.getInstance().start().then(() => {
      GleapFrameManager.getInstance().injectFrame();
    }).catch((exp) => { });
  }

  /**
   * Performs an action.
   * @param {*} action 
   */
  performActions(actions) {
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      if (action && action.outbound && action.actionType) {
        if (action.actionType === "notification") {
          Gleap.showNotification(action);
        } else {
          Gleap.startFeedbackFlowWithOptions(action.actionType, {
            actionOutboundId: action.outbound,
            hideBackButton: true,
            format: action.format
          }, true);
        }
      }
    }
  }

  static showNotification(data) {
    GleapNotificationManager.getInstance().showNotification(data);

    if (data && data.sound) {
      GleapAudioManager.ping();
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

export { GleapNetworkIntercepter, GleapAudioManager, GleapNotificationManager, GleapPreFillManager, GleapShortcutListener, GleapMarkerManager, GleapTranslationManager, GleapReplayRecorder, GleapFeedback, GleapConsoleLogManager, GleapRageClickDetector, GleapCustomActionManager, GleapEventManager, GleapCustomDataManager, GleapFeedbackButtonManager, GleapCrashDetector, GleapClickListener, GleapSession, GleapStreamedEvent, GleapConfigManager, GleapFrameManager, GleapMetaDataManager };
export default Gleap;
