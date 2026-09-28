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
// their computed styles, boxes and offsets by hand. Offsets are 0 and offsetParent null in jsdom, so
// every child's edge is at its parent's unless a test moves it.
const fakeComputedStyle = (values) => {
  const all = {
    display: 'block',
    width: 'auto',
    height: 'auto',
    float: 'none',
    position: 'static',
    'box-sizing': 'content-box',
    'overflow-x': 'visible',
    'overflow-y': 'visible',
    contain: 'none',
    content: 'none',
    'vertical-align': 'baseline',
    'align-self': 'auto',
    'align-items': 'normal',
    ...['top', 'right', 'bottom', 'left'].reduce(
      (sides, side) => ({
        ...sides,
        ['margin-' + side]: '0px',
        ['padding-' + side]: '0px',
        ['border-' + side + '-width']: '0px',
        ['border-' + side + '-style']: 'none',
      }),
      {}
    ),
    ...values,
  };
  const style = { getPropertyValue: (property) => all[property] || '' };
  Object.keys(all).forEach((property) => {
    style[property.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase())] = all[property];
  });
  return style;
};

// A '::before' / '::after' entry in an element's values is the style of that pseudo-element.
const stubComputedStyles = (stylesByElement) => {
  const getComputedStyle = window.getComputedStyle;
  jest.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudo) => {
    if (!stylesByElement.has(element)) {
      return getComputedStyle.call(window, element, pseudo);
    }
    const values = stylesByElement.get(element);
    return fakeComputedStyle(pseudo ? { display: 'inline', ...values[pseudo] } : values);
  });
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

const setOffsets = (element, offsets) =>
  Object.keys(offsets).forEach((name) => Object.defineProperty(element, name, { configurable: true, value: offsets[name] }));

// jsdom's Range has no getClientRects(): the line fragments of the given text nodes.
const stubTextRects = (rectsByText) => {
  Range.prototype.getClientRects = function () {
    return rectsByText.get(this.startContainer) || [];
  };
};

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

  // Private: the text, the attributes (the id too), and a nested image, link and field.
  const blockedCard = (marker) =>
    `<div ${marker} id="card-jane-doe" title="Jane Doe" data-user="jane@example.com" style="background: url(/avatar/jane.png)">` +
    '<h3>Jane Doe</h3><img src="/avatar/jane.png" alt="Jane Doe avatar"><a href="/users/jane">Profile</a><input id="iban">' +
    '</div><p>Public text</p>';

  test.each([
    ['rr-block', 'class="rr-block"', {}],
    ['gl-block', 'class="gl-block"', {}],
    ['the blockClass option', 'class="card private"', { blockClass: 'private' }],
    ['a blockClass RegExp', 'class="pii-card"', { blockClass: /^pii-/ }],
    ['the blockSelector option', 'data-private', { blockSelector: '[data-private]' }],
  ])('%s: only the tag and class of the element reach the snapshot', async (name, marker, options) => {
    document.body.innerHTML = blockedCard(marker);
    document.getElementById('iban').value = 'DE89370400440532013000';

    const html = (await startScreenCapture(true, options)).html;

    for (const value of ['Jane', 'jane', 'avatar', 'Profile', 'DE89370400440532013000']) {
      expect(html).not.toContain(value);
    }
    expect(html).toContain('Public text');

    const card = parse(html).body.firstElementChild;
    expect(card.tagName).toBe('DIV');
    expect(card.childNodes).toHaveLength(0);
    // rrweb leaves the id out as well.
    expect(card.getAttributeNames().filter((attribute) => !['class', 'style'].includes(attribute))).toEqual([]);
  });

  test('the placeholder takes the size of the element, and renders blank', async () => {
    document.body.innerHTML = '<div class="rr-block">Jane Doe</div>';
    const card = document.querySelector('.rr-block');
    stubComputedStyles(
      new Map([
        [
          card,
          {
            width: '300.5px',
            height: '60px',
            'padding-top': '8px',
            'padding-bottom': '8px',
            'border-left-width': '6px',
            'border-right-width': '6px',
          },
        ],
      ])
    );

    const placeholder = parse((await startScreenCapture(true)).html).querySelector('.rr-block');

    for (const [property, value] of [
      ['box-sizing', 'border-box'],
      ['width', '312.5px'],
      ['min-width', '312.5px'],
      ['max-width', '312.5px'],
      ['height', '76px'],
      ['min-height', '76px'],
      ['max-height', '76px'],
      // It draws nothing, so all of its size is content.
      ['padding-top', '0px'],
      ['border-left-width', '0px'],
      ['visibility', 'hidden'],
    ]) {
      expect(placeholder.style.getPropertyValue(property)).toBe(value);
    }
    expect(placeholder.style.getPropertyPriority('width')).toBe('important');
  });

  test('it copies where the element sits, which inline styles, attributes and id selectors may have set', async () => {
    document.body.innerHTML =
      '<div class="rr-block" id="popover" style="position: absolute; top: 12px; right: 20px">Jane Doe</div>';
    stubComputedStyles(
      new Map([
        [
          document.getElementById('popover'),
          {
            position: 'absolute',
            top: '12px',
            right: '20px',
            'margin-left': '4px',
            'align-self': 'flex-end',
            'overflow-y': 'auto',
          },
        ],
      ])
    );

    const placeholder = parse((await startScreenCapture(true)).html).querySelector('.rr-block');

    expect(placeholder.style.getPropertyValue('position')).toBe('absolute');
    expect(placeholder.style.getPropertyValue('top')).toBe('12px');
    expect(placeholder.style.getPropertyValue('right')).toBe('20px');
    expect(placeholder.style.getPropertyValue('margin-left')).toBe('4px');
    expect(placeholder.style.getPropertyValue('align-self')).toBe('flex-end');
    expect(placeholder.style.getPropertyValue('overflow-y')).toBe('auto');
  });

  test('an inline image becomes an inline-block of its size, without its source', async () => {
    document.body.innerHTML = '<p>Photo: <img class="rr-block" id="photo" src="/photos/jane.png" alt="Jane Doe"></p>';
    stubComputedStyles(
      new Map([
        [
          document.getElementById('photo'),
          { display: 'inline', width: '120px', height: '80px', 'vertical-align': 'middle' },
        ],
      ])
    );

    const placeholder = parse((await startScreenCapture(true)).html).querySelector('.rr-block');

    expect(placeholder.getAttributeNames().sort()).toEqual(['class', 'style']);
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

    const placeholder = parse((await startScreenCapture(true)).html).querySelector('.rr-block');

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

    const placeholder = parse((await startScreenCapture(true)).html).querySelector('.rr-block');

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

    const link = parse((await startScreenCapture(true)).html).querySelector('.rr-block');

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
    const [blockedHost, ssn] = [doc.body.children[1], doc.body.firstElementChild.lastElementChild];
    // The renderer moves the placeholder back into the shadow tree it came from.
    expect(ssn.className).toBe('rr-block');
    expect(ssn.getAttribute('bb-shadow-child')).toBe(doc.getElementById('host').getAttribute('bb-shadow-parent'));
    expect(blockedHost.hasAttribute('bb-shadow-parent')).toBe(false);
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
    document.body.innerHTML = '<blocked-user-card class="rr-block"></blocked-user-card>';
    const constructedByPage = constructed;

    const card = parse((await startScreenCapture(true)).html).querySelector('.rr-block');

    expect(constructed).toBe(constructedByPage);
    expect(card.tagName).toBe('BLOCKED-USER-CARD');
  });
});

// The placeholder has no content, so what the content did to the layout around the element, it does
// itself: user drawings on a screenshot are in page coordinates and point at what was there.
describe('startScreenCapture — blocked elements keep the layout around them', () => {
  const parse = (html) => new DOMParser().parseFromString(html, 'text/html');
  const capturePlaceholder = async (selector = '.rr-block') =>
    parse((await startScreenCapture(true)).html).querySelector(selector);

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete Range.prototype.getClientRects;
  });

  // A blocked <div> in a card, around a first and a last paragraph with margins.
  const blockedParagraphs = (styles, text = '') => {
    document.body.innerHTML =
      '<div class="card"><div class="rr-block" id="blocked">\n' +
      `  ${text}<p id="first">Jane Doe</p>\n  <p id="last">jane@example.com</p>\n</div></div>`;
    stubComputedStyles(
      new Map([
        [document.getElementById('blocked'), { width: '300px', height: '100px', 'margin-top': '4px', ...styles }],
        [document.getElementById('first'), { 'margin-top': '16px', 'margin-bottom': '16px' }],
        [document.getElementById('last'), { 'margin-top': '16px', 'margin-bottom': '24px' }],
      ])
    );
    document.getElementById('first').getBoundingClientRect = () => box(0, 0, 300, 20);
    document.getElementById('last').getBoundingClientRect = () => box(0, 36, 300, 20);
  };

  test('the margins of its first and last child, which collapse through its edges, move to the placeholder', async () => {
    blockedParagraphs({});

    const placeholder = await capturePlaceholder();

    expect(placeholder.style.getPropertyValue('margin-top')).toBe('16px');
    expect(placeholder.style.getPropertyValue('margin-bottom')).toBe('24px');
  });

  test.each([
    ['padding keeps', { 'padding-top': '1px', 'padding-bottom': '1px' }, null],
    ['a border keeps', { 'border-top-width': '1px', 'border-bottom-width': '1px' }, null],
    ['a formatting context of its own keeps', { 'overflow-x': 'hidden', 'overflow-y': 'hidden' }, null],
    [
      'a flex item keeps',
      {},
      () => {
        setOffsets(document.getElementById('first'), { offsetTop: 16 });
        setOffsets(document.getElementById('last'), { offsetTop: 52 });
      },
    ],
  ])('%s its children’s margins inside it, and the placeholder keeps its own', async (name, styles, move) => {
    blockedParagraphs(styles);
    if (move) {
      move();
    }

    const placeholder = await capturePlaceholder();

    expect(placeholder.style.getPropertyValue('margin-top')).toBe('4px');
    expect(placeholder.style.getPropertyValue('margin-bottom')).toBe('0px');
  });

  test('a line of text before its first child keeps that child’s top margin inside it', async () => {
    blockedParagraphs({}, 'Customer: ');

    const placeholder = await capturePlaceholder();

    expect(placeholder.style.getPropertyValue('margin-top')).toBe('4px');
    expect(placeholder.style.getPropertyValue('margin-bottom')).toBe('24px');
  });

  test('negative margins collapse with the others, and empty children let margins through', async () => {
    document.body.innerHTML = '<div class="rr-block" id="blocked"><div id="spacer"></div><h2 id="title">Jane Doe</h2></div>';
    stubComputedStyles(
      new Map([
        [document.getElementById('blocked'), { 'margin-top': '4px' }],
        [document.getElementById('spacer'), { 'margin-top': '10px', 'margin-bottom': '20px' }],
        [document.getElementById('title'), { 'margin-top': '-30px' }],
      ])
    );
    document.getElementById('title').getBoundingClientRect = () => box(0, 0, 300, 20);

    const placeholder = await capturePlaceholder();

    // The largest (20px) plus the most negative (-30px).
    expect(placeholder.style.getPropertyValue('margin-top')).toBe('-10px');
  });

  test('a transformed element keeps its size before the transform, as its placeholder is transformed too', async () => {
    document.body.innerHTML = '<div style="transform: scale(0.5)"><div class="rr-block" id="blocked">Jane Doe</div></div>';
    stubComputedStyles(new Map([[document.getElementById('blocked'), { width: '300px', height: '100px' }]]));
    document.getElementById('blocked').getBoundingClientRect = () => box(0, 0, 150, 50);

    const placeholder = await capturePlaceholder();

    expect(placeholder.style.getPropertyValue('width')).toBe('300px');
    expect(placeholder.style.getPropertyValue('height')).toBe('100px');
  });

  test('the lines of an inline element under a transform keep the width they have before it', async () => {
    document.body.innerHTML = '<p id="line">Ship to <span class="rr-block" id="address">1234 Long Street</span></p>';
    stubComputedStyles(
      new Map([
        [document.getElementById('line'), { width: '400px', height: '60px' }],
        [document.getElementById('address'), { display: 'inline' }],
      ])
    );
    document.getElementById('line').getBoundingClientRect = () => box(0, 0, 200, 30);
    document.getElementById('address').getClientRects = () => [box(40, 0, 60.5, 10)];

    const placeholder = await capturePlaceholder();

    expect(placeholder.children[0].style.getPropertyValue('width')).toBe('121px');
  });

  test('a display: contents element keeps an empty box for each box it put in its parent', async () => {
    document.body.innerHTML =
      '<div class="grid"><div class="rr-block" id="blocked"><p class="vip" id="name" title="Jane Doe">Jane Doe</p>' +
      'jane@example.com<span id="hidden">Jane</span></div><p>Public text</p></div>';
    const text = document.getElementById('name').nextSibling;
    stubComputedStyles(
      new Map([
        [document.getElementById('blocked'), { display: 'contents' }],
        [document.getElementById('name'), { width: '120px', height: '40px', 'margin-bottom': '8px' }],
        [document.getElementById('hidden'), { display: 'none' }],
      ])
    );
    stubTextRects(new Map([[text, [box(10, 60, 150.5, 20)]]]));

    const html = (await startScreenCapture(true)).html;

    expect(html).not.toContain('Jane');
    expect(html).not.toContain('jane@example.com');
    expect(html).not.toContain('vip');
    const placeholder = parse(html).querySelector('.rr-block');
    expect(placeholder.style.getPropertyValue('display')).toBe('contents');
    const [paragraph, line] = placeholder.children;
    expect(placeholder.children).toHaveLength(2);
    expect(paragraph.tagName).toBe('P');
    expect(paragraph.getAttributeNames()).toEqual(['style']);
    expect(paragraph.style.getPropertyValue('width')).toBe('120px');
    expect(paragraph.style.getPropertyValue('height')).toBe('40px');
    expect(paragraph.style.getPropertyValue('margin-bottom')).toBe('8px');
    expect(paragraph.style.getPropertyValue('visibility')).toBe('hidden');
    // Its text, as a line spacer.
    expect(line.tagName).toBe('SPAN');
    expect(line.firstElementChild.style.getPropertyValue('width')).toBe('150.5px');
  });

  // A cell of this box: content, padding and borders. With collapsed borders, a cell's box has half of
  // each border it shares.
  const cellStyle = {
    display: 'table-cell',
    width: '153.5px',
    height: '24px',
    'padding-top': '4px',
    'padding-bottom': '4px',
    'border-left-width': '3px',
    'border-left-style': 'solid',
  };

  test('a cell keeps its column and row span, and its box', async () => {
    document.body.innerHTML =
      '<table><tr><td class="rr-block" id="cell" colspan="2 columns" rowspan="3">Jane Doe</td><td>1</td></tr></table>';
    stubComputedStyles(new Map([[document.getElementById('cell'), cellStyle]]));

    const cell = await capturePlaceholder();

    expect(cell.getAttribute('colspan')).toBe('2');
    expect(cell.getAttribute('rowspan')).toBe('3');
    for (const [property, value] of [
      ['box-sizing', 'content-box'],
      ['width', '153.5px'],
      ['height', '24px'],
      ['padding-top', '4px'],
      ['border-left-width', '3px'],
      ['border-left-style', 'solid'],
    ]) {
      expect(cell.style.getPropertyValue(property)).toBe(value);
    }
    // jsdom drops !important when it writes longhands as a shorthand; browsers keep it.
    expect(cell.style.getPropertyPriority('width')).toBe('important');
  });

  test('a blocked row keeps an empty cell for each of its cells, which make up the table’s grid', async () => {
    document.body.innerHTML =
      '<table><tr class="rr-block" id="row"><td class="vip" id="name" colspan="2">Jane Doe</td><td id="mail">jane@example.com</td></tr>' +
      '<tr><td>1</td><td>2</td><td>3</td></tr></table>';
    stubComputedStyles(
      new Map([
        [document.getElementById('row'), { display: 'table-row' }],
        [document.getElementById('name'), cellStyle],
        [document.getElementById('mail'), { ...cellStyle, width: '80px' }],
      ])
    );

    const html = (await startScreenCapture(true)).html;

    expect(html).not.toContain('Jane');
    expect(html).not.toContain('vip');
    const row = parse(html).querySelector('.rr-block');
    const [name, mail] = row.children;
    expect(row.children).toHaveLength(2);
    expect(name.getAttributeNames().sort()).toEqual(['colspan', 'style']);
    expect(name.style.getPropertyValue('width')).toBe('153.5px');
    expect(mail.style.getPropertyValue('width')).toBe('80px');
    expect(mail.style.getPropertyValue('padding-top')).toBe('4px');
    // Every cell in the row is empty: none is aligned on a baseline, which an empty cell has at its
    // bottom.
    expect(mail.style.getPropertyValue('vertical-align')).toBe('top');
    // The row hides them; plain declarations keep a long table's placeholder short.
    expect(mail.style.getPropertyPriority('width')).toBe('');
  });

  test('a list item keeps its number, which numbers the items after it', async () => {
    document.body.innerHTML = '<ol><li class="rr-block" value="7">Jane Doe</li><li>Next</li></ol>';

    const item = await capturePlaceholder();

    expect(item.getAttribute('value')).toBe('7');
  });

  describe('baselines', () => {
    beforeEach(() => {
      jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
        measureText: () => ({ fontBoundingBoxAscent: 14 }),
      });
    });

    // A 30px tall box whose text starts 4px from its top: its baseline is 4 + 14px down.
    const blockedBadge = (styles, parentStyles) => {
      document.body.innerHTML = '<p id="parent">Status: <span class="rr-block" id="badge">Jane Doe</span> more</p>';
      stubComputedStyles(
        new Map([
          [document.getElementById('parent'), parentStyles || {}],
          [
            document.getElementById('badge'),
            { width: '80px', height: '24px', 'padding-top': '3px', 'padding-bottom': '3px', ...styles },
          ],
        ])
      );
      document.getElementById('badge').getBoundingClientRect = () => box(60, 100, 80, 30);
      stubTextRects(new Map([[document.getElementById('badge').firstChild, [box(62, 104, 70, 18)]]]));
    };

    test.each([
      ['an inline-block on a line of text', { display: 'inline-block' }, null],
      ['a flex item aligned on its baseline', {}, { display: 'flex', 'align-items': 'baseline' }],
    ])('%s keeps its text’s baseline, which an empty box does not have', async (name, styles, parentStyles) => {
      blockedBadge(styles, parentStyles);

      const placeholder = await capturePlaceholder();

      expect(placeholder.style.getPropertyValue('display')).toBe('inline-block');
      const [spacer] = placeholder.children;
      expect(placeholder.children).toHaveLength(1);
      // As tall as the placeholder, and lowered so that the line it makes has its baseline 18px down.
      expect(spacer.style.getPropertyValue('height')).toBe('30px');
      expect(spacer.style.getPropertyValue('vertical-align')).toBe('-12px');
      expect(spacer.style.getPropertyValue('width')).toBe('0px');
    });

    test.each([
      ['aligned on its middle', { display: 'inline-block', 'vertical-align': 'middle' }],
      ['a scroll container, which sits on its bottom edge', { display: 'inline-block', 'overflow-y': 'auto' }],
      ['a block', {}],
    ])('a box %s needs no baseline', async (name, styles) => {
      blockedBadge(styles);

      const placeholder = await capturePlaceholder();

      expect(placeholder.children).toHaveLength(0);
    });
  });

  test('the ::before and ::after content an inline element’s lines include is not added a second time', async () => {
    document.body.innerHTML = '<p>Hi <span class="rr-block mention" id="mention">Jane</span></p>';
    const mention = document.getElementById('mention');
    stubComputedStyles(
      new Map([
        // The floated ::after is not in the lines: the class adds it again, as it was.
        [mention, { display: 'inline', '::before': { content: '"@"' }, '::after': { content: '""', float: 'left' } }],
      ])
    );
    mention.getClientRects = () => [box(20, 0, 50, 17)];

    const placeholder = await capturePlaceholder();

    expect(placeholder.getAttribute('bb-no-content')).toBe('before');
    expect(placeholder.querySelector('style').textContent).toBe('[bb-no-content~=before]::before{content:none!important}');
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
