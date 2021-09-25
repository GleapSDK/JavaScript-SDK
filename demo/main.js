const Gleap = window.Gleap.default;

Gleap.initialize("J4ADFNfzzCdYWr8NBO4rozcb6NFeyyES", {
  userId: "1",
  userHash: "c9ca287ccb482cfd8c97e5abcbfed647a922b7e2f22023e96acfce889b6c8660",
  email: "lukas@gleap.io",
  name: "Lukas",
});

// Sample for feedback type options
Gleap.setFeedbackTypeOptions([
  {
    title: "Report an issue",
    description: "Found a bug? Let us know.",
    icon: "https://i.ibb.co/CJV3jZ0/Subtract-1.png",
    actionFlow: Gleap.FLOW_DEFAULT,
    color: '#F4CAC8',
  },
  {
    title: "Contact us",
    description: "We are here to help.",
    icon: "https://i.ibb.co/WcWGJ6S/Subtract.png",
    actionFlow: Gleap.FLOW_CONTACT,
    color: '#EFE2FF',
  },
  {
    title: "Request a feature",
    description: "Which feature would you like to see next?",
    icon: "https://i.ibb.co/qsmt9WR/Subtract-2.png",
    actionFlow: Gleap.FLOW_FEATUREREQUEST,
    color: '#FFEEC2',
  },
]);

Gleap.enableNetworkLogger();

Gleap.setAppBuildNumber("2345");

Gleap.enableReplays(true);

Gleap.setColors("red", "blue", "green");

Gleap.enablePoweredBy(true);

Gleap.enableCrashDetector(true, false);

// Sets the app's build number.
Gleap.setAppBuildNumber(5);

// Sets the app's version code.
Gleap.setAppVersionCode("v5.0");

// Attaches custom data to the bug reports.
Gleap.attachCustomData({
  test1: "Battle",
  data2: "Unicorn",
});