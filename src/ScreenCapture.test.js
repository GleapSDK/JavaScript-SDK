/**
 * @jest-environment jsdom
 */

import { startScreenCapture } from './ScreenCapture';

// jsdom implements none of the Web Animations API, so the roots and elements under test get it
// installed by hand. That is exactly what makes this suite useful: every getAnimations() call the
// capture makes is counted, and the regression this guards against is calling it per element.
const fakeAnimation = (target, property = 'opacity') => ({
  effect: {
    target,
    getKeyframes: () => [{ offset: 0, [property]: '0' }, { offset: 1, [property]: '1' }],
  },
});

const installRootAnimations = (root, animations) => {
  root.getAnimations = jest.fn(() => animations);
  return root.getAnimations;
};

// Counts per-ELEMENT getAnimations() calls — the quadratic pattern this fix removed.
const spyOnElementGetAnimations = () => {
  const calls = [];
  Object.defineProperty(Element.prototype, 'getAnimations', {
    configurable: true,
    writable: true,
    value: function () {
      calls.push(this);
      return [];
    },
  });
  return calls;
};

const capturedAttr = (html, selector) =>
  new DOMParser().parseFromString(html, 'text/html').querySelector(selector)?.getAttribute('bb-web-animations');

describe('startScreenCapture — animation capture', () => {
  let elementCalls;

  beforeEach(() => {
    document.body.innerHTML = '';
    delete document.getAnimations;
    elementCalls = spyOnElementGetAnimations();
  });

  afterEach(() => {
    delete Element.prototype.getAnimations;
    delete document.getAnimations;
  });

  test('resolves animations from the document once, never per element', async () => {
    document.body.innerHTML = '<div id="a"></div>'.repeat(50);
    const animated = document.getElementById('a');
    const docGetAnimations = installRootAnimations(document, [fakeAnimation(animated)]);

    await startScreenCapture(true);

    expect(docGetAnimations).toHaveBeenCalledTimes(1);
    // The whole point: walking 50+ elements must not produce 50+ style-flushing calls.
    expect(elementCalls).toHaveLength(0);
  });

  test('records the computed value of each animated property on the animated element', async () => {
    document.body.innerHTML = '<div id="plain"></div><div id="fx"></div>';
    const fx = document.getElementById('fx');
    fx.style.opacity = '0.42';
    installRootAnimations(document, [fakeAnimation(fx, 'opacity')]);

    const result = await startScreenCapture(true);

    expect(capturedAttr(result.html, '#fx')).toBe(JSON.stringify({ opacity: '0.42' }));
    // 'offset' is keyframe bookkeeping, not a CSS property, and elements without animations
    // must stay untouched.
    expect(capturedAttr(result.html, '#fx')).not.toContain('offset');
    expect(capturedAttr(result.html, '#plain')).toBeNull();
  });

  test('picks up animations inside shadow trees, which document.getAnimations() does not cross', async () => {
    document.body.innerHTML = '<div id="host"></div>';
    const host = document.getElementById('host');
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<span id="dot"></span>';
    const dot = shadow.getElementById('dot');
    dot.style.opacity = '0.7';

    // Mirrors real browsers: the document knows nothing about the shadow tree's animations.
    const docGetAnimations = installRootAnimations(document, []);
    const shadowGetAnimations = installRootAnimations(shadow, [fakeAnimation(dot, 'opacity')]);

    const result = await startScreenCapture(true);

    expect(docGetAnimations).toHaveBeenCalledTimes(1);
    // Once per shadow ROOT, not once per element inside it.
    expect(shadowGetAnimations).toHaveBeenCalledTimes(1);
    expect(elementCalls).toHaveLength(0);
    expect(capturedAttr(result.html, '#dot')).toBe(JSON.stringify({ opacity: '0.7' }));
  });

  test('a root without getAnimations support still captures', async () => {
    document.body.innerHTML = '<div id="a">hello</div>';
    // document.getAnimations left undefined — older browsers.

    const result = await startScreenCapture(true);

    expect(result.html).toContain('hello');
    expect(capturedAttr(result.html, '#a')).toBeNull();
    expect(elementCalls).toHaveLength(0);
  });

  test('a throwing getAnimations does not abort the capture', async () => {
    document.body.innerHTML = '<div id="a">hello</div>';
    document.getAnimations = () => {
      throw new Error('style flush failed');
    };

    const result = await startScreenCapture(true);

    expect(result.html).toContain('hello');
  });
});

// Masking itself, and its consistency with replays, is covered in GleapInputMasking.test.js. These
// are the parts only the screenshot has.
describe('startScreenCapture — masked form fields', () => {
  const parse = (html) => new DOMParser().parseFromString(html, 'text/html');

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('a masked select loses its selected option, so the choice does not show', async () => {
    document.body.innerHTML =
      '<select id="plan" class="rr-mask"><option value="basic">Basic</option><option value="diagnosis" selected>Diagnosis</option></select>' +
      '<select id="size"><option value="s">S</option><option value="m" selected>M</option></select>';

    const doc = parse((await startScreenCapture(true)).html);

    expect(doc.querySelector('#plan').getAttribute('bb-data-value')).toBe('*********');
    expect(doc.querySelector('#plan option[selected]')).toBeNull();
    // Ordinary selects are captured as before.
    expect(doc.querySelector('#size').getAttribute('bb-data-value')).toBe('m');
    expect(doc.querySelector('#size option[selected]').value).toBe('m');
  });

  test('a masked textarea keeps no text of its own; the renderer fills it from bb-data-value', async () => {
    document.body.innerHTML = '<textarea id="note" class="rr-mask">initial secret</textarea>';
    document.getElementById('note').value = 'typed secret';

    const doc = parse((await startScreenCapture(true)).html);

    expect(doc.querySelector('#note').textContent).toBe('');
    expect(doc.querySelector('#note').getAttribute('bb-data-value')).toBe('************');
  });

  test('fields inside gl-block areas, which the renderer leaves blank, are masked', async () => {
    document.body.innerHTML = '<div class="gl-block"><input id="iban"></div>';
    document.getElementById('iban').value = 'DE89370400440532013000';

    const html = (await startScreenCapture(true)).html;

    expect(html).not.toContain('DE89370400440532013000');
  });

  test('without replay options, only the rules that always apply mask a field', async () => {
    document.body.innerHTML = '<input id="pw" type="password"><input id="name">';
    document.getElementById('pw').value = 'hunter2';
    document.getElementById('name').value = 'Jane';

    const doc = parse((await startScreenCapture(true)).html);

    expect(doc.querySelector('#pw').getAttribute('bb-data-value')).toBe('*******');
    expect(doc.querySelector('#name').getAttribute('bb-data-value')).toBe('Jane');
  });
});
