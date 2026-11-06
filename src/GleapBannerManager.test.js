/**
 * @jest-environment jsdom
 */
import GleapBannerManager, { bodyClipsInlineBanner, closedBannerEventName } from './GleapBannerManager';

const mockUrlHandler = jest.fn();
const mockLogEvent = jest.fn();
const mockStreamEvents = jest.fn();
const mockSession = { session: { gleapId: 'gleap-1' } };
jest.mock('./Gleap', () => ({
  __esModule: true,
  default: {},
  GleapFrameManager: { getInstance: jest.fn(() => ({ urlHandler: mockUrlHandler })) },
  GleapSession: { getInstance: jest.fn(() => mockSession) },
  GleapStreamedEvent: { getInstance: jest.fn(() => ({ logEvent: mockLogEvent, streamEvents: mockStreamEvents })) },
}));

jest.mock('./GleapHelper', () => ({
  bootstrapGleapFrame: jest.fn(),
}));

const style = (overflowX, overflowY = overflowX) => ({ overflowX, overflowY });

describe('bodyClipsInlineBanner', () => {
  test('body overflow is propagated to the viewport while the root is visible', () => {
    expect(bodyClipsInlineBanner(style('visible'), style('hidden'))).toBe(false);
    expect(bodyClipsInlineBanner(style('visible'), style('visible'))).toBe(false);
  });

  test('a visible body never clips', () => {
    expect(bodyClipsInlineBanner(style('hidden'), style('visible'))).toBe(false);
  });

  test('body clips when both root and body overflow are not visible', () => {
    expect(bodyClipsInlineBanner(style('hidden'), style('hidden'))).toBe(true);
    expect(bodyClipsInlineBanner(style('auto'), style('clip'))).toBe(true);
    expect(bodyClipsInlineBanner(style('hidden'), style('visible', 'auto'))).toBe(true);
  });

  test('missing styles do not clip', () => {
    expect(bodyClipsInlineBanner(null, style('hidden'))).toBe(false);
    expect(bodyClipsInlineBanner(style('hidden'), {})).toBe(false);
  });
});

describe('GleapBannerManager inline clip layout', () => {
  const manager = GleapBannerManager.getInstance();
  let styleEl;

  const show = (format) => {
    manager.injectBannerUI({ format });
    const frame = document.querySelector('.gleap-b-frame');
    window.dispatchEvent(
      new MessageEvent('message', {
        data: JSON.stringify({ type: 'BANNER', name: 'banner-data-set' }),
        source: frame.contentWindow,
      })
    );
  };

  afterEach(() => {
    manager.removeBannerUI();
    styleEl?.remove();
    styleEl = null;
    document.documentElement.style.removeProperty('--gleap-b-body-padding-top');
  });

  const setPageCss = (css) => {
    styleEl = document.createElement('style');
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  };

  test('app shells that clip body get the padding layout, keeping their own padding', () => {
    setPageCss('html, body { height: 100%; overflow: hidden; } body { padding-top: 12px; }');
    show('inline');
    expect(document.body.classList.contains('gleap-b-shown')).toBe(true);
    expect(document.body.classList.contains('gleap-b-clip')).toBe(true);
    expect(document.documentElement.style.getPropertyValue('--gleap-b-body-padding-top')).toBe('12px');

    manager.removeBannerUI();
    expect(document.body.classList.contains('gleap-b-clip')).toBe(false);
  });

  test('scrolling pages keep the margin layout', () => {
    setPageCss('body { overflow: hidden; }');
    show('inline');
    expect(document.body.classList.contains('gleap-b-shown')).toBe(true);
    expect(document.body.classList.contains('gleap-b-clip')).toBe(false);
  });

  test('floating banners are not affected', () => {
    setPageCss('html, body { overflow: hidden; }');
    show('floating');
    expect(document.body.classList.contains('gleap-b-f')).toBe(true);
    expect(document.body.classList.contains('gleap-b-clip')).toBe(false);
  });
});

describe('GleapBannerManager message origin', () => {
  const manager = GleapBannerManager.getInstance();
  const post = (origin) =>
    window.dispatchEvent(
      new MessageEvent('message', {
        data: JSON.stringify({ type: 'BANNER', name: 'open-url', data: 'https://example.com' }),
        origin,
      })
    );

  beforeEach(() => mockUrlHandler.mockClear());

  test('accepts the exact banner origin', () => {
    post(new URL(manager.bannerUrl).origin);
    expect(mockUrlHandler).toHaveBeenCalledWith('https://example.com', false);
  });

  test('ignores a look-alike origin that is a prefix of the banner URL', () => {
    post('https://outboundmedia.gl');
    post('https://outboundmedia.gleap');
    expect(mockUrlHandler).not.toHaveBeenCalled();
  });
});

describe('GleapBannerManager until dismissed', () => {
  const manager = GleapBannerManager.getInstance();
  const OUTBOUND = '6aeb2bad84e85e151afe22c1';
  const banner = (extra = {}) => ({ format: 'floating', outbound: OUTBOUND, untilDismissed: true, ...extra });

  const close = () => {
    const frame = document.querySelector('.gleap-b-frame');
    window.dispatchEvent(
      new MessageEvent('message', {
        data: JSON.stringify({ type: 'BANNER', name: 'banner-close' }),
        source: frame.contentWindow,
      })
    );
  };

  const frames = () => document.querySelectorAll('.gleap-b-frame').length;

  beforeEach(() => {
    localStorage.clear();
    manager.closedReportedThisPage = new Set();
    mockSession.session = { gleapId: 'gleap-1' };
    mockLogEvent.mockClear();
    mockStreamEvents.mockClear();
  });

  afterEach(() => {
    manager.removeBannerUI();
    manager.bannerData = null;
  });

  test('closing reports the close right away and remembers it', () => {
    manager.showBanner(banner());
    expect(frames()).toBe(1);

    close();

    expect(frames()).toBe(0);
    expect(mockLogEvent).toHaveBeenCalledWith(closedBannerEventName(OUTBOUND));
    expect(mockStreamEvents).toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem('gleap-closed-banners-gleap-1'))).toEqual([OUTBOUND]);
  });

  test('a closed banner is not shown again, and the close is re-sent once per page load', () => {
    manager.showBanner(banner());
    close();
    mockLogEvent.mockClear();
    manager.closedReportedThisPage = new Set(); // next page load

    manager.showBanner(banner());
    manager.showBanner(banner());

    expect(frames()).toBe(0);
    expect(mockLogEvent).toHaveBeenCalledTimes(1);
    expect(mockLogEvent).toHaveBeenCalledWith(closedBannerEventName(OUTBOUND));
  });

  test('the closed list belongs to the contact', () => {
    manager.showBanner(banner());
    close();

    mockSession.session = { gleapId: 'gleap-2' };
    manager.showBanner(banner());

    expect(frames()).toBe(1);
  });

  test('a banner already on screen is not injected again', () => {
    manager.showBanner(banner());
    const frame = document.querySelector('.gleap-b-frame');

    manager.showBanner(banner());

    expect(frames()).toBe(1);
    expect(document.querySelector('.gleap-b-frame')).toBe(frame);
  });

  test('other banners keep today\'s behaviour', () => {
    manager.showBanner(banner({ untilDismissed: undefined }));
    const frame = document.querySelector('.gleap-b-frame');
    manager.showBanner(banner({ untilDismissed: undefined }));
    expect(document.querySelector('.gleap-b-frame')).not.toBe(frame);

    close();
    expect(mockLogEvent).not.toHaveBeenCalled();
    expect(localStorage.getItem('gleap-closed-banners-gleap-1')).toBeNull();
  });

  test('keeps at most 50 closed banners', () => {
    const ids = Array.from({ length: 55 }, (_, i) => `id-${i}`);
    ids.forEach((id) => manager.rememberClosedBanner(id));
    const stored = JSON.parse(localStorage.getItem('gleap-closed-banners-gleap-1'));
    expect(stored).toHaveLength(50);
    expect(stored[49]).toBe('id-54');
  });

  test('no session yet: nothing stored, the banner still shows', () => {
    mockSession.session = null;
    manager.showBanner(banner());
    close();
    expect(localStorage.length).toBe(0);
    expect(mockLogEvent).toHaveBeenCalledWith(closedBannerEventName(OUTBOUND));
  });
});
