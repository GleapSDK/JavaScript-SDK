const BugBattle = window.BugBattle.default;

BugBattle.setApiUrl("http://localhost:9000");

BugBattle.initialize(
  "VXO20FQtZA7WRf5YI9qke6b6DMwnUOJj",
  BugBattle.FEEDBACK_BUTTON
);

BugBattle.logEvent("Booted");

// Sample for feedback type options
BugBattle.setFeedbackTypeOptions([
  {
    title: "Contact us",
    description: "We are here to help.",
    icon: "https://jssdk.bugbattle.io/res/support.svg",
    /*action: () => {
      //BugBattle.startBugReporting(BugBattle.FLOW_FEATUREREQUEST);
      Intercom("showNewMessage");
    },*/
    actionFlow: BugBattle.FLOW_CONTACT,
  },
  {
    title: "Request a feature",
    description: "Which feature would you like to see next?",
    icon: "https://jssdk.bugbattle.io/res/star.svg",
    actionFlow: BugBattle.FLOW_FEATUREREQUEST,
  },
  {
    title: "Rate your experience",
    description: "Share your opinion.",
    icon: "https://jssdk.bugbattle.io/res/star.svg",
    actionFlow: BugBattle.FLOW_RATING,
  },
  {
    title: "Report an issue",
    description: "Found a bug? Let us know.",
    icon: "https://jssdk.bugbattle.io/res/bug.svg",
    actionFlow: BugBattle.FLOW_DEFAULT,
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

BugBattle.logEvent("Booted");

BugBattle.enableRageClickDetector();

// Disable shortcuts
BugBattle.enableShortcuts(true);

BugBattle.enableIntercomCompatibilityMode();

// Turn the privacy policy check on or off.
BugBattle.enablePrivacyPolicy(true);
BugBattle.setPrivacyPolicyUrl("htpp...");

BugBattle.setMainColor("#398cfe");

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

var xhttpa = new XMLHttpRequest();
xhttpa.onreadystatechange = function () {
  if (this.readyState == 4 && this.status == 200) {
    console.log(this.responseText);
  }
};
xhttpa.open(
  "GET",
  "https://runa.mocky.io/v3/274ec30c-eeba-4248-b605-ace31b7e3b52",
  true
);
xhttpa.send();

BugBattle.setCustomerInfo({
  email: "lukas@boehlerbrothers.com",
  name: "Lukas",
});

BugBattle.logEvent("Sample", {
  userId: 1234,
});

BugBattle.setLanguage("en");

console.error("Demo error");

BugBattle.logEvent("User signed in", {
  userId: 1242,
  name: "Isabella",
  skillLevel: "🤩",
});

setTimeout(() => {
  BugBattle.logEvent("User signed out", {
    userId: 1242,
    name: "Isabella",
    skillLevel: "🤩",
  });
}, 5000);

/*setTimeout(() => {
  var x = [];

x[0].as = 1;
}, 5000);*/

BugBattle.autoPromptForRating();
