import {
  GleapFrameManager,
  GleapFeedbackButtonManager,
  GleapConfigManager,
} from "./Gleap";

export default class GleapTranslationManager {
  overrideLanguage = "";
  isRTLLayout = false;

  // GleapTranslationManager singleton
  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new GleapTranslationManager();
    }
    return this.instance;
  }

  /**
   * Returns the language to override the default language.
   * @returns {string}
   */
  getOverrideLanguage() {
    return this.overrideLanguage;
  }

  /**
   * Sets the language to override the default language.
   * @param {*} language
   */
  setOverrideLanguage(language) {
    this.overrideLanguage = language;
  }

  updateRTLSupport() {
    // Update RTL support.
    const flowConfig = GleapConfigManager.getInstance().getFlowConfig();

    this.isRTLLayout = false;
    if (
      flowConfig &&
      flowConfig.localizationOptions &&
      flowConfig.localizationOptions.rtl
    ) {
      this.isRTLLayout = true;
    }

    GleapFeedbackButtonManager.getInstance().updateFeedbackButtonState();
    GleapFrameManager.getInstance().updateFrameStyle();
  }

  getActiveLanguage() {
    var language = "en";
    if (typeof navigator !== "undefined") {
      language = navigator.language.toLowerCase();
    }
    if (this.overrideLanguage && this.overrideLanguage !== "") {
      language = this.overrideLanguage.toLowerCase();
    }

    return language;
  }

  static translateText(key) {
    if (!key) {
      return "";
    }

    const flowConfig = GleapConfigManager.getInstance().getFlowConfig();
    const staticTranslation = flowConfig.staticTranslations;

    if (staticTranslation && staticTranslation[key]) {
      return staticTranslation[key];
    }

    return key;
  }

  static translateTextWithVars(key, vars) {
    if (!key) {
      return "";
    }

    var template = this.translateText(key);
    if (!template) {
      return "";
    }

    return template.replace(/{(\w+)}/g, function (_, key) {
      return vars[key];
    });
  }
}
