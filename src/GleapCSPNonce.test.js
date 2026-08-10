/**
 * @jest-environment jsdom
 */

// The nonce is auto-detected at module-evaluation time (document.currentScript is only
// readable then), so every detection test has to require the module with the DOM already
// in the state under test — hence the isolated re-require instead of a top-level import.
const loadHelper = () => {
  let helper;
  jest.isolateModules(() => {
    helper = require('./GleapHelper');
  });
  return helper;
};

const addSdkScript = (nonce, { hideAttribute = false } = {}) => {
  const script = document.createElement('script');
  script.src = 'https://sdk.gleap.io/latest/index.js';
  if (nonce !== undefined) {
    if (hideAttribute) {
      // What a real browser does once the policy is applied: the content attribute reads
      // back empty while the IDL property keeps the value.
      script.setAttribute('nonce', '');
      Object.defineProperty(script, 'nonce', { value: nonce, configurable: true });
    } else {
      script.setAttribute('nonce', nonce);
    }
  }
  document.head.appendChild(script);
  return script;
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

// bootstrapGleapFrame writes into iframe.contentDocument. Replacing it with a spy is what
// lets us assert on the exact markup — the whole point of the fix is what lands in there.
const bootstrapAndCaptureMarkup = async (helper, html, url = 'https://messenger-app.gleap.io/') => {
  const writtenDoc = { open: jest.fn(), write: jest.fn(), close: jest.fn() };
  const iframe = document.createElement('iframe');
  document.body.appendChild(iframe);
  Object.defineProperty(iframe, 'contentDocument', { value: writtenDoc, configurable: true });

  global.fetch = jest.fn(() => Promise.resolve({ ok: true, text: () => Promise.resolve(html) }));

  helper.bootstrapGleapFrame(iframe, url);
  await flush();

  return { iframe, writtenDoc, markup: writtenDoc.write.mock.calls[0]?.[0] };
};

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  delete global.fetch;
  jest.restoreAllMocks();
});

describe('CSP nonce detection from the SDK script tag', () => {
  test('picks up the nonce so a correctly-nonced loader needs no configuration', () => {
    addSdkScript('r4nd0m123');
    expect(loadHelper().getGleapCSPNonce()).toBe('r4nd0m123');
  });

  // Regression: reading getAttribute('nonce') first returns "" on exactly the strict-CSP
  // pages this feature exists for, because browsers hide the content attribute.
  test('still detects the nonce when the content attribute is hidden', () => {
    addSdkScript('hidden-nonce-value', { hideAttribute: true });
    expect(loadHelper().getGleapCSPNonce()).toBe('hidden-nonce-value');
  });

  test('is null when the SDK tag carries no nonce', () => {
    addSdkScript(undefined);
    expect(loadHelper().getGleapCSPNonce()).toBeNull();
  });

  test('is null when there is no SDK tag at all', () => {
    expect(loadHelper().getGleapCSPNonce()).toBeNull();
  });
});

describe('setGleapCSPNonce', () => {
  test('overrides the auto-detected nonce', () => {
    addSdkScript('detected');
    const helper = loadHelper();
    helper.setGleapCSPNonce('configured');
    expect(helper.getGleapCSPNonce()).toBe('configured');
  });

  test('falls back to the detected nonce when passed a rejected value', () => {
    addSdkScript('detected');
    const helper = loadHelper();
    helper.setGleapCSPNonce(null);
    expect(helper.getGleapCSPNonce()).toBe('detected');
  });

  test('trims surrounding whitespace', () => {
    const helper = loadHelper();
    helper.setGleapCSPNonce('  spaced-nonce  ');
    expect(helper.getGleapCSPNonce()).toBe('spaced-nonce');
  });

  test.each([
    ['a quote that would close the attribute', 'abc" onload="alert(1)'],
    ['a tag that would break out of the markup', 'abc><script>alert(1)</script>'],
    ['a space-separated injection', 'abc onload=alert(1)'],
    ['a non-string', { nonce: 'abc' }],
    ['an empty string', ''],
  ])('rejects %s', (_label, value) => {
    const helper = loadHelper();
    helper.setGleapCSPNonce(value);
    expect(helper.getGleapCSPNonce()).toBeNull();
  });
});

describe('applyGleapCSPNonce', () => {
  test('sets both the attribute and the IDL property on a created <style>', () => {
    addSdkScript('style-nonce');
    const helper = loadHelper();
    const node = document.createElement('style');

    helper.applyGleapCSPNonce(node);

    expect(node.getAttribute('nonce')).toBe('style-nonce');
    expect(node.nonce).toBe('style-nonce');
  });

  test('returns the element for chaining', () => {
    const helper = loadHelper();
    const node = document.createElement('style');
    expect(helper.applyGleapCSPNonce(node)).toBe(node);
  });

  test('leaves the element untouched when there is no nonce', () => {
    const helper = loadHelper();
    const node = document.createElement('style');

    helper.applyGleapCSPNonce(node);

    expect(node.hasAttribute('nonce')).toBe(false);
  });

  test('does not throw on a null element', () => {
    const helper = loadHelper();
    expect(() => helper.applyGleapCSPNonce(null)).not.toThrow();
  });
});

describe('bootstrapGleapFrame — nonce stamping on the written document', () => {
  const APP_HTML =
    '<html><head><link href="/static/css/main.css" rel="stylesheet">' +
    '<style>body{margin:0}</style></head>' +
    '<body><script src="/static/js/main.60ab06fe.js"></script></body></html>';

  // The core of #141769: the app bundle is parser-inserted by doc.write, so it gets neither
  // 'strict-dynamic' propagated trust nor the benefit of a host allowlist. Only a nonce works.
  test('stamps the nonce onto the app bundle script', async () => {
    addSdkScript('bundle-nonce');
    const { markup } = await bootstrapAndCaptureMarkup(loadHelper(), APP_HTML);

    expect(markup).toContain(
      '<script nonce="bundle-nonce" src="https://messenger-app.gleap.io/static/js/main.60ab06fe.js">'
    );
  });

  test('stamps the nonce onto the injected route-setter script', async () => {
    addSdkScript('route-nonce');
    const { markup } = await bootstrapAndCaptureMarkup(loadHelper(), APP_HTML);

    expect(markup).toContain('<script nonce="route-nonce">try{history.replaceState(');
  });

  test('stamps the nonce onto inline <style> tags', async () => {
    addSdkScript('css-nonce');
    const { markup } = await bootstrapAndCaptureMarkup(loadHelper(), APP_HTML);

    expect(markup).toContain('<style nonce="css-nonce">body{margin:0}</style>');
  });

  test('still sets the SPA route before the app bundle runs', async () => {
    addSdkScript('order-nonce');
    const { markup } = await bootstrapAndCaptureMarkup(
      loadHelper(),
      APP_HTML,
      'https://messenger-app.gleap.io/conversation'
    );

    expect(markup.indexOf('history.replaceState')).toBeLessThan(markup.indexOf('main.60ab06fe.js'));
    expect(markup).toContain('"/conversation"');
  });

  test('does not double-stamp a tag that already carries a nonce', async () => {
    addSdkScript('dedupe-nonce');
    const { markup } = await bootstrapAndCaptureMarkup(
      loadHelper(),
      '<html><head><script nonce="server-side" src="/static/js/main.js"></script></head></html>'
    );

    expect(markup).toContain('<script nonce="server-side" src=');
    expect(markup).not.toContain('nonce="dedupe-nonce" nonce=');
  });

  // Non-CSP pages are the overwhelming majority — they must keep byte-identical markup.
  test('writes unchanged markup when there is no nonce', async () => {
    const { markup } = await bootstrapAndCaptureMarkup(loadHelper(), APP_HTML);

    expect(markup).not.toContain('nonce');
    expect(markup).toContain('<script src="https://messenger-app.gleap.io/static/js/main.60ab06fe.js">');
  });

  test('a rejected nonce never reaches the markup', async () => {
    const helper = loadHelper();
    helper.setGleapCSPNonce('abc" onload="alert(1)');
    const { markup } = await bootstrapAndCaptureMarkup(helper, APP_HTML);

    expect(markup).not.toContain('onload');
    expect(markup).not.toContain('nonce');
  });

  test('falls back to iframe.src when the bootstrap fetch fails', async () => {
    addSdkScript('fallback-nonce');
    const helper = loadHelper();
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    Object.defineProperty(iframe, 'contentDocument', {
      value: { open: jest.fn(), write: jest.fn(), close: jest.fn() },
      configurable: true,
    });
    global.fetch = jest.fn(() => Promise.reject(new Error('CORS')));

    helper.bootstrapGleapFrame(iframe, 'https://messenger-app.gleap.io/');
    await flush();

    expect(iframe.src).toBe('https://messenger-app.gleap.io/');
  });
});

// A CSP that blocks the bootstrap chain used to fail with no Gleap-attributable console
// output at all — the launcher just never appeared (#143226). These pin the diagnostics.
describe('bootstrapGleapFrame — CSP/network failure diagnostics', () => {
  const bootstrapFailingFetch = async (helper, url) => {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    Object.defineProperty(iframe, 'contentDocument', {
      value: { open: jest.fn(), write: jest.fn(), close: jest.fn() },
      configurable: true,
    });
    global.fetch = jest.fn(() => Promise.reject(new TypeError('Failed to fetch')));
    helper.bootstrapGleapFrame(iframe, url);
    await flush();
    return iframe;
  };

  test('a failing bootstrap fetch warns once, names the URL, and links the CSP docs', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const helper = loadHelper();

    const iframe = await bootstrapFailingFetch(helper, 'https://messenger-app.gleap.io/chatbar');

    expect(warn).toHaveBeenCalledTimes(1);
    const message = warn.mock.calls[0][0];
    expect(message).toContain('https://messenger-app.gleap.io/chatbar');
    expect(message).toContain('Content-Security-Policy');
    expect(message).toContain('https://docs.gleap.io/documentation/javascript/content-security-policy');
    // The warning must not replace the fallback — working setups keep working.
    expect(iframe.src).toBe('https://messenger-app.gleap.io/chatbar');
  });

  test('the same failing URL does not warn twice, a different URL does', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const helper = loadHelper();

    await bootstrapFailingFetch(helper, 'https://messenger-app.gleap.io/chatbar');
    await bootstrapFailingFetch(helper, 'https://messenger-app.gleap.io/chatbar');
    expect(warn).toHaveBeenCalledTimes(1);

    await bootstrapFailingFetch(helper, 'https://outboundmedia.gleap.io/banner');
    expect(warn).toHaveBeenCalledTimes(2);
  });

  const bootstrapAndCaptureViolationListener = async (helper) => {
    const listeners = {};
    const writtenDoc = {
      open: jest.fn(),
      write: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn((name, fn) => {
        listeners[name] = fn;
      }),
    };
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    Object.defineProperty(iframe, 'contentDocument', { value: writtenDoc, configurable: true });
    const html = '<html><head><script src="/static/js/main.js"></script></head><body></body></html>';
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, text: () => Promise.resolve(html) }));
    helper.bootstrapGleapFrame(iframe, 'https://messenger-app.gleap.io/');
    await flush();
    return { writtenDoc, violationListener: listeners['securitypolicyviolation'] };
  };

  test('a CSP violation inside the bootstrapped frame is surfaced with URI and directive', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const helper = loadHelper();

    const { writtenDoc, violationListener } = await bootstrapAndCaptureViolationListener(helper);

    // Attached after open() — open() wipes listeners, so earlier attachment would be lost.
    expect(writtenDoc.open.mock.invocationCallOrder[0]).toBeLessThan(
      writtenDoc.addEventListener.mock.invocationCallOrder[0]
    );
    expect(violationListener).toEqual(expect.any(Function));

    violationListener({
      blockedURI: 'wss://sockets.gleap.io',
      effectiveDirective: 'connect-src',
      disposition: 'enforce',
    });

    expect(warn).toHaveBeenCalledTimes(1);
    const message = warn.mock.calls[0][0];
    expect(message).toContain('wss://sockets.gleap.io');
    expect(message).toContain('connect-src');
    expect(message).toContain('https://docs.gleap.io/documentation/javascript/content-security-policy');
  });

  test('duplicate violations warn once; Report-Only violations stay silent', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const helper = loadHelper();

    const { violationListener } = await bootstrapAndCaptureViolationListener(helper);

    const violation = {
      blockedURI: 'https://messenger-app.gleap.io/static/js/main.js',
      effectiveDirective: 'script-src-elem',
      disposition: 'enforce',
    };
    violationListener(violation);
    violationListener(violation);
    expect(warn).toHaveBeenCalledTimes(1);

    violationListener({
      blockedURI: 'https://messenger-app.gleap.io/static/css/main.css',
      effectiveDirective: 'style-src-elem',
      disposition: 'report',
    });
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
