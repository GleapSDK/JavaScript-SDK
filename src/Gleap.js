import { startScreenCapture } from "./ScreenCapture";
import { translateText } from "./Translation";
import {
  createWidgetDialog,
  loadIcon,
  injectStyledCSS,
  setLoadingIndicatorProgress,
  toggleLoading,
  validatePoweredBy,
} from "./UI";
import GleapNetworkIntercepter from "./NetworkInterception";
import ReplayRecorder from "./ReplayRecorder";
import { getDOMElementDescription, gleapDataParser } from "./GleapHelper";
import { buildForm, getFormData, hookForm, rememberForm } from "./FeedbackForm";
import { startRageClickDetector } from "./UXDetectors";
import GleapSession from "./GleapSession";
import StreamedEvent from "./StreamedEvent";
import AutoConfig from "./AutoConfig";
import { ScrollStopper } from "./ScrollStopper";
import { isLocalNetwork } from "./NetworkUtils";
import { ScreenRecorder } from "./ScreenRecorder";
import GleapFrameManager from "./GleapFrameManager";
import GleapMetaDataManager from "./GleapMetaDataManager";
import GleapConsoleLogManager from "./GleapConsoleLogManager";
import GleapClickListener from "./GleapClickListener";
import GleapCrashDetector from "./GleapCrashDetector";
import GleapFeedbackButtonManager from "./GleapFeedbackButtonManager";

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
  widgetOnly = false;
  widgetStartFlow = undefined;
  overrideLanguage = "";
  autostartDrawing = false;
  actionLog = [];
  customData = {};
  formData = {};
  excludeData = {};
  feedbackType = "BUG";
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
  shortcutsEnabled = true;
  silentBugReport = false;
  initialized = false;
  screenshotFeedbackOptions = null;
  customerInfo = {};
  showUserName = true;
  welcomeIcon = "👋";
  severity = "LOW";
  mainColor = "#485bff";
  feedbackTypeActions = [];
  customTranslation = {};
  networkIntercepter = new GleapNetworkIntercepter();
  replay = null;
  escListener = null;
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
  screenRecordingData = null;
  screenRecordingUrl = null;

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
          instance.postInit();
        })
        .catch(function (err) {
          console.warn("Failed to initialize Gleap.");
        });
    });
    sessionInstance.startSession();
  }

  postInit() {
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
  }

  /*unregisterEscListener() {
    if (this.escListener) {
      document.removeEventListener("keydown", this.escListener);
    }
  }

  registerEscListener() {
    const self = this;
    this.escListener = function (evt) {
      evt = evt || window.event;
      var isEscape = false;
      if ("key" in evt) {
        isEscape = evt.key === "Escape" || evt.key === "Esc";
      } else {
        isEscape = evt.keyCode === 27;
      }
      if (isEscape) {
        self.closeGleap(true);
      }
    };
    document.addEventListener("keydown", this.escListener);
  }*/

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
   * Sets the feedback button text
   * @param {string} feedbackButtonText
   */
  static setFeedbackButtonText(feedbackButtonText) {
    GleapFeedbackButtonManager.getInstance().setFeedbackButtonText(feedbackButtonText);
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
    document.body.appendChild(node);
  }

  /**
   * Enable or disable shortcuts
   * @param {boolean} enabled
   */
  static enableShortcuts(enabled) {
    this.getInstance().shortcutsEnabled = enabled;
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
   * Sets the button logo url.
   * @param {string} logoUrl
   */
  static setButtonLogoUrl(logoUrl) {
    GleapFeedbackButtonManager.getInstance().setCustomButtonLogoUrl(logoUrl);
  }

  /**
   * Enables the privacy policy.
   * @param {boolean} enabled
   */
  static enablePrivacyPolicy(enabled) { }

  /**
   * Sets the privacy policy url.
   * @param {string} privacyPolicyUrl
   */
  static setPrivacyPolicyUrl(privacyPolicyUrl) { }

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
   * Override the browser language.
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
      const elementDescription = getDOMElementDescription(target, false);
      instance.rageClickDetected = true;
      if (instance.enabledRageClickDetectorSilent) {
        Gleap.sendSilentReport({
          description: `Rage click detected.`,
          element: elementDescription,
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
  static setColors(
    primaryColor,
    headerColor,
    buttonColor,
    backgroundColor = "#ffffff"
  ) {
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
    const sessionInstance = GleapSession.getInstance();
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
   * @param {*} priority
   * @param {*} type
   * @deprecated Please use sendSilentReport instead.
   */
  static sendSilentBugReportWithType(
    description,
    priority = Gleap.PRIORITY_MEDIUM,
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
    } catch (e) { }

    return feedbackOptions;
  }

  /**
   * Starts the bug reporting flow.
   */
  static startFeedbackFlow(feedbackFlow, silentBugReport = false) {
    const sessionInstance = GleapSession.getInstance();
    const instance = this.getInstance();
    if (instance.currentlySendingBug) {
      return;
    }

    if (!sessionInstance.ready) {
      return;
    }

    // Initially set scroll position
    instance.snapshotPosition = {
      x: window.scrollX,
      y: window.scrollY,
    };

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
    }
  }

  stopBugReportingAnalytics() {
    this.networkIntercepter.setStopped(true);
    if (this.replay && !this.replay.stopped) {
      this.replay.stop(!this.isLiveSite);
    }
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
    ${loadIcon("success", this.mainColor)}
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
    hookForm(
      feedbackOptions,
      function () {
        self.formSubmitAction(feedbackOptions);
      },
      this.overrideLanguage
    );
  }

  formSubmitAction(feedbackOptions) {
    const self = this;

    // Remember form items
    rememberForm(feedbackOptions.form);

    // Show loading spinner
    toggleLoading(true);

    // Hide error message
    const errorForm = document.querySelector(".bb-feedback-dialog-error");
    if (errorForm) {
      errorForm.style.display = "none";
    }

    // Start fake loading
    self.fakeLoading = setInterval(function () {
      if (self.fakeLoadingProgress > 75) {
        self.resetLoading(false);
        return;
      }
      self.fakeLoadingProgress += 2;
      setLoadingIndicatorProgress(self.fakeLoadingProgress);
    }, 75);

    // Send form
    const formData = getFormData(feedbackOptions.form);
    self.formData = formData;
    self.excludeData = feedbackOptions.excludeData
      ? feedbackOptions.excludeData
      : {};
    self.feedbackType = feedbackOptions.feedbackType
      ? feedbackOptions.feedbackType
      : "BUG";

    self.checkReplayLoaded();
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
      this.checkForScreenRecording();
    }
  }

  checkForScreenRecording() {
    const self = this;
    if (this.screenRecordingData != null) {
      ScreenRecorder.uploadScreenRecording(this.screenRecordingData)
        .then(function (recordingUrl) {
          self.screenRecordingUrl = recordingUrl;
          self.takeScreenshotAndSend();
        })
        .catch(function (err) {
          self.takeScreenshotAndSend();
        });
    } else {
      this.takeScreenshotAndSend();
    }
  }

  takeScreenshotAndSend() {
    const self = this;
    if (this.excludeData && this.excludeData.screenshot) {
      // Screenshot excluded.
      this.sendBugReportToServer();
    } else {
      return startScreenCapture(this.isLiveSite)
        .then((data) => {
          // Set scroll position
          if (data) {
            data["x"] = self.snapshotPosition.x;
            data["y"] = self.snapshotPosition.y;
          }
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
    } catch (exp) { }
    try {
      this.networkIntercepter.setStopped(false);
    } catch (exp) { }

    this.actionToPerform = undefined;
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

    ScrollStopper.enableScroll();
    this.currentlySendingBug = false;
    this.widgetOpened = false;
    this.openedMenu = false;
    this.appCrashDetected = false;
    this.rageClickDetected = false;

    // Remove editor.
    const editorContainer = document.querySelector(".bb-capture-editor");
    if (editorContainer) {
      editorContainer.remove();
    }

    this.notifyEvent("close");
    this.closeModalUI(cleanUp);
  }

  init() {
    // Make sure all instances are ready.
    GleapMetaDataManager.getInstance();
    GleapConsoleLogManager.getInstance().start();
    GleapClickListener.getInstance().start();
    GleapCrashDetector.getInstance().start();

    // this.registerKeyboardListener();
    // this.registerEscListener();

    // Initially check network
    if (isLocalNetwork()) {
      this.isLiveSite = false;
    } else {
      this.isLiveSite = true;
    }
  }

  /*registerKeyboardListener() {
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

    document.addEventListener("keyup", function (e) {
      const char = charForEvent(e);
      if (
        e.ctrlKey &&
        (char === "i" || char === "I" || char === 73) &&
        self.shortcutsEnabled
      ) {
        self.autostartDrawing = true;
        Gleap.startFeedbackFlow();
      }
    });
  }*/

  checkForInitType() {
    // Watch replays.
    setInterval(() => {
      if (this.replay && this.replay.isFull()) {
        Gleap.enableReplays(this.replaysEnabled);
      }
    }, 1000);

    // Load session.
    const onGleapReady = function () {
      GleapFrameManager.getInstance().injectFrame();
    }
    GleapSession.getInstance().setOnSessionReady(onGleapReady.bind(this));
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
    } catch (exp) { }

    this.notifyEvent("open");
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
    http.open("POST", GleapSession.getInstance().apiUrl + "/bugs");
    http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    GleapSession.getInstance().injectSession(http);
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
          self.showError(http.status);
        }
      }
    };

    const bugReportData = {
      priority: this.severity,
      customData: this.customData,
      metaData: this.getMetaData(),
      consoleLog: GleapConsoleLogManager.getInstance().getLogs(),
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

    if (this.screenRecordingUrl && this.screenRecordingUrl != "uploading") {
      bugReportData["screenRecordingUrl"] = this.screenRecordingUrl;
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

  showError(error) {
    if (this.silentBugReport) {
      this.closeGleap();
      return;
    }

    var errorText = translateText(
      "Something went wrong, please try again.",
      self.overrideLanguage
    );
    if (error === 429) {
      errorText = translateText(
        "Too many requests, please try again later.",
        self.overrideLanguage
      );
    }

    this.notifyEvent("error-while-sending");
    toggleLoading(false);
    document.querySelector(".bb-feedback-dialog-error").innerHTML = errorText;
    document.querySelector(".bb-feedback-dialog-error").style.display = "flex";
    document.querySelector(".bb-form-progress").style.display = "none";
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
