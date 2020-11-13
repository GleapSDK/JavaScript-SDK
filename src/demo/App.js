import './css/App.css';
import BugBattle from './../lib';

class App {
  constructor() {
    // Initialize the SDK.
    BugBattle.initialize("8hWXOj5yeZxweCgnyxYTXqJ1qFlu0N4U", BugBattle.FEEDBACK_BUTTON);

    // Set's the app's build number.
    BugBattle.setMainColor('#398CFE');

    // Set's the app's build number.
    BugBattle.setAppBuildNumber(5);

    // Set's the app's version code.
    BugBattle.setAppVersionCode("v5.0");

    // Attaches custom data to the bug reports.
    BugBattle.attachCustomData({
        test1: "Battle",
        data2: "Unicorn"
    });

    BugBattle.enableCrashDetector(true);
  }
}

export default App;
