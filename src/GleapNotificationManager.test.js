import { GleapTabCommunication, GleapSession } from './Gleap';
import { loadFromGleapCache, saveToGleapCache } from './GleapHelper';
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

describe('clearNotificationsForConversation', () => {
  const convNotification = (shareToken, text = 'hi') => ({
    outbound: `outbound-${shareToken}-${text}`,
    createdAt: new Date().toISOString(),
    data: { text, conversation: { shareToken } },
  });
  const newsNotification = { outbound: 'outbound-news', createdAt: new Date().toISOString(), data: { news: { id: 'n1' }, text: 'news' } };

  beforeEach(() => {
    loadFromGleapCache.mockReset();
    saveToGleapCache.mockReset();
  });

  test('filters the CACHE contents even when this tab holds no notifications in memory', () => {
    const nm = GleapNotificationManager.getInstance();
    const keep1 = convNotification('token-other');
    const keep2 = newsNotification;
    loadFromGleapCache.mockReturnValue([convNotification('token-read'), keep1, keep2]);

    nm.clearNotificationsForConversation('token-read');

    expect(saveToGleapCache).toHaveBeenCalledWith(nm.unreadNotificationsKey, [keep1, keep2]);
  });

  test('filters in-memory notifications and re-renders when something was removed', () => {
    const nm = GleapNotificationManager.getInstance();
    const renderSpy = jest.spyOn(nm, 'renderNotifications').mockImplementation(() => {});
    const keep = convNotification('token-other');
    nm.notifications = [convNotification('token-read'), keep];
    loadFromGleapCache.mockReturnValue(null);

    nm.clearNotificationsForConversation('token-read');

    expect(nm.notifications).toEqual([keep]);
    expect(renderSpy).toHaveBeenCalled();
  });

  test('does not re-render when nothing matched', () => {
    const nm = GleapNotificationManager.getInstance();
    const renderSpy = jest.spyOn(nm, 'renderNotifications').mockImplementation(() => {});
    nm.notifications = [convNotification('token-other')];
    loadFromGleapCache.mockReturnValue(null);

    nm.clearNotificationsForConversation('token-read');

    expect(renderSpy).not.toHaveBeenCalled();
  });

  test('broadcasts the conversation clear with shareToken and gleapId', () => {
    const nm = GleapNotificationManager.getInstance();
    loadFromGleapCache.mockReturnValue(null);

    nm.clearNotificationsForConversation('token-read');

    expect(sendMessageMock).toHaveBeenCalledWith({
      type: 'conversation-notifications-cleared',
      shareToken: 'token-read',
      gleapId: 'user-1',
    });
  });

  test('an inbound sibling-tab clear (fromOtherTab=true) does NOT re-broadcast', () => {
    const nm = GleapNotificationManager.getInstance();
    loadFromGleapCache.mockReturnValue(null);

    nm.clearNotificationsForConversation('token-read', true);

    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  test('no shareToken => no-op (no cache access, no broadcast)', () => {
    const nm = GleapNotificationManager.getInstance();

    nm.clearNotificationsForConversation(undefined);

    expect(loadFromGleapCache).not.toHaveBeenCalled();
    expect(saveToGleapCache).not.toHaveBeenCalled();
    expect(sendMessageMock).not.toHaveBeenCalled();
  });
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
