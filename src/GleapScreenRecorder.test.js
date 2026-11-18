/**
 * @vitest-environment jsdom
 */
import { test, expect, vi, beforeEach } from 'vitest';
import { GleapScreenRecorder } from './GleapScreenRecorder';
import { requestDisplayStream } from './GleapCaptureRecorder';
import { hasDisplayMedia, isDesktopChromium } from './GleapCaptureSettings';
import { stopStream } from './GleapCaptureScreenshot';

// The feedback form's recorder runs on the capture requests' recording engine (#228450).
const mockRecordings = [];

vi.mock('./GleapSession', () => ({ __esModule: true, default: { getInstance: () => ({}) } }));
vi.mock('./GleapCaptureScreenshot', () => ({ stopStream: vi.fn() }));
vi.mock('./GleapCaptureSettings', () => ({
  hasDisplayMedia: vi.fn(() => true),
  isDesktopChromium: vi.fn(() => true),
}));
vi.mock('./GleapCaptureRecorder', () => ({
  requestDisplayStream: vi.fn(),
  DisplayRecording: class {
    constructor(options) {
      this.options = options;
      this.start = vi.fn(() => Promise.resolve({ hasMicrophone: true }));
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
  isDesktopChromium.mockReturnValue(true);
  requestDisplayStream.mockReset().mockReturnValue(Promise.resolve(STREAM));
  stopStream.mockClear();
  window.alert = vi.fn();
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  document.body.innerHTML =
    '<div class="bb-capture-toolbar"><div class="bb-capture-toolbar-item-timer"></div></div>' +
    '<div class="bb-capture-preview"><video></video></div>';
});

test('Start asks for the current tab (Chromium) inside the click and records with the microphone', async () => {
  const recorder = createRecorder();
  recorder.startScreenRecording();

  // Synchronously: the share dialog needs the click's user activation.
  expect(requestDisplayStream).toHaveBeenCalledWith(true);
  await flush();

  expect(mockRecordings[0].options.maxDurationSec).toBe(120);
  expect(mockRecordings[0].start).toHaveBeenCalledWith(STREAM, true);
  expect(recorder.isRecording).toBe(true);
  expect(recorder.audioAvailable).toBe(true);
});

test('other browsers get their own picker; a muted start records without the microphone', async () => {
  isDesktopChromium.mockReturnValue(false);
  const recorder = createRecorder();
  recorder.toggleAudio();
  recorder.startScreenRecording();
  await flush();

  expect(requestDisplayStream).toHaveBeenCalledWith(false);
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
