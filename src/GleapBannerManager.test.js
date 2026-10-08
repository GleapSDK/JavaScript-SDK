/**
 * @jest-environment jsdom
 */
import GleapBannerManager, { bodyClipsInlineBanner } from './GleapBannerManager';

jest.mock('./Gleap', () => ({
  __esModule: true,
  default: {},
  GleapFrameManager: { getInstance: jest.fn(() => ({ urlHandler: jest.fn() })) },
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
