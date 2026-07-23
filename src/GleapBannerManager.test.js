/**
 * @jest-environment jsdom
 */
import { bootstrapGleapFrame } from './GleapHelper';
import GleapBannerManager from './GleapBannerManager';

// Stub the barrel so the real GleapBannerManager loads without the full SDK.
jest.mock('./Gleap', () => ({
  __esModule: true,
  default: {},
  GleapFrameManager: { getInstance: jest.fn(() => ({ urlHandler: jest.fn() })) },
}));

jest.mock('./GleapHelper', () => ({
  bootstrapGleapFrame: jest.fn(),
}));

const HOME = 'https://communitise.com/';
const SUBPAGE = 'https://communitise.com/communities/123/feed';

const homeOnlyBanner = () => ({
  format: 'inline',
  pageRules: [{ pageFilter: HOME, pageFilterType: 'is' }],
  pageFilter: HOME,
  pageFilterType: 'is',
});

const bannerVisible = () => document.body.querySelector('.gleap-b') !== null;

beforeEach(() => {
  document.body.innerHTML = '';
  document.body.className = '';
  GleapBannerManager.instance = null;
  bootstrapGleapFrame.mockClear();
});

describe('banner page rules across SPA navigations', () => {
  test('banner without page rules shows immediately and stays', () => {
    const bm = GleapBannerManager.getInstance();
    bm.showBanner({ format: 'inline' });
    expect(bannerVisible()).toBe(true);

    bm.checkPageRulesForUrl(SUBPAGE);
    expect(bannerVisible()).toBe(true);
  });

  test('page-ruled banner hides when navigating to an excluded page and re-appears on an allowed one', () => {
    const bm = GleapBannerManager.getInstance();
    bm.showBanner(homeOnlyBanner());
    // jsdom URL (http://localhost/) fails the "is" rule, so it starts pending.
    expect(bannerVisible()).toBe(false);

    bm.checkPageRulesForUrl(HOME);
    expect(bannerVisible()).toBe(true);

    bm.checkPageRulesForUrl(SUBPAGE);
    expect(bannerVisible()).toBe(false);

    bm.checkPageRulesForUrl(HOME);
    expect(bannerVisible()).toBe(true);
  });

  test('banner arriving on an excluded page is kept pending, not consumed', () => {
    const bm = GleapBannerManager.getInstance();
    bm.showBanner(homeOnlyBanner());
    expect(bannerVisible()).toBe(false);
    expect(bm.bannerData).not.toBeNull();

    bm.checkPageRulesForUrl(HOME);
    expect(bannerVisible()).toBe(true);
  });

  test('same URL is only evaluated once per change', () => {
    const bm = GleapBannerManager.getInstance();
    bm.showBanner(homeOnlyBanner());
    bm.checkPageRulesForUrl(HOME);
    expect(bannerVisible()).toBe(true);

    const injectSpy = jest.spyOn(bm, 'injectBannerUI');
    bm.checkPageRulesForUrl(HOME);
    bm.checkPageRulesForUrl(HOME);
    expect(injectSpy).not.toHaveBeenCalled();
  });

  test('user dismissal is final — navigation does not resurrect the banner', () => {
    const bm = GleapBannerManager.getInstance();
    bm.showBanner(homeOnlyBanner());
    bm.checkPageRulesForUrl(HOME);
    expect(bannerVisible()).toBe(true);

    // Simulate the banner iframe posting banner-close (user clicked X).
    window.dispatchEvent(
      new MessageEvent('message', {
        data: JSON.stringify({ type: 'BANNER', name: 'banner-close' }),
        origin: 'https://outboundmedia.gleap.io',
      })
    );
    expect(bannerVisible()).toBe(false);
    expect(bm.bannerData).toBeNull();

    bm.checkPageRulesForUrl(SUBPAGE);
    bm.checkPageRulesForUrl(HOME);
    expect(bannerVisible()).toBe(false);
  });
});
