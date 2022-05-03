import GleapConsoleLogManager from "./GleapConsoleLogManager";

export default class GleapClickListener {
  // GleapClickListener singleton
  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new GleapClickListener();
    }
    return this.instance;
  }

  elementToString(element) {
    return "NOT IMPLEMENTED";
  }

  start() {
    document.addEventListener("click", (event) => {
      if (!event.target) {
        return;
      }

      GleapConsoleLogManager.getInstance().addLog(
        [elementToString(event.target)],
        "CLICK"
      );
    });
  }
}
