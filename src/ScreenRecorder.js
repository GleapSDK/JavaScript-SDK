import Session from "./Session";

export class ScreenRecorder {
  rerender;
  stream;
  mediaRecorder;
  audioMuted = false;
  audioAvailable = true;
  available = true;
  isRecording = false;
  file = null;
  maxRecordTime = 180;
  recordTime = 0;
  recordingTimer = null;

  constructor(rerender) {
    this.rerender = rerender;
    if (!navigator.mediaDevices) {
      this.available = false;
    }

    setTimeout(() => {
      this.rerender();
    }, 100);
  }

  formatTime(s) {
    return (s - (s %= 60)) / 60 + (9 < s ? ":" : ":0") + s;
  }

  startScreenRecording = function () {
    const self = this;
    if (!navigator.mediaDevices || this.isRecording) {
      this.available = false;
      this.rerender();
      return;
    }

    navigator.mediaDevices
      .getDisplayMedia({ video: true, audio: true })
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
      .catch(function (displayErr) {
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

  uploadScreenRecording = function () {
    const self = this;
    return new Promise(function (resolve, reject) {
      if (self.file == null) {
        resolve(null);
      }

      var xhr = new XMLHttpRequest();
      xhr.open("POST", Session.getInstance().apiUrl + "/uploads/sdk");
      Session.getInstance().injectSession(xhr);

      var formdata = new FormData();
      formdata.append("file", self.file);

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
  }

  handleRecord = function ({ stream, mimeType = "video/mp4" }) {
    const self = this;

    var recordedChunks = [];
    this.mediaRecorder = new MediaRecorder(stream);
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
        timerLabel.innerHTML = "3:00";
        self.stopScreenRecording();
      }
    }, 1000);

    this.mediaRecorder.ondataavailable = function (e) {
      if (e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    this.mediaRecorder.onstop = function () {
      const completeBlob = new Blob(recordedChunks, {
        type: mimeType,
      });

      self.file = new File([completeBlob], "screen-recording.mp4", {
        type: "video/mp4",
      });

      document.querySelector(".bb-capture-preview video").src =
        URL.createObjectURL(completeBlob);

      self.audioAvailable = true;
      self.isRecording = false;
      self.rerender();
    };

    this.mediaRecorder.start(200); // here 200ms is interval of chunk collection
    self.rerender();
  };
}
