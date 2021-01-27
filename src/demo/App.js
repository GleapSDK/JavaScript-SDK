import './css/App.css';
import BugBattle from './../lib';

class App {
  constructor() {
    // Initialize the SDK.
    BugBattle.initialize("NF0AbayNnRfrT6QsB3uGAi6ANdd8WeX4", BugBattle.FEEDBACK_BUTTON);

    // Set's the app's build number.
    BugBattle.setMainColor('#FEAB39');

    // Set's the app's build number.
    BugBattle.setAppBuildNumber(5);

    // Set's the app's version code.
    BugBattle.setAppVersionCode("v5.0");

    // Attaches custom data to the bug reports.
    BugBattle.attachCustomData({
        test1: "Battle",
        data2: "Unicorn"
    });

    // Turn the privacy policy check on or off.
    BugBattle.enablePrivacyPolicy(false);

    // Enable the automatic crash detector.
    BugBattle.enableCrashDetector(false);

    const feedbackButton = document.querySelector("#feedback-button");
    if (feedbackButton) {
      feedbackButton.onclick = function () {
        BugBattle.startBugReporting();
      }
    }

    console.log("asdf");
    console.warn("asdf");
    console.error("asdf");
  }
}

export default App;
