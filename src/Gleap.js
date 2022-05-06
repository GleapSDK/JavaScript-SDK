import { startScreenCapture } from "./ScreenCapture";
import { translateText } from "./Translation";
import {
  createWidgetDialog,
  loadIcon,
  injectStyledCSS,
  toggleLoading,
} from "./UI";
import GleapNetworkIntercepter from "./GleapNetworkIntercepter";
import ReplayRecorder from "./ReplayRecorder";
import { gleapDataParser } from "./GleapHelper";
import { buildForm, getFormData, hookForm, rememberForm } from "./FeedbackForm";
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

  overrideLanguage = "";
  autostartDrawing = false;

  formData = {};
  excludeData = {};

  offlineMode = false;
  appCrashDetected = false;
  replaysEnabled = false;
  shortcutsEnabled = true;
  customTranslation = {};
  replay = null;
  snapshotPosition = {
    x: 0,
    y: 0,
  };
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
   * Register events for Gleap.
   * @param {*} eventName
   * @param {*} callback
   */
  static on(eventName, callback) {
    GleapEventManager.on(eventName, callback);
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

    GleapEventManager.notifyEvent("flow-started", feedbackOptions);

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
    /*this.networkIntercepter.setStopped(true);
    if (this.replay && !this.replay.stopped) {
      this.replay.stop(!this.isLiveMode());
    }*/
  }

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
      `bb-anim-fadeinright bb-feedback-dialog-form`
    );

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

    // Send form
    const formData = getFormData(feedbackOptions.form);
    self.formData = formData;
    self.excludeData = feedbackOptions.excludeData
      ? feedbackOptions.excludeData
      : {};

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
      return startScreenCapture(this.isLiveMode())
        .then((data) => {
          // Set scroll position
          if (data) {
            data["x"] = self.snapshotPosition.x;
            data["y"] = self.snapshotPosition.y;
          }
          this.sendBugReportToServer(data);
        })
        .catch((err) => {
          //// this.showError();
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

  init() {
    // Make sure all instances are ready.
    GleapMetaDataManager.getInstance();
    GleapConsoleLogManager.getInstance().start();
    GleapClickListener.getInstance().start();
    GleapCrashDetector.getInstance().start();
    GleapRageClickDetector.getInstance().start();
  }

  isLiveMode() {
    if (offlineMode === true) {
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

  performAction(action) {
    if (action && action.outbound && action.actionType) {
      this.actionToPerform = action;
      Gleap.startFeedbackFlow(action.actionType);
    }
  }

  sendBugReportToServer(screenshotData) {
    var gleapFeedbackItem = new GleapFeedback(
      "BUG",
      "LOW",
      GleapCustomDataManager.getInstance().getCustomData(),
      GleapMetaDataManager.getInstance().getMetaData(),
      GleapConsoleLogManager.getInstance().getLogs(),
      this.networkIntercepter.getRequests(),
      StreamedEvent.getInstance().eventArray,
      this.feedbackType,
      this.formData,
      this.silentBugReport,
      screenshotData,
      this.screenRecordingUrl,
      this.screenRecordingData,
      this.excludeData,
    );
    console.log(gleapFeedbackItem);
    gleapFeedbackItem.sendFeedback();
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
