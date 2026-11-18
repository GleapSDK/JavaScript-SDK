/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// GleapClickListener pulls the frame/console managers in from the main Gleap module,
// which drags in the whole SDK — mock it so the listener can be tested on its own.
const mockHandleGleapLink = vi.fn();
const mockAddLog = vi.fn();
const mockIsOpened = vi.fn(() => true);

vi.mock('./Gleap', () => ({
  handleGleapLink: (...args) => mockHandleGleapLink(...args),
  GleapConsoleLogManager: { getInstance: () => ({ addLog: mockAddLog }) },
  GleapFrameManager: { getInstance: () => ({ isOpened: mockIsOpened }) },
}));

vi.mock('./GleapHelper', () => ({
  getDOMElementDescription: () => 'element',
}));

const CHECKLIST_LINK = 'gleap://checklist/6739f47e013864770e120adf';

const startListener = async () => {
  vi.resetModules();
  const { default: GleapClickListener } = await import('./GleapClickListener');
  // The singleton is per-module-registry, so a fresh registry gives a fresh one each time.
  GleapClickListener.getInstance().start();
};

const clickAndCapture = (element) => {
  const event = new window.MouseEvent('click', { bubbles: true, cancelable: true });
  element.dispatchEvent(event);
  return event;
};

describe('GleapClickListener gleap:// links', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    mockHandleGleapLink.mockClear();
    mockAddLog.mockClear();
  });

  it('handles a click directly on the anchor', async () => {
    document.body.innerHTML = `<a id="link" href="${CHECKLIST_LINK}">Start checklist</a>`;
    await startListener();

    const event = clickAndCapture(document.getElementById('link'));

    expect(mockHandleGleapLink).toHaveBeenCalledWith(CHECKLIST_LINK);
    expect(event.defaultPrevented).toBe(true);
  });

  it('handles a click on a formatted child inside the anchor', async () => {
    // Rich-text editors wrap link text in <strong>/<span>, so the click target is
    // the child, not the anchor itself.
    document.body.innerHTML = `<a href="${CHECKLIST_LINK}"><strong id="child">Start checklist</strong></a>`;
    await startListener();

    const event = clickAndCapture(document.getElementById('child'));

    expect(mockHandleGleapLink).toHaveBeenCalledWith(CHECKLIST_LINK);
    expect(event.defaultPrevented).toBe(true);
  });

  it('handles a click on a deeply nested icon inside the anchor', async () => {
    document.body.innerHTML = `<a href="${CHECKLIST_LINK}"><span><em id="icon">go</em></span></a>`;
    await startListener();

    clickAndCapture(document.getElementById('icon'));

    expect(mockHandleGleapLink).toHaveBeenCalledWith(CHECKLIST_LINK);
  });

  it('ignores anchors that are not gleap:// links', async () => {
    document.body.innerHTML = `<a id="link" href="#section">Normal link</a>`;
    await startListener();

    const event = clickAndCapture(document.getElementById('link'));

    expect(mockHandleGleapLink).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('ignores clicks outside of any anchor', async () => {
    document.body.innerHTML = `<div id="plain">Just text</div>`;
    await startListener();

    clickAndCapture(document.getElementById('plain'));

    expect(mockHandleGleapLink).not.toHaveBeenCalled();
  });
});
