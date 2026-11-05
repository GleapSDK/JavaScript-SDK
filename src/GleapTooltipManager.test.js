/**
 * @jest-environment jsdom
 */
import GleapTooltipManager from './GleapTooltipManager';

jest.mock('./Gleap', () => ({
  __esModule: true,
  default: {},
  GleapSession: { getInstance: jest.fn(() => ({})) },
}));

jest.mock('./UI', () => ({
  loadIcon: jest.fn(() => '<svg></svg>'),
}));

jest.mock('@floating-ui/dom', () => ({
  autoUpdate: jest.fn(() => jest.fn()),
  computePosition: jest.fn(() => Promise.resolve({ x: 0, y: 0, middlewareData: {}, placement: 'right' })),
  arrow: jest.fn(),
  flip: jest.fn(),
  offset: jest.fn(),
  shift: jest.fn(),
}));

const hotspotTooltip = (overrides = {}) => ({
  mode: 'hotspot',
  selector: '.target',
  html: 'Help',
  icon: 'circle-question',
  color: '#000',
  ...overrides,
});

describe('hotspot anchor inside a scrolling panel (#227901)', () => {
  let manager;

  beforeEach(() => {
    document.body.innerHTML = '';
    manager = new GleapTooltipManager();
  });

  test('the scroll container becomes the containing block of the anchor, the element is left alone', () => {
    document.body.innerHTML =
      '<div class="app" style="position: relative"><div class="panel" style="overflow: auto">' +
      '<div class="wrap"><h3 class="target">Workspace access</h3></div></div></div>';
    const element = document.querySelector('.target');

    manager.linkTooltip(element, hotspotTooltip());

    expect(document.querySelector('.panel').style.position).toBe('relative');
    expect(element.style.position).toBe('');
    expect(document.querySelector('.wrap').style.position).toBe('');
    expect(document.querySelector('.app').style.position).toBe('relative');
    const anchor = element.querySelector('[data-gleap-tooltip-anchor]');
    expect(anchor).not.toBeNull();
    expect(anchor.style.position).toBe('absolute');
  });

  test('a positioned ancestor inside the panel means nothing has to change', () => {
    document.body.innerHTML =
      '<div class="panel" style="overflow: auto"><div class="card" style="position: relative">' +
      '<h3 class="target">Title</h3></div></div>';

    manager.linkTooltip(document.querySelector('.target'), hotspotTooltip());

    expect(document.querySelector('.panel').style.position).toBe('');
    expect(document.querySelector('.card').style.position).toBe('relative');
  });

  test('a panel that is positioned already is left alone', () => {
    document.body.innerHTML = '<div class="panel" style="overflow: scroll; position: sticky"><h3 class="target">Title</h3></div>';

    manager.linkTooltip(document.querySelector('.target'), hotspotTooltip());

    expect(document.querySelector('.panel').style.position).toBe('sticky');
  });

  test('without a scroll container nothing is touched (the window scrolls the anchor)', () => {
    document.body.innerHTML = '<div class="wrap" style="overflow: hidden"><h3 class="target">Title</h3></div>';
    const element = document.querySelector('.target');

    manager.linkTooltip(element, hotspotTooltip());

    expect(element.style.position).toBe('');
    expect(document.querySelector('.wrap').style.position).toBe('');
    expect(document.body.style.position).toBe('');
  });

  test('next to a void element the search starts at its parent', () => {
    document.body.innerHTML = '<div class="panel" style="overflow-y: auto"><label class="field"><input class="target" /></label></div>';

    manager.linkTooltip(document.querySelector('.target'), hotspotTooltip());

    expect(document.querySelector('.panel').style.position).toBe('relative');
    expect(document.querySelector('.field').style.position).toBe('');
  });

  test('unlinking restores the previous inline position', () => {
    document.body.innerHTML =
      '<div class="a" style="overflow: auto"><h3 class="target">Title</h3></div>' +
      '<div class="b" style="overflow: auto; position: static"><h3 class="other">Other</h3></div>';
    const element = document.querySelector('.target');
    const other = document.querySelector('.other');
    const panelA = document.querySelector('.a');
    const panelB = document.querySelector('.b');

    manager.linkTooltip(element, hotspotTooltip());
    manager.linkTooltip(other, hotspotTooltip({ selector: '.other' }));
    expect(panelA.style.position).toBe('relative');
    expect(panelB.style.position).toBe('relative');

    manager.unlinkElement(element);
    manager.unlinkElement(other);

    expect(panelA.style.position).toBe('');
    expect(panelB.style.position).toBe('static');
    expect(element.querySelector('[data-gleap-tooltip-anchor]')).toBeNull();
  });

  test('unlinking leaves a position the page set in the meantime alone', () => {
    document.body.innerHTML = '<div class="panel" style="overflow: auto"><h3 class="target">Title</h3></div>';
    const panel = document.querySelector('.panel');

    manager.linkTooltip(document.querySelector('.target'), hotspotTooltip());
    panel.style.position = 'sticky';
    manager.unlinkElement(document.querySelector('.target'));

    expect(panel.style.position).toBe('sticky');
  });

  test('repositioning puts the position back after a re-render reset it', () => {
    document.body.innerHTML = '<div class="panel" style="overflow: auto"><h3 class="target">Title</h3></div>';
    const element = document.querySelector('.target');
    const panel = document.querySelector('.panel');
    const tooltip = hotspotTooltip();

    manager.linkTooltip(element, tooltip);
    panel.style.position = '';

    manager.repositionHotspot(element, tooltip);

    expect(panel.style.position).toBe('relative');
  });

  test('destroy restores the panel', () => {
    document.body.innerHTML = '<div class="panel" style="overflow: auto"><h3 class="target">Title</h3></div>';
    const panel = document.querySelector('.panel');

    manager.linkTooltip(document.querySelector('.target'), hotspotTooltip());
    expect(panel.style.position).toBe('relative');

    manager.destroy();

    expect(panel.style.position).toBe('');
    expect(document.querySelector('[data-gleap-tooltip-anchor]')).toBeNull();
  });
});
