// Standalone survey embed (published as survey-embed.js, a separate small bundle).
//
//   <script src="https://sdk.gleap.io/latest/survey-embed.js" async></script>
//   <div data-gleap-survey="SURVEY_ID" data-api-key="SDK_KEY" data-mode="inline"></div>
//
// data-mode:   inline (default) — renders in the element, as tall as the survey
//              popup  — opens as a card (data-format="full" for full screen), after data-delay seconds
//              tab    — a side tab (data-label, data-color, data-position="left|right") opening the survey
// data-api-key / data-region / data-language: used when this script boots the SDK itself. A page that
//              already runs the Gleap SDK keeps its own setup.
// data-field-<key>="value": hidden field values.
//
// The SDK keeps one messenger frame per page, so one inline survey per page.

const SDK_SRC = 'https://sdk.gleap.io/latest/index.js';
const PROCESSED_ATTR = 'data-gleap-survey-ready';

const currentScript = typeof document !== 'undefined' ? document.currentScript : null;
const scriptData = (currentScript && currentScript.dataset) || {};

let sdkPromise = null;
let inlineMounted = false;

const readFields = (element) => {
  const fields = {};
  const data = element.dataset || {};
  Object.keys(data).forEach((key) => {
    if (key.indexOf('field') === 0 && key.length > 5) {
      const fieldKey = key.charAt(5).toLowerCase() + key.slice(6);
      fields[fieldKey] = String(data[key]);
    }
  });
  return fields;
};

const loadSdk = () => {
  if (window.Gleap && typeof window.Gleap.initialize === 'function') {
    return Promise.resolve(window.Gleap);
  }
  if (sdkPromise) {
    return sdkPromise;
  }
  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = scriptData.sdkSrc || SDK_SRC;
    script.async = true;
    if (currentScript && currentScript.nonce) {
      script.nonce = currentScript.nonce;
    }
    script.onload = () => (window.Gleap ? resolve(window.Gleap) : reject(new Error('Gleap SDK missing')));
    script.onerror = () => reject(new Error('Gleap SDK failed to load'));
    (document.head || document.body).appendChild(script);
  });
  return sdkPromise;
};

const bootSdk = (Gleap, element) => {
  const instance = typeof Gleap.getInstance === 'function' ? Gleap.getInstance() : null;
  if (instance && instance.initialized) {
    return true;
  }

  const apiKey = element.getAttribute('data-api-key') || scriptData.apiKey;
  if (!apiKey) {
    console.warn('[Gleap] survey embed: data-api-key is missing.');
    return false;
  }

  const region = element.getAttribute('data-region') || scriptData.region;
  if (region && region !== 'eu' && typeof Gleap.setRegion === 'function') {
    Gleap.setRegion(region);
  }
  const language = element.getAttribute('data-language') || scriptData.language;
  if (language) {
    Gleap.setLanguage(language);
  }

  // Minimal mode: the survey only — no launcher, no in-app messages.
  Gleap.showFeedbackButton(false);
  Gleap.setDisableInAppNotifications(true);
  Gleap.initialize(apiKey);
  return true;
};

const createTab = (Gleap, element, surveyId, options) => {
  const tab = document.createElement('button');
  tab.type = 'button';
  tab.textContent = element.getAttribute('data-label') || 'Feedback';
  tab.setAttribute('aria-label', tab.textContent);

  const left = element.getAttribute('data-position') === 'left';
  const style = tab.style;
  style.position = 'fixed';
  style.top = '50%';
  style[left ? 'left' : 'right'] = '0';
  style.transform = 'translateY(-50%) rotate(180deg)';
  style.writingMode = 'vertical-rl';
  style.zIndex = '2147483000';
  style.border = '0';
  style.margin = '0';
  style.cursor = 'pointer';
  style.padding = '14px 9px';
  style.borderRadius = left ? '0 10px 10px 0' : '10px 0 0 10px';
  style.background = element.getAttribute('data-color') || '#0f7b6c';
  style.color = element.getAttribute('data-text-color') || '#ffffff';
  style.font = '600 13px/1 system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  style.letterSpacing = '0.01em';
  style.boxShadow = '0 6px 20px rgba(16, 24, 40, 0.18)';

  tab.addEventListener('click', () => {
    Gleap.showSurvey(surveyId, options);
  });
  document.body.appendChild(tab);
};

const mount = (element) => {
  if (element.hasAttribute(PROCESSED_ATTR)) {
    return;
  }
  element.setAttribute(PROCESSED_ATTR, 'true');

  const surveyId = element.getAttribute('data-gleap-survey');
  if (!surveyId) {
    return;
  }
  const mode = element.getAttribute('data-mode') || 'inline';
  const fields = readFields(element);

  if (mode === 'inline') {
    if (inlineMounted) {
      console.warn('[Gleap] survey embed: only one inline survey per page.');
      return;
    }
    inlineMounted = true;
  }

  loadSdk()
    .then((Gleap) => {
      if (!bootSdk(Gleap, element)) {
        return;
      }

      if (mode === 'inline') {
        Gleap.showSurvey(surveyId, { format: 'page', container: element, fields });
        return;
      }

      const options = { format: element.getAttribute('data-format') === 'full' ? 'full' : 'card', fields };
      if (mode === 'tab') {
        createTab(Gleap, element, surveyId, options);
        return;
      }

      const delay = parseFloat(element.getAttribute('data-delay') || '0');
      setTimeout(
        () => {
          Gleap.showSurvey(surveyId, options);
        },
        isNaN(delay) ? 0 : Math.max(0, delay) * 1000
      );
    })
    .catch((error) => {
      console.warn('[Gleap] survey embed:', error && error.message);
    });
};

const scan = () => {
  const elements = document.querySelectorAll('[data-gleap-survey]');
  for (let i = 0; i < elements.length; i++) {
    mount(elements[i]);
  }
};

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (!window.GleapSurveyEmbed) {
    window.GleapSurveyEmbed = { scan };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', scan);
    } else {
      scan();
    }
  } else {
    window.GleapSurveyEmbed.scan();
  }
}
