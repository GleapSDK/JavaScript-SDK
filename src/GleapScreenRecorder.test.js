/**
 * @vitest-environment jsdom
 */
import { test, expect, vi, beforeEach } from 'vitest';
import { GleapScreenRecorder, MIC_BUTTON } from './GleapScreenRecorder';
import { requestDisplayStream } from './GleapCaptureRecorder';
import { getCaptureConfig, hasDisplayMedia, hasUserMedia, isDesktopChromium } from './GleapCaptureSettings';
import { stopStream } from './GleapCaptureScreenshot';

// The feedback form's recorder runs on the capture requests' recording engine (#228450).
const mockRecordings = [];

vi.mock('./GleapSession', () => ({ __esModule: true, default: { getInstance: () => ({}) } }));
vi.mock('./GleapCaptureScreenshot', () => ({ stopStream: vi.fn() }));
vi.mock('./GleapCaptureSettings', () => ({
  getCaptureConfig: vi.fn(() => ({})),
  hasDisplayMedia: vi.fn(() => true),
  hasUserMedia: vi.fn(() => true),
  isDesktopChromium: vi.fn(() => true),
}));
vi.mock('./GleapCaptureRecorder', () => ({
  requestDisplayStream: vi.fn(),
  DisplayRecording: class {
    constructor(options) {
      this.options = options;
      // Like the real engine: a microphone track only when one was asked for.
      this.start = vi.fn((stream, withMicrophone) => Promise.resolve({ hasMicrophone: !!withMicrophone }));
      this.stop = vi.fn();
      this.cancel = vi.fn();
      this.setMicrophoneEnabled = vi.fn();
      mockRecordings.push(this);
    }
  },
}));

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const STREAM = { id: 'tab-stream' };

let rerender;
const createRecorder = () => new GleapScreenRecorder(rerender, 'No access to the screen.');

beforeEach(() => {
  mockRecordings.length = 0;
  rerender = vi.fn();
  hasDisplayMedia.mockReturnValue(true);
  hasUserMedia.mockReturnValue(true);
  // Developer options → Microphone is on in most tests; the setting's own tests turn it off.
  getCaptureConfig.mockReturnValue({ allowMicrophone: true });
  isDesktopChromium.mockReturnValue(true);
  requestDisplayStream.mockReset().mockReturnValue(Promise.resolve(STREAM));
  stopStream.mockClear();
  window.alert = vi.fn();
  URL.createObjectURL = vi.fn(() => 'blob:preview');
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

// A site that already holds microphone permission gets no browser prompt, so the setting is the
// only thing that keeps sound out of the recording.
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

test('the mic button: hidden without the setting, off by default, on once turned on', () => {
  getCaptureConfig.mockReturnValue({});
  expect(createRecorder().micButtonState()).toBe(MIC_BUTTON.HIDDEN);

  getCaptureConfig.mockReturnValue({ allowMicrophone: true });
  const recorder = createRecorder();
  expect(recorder.micButtonState()).toBe(MIC_BUTTON.OFF);
  recorder.toggleAudio();
  expect(recorder.micButtonState()).toBe(MIC_BUTTON.ON);
  recorder.toggleAudio();
  expect(recorder.micButtonState()).toBe(MIC_BUTTON.OFF);
});

test('started without the microphone: the button goes away for that recording and is back after it', async () => {
  const recorder = createRecorder();
  recorder.startScreenRecording();
  await flush();

  expect(recorder.micButtonState()).toBe(MIC_BUTTON.HIDDEN);
  recorder.toggleAudio();
  expect(mockRecordings[0].setMicrophoneEnabled).not.toHaveBeenCalled();

  mockRecordings[0].options.onStop(null);
  expect(recorder.micButtonState()).toBe(MIC_BUTTON.OFF);
});

test('turned on but the browser gave no microphone: shown as unavailable, mute does nothing', async () => {
  const recorder = createRecorder();
  recorder.toggleAudio();
  recorder.startScreenRecording();
  mockRecordings[0].start.mockReturnValue(Promise.resolve({ hasMicrophone: false }));
  await flush();

  expect(recorder.micButtonState()).toBe(MIC_BUTTON.UNAVAILABLE);
  recorder.toggleAudio();
  expect(mockRecordings[0].setMicrophoneEnabled).not.toHaveBeenCalled();
});

test('muting while recording with the microphone turns its track off', async () => {
  const recorder = createRecorder();
  recorder.toggleAudio();
  recorder.startScreenRecording();
  await flush();

  expect(recorder.micButtonState()).toBe(MIC_BUTTON.ON);
  recorder.toggleAudio();
  expect(mockRecordings[0].setMicrophoneEnabled).toHaveBeenCalledWith(false);
  expect(recorder.micButtonState()).toBe(MIC_BUTTON.OFF);
});
