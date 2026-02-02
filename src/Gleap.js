import { injectStyledCSS } from "./UI";
import GleapNetworkIntercepter from "./GleapNetworkIntercepter";
import {
  fixGleapHeight,
  gleapDataParser,
  runFunctionWhenDomIsReady,
} from "./GleapHelper";
import GleapSession from "./GleapSession";
import GleapStreamedEvent from "./GleapStreamedEvent";
import GleapConfigManager from "./GleapConfigManager";
import GleapFeedback from "./GleapFeedback";
import GleapFrameManager from "./GleapFrameManager";
import GleapMetaDataManager from "./GleapMetaDataManager";
import GleapConsoleLogManager from "./GleapConsoleLogManager";
import GleapClickListener from "./GleapClickListener";
import GleapFeedbackButtonManager from "./GleapFeedbackButtonManager";
import GleapCustomDataManager from "./GleapCustomDataManager";
import GleapEventManager from "./GleapEventManager";
import GleapCustomActionManager from "./GleapCustomActionManager";
import GleapReplayRecorder from "./GleapReplayRecorder";
import GleapMarkerManager from "./GleapMarkerManager";
import GleapTranslationManager from "./GleapTranslationManager";
import GleapShortcutListener from "./GleapShortcutListener";
import GleapPreFillManager from "./GleapPreFillManager";
import GleapNotificationManager from "./GleapNotificationManager";
import GleapAiChatbarManager from "./GleapAiChatbarManager";
import GleapBannerManager from "./GleapBannerManager";
import GleapModalManager from "./GleapModalManager";
import GleapAudioManager from "./GleapAudioManager";
import GleapTagManager from "./GleapTagManager";
import GleapAdminManager from "./GleapAdminManager";
import GleapProductTours from "./GleapProductTours";
import { checkPageFilter } from "./GleapPageFilter";
import { registerGleapChecklist } from "./GleapChecklist";
import ChecklistNetworkManager from "./ChecklistNetworkManager";

if (
  typeof window !== "undefined" &&
  typeof HTMLCanvasElement !== "undefined" &&
  HTMLCanvasElement.prototype &&
  HTMLCanvasElement.prototype.__originalGetContext === undefined
) {
  HTMLCanvasElement.prototype.__originalGetContext =
    HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, options) {
    return this.__originalGetContext(type, {
      ...options,
      preserveDrawingBuffer: true,
    });
  };
}

if (
  typeof customElements !== "undefined" &&
  typeof HTMLElement !== "undefined" &&
  typeof window !== "undefined"
) {
  registerGleapChecklist();
}

class Gleap {
  static invoked = true;
  static silentCrashReportSent = false;
  initialized = false;
  offlineMode = false;
  disablePageTracking = false;
  disableInAppNotifications = false;
  disableQueryParams = false;

  // Global data
  globalData = {
    screenRecordingData: null,
    webReplay: null,
    snapshotPosition: {
      x: 0,
      y: 0,
    },
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
      GleapAdminManager.getInstance().start();
      GleapAiChatbarManager.getInstance().setOnMessageSend((question) => {
        Gleap.askAI(question, true);
      });
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
   * Set tags to be submitted with each ticket.
   * @param {*} tags
   */
  static setTags(tags) {
    GleapTagManager.getInstance().setTags(tags);
  }

  /**
   * Sets a custom URL handler.
   * @param {*} urlHandler
   */
  static setUrlHandler(urlHandler) {
    GleapFrameManager.getInstance().setUrlHandler(urlHandler);
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
   * Disable the in-app notifications.
   * @param {*} disableInAppNotifications
   */
  static setDisableInAppNotifications(disableInAppNotifications) {
    const instance = this.getInstance();
    instance.disableInAppNotifications = disableInAppNotifications;
  }

  /**
   * Disable the default page tracking.
   * @param {*} disablePageTracking
   */
  static setDisablePageTracking(disablePageTracking) {
    const instance = this.getInstance();
    instance.disablePageTracking = disablePageTracking;
  }

  /**
   * Revert console log overwrite.
   */
  static disableConsoleLogOverwrite() {
    GleapConsoleLogManager.getInstance().stop();
  }

  /**
   * Set the AI tools.
   * @param {*} tools
   */
  static setAiTools(tools) {
    GleapConfigManager.getInstance().setAiTools(tools);
    GleapFrameManager.getInstance().sendConfigUpdate();
  }

  /**
   * Attaches external network logs.
   */
  static attachNetworkLogs(networkLogs) {
    GleapNetworkIntercepter.getInstance().externalRequests =
      gleapDataParser(networkLogs);
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

    try {
      fixGleapHeight();
    } catch (error) { }

    // Start session
    const sessionInstance = GleapSession.getInstance();
    sessionInstance.sdkKey = sdkKey;
    sessionInstance.setOnSessionReady(() => {
      // Run auto configuration.
      setTimeout(() => {
        GleapConfigManager.getInstance()
          .start()
          .then(() => {
            GleapStreamedEvent.getInstance().start();

            runFunctionWhenDomIsReady(() => {
              // Inject the widget buttons
              GleapFeedbackButtonManager.getInstance().injectFeedbackButton();

              // Inject the notification container
              GleapNotificationManager.getInstance().injectNotificationUI();

              // Inject the AI UI container
              GleapAiChatbarManager.getInstance().injectAIUI();

              // Check for uncompleted tour.
              Gleap.checkForUncompletedTour();

              // Check for URL params.
              Gleap.checkForUrlParams();

              // Notify event.
              GleapEventManager.notifyEvent("initialized");
            });
          })
          .catch(function (err) {
            console.warn("Failed to initialize Gleap.");
          });
      }, 0);
    });
    sessionInstance.startSession();
  }

  static openURL(url, newTab = false) {
    GleapFrameManager.getInstance().urlHandler(url, newTab);
  }

  static disableQueryParams(disableQueryParams = true) {
    this.getInstance().disableQueryParams = disableQueryParams;
  }

  static checkForUrlParams() {
    if (this.getInstance().disableQueryParams) {
      console.log("Query params are disabled.");
      return;
    }

    if (typeof window === "undefined" || !window.location.search) {
      return;
    }

    try {
      const urlParams = new URLSearchParams(window.location.search);

      const widget = urlParams.get("gleap_widget");
      if (widget && widget.length > 0) {
        Gleap.open();
      }

      const conversationFlow = urlParams.get("gleap_conversation");
      if (conversationFlow && conversationFlow.length > 0) {
        if (conversationFlow === "true") {
          Gleap.startConversation(true);
        } else {
          Gleap.startBot(conversationFlow, true);
        }
      }

      const feedbackFlow = urlParams.get("gleap_feedback");
      if (feedbackFlow && feedbackFlow.length > 0) {
        Gleap.startFeedbackFlow(feedbackFlow);
      }
      const surveyFlow = urlParams.get("gleap_survey");
      const surveyFlowFormat = urlParams.get("gleap_survey_format");
      if (surveyFlow && surveyFlow.length > 0) {
        Gleap.showSurvey(
          surveyFlow,
          surveyFlowFormat === "survey_full" ? "survey_full" : "survey"
        );
      }
      const tourId = urlParams.get("gleap_tour");
      if (tourId && tourId.length > 0) {
        var tourDelay = parseInt(urlParams.get("gleap_tour_delay"));
        if (isNaN(tourDelay)) {
          tourDelay = 2;
        }

        setTimeout(() => {
          Gleap.startProductTour(tourId);
        }, tourDelay * 1000);
      }
    } catch (exp) { }
  }

  /**
   * Destroy
   * @returns
   */
  static destroy() {
    GleapReplayRecorder.getInstance().stop();
    GleapStreamedEvent.getInstance().stop();
    GleapFrameManager.getInstance().destroy();
    GleapFeedbackButtonManager.getInstance().destroy();
    GleapNotificationManager.getInstance().clearAllNotifications(true);
    GleapAiChatbarManager.getInstance().destroy();
    GleapSession.getInstance().clearSession(0, false);
    GleapBannerManager.getInstance().removeBannerUI();

    // Reset the initialized flag and clear the instance
    this.instance = null;
  }

  /**
   * Close any open banner.
   */
  static closeBanner() {
    GleapBannerManager.getInstance().removeBannerUI();
  }

  /**
   * Close any open modal.
   */
  static closeModal() {
    GleapModalManager.getInstance().hideModal();
  }

  /**
   * Show the AI bar.
   */
  static showAiChatbar() {
    GleapAiChatbarManager.getInstance().manuallyHidden = false;
    GleapAiChatbarManager.getInstance().show();
  }

  /**
   * Hide the AI search.
   */
  static hideAiChatbar() {
    GleapAiChatbarManager.getInstance().manuallyHidden = true;
    GleapAiChatbarManager.getInstance().hide();
  }

  /**
   * Set the AI quick actions.
   * @param {Array<string>} quickActions
   */
  static setAiChatbarQuickActions(quickActions) {
    GleapAiChatbarManager.getInstance().setQuickActions(quickActions);
  }

  /**
   * Set the AI chatbar placeholder.
   * @param {string} placeholder
   */
  static setAiChatbarPlaceholder(placeholder) {
    GleapAiChatbarManager.getInstance().setPlaceholder(placeholder);
  }

  /**
   * Enable or disable Gleap session tracking through cookies.
   * @param {*} useCookies
   */
  static setUseCookies(useCookies) {
    GleapSession.getInstance().useCookies = useCookies;
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
   * Updates the contact data.
   * @param {*} userData
   */
  static updateContact(userData) {
    return GleapSession.getInstance().updateSession(gleapDataParser(userData));
  }

  /**
   * Clears the current contact.
   */
  static clearIdentity() {
    GleapSession.getInstance().clearSession();
  }

  /**
   * Returns the current user session
   */
  static getIdentity() {
    return GleapSession.getInstance().getSession();
  }

  /**
   * Returns whether the user is identified or not.
   */
  static isUserIdentified() {
    const session = GleapSession.getInstance().session;
    if (session && session.userId && session.userId.length > 0) {
      return true;
    }
    return false;
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
   * Sets the maximum network request count.
   */
  static startNetworkLogger() {
    GleapNetworkIntercepter.getInstance().start();
  }

  /**
   * Sets the network logger blacklist.
   * @param {Array} networkLogBlacklist
   */
  static setNetworkLogsBlacklist(networkLogBlacklist) {
    GleapNetworkIntercepter.getInstance().setBlacklist(networkLogBlacklist);
  }

  /**
   * Sets the network logger props to ignore.
   * @param {Array} filters
   */
  static setNetworkLogPropsToIgnore(filters) {
    GleapNetworkIntercepter.getInstance().setFilters(filters);
  }

  /**
   * Set custom replay options.
   * @param {*} options
   */
  static setReplayOptions(options) {
    GleapReplayRecorder.getInstance().setOptions(options);
  }

  /**
   * Closes any open Gleap dialogs.
   * @param {boolean} resetRoutes
   */
  static close(resetRoutes = false) {
    GleapFrameManager.getInstance().hideWidget(resetRoutes);
  }

  /**
   * Starts the Gleap flow.
   */
  static open() {
    GleapFrameManager.getInstance().setAppMode("widget");
    GleapFrameManager.getInstance().showWidget();
  }

  /**
   * Track a custom event
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
    GleapFrameManager.getInstance().sendMessage(
      {
        name: "prefill-form-data",
        data: cleanedData,
      },
      true
    );
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
   * Set a custom ws api url.
   * @param {string} wsApiUrl
   */
  static setWSApiUrl(wsApiUrl) {
    GleapSession.getInstance().wsApiUrl = wsApiUrl;
  }

  /**
   * Set a custom api url.
   * @param {string} apiUrl
   */
  static setApiUrl(apiUrl) {
    GleapSession.getInstance().apiUrl = apiUrl;
  }

  /**
   * Set a custom banner url.
   * @param {string} bannerUrl
   */
  static setBannerUrl(bannerUrl) {
    GleapBannerManager.getInstance().setBannerUrl(bannerUrl);
  }

  /**
   * Set a custom modal url.
   * @param {string} modalUrl
   */
  static setModalUrl(modalUrl) {
    GleapModalManager.getInstance().setModalUrl(modalUrl);
  }

  /**
   * Set a custom frame api url.
   * @param {string} frameUrl
   */
  static setFrameUrl(frameUrl) {
    GleapFrameManager.getInstance().frameUrl = frameUrl;
  }

  /**
   * This method is used to set ticket attributes programmatically.
   * @param {*} key The key of the attribute you want to add.
   * @param {*} value The value to set.
   */
  static setTicketAttribute(key, value) {
    GleapCustomDataManager.getInstance().setTicketAttribute(key, value);
  }

  /**
   * This method is used to unset ticket attributes programmatically.
   * @param {*} key The key of the attribute you want to unset.
   */
  static unsetTicketAttribute(key) {
    GleapCustomDataManager.getInstance().unsetTicketAttribute(key);
  }

  /**
   * This method is used to clear ticket attributes programmatically.
   */
  static clearTicketAttributes() {
    GleapCustomDataManager.getInstance().clearTicketAttributes();
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
   * Play or mute the sound.
   * @param {*} play
   */
  static playSound(play) {
    GleapAudioManager.playSound(play);
  }

  /**
   * Show or hide the notification badge count.
   * @param {boolean} showNotificationBadge show or hide the notification badge
   *
   */
  static showTabNotificationBadge(showNotificationBadge) {
    const notificationInstance = GleapNotificationManager.getInstance();
    notificationInstance.showNotificationBadge = showNotificationBadge;
    notificationInstance.updateTabBarNotificationCount();
  }

  /**
   * Override the browser language.
   * @param {string} language country code with two letters
   */
  static setLanguage(language) {
    GleapTranslationManager.getInstance().setOverrideLanguage(language);

    if (Gleap.getInstance().initialized) {
      setTimeout(() => {
        Gleap.getInstance().softReInitialize();

        // Update language for contact.
        Gleap.updateContact({
          lang: language,
        });
      }, 1000);
    }
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
    buttonX = 20,
    buttonY = 20,
    buttonStyle = GleapFeedbackButtonManager.FEEDBACK_BUTTON_BOTTOM_LEFT
  ) {
    runFunctionWhenDomIsReady(() => {
      injectStyledCSS(
        primaryColor,
        headerColor,
        buttonColor,
        borderRadius,
        backgroundColor,
        buttonX,
        buttonY,
        buttonStyle
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
        description,
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

    const feedback = new GleapFeedback(
      "CRASH",
      priority,
      newFormData,
      true,
      excludeDataCleaned
    );
    feedback
      .sendFeedback()
      .then(() => { })
      .catch((error) => { });
  }

  /**
   * Shows a survey manually.
   * @param {*} actionType
   * @param {*} format
   */
  static showSurvey(actionType, format = "survey") {
    Gleap.startFeedbackFlowWithOptions(
      actionType,
      {
        hideBackButton: true,
        format,
      },
      true
    );
  }

  /**
   * Starts a classic feedback form.
   */
  static startClassicForm(formId, showBackButton) {
    Gleap.startFeedbackFlowWithOptions(formId, {
      hideBackButton: !showBackButton,
    });
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
  static startFeedbackFlowWithOptions(
    feedbackFlow,
    options = {},
    isSurvey = false
  ) {
    const { autostartDrawing, hideBackButton, format } = options;
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

    GleapFrameManager.getInstance().sendMessage(
      {
        name: action,
        data: {
          flow: feedbackFlow,
          hideBackButton: hideBackButton,
          format,
        },
      },
      true
    );

    if (autostartDrawing) {
      GleapFrameManager.getInstance().showDrawingScreen("screenshot");
    } else {
      GleapFrameManager.getInstance().showWidget();
    }
  }

  /**
   * Opens the conversations overview.
   */
  static openConversations(showBackButton = true) {
    GleapFrameManager.getInstance().setAppMode("widget");

    GleapFrameManager.getInstance().sendMessage(
      {
        name: "open-conversations",
        data: {
          hideBackButton: !showBackButton,
        },
      },
      true
    );

    GleapFrameManager.getInstance().showWidget();
  }

  /**
   * Opens a conversation
   */
  static openConversation(shareToken, showBackButton = true) {
    if (!shareToken) {
      return;
    }

    GleapFrameManager.getInstance().setAppMode("widget");

    GleapFrameManager.getInstance().sendMessage(
      {
        name: "open-conversation",
        data: {
          shareToken,
          hideBackButton: !showBackButton,
        },
      },
      true
    );

    GleapFrameManager.getInstance().showWidget();
  }

  /**
   * Starts a new conversation
   */
  static startConversation(showBackButton = true) {
    Gleap.startBot("", showBackButton);
  }

  /**
   * Starts a new conversation and attaches the bot with the given id.
   */
  static startBot(botId, showBackButton = true) {
    GleapFrameManager.getInstance().setAppMode("widget");
    GleapFrameManager.getInstance().sendMessage(
      {
        name: "start-bot",
        data: {
          botId: botId ? botId : "",
          hideBackButton: !showBackButton,
        },
      },
      true
    );

    GleapFrameManager.getInstance().showWidget();
  }

  /**
   * Starts a new conversation and attaches the bot with the given id.
   */
  static askAI(question, showBackButton = true) {
    GleapFrameManager.getInstance().setAppMode("widget");
    GleapFrameManager.getInstance().sendMessage(
      {
        name: "ask-ai",
        data: {
          question,
          hideBackButton: !showBackButton,
        },
      },
      true
    );

    GleapFrameManager.getInstance().showWidget();
  }

  /**
   * Opens a help center collection
   */
  static openHelpCenterCollection(collectionId, showBackButton = true) {
    if (!collectionId) {
      return;
    }

    GleapFrameManager.getInstance().setAppMode("widget");

    GleapFrameManager.getInstance().sendMessage(
      {
        name: "open-help-collection",
        data: {
          collectionId,
          hideBackButton: !showBackButton,
        },
      },
      true
    );

    GleapFrameManager.getInstance().showWidget();
  }

  /**
   * Opens a help article
   */
  static openHelpCenterArticle(articleId, showBackButton = true) {
    if (!articleId) {
      return;
    }

    GleapFrameManager.getInstance().setAppMode("widget");

    GleapFrameManager.getInstance().sendMessage(
      {
        name: "open-help-article",
        data: {
          articleId,
          hideBackButton: !showBackButton,
        },
      },
      true
    );

    GleapFrameManager.getInstance().showWidget();
  }

  /**
   * Opens the help center.
   */
  static openHelpCenter(showBackButton = true) {
    GleapFrameManager.getInstance().setAppMode("widget");

    GleapFrameManager.getInstance().sendMessage(
      {
        name: "open-helpcenter",
        data: {
          hideBackButton: !showBackButton,
        },
      },
      true
    );

    GleapFrameManager.getInstance().showWidget();
  }

  /**
   * Search for news articles in the help center
   */
  static searchHelpCenter(term, showBackButton = true) {
    if (!term) {
      return;
    }

    GleapFrameManager.getInstance().setAppMode("widget");

    GleapFrameManager.getInstance().sendMessage(
      {
        name: "open-helpcenter-search",
        data: {
          term,
          hideBackButton: !showBackButton,
        },
      },
      true
    );

    GleapFrameManager.getInstance().showWidget();
  }

  /**
   * Opens a news article
   */
  static openNewsArticle(id, showBackButton = true) {
    if (!id) {
      return;
    }

    GleapFrameManager.getInstance().setAppMode("widget");

    GleapFrameManager.getInstance().sendMessage(
      {
        name: "open-news-article",
        data: {
          id,
        },
      },
      true
    );

    GleapFrameManager.getInstance().showWidget();
  }

  /**
   * Open the checklists overview.
   */
  static openChecklists(showBackButton = true) {
    GleapFrameManager.getInstance().setAppMode("widget");

    GleapFrameManager.getInstance().sendMessage(
      {
        name: "open-checklists",
        data: {},
      },
      true
    );

    GleapFrameManager.getInstance().showWidget();
  }

  /**
   * Starts a new checklist and opens it.
   */
  static startChecklist(
    outboundId,
    showBackButton = true,
    sharedKey = undefined
  ) {
    if (!outboundId) {
      return false;
    }

    GleapFrameManager.getInstance().setAppMode("widget");
    GleapFrameManager.getInstance().sendMessage(
      {
        name: "start-checklist",
        data: {
          outboundId: outboundId,
          hideBackButton: !showBackButton,
          ...(sharedKey ? { sharedKey: sharedKey } : {}),
        },
      },
      true
    );

    GleapFrameManager.getInstance().showWidget();

    return true;
  }

  /**
   * Open an existing checklist.
   */
  static openChecklist(checklistId, showBackButton = true) {
    if (!checklistId) {
      return;
    }

    GleapFrameManager.getInstance().setAppMode("widget");
    GleapFrameManager.getInstance().sendMessage(
      {
        name: "open-checklist",
        data: {
          id: checklistId,
          hideBackButton: !showBackButton,
        },
      },
      true
    );

    GleapFrameManager.getInstance().showWidget();
  }

  /**
   * Gets the full checklist data by validating the outbound ID and fetching the data.
   * @param {string} outboundId - The outbound checklist ID to get data for.
   * @param {string} [sharedKey] - Optional shared key for the checklist.
   * @returns {Promise<object>} A promise that resolves with the full checklist data.
   *
   * Available events for checklist updates (use Gleap.on() to listen):
   * - 'checklist-loaded': Fired when a checklist is initially loaded
   * - 'checklist-update': Fired when checklist data is updated
   * - 'checklist-step-completed': Fired when a step is marked as completed
   * - 'checklist-completed': Fired when the entire checklist is completed
   */
  static getChecklistData(outboundId, sharedKey) {
    if (!outboundId) {
      return Promise.reject(new Error("outboundId is required"));
    }

    const networkManager = ChecklistNetworkManager.getInstance();

    // First validate the checklist to get the internal ID
    return networkManager
      .validateChecklist(outboundId, sharedKey)
      .then((internalId) => {
        // Then fetch the full checklist data
        return networkManager.fetchChecklist(internalId);
      });
  }

  /**
   * Opens the news overview.
   */
  static openNews(showBackButton = true) {
    GleapFrameManager.getInstance().setAppMode("widget");

    GleapFrameManager.getInstance().sendMessage(
      {
        name: "open-news",
        data: {
          hideBackButton: !showBackButton,
        },
      },
      true
    );

    GleapFrameManager.getInstance().showWidget();
  }

  /**
   * Opens the feature requests overview.
   */
  static openFeatureRequests(showBackButton = true) {
    GleapFrameManager.getInstance().setAppMode("widget");

    GleapFrameManager.getInstance().sendMessage(
      {
        name: "open-feature-requests",
        data: {},
      },
      true
    );

    GleapFrameManager.getInstance().showWidget();
  }

  isLiveMode() {
    if (this.offlineMode === true) {
      return false;
    }

    var hostname = window.location.hostname;
    const isLocalHost =
      ["localhost", "127.0.0.1", "0.0.0.0", "", "::1"].includes(hostname) ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.0.") ||
      hostname.endsWith(".local") ||
      !hostname.includes(".");
    return !isLocalHost;
  }

  softReInitialize() {
    GleapFrameManager.getInstance().destroy();
    GleapConfigManager.getInstance()
      .start()
      .then(() => {
        // Update the feedback button.
        GleapFeedbackButtonManager.getInstance().refresh();

        // Inject the notification container
        GleapNotificationManager.getInstance().injectNotificationUI();

        // Inject the AI UI container
        GleapAiChatbarManager.getInstance().injectAIUI();
      })
      .catch(function (err) {
        console.warn("Failed to initialize Gleap.");
      });
  }

  /**
   * Performs an action.
   * @param {*} action
   */
  performActions(actions) {
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      if (action && action.actionType) {
        if (action.pageFilter && window && window.location) {
          const passed = checkPageFilter(
            window.location.href,
            action.pageFilter,
            action.pageFilterType
          );

          if (!passed) {
            continue;
          }
        }

        if (action.actionType === "notification") {
          if (action?.data?.checklist?.popupType === "widget") {
            Gleap.openChecklist(action.data.checklist.id, true);
          } else {
            if (!this.disableInAppNotifications) {
              Gleap.showNotification(action);
            }
          }
        } else if (action.actionType === "banner") {
          Gleap.showBanner(action);
        } else if (action.actionType === "modal") {
          Gleap.showModal(action);
        } else if (action.actionType === "tour") {
          Gleap.startProductTourWithConfig(action.outbound, action.data, false);
        } else {
          Gleap.showSurvey(action.actionType, action.format);
        }
      }
    }
  }

  static startProductTour(tourId, checkStartUrl = false) {
    const self = this;
    GleapSession.getInstance()
      .startProductTourConfig(tourId)
      .then((config) => {
        if (
          checkStartUrl &&
          config?.startURL &&
          !window?.location?.href?.includes(config?.baseURL)
        ) {
          window.location.href = `${config.startURL}?gleap_tour=${tourId}&gleap_tour_delay=1`;
          return;
        }

        self.startProductTourWithConfig(tourId, config, true);
      })
      .catch((error) => { });
  }

  static checkForUncompletedTour() {
    const tourData = GleapProductTours.getInstance().loadUncompletedTour();
    if (tourData) {
      GleapProductTours.getInstance().startWithConfig(
        tourData.tourId,
        tourData.tourData,
        500
      );
    }
  }

  static startProductTourWithConfig(tourId, config, manually = false) {
    GleapProductTours.getInstance().startWithConfig(
      tourId,
      config,
      0,
      manually
    );
  }

  static showBanner(data) {
    try {
      GleapBannerManager.getInstance().showBanner(data);
    } catch (e) { }
  }

  static showModal(data) {
    try {
      GleapModalManager.getInstance().showModal(data);
    } catch (e) { }
  }

  static showNotification(data) {
    GleapNotificationManager.getInstance().showNotification(data);
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
    const replayData = GleapReplayRecorder.getInstance().getReplayData();
    this.setGlobalDataItem("webReplay", replayData);
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

const handleGleapLink = (href) => {
  try {
    const urlParts = href.split("/");
    const type = urlParts[2];
    if (type === "article") {
      const identifier = urlParts[3];
      Gleap.openHelpCenterArticle(identifier, true);
    }

    if (type === "collection") {
      const identifier = urlParts[3];
      Gleap.openHelpCenterCollection(identifier, true);
    }

    if (type === "flow") {
      const identifier = urlParts[3];
      Gleap.startFeedbackFlow(identifier, true);
    }

    if (type === "survey") {
      const identifier = urlParts[3];
      Gleap.showSurvey(identifier);
    }

    if (type === "bot") {
      const identifier = urlParts[3];
      Gleap.startBot(identifier, true);
    }

    if (type === "news") {
      const identifier = urlParts[3];
      Gleap.openNewsArticle(identifier, true);
    }

    if (type === "checklist") {
      const identifier = urlParts[3];
      Gleap.startChecklist(identifier, true, urlParts[4]);
    }

    if (type === "tour") {
      const identifier = urlParts[3];
      Gleap.startProductTour(identifier);
    }
  } catch (e) {
    console.error("Failed to handle Gleap link: ", href);
  }
};

export {
  GleapNetworkIntercepter,
  GleapAudioManager,
  GleapNotificationManager,
  GleapAiChatbarManager,
  GleapBannerManager,
  GleapModalManager,
  GleapPreFillManager,
  GleapShortcutListener,
  GleapMarkerManager,
  GleapTranslationManager,
  GleapReplayRecorder,
  GleapFeedback,
  GleapConsoleLogManager,
  GleapCustomActionManager,
  GleapEventManager,
  GleapCustomDataManager,
  GleapFeedbackButtonManager,
  GleapClickListener,
  GleapSession,
  GleapStreamedEvent,
  GleapConfigManager,
  GleapFrameManager,
  GleapMetaDataManager,
  GleapTagManager,
  GleapProductTours,
  GleapAdminManager,
  handleGleapLink,
};

export default Gleap;
