export namespace Gleap {
  function initialize(sdkKey: string, disablePing?: boolean): void;
  function sendSilentCrashReport(
    description: string,
    priority?: "LOW" | "MEDIUM" | "HIGH",
    excludeData?: {
      customData?: Boolean;
      metaData?: Boolean;
      attachments?: Boolean;
      consoleLog?: Boolean;
      networkLogs?: Boolean;
      customEventLog?: Boolean;
      screenshot?: Boolean;
      replays?: Boolean;
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
  function startBot(botId: string, showBackButton?: boolean): void;
  function attachCustomData(customData: any): void;
  function setCustomData(key: string, value: string): void;
  function removeCustomData(key: string): void;
  function clearCustomData(): void;
  function playSound(play: boolean): void;
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
    backgroundColor: string;
    borderRadius?: number;
    buttonX?: number;
    buttonY?: number;
    buttonStyle?: string;
  }): void;
  function disableConsoleLogOverwrite(): void;
  function setLiveSite(isLiveSite: boolean): void;
  function enableShortcuts(enabled: boolean): void;
  function setLanguage(language: string): void;
  function preFillForm(data: object): void;
  function showTabNotificationBadge(showNotificationBadge: boolean): void;
  function attachNetworkLogs(networkLogs: string): void;
  function clearIdentity(): void;
  function setTags(tags: string[]): void;
  function setDisableInAppNotifications(
    disableInAppNotifications: boolean
  ): void;
  function setDisablePageTracking(
    disablePageTracking: boolean
  ): void;
  function identify(
    userId: string,
    customerData: {
      name?: string;
      email?: string;
      phone?: string;
      value?: number;
      customData?: object;
    },
    userHash?: string
  ): void;
  function getInstance(): any;
  function open(): void;
  function openNews(showBackButton?: boolean): void;
  function openNewsArticle(id: string, showBackButton?: boolean): void;
  function openConversations(showBackButton?: boolean): void;
  function openConversation(
    shareToken?: string,
    showBackButton?: boolean
  ): void;
  function setUrlHandler(
    urlHandler: (url: string, newTab?: boolean) => void
  ): void;
  function openHelpCenter(showBackButton?: boolean): void;
  function openHelpCenterCollection(
    collectionId: string,
    showBackButton?: boolean
  ): void;
  function openHelpCenterArticle(
    articleId: string,
    showBackButton?: boolean
  ): void;
  function searchHelpCenter(term: string, showBackButton?: boolean): void;
  function openFeatureRequests(showBackButton?: boolean): void;
  function close(): void;
  function hide(): void;
  function setUseCookies(useCookies: boolean): void;
  function setEnvironment(environment: "dev" | "staging" | "prod"): void;
  function showFeedbackButton(show: boolean): void;
  function startFeedbackFlow(
    feedbackFlow: string,
    showBackButton?: boolean
  ): void;
  function showSurvey(surveyId: string, format?: string): void;
  function on(event: string, callback: (data?: any) => void): void;
  function getIdentity(): any;
  function isUserIdentified(): boolean;
}
export default Gleap;
