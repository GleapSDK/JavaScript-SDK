/**
 * @jest-environment jsdom
 */
import Gleap, {
  GleapAudioManager,
  GleapConfigManager,
  GleapFeedbackButtonManager,
  GleapFrameManager,
  GleapNotificationManager,
  GleapSession,
} from './Gleap';
import * as cache from './GleapHelper';

const news = (extra = {}) => ({
  outbound: 'product-announcement',
  createdAt: new Date().toISOString(),
  cachedForGleapId: 'signup-visitor',
  data: { news: { id: 'news-1' }, text: 'Product announcement' },
  ...extra,
});

const mountNotifications = () => {
  const manager = GleapNotificationManager.getInstance();
  manager.notificationContainer = document.createElement('div');
  document.body.appendChild(manager.notificationContainer);
  return manager;
};

const visibleCards = (manager) => manager.notificationContainer.querySelectorAll('.gleap-notification-card');

beforeEach(() => {
  // Exercise the real public setter and notification renderer, without SDK startup.
  jest.spyOn(Gleap, 'getInstance').mockReturnValue({ disableInAppNotifications: false });
  jest.spyOn(GleapSession, 'getInstance').mockReturnValue({
    session: { gleapId: 'signup-visitor' },
    getName: () => 'Visitor',
  });
  jest.spyOn(GleapConfigManager, 'getInstance').mockReturnValue({ getFlowConfig: () => ({}) });
  jest.spyOn(GleapAudioManager, 'ping').mockImplementation(() => {});
  jest.spyOn(cache, 'loadFromGleapCache').mockReturnValue(null);
  jest.spyOn(cache, 'saveToGleapCache').mockImplementation(() => {});
  GleapNotificationManager.instance = undefined;
});

afterEach(() => {
  jest.restoreAllMocks();
  GleapNotificationManager.instance = undefined;
  document.body.innerHTML = '';
});

test('disabling before startup keeps cached announcements hidden without deleting them', () => {
  Gleap.setDisableInAppNotifications(true);
  const manager = mountNotifications();
  const cached = news();
  cache.loadFromGleapCache.mockReturnValue([cached]);

  manager.reloadNotificationsFromCache();

  expect(visibleCards(manager)).toHaveLength(0);
  expect(manager.notifications).toEqual([cached]);
  expect(cache.saveToGleapCache).not.toHaveBeenCalled();

  Gleap.setDisableInAppNotifications(false);
  expect(visibleCards(manager)).toHaveLength(1);
});

test('disabling immediately hides an existing card and keeps it hidden on cache reload', () => {
  const manager = mountNotifications();
  const cached = news();
  cache.loadFromGleapCache.mockReturnValue([cached]);
  manager.reloadNotificationsFromCache();
  expect(visibleCards(manager)).toHaveLength(1);

  Gleap.setDisableInAppNotifications(true);
  expect(manager.notificationContainer.children).toHaveLength(0);

  // Closing the messenger reloads cached notifications through the same path.
  manager.reloadNotificationsFromCache();
  expect(manager.notificationContainer.children).toHaveLength(0);
  expect(manager.notifications).toEqual([cached]);

  Gleap.setDisableInAppNotifications(false);
  expect(visibleCards(manager)).toHaveLength(1);
  expect(cache.saveToGleapCache).not.toHaveBeenCalled();
});

test('a directly delivered notification stays silent and hidden while disabled', () => {
  const manager = mountNotifications();
  Gleap.setDisableInAppNotifications(true);

  Gleap.showNotification(news({ sound: true }));

  expect(visibleCards(manager)).toHaveLength(0);
  expect(GleapAudioManager.ping).not.toHaveBeenCalled();
  expect(manager.notifications).toHaveLength(1);

  Gleap.setDisableInAppNotifications(false);
  expect(visibleCards(manager)).toHaveLength(1);
  expect(GleapAudioManager.ping).not.toHaveBeenCalled();
});

test('reenabling notifications still respects their page exclusions', () => {
  const manager = mountNotifications();
  manager.notifications = [news({ pageRules: [{ pageFilter: '/', pageFilterType: 'notcontains' }] })];

  Gleap.setDisableInAppNotifications(true);
  Gleap.setDisableInAppNotifications(false);

  expect(visibleCards(manager)).toHaveLength(0);
  expect(manager.notifications).toHaveLength(1);
});

test('support chat can still open while notification cards are disabled', () => {
  const frame = { setAppMode: jest.fn(), showWidget: jest.fn(), hideWidget: jest.fn() };
  jest.spyOn(GleapFrameManager, 'getInstance').mockReturnValue(frame);
  const buttonManager = jest.spyOn(GleapFeedbackButtonManager, 'getInstance');

  Gleap.setDisableInAppNotifications(true);
  Gleap.open();

  expect(frame.setAppMode).toHaveBeenCalledWith('widget');
  expect(frame.showWidget).toHaveBeenCalledTimes(1);
  expect(frame.hideWidget).not.toHaveBeenCalled();
  expect(buttonManager).not.toHaveBeenCalled();
});
