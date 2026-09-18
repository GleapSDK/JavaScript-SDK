/**
 * @jest-environment jsdom
 */
import Gleap, { GleapBannerManager, GleapFrameManager, GleapModalManager, GleapSession } from './Gleap';
import GleapNetworkIntercepter from './GleapNetworkIntercepter';
import { GLEAP_DEFAULT_REGION, GLEAP_REGIONS, resolveGleapRegion } from './GleapRegions';

const EU = {
  apiUrl: 'https://api.eu.gleap.ai',
  wsApiUrl: 'wss://ws.eu.gleap.ai',
  realtimeHost: 'sockets.eu.gleap.ai',
};

const US = {
  apiUrl: 'https://api.us.gleap.ai',
  wsApiUrl: 'wss://ws.us.gleap.ai',
  realtimeHost: 'sockets.us.gleap.ai',
};

const regionHosts = () => {
  const session = GleapSession.getInstance();
  return {
    apiUrl: session.apiUrl,
    wsApiUrl: session.wsApiUrl,
    realtimeHost: session.realtimeHost,
  };
};

const widgetHosts = () => ({
  frameUrl: GleapFrameManager.getInstance().frameUrl,
  bannerUrl: GleapBannerManager.getInstance().bannerUrl,
  modalUrl: GleapModalManager.getInstance().modalUrl,
});

let warnSpy;

beforeEach(() => {
  // Fresh session singleton per test so the defaults are observable.
  GleapSession.instance = undefined;
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  warnSpy.mockRestore();
});

describe('region table', () => {
  test('holds the eu and us hosts', () => {
    expect(GLEAP_REGIONS.eu).toEqual(EU);
    expect(GLEAP_REGIONS.us).toEqual(US);
    expect(GLEAP_DEFAULT_REGION).toBe('eu');
  });

  test('resolves regions case-insensitively and rejects unknown values', () => {
    expect(resolveGleapRegion('eu')).toBe('eu');
    expect(resolveGleapRegion('US')).toBe('us');
    expect(resolveGleapRegion(' Us ')).toBe('us');
    expect(resolveGleapRegion('apac')).toBeNull();
    expect(resolveGleapRegion('')).toBeNull();
    expect(resolveGleapRegion(undefined)).toBeNull();
    expect(resolveGleapRegion(null)).toBeNull();
    expect(resolveGleapRegion(42)).toBeNull();
    expect(resolveGleapRegion('toString')).toBeNull();
  });
});

describe('Gleap.setRegion', () => {
  test("defaults stay eu with today's hosts (realtimeHost left to the messenger)", () => {
    expect(Gleap.getRegion()).toBe('eu');
    expect(regionHosts()).toEqual({ apiUrl: EU.apiUrl, wsApiUrl: EU.wsApiUrl, realtimeHost: undefined });
  });

  test('us sets all three region hosts', () => {
    Gleap.setRegion('us');

    expect(Gleap.getRegion()).toBe('us');
    expect(regionHosts()).toEqual(US);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  test('eu sets all three region hosts', () => {
    Gleap.setRegion('us');
    Gleap.setRegion('eu');

    expect(Gleap.getRegion()).toBe('eu');
    expect(regionHosts()).toEqual(EU);
  });

  test('is case-insensitive', () => {
    Gleap.setRegion('US');
    expect(Gleap.getRegion()).toBe('us');
    expect(regionHosts()).toEqual(US);

    Gleap.setRegion('Eu');
    expect(Gleap.getRegion()).toBe('eu');
    expect(regionHosts()).toEqual(EU);
  });

  test('unknown region warns and changes nothing', () => {
    Gleap.setRegion('us');
    Gleap.setRegion('apac');

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain('apac');
    expect(Gleap.getRegion()).toBe('us');
    expect(regionHosts()).toEqual(US);

    Gleap.setRegion(undefined);
    expect(warnSpy).toHaveBeenCalledTimes(2);
    expect(regionHosts()).toEqual(US);
  });

  test('a manual setter after setRegion overrides only that host', () => {
    Gleap.setRegion('us');
    Gleap.setApiUrl('https://api.support.example.com');

    expect(regionHosts()).toEqual({ ...US, apiUrl: 'https://api.support.example.com' });

    Gleap.setWSApiUrl('wss://ws.support.example.com');
    expect(regionHosts()).toEqual({
      ...US,
      apiUrl: 'https://api.support.example.com',
      wsApiUrl: 'wss://ws.support.example.com',
    });

    Gleap.setRealtimeHost('sockets.support.example.com');
    expect(regionHosts()).toEqual({
      apiUrl: 'https://api.support.example.com',
      wsApiUrl: 'wss://ws.support.example.com',
      realtimeHost: 'sockets.support.example.com',
    });
    expect(Gleap.getRegion()).toBe('us');
  });

  test('setRegion after manual setters overrides the three region hosts', () => {
    Gleap.setApiUrl('https://api.support.example.com');
    Gleap.setWSApiUrl('wss://ws.support.example.com');
    Gleap.setRealtimeHost('sockets.support.example.com');
    Gleap.setRegion('us');

    expect(regionHosts()).toEqual(US);
  });

  test('never touches the global widget hosts (frame, banner, modal)', () => {
    const defaults = widgetHosts();
    expect(defaults).toEqual({
      frameUrl: 'https://messenger-app.gleap.io',
      bannerUrl: 'https://outboundmedia.gleap.io',
      modalUrl: 'https://outboundmedia.gleap.io/modal',
    });

    Gleap.setRegion('us');
    expect(widgetHosts()).toEqual(defaults);

    Gleap.setFrameUrl('https://widget.support.example.com');
    Gleap.setBannerUrl('https://banner.support.example.com');
    Gleap.setModalUrl('https://modal.support.example.com');
    const custom = widgetHosts();

    Gleap.setRegion('eu');
    Gleap.setRegion('us');
    expect(widgetHosts()).toEqual(custom);

    Gleap.setFrameUrl(defaults.frameUrl);
    Gleap.setBannerUrl(defaults.bannerUrl);
    Gleap.setModalUrl(defaults.modalUrl);
  });
});

describe('region side effects', () => {
  test("network logs skip the SDK's own eu and us traffic by default", () => {
    const intercepter = new GleapNetworkIntercepter();
    intercepter.requests = {
      1: { url: 'https://api.eu.gleap.ai/sessions' },
      2: { url: 'https://api.us.gleap.ai/sessions' },
      3: { url: 'https://example.com/data' },
    };

    expect(intercepter.getRequests().map((request) => request.url)).toEqual(['https://example.com/data']);
  });

  test('setAgentConversationUrl applies to newly attached agent conversations', () => {
    // The iframe bootstrap fetches the frame document; keep it pending.
    global.fetch = jest.fn(() => new Promise(() => {}));

    const create = () => {
      const element = document.createElement('gleap-agent-conversation');
      document.body.appendChild(element);
      return element;
    };

    expect(create()._agentConvUrl).toBe('https://outboundmedia.gleap.io/agent-conversation');

    Gleap.setRegion('us');
    expect(create()._agentConvUrl).toBe('https://outboundmedia.gleap.io/agent-conversation');

    Gleap.setAgentConversationUrl('https://media.support.example.com/agent-conversation');
    expect(create()._agentConvUrl).toBe('https://media.support.example.com/agent-conversation');

    Gleap.setAgentConversationUrl('https://outboundmedia.gleap.io/agent-conversation');
    delete global.fetch;
  });

  test('consent manager allowlist receives the messenger host in place', () => {
    const allowlist = ['example.com'];
    window.cmp_block_ignoredomains = allowlist;

    GleapFrameManager.getInstance().autoWhiteListCookieManager();
    GleapFrameManager.getInstance().autoWhiteListCookieManager();

    expect(allowlist).toEqual(['example.com', 'messenger-app.gleap.io']);
    delete window.cmp_block_ignoredomains;
  });
});
