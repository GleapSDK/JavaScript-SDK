import { loadFromGleapCache, saveToGleapCache } from "./GleapHelper";
import Gleap, { GleapFrameManager, GleapFeedbackButtonManager, GleapTranslationManager, GleapNetworkIntercepter, GleapSession, GleapReplayRecorder, GleapNotificationManager } from "./Gleap";

export default class GleapConfigManager {
  flowConfig = null;
  projectActions = null;

  // GleapConfigManager singleton
  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new GleapConfigManager();
    }
    return this.instance;
  }

  /**
   * Returns the loaded flow config.
   * @returns 
   */
  getFlowConfig() {
    return this.flowConfig;
  }

  /**
   * Returns the loaded project actions.
   * @returns 
   */
  getProjectActions() {
    return this.projectActions;
  }

  start = () => {
    const session = GleapSession.getInstance();
    const cachedConfig = loadFromGleapCache(`config-${session.sdkKey}`);
    if (cachedConfig) {
      this.applyConfig(cachedConfig);
      this.loadConfigFromServer().catch(function (e) { });
      return Promise.resolve();
    }

    return this.loadConfigFromServer();
  };

  loadConfigFromServer = () => {
    const self = this;
    return new Promise(function (resolve, reject) {
      const session = GleapSession.getInstance();
      const http = new XMLHttpRequest();
      http.open(
        "GET",
        session.apiUrl + "/config/" + session.sdkKey
      );
      http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      session.injectSession(http);
      http.onerror = function () {
        reject();
      };
      http.onreadystatechange = function (e) {
        if (http.readyState === 4) {
          if (http.status === 200 || http.status === 201) {
            try {
              const config = JSON.parse(http.responseText);
              try {
                saveToGleapCache(`config-${session.sdkKey}`, config);
              } catch (exp) { }
              self.applyConfig(config);
              return resolve();
            } catch (e) { }
          }
          reject();
        }
      };
      http.send();
    });
  };

  applyStylesFromConfig() {
    const flowConfig = this.flowConfig;
    if (flowConfig && flowConfig.color) {
      Gleap.setStyles(
        flowConfig.color,
        flowConfig.headerColor,
        flowConfig.buttonColor,
        flowConfig.backgroundColor
          ? flowConfig.backgroundColor
          : "#FFFFFF",
        flowConfig.borderRadius,
      );
    }
  }

  /**
   * Applies the Gleap config.
   * @param {*} config
   */
  applyConfig(config) {
    try {
      const flowConfig = config.flowConfig;
      const projectActions = config.projectActions;

      this.flowConfig = flowConfig;
      this.projectActions = projectActions;

      // Update styles.
      this.applyStylesFromConfig();

      // Send config update.
      GleapFrameManager.getInstance().sendConfigUpdate();
      GleapFeedbackButtonManager.getInstance().updateFeedbackButtonState();
      GleapNotificationManager.getInstance().updateContainerStyle();

      if (flowConfig.enableReplays) {
        GleapReplayRecorder.getInstance().start();
      } else {
        GleapReplayRecorder.getInstance().stop();
      }

      if (flowConfig.enableNetworkLogs) {
        GleapNetworkIntercepter.getInstance().start();
      }

      GleapNetworkIntercepter.getInstance().setLoadAllResources(flowConfig.sendNetworkResources ? true : false);

      if (flowConfig.networkLogPropsToIgnore) {
        GleapNetworkIntercepter.getInstance().setFilters(flowConfig.networkLogPropsToIgnore);
      }

      if (flowConfig.networkLogBlacklist) {
        GleapNetworkIntercepter.getInstance().setBlacklist(flowConfig.networkLogBlacklist);
      }

      if (flowConfig.customTranslations) {
        GleapTranslationManager.getInstance().setCustomTranslation(flowConfig.customTranslations);
        GleapTranslationManager.getInstance().updateRTLSupport();
      }

      Gleap.enableShortcuts(flowConfig.enableShortcuts ? true : false);
    } catch (e) { }
  }

  getFeedbackOptions(feedbackFlow) {
    var feedbackOptions = null;

    // Try to load the specific feedback flow.
    if (feedbackFlow) {
      feedbackOptions = this.projectActions[feedbackFlow];
    }

    // Fallback
    if (!feedbackOptions) {
      feedbackOptions = this.projectActions.bugreporting;
    }

    // Deep copy to prevent changes.
    try {
      feedbackOptions = JSON.parse(JSON.stringify(feedbackOptions));
    } catch (e) { }

    return feedbackOptions;
  }
}
