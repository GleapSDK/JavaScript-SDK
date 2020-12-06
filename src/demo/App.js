import './css/App.css';
import BugBattle from './../lib';

class App {
  constructor() {
    // Initialize the SDK.
    BugBattle.initialize("8hWXOj5yeZxweCgnyxYTXqJ1qFlu0N4U", BugBattle.FEEDBACK_BUTTON);

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
    BugBattle.enableCrashDetector(true);

    // console.error("Y");

    const feedbackButton = document.querySelector("#feedback-button");
    if (feedbackButton) {
      feedbackButton.onclick = function () {
        BugBattle.startBugReporting();
      }
    }
  }
}

export default App;
