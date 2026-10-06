// Normalises the second argument of Gleap.showSurvey: a legacy format string ('survey',
// 'survey_full', 'survey_web') or an options object ({ format, fields, personalToken,
// container, resume }).
//
// format  — what the survey looks like: 'card' (corner popover / mobile bottom sheet),
//           'full' (full-viewport, Typeform style) or 'page' (inline in a container).
// appMode — how the messenger frame is mounted (sent as `format` in start-survey, which is
//           what Messenger-App builds before Surveys 2.0 read).

const APP_MODE_BY_FORMAT = {
  card: 'survey',
  full: 'survey_full',
  page: 'survey_page',
};

const FORMAT_ALIASES = {
  card: 'card',
  survey: 'card',
  full: 'full',
  survey_full: 'full',
  survey_web: 'full',
  page: 'page',
  survey_page: 'page',
};

const MAX_FIELDS = 50;
const MAX_FIELD_KEY_LENGTH = 100;
const MAX_FIELD_VALUE_LENGTH = 1000;

const resolveContainer = (container) => {
  if (!container || typeof document === 'undefined') {
    return null;
  }
  if (typeof container === 'string') {
    try {
      return document.querySelector(container);
    } catch (e) {
      return null;
    }
  }
  if (typeof container === 'object' && container.nodeType === 1) {
    return container;
  }
  return null;
};

// Hidden field values are strings (spec §2 SurveyHiddenField); anything else is dropped.
export const sanitizeSurveyFields = (fields) => {
  const result = {};
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
    return result;
  }
  const keys = Object.keys(fields).slice(0, MAX_FIELDS);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = fields[key];
    if (!key || key.length > MAX_FIELD_KEY_LENGTH) {
      continue;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      result[key] = String(value).slice(0, MAX_FIELD_VALUE_LENGTH);
    }
  }
  return result;
};

export const normalizeSurveyOptions = (formatOrOptions) => {
  const options =
    formatOrOptions && typeof formatOrOptions === 'object' ? formatOrOptions : { format: formatOrOptions };

  const legacyFormat = typeof options.format === 'string' ? options.format : '';
  const format = FORMAT_ALIASES[legacyFormat] || 'card';

  // 'survey_web' (the old standalone survey page) keeps its own app mode: it can't be closed.
  const appMode = legacyFormat === 'survey_web' ? 'survey_web' : APP_MODE_BY_FORMAT[format];

  const normalized = {
    format,
    appMode,
    fields: sanitizeSurveyFields(options.fields),
    resume: options.resume === true,
    container: format === 'page' ? resolveContainer(options.container) : null,
  };

  if (typeof options.personalToken === 'string' && options.personalToken.length > 0) {
    normalized.personalToken = options.personalToken;
  }
  if (typeof options.outboundAction === 'string' && options.outboundAction.length > 0) {
    normalized.outboundAction = options.outboundAction;
  }

  return normalized;
};
