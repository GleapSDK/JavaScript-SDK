declare module "Gleap" {
    export namespace Gleap {
      function initialize(sdkKey: string, gleapId?: string, gleapHash?: string): void;
      function sendSilentBugReport(
        description: string,
        priority: "LOW" | "MEDIUM" | "HIGH"
      ): void;
      function setCustomerEmail(email: string): void;
      function attachCustomData(customData: any): void;
      function setCustomData(key: string, value: string): void;
      function removeCustomData(key: string): void;
      function clearCustomData(): void;
      function setApiUrl(apiUrl: string): void;
      function setWidgetUrl(widgetUrl: string): void;
      function registerCustomAction(customAction: (action: { name: string }) => void): void;
      function logEvent(name: string, data?: any): void;
      function enableRageClickDetector(silent?: boolean): void;
      function setLogoUrl(logoUrl: string): void;
      function setButtonLogoUrl(buttonLogoUrl: string): void;
      function setCustomTranslation(customTranslation: any): void;
      function enableCrashDetector(enabled: boolean, silent?: boolean): void;
      function setAppBuildNumber(buildNumber: string): void;
      function setAppVersionCode(versionCode: string): void;
      function setColors(primaryColor: string, headerColor: string, buttonColor: string): void;
      function disableConsoleLogOverwrite(): void;
      function enableNetworkLogger(): void;
      function enableShortcuts(enabled: boolean): void;
      function enableReplays(enabled: boolean): void;
      function setLanguage(language: string): void;
      function identify(userId: string, customerData: {
          name?: string;
          email?: string;
      }): void;
      function open(): void;
      function hide(): void;
      function startFeedbackFlow(feedbackFlow: string): void;
      function on(event: string, callback: (data?: any) => void): void;
    }
    export default Gleap;
  }