import Gleap from "./Gleap";

export default class GleapShortcutListener {
  shortCutListener = undefined;

  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new GleapShortcutListener();
    }
    return this.instance;
  }

  start() {
    if (this.shortCutListener) {
      return;
    }

    const charForEvent = function (event) {
      var code;

      if (event.key !== undefined) {
        code = event.key;
      } else if (event.keyIdentifier !== undefined) {
        code = event.keyIdentifier;
      } else if (event.keyCode !== undefined) {
        code = event.keyCode;
      }

      return code;
    };

    this.shortCutListener = document.addEventListener("keyup", function (e) {
      const char = charForEvent(e);
      if (
        e.ctrlKey &&
        (char === "u" || char === "U" || char === 85)
      ) {
        Gleap.startFeedbackFlowWithOptions("bugreporting", {
          autostartDrawing: true
        });
      }
    });
  }

  stop() {
    if (this.shortCutListener) {
      document.removeEventListener("keyup", this.shortCutListener);
      this.shortCutListener = undefined;
    }
  }
}