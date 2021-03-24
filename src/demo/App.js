import "./css/App.css";
import BugBattle from "./../lib";

class App {
  constructor() {
    // Initialize the SDK.
    BugBattle.initialize(
      "MUl7W9jydmpGWDnksEcAYi7CT1GInprD",
      BugBattle.FEEDBACK_BUTTON
    );

    // Sets the app's build number.
    // BugBattle.setMainColor('#FEAB39');

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
        // BugBattle.startBugReporting();

        fetch("https://run.mocky.io/v3/ee7924cd-5924-4ccd-9d92-d476dc3ee036", {
          method: "POST", // *GET, POST, PUT, DELETE, etc.
          mode: "cors", // no-cors, *cors, same-origin
          cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
          credentials: "same-origin", // include, *same-origin, omit
          headers: {
            "Content-Type": "application/json",
            // 'Content-Type': 'application/x-www-form-urlencoded',
          },
          redirect: "follow", // manual, *follow, error
          referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
          body: JSON.stringify({
            yyy: "yy",
          }), // body data type must match "Content-Type" header
        })
          .then((response) => response.json())
          .then((data) => console.log(data));
      };
    }
  }
}

export default App;
