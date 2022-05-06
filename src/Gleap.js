import { startScreenCapture } from "./ScreenCapture";
import { translateText } from "./Translation";
import { injectStyledCSS } from "./UI";
import GleapNetworkIntercepter from "./GleapNetworkIntercepter";
import { gleapDataParser } from "./GleapHelper";
import GleapSession from "./GleapSession";
import StreamedEvent from "./StreamedEvent";
import AutoConfig from "./AutoConfig";
import { ScrollStopper } from "./ScrollStopper";
import { ScreenRecorder } from "./ScreenRecorder";
import GleapFrameManager from "./GleapFrameManager";
import GleapMetaDataManager from "./GleapMetaDataManager";
import GleapConsoleLogManager from "./GleapConsoleLogManager";
import GleapClickListener from "./GleapClickListener";
import GleapCrashDetector from "./GleapRageClickDetector";
import GleapFeedbackButtonManager from "./GleapFeedbackButtonManager";
import GleapFeedback from "./GleapFeedback";
import GleapCustomDataManager from "./GleapCustomDataManager";
import GleapEventManager from "./GleapEventManager";
import GleapCustomActionManager from "./GleapCustomActionManager";
import GleapRageClickDetector from "./GleapRageClickDetector";

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
  overrideLanguage = "";
  autostartDrawing = false;

  // Global data
  screenRecordingData = null;
  snapshotPosition = {
    x: 0,
    y: 0,
  };
  excludeData = {};

  customTranslation = {};
  actionToPerform = undefined;

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
      GleapNetworkIntercepter.getInstance().start();
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
      AutoConfig.getInstance().start()
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
   * Sets a custom translation
   * @param {*} customTranslation
   */
  static setCustomTranslation(customTranslation) {
    const instance = this.getInstance();
    instance.customTranslation = customTranslation;
  }

  /**
   * Logs a custom event
   * @param {string} name
   * @param {any} data
   */
  static logEvent(name, data) {
    StreamedEvent.getInstance().logEvent(name, data);
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
    // TODO: Implement
    //this.getInstance().shortcutsEnabled = enabled;
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
   * Sets the button logo url.
   * @param {string} logoUrl
   */
  static setButtonLogoUrl(logoUrl) {
    GleapFeedbackButtonManager.getInstance().setCustomButtonLogoUrl(logoUrl);
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
    // TODO: Implement
    // this.getInstance().overrideLanguage = language;
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
  static setColors(
    primaryColor,
    headerColor,
    buttonColor,
    backgroundColor = "#ffffff"
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
   * Sends a silent feedback report
   * @param {*} formData
   * @param {*} priority
   * @param {*} feedbackType
   */
  static sendSilentReport(
    formData,
    priority = Gleap.PRIORITY_MEDIUM,
    feedbackType = "BUG",
    excludeData = {}
  ) {
    const instance = this.getInstance();
    const sessionInstance = GleapSession.getInstance();
    if (!sessionInstance.ready) {
      return;
    }

    instance.excludeData = excludeData ? excludeData : {};

    instance.formData = formData ? formData : {};
    if (sessionInstance.session.email) {
      instance.formData.reportedBy = sessionInstance.session.email;
    }

    this.startFeedbackFlow(null, true);
  }

  /**
   * Starts the bug reporting flow.
   */
  static startFeedbackFlow(feedbackFlow) {
    const sessionInstance = GleapSession.getInstance();
    const instance = this.getInstance();

    if (!sessionInstance.ready) {
      return;
    }

    // Initially set scroll position
    instance.snapshotPosition = {
      x: window.scrollX,
      y: window.scrollY,
    };

    // Get feedback options
    /*var feedbackOptions = instance.getFeedbackOptions(feedbackFlow);
    if (!feedbackOptions) {
      return;
    }*/

    GleapEventManager.notifyEvent("flow-started", feedbackFlow);

    GleapFrameManager.getInstance().showWidget();
    GleapFrameManager.getInstance().sendMessage({
      name: "start-feedbackflow",
      data: feedbackFlow
    });

    /*if (feedbackOptions.form && feedbackOptions.form.length > 0) {
      // Cleanup form from unsupported items.
      let newFormArray = [];
      for (var i = 0; i < feedbackOptions.form.length; i++) {
        var feedbackOption = feedbackOptions.form[i];
        if (
          feedbackOption &&
          feedbackOption.type !== "privacypolicy" &&
          feedbackOption.type !== "spacer" &&
          feedbackOption.type !== "submit" &&
          feedbackOption.name !== "reportedBy"
        ) {
          newFormArray.push(feedbackOption);
        }
      }

      const emailFormItem =
        feedbackOptions.collectEmail === true ||
          feedbackOptions.collectEmail === undefined
          ? {
            title: "Email",
            placeholder: "Your e-mail",
            type: "text",
            inputtype: "email",
            name: "reportedBy",
            required: true,
            remember: true,
          }
          : null;

      // Collect email when user needs to enter it.
      if (
        emailFormItem &&
        !(sessionInstance.session && sessionInstance.session.email)
      ) {
        emailFormItem.hideOnDefaultSet = false;
        newFormArray.push(emailFormItem);
      }

      // Update form.
      feedbackOptions.form = newFormArray;
      feedbackOptions.pages =
        feedbackOptions.singlePageForm === true ? 1 : newFormArray.length;

      // Add page id's
      for (var i = 0; i < feedbackOptions.form.length; i++) {
        var feedbackOption = feedbackOptions.form[i];
        if (feedbackOptions.singlePageForm === true) {
          feedbackOption.page = 0;
        } else {
          feedbackOption.page = i;
        }
      }

      // Add email as hidden default option.
      if (
        emailFormItem &&
        sessionInstance.session &&
        sessionInstance.session.email
      ) {
        emailFormItem.hideOnDefaultSet = true;
        emailFormItem.defaultValue = sessionInstance.session.email;
        emailFormItem.page =
          feedbackOptions.form[feedbackOptions.form.length - 1].page;
        newFormArray.push(emailFormItem);
      }

      // Inject privacy policy.
      if (!feedbackOptions.disableUserScreenshot) {
        var captureItem = {
          name: "capture",
          type: "capture",
          enableScreenshot: true,
          autostartDrawing: instance.autostartDrawing,
          enableCapture: feedbackOptions.enableUserScreenRecording
            ? true
            : false,
          captureTitle: translateText(
            "Record screen",
            instance.overrideLanguage
          ),
          captureTooltip: translateText(
            "Record your screen to showcase the bug",
            instance.overrideLanguage
          ),
          screenshotTitle: translateText(
            "Mark the bug",
            instance.overrideLanguage
          ),
          screenshotTooltip: translateText(
            "Draw on the screen to mark the bug",
            instance.overrideLanguage
          ),
          page: feedbackOptions.form[feedbackOptions.form.length - 1].page,
        };
        feedbackOptions.form.push(captureItem);
      }

      // Inject privacy policy.
      if (feedbackOptions.privacyPolicyEnabled) {
        var policyItem = {
          name: "privacypolicy",
          type: "privacypolicy",
          required: true,
          url: feedbackOptions.privacyPolicyUrl,
          page: feedbackOptions.form[feedbackOptions.form.length - 1].page,
        };
        feedbackOptions.form.push(policyItem);
      }
    }

    // Disable autostart drawing for the next call.
    instance.autostartDrawing = false;

    // Stop bug analytics.
    instance.stopBugReportingAnalytics();

    if (instance.silentBugReport) {
      // Move on
      instance.checkReplayLoaded();
    } else {
      // Show editor
      instance.showBugReportEditor(feedbackOptions);
    }*/
  }

  isLiveMode() {
    if (this.offlineMode === true) {
      return false;
    }

    var hostname = window.location.hostname;
    return (
      ["localhost", "127.0.0.1", "0.0.0.0", "", "::1"].includes(hostname) ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.0.") ||
      hostname.endsWith(".local") ||
      !hostname.includes(".")
    );
  }

  postInitialization() {
    // Load session.
    const onGleapReady = function () {
      GleapFrameManager.getInstance().injectFrame();
    }
    GleapSession.getInstance().setOnSessionReady(onGleapReady.bind(this));
  }

  performAction(action) {
    // TODO: 
    /*if (action && action.outbound && action.actionType) {
      this.actionToPerform = action;
      Gleap.startFeedbackFlow(action.actionType);
    }*/
  }

  /*sendBugReportToServer(screenshotData) {
    var gleapFeedbackItem = new GleapFeedback(
      "BUG",
      "LOW",
      this.feedbackType,
      this.formData,
      this.silentBugReport
    );
    gleapFeedbackItem.sendFeedback();
  }*/
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

export default Gleap;
