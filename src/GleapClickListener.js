import { GleapConsoleLogManager, GleapFrameManager } from "./Gleap";
import { getDOMElementDescription } from "./GleapHelper";

export default class GleapClickListener {
  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new GleapClickListener();
    }
    return this.instance;
  }

  start() {
    document.addEventListener("click", (event) => {
      if (!event.target) {
        return;
      }

      if (!GleapFrameManager.getInstance().isOpened()) {
        GleapConsoleLogManager.getInstance().addLog(
          getDOMElementDescription(event.target),
          "CLICK"
        );
      }
    });
  }
}
