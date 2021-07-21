import BugBattle from "./BugBattle";

export const translateText = (key, overrideLanguage) => {
  const instance = BugBattle.getInstance();

  var language = navigator.language;
  if (overrideLanguage !== "") {
    language = overrideLanguage;
  }

  var customTranslation = {};
  const translationKeys = Object.keys(instance.customTranslation);
  for (let i = 0; i < translationKeys.length; i++) {
    const translationKey = translationKeys[i];
    if (language && language.includes(translationKey)) {
      if (instance.customTranslation[translationKey]) {
        customTranslation = instance.customTranslation[translationKey];
      }
    }
  }

  if (customTranslation[key]) {
    return customTranslation[key];
  }

  return key;
};
