import de from "./i18n/de.json";
import en from "./i18n/en.json";
import es from "./i18n/es.json";
import fr from "./i18n/fr.json";
import it from "./i18n/it.json";
import nl from "./i18n/nl.json";

export const translateText = (key, overrideLanguage) => {
  let language = navigator.language;
  if (overrideLanguage !== "") {
    language = overrideLanguage;
  }

  let languagePack = en;
  if (/^de\b/.test(language)) {
    languagePack = de;
  }
  if (/^it\b/.test(language)) {
    languagePack = it;
  }
  if (/^es\b/.test(language)) {
    languagePack = es;
  }
  if (/^fr\b/.test(language)) {
    languagePack = fr;
  }
  if (/^it\b/.test(language)) {
    languagePack = it;
  }
  if (/^nl\b/.test(language)) {
    languagePack = nl;
  }

  return languagePack[key];
};
