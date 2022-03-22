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
import { isMobile, loadFromGleapCache, saveToGleapCache } from "./GleapHelper";
import { buildForm, getFormData, hookForm, rememberForm } from "./FeedbackForm";
import { startRageClickDetector } from "./UXDetectors";
import { createScreenshotEditor } from "./DrawingCanvas";
import Session from "./Session";
import StreamedEvent from "./StreamedEvent";
import AutoConfig from "./AutoConfig";
import { ScrollStopper } from "./ScrollStopper";
import { isLocalNetwork } from "./NetworkUtils";
import { ScreenRecorder } from "./ScreenRecorder";

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
  autostartDrawing = false;
  actionLog = [];
  logArray = [];
  customData = {};
  formData = {};
  excludeData = {};
  logMaxLength = 500;
  buttonType = Gleap.FEEDBACK_BUTTON_NONE;
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
  escListener = null;
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
  screenRecordingData = null;
  screenRecordingUrl = null;

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
        var oldSession = loadFromGleapCache(`session-${sdkKey}`);
        if (!oldSession) {
          oldSession = {};
        }
        oldSession.gleapId = gleapId;
        oldSession.gleapHash = gleapHash;

        saveToGleapCache(`session-${sdkKey}`, oldSession);
      } catch (exp) {}
    }

    const sessionInstance = Session.getInstance();
    sessionInstance.sdkKey = sdkKey;
    sessionInstance.setOnSessionReady(function () {
      // Run auto configuration.
      setTimeout(function () {
        AutoConfig.run(function (config, soft) {
          Gleap.applyConfig(config, soft);
        })
          .then(function () {
            instance.postInit();
          })
          .catch(function (err) {});
      }, 0);
    });
    sessionInstance.startSession();
  }

  /**
   * Applies the Gleap config.
   * @param {*} config
   */
  static applyConfig(config, soft) {
    try {
      const flowConfig = config.flowConfig;
      const projectActions = config.projectActions;

      if (flowConfig.color) {
        Gleap.setStyles({
          primaryColor: flowConfig.color,
          headerColor: flowConfig.headerColor,
          buttonColor: flowConfig.buttonColor,
          borderRadius: flowConfig.borderRadius,
          backgroundColor: flowConfig.backgroundColor
            ? flowConfig.backgroundColor
            : "#FFFFFF",
        });
      }

      // If it's only a soft update, return here.
      if (soft) {
        return;
      }

      if (flowConfig.logo && flowConfig.logo.length > 0) {
        Gleap.setLogoUrl(flowConfig.logo);
      }

      if (flowConfig.hideBranding) {
        Gleap.enablePoweredBy();
      }

      if (flowConfig.enableReplays) {
        Gleap.enableReplays(flowConfig.enableReplays);
      }

      Gleap.enableShortcuts(flowConfig.enableShortcuts ? true : false);

      if (flowConfig.enableNetworkLogs) {
        Gleap.enableNetworkLogger();
      }

      if (flowConfig.networkLogPropsToIgnore) {
        Gleap.setNetworkLogFilters(flowConfig.networkLogPropsToIgnore);
      }

      if (!flowConfig.enableConsoleLogs) {
        Gleap.disableConsoleLogOverwrite();
      }

      if (
        typeof flowConfig.enableCrashDetector !== "undefined" &&
        flowConfig.enableCrashDetector
      ) {
        Gleap.enableCrashDetector(true, flowConfig.enableCrashDetector);
      }

      if (
        typeof flowConfig.enableRageClickDetector !== "undefined" &&
        flowConfig.enableRageClickDetector
      ) {
        Gleap.enableRageClickDetector(flowConfig.rageClickDetectorIsSilent);
      }

      if (flowConfig.customTranslations) {
        Gleap.setCustomTranslation(flowConfig.customTranslations);
      }

      if (
        typeof flowConfig.feedbackButtonPosition !== "undefined" &&
        flowConfig.feedbackButtonPosition.length > 0
      ) {
        Gleap.setButtonType(flowConfig.feedbackButtonPosition);
      }

      if (
        typeof flowConfig.widgetButtonText !== "undefined" &&
        flowConfig.widgetButtonText.length > 0
      ) {
        Gleap.setFeedbackButtonText(flowConfig.widgetButtonText);
      }

      if (
        typeof flowConfig.hideWavingHandAfterName !== "undefined" &&
        flowConfig.hideWavingHandAfterName
      ) {
        Gleap.setWelcomeIcon("");
      }

      if (
        typeof flowConfig.hideUsersName !== "undefined" &&
        flowConfig.hideUsersName
      ) {
        Gleap.setShowUserName(false);
      }

      if (flowConfig.widgetInfoTitle && flowConfig.widgetInfoTitle.length > 0) {
        Gleap.setWidgetInfo({
          title: flowConfig.widgetInfoTitle,
        });
      }

      if (
        flowConfig.widgetInfoSubtitle &&
        flowConfig.widgetInfoSubtitle.length > 0
      ) {
        Gleap.setWidgetInfo({
          subtitle: flowConfig.widgetInfoSubtitle,
        });
      }

      if (
        flowConfig.widgetInfoDialogSubtitle &&
        flowConfig.widgetInfoDialogSubtitle.length > 0
      ) {
        Gleap.setWidgetInfo({
          dialogSubtitle: flowConfig.widgetInfoDialogSubtitle,
        });
      }

      if (
        flowConfig.enableMenu &&
        flowConfig.menuItems &&
        flowConfig.menuItems.length > 0
      ) {
        let menuItems = [];
        for (let i = 0; i < flowConfig.menuItems.length; i++) {
          let menuItem = flowConfig.menuItems[i];
          let actionFlow = null;
          let action = null;

          if (menuItem.actionType === "OPEN_INTERCOM") {
            action = function () {
              if (instance.widgetCallback) {
                return;
              }
              if (typeof Intercom !== "undefined") {
                Intercom("showNewMessage");
              }
            };
          } else if (menuItem.actionType === "REDIRECT_URL") {
            if (instance.widgetCallback) {
              action = function () {
                instance.widgetCallback("openExternalURL", {
                  url: menuItem.actionBody,
                });
              };
            } else {
              if (menuItem.actionOpenInNewTab) {
                action = function () {
                  window.open(menuItem.actionBody, "_blank").focus();
                };
              } else {
                action = function () {
                  window.location.href = menuItem.actionBody;
                };
              }
            }
          } else if (menuItem.actionType === "CUSTOM_ACTION") {
            action = function () {
              Gleap.triggerCustomAction(menuItem.actionBody);
            };
          } else {
            actionFlow = menuItem.actionType;
          }

          // Action flow
          if (actionFlow != null || action != null) {
            var item = {
              title: menuItem.title,
              description: menuItem.description,
              icon: menuItem.icon,
              color: menuItem.color,
            };
            if (actionFlow) {
              item["actionFlow"] = actionFlow;
            }
            if (action) {
              item["action"] = action;
            }
            menuItems.push(item);
          }
        }

        Gleap.setMenuOptions(menuItems);
      }

      if (projectActions) {
        Gleap.setFeedbackActions(projectActions);
      }

      if (flowConfig.buttonLogo && flowConfig.buttonLogo.length > 0) {
        Gleap.setButtonLogoUrl(flowConfig.buttonLogo);
      }
    } catch (e) {
      console.log(e);
    }
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

  unregisterEscListener() {
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
  }

  /**
   * Indentifies the user session
   * @param {string} userId
   * @param {*} userData
   */
  static identify(userId, userData) {
    return Session.getInstance().identifySession(
      userId,
      gleapDataParser(userData)
    );
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
      if (!feedbackOptions.disableUserScreenshot && !instance.widgetCallback) {
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

    ScrollStopper.enableScroll();
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

  init() {
    this.overwriteConsoleLog();
    this.startCrashDetection();
    this.registerKeyboardListener();
    this.registerEscListener();

    // Initially check network
    if (isLocalNetwork()) {
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
          self.showError(http.status);
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
    // Native screenshot SDK.
    if (!feedbackOptions.disableUserScreenshot) {
      if (this.screenshot) {
        this.showMobileScreenshotEditor(feedbackOptions);
        return;
      }

      // Fetch screenshot from native SDK.
      if (this.widgetOnly && this.widgetCallback) {
        this.screenshotFeedbackOptions = feedbackOptions;
        this.widgetCallback("requestScreenshot", {});
        return;
      }
    }

    this.createFeedbackFormDialog(feedbackOptions);
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
