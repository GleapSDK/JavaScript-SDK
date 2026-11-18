/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import GleapModalManager, { MODAL_LOAD_TIMEOUT_MS } from './GleapModalManager';
import { bootstrapGleapFrame } from './GleapHelper';

vi.mock('./Gleap', () => ({
  __esModule: true,
  default: {},
  GleapConfigManager: {
    getInstance: vi.fn(() => ({ getFlowConfig: () => ({}) })),
  },
  GleapFrameManager: { getInstance: vi.fn(() => ({ urlHandler: vi.fn() })) },
}));

vi.mock('./GleapHelper', () => ({
  bootstrapGleapFrame: vi.fn(),
}));

const MODAL_URL = 'https://outboundmedia.gleap.io/modal';
const MODAL_ORIGIN = 'https://outboundmedia.gleap.io';

const emitFromModal = (name, data) => {
  window.dispatchEvent(
    new MessageEvent('message', {
      data: JSON.stringify({ type: 'MODAL', name, data }),
      origin: MODAL_ORIGIN,
    }),
  );
};

const wrapper = () => document.querySelector('.gleap-modal-wrapper');
const frame = () => document.querySelector('.gleap-modal-frame');

let manager;
let warn;

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = '';
  document.body.className = '';
  bootstrapGleapFrame.mockReset();
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  manager = new GleapModalManager();
  vi.spyOn(manager, '_postMessage').mockImplementation(() => {});
});

afterEach(() => {
  manager.hideModal();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('the card stays invisible until it has content', () => {
  it('starts hidden and is revealed by the first modal-height', () => {
    manager.showModal({ config: { steps: [{ title: 'Hi' }] } });

    expect(wrapper().classList.contains('gleap-modal-wrapper--loading')).toBe(true);

    emitFromModal('modal-loaded');
    // Loaded is not enough — the renderer has no data yet, so the card is still empty.
    expect(wrapper().classList.contains('gleap-modal-wrapper--loading')).toBe(true);

    emitFromModal('modal-height', { height: 320 });
    expect(wrapper().classList.contains('gleap-modal-wrapper--loading')).toBe(false);
    expect(frame().style.height).toBe('320px');
  });
});

describe('load watchdog', () => {
  it('falls back to a direct src load when the renderer never announces itself', () => {
    manager.showModal({ config: { steps: [{ title: 'Hi' }] } });
    expect(bootstrapGleapFrame).toHaveBeenCalledWith(frame(), MODAL_URL);
    expect(frame().getAttribute('src')).toBeNull();

    vi.advanceTimersByTime(MODAL_LOAD_TIMEOUT_MS - 1);
    expect(frame().getAttribute('src')).toBeNull();

    vi.advanceTimersByTime(1);
    expect(frame().getAttribute('src')).toBe(MODAL_URL);
    // Still showing — the direct load gets its own chance.
    expect(wrapper()).not.toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });

  it('takes the blank card down when the direct load does not report in either', () => {
    manager.showModal({ config: { steps: [{ title: 'Hi' }] } });

    vi.advanceTimersByTime(MODAL_LOAD_TIMEOUT_MS * 2);

    expect(wrapper()).toBeNull();
    expect(document.body.classList.contains('gleap-modal-open')).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain(MODAL_URL);
  });

  it('is cancelled by modal-loaded', () => {
    manager.showModal({ config: { steps: [{ title: 'Hi' }] } });

    emitFromModal('modal-loaded');
    vi.advanceTimersByTime(MODAL_LOAD_TIMEOUT_MS * 3);

    expect(frame().getAttribute('src')).toBeNull();
    expect(wrapper()).not.toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });

  it('accepts a late modal-loaded from the direct load and keeps the card', () => {
    manager.showModal({ config: { steps: [{ title: 'Hi' }] } });

    vi.advanceTimersByTime(MODAL_LOAD_TIMEOUT_MS);
    expect(frame().getAttribute('src')).toBe(MODAL_URL);

    emitFromModal('modal-loaded');
    emitFromModal('modal-height', { height: 200 });
    vi.advanceTimersByTime(MODAL_LOAD_TIMEOUT_MS * 2);

    expect(wrapper()).not.toBeNull();
    expect(wrapper().classList.contains('gleap-modal-wrapper--loading')).toBe(false);
    expect(warn).not.toHaveBeenCalled();
  });

  it('does not restart a direct load the bootstrap already started', () => {
    bootstrapGleapFrame.mockImplementation((iframe, url) => {
      iframe.src = url;
    });
    const setSrc = vi.spyOn(HTMLIFrameElement.prototype, 'src', 'set');

    manager.showModal({ config: { steps: [{ title: 'Hi' }] } });
    expect(setSrc).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(MODAL_LOAD_TIMEOUT_MS);
    expect(setSrc).toHaveBeenCalledTimes(1);
    // ...but it still gives up on it eventually.
    vi.advanceTimersByTime(MODAL_LOAD_TIMEOUT_MS);
    expect(wrapper()).toBeNull();
  });

  it('is dropped with the card on hideModal', () => {
    manager.showModal({ config: { steps: [{ title: 'Hi' }] } });
    manager.hideModal();

    vi.advanceTimersByTime(MODAL_LOAD_TIMEOUT_MS * 3);
    expect(warn).not.toHaveBeenCalled();
    expect(manager.modalLoadTimeout).toBeNull();
  });

  it('re-arms for every show, even while a previous card is still pending', () => {
    manager.showModal({ config: { steps: [{ title: 'first' }] } });
    vi.advanceTimersByTime(MODAL_LOAD_TIMEOUT_MS - 100);

    manager.showModal({ config: { steps: [{ title: 'second' }] } });
    vi.advanceTimersByTime(200);
    // The first card's timer must not have fired against the second card.
    expect(frame().getAttribute('src')).toBeNull();

    vi.advanceTimersByTime(MODAL_LOAD_TIMEOUT_MS - 200);
    expect(frame().getAttribute('src')).toBe(MODAL_URL);
  });
});
