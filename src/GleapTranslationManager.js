import { GleapFrameManager } from "./Gleap";

export default class GleapTranslationManager {
  customTranslation = {};
  overrideLanguage = "";

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
    GleapFrameManager.getInstance().sendConfigUpdate();
  }

  /**
   * Sets the custom translations.
   * @param {*} customTranslation 
   */
  setCustomTranslation(customTranslation) {
    this.customTranslation = customTranslation;
  }

  static translateText(key) {
    const instance = GleapTranslationManager.getInstance();

    var language = "en";
    if (typeof navigator !== "undefined") {
      navigator.language.substring(0, 2).toLowerCase();
    }
    if (instance.overrideLanguage && instance.overrideLanguage !== "") {
      language = instance.overrideLanguage.toLowerCase();
    }

    var customTranslation = {};
    const translationKeys = Object.keys(instance.customTranslation);
    for (var i = 0; i < translationKeys.length; i++) {
      const translationKey = translationKeys[i];
      if (language && translationKey && language === translationKey.toLowerCase()) {
        if (instance.customTranslation[translationKey]) {
          customTranslation = instance.customTranslation[translationKey];
        }
      }
    }

    if (customTranslation[key]) {
      return customTranslation[key];
    }

    if (!key) {
      return "";
    }

    return key;
  }
}
