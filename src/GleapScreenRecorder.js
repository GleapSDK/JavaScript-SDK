import GleapSession from './GleapSession';
import { DisplayRecording, requestDisplayStream } from './GleapCaptureRecorder';
import { stopStream } from './GleapCaptureScreenshot';
import { hasDisplayMedia, isDesktopChromium } from './GleapCaptureSettings';

// The feedback form's screen recording ("Record screen" in the form's capture step). It records the
// same way capture requests do (GleapCaptureRecorder): Chromium offers the current tab with one
// click, other browsers show their own picker.
export class GleapScreenRecorder {
  static MAX_RECORD_TIME = 120; // 2 minutes
  static RERENDER_DELAY = 100; // milliseconds

  // CSS selectors
  static SELECTORS = {
    PREVIEW_VIDEO: '.bb-capture-preview video',
    TIMER_LABEL: '.bb-capture-toolbar-item-timer',
    TOOLBAR: '.bb-capture-toolbar',
  };

  // Instance properties
  rerender;
  // The running DisplayRecording, from the Start click until it stopped.
  recording = null;
  audioMuted = false;
  audioAvailable = true;
  available = true;
  isRecording = false;
  file = null;
  permissionErrorText = '';

  constructor(rerender, permissionErrorText) {
    this.rerender = rerender;
    this.permissionErrorText = permissionErrorText;
    this.available = hasDisplayMedia();

    setTimeout(() => {
      this.rerender();
    }, GleapScreenRecorder.RERENDER_DELAY);
  }

  formatTime(s) {
    return (s - (s %= 60)) / 60 + (9 < s ? ':' : ':0') + s;
  }

  // The editor is gone once the form shows again: nothing to render then.
  rerenderEditor() {
    if (document.querySelector(GleapScreenRecorder.SELECTORS.TOOLBAR)) {
      this.rerender();
    }
  }

  setTimerLabel(remainingSec) {
    const timerLabel = document.querySelector(GleapScreenRecorder.SELECTORS.TIMER_LABEL);
    if (timerLabel) {
      timerLabel.innerHTML = this.formatTime(Math.max(0, remainingSec));
    }
  }

  // Called inside the Start click: the browser's share dialog needs that user activation.
  startScreenRecording() {
    if (!hasDisplayMedia()) {
      this.available = false;
      this.rerender();
      return;
    }
    if (this.recording) {
      return;
    }

    const streamPromise = requestDisplayStream(isDesktopChromium());
    const recording = new DisplayRecording({
      maxDurationSec: GleapScreenRecorder.MAX_RECORD_TIME,
      onTick: (elapsedSec) => this.setTimerLabel(GleapScreenRecorder.MAX_RECORD_TIME - elapsedSec),
      onStop: (result) => this.onRecordingEnded(recording, result),
      onError: () => this.onRecordingEnded(recording, null),
    });
    this.recording = recording;

    streamPromise
      .then((stream) => {
        // Stopped or dismissed while the share dialog was open.
        if (this.recording !== recording) {
          stopStream(stream);
          return null;
        }
        return recording.start(stream, !this.audioMuted).then(({ hasMicrophone }) => {
          this.audioAvailable = hasMicrophone;
          this.isRecording = true;
          this.setTimerLabel(GleapScreenRecorder.MAX_RECORD_TIME);
          this.rerenderEditor();
        });
      })
      .catch(() => {
        if (this.recording !== recording) {
          return;
        }
        recording.cancel();
        this.recording = null;
        this.isRecording = false;
        window.alert(this.permissionErrorText);
        this.rerenderEditor();
      });
  }

  // The Stop button, the time limit and the browser's "Stop sharing" all end here (DisplayRecording
  // releases the screen and the microphone on every path). `result` is null when nothing was recorded.
  onRecordingEnded(recording, result) {
    if (this.recording !== recording) {
      return;
    }
    this.recording = null;
    this.isRecording = false;
    this.setTimerLabel(GleapScreenRecorder.MAX_RECORD_TIME);

    if (result) {
      this.file = new File([result.blob], result.fileName, { type: result.type });
      const previewVideoElement = document.querySelector(GleapScreenRecorder.SELECTORS.PREVIEW_VIDEO);
      if (previewVideoElement) {
        previewVideoElement.src = URL.createObjectURL(result.blob);
      }
    }
    this.rerenderEditor();
  }

  stopScreenRecording() {
    if (!this.recording) {
      return;
    }
    if (!this.isRecording) {
      // The share dialog is still open: the stream is stopped when it arrives.
      this.recording = null;
      return;
    }
    this.recording.stop();
  }

  toggleAudio() {
    this.audioMuted = !this.audioMuted;
    if (this.recording) {
      this.recording.setMicrophoneEnabled(!this.audioMuted);
    }
    this.rerender();
  }

  /**
   * Uploads a file of a report (the screen recording, the tab screenshot); resolves with its URL.
   */
  static async uploadFile(file) {
    if (file == null) {
      return null;
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', GleapSession.getInstance().apiUrl + '/uploads/sdk');
      GleapSession.getInstance().injectSession(xhr);

      const formData = new FormData();
      formData.append('file', file);

      xhr.onerror = function () {
        reject(new Error('Network error during file upload'));
      };
      xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
          if (xhr.status == 200) {
            resolve(JSON.parse(xhr.response).fileUrl);
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      };
      xhr.send(formData);
    });
  }

  clearPreview() {
    const videoEl = document.querySelector(GleapScreenRecorder.SELECTORS.PREVIEW_VIDEO);
    if (videoEl) {
      videoEl.src = null;
    }
    this.file = null;
    this.rerender();
  }
}
