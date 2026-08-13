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
