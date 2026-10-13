/**
 * @jest-environment jsdom
 */
import { frameTargetOrigin, isSafeNavigationUrl, isScriptUrl, originMatchesUrl } from './GleapMessageSecurity';

describe('isSafeNavigationUrl (default url handler)', () => {
  test.each(['https://example.com/a?b=c', 'http://example.com', 'mailto:help@example.com', 'tel:+4312345', '/pricing', 'docs/page'])(
    'allows %s',
    (url) => {
      expect(isSafeNavigationUrl(url)).toBe(true);
    }
  );

  test.each([
    'javascript:alert(1)',
    'JAVASCRIPT:alert(1)',
    ' javascript:alert(1)',
    'java\tscript:alert(1)',
    'java\nscript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'blob:https://example.com/x',
    'myapp://settings',
    '',
    undefined,
    null,
    {},
  ])('rejects %p', (url) => {
    expect(isSafeNavigationUrl(url)).toBe(false);
  });
});

describe('isScriptUrl (guard in front of custom url handlers)', () => {
  test('flags script schemes and non-links', () => {
    expect(isScriptUrl('javascript:alert(1)')).toBe(true);
    expect(isScriptUrl('java\tscript:alert(1)')).toBe(true);
    expect(isScriptUrl('data:text/html,x')).toBe(true);
    expect(isScriptUrl('vbscript:x')).toBe(true);
    expect(isScriptUrl('')).toBe(true);
    expect(isScriptUrl(undefined)).toBe(true);
  });

  test('lets app deep links and web links through', () => {
    expect(isScriptUrl('myapp://settings')).toBe(false);
    expect(isScriptUrl('https://example.com')).toBe(false);
    expect(isScriptUrl('/relative')).toBe(false);
  });
});

describe('originMatchesUrl', () => {
  test('matches the exact origin of the configured URL', () => {
    expect(originMatchesUrl('https://outboundmedia.gleap.io', 'https://outboundmedia.gleap.io')).toBe(true);
    expect(originMatchesUrl('https://outboundmedia.gleap.io', 'https://outboundmedia.gleap.io/modal')).toBe(true);
  });

  test('rejects prefixes and look-alikes that a substring check accepted', () => {
    expect(originMatchesUrl('https://outboundmedia.gl', 'https://outboundmedia.gleap.io')).toBe(false);
    expect(originMatchesUrl('https://outboundmedia.gleap', 'https://outboundmedia.gleap.io/modal')).toBe(false);
    expect(originMatchesUrl('https://outboundmedia', 'https://outboundmedia.gleap.io')).toBe(false);
    expect(originMatchesUrl('https://', 'https://outboundmedia.gleap.io')).toBe(false);
    expect(originMatchesUrl('null', 'https://outboundmedia.gleap.io')).toBe(false);
    expect(originMatchesUrl('', 'https://outboundmedia.gleap.io')).toBe(false);
    expect(originMatchesUrl('https://outboundmedia.gleap.io', undefined)).toBe(false);
  });
});

describe('frameTargetOrigin', () => {
  test('pins a same-origin (about:blank bootstrapped) frame to our origin', () => {
    const frame = document.createElement('iframe');
    document.body.appendChild(frame);
    expect(frameTargetOrigin(frame, 'https://messenger-app.gleap.io')).toBe(window.location.origin);
  });

  test('pins a cross-origin (src fallback) frame to the frame URL origin', () => {
    const frame = {
      contentWindow: {
        get location() {
          return {
            get origin() {
              throw new Error('SecurityError');
            },
          };
        },
      },
    };
    expect(frameTargetOrigin(frame, 'https://messenger-app.gleap.io/chatbar')).toBe('https://messenger-app.gleap.io');
  });

  test("falls back to '*' for opaque or unknown origins", () => {
    expect(frameTargetOrigin({ contentWindow: { location: { origin: 'null' } } }, 'https://x.example')).toBe('*');
    expect(frameTargetOrigin({}, 'not a url')).toBe('*');
  });
});
