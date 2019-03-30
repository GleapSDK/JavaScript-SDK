import './css/App.css';
import BugBattle from './../lib';

class App {
  constructor() {
    // Initialize the SDK.
    let bugBattle = new BugBattle("5c41fcd794aaf5331dd4d513", BugBattle.FEEDBACK_BUTTON);

    // Set's the main color (color schema).
    bugBattle.setMainColor("#086EFB");

    // Set's the app's build number.
    bugBattle.setAppBuildNumber(5);

    // Set's the app's version code.
    bugBattle.setAppVersionCode("v5.0");

    // Attaches custom data to the bug reports.
    bugBattle.setCustomData({
        test1: "Battle",
        data2: "Unicorn"
    });
  }
}

export default App;
