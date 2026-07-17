import Gleap, { GleapNotificationManager } from './Gleap';
import GleapStreamedEvent from './GleapStreamedEvent';

// Stub the barrel so the real GleapStreamedEvent loads without a DOM or the
// SDK_VERSION Webpack global. We only drive startPageListener.
jest.mock('./Gleap', () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
  GleapFrameManager: { getInstance: jest.fn(() => ({ isOpened: () => false })) },
  GleapMetaDataManager: { getInstance: jest.fn(() => ({})) },
  GleapAiChatbarManager: { getInstance: jest.fn(() => ({})) },
  GleapNotificationManager: { getInstance: jest.fn() },
  GleapSession: { getInstance: jest.fn(() => ({})) },
  GleapAdminManager: { getInstance: jest.fn(() => ({})) },
  GleapEventManager: { notifyEvent: jest.fn() },
}));

jest.mock('./GleapHelper', () => ({
  gleapDataParser: (data) => data,
}));

describe('startPageListener — notification page-rule re-evaluation (#141052)', () => {
  let checkPageRulesForUrl;

  beforeEach(() => {
    jest.useFakeTimers();
    checkPageRulesForUrl = jest.fn();
    GleapNotificationManager.getInstance.mockReturnValue({ checkPageRulesForUrl });
    global.window = { location: { href: 'https://app.example.com/a' } };
  });

  afterEach(() => {
    jest.useRealTimers();
    delete global.window;
  });

  test('re-evaluates page rules every tick, even with page tracking disabled', () => {
    Gleap.getInstance.mockReturnValue({ disablePageTracking: true });
    const streamer = new GleapStreamedEvent();
    const logEventSpy = jest.spyOn(streamer, 'logEvent');

    streamer.startPageListener();

    jest.advanceTimersByTime(1000);
    expect(checkPageRulesForUrl).toHaveBeenCalledWith('https://app.example.com/a');
    // disablePageTracking must only suppress pageView streaming, not page rules.
    expect(logEventSpy).not.toHaveBeenCalled();

    global.window.location.href = 'https://app.example.com/b';
    jest.advanceTimersByTime(1000);
    expect(checkPageRulesForUrl).toHaveBeenLastCalledWith('https://app.example.com/b');
  });

  test('still streams pageView events when page tracking is enabled', () => {
    Gleap.getInstance.mockReturnValue({ disablePageTracking: false });
    const streamer = new GleapStreamedEvent();
    const logEventSpy = jest.spyOn(streamer, 'logEvent');

    streamer.startPageListener();
    jest.advanceTimersByTime(1000);

    expect(logEventSpy).toHaveBeenCalledWith('pageView', { page: 'https://app.example.com/a' });
    expect(checkPageRulesForUrl).toHaveBeenCalledWith('https://app.example.com/a');
  });
});
