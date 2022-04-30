import GleapConsoleLogManager from "./GleapConsoleLogManager";

export default class GleapCrashDetector {
  // GleapCrashDetector singleton
  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new GleapCrashDetector();
    }
    return this.instance;
  }

  start() {
    const self = this;
    window.onerror = function (msg, url, lineNo, columnNo, error) {
      var stackTrace = "";
      if (error !== null && typeof error.stack !== "undefined") {
        stackTrace = error.stack;
      }
      var message = [
        "Message: " + msg,
        "URL: " + url,
        "Line: " + lineNo,
        "Column: " + columnNo,
        "Stack: " + stackTrace,
      ];
      GleapConsoleLogManager.getInstance().addLog(message, "ERROR");

      /*if (
        self.enabledCrashDetector &&
        !self.appCrashDetected &&
        !self.currentlySendingBug
      ) {
        self.appCrashDetected = true;
        if (self.enabledCrashDetectorSilent) {
          return Gleap.sendSilentReport(
            {
              errorMessage: msg,
              url: url,
              lineNo: lineNo,
              columnNo: columnNo,
              stackTrace: stackTrace,
            },
            Gleap.PRIORITY_MEDIUM,
            "CRASH",
            {
              screenshot: true,
              replays: true,
            }
          );
        } else {
          Gleap.startFeedbackFlow("crash");
        }
      }*/

      return false;
    };
  }
}
