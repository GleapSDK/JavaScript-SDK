import { startScreenCapture } from "./ScreenCapture";
import { translateText } from "./Translation";
import {
  createFeedbackTypeDialog,
  createWidgetDialog,
  loadIcon,
  injectColorCSS,
  setLoadingIndicatorProgress,
  toggleLoading,
  validatePoweredBy,
} from "./UI";
import GleapNetworkIntercepter from "./NetworkInterception";
import ReplayRecorder from "./ReplayRecorder";
import { isMobile } from "./ImageHelper";
import {
  buildForm,
  getFormData,
  hookForm,
  rememberForm,
  validateForm,
} from "./FeedbackForm";
import { startRageClickDetector } from "./UXDetectors";
import { createScreenshotEditor } from "./DrawingCanvas";
import Session from "./Session";

if (HTMLCanvasElement && HTMLCanvasElement.prototype) {
  HTMLCanvasElement.prototype.__originalGetContext =
    HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, options) {
    return this.__originalGetContext(type, {
      ...options,
      preserveDrawingBuffer: true,
    });
  };
}

const gleapDataParser = function (data) {
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
  widgetCallback = null;
  overrideLanguage = "";
  screenshot = null;
  privacyPolicyEnabled = false;
  privacyPolicyUrl = "https://www.gleap.io/privacy-policy/";
  actionLog = [];
  logArray = [];
  eventArray = [];
  customData = {};
  formData = {};
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
  previousBodyOverflow;
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
    this.init();
  }

  /**
   * Sets a custom UI container.
   */
  static setUIContainer(container) {
    const instance = this.getInstance();
    instance.uiContainer = container;
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
      if (
        document.readyState === "complete" ||
        document.readyState === "loaded" ||
        document.readyState === "interactive"
      ) {
        instance.checkForInitType();
      } else {
        document.addEventListener("DOMContentLoaded", function (event) {
          instance.checkForInitType();
        });
      }
      if (instance.widgetCallback) {
        instance.widgetCallback("sessionReady");
      }
    });
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
    this.getInstance().logEvent(name, data);
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
   * Set welcome icon
   * @param {string} welcomeIcon
   */
  static setWelcomeIcon(welcomeIcon) {
    this.getInstance().welcomeIcon = welcomeIcon;
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
  static enableIntercomCompatibilityMode() {
    this.getInstance().enableIntercomCompatibilityMode();
  }

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
  static enablePrivacyPolicy(enabled) {
    this.getInstance().privacyPolicyEnabled = enabled;
  }

  /**
   * Sets the privacy policy url.
   * @param {string} privacyPolicyUrl
   */
  static setPrivacyPolicyUrl(privacyPolicyUrl) {
    this.getInstance().privacyPolicyUrl = privacyPolicyUrl;
  }

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
   * Set a custom api url to send bug reports to.
   * @param {string} apiUrl
   */
  static setApiUrl(apiUrl) {
    Session.getInstance().apiUrl = apiUrl;
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
        Gleap.sendSilentBugReport("Rage click detected.");
      } else {
        Gleap.startFeedbackFlow("crash");
      }
    });
  }

  /**
   * Sets a custom color scheme.
   * @param {string} color
   */
  static setColors(primaryColor, headerColor, buttonColor) {
    this.getInstance().mainColor = primaryColor;

    if (!headerColor) {
      headerColor = primaryColor;
    }
    if (!buttonColor) {
      buttonColor = primaryColor;
    }

    if (
      document.readyState === "complete" ||
      document.readyState === "loaded" ||
      document.readyState === "interactive"
    ) {
      injectColorCSS(primaryColor, headerColor, buttonColor);
    } else {
      document.addEventListener("DOMContentLoaded", function (event) {
        injectColorCSS(primaryColor, headerColor, buttonColor);
      });
    }
  }

  /**
   * Reports a bug silently
   * @param {*} description
   */
  static sendSilentBugReport(description, priority = Gleap.PRIORITY_MEDIUM) {
    const instance = this.getInstance();
    const sessionInstance = Session.getInstance();

    if (!sessionInstance.ready) {
      return;
    }

    instance.formData = {};
    if (sessionInstance.session.email) {
      instance.formData.reportedBy = sessionInstance.session.email;
    }
    if (description) {
      instance.formData.description = description;
    }

    instance.severity = priority;
    instance.feedbackType = "BUG";

    this.startFeedbackFlow(null, true);
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
        sessionInstance.session.name ? sessionInstance.session.name : ""
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

    var feedbackOptions = null;

    // Try to load the specific feedback flow.
    if (feedbackFlow) {
      feedbackOptions = instance.feedbackActions[feedbackFlow];
    }

    // Fallback
    if (!feedbackOptions) {
      feedbackOptions = instance.feedbackActions.bugreporting;
    }

    // Deep copy to prevent changes.
    feedbackOptions = JSON.parse(JSON.stringify(feedbackOptions));

    instance.notifyEvent("flow-started", feedbackOptions);

    instance.closeModalUI();
    instance.currentlySendingBug = true;
    instance.silentBugReport = silentBugReport;
    if (!silentBugReport) {
      instance.widgetOpened = true;
    }

    if (feedbackOptions.form && feedbackOptions.form.length > 0) {
      // Search for email field
      if (sessionInstance.session.email) {
        for (var i = 0; i < feedbackOptions.form.length; i++) {
          var feedbackOption = feedbackOptions.form[i];
          if (feedbackOption.name === "reportedBy") {
            feedbackOption.defaultValue = sessionInstance.session.email;
          }
        }
      }

      // Inject privacy policy.
      if (instance.privacyPolicyEnabled) {
        var policyItem = {
          name: "privacyPolicy",
          type: "privacypolicy",
          required: true,
          url: instance.privacyPolicyUrl,
        };
        const showAfter =
          feedbackOptions.form[feedbackOptions.form.length - 1].showAfter;
        if (showAfter) {
          policyItem.showAfter = showAfter;
        }
        feedbackOptions.form.splice(
          feedbackOptions.form.length - 1,
          0,
          policyItem
        );
      }
    }

    instance.stopBugReportingAnalytics();

    if (!instance.silentBugReport && !feedbackOptions.disableUserScreenshot) {
      instance.disableScroll();
    }

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

  enableIntercomCompatibilityMode(retries = 0) {
    if (window.Intercom) {
      Intercom("onShow", function () {
        Gleap.showFeedbackButton(false);
      });
      Intercom("onHide", function () {
        Gleap.showFeedbackButton(true);
      });
      Intercom("hide");
      Intercom("update", {
        hide_default_launcher: true,
      });
    } else {
      if (retries > 10) {
        return;
      } else {
        setTimeout(() => {
          this.enableIntercomCompatibilityMode(++retries);
        }, 1000);
      }
    }
  }

  logEvent(name, data) {
    var log = {
      name,
      date: new Date(),
    };
    if (data) {
      log.data = gleapDataParser(data);
    }
    this.eventArray.push(log);

    if (this.eventArray.length > this.logMaxLength) {
      this.eventArray.shift();
    }
  }

  stopBugReportingAnalytics() {
    this.networkIntercepter.setStopped(true);
    if (this.replay && !this.replay.stopped) {
      this.replay.stop(!this.isLiveSite);
    }
  }

  checkOnlineStatus(url) {
    return new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest();
      xhr.onreadystatechange = function () {
        if (xhr.readyState === XMLHttpRequest.DONE) {
          try {
            const status = JSON.parse(xhr.responseText);
            resolve(status);
          } catch (exp) {
            reject();
          }
        }
      };
      xhr.ontimeout = function () {
        reject();
      };
      xhr.onerror = function () {
        reject();
      };
      xhr.open(
        "GET",
        "https://uptime.gleap.io/?url=" + encodeURIComponent(url),
        true
      );
      xhr.send();
    });
  }

  startCrashDetection() {
    const self = this;
    window.onerror = function (msg, url, lineNo, columnNo, error) {
      var message = [
        "Message: " + msg,
        "URL: " + url,
        "Line: " + lineNo,
        "Column: " + columnNo,
        "Error object: " + JSON.stringify(error),
      ];
      self.addLog(message, "ERROR");

      if (
        self.enabledCrashDetector &&
        !self.appCrashDetected &&
        !self.currentlySendingBug
      ) {
        self.appCrashDetected = true;
        if (self.enabledCrashDetectorSilent) {
          const errorMessage = `Message: ${msg}\nURL: ${url}\nLine: ${lineNo}\nColumn: ${columnNo}\nError object: ${JSON.stringify(
            error
          )}\n`;
          Gleap.sendSilentBugReport(errorMessage);
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

  disableScroll() {
    this.previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }

  enableScroll() {
    if (this.previousBodyOverflow) {
      document.body.style.overflow = this.previousBodyOverflow;
    } else {
      document.body.style.overflow = null;
    }
  }

  buildDescription(feedbackOptions) {
    var description = "";

    if (feedbackOptions.description && feedbackOptions.description.length > 0) {
      description = `<div class="bb-feedback-dialog-infoitem">${translateText(
        feedbackOptions.description,
        this.overrideLanguage
      )}</div>`;
    }

    return description;
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

  createBugReportingDialog(feedbackOptions) {
    const self = this;

    const formData = buildForm(feedbackOptions.form, this.overrideLanguage);
    const title = translateText(feedbackOptions.title, this.overrideLanguage);
    const description = this.buildDescription(feedbackOptions);
    const htmlContent = `<div class="bb-feedback-dialog-error">${translateText(
      "Something went wrong, please try again.",
      self.overrideLanguage
    )}</div><div class="bb-feedback-dialog-loading">
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
  ${description}
  <div class="bb-feedback-form">
    ${formData.formHTML}
  </div>`;

    const getWidgetDialogClass = () => {
      if (this.appCrashDetected || this.rageClickDetected) {
        return "bb-feedback-dialog--crashed";
      }
      return "";
    };

    createWidgetDialog(
      title,
      null,
      this.customLogoUrl,
      htmlContent,
      function () {
        if (self.feedbackTypeActions.length > 0) {
          // Only go back to feedback menu options

          self.closeGleap(false);
          Gleap.startFeedbackTypeSelection(true);
        } else {
          // Close
          self.closeGleap();
        }
      },
      this.openedMenu,
      `bb-anim-fadeinright ${getWidgetDialogClass()} bb-feedback-dialog-form`
    );

    this.openedMenu = true;
    this.resetLoading(true);
    validatePoweredBy(this.poweredByHidden);
    hookForm(feedbackOptions.form);

    const sendButton = document.querySelector(".bb-feedback-send-button");
    sendButton.onclick = function () {
      self.formSubmitAction(feedbackOptions);
    };
  }

  formSubmitAction(feedbackOptions) {
    const self = this;

    // Validate form
    if (!validateForm(feedbackOptions.form)) {
      return;
    }

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
    self.feedbackType = feedbackOptions.feedbackType
      ? feedbackOptions.feedbackType
      : "BUG";

    if (self.widgetOnly && self.widgetCallback) {
      self.widgetCallback("sendFeedback", {
        type: self.feedbackType,
        formData: self.formData,
        screenshot: self.screenshot,
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
    return startScreenCapture(this.snapshotPosition, this.isLiveSite)
      .then((data) => {
        this.sendBugReportToServer(data);
      })
      .catch((err) => {
        this.showError();
      });
  }

  reportCleanupOnClose() {
    try {
      Gleap.enableReplays(this.replaysEnabled);
    } catch (exp) {}
    try {
      this.networkIntercepter.setStopped(false);
    } catch (exp) {}

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
    const editorContainer = document.querySelector(".bb-screenshot-editor");
    if (editorContainer) {
      editorContainer.remove();
    }

    this.notifyEvent("close");
    this.closeModalUI(cleanUp);
    this.enableScroll();
  }

  init() {
    const self = this;

    this.overwriteConsoleLog();
    this.startCrashDetection();
    this.registerKeyboardListener();
    this.registerEscapeListener();

    if (window && window.location && window.location.origin) {
      this.checkOnlineStatus(window.location.origin)
        .then(function (status) {
          if (status && status.up) {
            self.isLiveSite = true;
          } else {
            self.isLiveSite = false;
          }
        })
        .catch(function () {
          self.isLiveSite = false;
        });
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

      if (self.feedbackTypeActions.length > 0) {
        Gleap.startFeedbackTypeSelection();
      } else {
        Gleap.startFeedbackFlow();
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

    const title = translateText(self.widgetInfo.title, self.overrideLanguage);
    const subtitle = translateText(
      self.widgetInfo.subtitle,
      self.overrideLanguage
    );

    var buttonIcon = "";
    if (self.customButtonLogoUrl) {
      buttonIcon = `<img class="bb-logo-logo" src="${self.customButtonLogoUrl}" alt="Feedback Button" />`;
    } else {
      buttonIcon = loadIcon("bblogo", "#192027");
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
        "#192027"
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
    const infoItem = document.querySelector(".bb-feedback-dialog-infoitem");
    const loader = document.querySelector(".bb-feedback-dialog-loading");
    form.style.display = "none";
    loader.style.display = "none";
    success.style.display = "flex";
    if (infoItem) {
      infoItem.style.display = "none";
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
      customEventLog: this.eventArray,
      type: this.feedbackType,
      formData: this.formData,
      isSilent: this.silentBugReport,
    };

    if (screenshotData.fileUrl) {
      bugReportData["screenshotUrl"] = screenshotData.fileUrl;
    }

    if (screenshotData.html) {
      bugReportData["screenshotData"] = screenshotData;
    }

    if (this.replay && this.replay.result) {
      bugReportData["webReplay"] = this.replay.result;
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
      this.createBugReportingDialog(feedbackOptions);
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
    var bugReportingEditor = document.createElement("div");
    bugReportingEditor.className = "bb-screenshot-editor";
    bugReportingEditor.innerHTML = `
      <div class="bb-screenshot-editor-container">
        <div class='bb-screenshot-editor-container-inner'>
          <svg class="bb-screenshot-editor-svg" width="100%" height="100%">
            <defs>
              <mask id="bbmask">
                <rect width="100%" height="100%" fill="white"/>
                <rect id="bb-markercut" x="0" y="0" width="0" height="0" />
              </mask>
            </defs>
            <rect width="100%" height="100%" style="fill:rgba(0,0,0,0.2);" mask="url(#bbmask)" />
          </svg>
          <div class='bb-screenshot-editor-borderlayer'></div>
          <div class='bb-screenshot-editor-dot'></div>
          <div class='bb-screenshot-editor-rectangle'></div>
          <div class='bb-screenshot-editor-drag-info'>${translateText(
            "Click and drag to mark the bug",
            self.overrideLanguage
          )}</div>
        </div>
      </div>
    `;
    Gleap.appendNode(bugReportingEditor);

    const editorBorderLayer = document.querySelector(
      ".bb-screenshot-editor-borderlayer"
    );
    const editorDot = window.document.querySelector(
      ".bb-screenshot-editor-dot"
    );
    const editorRectangle = window.document.querySelector(
      ".bb-screenshot-editor-rectangle"
    );
    const editorSVG = window.document.querySelector(
      ".bb-screenshot-editor-svg"
    );
    const rectangleMarker = window.document.getElementById("bb-markercut");

    editorBorderLayer.style.height = `${window.innerHeight}px`;
    var addedMarker = false;
    var clickStartX = -1;
    var clickStartY = -1;

    function setStartPoint(x, y) {
      if (addedMarker) {
        return;
      }

      editorDot.style.left = x + 3 - editorDot.offsetWidth / 2 + "px";
      editorDot.style.top = y + 3 - editorDot.offsetHeight / 2 + "px";
    }

    function setMouseMove(x, y) {
      const dragInfo = document.querySelector(
        ".bb-screenshot-editor-drag-info"
      );
      dragInfo.style.left = `${x + 20}px`;
      dragInfo.style.top = `${y - dragInfo.offsetHeight / 2}px`;
      dragInfo.style.right = null;
      dragInfo.classList.add("bb-screenshot-editor-drag-info--dragged");

      if (addedMarker || clickStartX < 0) {
        return;
      }

      const width = x - clickStartX;
      const height = y - clickStartY;

      var left = width < 0 ? clickStartX + width : clickStartX;
      var top = height < 0 ? clickStartY + height : clickStartY;
      var heightAbs = height < 0 ? height * -1 : height;
      var widthAbs = width < 0 ? width * -1 : width;

      editorRectangle.style.left = `${left}px`;
      editorRectangle.style.top = `${top}px`;
      editorRectangle.style.width = `${widthAbs}px`;
      editorRectangle.style.height = `${heightAbs}px`;
      rectangleMarker.setAttribute("x", left);
      rectangleMarker.setAttribute("y", top);
      rectangleMarker.setAttribute("width", `${widthAbs}`);
      rectangleMarker.setAttribute("height", `${heightAbs}`);
    }

    function mouseDownEventHandler(e) {
      clickStartX = e.pageX - document.documentElement.scrollLeft;
      clickStartY = e.pageY - document.documentElement.scrollTop;
      setStartPoint(clickStartX, clickStartY);
    }

    function touchstartEventHandler(e) {
      clickStartX = e.touches[0].pageX - document.documentElement.scrollLeft;
      clickStartY = e.touches[0].pageY - document.documentElement.scrollTop;
      setStartPoint(clickStartX, clickStartY);
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
      e.preventDefault();
    }

    function mouseUpEventHandler(e) {
      const dragInfo = document.querySelector(
        ".bb-screenshot-editor-drag-info"
      );
      dragInfo.style.display = "none";

      editorRectangle.style.top = `${
        editorRectangle.offsetTop + document.documentElement.scrollTop
      }px`;
      editorRectangle.style.left = `${
        editorRectangle.offsetLeft + document.documentElement.scrollLeft
      }px`;
      editorDot.style.top = `${
        editorDot.offsetTop + document.documentElement.scrollTop
      }px`;
      editorDot.style.left = `${
        editorDot.offsetLeft + document.documentElement.scrollLeft
      }px`;
      editorSVG.style.top = `${
        editorSVG.offsetTop + document.documentElement.scrollTop
      }px`;
      editorSVG.style.left = `${
        editorSVG.offsetLeft + document.documentElement.scrollLeft
      }px`;

      editorDot.parentNode.removeChild(editorDot);
      editorRectangle.parentNode.removeChild(editorRectangle);

      Gleap.appendNode(editorDot);
      Gleap.appendNode(editorRectangle);

      bugReportingEditor.classList.add("bb-screenshot-editor--marked");
      addedMarker = true;

      bugReportingEditor.removeEventListener("mouseup", mouseUpEventHandler);
      bugReportingEditor.removeEventListener(
        "mousemove",
        mouseMoveEventHandler
      );
      bugReportingEditor.removeEventListener(
        "mousedown",
        mouseDownEventHandler
      );
      bugReportingEditor.removeEventListener(
        "touchstart",
        touchstartEventHandler
      );
      bugReportingEditor.removeEventListener(
        "touchmove",
        touchMoveEventHandler
      );
      bugReportingEditor.removeEventListener("touchend", mouseUpEventHandler);

      self.createBugReportingDialog(feedbackOptions);
    }

    bugReportingEditor.addEventListener("mouseup", mouseUpEventHandler);
    bugReportingEditor.addEventListener("mousemove", mouseMoveEventHandler);
    bugReportingEditor.addEventListener("mousedown", mouseDownEventHandler);
    bugReportingEditor.addEventListener("touchstart", touchstartEventHandler);
    bugReportingEditor.addEventListener("touchmove", touchMoveEventHandler);
    bugReportingEditor.addEventListener("touchend", mouseUpEventHandler);
  }

  showMobileScreenshotEditor(feedbackOptions) {
    const self = this;
    createScreenshotEditor(
      this.screenshot,
      function (screenshot) {
        // Update screenshot.
        self.screenshot = screenshot;
        self.closeModalUI();
        self.createBugReportingDialog(feedbackOptions);
      },
      function () {
        if (self.feedbackTypeActions.length > 0) {
          // Go back to menu
          self.closeGleap(false);
          Gleap.startFeedbackTypeSelection(true);
        } else {
          // Close
          self.closeGleap();
        }
      },
      this.overrideLanguage,
      this.feedbackTypeActions.length > 0
    );
  }
}

export default Gleap;
