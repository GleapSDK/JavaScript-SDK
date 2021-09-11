const BugBattle = window.BugBattle.default;

// BugBattle.setApiUrl("http://localhost:9000");

BugBattle.setColors("#485BFF", "#EDEFFF", "#FFFFFF");

BugBattle.setCustomerInfo({
  email: "lukas+test@boehlerbrothers.com",
  name: "Lukas",
});

BugBattle.setButtonLogoUrl("https://i.ibb.co/wMGvWqh/Gleap-Logo.png");
BugBattle.setLogoUrl("https://i.ibb.co/wMGvWqh/Gleap-Logo.png");

BugBattle.initialize("J4ADFNfzzCdYWr8NBO4rozcb6NFeyyES", {
  userId: "1",
  userHash: "c9ca287ccb482cfd8c97e5abcbfed647a922b7e2f22023e96acfce889b6c8660",
  email: "lukas@bugbattle.io",
  name: "Lukas",
});

// Sample for feedback type options
BugBattle.setFeedbackTypeOptions([
  {
    title: "Report an issue",
    description: "Found a bug? Let us know.",
    icon: "https://i.ibb.co/CJV3jZ0/Subtract-1.png",
    actionFlow: BugBattle.FLOW_DEFAULT,
    color: '#F4CAC8',
  },
  {
    title: "Contact us",
    description: "We are here to help.",
    icon: "https://i.ibb.co/WcWGJ6S/Subtract.png",
    actionFlow: BugBattle.FLOW_CONTACT,
    color: '#EFE2FF',
  },
  {
    title: "Request a feature",
    description: "Which feature would you like to see next?",
    icon: "https://i.ibb.co/qsmt9WR/Subtract-2.png",
    actionFlow: BugBattle.FLOW_FEATUREREQUEST,
    color: '#FFEEC2',
  },
]);

BugBattle.enableNetworkLogger();

fetch("https://run.mocky.io/v3/002b4638-e1de-465c-9a7e-cd4216fd1389").then(
  (data) => {
    console.log(data);
    data.arrayBuffer().then((d) => {
      console.log(d);
    });
  }
);

// BugBattle.setApiUrl("http://localhost:9000");

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