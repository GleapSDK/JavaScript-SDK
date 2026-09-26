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

  test('fields inside gl-block areas are left out', async () => {
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

// jsdom does no layout, so tests that look at a placeholder's geometry give the page's elements
// their computed styles and boxes by hand.
const fakeComputedStyle = (values) => {
  const all = {
    display: 'block',
    width: 'auto',
    float: 'none',
    position: 'static',
    'vertical-align': 'baseline',
    'margin-top': '0px',
    'margin-right': '0px',
    'margin-bottom': '0px',
    'margin-left': '0px',
    ...values,
  };
  const style = { getPropertyValue: (property) => all[property] || '' };
  Object.keys(all).forEach((property) => {
    style[property.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase())] = all[property];
  });
  return style;
};

const stubComputedStyles = (stylesByElement) => {
  const getComputedStyle = window.getComputedStyle;
  jest
    .spyOn(window, 'getComputedStyle')
    .mockImplementation((element, pseudo) =>
      stylesByElement.has(element)
        ? fakeComputedStyle(stylesByElement.get(element))
        : getComputedStyle.call(window, element, pseudo)
    );
};

const box = (left, top, width, height) => ({
  x: left,
  y: top,
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
});

// A blocked element (rr-block, gl-block, or the blockClass / blockSelector replay options) reaches
// the snapshot as an empty placeholder of its size, like rrweb records it in replays.
describe('startScreenCapture — blocked elements', () => {
  const parse = (html) => new DOMParser().parseFromString(html, 'text/html');

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Private: the text, the attributes, and a nested image, link and field.
  const blockedCard = (marker) =>
    `<div ${marker} id="card" title="Jane Doe" data-user="jane@example.com" style="background: url(/avatar/jane.png)">` +
    '<h3>Jane Doe</h3><img src="/avatar/jane.png" alt="Jane Doe avatar"><a href="/users/jane">Profile</a><input id="iban">' +
    '</div><p>Public text</p>';

  test.each([
    ['rr-block', 'class="rr-block"', {}],
    ['gl-block', 'class="gl-block"', {}],
    ['the blockClass option', 'class="card private"', { blockClass: 'private' }],
    ['a blockClass RegExp', 'class="pii-card"', { blockClass: /^pii-/ }],
    ['the blockSelector option', 'data-private', { blockSelector: '[data-private]' }],
  ])('%s: only the tag, class and id of the element reach the snapshot', async (name, marker, options) => {
    document.body.innerHTML = blockedCard(marker);
    document.getElementById('iban').value = 'DE89370400440532013000';

    const html = (await startScreenCapture(true, options)).html;

    for (const value of ['Jane', 'jane', 'avatar', 'Profile', 'DE89370400440532013000']) {
      expect(html).not.toContain(value);
    }
    expect(html).toContain('Public text');

    const card = parse(html).getElementById('card');
    expect(card.tagName).toBe('DIV');
    expect(card.childNodes).toHaveLength(0);
    const otherAttributes = card.getAttributeNames().filter((attribute) => !['class', 'id', 'style'].includes(attribute));
    expect(otherAttributes).toEqual([]);
  });

  test('the placeholder takes the size the element has on the page, and renders blank', async () => {
    document.body.innerHTML = '<div class="rr-block" id="card">Jane Doe</div>';
    document.getElementById('card').getBoundingClientRect = () => box(20, 30, 312.5, 80);

    const card = parse((await startScreenCapture(true)).html).getElementById('card');

    for (const [property, value] of [
      ['box-sizing', 'border-box'],
      ['width', '312.5px'],
      ['min-width', '312.5px'],
      ['max-width', '312.5px'],
      ['height', '80px'],
      ['min-height', '80px'],
      ['max-height', '80px'],
      ['visibility', 'hidden'],
    ]) {
      expect(card.style.getPropertyValue(property)).toBe(value);
    }
    expect(card.style.getPropertyPriority('width')).toBe('important');
  });

  test('it copies where the element sits, which inline styles and attributes may have set', async () => {
    document.body.innerHTML =
      '<div class="rr-block" id="popover" style="position: absolute; top: 12px; right: 20px">Jane Doe</div>';
    const popover = document.getElementById('popover');
    stubComputedStyles(new Map([[popover, { position: 'absolute', top: '12px', right: '20px', 'margin-left': '4px' }]]));

    const placeholder = parse((await startScreenCapture(true)).html).getElementById('popover');

    expect(placeholder.style.getPropertyValue('position')).toBe('absolute');
    expect(placeholder.style.getPropertyValue('top')).toBe('12px');
    expect(placeholder.style.getPropertyValue('right')).toBe('20px');
    expect(placeholder.style.getPropertyValue('margin-left')).toBe('4px');
  });

  test('an inline image becomes an inline-block of its size, without its source', async () => {
    document.body.innerHTML = '<p>Photo: <img class="rr-block" id="photo" src="/photos/jane.png" alt="Jane Doe"></p>';
    const photo = document.getElementById('photo');
    stubComputedStyles(new Map([[photo, { display: 'inline', width: '120px', 'vertical-align': 'middle' }]]));
    photo.getBoundingClientRect = () => box(60, 10, 120, 80);

    const placeholder = parse((await startScreenCapture(true)).html).getElementById('photo');

    expect(placeholder.getAttributeNames().sort()).toEqual(['class', 'id', 'style']);
    expect(placeholder.style.getPropertyValue('display')).toBe('inline-block');
    expect(placeholder.style.getPropertyValue('width')).toBe('120px');
    expect(placeholder.style.getPropertyValue('height')).toBe('80px');
    expect(placeholder.style.getPropertyValue('vertical-align')).toBe('middle');
  });

  test('an inline element of text keeps one empty spacer per line, so the text around it stays in place', async () => {
    document.body.innerHTML =
      '<p>Ship to <span class="rr-block" id="address">1234 Long Street, Springfield</span> by Friday.</p>';
    const address = document.getElementById('address');
    stubComputedStyles(new Map([[address, { display: 'inline' }]]));
    address.getClientRects = () => [box(64, 44, 210.5, 17), box(10, 62, 90.25, 17)];

    const placeholder = parse((await startScreenCapture(true)).html).getElementById('address');

    expect(placeholder.textContent).toBe('');
    expect(placeholder.style.getPropertyValue('display')).toBe('inline');
    const [firstLine, lineBreak, secondLine] = placeholder.children;
    expect(placeholder.children).toHaveLength(3);
    expect(lineBreak.tagName).toBe('BR');
    expect(firstLine.style.getPropertyValue('display')).toBe('inline-block');
    expect(firstLine.style.getPropertyValue('width')).toBe('210.5px');
    // Without height, a spacer leaves the line as tall as the text made it.
    expect(firstLine.style.getPropertyValue('height')).toBe('0px');
    expect(secondLine.style.getPropertyValue('width')).toBe('90.25px');
  });

  test('an image inside an inline element keeps its line as tall as it made it', async () => {
    document.body.innerHTML =
      '<p>Hi <a class="rr-block" id="profile" href="/users/jane"><img id="avatar" src="/avatar/jane.png"></a> there</p>';
    const profile = document.getElementById('profile');
    const avatar = document.getElementById('avatar');
    stubComputedStyles(
      new Map([
        [profile, { display: 'inline' }],
        [avatar, { display: 'inline', width: '40px' }],
      ])
    );
    profile.getClientRects = () => [box(30, 26, 40, 17)];
    avatar.getBoundingClientRect = () => box(30, 3, 40, 40);

    const placeholder = parse((await startScreenCapture(true)).html).getElementById('profile');

    const [spacer] = placeholder.children;
    expect(placeholder.children).toHaveLength(1);
    expect(spacer.style.getPropertyValue('width')).toBe('40px');
    expect(spacer.style.getPropertyValue('height')).toBe('40px');
    expect(spacer.style.getPropertyValue('vertical-align')).toBe('baseline');
  });

  test('an inline element around block boxes becomes a block as tall as they are', async () => {
    document.body.innerHTML =
      '<div>Before <a class="rr-block" id="link" href="/users/jane"><div id="inner">Jane Doe</div></a> after</div>';
    const inner = document.getElementById('inner');
    stubComputedStyles(
      new Map([
        [document.getElementById('link'), { display: 'inline' }],
        [inner, { display: 'block', 'margin-top': '8px', 'margin-bottom': '8px' }],
      ])
    );
    inner.getBoundingClientRect = () => box(10, 40, 600, 40);

    const link = parse((await startScreenCapture(true)).html).getElementById('link');

    expect(link.hasAttribute('href')).toBe(false);
    expect(link.style.getPropertyValue('display')).toBe('block');
    expect(link.style.getPropertyValue('width')).toBe('600px');
    // The block's margins included.
    expect(link.style.getPropertyValue('height')).toBe('56px');
  });

  test('blocked elements in a shadow tree, and blocked shadow hosts, keep nothing of it', async () => {
    document.body.innerHTML = '<div id="host"></div><div class="rr-block" id="blocked-host"></div>';
    document.getElementById('host').attachShadow({ mode: 'open' }).innerHTML =
      '<div>Public info</div><div class="rr-block" id="ssn">SSN 078-05-1120</div>';
    document.getElementById('blocked-host').attachShadow({ mode: 'open' }).innerHTML = '<p>Jane Doe</p>';

    const html = (await startScreenCapture(true)).html;

    expect(html).toContain('Public info');
    expect(html).not.toContain('078-05-1120');
    expect(html).not.toContain('Jane Doe');
    const doc = parse(html);
    // The renderer moves the placeholder back into the shadow tree it came from.
    expect(doc.getElementById('ssn').getAttribute('bb-shadow-child')).toBe(
      doc.getElementById('host').getAttribute('bb-shadow-parent')
    );
    expect(doc.getElementById('blocked-host').hasAttribute('bb-shadow-parent')).toBe(false);
  });

  test('images in blocked elements are not downloaded', async () => {
    document.body.innerHTML =
      '<div class="rr-block"><img src="/avatar/jane.png"></div>' +
      '<img class="rr-block" src="/photos/jane.png"><img src="/logo.png">';
    const requested = [];
    jest.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation((method, url) => requested.push(url));
    jest.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(function () {
      this.onerror();
    });

    // Not a live site: the capture downloads the page's images to inline them.
    await startScreenCapture(false);

    expect(requested).toEqual(['http://localhost/logo.png']);
  });

  test('building a placeholder runs no custom element code', async () => {
    let constructed = 0;
    customElements.define(
      'blocked-user-card',
      class extends HTMLElement {
        constructor() {
          super();
          constructed++;
        }
      }
    );
    document.body.innerHTML = '<blocked-user-card class="rr-block" id="card"></blocked-user-card>';
    const constructedByPage = constructed;

    const card = parse((await startScreenCapture(true)).html).getElementById('card');

    expect(constructed).toBe(constructedByPage);
    expect(card.tagName).toBe('BLOCKED-USER-CARD');
  });
});

// Text inside rr-mask / gl-mask, or the maskTextClass / maskTextSelector replay options, is masked
// the way rrweb masks it in replays.
describe('startScreenCapture — masked text', () => {
  const parse = (html) => new DOMParser().parseFromString(html, 'text/html');

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test.each([
    ['rr-mask', 'class="rr-mask"', {}],
    ['gl-mask', 'class="gl-mask"', {}],
    ['the maskTextClass option', 'class="pii"', { maskTextClass: 'pii' }],
    ['a maskTextClass RegExp', 'class="pii-name"', { maskTextClass: /^pii-/ }],
    ['the maskTextSelector option', 'data-private', { maskTextSelector: '[data-private]' }],
  ])('%s: every character but whitespace becomes *, in the element and its descendants', async (name, marker, options) => {
    document.body.innerHTML =
      `<div ${marker} id="note">Jane Doe\n<b>jane@example.com</b></div>` + '<p id="public">Public text</p>';

    const html = (await startScreenCapture(true, options)).html;

    expect(html).not.toContain('Jane');
    expect(html).not.toContain('jane@example.com');
    const doc = parse(html);
    expect(doc.getElementById('note').innerHTML).toBe('**** ***\n<b>****************</b>');
    expect(doc.getElementById('public').textContent).toBe('Public text');
  });

  test('a style sheet inside a masked element keeps its CSS, and comments are left out', async () => {
    document.body.innerHTML =
      '<div class="rr-mask" id="note"><style>.note { color: red; }</style>Jane<!-- customer: jane@example.com --></div>';

    const html = (await startScreenCapture(true)).html;

    expect(html).toContain('color: red');
    expect(html).not.toContain('Jane');
    expect(html).not.toContain('jane@example.com');
    expect(html).not.toContain('<!--');
  });

  test('text in the shadow tree of a masked element is masked', async () => {
    document.body.innerHTML = '<div class="rr-mask"><div id="host"></div></div>';
    document.getElementById('host').attachShadow({ mode: 'open' }).innerHTML = '<p>Jane Doe</p>';

    const html = (await startScreenCapture(true)).html;

    expect(html).not.toContain('Jane Doe');
    expect(html).toContain('<p bb-shadow-child="1">**** ***</p>');
  });

  test("the site's maskTextFn formats masked text, as in replays", async () => {
    const maskTextFn = jest.fn((text) => `[${text.length}]`);
    document.body.innerHTML = '<p class="rr-mask" id="note">Jane Doe</p>';

    const doc = parse((await startScreenCapture(true, { maskTextFn })).html);

    expect(doc.getElementById('note').textContent).toBe('[8]');
    expect(maskTextFn).toHaveBeenCalledWith('Jane Doe', document.getElementById('note'));
  });

  test.each([
    ['throws', () => {
      throw new Error('boom');
    }],
    ['returns no text', () => undefined],
  ])('a maskTextFn that %s falls back to *', async (name, maskTextFn) => {
    document.body.innerHTML = '<p class="rr-mask" id="note">Jane Doe</p>';

    const doc = parse((await startScreenCapture(true, { maskTextFn })).html);

    expect(doc.getElementById('note').textContent).toBe('**** ***');
  });

  test('gleap-ignore="value" masks field values, not text', async () => {
    document.body.innerHTML = '<div gleap-ignore="value" id="order">Delivery notes <input id="notes"></div>';
    document.getElementById('notes').value = 'leave at door';

    const doc = parse((await startScreenCapture(true)).html);

    expect(doc.getElementById('order').firstChild.textContent).toBe('Delivery notes ');
    expect(doc.getElementById('notes').getAttribute('bb-data-value')).toBe('*************');
  });
});
