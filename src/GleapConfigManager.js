import {
  loadFromGleapCache,
  saveToGleapCache,
  clearGleapCache,
} from "./GleapHelper";
import Gleap, {
  GleapFrameManager,
  GleapFeedbackButtonManager,
  GleapTranslationManager,
  GleapNetworkIntercepter,
  GleapSession,
  GleapReplayRecorder,
  GleapNotificationManager,
  GleapAiChatbarManager,
} from "./Gleap";

const parseIntWithDefault = (val, def) => {
  const parsed = parseInt(val);
  if (isNaN(parsed)) {
    return def;
  }
  return parsed;
};

export default class GleapConfigManager {
  flowConfig = null;
  projectActions = null;
  onConfigLoadedListener = [];
  aiTools = [];

  onConfigLoaded = (onConfigLoaded) => {
    if (this.flowConfig !== null) {
      onConfigLoaded();
    } else {
      this.onConfigLoadedListener.push(onConfigLoaded);
    }
  };

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

  setAiTools = (aiTools) => {
    this.aiTools = aiTools;
    GleapFrameManager.getInstance().sendConfigUpdate();
  };

  getAiTools = () => {
    return this.aiTools;
  };

  /**
   * Load config.
   * @returns {string}
   */
  start = () => {
    const session = GleapSession.getInstance();
    const cachedConfig = loadFromGleapCache(
      `config-${
        session.sdkKey
      }-${GleapTranslationManager.getInstance().getActiveLanguage()}`
    );
    if (cachedConfig) {
      this.applyConfig(cachedConfig);
      this.loadConfigFromServer().catch(function (e) {});
      return Promise.resolve();
    }

    return this.loadConfigFromServer();
  };

  loadConfigFromServer = () => {
    const self = this;
    return new Promise(function (resolve, reject) {
      const session = GleapSession.getInstance();
      const http = new XMLHttpRequest();
      const lang = GleapTranslationManager.getInstance().getActiveLanguage();
      http.open(
        "GET",
        session.apiUrl + "/config/" + session.sdkKey + "?lang=" + lang
      );
      http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      session.injectSession(http);
      http.onerror = function () {
        reject();
      };
      http.onreadystatechange = function (e) {
        if (http.readyState === 4) {
          if (http.status === 403) {
            clearGleapCache(`config-${session.sdkKey}-${lang}`);
            Gleap.destroy();
          }
          if (http.status === 200 || http.status === 201) {
            try {
              const config = JSON.parse(http.responseText);
              try {
                saveToGleapCache(`config-${session.sdkKey}-${lang}`, config);
              } catch (exp) {}
              self.applyConfig(config);
              return resolve();
            } catch (e) {}
          }
          reject();
        }
      };
      http.send();
    });
  };

  applyStylesFromConfig() {
    const flowConfig = this.flowConfig;

    Gleap.setStyles(
      flowConfig.color ? flowConfig.color : "#485BFF",
      flowConfig.headerColor ? flowConfig.headerColor : "#485BFF",
      flowConfig.buttonColor ? flowConfig.buttonColor : "#485BFF",
      flowConfig.backgroundColor ? flowConfig.backgroundColor : "#FFFFFF",
      parseIntWithDefault(flowConfig.borderRadius, 20),
      parseIntWithDefault(flowConfig.buttonX, 20),
      parseIntWithDefault(flowConfig.buttonY, 20),
      flowConfig.feedbackButtonPosition
    );
  }

  notifyConfigLoaded() {
    if (this.onConfigLoadedListener.length > 0) {
      for (var i = 0; i < this.onConfigLoadedListener.length; i++) {
        this.onConfigLoadedListener[i]();
      }
    }
    this.onConfigLoadedListener = [];
  }

  /**
   * Applies the Gleap config.
   * @param {*} config
   */
  applyConfig(config) {
    try {
      const flowConfig = config.flowConfig;
      this.flowConfig = flowConfig;

      // Update styles.
      this.applyStylesFromConfig();

      // Send config update.
      GleapFrameManager.getInstance().sendConfigUpdate();
      GleapFeedbackButtonManager.getInstance().updateFeedbackButtonState();
      GleapNotificationManager.getInstance().updateContainerStyle();

      if (flowConfig.enableWebReplays) {
        GleapReplayRecorder.getInstance().start();
      } else {
        GleapReplayRecorder.getInstance().stop();
      }

      if (flowConfig.enableNetworkLogs) {
        GleapNetworkIntercepter.getInstance().start();
      }

      GleapNetworkIntercepter.getInstance().setLoadAllResources(
        flowConfig.sendNetworkResources ? true : false
      );

      if (flowConfig.networkLogPropsToIgnore) {
        GleapNetworkIntercepter.getInstance().setFilters(
          flowConfig.networkLogPropsToIgnore
        );
      }

      if (flowConfig.networkLogBlacklist) {
        GleapNetworkIntercepter.getInstance().setBlacklist(
          flowConfig.networkLogBlacklist
        );
      }

      GleapTranslationManager.getInstance().updateRTLSupport();

      Gleap.enableShortcuts(flowConfig.enableShortcuts ? true : false);

      if (config.aiBar) {
        GleapAiChatbarManager.getInstance().setConfig(config.aiBar);
      }

      this.notifyConfigLoaded();
    } catch (e) {}
  }
}
