const BugBattle = window.BugBattle.default;

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

// BugBattle.setApiUrl("http://localhost:9000");

BugBattle.setAppBuildNumber("2345");

BugBattle.enableReplays(true);

BugBattle.enablePoweredByBugbattle(true);

BugBattle.enableNetworkLogger();

BugBattle.enableCrashDetector(true, false);

// Sets the app's build number.
BugBattle.setAppBuildNumber(5);

// Sets the app's version code.
BugBattle.setAppVersionCode("v5.0");

// Attaches custom data to the bug reports.
BugBattle.attachCustomData({
  test1: "Battle",
  data2: "Unicorn",
});

BugBattle.enableRageClickDetector(true);

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

setTimeout(() => {
  x = y;
}, 5000);