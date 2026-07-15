import { GleapTabCommunication, GleapSession } from './Gleap';
import GleapNotificationManager from './GleapNotificationManager';

// Stub the barrel so the real GleapNotificationManager loads without a DOM or the
// SDK_VERSION Webpack global. We only drive clearAllNotifications, which reaches
// GleapTabCommunication, GleapSession and saveToGleapCache.
jest.mock('./Gleap', () => ({
  __esModule: true,
  default: {},
  GleapFeedbackButtonManager: { getInstance: jest.fn(() => ({ updateNotificationBadge: jest.fn() })) },
  GleapConfigManager: { getInstance: jest.fn(() => ({ getFlowConfig: () => ({}) })) },
  GleapSession: { getInstance: jest.fn() },
  GleapAudioManager: { ping: jest.fn() },
  GleapTranslationManager: { getInstance: jest.fn(() => ({ isRTLLayout: false })), translateText: (s) => s },
  GleapEventManager: { notifyEvent: jest.fn() },
  GleapAiChatbarManager: { getInstance: jest.fn(() => ({})) },
  GleapTabCommunication: { getInstance: jest.fn() },
}));

jest.mock('./GleapHelper', () => ({
  loadFromGleapCache: jest.fn(),
  saveToGleapCache: jest.fn(),
}));

jest.mock('./UI', () => ({
  loadIcon: jest.fn(() => ''),
}));

let sendMessageMock;

const withContainer = (nm) => {
  nm.notificationContainer = { firstChild: null, appendChild: jest.fn(), removeChild: jest.fn() };
  return nm;
};

beforeEach(() => {
  sendMessageMock = jest.fn();
  GleapTabCommunication.getInstance.mockReturnValue({ sendMessage: sendMessageMock });
  GleapSession.getInstance.mockReturnValue({ session: { gleapId: 'user-1' } });

  GleapNotificationManager.instance = null;
});

describe('clearAllNotifications — cross-tab broadcast gate', () => {
  test('a genuine clear broadcasts notifications-cleared with the current gleapId', () => {
    const nm = withContainer(GleapNotificationManager.getInstance());
    nm.clearAllNotifications();
    expect(sendMessageMock).toHaveBeenCalledWith({ type: 'notifications-cleared', gleapId: 'user-1' });
  });

  test('a UI-only clear (uiOnly=true) does NOT broadcast', () => {
    const nm = withContainer(GleapNotificationManager.getInstance());
    nm.clearAllNotifications(true);
    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  test('a clear applied from another tab (fromOtherTab=true) does NOT re-broadcast', () => {
    const nm = withContainer(GleapNotificationManager.getInstance());
    nm.clearAllNotifications(false, true);
    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  test('no notification container => early return, no broadcast', () => {
    const nm = GleapNotificationManager.getInstance();
    nm.clearAllNotifications();
    expect(sendMessageMock).not.toHaveBeenCalled();
  });
});
