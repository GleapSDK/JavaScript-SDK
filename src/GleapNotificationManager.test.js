import { GleapTabCommunication, GleapSession, GleapAudioManager } from './Gleap';
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

describe('page rules — render-time evaluation (#141052)', () => {
  // Mirrors the HaltH config: an outbound notification excluded from the
  // insurance-extension flow via notcontains "Extend".
  const pageRuledNotification = (text = 'campaign') => ({
    outbound: `outbound-${text}`,
    actionType: 'notification',
    createdAt: new Date().toISOString(),
    pageRules: [{ pageFilter: 'Extend', pageFilterType: 'notcontains' }],
    data: { text },
  });
  const plainNotification = (text = 'plain') => ({
    outbound: `outbound-${text}`,
    createdAt: new Date().toISOString(),
    data: { text },
  });

  const ALLOWED_URL = 'https://business.halth.com/dashboard';
  const EXCLUDED_URL = 'https://business.halth.com/insurance?mode=extend';

  const setUrl = (href) => {
    global.window = { location: { href } };
  };

  // Rendered bubbles are observable as 'gleap-notification-item' elements
  // appended to the (fake) container.
  const renderedItems = (nm) =>
    nm.notificationContainer.appendChild.mock.calls
      .map((call) => call[0])
      .filter((el) => el.className === 'gleap-notification-item');

  beforeEach(() => {
    GleapSession.getInstance.mockReturnValue({ session: { gleapId: 'user-1' }, getName: () => 'Lukas' });
    GleapAudioManager.ping.mockClear();
    loadFromGleapCache.mockReset();
    saveToGleapCache.mockReset();
    // The suite runs in the node environment; renderNotifications only needs
    // createElement + property assignments, so a minimal stub is enough.
    global.document = { createElement: jest.fn(() => ({})) };
    setUrl(ALLOWED_URL);
  });

  afterEach(() => {
    delete global.window;
    delete global.document;
  });

  test('renders a page-ruled bubble on an allowed page', () => {
    const nm = withContainer(GleapNotificationManager.getInstance());
    nm.notifications = [pageRuledNotification()];

    nm.renderNotifications();

    expect(renderedItems(nm)).toHaveLength(1);
  });

  test('hides the bubble on an excluded page WITHOUT dropping it from memory', () => {
    setUrl(EXCLUDED_URL);
    const nm = withContainer(GleapNotificationManager.getInstance());
    const notification = pageRuledNotification();
    nm.notifications = [notification];

    nm.renderNotifications();

    expect(renderedItems(nm)).toHaveLength(0);
    // Still held for re-display on allowed pages.
    expect(nm.notifications).toEqual([notification]);
  });

  test('URL change cycle: shown on allowed page, hidden on excluded, shown again', () => {
    const nm = withContainer(GleapNotificationManager.getInstance());
    nm.notifications = [pageRuledNotification()];

    nm.checkPageRulesForUrl(ALLOWED_URL);
    expect(renderedItems(nm)).toHaveLength(1);

    nm.notificationContainer.appendChild.mockClear();
    setUrl(EXCLUDED_URL);
    nm.checkPageRulesForUrl(EXCLUDED_URL);
    expect(renderedItems(nm)).toHaveLength(0);

    nm.notificationContainer.appendChild.mockClear();
    setUrl(ALLOWED_URL);
    nm.checkPageRulesForUrl(ALLOWED_URL);
    expect(renderedItems(nm)).toHaveLength(1);
  });

  test('checkPageRulesForUrl re-renders only once per URL', () => {
    const nm = GleapNotificationManager.getInstance();
    const renderSpy = jest.spyOn(nm, 'renderNotifications').mockImplementation(() => {});
    nm.notifications = [pageRuledNotification()];

    nm.checkPageRulesForUrl(ALLOWED_URL);
    nm.checkPageRulesForUrl(ALLOWED_URL);

    expect(renderSpy).toHaveBeenCalledTimes(1);
  });

  test('checkPageRulesForUrl skips re-rendering when nothing is page-ruled', () => {
    const nm = GleapNotificationManager.getInstance();
    const renderSpy = jest.spyOn(nm, 'renderNotifications').mockImplementation(() => {});
    nm.notifications = [plainNotification()];

    nm.checkPageRulesForUrl('https://a.example.com/1');
    nm.checkPageRulesForUrl('https://a.example.com/2');

    expect(renderSpy).not.toHaveBeenCalled();
  });

  test('legacy single pageFilter notifications also trigger re-evaluation', () => {
    const nm = GleapNotificationManager.getInstance();
    const renderSpy = jest.spyOn(nm, 'renderNotifications').mockImplementation(() => {});
    nm.notifications = [{ outbound: 'o1', data: { text: 'x' }, pageFilter: '/x', pageFilterType: 'notcontains' }];

    nm.checkPageRulesForUrl('https://a.example.com/1');

    expect(renderSpy).toHaveBeenCalledTimes(1);
  });

  test('cached page-ruled notifications survive a reload on an excluded page but stay hidden', () => {
    setUrl(EXCLUDED_URL);
    const nm = withContainer(GleapNotificationManager.getInstance());
    const cached = pageRuledNotification();
    loadFromGleapCache.mockReturnValue([cached]);

    nm.reloadNotificationsFromCache();

    expect(nm.notifications).toEqual([cached]);
    expect(renderedItems(nm)).toHaveLength(0);
  });

  test('a notification arriving on an excluded page is stored + persisted (not consumed), without a ping', () => {
    setUrl(EXCLUDED_URL);
    const nm = withContainer(GleapNotificationManager.getInstance());
    jest.spyOn(nm, 'renderNotifications').mockImplementation(() => {});
    const notification = { ...pageRuledNotification(), sound: true };

    nm.showNotification(notification);

    expect(nm.notifications).toEqual([notification]);
    expect(saveToGleapCache).toHaveBeenCalledWith(nm.unreadNotificationsKey, [notification]);
    expect(GleapAudioManager.ping).not.toHaveBeenCalled();
  });

  test('a notification arriving on an allowed page still pings', () => {
    const nm = withContainer(GleapNotificationManager.getInstance());
    jest.spyOn(nm, 'renderNotifications').mockImplementation(() => {});

    nm.showNotification({ ...pageRuledNotification(), sound: true });

    expect(GleapAudioManager.ping).toHaveBeenCalled();
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
