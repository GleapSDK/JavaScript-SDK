import "./css/App.css";
import BugBattle from "./../lib";

class App {
  constructor() {
    // Initialize the SDK.
    BugBattle.initialize(
      "nwImRIghsF1NvF7qYMudNBlSU8laEMmx",
      BugBattle.FEEDBACK_BUTTON
    );

    // Sets the app's build number.
    // BugBattle.setMainColor('#FEAB39');

    BugBattle.enablePoweredByBugbattle(true);

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

    //Sets the language of the bug reporting flow.
    BugBattle.setLanguage("it")

    const feedbackButton = document.querySelector("#feedback-button");
    if (feedbackButton) {
      feedbackButton.onclick = function () {
        BugBattle.startBugReporting();
      };
    }
  }
}

export default App;
