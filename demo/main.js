const BugBattle = window.BugBattle.default;

BugBattle.setApiUrl("http://localhost:9000");

BugBattle.initialize("J4ADFNfzzCdYWr8NBO4rozcb6NFeyyES", {
  userId: "1",
  userHash: "c9ca287ccb482cfd8c97e5abcbfed647a922b7e2f22023e96acfce889b6c8660",
  email: "lukas@bugbattle.io",
  name: "Lukas",
});

// Sample for feedback type options
BugBattle.setFeedbackTypeOptions([
  {
    title: "Contact us",
    description: "We are here to help.",
    icon: "https://jssdk.bugbattle.io/res/support.svg",
    actionFlow: BugBattle.FLOW_CONTACT,
  },
  {
    title: "Rating",
    description: "We are here to help.",
    icon: "https://jssdk.bugbattle.io/res/support.svg",
    actionFlow: BugBattle.FLOW_RATING,
  },
  {
    title: "Request a feature",
    description: "Which feature would you like to see next?",
    icon: "https://jssdk.bugbattle.io/res/star.svg",
    actionFlow: BugBattle.FLOW_FEATUREREQUEST,
  },
  {
    title: "Report an issue",
    description: "Found a bug? Let us know.",
    icon: "https://jssdk.bugbattle.io/res/bug.svg",
    actionFlow: BugBattle.FLOW_DEFAULT,
  },
]);

BugBattle.enableNetworkLogger();

BugBattle.setAppBuildNumber("2345");

BugBattle.enableReplays(true);

BugBattle.enablePoweredByBugbattle(true);

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
