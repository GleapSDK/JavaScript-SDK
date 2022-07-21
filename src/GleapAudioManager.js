export default class GleapAudioManager {
    static audio;

    static ping() {
        try {
            if (!this.audio) {
                this.audio = new Audio('https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3');
            }

            this.audio.play();
        } catch (exp) { }
    }
}
