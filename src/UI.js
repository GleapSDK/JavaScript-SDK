import BugBattle from "./BugBattle";
import { translateText } from "./Translation";

export const setColor = (color) => {
  const darkerShade = shadeColor(color, -20);
  const colorStyleSheet = `
    .bugbattle-feedback-button-icon {
        background-color: ${color};
    }
    .bugbattle-feedback-button-icon:hover {
        background-color: ${darkerShade};
    }
    .bugbattle-feedback-dialog-header-button {
        color: ${color};
    }
    .bugbattle-screenshot-editor-borderlayer {
        border-color: ${color};
    }
    .bugbattle-screenshot-editor-dot {
      background-color: ${color};
    }
    .bugbattle-feedback-dialog-header {
      background: linear-gradient(135deg, ${color} 0%,  ${darkerShade} 100%);
    }
    .bugbattle-screenshot-editor-rectangle {
      border-color: ${color};
    }
    .bugbattle-feedback-send-button {
      background-color: ${color};
    }
    .bugbattle-screenshot-editor-drag-info {
      background-color: ${color};
    }
    .bugbattle-double-bounce1,
    .bugbattle-double-bounce2 {
      background-color: ${color};
    }
    .bugbattle-feedback-dialog-header-button-cancel {
      background-color: ${color};
    }
    .bugbattle-feedback-type-icon {
      background-color: ${color};
    }
    .bugbattle-feedback-type:hover {
      border: 1px solid ${color};
    }
    .bugbattle-feedback-type:first-of-type, .bugbattle-feedback-type:first-of-type:hover, .bugbattle-feedback-dialog-infoitem {
      border-top: 2px solid ${color}77;
    }
    .bugbattle-feedback-dialog-infoitem {
      background-color: ${color}09;
    }
    .bugbattle-feedback-type:hover .bugbattle-feedback-type-title {
      color: ${color};
    }
    .bugbattle-feedback-inputgroup--privacy-policy
    [type="checkbox"]:not(:checked)
    + label:after,
    .bugbattle-feedback-inputgroup--privacy-policy
    [type="checkbox"]:checked
    + label:after {
    color: ${color};
    }
    `;

  const node = document.createElement("style");
  node.innerHTML = colorStyleSheet;
  document.body.appendChild(node);
};

export const getHeaderImage = function (customLogoUrl) {
  var headerImage = loadIcon("bblogo", "#fff");
  if (customLogoUrl) {
    headerImage = `<img src="${customLogoUrl}" alt="bugbattle-logo" />`;
  }
  return headerImage;
};

export const createWidgetDialog = function (
  title,
  description,
  customLogoUrl,
  content,
  back,
  showBack = true,
  appendClass = ""
) {
  var elem = document.createElement("div");
  elem.className = "bugbattle-feedback-dialog-container";
  elem.innerHTML = `<div class="bugbattle-feedback-dialog-backdrop"></div><div class='bugbattle-feedback-dialog bugbattle-anim-fadein ${appendClass}'>
      <div class="bugbattle-feedback-dialog-header${
        back ? " bugbattle-feedback-dialog-header--back" : ""
      }${!showBack ? " bugbattle-feedback-dialog-header--backhidden" : ""}">
        ${
          back
            ? `<div class="bugbattle-feedback-dialog-header-back">
        ${loadIcon("arrowleft", "#fff")}
        </div>`
            : `<div class="bugbattle-feedback-dialog-header-logo">
          ${getHeaderImage(customLogoUrl)}
        </div>`
        }
        <div class="bugbattle-feedback-dialog-header-text">
          <div class="bugbattle-feedback-dialog-header-title">
            ${title}
          </div>
          ${
            description === null
              ? ""
              : `<div class="bugbattle-feedback-dialog-header-description">
          ${description}
        </div>`
          }
        </div>
        <div class="bugbattle-feedback-dialog-header-close">
          <svg fill="#FFFFFF" width="100pt" height="100pt" version="1.1" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <path d="m72.812 33.02l-5.832-5.832-16.98 16.875-16.98-16.875-5.832 5.832 16.875 16.98-16.875 16.98 5.832 5.832 16.98-16.875 16.98 16.875 5.832-5.832-16.875-16.98z"/>
          </svg>
        </div>
      </div>
      <div class="bugbattle-feedback-dialog-body">
        ${content}
        <div class="bugbattle-feedback-poweredbycontainer">
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

  const closeButton = document.querySelector(
    ".bugbattle-feedback-dialog-header-close"
  );
  closeButton.onclick = function () {
    BugBattle.getInstance().closeBugBattle();
  };

  // Hook back action
  if (back) {
    const backButton = document.querySelector(
      ".bugbattle-feedback-dialog-header-back"
    );
    backButton.onclick = function () {
      back();
    };
  }

  return elem;
};

/**
 * Creates the feedback type dialog
 */
export const createFeedbackTypeDialog = function (
  feedbackTypeActions,
  overrideLanguage,
  customLogoUrl,
  poweredByHidden,
  selectedMenuOption,
  title,
  subtitle
) {
  // Generate options
  var optionsHTML = `<div class="bugbattle-feedback-types">`;

  for (var i = 0; i < feedbackTypeActions.length; i++) {
    var action = feedbackTypeActions[i];
    optionsHTML += `<div id="bugbattle-feedback-type-${i}" class="bugbattle-feedback-type">
        <div class="bugbattle-feedback-type-icon">
          <img src="${action.icon}">
        </div>
        <div class="bugbattle-feedback-type-text">
          <div class="bugbattle-feedback-type-title">${translateText(
            action.title,
            overrideLanguage
          )}</div>
          <div class="bugbattle-feedback-type-description">${translateText(
            action.description,
            overrideLanguage
          )}</div>
        </div>
      </div>`;
  }

  optionsHTML += "</div>";

  const dialog = createWidgetDialog(
    title,
    subtitle,
    customLogoUrl,
    optionsHTML
  );

  // Hook actions
  for (var i = 0; i < feedbackTypeActions.length; i++) {
    const index = i;
    document.getElementById(`bugbattle-feedback-type-${index}`).onclick =
      function () {
        dialog.remove();
        if (feedbackTypeActions[index].action) {
          // Cleanup widget.
          BugBattle.getInstance().reportCleanup();

          // Call custom action.
          feedbackTypeActions[index].action();
        }
        if (feedbackTypeActions[index].actionFlow) {
          BugBattle.startBugReporting(feedbackTypeActions[index].actionFlow);
        }
        if (selectedMenuOption) {
          selectedMenuOption();
        }
      };
  }

  validatePoweredBy(poweredByHidden);
};

export const validatePoweredBy = function (poweredByHidden) {
  const poweredByContainer = document.querySelector(
    ".bugbattle-feedback-poweredbycontainer"
  );
  if (poweredByHidden) {
    poweredByContainer.style.display = "none";
  } else {
    poweredByContainer.onclick = function () {
      window.open("https://www.bugbattle.io/", "_blank");
    };
  }
};

export const setLoadingIndicatorProgress = function (percentComplete) {
  const circle = window.document.querySelector(
    ".bugbattle--progress-ring__circle"
  );
  const circumference = 213.628300444;
  const offset = circumference - (percentComplete / 100) * circumference;
  if (circle) {
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = offset;
  }
};

export const loadIcon = function (name, color) {
  if (name === "bblogo") {
    return `<svg class="bugbattle-logo-logo" width="32px" height="32px" viewBox="0 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <title>Shape</title>
        <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
            <g id="Artboard" transform="translate(-1597.000000, -901.000000)" fill="${color}">
                <g id="Group" transform="translate(1414.000000, 889.000000)">
                    <g id="Group-3" transform="translate(173.000000, 5.000000)">
                        <path d="M24.154396,7 C24.4219361,7 24.6780524,7.10959637 24.8642549,7.30376026 C25.1173585,7.52012059 25.2437873,7.85201732 25.1995869,8.18406327 L25.1995869,8.18406327 L25.1995869,11.463192 C25.1995869,11.6788662 25.1647472,11.9033435 25.4652396,11.9033435 L25.4652396,11.9033435 L32.5594731,11.9033435 C32.7869392,11.9151254 33.006854,11.9897214 33.1952976,12.1190177 C33.3618307,12.2733657 33.4952342,12.4606289 33.5872442,12.6692071 C34.6585649,14.5618586 35.7690802,16.4677146 36.836046,18.3911767 C37.0363742,18.7565025 37.1887979,18.7961161 37.5415498,18.5760403 C38.4343171,18.0214494 39.3575691,17.5108737 40.2721112,16.9870934 C40.9166456,16.6217677 41.5350502,16.7450101 41.8442525,17.2819949 C42.0039198,17.5509838 42.0429229,17.875891 41.9515323,18.1756656 C41.8601417,18.4754402 41.6469743,18.7218173 41.3652067,18.8533358 C40.4245348,19.4035252 39.488218,19.9537146 38.5431912,20.4818964 C38.2688285,20.6315479 38.1947942,20.7371842 38.3733476,21.0452903 C39.0919164,22.2557069 39.7669355,23.4969342 40.4811493,24.7117523 C40.7760048,25.1564806 40.7760048,25.7371301 40.4811493,26.1818584 C38.1294697,30.2400553 35.7821451,34.2982522 33.4391754,38.3564491 C33.3306775,38.6074882 33.124141,38.8018912 32.8686754,38.8934339 C32.6697299,38.9795163 32.4527428,39.0143029 32.2372059,38.9946687 L32.2372059,38.9946687 L18.2272924,38.9418506 C18.0957357,38.9344016 17.9648051,38.9182279 17.8353458,38.8934339 C17.5607735,38.824309 17.3318583,38.6333947 17.2125862,38.3740551 L17.2125862,38.3740551 L10.1793223,25.9969947 C9.94022591,25.6185374 9.94022591,25.1342248 10.1793223,24.7557675 L10.1793223,24.7557675 L17.2474259,12.4579344 C17.3430094,12.3175252 17.4624369,12.1953308 17.6001779,12.0970102 C17.7640874,11.9739349 17.9555969,11.8937903 18.157613,11.8637299 L18.157613,11.8637299 L23.0438806,11.8857374 C23.1483997,10.6533132 23.0700104,9.41648749 23.1092051,8.18406327 C23.0713942,7.85280649 23.1966969,7.52386577 23.4445372,7.30376026 C23.6307396,7.10959637 23.8868559,7 24.154396,7 Z M19.660075,16.1067904 C19.433617,15.9747449 19.3465177,15.9747449 19.202804,16.2212298 C19.0590902,16.4677146 18.8631169,16.881457 18.6845635,17.1983661 L18.6845635,17.1983661 L16.1673953,21.5998812 C16.1653557,21.6130053 16.1653557,21.6263707 16.1673953,21.6394948 L16.1673953,21.6394948 L14.2207272,24.9802448 C14.0969544,25.2021303 14.1105123,25.4761867 14.2555669,25.6844872 C15.9801319,28.7362043 17.7134069,31.7864542 19.4553918,34.835237 C19.5772278,35.0928895 19.839407,35.252225 20.121701,35.2401764 C23.579541,35.2548481 27.0344777,35.2724542 30.4865111,35.2929946 C30.8210253,35.3260462 31.142348,35.1523791 31.300889,34.8528431 C31.9236486,33.7172522 32.5856029,32.5904643 33.2301373,31.4592749 L33.2301373,31.4592749 L35.6384314,27.238222 C35.8256947,26.9301159 35.9998932,26.6264114 36.1828016,26.3095023 L36.1828016,26.3095023 C36.3613551,25.9925932 36.3047406,25.9177675 36.0086031,25.6888887 C32.7917377,23.8079746 29.576324,21.9255933 26.3623619,20.0417449 C24.1282662,18.7476994 21.8898157,17.4272449 19.660075,16.1067904 Z" id="Shape"></path>
                    </g>
                </g>
            </g>
        </g>
    </svg>`;
  }

  if (name === "arrowdown") {
    return `<svg class="bugbattle-logo-arrowdown" fill="${color}" width="100pt" height="100pt" version="1.1" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="m50 77.637c-1.3477 0-2.6953-0.51562-3.7266-1.543l-44.73-44.73c-2.0586-2.0586-2.0586-5.3945 0-7.4531 2.0586-2.0586 5.3945-2.0586 7.4531 0l41.004 41 41.004-41c2.0586-2.0586 5.3945-2.0586 7.4531 0 2.0586 2.0586 2.0586 5.3945 0 7.4531l-44.73 44.727c-1.0312 1.0312-2.3789 1.5469-3.7266 1.5469z"/>
   </svg>`;
  }

  if (name === "arrowleft") {
    return `<svg fill="${color}" width="100pt" height="100pt" version="1.1" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="m70.988 1.6211c2.1875-2.168 5.7344-2.168 7.9297 0 2.1836 2.168 2.1836 5.7227 0 7.8906l-46.016 40.445 46.016 40.5c2.1836 2.168 2.1836 5.668 0 7.8906-2.1953 2.168-5.7383 2.168-7.9297 0l-50.039-44.109c-1.168-1.168-1.668-2.7227-1.5898-4.2773-0.078125-1.5 0.42188-3.0547 1.5898-4.2227l50.039-44.109z" fill-rule="evenodd"/>
   </svg>`;
  }

  return "";
};

export const toggleLoading = function (loading) {
  const form = document.querySelector(".bugbattle-feedback-form");
  const infoItem = document.querySelector(
    ".bugbattle-feedback-dialog-infoitem"
  );
  const loader = document.querySelector(".bugbattle-feedback-dialog-loading");
  if (loading) {
    if (infoItem) {
      infoItem.style.display = "none";
    }
    form.style.display = "none";
    loader.style.display = "flex";
  } else {
    if (infoItem) {
      infoItem.style.display = "block";
    }
    form.style.display = "block";
    loader.style.display = "none";
  }
};

function shadeColor(color, percent) {
  var R = parseInt(color.substring(1, 3), 16);
  var G = parseInt(color.substring(3, 5), 16);
  var B = parseInt(color.substring(5, 7), 16);
  R = parseInt((R * (100 + percent)) / 100);
  G = parseInt((G * (100 + percent)) / 100);
  B = parseInt((B * (100 + percent)) / 100);
  R = R < 255 ? R : 255;
  G = G < 255 ? G : 255;
  B = B < 255 ? B : 255;
  var RR = R.toString(16).length == 1 ? "0" + R.toString(16) : R.toString(16);
  var GG = G.toString(16).length == 1 ? "0" + G.toString(16) : G.toString(16);
  var BB = B.toString(16).length == 1 ? "0" + B.toString(16) : B.toString(16);
  return "#" + RR + GG + BB;
}
