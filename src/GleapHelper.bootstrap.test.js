/**
 * @jest-environment jsdom
 */
import { bootstrapGleapFrame, warnOnCSPViolation, isHttpDocument, ROUTE_FAILED_EVENT } from './GleapHelper';

const MODAL_URL = 'https://outboundmedia.gleap.io/modal';
const BASE_HREF = 'https://outboundmedia.gleap.io/';

const appendFrame = () => {
  const iframe = document.createElement('iframe');
  document.body.appendChild(iframe);
  return iframe;
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const okResponse = (html) => Promise.resolve({ ok: true, text: () => Promise.resolve(html) });

let warn;

beforeEach(() => {
  document.body.innerHTML = '';
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  delete global.fetch;
});

describe('bootstrapGleapFrame on a regular http(s) page', () => {
  it('fetches the app document from the Gleap origin', async () => {
    expect(isHttpDocument()).toBe(true);
    global.fetch = jest.fn(() => okResponse('<html><head></head><body></body></html>'));
    const iframe = appendFrame();

    bootstrapGleapFrame(iframe, MODAL_URL);
    await flush();

    expect(global.fetch).toHaveBeenCalledWith(MODAL_URL, { mode: 'cors', credentials: 'omit' });
  });

  it('keeps the bootstrapped document when the app route was applied', async () => {
    global.fetch = jest.fn(() => okResponse('<html><head><script></script></head><body></body></html>'));
    const iframe = appendFrame();
    // Give the frame a same-origin http document URL, as browsers do after doc.open() (jsdom
    // keeps about:blank, against which no path can be set — see the next test).
    iframe.src = 'http://localhost/host.html';

    bootstrapGleapFrame(iframe, MODAL_URL);
    await flush();

    expect(iframe.contentWindow.location.pathname).toBe('/modal');
    expect(warn).not.toHaveBeenCalled();
    expect(iframe.getAttribute('src')).toBe('http://localhost/host.html');
  });

  it('loads the frame directly when the app route could not be applied to the written document', async () => {
    // replaceState is refused on some origins (sandboxed, file://, exotic schemes — and jsdom's
    // about:blank). The route script swallows that, and the app router would then match
    // nothing: a blank frame.
    global.fetch = jest.fn(() => okResponse('<html><head><script></script></head><body></body></html>'));
    const iframe = appendFrame();
    const listener = jest.fn();
    iframe.addEventListener(ROUTE_FAILED_EVENT, listener);

    bootstrapGleapFrame(iframe, MODAL_URL);
    await flush();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(iframe.getAttribute('src')).toBe(MODAL_URL);
  });

  it('loads the frame directly when the fetch fails', async () => {
    global.fetch = jest.fn(() => Promise.reject(new TypeError('Failed to fetch')));
    const iframe = appendFrame();

    bootstrapGleapFrame(iframe, MODAL_URL);
    await flush();

    expect(iframe.getAttribute('src')).toBe(MODAL_URL);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('never assigns src twice, however many checks conclude the same thing', async () => {
    global.fetch = jest.fn(() => okResponse('<html><head><script></script></head><body></body></html>'));
    const setSrc = jest.spyOn(HTMLIFrameElement.prototype, 'src', 'set');
    const iframe = appendFrame();
    // Route failure (about:blank, see above) and a CSP block on the bundle, back to back.
    bootstrapGleapFrame(iframe, MODAL_URL);
    await flush();
    const event = new Event('securitypolicyviolation');
    Object.assign(event, { disposition: 'enforce', effectiveDirective: 'script-src-elem', blockedURI: BASE_HREF + 'a.js' });
    iframe.contentDocument.dispatchEvent(event);

    expect(setSrc).toHaveBeenCalledTimes(1);
  });
});

describe('warnOnCSPViolation fallback hook', () => {
  const violation = (props) => {
    const event = new Event('securitypolicyviolation');
    Object.assign(event, { disposition: 'enforce', ...props });
    return event;
  };

  let doc;
  let onBlocked;

  beforeEach(() => {
    doc = document.implementation.createHTMLDocument('frame');
    onBlocked = jest.fn();
    warnOnCSPViolation(doc, { baseHref: BASE_HREF, onBlocked });
  });

  it('fires once when the host policy blocks the app bundle', () => {
    doc.dispatchEvent(violation({ effectiveDirective: 'script-src-elem', blockedURI: BASE_HREF + 'assets/index-abc.js' }));
    doc.dispatchEvent(violation({ effectiveDirective: 'script-src-elem', blockedURI: BASE_HREF + 'assets/chunk-def.js' }));

    expect(onBlocked).toHaveBeenCalledTimes(1);
  });

  it('fires when the host policy blocks the app stylesheet', () => {
    doc.dispatchEvent(violation({ effectiveDirective: 'style-src-elem', blockedURI: BASE_HREF + 'assets/index.css' }));

    expect(onBlocked).toHaveBeenCalledTimes(1);
  });

  it('ignores report-only policies', () => {
    doc.dispatchEvent(
      violation({ disposition: 'report', effectiveDirective: 'script-src', blockedURI: BASE_HREF + 'assets/index.js' }),
    );

    expect(onBlocked).not.toHaveBeenCalled();
  });

  it('ignores blocks that do not decide whether the app can render', () => {
    // A blocked websocket or image is worth a warning, but a direct src load would not fix it.
    doc.dispatchEvent(violation({ effectiveDirective: 'connect-src', blockedURI: 'wss://ws.gleap.io' }));
    doc.dispatchEvent(violation({ effectiveDirective: 'img-src', blockedURI: BASE_HREF + 'logo.png' }));
    doc.dispatchEvent(violation({ effectiveDirective: 'script-src-elem', blockedURI: 'https://cdn.example.com/x.js' }));

    expect(onBlocked).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(3);
  });
});
