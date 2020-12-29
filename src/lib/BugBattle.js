import "./css/App.css";
import html2canvas from "html2canvas";

class BugBattle {
  apiUrl = "https://api.bugbattle.io";
  sdkKey = null;
  privacyPolicyUrl = "https://www.bugbattle.io/pages/privacy-policy";
  privacyPolicyCheckEnabled = false;
  email = localStorage.getItem("bugbattle-sender-email") ?? "";
  activation = "";
  screenshot = null;
  screenshotURL = "";
  type = "BUG";
  crashDetectorEnabled = false;
  crashDetected = false;
  actionLog = [];
  logArray = [];
  customData = {};
  sessionStart = new Date();
  bugReportingRunning = false;
  poweredByHidden = false;
  description = "";
  severity = "LOW";
  appVersionCode = "";
  appBuildNumber = "";
  mainColor = "#398CFE";
  previousBodyOverflow;
  questionCallback = null;

  // Activation methods
  static FEEDBACK_BUTTON = "FEEDBACK_BUTTON";
  static NONE = "NONE";

  // Bugbattle singleton instance
  static instance;

  static initialize(sdkKey, activation) {
    if (!this.instance) {
      this.instance = new BugBattle(sdkKey, activation);
    } else {
      console.warn("Bugbattle already initialized.");
    }
  }

  constructor(sdkKey, activation) {
    this.sdkKey = sdkKey;
    this.activation = activation;
    this.init();
  }

  /**
   * Hides the powered by bugbattle logo.
   * @param {boolean} hide
   */
  static enablePoweredByBugbattle(hide) {
    this.instance.poweredByHidden = hide;
  }

  /**
   * Enables the privacy policy.
   * @param {boolean} enabled
   */
  static enablePrivacyPolicy(enabled) {
    this.instance.privacyPolicyCheckEnabled = enabled;
  }

  /**
   * Sets the privacy policy url.
   * @param {string} privacyPolicyUrl
   */
  static setPrivacyPolicyUrl(privacyPolicyUrl) {
    this.instance.privacyPolicyUrl = privacyPolicyUrl;
  }

  /**
   * Enables the automatic crash detector.
   * @param {boolean} enabled
   */
  static enableCrashDetector(enabled) {
    this.instance.crashDetectorEnabled = enabled;
  }

  /**
   * Sets the customers email.
   * @param {string} email
   */
  static setCustomerEmail(email) {
    this.instance.email = email;
  }

  /**
   * Sets the app version code.
   * @param {string} appVersionCode
   */
  static setAppVersionCode(appVersionCode) {
    this.instance.appVersionCode = appVersionCode;
  }

  /**
   * Sets the app version code.
   * @param {string} appVersionCode
   */
  static setAppBuildNumber(appBuildNumber) {
    this.instance.appBuildNumber = appBuildNumber;
  }

  /**
   * Set a custom api url to send bug reports to.
   * @param {string} apiUrl
   */
  static setApiUrl(apiUrl) {
    this.instance.apiUrl = apiUrl;
  }

  /**
   * Set custom data that will be attached to the bug-report.
   * @param {*} data
   */
  static attachCustomData(data) {
    this.instance.customData = data;
  }

  /**
   * Sets a custom color (HEX-String i.e. #086EFB) as new main color scheme.
   * @param {string} color
   */
  static setMainColor(color) {
    const colorStyleSheet = `
    .bugbattle--feedback-button {
        background-color: ${color};
    }
    .bugbattle--feedback-dialog-header-button {
        color: ${color};
    }
    .bugbattle-screenshot-editor-borderlayer {
        border-color: ${color};
    }
    .bugbattle-screenshot-editor-dot {
      background-color: ${color};
    }
    .bugbattle-screenshot-editor-rectangle {
      border-color: ${color};
    }
    .bugbattle--feedback-send-button {
      background-color: ${color};
    }
    .bugbattle--feedback-inputgroup--privacy-policy a {
      color: ${color};
    }
    .bugbattle-screenshot-editor-drag-info {
      background-color: ${color};
    }
    .bugbattle-double-bounce1,
    .bugbattle-double-bounce2 {
      background-color: ${color};
    }
    `;

    this.instance.mainColor = color;
    const node = document.createElement("style");
    node.innerHTML = colorStyleSheet;
    document.body.appendChild(node);
  }

  /**
   * Starts the bug reporting flow.
   */
  static startBugReporting() {
    this.instance.disableScroll();
    const feedbackBtn = document.querySelector(".bugbattle--feedback-button");
    if (feedbackBtn) {
      feedbackBtn.style.display = "none";
    }

    if (this.instance.crashDetected) {
      this.instance.askForCrashReport();
    } else {
      this.instance.showFeedbackTypeInfo();
    }
  }

  showFeedbackTypeInfo() {
    const self = this;

    var elem = document.createElement("div");
    elem.className = "bugbattle--feedback-dialog-container";
    elem.setAttribute("data-html2canvas-ignore", "true");
    elem.innerHTML = `<div class='bugbattle--feedback-dialog bugbattle--feedback-dialog-type'>
        <div class="bugbattle--feedback-dialog-header">
          <div></div>
          <div class="bugbattle--feedback-dialog-header-title">Need help?</div>
          <div class="bugbattle--feedback-dialog-header-button bugbattle--feedback-dialog-header-button-cancel">
            <svg fill="#CCCCCC" width="100pt" height="100pt" version="1.1" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <path d="m100 9.4414-9.4414-9.4414-40.344 40.344-40.773-40.344-9.4414 9.4414 40.344 40.773-40.344 40.344 9.4414 9.4414 40.773-40.344 40.344 40.344 9.4414-9.4414-40.344-40.344z" fill-rule="evenodd"/>
            </svg>
          </div>
        </div>
        <div class="bugbattle--feedback-dialog-body">
          <div class="bugbattle--feedback-option-container">
            <div class="bugbattle--feedback-option" id="bugbattle--feedback-option-bug">
              <div class="bugbattle--feedback-option-icon">
                <svg width="102px" height="102px" viewBox="0 0 102 102" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
                    <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                        <path d="M100.524809,33.1304992 C99.5584401,31.4524034 97.6257019,31.0672666 95.6112987,32.208922 C92.7530239,33.8457531 89.8675274,35.4413196 87.0773068,37.1744349 C85.9748294,37.8621791 85.4984502,37.7383851 84.8723519,36.5967298 C81.537698,30.5858457 78.0669358,24.6299811 74.718671,18.7153812 C74.4311065,18.0635671 74.0141725,17.4783635 73.4936961,16.9960208 C72.9047419,16.5919655 72.2174285,16.3588504 71.5065145,16.3220315 L49.3344686,16.3220315 C48.3953212,16.3220315 48.5042078,15.6205324 48.5042078,14.9465431 C48.5042078,11.535332 48.5042078,8.06910137 48.5042078,4.6991549 C48.6443929,3.65838853 48.2429786,2.61822784 47.4425629,1.94817819 C46.8629771,1.34219441 46.06476,1 45.2308027,1 C44.3968453,1 43.5986283,1.34219441 43.0190424,1.94817819 C42.244452,2.63601536 41.8528356,3.66396625 41.9710083,4.6991549 C41.8485108,8.55052229 42.0935058,12.4156446 41.7668458,16.267012 L26.4954919,16.1982375 C25.8641184,16.2921775 25.2655819,16.5426319 24.7533054,16.9272464 C24.322815,17.2345018 23.9495608,17.6163632 23.6508279,18.0551468 L1.560447,56.4862914 C0.813184334,57.6689833 0.813184334,59.1824767 1.560447,60.3651686 L23.5419413,99.043901 C23.9232891,99.8640262 24.6556491,100.462198 25.5291228,100.666977 C25.9337297,100.744459 26.3429353,100.795003 26.7540977,100.818281 L70.5401455,100.98334 C71.2137764,101.044697 71.8919396,100.935988 72.5137161,100.666977 C73.3121387,100.380903 73.9576397,99.7733873 74.2967352,98.9888815 C81.5558458,86.3068789 88.8603258,73.6248763 96.2101753,60.9428737 C97.1317051,59.5530829 97.1317051,57.7385333 96.2101753,56.3487426 C93.9779988,52.5523947 91.8683198,48.6735176 89.6225324,44.8909246 C89.0508775,43.9280827 89.2958725,43.5979655 90.1533549,43.1302995 C93.1069055,41.4797135 96.0332345,39.760353 98.9731743,38.0409926 C99.8632114,37.6405423 100.541726,36.8751197 100.838091,35.9372062 C101.134456,34.9992927 101.020475,33.9781259 100.524809,33.1304992 Z M82.697238,61.0280456 C82.1277368,62.0143675 81.5853548,62.9595927 81.0022941,63.9185168 L81.0022941,63.9185168 L73.4496243,77.0557772 L73.4496243,77.0557772 C71.4428108,80.5763986 69.3817591,84.0833211 67.4427433,87.6176414 C66.9491122,88.5498928 65.9486463,89.0904001 64.9071073,88.987533 C54.1589034,88.9236047 43.4016597,88.8688091 32.6353764,88.823146 C31.7564295,88.8606451 30.940112,88.3647425 30.5607651,87.5628457 C25.1369448,78.0740633 19.7402435,68.5807146 14.3706614,59.0827995 C13.9190214,58.4345022 13.8768077,57.5815513 14.262185,56.890973 L20.3233042,46.4934958 C20.3169536,46.4526494 20.3169536,46.4110519 20.3233042,46.3702055 L28.1607246,32.6712896 L28.1607246,32.6712896 C28.7166662,31.6849676 29.326846,30.3972695 29.7743111,29.6301302 C30.2217763,28.8629909 30.4929673,28.8629909 31.1302662,29.2739584 C38.0727562,33.3836332 45.0423654,37.493308 51.9984149,41.5207893 C62.0053634,47.3839253 72.0168318,53.242495 82.03282,59.0964984 C83.0769054,59.808842 83.2531795,60.0417236 82.6701189,61.0280456 L82.697238,61.0280456 Z" id="Shape" fill="${this.mainColor}"></path>
                    </g>
                </svg>
              </div>
              <div class="bugbattle--feedback-option-text">Report a problem</div>
            </div>
            <div class="bugbattle--feedback-option" id="bugbattle--feedback-option-feedback">
              <div class="bugbattle--feedback-option-icon">
                <svg fill="${this.mainColor}" width="100pt" height="100pt" version="1.1" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <g>
                  <path d="m98.613 30.504c0-3.7148-1.0078-7.3594-2.918-10.551-1.9102-3.1875-4.6484-5.7969-7.9258-7.5469v17.383l-3.5742 2.4688-14.148 0.003907-3.5742-2.4727v-17.383c-3.7891 2.0312-6.8516 5.1953-8.75 9.0547 2.2656 4.4922 3.4414 9.4531 3.4336 14.484 0.003906 2.5195-0.31641 5.0312-0.96094 7.4688 2.5469 3.1523 5.9688 5.4805 9.8359 6.6914-0.027344 0.27344-0.042969 0.54688-0.042969 0.82422v41.242h4.4688v-26.387c0.20312-0.10156 0.41797-0.1875 0.63281-0.26172 0.61719-0.20703 1.2656-0.3125 1.918-0.30859 0.035157 0 0.074219 0.003906 0.10938 0.007812 0.039062-0.003906 0.078124-0.007812 0.11719-0.007812 0.65234-0.003906 1.3008 0.10156 1.918 0.30859 0.21484 0.074218 0.42969 0.16016 0.63281 0.26172v26.387h4.4648l0.003906-41.242c-0.003906-0.27734-0.019531-0.55078-0.050781-0.82422 4.1758-1.3086 7.8281-3.9141 10.418-7.4375 2.5938-3.5273 3.9922-7.7852 3.9922-12.164z"/>
                  <path d="m29.27 66.543h-16.211l-0.085938 12.621c-0.007812 1.3047 0.64453 2.5273 1.7383 3.2461 2.6406 1.7305 7.3633 4.8047 7.6445 4.8633 0.39453 2.6953 3.3203 4.7969 6.9141 4.8984 3.5938-0.10156 6.5156-2.2031 6.9141-4.8984 0.28125-0.058594 5.0039-3.1328 7.6445-4.8633h-0.003906c1.0938-0.71875 1.75-1.9414 1.7383-3.2461l-0.085938-12.621z"/>
                  <path d="m29.293 7.8281h-0.066407c-7.4102 0.070313-14.492 3.0625-19.707 8.3281-5.2148 5.2656-8.1367 12.379-8.1328 19.789 0 5.4492 1.6836 10.547 5.1367 15.578 2.6953 3.8516 4.8672 8.0508 6.457 12.48 0.023437 0.050782 0.039062 0.10156 0.054687 0.15625h5.5c-0.015625-0.050781-0.039062-0.10547-0.050781-0.15625h-0.003906c-1.7617-5.5-4.3477-10.703-7.6641-15.43-2.6836-3.668-4.1602-8.082-4.2188-12.629-0.003906-6.0273 2.3711-11.816 6.6055-16.105 4.2383-4.2891 9.9961-6.7305 16.023-6.8008h0.074219c6.0312 0.070313 11.789 2.5156 16.023 6.8047 4.2383 4.2852 6.6172 10.074 6.6172 16.102-0.0625 4.5469-1.5352 8.9609-4.2188 12.629-3.3203 4.7266-5.9023 9.9297-7.668 15.43-0.015626 0.050782-0.039063 0.10547-0.050782 0.15625h5.5c0.011719-0.054687 0.03125-0.10547 0.050782-0.15625 1.5898-4.4297 3.7617-8.6289 6.4609-12.48 3.4531-5.0312 5.1367-10.129 5.1367-15.578 0-7.4141-2.9258-14.527-8.1406-19.793-5.2188-5.2656-12.305-8.2578-19.719-8.3242z"/>
                  </g>
                </svg>
              </div>
              <div class="bugbattle--feedback-option-text">Suggest an improvement</div>
            </div>
            <div class="bugbattle--feedback-option" id="bugbattle--feedback-option-question">
              <div class="bugbattle--feedback-option-icon">
                <svg fill="${this.mainColor}" width="100pt" height="100pt" version="1.1" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <path d="m50 1.4688c-12.871 0-25.215 5.1133-34.316 14.215-9.1016 9.1016-14.215 21.445-14.215 34.316s5.1133 25.215 14.215 34.316c9.1016 9.1016 21.445 14.215 34.316 14.215s25.215-5.1133 34.316-14.215c9.1016-9.1016 14.215-21.445 14.215-34.316s-5.1133-25.215-14.215-34.316c-9.1016-9.1016-21.445-14.215-34.316-14.215zm0 81.5c-2.3789 0-4.5234-1.4297-5.4336-3.6289-0.91016-2.1992-0.40625-4.7305 1.2734-6.4102 1.6836-1.6836 4.2148-2.1875 6.4102-1.2773 2.1992 0.91016 3.6328 3.0586 3.6328 5.4375 0 1.5586-0.62109 3.0547-1.7227 4.1562-1.1055 1.1055-2.6016 1.7227-4.1602 1.7227zm8.8242-25.469c-1.8477 0.90234-2.9961 2.8008-2.9414 4.8516v3.0469c0 0.38672-0.15625 0.76172-0.42969 1.0391-0.27734 0.27344-0.65234 0.42969-1.043 0.42969h-8.8203c-0.8125 0-1.4727-0.65625-1.4727-1.4688v-3.0469c-0.03125-3.2578 0.875-6.4531 2.6094-9.2109 1.7344-2.7578 4.2227-4.9609 7.1719-6.3477 3.4922-1.5781 5.6758-5.125 5.5117-8.9531-0.26172-4.8789-4.1641-8.7734-9.043-9.0312-2.5625-0.10547-5.0586 0.84375-6.9023 2.625-1.8477 1.7773-2.8867 4.2383-2.875 6.8008 0 0.39062-0.15625 0.76562-0.43359 1.0391-0.27344 0.27734-0.64844 0.43359-1.0391 0.43359h-8.8242c-0.8125 0-1.4688-0.66016-1.4688-1.4727-0.003907-5.7578 2.3359-11.27 6.4844-15.266 4.1484-3.9961 9.7461-6.1289 15.5-5.9102 6.3984 0.24609 12.34 3.3711 16.172 8.5 3.8281 5.1289 5.1328 11.715 3.5508 17.918-1.5859 6.2031-5.8867 11.355-11.707 14.023z"/>
                </svg>
              </div>
              <div class="bugbattle--feedback-option-text">Ask a question</div>
            </div>
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

    const bugReportButton = document.querySelector(
      "#bugbattle--feedback-option-bug"
    );
    const feedbackButton = document.querySelector(
      "#bugbattle--feedback-option-feedback"
    );
    const questionButton = document.querySelector(
      "#bugbattle--feedback-option-question"
    );
    const cancelButton = document.querySelector(
      ".bugbattle--feedback-dialog-header-button-cancel"
    );

    // Cancel option
    cancelButton.onclick = function () {
      self.hide();
    };

    // Bug report option
    bugReportButton.onclick = function () {
      self.removeDialogAndShowBugReportEditorWithType("BUG");
    };

    // Feedback option
    feedbackButton.onclick = function () {
      self.removeDialogAndShowBugReportEditorWithType("FEEDBACK");
    };

    // Question option
    if (self.questionCallback) {
      questionButton.onclick = function () {
        self.questionCallback();
      };
    } else {
      questionButton.remove();
    }
  }

  removeDialogAndShowBugReportEditorWithType(type) {
    document.querySelector(".bugbattle--feedback-dialog-container").remove();
    this.type = type;
    this.showBugReportEditor();
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

      self.startCrashFlow();

      return false;
    };
  }

  startCrashFlow() {
    if (this.crashDetectorEnabled && !this.bugReportingRunning) {
      this.bugReportingRunning = true;
      this.crashDetected = true;
      BugBattle.startBugReporting();
    }
  }

  addLog(args, type) {
    if (!args) {
      return;
    }

    var log = "";
    for (var i = 0; i < args.length; i++) {
      log += args[i] + " ";
    }
    this.logArray.push({
      log: log,
      date: new Date(),
      type: type,
    });
  }

  overwriteConsoleLog() {
    const self = this;
    window.console = (function (origConsole) {
      if (!window.console || !origConsole) {
        origConsole = {};
      }

      return {
        log: function () {
          self.addLog(arguments, "log");
          origConsole.log && origConsole.log.apply(origConsole, arguments);
        },
        warn: function () {
          self.addLog(arguments, "warns");
          origConsole.warn && origConsole.warn.apply(origConsole, arguments);
        },
        error: function () {
          self.addLog(arguments, "error");
          origConsole.error && origConsole.error.apply(origConsole, arguments);
          self.startCrashFlow();
        },
        info: function (v) {
          self.addLog(arguments, "info");
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

  askForCrashReport() {
    const self = this;

    var elem = document.createElement("div");
    elem.className = "bugbattle--feedback-dialog-container";
    elem.setAttribute("data-html2canvas-ignore", "true");
    elem.innerHTML = `<div class='bugbattle--feedback-dialog'>
      <div class="bugbattle--feedback-dialog-header">
        <div></div>
        <div class="bugbattle--feedback-dialog-header-title">Crash detected</div>
        <div class="bugbattle--feedback-dialog-header-button bugbattle--feedback-dialog-header-button-cancel">
          <svg fill="#CCCCCC" width="100pt" height="100pt" version="1.1" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <path d="m100 9.4414-9.4414-9.4414-40.344 40.344-40.773-40.344-9.4414 9.4414 40.344 40.773-40.344 40.344 9.4414 9.4414 40.773-40.344 40.344 40.344 9.4414-9.4414-40.344-40.344z" fill-rule="evenodd"/>
          </svg>
        </div>
      </div>
      <div class="bugbattle--feedback-dialog-body">
        <div class="bugbattle--feedback-inputgroup bugbattle--feedback-inputgroup-text">
          A critical error has been detected. Do you want to submit an error report?
        </div>
        <div class="bugbattle--feedback-inputgroup">
          <div class="bugbattle--feedback-send-button">Submit error report</div>
        </div>
      </div>
    </div>`;
    document.body.appendChild(elem);

    const sendButton = document.querySelector(
      ".bugbattle--feedback-send-button"
    );
    const cancelButton = document.querySelector(
      ".bugbattle--feedback-dialog-header-button-cancel"
    );

    cancelButton.onclick = function () {
      self.hide();
    };

    sendButton.onclick = function () {
      document.querySelector(".bugbattle--feedback-dialog-container").remove();

      self.createBugReportingDialog();
    };
  }

  createBugReportingDialog() {
    const self = this;

    var elem = document.createElement("div");
    elem.className = "bugbattle--feedback-dialog-container";
    elem.setAttribute("data-html2canvas-ignore", "true");
    elem.innerHTML = `<div class='bugbattle--feedback-dialog'>
      <div class="bugbattle--feedback-dialog-header">
        <div></div>
        <div class="bugbattle--feedback-dialog-header-title">Report your feedback</div>
        <div class="bugbattle--feedback-dialog-header-button bugbattle--feedback-dialog-header-button-cancel">
          <svg fill="#CCCCCC" width="100pt" height="100pt" version="1.1" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <path d="m100 9.4414-9.4414-9.4414-40.344 40.344-40.773-40.344-9.4414 9.4414 40.344 40.773-40.344 40.344 9.4414 9.4414 40.773-40.344 40.344 40.344 9.4414-9.4414-40.344-40.344z" fill-rule="evenodd"/>
          </svg>
        </div>
      </div>
      <div class="bugbattle--feedback-dialog-loading">
        <div class="bugbattle-spinner">
          <div class="bugbattle-double-bounce1"></div>
          <div class="bugbattle-double-bounce2"></div>
        </div>
      </div>
      <div class="bugbattle--feedback-dialog-success">
        <svg width="120px" height="92px" viewBox="0 0 120 92" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
            <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                <g id="np_check_1807541" fill="${this.mainColor}" fill-rule="nonzero">
                    <path d="M107.553103,1.03448276 L101.669379,6.85344828 C81.2141379,27.3490345 62.5845517,47.5706897 42.7038621,67.7596552 L17.5535172,47.6517931 L11.088,42.4793793 L0.743172414,55.4104138 L38.2431724,85.4104138 L44.0621379,90.0010345 L49.2991034,84.764069 C71.5404828,62.4751034 91.5349655,40.4985517 113.437034,18.5571724 L119.256,12.6734483 L107.553103,1.03448276 Z" id="Path"></path>
                </g>
            </g>
        </svg>
        <div class="bugbattle--feedback-dialog-info-text">Thank you for your feedback!</div>
      </div>
      <div class="bugbattle--feedback-dialog-body">
        <div class="bugbattle--feedback-inputgroup">
          <div class="bugbattle--feedback-inputgroup-label">Email</div>
          <input class="bugbattle--feedback-email" type="text" placeholder="Email" />
        </div>
        <div class="bugbattle--feedback-inputgroup">
          <div class="bugbattle--feedback-inputgroup-label">What went wrong?</div>
          <textarea class="bugbattle--feedback-description" placeholder="Describe your issue"></textarea>
        </div>
        <div class="bugbattle--feedback-inputgroup bugbattle--feedback-inputgroup--privacy-policy">
          <input type="checkbox" required name="terms"> <span class="bugbattle--feedback-inputgroup--privacy-policy-label">I read and accept the <a id="bugbattle-privacy-policy-link" href="#" target="_blank">privacy policy</a>.</span>
        </div>
        <div class="bugbattle--feedback-inputgroup">
          <div class="bugbattle--feedback-send-button">Send feedback</div>
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

    // poweredByHidden

    const privacyPolicyContainer = document.querySelector(
      ".bugbattle--feedback-inputgroup--privacy-policy"
    );
    const privacyPolicyInputLabel = document.querySelector(
      ".bugbattle--feedback-inputgroup--privacy-policy-label"
    );
    const privacyPolicyInput = document.querySelector(
      ".bugbattle--feedback-inputgroup--privacy-policy input"
    );
    if (this.privacyPolicyCheckEnabled) {
      privacyPolicyContainer.style.display = "block";
      document.querySelector(
        "#bugbattle-privacy-policy-link"
      ).href = this.privacyPolicyUrl;
    } else {
      privacyPolicyContainer.style.display = "none";
    }

    privacyPolicyInputLabel.onclick = function () {
      privacyPolicyInput.checked = !privacyPolicyInput.checked;
    };

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

    const sendButton = document.querySelector(
      ".bugbattle--feedback-send-button"
    );
    const cancelButton = document.querySelector(
      ".bugbattle--feedback-dialog-header-button-cancel"
    );

    const emailField = document.querySelector(".bugbattle--feedback-email");
    const textArea = document.querySelector(".bugbattle--feedback-description");

    textArea.oninput = function () {
      textArea.style.height = "inherit";
      textArea.style.height = textArea.scrollHeight + "px";
    };

    cancelButton.onclick = function () {
      self.hide();
    };

    emailField.value = this.email;

    sendButton.onclick = function () {
      self.email = emailField.value;

      if (!self.email || self.email.length === 0) {
        alert("Please provide an email address.");
        return;
      }

      if (self.privacyPolicyCheckEnabled && !privacyPolicyInput.checked) {
        alert("Please read and accept the privacy policy.");
        return;
      }

      self.description = textArea.value;

      localStorage.setItem("bugbattle-sender-email", self.email);

      self.toggleLoading(true);

      if (!self.sdkKey) {
        console.log("BUGBATTLE: Please provide a valid API key!");
      }

      html2canvas(document.body, {
        x: window.scrollX,
        y: window.scrollY,
        width: window.innerWidth,
        height: window.innerHeight,
        letterRendering: 1,
        allowTaint: true,
        useCORS: false,
        logging: false,
        imageTimeout: 15000,
        proxy: "https://jsproxy.bugbattle.io/",
      }).then(function (canvas) {
        if (canvas) {
          self.screenshot = canvas.toDataURL();
          self.prepareScreenshot();
        }
      });
    };
  }

  hide() {
    const editorContainer = document.querySelector(
      ".bugbattle-screenshot-editor-container"
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

    this.bugReportingRunning = false;
    this.crashDetected = false;
    this.enableScroll();
  }

  init() {
    this.overwriteConsoleLog();
    this.startCrashDetection();

    const self = this;
    if (
      document.readyState === "complete" ||
      document.readyState === "loaded" ||
      document.readyState === "interactive"
    ) {
      self.checkForInitType();
    } else {
      document.addEventListener("DOMContentLoaded", function (event) {
        self.checkForInitType();
      });
    }
  }

  checkForInitType() {
    if (this.activation === BugBattle.FEEDBACK_BUTTON) {
      this.injectFeedbackButton();
    }
  }

  injectFeedbackButton() {
    var elem = document.createElement("div");
    elem.className = "bugbattle--feedback-button";
    elem.innerHTML =
      '<div class="bugbattle--feedback-button-inner"><span class="bugbattle--feedback-button-inner-text">Feedback</span></div>';
    elem.onclick = function () {
      BugBattle.startBugReporting();
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
      loader.style.display = "block";
      header.style.display = "none";
    } else {
      body.style.display = "block";
      loader.style.display = "none";
      header.style.display = "block";
    }
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

  dataURItoBlob(dataURI) {
    var byteString = atob(dataURI.split(",")[1]);
    var mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];
    var ab = new ArrayBuffer(byteString.length);
    var ia = new Uint8Array(ab);
    for (var i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    var blob = new Blob([ab], { type: mimeString });
    return blob;
  }

  prepareScreenshot() {
    const self = this;
    const imageObj = new Image();
    imageObj.onload = function () {
      const pixelRatio = window.devicePixelRatio;
      const canvas = document.createElement("canvas");

      canvas.width = this.width;
      canvas.height = this.height;
      const context = canvas.getContext("2d");

      // Draw image
      context.drawImage(imageObj, 0, 0, this.width, this.height);

      // Draw markers
      const editorDot = document.querySelector(
        ".bugbattle-screenshot-editor-dot"
      );
      const editorRectangle = document.querySelector(
        ".bugbattle-screenshot-editor-rectangle"
      );

      if (editorDot && editorRectangle) {
        context.beginPath();
        context.arc(
          (editorDot.offsetLeft + editorDot.offsetWidth / 2) * pixelRatio,
          (editorDot.offsetTop + editorDot.offsetHeight / 2) * pixelRatio,
          6 * pixelRatio,
          0,
          2 * Math.PI,
          false
        );
        context.fillStyle = self.mainColor;
        context.fill();
        context.closePath();

        context.lineWidth = 3 * pixelRatio;
        context.strokeStyle = self.mainColor;
        context.stroke();
        context.strokeRect(
          editorRectangle.offsetLeft * pixelRatio,
          editorRectangle.offsetTop * pixelRatio,
          editorRectangle.offsetWidth * pixelRatio,
          editorRectangle.offsetHeight * pixelRatio
        );
      }

      // Upload screenshot
      self.uploadScreenshot(canvas.toDataURL("image/jpeg", 0.5));
      self.screenshot = null;
    };
    imageObj.onerror = function () {
      self.hide();
    };
    imageObj.src = this.screenshot;
  }

  uploadScreenshot(screenshot) {
    const self = this;
    const http = new XMLHttpRequest();
    http.open("POST", this.apiUrl + "/uploads/sdk");
    http.setRequestHeader("Api-Token", this.sdkKey);
    http.onreadystatechange = function (e) {
      if (http.readyState === XMLHttpRequest.DONE) {
        try {
          const response = JSON.parse(http.responseText);
          if (response && response.fileUrl) {
            self.screenshotURL = response.fileUrl;
            self.sendBugReportToServer();
          } else {
            self.showError();
          }
        } catch (e) {
          self.showError();
        }
      }
    };

    const canvas = document.querySelector(
      ".bugbattle-screenshot-editor-canvas"
    );
    const file = this.dataURItoBlob(screenshot);
    const formData = new FormData();
    formData.append("file", file, "screenshot.jpg");
    http.send(formData);
  }

  sendBugReportToServer() {
    const self = this;
    const http = new XMLHttpRequest();
    http.open("POST", this.apiUrl + "/bugs");
    http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    http.setRequestHeader("Api-Token", this.sdkKey);
    http.onreadystatechange = function (e) {
      if (
        http.readyState === XMLHttpRequest.DONE &&
        (http.status === 200 || http.status === 201)
      ) {
        self.showSuccessMessage();
        setTimeout(function () {
          self.hide();
        }, 1500);
      }
    };

    const bugReportData = {
      reportedBy: this.email,
      description: this.description,
      priority: this.severity,
      screenshotUrl: this.screenshotURL,
      customData: this.customData,
      metaData: this.getMetaData(),
      consoleLog: this.logArray,
      type: this.crashDetected ? "CRASHREPORT" : "BUG",
    };
    http.send(JSON.stringify(bugReportData));
  }

  showError() {
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
    };
  }

  showBugReportEditor() {
    const self = this;
    var bugReportingEditor = document.createElement("div");
    bugReportingEditor.className = "bugbattle-screenshot-editor-container";
    bugReportingEditor.setAttribute("data-html2canvas-ignore", "true");
    bugReportingEditor.innerHTML = `
      <div class='bugbattle-screenshot-editor-container-inner'>
        <div class='bugbattle-screenshot-editor-borderlayer'></div>
        <div class='bugbattle-screenshot-editor-dot'></div>
        <div class='bugbattle-screenshot-editor-rectangle'></div>
        <div class='bugbattle-screenshot-editor-drag-info'>Click or drag to create a comment</div>
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

      addedMarker = true;

      self.createBugReportingDialog();
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
