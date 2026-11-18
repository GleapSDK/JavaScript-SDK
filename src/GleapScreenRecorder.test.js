/**
 * @jest-environment jsdom
 */
import { GleapScreenRecorder } from './GleapScreenRecorder';
import { requestDisplayStream } from './GleapCaptureRecorder';
import { getCaptureConfig, hasDisplayMedia, hasUserMedia, isDesktopChromium } from './GleapCaptureSettings';

// The feedback form's recorder runs on the capture requests' recording engine (#228450).
const mockRecordings = [];

jest.mock('./GleapSession', () => ({ __esModule: true, default: { getInstance: () => ({}) } }));
jest.mock('./GleapCaptureScreenshot', () => ({ stopStream: jest.fn() }));
jest.mock('./GleapCaptureSettings', () => ({
  getCaptureConfig: jest.fn(() => ({})),
  hasDisplayMedia: jest.fn(() => true),
  hasUserMedia: jest.fn(() => true),
  isDesktopChromium: jest.fn(() => true),
}));
jest.mock('./GleapCaptureRecorder', () => ({
  requestDisplayStream: jest.fn(),
  DisplayRecording: class {
    constructor(options) {
      this.options = options;
      // Like the real engine: a microphone track only when one was asked for.
      this.start = jest.fn((stream, withMicrophone) => Promise.resolve({ hasMicrophone: !!withMicrophone }));
      this.stop = jest.fn();
      this.cancel = jest.fn();
      this.setMicrophoneEnabled = jest.fn();
      mockRecordings.push(this);
    }
  },
}));

const { stopStream } = jest.requireMock('./GleapCaptureScreenshot');
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const STREAM = { id: 'tab-stream' };

let rerender;
const createRecorder = () => new GleapScreenRecorder(rerender, 'No access to the screen.');

beforeEach(() => {
  mockRecordings.length = 0;
  rerender = jest.fn();
  hasDisplayMedia.mockReturnValue(true);
  hasUserMedia.mockReturnValue(true);
  // Developer options → Microphone is on in most tests; the setting's own tests turn it off.
  getCaptureConfig.mockReturnValue({ allowMicrophone: true });
  isDesktopChromium.mockReturnValue(true);
  requestDisplayStream.mockReset().mockReturnValue(Promise.resolve(STREAM));
  stopStream.mockClear();
  window.alert = jest.fn();
  URL.createObjectURL = jest.fn(() => 'blob:preview');
  document.body.innerHTML =
    '<div class="bb-capture-toolbar"><div class="bb-capture-toolbar-item-timer"></div></div>' +
    '<div class="bb-capture-preview"><video></video></div>';
});

test('Start asks for the current tab (Chromium) inside the click and records with the microphone the user turned on', async () => {
  const recorder = createRecorder();
  recorder.toggleAudio();
  recorder.startScreenRecording();

  // Synchronously: the share dialog needs the click's user activation.
  expect(requestDisplayStream).toHaveBeenCalledWith(true);
  await flush();

  expect(mockRecordings[0].options.maxDurationSec).toBe(120);
  expect(mockRecordings[0].start).toHaveBeenCalledWith(STREAM, true);
  expect(recorder.isRecording).toBe(true);
  expect(recorder.audioAvailable).toBe(true);
});

test('other browsers get their own picker; the microphone is off until the user turns it on', async () => {
  isDesktopChromium.mockReturnValue(false);
  const recorder = createRecorder();
  expect(recorder.audioMuted).toBe(true);
  recorder.startScreenRecording();
  await flush();

  expect(requestDisplayStream).toHaveBeenCalledWith(false);
  expect(mockRecordings[0].start).toHaveBeenCalledWith(STREAM, false);
});

// Gleap #229336: the form recorded sound with Developer options → Microphone off, silently where
// the site already had microphone permission.
test('with the Microphone setting off the recording never asks for the microphone', async () => {
  getCaptureConfig.mockReturnValue({});
  const recorder = createRecorder();
  expect(recorder.microphoneAllowed()).toBe(false);
  expect(recorder.audioAvailable).toBe(false);

  // The mic button is hidden then; a click on it still changes nothing.
  recorder.toggleAudio();
  expect(recorder.audioMuted).toBe(true);
  recorder.startScreenRecording();
  await flush();

  expect(mockRecordings[0].start).toHaveBeenCalledWith(STREAM, false);
  recorder.toggleAudio();
  expect(mockRecordings[0].setMicrophoneEnabled).not.toHaveBeenCalled();
  expect(recorder.audioAvailable).toBe(false);
});

test('allowMicrophone must be exactly true, and the browser must have getUserMedia', async () => {
  getCaptureConfig.mockReturnValue({ allowMicrophone: 'true' });
  expect(createRecorder().microphoneAllowed()).toBe(false);

  getCaptureConfig.mockReturnValue({ allowMicrophone: true });
  hasUserMedia.mockReturnValue(false);
  const recorder = createRecorder();
  expect(recorder.microphoneAllowed()).toBe(false);
  recorder.toggleAudio();
  recorder.startScreenRecording();
  await flush();
  expect(mockRecordings[0].start).toHaveBeenCalledWith(STREAM, false);
});

test('the timer counts down and the stopped recording becomes the file and the preview', async () => {
  const recorder = createRecorder();
  recorder.startScreenRecording();
  await flush();

  mockRecordings[0].options.onTick(15);
  expect(document.querySelector('.bb-capture-toolbar-item-timer').innerHTML).toBe('1:45');

  recorder.stopScreenRecording();
  expect(mockRecordings[0].stop).toHaveBeenCalled();
  mockRecordings[0].options.onStop({
    blob: new Blob(['video']),
    type: 'video/mp4',
    fileName: 'screen-recording.mp4',
  });

  expect(recorder.isRecording).toBe(false);
  expect(recorder.file.name).toBe('screen-recording.mp4');
  expect(recorder.file.type).toBe('video/mp4');
  expect(document.querySelector('.bb-capture-preview video').getAttribute('src')).toBe('blob:preview');
});

test('a declined share dialog tells the user and leaves the recorder ready for another try', async () => {
  requestDisplayStream.mockReturnValue(Promise.reject(new Error('NotAllowedError')));
  const recorder = createRecorder();
  recorder.startScreenRecording();
  await flush();

  expect(window.alert).toHaveBeenCalledWith('No access to the screen.');
  expect(recorder.isRecording).toBe(false);

  requestDisplayStream.mockReturnValue(Promise.resolve(STREAM));
  recorder.startScreenRecording();
  await flush();
  expect(recorder.isRecording).toBe(true);
});

test('dismissed while the share dialog is open: the stream is stopped, nothing records', async () => {
  const recorder = createRecorder();
  recorder.startScreenRecording();
  recorder.stopScreenRecording();
  await flush();

  expect(stopStream).toHaveBeenCalledWith(STREAM);
  expect(mockRecordings[0].start).not.toHaveBeenCalled();
  expect(recorder.isRecording).toBe(false);
});

test('without getDisplayMedia the recorder is unavailable', () => {
  hasDisplayMedia.mockReturnValue(false);
  const recorder = createRecorder();
  recorder.startScreenRecording();

  expect(recorder.available).toBe(false);
  expect(requestDisplayStream).not.toHaveBeenCalled();
});

test('the mic button: hidden without the setting, off by default, on once turned on', async () => {
  getCaptureConfig.mockReturnValue({});
  expect(createRecorder().micButtonState()).toBe('hidden');

  getCaptureConfig.mockReturnValue({ allowMicrophone: true });
  const recorder = createRecorder();
  expect(recorder.micButtonState()).toBe('off');
  recorder.toggleAudio();
  expect(recorder.micButtonState()).toBe('on');
  recorder.toggleAudio();
  expect(recorder.micButtonState()).toBe('off');
});

test('started without the microphone: the button goes away for that recording and is back after it', async () => {
  const recorder = createRecorder();
  recorder.startScreenRecording();
  await flush();

  expect(recorder.micButtonState()).toBe('hidden');
  recorder.toggleAudio();
  expect(mockRecordings[0].setMicrophoneEnabled).not.toHaveBeenCalled();

  mockRecordings[0].options.onStop(null);
  expect(recorder.micButtonState()).toBe('off');
});

test('turned on but the browser gave no microphone: shown as unavailable, mute does nothing', async () => {
  const recorder = createRecorder();
  recorder.toggleAudio();
  recorder.startScreenRecording();
  mockRecordings[0].start.mockReturnValue(Promise.resolve({ hasMicrophone: false }));
  await flush();

  expect(recorder.micButtonState()).toBe('unavailable');
  recorder.toggleAudio();
  expect(mockRecordings[0].setMicrophoneEnabled).not.toHaveBeenCalled();
});

test('muting while recording with the microphone turns its track off', async () => {
  const recorder = createRecorder();
  recorder.toggleAudio();
  recorder.startScreenRecording();
  await flush();

  expect(recorder.micButtonState()).toBe('on');
  recorder.toggleAudio();
  expect(mockRecordings[0].setMicrophoneEnabled).toHaveBeenCalledWith(false);
  expect(recorder.micButtonState()).toBe('off');
});
