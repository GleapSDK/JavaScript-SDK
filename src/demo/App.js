import "./css/App.css";
import BugBattle from "./../lib";

class App {
  constructor() {
    // Initialize the SDK.
    BugBattle.initialize(
      "arO906tKWMgSF1KvHVtTnDchklUZtyM8",
      BugBattle.FEEDBACK_BUTTON
    );

    BugBattle.setApiUrl("http://0.0.0.0:9000");

    // Sets the app's build number.
    // BugBattle.setMainColor('#FEAB39');

    BugBattle.enableNetworkLogger();

    // Sets the app's build number.
    BugBattle.setAppBuildNumber(5);

    // Sets the app's version code.
    BugBattle.setAppVersionCode("v5.0");

    // Sets the Bugbattle logo url.
    // BugBattle.setLogoUrl("https://someurl");

    // Attaches custom data to the bug reports.
    BugBattle.attachCustomData({
      test1: "Battle",
      data2: "Unicorn",
    });

    // Disable shortcuts
    BugBattle.enableShortcuts(true);

    // Turn the privacy policy check on or off.
    BugBattle.enablePrivacyPolicy(false);

    // Sets weather to enable or disable the user screenshot step within the bug reporting flow.
    BugBattle.disableUserScreenshot(false);

    const feedbackButton = document.querySelector("#feedback-button");
    if (feedbackButton) {
      feedbackButton.onclick = function () {
        BugBattle.startBugReporting();
      };
    }
  }
}

export default App;
