import { startScreenCapture } from "./ScreenCapture";
import { translateText } from "./Translation";
import {
  createFeedbackTypeDialog,
  createWidgetDialog,
  loadIcon,
  injectStyledCSS,
  setLoadingIndicatorProgress,
  toggleLoading,
  validatePoweredBy,
} from "./UI";
import GleapNetworkIntercepter from "./NetworkInterception";
import ReplayRecorder from "./ReplayRecorder";
import { isMobile } from "./ImageHelper";
import { buildForm, getFormData, hookForm, rememberForm } from "./FeedbackForm";
import { startRageClickDetector } from "./UXDetectors";
import { createScreenshotEditor } from "./DrawingCanvas";
import { ScreenRecorder } from "./ScreenRecorder";
import Session from "./Session";
import StreamedEvent from "./StreamedEvent";
import AutoConfig from "./AutoConfig";
import { GleapScreenDrawer } from "./ScreenDrawer";

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

export const gleapDataParser = function (data) {
  if (typeof data === "string" || data instanceof String) {
    try {
      return JSON.parse(data);
    } catch (e) {
      return {};
    }
  }
  return data;
};

class Gleap {
  uiContainer = null;
  widgetOnly = false;
  widgetStartFlow = undefined;
  widgetCallback = null;
  overrideLanguage = "";
  screenshot = null;
  actionLog = [];
  logArray = [];
  customData = {};
  formData = {};
  excludeData = {};
  logMaxLength = 500;
  buttonType = Gleap.FEEDBACK_BUTTON_BOTTOM_RIGHT;
  feedbackType = "BUG";
  sessionStart = new Date();
  customActionCallbacks = [];
  poweredByHidden = false;
  enabledCrashDetector = false;
  enabledCrashDetectorSilent = false;
  enabledRageClickDetector = false;
  enabledRageClickDetectorSilent = false;
  appCrashDetected = false;
  rageClickDetected = false;
  currentlySendingBug = false;
  isLiveSite = false;
  replaysEnabled = false;
  customLogoUrl = null;
  shortcutsEnabled = true;
  silentBugReport = false;
  initialized = false;
  screenshotFeedbackOptions = null;
  customerInfo = {};
  showUserName = true;
  welcomeIcon = "👋";
  feedbackButtonText = "Feedback";
  widgetInfo = {
    title: "Feedback",
    subtitle: "var us know how we can do better.",
    dialogSubtitle: "Report a bug, or share your feedback with us.",
  };
  originalConsoleLog;
  severity = "LOW";
  appVersionCode = "";
  appBuildNumber = "";
  mainColor = "#485bff";
  feedbackTypeActions = [];
  customTranslation = {};
  networkIntercepter = new GleapNetworkIntercepter();
  replay = null;
  feedbackButton = null;
  fakeLoading = null;
  fakeLoadingProgress = 0;
  widgetOpened = false;
  openedMenu = false;
  showInfoPopup = false;
  snapshotPosition = {
    x: 0,
    y: 0,
  };
  eventListeners = {};
  feedbackActions = {};
  actionToPerform = undefined;

  // Feedback button types
  static FEEDBACK_BUTTON_BOTTOM_RIGHT = "BOTTOM_RIGHT";
  static FEEDBACK_BUTTON_BOTTOM_LEFT = "BOTTOM_LEFT";
  static FEEDBACK_BUTTON_CLASSIC = "BUTTON_CLASSIC";
  static FEEDBACK_BUTTON_CLASSIC_LEFT = "BUTTON_CLASSIC_LEFT";
  static FEEDBACK_BUTTON_CLASSIC_BOTTOM = "BUTTON_CLASSIC_BOTTOM";
  static FEEDBACK_BUTTON_NONE = "BUTTON_NONE";

  // Bug priorities
  static PRIORITY_LOW = "LOW";
  static PRIORITY_MEDIUM = "MEDIUM";
  static PRIORITY_HIGH = "HIGH";

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
      this.init();
    }
  }

  /**
   * Sets a custom UI container.
   */
  static setUIContainer(container) {
    const instance = this.getInstance();
    instance.uiContainer = container;
  }

  /**
   * Attaches external network logs that get merged with the internal network logs.
   * @param {*} externalConsoleLogs
   */
  static attachNetworkLogs(externalConsoleLogs) {
    this.getInstance().networkIntercepter.externalConsoleLogs =
      externalConsoleLogs;
  }

  /**
   * Set if you running on a live site or local environment.
   * @param {*} isLiveSite
   */
  static setLiveSite(isLiveSite) {
    const instance = this.getInstance();
    instance.isLiveSite = isLiveSite;
  }

  /**
   * Initializes the SDK
   * @param {*} sdkKey
   */
  static initialize(sdkKey, gleapId, gleapHash) {
    const instance = this.getInstance();
    if (instance.initialized) {
      console.warn("Gleap already initialized.");
      return;
    }
    instance.initialized = true;

    // Set default session (i.e. from the app SDK).
    if (gleapId && gleapHash) {
      try {
        localStorage.setItem(`gleap-id`, gleapId);
        localStorage.getItem(`gleap-hash`, gleapHash);
      } catch (exp) {}
    }

    const sessionInstance = Session.getInstance();
    sessionInstance.sdkKey = sdkKey;
    sessionInstance.startSession();
    sessionInstance.setOnSessionReady(() => {
      if (instance.widgetCallback) {
        // Directly run post init as we don't need to run the auto config on app.
        instance.postInit();
      } else {
        // Run auto configuration.
        AutoConfig.run().then(function () {
          instance.postInit();
        });
      }
    });
  }

  postInit() {
    if (!this.widgetCallback) {
      // Start event stream only on web.
      StreamedEvent.getInstance().start();
    }

    const self = this;
    if (
      document.readyState === "complete" ||
      document.readyState === "loaded" ||
      document.readyState === "interactive"
    ) {
      self.checkForInitType();
    } else {
      document.addEventListener("DOMContentLoaded", function (event) {
        self.checkForInitType();
      });
    }

    if (this.widgetCallback) {
      self.widgetCallback("sessionReady");
    }
  }

  /**
   * Indentifies the user session
   * @param {string} userId
   * @param {*} userData
   */
  static identify(userId, userData) {
    Session.getInstance().identifySession(userId, gleapDataParser(userData));
  }

  /**
   * Clears the current user session
   */
  static clearIdentity() {
    Session.getInstance().clearSession();
  }

  /**
   * Widget opened status
   * @returns {boolean} isOpened
   */
  static isOpened() {
    return this.getInstance().openedMenu;
  }

  /**
   * Hides any open Gleap dialogs.
   */
  static hide() {
    const instance = this.getInstance();
    instance.closeGleap();
  }

  /**
   * Starts the Gleap flow.
   */
  static open() {
    const instance = this.getInstance();
    instance.showGleap();
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
   * Sets a custom screenshot
   * @param {*} screenshot
   */
  static setScreenshot(screenshot) {
    const instance = this.getInstance();
    instance.screenshot = screenshot;

    // Open screenshot
    if (instance.screenshotFeedbackOptions) {
      instance.showMobileScreenshotEditor(instance.screenshotFeedbackOptions);
      instance.screenshotFeedbackOptions = null;
    }
  }

  /**
   * Sets the feedback button text
   * @param {string} feedbackButtonText
   */
  static setFeedbackButtonText(feedbackButtonText) {
    const instance = this.getInstance();
    instance.feedbackButtonText = feedbackButtonText;
  }

  /**
   * Enable replays
   * @param {*} enabled
   */
  static enableReplays(enabled) {
    const instance = this.getInstance();

    instance.replaysEnabled = enabled;
    if (enabled) {
      if (instance.replay) {
        instance.replay.stop();
        instance.replay = null;
      }
      instance.replay = new ReplayRecorder();
    } else {
      if (instance.replay) {
        instance.replay.stop();
        instance.replay = null;
      }
    }
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
   * Show info popup
   * @param {boolean} showInfoPopup
   */
  static showInfoPopup(showInfoPopup) {
    this.getInstance().showInfoPopup = showInfoPopup;
  }

  /**
   * Set widget only
   * @param {boolean} widgetOnly
   */
  static isWidgetOnly(widgetOnly) {
    this.getInstance().widgetOnly = widgetOnly;
  }

  /**
   * Set widget only start feedback flow
   * @param {boolean} widgetStartFlow
   */
  static setWidgetStartFlow(widgetStartFlow) {
    this.getInstance().widgetStartFlow = widgetStartFlow;
  }

  /**
   * Set welcome icon
   * @param {string} welcomeIcon
   */
  static setWelcomeIcon(welcomeIcon) {
    this.getInstance().welcomeIcon = welcomeIcon;
  }

  /**
   * Show or hide the user name within the widget header
   * @param {boolean} showUserName
   */
  static setShowUserName(showUserName) {
    this.getInstance().showUserName = showUserName;
  }

  /**
   * Sets the button type.
   * @param {string} buttonType
   */
  static setButtonType(buttonType) {
    this.getInstance().buttonType = buttonType;
  }

  /**
   * Register events for Gleap.
   * @param {*} eventName
   * @param {*} callback
   */
  static on(eventName, callback) {
    const instance = this.getInstance();
    if (!instance.eventListeners[eventName]) {
      instance.eventListeners[eventName] = [];
    }
    instance.eventListeners[eventName].push(callback);
  }

  /**
   * Notify all registrants for event.
   */
  notifyEvent(event, data = {}) {
    const eventListeners = this.eventListeners[event];
    if (eventListeners) {
      for (var i = 0; i < eventListeners.length; i++) {
        const eventListener = eventListeners[i];
        if (eventListener) {
          eventListener(data);
        }
      }
    }
  }

  /**
   * Appends a node to the widgets container.
   * @param {*} node
   */
  static appendNode(node) {
    const instance = this.getInstance();
    if (instance.uiContainer) {
      instance.uiContainer.appendChild(node);
    } else {
      document.body.appendChild(node);
    }
  }

  /**
   * Sets the native widget callback
   * @param {*} widgetCallback
   */
  static widgetCallback(widgetCallback) {
    this.getInstance().widgetCallback = widgetCallback;
  }

  /**
   * Enable or disable shortcuts
   * @param {boolean} enabled
   */
  static enableShortcuts(enabled) {
    this.getInstance().shortcutsEnabled = enabled;
  }

  /**
   * Enable Intercom compatibility mode
   */
  static enableIntercomCompatibilityMode() {}

  /**
   * Show or hide the feedback button
   * @param {*} show
   * @returns
   */
  static showFeedbackButton(show) {
    const feedbackButton = this.getInstance().feedbackButton;
    if (!feedbackButton) {
      return;
    }

    if (show) {
      feedbackButton.style.display = "flex";
    } else {
      feedbackButton.style.display = "none";
    }
  }

  /**
   * Hides the powered by Gleap logo.
   * @param {boolean} hide
   */
  static enablePoweredBy(enabled) {
    this.getInstance().poweredByHidden = !enabled;
  }

  /**
   * Enables the network logger.
   */
  static enableNetworkLogger() {
    this.getInstance().networkIntercepter.start();
  }

  /**
   * Enables the network logger.
   */
  static setNetworkLogFilters(filters) {
    this.getInstance().networkIntercepter.setFilters(filters);
  }

  /**
   * Sets the logo url.
   * @param {string} logoUrl
   */
  static setLogoUrl(logoUrl) {
    this.getInstance().customLogoUrl = logoUrl;
  }

  /**
   * Sets the button logo url.
   * @param {string} logoUrl
   */
  static setButtonLogoUrl(logoUrl) {
    this.getInstance().customButtonLogoUrl = logoUrl;
  }

  /**
   * Enables the privacy policy.
   * @param {boolean} enabled
   */
  static enablePrivacyPolicy(enabled) {}

  /**
   * Sets the privacy policy url.
   * @param {string} privacyPolicyUrl
   */
  static setPrivacyPolicyUrl(privacyPolicyUrl) {}

  /**
   * Sets the widget info texts.
   * @param {string} widgetInfo
   */
  static setWidgetInfo(widgetInfo) {
    if (!widgetInfo) {
      return;
    }

    this.getInstance().widgetInfo = Object.assign(
      this.getInstance().widgetInfo,
      widgetInfo
    );
  }

  /**
   * Sets the app version code.
   * @param {string} appVersionCode
   */
  static setAppVersionCode(appVersionCode) {
    this.getInstance().appVersionCode = appVersionCode;
  }

  /**
   * Sets the app version code.
   * @param {string} appVersionCode
   */
  static setAppBuildNumber(appBuildNumber) {
    this.getInstance().appBuildNumber = appBuildNumber;
  }

  /**
   * Set a custom api url.
   * @param {string} apiUrl
   */
  static setApiUrl(apiUrl) {
    Session.getInstance().apiUrl = apiUrl;
  }

  /**
   * Set a custom widget api url.
   * @param {string} widgetUrl
   */
  static setWidgetUrl(widgetUrl) {
    Session.getInstance().widgetUrl = widgetUrl;
  }

  /**
   * Set custom data that will be attached to the bug-report.
   * @param {*} data
   */
  static attachCustomData(data) {
    const instance = this.getInstance();
    instance.customData = Object.assign(
      instance.customData,
      gleapDataParser(data)
    );
  }

  /**
   * Add one key value pair to the custom data object
   * @param {*} key The key of the custom data entry you want to add.
   * @param {*} value The custom data you want to add.
   */
  static setCustomData(key, value) {
    this.getInstance().customData[key] = value;
  }

  /**
   * Remove one key value pair of the custom data object
   * @param {*} key The key of the custom data entry you want to remove.
   */
  static removeCustomData(key) {
    delete this.getInstance().customData[key];
  }

  /**
   * Clear the custom data
   */
  static clearCustomData() {
    this.getInstance().customData = {};
  }

  /**
   * Override the browser language. Currently supported languages:
   * - en
   * - de
   * - fr
   * - it
   * - es
   * @param {string} language country code with two letters
   */
  static setLanguage(language) {
    this.getInstance().overrideLanguage = language;
  }

  /**
   * Enables crash detection.
   * @param {*} enabled
   * @param {*} silent
   */
  static enableCrashDetector(enabled, silent = false) {
    const instance = this.getInstance();
    instance.enabledCrashDetector = enabled;
    instance.enabledCrashDetectorSilent = silent;
  }

  /**
   * Enables rage click detection.
   * @param {*} silent
   */
  static enableRageClickDetector(silent = false) {
    const instance = this.getInstance();

    if (instance.enabledRageClickDetector) {
      return;
    }

    instance.enabledRageClickDetector = true;
    instance.enabledRageClickDetectorSilent = silent;

    startRageClickDetector(function (target) {
      instance.rageClickDetected = true;
      if (instance.enabledRageClickDetectorSilent) {
        Gleap.sendSilentReport({
          description: "Rage click detected.",
        });
      } else {
        Gleap.startFeedbackFlow("crash");
      }
    });
  }

  /**
   * Sets a custom color scheme.
   * @param {string} primaryColor
   */
  static setColors(primaryColor, headerColor, buttonColor) {
    this.setStyles({
      headerColor,
      primaryColor,
      buttonColor,
      backgroundColor,
    });
  }

  /**
   * Sets a custom color scheme.
   * @param {any} styles
   */
  static setStyles(styles) {
    this.getInstance().mainColor = styles.primaryColor;

    const headerColor = styles.headerColor
      ? styles.headerColor
      : styles.primaryColor;
    const buttonColor = styles.buttonColor
      ? styles.buttonColor
      : styles.primaryColor;
    const borderRadius = styles.borderRadius != null ? styles.borderRadius : 20;
    const backgroundColor =
      styles.backgroundColor != null ? styles.backgroundColor : "#fff";

    if (
      document.readyState === "complete" ||
      document.readyState === "loaded" ||
      document.readyState === "interactive"
    ) {
      injectStyledCSS(
        styles.primaryColor,
        headerColor,
        buttonColor,
        borderRadius,
        backgroundColor
      );
    } else {
      document.addEventListener("DOMContentLoaded", function (event) {
        injectStyledCSS(
          styles.primaryColor,
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
    const sessionInstance = Session.getInstance();

    if (!sessionInstance.ready) {
      return;
    }

    instance.excludeData = excludeData ? excludeData : {};
    instance.severity = priority;
    instance.feedbackType = feedbackType;

    instance.formData = formData ? formData : {};
    if (sessionInstance.session.email) {
      instance.formData.reportedBy = sessionInstance.session.email;
    }

    this.startFeedbackFlow(null, true);
  }

  /**
   * Reports a bug silently
   * @param {*} description
   * @deprecated Please use sendSilentReport instead.
   */
  static sendSilentBugReport(description, priority = Gleap.PRIORITY_MEDIUM) {
    return Gleap.sendSilentReport(
      {
        description: description,
      },
      priority,
      "BUG"
    );
  }

  /**
   * Starts the feedback type selection flow.
   */
  static startFeedbackTypeSelection(fromBack = false) {
    const sessionInstance = Session.getInstance();
    const instance = this.getInstance();
    instance.stopBugReportingAnalytics();
    instance.widgetOpened = true;
    instance.openedMenu = true;
    instance.updateFeedbackButtonState();

    // Start feedback type dialog
    createFeedbackTypeDialog(
      instance.feedbackTypeActions,
      instance.overrideLanguage,
      instance.customLogoUrl,
      instance.poweredByHidden,
      function () {},
      `${translateText(
        "Hi",
        instance.overrideLanguage
      )} <span id="bb-user-name">${
        instance.showUserName && sessionInstance.session.name
          ? sessionInstance.session.name
          : ""
      }</span> ${instance.welcomeIcon}`,
      translateText(
        instance.widgetInfo.dialogSubtitle,
        instance.overrideLanguage
      ),
      fromBack
    );
  }

  /**
   * Register custom action
   */
  static registerCustomAction(customAction) {
    const instance = this.getInstance();

    if (instance.customActionCallbacks) {
      instance.customActionCallbacks.push(customAction);
    }
  }

  /**
   * Triggers a custom action
   */
  static triggerCustomAction(name) {
    const instance = this.getInstance();

    if (instance.widgetCallback) {
      instance.widgetCallback("customActionCalled", {
        name,
      });
    }

    if (instance.customActionCallbacks) {
      for (var i = 0; i < instance.customActionCallbacks.length; i++) {
        var callback = instance.customActionCallbacks[i];
        if (callback) {
          callback({
            name,
          });
        }
      }
    }
  }

  /**
   * Sets the feedback flow options.
   */
  static setFeedbackActions(feedbackActions) {
    this.getInstance().feedbackActions = feedbackActions;
  }

  /**
   * Sets the menu options.
   */
  static setMenuOptions(options) {
    this.getInstance().feedbackTypeActions = options;
  }

  getFeedbackOptions(feedbackFlow) {
    var feedbackOptions = null;

    // Try to load the specific feedback flow.
    if (feedbackFlow) {
      feedbackOptions = this.feedbackActions[feedbackFlow];
    }

    // Fallback
    if (!feedbackOptions) {
      feedbackOptions = this.feedbackActions.bugreporting;
    }

    // Deep copy to prevent changes.
    try {
      feedbackOptions = JSON.parse(JSON.stringify(feedbackOptions));
    } catch (e) {}

    return feedbackOptions;
  }

  /**
   * Starts the bug reporting flow.
   */
  static startFeedbackFlow(feedbackFlow, silentBugReport = false) {
    const sessionInstance = Session.getInstance();
    const instance = this.getInstance();
    if (instance.currentlySendingBug) {
      return;
    }

    if (!sessionInstance.ready) {
      return;
    }

    // Get feedback options
    var feedbackOptions = instance.getFeedbackOptions(feedbackFlow);
    if (!feedbackOptions) {
      return;
    }

    instance.notifyEvent("flow-started", feedbackOptions);
    instance.closeModalUI();
    instance.currentlySendingBug = true;
    instance.silentBugReport = silentBugReport;
    if (!silentBugReport) {
      instance.widgetOpened = true;
    }

    if (feedbackOptions.form && feedbackOptions.form.length > 0) {
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

    instance.stopBugReportingAnalytics();

    // Set snapshot position
    instance.snapshotPosition = {
      x: window.scrollX,
      y: window.scrollY,
    };

    if (instance.silentBugReport) {
      // Move on
      instance.checkReplayLoaded();
    } else {
      // Show editor
      instance.showBugReportEditor(feedbackOptions);
    }

    instance.updateFeedbackButtonState();
  }

  stopBugReportingAnalytics() {
    this.networkIntercepter.setStopped(true);
    if (this.replay && !this.replay.stopped) {
      this.replay.stop(!this.isLiveSite);
    }
  }

  startCrashDetection() {
    const self = this;
    window.onerror = function (msg, url, lineNo, columnNo, error) {
      var message = [
        "Message: " + msg,
        "URL: " + url,
        "Line: " + lineNo,
        "Column: " + columnNo,
        "Stack: " + (error && error.stack) ? error.stack : "",
      ];
      self.addLog(message, "ERROR");

      if (
        self.enabledCrashDetector &&
        !self.appCrashDetected &&
        !self.currentlySendingBug
      ) {
        self.appCrashDetected = true;
        if (self.enabledCrashDetectorSilent) {
          return Gleap.sendSilentReport(
            {
              errorMessage: msg,
              url: url,
              lineNo: lineNo,
              columnNo: columnNo,
              stackTrace: error && error.stack ? error.stack : "",
            },
            Gleap.PRIORITY_MEDIUM,
            "CRASH",
            {
              screenshot: true,
              replays: true,
            }
          );
        } else {
          Gleap.startFeedbackFlow("crash");
        }
      }

      return false;
    };
  }

  truncateString(str, num) {
    if (str.length > num) {
      return str.slice(0, num) + "...";
    } else {
      return str;
    }
  }

  addLog(args, priority) {
    if (!args) {
      return;
    }

    var log = "";
    for (var i = 0; i < args.length; i++) {
      log += args[i] + " ";
    }
    this.logArray.push({
      log: this.truncateString(log, 1000),
      date: new Date(),
      priority,
    });

    if (this.logArray.length > this.logMaxLength) {
      this.logArray.shift();
    }
  }

  static disableConsoleLogOverwrite() {
    window.console = this.getInstance().originalConsoleLog;
  }

  overwriteConsoleLog() {
    const self = this;
    window.console = (function (origConsole) {
      if (!window.console || !origConsole) {
        origConsole = {};
      }

      self.originalConsoleLog = origConsole;

      return {
        ...origConsole,
        log: function () {
          self.addLog(arguments, "INFO");
          origConsole.log && origConsole.log.apply(origConsole, arguments);
        },
        warn: function () {
          self.addLog(arguments, "WARNING");
          origConsole.warn && origConsole.warn.apply(origConsole, arguments);
        },
        error: function () {
          self.addLog(arguments, "ERROR");
          origConsole.error && origConsole.error.apply(origConsole, arguments);
        },
        info: function (v) {
          self.addLog(arguments, "INFO");
          origConsole.info && origConsole.info.apply(origConsole, arguments);
        },
      };
    })(window.console);
  }

  resetLoading(resetProgress) {
    if (this.fakeLoading) {
      clearInterval(this.fakeLoading);
    }
    this.fakeLoading = null;
    this.fakeLoadingProgress = 0;
    if (resetProgress) {
      setLoadingIndicatorProgress(1);
    }
  }

  getWidgetDialogClass = () => {
    if (this.appCrashDetected || this.rageClickDetected) {
      return "bb-feedback-dialog--crashed";
    }
    return "";
  };

  createFeedbackFormDialog(feedbackOptions) {
    const self = this;

    const formData = buildForm(feedbackOptions, this.overrideLanguage);
    const title = translateText(feedbackOptions.title, this.overrideLanguage);
    const htmlContent = `<div class="bb-feedback-dialog-error">${translateText(
      "Something went wrong, please try again.",
      self.overrideLanguage
    )}</div><div class="bb-feedback-dialog-loading bb-feedback-dialog-loading--main">
    <svg
      class="bb--progress-ring"
      width="120"
      height="120">
      <circle
        class="bb--progress-ring__circle"
        stroke="${this.mainColor}"
        stroke-width="6"
        fill="transparent"
        r="34"
        cx="60"
        cy="60"/>
    </svg>
  </div>
  <div class="bb-feedback-dialog-success">
    <svg width="120px" height="92px" viewBox="0 0 120 92" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
            <g fill="${this.mainColor}" fill-rule="nonzero">
                <path d="M107.553103,1.03448276 L101.669379,6.85344828 C81.2141379,27.3490345 62.5845517,47.5706897 42.7038621,67.7596552 L17.5535172,47.6517931 L11.088,42.4793793 L0.743172414,55.4104138 L38.2431724,85.4104138 L44.0621379,90.0010345 L49.2991034,84.764069 C71.5404828,62.4751034 91.5349655,40.4985517 113.437034,18.5571724 L119.256,12.6734483 L107.553103,1.03448276 Z" id="Path"></path>
            </g>
        </g>
    </svg>
    <div class="bb-feedback-dialog-info-text">${translateText(
      feedbackOptions.thanksMessage
        ? feedbackOptions.thanksMessage
        : "Thank you!",
      this.overrideLanguage
    )}</div>
  </div>
  <div class="bb-feedback-form">
    ${formData}
  </div>`;

    createWidgetDialog(
      title,
      null,
      this.customLogoUrl,
      htmlContent,
      function () {
        self.goBackToMainMenu();
      },
      this.openedMenu,
      `bb-anim-fadeinright ${this.getWidgetDialogClass()} bb-feedback-dialog-form`
    );

    this.openedMenu = true;
    this.resetLoading(true);
    validatePoweredBy(this.poweredByHidden);
    hookForm(feedbackOptions, function () {
      self.formSubmitAction(feedbackOptions);
    });
  }

  formSubmitAction(feedbackOptions) {
    const self = this;

    // Remember form items
    rememberForm(feedbackOptions.form);

    window.scrollTo(self.snapshotPosition.x, self.snapshotPosition.y);
    toggleLoading(true);

    // Start fake loading
    self.fakeLoading = setInterval(function () {
      if (self.fakeLoadingProgress > 75) {
        self.resetLoading(false);
        return;
      }
      self.fakeLoadingProgress += 2;
      setLoadingIndicatorProgress(self.fakeLoadingProgress);
    }, 150);

    // Send form
    const formData = getFormData(feedbackOptions.form);
    self.formData = formData;
    self.excludeData = feedbackOptions.excludeData
      ? feedbackOptions.excludeData
      : {};
    self.feedbackType = feedbackOptions.feedbackType
      ? feedbackOptions.feedbackType
      : "BUG";

    if (self.widgetOnly && self.widgetCallback) {
      self.widgetCallback("sendFeedback", {
        type: self.feedbackType,
        formData: self.formData,
        screenshot: self.screenshot,
        excludeData: self.excludeData,
      });
    } else {
      self.checkReplayLoaded();
    }
  }

  checkReplayLoaded(retries = 0) {
    if (
      this.replaysEnabled &&
      !(this.replay && this.replay.result) &&
      retries < 5
    ) {
      // Replay is not ready yet.
      setTimeout(() => {
        this.checkReplayLoaded(++retries);
      }, 1000);
    } else {
      this.takeScreenshotAndSend();
    }
  }

  takeScreenshotAndSend() {
    if (this.excludeData && this.excludeData.screenshot) {
      // Screenshot excluded.
      this.sendBugReportToServer();
    } else {
      return startScreenCapture(this.snapshotPosition, this.isLiveSite)
        .then((data) => {
          this.sendBugReportToServer(data);
        })
        .catch((err) => {
          this.showError();
        });
    }
  }

  reportCleanupOnClose() {
    try {
      Gleap.enableReplays(this.replaysEnabled);
    } catch (exp) {}
    try {
      this.networkIntercepter.setStopped(false);
    } catch (exp) {}

    this.actionToPerform = undefined;

    if (this.widgetCallback) {
      this.widgetCallback("closeGleap", {});
    }
  }

  closeModalUI(cleanUp) {
    const dialogContainer = document.querySelector(
      ".bb-feedback-dialog-container"
    );
    if (dialogContainer) {
      dialogContainer.remove();
    }
  }

  closeGleap(cleanUp = true) {
    if (cleanUp) {
      this.reportCleanupOnClose();
    }

    this.currentlySendingBug = false;
    this.widgetOpened = false;
    this.openedMenu = false;
    this.appCrashDetected = false;
    this.rageClickDetected = false;
    this.updateFeedbackButtonState();

    // Remove editor.
    const editorContainer = document.querySelector(".bb-capture-editor");
    if (editorContainer) {
      editorContainer.remove();
    }

    this.notifyEvent("close");
    this.closeModalUI(cleanUp);
  }

  isLocalNetwork(hostname = window.location.hostname) {
    return (
      ["localhost", "127.0.0.1", "0.0.0.0", "", "::1"].includes(hostname) ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.0.") ||
      hostname.endsWith(".local")
    );
  }

  init() {
    this.overwriteConsoleLog();
    this.startCrashDetection();
    this.registerKeyboardListener();
    this.registerEscapeListener();

    if (this.isLocalNetwork()) {
      this.isLiveSite = false;
    } else {
      this.isLiveSite = true;
    }
  }

  registerKeyboardListener() {
    const self = this;
    const charForEvent = function (event) {
      var code;

      if (event.key !== undefined) {
        code = event.key;
      } else if (event.keyIdentifier !== undefined) {
        code = event.keyIdentifier;
      } else if (event.keyCode !== undefined) {
        code = event.keyCode;
      }

      return code;
    };

    document.onkeyup = function (e) {
      var char = charForEvent(e);
      if (
        e.ctrlKey &&
        (char === "i" || char === "I" || char === 73) &&
        self.shortcutsEnabled
      ) {
        Gleap.startFeedbackFlow();
      }
    };
  }

  checkForInitType() {
    if (window && window.onGleapLoaded) {
      window.onGleapLoaded(Gleap);
    }

    setInterval(() => {
      if (this.replay && this.replay.isFull()) {
        Gleap.enableReplays(this.replaysEnabled);
      }
    }, 1000);

    if (this.widgetOnly) {
      // App widget
      const self = this;
      if (self.widgetStartFlow) {
        Gleap.startFeedbackFlow(self.widgetStartFlow);
      } else {
        if (self.feedbackTypeActions.length > 0) {
          Gleap.startFeedbackTypeSelection();
        } else {
          Gleap.startFeedbackFlow();
        }
      }
    } else {
      // Web widget
      Session.getInstance().setOnSessionReady(() => {
        this.injectFeedbackButton();
      });
    }
  }

  injectFeedbackButton() {
    const self = this;

    var buttonIcon = "";
    if (self.customButtonLogoUrl) {
      buttonIcon = `<img class="bb-logo-logo" src="${self.customButtonLogoUrl}" alt="Feedback Button" />`;
    } else {
      buttonIcon = loadIcon("bblogo", "#fff");
    }

    var elem = document.createElement("div");
    elem.className = "bb-feedback-button";
    if (
      this.buttonType === Gleap.FEEDBACK_BUTTON_CLASSIC ||
      this.buttonType === Gleap.FEEDBACK_BUTTON_CLASSIC_BOTTOM ||
      this.buttonType === Gleap.FEEDBACK_BUTTON_CLASSIC_LEFT
    ) {
      elem.innerHTML = `<div class="bb-feedback-button-classic ${
        this.buttonType === Gleap.FEEDBACK_BUTTON_CLASSIC_LEFT
          ? "bb-feedback-button-classic--left"
          : ""
      }${
        this.buttonType === Gleap.FEEDBACK_BUTTON_CLASSIC_BOTTOM
          ? "bb-feedback-button-classic--bottom"
          : ""
      }">${translateText(
        this.feedbackButtonText,
        this.overrideLanguage
      )}</div>`;
    } else {
      elem.innerHTML = `<div class="bb-feedback-button-icon">${buttonIcon}${loadIcon(
        "arrowdown",
        "#fff"
      )}</div>`;
    }

    elem.onclick = function () {
      self.feedbackButtonPressed();
    };

    Gleap.appendNode(elem);

    if (this.buttonType === Gleap.FEEDBACK_BUTTON_NONE) {
      elem.classList.add("bb-feedback-button--disabled");
    }

    if (this.buttonType === Gleap.FEEDBACK_BUTTON_BOTTOM_LEFT) {
      elem.classList.add("bb-feedback-button--bottomleft");
    }

    this.feedbackButton = elem;
  }

  showGleap() {
    if (this.widgetOpened) {
      return;
    }

    if (this.feedbackTypeActions.length > 0) {
      Gleap.startFeedbackTypeSelection();
    } else {
      Gleap.startFeedbackFlow();
    }

    // Remove shoutout.
    const feedbackShoutout = window.document.getElementsByClassName(
      "bb-feedback-button-shoutout"
    );
    if (feedbackShoutout && feedbackShoutout.length > 0) {
      feedbackShoutout[0].remove();
    }

    // Prevent shoutout from showing again.
    try {
      localStorage.setItem("bb-fto", true);
    } catch (exp) {}

    this.notifyEvent("open");
  }

  feedbackButtonPressed() {
    if (this.widgetOpened) {
      this.closeGleap();
      return;
    }

    this.showGleap();
  }

  updateFeedbackButtonState(retry = false) {
    if (this.feedbackButton === null) {
      if (!retry) {
        setTimeout(() => {
          this.updateFeedbackButtonState(true);
        }, 500);
      }
      return;
    }

    const sendingClass = "bb-feedback-button--sending";
    if (this.widgetOpened) {
      this.feedbackButton.classList.add(sendingClass);
    } else {
      this.feedbackButton.classList.remove(sendingClass);
    }

    const crashedClass = "bb-feedback-button--crashed";
    if (this.appCrashDetected || this.rageClickDetected) {
      this.feedbackButton.classList.add(crashedClass);
    } else {
      this.feedbackButton.classList.remove(crashedClass);
    }

    const dialogContainer = document.querySelector(
      ".bb-feedback-dialog-container"
    );
    const containerFocusClass = "bb-feedback-dialog-container--focused";
    if (dialogContainer) {
      if (this.appCrashDetected || this.rageClickDetected) {
        dialogContainer.classList.add(containerFocusClass);
      } else {
        dialogContainer.classList.remove(containerFocusClass);
      }
    }
  }

  registerEscapeListener() {
    const self = this;
    document.addEventListener("keydown", (evt) => {
      evt = evt || window.event;
      var isEscape = false;
      if ("key" in evt) {
        isEscape = evt.key === "Escape" || evt.key === "Esc";
      } else {
        isEscape = evt.keyCode === 27;
      }
      if (isEscape) {
        self.closeGleap();
      }
    });
  }

  showSuccessMessage() {
    const success = document.querySelector(".bb-feedback-dialog-success");
    const form = document.querySelector(".bb-feedback-form");
    const loader = document.querySelector(".bb-feedback-dialog-loading");
    form.style.display = "none";
    loader.style.display = "none";
    success.style.display = "flex";
  }

  performAction(action) {
    if (action && action.outbound && action.actionType) {
      this.actionToPerform = action;
      Gleap.startFeedbackFlow(action.actionType);
    }
  }

  sendBugReportToServer(screenshotData) {
    const self = this;
    const http = new XMLHttpRequest();
    http.open("POST", Session.getInstance().apiUrl + "/bugs");
    http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    Session.getInstance().injectSession(http);
    http.onerror = (error) => {
      if (self.silentBugReport) {
        self.closeGleap();
        return;
      }

      self.showError();
    };
    http.upload.onprogress = function (e) {
      if (self.silentBugReport) {
        self.closeGleap();
        return;
      }

      if (e.lengthComputable) {
        const percentComplete = parseInt((e.loaded / e.total) * 100);

        if (
          percentComplete > 25 &&
          percentComplete > self.fakeLoadingProgress
        ) {
          if (self.fakeLoading) {
            self.resetLoading(false);
          }
          setLoadingIndicatorProgress(percentComplete);
        }
      }
    };
    http.onreadystatechange = function (e) {
      if (self.silentBugReport) {
        self.closeGleap();
        return;
      }

      if (http.readyState === XMLHttpRequest.DONE) {
        if (http.status === 200 || http.status === 201) {
          self.notifyEvent("feedback-sent");
          self.showSuccessAndClose();
        } else {
          self.showError();
        }
      }
    };

    const bugReportData = {
      priority: this.severity,
      customData: this.customData,
      metaData: this.getMetaData(),
      consoleLog: this.logArray,
      networkLogs: this.networkIntercepter.getRequests(),
      customEventLog: StreamedEvent.getInstance().eventArray,
      type: this.feedbackType,
      formData: this.formData,
      isSilent: this.silentBugReport,
    };

    if (this.actionToPerform && this.actionToPerform.outbound) {
      bugReportData["outbound"] = this.actionToPerform.outbound;
    }

    if (screenshotData && screenshotData.fileUrl) {
      bugReportData["screenshotUrl"] = screenshotData.fileUrl;
    }

    if (screenshotData && screenshotData.html) {
      bugReportData["screenshotData"] = screenshotData;
    }

    if (this.replay && this.replay.result) {
      bugReportData["webReplay"] = this.replay.result;
    }

    // Exclude data logic.
    const keysToExclude = Object.keys(this.excludeData);
    for (let i = 0; i < keysToExclude.length; i++) {
      const keyToExclude = keysToExclude[i];
      if (this.excludeData[keyToExclude] === true) {
        delete bugReportData[keyToExclude];

        if (keyToExclude === "screenshot") {
          delete bugReportData.screenshotData;
          delete bugReportData.screenshotUrl;
        }

        if (keyToExclude === "replays") {
          delete bugReportData.webReplay;
        }
      }
    }

    http.send(JSON.stringify(bugReportData));
  }

  jsonSize(obj) {
    const size = new TextEncoder().encode(JSON.stringify(obj)).length;
    const kiloBytes = size / 1024;
    const megaBytes = kiloBytes / 1024;
  }

  showSuccessAndClose() {
    const self = this;
    self.showSuccessMessage();
    setTimeout(function () {
      self.closeGleap();
    }, 2800);
  }

  showError() {
    if (this.silentBugReport) {
      this.closeGleap();
      return;
    }

    this.notifyEvent("error-while-sending");
    toggleLoading(false);
    document.querySelector(".bb-feedback-dialog-error").style.display = "flex";
  }

  getMetaData() {
    var nAgt = navigator.userAgent;
    var browserName = navigator.appName;
    var fullVersion = "" + parseFloat(navigator.appVersion);
    var majorVersion = parseInt(navigator.appVersion, 10);
    var nameOffset, verOffset, ix;

    // In Opera, the true version is after "Opera" or after "Version"
    if ((verOffset = nAgt.indexOf("Opera")) !== -1) {
      browserName = "Opera";
      fullVersion = nAgt.substring(verOffset + 6);
      if ((verOffset = nAgt.indexOf("Version")) !== -1)
        fullVersion = nAgt.substring(verOffset + 8);
    }
    // In MSIE, the true version is after "MSIE" in userAgent
    else if ((verOffset = nAgt.indexOf("MSIE")) !== -1) {
      browserName = "Microsoft Internet Explorer";
      fullVersion = nAgt.substring(verOffset + 5);
    }
    // In Chrome, the true version is after "Chrome"
    else if ((verOffset = nAgt.indexOf("Chrome")) !== -1) {
      browserName = "Chrome";
      fullVersion = nAgt.substring(verOffset + 7);
    }
    // In Safari, the true version is after "Safari" or after "Version"
    else if ((verOffset = nAgt.indexOf("Safari")) !== -1) {
      browserName = "Safari";
      fullVersion = nAgt.substring(verOffset + 7);
      if ((verOffset = nAgt.indexOf("Version")) !== -1)
        fullVersion = nAgt.substring(verOffset + 8);
    }
    // In Firefox, the true version is after "Firefox"
    else if ((verOffset = nAgt.indexOf("Firefox")) !== -1) {
      browserName = "Firefox";
      fullVersion = nAgt.substring(verOffset + 8);
    }
    // In most other browsers, "name/version" is at the end of userAgent
    else if (
      (nameOffset = nAgt.lastIndexOf(" ") + 1) <
      (verOffset = nAgt.lastIndexOf("/"))
    ) {
      browserName = nAgt.substring(nameOffset, verOffset);
      fullVersion = nAgt.substring(verOffset + 1);
      if (browserName.toLowerCase() === browserName.toUpperCase()) {
        browserName = navigator.appName;
      }
    }
    // trim the fullVersion string at semicolon/space if present
    if ((ix = fullVersion.indexOf(";")) !== -1)
      fullVersion = fullVersion.substring(0, ix);
    if ((ix = fullVersion.indexOf(" ")) !== -1)
      fullVersion = fullVersion.substring(0, ix);

    majorVersion = parseInt("" + fullVersion, 10);
    if (isNaN(majorVersion)) {
      fullVersion = "" + parseFloat(navigator.appVersion);
      majorVersion = parseInt(navigator.appVersion, 10);
    }

    var OSName = "Unknown OS";
    if (navigator.appVersion.indexOf("Win") !== -1) OSName = "Windows";
    if (navigator.appVersion.indexOf("Mac") !== -1) OSName = "MacOS";
    if (navigator.appVersion.indexOf("X11") !== -1) OSName = "UNIX";
    if (navigator.appVersion.indexOf("Linux") !== -1) OSName = "Linux";
    if (navigator.appVersion.indexOf("iPad") !== -1) OSName = "iPad";
    if (navigator.appVersion.indexOf("iPhone") !== -1) OSName = "iPhone";
    if (navigator.appVersion.indexOf("Android") !== -1) OSName = "Android";

    const now = new Date();
    const sessionDuration =
      (now.getTime() - this.sessionStart.getTime()) / 1000;

    return {
      browserName: browserName + "(" + fullVersion + ")",
      userAgent: nAgt,
      browser: navigator.appName,
      systemName: OSName,
      buildVersionNumber: this.appBuildNumber,
      releaseVersionNumber: this.appVersionCode,
      sessionDuration: sessionDuration,
      devicePixelRatio: window.devicePixelRatio,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      currentUrl: window.location.href,
      language: navigator.language || navigator.userLanguage,
      mobile: isMobile(),
      sdkVersion: SDK_VERSION,
      sdkType: "javascript",
    };
  }

  showBugReportEditor(feedbackOptions) {
    const self = this;

    // Stop here if we don't want to show the native screenshot tools.
    if (feedbackOptions.disableUserScreenshot) {
      this.createFeedbackFormDialog(feedbackOptions);
      return;
    }

    // Predefined screenshot set, show the editor.
    if (this.screenshot) {
      this.showMobileScreenshotEditor(feedbackOptions);
      return;
    }

    // Fetch screenshot from native SDK.
    if (this.widgetOnly && this.widgetCallback) {
      if (this.widgetOnly && this.widgetCallback) {
        this.screenshotFeedbackOptions = feedbackOptions;
        this.widgetCallback("requestScreenshot", {});
      }
      return;
    }

    this.showScreenshotEditor(feedbackOptions);
  }

  showScreenshotEditor(feedbackOptions) {
    const self = this;

    // Manage feedback button
    const feedbackButton = document.querySelector(".bb-feedback-button");
    var feedbackButtonStyle = "";
    if (feedbackButton) {
      feedbackButtonStyle = feedbackButton.style;
      feedbackButton.style.display = "none";
    }

    // Add HTML for drawing and recording
    var bugReportingEditor = document.createElement("div");
    bugReportingEditor.className = "bb-capture-editor";
    bugReportingEditor.innerHTML = `
      <div class="bb-capture-editor-borderlayer"></div>
      <svg class="bb-capture-svg" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" xml:space="preserve">
      <div class="bb-capture-mousetool"></div>
      <div class='bb-capture-editor-drag-info'>
        <svg width="1044px" height="1009px" viewBox="0 0 1044 1009" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
            <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                <g transform="translate(-515.000000, -518.000000)" fill="#FF0000" fill-rule="nonzero">
                    <g transform="translate(515.268457, 518.009827)">
                        <path d="M99.477,755.771 L287.807,944.102 L233.288043,998.621573 C222.003043,1009.90657 204.483043,1012.06257 190.800043,1003.85207 L16.8900429,899.502073 C-2.51595711,887.861073 -5.80895711,861.080073 10.1908429,845.080073 L99.477,755.771 Z M874.550043,25.4684733 L1018.11004,169.028473 C1049.11804,200.040473 1052.18404,249.286473 1025.26234,283.908473 L602.872343,826.988473 C600.657543,829.836173 598.270743,832.543173 595.720043,835.090073 C571.607043,859.207073 536.849043,866.195073 506.568043,856.063073 L364.718043,934.868073 C351.140043,942.407173 334.210043,940.036073 323.230043,929.055573 L313.403,919.228 L313.624658,919.007355 L124.827147,730.209845 L124.609,730.428 L114.523543,720.342173 C103.543543,709.362173 101.171543,692.432173 108.711043,678.858173 L187.516043,537.018173 C176.094043,502.979173 186.644953,463.998173 216.590043,440.706173 L759.670043,18.3161733 C794.287043,-8.6058267 843.533043,-5.5388267 874.550043,25.4684733 Z M970.341543,241.190173 C975.728243,234.264373 975.114943,224.417173 968.911843,218.213173 L825.351843,74.6531733 C819.148743,68.4500733 809.300843,67.8367733 802.378843,73.2234733 L259.298843,495.613473 C251.716843,501.507973 250.353543,512.433473 256.248043,520.015473 C256.693353,520.585783 257.169923,521.128773 257.681643,521.636573 L521.921643,785.886573 C528.714643,792.675673 539.726643,792.675673 546.515643,785.886573 C547.027363,785.374853 547.503923,784.831873 547.945343,784.265473 L970.341543,241.190173 Z M447.131543,809.480173 L234.081543,596.430173 L182.261543,689.707173 L353.851543,861.297173 L447.131543,809.480173 Z" id="Shape"></path>
                    </g>
                </g>
            </g>
        </svg>
      </div>
      <div class="bb-capture-toolbar">
        <div class="bb-capture-toolbar-item bb-capture-toolbar-item-tool bb-capture-toolbar-item--active" data-type="pen" data-active="true">
          <svg width="1072px" height="1034px" viewBox="0 0 1072 1034" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
              <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                  <g transform="translate(-907.000000, -217.000000)" fill-rule="nonzero">
                      <g transform="translate(907.268457, 217.009827)">
                          <g transform="translate(132.335119, 0.000000)" fill="#000">
                              <path d="M20.3764235,730.530173 L10.1884235,720.342173 C-0.791576454,709.362173 -3.16357645,692.432173 4.37592355,678.858173 L83.1809235,537.018173 C71.7589235,502.979173 82.3098335,463.998173 112.254924,440.706173 L655.334924,18.3161733 C689.951924,-8.6058267 739.197924,-5.5388267 770.214924,25.4684733 L913.774924,169.028473 C944.782924,200.040473 947.848924,249.286473 920.927224,283.908473 L498.537224,826.988473 C496.322424,829.836173 493.935624,832.543173 491.384924,835.090073 C467.271924,859.207073 432.513924,866.195073 402.232924,856.063073 L260.382924,934.868073 C246.804924,942.407173 229.874924,940.036073 218.894924,929.055573 L208.706924,918.867573 L20.3764235,730.530173 Z M866.006424,241.190173 C871.393124,234.264373 870.779824,224.417173 864.576724,218.213173 L721.016724,74.6531733 C714.813624,68.4500733 704.965724,67.8367733 698.043724,73.2234733 L154.963724,495.613473 C147.381724,501.507973 146.018424,512.433473 151.912924,520.015473 C152.358234,520.585783 152.834804,521.128773 153.346524,521.636573 L417.586524,785.886573 C424.379524,792.675673 435.391524,792.675673 442.180524,785.886573 C442.692244,785.374853 443.168804,784.831873 443.610224,784.265473 L866.006424,241.190173 Z M342.796424,809.480173 L129.746424,596.430173 L77.9264235,689.707173 L249.516424,861.297173 L342.796424,809.480173 Z"></path>
                          </g>
                          <g transform="translate(-0.000000, 755.530173)" fill="#D50202">
                              <path d="M124.711543,0 L313.042043,188.3374 L233.288043,268.0914 C222.003043,279.3764 204.483043,281.5324 190.800043,273.3219 L16.8900429,168.9719 C-2.51595711,157.3309 -5.80895711,130.5499 10.1908429,114.5499 L124.711543,0 Z" id="Shape"></path>
                          </g>
                      </g>
                  </g>
              </g>
          </svg>
        </div>
        <div class="bb-capture-toolbar-item bb-capture-toolbar-item-tool" data-type="rect" data-active="false">
          <svg width="1200pt" height="1200pt" version="1.1" viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg">
            <path d="m1168.8 195.51v808.97h-1137.7v-808.97zm-87.84 87.84h-961.98v631.88h961.98z" fill="#000"/>
          </svg>
        </div>
        <div class="bb-capture-toolbar-item" data-type="colorpicker">
          <div class="bb-capture-toolbar-item-selectedcolor">
            <div class="bb-capture-toolbar-item-colorpicker">
              <div class="bb-capture-toolbar-item-color" style="background-color: #ff0000"></div>
              <div class="bb-capture-toolbar-item-color" style="background-color: #000000"></div>
              <div class="bb-capture-toolbar-item-color" style="background-color: #ffffff"></div>
              <div class="bb-capture-toolbar-item-color" style="background-color: #00ff00"></div>
              <div class="bb-capture-toolbar-item-color" style="background-color: #0000ff"></div>
            </div>
          </div>
        </div>
        <div class="bb-capture-toolbar-item" data-type="mic" data-active="false">
          <svg
            width="1200pt"
            height="1200pt"
            version="1.1"
            viewBox="0 0 1200 1200"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g fill="#000">
              <path
                d="m600 862.5c144.75 0 262.5-117.75 262.5-262.5v-300c0-144.75-117.75-262.5-262.5-262.5s-262.5 117.75-262.5 262.5v300c0 144.75 117.75 262.5 262.5 262.5z"
              />
              <path
                d="m1012.5 600c0-20.707-16.793-37.5-37.5-37.5s-37.5 16.793-37.5 37.5c0 186.11-151.41 337.5-337.5 337.5s-337.5-151.39-337.5-337.5c0-20.707-16.793-37.5-37.5-37.5s-37.5 16.793-37.5 37.5c0 214.8 165.08 391.57 375 410.6v114.4c0 20.727 16.793 37.5 37.5 37.5s37.5-16.773 37.5-37.5v-114.4c209.92-19.031 375-195.8 375-410.6z"
              />
            </g>
          </svg>
          <span class="bb-tooltip">Tooltip text</span>
        </div> 
        <div class="bb-capture-toolbar-item" data-type="recording" data-active="false">
          <svg width="1160px" height="1160px" viewBox="0 0 1160 1160" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
              <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                  <g  transform="translate(0.000000, -0.000000)" fill-rule="nonzero">
                      <path d="M579.91,0 C258.38,0 0,261.24 0,579.91 C0,898.57 258.38,1159.82 579.91,1159.82 C901.44,1159.82 1159.82,901.44 1159.82,579.91 C1159.82,258.38 898.57,0 579.91,0 Z M579.91,1045 C324.41,1045 114.84,835.43 114.84,579.93 C114.84,324.43 321.54,114.86 579.91,114.86 C838.29,114.86 1042.11,324.43 1042.11,579.93 C1042.11,835.43 835.41,1045 579.91,1045 Z" fill="#000"></path>
                      <path d="M815.32,579.905 C815.32,709.915 709.93,815.315 579.91,815.315 C449.89,815.315 344.5,709.925 344.5,579.905 C344.5,449.895 449.89,344.495 579.91,344.495 C709.93,344.495 815.32,449.885 815.32,579.905" fill="#D50202"></path>
                  </g>
              </g>
          </svg>
          <span class="bb-tooltip">Tooltip text</span>
        </div>
        <div class="bb-feedback-send-button">${translateText(
          `Next`,
          self.overrideLanguage
        )}</div>
      </div>
    `;
    Gleap.appendNode(bugReportingEditor);

    // Hook up the drawing.
    const screenDrawer = new GleapScreenDrawer();

    // Mouse logic
    function setMouseMove(x, y) {
      const dragInfo = document.querySelector(".bb-capture-editor-drag-info");
      if (!dragInfo) {
        return;
      }

      dragInfo.style.left = `${x + 6}px`;
      dragInfo.style.top = `${y - 26}px`;
      dragInfo.style.right = null;
    }

    function mouseMoveEventHandler(e) {
      const x = e.pageX - document.documentElement.scrollLeft;
      const y = e.pageY - document.documentElement.scrollTop;
      setMouseMove(x, y);
    }

    function touchMoveEventHandler(e) {
      const x = e.touches[0].pageX - document.documentElement.scrollLeft;
      const y = e.touches[0].pageY - document.documentElement.scrollTop;
      setMouseMove(x, y);
    }

    // Hook up send button
    document.querySelector(".bb-feedback-send-button").onclick = function () {
      screenRecorder.stopScreenRecording();
      // Remove mouse listener.
      document.documentElement.removeEventListener(
        "mousemove",
        mouseMoveEventHandler
      );
      document.documentElement.removeEventListener(
        "touchmove",
        touchMoveEventHandler
      );

      // Restore feedback button style.
      if (feedbackButton) {
        feedbackButton.style.display = feedbackButtonStyle;
      }

      // Show form dialog.
      self.createFeedbackFormDialog(feedbackOptions);
    };

    // Hookup buttons
    const screenRecorder = new ScreenRecorder();

    const colorpicker = document.querySelector(".bb-capture-toolbar-item-colorpicker");
    const selectedColor = document.querySelector(".bb-capture-toolbar-item-selectedcolor");
    var colorItems = document.querySelectorAll(".bb-capture-toolbar-item-color");
    for (var i = 0; i < colorItems.length; i++) {
      const colorItem = colorItems[i];
      colorItem.onclick = function () {
        if (colorItem) {
          screenDrawer.setColor(colorItem.style.backgroundColor);
          colorpicker.style.display = "none";
          selectedColor.style.backgroundColor = colorItem.style.backgroundColor;
        }
      }
    }

    var toolbarItems = document.querySelectorAll(".bb-capture-toolbar-item");
    for (var i = 0; i < toolbarItems.length; i++) {
      const toolbarItem = toolbarItems[i];
      toolbarItem.onclick = function () {
        const type = toolbarItem.getAttribute("data-type");

        var active = false;
        if (toolbarItem.getAttribute("data-active")) {
          toolbarItem.removeAttribute("data-active");
          active = false;
        } else {
          toolbarItem.setAttribute("data-active", "true");
          active = true;
        }

        if (type === "pen" || type === "rect") {
          const toolbarTools = document.querySelectorAll(
            ".bb-capture-toolbar-item-tool"
          );
          for (let j = 0; j < toolbarTools.length; j++) {
            toolbarTools[j].classList.remove("bb-capture-toolbar-item--active");
          }
          toolbarItem.classList.add("bb-capture-toolbar-item--active");
          screenDrawer.setTool(type);
        }
        if (type === "colorpicker") {
          if (colorpicker.style.display === "none") {
            colorpicker.style.display = "flex";
          } else {
            colorpicker.style.display = "none";
          }
        }
        if (type === "mic") {
          screenRecorder.toggleAudio();
          if (active) {
            toolbarItem.classList.remove(
              "bb-capture-toolbar-item--inactivecross"
            );
          } else {
            toolbarItem.classList.add("bb-capture-toolbar-item--inactivecross");
          }
        }
        if (type === "recording") {
          if (active) {
            screenRecorder.stopScreenRecording();
          } else {
            screenRecorder.startScreenRecording();
          }
        }
      };
    }

    document.documentElement.addEventListener(
      "mousemove",
      mouseMoveEventHandler
    );
    document.documentElement.addEventListener(
      "touchmove",
      touchMoveEventHandler
    );
  }

  goBackToMainMenu() {
    if (this.feedbackTypeActions.length > 0) {
      // Go back to menu
      this.closeGleap(false);
      Gleap.startFeedbackTypeSelection(true);
    } else {
      // Close
      this.closeGleap();
    }
  }

  showMobileScreenshotEditor(feedbackOptions) {
    const self = this;
    createScreenshotEditor(
      this.screenshot,
      function (screenshot) {
        // Update screenshot.
        self.screenshot = screenshot;
        self.closeModalUI();
        self.createFeedbackFormDialog(feedbackOptions);
      },
      function () {
        self.goBackToMainMenu();
      },
      this.overrideLanguage,
      this.feedbackTypeActions.length > 0
    );
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

export default Gleap;
