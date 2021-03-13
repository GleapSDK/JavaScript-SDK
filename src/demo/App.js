import './css/App.css';
import BugBattle from './../lib';

class App {
  constructor() {
    // Initialize the SDK.
    BugBattle.initialize("MUl7W9jydmpGWDnksEcAYi7CT1GInprD", BugBattle.FEEDBACK_BUTTON);

    // Sets the app's build number.
    BugBattle.setMainColor('#FEAB39');

    // Sets the app's build number.
    BugBattle.setAppBuildNumber(5);

    // Sets the app's version code.
    BugBattle.setAppVersionCode("v5.0");

    // Attaches custom data to the bug reports.
    BugBattle.attachCustomData({
        test1: "Battle",
        data2: "Unicorn"
    });

    // Turn the privacy policy check on or off.
    BugBattle.enablePrivacyPolicy(false);

    // Sets weather to enable or disable the user screenshot step within the bug reporting flow.
    BugBattle.disableUserScreenshot(false);
    
    const feedbackButton = document.querySelector("#feedback-button");
    if (feedbackButton) {
      feedbackButton.onclick = function () {
        BugBattle.startBugReporting();
      }
    }
  }
}

export default App;
