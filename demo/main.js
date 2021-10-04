const Gleap = window.Gleap;

window.onGleapLoaded = () => {
  console.log("LOADED.");

  Gleap.identify(
    "1",
    "db5897fe20d33d8072babc477655eba5240e606cbde86deaa0c17e34eaef6201",
    {
      name: "Franz",
      email: "x@x.com",
    }
  );
};

Gleap.setApiUrl("http://0.0.0.0:9000");

Gleap.initialize("OcLgYN5vWavsjTrv1vjAjGj22INW0Xdz");

// Sample for feedback type options
Gleap.setFeedbackTypeOptions([
  {
    title: "Report an issue",
    description: "Found a bug? Let us know.",
    icon: "https://i.ibb.co/CJV3jZ0/Subtract-1.png",
    actionFlow: "default",
    color: "#F4CAC8",
  },
  {
    title: "Contact us",
    description: "We are here to help.",
    icon: "https://i.ibb.co/WcWGJ6S/Subtract.png",
    actionFlow: "contact",
    color: "#EFE2FF",
  },
  {
    title: "Request a feature",
    description: "Which feature would you like to see next?",
    icon: "https://i.ibb.co/qsmt9WR/Subtract-2.png",
    actionFlow: "featurerequest",
    color: "#FFEEC2",
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
