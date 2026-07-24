/**
 * @jest-environment jsdom
 */
import { ScreenDrawer } from './ScreenDrawer';

const setScroll = (x, y) => {
  Object.defineProperty(window, 'scrollX', { value: x, configurable: true });
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
};

const mouseEvent = (type, clientX, clientY) => {
  return new MouseEvent(type, { clientX, clientY, bubbles: true });
};

describe('ScreenDrawer scroll tracking', () => {
  let drawer;
  let svg;

  beforeEach(() => {
    document.body.innerHTML =
      '<div class="bb-capture-editor"><svg class="bb-capture-svg" xmlns="http://www.w3.org/2000/svg"></svg></div>';
    svg = document.querySelector('.bb-capture-svg');
    setScroll(0, 1116);
  });

  afterEach(() => {
    if (drawer) {
      drawer.destroy();
      drawer.destroyScrollTracker();
      drawer = null;
    }
  });

  it('counter-shifts the overlay by the current scroll offset', () => {
    drawer = new ScreenDrawer(() => {}, true);

    // Applied immediately so the overlay is document-anchored from the start.
    expect(svg.style.transform).toBe('translate(0px, -1116px)');

    setScroll(0, 1236);
    window.dispatchEvent(new Event('scroll'));
    expect(svg.style.transform).toBe('translate(0px, -1236px)');

    // Scrolling above the drawing-start position must work too.
    setScroll(0, 500);
    window.dispatchEvent(new Event('scroll'));
    expect(svg.style.transform).toBe('translate(0px, -500px)');
  });

  it('stores drawings in document coordinates so they stay glued to content', () => {
    drawer = new ScreenDrawer(() => {}, true);

    setScroll(0, 1236);
    window.dispatchEvent(new Event('scroll'));

    svg.dispatchEvent(mouseEvent('mousedown', 200, 100));
    svg.dispatchEvent(mouseEvent('mousemove', 300, 150));

    const rect = svg.querySelector('rect');
    expect(rect).not.toBeNull();
    // clientX/Y + scroll: document coordinates, rendered under the cursor
    // through the counter-shifting transform.
    expect(rect.getAttribute('x')).toBe('200');
    expect(rect.getAttribute('y')).toBe('1336');
    expect(rect.getAttribute('width')).toBe('100');
    expect(rect.getAttribute('height')).toBe('50');
  });

  it('keeps viewport coordinates when scroll tracking is disabled (screen recording)', () => {
    drawer = new ScreenDrawer(() => {}, false);

    setScroll(0, 1236);
    window.dispatchEvent(new Event('scroll'));

    expect(svg.style.transform).toBe('');

    svg.dispatchEvent(mouseEvent('mousedown', 200, 100));
    svg.dispatchEvent(mouseEvent('mousemove', 300, 150));

    const rect = svg.querySelector('rect');
    expect(rect.getAttribute('x')).toBe('200');
    expect(rect.getAttribute('y')).toBe('100');
  });

  it('keeps tracking scroll after destroy() until destroyScrollTracker() is called', () => {
    drawer = new ScreenDrawer(() => {}, true);

    // destroy() runs when drawing finishes, but the preview overlay must keep
    // tracking while the feedback form is open.
    drawer.destroy();
    setScroll(0, 1236);
    window.dispatchEvent(new Event('scroll'));
    expect(svg.style.transform).toBe('translate(0px, -1236px)');

    // clear() releases the tracker when the capture editor is removed.
    drawer.destroyScrollTracker();
    setScroll(0, 1000);
    window.dispatchEvent(new Event('scroll'));
    expect(svg.style.transform).toBe('translate(0px, -1236px)');
  });
});
