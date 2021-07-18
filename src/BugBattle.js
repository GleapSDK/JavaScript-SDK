import { startScreenCapture } from "./ScreenCapture";
import { translateText } from "./Translation";
import {
  createFeedbackTypeDialog,
  createWidgetDialog,
  loadIcon,
  setColor,
  setLoadingIndicatorProgress,
  toggleLoading,
  validatePoweredBy,
} from "./UI";
import BugBattleNetworkIntercepter from "./NetworkInterception";
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

class BugBattle {
  apiUrl = "https://api.bugbattle.io";
  sdkKey = null;
  widgetOnly = false;
  widgetCallback = null;
  activation = "";
  overrideLanguage = "";
  overrideButtonText = undefined;
  screenshot = null;
  actionLog = [];
  logArray = [];
  eventArray = [];
  customData = {};
  formData = {};
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
  email = null;
  originalConsoleLog;
  severity = "LOW";
  appVersionCode = "";
  appBuildNumber = "";
  mainColor = "#398CFE";
  feedbackTypeActions = [];
  previousBodyOverflow;
  customTranslation = {};
  networkIntercepter = new BugBattleNetworkIntercepter();
  replay = null;
  feedbackButton = null;
  fakeLoading = null;
  fakeLoadingProgress = 0;
  widgetOpened = false;
  openedMenu = false;
  snapshotPosition = {
    x: 0,
    y: 0,
  };

  // Activation methods
  static FEEDBACK_BUTTON = "FEEDBACK_BUTTON";
  static NONE = "NONE";
  static FLOW_CRASH = {
    title: "Problems detected",
    description:
      "We detected problems with our webapp. It would be amazing if you help us fix the problems by submitting this form.",
    form: [
      {
        placeholder: "Your e-mail",
        type: "text",
        inputtype: "email",
        name: "reportedBy",
        required: true,
        remember: true,
        hideOnDefaultSet: true,
      },
      {
        title: "What went wrong?",
        placeholder: "Optional",
        type: "textarea",
        name: "description",
      },
      {
        title: "Report issue",
        type: "submit",
        name: "send",
      },
    ],
    feedbackType: "BUG",
    disableUserScreenshot: true,
  };
  static FLOW_DEFAULT = {
    title: "Report an issue",
    description:
      "Your feedback means a lot to us. Use our marker tools to add more details to your screenshot.",
    form: [
      {
        placeholder: "Your e-mail",
        type: "text",
        inputtype: "email",
        name: "reportedBy",
        required: true,
        remember: true,
        hideOnDefaultSet: true,
      },
      {
        title: "What went wrong?",
        placeholder: "Optional",
        type: "textarea",
        name: "description",
      },
      {
        title: "Send feedback",
        type: "submit",
        name: "send",
      },
    ],
  };
  static FLOW_RATING = {
    title: "Rate your experience",
    form: [
      {
        type: "rating",
        ratingtype: "emoji",
        name: "pagerating",
        required: true,
      },
      {
        title: "Email",
        placeholder: "Your e-mail",
        type: "text",
        inputtype: "email",
        name: "reportedBy",
        required: true,
        remember: true,
        hideOnDefaultSet: true,
        showAfter: "pagerating",
      },
      {
        title: "How can we improve?",
        placeholder: "Optional",
        type: "textarea",
        name: "description",
        showAfter: "pagerating",
      },
      {
        title: "Send feedback",
        type: "submit",
        name: "send",
        showAfter: "pagerating",
      },
    ],
    feedbackType: "RATING",
    disableUserScreenshot: true,
  };
  static FLOW_FEATUREREQUEST = {
    title: "Request a feature",
    description: "What feature or improvement would you like to see?",
    form: [
      {
        placeholder: "Your e-mail",
        type: "text",
        inputtype: "email",
        name: "reportedBy",
        hideOnDefaultSet: true,
        required: true,
        remember: true,
      },
      {
        placeholder: "Title",
        title: "Title",
        type: "text",
        inputtype: "text",
        name: "title",
        required: true,
      },
      {
        title: "Description",
        placeholder: "Optional",
        type: "textarea",
        name: "description",
      },
      {
        title: "Send feedback",
        type: "submit",
        name: "send",
      },
    ],
    feedbackType: "FEATURE_REQUEST",
    disableUserScreenshot: true,
  };

  // Bug priorities
  static PRIORITY_LOW = "LOW";
  static PRIORITY_MEDIUM = "MEDIUM";
  static PRIORITY_HIGH = "HIGH";

  // BugBattle singleton
  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new BugBattle();
      return this.instance;
    } else {
      return this.instance;
    }
  }

  /**
   * Initializes the SDK
   * @param {*} sdkKey
   * @param {*} activation
   */
  static initialize(sdkKey, activation) {
    const instance = this.getInstance();

    if (instance.initialized) {
      console.warn("Bugbattle already initialized.");
      return;
    }

    instance.initialized = true;
    instance.sdkKey = sdkKey;
    instance.activation = activation;

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
  }

  /**
   * Main constructor
   */
  constructor() {
    this.init();
  }

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
   * Set widget only
   * @param {boolean} widgetOnly
   */
  static isWidgetOnly(widgetOnly) {
    this.getInstance().widgetOnly = widgetOnly;
  }

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
   * Hides the powered by bugbattle logo.
   * @param {boolean} hide
   */
  static enablePoweredByBugbattle(enabled) {
    this.getInstance().poweredByHidden = !enabled;
  }

  /**
   * Overrides the feedback button text.
   * @param {string} overrideButtonText
   */
  static setFeedbackButtonText(overrideButtonText) {
    this.getInstance().overrideButtonText = overrideButtonText;
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
   * @deprecated Since v5.0 of the widget
   * Enables the privacy policy.
   * @param {boolean} enabled
   */
  static enablePrivacyPolicy(enabled) {}

  /**
   * @deprecated Since v5.0 of the widget
   * Sets the privacy policy url.
   * @param {string} privacyPolicyUrl
   */
  static setPrivacyPolicyUrl(privacyPolicyUrl) {}

  /**
   * Sets the customers email.
   * @param {string} email
   */
  static setCustomerEmail(email) {
    this.getInstance().email = email;
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
    this.getInstance().apiUrl = apiUrl;
  }

  /**
   * Set custom data that will be attached to the bug-report.
   * @param {*} data
   */
  static attachCustomData(data) {
    const instance = this.getInstance();
    instance.customData = Object.assign(instance.customData, data);
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
        BugBattle.sendSilentBugReport(null, "Rage click detected.");
      } else {
        BugBattle.startBugReporting(BugBattle.FLOW_CRASH);
      }
    });
  }

  /**
   * Sets a custom color (HEX-String i.e. #086EFB) as new main color scheme.
   * @param {string} color
   */
  static setMainColor(color) {
    this.getInstance().mainColor = color;

    if (
      document.readyState === "complete" ||
      document.readyState === "loaded" ||
      document.readyState === "interactive"
    ) {
      setColor(color);
    } else {
      document.addEventListener("DOMContentLoaded", function (event) {
        setColor(color);
      });
    }
  }

  /**
   * Reports a bug silently
   * @param {*} senderEmail
   * @param {*} description
   */
  static sendSilentBugReport(
    senderEmail,
    description,
    priority = BugBattle.PRIORITY_MEDIUM
  ) {
    const instance = this.getInstance();

    instance.formData = {};
    if (senderEmail) {
      instance.formData.reportedBy = senderEmail;
    }
    if (description) {
      instance.formData.description = description;
    }

    instance.severity = priority;
    instance.feedbackType = "BUG";

    this.startBugReporting({}, true);
  }

  /**
   * Starts the feedback type selection flow.
   */
  static startFeedbackTypeSelection() {
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
      function () {
        if (instance.widgetOnly && instance.widgetCallback) {
          instance.widgetCallback("selectedMenuOption", {});
        }
      }
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

    if (instance.widgetOnly && instance.widgetCallback) {
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
   * Adds a feedback type option.
   */
  static setFeedbackTypeOptions(feedbackTypeOptions) {
    this.getInstance().feedbackTypeActions = feedbackTypeOptions;
  }

  logEvent(name, data) {
    if (this.eventArray.length > 1000) {
      this.eventArray.shift();
    }

    let log = {
      name,
      date: new Date(),
    };
    if (data) {
      log.data = data;
    }
    this.eventArray.push(log);
  }

  stopBugReportingAnalytics() {
    this.networkIntercepter.setStopped(true);
    if (this.replay && !this.replay.stopped) {
      this.replay.stop(!this.isLiveSite);
    }
  }

  /**
   * Starts the bug reporting flow.
   */
  static startBugReporting(
    feedbackOptions = this.FLOW_DEFAULT,
    silentBugReport = false
  ) {
    const instance = this.getInstance();
    if (instance.currentlySendingBug) {
      return;
    }

    instance.closeModalUI();
    instance.currentlySendingBug = true;
    instance.silentBugReport = silentBugReport;
    if (!silentBugReport) {
      instance.widgetOpened = true;
    }

    if (
      instance.email &&
      feedbackOptions.form &&
      feedbackOptions.form.length > 0
    ) {
      // Search for email field
      for (var i = 0; i < feedbackOptions.form.length; i++) {
        var feedbackOption = feedbackOptions.form[i];
        if (feedbackOption.name === "reportedBy") {
          feedbackOption.defaultValue = instance.email;
        }
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
      instance.checkReplayLoaded();
    } else {
      instance.showBugReportEditor(feedbackOptions);
    }

    instance.updateFeedbackButtonState();
  }

  checkOnlineStatus(url) {
    return new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest();
      xhr.onreadystatechange = function () {
        if (xhr.readyState === XMLHttpRequest.DONE) {
          const status = JSON.parse(xhr.responseText);
          resolve(status);
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
        "https://uptime.bugbattle.io/?url=" + encodeURIComponent(url),
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
          BugBattle.sendSilentBugReport(null, errorMessage);
        } else {
          BugBattle.startBugReporting(BugBattle.FLOW_CRASH);
        }
      }

      return false;
    };
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
      log,
      date: new Date(),
      priority,
    });
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
      description = `<div class="bugbattle-feedback-dialog-infoitem">${translateText(
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
    const htmlContent = `<div class="bugbattle-feedback-dialog-loading">
    <svg
      class="bugbattle--progress-ring"
      width="120"
      height="120">
      <circle
        class="bugbattle--progress-ring__circle"
        stroke="${this.mainColor}"
        stroke-width="6"
        fill="transparent"
        r="34"
        cx="60"
        cy="60"/>
    </svg>
  </div>
  <div class="bugbattle-feedback-dialog-success">
    <svg width="120px" height="92px" viewBox="0 0 120 92" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
            <g id="np_check_1807541" fill="${
              this.mainColor
            }" fill-rule="nonzero">
                <path d="M107.553103,1.03448276 L101.669379,6.85344828 C81.2141379,27.3490345 62.5845517,47.5706897 42.7038621,67.7596552 L17.5535172,47.6517931 L11.088,42.4793793 L0.743172414,55.4104138 L38.2431724,85.4104138 L44.0621379,90.0010345 L49.2991034,84.764069 C71.5404828,62.4751034 91.5349655,40.4985517 113.437034,18.5571724 L119.256,12.6734483 L107.553103,1.03448276 Z" id="Path"></path>
            </g>
        </g>
    </svg>
    <div class="bugbattle-feedback-dialog-info-text">${translateText(
      "Thank you for your feedback!",
      this.overrideLanguage
    )}</div>
  </div>
  ${description}
  <div class="bugbattle-feedback-form">
    ${formData.formHTML}
  </div>`;

    const getWidgetDialogClass = () => {
      if (this.appCrashDetected || this.rageClickDetected) {
        return "bugbattle-feedback-dialog--crashed";
      }
      return "";
    };

    createWidgetDialog(
      title,
      null,
      this.customLogoUrl,
      htmlContent,
      function () {
        self.closeBugBattle();
        if (self.feedbackTypeActions.length > 0) {
          BugBattle.startFeedbackTypeSelection();
        }
      },
      this.openedMenu,
      getWidgetDialogClass()
    );

    this.openedMenu = true;
    this.resetLoading(true);
    validatePoweredBy(this.poweredByHidden);
    hookForm(feedbackOptions.form);

    const sendButton = document.querySelector(
      ".bugbattle-feedback-send-button"
    );
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

    // Check API key
    if (!self.sdkKey) {
      return alert(translateText("Wrong API key", self.overrideLanguage));
    }

    window.scrollTo(self.snapshotPosition.x, self.snapshotPosition.y);
    toggleLoading(true);

    // Start fake loading
    self.fakeLoading = setInterval(function () {
      if (self.fakeLoadingProgress > 50) {
        self.resetLoading(false);
        return;
      }
      self.fakeLoadingProgress += 2;
      setLoadingIndicatorProgress(self.fakeLoadingProgress);
    }, 200);

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

  reportCleanup() {
    try {
      BugBattle.enableReplays(this.replaysEnabled);
    } catch (exp) {}
    try {
      this.networkIntercepter.setStopped(false);
    } catch (exp) {}
    this.currentlySendingBug = false;
    this.widgetOpened = false;
    this.openedMenu = false;
    this.appCrashDetected = false;
    this.rageClickDetected = false;
    this.updateFeedbackButtonState();
  }

  closeModalUI() {
    const dialogContainer = document.querySelector(
      ".bugbattle-feedback-dialog-container"
    );
    if (dialogContainer) {
      dialogContainer.remove();
    }
  }

  closeBugBattle() {
    this.reportCleanup();

    // Remove editor.
    const editorContainer = document.querySelector(
      ".bugbattle-screenshot-editor"
    );
    if (editorContainer) {
      editorContainer.remove();
    }

    this.closeModalUI();
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
        BugBattle.startBugReporting();
      }
    };
  }

  checkForInitType() {
    setInterval(() => {
      if (this.replay && this.replay.isFull()) {
        BugBattle.enableReplays(this.replaysEnabled);
      }
    }, 1000);

    if (!this.widgetOnly) {
      this.injectFeedbackButton();
    }

    if (this.widgetOnly) {
      const self = this;

      if (self.feedbackTypeActions.length > 0) {
        BugBattle.startFeedbackTypeSelection();
      } else {
        BugBattle.startBugReporting();
      }
    }
  }

  injectFeedbackButton() {
    const self = this;

    var feedbackButtonText = translateText("Feedback", self.overrideLanguage);
    if (this.overrideButtonText) {
      feedbackButtonText = this.overrideButtonText;
    }

    var elem = document.createElement("div");
    elem.className = "bugbattle-feedback-button";
    elem.innerHTML = `<div class="bugbattle-feedback-button-text"><div class="bugbattle-feedback-button-text-title">Feedback</div><div class="bugbattle-feedback-button-text-subtitle">Your feedback matters</div></div><div class="bugbattle-feedback-button-icon">${loadIcon(
      "bblogo",
      "#fff"
    )}${loadIcon("arrowdown", "#fff")}</div>`;

    elem.onclick = function () {
      self.feedbackButtonPressed();
    };
    document.body.appendChild(elem);

    if (this.activation !== BugBattle.FEEDBACK_BUTTON) {
      elem.classList.add("bugbattle-feedback-button--disabled");
    }

    this.feedbackButton = elem;
  }

  feedbackButtonPressed() {
    if (this.widgetOpened) {
      this.closeBugBattle();
      return;
    }

    if (this.feedbackTypeActions.length > 0) {
      BugBattle.startFeedbackTypeSelection();
    } else {
      BugBattle.startBugReporting();
    }
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

    const sendingClass = "bugbattle-feedback-button--sending";
    if (this.widgetOpened) {
      this.feedbackButton.classList.add(sendingClass);
    } else {
      this.feedbackButton.classList.remove(sendingClass);
    }

    const crashedClass = "bugbattle-feedback-button--crashed";
    if (this.appCrashDetected || this.rageClickDetected) {
      this.feedbackButton.classList.add(crashedClass);
    } else {
      this.feedbackButton.classList.remove(crashedClass);
    }

    const dialogContainer = document.querySelector(
      ".bugbattle-feedback-dialog-container"
    );
    const containerFocusClass = "bugbattle-feedback-dialog-container--focused";
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
        self.closeBugBattle();
      }
    });
  }

  showSuccessMessage() {
    const success = document.querySelector(
      ".bugbattle-feedback-dialog-success"
    );
    const form = document.querySelector(".bugbattle-feedback-form");
    const infoItem = document.querySelector(
      ".bugbattle-feedback-dialog-infoitem"
    );
    const loader = document.querySelector(".bugbattle-feedback-dialog-loading");
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
    http.open("POST", this.apiUrl + "/bugs");
    http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    http.setRequestHeader("Api-Token", this.sdkKey);
    http.onerror = (error) => {
      if (self.silentBugReport) {
        self.reportCleanup();
        return;
      }

      self.showError();
    };
    http.upload.onprogress = function (e) {
      if (self.silentBugReport) {
        self.reportCleanup();
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
        self.reportCleanup();
        return;
      }

      if (
        http.readyState === XMLHttpRequest.DONE &&
        (http.status === 200 || http.status === 201)
      ) {
        self.showSuccessMessage();
        setTimeout(function () {
          self.closeBugBattle();
        }, 3000);
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

  showError() {
    if (this.silentBugReport) {
      return;
    }
    toggleLoading(false);
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
    };
  }

  showBugReportEditor(feedbackOptions) {
    // Open next step in dialog.
    this.createBugReportingDialog(feedbackOptions);

    // Stop here if we don't want to show the native screenshot tools
    if (feedbackOptions.disableUserScreenshot) {
      return;
    }

    // Notify for native SDK.
    if (this.widgetOnly && this.widgetCallback) {
      this.widgetCallback("openScreenshotEditor", {
        screenshotEditorIsFirstStep: this.feedbackTypeActions.length === 0,
      });
      return;
    }

    this.showScreenshotEditor(feedbackOptions);
  }

  showScreenshotEditor(feedbackOptions) {
    const self = this;
    var bugReportingEditor = document.createElement("div");
    bugReportingEditor.className = "bugbattle-screenshot-editor";
    bugReportingEditor.innerHTML = `
      <div class="bugbattle-screenshot-editor-container">
        <div class='bugbattle-screenshot-editor-container-inner'>
          <div class='bugbattle-screenshot-editor-borderlayer'></div>
          <div class='bugbattle-screenshot-editor-dot'></div>
          <div class='bugbattle-screenshot-editor-rectangle'></div>
          <div class='bugbattle-screenshot-editor-drag-info'>${translateText(
            "Click or drag to comment",
            self.overrideLanguage
          )}</div>
        </div>
      </div>
    `;
    document.body.appendChild(bugReportingEditor);

    const editorRectangle = document.querySelector(
      ".bugbattle-screenshot-editor-borderlayer"
    );
    if (editorRectangle) {
      editorRectangle.style.height = `${window.innerHeight}px`;
    }

    var addedMarker = false;
    var clickStartX = -1;
    var clickStartY = -1;

    function setStartPoint(x, y) {
      if (addedMarker) {
        return;
      }

      const editorDot = document.querySelector(
        ".bugbattle-screenshot-editor-dot"
      );
      editorDot.style.left = x - editorDot.offsetWidth / 2 + "px";
      editorDot.style.top = y - editorDot.offsetHeight / 2 + "px";
    }

    function setMouseMove(x, y) {
      const dragInfo = document.querySelector(
        ".bugbattle-screenshot-editor-drag-info"
      );
      dragInfo.style.left = `${x + 20}px`;
      dragInfo.style.top = `${y - dragInfo.offsetHeight / 2}px`;
      dragInfo.style.right = null;

      if (addedMarker || clickStartX < 0) {
        return;
      }

      const width = x - clickStartX;
      const height = y - clickStartY;

      const editorRectangle = document.querySelector(
        ".bugbattle-screenshot-editor-rectangle"
      );

      var left = width < 0 ? clickStartX + width : clickStartX;
      var top = height < 0 ? clickStartY + height : clickStartY;
      var heightAbs = height < 0 ? height * -1 : height;
      var widthAbs = width < 0 ? width * -1 : width;

      editorRectangle.style.left = `${left}px`;
      editorRectangle.style.top = `${top}px`;
      editorRectangle.style.width = `${widthAbs}px`;
      editorRectangle.style.height = `${heightAbs}px`;
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

    function mouseUpEventHandler(e) {
      const dragInfo = document.querySelector(
        ".bugbattle-screenshot-editor-drag-info"
      );
      dragInfo.style.display = "none";

      const fixedDot = window.document.querySelector(
        ".bugbattle-screenshot-editor-dot"
      );
      const fixedRectangle = window.document.querySelector(
        ".bugbattle-screenshot-editor-rectangle"
      );

      fixedRectangle.style.top = `${
        fixedRectangle.offsetTop + document.documentElement.scrollTop
      }px`;
      fixedRectangle.style.left = `${
        fixedRectangle.offsetLeft + document.documentElement.scrollLeft
      }px`;

      fixedDot.style.top = `${
        fixedDot.offsetTop + document.documentElement.scrollTop
      }px`;
      fixedDot.style.left = `${
        fixedDot.offsetLeft + document.documentElement.scrollLeft
      }px`;

      fixedDot.parentNode.removeChild(fixedDot);
      fixedRectangle.parentNode.removeChild(fixedRectangle);

      const screenshotEditor = window.document.querySelector(
        ".bugbattle-screenshot-editor"
      );
      screenshotEditor.appendChild(fixedDot);
      screenshotEditor.appendChild(fixedRectangle);

      addedMarker = true;
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

    bugReportingEditor.addEventListener("mouseup", mouseUpEventHandler);
    bugReportingEditor.addEventListener("mousemove", mouseMoveEventHandler);
    bugReportingEditor.addEventListener("mousedown", mouseDownEventHandler);
    bugReportingEditor.addEventListener("touchstart", touchstartEventHandler);
    bugReportingEditor.addEventListener("touchmove", touchMoveEventHandler);
    bugReportingEditor.addEventListener("touchend", mouseUpEventHandler);
  }
}

export default BugBattle;
