import de from "./i18n/de.json";
import fr from "./i18n/fr.json";
import it from "./i18n/it.json";
import nl from "./i18n/nl.json";
import cz from "./i18n/cz.json";
import es from "./i18n/es.json";
import en from "./i18n/en.json";

const translations = {
  de,
  fr,
  it,
  nl,
  cz,
  en,
  es,
};

import BugBattle from "./BugBattle";

export const translateText = (key, overrideLanguage) => {
  const instance = BugBattle.getInstance();
  const translationKeys = Object.keys(translations).concat(
    Object.keys(instance.customTranslation)
  );

  var language = navigator.language;
  if (overrideLanguage !== "") {
    language = overrideLanguage;
  }

  var languagePack = en;
  var customTranslation = {};

  for (let i = 0; i < translationKeys.length; i++) {
    const translationKey = translationKeys[i];
    if (language && language.includes(translationKey)) {
      if (translations[translationKey]) {
        languagePack = translations[translationKey];
      }
      if (instance.customTranslation[translationKey]) {
        customTranslation = instance.customTranslation[translationKey];
      }
    }
  }

  if (customTranslation[key]) {
    return customTranslation[key];
  }

  if (languagePack[key]) {
    return languagePack[key];
  }

  return key;
};
