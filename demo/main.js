const BugBattle = window.BugBattle.default;

BugBattle.initialize("J4ADFNfzzCdYWr8NBO4rozcb6NFeyyES");

BugBattle.logEvent("Booted");

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

BugBattle.logEvent("Booted");

BugBattle.enableRageClickDetector();

// Disable shortcuts
BugBattle.enableShortcuts(true);

BugBattle.enableIntercomCompatibilityMode();

// Turn the privacy policy check on or off.
BugBattle.enablePrivacyPolicy(false);
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

BugBattle.setColors("#485BFF", "#EDEFFF", "#FFFFFF");

BugBattle.setCustomerInfo({
  email: "lukas+test@boehlerbrothers.com",
  name: "Lukas",
});

BugBattle.logEvent("Sample", {
  userId: 1234,
});

BugBattle.setLanguage("en");

BugBattle.logEvent("User signed in", {
  userId: 1242,
  name: "Isabella",
  skillLevel: "🤩",
});

BugBattle.setButtonLogoUrl("https://i.ibb.co/wMGvWqh/Gleap-Logo.png");
BugBattle.setLogoUrl("https://i.ibb.co/wMGvWqh/Gleap-Logo.png");

setTimeout(() => {
  BugBattle.logEvent("User signed out", {
    userId: 1242,
    name: "Isabella",
    skillLevel: "🤩",
  });
}, 5000);

BugBattle.autoPromptForRating();

BugBattle.showInfoPopup(true);