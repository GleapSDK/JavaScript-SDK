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
  icon: 'question',
  color: '#000',
  ...overrides,
});

describe('hotspot anchor containing block (#227901)', () => {
  let manager;

  beforeEach(() => {
    document.body.innerHTML = '';
    manager = new GleapTooltipManager();
  });

  test('a static element becomes the containing block of its hotspot anchor', () => {
    document.body.innerHTML = '<div class="panel" style="overflow:auto"><h3 class="target">Workspace access</h3></div>';
    const element = document.querySelector('.target');

    manager.linkTooltip(element, hotspotTooltip());

    expect(element.style.position).toBe('relative');
    const anchor = element.querySelector('[data-gleap-tooltip-anchor]');
    expect(anchor).not.toBeNull();
    expect(anchor.style.position).toBe('absolute');
  });

  test('an element that is positioned already is left alone', () => {
    document.body.innerHTML = '<h3 class="target" style="position: sticky">Title</h3>';
    const element = document.querySelector('.target');

    manager.linkTooltip(element, hotspotTooltip());

    expect(element.style.position).toBe('sticky');
  });

  test('next to a void element the parent becomes the containing block', () => {
    document.body.innerHTML = '<label class="field"><input class="target" /></label>';
    const element = document.querySelector('.target');
    const parent = document.querySelector('.field');

    manager.linkTooltip(element, hotspotTooltip());

    expect(parent.style.position).toBe('relative');
    expect(element.style.position).toBe('');
  });

  test('unlinking restores the previous inline position', () => {
    document.body.innerHTML = '<h3 class="target">Title</h3><h3 class="other" style="position: static">Other</h3>';
    const element = document.querySelector('.target');
    const other = document.querySelector('.other');

    manager.linkTooltip(element, hotspotTooltip());
    manager.linkTooltip(other, hotspotTooltip({ selector: '.other' }));
    expect(element.style.position).toBe('relative');
    expect(other.style.position).toBe('relative');

    manager.unlinkElement(element);
    manager.unlinkElement(other);

    expect(element.getAttribute('style')).toBeFalsy();
    expect(other.style.position).toBe('static');
    expect(element.querySelector('[data-gleap-tooltip-anchor]')).toBeNull();
  });

  test('repositioning puts the position back after a re-render reset it', () => {
    document.body.innerHTML = '<h3 class="target">Title</h3>';
    const element = document.querySelector('.target');
    const tooltip = hotspotTooltip();

    manager.linkTooltip(element, tooltip);
    element.style.position = '';

    manager.repositionHotspot(element, tooltip);

    expect(element.style.position).toBe('relative');
  });
});
