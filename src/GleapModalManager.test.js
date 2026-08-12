/**
 * @jest-environment jsdom
 */
import GleapModalManager from './GleapModalManager';

// Stub the barrel so the real GleapModalManager loads without the rest of the SDK.
// We only drive the modal-height contract, which reaches GleapConfigManager.
jest.mock('./Gleap', () => ({
  __esModule: true,
  default: {},
  GleapConfigManager: {
    getInstance: jest.fn(() => ({ getFlowConfig: () => ({}) })),
  },
  GleapFrameManager: { getInstance: jest.fn(() => ({ urlHandler: jest.fn() })) },
}));

jest.mock('./GleapHelper', () => ({
  bootstrapGleapFrame: jest.fn(),
}));

const MODAL_ORIGIN = 'https://outboundmedia.gleap.io';

const setViewportHeight = (height) => {
  Object.defineProperty(document.documentElement, 'clientHeight', {
    value: height,
    configurable: true,
  });
};

const emitFromModal = (name, data) => {
  window.dispatchEvent(
    new MessageEvent('message', {
      data: JSON.stringify({ type: 'MODAL', name, data }),
      origin: MODAL_ORIGIN,
    }),
  );
};

let manager;

beforeEach(() => {
  document.body.innerHTML = '';
  document.body.className = '';
  setViewportHeight(800);
  manager = new GleapModalManager();
  jest.spyOn(manager, '_postMessage').mockImplementation(() => {});
  manager.showModal({ config: { steps: [{ title: 'Hi' }] } });
});

afterEach(() => {
  manager.hideModal();
  jest.restoreAllMocks();
});

const postedMessages = (name) => manager._postMessage.mock.calls.map((c) => c[0]).filter((m) => m.name === name);

describe('modal max height', () => {
  it('matches the 90vh cap that UI.js clips the card at', () => {
    // .gleap-modal is `max-height: 90vh; overflow: hidden`, so anything taller
    // loses its footer with no way to scroll to it.
    expect(manager._maxModalHeight()).toBe(720);

    setViewportHeight(667);
    expect(manager._maxModalHeight()).toBe(600);
  });

  it('never rounds above the CSS cap', () => {
    setViewportHeight(675); // 90% is 607.5
    expect(manager._maxModalHeight()).toBe(607);
  });

  it('is sent to the card with modal-data', () => {
    emitFromModal('modal-loaded');

    const [modalData] = postedMessages('modal-data');
    expect(modalData.data.maxHeight).toBe(720);
  });

  it('is re-sent when the viewport changes', () => {
    emitFromModal('modal-loaded');

    setViewportHeight(500);
    window.dispatchEvent(new Event('resize'));

    expect(postedMessages('modal-max-height')).toEqual([{ name: 'modal-max-height', data: { maxHeight: 450 } }]);
  });

  it('is not re-sent when the viewport is unchanged', () => {
    emitFromModal('modal-loaded');

    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('resize'));

    expect(postedMessages('modal-max-height')).toHaveLength(0);
  });

  it('stops listening once the modal is closed', () => {
    emitFromModal('modal-loaded');
    manager.hideModal();

    setViewportHeight(500);
    window.dispatchEvent(new Event('resize'));

    expect(postedMessages('modal-max-height')).toHaveLength(0);
  });
});
