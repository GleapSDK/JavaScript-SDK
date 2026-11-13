/**
 * @jest-environment jsdom
 */
import { loadFromGleapCache, saveToGleapCache } from './GleapHelper';
import GleapFrameManager, { FRAME_LOAD_TIMEOUT_MS } from './GleapFrameManager';

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
  widgetExpandMinWidth: 768,
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

// Evaluates the (min|max)-width media queries against a CSS viewport width,
// like the browser does (it can be fractional under browser zoom).
let viewportWidth;
const matchWidthQuery = (query) => {
  const min = /\(min-width:\s*([\d.]+)px\)/.exec(query);
  const max = /\(max-width:\s*([\d.]+)px\)/.exec(query);
  const width = isMobile ? 400 : viewportWidth;
  return { matches: (!min || width >= Number(min[1])) && (!max || width <= Number(max[1])) };
};

beforeEach(() => {
  isMobile = false;
  viewportWidth = 1440;
  window.matchMedia = jest.fn(matchWidthQuery);
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

    expect(fm.canExpandWidget()).toBe(false);
    expect(fm.gleapFrameContainer.classList.contains(EXPANDED_CLASS)).toBe(false);
    expect(sentSizeUpdates().pop().data).toEqual({ expandable: false, expanded: false });
  });

  it('is not expandable between the mobile and desktop breakpoints (fractional zoomed viewport)', () => {
    // At 450.5px neither `max-width: 450px` (mobile layout) nor the
    // `min-width: 451px` block holding the expanded CSS applies, so an
    // "expanded" widget would not change at all.
    viewportWidth = 450.5;
    const fm = setup();
    fm.setWidgetExpanded(true);

    expect(fm.canExpandWidget()).toBe(false);
    expect(fm.gleapFrameContainer.classList.contains(EXPANDED_CLASS)).toBe(false);
  });

  it.each([571, 767.5])('is not expandable on a %spx viewport too narrow for the expanded widget', (width) => {
    // E.g. a phone with the page zoomed out: past the mobile breakpoint, so the
    // floating widget shows, but an expanded one would cover nearly the whole page.
    loadFromGleapCache.mockImplementation((key) => (key === 'widget-expanded' ? true : null));
    viewportWidth = width;
    const fm = setup();
    fm.updateFrameStyle();

    expect(fm.canExpandWidget()).toBe(false);
    expect(fm.isWidgetExpanded()).toBe(false);
    expect(fm.gleapFrameContainer.classList.contains(EXPANDED_CLASS)).toBe(false);
  });

  it('is expandable from the expand breakpoint on', () => {
    viewportWidth = 768;
    const fm = setup();

    expect(fm.canExpandWidget()).toBe(true);
  });

  it('collapses and hides the button when a config update turns the setting off', () => {
    const fm = setup();
    fm.setWidgetExpanded(true);

    mockFlowConfig.hideExpandButton = true;
    fm.sendConfigUpdate();

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

  it('applies a stored expanded choice when the window widens past the expand breakpoint', () => {
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

describe('GleapFrameManager url handler', () => {
  let open;
  beforeEach(() => {
    open = jest.spyOn(window, 'open').mockImplementation(() => null);
  });
  afterEach(() => open.mockRestore());

  it('never opens script URLs', () => {
    const fm = setup();
    const before = window.location.href;
    fm.urlHandler('javascript:alert(document.cookie)', false);
    fm.urlHandler('java\tscript:alert(1)', false);
    fm.urlHandler('javascript:alert(1)', true);
    fm.urlHandler('data:text/html,<script>alert(1)</script>', true);
    expect(open).not.toHaveBeenCalled();
    expect(window.location.href).toBe(before);
  });

  it('opens web links in a new tab without an opener', () => {
    const fm = setup();
    fm.urlHandler('https://example.com/docs', true);
    expect(open).toHaveBeenCalledWith('https://example.com/docs', '_blank', 'noopener,noreferrer');
  });

  it('runs a custom handler for deep links but never for script URLs', () => {
    const fm = setup();
    const custom = jest.fn();
    fm.setUrlHandler(custom);
    fm.urlHandler('myapp://settings', false);
    fm.urlHandler('javascript:alert(1)', false);
    fm.urlHandler('data:text/html,x', true);
    expect(custom).toHaveBeenCalledTimes(1);
    expect(custom).toHaveBeenCalledWith('myapp://settings', false);
  });

  it("relays the messenger's open-url through the safe handler", () => {
    const fm = setup();
    const before = window.location.href;
    dispatch(fm, { name: 'open-url', data: 'javascript:alert(1)' });
    dispatch(fm, { name: 'open-url', data: 'javascript:alert(1)', newTab: true });
    expect(open).not.toHaveBeenCalled();
    expect(window.location.href).toBe(before);
  });
});

describe('GleapFrameManager opens reliably (iOS: never stuck until a reload)', () => {
  const HIDDEN = 'gleap-frame-container--hidden';
  const LOADING = 'gleap-frame-container--loading';
  const CLOSING = 'gleap-frame-container--closing';
  let warn;

  // A frame that was injected but whose messenger hasn't pinged yet.
  const setupLoading = () => {
    const fm = setup();
    fm.comReady = false;
    fm.injectedFrame = true;
    fm.gleapFrame = document.querySelector('.gleap-frame');
    fm.gleapFrameContainer.classList.add(HIDDEN);
    return fm;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.useRealTimers();
    warn.mockRestore();
  });

  it('keeps the loader up when opened again before the messenger pinged, and opens on the ping', () => {
    const fm = setupLoading();
    fm.showWidget();
    jest.advanceTimersByTime(0);
    const container = fm.gleapFrameContainer;
    expect(container.classList.contains(HIDDEN)).toBe(false);
    expect(container.classList.contains(LOADING)).toBe(true);
    expect(fm.widgetOpened).toBe(true);

    dispatch(fm, { name: 'ping' });
    jest.advanceTimersByTime(300);
    expect(container.classList.contains(LOADING)).toBe(false);
  });

  it('loads the messenger directly when the bootstrapped frame never pings, then takes the frame down', () => {
    const fm = setupLoading();
    const frame = fm.gleapFrame;
    fm.showFrameContainer(true);
    fm.armFrameLoadWatchdog(frame);

    jest.advanceTimersByTime(FRAME_LOAD_TIMEOUT_MS);
    expect(frame.getAttribute('src')).toBe(fm.frameUrl);
    expect(fm.gleapFrameContainer).not.toBeNull();

    jest.advanceTimersByTime(FRAME_LOAD_TIMEOUT_MS);
    expect(fm.gleapFrameContainer).toBeNull();
    expect(fm.injectedFrame).toBe(false);
    expect(fm.widgetOpened).toBe(false);
    expect(document.querySelector('.gleap-frame-container')).toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  it('stands the watchdog down on the first ping', () => {
    const fm = setupLoading();
    fm.armFrameLoadWatchdog(fm.gleapFrame);
    dispatch(fm, { name: 'ping' });
    jest.advanceTimersByTime(FRAME_LOAD_TIMEOUT_MS * 2);
    expect(fm.gleapFrame.getAttribute('src')).toBeNull();
    expect(fm.gleapFrameContainer).not.toBeNull();
  });

  it('forgets the connection on destroy, so messages for the next frame wait for its ping', () => {
    const fm = setup();
    fm.destroy();
    expect(fm.comReady).toBe(false);
    document.body.innerHTML = '<iframe class="gleap-frame"></iframe>';
    fm.queue = [];
    fm.sendMessage({ name: 'open-conversation', data: {} }, true);
    expect(fm.queue).toEqual([{ name: 'open-conversation', data: {} }]);
  });

  it('restarts a frame that was still loading when the page went into the back/forward cache', () => {
    const fm = setupLoading();
    fm.showFrameContainer(true);
    const inject = jest.spyOn(fm, 'injectFrame').mockImplementation(() => {});
    const instance = jest.spyOn(GleapFrameManager, 'getInstance').mockReturnValue(fm);

    fm.handlePageShow({ persisted: true });
    expect(document.querySelector('.gleap-frame-container')).toBeNull();
    expect(fm.injectedFrame).toBe(false);

    jest.advanceTimersByTime(0);
    expect(inject).toHaveBeenCalledTimes(1);
    instance.mockRestore();
  });

  it('finishes a close that was cut short by the back/forward cache and re-sends the state', () => {
    const fm = setup();
    const container = fm.gleapFrameContainer;
    container.classList.add(CLOSING);
    fm.widgetOpened = false;
    postMessage.mockClear();

    fm.handlePageShow({ persisted: true });
    expect(container.classList.contains(CLOSING)).toBe(false);
    expect(container.classList.contains(HIDDEN)).toBe(true);
    const status = postMessage.mock.calls.map(([raw]) => JSON.parse(raw)).find((m) => m.name === 'widget-status-update');
    expect(status.data).toEqual({ isWidgetOpen: false });
  });

  it('ignores a regular page load', () => {
    const fm = setupLoading();
    fm.handlePageShow({ persisted: false });
    expect(fm.gleapFrameContainer).not.toBeNull();
  });
});
