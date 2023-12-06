import GleapFeedbackButtonManager from "./GleapFeedbackButtonManager";

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

export const widgetMaxHeight = 660;

export const injectStyledCSS = (
  primaryColor,
  headerColor,
  buttonColor,
  borderRadius,
  backgroundColor,
  buttonX,
  buttonY,
  buttonStyle
) => {
  const contrastColor = calculateContrast(primaryColor);
  const contrastButtonColor = calculateContrast(buttonColor);
  const contrastBackgroundColor = calculateContrast(backgroundColor);
  const contrastHeaderColor = calculateContrast(headerColor);
  const isDarkMode = contrastBackgroundColor === "#ffffff";
  const headerDarkColor = calculateShadeColor(
    headerColor,
    contrastHeaderColor === "#ffffff" ? -35 : -15
  );
  const subTextColor = isDarkMode
    ? calculateShadeColor(backgroundColor, 100)
    : calculateShadeColor(backgroundColor, -120);
  const backgroundColorHover = isDarkMode
    ? calculateShadeColor(backgroundColor, 30)
    : calculateShadeColor(backgroundColor, -12);
  const hoverHoverColor = isDarkMode
    ? calculateShadeColor(backgroundColor, 80)
    : calculateShadeColor(backgroundColor, -30);

  var borderRadius = parseInt(borderRadius, 10);
  const buttonBorderRadius = Math.round(borderRadius * 1.05);
  const containerRadius = Math.round(borderRadius * 0.8);
  const chatRadius = Math.round(borderRadius * 0.6);
  const formItemBorderRadius = Math.round(borderRadius * 0.4);
  const formItemSmallBorderRadius = Math.round(borderRadius * 0.25);
  const zIndexBase = 2147483600;

  var bottomInfoOffset = 57 + buttonY;
  if (
    buttonStyle === GleapFeedbackButtonManager.FEEDBACK_BUTTON_CLASSIC_BOTTOM
  ) {
    bottomInfoOffset = buttonY + 15;
  } else if (buttonStyle && buttonStyle.includes("CLASSIC")) {
    bottomInfoOffset = buttonY;
  } else if (buttonStyle === GleapFeedbackButtonManager.FEEDBACK_BUTTON_NONE) {
    bottomInfoOffset = buttonY;
  }

  const colorStyleSheet = `
    .gleap-font, .gleap-font * {
      font-style: normal;
      font-variant-caps: normal;
      font-variant-ligatures: normal;
      font-variant-numeric: normal;
      font-variant-east-asian: normal;
      font-weight: normal;
      font-stretch: normal;
      font-size: 100%;
      line-height: 1;
      font-family: system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
    }
    .gleap-frame-container {
      right: ${buttonX}px;
      bottom: ${61 + buttonY}px;
      width: calc(100% - 40px);
      max-width: 400px;
      position: fixed;
      z-index: ${zIndexBase + 31};
      visibility: visible;
      box-shadow: 0px 5px 30px rgba(0, 0, 0, 0.16);
      border-radius: ${containerRadius}px;
      overflow: hidden;
      animation-duration: .3s;
      animation-fill-mode: both;
      animation-name: gleapFadeInUp;
      user-select: none;
      pointer-events: none;
      transition: max-width 0.3s ease-out;
    }

    :root {
      --gleap-margin-top: 50px;
    }

    .gleap-b-frame {
      width: 100%;
      height: 100%;
      border: none;
      pointer-events: auto;
      padding: 0px;
      margin: 0px;
    }

    .gleap-b-shown {
      transition: margin 0.3s ease-out;
      margin-top: var(--gleap-margin-top);
      position: relative;
      z-index: 10000;
    }

    .gleap-b-f {
      margin-top: 0px;
    }

    .gleap-b {
      display: none;
      position: absolute;
      top: calc(-1 * var(--gleap-margin-top));
      left: 0px;
      width: 100vw;
      height: var(--gleap-margin-top);
    }

    @keyframes gleapSlideIn {
      from {
          top: calc(-1 * var(--gleap-margin-top));
      }
      to {
          top: 10px;
      }
    }

    .gleap-b-f .gleap-b {
      position: fixed;
      top: 10px;
      animation: gleapSlideIn .25s ease-out forwards;
      max-width: 800px;
      width: calc(100% - 20px);
      left: 50%;
      z-index: ${zIndexBase + 99};
      transform: translateX(-50%);
      border-radius: ${formItemBorderRadius}px;
      overflow: hidden;
      box-shadow: 0px 10px 20px rgba(0, 0, 0, 0.15), 0px 5px 5px rgba(0, 0, 0, 0.05);
    }

    .gleap-b-shown .gleap-b {
      display: block;
    }

    .gleap-image-view {
      position: fixed;
      top: 0px;
      left: 0px;
      width: 100vw;
      height: 100vh;
      z-index: ${zIndexBase + 99};
      background-color: ${contrastBackgroundColor}cc;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .gleap-image-view-image {
      width: 90%;
      height: auto;
      max-width: 90%;
      max-height: 90%;
      object-fit: contain;
    }

    .gleap-image-view-close {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 32px;
      height: 32px;
      opacity: 0.8;
      z-index: ${zIndexBase + 140};
      box-shadow: 0px 5px 18px rgba(0, 0, 0, 0.16);
      cursor: pointer;
    }

    .gleap-image-view-close:hover {
      opacity: 1;
    }

    .gleap-image-view-close svg path {
      fill: ${backgroundColor};
    }

    [dir=rtl].gleap-frame-container {
      right: auto;
      left: ${buttonX}px;
      bottom: ${61 + buttonY}px;
    }

    .gleap-frame-container--loading iframe {
      opacity: 0;
    }

    .gleap-frame-container--loading::before {
      content: " ";
      position: fixed;
      top: 0px;
      left: 0px;
      right: 0px;
      height: 100%;
      max-height: 380px;
      background: linear-gradient(
        130deg,
        ${headerDarkColor} 0%,
        ${headerColor} 100%
      );
    }
    
    .gleap-frame-container--loading::after {
      content: " ";
      position: fixed;
      top: 0px;
      left: 0px;
      right: 0px;
      height: 100%;
      height: 100%;
      max-height: 380px;
      background: linear-gradient(
        180deg,
        transparent 60%,
        ${backgroundColor}1A 70%,
        ${backgroundColor} 100%
      );
    }

    .gleap-frame-container--loading-nogradient::before {
      max-height: 340px;
      background: ${headerColor} !important;
    }

    .gleap-frame-container--loading-nofade::after {
      display: none !important;
    }

    .gleap-frame-container--survey {
      bottom: ${buttonY}px !important;
    }

    .gleap-frame-container--extended {
      max-width: 690px !important;
    }

    .gleap-frame-container--survey-full {
      position: fixed;
      top: 0 !important;
      left: 0 !important;
      bottom: 0 !important;
      right: 0 !important;
      width: 100vw !important;
      max-width: 100vw !important;
      height: 100vh !important;
      background-color: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(6px);
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      max-height: 100vh !important;
      border-radius: 0 !important;
      animation-name: none !important;
    }

    .gleap-frame-container--survey-full .gleap-frame-container-inner {
      max-width: 640px !important;
      width: calc(100% - 24px);
      border-radius: ${containerRadius}px;
      overflow: hidden;
    }

    .gleap-frame-container--classic {
      right: ${buttonX}px;
      bottom: ${buttonY}px;
    }

    [dir=rtl].gleap-frame-container--classic {
      right: auto;
      left: ${buttonX}px;
      bottom: ${buttonY}px;
    }

    .gleap-frame-container--no-button {
      bottom: ${buttonY}px;
    }

    [dir=rtl].gleap-frame-container--classic-left {
      bottom: ${buttonY}px;
    }

    .gleap-frame-container--classic-left {
      right: auto;
      left: ${buttonX}px;
      bottom: ${buttonY}px;
    }

    [dir=rtl].gleap-frame-container--classic-left {
      left: auto;
      right: ${buttonX}px;
      bottom: ${buttonY}px;
    }

    .gleap-frame-container--modern-left {
      right: auto;
      left: ${buttonX}px;
      bottom: ${61 + buttonY}px;
    }

    [dir=rtl].gleap-frame-container--modern-left {
      left: auto;
      right: ${buttonX}px;
      bottom: ${61 + buttonY}px;
    }

    .gleap-frame-container--animate {
      pointer-events: auto !important;
    }

    @keyframes gleapFadeInUp {
      from {
          opacity: 0;
          transform: translate3d(0, 100%, 0);
      }
      to {
          opacity: 1;
          transform: translate3d(0, 0, 0);
      }
    }

    @keyframes gleapFadeInUpMobile {
      from {
          opacity: 0;
          transform: translate3d(0, 10%, 0);
      }
      to {
          opacity: 1;
          transform: translate3d(0, 0, 0);
      }
    }

    .gleap-notification-container {
      position: fixed;
      bottom: ${bottomInfoOffset}px;
      right: ${buttonX}px;
      z-index: ${zIndexBase + 30};
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      width: 100%;
      max-width: min(340px, 80vw);
    }

    .gleap-notification-container--left {
      left: ${4 + buttonX}px;
      right: initial !important;
    }

    .gleap-notification-container--no-button {
      bottom: ${buttonY}px;
    }

    .gleap-notification-item {
      animation-duration: 0.7s;
      animation-fill-mode: both;
      animation-name: bbFadeInOpacity;
    }

    .gleap-notification-close {
      border-radius: 100%;
      width: 28px;
      height: 28px;
      background-color: ${subTextColor};
      display: flex;
      justify-content: center;
      align-items: center;
      margin-bottom: 8px;
      cursor: pointer;
      visibility: hidden;
      pointer-events: none;
    }

    .gleap-notification-container:hover .gleap-notification-close {
      visibility: visible;
      pointer-events: auto;
      animation-duration: 0.7s;
      animation-fill-mode: both;
      animation-name: bbFadeInOpacity;
    }

    @media only screen and (max-width: 450px) {
      .gleap-notification-close {
        visibility: visible;
        pointer-events: auto;
        animation-duration: 0.7s;
        animation-fill-mode: both;
        animation-name: bbFadeInOpacity;
      }
    }

    .gleap-notification-close svg {
      width: 45%;
      height: 45%;
      object-fit: contain;
      fill: ${backgroundColor};
    }

    .gleap-notification-item-checklist-container {
      display: flex;
      animation: fadeIn;
      animation-duration: .45s;
      background-color: ${backgroundColor};
      border-radius: ${subTextColor};
      box-sizing: border-box;
      cursor: pointer;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0px 5px 30px rgba(0, 0, 0, 0.2);
      border-radius: ${chatRadius}px;
      margin-bottom: 12px;
    }

    .gleap-notification-item-checklist-content {
      align-items: flex-start;
      display: flex;
      flex-direction: column;
      padding: 15px;
      width: 100%;
      width: min(310px, 70vw);
      max-width: min(310px, 70vw);
    }

    .gleap-notification-item-checklist-content-title {
      color: ${contrastBackgroundColor};
      font-size: 15px;
      font-weight: 500;
      line-height: 21px;
      margin-bottom: 10px;
      max-width: 100%;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .gleap-notification-item-checklist-content-progress {
      width: 100%;
      height: 8px;
      border-radius: 8px;
      background-color: ${backgroundColorHover};
    }

    .gleap-notification-item-checklist-content-progress-inner {
      height: 100%;
      border-radius: 8px;
      background-color: ${primaryColor};
    }

    .gleap-notification-item-checklist-content-next {
      color: ${subTextColor};
      font-size: 15px;
      font-weight: normal;
      line-height: 21px;
      margin-top: 10px;
      max-width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: flex;
      align-items: center;
    }

    .gleap-notification-item-checklist-content-next svg {
      height: 18px;
      margin-right: 5px;
      width: auto;
    }

    .gleap-notification-item-checklist-content-next b {
      font-size: 15px;
      font-weight: normal;
      color: ${contrastBackgroundColor};
    }

    .gleap-notification-item-news {
      width: 100%;
      cursor: pointer;
    }

    .gleap-notification-item-news-content {
      align-items: flex-start;
      display: flex;
      flex-direction: column;
      padding: 15px;
    }

    .gleap-notification-item-news-preview {
      color: ${subTextColor};
      font-size: 15px;
      line-height: 21px;
      font-weight: 400;
      overflow-wrap: break-word;
      word-break: break-word;
      display: block;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .gleap-notification-item-news-sender {
      display: flex;
      align-items: center;
      color: ${subTextColor};
      font-size: 15px;
      line-height: 21px;
      font-weight: 400;
    }

    .gleap-notification-item-news-content-title {
      color: ${contrastBackgroundColor};
      font-size: 15px;
      font-weight: 500;
      line-height: 21px;
      margin-bottom: 6px;
      max-width: 100%;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .gleap-notification-item-news-sender img {
      border-radius: 100%;
      height: 20px;
      margin-right: 8px;
      object-fit: cover;
      width: 20px;
    }

    .gleap-notification-item-news-container {
      display: flex;
      animation: fadeIn;
      animation-duration: .45s;
      background-color: ${backgroundColor};
      border-radius: ${subTextColor};
      box-sizing: border-box;
      cursor: pointer;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0px 5px 30px rgba(0, 0, 0, 0.2);
      border-radius: ${chatRadius}px;
      margin-bottom: 12px;
    }

    .gleap-notification-item-news-image {
      background-color: ${subTextColor};
      height: 170px;
      object-fit: cover;
      width: 100%;
    }

    .gleap-notification-item-news:hover .gleap-notification-item-news-content-title {
      color: ${primaryColor};
    }

    .gleap-notification-item {
      display: flex;
      align-items: flex-end;
      cursor: pointer;
    }

    .gleap-notification-item img {
      width: 32px;
      height: 32px;
      min-width: 32px;
      border-radius: 100%;
      object-fit: cover;
      margin-right: 8px;
      margin-bottom: 12px;
      cursor: pointer;
    }

    .gleap-notification-item-container {
      box-shadow: 0px 5px 30px rgba(0, 0, 0, 0.2);
      border-radius: ${chatRadius}px;
      border-bottom-left-radius: 0px;
      padding: 20px;
      background-color: ${backgroundColor};
      margin-bottom: 12px;
      cursor: pointer;
      font-size: 15px;
      line-height: 21px;
      color: ${contrastBackgroundColor};
      position: relative;
    }

    .gleap-notification-item-container::after {
      content: " ";
      position: absolute;
      bottom: 0px;
      width: 0px;
      height: 0px;
      left: -6px;
      border-style: solid;
      border-width: 0px 0px 10px 6px;
      border-color: transparent transparent ${backgroundColor};
    }

    .gleap-notification-item-sender {
      color: ${subTextColor};
      line-height: 20px;
    }

    .gleap-notification-item-content {
      line-height: 20px;
      color: ${contrastBackgroundColor};
      margin-top: 4px;
      min-width: min(200px, 50vw);
      word-wrap: break-word;
      word-break: break-word;
    }

    .gleap-frame-container-inner {
      position: relative;
      width: 100%;
      height: calc(100vh - ${130 + buttonY}px);
      max-height: ${widgetMaxHeight}px;
    }

    .gleap-frame-container--survey .gleap-frame-container-inner {
      height: calc(100vh - 40px);
    }
    
    .gleap-frame-container-inner:before {
      content: " ";
      position: absolute;
      width: 100%;
      height: calc(100% - ${containerRadius}px);
      top: ${containerRadius}px;
      background-color: ${backgroundColor};
      z-index: -1;
    }
    
    .gleap-frame-container iframe {
      height: 100% !important;
      width: 100% !important;
      max-width: 100% !important;
      display: block;
      pointer-events: auto;
    }
    
    .gleap-frame-container--hidden {
      display: none !important;
      pointer-events: none;
      animation: none !important;
    }
    
    .bb-feedback-button {
      margin: 0px;
      position: fixed;
      bottom: ${buttonY}px;
      right: ${buttonX}px;
      border-radius: 30px;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      background-color: transparent;
      color: #000000;
      z-index: ${zIndexBase + 30};
      box-sizing: border-box;
      display: flex;
      align-items: center;
      padding: 0px;
    }

    [dir=rtl].bb-feedback-button {
      bottom: ${buttonY}px;
      right: auto;
      left: ${buttonX}px;
    }
    
    .bb-feedback-button--bottomleft {
      bottom: ${buttonY}px;
      right: auto;
      left: ${buttonX}px;
    }

    [dir=rtl].bb-feedback-button--bottomleft {
      bottom: ${buttonY}px;
      right: ${buttonX}px;
      left: auto;
    }
    
    .bb-feedback-button--disabled {
      display: none !important;
    }

    .bb-feedback-button--hidden {
      display: none !important;
    }
    
    .bb-feedback-button-text {
      padding: 8px 12px;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
      background-color: #fff;
      border-radius: 8px;
      box-shadow: 0px 0px 14px 0px rgba(0, 0, 0, 0.15);
      position: relative;
      z-index: 99;
    }
    
    .bb-feedback-button-text:before {
      content: "";
      position: absolute;
      box-shadow: rgba(0, 0, 0, 0.04) 6px 6px 5px;
      transform: rotate(315deg);
      bottom: 16px;
      right: -4px;
      border-width: 10px;
      border-style: solid;
      border-color: transparent #fff #fff transparent;
    }
    
    .bb-feedback-button--bottomleft .bb-feedback-button-text:before {
      display: none;
    }
    
    .bb-feedback-button-text:after {
      content: "";
      position: absolute;
      bottom: 12px;
      right: 0px;
      background-color: #fff;
      width: 5px;
      height: 30px;
    }
    
    .bb-feedback-button-text-title {
      font-family: sans-serif;
      font-size: 14px;
      color: #666;
      line-height: 18px;
      max-width: 220px;
    }
    
    .bb-feedback-button-text-title b {
      color: #000000;
      font-weight: 600;
    }

    .bb-notification-bubble {
      position: absolute;
      top: -6px;
      right: -6px;
      min-width: 22px;
      padding: 0px 4px;
      height: 22px;
      border-radius: 22px;
      background-color: red;
      color: #fff;
      font-size: 12px;
      font-family: sans-serif;
      text-align: center;
      line-height: 22px;
    }

    .bb-notification-bubble--hidden {
      display: none;
    }
    
    .bb-feedback-button-icon {
      width: 48px;
      height: 48px;
      border-radius: 48px;
      background-color: #485bff;
      transition: box-shadow, transform 0.2s ease-in-out;
      box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.15), 0px 0px 20px rgba(0, 0, 0, 0.1);
      position: relative;
    }
    
    .bb-feedback-button-classic {
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      top: 50%;
      right: 0px;
      position: fixed;
      transform: rotate(-90deg) translate(50%, -50%);
      transform-origin: 100% 50%;
      padding: 9px 20px;
      text-align: center;
      background-color: #485bff;
      border-top-left-radius: 8px;
      border-top-right-radius: 8px;
      font-family: sans-serif;
      font-size: 16px;
      color: #fff;
      box-shadow: 0px 0px 14px 0px rgba(0, 0, 0, 0.25);
    }

    [dir=rtl].bb-feedback-button .bb-feedback-button-classic {
      top: 50%;
      left: 0px;
      right: auto;
      transform: rotate(90deg) translate(-50%, -100%);
      transform-origin: 0% 0%;
    }
    
    .bb-feedback-button-classic--left {
      top: 50%;
      left: 0px;
      right: auto;
      transform: rotate(90deg) translate(-50%, -100%);
      transform-origin: 0% 0%;
    }

    [dir=rtl].bb-feedback-button .bb-feedback-button-classic--left {
      top: 50%;
      right: 0px;
      left: auto;
      transform: rotate(-90deg) translate(50%, -50%);
      transform-origin: 100% 50%;
    }
    
    .bb-feedback-button-classic--bottom {
      top: auto;
      bottom: 0px;
      transform: none;
      right: ${buttonX}px;
      left: auto;
    }
    
    [dir=rtl].bb-feedback-button .bb-feedback-button-classic--bottom {
      top: auto;
      bottom: 0px;
      transform: none;
      left: ${buttonX}px;
      right: auto;
    }

    .bb-feedback-button--classic-button-style {
      animation-duration: 0.2s;
      animation-fill-mode: both;
      animation-name: bbFadeInOpacity;
    }
    
    .bb-feedback-button--open.bb-feedback-button--classic-button-style {
      animation-duration: 0.2s;
      animation-fill-mode: both;
      animation-name: bbFadeOutRight;
    }
    
    .bb-feedback-button .bb-logo-logo {
      position: absolute;
      width: 30px;
      height: 30px;
      top: 9px;
      left: 9px;
      object-fit: contain;
      animation-duration: 0.3s;
      animation-fill-mode: both;
      animation-name: bbZoomIn;
    }
    
    .bb-feedback-button .bb-logo-arrowdown {
      position: absolute;
      width: 14px;
      height: 14px;
      top: 17px;
      left: 17px;
      object-fit: contain;
      animation-duration: 0.3s;
      animation-fill-mode: both;
    }
    
    .bb-feedback-button .bb-logo-arrowdown {
      animation-name: bbZoomOut;
    }
    
    .bb-feedback-button--open .bb-logo-arrowdown {
      animation-name: bbZoomIn;
    }
    
    .bb-feedback-button--open .bb-logo-logo {
      animation-name: bbZoomOut;
    }
    
    .bb-feedback-button-icon:hover {
      box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.25), 0px 0px 20px rgba(0, 0, 0, 0.2);
      transform: scale(1.1);
    }
    
    .bb-feedback-button--open .bb-feedback-button-text {
      animation-name: bbFadeOutDown;
    }
    
    .bb-feedback-button--open .bb-feedback-button-icon {
      display: flex;
    }
    
    .bb-capture-svg {
      position: fixed;
      z-index: ${zIndexBase + 14};
      top: 0px;
      left: 0px;
      right: 0px;
      width: 100%;
      height: 100%;
      padding: 0px;
      margin: 0px;
      cursor: crosshair;
    }

    .bb-capture-svg--preview {
      cursor: auto !important;
    }
    
    .bb-rec-on-circle {
      animation-name: bbRecIconFade;
      animation-duration: 2s;
      animation-iteration-count: infinite;
      animation-direction: alternate;
    }
    
    .bb-rec-on-cont {
      animation-name: bbRecIconContFade;
      animation-duration: 2s;
      animation-iteration-count: infinite;
      animation-direction: alternate;
    }
    
    .bb-capture-editor-drag-info {
      position: fixed;
      top: -200px;
      left: 0px;
      z-index: ${zIndexBase + 16};
      transition: opacity 0.3s ease-in-out;
    }
    
    .bb-capture-editor-drag-info svg {
      width: 24px;
      height: 24px;
    }
    
    .bb-capture-editor-borderlayer {
      position: fixed;
      top: 0px;
      left: 0px;
      width: 100vw;
      height: 100vh;
      border: 4px solid ${primaryColor};
      cursor: crosshair;
      z-index: ${zIndexBase + 10};
      box-sizing: border-box;
      pointer-events: none;
    }
    
    .bb-capture-editor-notrecording .bb-capture-editor-borderlayer {
      background-color: rgba(0, 0, 0, 0.8);
    }

    .bb-capture-editor-recording .bb-capture-editor-borderlayer {
      border: 4px solid #eb144c !important;
    }
    
    .bb-capture-editor-recording .bb-capture-dismiss {
      display: none;
    }
    
    .bb-capture-editor-item-inactive {
      opacity: 0.3;
      cursor: not-allowed !important;
    }
    
    .bb-capture-editor-notrecording .bb-capture-toolbar-drawingitem {
      opacity: 0.3;
      cursor: not-allowed !important;
    }
    
    .bb-capture-editor-notrecording .bb-capture-editor-drag-info {
      display: none;
    }
    
    .bb-capture-editor-notrecording .bb-capture-svg {
      pointer-events: none !important;
    }
    
    .bb-capture-toolbar {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: ${zIndexBase + 18};
      background-color: #fff;
      padding: 5px;
      display: flex;
      align-items: center;
      border-radius: 8px;
      box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.15), 0px 0px 20px rgba(0, 0, 0, 0.1);
      transition: opacity 0.3s ease-in-out;
    }
    
    .bb-capture-dismiss {
      position: fixed;
      top: 0px;
      right: 0px;
      z-index: ${zIndexBase + 18};
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      width: 36px;
      height: 36px;
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: ${primaryColor};
      border-bottom-left-radius: ${formItemSmallBorderRadius}px;
    }

    [dir=rtl] .bb-capture-dismiss {
      top: 0px;
      left: 0px;
      right: auto;
      border-bottom-left-radius: 0px !important;
      border-bottom-right-radius: ${formItemSmallBorderRadius}px;
    }
    
    .bb-capture-dismiss svg path {
      fill: ${contrastColor};
    }
    
    .bb-capture-dismiss svg {
      width: 20px;
      height: 20px;
      object-fit: contain;
    }
    
    .bb-capture-button-next {
      font-family: sans-serif;
      box-sizing: border-box;
      font-weight: 600;
      text-align: center;
      width: auto;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      margin: 0px;
      line-height: 36px;
      padding: 0px 12px;
      font-size: 15px;
      margin-left: 12px;
    }

    [dir=rtl].bb-capture-editor .bb-capture-button-next {
      margin-left: auto;
      margin-right: 12px;
    }
    
    .bb-capture-toolbar-item-spacer {
      width: 1px;
      height: 38px;
      min-width: 1px;
      margin: 0px 5px;
    }
    
    .bb-capture-toolbar-item {
      width: 42px;
      height: 38px;
      min-width: 42px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      position: relative;
      margin-right: 5px;
    }
    
    .bb-capture-toolbar-item svg {
      width: 23px;
      height: 23px;
      object-fit: contain;
    }
    
    .bb-capture-toolbar-item-selectedcolor {
      border-radius: 100%;
      width: 20px;
      height: 20px;
      background-color: #db4035;
    }
    
    .bb-capture-toolbar-item[data-type="undo"] svg {
      width: 18px;
      height: 18px;
    }
    
    .bb-capture-toolbar-item[data-active="true"] {
      position: relative;
    }
    
    .bb-capture-preview {
      display: none;
      background-color: rgba(0, 0, 0, 0.6);
      position: fixed;
      top: 0px;
      left: 0px;
      width: 100vw;
      height: 100vh;
      justify-content: center;
      align-items: center;
      z-index: ${zIndexBase + 20};
    }
    
    .bb-capture-preview-inner {
      background-color: #fff;
      padding: 0px;
      box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.15), 0px 0px 20px rgba(0, 0, 0, 0.1);
      border-radius: 8px;
      flex-direction: column;
      max-width: 640px;
      width: 100%;
      margin: 20px;
    }
    
    .bb-capture-preview-inner video {
      border-radius: 8px 8px 0px 0px;
      display: block;
      border: 0px;
      outline: none;
      width: 100%;
      max-height: 60vh;
    }
    
    .bb-capture-preview-buttons {
      display: flex;
      justify-content: space-between;
      padding: 14px;
    }
    
    .bb-capture-preview-retrybutton {
      font-family: sans-serif;
      border-radius: 21px;
      box-sizing: border-box;
      padding: 12px 26px;
      font-size: 16px;
      line-height: 19px;
      font-weight: 600;
      text-align: center;
      margin-top: 0px;
      margin-bottom: 0px;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    
    .bb-capture-preview-sendbutton {
      font-family: sans-serif;
      border-radius: 21px;
      box-sizing: border-box;
      padding: 12px 26px;
      font-size: 16px;
      line-height: 19px;
      font-weight: 600;
      text-align: center;
      margin-top: 0px;
      margin-bottom: 0px;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    
    .bb-capture-preview-retrybutton:hover,
    .bb-capture-preview-sendbutton:hover {
      opacity: 0.9;
    }
    
    .bb-capture-toolbar-item-recording {
      margin-right: 0px;
    }
    
    .bb-capture-toolbar-item-recording svg {
      width: 33px;
      height: 33px;
    }
    
    .bb-capture-toolbar-item-colorpicker {
      position: fixed;
      top: 70px;
      left: 50%;
      transform: translateX(-50%);
      z-index: ${zIndexBase + 18};
      background-color: #fff;
      display: none;
      padding: 10px;
      box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.15), 0px 0px 20px rgba(0, 0, 0, 0.1);
      border-radius: 8px;
    }
    
    .bb-capture-toolbar-item-color {
      width: 20px;
      height: 20px;
      border-radius: 100%;
      margin-right: 12px;
      box-shadow: 0px 0px 3px rgba(0, 0, 0, 0.15);
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    
    .bb-capture-toolbar-item-color:hover {
      box-shadow: 0px 0px 6px rgba(0, 0, 0, 0.25);
    }
    
    .bb-capture-toolbar-item-color:last-of-type {
      margin-right: 0px;
    }
    
    [dir=rtl].bb-capture-editor .bb-capture-toolbar-item-color {
      margin-right: auto;
      margin-left: 12px;
    }
    
    [dir=rtl].bb-capture-editor .bb-capture-toolbar-item-color:last-of-type {
      margin-right: auto;
      margin-left: 0px;
    }
    
    .bb-capture-toolbar-item-recording[data-active="true"] svg:first-of-type {
      display: none;
    }
    
    .bb-capture-toolbar-item-recording[data-active="true"] svg:nth-of-type(2) {
      display: block;
    }
    
    .bb-capture-toolbar-item-recording[data-active="false"] svg:first-of-type {
      display: block;
    }
    
    .bb-capture-toolbar-item-recording[data-active="false"] svg:nth-of-type(2) {
      display: none;
    }
    
    .bb-capture-toolbar-item--active {
      background-color: #eee;
    }
    
    .bb-capture-toolbar-item:hover svg {
      opacity: 1;
    }
    
    .bb-capture-toolbar-item--active {
      background-color: #f8f8f8;
    }
    
    .bb-capture-toolbar-item--active svg {
      opacity: 1;
    }
    
    .bb-capture-toolbar-item--inactivecross::before {
      content: "";
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      height: 3px;
      width: 26px;
      margin: auto;
      border-radius: 4px;
      background-color: #e80000;
      transform: rotate(45deg);
    }
    
    .bb-capture-toolbar-item--inactivecross svg {
      fill: #eee;
    }
    
    .bb-capture-toolbar-item-timer {
      text-align: left;
      line-height: 32px;
      font-size: 14px;
      font-family: sans-serif;
      margin: 5px;
      min-width: 40px;
      display: none;
    }
    
    .bb-capture-toolbar-item .bb-tooltip {
      background-color: #555;
      color: #fff;
      visibility: hidden;
      font-size: 14px;
      font-family: sans-serif;
      text-align: center;
      padding: 5px 10px;
      position: absolute;
      z-index: 1;
      top: 45px;
      left: 0px;
      transform: translateX(calc(-50% + 21px));
      opacity: 0;
      transition: opacity 0.3s;
      white-space: nowrap;
    }
    
    .bb-capture-toolbar-item .bb-tooltip::after {
      content: "";
      position: absolute;
      bottom: 100%;
      left: 50%;
      margin-left: -5px;
      border-width: 5px;
      border-style: solid;
      transform: rotate(180deg);
      border-color: #555 transparent transparent transparent;
    }
    
    .bb-capture-toolbar-item:hover .bb-tooltip {
      visibility: visible;
      opacity: 1;
    }
    
    .bb-capture-options {
      display: none;
    }
    
    .bb-capture-options--active {
      display: flex;
    }

    @keyframes bbFadeOutRight {
      from {
        opacity: 1;
      }
    
      to {
        opacity: 0;
      }
    }
    
    @keyframes bbFadeOutDown {
      from {
        opacity: 1;
      }
    
      to {
        opacity: 0;
        transform: translate3d(0, 100%, 0);
      }
    }
    
    @keyframes bbFadeInOpacity {
      from {
        opacity: 0;
      }
    
      to {
        opacity: 1;
      }
    }
    
    @keyframes bbZoomOut {
      from {
        opacity: 1;
      }
    
      50% {
        opacity: 0;
        transform: scale3d(0.3, 0.3, 0.3);
      }
    
      to {
        opacity: 0;
      }
    }
    
    @keyframes bbZoomIn {
      from {
        opacity: 0;
        transform: scale3d(0.3, 0.3, 0.3);
      }
    
      50% {
        opacity: 1;
      }
    }
    
    @keyframes bbRecIconContFade {
      0% {
        fill: #b10802;
      }
      50% {
        fill: #ff0000;
      }
      100% {
        fill: #b10802;
      }
    }  
    .bb-capture-preview-retrybutton {
      color: ${contrastBackgroundColor};
      border-radius: ${buttonBorderRadius}px;
      background-color: ${backgroundColorHover};
    }
    .bb-capture-preview-retrybutton:hover {
      background-color: ${hoverHoverColor};
    }
    @keyframes bb-suc-fill {
      100% {
        box-shadow: inset 0px 0px 0px 30px ${primaryColor};
      }
    }
    .bb-capture-toolbar-item-spacer {
      background-color: ${backgroundColorHover};
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
    .bb-capture-preview-inner {
      background-color: ${backgroundColor};
      border-radius: ${formItemBorderRadius}px;
    }
    .bb-capture-toolbar-item-timer {
      color: ${subTextColor};
    }
    .bb-svg-path {
      fill: ${contrastBackgroundColor};
    }
    .bb-capture-toolbar-item {
      border-radius: ${formItemBorderRadius}px;
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
    .bb-feedback-button-classic {
      border-top-left-radius: ${formItemBorderRadius}px;
      border-top-right-radius: ${formItemBorderRadius}px;
    }
    .bb-logo-logo--default path {
      fill: ${contrastButtonColor};
    }
    .bb-logo-arrowdown {
      fill: ${contrastButtonColor};
    }
    .bb-feedback-button-icon {
        background-color: ${buttonColor};
    }
    .bb-feedback-button-classic {
      background-color: ${buttonColor};
      color: ${contrastButtonColor};
    }

    @media only screen and (max-width: 450px) {
      .gleap-frame-container {
        left: 0px;
        right: 0px;
        width: 100vw;
        max-width: 100vw;
        min-height: 100vh;
        min-height: -webkit-fill-available;
        top: 0px;
        bottom: 0px;
        border-radius: 0px;
        animation-name: gleapFadeInUpMobile;
      }

      .gleap-frame-container-inner {
        width: 100vw;
        height: 100%;
      }

      .gleap-frame-container:not(.gleap-frame-container--survey):not(.gleap-frame-container--survey-full) .gleap-frame-container-inner {
        max-height: initial !important;
      }

      .gleap-frame-container--survey {
        height: auto !important;
        top: initial !important;
        bottom: 0px !important;
        min-height: initial !important;
      }

      .gleap-frame-container--survey .gleap-frame-container-inner {
        height: 100vh !important;
      }

      .bb-tooltip {
        display: none !important;
      }
    
      .bb-capture-toolbar-item-colorpicker {
        top: 75px;
      }
    
      .bb-capture-button-next {
        margin-left: auto;
      }
    
      .bb-capture-dismiss {
        display: none;
      }
    
      .bb-capture-toolbar {
        top: 15px;
        right: 15px;
        left: 15px;
        width: auto;
        transform: none;
      }

      .bb-capture-editor-drag-info {
        display: none;
      }
    
      .bb-capture-editor-borderlayer {
        border-width: 4px;
      }
    }
    
    @media print {
      .bb-feedback-button {
        display: none !important;
      }
      
      .gleap-frame-container {
        display: none !important;
      }
    }

    .gleap-tour-sender {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      margin-bottom: 20px;
    }

    .gleap-tour-sender-image {
      width: 32px;
      height: 32px;
      border-radius: 32px;
      margin-right: 10px;
      background-size: cover;
      background-repeat: no-repeat;
    }

    .gleap-tour-popover.gleap-tour-popover-post {
      min-width: 550px;
      max-width: 550px;
    }

    @media only screen and (max-width: 450px) {
      .gleap-tour-popover.gleap-tour-popover-post {
        min-width: calc(100vw - 40px);
        max-width: calc(100vw - 40px);
      }
    }

    .gleap-tour-message,
    .gleap-tour-message p,
    .gleap-tour-message ul {
      color: ${contrastBackgroundColor};
    }

    .gleap-tour-message p {
      line-height: 1.3;
    }

    .gleap-tour-message ul {
      line-height: 1.3;
      padding-left: 20px;
      margin-top: 10px;
      margin-bottom: 10px;
    }

    .gleap-tour-message {
      max-height: calc(80vh - 100px) !important;
      overflow-y: auto;
      min-width: 270px;
    }

    .gleap-tour-message iframe {
      width: 100%;
      height: 300px;
      margin-top: 10px;
      margin-bottom: 10px;
    }

    .gleap-tour-sender-name {
      font-size: 15px;
    }

    .gleap-tour-video {
      width: 100%;
      max-width: 100%;
    }

    .gleap-tour-video--playing .gleap-tour-video-playpause {
      opacity: 0;
    }
    
    .gleap-tour-video--playing:hover .gleap-tour-video-playpause {
      opacity: 1;
    }

    .gleap-tour-popover-video-pointer {
      padding: 0px !important;
      border-radius: 8px;
      position: relative;
      background-color: transparent !important;
    }

    .gleap-tour-popover-video-pointer .gleap-tour-popover-footer {
      position: absolute;
      top: 0px;
      left: 20px;
      right: 20px;
      opacity: 0;
      transition: opacity 200ms ease-in-out;
    }

    .gleap-tour-popover-video-pointer .gleap-tour-popover-footer button {
      padding: 5px 12px;
    }

    .gleap-tour-popover-video-pointer.gleap-tour-popover-can-close .gleap-tour-popover-footer {
      right: 40px !important;
    }

    .gleap-tour-popover-video-pointer:hover .gleap-tour-popover-footer {
      opacity: 1;
    }

    .gleap-tour-popover-pointer.gleap-tour-popover-no-sender .gleap-tour-message {
      padding-right: 20px;
    }

    .gleap-tour-video video {
      width: 100%;
      max-width: 100%;
      height: auto;
      border: none;
      outline: none;
      display: block;
      border-radius: 8px;
    }

    .gleap-admin-collapse-ui {
      z-index: ${zIndexBase + 35};
      cursor: pointer;
      position: fixed;
      bottom: 75px;
      right: 20px;
      width: 32px;
      height: 32px;
      border-radius: 100%;
      background-color: #fff;
      display: flex;
      justify-content: center;
      align-items: center;
      box-shadow: rgba(0, 0, 0, 0.16) 0px 10px 36px 0px, rgba(0, 0, 0, 0.06) 0px 0px 0px 1px;
    }

    .gleap-admin-collapse-ui svg {
      width: 20px;
      height: 14px;
      margin-top: 6px;
      fill: #000 !important;
    }

    .gleap-admin-collapse-ui-active {
      bottom: 20px !important;
    }

    .gleap-admin-collapse-ui-active svg {
      transform: rotate(180deg);
    }

    .gleap-admin-frame-container-active {
      display: none !important;
    }

    .gleap-admin-frame-container {
      position: fixed;
      bottom: 0px;
      left: 0px;
      right: 0px;
      width: 100vw;
      z-index: ${zIndexBase + 40};
    }

    .gleap-admin-frame {
      width: 100%;
      height: 100%;
      border: none;
      outline: none;
      display: block;
    }
    
    .gleap-tour-message .linktype-link {
      display: inline-block !important;
      background-color: transparent !important;
      color: ${buttonColor} !important;
    }

    .gleap-tour-message .linktype-button {
      display: inline-block !important;
      border-radius: 5px;
      box-sizing: border-box;
      padding: 10px 20px;
      background-color: ${buttonColor} !important;
      color: ${contrastButtonColor} !important;
    }

    .gleap-tour-message img {
      width: 100%;
      max-width: 100%;
      min-height: 260px;
      height: auto;
      margin-top: 10px;
      margin-bottom: 10px;
      object-fit: cover;
    }

    .gleap-tour-active .gleap-tour-overlay {
      pointer-events: none;
    }
    
    .gleap-tour-active * {
      pointer-events: none;
    }
    
    .gleap-tour-active .gleap-tour-active-element,
    .gleap-tour-active .gleap-tour-active-element *,
    .gleap-tour-popover,
    .gleap-tour-popover * {
      pointer-events: auto;
    }
    
    @keyframes animate-fade-in {
      0% {
        opacity: 0;
      }
    
      to {
        opacity: 1;
      }
    }
    
    .gleap-tour-fade .gleap-tour-overlay {
      animation: animate-fade-in 200ms ease-in-out;
    }
    
    .gleap-tour-fade .gleap-tour-popover {
      animation: animate-fade-in 200ms;
    }

    .gleap-tour-video-playpause {
      position: absolute;
      top: 0px;
      left: 0px;
      right: 0px;
      width: 100%;
      height: 100%;
      background-color: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      border-radius: 8px;
      transition: opacity 200ms ease-in-out;
    }

    .gleap-tour-popover-video-pointer .gleap-tour-popover-arrow {
      display: none !important;
    }

    .gleap-tour-video-playpause svg {
      width: 34px;
      height: auto;
      fill: #fff;
    }
    
    /* Popover styles */
    .gleap-tour-popover {
      all: unset;
      box-sizing: border-box;
      color: #2d2d2d;
      margin: 0;
      padding: 15px;
      border-radius: ${formItemBorderRadius}px;
      min-width: 250px;
      max-width: 300px;
      box-shadow: 0 1px 10px #0006;
      z-index: 1000000000;
      position: fixed;
      top: 0;
      right: 0;
      background-color: #fff;
    }
    
    .gleap-tour-popover * {
      font-family: "Helvetica Neue", Inter, ui-sans-serif, "Apple Color Emoji", Helvetica, Arial, sans-serif;
    }
    
    .gleap-tour-popover-title {
      font: 19px / normal sans-serif;
      font-weight: 700;
      display: block;
      position: relative;
      line-height: 1.5;
      zoom: 1;
      margin: 0;
    }
    
    .gleap-tour-popover-close-btn {
      all: unset;
      position: absolute;
      top: 5px;
      right: 5px;
      width: 32px;
      height: 32px;
      cursor: pointer;
      font-size: 30px;
      font-weight: 500;
      line-height: 32px;
      color: #d2d2d2;
      z-index: 1;
      text-align: center;
      transition: color;
      transition-duration: 200ms;
    }
    
    .gleap-tour-popover-close-btn:hover,
    .gleap-tour-popover-close-btn:focus {
      color: #2d2d2d;
    }
    
    .gleap-tour-popover-title[style*="block"] + .gleap-tour-popover-description {
      margin-top: 5px;
    }
    
    .gleap-tour-popover-description {
      margin-bottom: 0;
      font: 15px / normal sans-serif;
      line-height: 1.5;
      font-weight: 400;
      zoom: 1;
    }
    
    .gleap-tour-popover-footer {
      margin-top: 15px;
      text-align: right;
      zoom: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .gleap-tour-popover-progress-text {
      font-size: 13px;
      font-weight: 400;
      color: #727272;
      zoom: 1;
    }
    
    .gleap-tour-popover-footer button {
      background-color: ${primaryColor};
      color: ${contrastColor};
      border-radius: ${formItemSmallBorderRadius}px;
      box-sizing: border-box;
      padding: 10px 20px;
      font-size: 14px;
      font-weight: bold;
      line-height: 21px;
      border: none;
      text-align: center;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      display: flex;
      justify-content: center;
      align-items: center;
      box-shadow: none !important;
      outline: none !important;
    }

    .gleap-tour-popover-prev-btn {
      color: ${contrastBackgroundColor} !important;
      background-color: ${backgroundColorHover} !important;
      margin-right: 3px;
    }

    .gleap-tour-popover-prev-btn:hover {
      background-color: ${primaryColor}22 !important;
      color: ${primaryColor} !important;
    }
    
    .gleap-tour-popover-footer .gleap-tour-popover-btn-disabled {
      opacity: 0.5;
      pointer-events: none;
    }
    
    /* Disable the scrolling of parent element if it has an active element*/
    :not(body):has(> .gleap-tour-active-element) {
      overflow: hidden !important;
    }
    
    .gleap-tour-no-interaction, .gleap-tour-no-interaction * {
      pointer-events: none !important;
    }
    
    .gleap-tour-popover-navigation-btns {
      display: flex;
      flex-grow: 1;
      justify-content: flex-end;
    }
    
    .gleap-tour-popover-navigation-btns button + button {
      margin-left: 4px;
    }
    
    .gleap-tour-popover-arrow {
      content: "";
      position: absolute;
      border: 5px solid #fff;
    }
    
    .gleap-tour-popover-arrow-side-over {
      display: none;
    }
    
    /** Popover Arrow Sides **/
    .gleap-tour-popover-arrow-side-left {
      left: 100%;
      border-right-color: transparent;
      border-bottom-color: transparent;
      border-top-color: transparent;
    }
    
    .gleap-tour-popover-arrow-side-right {
      right: 100%;
      border-left-color: transparent;
      border-bottom-color: transparent;
      border-top-color: transparent;
    }
    
    .gleap-tour-popover-arrow-side-top {
      top: 100%;
      border-right-color: transparent;
      border-bottom-color: transparent;
      border-left-color: transparent;
    }
    
    .gleap-tour-popover-arrow-side-bottom {
      bottom: 100%;
      border-left-color: transparent;
      border-top-color: transparent;
      border-right-color: transparent;
    }
    
    .gleap-tour-popover-arrow-side-center {
      display: none;
    }
    
    /* Left/Start + Right/Start */
    .gleap-tour-popover-arrow-side-left.gleap-tour-popover-arrow-align-start,
    .gleap-tour-popover-arrow-side-right.gleap-tour-popover-arrow-align-start {
      top: 15px;
    }
    
    /* Top/Start + Bottom/Start */
    .gleap-tour-popover-arrow-side-top.gleap-tour-popover-arrow-align-start,
    .gleap-tour-popover-arrow-side-bottom.gleap-tour-popover-arrow-align-start {
      left: 15px;
    }
    
    /* End/Left + End/Right */
    .gleap-tour-popover-arrow-align-end.gleap-tour-popover-arrow-side-left,
    .gleap-tour-popover-arrow-align-end.gleap-tour-popover-arrow-side-right {
      bottom: 15px;
    }
    
    /* Top/End + Bottom/End */
    .gleap-tour-popover-arrow-side-top.gleap-tour-popover-arrow-align-end,
    .gleap-tour-popover-arrow-side-bottom.gleap-tour-popover-arrow-align-end {
      right: 15px;
    }
    
    /* Left/Center + Right/Center */
    .gleap-tour-popover-arrow-side-left.gleap-tour-popover-arrow-align-center,
    .gleap-tour-popover-arrow-side-right.gleap-tour-popover-arrow-align-center {
      top: 50%;
      margin-top: -5px;
    }
    
    /* Top/Center + Bottom/Center */
    .gleap-tour-popover-arrow-side-top.gleap-tour-popover-arrow-align-center,
    .gleap-tour-popover-arrow-side-bottom.gleap-tour-popover-arrow-align-center {
      left: 50%;
      margin-left: -5px;
    }
    
    /* No arrow */
    .gleap-tour-popover-arrow-none {
      display: none;
    }    
    `;

  const oldNode = document.querySelector(".gleap-styles");
  if (oldNode) {
    oldNode.remove();
  }
  const node = document.createElement("style");
  node.innerHTML = colorStyleSheet;
  node.className = "gleap-styles";
  document.body.appendChild(node);
};

export const loadIcon = function (name, color) {
  if (name === "button") {
    return `<svg class="bb-logo-logo bb-logo-logo--default" width="700px" height="700px" viewBox="0 0 700 700" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <g transform="translate(77.000000, 119.000000)" fill="#FFFFFF" fill-rule="nonzero">
            <path d="M476.856373,0 L68.122339,0 C30.601832,0 0,30.5935323 0,67.1461527 L0,372.655827 C0,410.166158 30.601832,439.80198 68.122339,439.80198 L170.305847,439.80198 L170.305847,528.23059 C170.305847,538.605788 182.280477,544.671288 190.657396,538.552581 L323.602398,438.844269 L476.877661,438.844269 C514.398168,438.844269 545,408.250737 545,371.698116 L545,67.1461527 C544.978712,30.5935323 515.28163,0 476.856373,0 Z"></path>
        </g>
    </g>
</svg>`;
  }

  if (name === "unmute") {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><path d="M38.8 5.1C28.4-3.1 13.3-1.2 5.1 9.2S-1.2 34.7 9.2 42.9l592 464c10.4 8.2 25.5 6.3 33.7-4.1s6.3-25.5-4.1-33.7L525.1 386.2C556.7 352 576 306.3 576 256c0-60.1-27.7-113.8-70.9-149c-10.3-8.4-25.4-6.8-33.8 3.5s-6.8 25.4 3.5 33.8C507.3 170.7 528 210.9 528 256c0 39.1-15.6 74.5-40.9 100.5L449 326.6c19-17.5 31-42.7 31-70.6c0-30.1-13.9-56.9-35.4-74.5c-10.3-8.4-25.4-6.8-33.8 3.5s-6.8 25.4 3.5 33.8C425.1 227.6 432 241 432 256s-6.9 28.4-17.7 37.3c-1.3 1-2.4 2.2-3.4 3.4L352 250.6V64c0-12.6-7.4-24-18.9-29.2s-25-3.1-34.4 5.3L197.8 129.8 38.8 5.1zM352 373.3L82.9 161.3C53.8 167.4 32 193.1 32 224v64c0 35.3 28.7 64 64 64h67.8L298.7 471.9c9.4 8.4 22.9 10.4 34.4 5.3S352 460.6 352 448V373.3z"/></svg>`;
  }

  if (name === "mute") {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><path d="M533.6 32.5C598.5 85.3 640 165.8 640 256s-41.5 170.8-106.4 223.5c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C557.5 398.2 592 331.2 592 256s-34.5-142.2-88.7-186.3c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zM473.1 107c43.2 35.2 70.9 88.9 70.9 149s-27.7 113.8-70.9 149c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C475.3 341.3 496 301.1 496 256s-20.7-85.3-53.2-111.8c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zm-60.5 74.5C434.1 199.1 448 225.9 448 256s-13.9 56.9-35.4 74.5c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C393.1 284.4 400 271 400 256s-6.9-28.4-17.7-37.3c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zM301.1 34.8C312.6 40 320 51.4 320 64V448c0 12.6-7.4 24-18.9 29.2s-25 3.1-34.4-5.3L131.8 352H64c-35.3 0-64-28.7-64-64V224c0-35.3 28.7-64 64-64h67.8L266.7 40.1c9.4-8.4 22.9-10.4 34.4-5.3z"/></svg>`;
  }

  if (name === "replay") {
    return `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M48.5 224H40C26.7 224 16 213.3 16 200V72C16 62.3 21.8 53.5 30.8 49.8C39.8 46.1 50.1 48.1 57 55L98.6 96.6C186.2 10.1 327.3 10.4 414.4 97.6C501.9 185.1 501.9 326.9 414.4 414.4C326.9 501.9 185.1 501.9 97.6 414.4C85.1 401.9 85.1 381.6 97.6 369.1C110.1 356.6 130.4 356.6 142.9 369.1C205.4 431.6 306.7 431.6 369.2 369.1C431.7 306.6 431.7 205.3 369.2 142.8C307 80.6 206.5 80.3 143.9 141.8L185 183C191.9 189.9 193.9 200.2 190.2 209.2C186.5 218.2 177.7 224 168 224H48.5Z" />
    </svg>`;
  }

  if (name === "dismiss") {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512"><path d="M294.6 166.6L317.3 144 272 98.7l-22.6 22.6L160 210.7 70.6 121.4 48 98.7 2.7 144l22.6 22.6L114.7 256 25.4 345.4 2.7 368 48 413.3l22.6-22.6L160 301.3l89.4 89.4L272 413.3 317.3 368l-22.6-22.6L205.3 256l89.4-89.4z"/></svg>`;
  }

  if (name === "blur") {
    return `<svg width="1200pt" height="1200pt" version="1.1" viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg">
 <path class="bb-svg-path" d="m602.25 1200c238.2 0 435.95-193.26 435.95-435.95 0-269.66-220.23-615.73-435.95-764.05-220.23 161.8-440.45 485.39-440.45 764.05 0 242.7 197.75 435.95 440.45 435.95zm-260.68-382.02c0 112.36 89.887 206.74 206.74 206.74v62.922c-148.32 0-274.16-121.35-274.16-269.66z" fill="#333"/>
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
                <g transform="translate(-0.000000, 755.530173)" fill="#EB144C">
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
            <g transform="translate(0.000000, 83.206095)" fill="#EB144C" class="bb-pen-tip">
                <path d="M0,0 L26.186,26.186 L26.1864325,131.205465 L131.204,131.205 L157.792,157.793 L0.000865118243,157.793905 L0,0 Z"></path>
            </g>
        </g>
    </g>
</svg>`;
  }

  if (name === "pointer") {
    return `<svg width="1200pt" height="1200pt" version="1.1" viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg">
    <path d="m1050.7 508.95-225.94 157.5 160.31 160.31c4.4531 4.4531 6.9141 10.43 6.9141 16.758s-2.4609 12.305-6.9141 16.758l-126.09 126.09c-4.4531 4.4531-10.43 6.9141-16.758 6.9141-6.3281 0-12.188-2.4609-16.758-6.9141l-160.2-160.43-157.62 225.94c-3.3984 4.9219-9.0234 7.8516-14.883 7.8516-0.70313 0-1.5234 0-2.2266-0.11719-6.7969-0.82031-12.422-5.2734-14.766-11.719l-333.16-880.55c-2.5781-6.6797-0.9375-14.297 4.2188-19.336 5.0391-5.0391 12.656-6.6797 19.336-4.2188l880.66 333.05c6.3281 2.3438 10.781 8.0859 11.602 14.766 0.82031 6.7969-2.1094 13.359-7.7344 17.344z" fill="#333"/>
   </svg>`;
  }

  if (name === "clip") {
    return `<svg width="600px" height="1126px" viewBox="0 0 600 1126" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <g transform="translate(-0.002000, 0.501000)" fill="#333333" fill-rule="nonzero">
            <path d="M225.002,1124.999 C165.33,1124.999 108.102,1101.292 65.902,1059.097 C23.707,1016.902 5.68434189e-14,959.671 5.68434189e-14,899.997 L5.68434189e-14,299.997 C5.68434189e-14,220.431 31.605,144.127 87.867,87.867 C144.129,31.605 220.437,-4.26325641e-14 299.997,-4.26325641e-14 C379.557,-4.26325641e-14 455.867,31.605 512.127,87.867 C568.389,144.129 599.994,220.437 599.994,299.997 L599.994,1012.497 C599.994,1025.895 592.8456,1038.274 581.244,1044.974 C569.642,1051.6732 555.346,1051.6732 543.744,1044.974 C532.142,1038.2748 524.994,1025.896 524.994,1012.497 L524.994,299.997 C524.994,240.325 501.287,183.097 459.092,140.897 C416.897,98.702 359.666,74.995 299.992,74.995 C240.318,74.995 183.092,98.702 140.892,140.897 C98.697,183.092 74.99,240.323 74.99,299.997 L74.99,899.997 C74.99,953.587 103.58,1003.107 149.99,1029.897 C196.4,1056.694 253.58,1056.694 299.99,1029.897 C346.4,1003.104 374.99,953.585 374.99,899.997 L374.99,337.497 C374.99,310.704 360.697,285.942 337.49,272.544 C314.283,259.149 285.697,259.149 262.49,272.544 C239.283,285.942 224.99,310.704 224.99,337.497 L224.99,824.997 C224.99,838.395 217.8416,850.774 206.24,857.474 C194.638,864.1732 180.342,864.1732 168.74,857.474 C157.138,850.7748 149.99,838.396 149.99,824.997 L149.99,337.497 C149.99,283.907 178.58,234.387 224.99,207.597 C271.4,180.8 328.58,180.8 374.99,207.597 C421.4,234.39 449.99,283.909 449.99,337.497 L449.99,899.997 C449.99,959.669 426.283,1016.897 384.088,1059.097 C341.893,1101.292 284.662,1124.999 224.988,1124.999 L225.002,1124.999 Z" id="Path"></path>
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

  if (name === "undo") {
    return `<svg width="62px" height="60px" viewBox="0 0 62 60" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
      <g class="bb-svg-path" transform="translate(-0.000500, 0.001926)" fill-rule="nonzero">
        <path d="M28.0005,51.6270739 C24.9653,51.0684839 22.0825,49.8731739 19.5396,48.1192739 L13.8208,53.8380739 C17.9536,57.0060739 22.8403,59.0333739 28.0008,59.7286739 L28.0005,51.6270739 Z" id="Path"></path>
        <path d="M2.2705,33.9980739 C2.96581,39.1582739 4.9932,44.0450739 8.1611,48.1780739 L13.8799,42.4592739 C12.126,39.9162739 10.9307,37.0334739 10.3721,33.9983739 L2.2705,33.9980739 Z" id="Path"></path>
        <path d="M61.7305,33.9980739 L53.6289,33.9980739 C53.07031,37.0332739 51.875,39.9160739 50.1211,42.4589739 L55.8399,48.1777739 C59.0079,44.0449739 61.0352,39.1582739 61.7305,33.9977739 L61.7305,33.9980739 Z" id="Path"></path>
        <path d="M4.0005,24.9980739 L24.0005,24.9980739 L24.0005,16.9980739 L14.27,16.9980739 C17.6762,12.3613739 22.7622,9.24417393 28.442,8.31057393 C34.1178,7.38088393 39.934,8.70901393 44.645,12.0175739 C49.352,15.3222739 52.5786,20.3417739 53.6294,25.9975739 L61.731,25.9975739 C60.6646,18.0834739 56.4888,10.9235739 50.129,6.09957393 C43.7657,1.27147393 35.746,-0.818426068 27.836,0.290973932 C19.9298,1.39647393 12.793,5.61127393 8,11.9979739 L8,0.997973932 L-3.55271368e-15,0.997973932 L-3.55271368e-15,20.9979739 C-3.55271368e-15,22.0604739 0.42188,23.0760739 1.1719,23.8260739 C1.92192,24.5760739 2.9375,24.9979739 4,24.9979739 L4.0005,24.9980739 Z" id="Path"></path>
        <path d="M36.0005,51.6270739 L36.0005,59.7286739 C41.1607,59.0333639 46.0475,57.0059739 50.1805,53.8380739 L44.4617,48.1192739 C41.9187,49.8731739 39.0359,51.0684739 36.0008,51.6270739 L36.0005,51.6270739 Z" id="Path"></path>
      </g>
    </g>
  </svg>`;
  }

  return "";
};
