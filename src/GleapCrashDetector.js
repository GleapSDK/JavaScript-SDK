import Gleap, { GleapConfigManager } from "./Gleap";
import { GleapConsoleLogManager } from "./Gleap";

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
    console.log("????");

    window.addEventListener('error', e => {
      const { message, filename, lineno, colno, error } = e;
      
      var stackTrace = "";
      if (error !== null && typeof error.stack !== "undefined") {
        stackTrace = error.stack;
      }
      var messageObject = [
        "Message: " + message,
        "URL: " + filename,
        "Line: " + lineno,
        "Column: " + colno,
        "Stack: " + stackTrace,
      ];
      GleapConsoleLogManager.getInstance().addLog(messageObject, "ERROR");

      const flowConfig = GleapConfigManager.getInstance().getFlowConfig();
      if (flowConfig && flowConfig.enabledCrashDetector) {
        if (flowConfig.enabledCrashDetectorSilent) {
          Gleap.sendSilentReport(
            {
              errorMessage: message,
              url: filename,
              lineNo: lineno,
              columnNo: colno,
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
      }
    });
  }
}
