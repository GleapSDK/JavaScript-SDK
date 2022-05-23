export namespace Gleap {
  function initialize(
    sdkKey: string
  ): void;
  /**
   * @deprecated Please use sendSilentReport instead.
   */
  function sendSilentBugReport(
    description: string,
    priority: "LOW" | "MEDIUM" | "HIGH"
  ): void;
  function sendSilentBugReportWithType(
    description: string,
    priority: "LOW" | "MEDIUM" | "HIGH",
    type: string
  ): void;
  function sendSilentReport(
    formData: {
      [key: string]: string;
    },
    priority?: "LOW" | "MEDIUM" | "HIGH",
    feedbackType?: string,
    excludeData?: {
      customData: Boolean;
      metaData: Boolean;
      consoleLog: Boolean;
      networkLogs: Boolean;
      customEventLog: Boolean;
      screenshot: Boolean;
      replays: Boolean;
    }
  ): void;
  function attachCustomData(customData: any): void;
  function setCustomData(key: string, value: string): void;
  function removeCustomData(key: string): void;
  function clearCustomData(): void;
  function isOpened(): boolean;
  function setApiUrl(apiUrl: string): void;
  function setWidgetUrl(widgetUrl: string): void;
  function registerCustomAction(
    customAction: (action: { name: string }) => void
  ): void;
  function logEvent(name: string, data?: any): void;
  function setAppBuildNumber(buildNumber: string): void;
  function setAppVersionCode(versionCode: string): void;
  function attachNetworkLogs(externalConsoleLogs: any[]): void;
  function setStyles(styles: {
    primaryColor: string;
    headerColor: string;
    buttonColor: string;
    cornerRadius: string;
  }): void;
  function disableConsoleLogOverwrite(): void;
  function setLiveSite(isLiveSite: boolean): void;
  function enableShortcuts(enabled: boolean): void;
  function setLanguage(language: string): void;
  function preFillForm(key: string, value: string): void;
  function clearIdentity(): void;
  function identify(
    userId: string,
    customerData: {
      name?: string;
      email?: string;
    }
  ): void;
  function open(): void;
  function hide(): void;
  function startFeedbackFlow(feedbackFlow: string, options?: {
    actionOutboundId?: string,
    autostartDrawing?: boolean,
    showBackButton?: boolean
  }): void;
  function on(event: string, callback: (data?: any) => void): void;
}
export default Gleap;
