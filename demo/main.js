const Gleap = window.Gleap;

window.onGleapLoaded = () => {
  console.log("LOADED.");
};

// Gleap.setApiUrl("http://0.0.0.0:9000");

// Sample for feedback type options
Gleap.setMenuOptions([
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

Gleap.setFeedbackActions({
  bugreporting: {
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
  },
  crash: {
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
  },
  rating: {
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
  },
  contact: {
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
  },
  featurerequests: {
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
  },
});

Gleap.enableNetworkLogger();

Gleap.setAppBuildNumber("2345");

Gleap.enableReplays(true);

Gleap.setColors("#ffffff", "#ffffff", "#ffffff");

Gleap.enablePoweredBy(true);

Gleap.enableCrashDetector(true, false);

Gleap.enableRageClickDetector(true);

// Sets the app's build number.
Gleap.setAppBuildNumber(5);

// Sets the app's version code.
Gleap.setAppVersionCode("v5.0");

// Attaches custom data to the bug reports.
Gleap.attachCustomData({
  test1: "Battle",
  data2: "Unicorn",
});

Gleap.initialize("ogWhNhuiZcGWrva5nlDS8l7a78OfaLlV");
