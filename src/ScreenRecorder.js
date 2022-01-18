export class ScreenRecorder {
  stream;
  mediaRecorder;
  voiceStream;

  constructor() {}

  startScreenRecording = function () {
    const self = this;
    if (!navigator.mediaDevices) {
      // Connection is not secure
      console.log("Connection is not secure");
      return;
    }

    const mimeType = "video/webm";
    navigator.mediaDevices
      .getDisplayMedia({ video: true, audio: true })
      .then(function (displayStream) {
        // voiceStream for recording voice with screen recording
        navigator.mediaDevices
          .getUserMedia({
            audio: true,
            video: false,
          })
          .then(function (voiceStream) {
            let tracks = displayStream
              .getTracks()
              .concat(voiceStream.getAudioTracks());
            self.stream = new MediaStream(tracks);
            self.voiceStream = voiceStream;
            self.handleRecord({ stream: self.stream, mimeType });
          })
          .catch(function (audioErr) {
            console.log("AUDIO ERROR");
            console.log(audioErr);
          });
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
    console.log("STOP");
    this.mediaRecorder.stop();
    this.stream.getVideoTracks()[0].stop();
  };

  toggleAudio = function () {
    if (!this.toggleAudio) {
      return;
    }
    console.log("toggle audio");
    this.voiceStream.getAudioTracks()[0].enabled =
      !this.voiceStream.getAudioTracks()[0].enabled;
  };

  handleRecord = function ({ stream, mimeType }) {
    console.log("handleRecord");
    // to collect stream chunks
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
    };

    this.mediaRecorder.start(200); // here 200ms is interval of chunk collection
  };
}
