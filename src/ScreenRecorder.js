export class ScreenRecorder {
  stream;
  mediaRecorder;
  audioMuted = false;
  audioAvailable = true;
  available = true;

  constructor() {
    if (!navigator.mediaDevices) {
      this.available = false;
    }
  }

  startScreenRecording = function () {
    const self = this;
    if (!navigator.mediaDevices) {
      // Connection is not secure
      console.log("Connection is not secure");
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
      })
      .catch(function (displayErr) {
        console.log("DISPLAY PERMISSION DENIED");
        console.log(displayErr);
      });
  };

  stopScreenRecording = function () {
    if (!this.mediaRecorder || !this.stream) {
      return;
    }

    this.mediaRecorder.stop();
    this.stream.getTracks().forEach((track) => {
      track.stop();
    });
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
      })
      .catch(function (audioErr) {
        console.log("AUDIO ERROR");
        console.log(audioErr);
      });
  };

  toggleAudio = function () {
    this.audioMuted = !this.audioMuted;
    if (!this.stream) {
      return;
    }

    const audioTracks = this.stream.getAudioTracks();

    for (var i = 0; i < audioTracks.length; i++) {
      const audioTrack = audioTracks[i];

      audioTrack.enabled = !this.audioMuted;
    }
  };

  handleRecord = function ({ stream, mimeType = "ideo/webm" }) {
    const self = this;

    let recordedChunks = [];
    this.mediaRecorder = new MediaRecorder(stream);

    this.mediaRecorder.ondataavailable = function (e) {
      if (e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    this.mediaRecorder.onstop = function () {
      const completeBlob = new Blob(recordedChunks, {
        type: mimeType,
      });
      recordedChunks = [];
      document.querySelector("video").src = URL.createObjectURL(completeBlob);
      self.audioAvailable = true;
    };

    this.mediaRecorder.start(200); // here 200ms is interval of chunk collection
  };
}
