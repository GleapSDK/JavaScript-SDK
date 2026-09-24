/**
 * @jest-environment jsdom
 */
import { loadFromGleapCache, saveToGleapCache } from './GleapHelper';
import GleapFrameManager from './GleapFrameManager';

// Stub the barrel so the real GleapFrameManager loads without the SDK_VERSION
// Webpack global. flowConfig is a mutable object so tests can flip
// hideExpandButton the way a config reload would.
const mockFlowConfig = {};
jest.mock('./Gleap', () => ({
  __esModule: true,
  default: { getInstance: jest.fn(() => ({ setGlobalDataItem: jest.fn() })) },
  GleapConfigManager: { getInstance: jest.fn(() => ({ getFlowConfig: () => mockFlowConfig })) },
  GleapFeedbackButtonManager: {
    getInstance: jest.fn(() => ({
      buttonHidden: null,
      updateNotificationBadge: jest.fn(),
      updateFeedbackButtonState: jest.fn(),
    })),
  },
  GleapTranslationManager: {
    getInstance: jest.fn(() => ({ isRTLLayout: false, getOverrideLanguage: () => '' })),
  },
  GleapNotificationManager: {
    getInstance: jest.fn(() => ({ clearAllNotifications: jest.fn(), reloadNotificationsFromCache: jest.fn() })),
  },
  GleapEventManager: { notifyEvent: jest.fn() },
  GleapBannerManager: { getInstance: jest.fn(() => ({})) },
  GleapSession: { getInstance: jest.fn(() => ({ getSession: () => ({}) })) },
}));

jest.mock('./GleapAgentToolManager', () => ({
  __esModule: true,
  default: { getInstance: jest.fn(() => ({ getAgentTools: () => [] })) },
}));

jest.mock('./GleapHelper', () => ({
  loadFromGleapCache: jest.fn(() => null),
  saveToGleapCache: jest.fn(),
  bootstrapGleapFrame: jest.fn(),
  runFunctionWhenDomIsReady: jest.fn(),
}));

jest.mock('./UI', () => ({
  widgetLoaderMarkup: jest.fn(() => ''),
  widgetMaxHeight: 700,
}));

const EXPANDED_CLASS = 'gleap-frame-container--expanded';

let isMobile;
let postMessage;
let previous;

// Builds a manager wired to a real container + iframe in the jsdom document,
// with the messenger "connected" (comReady), so sendMessage really posts.
const setup = () => {
  document.body.innerHTML =
    '<div class="gleap-frame-container"><div class="gleap-frame-container-inner"><iframe class="gleap-frame"></iframe></div></div>';
  // Every manager registers its own window resize listener; disconnect the
  // previous test's instance so it can't post into this test's iframe.
  if (previous) previous.comReady = false;
  const fm = new GleapFrameManager();
  previous = fm;
  fm.gleapFrameContainer = document.querySelector('.gleap-frame-container');
  fm.comReady = true;
  postMessage = jest.spyOn(document.querySelector('.gleap-frame').contentWindow, 'postMessage').mockImplementation(() => {});
  return fm;
};

const sentSizeUpdates = () =>
  postMessage.mock.calls.map(([raw]) => JSON.parse(raw)).filter((m) => m.name === 'widget-size-update');

const dispatch = (fm, message) => fm.listeners.forEach((listener) => listener(message));

beforeEach(() => {
  isMobile = false;
  window.matchMedia = jest.fn(() => ({ matches: isMobile }));
  Object.keys(mockFlowConfig).forEach((k) => delete mockFlowConfig[k]);
  loadFromGleapCache.mockReset().mockReturnValue(null);
  saveToGleapCache.mockReset();
});

describe('GleapFrameManager expand/collapse window', () => {
  it('starts collapsed but expandable on a desktop viewport', () => {
    const fm = setup();
    fm.updateFrameStyle();

    expect(fm.canExpandWidget()).toBe(true);
    expect(fm.isWidgetExpanded()).toBe(false);
    expect(fm.gleapFrameContainer.classList.contains(EXPANDED_CLASS)).toBe(false);
  });

  it('expands: adds the container class, persists the choice and reports it to the messenger', () => {
    const fm = setup();
    fm.setWidgetExpanded(true);

    expect(fm.gleapFrameContainer.classList.contains(EXPANDED_CLASS)).toBe(true);
    expect(saveToGleapCache).toHaveBeenCalledWith('widget-expanded', true);
    expect(sentSizeUpdates().pop()).toEqual({
      name: 'widget-size-update',
      data: { expandable: true, expanded: true },
    });
  });

  it('collapses: removes the class and clears the stored choice', () => {
    const fm = setup();
    fm.setWidgetExpanded(true);
    fm.setWidgetExpanded(false);

    expect(fm.gleapFrameContainer.classList.contains(EXPANDED_CLASS)).toBe(false);
    expect(saveToGleapCache).toHaveBeenLastCalledWith('widget-expanded', null);
    expect(sentSizeUpdates().pop().data).toEqual({ expandable: true, expanded: false });
  });

  it('restores a stored expanded choice', () => {
    loadFromGleapCache.mockImplementation((key) => (key === 'widget-expanded' ? true : null));
    const fm = setup();
    fm.updateFrameStyle();

    expect(loadFromGleapCache).toHaveBeenCalledWith('widget-expanded');
    expect(fm.isWidgetExpanded()).toBe(true);
    expect(fm.gleapFrameContainer.classList.contains(EXPANDED_CLASS)).toBe(true);
  });

  it('hideExpandButton overrides a stored expanded choice', () => {
    loadFromGleapCache.mockImplementation((key) => (key === 'widget-expanded' ? true : null));
    mockFlowConfig.hideExpandButton = true;
    const fm = setup();
    fm.updateFrameStyle();

    expect(fm.canExpandWidget()).toBe(false);
    expect(fm.isWidgetExpanded()).toBe(false);
    expect(fm.gleapFrameContainer.classList.contains(EXPANDED_CLASS)).toBe(false);
  });

  it.each(['survey', 'survey_full', 'survey_web'])('%s mode is not expandable', (mode) => {
    const fm = setup();
    fm.setWidgetExpanded(true);
    fm.setAppMode(mode);

    expect(fm.canExpandWidget()).toBe(false);
    expect(fm.gleapFrameContainer.classList.contains(EXPANDED_CLASS)).toBe(false);
    expect(sentSizeUpdates().pop().data).toEqual({ expandable: false, expanded: false });
  });

  it('is not expandable on the full-screen mobile layout', () => {
    isMobile = true;
    const fm = setup();
    fm.setWidgetExpanded(true);

    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 450px)');
    expect(fm.canExpandWidget()).toBe(false);
    expect(fm.gleapFrameContainer.classList.contains(EXPANDED_CLASS)).toBe(false);
    expect(sentSizeUpdates().pop().data).toEqual({ expandable: false, expanded: false });
  });

  it('keeps the expanded class through the news/article extended mode and back', () => {
    const fm = setup();
    fm.setWidgetExpanded(true);
    fm.setAppMode('extended');
    expect(fm.gleapFrameContainer.classList.contains(EXPANDED_CLASS)).toBe(true);

    fm.setAppMode('widget');
    expect(fm.gleapFrameContainer.classList.contains(EXPANDED_CLASS)).toBe(true);
  });

  it('handles set-widget-expanded from the messenger', () => {
    const fm = setup();
    dispatch(fm, { name: 'set-widget-expanded', data: { expanded: true } });
    expect(fm.isWidgetExpanded()).toBe(true);

    dispatch(fm, { name: 'set-widget-expanded', data: { expanded: false } });
    expect(fm.isWidgetExpanded()).toBe(false);
  });

  it('answers a refused set-widget-expanded with the real state', () => {
    isMobile = true;
    const fm = setup();
    dispatch(fm, { name: 'set-widget-expanded', data: { expanded: true } });

    expect(sentSizeUpdates().pop().data).toEqual({ expandable: false, expanded: false });
  });

  it('reports the size state once the messenger connects', () => {
    const fm = setup();
    fm.comReady = false;
    dispatch(fm, { name: 'ping' });

    expect(sentSizeUpdates().pop().data).toEqual({ expandable: true, expanded: false });
  });

  it('applies a stored expanded choice when the window widens past the mobile breakpoint', () => {
    loadFromGleapCache.mockImplementation((key) => (key === 'widget-expanded' ? true : null));
    isMobile = true;
    const fm = setup();
    fm.updateFrameStyle();
    expect(fm.gleapFrameContainer.classList.contains(EXPANDED_CLASS)).toBe(false);

    isMobile = false;
    window.dispatchEvent(new Event('resize'));
    expect(fm.gleapFrameContainer.classList.contains(EXPANDED_CLASS)).toBe(true);
    expect(sentSizeUpdates().pop().data).toEqual({ expandable: true, expanded: true });
  });

  it('resize only re-sends when the reported state changes', () => {
    const fm = setup();
    fm.sendWidgetSizeUpdate(true);
    const before = sentSizeUpdates().length;

    window.dispatchEvent(new Event('resize'));
    expect(sentSizeUpdates().length).toBe(before);

    isMobile = true;
    window.dispatchEvent(new Event('resize'));
    expect(sentSizeUpdates().length).toBe(before + 1);
    expect(sentSizeUpdates().pop().data).toEqual({ expandable: false, expanded: false });
  });
});
