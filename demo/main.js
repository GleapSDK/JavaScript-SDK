const Gleap = window.Gleap;

// Gleap.setApiUrl("http://localhost:9000");

// Sample for feedback type options
Gleap.setMenuOptions([
  {
    title: "Report an issue",
    description: "Found a bug? var us know.",
    icon: "https://i.ibb.co/CJV3jZ0/Subtract-1.png",
    actionFlow: "default",
    color: "#F4CAC8",
  },
  {
    title: "Contact us",
    description: "We are here to help.",
    icon: "https://i.ibb.co/WcWGJ6S/Subtract.png",
    actionFlow: "default",
    color: "#EFE2FF",
  },
  {
    title: "Request a feature",
    description: "Which feature would you like to see next?",
    icon: "https://i.ibb.co/qsmt9WR/Subtract-2.png",
    actionFlow: "default",
    color: "#FFEEC2",
  },
]);

Gleap.setFeedbackActions({
  default: {
    default: true,
    title: "Rate your experience",
    thanksMessage: "Your feedback means a lot to us. Thanks for your rating.",
    form: [
      {
        title: "How was your experience?",
        description: "Please rate your experience.",
        type: "rating",
        ratingtype: "emoji",
        name: "pagerating",
        required: true,
      },
      {
        title: "How can we do better?",
        description: "XOXOXOXOXOXOXO",
        placeholder: "The more details, the better.",
        type: "textarea",
        name: "rrrrr",
        required: true,
      },
    ],
    collectEmail: true,
    privacyPolicyEnabled: true,
    privacyPolicyUrl: "asdfasdfasdf",
    feedbackType: "RATING",
    disableUserScreenshot: true,
    excludeData: {
      customData: false,
      metaData: false,
      consoleLog: false,
      networkLogs: false,
      customEventLog: false,
      screenshot: false,
      replays: false,
    },
  },
  crash: {
    default: true,
    title: "Problem detected",
    description:
      "Oh, oh looks like something went wrong here. By submitting this form, you will help us fix the issue and improve big time.",
    thanksMessage:
      "Thanks for submitting your report. You’ve just done us a big favor.",
    form: [
      {
        title: "How would you rate us?",
        type: "onetofive",
        name: "rate",
      },
      {
        title: "Email",
        placeholder: "Your e-mail",
        type: "text",
        inputtype: "email",
        name: "reportedBy",
        required: true,
        remember: true,
      },
      {
        title: "Tell us more about the problem",
        placeholder: "Describe what went wrong",
        type: "textarea",
        name: "description",
      },
      {
        title: "Send report",
        type: "submit",
        name: "send",
      },
    ],
    collectEmail: true,
    privacyPolicyEnabled: true,
    privacyPolicyUrl: "asdfasdfasdf",
    feedbackType: "BUG",
    disableUserScreenshot: true,
    excludeData: {
      customData: false,
      metaData: false,
      consoleLog: false,
      networkLogs: false,
      customEventLog: false,
      screenshot: false,
      replays: false,
    },
  },
});

Gleap.enableNetworkLogger();

Gleap.setAppBuildNumber("2345");

Gleap.enableReplays(true);

Gleap.setColors("#17A589", "#0E6655", "#0E6655");

Gleap.enablePoweredBy(true);

Gleap.enableCrashDetector(true, false);

Gleap.enableRageClickDetector(true);

// Sets the app's build number.
Gleap.setAppBuildNumber(64);

// Sets the app's version code.
Gleap.setAppVersionCode("v6.0");

// Attaches custom data to the bug reports.
Gleap.attachCustomData({
  test1: "Battle",
  data2: "Unicorn",
});

// Gleap.setUIContainer(document.querySelector("#haha"));

Gleap.initialize("ogWhNhuiZcGWrva5nlDS8l7a78OfaLlV");
