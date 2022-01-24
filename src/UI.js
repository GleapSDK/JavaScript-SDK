import Gleap from "./Gleap";
import { translateText } from "./Translation";

const calculateShadeColor = function (col, amt) {
  col = col.replace(/^#/, "");
  if (col.length === 3)
    col = col[0] + col[0] + col[1] + col[1] + col[2] + col[2];

  let [r, g, b] = col.match(/.{2}/g);
  [r, g, b] = [
    parseInt(r, 16) + amt,
    parseInt(g, 16) + amt,
    parseInt(b, 16) + amt,
  ];

  r = Math.max(Math.min(255, r), 0).toString(16);
  g = Math.max(Math.min(255, g), 0).toString(16);
  b = Math.max(Math.min(255, b), 0).toString(16);

  const rr = (r.length < 2 ? "0" : "") + r;
  const gg = (g.length < 2 ? "0" : "") + g;
  const bb = (b.length < 2 ? "0" : "") + b;

  return `#${rr}${gg}${bb}`;
};

const calculateContrast = (hex) => {
  var r = parseInt(hex.substr(1, 2), 16),
    g = parseInt(hex.substr(3, 2), 16),
    b = parseInt(hex.substr(5, 2), 16),
    yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 160 ? "#000000" : "#ffffff";
};

export const injectStyledCSS = (
  primaryColor,
  headerColor,
  buttonColor,
  borderRadius,
  backgroundColor
) => {
  const contrastColor = calculateContrast(primaryColor);
  const contrastHeaderColor = calculateContrast(headerColor);
  const contrastButtonColor = calculateContrast(buttonColor);
  const contrastBackgroundColor = calculateContrast(backgroundColor);
  const isDarkMode = contrastBackgroundColor === "#ffffff";
  const subTextColor = isDarkMode
    ? calculateShadeColor(backgroundColor, 100)
    : calculateShadeColor(backgroundColor, -100);
  const backgroundColorHover = isDarkMode
    ? calculateShadeColor(backgroundColor, 30)
    : calculateShadeColor(backgroundColor, -12);
  const hoverHoverColor = isDarkMode
    ? calculateShadeColor(backgroundColor, 80)
    : calculateShadeColor(backgroundColor, -30);
  const borderColor = isDarkMode
    ? calculateShadeColor(backgroundColor, 70)
    : calculateShadeColor(backgroundColor, -70);

  var borderRadius = parseInt(borderRadius, 10);
  if (borderRadius === NaN || borderRadius === undefined) {
    borderRadius = 20;
  }

  const containerBorderRadius = Math.round(borderRadius * 0.6);
  const buttonBorderRadius = Math.round(borderRadius * 1.05);
  const formItemBorderRadius = Math.round(borderRadius * 0.4);
  const formItemSmallBorderRadius = Math.round(borderRadius * 0.25);

  const colorStyleSheet = `
    .bb-capture-preview-retrybutton {
      color: ${contrastBackgroundColor};
      border-radius: ${buttonBorderRadius}px;
    }
    .bb-capture-preview-retrybutton:hover {
      background-color: ${backgroundColorHover};
    }
    .bb-capture-dismiss {
      background-color: ${primaryColor};
    }
    .bb-capture-dismiss svg path {
      fill: ${contrastColor};
    }
    .bb-tooltip {
      border-radius: ${formItemBorderRadius}px;
    }
    @keyframes bbRecIconFade {
      0% {
        fill: transparent;
      }
      50% {
        fill: ${hoverHoverColor};
      }
      100% {
        fill: transparent;
      }
    }
    .bb-capture-preview-sendbutton {
      color: ${contrastColor};
      background-color: ${primaryColor};
      border-radius: ${buttonBorderRadius}px;
    }
    .bb-capture-button-next {
      color: ${contrastColor};
      background-color: ${primaryColor};
      border-radius: ${formItemSmallBorderRadius}px;
    }
    .bb-feedback-capture-item {
      border-radius: ${buttonBorderRadius}px;
      background-color: ${backgroundColorHover};
    }
    .bb-capture-preview-inner {
      background-color: ${backgroundColor};
      border-radius: ${formItemBorderRadius}px;
    }
    .bb-feedback-capture-item .bb-item-title {
      color: ${contrastBackgroundColor};
    }
    .bb-capture-toolbar-item-timer {
      color: ${subTextColor};
    }
    .bb-feedback-capture-item-selected-icon path,
    .bb-feedback-capture-item-selected-action path,
    .bb-feedback-capture-item path {
      fill: ${contrastBackgroundColor};
    }
    .bb-svg-path {
      fill: ${contrastBackgroundColor};
    }
    .bb-feedback-capture-item-selected-button {
      border-radius: ${buttonBorderRadius}px;
      background-color: ${backgroundColorHover};
    }
    .bb-feedback-capture-item-selected-label {
      color: ${contrastBackgroundColor};
    }
    .bb-feedback-capture-item-selected-action:hover {
      background-color: ${hoverHoverColor};
    }
    .bb-capture-toolbar-item:first-of-type {
      border-top-left-radius: ${formItemBorderRadius}px;
      border-bottom-left-radius: ${formItemBorderRadius}px;
    }
    .bb-capture-toolbar {
      background-color: ${backgroundColor};
      border-radius: ${formItemBorderRadius}px;
    }
    .bb-capture-toolbar-item-colorpicker {
      background-color: ${backgroundColor};
    }
    .bb-capture-toolbar-item--active {
      background-color: ${backgroundColorHover};
    }
    .bb-feedback-capture-item:hover {
      background-color: ${hoverHoverColor};
    }
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
      background-color: ${backgroundColor};
    }
    .bb-feedback-type-description,
    .bb-feedback-poweredbycontainer span,
    .bb-feedback-onetofive-description span {
      color: ${subTextColor};
    }
    .bb-feedback-poweredbycontainer svg g {
      fill: ${subTextColor};
    }
    .bb-feedback-type:hover {
      background-color: ${backgroundColorHover};
    }
    .bb-feedback-type-title,
    .bb-feedback-form-description,
    .bb-feedback-elementtitle,
    .bb-feedback-multiplechoice-container,
    .bb-feedback-dialog-info-text
    {
      color: ${contrastBackgroundColor};
    }
    .bb-feedback-dialog {
      border-radius: ${borderRadius}px;
      background-color: ${backgroundColor};
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
    .bb-capture-editor-borderlayer {
        border-color: ${primaryColor};
    }
    .bb-feedback-button-classic {
      background-color: ${buttonColor};
      color: ${contrastButtonColor};
    }
    .bb-feedback-dialog-header {
      background-color: ${headerColor};
    }
    .bb-form-progress-inner {
      background-color: ${headerColor}66;
    }
    .bb-feedback-inputgroup textarea,
    .bb-feedback-inputgroup > input,
    .bb-feedback-inputgroup input {
      background-color: ${backgroundColor};
      color: ${contrastBackgroundColor};
      border-color: ${borderColor};
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
  elem.innerHTML = `<div class='bb-feedback-dialog ${appendClass}'>
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

  if (name === "dismiss") {
    return `<svg width="1200pt" height="1200pt" version="1.1" viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg">
    <path d="m1089.5 228.38-117.85-117.85-371.62 371.62-371.62-371.62-117.85 117.85 371.62 371.62-371.62 371.62 117.85 117.85 371.62-371.62 371.62 371.62 117.85-117.85-371.62-371.62z" fill="#fff"/>
  </svg>`;
  }

  if (name === "screenshot") {
    return `<svg width="23px" height="20px" viewBox="0 0 23 20" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <g transform="translate(-1172.000000, -570.000000)" fill="#333333" fill-rule="nonzero">
            <g transform="translate(1155.000000, 558.000000)">
                <g transform="translate(17.000000, 12.000000)">
                    <path d="M3.40727379,8.2362507e-05 C3.18136472,8.2362507e-05 2.96469164,0.0879281104 2.80495864,0.244168699 C2.64522565,0.400409287 2.55545534,0.61238707 2.55545534,0.83340698 L2.55545534,5.00003007 C2.55226113,5.22311663 2.6405486,5.43804771 2.80062005,5.59689049 C2.96078009,5.75574217 3.17923631,5.84524345 3.40727379,5.84524345 C3.63531126,5.84524345 3.85376294,5.75574883 4.01392753,5.59689049 C4.17399898,5.43803882 4.26229507,5.22311663 4.25909223,5.00003007 L4.25909223,1.6667316 L7.66636602,1.6667316 C7.8944035,1.66985645 8.11410451,1.5834858 8.27647247,1.42688966 C8.43884951,1.27020686 8.53033708,1.05649354 8.53033708,0.83340698 C8.53033708,0.610320425 8.43885632,0.396611549 8.27647247,0.239924299 C8.11409543,0.0833281585 7.8944035,-0.00305093806 7.66636602,8.2362507e-05 L3.40727379,8.2362507e-05 Z"></path>
                    <path d="M22.1347863,14.1552677 C21.909143,14.158653 21.6941576,14.2495378 21.5369233,14.4079539 C21.3797798,14.5662856 21.2931897,14.7792167 21.2962789,14.9999699 L21.2962789,18.3332684 L17.8890051,18.3332684 C17.6609677,18.3301435 17.4412666,18.4165142 17.2788987,18.5731103 C17.1165216,18.7297931 17.0250341,18.9435065 17.0250341,19.166593 C17.0250341,19.3896796 17.1165148,19.6033885 17.2788987,19.7600757 C17.4412757,19.9166718 17.6609677,20.0030509 17.8890051,19.9999176 L22.1480974,19.9999176 C22.3740064,19.9999176 22.5906795,19.9120719 22.7504125,19.7558313 C22.9101455,19.5995907 22.9999158,19.3876129 22.9999158,19.166593 L22.9999158,14.9999699 C23.00311,14.7747056 22.9128713,14.5577968 22.7498673,14.3986651 C22.5869565,14.2395512 22.3650498,14.1517121 22.1347863,14.1552677 L22.1347863,14.1552677 Z"></path>
                    <path d="M22.1347863,7.48867071 C21.909143,7.49205601 21.6941576,7.58294083 21.5369233,7.74135696 C21.3797798,7.89968863 21.2931897,8.11261974 21.2962789,8.33337299 L21.2962789,11.6666715 C21.2930847,11.889758 21.3813722,12.1046891 21.5414436,12.2635319 C21.7016037,12.4223836 21.9200599,12.5118848 22.1480974,12.5118848 C22.3761348,12.5118848 22.5945865,12.4223902 22.7547511,12.2635319 C22.9148226,12.1046802 23.0031186,11.889758 22.9999158,11.6666715 L22.9999158,8.33337299 C23.00311,8.10810868 22.9128713,7.89119983 22.7498673,7.73206816 C22.5869565,7.57295427 22.3650498,7.48511519 22.1347863,7.48867071 L22.1347863,7.48867071 Z"></path>
                    <path d="M17.8881874,8.2362507e-05 C17.6601499,-0.0030424937 17.4404489,0.0833281585 17.2780809,0.239924299 C17.1157039,0.396607104 17.0242163,0.610320425 17.0242163,0.83340698 C17.0242163,1.05649354 17.1156971,1.27020241 17.2780809,1.42688966 C17.440458,1.5834858 17.6601499,1.6698649 17.8881874,1.6667316 L21.2954612,1.6667316 L21.2954612,5.00003007 C21.292267,5.22311663 21.3805544,5.43804771 21.5406259,5.59689049 C21.7007859,5.75574217 21.9192421,5.84524345 22.1472796,5.84524345 C22.3753171,5.84524345 22.5937688,5.75574883 22.7539334,5.59689049 C22.9140048,5.43803882 23.0023009,5.22311663 22.9990981,5.00003007 L22.9990981,0.83340698 C22.9990981,0.612402625 22.9093028,0.400433731 22.7495948,0.244168699 C22.5898868,0.0879036662 22.3732046,8.2362507e-05 22.1472796,8.2362507e-05 L17.8881874,8.2362507e-05 Z"></path>
                    <path d="M11.0736398,8.2362507e-05 C10.8456023,-0.0030424937 10.6259013,0.0833281585 10.4635334,0.239924299 C10.3011563,0.396607104 10.2096688,0.610320425 10.2096688,0.83340698 C10.2096688,1.05649354 10.3011495,1.27020241 10.4635334,1.42688966 C10.6259104,1.5834858 10.8456023,1.6698649 11.0736398,1.6667316 L14.4809136,1.6667316 C14.7089511,1.66985645 14.9286521,1.5834858 15.09102,1.42688966 C15.2533971,1.27020686 15.3448847,1.05649354 15.3448847,0.83340698 C15.3448847,0.610320425 15.2534039,0.396611549 15.09102,0.239924299 C14.928643,0.0833281585 14.7089511,-0.00305093806 14.4809136,8.2362507e-05 L11.0736398,8.2362507e-05 Z"></path>
                    <path d="M5.11091068,7.50000392 C3.70993056,7.50000392 2.55545534,8.62941433 2.55545534,9.99997778 C1.15447522,9.99997778 0,11.1293882 0,12.4999516 L0,17.4998993 C0,18.8704628 1.15447522,19.9998732 2.55545534,19.9998732 L12.7772767,19.9998732 C14.1782568,19.9998732 15.332732,18.8704628 15.332732,17.4998993 L15.332732,12.4999516 C15.332732,11.1293882 14.1782568,9.99997778 12.7772767,9.99997778 C12.7772767,8.62941433 11.6228015,7.50000392 10.2218214,7.50000392 L5.11091068,7.50000392 Z M7.66636602,11.666627 C9.06761872,11.666627 10.2218214,12.7957708 10.2218214,14.1666009 C10.2218214,15.537431 9.06761872,16.6665747 7.66636602,16.6665747 C6.26511332,16.6665747 5.11091068,15.537431 5.11091068,14.1666009 C5.11091068,12.7957708 6.26511332,11.666627 7.66636602,11.666627 Z"></path>
                </g>
            </g>
        </g>
    </g>
</svg>`;
  }

  if (name === "pen") {
    return `<svg width="1072px" height="1034px" viewBox="0 0 1072 1034" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <g transform="translate(-907.000000, -217.000000)" fill-rule="nonzero">
            <g transform="translate(907.268457, 217.009827)">
                <g transform="translate(132.335119, 0.000000)" fill="#000" class="bb-svg-path">
                    <path d="M20.3764235,730.530173 L10.1884235,720.342173 C-0.791576454,709.362173 -3.16357645,692.432173 4.37592355,678.858173 L83.1809235,537.018173 C71.7589235,502.979173 82.3098335,463.998173 112.254924,440.706173 L655.334924,18.3161733 C689.951924,-8.6058267 739.197924,-5.5388267 770.214924,25.4684733 L913.774924,169.028473 C944.782924,200.040473 947.848924,249.286473 920.927224,283.908473 L498.537224,826.988473 C496.322424,829.836173 493.935624,832.543173 491.384924,835.090073 C467.271924,859.207073 432.513924,866.195073 402.232924,856.063073 L260.382924,934.868073 C246.804924,942.407173 229.874924,940.036073 218.894924,929.055573 L208.706924,918.867573 L20.3764235,730.530173 Z M866.006424,241.190173 C871.393124,234.264373 870.779824,224.417173 864.576724,218.213173 L721.016724,74.6531733 C714.813624,68.4500733 704.965724,67.8367733 698.043724,73.2234733 L154.963724,495.613473 C147.381724,501.507973 146.018424,512.433473 151.912924,520.015473 C152.358234,520.585783 152.834804,521.128773 153.346524,521.636573 L417.586524,785.886573 C424.379524,792.675673 435.391524,792.675673 442.180524,785.886573 C442.692244,785.374853 443.168804,784.831873 443.610224,784.265473 L866.006424,241.190173 Z M342.796424,809.480173 L129.746424,596.430173 L77.9264235,689.707173 L249.516424,861.297173 L342.796424,809.480173 Z"></path>
                </g>
                <g transform="translate(-0.000000, 755.530173)" fill="#D50202">
                    <path d="M124.711543,0 L313.042043,188.3374 L233.288043,268.0914 C222.003043,279.3764 204.483043,281.5324 190.800043,273.3219 L16.8900429,168.9719 C-2.51595711,157.3309 -5.80895711,130.5499 10.1908429,114.5499 L124.711543,0 Z" class="bb-pen-tip"></path>
                </g>
            </g>
        </g>
    </g>
</svg>`;
  }

  if (name === "rect") {
    return `<svg width="339px" height="241px" viewBox="0 0 339 241" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <g transform="translate(-0.000865, 0.000000)" fill-rule="nonzero">
            <g transform="translate(0.000865, 0.000000)" fill="#000000" class="bb-svg-path">
                <path d="M339,0 L339,241 L0,241 L0,0 L339,0 Z M312.826351,26.168387 L26.1855674,26.168387 L26.1855674,214.41156 L312.826351,214.41156 L312.826351,26.168387 Z"></path>
            </g>
            <g transform="translate(0.000000, 83.206095)" fill="#D50202" class="bb-pen-tip">
                <path d="M0,0 L26.186,26.186 L26.1864325,131.205465 L131.204,131.205 L157.792,157.793 L0.000865118243,157.793905 L0,0 Z"></path>
            </g>
        </g>
    </g>
</svg>`;
  }

  if (name === "mic") {
    return `<svg
    width="1200pt"
    height="1200pt"
    version="1.1"
    viewBox="0 0 1200 1200"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g class="bb-svg-path">
      <path
        d="m600 862.5c144.75 0 262.5-117.75 262.5-262.5v-300c0-144.75-117.75-262.5-262.5-262.5s-262.5 117.75-262.5 262.5v300c0 144.75 117.75 262.5 262.5 262.5z"
      />
      <path
        d="m1012.5 600c0-20.707-16.793-37.5-37.5-37.5s-37.5 16.793-37.5 37.5c0 186.11-151.41 337.5-337.5 337.5s-337.5-151.39-337.5-337.5c0-20.707-16.793-37.5-37.5-37.5s-37.5 16.793-37.5 37.5c0 214.8 165.08 391.57 375 410.6v114.4c0 20.727 16.793 37.5 37.5 37.5s37.5-16.773 37.5-37.5v-114.4c209.92-19.031 375-195.8 375-410.6z"
      />
    </g>
  </svg>`;
  }

  if (name === "camera") {
    return `<svg width="1155px" height="1004px" viewBox="0 0 1155 1004" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <g fill="#333333" fill-rule="nonzero">
            <g transform="translate(128.324095, 0.000000)">
                <path d="M42.7803063,0.00413459787 C31.4357421,0.00413459787 20.5549853,4.41399115 12.5336107,12.2572687 C4.51223664,20.1005462 0.00420584816,30.741831 0.00420584816,41.8370305 L0.00420584816,251.00151 C-0.156199045,262.200455 4.27736739,272.989996 12.315738,280.963903 C20.3585574,288.938257 31.3288589,293.431222 42.7803063,293.431222 C54.2317532,293.431222 65.2018267,288.938592 73.2448746,280.963903 C81.2832452,272.989549 85.7172445,262.200455 85.5564062,251.00151 L85.5564062,83.6699265 L256.660808,83.6699265 C268.112255,83.8267939 279.145066,79.4909873 287.298762,71.6298611 C295.452913,63.7643845 300.04718,53.0359758 300.04718,41.8370305 C300.04718,30.6380854 295.453255,19.9098998 287.298762,12.0441998 C279.144611,4.18307356 268.112255,-0.153157091 256.660808,0.00413459787 L42.7803063,0.00413459787 Z"></path>
                <path d="M983.227131,710.59444 C971.895913,710.764382 961.099907,715.326799 953.20401,723.279287 C945.312674,731.227538 940.964345,741.91668 941.119476,752.99849 L941.119476,920.330075 L770.015075,920.330075 C758.563631,920.173205 747.530815,924.509015 739.377123,932.370139 C731.222968,940.235615 726.628705,950.964028 726.628705,962.16297 C726.628705,973.361918 731.222627,984.090105 739.377123,991.955802 C747.531272,999.816926 758.563631,1004.15316 770.015075,1003.99587 L983.895579,1003.99587 C995.24014,1003.99587 1006.1209,999.586011 1014.14227,991.742733 C1022.16365,983.899455 1026.67168,973.258169 1026.67168,962.16297 L1026.67168,752.99849 C1026.83208,741.690223 1022.30053,730.801401 1014.11489,722.812989 C1005.93394,714.825472 994.790363,710.415949 983.227131,710.59444 L983.227131,710.59444 Z"></path>
                <path d="M983.227131,375.93127 C971.895913,376.101212 961.099907,380.66363 953.20401,388.61612 C945.312674,396.56437 940.964345,407.253512 941.119476,418.335325 L941.119476,585.66691 C940.959072,596.865853 945.39264,607.655394 953.431008,615.629303 C961.47383,623.603658 972.444131,628.096618 983.895579,628.096618 C995.347023,628.096618 1006.3171,623.603989 1014.36015,615.629303 C1022.39852,607.654947 1026.83251,596.865853 1026.67168,585.66691 L1026.67168,418.335325 C1026.83208,407.027056 1022.30053,396.138232 1014.11489,388.149822 C1005.93394,380.162305 994.790363,375.752783 983.227131,375.93127 L983.227131,375.93127 Z"></path>
                <path d="M769.974012,0.00413459787 C758.522563,-0.152733184 747.489752,4.18307356 739.336055,12.0441998 C731.181906,19.9096767 726.587637,30.6380854 726.587637,41.8370305 C726.587637,53.0359758 731.181564,63.7641611 739.336055,71.6298611 C747.490209,79.4909873 758.522563,83.8272181 769.974012,83.6699265 L941.078414,83.6699265 L941.078414,251.00151 C940.918009,262.200455 945.351572,272.989996 953.389945,280.963903 C961.432763,288.938257 972.403063,293.431222 983.854512,293.431222 C995.30596,293.431222 1006.27603,288.938592 1014.31908,280.963903 C1022.35745,272.989549 1026.79145,262.200455 1026.63061,251.00151 L1026.63061,41.8370305 C1026.63061,30.7426118 1022.12133,20.1017733 1014.10121,12.2572687 C1006.08109,4.41276405 995.199876,0.00413459787 983.854512,0.00413459787 L769.974012,0.00413459787 Z"></path>
                <path d="M427.765208,0.00413459787 C416.31376,-0.152733184 405.280949,4.18307356 397.127256,12.0441998 C388.973102,19.9096767 384.378838,30.6380854 384.378838,41.8370305 C384.378838,53.0359758 388.972761,63.7641611 397.127256,71.6298611 C405.281406,79.4909873 416.31376,83.8272181 427.765208,83.6699265 L598.86961,83.6699265 C610.321058,83.8267939 621.35387,79.4909873 629.507562,71.6298611 C637.661716,63.7643845 642.255985,53.0359758 642.255985,41.8370305 C642.255985,30.6380854 637.662058,19.9098998 629.507562,12.0441998 C621.353413,4.18307356 610.321058,-0.153157091 598.86961,0.00413459787 L427.765208,0.00413459787 Z"></path>
            </g>
            <g transform="translate(0.000000, 427.000000)">
                <path d="M768.516184,22.1826583 C752.659627,13.73125 732.573775,13.73125 717.773442,24.29375 L562.379192,124.6375 L562.379192,31.6875 C562.379192,13.7330104 548.635081,0 530.666079,0 L31.7131123,0 C13.7441105,0 0,13.7330104 0,31.6875 L0,475.3125 C0,493.26699 13.7441105,507 31.7131123,507 L530.666079,507 C548.635081,507 562.379192,493.26699 562.379192,475.3125 L562.379192,382.3625 L717.773442,482.70625 C726.231681,487.9875 735.742444,491.157658 745.257258,491.157658 C753.715498,491.157658 761.113815,489.046567 769.572406,484.820862 C786.485185,475.313732 796,458.414612 796,439.400352 L796,68.6566021 C794.943601,48.5869719 785.428963,31.6878521 768.516184,22.1807219 L768.516184,22.1826583 Z"></path>
            </g>
        </g>
    </g>
</svg>`;
  }

  if (name === "recorderon") {
    return `<svg width="1251px" height="1251px" viewBox="0 0 1251 1251" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <g>
            <circle fill="#E31810" cx="625.5" cy="625.5" r="625.5"></circle>
            <circle fill="#F71008" cx="625" cy="625" r="507"></circle>
            <g transform="translate(175.000000, 449.000000)" fill="#FFFFFF" fill-rule="nonzero">
                <path d="M0,347.097493 L0,4.90250696 L135.528311,4.90250696 C161.471024,4.90250696 183.639743,9.49741034 202.034469,18.6872171 C220.429194,27.8770239 234.46286,40.8541449 244.135466,57.6185803 C253.808072,74.3830156 258.644376,94.0714804 258.644376,116.683975 C258.644376,139.40786 253.724206,158.929238 243.883867,175.248107 C234.043527,191.566976 219.814173,204.070682 201.195803,212.759227 C182.577434,221.447772 160.073248,225.792044 133.683247,225.792044 L42.9396629,225.792044 L42.9396629,167.64563 L121.941933,167.64563 C135.807866,167.64563 147.325536,165.751973 156.494943,161.964659 C165.66435,158.177344 172.51345,152.496373 177.042243,144.921744 C181.571035,137.347116 183.835432,127.934526 183.835432,116.683975 C183.835432,105.322032 181.571035,95.7423543 177.042243,87.9449425 C172.51345,80.1475308 165.636395,74.2159282 156.411077,70.1501349 C147.185759,66.0843416 135.584222,64.051445 121.606467,64.051445 L72.6284142,64.051445 L72.6284142,347.097493 L0,347.097493 Z M185.512762,191.37204 L270.888889,347.097493 L190.712487,347.097493 L107.181424,191.37204 L185.512762,191.37204 Z"></path>
                <polygon points="309.166667 347.097493 309.166667 4.90250696 540.126846 4.90250696 540.126846 64.5527072 381.634607 64.5527072 381.634607 146.091356 528.244113 146.091356 528.244113 205.741556 381.634607 205.741556 381.634607 287.447293 540.796296 287.447293 540.796296 347.097493"></polygon>
                <path d="M901,124.638783 L827.757943,124.638783 C826.420189,115.158428 823.68894,106.709759 819.564197,99.2927757 C815.439454,91.8757921 810.144176,85.5462611 803.678363,80.3041825 C797.212549,75.0621039 789.77129,71.0468948 781.354585,68.2585551 C772.93788,65.4702155 763.824427,64.0760456 754.014228,64.0760456 C736.288981,64.0760456 720.849065,68.4537389 707.69448,77.2091255 C694.539894,85.964512 684.339516,98.6793409 677.093346,115.353612 C669.847176,132.027883 666.224091,152.243346 666.224091,176 C666.224091,200.425856 669.875046,220.948035 677.176956,237.56654 C684.478866,254.185044 694.707113,266.732573 707.861699,275.209125 C721.016285,283.685678 736.233242,287.923954 753.51257,287.923954 C763.21129,287.923954 772.213263,286.641318 780.518488,284.076046 C788.823714,281.510773 796.209233,277.746515 802.675047,272.78327 C809.14086,267.820025 814.519748,261.769328 818.81171,254.631179 C823.103672,247.493029 826.08575,239.351077 827.757943,230.205323 L901,230.539924 C899.104848,246.26616 894.394837,261.406844 886.869968,275.961977 C879.3451,290.51711 869.256201,303.510773 856.603274,314.942966 C843.950346,326.375158 828.900608,335.409379 811.45406,342.045627 C794.007513,348.681876 774.303504,352 752.342035,352 C721.796641,352 694.512024,345.084918 670.488184,331.254753 C646.464343,317.424588 627.512821,297.404309 613.633619,271.193916 C599.754416,244.983523 592.814815,213.252218 592.814815,176 C592.814815,138.636248 599.838026,106.849176 613.884448,80.6387833 C627.93087,54.4283904 646.993871,34.4359949 671.073451,20.661597 C695.153031,6.88719899 722.242559,0 752.342035,0 C772.185393,0 790.607387,2.78833967 807.608016,8.36501901 C824.608646,13.9416984 839.686254,22.0557668 852.840839,32.7072243 C865.995425,43.3586819 876.72533,56.3802281 885.030556,71.7718631 C893.335782,87.1634981 898.65893,104.785805 901,124.638783 Z"></path>
            </g>
        </g>
    </g>
</svg>`;
  }

  if (name === "recorderoff") {
    return `<svg width="1251px" height="1251px" viewBox="0 0 1251 1251" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
          <g class="bb-rec-on-circle" fill="#EEEEEE" fill-rule="nonzero">
              <path d="M625.5,0 C970.954111,0 1251,280.045889 1251,625.5 C1251,970.954111 970.954111,1251 625.5,1251 C280.045889,1251 0,970.954111 0,625.5 C0,280.045889 280.045889,0 625.5,0 Z M626,124 C348.753056,124 124,348.753056 124,626 C124,903.246944 348.753056,1128 626,1128 C903.246944,1128 1128,903.246944 1128,626 C1128,348.753056 903.246944,124 626,124 Z"></path>
          </g>
          <g class="bb-rec-on-cont" fill="#E31810" transform="translate(86.000000, 86.000000)" fill-rule="nonzero">
              <path d="M540,0 C241.2,0 0,241.2 0,540 C0,838.8 241.2,1080 540,1080 C838.8,1080 1080,838.8 1080,540 C1080,241.2 838.8,0 540,0 Z M777.6,741.6 C777.6,761.998 761.998,777.6 741.6,777.6 L338.4,777.6 C318.002,777.6 302.4,761.998 302.4,741.6 L302.4,338.4 C302.4,318.002 318.002,302.4 338.4,302.4 L741.6,302.4 C761.998,302.4 777.6,318.002 777.6,338.4 L777.6,741.6 Z"></path>
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
