/**
 * @jest-environment jsdom
 */
import { GleapConfigManager } from './Gleap';
import { forwardSurveyAnalyticsEvent, surveyAnalyticsParams } from './GleapSurveyAnalyticsForwarder';

jest.mock('./Gleap', () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
  GleapConfigManager: { getInstance: jest.fn() },
}));

const setFlowConfig = (flowConfig) => {
  GleapConfigManager.getInstance.mockReturnValue({ getFlowConfig: () => flowConfig });
};

const message = (extra = {}) => ({
  surveyId: 'sv_1',
  surveyName: 'Churn survey',
  version: 2,
  responseId: 'rsp_1',
  stepIndex: 1,
  key: 'nps_score',
  value: 9,
  answer: 'Too expensive',
  answers: { nps_score: 9, reason: 'secret text' },
  ...extra,
});

describe('GleapSurveyAnalyticsForwarder', () => {
  beforeEach(() => {
    setFlowConfig({});
    window.dataLayer = [];
    window.gtag = jest.fn();
    window.fbq = jest.fn();
  });

  afterEach(() => {
    delete window.dataLayer;
    delete window.gtag;
    delete window.fbq;
  });

  test('is off by default', () => {
    expect(forwardSurveyAnalyticsEvent('survey-shown', message({ forward: false }))).toBe(false);
    expect(window.dataLayer).toEqual([]);
    expect(window.gtag).not.toHaveBeenCalled();
    expect(window.fbq).not.toHaveBeenCalled();
  });

  test('forwards when the survey asks for it (data.forward)', () => {
    expect(forwardSurveyAnalyticsEvent('survey-step-viewed', message({ forward: true }))).toBe(true);
    const params = { survey_id: 'sv_1', survey_name: 'Churn survey', step_index: 1, block_key: 'nps_score' };
    expect(window.dataLayer).toEqual([{ event: 'gleap_survey_step_viewed', ...params }]);
    expect(window.gtag).toHaveBeenCalledWith('event', 'gleap_survey_step_viewed', params);
    expect(window.fbq).toHaveBeenCalledWith('trackCustom', 'gleap_survey_step_viewed', params);
  });

  test('forwards when the project enables surveyAnalyticsForwarding', () => {
    setFlowConfig({ surveyAnalyticsForwarding: true });
    expect(forwardSurveyAnalyticsEvent('survey-completed', message())).toBe(true);
    expect(window.dataLayer[0].event).toBe('gleap_survey_completed');
  });

  test('maps each lifecycle message and never forwards survey-closed', () => {
    setFlowConfig({ surveyAnalyticsForwarding: true });
    forwardSurveyAnalyticsEvent('survey-shown', message());
    forwardSurveyAnalyticsEvent('survey-step-viewed', message());
    forwardSurveyAnalyticsEvent('survey-answered', message());
    forwardSurveyAnalyticsEvent('survey-completed', message());
    expect(forwardSurveyAnalyticsEvent('survey-closed', message())).toBe(false);
    expect(forwardSurveyAnalyticsEvent('open', message())).toBe(false);
    expect(window.dataLayer.map((entry) => entry.event)).toEqual([
      'gleap_survey_shown',
      'gleap_survey_step_viewed',
      'gleap_survey_answered',
      'gleap_survey_completed',
    ]);
  });

  test('never leaks answer values', () => {
    forwardSurveyAnalyticsEvent('survey-answered', message({ forward: true }));
    forwardSurveyAnalyticsEvent('survey-completed', message({ forward: true }));
    const sent = JSON.stringify([window.dataLayer, window.gtag.mock.calls, window.fbq.mock.calls]);
    expect(sent).not.toContain('Too expensive');
    expect(sent).not.toContain('secret text');
    expect(sent).not.toContain('rsp_1');
    expect(Object.keys(window.dataLayer[0]).sort()).toEqual(['block_key', 'event', 'step_index', 'survey_id', 'survey_name']);
  });

  test('only sends defined params', () => {
    expect(surveyAnalyticsParams({ surveyId: 'sv_1', forward: true })).toEqual({ survey_id: 'sv_1' });
    expect(surveyAnalyticsParams(null)).toEqual({});
  });

  test('each sink is optional', () => {
    delete window.gtag;
    delete window.fbq;
    window.dataLayer = { push: jest.fn() }; // not an array: left alone
    expect(() => forwardSurveyAnalyticsEvent('survey-shown', message({ forward: true }))).not.toThrow();
    expect(window.dataLayer.push).not.toHaveBeenCalled();

    delete window.dataLayer;
    window.fbq = jest.fn();
    forwardSurveyAnalyticsEvent('survey-shown', message({ forward: true }));
    expect(window.fbq).toHaveBeenCalledTimes(1);
    expect(window.dataLayer).toBeUndefined();
  });

  test('a throwing sink does not stop the others', () => {
    window.gtag = jest.fn(() => {
      throw new Error('gtag broken');
    });
    expect(forwardSurveyAnalyticsEvent('survey-shown', message({ forward: true }))).toBe(true);
    expect(window.dataLayer).toHaveLength(1);
    expect(window.fbq).toHaveBeenCalledTimes(1);
  });

  test('a missing config manager means off', () => {
    GleapConfigManager.getInstance.mockImplementation(() => {
      throw new Error('not ready');
    });
    expect(forwardSurveyAnalyticsEvent('survey-shown', message())).toBe(false);
  });
});
