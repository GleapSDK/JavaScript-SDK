/**
 * @jest-environment jsdom
 */
import GleapMarkerManager from './GleapMarkerManager';
import { captureTabScreenshot, requestTabStream } from './GleapCaptureScreenshot';
import { canCaptureTab } from './GleapCaptureSettings';

// The feedback form's "Mark the bug" step takes its screenshot from the tab on Next (#228450).
const mockGlobalData = {};
const mockSendMessage = jest.fn();

jest.mock('./Gleap', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      overrideLanguage: '',
      setGlobalDataItem: (key, value) => {
        mockGlobalData[key] = value;
      },
    }),
  },
  GleapTranslationManager: { translateText: (key) => key, getInstance: () => ({ isRTLLayout: false }) },
  GleapFrameManager: { getInstance: () => ({ sendMessage: mockSendMessage }) },
  GleapCaptureManager: {
    getInstance: () => ({ privacyOptions: () => ({ maskAllInputs: true }), maskSelectors: () => ['.secret'] }),
  },
}));
jest.mock('./ScreenDrawer', () => ({ ScreenDrawer: jest.fn() }));
jest.mock('./GleapScrollStopper', () => ({ GleapScrollStopper: { enableScroll: jest.fn(), disableScroll: jest.fn() } }));
jest.mock('./GleapScreenRecorder', () => ({ GleapScreenRecorder: jest.fn() }));
jest.mock('./UI', () => ({ loadIcon: () => '' }));
jest.mock('./GleapCaptureSettings', () => ({ canCaptureTab: jest.fn() }));
jest.mock('./GleapCaptureScreenshot', () => ({ captureTabScreenshot: jest.fn(), requestTabStream: jest.fn() }));

const IMAGE = { dataUrl: 'data:image/jpeg;base64,/9j/4AAQ', width: 1280, height: 720, method: 'tab' };
const STREAM_PROMISE = Promise.resolve({ id: 'tab-stream' });
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

let manager;
let callback;
let resolveCapture;
const editor = () => document.querySelector('.bb-capture-editor');

beforeEach(() => {
  Object.keys(mockGlobalData).forEach((key) => delete mockGlobalData[key]);
  mockSendMessage.mockClear();
  canCaptureTab.mockReset().mockReturnValue(true);
  requestTabStream.mockReset().mockReturnValue(STREAM_PROMISE);
  captureTabScreenshot.mockReset().mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveCapture = resolve;
      })
  );
  document.body.innerHTML = '';
  manager = new GleapMarkerManager('screenshot');
  manager.createEditorUI();
  callback = jest.fn();
  manager.callback = callback;
});

test('Next asks for the tab inside the click, hides the editor (not the drawings) and keeps the image', async () => {
  manager.showNextStep();

  // Synchronously: the share dialog needs the click's user activation.
  expect(requestTabStream).toHaveBeenCalledTimes(1);
  expect(editor().classList.contains('bb-capture-editor--capturing')).toBe(true);
  expect(document.querySelector('.bb-capture-svg')).not.toBeNull();
  const options = captureTabScreenshot.mock.calls[0][0];
  expect(options.streamPromise).toBe(STREAM_PROMISE);
  expect(options.privacyOptions).toEqual({ maskAllInputs: true });
  expect(options.maskSelectors).toEqual(['.secret']);
  expect(callback).not.toHaveBeenCalled();

  // A second Next (Enter) while the share dialog is open asks nothing again.
  manager.showNextStep();
  expect(requestTabStream).toHaveBeenCalledTimes(1);

  resolveCapture(IMAGE);
  await flush();

  expect(mockGlobalData.screenshotImage).toBe(IMAGE);
  expect(callback).toHaveBeenCalledWith(true);
  expect(mockSendMessage).toHaveBeenCalledWith({
    name: 'set-form-data',
    data: { formKey: 'capture', data: { value: 'screenshot', dirty: true } },
  });
});

test('declined or failed: the form goes on without an image (the report renders the DOM)', async () => {
  captureTabScreenshot.mockReturnValue(Promise.reject(new Error('tab-timeout')));
  manager.showNextStep();
  await flush();

  expect(mockGlobalData.screenshotImage).toBeNull();
  expect(callback).toHaveBeenCalledWith(true);
});

test('no tab capture in this browser: Next goes on right away, as before', () => {
  canCaptureTab.mockReturnValue(false);
  manager.showNextStep();

  expect(requestTabStream).not.toHaveBeenCalled();
  expect(mockGlobalData.screenshotImage).toBeUndefined();
  expect(callback).toHaveBeenCalledWith(true);
});

test('dismissed while the share dialog is open: the capture stops and its image is dropped', async () => {
  manager.showNextStep();
  manager.dismiss();

  expect(captureTabScreenshot.mock.calls[0][0].isActive()).toBe(false);
  expect(callback).toHaveBeenCalledWith(false);

  resolveCapture(IMAGE);
  await flush();
  expect(mockGlobalData.screenshotImage).toBeUndefined();
  expect(callback).toHaveBeenCalledTimes(1);
});

test('removing the capture drops the image', async () => {
  manager.showNextStep();
  resolveCapture(IMAGE);
  await flush();

  manager.clear();
  expect(mockGlobalData.screenshotImage).toBeNull();
  expect(editor()).toBeNull();
});

test('a screen recording never asks for a tab screenshot', () => {
  manager.type = 'capture';
  manager.showNextStep();

  expect(requestTabStream).not.toHaveBeenCalled();
  expect(callback).toHaveBeenCalledWith(true);
});
