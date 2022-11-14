export namespace Gleap {
  function initialize(
    sdkKey: string
  ): void;
  function sendSilentCrashReport(
    description: string,
    priority?: "LOW" | "MEDIUM" | "HIGH",
    excludeData?: {
      customData: Boolean;
      metaData: Boolean;
      attachments: Boolean;
      consoleLog: Boolean;
      networkLogs: Boolean;
      customEventLog: Boolean;
      screenshot: Boolean;
      replays: Boolean;
    }
  ): void;
  function sendSilentCrashReportWithFormData(
    formData: {
      [key: string]: string;
    },
    priority?: "LOW" | "MEDIUM" | "HIGH",
    excludeData?: {
      customData: Boolean;
      metaData: Boolean;
      attachments: Boolean;
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
  function destroy(): void;
  function isOpened(): boolean;
  function setApiUrl(apiUrl: string): void;
  function setFrameUrl(frameUrl: string): void;
  function setMaxNetworkRequests(maxRequests: number): void;
  function registerCustomAction(
    customAction: (action: { name: string }) => void
  ): void;
  function log(message: string, logLevel?: "INFO" | "WARNING" | "ERROR"): void;
  /**
 * @deprecated Please use trackEvent instead.
 */
  function logEvent(name: string, data?: any): void;
  function trackEvent(name: string, data?: any): void;
  function setAppBuildNumber(buildNumber: string): void;
  function setAppVersionCode(versionCode: string): void;
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
  function preFillForm(data: string): void;
  function attachNetworkLogs(networkLogs: string): void;
  function clearIdentity(): void;
  function identify(
    userId: string,
    customerData: {
      name?: string;
      email?: string;
    },
    userHash?: string
  ): void;
  function open(): void;
  function openNews(showBackButton?: boolean): void;
  function openNewsArticle(collectionId: string, articleId?: string, showBackButton?: boolean): void;
  function openHelpCenter(showBackButton?: boolean): void;
  function openHelpArticle(id: string, showBackButton?: boolean): void;
  function searchHelpCenter(term: string, showBackButton?: boolean): void;
  function openFeatureRequests(showBackButton?: boolean): void;
  function close(): void;
  function hide(): void;
  function setEnvironment(environment: "dev" | "staging" | "prod"): void;
  function showFeedbackButton(show: boolean): void;
  function startFeedbackFlow(feedbackFlow: string, showBackButton?: boolean): void;
  function on(event: string, callback: (data?: any) => void): void;
  function getIdentity(): any;
  function isUserIdentified(): boolean;
}
export default Gleap;
