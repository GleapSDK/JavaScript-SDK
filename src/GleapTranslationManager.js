import { GleapFrameManager, GleapFeedbackButtonManager, GleapSession } from "./Gleap";

export default class GleapTranslationManager {
  customTranslation = {};
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
    
    //GleapFrameManager.getInstance().sendConfigUpdate();
    //this.updateRTLSupport();
  }

  updateRTLSupport() {
    // Update RTL support.
    this.isRTLLayout = GleapTranslationManager.translateText("rtlLang") === "true";
    GleapFeedbackButtonManager.getInstance().updateFeedbackButtonState();
    GleapFrameManager.getInstance().updateFrameStyle();
  }

  /**
   * Sets the custom translations.
   * @param {*} customTranslation 
   */
  setCustomTranslation(customTranslation) {
    this.customTranslation = customTranslation;
  }

  getActiveLanguage() {
    var language = "en";
    if (typeof navigator !== "undefined") {
      language = navigator.language.substring(0, 2).toLowerCase();
    }
    if (this.overrideLanguage && this.overrideLanguage !== "") {
      language = this.overrideLanguage.toLowerCase();
    }

    return language;
  }

  static translateText(key) {
    return key;

    if (!key) {
      return "";
    }

    const instance = GleapTranslationManager.getInstance();

    var language = instance.getActiveLanguage();

    const searchForTranslationTable = (langKey) => {
      var customTranslation = null;
      const translationKeys = Object.keys(instance.customTranslation);
      for (var i = 0; i < translationKeys.length; i++) {
        const translationKey = translationKeys[i];
        if (langKey && translationKey && langKey === translationKey.toLowerCase()) {
          if (instance.customTranslation[translationKey]) {
            customTranslation = instance.customTranslation[translationKey];
          }
        }
      }

      return customTranslation;
    }

    var customTranslation = searchForTranslationTable(language);

    // Extended search for language match only.
    if (!customTranslation && language) {
      const langKeys = language.split("-");
      if (langKeys && langKeys.length > 1) {
        customTranslation = searchForTranslationTable(langKeys[0]);
      }
    }

    if (customTranslation && customTranslation[key]) {
      return customTranslation[key];
    }

    return key;
  }
}
