import Gleap, { GleapConfigManager, GleapConsoleLogManager, GleapMetaDataManager } from "./Gleap";

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
    window.addEventListener('error', e => {
      const { message, filename, lineno, colno, error } = e;

      var stackTrace = "";
      if (error && typeof error.stack !== "undefined") {
        stackTrace = error.stack;
      }
      var messageObject = [
        "Message: " + message,
        "URL: " + filename,
        "Line: " + lineno,
        "Column: " + colno,
        "Stack: " + stackTrace,
      ];
      GleapConsoleLogManager.getInstance().addLogWithArgs(messageObject, "ERROR");

      const flowConfig = GleapConfigManager.getInstance().getFlowConfig();
      if (flowConfig && typeof flowConfig.enableCrashDetector !== "undefined" && flowConfig.enableCrashDetector && GleapMetaDataManager.getInstance().environment !== "dev") {
        if (flowConfig.crashDetectorIsSilent) {
          Gleap.sendSilentCrashReportWithFormData(
            {
              errorMessage: message,
              url: filename,
              lineNo: lineno,
              columnNo: colno,
              stackTrace: stackTrace,
            },
            "MEDIUM",
            {
              screenshot: true,
              replays: true,
            }
          );
        } else {
          Gleap.startFeedbackFlowWithOptions("crash");
        }
      }
    });
  }
}
