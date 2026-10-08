import { GleapConfigManager } from './Gleap';

// Surveys 2.0 lifecycle messages from the messenger → event names pushed to the
// customer's own analytics. survey-closed is not forwarded.
const FORWARDED_EVENTS = {
  'survey-shown': 'gleap_survey_shown',
  'survey-step-viewed': 'gleap_survey_step_viewed',
  'survey-answered': 'gleap_survey_answered',
  'survey-completed': 'gleap_survey_completed',
};

const isForwardingEnabled = (data) => {
  if (data && data.forward === true) {
    return true;
  }
  try {
    const flowConfig = GleapConfigManager.getInstance().getFlowConfig();
    return !!(flowConfig && flowConfig.surveyAnalyticsForwarding === true);
  } catch (exp) {
    return false;
  }
};

/**
 * Event parameters: survey id/name, step index and block key only. Answer
 * values are never forwarded.
 */
export const surveyAnalyticsParams = (data) => {
  const params = {};
  if (!data || typeof data !== 'object') {
    return params;
  }
  if (data.surveyId != null) params.survey_id = String(data.surveyId);
  if (typeof data.surveyName === 'string' && data.surveyName) params.survey_name = data.surveyName;
  if (typeof data.stepIndex === 'number' && Number.isFinite(data.stepIndex)) params.step_index = data.stepIndex;
  if (typeof data.key === 'string' && data.key) params.block_key = data.key;
  return params;
};

/**
 * Pushes a survey lifecycle message to Google Tag Manager (window.dataLayer),
 * GA4 (gtag) and Meta Pixel (fbq) when analytics forwarding is enabled for the
 * survey (data.forward) or the project (flowConfig.surveyAnalyticsForwarding).
 * Off by default; every sink is optional and failures are swallowed.
 * @returns {boolean} whether the event was forwarded
 */
export const forwardSurveyAnalyticsEvent = (name, data) => {
  const eventName = FORWARDED_EVENTS[name];
  if (!eventName || typeof window === 'undefined' || !isForwardingEnabled(data)) {
    return false;
  }
  const params = surveyAnalyticsParams(data);

  try {
    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event: eventName, ...params });
    }
  } catch (exp) {}

  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, { ...params });
    }
  } catch (exp) {}

  try {
    if (typeof window.fbq === 'function') {
      window.fbq('trackCustom', eventName, { ...params });
    }
  } catch (exp) {}

  return true;
};
