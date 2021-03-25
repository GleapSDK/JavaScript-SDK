declare module "bugbattle" {
  export namespace BugBattle {
    const NONE: "NONE";
    const FEEDBACK_BUTTON: "FEEDBACK_BUTTON";
    function initialize(
      key: string,
      activationMethod: "NONE" | "FEEDBACK_BUTTON"
    ): void;
    function startBugReporting(): void;
    function setCustomerEmail(email: string): void;
    function attachCustomData(customData: any): void;
    function enablePrivacyPolicy(enable: boolean): void;
    function setPrivacyPolicyUrl(privacyUrl: string): void;
    function setApiUrl(apiUrl: string): void;
    function setLogoUrl(logoUrl: string): void;
    function enableCrashDetector(enabled: boolean): void;
    function setAppBuildNumber(buildNumber: string): void;
    function setAppVersionCode(versionCode: string): void;
    function enablePoweredByBugbattle(hide: boolean): void;
    function setMainColor(color: string): void;
    function disableConsoleLogOverwrite(): void;
    function enableNetworkLogger(): void;
    function enableShortcuts(enabled: boolean): void;
    function disableUserScreenshot(disableUserScreenshot: boolean): void;
  }
  export default BugBattle;
}
