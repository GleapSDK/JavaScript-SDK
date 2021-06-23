const BugBattle = window.BugBattle.default;

/*BugBattle.isWidgetOnly(true);
BugBattle.widgetCallback(function (name, data) {
  if (
    typeof window.webkit !== 'undefined' &&
    window.webkit.messageHandlers &&
    window.webkit.messageHandlers[name]
  ) {
    window.webkit.messageHandlers[name].postMessage(data);
  }
  if (typeof BugBattleJSBridge !== 'undefined' && BugBattleJSBridge[name]) {
    BugBattleJSBridge[name](JSON.stringify(data));
  }
});*/

BugBattle.initialize(
  "J4ADFNfzzCdYWr8NBO4rozcb6NFeyyES",
  BugBattle.FEEDBACK_BUTTON
);

// Sample for feedback type options
BugBattle.setFeedbackTypeOptions([
  {
    title: "Support",
    description: "Get in touch with us.",
    icon: "https://jssdk.bugbattle.io/res/support.svg",
    action: () => {
      BugBattle.startBugReporting(BugBattle.FLOW_FEATUREREQUEST);
    },
  },
  {
    title: "Rate your experience",
    description: "Let us know how we could improve!",
    icon: "https://jssdk.bugbattle.io/res/star.svg",
    action: () => {
      BugBattle.startBugReporting(BugBattle.FLOW_RATING);
    },
  },
  {
    title: "Report an issue",
    description: "Something is broken? Let us know!",
    icon: "https://jssdk.bugbattle.io/res/bug.svg",
    action: () => {
      BugBattle.startBugReporting();
    },
  },
]);

BugBattle.setApiUrl("http://localhost:9000");

BugBattle.setAppBuildNumber("2345");

BugBattle.enableReplays(true);

BugBattle.enablePoweredByBugbattle(true);

BugBattle.enableNetworkLogger();

BugBattle.enableCrashDetector(false, true);

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
BugBattle.enablePrivacyPolicy(true);
BugBattle.setPrivacyPolicyUrl("htpp...");

console.warn("DEMO!");
console.log("HI!");

var xhttp = new XMLHttpRequest();
xhttp.onreadystatechange = function () {
  if (this.readyState == 4 && this.status == 200) {
    console.log(this.responseText);
  }
};
xhttp.open(
  "GET",
  "https://run.mocky.io/v3/274ec30c-eeba-4248-b605-ace31b7e3b52",
  true
);
xhttp.send();