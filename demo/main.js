const Gleap = window.Gleap;

Gleap.setApiUrl("http://localhost:9000");

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

Gleap.setFeedbackActions({
  bugreporting: {
    default: true,
    title: "Report an issue",
    description:
      "Add more details to your screenshot to let us know what needs fixing.",
    thanksMessage:
      "Thanks for submitting your report. You’ve contributed to helping us improve. 🙌",
    form: [
      {
        title: "Email",
        placeholder: "Your e-mail",
        type: "text",
        inputtype: "email",
        name: "reportedBy",
        required: true,
        remember: true,
        hideOnDefaultSet: true,
      },
      {
        title: "Describe the issue",
        placeholder: "The more information, the better.",
        type: "textarea",
        name: "description",
      },
      {
        title: "Send report",
        type: "submit",
        name: "send",
      },
    ],
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
        title: "Email",
        placeholder: "Your e-mail",
        type: "text",
        inputtype: "email",
        name: "reportedBy",
        required: true,
        remember: true,
        hideOnDefaultSet: true,
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
  rating: {
    default: true,
    title: "Rate your experience",
    thanksMessage: "Your feedback means a lot to us. Thanks for your rating.",
    form: [
      {
        type: "rating",
        ratingtype: "emoji",
        name: "pagerating",
        required: true,
      },
      {
        type: "spacer",
        showAfter: "pagerating",
      },
      {
        title: "Email",
        placeholder: "Your e-mail",
        type: "text",
        inputtype: "email",
        name: "reportedBy",
        required: true,
        remember: true,
        hideOnDefaultSet: true,
        showAfter: "pagerating",
      },
      {
        title: "How can we do better?",
        placeholder: "The more details, the better.",
        type: "textarea",
        name: "description",
        showAfter: "pagerating",
      },
      {
        title: "Send feedback",
        type: "submit",
        name: "send",
        showAfter: "pagerating",
      },
    ],
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
  contact: {
    default: true,
    title: "Contact us",
    description: "Our support team is always here to help.",
    thanksMessage: "Thanks for your message. We will be in touch shortly",
    form: [
      {
        title: "Email",
        placeholder: "Your e-mail",
        type: "text",
        inputtype: "email",
        name: "reportedBy",
        hideOnDefaultSet: true,
        required: true,
        remember: true,
      },
      {
        title: "Message",
        placeholder: "Your message",
        type: "textarea",
        name: "description",
        required: true,
      },
      {
        title: "Send message",
        type: "submit",
        name: "send",
      },
    ],
    feedbackType: "INQUIRY",
    disableUserScreenshot: true,
    excludeData: {
      customData: false,
      metaData: false,
      consoleLog: false,
      networkLogs: false,
      customEventLog: false,
      screenshot: true,
      replays: true,
    },
  },
  featurerequests: {
    default: true,
    title: "Request a feature",
    description: "What feature or improvement would you like to see?",
    thanksMessage:
      "We’re working full steam to constantly improve. We’ll be in touch if we have further questions or an update for you.",
    form: [
      {
        title: "Email",
        placeholder: "Your e-mail",
        type: "text",
        inputtype: "email",
        name: "reportedBy",
        hideOnDefaultSet: true,
        required: true,
        remember: true,
      },
      {
        placeholder: "Explain your request.",
        title: "Subject",
        type: "text",
        inputtype: "text",
        name: "title",
        required: true,
      },
      {
        title: "Description",
        placeholder: "The more details, the better.",
        type: "textarea",
        name: "description",
      },
      {
        title: "Send request",
        type: "submit",
        name: "send",
      },
    ],
    feedbackType: "FEATURE_REQUEST",
    disableUserScreenshot: true,
    excludeData: {
      customData: false,
      metaData: false,
      consoleLog: false,
      networkLogs: false,
      customEventLog: false,
      screenshot: true,
      replays: true,
    },
  },
});

Gleap.enableNetworkLogger();

Gleap.setAppBuildNumber("2345");

Gleap.enableReplays(true);

Gleap.setColors("green", "blue", "green");

Gleap.enablePoweredBy(true);

Gleap.enableCrashDetector(true, false);

Gleap.enableRageClickDetector(true);

// Sets the app's build number.
Gleap.setAppBuildNumber(64);

// Sets the app's version code.
Gleap.setAppVersionCode("v6.0");

Gleap.setButtonType("BUTTON_CLASSIC");

// Attaches custom data to the bug reports.
Gleap.attachCustomData({
  test1: "Battle",
  data2: "Unicorn",
});

// Gleap.setUIContainer(document.querySelector("#haha"));

Gleap.initialize("ogWhNhuiZcGWrva5nlDS8l7a78OfaLlV");
