/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "file:///C:/Users/me/AppData/Local/Programs/twinmind/resources/app.asar/dist/renderer/index.html"}
 */
import { bootstrapGleapFrame, isHttpDocument } from './GleapHelper';

const MODAL_URL = 'https://outboundmedia.gleap.io/modal';

// Electron renderers (and other desktop shells) load their page from file:// or a custom
// scheme. Bootstrapping via about:blank there would inherit that origin and the shell's CSP.
describe('bootstrapGleapFrame inside a file:// host document', () => {
  afterEach(() => {
    delete global.fetch;
  });

  it('is not treated as a web page', () => {
    expect(window.location.protocol).toBe('file:');
    expect(isHttpDocument()).toBe(false);
  });

  it('skips the about:blank bootstrap and loads the frame directly', async () => {
    global.fetch = jest.fn();
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);

    bootstrapGleapFrame(iframe, MODAL_URL);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(iframe.getAttribute('src')).toBe(MODAL_URL);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
