/**
 * @jest-environment jsdom
 */
import GleapTours from './GleapTours';

// jsdom has no layout, so every element reports no client rects. Treat an
// element as rendered unless it or an ancestor is display:none, which is what
// a browser does for v-show / [hidden] / collapsed-menu labels.
const isHiddenInTest = (el) => {
  for (let node = el; node && node.style; node = node.parentElement) {
    if (node.style.display === 'none') {
      return true;
    }
  }
  return false;
};

describe('GleapTours step target resolution', () => {
  let tour;
  let onElementNotFound;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Element.prototype, 'getClientRects').mockImplementation(function () {
      return isHiddenInTest(this) ? [] : [{ top: 0, left: 0, width: 40, height: 20 }];
    });
    onElementNotFound = jest.fn(() => tour.destroy());
  });

  afterEach(() => {
    if (tour) {
      tour.destroy();
    }
    tour = null;
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
    document.body.innerHTML = '';
  });

  const startTour = (selector) => {
    tour = GleapTours({
      animate: false,
      allowClose: false,
      onElementNotFound,
      steps: [{ element: selector, popover: { description: 'Click on Library', showButtons: [] } }],
    });
    tour.drive();
  };

  it('highlights a rendered target right away', () => {
    document.body.innerHTML = '<nav><a class="menu-item"><span class="label">Library</span></a></nav>';
    startTour('.menu-item > .label');

    expect(tour.getActiveElement()).toBe(document.querySelector('.label'));
    expect(onElementNotFound).not.toHaveBeenCalled();
  });

  it('treats a target that only matches a display:none element as not found (#185122)', () => {
    // Collapsed sidebar: the label the step was recorded on is hidden via v-show.
    document.body.innerHTML =
      '<nav><a class="menu-item"><i class="icon"></i><span class="label" style="display: none">Library</span></a></nav>';
    startTour('.menu-item > .label');

    expect(tour.getActiveElement()).toBeUndefined();
    expect(document.querySelector('.label').classList.contains('gleap-tour-active-element')).toBe(false);

    jest.advanceTimersByTime(5200);

    expect(onElementNotFound).toHaveBeenCalledTimes(1);
    expect(onElementNotFound.mock.calls[0][0].element).toBe('.menu-item > .label');
  });

  it('skips hidden matches and highlights the first rendered one', () => {
    // Responsive layouts render the same menu twice and hide one of them.
    document.body.innerHTML =
      '<div class="mobile" style="display: none"><a class="menu-item"><span class="label">Library</span></a></div>' +
      '<div class="desktop"><a class="menu-item"><span class="label">Library</span></a></div>';
    startTour('.menu-item > .label');

    expect(tour.getActiveElement()).toBe(document.querySelector('.desktop .label'));
    expect(onElementNotFound).not.toHaveBeenCalled();
  });

  it('keeps waiting for a hidden target that becomes visible within the timeout', () => {
    document.body.innerHTML = '<nav><a class="menu-item"><span class="label" style="display: none">Library</span></a></nav>';
    startTour('.menu-item > .label');

    jest.advanceTimersByTime(1000);
    document.querySelector('.label').style.display = '';
    jest.advanceTimersByTime(200);

    expect(tour.getActiveElement()).toBe(document.querySelector('.label'));
    jest.advanceTimersByTime(5000);
    expect(onElementNotFound).not.toHaveBeenCalled();
  });

  it('still quits when the selector matches nothing', () => {
    document.body.innerHTML = '<nav></nav>';
    startTour('.menu-item > .label');

    jest.advanceTimersByTime(5200);

    expect(onElementNotFound).toHaveBeenCalledTimes(1);
  });
});
