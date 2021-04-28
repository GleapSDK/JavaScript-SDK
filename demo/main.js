const BugBattle = window.BugBattle.default;

BugBattle.initialize(
  "J4ADFNfzzCdYWr8NBO4rozcb6NFeyyES",
  BugBattle.FEEDBACK_BUTTON
);

// BugBattle.setApiUrl("http://localhost:9000");

// Sets the app's build number.
BugBattle.setMainColor("#FEAB39");

BugBattle.enableReplays(true);

BugBattle.enablePoweredByBugbattle(true);

BugBattle.enableNetworkLogger();

BugBattle.enableCrashDetector(true, true);

// Sets the app's build number.
BugBattle.setAppBuildNumber(5);

// Sets the app's version code.
BugBattle.setAppVersionCode("v5.0");

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
    BugBattle.xxx();
  };
}
