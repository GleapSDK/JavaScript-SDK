import Gleap from "./Gleap";
import { translateText } from "./Translation";

const calculateContrast = (hex) => {
  var r = parseInt(hex.substr(1, 2), 16),
    g = parseInt(hex.substr(3, 2), 16),
    b = parseInt(hex.substr(5, 2), 16),
    yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "black" : "white";
};

export const injectColorCSS = (primaryColor, headerColor, buttonColor) => {
  const contrastColor = calculateContrast(primaryColor);
  const contrastHeaderColor = calculateContrast(headerColor);
  const contrastButtonColor = calculateContrast(buttonColor);
  const colorStyleSheet = `
    .bb-screenshot-editor-drag-info {
      color: ${contrastColor};
    }
    .bb-logo-arrowdown {
      fill: ${contrastButtonColor};
    }
    .bb-feedback-dialog-header-back svg {
      fill: ${contrastHeaderColor};
    }
    .bb-feedback-dialog-header-close svg {
      fill: ${contrastHeaderColor};
    }
    .bb-feedback-dialog-header-back:hover svg {
      fill: ${contrastColor};
    }
    .bb-feedback-dialog-header-title,
    .bb-feedback-dialog-header-title span {
      color: ${contrastHeaderColor};
    }
    .bb-feedback-dialog-header-title-small {
      color: ${contrastHeaderColor};
    }
    .bb-feedback-dialog-header-description {
      color: ${contrastHeaderColor};
    }
    .bb-feedback-onetofive-button-active,
    .bb-feedback-onetofive-button:hover {
      background-color: ${primaryColor};
      color: ${contrastColor};
    }    
    .bb-feedback-button-icon {
        background-color: ${buttonColor};
    }
    .bb-feedback-multiplechoice-container:hover
      input
      ~ .bb-feedback-multiplechoice-checkmark {
      border: 2px solid ${primaryColor};
    }    
    .bb-feedback-multiplechoice-container input:checked ~ .bb-feedback-multiplechoice-checkmark {
      background-color: ${primaryColor};
      border: 2px solid ${primaryColor};
    }
    .bb-feedback-dialog-header-button {
        color: ${primaryColor};
    }
    .bb-drawing-tool-item--active {
      background-color: ${primaryColor};
    }
    .bb-screenshot-editor-borderlayer {
        border-color: ${primaryColor};
    }
    .bb-feedback-button-classic {
      background-color: ${buttonColor};
      color: ${contrastButtonColor};
    }
    .bb-screenshot-editor-dot {
      background-color: ${primaryColor};
    }
    .bb-feedback-dialog-header {
      background-color: ${headerColor};
    }
    .bb-form-progress-inner {
      background-color: ${headerColor}66;
    }
    .bb-screenshot-editor-rectangle {
      border-color: ${primaryColor};
    }
    .bb-feedback-inputgroup textarea:focus {
      border-color: ${primaryColor};
    }
    .bb-feedback-inputgroup > input:focus, .bb-feedback-inputgroup input:focus {
      border-color: ${primaryColor};
    }
    .bb-feedback-send-button {
      color: ${contrastColor};
      background-color: ${primaryColor};
    }
    .bb-screenshot-editor-drag-info {
      background-color: ${primaryColor};
    }
    .bb-double-bounce1,
    .bb-double-bounce2 {
      background-color: ${primaryColor};
    }
    .bb-feedback-dialog-header-button-cancel {
      background-color: ${primaryColor};
    }
    .bb-feedback-type-icon {
      background-color: ${primaryColor};
    }
    .bb-feedback-inputgroup--privacy-policy
    [type="checkbox"]:not(:checked)
    + label:after,
    .bb-feedback-inputgroup--privacy-policy
    [type="checkbox"]:checked
    + label:after {
    color: ${primaryColor};
    }
    `;

  const node = document.createElement("style");
  node.innerHTML = colorStyleSheet;
  Gleap.appendNode(node);
};

export const getHeaderImage = function (customLogoUrl) {
  var headerImage = loadIcon("bblogo", "#192027");
  if (customLogoUrl) {
    headerImage = `<img src="${customLogoUrl}" alt="bb-logo" />`;
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
  elem.className = "bb-feedback-dialog-container";
  elem.innerHTML = `<div class="bb-feedback-dialog-backdrop"></div><div class='bb-feedback-dialog ${appendClass}'>
      <div class="bb-feedback-dialog-header${
        back ? " bb-feedback-dialog-header--back" : ""
      }${!showBack ? " bb-feedback-dialog-header--backhidden" : ""}">
        ${
          back
            ? `<div class="bb-feedback-dialog-header-back">
        ${loadIcon("arrowleft", "#192027")}
        </div>`
            : `<div class="bb-feedback-dialog-header-logo">
          ${getHeaderImage(customLogoUrl)}
        </div>`
        }
        <div class="bb-feedback-dialog-header-text">
          <div class="bb-feedback-dialog-header-title">
            ${title}
          </div>
          ${
            description === null
              ? ""
              : `<div class="bb-feedback-dialog-header-description">
          ${description}
        </div>`
          }
        </div>
        <div class="bb-feedback-dialog-header-close">
          ${loadIcon("close", "#192027")}
        </div>
      </div>
      <div class="bb-feedback-dialog-body">
        ${content}
        <div class="bb-feedback-poweredbycontainer">
          <span>Powered by</span>
          <svg width="56px" height="14px" viewBox="0 0 56 14" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
            <title>Full</title>
            <defs>
                <path d="M7.62134731,11.7168439 C10.7925573,10.8074439 12.6261573,7.49958394 11.7168573,4.32840394 C10.8074573,1.15721394 7.49958731,-0.676385062 4.32839731,0.232937938 C1.15721731,1.14226394 -0.676384685,4.45016394 0.232937315,7.62134394 C1.87940731,13.3632439 8.09176731,13.3573439 8.09176731,13.3573439 L7.62134731,11.7168439 Z" id="path-1"></path>
                <path d="M1.8672919,6.96713413 C0.0816638964,5.93623413 -0.530136104,3.65291413 0.500794896,1.86729413 C1.5317219,0.0816641267 3.8150019,-0.530135873 5.6006219,0.500794127 C7.3862519,1.53172413 7.9980519,3.81500413 6.9671219,5.60063413 C5.1004519,8.83383413 1.3339519,7.89083413 1.3339519,7.89083413 L1.8672919,6.96713413 Z" id="path-3"></path>
            </defs>
            <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                <g id="Full" transform="translate(0.139727, 0.213318)">
                    <g id="Group" transform="translate(0.000000, 0.031538)">
                        <path d="M1.86729331,11.1814439 C0.081664305,10.1505439 -0.530136695,7.86725394 0.500795305,6.08163394 C1.53172331,4.29600394 3.81499331,3.68420394 5.60062331,4.71513394 C7.38625331,5.74607394 7.99805331,8.02934394 6.96711331,9.81494394 C5.10045331,13.0481439 1.33395331,12.1052439 1.33395331,12.1052439 L1.86729331,11.1814439 Z" id="Path" fill="#9B9FAE" fill-rule="nonzero"></path>
                        <path d="M9.12196331,11.7168439 C12.2931733,10.8074439 14.1267733,7.49958394 13.2174733,4.32840394 C12.3080733,1.15721394 9.00020331,-0.676385062 5.82901331,0.232937938 C2.65783331,1.14226394 0.824231305,4.45016394 1.73355331,7.62134394 C3.38002331,13.3632439 9.59238331,13.3573439 9.59238331,13.3573439 L9.12196331,11.7168439 Z" id="Path" fill="#59617D" fill-rule="nonzero"></path>
                        <g id="Clipped" transform="translate(1.500616, 0.000000)">
                            <mask id="mask-2" fill="white">
                                <use xlink:href="#path-1"></use>
                            </mask>
                            <g id="Path"></g>
                            <g id="Group" mask="url(#mask-2)">
                                <g transform="translate(-1.500616, 1.998984)">
                                    <path d="M1.86729331,9.18246008 C0.081664305,8.15156008 -0.530136695,5.86827008 0.500795305,4.08265008 C1.53172331,2.29702008 3.81499331,1.68522008 5.60062331,2.71615008 C7.38625331,3.74709008 7.99805331,6.03036008 6.96711331,7.81596008 C5.10045331,11.0491601 1.33395331,10.1062601 1.33395331,10.1062601 L1.86729331,9.18246008 Z" id="Path" fill="#9B9FAE" fill-rule="nonzero"></path>
                                    <path d="M5.30150331,1.98686008 C4.86477331,2.52595008 4.67376331,3.24963008 4.67376331,3.94280008 C4.67377331,4.63597008 4.86478331,5.35966008 5.30151331,5.89874008 C5.72299331,6.41900008 6.41703331,6.82280008 7.55380331,6.82280008 C8.75231331,6.82280008 9.34910331,6.29506008 9.66298331,5.79329008 C9.88377331,5.44027008 9.96297331,5.18227008 9.99127331,5.00847008 C10.0102733,4.89219008 10.1025733,4.79614008 10.2204733,4.79614008 L10.8604733,4.79614008 C10.9782733,4.79614008 11.0751733,4.89168008 11.0650733,5.00907008 C11.0386733,5.31795008 10.9365733,5.76872008 10.5672733,6.35898008 C10.0730733,7.14905008 9.14668331,7.88946008 7.55380331,7.88946008 C6.13053331,7.88946008 5.11789331,7.36660008 4.47270331,6.57019008 C3.84275331,5.79261008 3.60710331,4.80964008 3.60710331,3.94281008 C3.60710331,3.07597008 3.84274331,2.09299008 4.47269331,1.31541008 C5.08514331,0.559430078 6.02868331,0.0499200777 7.34025331,0.000150077701 C7.45798331,-0.0043199223 7.55380331,0.0916500777 7.55380331,0.209470078 L7.55380331,0.849470078 C7.55380331,0.967290078 7.45817331,1.06220008 7.34048331,1.06771008 C6.32912331,1.11508008 5.69595331,1.49997008 5.30150331,1.98686008 Z" id="Path" fill="#FFFFFF" fill-rule="evenodd"></path>
                                    <g id="Clipped" stroke-width="1" fill="none" fill-rule="evenodd" transform="translate(0.000121, 2.215326)">
                                        <mask id="mask-4" fill="white">
                                            <use xlink:href="#path-3"></use>
                                        </mask>
                                        <g id="Path"></g>
                                        <path d="M5.3015019,-0.228475873 C4.8647719,0.310604127 4.6737619,1.03429413 4.6737619,1.72745413 C4.6737719,2.42062413 4.8647919,3.14431413 5.3015219,3.68340413 C5.7229919,4.20366413 6.4170319,4.60746413 7.5538019,4.60746413 C8.7523119,4.60746413 9.3491019,4.07971413 9.6629919,3.57794413 C10.0054519,3.03053413 10.0070519,2.71159413 10.0070519,2.58079413 L11.0737519,2.58079413 C11.0737519,2.87666413 11.0329519,3.39921413 10.5672519,4.14363413 C10.0730519,4.93370413 9.1466819,5.67413413 7.5538019,5.67413413 C6.1305419,5.67413413 5.1179019,5.15126413 4.4727019,4.35485413 C3.8427619,3.57727413 3.6071019,2.59429413 3.6071019,1.72746413 C3.6071019,0.860624127 3.8427419,-0.122345873 4.4726919,-0.899935873 C5.1178919,-1.69633587 6.1305419,-2.21920587 7.5538019,-2.21920587 L7.5538019,-1.15253587 C6.4170319,-1.15253587 5.7229919,-0.748735873 5.3015019,-0.228475873 Z" id="Path" fill="#DEE1EA" mask="url(#mask-4)"></path>
                                    </g>
                                    <path d="M11.3936733,2.66281008 C11.3936733,3.13409008 11.0116733,3.51614008 10.5403733,3.51614008 C10.0690733,3.51614008 9.68705331,3.13409008 9.68705331,2.66281008 C9.68705331,2.19152008 10.0690733,1.80947008 10.5403733,1.80947008 C11.0116733,1.80947008 11.3936733,2.19152008 11.3936733,2.66281008 Z" id="Path" fill="#FFFFFF" fill-rule="nonzero"></path>
                                </g>
                            </g>
                        </g>
                    </g>
                    <g id="Group" transform="translate(16.940373, 0.000000)" fill="#59617D" fill-rule="nonzero">
                        <path d="M7.1767,3.552342 L9.442,3.552342 C9.1537,1.467272 7.3157,-1.11022302e-16 4.9321,-1.11022302e-16 C2.1468,-1.11022302e-16 -3.55271368e-15,2.007842 -3.55271368e-15,5.426322 C-3.55271368e-15,8.762432 2.0078,10.832082 4.9784,10.832082 C7.6401,10.832082 9.5398,9.148552 9.5398,6.373612 L9.5398,5.045352 L5.1277,5.045352 L5.1277,6.723702 L7.393,6.723702 C7.3621,8.031372 6.4714,8.860252 4.9887,8.860252 C3.3155,8.860252 2.2601,7.609212 2.2601,5.405732 C2.2601,3.212552 3.3567,1.971802 4.9681,1.971802 C6.1162,1.971802 6.8936,2.563862 7.1767,3.552342 Z" id="Path"></path>
                        <polygon id="Path" points="12.9314 0.144153 10.7382 0.144153 10.7382 10.687882 12.9314 10.687882"></polygon>
                        <path d="M17.8571,10.842382 C19.8135,10.842382 21.1314,9.889882 21.4403,8.422642 L19.4119,8.288792 C19.1905,8.891142 18.6242,9.205182 17.8932,9.205182 C16.7966,9.205182 16.1015,8.479272 16.1015,7.300312 L16.1015,7.295162 L21.4867,7.295162 L21.4867,6.692812 C21.4867,4.005392 19.8598,2.677122 17.7696,2.677122 C15.4426,2.677122 13.9341,4.329732 13.9341,6.770032 C13.9341,9.277262 15.422,10.842382 17.8571,10.842382 Z M16.1015,5.936012 C16.1479,5.035052 16.8326,4.314292 17.8056,4.314292 C18.7581,4.314292 19.4171,4.993862 19.4222,5.936012 L16.1015,5.936012 Z" id="Shape"></path>
                        <path d="M24.7379,10.837182 C25.9066,10.837182 26.6634,10.327482 27.0495,9.591312 L27.1113,9.591312 L27.1113,10.687882 L29.1912,10.687882 L29.1912,5.354252 C29.1912,3.469962 27.5953,2.677122 25.8345,2.677122 C23.94,2.677122 22.6941,3.583232 22.3903,5.024752 L24.4187,5.189502 C24.568,4.664372 25.0365,4.278252 25.8242,4.278252 C26.5707,4.278252 26.998,4.654072 26.998,5.302762 L26.998,5.333652 C26.998,5.843342 26.4575,5.910262 25.0829,6.044122 C23.5178,6.188272 22.1123,6.713402 22.1123,8.479272 C22.1123,10.044382 23.2295,10.837182 24.7379,10.837182 Z M25.366,9.323602 C24.6916,9.323602 24.2077,9.009552 24.2077,8.407202 C24.2077,7.789402 24.7173,7.485652 25.4896,7.377532 C25.9684,7.310612 26.7509,7.197342 27.0135,7.022302 L27.0135,7.861482 C27.0135,8.690352 26.3288,9.323602 25.366,9.323602 Z" id="Shape"></path>
                        <path d="M30.4578,13.653382 L32.651,13.653382 L32.651,9.421422 L32.7179,9.421422 C33.0217,10.080382 33.6858,10.816582 34.9626,10.816582 C36.7645,10.816582 38.17,9.390522 38.17,6.744292 C38.17,4.025982 36.7027,2.677122 34.9677,2.677122 C33.6446,2.677122 33.0114,3.464812 32.7179,4.108352 L32.6201,4.108352 L32.6201,2.780092 L30.4578,2.780092 L30.4578,13.653382 Z M32.6047,6.733992 C32.6047,5.323362 33.2019,4.422402 34.2676,4.422402 C35.3539,4.422402 35.9305,5.364542 35.9305,6.733992 C35.9305,8.113742 35.3436,9.071332 34.2676,9.071332 C33.2122,9.071332 32.6047,8.144632 32.6047,6.733992 Z" id="Shape"></path>
                    </g>
                </g>
            </g>
          </svg>
        </div>
      </div>
    </div>`;
  Gleap.appendNode(elem);

  const buttonType = Gleap.getInstance().buttonType;
  if (buttonType === Gleap.FEEDBACK_BUTTON_BOTTOM_LEFT) {
    elem.classList.add("bb-feedback-button--bottomleft");
  }

  if (buttonType === Gleap.FEEDBACK_BUTTON_NONE) {
    elem.classList.add("bb-feedback-button--disabled");
  }

  if (
    buttonType === Gleap.FEEDBACK_BUTTON_CLASSIC ||
    buttonType === Gleap.FEEDBACK_BUTTON_CLASSIC_LEFT ||
    buttonType === Gleap.FEEDBACK_BUTTON_CLASSIC_BOTTOM
  ) {
    elem.classList.add("bb-feedback-button--classic");
  }

  const closeButton = document.querySelector(
    ".bb-feedback-dialog-header-close"
  );
  closeButton.onclick = function () {
    if (closeButton && closeButton.getAttribute("d") === "t") {
      return;
    }
    Gleap.getInstance().closeGleap();
  };

  // Hook back action
  if (back) {
    const backButton = document.querySelector(
      ".bb-feedback-dialog-header-back"
    );
    backButton.onclick = function () {
      if (backButton && backButton.getAttribute("d") === "t") {
        return;
      }
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
  subtitle,
  fromBack
) {
  // Generate options
  var optionsHTML = `<div class="bb-feedback-types">`;

  for (var i = 0; i < feedbackTypeActions.length; i++) {
    var action = feedbackTypeActions[i];
    optionsHTML += `<div id="bb-feedback-type-${i}" class="bb-feedback-type">
        <div class="bb-feedback-type-icon" style="background-color: ${
          action.color
        };">
          <img src="${action.icon}">
        </div>
        <div class="bb-feedback-type-text">
          <div class="bb-feedback-type-title">${translateText(
            action.title,
            overrideLanguage
          )}</div>
          <div class="bb-feedback-type-description">${translateText(
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
    optionsHTML,
    null,
    true,
    fromBack ? "bb-anim-fadeinfromback" : "bb-anim-fadein"
  );

  // Hook actions
  for (var i = 0; i < feedbackTypeActions.length; i++) {
    const index = i;
    document.getElementById(`bb-feedback-type-${index}`).onclick = function () {
      dialog.remove();
      if (feedbackTypeActions[index].action) {
        // Cleanup widget.
        Gleap.getInstance().closeGleap();

        // Call custom action.
        feedbackTypeActions[index].action();
      }

      if (feedbackTypeActions[index].actionFlow) {
        Gleap.startFeedbackFlow(feedbackTypeActions[index].actionFlow);
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
    ".bb-feedback-poweredbycontainer"
  );
  if (poweredByHidden) {
    poweredByContainer.style.display = "none";
  } else {
    poweredByContainer.onclick = function () {
      window.open("https://www.gleap.io/", "_blank");
    };
  }
};

export const setLoadingIndicatorProgress = function (percentComplete) {
  const circle = window.document.querySelector(".bb--progress-ring__circle");
  const circumference = 213.628300444;
  const offset = circumference - (percentComplete / 100) * circumference;
  if (circle) {
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = offset;
  }
};

export const loadIcon = function (name, color) {
  if (name === "bblogo") {
    return `<svg class="bb-logo-logo" width="41px" height="41px" viewBox="0 0 41 41" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <title>Group</title>
    <defs>
        <path d="M22.8640197,35.1504495 C32.3776197,32.4224495 37.8784197,22.4987495 35.1504197,12.9852495 C32.4224197,3.4716495 22.4987197,-2.0291505 12.9852197,0.698809498 C3.47164965,3.4267795 -2.02915035,13.3504495 0.698809655,22.8640495 C5.63821965,40.0898495 24.2753197,40.0720495 24.2753197,40.0720495 L22.8640197,35.1504495 Z" id="path-1"></path>
        <path d="M5.60186532,20.901389 C0.244995316,17.808589 -1.59040968,10.958789 1.50238532,5.60188901 C4.59517532,0.244989006 11.4449653,-1.59041099 16.8018653,1.50238901 C22.1587653,4.59518901 23.9941653,11.444989 20.9013653,16.801889 C15.3013653,26.501389 4.00186532,23.672589 4.00186532,23.672589 L5.60186532,20.901389 Z" id="path-3"></path>
    </defs>
    <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <g id="Group" transform="translate(0.000000, -0.000000)">
            <path d="M5.60186839,33.5444495 C0.244988386,30.4516495 -1.59040861,23.6018495 1.50238839,18.2449495 C4.59517839,12.8880495 11.4449884,11.0526495 16.8018884,14.1454495 C22.1587884,17.2382495 23.9941884,24.0880495 20.9013884,29.4449495 C15.3013884,39.1444495 4.00186839,36.3156495 4.00186839,36.3156495 L5.60186839,33.5444495 Z" id="Path" fill="#9D50FF" fill-rule="nonzero"></path>
            <path d="M27.3659884,35.1504495 C36.8795884,32.4224495 42.3803884,22.4987495 39.6523884,12.9852495 C36.9243884,3.4716495 27.0006884,-2.0291505 17.4871884,0.698809498 C7.97361839,3.4267795 2.47281839,13.3504495 5.20077839,22.8640495 C10.1401884,40.0898495 28.7772884,40.0720495 28.7772884,40.0720495 L27.3659884,35.1504495 Z" id="Path" fill="#485BFF" fill-rule="nonzero"></path>
            <g id="Clipped" transform="translate(4.501969, 0.000000)">
                <mask id="mask-2" fill="white">
                    <use xlink:href="#path-1"></use>
                </mask>
                <g id="Path"></g>
                <g id="Group" mask="url(#mask-2)">
                    <g transform="translate(-4.501969, 5.997020)">
                        <path d="M5.60186839,27.5474296 C0.244988386,24.4546296 -1.59040861,17.6048296 1.50238839,12.2479296 C4.59517839,6.89102957 11.4449884,5.05562957 16.8018884,8.14842957 C22.1587884,11.2412296 23.9941884,18.0910296 20.9013884,23.4479296 C15.3013884,33.1474296 4.00186839,30.3186296 4.00186839,30.3186296 L5.60186839,27.5474296 Z" id="Path" fill="#9D50FF" fill-rule="nonzero"></path>
                        <path d="M15.9047884,5.96062957 C14.5945884,7.57782957 14.0214884,9.74892957 14.0215884,11.8284296 C14.0215884,13.9079296 14.5945884,16.0790296 15.9047884,17.6962296 C17.1691884,19.2570296 19.2513884,20.4684296 22.6616884,20.4684296 C26.2571884,20.4684296 28.0475884,18.8852296 28.9891884,17.3799296 C29.6516884,16.3208296 29.8890884,15.5468296 29.9740884,15.0254296 C30.0309884,14.6765296 30.3080884,14.3884296 30.6615884,14.3884296 L32.5815884,14.3884296 C32.9349884,14.3884296 33.2256884,14.6750296 33.1955884,15.0272296 C33.1161884,15.9538296 32.8098884,17.3061296 31.7020884,19.0769296 C30.2194884,21.4471296 27.4402884,23.6684296 22.6616884,23.6684296 C18.3918884,23.6684296 15.3538884,22.0998296 13.4183884,19.7106296 C11.5284884,17.3778296 10.8215884,14.4289296 10.8215884,11.8284296 C10.8215884,9.22792957 11.5284884,6.27902957 13.4182884,3.94622957 C15.2556884,1.67828957 18.0862884,0.149779575 22.0209884,0.000449574751 C22.3741884,-0.0129504252 22.6616884,0.274959575 22.6616884,0.628429575 L22.6616884,2.54842957 C22.6616884,2.90188957 22.3747884,3.18660957 22.0216884,3.20314957 C18.9875884,3.34525957 17.0880884,4.49992957 15.9047884,5.96062957 Z" id="Path" fill="#FFFFFF" fill-rule="evenodd"></path>
                        <g id="Clipped" stroke-width="1" fill="none" fill-rule="evenodd" transform="translate(0.000123, 6.646041)">
                            <mask id="mask-4" fill="white">
                                <use xlink:href="#path-3"></use>
                            </mask>
                            <g id="Path"></g>
                            <path d="M15.9046653,-0.685410994 C14.5944653,0.931789006 14.0213653,3.10288901 14.0214653,5.18238901 C14.0214653,7.26188901 14.5944653,9.43298901 15.9046653,11.050189 C17.1690653,12.610989 19.2512653,13.822389 22.6615653,13.822389 C26.2570653,13.822389 28.0474653,12.239189 28.9890653,10.733889 C30.0163653,9.09158901 30.0214653,8.13478901 30.0214653,7.74238901 L33.2213653,7.74238901 C33.2213653,8.62998901 33.0990653,10.197689 31.7019653,12.430889 C30.2193653,14.801089 27.4401653,17.022389 22.6615653,17.022389 C18.3917653,17.022389 15.3537653,15.453789 13.4182653,13.064589 C11.5283653,10.731789 10.8214653,7.78288901 10.8214653,5.18238901 C10.8214653,2.58188901 11.5283653,-0.367010994 13.4181653,-2.69981099 C15.3537653,-5.08901099 18.3917653,-6.65761099 22.6615653,-6.65761099 L22.6615653,-3.45761099 C19.2512653,-3.45761099 17.1690653,-2.24621099 15.9046653,-0.685410994 Z" id="Path" fill="#FFC5F6" mask="url(#mask-4)"></path>
                        </g>
                        <path d="M34.1814884,7.98842957 C34.1814884,9.40222957 33.0353884,10.5484296 31.6214884,10.5484296 C30.2076884,10.5484296 29.0614884,9.40222957 29.0614884,7.98842957 C29.0614884,6.57462957 30.2076884,5.42842957 31.6214884,5.42842957 C33.0353884,5.42842957 34.1814884,6.57462957 34.1814884,7.98842957 Z" id="Path" fill="#FFFFFF" fill-rule="nonzero"></path>
                    </g>
                </g>
            </g>
        </g>
    </g>
</svg>`;
  }

  if (name === "arrowdown") {
    return `<svg class="bb-logo-arrowdown" fill="${color}" width="100pt" height="100pt" version="1.1" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="m50 77.637c-1.3477 0-2.6953-0.51562-3.7266-1.543l-44.73-44.73c-2.0586-2.0586-2.0586-5.3945 0-7.4531 2.0586-2.0586 5.3945-2.0586 7.4531 0l41.004 41 41.004-41c2.0586-2.0586 5.3945-2.0586 7.4531 0 2.0586 2.0586 2.0586 5.3945 0 7.4531l-44.73 44.727c-1.0312 1.0312-2.3789 1.5469-3.7266 1.5469z"/>
   </svg>`;
  }

  if (name === "arrowleft") {
    return `<svg fill="${color}" width="100pt" height="100pt" version="1.1" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="m70.988 1.6211c2.1875-2.168 5.7344-2.168 7.9297 0 2.1836 2.168 2.1836 5.7227 0 7.8906l-46.016 40.445 46.016 40.5c2.1836 2.168 2.1836 5.668 0 7.8906-2.1953 2.168-5.7383 2.168-7.9297 0l-50.039-44.109c-1.168-1.168-1.668-2.7227-1.5898-4.2773-0.078125-1.5 0.42188-3.0547 1.5898-4.2227l50.039-44.109z" fill-rule="evenodd"/>
   </svg>`;
  }

  if (name === "close") {
    return `<svg fill="${color}" width="100pt" height="100pt" version="1.1" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="m72.812 33.02l-5.832-5.832-16.98 16.875-16.98-16.875-5.832 5.832 16.875 16.98-16.875 16.98 5.832 5.832 16.98-16.875 16.98 16.875 5.832-5.832-16.875-16.98z"/>
   </svg>`;
  }

  return "";
};

export const toggleLoading = function (loading) {
  const form = document.querySelector(".bb-feedback-form");
  const loader = document.querySelector(".bb-feedback-dialog-loading");
  const next = document.querySelector(".bb-feedback-dialog-header-back");
  const close = document.querySelector(".bb-feedback-dialog-header-close");

  if (loading) {
    form.style.display = "none";
    loader.style.display = "flex";
    if (next) {
      next.setAttribute("d", "t");
      next.style.opacity = "0.2";
    }
    if (close) {
      close.setAttribute("d", "t");
      close.style.opacity = "0.2";
    }
  } else {
    form.style.display = "block";
    loader.style.display = "none";
    if (next) {
      next.setAttribute("d", "n");
      next.style.opacity = "1";
    }
    if (close) {
      close.setAttribute("d", "n");
      close.style.opacity = "1";
    }
  }
};
