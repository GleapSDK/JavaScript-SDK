declare module "bugbattle" {
  export namespace BugBattle {
    const NONE: "NONE";
    const FEEDBACK_BUTTON: "FEEDBACK_BUTTON";
    const PRIORITY_LOW: "LOW";
    const PRIORITY_MEDIUM: "MEDIUM";
    const PRIORITY_HIGH: "HIGH";
    const FLOW_DEFAULT: "FLOW_DEFAULT";
    const FLOW_RATING: "FLOW_RATING";
    const FLOW_FEATUREREQUEST: "FLOW_FEATUREREQUEST";

    function initialize(
      key: string,
      activationMethod: "NONE" | "FEEDBACK_BUTTON"
    ): void;

    interface FeedbackTypeOption {
      title: string;
      description: string;
      icon: string;
      action: () => void;
    }

    function startBugReporting(feedbackOptions?: any, silentBugReport?: boolean): void;
    function sendSilentBugReport(
      senderEmail: string,
      description: string,
      priority: "LOW" | "MEDIUM" | "HIGH"
    ): void;
    function setCustomerEmail(email: string): void;
    function attachCustomData(customData: any): void;
    function setCustomData(key: string, value: string): void;
    function removeCustomData(key: string): void;
    function clearCustomData(): void;
    function enablePrivacyPolicy(enable: boolean): void;
    function setPrivacyPolicyUrl(privacyUrl: string): void;
    function setApiUrl(apiUrl: string): void;
    function enableRageClickDetector(silent?: boolean): void;
    function setLogoUrl(logoUrl: string): void;
    function setCustomTranslation(customTranslation: any): void;
    function enableCrashDetector(enabled: boolean, silent?: boolean): void;
    function setAppBuildNumber(buildNumber: string): void;
    function setAppVersionCode(versionCode: string): void;
    function enablePoweredByBugbattle(enabled: boolean): void;
    function setMainColor(color: string): void;
    function disableConsoleLogOverwrite(): void;
    function enableNetworkLogger(): void;
    function enableShortcuts(enabled: boolean): void;
    function enableReplays(enabled: boolean): void;
    function setLanguage(language: string): void;
    function setFeedbackButtonText(overrideButtonText: string): void;
    function setFeedbackTypeOptions(
      feedbackTypeOptions: FeedbackTypeOption[]
    ): void;
  }
  export default BugBattle;
}
