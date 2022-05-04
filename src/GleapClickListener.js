import Gleap from "./Gleap";
import GleapConsoleLogManager from "./GleapConsoleLogManager";
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

      if (
        !Gleap.getInstance().currentlySendingBug
      ) {
        GleapConsoleLogManager.getInstance().addLog(
          [getDOMElementDescription(event.target)],
          "CLICK"
        );
      }
    });
  }
}
