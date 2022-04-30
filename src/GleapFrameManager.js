export default class GleapFrameManager {
  gleapFrame = null;
  connected = false;
  listeners = [];
  frameURL = "http://localhost:3001";

  // GleapFrameManager singleton
  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new GleapFrameManager();
    }
    return this.instance;
  }

  constructor() {
    this.startCommunication();
  }

  injectFrame = () => {
    var elem = document.createElement("div");
    elem.className = "gleap-frame-container";
    elem.innerHTML = `<iframe src="${this.frameURL}" class="gleap-frame" scrolling="no" title="Gleap Widget Window" allow="autoplay; encrypted-media; fullscreen;" frameborder="0"></iframe>`;
    document.body.appendChild(elem);

    this.gleapFrame = document.querySelector(".gleap-frame");
    this.connected = true;
  };

  sendMessage = (data) => {
    if (this.gleapFrame) {
      this.gleapFrame.contentWindow.postMessage(JSON.stringify(data), frameURL);
    }
  };

  startCommunication() {
    window.addEventListener("message", (event) => {
      if (event.origin !== this.frameURL) {
        return;
      }

      try {
        const data = JSON.stringify(event.data);
        for (var i = 0; i < this.listeners.length; i++) {
          if (this.listeners[i]) {
            this.listeners[i](data);
          }
        }
      } catch (exp) {}
    });
  }

  addMessageListener(callback) {
    this.listeners.push(callback);
  }
}
