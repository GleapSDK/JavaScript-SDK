import './css/App.css';
import BugBattle from './../lib';

class App {
  constructor() {
    let bugBattle = new BugBattle("5c41fcd794aaf5331dd4d513", BugBattle.FEEDBACK_BUTTON);

    bugBattle.setAppBuildNumber(5);
    bugBattle.setAppVersionCode("v5.0");
    bugBattle.setCustomData({
      test: "Battle"
    });

    console.log("Log demo!");
  }
}

export default App;
