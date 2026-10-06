/**
 * @jest-environment jsdom
 */
import GleapAdminManager from './GleapAdminManager';
import {
  GLEAP_ADMIN_ORIGINS,
  GLEAP_DEFAULT_ADMIN_ORIGIN,
  isGleapAdminOrigin,
  resolveGleapAdminOrigin,
} from './GleapAdminOrigins';

const LOOKALIKES = [
  'https://app.gleap.ai.evil.com',
  'https://app.gleap.io.evil.com',
  'https://evilgleap.ai',
  'https://evilgleap.io',
  'https://evil.app.gleap.ai',
  'https://gleap.ai',
  'https://app.gleap.ai:8443',
  'http://app.gleap.ai',
  'http://app.gleap.io',
  'https://APP.GLEAP.AI',
  'https://app.gleap.ai/',
  'null',
  '',
  undefined,
  null,
  ['https://app.gleap.ai'],
];

describe('admin origin allowlist', () => {
  it('is exactly the two dashboard origins', () => {
    expect([...GLEAP_ADMIN_ORIGINS].sort()).toEqual(['https://app.gleap.ai', 'https://app.gleap.io']);
    expect(GLEAP_DEFAULT_ADMIN_ORIGIN).toBe('https://app.gleap.ai');
  });

  it('accepts both dashboard hosts', () => {
    expect(isGleapAdminOrigin('https://app.gleap.ai')).toBe(true);
    expect(isGleapAdminOrigin('https://app.gleap.io')).toBe(true);
  });

  it.each(LOOKALIKES)('rejects %p', (origin) => {
    expect(isGleapAdminOrigin(origin)).toBe(false);
    expect(resolveGleapAdminOrigin(origin)).toBe(GLEAP_DEFAULT_ADMIN_ORIGIN);
  });

  it('keeps the opener origin for the builder', () => {
    expect(resolveGleapAdminOrigin('https://app.gleap.io')).toBe('https://app.gleap.io');
    expect(resolveGleapAdminOrigin('https://app.gleap.ai')).toBe('https://app.gleap.ai');
  });
});

describe('GleapAdminManager message origin', () => {
  let manager;
  let listeners;

  const post = (origin, payload) =>
    window.dispatchEvent(new MessageEvent('message', { origin, data: JSON.stringify(payload) }));

  const load = (origin, type = 'tours') => post(origin, { type: 'admin', name: 'load', data: { type } });

  beforeEach(() => {
    document.body.innerHTML = '';
    GleapAdminManager.instance = undefined;
    manager = GleapAdminManager.getInstance();
    // Keep the admin UI side effects out of the origin check.
    manager.initAdminHelper = jest.fn(() => manager.injectFrame());
    manager.startPageListener = jest.fn();
    listeners = [];
    const add = window.addEventListener.bind(window);
    jest.spyOn(window, 'addEventListener').mockImplementation((type, fn, opts) => {
      if (type === 'message') listeners.push(fn);
      return add(type, fn, opts);
    });
    manager.start();
  });

  afterEach(() => {
    listeners.forEach((fn) => window.removeEventListener('message', fn));
    jest.restoreAllMocks();
  });

  it.each(['https://app.gleap.ai.evil.com', 'https://evilgleap.ai', 'https://example.com'])(
    'ignores a load from %s',
    (origin) => {
      load(origin);
      expect(manager.initAdminHelper).not.toHaveBeenCalled();
      expect(manager.adminOrigin).toBeNull();
      expect(document.querySelector('.gleap-admin-frame')).toBeNull();
    }
  );

  it.each([
    ['https://app.gleap.ai', 'tours', 'https://app.gleap.ai/producttourbuilder'],
    ['https://app.gleap.io', 'tooltips', 'https://app.gleap.io/tooltipbuilder'],
  ])('loads the builder from the opener origin %s', (origin, type, src) => {
    load(origin, type);
    expect(manager.initAdminHelper).toHaveBeenCalledTimes(1);
    expect(manager.adminOrigin).toBe(origin);
    expect(document.querySelector('.gleap-admin-frame').getAttribute('src')).toBe(src);
  });

  it('defaults the builder to app.gleap.ai', () => {
    manager.injectFrame();
    expect(document.querySelector('.gleap-admin-frame').getAttribute('src')).toBe(
      'https://app.gleap.ai/producttourbuilder'
    );
  });
});
