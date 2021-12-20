import Gleap from "./Gleap";
import { translateText } from "./Translation";

const calculateContrast = (hex) => {
  var r = parseInt(hex.substr(1, 2), 16),
    g = parseInt(hex.substr(3, 2), 16),
    b = parseInt(hex.substr(5, 2), 16),
    yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 165 ? "black" : "white";
};

export const injectStyledCSS = (
  primaryColor,
  headerColor,
  buttonColor,
  borderRadius
) => {
  const contrastColor = calculateContrast(primaryColor);
  const contrastHeaderColor = calculateContrast(headerColor);
  const contrastButtonColor = calculateContrast(buttonColor);

  var borderRadius = parseInt(borderRadius, 10);
  if (borderRadius === NaN || borderRadius === undefined) {
    borderRadius = 20;
  }

  const containerBorderRadius = Math.round(borderRadius * 0.6);
  const buttonBorderRadius = Math.round(borderRadius * 1.05);
  const formItemBorderRadius = Math.round(borderRadius * 0.4);
  const formItemSmallBorderRadius = Math.round(borderRadius * 0.25);

  const colorStyleSheet = `
    .bb-feedback-onetofive-button {
      border-radius: ${formItemSmallBorderRadius}px;
    }
    .bb-feedback-button-classic {
      border-top-left-radius: ${formItemBorderRadius}px;
      border-top-right-radius: ${formItemBorderRadius}px;
    }
    .bb-logo-logo--default path {
      fill: ${contrastButtonColor};
    }
    .bb-feedback-dialog-header-logo .bb-logo-logo--default path {
      fill: ${contrastHeaderColor};
    }
    .bb-feedback-inputgroup textarea,
    .bb-feedback-inputgroup > input,
    .bb-feedback-inputgroup input {
      border-radius: ${formItemBorderRadius}px;
    }
    .bb-feedback-dialog-header-back:hover {
      background-color: ${contrastHeaderColor};
      border-radius: ${containerBorderRadius}px;
    }
    .bb-feedback-type {
      border-radius: ${containerBorderRadius}px;
    }
    .bb-feedback-dialog {
      border-radius: ${borderRadius}px;
    }
    .bb-screenshot-editor-drag-info {
      color: ${contrastColor};
      border-radius: ${buttonBorderRadius}px;
    }
    .bb-logo-arrowdown {
      fill: ${contrastButtonColor};
    }
    .bb-feedback-dialog-header-back svg {
      fill: ${contrastHeaderColor};
    }
    .bb-feedback-dialog-header-back:hover svg {
      fill: ${headerColor};
    }
    .bb-feedback-dialog-header-close svg {
      fill: ${contrastHeaderColor};
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
      border-top-left-radius: ${borderRadius}px;
      border-top-right-radius: ${borderRadius}px;
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
      border-radius: ${buttonBorderRadius}px;
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
  var headerImage = loadIcon("bblogo", "#fff");
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
        ${loadIcon("arrowleft", "#fff")}
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
          ${loadIcon("close", "#fff")}
        </div>
      </div>
      <div class="bb-feedback-dialog-body">
        ${content}
        <div class="bb-feedback-poweredbycontainer">
          <span>Powered by</span>
          <svg width="90px" height="32px" viewBox="0 0 90 32" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
              <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                  <g transform="translate(0.653299, 0.000000)" fill="#59617D" fill-rule="nonzero">
                      <path d="M16.7989119,8.32577189 L22.1014291,8.32577189 C21.4265888,3.43890649 17.1242771,0 11.5448484,0 C5.02513746,0 0,4.70586291 0,12.7178969 C0,20.5368768 4.69977222,25.3876017 11.6532254,25.3876017 C17.8836188,25.3876017 22.3303551,21.4418423 22.3303551,14.9380999 L22.3303551,11.8250016 L12.0027005,11.8250016 L12.0027005,15.7586204 L17.3052177,15.7586204 C17.2328883,18.823461 15.1479759,20.7661416 11.6773352,20.7661416 C7.76078035,20.7661416 5.29034525,17.8340271 5.29034525,12.6696392 C5.29034525,7.52939191 7.85721955,4.62139446 11.6291156,4.62139446 C14.3165389,4.62139446 16.1362435,6.00903014 16.7989119,8.32577189 Z"></path>
                      <polygon points="30.2692671 0.337857389 25.1355185 0.337857389 25.1355185 25.0496341 30.2692671 25.0496341"></polygon>
                      <path d="M41.7991346,25.4117422 C46.3785919,25.4117422 49.4634758,23.1793283 50.1865357,19.7404968 L45.4385438,19.426787 C44.9203002,20.8385398 43.5947294,21.5745684 41.883636,21.5745684 C39.3167617,21.5745684 37.6897014,19.8732229 37.6897014,17.1100453 L37.6897014,17.097975 L50.2951468,17.097975 L50.2951468,15.6862222 C50.2951468,9.38760404 46.486969,6.27448232 41.5943184,6.27448232 C36.1473765,6.27448232 32.6163443,10.1477732 32.6163443,15.8672059 C32.6163443,21.7435053 36.0991569,25.4117422 41.7991346,25.4117422 Z M37.6897014,13.9124785 C37.7983125,11.8008611 39.4010289,10.1115858 41.6785856,10.1115858 C43.9081568,10.1115858 45.4507158,11.7043223 45.4626536,13.9124785 L37.6897014,13.9124785 Z"></path>
                      <path d="M57.9054165,25.3995548 C60.6410594,25.3995548 62.4125444,24.2049497 63.3163107,22.4795574 L63.4609695,22.4795574 L63.4609695,25.0496341 L68.3295103,25.0496341 L68.3295103,12.5489834 C68.3295103,8.13269445 64.593896,6.27448232 60.4722908,6.27448232 C56.0377263,6.27448232 53.121377,8.39817007 52.410255,11.7767205 L57.1582468,12.162852 C57.5077218,10.9320829 58.6043666,10.0271174 60.448181,10.0271174 C62.1955562,10.0271174 63.1957617,10.9079424 63.1957617,12.4283041 L63.1957617,12.5007023 C63.1957617,13.695284 61.9305825,13.8521272 58.7129777,14.1658604 C55.0494587,14.5037108 51.7595245,15.7344799 51.7595245,19.8732229 C51.7595245,23.5414364 54.3746184,25.3995548 57.9054165,25.3995548 Z M59.375646,21.8521143 C57.7970394,21.8521143 56.664347,21.1160622 56.664347,19.7043095 C56.664347,18.2563459 57.8571969,17.5444343 59.6649636,17.291029 C60.7857181,17.1341858 62.6173606,16.8687102 63.2320434,16.4584616 L63.2320434,18.4252828 C63.2320434,20.3679399 61.629327,21.8521143 59.375646,21.8521143 Z"></path>
                      <path d="M71.2943133,32 L76.4280619,32 L76.4280619,22.0813791 L76.5846586,22.0813791 C77.2957806,23.6258111 78.8502774,25.3512737 81.8389562,25.3512737 C86.0567665,25.3512737 89.3467007,22.0089575 89.3467007,15.806878 C89.3467007,9.43586168 85.9121077,6.27448232 81.850894,6.27448232 C78.7538382,6.27448232 77.2716708,8.12062418 76.5846586,9.62891568 L76.3557325,9.62891568 L76.3557325,6.5158174 L71.2943133,6.5158174 L71.2943133,32 Z M76.3196849,15.7827375 C76.3196849,12.4765852 77.717585,10.3649677 80.2121299,10.3649677 C82.7548944,10.3649677 84.104575,12.5731005 84.104575,15.7827375 C84.104575,19.016515 82.7307846,21.2608586 80.2121299,21.2608586 C77.7416948,21.2608586 76.3196849,19.0889132 76.3196849,15.7827375 Z"></path>
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

  if (buttonType === Gleap.FEEDBACK_BUTTON_CLASSIC_LEFT) {
    elem.classList.add("bb-feedback-button--classic-left");
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

export const setLoadingIndicatorProgress = function (
  percentComplete,
  loader = "main"
) {
  const circle = window.document.querySelector(
    `.bb-feedback-dialog-loading--${loader} .bb--progress-ring__circle`
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
    return `<svg class="bb-logo-logo bb-logo-logo--default" width="127px" height="129px" viewBox="0 0 127 129" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
            <g transform="translate(-11.000000, -6.000000)">
                <g transform="translate(11.000000, 6.000000)">
                    <path d="M27.5507,32.306 C20.4495,41.0714 17.3437,52.8384 17.3438,64.1091 C17.3438,75.3799 20.4497,87.1469 27.5508,95.9123 C34.4039,104.372 45.6889,110.937 64.1725,110.937 C83.6599,110.937 93.3637,102.356 98.4673,94.1976 C102.058,88.4577 103.344,84.2626 103.805,81.4366 C104.114,79.5459 105.616,77.9841 107.531,77.9841 L117.938,77.9841 C119.853,77.9841 121.429,79.5376 121.265,81.4463 C120.835,86.4687 119.175,93.7981 113.171,103.396 C105.135,116.242 90.0723,128.281 64.1725,128.281 C41.0305,128.281 24.5652,119.779 14.0745,106.83 C3.83175,94.1866 -7.10542736e-15,78.2036 -7.10542736e-15,64.1092 C-7.10542736e-15,50.0147 3.83155,34.0317 14.0744,21.3884 C24.0327,9.09622 39.3744,0.811764004 60.7001,0.00243821374 C62.6145,-0.0702130963 64.1725,1.49027 64.1725,3.40601 L64.1725,13.8123 C64.1725,15.728 62.6176,17.2712 60.704,17.3608 C44.2594,18.1311 33.9643,24.3893 27.5507,32.306 Z"></path>
                    <path d="M126.609,43.2966 C126.609,50.9596 120.397,57.1716 112.734,57.1716 C105.071,57.1716 98.8594,50.9596 98.8594,43.2966 C98.8594,35.6337 105.071,29.4216 112.734,29.4216 C120.397,29.4216 126.609,35.6337 126.609,43.2966 Z" id="Path" fill-rule="nonzero"></path>
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
  const loader = document.querySelector(".bb-feedback-dialog-loading--main");
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
