export default class GleapAudioManager {
    static audio;

    static ping() {
        try {
            if (!this.audio) {
                this.audio = new Audio('https://js.gleap.io/res/ping.mp3');
            }

            const playPromise = this.audio.play();
            if (playPromise !== undefined) {
                playPromise.then(_ => { })
                    .catch(error => { });
            }
        } catch (exp) { }
    }
}
