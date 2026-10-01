/**
 * @jest-environment jsdom
 */

// What capture requests must keep private: the black boxes painted over screenshots, and the page
// recording (rrweb) used where there is no screen capture. Both follow the rules bug reports use
// (GleapInputMasking) plus flowConfig.capture.maskSelectors.

const mockReplayRecorder = {
  customOptions: {},
  pauseForCapture: jest.fn(() => false),
  resumeAfterCapture: jest.fn(),
};

jest.mock('./Gleap', () => ({
  __esModule: true,
  default: {},
  GleapNetworkIntercepter: { getInstance: () => ({ getRequests: () => [], stopped: false, setStopped: () => {} }) },
  GleapConsoleLogManager: { getInstance: () => ({ getLogs: () => [] }) },
  GleapReplayRecorder: { getInstance: () => mockReplayRecorder },
}));

import { buildMaskSelector, collectMaskRects } from './GleapCaptureScreenshot';
import { applyPrivacyVeil, buildVeilRules } from './GleapCaptureVeil';
import { describeElement, PageRecording } from './GleapCaptureRecorder';
import { unpack } from '@rrweb/packer';

// jsdom has no layout: elements get the rect in their data-rect attribute ("x,y,width,height").
const fakeRect = function () {
  const value = this.getAttribute && this.getAttribute('data-rect');
  const [x, y, width, height] = value ? value.split(',').map(Number) : [0, 0, 0, 0];
  return { left: x, top: y, right: x + width, bottom: y + height, x, y, width, height };
};
const originalRect = Element.prototype.getBoundingClientRect;
beforeAll(() => {
  Element.prototype.getBoundingClientRect = fakeRect;
});
afterAll(() => {
  Element.prototype.getBoundingClientRect = originalRect;
});

const rectsFor = (options) => collectMaskRects(options).map((r) => [r.x, r.y, r.width, r.height].join(','));

describe('screenshot black boxes', () => {
  test('private fields, masked and blocked elements, maskSelectors and payment frames; nothing else', () => {
    document.body.innerHTML = `
      <input data-rect="0,0,10,10" value="Jane Doe">
      <input data-rect="0,20,10,10" type="password" value="hunter2">
      <input data-rect="0,40,10,10" autocomplete="one-time-code" value="123456">
      <input data-rect="0,60,10,10" autocomplete="cc-number" value="4242">
      <input data-rect="0,80,10,10" autocomplete="section-pay cc-csc" value="123">
      <input data-rect="0,100,10,10" class="gl-mask" value="secret">
      <textarea data-rect="0,120,10,10" gleap-ignore="value">note</textarea>
      <p data-rect="0,140,10,10" class="rr-mask">IBAN</p>
      <div data-rect="0,160,10,10" class="gl-block">salary</div>
      <div data-rect="0,180,10,10" class="rr-block">blocked</div>
      <div data-rect="0,200,10,10" class="secret-panel">tax id</div>
      <iframe data-rect="0,220,10,10" title="Secure card payment input frame"></iframe>
      <iframe data-rect="0,240,10,10" src="https://js.stripe.com/v3/elements-inner-card.html"></iframe>
      <p data-rect="0,260,10,10">Visible text</p>
      <div class="bb-feedback-button rr-block" data-rect="0,280,10,10"></div>
      <div class="gleap-capture-root rr-block gl-block" data-rect="0,300,10,10"></div>
      <div class="gleap-frame-container rr-block" data-rect="0,320,10,10"><input type="password" data-rect="0,320,5,5"></div>`;

    expect(rectsFor({ maskSelectors: ['.secret-panel'] }).sort()).toEqual(
      [
        '0,20,10,10',
        '0,40,10,10',
        '0,60,10,10',
        '0,80,10,10',
        '0,100,10,10',
        '0,120,10,10',
        '0,140,10,10',
        '0,160,10,10',
        '0,180,10,10',
        '0,200,10,10',
        '0,220,10,10',
        '0,240,10,10',
      ].sort()
    );
  });

  test("the site's replay options: classes (string or RegExp), selectors and maskAllInputs", () => {
    document.body.innerHTML = `
      <div data-rect="0,0,10,10" class="private">a</div>
      <div data-rect="0,20,10,10" class="pii-card">b</div>
      <div data-rect="0,40,10,10" data-private>c</div>
      <input data-rect="0,60,10,10" value="any value">`;

    expect(
      rectsFor({
        privacyOptions: { blockClass: 'private', maskTextClass: /^pii-/, maskTextSelector: '[data-private]' },
      }).sort()
    ).toEqual(['0,0,10,10', '0,20,10,10', '0,40,10,10'].sort());
    expect(rectsFor({ privacyOptions: { maskAllInputs: true } })).toEqual(['0,60,10,10']);
  });

  test('fields inside open shadow roots', () => {
    document.body.innerHTML = '<fancy-field></fancy-field>';
    const root = document.querySelector('fancy-field').attachShadow({ mode: 'open' });
    root.innerHTML = '<input data-rect="5,5,10,10" type="password" value="shadow-secret"><input data-rect="5,25,10,10">';

    expect(rectsFor({})).toEqual(['5,5,10,10']);
  });

  test('an invalid mask selector does not switch off the others', () => {
    expect(buildMaskSelector({ blockSelector: '[[broken' }, ['.ok', '::nope(', 42])).toBe(
      '.rr-block, .gl-block, .rr-mask, .gl-mask, .ok'
    );

    document.body.innerHTML =
      '<div data-rect="0,0,10,10" class="gl-block"></div><div data-rect="0,20,10,10" class="ok"></div>';
    expect(rectsFor({ maskSelectors: ['[[broken', '.ok'] }).sort()).toEqual(['0,0,10,10', '0,20,10,10']);
  });

  test('boxes of elements in a same-origin frame are offset by the frame and clipped to it', () => {
    document.body.innerHTML = '<iframe data-rect="100,100,50,50"></iframe>';
    const frame = document.querySelector('iframe');
    frame.contentWindow.Element.prototype.getBoundingClientRect = fakeRect;
    const frameDocument = frame.contentDocument;
    frameDocument.body.innerHTML =
      '<input type="password" data-rect="10,10,20,20"><input type="password" data-rect="40,40,30,30">';

    expect(rectsFor({}).sort()).toEqual(['110,110,20,20', '140,140,10,10']);
  });
});

describe('privacy veil over screen recordings', () => {
  // jsdom can't evaluate :is() with :not(... *); the plain form of each rule (what browsers without
  // :is() get) shows which elements a rule covers.
  const veiledIds = (privacyOptions, maskSelectors) => {
    const selectors = buildVeilRules(privacyOptions, maskSelectors).map((entry) =>
      (entry.fallback || entry.rules[0]).replace(/\s*\{[^}]*\}\s*$/, '')
    );
    return Array.from(document.querySelectorAll('[id]'))
      .filter((element) => selectors.some((selector) => element.matches(selector)))
      .map((element) => element.id);
  };

  test('covers what screenshots mask: private fields, masked and blocked elements, maskSelectors, payment frames', () => {
    document.body.innerHTML = `
      <input id="name" value="Jane Doe">
      <input id="password" type="password">
      <input id="otp" autocomplete="one-time-code">
      <input id="card" autocomplete="cc-number">
      <input id="csc" autocomplete="section-pay cc-csc">
      <input id="marked" class="gl-mask">
      <textarea id="ignored" gleap-ignore="value"></textarea>
      <div gleap-ignore="value"><input id="ignored-inner"><input id="ignored-checkbox" type="checkbox"></div>
      <p id="iban" class="rr-mask">IBAN</p>
      <div id="salary" class="gl-block">salary</div>
      <div id="blocked" class="rr-block">blocked</div>
      <div id="tax" class="secret-panel">tax id</div>
      <iframe id="titled-frame" title="Secure card payment input frame"></iframe>
      <iframe id="stripe-frame" src="https://js.stripe.com/v3/elements-inner-card.html"></iframe>
      <iframe id="video" src="https://www.youtube.com/embed/abc"></iframe>
      <p id="visible">Visible text</p>
      <button id="pay">Pay</button>`;

    expect(veiledIds({}, ['.secret-panel'])).toEqual([
      'password',
      'otp',
      'card',
      'csc',
      'marked',
      'ignored',
      'ignored-inner',
      'iban',
      'salary',
      'blocked',
      'tax',
      'titled-frame',
      'stripe-frame',
    ]);
  });

  test("the site's replay options: classes, selectors and maskAllInputs", () => {
    document.body.innerHTML = `
      <input id="name" value="Jane">
      <select id="plan"><option>Pro</option></select>
      <input id="agree" type="checkbox">
      <div id="private-class" class="private">a</div>
      <div id="private-attr" data-private>b</div>
      <p id="visible">c</p>`;

    expect(veiledIds({ maskAllInputs: true, blockClass: 'private', maskTextSelector: '[data-private]' }, [])).toEqual([
      'name',
      'plan',
      'private-class',
      'private-attr',
    ]);
  });

  test('stays on the page until removed or the page is left; RegExp class names found now and later', async () => {
    document.body.innerHTML = `
      <input id="password" type="password">
      <span id="pii" class="pii-card">4242</span>
      <p id="visible">Visible</p>`;
    const filterOf = (id) => window.getComputedStyle(document.getElementById(id)).filter || '';
    const ruleText = () =>
      Array.from(document.querySelectorAll('style'))
        .map((style) => Array.from(style.sheet.cssRules, (rule) => rule.cssText).join('\n'))
        .join('\n');

    const veil = applyPrivacyVeil({ privacyOptions: { maskTextClass: /^pii-/ }, maskSelectors: [] });
    expect(filterOf('password')).toBe('blur(12px)');
    expect(filterOf('visible')).not.toContain('blur');
    expect(ruleText()).toContain('.pii-card');

    const later = document.createElement('div');
    later.className = 'pii-iban';
    document.body.appendChild(later);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(ruleText()).toContain('.pii-iban');

    veil.remove();
    veil.remove();
    expect(document.querySelectorAll('style').length).toBe(0);
    expect(filterOf('password')).not.toContain('blur');

    applyPrivacyVeil({});
    expect(document.querySelectorAll('style').length).toBe(1);
    window.dispatchEvent(new Event('pagehide'));
    expect(document.querySelectorAll('style').length).toBe(0);
  });
});

describe('page recordings (no screen capture)', () => {
  const record = (html, options = {}) =>
    new Promise((resolve, reject) => {
      document.body.innerHTML = html;
      const recording = new PageRecording({
        maxDurationSec: 60,
        privacyOptions: options.privacyOptions || {},
        maskSelectors: options.maskSelectors || [],
        onTick: () => {},
        onError: reject,
        onStop: (result) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ result, file: JSON.parse(reader.result) });
          reader.onerror = reject;
          reader.readAsText(result.blob);
        },
      });
      recording.start();
      const field = document.querySelector('#typed');
      if (field) {
        field.value = 'typed-while-recording';
        field.dispatchEvent(new Event('input', { bubbles: true }));
      }
      setTimeout(() => recording.stop(), 20);
    });

  test('every input is masked; masked, blocked and maskSelectors elements stay out; the capture bar stays out', async () => {
    const { result, file } = await record(
      `<input value="Jane Doe"><input id="typed" type="text"><textarea>my note</textarea>
       <p class="gl-mask">IBAN DE89</p><p class="rr-mask">rr text</p>
       <div class="gl-block">salary 123</div><div class="secret-panel">tax id 99</div>
       <div class="gleap-capture-root rr-block gl-block"><span>Go to where the issue happens</span></div>
       <p>Visible text</p>`,
      { maskSelectors: ['.secret-panel'] }
    );
    const recorded = JSON.stringify(file.events.map((event) => (file.packed ? unpack(event) : event)));

    [
      'Jane Doe',
      'typed-while-recording',
      'my note',
      'IBAN DE89',
      'rr text',
      'salary 123',
      'tax id 99',
      'Go to where',
    ].forEach((secret) => expect(recorded).not.toContain(secret));
    expect(recorded).toContain('Visible text');
    expect(result.method).toBe('rrweb');
    expect(result.type).toBe('application/json');
    expect(file).toEqual(
      expect.objectContaining({ type: 'rrweb', packed: true, baseUrl: window.location.origin, startDate: result.startedAt })
    );
  });

  test('the session replay pauses meanwhile and resumes afterwards', async () => {
    mockReplayRecorder.pauseForCapture.mockReturnValueOnce(true);
    mockReplayRecorder.resumeAfterCapture.mockClear();
    await record('<p>page</p>');
    expect(mockReplayRecorder.resumeAfterCapture).toHaveBeenCalledTimes(1);
  });
});

describe('timeline labels', () => {
  test('fields are named, never their value; text in masked areas is left out', () => {
    document.body.innerHTML = `
      <label for="email">Email</label><input id="email" value="jane@example.com">
      <input id="pw" type="password" aria-label="Password" value="hunter2">
      <div class="rr-mask"><button id="pay">Pay 1,234 EUR</button></div>
      <button id="save" title="Save">Save changes</button>`;

    expect(describeElement(document.getElementById('email'), {})).toBe('field "Email"');
    expect(describeElement(document.getElementById('pw'), {})).toBe('field "Password"');
    expect(describeElement(document.getElementById('pay'), {})).toBe('button');
    expect(describeElement(document.getElementById('save'), {})).toBe('button "Save"');
  });
});
