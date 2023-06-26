import GleapSession from "./GleapSession";

export class GleapScreenRecorder {
  rerender;
  stream;
  mediaRecorder;
  audioMuted = false;
  audioAvailable = true;
  available = true;
  isRecording = false;
  file = null;
  maxRecordTime = 120;
  recordTime = 0;
  recordingTimer = null;
  permissionErrorText = "";

  constructor(rerender, permissionErrorText) {
    this.rerender = rerender;
    this.permissionErrorText = permissionErrorText;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      this.available = false;
    }

    setTimeout(() => {
      this.rerender();
    }, 100);
  }

  getSupportedMimeType() {
    if (MediaRecorder.isTypeSupported("video/mp4")) {
      return "video/mp4";
    }
    if (MediaRecorder.isTypeSupported("video/webm;codecs=h264")) {
      return "video/webm;codecs=h264";
    }
    return "video/webm";
  }

  formatTime(s) {
    return (s - (s %= 60)) / 60 + (9 < s ? ":" : ":0") + s;
  }

  startScreenRecording = function () {
    const self = this;
    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getDisplayMedia ||
      this.isRecording
    ) {
      this.available = false;
      this.rerender();
      return;
    }

    const max_width = 3072;
    const max_height = 1728;

    navigator.mediaDevices
      .getDisplayMedia({
        video: {
          width: { ideal: Math.min(window.screen.width, max_width) },
          height: { ideal: Math.min(window.screen.height, max_height) },
          frameRate: { ideal: 15, max: 24 },
          displaySurface: "monitor",
        }, audio: true
      })
      .then(function (displayStream) {
        self.stream = displayStream;

        if (!self.audioMuted) {
          self.startAudioRecording();
        } else {
          self.audioAvailable = false;
          self.handleRecord({ stream: displayStream });
        }

        self.rerender();
      })
      .catch(function (err) {
        window.alert(self.permissionErrorText);
        self.rerender();
      });
  };

  stopScreenRecording = function () {
    if (!this.mediaRecorder || !this.stream || !this.isRecording) {
      return;
    }

    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
    this.mediaRecorder.stop();
    this.stream.getTracks().forEach((track) => {
      track.stop();
    });

    this.rerender();
  };

  startAudioRecording = function () {
    const self = this;

    if (!this.stream) {
      return;
    }

    navigator.mediaDevices
      .getUserMedia({
        audio: true,
        video: false,
      })
      .then(function (voiceStream) {
        for (let i = 0; i < voiceStream.getAudioTracks().length; i++) {
          self.stream.addTrack(voiceStream.getAudioTracks()[i]);
        }
        self.audioMuted = false;
        self.audioAvailable = true;
        self.handleRecord({ stream: self.stream });
        self.rerender();
      })
      .catch(function (audioErr) {
        self.audioAvailable = false;
        self.handleRecord({ stream: self.stream });
        self.rerender();
      });
  };

  toggleAudio = function () {
    this.audioMuted = !this.audioMuted;
    this.rerender();

    if (!this.stream) {
      return;
    }

    const audioTracks = this.stream.getAudioTracks();
    for (var i = 0; i < audioTracks.length; i++) {
      const audioTrack = audioTracks[i];
      audioTrack.enabled = !this.audioMuted;
    }
  };

  static uploadScreenRecording = function (screenRecordingData) {
    return new Promise(function (resolve, reject) {
      if (screenRecordingData == null) {
        resolve(null);
      }

      var xhr = new XMLHttpRequest();
      xhr.open("POST", GleapSession.getInstance().apiUrl + "/uploads/sdk");
      GleapSession.getInstance().injectSession(xhr);

      var formdata = new FormData();
      formdata.append("file", screenRecordingData);

      xhr.send(formdata);
      xhr.onerror = function () {
        reject();
      };
      xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
          if (xhr.status == 200) {
            resolve(JSON.parse(xhr.response).fileUrl);
          } else {
            reject();
          }
        }
      };
    });
  };

  clearPreview = function () {
    document.querySelector(".bb-capture-preview video").src = null;
    this.file = null;
    this.rerender();
  };

  handleRecord = function ({ stream }) {
    const self = this;

    var recordedChunks = [];
    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: this.getSupportedMimeType()
    });
    this.isRecording = true;
    this.recordTime = 0;

    // Set timer.
    const timerLabel = document.querySelector(".bb-capture-toolbar-item-timer");
    this.recordingTimer = setInterval(() => {
      self.recordTime++;
      var remainingTime = self.maxRecordTime - self.recordTime;
      if (remainingTime > 0) {
        timerLabel.innerHTML = self.formatTime(remainingTime);
      } else {
        timerLabel.innerHTML = "2:00";
        self.stopScreenRecording();
      }
    }, 1000);

    this.mediaRecorder.ondataavailable = function (e) {
      if (e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    stream.getVideoTracks()[0].onended = function () {
      self.prepareRecording(recordedChunks);
    };

    this.mediaRecorder.onstop = function () {
      self.prepareRecording(recordedChunks);
    };

    this.mediaRecorder.start(200); // here 200ms is interval of chunk collection

    self.rerender();
  };

  prepareRecording = function (recordedChunks) {
    const completeBlob = new Blob(recordedChunks, {
      type: this.getSupportedMimeType(),
    });

    this.file = new File([completeBlob], `screen-recording.${this.getSupportedMimeType() === "video/mp4" ? 'mp4' : "webm"}`, {
      type: this.getSupportedMimeType(),
    });

    const previewVideoElement = document.querySelector(
      ".bb-capture-preview video"
    );
    if (previewVideoElement) {
      previewVideoElement.src = URL.createObjectURL(completeBlob);
      this.audioAvailable = true;
      this.isRecording = false;
      this.rerender();
    }
  };
}
