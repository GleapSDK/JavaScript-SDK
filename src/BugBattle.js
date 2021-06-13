import { startScreenCapture } from "./ScreenCapture";
import { translateText } from "./Translation";
import { setColor, applyBugbattleBaseCSS } from "./UI";
import BugBattleNetworkIntercepter from "./NetworkInterception";
import ReplayRecorder from "./ReplayRecorder";
import { isMobile } from "./ImageHelper";
import {
  buildForm,
  getFormData,
  hookForm,
  rememberForm,
  validateForm,
} from "./FeedbackForm";

class BugBattle {
  apiUrl = "https://api.bugbattle.io";
  sdkKey = null;
  privacyPolicyUrl = "https://www.bugbattle.io/privacy-policy/";
  activation = "";
  overrideLanguage = "";
  overrideButtonText = undefined;
  screenshot = null;
  actionLog = [];
  logArray = [];
  customData = {};
  formData = {};
  feedbackType = "BUG";
  sessionStart = new Date();
  poweredByHidden = false;
  enabledCrashDetector = false;
  enabledCrashDetectorSilent = false;
  crashedWaitingForReload = false;
  currentlySendingBug = false;
  isLiveSite = false;
  replaysEnabled = false;
  customLogoUrl = null;
  shortcutsEnabled = true;
  silentBugReport = false;
  initialized = false;
  originalConsoleLog;
  severity = "LOW";
  appVersionCode = "";
  appBuildNumber = "";
  mainColor = "#398CFE";
  feedbackTypeActions = [];
  previousBodyOverflow;
  networkIntercepter = new BugBattleNetworkIntercepter();
  replay = null;
  snapshotPosition = {
    x: 0,
    y: 0,
  };

  // Activation methods
  static FEEDBACK_BUTTON = "FEEDBACK_BUTTON";
  static NONE = "NONE";
  static FLOW_DEFAULT = {
    title: "Feedback",
    form: [
      {
        placeholder: "Your e-mail",
        type: "text",
        inputtype: "email",
        name: "reportedBy",
        required: true,
        remember: true,
      },
      {
        placeholder: "What went wrong?",
        type: "textarea",
        name: "description",
      },
    ],
  };
  static FLOW_RATING = {
    title: "Feedback",
    form: [
      {
        title: "Rate your experience",
        type: "rating",
        ratingtype: "emoji",
        name: "pagerating",
        required: true,
      },
      {
        placeholder: "Your e-mail",
        type: "text",
        inputtype: "email",
        name: "reportedBy",
        required: true,
        remember: true,
        showAfter: "pagerating",
      },
      {
        placeholder: "How can we improve?",
        type: "textarea",
        name: "description",
        showAfter: "pagerating",
      },
    ],
    feedbackType: "RATING",
    disableUserScreenshot: true,
  };

  // Bug priorities
  static PRIORITY_LOW = "LOW";
  static PRIORITY_MEDIUM = "MEDIUM";
  static PRIORITY_HIGH = "HIGH";

  // BugBattle singleton
  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new BugBattle();

      try {
        this.instance.email = localStorage.getItem("bugbattle-sender-email");
      } catch (exp) {}

      return this.instance;
    } else {
      return this.instance;
    }
  }

  /**
   * Initializes the SDK
   * @param {*} sdkKey
   * @param {*} activation
   */
  static initialize(sdkKey, activation) {
    const instance = this.getInstance();

    if (instance.initialized) {
      console.warn("Bugbattle already initialized.");
      return;
    }

    instance.initialized = true;
    instance.sdkKey = sdkKey;
    instance.activation = activation;

    if (
      document.readyState === "complete" ||
      document.readyState === "loaded" ||
      document.readyState === "interactive"
    ) {
      instance.checkForInitType();
    } else {
      document.addEventListener("DOMContentLoaded", function (event) {
        instance.checkForInitType();
      });
    }
  }

  /**
   * Main constructor
   */
  constructor() {
    this.init();
  }

  static enableReplays(enabled) {
    const instance = this.getInstance();

    instance.replaysEnabled = enabled;
    if (enabled) {
      if (instance.replay) {
        instance.replay.stop();
        instance.replay = null;
      }
      instance.replay = new ReplayRecorder();
    } else {
      if (instance.replay) {
        instance.replay.stop();
        instance.replay = null;
      }
    }
  }

  /**
   * Disables the user screenshot functionality. A full screenshot of the page will be appended insead.
   * @param {boolean} disableUserScreenshot
   */
  static disableUserScreenshot(disableUserScreenshot) {
    console.log("BugBattle.disableUserScreenshot() has been deprecated.");
  }

  /**
   * Enable or disable shortcuts
   * @param {boolean} enabled
   */
  static enableShortcuts(enabled) {
    this.getInstance().shortcutsEnabled = enabled;
  }

  /**
   * Hides the powered by bugbattle logo.
   * @param {boolean} hide
   */
  static enablePoweredByBugbattle(enabled) {
    this.getInstance().poweredByHidden = !enabled;
  }

  /**
   * Overrides the feedback button text.
   * @param {string} overrideButtonText
   */
  static setFeedbackButtonText(overrideButtonText) {
    this.getInstance().overrideButtonText = overrideButtonText;
  }

  /**
   * Enables the network logger.
   */
  static enableNetworkLogger() {
    this.getInstance().networkIntercepter.start();
  }

  /**
   * Sets the logo url.
   * @param {string} logoUrl
   */
  static setLogoUrl(logoUrl) {
    this.getInstance().customLogoUrl = logoUrl;
  }

  /**
   * Enables the privacy policy.
   * @param {boolean} enabled
   */
  static enablePrivacyPolicy(enabled) {
    console.log("enablePrivacyPolicy() has been deprecated.");
  }

  /**
   * Sets the privacy policy url.
   * @param {string} privacyPolicyUrl
   */
  static setPrivacyPolicyUrl(privacyPolicyUrl) {
    this.getInstance().privacyPolicyUrl = privacyPolicyUrl;
  }

  /**
   * Sets the customers email.
   * @param {string} email
   */
  static setCustomerEmail(email) {
    this.getInstance().email = email;
  }

  /**
   * Sets the app version code.
   * @param {string} appVersionCode
   */
  static setAppVersionCode(appVersionCode) {
    this.getInstance().appVersionCode = appVersionCode;
  }

  /**
   * Sets the app version code.
   * @param {string} appVersionCode
   */
  static setAppBuildNumber(appBuildNumber) {
    this.getInstance().appBuildNumber = appBuildNumber;
  }

  /**
   * Set a custom api url to send bug reports to.
   * @param {string} apiUrl
   */
  static setApiUrl(apiUrl) {
    this.getInstance().apiUrl = apiUrl;
  }

  /**
   * Set custom data that will be attached to the bug-report.
   * @param {*} data
   */
  static attachCustomData(data) {
    this.getInstance().customData = data;
  }

  /**
   * Override the browser language. Currently supported languages:
   * - en
   * - de
   * - fr
   * - it
   * - es
   * @param {string} language country code with two letters
   */
  static setLanguage(language) {
    this.getInstance().overrideLanguage = language;
  }

  /**
   * Enables crash detection.
   * @param {*} enabled
   * @param {*} silent
   */
  static enableCrashDetector(enabled, silent = false) {
    const instance = this.getInstance();
    instance.enabledCrashDetector = enabled;
    instance.enabledCrashDetectorSilent = silent;
  }

  /**
   * Sets a custom color (HEX-String i.e. #086EFB) as new main color scheme.
   * @param {string} color
   */
  static setMainColor(color) {
    this.getInstance().mainColor = color;

    if (
      document.readyState === "complete" ||
      document.readyState === "loaded" ||
      document.readyState === "interactive"
    ) {
      setColor(color);
    } else {
      document.addEventListener("DOMContentLoaded", function (event) {
        setColor(color);
      });
    }
  }

  /**
   * Reports a bug silently
   * @param {*} senderEmail
   * @param {*} description
   */
  static sendSilentBugReport(senderEmail, description, priority) {
    const instance = this.getInstance();

    instance.formData = {
      email: senderEmail,
      description: description,
    };
    instance.severity = priority;

    this.startBugReporting({}, false);
  }

  /**
   * Starts the feedback type selection flow.
   */
  static startFeedbackTypeSelection() {
    const instance = this.getInstance();
    instance.stopBugReportingAnalytics();
    instance.createFeedbackTypeDialog();
  }

  /**
   * Adds a feedback type option.
   */
  static setFeedbackTypeOptions(feedbackTypeOptions) {
    this.getInstance().feedbackTypeActions = feedbackTypeOptions;
  }

  /**
   * Creates the feedback type dialog
   */
  createFeedbackTypeDialog() {
    const self = this;

    // Generate options
    var optionsHTML = "";

    for (var i = 0; i < self.feedbackTypeActions.length; i++) {
      var action = self.feedbackTypeActions[i];
      optionsHTML += `<div id="bugbattle--feedback-type-${i}" class="bugbattle--feedback-type">
        <img class="bugbattle--feedback-type-icon" src="${action.icon}">
        <div class="bugbattle--feedback-type-text">
          <div class="bugbattle--feedback-type-title">${translateText(
            action.title,
            self.overrideLanguage
          )}</div>
          <div class="bugbattle--feedback-type-description">${translateText(
            action.description,
            self.overrideLanguage
          )}</div>
        </div>
      </div>`;
    }

    var elem = document.createElement("div");
    elem.className = "bugbattle--feedback-dialog-container";
    elem.setAttribute("data-html2canvas-ignore", "true");
    elem.innerHTML = `<div class='bugbattle--feedback-dialog'>
      <div class="bugbattle--feedback-dialog-header-button bugbattle--feedback-dialog-header-button-cancel">
        <svg fill="#ffffff" width="100pt" height="100pt" version="1.1" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <path d="m100 9.4414-9.4414-9.4414-40.344 40.344-40.773-40.344-9.4414 9.4414 40.344 40.773-40.344 40.344 9.4414 9.4414 40.773-40.344 40.344 40.344 9.4414-9.4414-40.344-40.344z" fill-rule="evenodd"/>
        </svg>
      </div>
      <div class="bugbattle--feedback-dialog-header">
        <div class="bugbattle--feedback-dialog-header-logo">
          ${self.getHeaderImage()}
        </div>
      </div>
      <div class="bugbattle--feedback-dialog-body">
        <div class="bugbattle--feedback-types">
          ${optionsHTML}
        </div>
        <div class="bugbattle--feedback-poweredbycontainer">
          <span>Powered by</span>
          <svg width="173px" height="30px" viewBox="0 0 173 30" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
              <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                  <g fill="#AAAAAA">
                      <g transform="translate(147.600000, 0.000000)">
                          <path d="M24.2859542,7.7113198 C24.0540256,7.30857681 23.5901684,7.21614399 23.1067117,7.49014127 C22.4207257,7.88298074 21.7282066,8.2659167 21.0585536,8.68186438 C20.793959,8.84692298 20.6796281,8.81721243 20.5293645,8.54321515 C19.7290475,7.10060297 18.8960646,5.67119547 18.092481,4.25169149 C18.0234655,4.09525611 17.9234014,3.95480724 17.7984871,3.83904499 C17.6571381,3.74207171 17.4921828,3.68612411 17.3215635,3.67728756 L12.0002725,3.67728756 C11.7748771,3.67728756 11.8010099,3.50892778 11.8010099,3.34717035 C11.8010099,2.52847968 11.8010099,1.69658433 11.8010099,0.887797176 C11.8346543,0.638013247 11.7383149,0.38837468 11.5462151,0.227562766 C11.4071145,0.0821266579 11.2155424,0 11.0153926,0 C10.8152429,0 10.6236708,0.0821266579 10.4845702,0.227562766 C10.2986685,0.392643686 10.2046806,0.639351901 10.233042,0.887797176 C10.2036426,1.81212535 10.2624414,2.73975469 10.184043,3.66408287 L6.51891806,3.64757701 C6.36738842,3.6701226 6.22373966,3.73023167 6.10079329,3.82253913 C5.9974756,3.89628042 5.90789458,3.98792717 5.8361987,4.09323523 L0.53450728,13.3167099 C0.35516424,13.600556 0.35516424,13.9637944 0.53450728,14.2476405 L5.81006591,23.5305363 C5.90158939,23.7273663 6.07735578,23.8709275 6.28698947,23.9200746 C6.38409512,23.9386703 6.48230448,23.9508007 6.58098345,23.9563874 L17.0896349,23.9960015 C17.2513063,24.0107273 17.4140655,23.9846371 17.5632919,23.9200746 C17.7549133,23.8514168 17.9098335,23.705613 17.9912164,23.5173316 C19.733403,20.4736509 21.4864782,17.4299703 23.2504421,14.3862897 C23.4716092,14.0527399 23.4716092,13.617248 23.2504421,13.2836982 C22.7147197,12.3725747 22.2083967,11.4416442 21.6694078,10.5338219 C21.5322106,10.3027399 21.5910094,10.2235117 21.7968052,10.1112719 C22.5056573,9.71513123 23.2079763,9.30248473 23.9135618,8.88983822 C24.1271707,8.79373014 24.2900142,8.61002873 24.3611418,8.38492949 C24.4322695,8.15983024 24.4049139,7.91475021 24.2859542,7.7113198 Z M20.0393745,14.4820237 C19.9021773,14.7197081 19.7715133,14.9474889 19.6310495,15.178571 L19.6310495,15.178571 L17.8115535,18.344395 L17.8115535,18.344395 C17.3280967,19.1927962 16.8315735,20.0378962 16.3644498,20.8895986 C16.2455303,21.114253 16.0045103,21.2445048 15.7535956,21.2197158 C13.1642709,21.2043103 10.5727684,21.1911057 7.97908815,21.1801018 C7.76734312,21.1891383 7.57068598,21.0696354 7.47929839,20.8763939 C6.17265848,18.5897821 4.87255177,16.3020699 3.57897826,14.0132572 C3.47017471,13.8570302 3.46000511,13.6514856 3.55284547,13.4850697 L5.01301556,10.9794801 C5.01148564,10.969637 5.01148564,10.9596127 5.01301556,10.9497696 L6.90111023,7.64859753 L6.90111023,7.64859753 C7.03504082,7.41091314 7.18203781,7.10060297 7.2898356,6.91573733 C7.39763339,6.7308717 7.46296539,6.7308717 7.61649558,6.82990686 C9.28899466,7.82025848 10.9680269,8.81061009 12.6437926,9.78115467 C15.0545433,11.1940563 17.4663827,12.6058576 19.8793111,14.0165584 C20.1308393,14.1882194 20.1733051,14.2443393 20.0328413,14.4820237 L20.0393745,14.4820237 Z" id="Shape"></path>
                      </g>
                      <path d="M17.556,15.03 C17.556,19.848 13.761,23.808 9.108,23.808 C6.77072152,23.7933743 4.54993338,22.7855117 3,21.036 L3,21.168 L2.4,23.268 L0,23.268 L0,0.168 L3,0.168 L3,9 C4.56193736,7.27275703 6.77633455,6.27927072 9.105,6.261 C13.761,6.252 17.556,10.2 17.556,15.03 Z M14.556,15.03 C14.556,11.8405556 11.9704444,9.255 8.781,9.255 C5.59155557,9.255 3.006,11.8405556 3.006,15.03 C3.006,18.2194444 5.59155557,20.805 8.781,20.805 C11.9631308,20.7885804 14.5382339,18.2121389 14.553,15.03 L14.556,15.03 Z" id="Shape" fill-rule="nonzero"></path>
                      <path d="M32.736,23.28 L32.274,21.63 C30.1613238,23.7506367 26.978911,24.3891451 24.2117195,23.2475883 C21.4445279,22.1060314 19.6379658,19.4094081 19.635,16.416 L19.635,6.78 L22.635,6.78 L22.635,16.053 C22.635,18.6774571 24.7625429,20.805 27.387,20.805 C30.0114571,20.805 32.139,18.6774571 32.139,16.053 L32.139,6.78 L35.139,6.78 L35.139,23.28 L32.736,23.28 Z" id="Path" fill-rule="nonzero"></path>
                      <path d="M55.044,21.102 C55.0420903,24.650847 52.9027758,27.8491651 49.623469,29.2058026 C46.3441622,30.5624401 42.5705487,29.8102793 40.062,27.3 L42.207,25.2 C43.8577662,26.8474964 46.3387667,27.3376373 48.4920171,26.4416539 C50.6452675,25.5456705 52.0462228,23.4402192 52.041,21.108 L52.041,21.042 C50.5002169,22.8021497 48.2752599,23.8124004 45.936,23.814 C41.283,23.814 37.488,19.854 37.488,15.036 C37.488,10.218 41.283,6.258 45.936,6.258 C48.2752599,6.2595996 50.5002169,7.2698503 52.041,9.03 L52.041,8.898 L52.641,6.798 L55.041,6.798 L55.044,21.102 Z M51.48,15.03 C51.48,11.862 48.972,9.255 45.936,9.255 C42.9,9.255 40.392,11.862 40.392,15.03 C40.392,18.198 42.867,20.805 45.936,20.805 C49.005,20.805 51.48,18.198 51.48,15.03 Z" id="Shape" fill-rule="nonzero"></path>
                      <path d="M75.537,15.03 C75.537,19.848 71.742,23.808 67.089,23.808 C64.7527694,23.7925242 62.5332367,22.7847364 60.984,21.036 L60.984,21.168 L60.384,23.268 L57.984,23.268 L57.984,0.168 L60.984,0.168 L60.984,9 C62.5459374,7.27275703 64.7603345,6.27927072 67.089,6.261 C71.742,6.252 75.537,10.2 75.537,15.03 Z M72.537,15.03 C72.537,11.8405556 69.9514444,9.255 66.762,9.255 C63.5725556,9.255 60.987,11.8405556 60.987,15.03 C60.987,18.2194444 63.5725556,20.805 66.762,20.805 C69.9441308,20.7885804 72.5192339,18.2121389 72.534,15.03 L72.537,15.03 Z" id="Shape" fill-rule="nonzero"></path>
                      <path d="M95.139,23.28 L92.739,23.28 L92.139,21.18 L92.139,21.048 C90.5807158,22.803397 88.3482532,23.8116059 86.001,23.82 C81.381,23.82 77.586,19.86 77.586,15.042 C77.586,10.224 81.381,6.264 86.001,6.264 C88.3482532,6.27239413 90.5807158,7.28060302 92.139,9.036 L92.139,8.904 L92.739,6.804 L95.139,6.804 L95.139,23.28 Z M92.139,15.03 C92.139,11.8405556 89.5534444,9.255 86.364,9.255 C83.1745556,9.255 80.589,11.8405556 80.589,15.03 C80.589,18.2194444 83.1745556,20.805 86.364,20.805 C89.5461308,20.7885804 92.1212339,18.2121389 92.136,15.03 L92.139,15.03 Z" id="Shape" fill-rule="nonzero"></path>
                      <path d="M105.963,20.805 L105.963,23.28 L103.422,23.28 C101.143537,22.2828018 99.6773135,20.0250766 99.693,17.538 L99.693,9.453 L97.593,9.453 L97.593,6.78 L99.693,6.78 L99.693,2.325 L102.693,2.325 L102.693,6.78 L105.498,6.78 L105.498,9.453 L102.693,9.453 L102.693,17.538 C102.688982,18.4062085 103.032305,19.2399754 103.646509,19.8536163 C104.260714,20.4672572 105.094796,20.8098149 105.963,20.805 Z" id="Path" fill-rule="nonzero"></path>
                      <path d="M115.962,20.805 L115.962,23.28 L113.421,23.28 C111.142537,22.2828018 109.676314,20.0250766 109.692,17.538 L109.692,9.453 L107.592,9.453 L107.592,6.78 L109.692,6.78 L109.692,2.325 L112.692,2.325 L112.692,6.78 L115.5,6.78 L115.5,9.453 L112.695,9.453 L112.695,17.538 C112.690988,18.4056858 113.033901,19.2389929 113.647454,19.852546 C114.261007,20.4660991 115.094314,20.8090116 115.962,20.805 Z" id="Path" fill-rule="nonzero"></path>
                      <polygon fill-rule="nonzero" points="118.305 23.28 118.305 0.18 121.305 0.18 121.305 23.28"></polygon>
                      <path d="M127.08,15.69 C127.330165,17.935452 128.871936,19.8263987 131.021025,20.5235752 C133.170113,21.2207517 135.528322,20.5949806 137.049,18.924 L139.194,21.069 C139.119365,21.1139793 139.051659,21.1695593 138.993,21.234 C137.350467,22.8842039 135.117322,23.8107216 132.789,23.808006 C130.468503,23.7936931 128.246259,22.869464 126.6,21.234 C124.949796,19.5914668 124.023278,17.3583215 124.025994,15.03 C124.025994,10.179 127.524,6.252 131.826,6.252 C136.128,6.252 139.626,10.179 139.626,15.03 L139.626,15.69 L127.08,15.69 Z M127.314,13.017 L136.287,13.017 C135.627,10.839 133.887,9.255 131.787,9.255 C129.687,9.255 128.004,10.839 127.314,13.017 Z" id="Shape" fill-rule="nonzero"></path>
                  </g>
              </g>
          </svg>
        </div>
      </div>
    </div>`;
    document.body.appendChild(elem);

    // Hook actions
    for (var i = 0; i < self.feedbackTypeActions.length; i++) {
      const index = i;
      document.getElementById(`bugbattle--feedback-type-${index}`).onclick =
        function () {
          elem.remove();
          if (self.feedbackTypeActions[index].action) {
            self.feedbackTypeActions[index].action();
          }
        };
    }

    self.validatePoweredBy();
    self.hookDialogCloseButton();
  }

  stopBugReportingAnalytics() {
    this.networkIntercepter.setStopped(true);
    if (this.replay && !this.replay.stopped) {
      this.replay.stop(true);
    }
  }

  /**
   * Starts the bug reporting flow.
   */
  static startBugReporting(
    feedbackOptions = this.FLOW_DEFAULT,
    silentBugReport = false
  ) {
    const instance = this.getInstance();
    if (instance.currentlySendingBug) {
      return;
    }

    instance.currentlySendingBug = true;
    instance.silentBugReport = silentBugReport;

    instance.stopBugReportingAnalytics();

    if (!instance.silentBugReport) {
      instance.disableScroll();
      const feedbackBtn = document.querySelector(".bugbattle--feedback-button");
      if (feedbackBtn) {
        feedbackBtn.style.display = "none";
      }
    }

    // Set snapshot position
    instance.snapshotPosition = {
      x: window.scrollX,
      y: window.scrollY,
    };

    if (instance.silentBugReport) {
      instance.checkReplayLoaded();
    } else {
      instance.showBugReportEditor(feedbackOptions);
    }
  }

  checkOnlineStatus(url) {
    return new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest();
      xhr.onreadystatechange = function () {
        if (xhr.readyState === XMLHttpRequest.DONE) {
          const status = JSON.parse(xhr.responseText);
          resolve(status);
        }
      };
      xhr.ontimeout = function () {
        reject();
      };
      xhr.onerror = function () {
        reject();
      };
      xhr.open(
        "GET",
        "https://uptime.bugbattle.io/?url=" + encodeURIComponent(url),
        true
      );
      xhr.send();
    });
  }

  startCrashDetection() {
    const self = this;
    window.onerror = function (msg, url, lineNo, columnNo, error) {
      var message = [
        "Message: " + msg,
        "URL: " + url,
        "Line: " + lineNo,
        "Column: " + columnNo,
        "Error object: " + JSON.stringify(error),
      ];
      self.addLog(message, "error");

      if (
        self.enabledCrashDetector &&
        !self.crashedWaitingForReload &&
        !self.currentlySendingBug
      ) {
        self.crashedWaitingForReload = true;
        if (self.enabledCrashDetectorSilent) {
          const errorMessage = `Message: ${msg}\nURL: ${url}\nLine: ${lineNo}\nColumn: ${columnNo}\nError object: ${JSON.stringify(
            error
          )}\n`;
          BugBattle.sendSilentBugReport(null, errorMessage);
        } else {
          BugBattle.startBugReporting();
        }
      }

      return false;
    };
  }

  addLog(args, priority) {
    if (!args) {
      return;
    }

    var log = "";
    for (var i = 0; i < args.length; i++) {
      log += args[i] + " ";
    }
    this.logArray.push({
      log,
      date: new Date(),
      priority,
    });
  }

  static disableConsoleLogOverwrite() {
    window.console = this.getInstance().originalConsoleLog;
  }

  overwriteConsoleLog() {
    const self = this;
    window.console = (function (origConsole) {
      if (!window.console || !origConsole) {
        origConsole = {};
      }

      self.originalConsoleLog = origConsole;

      return {
        log: function () {
          self.addLog(arguments, "INFO");
          origConsole.log && origConsole.log.apply(origConsole, arguments);
        },
        warn: function () {
          self.addLog(arguments, "WARNING");
          origConsole.warn && origConsole.warn.apply(origConsole, arguments);
        },
        error: function () {
          self.addLog(arguments, "ERROR");
          origConsole.error && origConsole.error.apply(origConsole, arguments);
        },
        info: function (v) {
          self.addLog(arguments, "INFO");
          origConsole.info && origConsole.info.apply(origConsole, arguments);
        },
      };
    })(window.console);
  }

  disableScroll() {
    this.previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }

  enableScroll() {
    if (this.previousBodyOverflow) {
      document.body.style.overflow = this.previousBodyOverflow;
    } else {
      document.body.style.overflow = null;
    }
  }

  getHeaderImage() {
    var headerImage = `<svg width="100px" height="100px" viewBox="0 0 100 100" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
            <g id="Artboard" transform="translate(-1.000000, -1.000000)" fill="#398CFE">
                <path d="M100.524809,33.1304992 C99.5584401,31.4524034 97.6257019,31.0672666 95.6112987,32.208922 C92.7530239,33.8457531 89.8675274,35.4413196 87.0773068,37.1744349 C85.9748294,37.8621791 85.4984502,37.7383851 84.8723519,36.5967298 C81.537698,30.5858457 78.0669358,24.6299811 74.718671,18.7153812 C74.4311065,18.0635671 74.0141725,17.4783635 73.4936961,16.9960208 C72.9047419,16.5919655 72.2174285,16.3588504 71.5065145,16.3220315 L49.3344686,16.3220315 C48.3953212,16.3220315 48.5042078,15.6205324 48.5042078,14.9465431 C48.5042078,11.535332 48.5042078,8.06910137 48.5042078,4.6991549 C48.6443929,3.65838853 48.2429786,2.61822784 47.4425629,1.94817819 C46.8629771,1.34219441 46.06476,1 45.2308027,1 C44.3968453,1 43.5986283,1.34219441 43.0190424,1.94817819 C42.244452,2.63601536 41.8528356,3.66396625 41.9710083,4.6991549 C41.8485108,8.55052229 42.0935058,12.4156446 41.7668458,16.267012 L26.4954919,16.1982375 C25.8641184,16.2921775 25.2655819,16.5426319 24.7533054,16.9272464 C24.322815,17.2345018 23.9495608,17.6163632 23.6508279,18.0551468 L1.560447,56.4862914 C0.813184334,57.6689833 0.813184334,59.1824767 1.560447,60.3651686 L23.5419413,99.043901 C23.9232891,99.8640262 24.6556491,100.462198 25.5291228,100.666977 C25.9337297,100.744459 26.3429353,100.795003 26.7540977,100.818281 L70.5401455,100.98334 C71.2137764,101.044697 71.8919396,100.935988 72.5137161,100.666977 C73.3121387,100.380903 73.9576397,99.7733873 74.2967352,98.9888815 C81.5558458,86.3068789 88.8603258,73.6248763 96.2101753,60.9428737 C97.1317051,59.5530829 97.1317051,57.7385333 96.2101753,56.3487426 C93.9779988,52.5523947 91.8683198,48.6735176 89.6225324,44.8909246 C89.0508775,43.9280827 89.2958725,43.5979655 90.1533549,43.1302995 C93.1069055,41.4797135 96.0332345,39.760353 98.9731743,38.0409926 C99.8632114,37.6405423 100.541726,36.8751197 100.838091,35.9372062 C101.134456,34.9992927 101.020475,33.9781259 100.524809,33.1304992 Z M82.697238,61.0280456 C82.1277368,62.0143675 81.5853548,62.9595927 81.0022941,63.9185168 L81.0022941,63.9185168 L73.4496243,77.0557772 L73.4496243,77.0557772 C71.4428108,80.5763986 69.3817591,84.0833211 67.4427433,87.6176414 C66.9491122,88.5498928 65.9486463,89.0904001 64.9071073,88.987533 C54.1589034,88.9236047 43.4016597,88.8688091 32.6353764,88.823146 C31.7564295,88.8606451 30.940112,88.3647425 30.5607651,87.5628457 C25.1369448,78.0740633 19.7402435,68.5807146 14.3706614,59.0827995 C13.9190214,58.4345022 13.8768077,57.5815513 14.262185,56.890973 L20.3233042,46.4934958 C20.3169536,46.4526494 20.3169536,46.4110519 20.3233042,46.3702055 L28.1607246,32.6712896 L28.1607246,32.6712896 C28.7166662,31.6849676 29.326846,30.3972695 29.7743111,29.6301302 C30.2217763,28.8629909 30.4929673,28.8629909 31.1302662,29.2739584 C38.0727562,33.3836332 45.0423654,37.493308 51.9984149,41.5207893 C62.0053634,47.3839253 72.0168318,53.242495 82.03282,59.0964984 C83.0769054,59.808842 83.2531795,60.0417236 82.6701189,61.0280456 L82.697238,61.0280456 Z" id="Shape"></path>
            </g>
        </g>
    </svg>`;
    if (this.customLogoUrl) {
      headerImage = `<img src="${this.customLogoUrl}" alt="bugbattle-logo" />`;
    }
    return headerImage;
  }

  createBugReportingDialog(feedbackOptions) {
    const self = this;
    const formHTML = buildForm(feedbackOptions.form, this.overrideLanguage);

    var elem = document.createElement("div");
    elem.className = "bugbattle--feedback-dialog-container";
    elem.setAttribute("data-html2canvas-ignore", "true");
    elem.innerHTML = `<div class='bugbattle--feedback-dialog'>
      <div class="bugbattle--feedback-dialog-header-button bugbattle--feedback-dialog-header-button-cancel">
        <svg fill="#ffffff" width="100pt" height="100pt" version="1.1" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <path d="m100 9.4414-9.4414-9.4414-40.344 40.344-40.773-40.344-9.4414 9.4414 40.344 40.773-40.344 40.344 9.4414 9.4414 40.773-40.344 40.344 40.344 9.4414-9.4414-40.344-40.344z" fill-rule="evenodd"/>
        </svg>
      </div>
      <div class="bugbattle--feedback-dialog-header">
        <div class="bugbattle--feedback-dialog-header-logo">
          ${self.getHeaderImage()}
        </div>
        <div class="bugbattle--feedback-dialog-header-title">${translateText(
          feedbackOptions.title,
          this.overrideLanguage
        )}</div>
      </div>
      <div class="bugbattle--feedback-dialog-loading">
        <svg
          class="bugbattle--progress-ring"
          width="120"
          height="120">
          <circle
            class="bugbattle--progress-ring__circle"
            stroke="${this.mainColor}"
            stroke-width="6"
            fill="transparent"
            r="34"
            cx="60"
            cy="60"/>
        </svg>
      </div>
      <div class="bugbattle--feedback-dialog-success">
        <svg width="120px" height="92px" viewBox="0 0 120 92" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
            <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                <g id="np_check_1807541" fill="${
                  this.mainColor
                }" fill-rule="nonzero">
                    <path d="M107.553103,1.03448276 L101.669379,6.85344828 C81.2141379,27.3490345 62.5845517,47.5706897 42.7038621,67.7596552 L17.5535172,47.6517931 L11.088,42.4793793 L0.743172414,55.4104138 L38.2431724,85.4104138 L44.0621379,90.0010345 L49.2991034,84.764069 C71.5404828,62.4751034 91.5349655,40.4985517 113.437034,18.5571724 L119.256,12.6734483 L107.553103,1.03448276 Z" id="Path"></path>
                </g>
            </g>
        </svg>
        <div class="bugbattle--feedback-dialog-info-text">${translateText(
          "Thank you for your feedback!",
          this.overrideLanguage
        )}</div>
      </div>
      <div class="bugbattle--feedback-dialog-body">
        ${formHTML}
        <div class="bugbattle--feedback-inputgroup bugbattle--feedback-inputgroup--privacy-policy">
          <input type="checkbox" required name="terms"> <span class="bugbattle--feedback-inputgroup--privacy-policy-label">${translateText(
            "accept_policy_text",
            this.overrideLanguage
          )}<a id="bugbattle-privacy-policy-link" href="#" target="_blank">${translateText(
      "privacy_policy",
      this.overrideLanguage
    )}</a>.</span>
        </div>
        <div class="bugbattle--feedback-inputgroup bugbattle--feedback-inputgroup-button">
          <div class="bugbattle--feedback-send-button">${translateText(
            "Send feedback",
            this.overrideLanguage
          )}</div>
        </div>

        <div class="bugbattle--feedback-poweredbycontainer">
          <span>Powered by</span>
          <svg width="173px" height="30px" viewBox="0 0 173 30" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
              <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                  <g fill="#AAAAAA">
                      <g transform="translate(147.600000, 0.000000)">
                          <path d="M24.2859542,7.7113198 C24.0540256,7.30857681 23.5901684,7.21614399 23.1067117,7.49014127 C22.4207257,7.88298074 21.7282066,8.2659167 21.0585536,8.68186438 C20.793959,8.84692298 20.6796281,8.81721243 20.5293645,8.54321515 C19.7290475,7.10060297 18.8960646,5.67119547 18.092481,4.25169149 C18.0234655,4.09525611 17.9234014,3.95480724 17.7984871,3.83904499 C17.6571381,3.74207171 17.4921828,3.68612411 17.3215635,3.67728756 L12.0002725,3.67728756 C11.7748771,3.67728756 11.8010099,3.50892778 11.8010099,3.34717035 C11.8010099,2.52847968 11.8010099,1.69658433 11.8010099,0.887797176 C11.8346543,0.638013247 11.7383149,0.38837468 11.5462151,0.227562766 C11.4071145,0.0821266579 11.2155424,0 11.0153926,0 C10.8152429,0 10.6236708,0.0821266579 10.4845702,0.227562766 C10.2986685,0.392643686 10.2046806,0.639351901 10.233042,0.887797176 C10.2036426,1.81212535 10.2624414,2.73975469 10.184043,3.66408287 L6.51891806,3.64757701 C6.36738842,3.6701226 6.22373966,3.73023167 6.10079329,3.82253913 C5.9974756,3.89628042 5.90789458,3.98792717 5.8361987,4.09323523 L0.53450728,13.3167099 C0.35516424,13.600556 0.35516424,13.9637944 0.53450728,14.2476405 L5.81006591,23.5305363 C5.90158939,23.7273663 6.07735578,23.8709275 6.28698947,23.9200746 C6.38409512,23.9386703 6.48230448,23.9508007 6.58098345,23.9563874 L17.0896349,23.9960015 C17.2513063,24.0107273 17.4140655,23.9846371 17.5632919,23.9200746 C17.7549133,23.8514168 17.9098335,23.705613 17.9912164,23.5173316 C19.733403,20.4736509 21.4864782,17.4299703 23.2504421,14.3862897 C23.4716092,14.0527399 23.4716092,13.617248 23.2504421,13.2836982 C22.7147197,12.3725747 22.2083967,11.4416442 21.6694078,10.5338219 C21.5322106,10.3027399 21.5910094,10.2235117 21.7968052,10.1112719 C22.5056573,9.71513123 23.2079763,9.30248473 23.9135618,8.88983822 C24.1271707,8.79373014 24.2900142,8.61002873 24.3611418,8.38492949 C24.4322695,8.15983024 24.4049139,7.91475021 24.2859542,7.7113198 Z M20.0393745,14.4820237 C19.9021773,14.7197081 19.7715133,14.9474889 19.6310495,15.178571 L19.6310495,15.178571 L17.8115535,18.344395 L17.8115535,18.344395 C17.3280967,19.1927962 16.8315735,20.0378962 16.3644498,20.8895986 C16.2455303,21.114253 16.0045103,21.2445048 15.7535956,21.2197158 C13.1642709,21.2043103 10.5727684,21.1911057 7.97908815,21.1801018 C7.76734312,21.1891383 7.57068598,21.0696354 7.47929839,20.8763939 C6.17265848,18.5897821 4.87255177,16.3020699 3.57897826,14.0132572 C3.47017471,13.8570302 3.46000511,13.6514856 3.55284547,13.4850697 L5.01301556,10.9794801 C5.01148564,10.969637 5.01148564,10.9596127 5.01301556,10.9497696 L6.90111023,7.64859753 L6.90111023,7.64859753 C7.03504082,7.41091314 7.18203781,7.10060297 7.2898356,6.91573733 C7.39763339,6.7308717 7.46296539,6.7308717 7.61649558,6.82990686 C9.28899466,7.82025848 10.9680269,8.81061009 12.6437926,9.78115467 C15.0545433,11.1940563 17.4663827,12.6058576 19.8793111,14.0165584 C20.1308393,14.1882194 20.1733051,14.2443393 20.0328413,14.4820237 L20.0393745,14.4820237 Z" id="Shape"></path>
                      </g>
                      <path d="M17.556,15.03 C17.556,19.848 13.761,23.808 9.108,23.808 C6.77072152,23.7933743 4.54993338,22.7855117 3,21.036 L3,21.168 L2.4,23.268 L0,23.268 L0,0.168 L3,0.168 L3,9 C4.56193736,7.27275703 6.77633455,6.27927072 9.105,6.261 C13.761,6.252 17.556,10.2 17.556,15.03 Z M14.556,15.03 C14.556,11.8405556 11.9704444,9.255 8.781,9.255 C5.59155557,9.255 3.006,11.8405556 3.006,15.03 C3.006,18.2194444 5.59155557,20.805 8.781,20.805 C11.9631308,20.7885804 14.5382339,18.2121389 14.553,15.03 L14.556,15.03 Z" id="Shape" fill-rule="nonzero"></path>
                      <path d="M32.736,23.28 L32.274,21.63 C30.1613238,23.7506367 26.978911,24.3891451 24.2117195,23.2475883 C21.4445279,22.1060314 19.6379658,19.4094081 19.635,16.416 L19.635,6.78 L22.635,6.78 L22.635,16.053 C22.635,18.6774571 24.7625429,20.805 27.387,20.805 C30.0114571,20.805 32.139,18.6774571 32.139,16.053 L32.139,6.78 L35.139,6.78 L35.139,23.28 L32.736,23.28 Z" id="Path" fill-rule="nonzero"></path>
                      <path d="M55.044,21.102 C55.0420903,24.650847 52.9027758,27.8491651 49.623469,29.2058026 C46.3441622,30.5624401 42.5705487,29.8102793 40.062,27.3 L42.207,25.2 C43.8577662,26.8474964 46.3387667,27.3376373 48.4920171,26.4416539 C50.6452675,25.5456705 52.0462228,23.4402192 52.041,21.108 L52.041,21.042 C50.5002169,22.8021497 48.2752599,23.8124004 45.936,23.814 C41.283,23.814 37.488,19.854 37.488,15.036 C37.488,10.218 41.283,6.258 45.936,6.258 C48.2752599,6.2595996 50.5002169,7.2698503 52.041,9.03 L52.041,8.898 L52.641,6.798 L55.041,6.798 L55.044,21.102 Z M51.48,15.03 C51.48,11.862 48.972,9.255 45.936,9.255 C42.9,9.255 40.392,11.862 40.392,15.03 C40.392,18.198 42.867,20.805 45.936,20.805 C49.005,20.805 51.48,18.198 51.48,15.03 Z" id="Shape" fill-rule="nonzero"></path>
                      <path d="M75.537,15.03 C75.537,19.848 71.742,23.808 67.089,23.808 C64.7527694,23.7925242 62.5332367,22.7847364 60.984,21.036 L60.984,21.168 L60.384,23.268 L57.984,23.268 L57.984,0.168 L60.984,0.168 L60.984,9 C62.5459374,7.27275703 64.7603345,6.27927072 67.089,6.261 C71.742,6.252 75.537,10.2 75.537,15.03 Z M72.537,15.03 C72.537,11.8405556 69.9514444,9.255 66.762,9.255 C63.5725556,9.255 60.987,11.8405556 60.987,15.03 C60.987,18.2194444 63.5725556,20.805 66.762,20.805 C69.9441308,20.7885804 72.5192339,18.2121389 72.534,15.03 L72.537,15.03 Z" id="Shape" fill-rule="nonzero"></path>
                      <path d="M95.139,23.28 L92.739,23.28 L92.139,21.18 L92.139,21.048 C90.5807158,22.803397 88.3482532,23.8116059 86.001,23.82 C81.381,23.82 77.586,19.86 77.586,15.042 C77.586,10.224 81.381,6.264 86.001,6.264 C88.3482532,6.27239413 90.5807158,7.28060302 92.139,9.036 L92.139,8.904 L92.739,6.804 L95.139,6.804 L95.139,23.28 Z M92.139,15.03 C92.139,11.8405556 89.5534444,9.255 86.364,9.255 C83.1745556,9.255 80.589,11.8405556 80.589,15.03 C80.589,18.2194444 83.1745556,20.805 86.364,20.805 C89.5461308,20.7885804 92.1212339,18.2121389 92.136,15.03 L92.139,15.03 Z" id="Shape" fill-rule="nonzero"></path>
                      <path d="M105.963,20.805 L105.963,23.28 L103.422,23.28 C101.143537,22.2828018 99.6773135,20.0250766 99.693,17.538 L99.693,9.453 L97.593,9.453 L97.593,6.78 L99.693,6.78 L99.693,2.325 L102.693,2.325 L102.693,6.78 L105.498,6.78 L105.498,9.453 L102.693,9.453 L102.693,17.538 C102.688982,18.4062085 103.032305,19.2399754 103.646509,19.8536163 C104.260714,20.4672572 105.094796,20.8098149 105.963,20.805 Z" id="Path" fill-rule="nonzero"></path>
                      <path d="M115.962,20.805 L115.962,23.28 L113.421,23.28 C111.142537,22.2828018 109.676314,20.0250766 109.692,17.538 L109.692,9.453 L107.592,9.453 L107.592,6.78 L109.692,6.78 L109.692,2.325 L112.692,2.325 L112.692,6.78 L115.5,6.78 L115.5,9.453 L112.695,9.453 L112.695,17.538 C112.690988,18.4056858 113.033901,19.2389929 113.647454,19.852546 C114.261007,20.4660991 115.094314,20.8090116 115.962,20.805 Z" id="Path" fill-rule="nonzero"></path>
                      <polygon fill-rule="nonzero" points="118.305 23.28 118.305 0.18 121.305 0.18 121.305 23.28"></polygon>
                      <path d="M127.08,15.69 C127.330165,17.935452 128.871936,19.8263987 131.021025,20.5235752 C133.170113,21.2207517 135.528322,20.5949806 137.049,18.924 L139.194,21.069 C139.119365,21.1139793 139.051659,21.1695593 138.993,21.234 C137.350467,22.8842039 135.117322,23.8107216 132.789,23.808006 C130.468503,23.7936931 128.246259,22.869464 126.6,21.234 C124.949796,19.5914668 124.023278,17.3583215 124.025994,15.03 C124.025994,10.179 127.524,6.252 131.826,6.252 C136.128,6.252 139.626,10.179 139.626,15.03 L139.626,15.69 L127.08,15.69 Z M127.314,13.017 L136.287,13.017 C135.627,10.839 133.887,9.255 131.787,9.255 C129.687,9.255 128.004,10.839 127.314,13.017 Z" id="Shape" fill-rule="nonzero"></path>
                  </g>
              </g>
          </svg>
        </div>
      </div>
    </div>`;
    document.body.appendChild(elem);

    this.resetLoadingCircle();
    this.validatePoweredBy();
    this.hookDialogCloseButton();
    this.hookPrivacyPolicy(feedbackOptions);
    hookForm(feedbackOptions.form);

    const sendButton = document.querySelector(
      ".bugbattle--feedback-send-button"
    );
    sendButton.onclick = function () {
      // Validate form
      if (!validateForm(feedbackOptions.form)) {
        return;
      }

      // Remember form items
      rememberForm(feedbackOptions.form);

      // Privacy policy check
      const privacyPolicyInput = document.querySelector(
        ".bugbattle--feedback-inputgroup--privacy-policy input"
      );
      if (feedbackOptions.enablePrivacyPolicy && !privacyPolicyInput.checked) {
        alert(translateText("accept_policy_alert", self.overrideLanguage));
        return;
      }

      // Check API key
      if (!self.sdkKey) {
        return alert(translateText("apikey_wrong", self.overrideLanguage));
      }

      window.scrollTo(self.snapshotPosition.x, self.snapshotPosition.y);
      self.toggleLoading(true);

      // Send form
      const formData = getFormData(feedbackOptions.form);
      self.formData = formData;
      self.feedbackType = feedbackOptions.feedbackType
        ? feedbackOptions.feedbackType
        : "BUG";
      self.checkReplayLoaded();
    };
  }

  hookPrivacyPolicy(feedbackOptions) {
    const privacyPolicyContainer = document.querySelector(
      ".bugbattle--feedback-inputgroup--privacy-policy"
    );
    const privacyPolicyInputLabel = document.querySelector(
      ".bugbattle--feedback-inputgroup--privacy-policy-label"
    );
    const privacyPolicyInput = document.querySelector(
      ".bugbattle--feedback-inputgroup--privacy-policy input"
    );

    if (feedbackOptions.enablePrivacyPolicy) {
      privacyPolicyContainer.style.display = "flex";
      document.querySelector("#bugbattle-privacy-policy-link").href =
        feedbackOptions.privacyPolicyUrl;
    } else {
      privacyPolicyContainer.style.display = "none";
    }

    privacyPolicyInputLabel.onclick = function () {
      privacyPolicyInput.checked = !privacyPolicyInput.checked;
    };
  }

  hookDialogCloseButton() {
    const self = this;

    const cancelButton = document.querySelector(
      ".bugbattle--feedback-dialog-header-button-cancel"
    );

    cancelButton.onclick = function () {
      self.closeBugBattle();
    };
  }

  resetLoadingCircle() {
    const circle = document.querySelector(".bugbattle--progress-ring__circle");
    const circumference = 213.628300444;
    circle.style.strokeDasharray = `${circumference} ${circumference}`;

    const offset = circumference - (1 / 100) * circumference;
    circle.style.strokeDashoffset = offset;
  }

  validatePoweredBy() {
    const poweredByContainer = document.querySelector(
      ".bugbattle--feedback-poweredbycontainer"
    );
    if (this.poweredByHidden) {
      poweredByContainer.style.display = "none";
    } else {
      poweredByContainer.onclick = function () {
        window.open("https://www.bugbattle.io/", "_blank");
      };
    }
  }

  checkReplayLoaded(retries = 0) {
    if (
      this.replaysEnabled &&
      !(this.replay && this.replay.result) &&
      retries < 5
    ) {
      // Replay is not ready yet.
      setTimeout(() => {
        this.checkReplayLoaded(++retries);
      }, 1000);
    } else {
      this.takeScreenshotAndSend();
    }
  }

  takeScreenshotAndSend() {
    return startScreenCapture(this.snapshotPosition, this.isLiveSite)
      .then((data) => {
        this.sendBugReportToServer(data);
      })
      .catch((err) => {
        this.showError();
      });
  }

  reportCleanup() {
    BugBattle.enableReplays(this.replaysEnabled);
    this.networkIntercepter.setStopped(false);
    this.currentlySendingBug = false;
  }

  hide() {
    this.reportCleanup();

    const editorContainer = document.querySelector(
      ".bugbattle-screenshot-editor"
    );
    if (editorContainer) {
      editorContainer.remove();
    }
    const dialogContainer = document.querySelector(
      ".bugbattle--feedback-dialog-container"
    );
    if (dialogContainer) {
      dialogContainer.remove();
    }

    const feedbackBtn = document.querySelector(".bugbattle--feedback-button");
    if (feedbackBtn) {
      feedbackBtn.style.display = "block";
    }

    this.enableScroll();
  }

  init() {
    const self = this;

    this.overwriteConsoleLog();
    this.startCrashDetection();
    this.registerKeyboardListener();
    this.registerEscapeListener();

    if (window && window.location && window.location.origin) {
      this.checkOnlineStatus(window.location.origin)
        .then(function (status) {
          if (status && status.up) {
            self.isLiveSite = true;
          } else {
            self.isLiveSite = false;
          }
        })
        .catch(function () {
          self.isLiveSite = false;
        });
    }
  }

  registerKeyboardListener() {
    const self = this;
    const charForEvent = function (event) {
      var code;

      if (event.key !== undefined) {
        code = event.key;
      } else if (event.keyIdentifier !== undefined) {
        code = event.keyIdentifier;
      } else if (event.keyCode !== undefined) {
        code = event.keyCode;
      }

      return code;
    };

    document.onkeyup = function (e) {
      var char = charForEvent(e);
      if (
        e.ctrlKey &&
        (char === "i" || char === "I" || char === 73) &&
        self.shortcutsEnabled
      ) {
        BugBattle.startBugReporting();
      }
    };
  }

  checkForInitType() {
    applyBugbattleBaseCSS();

    setInterval(() => {
      if (this.replay && this.replay.isFull()) {
        BugBattle.enableReplays(this.replaysEnabled);
      }
    }, 1000);

    if (this.activation === BugBattle.FEEDBACK_BUTTON) {
      this.injectFeedbackButton();
    }
  }

  injectFeedbackButton() {
    const self = this;

    var feedbackButtonText = translateText(
      "feedback_btn_title",
      self.overrideLanguage
    );

    if (this.overrideButtonText) {
      feedbackButtonText = this.overrideButtonText;
    }

    var elem = document.createElement("div");
    elem.className = "bugbattle--feedback-button";
    elem.innerHTML = `<div class="bugbattle--feedback-button-inner"><span class="bugbattle--feedback-button-inner-text">${feedbackButtonText}</span></div>`;

    elem.onclick = function () {
      if (self.feedbackTypeActions.length > 0) {
        BugBattle.startFeedbackTypeSelection();
      } else {
        BugBattle.startBugReporting();
      }
    };
    document.body.appendChild(elem);
  }

  toggleLoading(loading) {
    const header = document.querySelector(".bugbattle--feedback-dialog-header");
    const body = document.querySelector(".bugbattle--feedback-dialog-body");
    const loader = document.querySelector(
      ".bugbattle--feedback-dialog-loading"
    );
    if (loading) {
      body.style.display = "none";
      loader.style.display = "flex";
      header.style.display = "none";
    } else {
      body.style.display = "block";
      loader.style.display = "none";
      header.style.display = "flex";
    }
  }

  registerEscapeListener() {
    const self = this;
    document.addEventListener("keydown", (evt) => {
      evt = evt || window.event;
      var isEscape = false;
      if ("key" in evt) {
        isEscape = evt.key === "Escape" || evt.key === "Esc";
      } else {
        isEscape = evt.keyCode === 27;
      }
      if (isEscape) {
        self.closeBugBattle();
      }
    });
  }

  closeBugBattle() {
    this.hide();
  }

  showSuccessMessage() {
    const success = document.querySelector(
      ".bugbattle--feedback-dialog-success"
    );
    const body = document.querySelector(".bugbattle--feedback-dialog-body");
    const loader = document.querySelector(
      ".bugbattle--feedback-dialog-loading"
    );
    body.style.display = "none";
    loader.style.display = "none";
    success.style.display = "flex";
  }

  sendBugReportToServer(screenshotData) {
    const self = this;
    const http = new XMLHttpRequest();
    http.open("POST", this.apiUrl + "/bugs");
    http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    http.setRequestHeader("Api-Token", this.sdkKey);
    http.onerror = (error) => {
      if (self.silentBugReport) {
        self.reportCleanup();
        return;
      }

      self.showError();
    };
    http.upload.onprogress = function (e) {
      if (self.silentBugReport) {
        self.reportCleanup();
        return;
      }

      if (e.lengthComputable) {
        const percentComplete = parseInt((e.loaded / e.total) * 100);
        const circle = window.document.querySelector(
          ".bugbattle--progress-ring__circle"
        );
        const circumference = 213.628300444;
        const offset = circumference - (percentComplete / 100) * circumference;
        if (circle) {
          circle.style.strokeDashoffset = offset;
        }
      }
    };
    http.onreadystatechange = function (e) {
      if (self.silentBugReport) {
        self.reportCleanup();
        return;
      }

      if (
        http.readyState === XMLHttpRequest.DONE &&
        (http.status === 200 || http.status === 201)
      ) {
        self.showSuccessMessage();
        setTimeout(function () {
          self.closeBugBattle();
        }, 1000);
      }
    };

    const bugReportData = {
      priority: this.severity,
      customData: this.customData,
      metaData: this.getMetaData(),
      consoleLog: this.logArray,
      networkLogs: this.networkIntercepter.getRequests(),
      type: this.feedbackType,
      formData: this.formData,
    };

    if (screenshotData.fileUrl) {
      bugReportData["screenshotUrl"] = screenshotData.fileUrl;
    }

    if (screenshotData.html) {
      bugReportData["screenshotData"] = screenshotData;
    }

    if (this.replay && this.replay.result) {
      bugReportData["webReplay"] = this.replay.result;
    }

    http.send(JSON.stringify(bugReportData));
  }

  showError() {
    if (this.silentBugReport) {
      return;
    }
    this.toggleLoading(false);
  }

  getMetaData() {
    var nAgt = navigator.userAgent;
    var browserName = navigator.appName;
    var fullVersion = "" + parseFloat(navigator.appVersion);
    var majorVersion = parseInt(navigator.appVersion, 10);
    var nameOffset, verOffset, ix;

    // In Opera, the true version is after "Opera" or after "Version"
    if ((verOffset = nAgt.indexOf("Opera")) !== -1) {
      browserName = "Opera";
      fullVersion = nAgt.substring(verOffset + 6);
      if ((verOffset = nAgt.indexOf("Version")) !== -1)
        fullVersion = nAgt.substring(verOffset + 8);
    }
    // In MSIE, the true version is after "MSIE" in userAgent
    else if ((verOffset = nAgt.indexOf("MSIE")) !== -1) {
      browserName = "Microsoft Internet Explorer";
      fullVersion = nAgt.substring(verOffset + 5);
    }
    // In Chrome, the true version is after "Chrome"
    else if ((verOffset = nAgt.indexOf("Chrome")) !== -1) {
      browserName = "Chrome";
      fullVersion = nAgt.substring(verOffset + 7);
    }
    // In Safari, the true version is after "Safari" or after "Version"
    else if ((verOffset = nAgt.indexOf("Safari")) !== -1) {
      browserName = "Safari";
      fullVersion = nAgt.substring(verOffset + 7);
      if ((verOffset = nAgt.indexOf("Version")) !== -1)
        fullVersion = nAgt.substring(verOffset + 8);
    }
    // In Firefox, the true version is after "Firefox"
    else if ((verOffset = nAgt.indexOf("Firefox")) !== -1) {
      browserName = "Firefox";
      fullVersion = nAgt.substring(verOffset + 8);
    }
    // In most other browsers, "name/version" is at the end of userAgent
    else if (
      (nameOffset = nAgt.lastIndexOf(" ") + 1) <
      (verOffset = nAgt.lastIndexOf("/"))
    ) {
      browserName = nAgt.substring(nameOffset, verOffset);
      fullVersion = nAgt.substring(verOffset + 1);
      if (browserName.toLowerCase() === browserName.toUpperCase()) {
        browserName = navigator.appName;
      }
    }
    // trim the fullVersion string at semicolon/space if present
    if ((ix = fullVersion.indexOf(";")) !== -1)
      fullVersion = fullVersion.substring(0, ix);
    if ((ix = fullVersion.indexOf(" ")) !== -1)
      fullVersion = fullVersion.substring(0, ix);

    majorVersion = parseInt("" + fullVersion, 10);
    if (isNaN(majorVersion)) {
      fullVersion = "" + parseFloat(navigator.appVersion);
      majorVersion = parseInt(navigator.appVersion, 10);
    }

    var OSName = "Unknown OS";
    if (navigator.appVersion.indexOf("Win") !== -1) OSName = "Windows";
    if (navigator.appVersion.indexOf("Mac") !== -1) OSName = "MacOS";
    if (navigator.appVersion.indexOf("X11") !== -1) OSName = "UNIX";
    if (navigator.appVersion.indexOf("Linux") !== -1) OSName = "Linux";
    if (navigator.appVersion.indexOf("iPad") !== -1) OSName = "iPad";
    if (navigator.appVersion.indexOf("iPhone") !== -1) OSName = "iPhone";
    if (navigator.appVersion.indexOf("Android") !== -1) OSName = "Android";

    const now = new Date();
    const sessionDuration =
      (now.getTime() - this.sessionStart.getTime()) / 1000;

    return {
      browserName: browserName + "(" + fullVersion + ")",
      userAgent: nAgt,
      browser: navigator.appName,
      systemName: OSName,
      buildVersionNumber: this.appBuildNumber,
      releaseVersionNumber: this.appVersionCode,
      sessionDuration: sessionDuration,
      devicePixelRatio: window.devicePixelRatio,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      currentUrl: window.location.href,
      language: navigator.language || navigator.userLanguage,
      mobile: isMobile(),
    };
  }

  showBugReportEditor(feedbackOptions) {
    if (feedbackOptions.disableUserScreenshot) {
      this.createBugReportingDialog(feedbackOptions);
      return;
    }

    const self = this;
    var bugReportingEditor = document.createElement("div");
    bugReportingEditor.className = "bugbattle-screenshot-editor";
    bugReportingEditor.setAttribute("data-html2canvas-ignore", "true");
    bugReportingEditor.innerHTML = `
      <div class="bugbattle-screenshot-editor-container">
        <div class='bugbattle-screenshot-editor-container-inner'>
          <div class='bugbattle-screenshot-editor-borderlayer'></div>
          <div class='bugbattle-screenshot-editor-dot'></div>
          <div class='bugbattle-screenshot-editor-rectangle'></div>
          <div class='bugbattle-screenshot-editor-drag-info'>${translateText(
            "click_and_drag",
            self.overrideLanguage
          )}</div>
        </div>
      </div>
    `;
    document.body.appendChild(bugReportingEditor);

    const editorRectangle = document.querySelector(
      ".bugbattle-screenshot-editor-borderlayer"
    );
    if (editorRectangle) {
      editorRectangle.style.height = `${window.innerHeight}px`;
    }

    var addedMarker = false;
    var clickStartX = -1;
    var clickStartY = -1;

    function setStartPoint(x, y) {
      if (addedMarker) {
        return;
      }

      const editorDot = document.querySelector(
        ".bugbattle-screenshot-editor-dot"
      );
      editorDot.style.left = x - editorDot.offsetWidth / 2 + "px";
      editorDot.style.top = y - editorDot.offsetHeight / 2 + "px";
    }

    function setMouseMove(x, y) {
      const dragInfo = document.querySelector(
        ".bugbattle-screenshot-editor-drag-info"
      );
      dragInfo.style.left = `${x + 20}px`;
      dragInfo.style.top = `${y - dragInfo.offsetHeight / 2}px`;
      dragInfo.style.right = null;

      if (addedMarker || clickStartX < 0) {
        return;
      }

      const width = x - clickStartX;
      const height = y - clickStartY;

      const editorRectangle = document.querySelector(
        ".bugbattle-screenshot-editor-rectangle"
      );

      var left = width < 0 ? clickStartX + width : clickStartX;
      var top = height < 0 ? clickStartY + height : clickStartY;
      var heightAbs = height < 0 ? height * -1 : height;
      var widthAbs = width < 0 ? width * -1 : width;

      editorRectangle.style.left = `${left}px`;
      editorRectangle.style.top = `${top}px`;
      editorRectangle.style.width = `${widthAbs}px`;
      editorRectangle.style.height = `${heightAbs}px`;
    }

    function mouseDownEventHandler(e) {
      clickStartX = e.pageX - document.documentElement.scrollLeft;
      clickStartY = e.pageY - document.documentElement.scrollTop;
      setStartPoint(clickStartX, clickStartY);
    }

    function touchstartEventHandler(e) {
      clickStartX = e.touches[0].pageX - document.documentElement.scrollLeft;
      clickStartY = e.touches[0].pageY - document.documentElement.scrollTop;
      setStartPoint(clickStartX, clickStartY);
    }

    function mouseUpEventHandler(e) {
      const dragInfo = document.querySelector(
        ".bugbattle-screenshot-editor-drag-info"
      );
      dragInfo.style.display = "none";

      const fixedDot = window.document.querySelector(
        ".bugbattle-screenshot-editor-dot"
      );
      const fixedRectangle = window.document.querySelector(
        ".bugbattle-screenshot-editor-rectangle"
      );

      fixedRectangle.style.top = `${
        fixedRectangle.offsetTop + document.documentElement.scrollTop
      }px`;
      fixedRectangle.style.left = `${
        fixedRectangle.offsetLeft + document.documentElement.scrollLeft
      }px`;

      fixedDot.style.top = `${
        fixedDot.offsetTop + document.documentElement.scrollTop
      }px`;
      fixedDot.style.left = `${
        fixedDot.offsetLeft + document.documentElement.scrollLeft
      }px`;

      fixedDot.parentNode.removeChild(fixedDot);
      fixedRectangle.parentNode.removeChild(fixedRectangle);

      const screenshotEditor = window.document.querySelector(
        ".bugbattle-screenshot-editor"
      );
      screenshotEditor.appendChild(fixedDot);
      screenshotEditor.appendChild(fixedRectangle);

      addedMarker = true;

      self.createBugReportingDialog(feedbackOptions);
    }

    function mouseMoveEventHandler(e) {
      const x = e.pageX - document.documentElement.scrollLeft;
      const y = e.pageY - document.documentElement.scrollTop;
      setMouseMove(x, y);
    }

    function touchMoveEventHandler(e) {
      const x = e.touches[0].pageX - document.documentElement.scrollLeft;
      const y = e.touches[0].pageY - document.documentElement.scrollTop;
      setMouseMove(x, y);
      e.preventDefault();
    }

    bugReportingEditor.addEventListener("mouseup", mouseUpEventHandler);
    bugReportingEditor.addEventListener("mousemove", mouseMoveEventHandler);
    bugReportingEditor.addEventListener("mousedown", mouseDownEventHandler);
    bugReportingEditor.addEventListener("touchstart", touchstartEventHandler);
    bugReportingEditor.addEventListener("touchmove", touchMoveEventHandler);
    bugReportingEditor.addEventListener("touchend", mouseUpEventHandler);
  }
}

export default BugBattle;
