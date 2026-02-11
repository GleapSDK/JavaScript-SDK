import GleapSession from './GleapSession';

export class GleapScreenRecorder {
  // Constants
  static MAX_RECORD_TIME = 120; // 2 minutes
  static MAX_WIDTH = 3072;
  static MAX_HEIGHT = 1728;
  static IDEAL_FRAME_RATE = 10;
  static MAX_FRAME_RATE = 24;
  static CHUNK_INTERVAL = 200; // milliseconds
  static TIMER_UPDATE_INTERVAL = 1000; // milliseconds
  static RERENDER_DELAY = 100; // milliseconds

  // MIME types in order of preference
  static MIME_TYPES = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];

  // CSS selectors
  static SELECTORS = {
    PREVIEW_VIDEO: '.bb-capture-preview video',
    TIMER_LABEL: '.bb-capture-toolbar-item-timer',
  };

  // Instance properties
  rerender;
  stream;
  mediaRecorder;
  audioMuted = false;
  audioAvailable = true;
  available = true;
  isRecording = false;
  file = null;
  maxRecordTime = GleapScreenRecorder.MAX_RECORD_TIME;
  recordTime = 0;
  recordingTimer = null;
  permissionErrorText = '';

  // Internals for composed capture
  _displayVideoTrack = null;
  _displayStream = null;
  _micStream = null;

  constructor(rerender, permissionErrorText) {
    this.rerender = rerender;
    this.permissionErrorText = permissionErrorText;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      this.available = false;
    }

    setTimeout(() => {
      this.rerender();
    }, GleapScreenRecorder.RERENDER_DELAY);
  }

  getSupportedMimeType() {
    // Prefer explicit audio+video codecs to ensure audio gets muxed.
    for (const type of GleapScreenRecorder.MIME_TYPES) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'video/webm';
  }

  formatTime(s) {
    return (s - (s %= 60)) / 60 + (9 < s ? ':' : ':0') + s;
  }

  stopStreamTracks(stream) {
    if (!stream) return;
    try {
      stream.getTracks().forEach((track) => track.stop());
    } catch (_) {}
  }

  createMediaStream(tracks) {
    const validTracks = tracks.filter((track) => track !== null);
    return new MediaStream(validTracks);
  }

  getFirstVideoTrack(stream) {
    if (!stream) return null;
    const videoTracks = stream.getVideoTracks();
    return videoTracks.length > 0 ? videoTracks[0] : null;
  }

  getFirstAudioTrack(stream) {
    if (!stream) return null;
    const audioTracks = stream.getAudioTracks();
    return audioTracks.length > 0 ? audioTracks[0] : null;
  }

  async startScreenRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia || this.isRecording) {
      this.available = false;
      this.rerender();
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: {
            ideal: Math.min(window.screen.width, GleapScreenRecorder.MAX_WIDTH),
          },
          height: {
            ideal: Math.min(window.screen.height, GleapScreenRecorder.MAX_HEIGHT),
          },
          frameRate: {
            ideal: GleapScreenRecorder.IDEAL_FRAME_RATE,
            max: GleapScreenRecorder.MAX_FRAME_RATE,
          },
          displaySurface: 'monitor',
        },
        audio: false,
        selfBrowserSurface: 'include',
      });

      // Keep references to both the original stream and video track
      this._displayStream = displayStream;
      this._displayVideoTrack = this.getFirstVideoTrack(displayStream);

      // If user wants audio and permissions allow it, get mic, else continue with video-only
      if (!this.audioMuted) {
        await this.startAudioRecording();
      } else {
        this.audioAvailable = false;
        const composed = this.createMediaStream([this._displayVideoTrack]);
        this.stream = composed;
        this.handleRecord({ stream: composed });
      }

      this.rerender();
    } catch (error) {
      window.alert(this.permissionErrorText);
      this.rerender();
    }
  }

  stopScreenRecording() {
    if (!this.mediaRecorder || !this.stream || !this.isRecording) {
      return;
    }

    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }

    try {
      this.mediaRecorder.stop();
    } catch (_) {}

    // Stop composed stream tracks
    this.stopStreamTracks(this.stream);

    // Stop original display stream tracks (this is what Chrome uses for the recording indicator)
    if (this._displayStream) {
      this.stopStreamTracks(this._displayStream);
      this._displayStream = null;
    }

    // Also stop original mic stream tracks if present
    if (this._micStream) {
      this.stopStreamTracks(this._micStream);
      this._micStream = null;
    }

    this._displayVideoTrack = null;

    this.rerender();
  }

  async startAudioRecording() {
    if (!this._displayVideoTrack) {
      return;
    }

    try {
      const voiceStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      this._micStream = voiceStream;
      const micTrack = this.getFirstAudioTrack(voiceStream);

      this.audioMuted = false;
      this.audioAvailable = !!micTrack;

      // Compose a NEW stream with exactly one video track + (optional) one mic track
      const composed = this.createMediaStream([this._displayVideoTrack, micTrack]);

      this.stream = composed;
      this.handleRecord({ stream: composed });
      this.rerender();
    } catch (error) {
      this.audioAvailable = false;

      // Fallback to video-only if mic fails
      const composed = this.createMediaStream([this._displayVideoTrack]);

      this.stream = composed;
      this.handleRecord({ stream: composed });
      this.rerender();
    }
  }

  toggleAudio() {
    this.audioMuted = !this.audioMuted;
    this.rerender();

    if (!this.stream) {
      return;
    }

    const audioTracks = this.stream.getAudioTracks();
    for (let i = 0; i < audioTracks.length; i++) {
      const audioTrack = audioTracks[i];
      audioTrack.enabled = !this.audioMuted;
    }
  }

  static async uploadScreenRecording(screenRecordingData) {
    if (screenRecordingData == null) {
      return null;
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', GleapSession.getInstance().apiUrl + '/uploads/sdk');
      GleapSession.getInstance().injectSession(xhr);

      const formData = new FormData();
      formData.append('file', screenRecordingData);

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

  handleRecord({ stream }) {
    const self = this;

    const recordedChunks = [];
    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: this.getSupportedMimeType(),
    });
    this.isRecording = true;
    this.recordTime = 0;

    // Set timer (guard if label isn't present)
    const timerLabel = document.querySelector(GleapScreenRecorder.SELECTORS.TIMER_LABEL);
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
    this.recordingTimer = setInterval(() => {
      self.recordTime++;
      const remainingTime = self.maxRecordTime - self.recordTime;
      if (timerLabel) {
        if (remainingTime > 0) {
          timerLabel.innerHTML = self.formatTime(remainingTime);
        } else {
          timerLabel.innerHTML = '2:00';
          self.stopScreenRecording();
        }
      } else if (remainingTime <= 0) {
        self.stopScreenRecording();
      }
    }, GleapScreenRecorder.TIMER_UPDATE_INTERVAL);

    this.mediaRecorder.ondataavailable = function (e) {
      if (e.data && e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    const videoTrack = this.getFirstVideoTrack(stream);
    if (videoTrack) {
      videoTrack.onended = function () {
        self.prepareRecording(recordedChunks);
      };
    }

    this.mediaRecorder.onstop = function () {
      self.prepareRecording(recordedChunks);
    };

    // Start recording with configured chunk interval
    this.mediaRecorder.start(GleapScreenRecorder.CHUNK_INTERVAL);

    self.rerender();
  }

  prepareRecording(recordedChunks) {
    const mimeType = this.getSupportedMimeType();
    const completeBlob = new Blob(recordedChunks, { type: mimeType });

    const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
    this.file = new File([completeBlob], `screen-recording.${extension}`, {
      type: mimeType,
    });

    const previewVideoElement = document.querySelector(GleapScreenRecorder.SELECTORS.PREVIEW_VIDEO);
    if (previewVideoElement) {
      previewVideoElement.src = URL.createObjectURL(completeBlob);
      this.audioAvailable = this.stream ? this.stream.getAudioTracks().length > 0 : this.audioAvailable;
      this.isRecording = false;
      this.rerender();
    }
  }
}
