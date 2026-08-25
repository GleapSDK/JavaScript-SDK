export default class GleapAudioManager {
  static audio;
  static settings = {
    play: true,
  };
  // Muted while a Kai Voice call is live (kai-voice-started/-ended) — every
  // mirrored voice turn arrives as a message and would ping over the call.
  // The final turn persists AFTER teardown, so the mute also covers a short
  // trailing window past the call's end.
  static callActive = false;
  static callEndedAt = 0;
  static CALL_SOUND_GRACE_MS = 12000;

  static playSound(play) {
    this.settings.play = play;
  }

  static setCallActive(callActive) {
    if (this.callActive && !callActive) {
      this.callEndedAt = Date.now();
    }
    this.callActive = !!callActive;
  }

  static ping() {
    try {
      if (
        !this.settings.play ||
        this.callActive ||
        Date.now() - this.callEndedAt < this.CALL_SOUND_GRACE_MS
      ) {
        return;
      }

      if (!this.audio) {
        this.audio = new Audio('https://js.gleap.io/res/ping.mp3');
      }

      const playPromise = this.audio.play();
      if (playPromise !== undefined) {
        playPromise.then((_) => {}).catch((error) => {});
      }
    } catch (exp) {}
  }
}
