(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["Gleap"] = factory();
	else
		root["Gleap"] = factory();
})(this, function() {
return /******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The require scope
/******/ 	var __webpack_require__ = {};
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "default": () => (/* binding */ src)
});

;// CONCATENATED MODULE: ./src/UI.js
function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr && (typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]); if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

var calculateShadeColor = function calculateShadeColor(col, amt) {
  col = col.replace(/^#/, "");
  if (col.length === 3) col = col[0] + col[0] + col[1] + col[1] + col[2] + col[2];

  var _col$match = col.match(/.{2}/g),
      _col$match2 = _slicedToArray(_col$match, 3),
      r = _col$match2[0],
      g = _col$match2[1],
      b = _col$match2[2];

  var _ref = [parseInt(r, 16) + amt, parseInt(g, 16) + amt, parseInt(b, 16) + amt];
  r = _ref[0];
  g = _ref[1];
  b = _ref[2];
  r = Math.max(Math.min(255, r), 0).toString(16);
  g = Math.max(Math.min(255, g), 0).toString(16);
  b = Math.max(Math.min(255, b), 0).toString(16);
  var rr = (r.length < 2 ? "0" : "") + r;
  var gg = (g.length < 2 ? "0" : "") + g;
  var bb = (b.length < 2 ? "0" : "") + b;
  return "#".concat(rr).concat(gg).concat(bb);
};

var calculateContrast = function calculateContrast(hex) {
  var r = parseInt(hex.substr(1, 2), 16),
      g = parseInt(hex.substr(3, 2), 16),
      b = parseInt(hex.substr(5, 2), 16),
      yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 160 ? "#000000" : "#ffffff";
};

var injectStyledCSS = function injectStyledCSS(primaryColor, headerColor, buttonColor, borderRadius, backgroundColor) {
  var contrastColor = calculateContrast(primaryColor);
  var contrastButtonColor = calculateContrast(buttonColor);
  var contrastBackgroundColor = calculateContrast(backgroundColor);
  var isDarkMode = contrastBackgroundColor === "#ffffff";
  var subTextColor = isDarkMode ? calculateShadeColor(backgroundColor, 100) : calculateShadeColor(backgroundColor, -120);
  var backgroundColorHover = isDarkMode ? calculateShadeColor(backgroundColor, 30) : calculateShadeColor(backgroundColor, -12);
  var hoverHoverColor = isDarkMode ? calculateShadeColor(backgroundColor, 80) : calculateShadeColor(backgroundColor, -30);
  var borderRadius = parseInt(borderRadius, 10);
  var buttonBorderRadius = Math.round(borderRadius * 1.05);
  var formItemBorderRadius = Math.round(borderRadius * 0.4);
  var formItemSmallBorderRadius = Math.round(borderRadius * 0.25);
  var zIndexBase = 2147483600;
  var colorStyleSheet = "\n    .gleap-frame-container {\n      right: 20px;\n      bottom: 95px;\n      width: 380px !important;\n      position: fixed;\n      z-index: ".concat(zIndexBase + 31, ";\n      visibility: visible;\n      height: 100%;\n      max-height: 0px;\n      box-shadow: 0px 5px 30px rgba(0, 0, 0, 0.16);\n      border-radius: ").concat(borderRadius, "px;\n      overflow: hidden;\n      animation-duration: .3s;\n      animation-fill-mode: both;\n      animation-name: gleapFadeInUp;\n      user-select: none;\n      pointer-events: none;\n    }\n\n    [dir=rtl].gleap-frame-container {\n      right: auto;\n      left: 20px;\n      bottom: 95px;\n    }\n\n    .gleap-frame-container--classic {\n      right: 20px;\n      bottom: 20px;\n    }\n\n    [dir=rtl].gleap-frame-container--classic {\n      right: auto;\n      left: 20px;\n      bottom: 20px;\n    }\n\n    .gleap-frame-container--classic-left {\n      right: auto;\n      left: 20px;\n      bottom: 20px;\n    }\n\n    [dir=rtl].gleap-frame-container--classic-left {\n      left: auto;\n      right: 20px;\n      bottom: 20px;\n    }\n\n    .gleap-frame-container--modern-left {\n      right: auto;\n      left: 20px;\n      bottom: 95px;\n    }\n\n    [dir=rtl].gleap-frame-container--modern-left {\n      left: auto;\n      right: 20px;\n      bottom: 95px;\n    }\n\n    .gleap-frame-container--animate {\n      transition: max-height 0.2s ease-in;\n      pointer-events: auto !important;\n    }\n\n    @keyframes gleapFadeInUp {\n      from {\n          opacity: 0;\n          transform: translate3d(0, 100%, 0);\n      }\n      to {\n          opacity: 1;\n          transform: translate3d(0, 0, 0);\n      }\n    }\n\n    .gleap-frame-container-inner {\n      width: 100%;\n      height: 100%;\n      position: relative;\n    }\n\n    .gleap-frame-container-inner:before {\n      content: \" \";\n      position: absolute;\n      width: 100%;\n      height: calc(100% - ").concat(borderRadius, "px);\n      top: ").concat(borderRadius, "px;\n      background-color: ").concat(backgroundColor, ";\n      z-index: -1;\n    }\n    \n    .gleap-frame-container iframe {\n      height: 100% !important;\n      width: 100% !important;\n      max-width: 100% !important;\n      display: block;\n    }\n    \n    .gleap-frame-container--hidden {\n      display: none !important;\n      pointer-events: none;\n      animation: none !important;\n    }\n    \n    .bb-feedback-button {\n      margin: 0px;\n      position: fixed;\n      bottom: 20px;\n      right: 20px;\n      border-radius: 30px;\n      cursor: pointer;\n      -webkit-tap-highlight-color: transparent;\n      background-color: transparent;\n      color: #000000;\n      z-index: ").concat(zIndexBase + 30, ";\n      box-sizing: border-box;\n      display: flex;\n      align-items: center;\n      padding: 0px;\n    }\n\n    [dir=rtl].bb-feedback-button {\n      bottom: 20px;\n      right: auto;\n      left: 20px;\n    }\n    \n    .bb-feedback-button--bottomleft {\n      bottom: 20px;\n      right: auto;\n      left: 20px;\n    }\n\n    [dir=rtl].bb-feedback-button--bottomleft {\n      bottom: 20px;\n      right: 20px;\n      left: auto;\n    }\n    \n    .bb-feedback-button--disabled .bb-feedback-button-icon {\n      display: none !important;\n    }\n    \n    .bb-feedback-button--disabled .bb-feedback-button-text {\n      display: none;\n    }\n    \n    .bb-feedback-button-text {\n      padding: 8px 12px;\n      display: flex;\n      flex-direction: column;\n      align-items: flex-start;\n      justify-content: center;\n      background-color: #fff;\n      border-radius: 8px;\n      box-shadow: 0px 0px 14px 0px rgba(0, 0, 0, 0.15);\n      position: relative;\n      z-index: 99;\n    }\n    \n    .bb-feedback-button-text:before {\n      content: \"\";\n      position: absolute;\n      box-shadow: rgba(0, 0, 0, 0.04) 6px 6px 5px;\n      transform: rotate(315deg);\n      bottom: 16px;\n      right: -4px;\n      border-width: 10px;\n      border-style: solid;\n      border-color: transparent #fff #fff transparent;\n    }\n    \n    .bb-feedback-button--bottomleft .bb-feedback-button-text:before {\n      display: none;\n    }\n    \n    .bb-feedback-button-text:after {\n      content: \"\";\n      position: absolute;\n      bottom: 12px;\n      right: 0px;\n      background-color: #fff;\n      width: 5px;\n      height: 30px;\n    }\n    \n    .bb-feedback-button-text-title {\n      font-family: sans-serif;\n      font-size: 14px;\n      color: #666;\n      line-height: 18px;\n      max-width: 220px;\n    }\n    \n    .bb-feedback-button-text-title b {\n      color: #000000;\n      font-weight: 600;\n    }\n    \n    .bb-feedback-button-icon {\n      width: 60px;\n      height: 60px;\n      border-radius: 60px;\n      background-color: #485bff;\n      transition: box-shadow 0.3s ease-in-out;\n      box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.15), 0px 0px 20px rgba(0, 0, 0, 0.1);\n      position: relative;\n    }\n    \n    .bb-feedback-button-classic {\n      cursor: pointer;\n      -webkit-tap-highlight-color: transparent;\n      top: 50%;\n      right: 0px;\n      position: fixed;\n      transform: rotate(-90deg) translate(50%, -50%);\n      transform-origin: 100% 50%;\n      padding: 9px 20px;\n      text-align: center;\n      background-color: #485bff;\n      border-top-left-radius: 8px;\n      border-top-right-radius: 8px;\n      font-family: sans-serif;\n      font-size: 16px;\n      color: #fff;\n      box-shadow: 0px 0px 14px 0px rgba(0, 0, 0, 0.25);\n      animation-duration: 0.2s;\n      animation-fill-mode: both;\n      animation-name: bbFadeInOpacity;\n    }\n\n    [dir=rtl].bb-feedback-button .bb-feedback-button-classic {\n      top: 50%;\n      left: 0px;\n      right: auto;\n      transform: rotate(90deg) translate(-50%, -100%);\n      transform-origin: 0% 0%;\n    }\n    \n    .bb-feedback-button-classic--left {\n      top: 50%;\n      left: 0px;\n      right: auto;\n      transform: rotate(90deg) translate(-50%, -100%);\n      transform-origin: 0% 0%;\n    }\n\n    [dir=rtl].bb-feedback-button .bb-feedback-button-classic--left {\n      top: 50%;\n      right: 0px;\n      left: auto;\n      transform: rotate(-90deg) translate(50%, -50%);\n      transform-origin: 100% 50%;\n    }\n    \n    .bb-feedback-button-classic--bottom {\n      top: auto;\n      bottom: 0px;\n      transform: none;\n      right: 20px;\n      left: auto;\n    }\n    \n    [dir=rtl].bb-feedback-button .bb-feedback-button-classic--bottom {\n      top: auto;\n      bottom: 0px;\n      transform: none;\n      left: 20px;\n      right: auto;\n    }\n    \n    .bb-feedback-button--open .bb-feedback-button-classic {\n      animation-duration: 0.2s;\n      animation-fill-mode: both;\n      animation-name: bbFadeOutRight;\n    }\n    \n    .bb-feedback-button .bb-logo-logo {\n      position: absolute;\n      width: 38px;\n      height: 38px;\n      top: 11px;\n      left: 11px;\n      object-fit: contain;\n      animation-duration: 0.3s;\n      animation-fill-mode: both;\n      animation-name: bbZoomIn;\n    }\n    \n    .bb-feedback-button .bb-logo-arrowdown {\n      position: absolute;\n      width: 18px;\n      height: 18px;\n      top: 23px;\n      left: 21px;\n      object-fit: contain;\n      animation-duration: 0.3s;\n      animation-fill-mode: both;\n    }\n    \n    .bb-feedback-button .bb-logo-arrowdown {\n      animation-name: bbZoomOut;\n    }\n    \n    .bb-feedback-button--open .bb-logo-arrowdown {\n      animation-name: bbZoomIn;\n    }\n    \n    .bb-feedback-button--open .bb-logo-logo {\n      animation-name: bbZoomOut;\n    }\n    \n    .bb-feedback-button-icon:hover {\n      box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.25), 0px 0px 20px rgba(0, 0, 0, 0.2);\n    }\n    \n    .bb-feedback-button--open .bb-feedback-button-text {\n      animation-name: bbFadeOutDown;\n    }\n    \n    .bb-feedback-button--open .bb-feedback-button-icon {\n      display: flex;\n    }\n    \n    .bb-capture-svg {\n      position: absolute;\n      z-index: ").concat(zIndexBase + 14, ";\n      top: 0px;\n      left: 0px;\n      right: 0px;\n      width: 100%;\n      height: 100%;\n      padding: 0px;\n      margin: 0px;\n      cursor: crosshair;\n    }\n\n    .bb-capture-svg--preview {\n      cursor: auto !important;\n    }\n    \n    .bb-rec-on-circle {\n      animation-name: bbRecIconFade;\n      animation-duration: 2s;\n      animation-iteration-count: infinite;\n      animation-direction: alternate;\n    }\n    \n    .bb-rec-on-cont {\n      animation-name: bbRecIconContFade;\n      animation-duration: 2s;\n      animation-iteration-count: infinite;\n      animation-direction: alternate;\n    }\n    \n    .bb-capture-editor-drag-info {\n      position: fixed;\n      top: -200px;\n      left: 0px;\n      z-index: ").concat(zIndexBase + 16, ";\n      transition: opacity 0.3s ease-in-out;\n    }\n    \n    .bb-capture-editor-drag-info svg {\n      width: 24px;\n      height: 24px;\n    }\n    \n    .bb-capture-editor-borderlayer {\n      position: fixed;\n      top: 0px;\n      left: 0px;\n      width: 100vw;\n      height: 100vh;\n      border: 4px solid ").concat(primaryColor, ";\n      cursor: crosshair;\n      z-index: ").concat(zIndexBase + 10, ";\n      box-sizing: border-box;\n      pointer-events: none;\n    }\n    \n    .bb-capture-editor-notrecording .bb-capture-editor-borderlayer {\n      background-color: rgba(0, 0, 0, 0.8);\n    }\n    \n    .bb-capture-editor-recording .bb-capture-dismiss {\n      display: none;\n    }\n    \n    .bb-capture-editor-item-inactive {\n      opacity: 0.3;\n      cursor: not-allowed !important;\n    }\n    \n    .bb-capture-editor-notrecording .bb-capture-toolbar-drawingitem {\n      opacity: 0.3;\n      cursor: not-allowed !important;\n    }\n    \n    .bb-capture-editor-notrecording .bb-capture-editor-drag-info {\n      display: none;\n    }\n    \n    .bb-capture-editor-notrecording .bb-capture-svg {\n      pointer-events: none !important;\n    }\n    \n    .bb-capture-toolbar {\n      position: fixed;\n      top: 20px;\n      left: 50%;\n      transform: translateX(-50%);\n      z-index: ").concat(zIndexBase + 18, ";\n      background-color: #fff;\n      padding: 5px;\n      display: flex;\n      align-items: center;\n      border-radius: 8px;\n      box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.15), 0px 0px 20px rgba(0, 0, 0, 0.1);\n      transition: opacity 0.3s ease-in-out;\n    }\n    \n    .bb-capture-dismiss {\n      position: fixed;\n      top: 0px;\n      right: 0px;\n      z-index: ").concat(zIndexBase + 18, ";\n      cursor: pointer;\n      -webkit-tap-highlight-color: transparent;\n      width: 36px;\n      height: 36px;\n      display: flex;\n      justify-content: center;\n      align-items: center;\n      background-color: ").concat(primaryColor, ";\n      border-bottom-left-radius: ").concat(formItemSmallBorderRadius, "px;\n    }\n\n    [dir=rtl] .bb-capture-dismiss {\n      top: 0px;\n      left: 0px;\n      right: auto;\n      border-bottom-left-radius: 0px !important;\n      border-bottom-right-radius: ").concat(formItemSmallBorderRadius, "px;\n    }\n    \n    .bb-capture-dismiss svg path {\n      fill: ").concat(contrastColor, ";\n    }\n    \n    .bb-capture-dismiss svg {\n      width: 20px;\n      height: 20px;\n      object-fit: contain;\n    }\n    \n    .bb-capture-button-next {\n      font-family: sans-serif;\n      box-sizing: border-box;\n      font-weight: 600;\n      text-align: center;\n      width: auto;\n      cursor: pointer;\n      -webkit-tap-highlight-color: transparent;\n      margin: 0px;\n      line-height: 36px;\n      padding: 0px 12px;\n      font-size: 15px;\n      margin-left: 12px;\n    }\n\n    [dir=rtl].bb-capture-editor .bb-capture-button-next {\n      margin-left: auto;\n      margin-right: 12px;\n    }\n    \n    .bb-capture-toolbar-item-spacer {\n      width: 1px;\n      height: 38px;\n      min-width: 1px;\n      margin: 0px 5px;\n    }\n    \n    .bb-capture-toolbar-item {\n      width: 42px;\n      height: 38px;\n      min-width: 42px;\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      cursor: pointer;\n      -webkit-tap-highlight-color: transparent;\n      position: relative;\n      margin-right: 5px;\n    }\n    \n    .bb-capture-toolbar-item svg {\n      width: 23px;\n      height: 23px;\n      object-fit: contain;\n    }\n    \n    .bb-capture-toolbar-item-selectedcolor {\n      border-radius: 100%;\n      width: 20px;\n      height: 20px;\n      background-color: #db4035;\n    }\n    \n    .bb-capture-toolbar-item[data-type=\"undo\"] svg {\n      width: 18px;\n      height: 18px;\n    }\n    \n    .bb-capture-toolbar-item[data-active=\"true\"] {\n      position: relative;\n    }\n    \n    .bb-capture-preview {\n      display: none;\n      background-color: rgba(0, 0, 0, 0.6);\n      position: fixed;\n      top: 0px;\n      left: 0px;\n      width: 100vw;\n      height: 100vh;\n      justify-content: center;\n      align-items: center;\n      z-index: ").concat(zIndexBase + 20, ";\n    }\n    \n    .bb-capture-preview-inner {\n      background-color: #fff;\n      padding: 0px;\n      box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.15), 0px 0px 20px rgba(0, 0, 0, 0.1);\n      border-radius: 8px;\n      flex-direction: column;\n      max-width: 640px;\n      width: 100%;\n      margin: 20px;\n    }\n    \n    .bb-capture-preview-inner video {\n      border-radius: 8px 8px 0px 0px;\n      display: block;\n      border: 0px;\n      outline: none;\n      width: 100%;\n      max-height: 60vh;\n    }\n    \n    .bb-capture-preview-buttons {\n      display: flex;\n      justify-content: space-between;\n      padding: 14px;\n    }\n    \n    .bb-capture-preview-retrybutton {\n      font-family: sans-serif;\n      border-radius: 21px;\n      box-sizing: border-box;\n      padding: 12px 26px;\n      font-size: 16px;\n      line-height: 19px;\n      font-weight: 600;\n      text-align: center;\n      margin-top: 0px;\n      margin-bottom: 0px;\n      cursor: pointer;\n      -webkit-tap-highlight-color: transparent;\n    }\n    \n    .bb-capture-preview-sendbutton {\n      font-family: sans-serif;\n      border-radius: 21px;\n      box-sizing: border-box;\n      padding: 12px 26px;\n      font-size: 16px;\n      line-height: 19px;\n      font-weight: 600;\n      text-align: center;\n      margin-top: 0px;\n      margin-bottom: 0px;\n      cursor: pointer;\n      -webkit-tap-highlight-color: transparent;\n    }\n    \n    .bb-capture-preview-retrybutton:hover,\n    .bb-capture-preview-sendbutton:hover {\n      opacity: 0.9;\n    }\n    \n    .bb-capture-toolbar-item-recording {\n      margin-right: 0px;\n    }\n    \n    .bb-capture-toolbar-item-recording svg {\n      width: 33px;\n      height: 33px;\n    }\n    \n    .bb-capture-toolbar-item-colorpicker {\n      position: fixed;\n      top: 70px;\n      left: 50%;\n      transform: translateX(-50%);\n      z-index: ").concat(zIndexBase + 18, ";\n      background-color: #fff;\n      display: none;\n      padding: 10px;\n      box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.15), 0px 0px 20px rgba(0, 0, 0, 0.1);\n      border-radius: 8px;\n    }\n    \n    .bb-capture-toolbar-item-color {\n      width: 20px;\n      height: 20px;\n      border-radius: 100%;\n      margin-right: 12px;\n      box-shadow: 0px 0px 3px rgba(0, 0, 0, 0.15);\n      cursor: pointer;\n      -webkit-tap-highlight-color: transparent;\n    }\n    \n    .bb-capture-toolbar-item-color:hover {\n      box-shadow: 0px 0px 6px rgba(0, 0, 0, 0.25);\n    }\n    \n    .bb-capture-toolbar-item-color:last-of-type {\n      margin-right: 0px;\n    }\n    \n    [dir=rtl].bb-capture-editor .bb-capture-toolbar-item-color {\n      margin-right: auto;\n      margin-left: 12px;\n    }\n    \n    [dir=rtl].bb-capture-editor .bb-capture-toolbar-item-color:last-of-type {\n      margin-right: auto;\n      margin-left: 0px;\n    }\n    \n    .bb-capture-toolbar-item-recording[data-active=\"true\"] svg:first-of-type {\n      display: none;\n    }\n    \n    .bb-capture-toolbar-item-recording[data-active=\"true\"] svg:nth-of-type(2) {\n      display: block;\n    }\n    \n    .bb-capture-toolbar-item-recording[data-active=\"false\"] svg:first-of-type {\n      display: block;\n    }\n    \n    .bb-capture-toolbar-item-recording[data-active=\"false\"] svg:nth-of-type(2) {\n      display: none;\n    }\n    \n    .bb-capture-toolbar-item--active {\n      background-color: #eee;\n    }\n    \n    .bb-capture-toolbar-item:hover svg {\n      opacity: 1;\n    }\n    \n    .bb-capture-toolbar-item--active {\n      background-color: #f8f8f8;\n    }\n    \n    .bb-capture-toolbar-item--active svg {\n      opacity: 1;\n    }\n    \n    .bb-capture-toolbar-item--inactivecross::before {\n      content: \"\";\n      position: absolute;\n      top: 0;\n      right: 0;\n      bottom: 0;\n      left: 0;\n      height: 3px;\n      width: 26px;\n      margin: auto;\n      border-radius: 4px;\n      background-color: #e80000;\n      transform: rotate(45deg);\n    }\n    \n    .bb-capture-toolbar-item--inactivecross svg {\n      fill: #eee;\n    }\n    \n    .bb-capture-toolbar-item-timer {\n      text-align: left;\n      line-height: 32px;\n      font-size: 14px;\n      margin: 5px;\n      min-width: 40px;\n      display: none;\n    }\n    \n    .bb-capture-toolbar-item .bb-tooltip {\n      background-color: #555;\n      color: #fff;\n      visibility: hidden;\n      font-size: 14px;\n      text-align: center;\n      padding: 5px 10px;\n      position: absolute;\n      z-index: 1;\n      top: 45px;\n      left: 0px;\n      transform: translateX(calc(-50% + 21px));\n      opacity: 0;\n      transition: opacity 0.3s;\n      white-space: nowrap;\n    }\n    \n    .bb-capture-toolbar-item .bb-tooltip::after {\n      content: \"\";\n      position: absolute;\n      bottom: 100%;\n      left: 50%;\n      margin-left: -5px;\n      border-width: 5px;\n      border-style: solid;\n      transform: rotate(180deg);\n      border-color: #555 transparent transparent transparent;\n    }\n    \n    .bb-capture-toolbar-item:hover .bb-tooltip {\n      visibility: visible;\n      opacity: 1;\n    }\n    \n    .bb-capture-options {\n      display: none;\n    }\n    \n    .bb-capture-options--active {\n      display: flex;\n    }\n\n    @keyframes bbFadeOutRight {\n      from {\n        opacity: 1;\n      }\n    \n      to {\n        opacity: 0;\n      }\n    }\n    \n    @keyframes bbFadeOutDown {\n      from {\n        opacity: 1;\n      }\n    \n      to {\n        opacity: 0;\n        transform: translate3d(0, 100%, 0);\n      }\n    }\n    \n    @keyframes bbFadeInOpacity {\n      from {\n        opacity: 0;\n      }\n    \n      to {\n        opacity: 1;\n      }\n    }\n    \n    @keyframes bbZoomOut {\n      from {\n        opacity: 1;\n      }\n    \n      50% {\n        opacity: 0;\n        transform: scale3d(0.3, 0.3, 0.3);\n      }\n    \n      to {\n        opacity: 0;\n      }\n    }\n    \n    @keyframes bbZoomIn {\n      from {\n        opacity: 0;\n        transform: scale3d(0.3, 0.3, 0.3);\n      }\n    \n      50% {\n        opacity: 1;\n      }\n    }\n    \n    @keyframes bbRecIconContFade {\n      0% {\n        fill: #b10802;\n      }\n      50% {\n        fill: #ff0000;\n      }\n      100% {\n        fill: #b10802;\n      }\n    }  \n    .bb-capture-preview-retrybutton {\n      color: ").concat(contrastBackgroundColor, ";\n      border-radius: ").concat(buttonBorderRadius, "px;\n      background-color: ").concat(backgroundColorHover, ";\n    }\n    .bb-capture-preview-retrybutton:hover {\n      background-color: ").concat(hoverHoverColor, ";\n    }\n    @keyframes bb-suc-fill {\n      100% {\n        box-shadow: inset 0px 0px 0px 30px ").concat(primaryColor, ";\n      }\n    }\n    .bb-capture-toolbar-item-spacer {\n      background-color: ").concat(backgroundColorHover, ";\n    }\n    .bb-tooltip {\n      border-radius: ").concat(formItemBorderRadius, "px;\n    }\n    @keyframes bbRecIconFade {\n      0% {\n        fill: transparent;\n      }\n      50% {\n        fill: ").concat(hoverHoverColor, ";\n      }\n      100% {\n        fill: transparent;\n      }\n    }\n    .bb-capture-preview-sendbutton {\n      color: ").concat(contrastColor, ";\n      background-color: ").concat(primaryColor, ";\n      border-radius: ").concat(buttonBorderRadius, "px;\n    }\n    .bb-capture-button-next {\n      color: ").concat(contrastColor, ";\n      background-color: ").concat(primaryColor, ";\n      border-radius: ").concat(formItemSmallBorderRadius, "px;\n    }\n    .bb-capture-preview-inner {\n      background-color: ").concat(backgroundColor, ";\n      border-radius: ").concat(formItemBorderRadius, "px;\n    }\n    .bb-capture-toolbar-item-timer {\n      color: ").concat(subTextColor, ";\n    }\n    .bb-svg-path {\n      fill: ").concat(contrastBackgroundColor, ";\n    }\n    .bb-capture-toolbar-item {\n      border-radius: ").concat(formItemBorderRadius, "px;\n    }\n    .bb-capture-toolbar {\n      background-color: ").concat(backgroundColor, ";\n      border-radius: ").concat(formItemBorderRadius, "px;\n    }\n    .bb-capture-toolbar-item-colorpicker {\n      background-color: ").concat(backgroundColor, ";\n    }\n    .bb-capture-toolbar-item--active {\n      background-color: ").concat(backgroundColorHover, ";\n    }\n    .bb-feedback-button-classic {\n      border-top-left-radius: ").concat(formItemBorderRadius, "px;\n      border-top-right-radius: ").concat(formItemBorderRadius, "px;\n    }\n    .bb-logo-logo--default path {\n      fill: ").concat(contrastButtonColor, ";\n    }\n    .bb-logo-arrowdown {\n      fill: ").concat(contrastButtonColor, ";\n    }\n    .bb-feedback-button-icon {\n        background-color: ").concat(buttonColor, ";\n    }\n    .bb-feedback-button-classic {\n      background-color: ").concat(buttonColor, ";\n      color: ").concat(contrastButtonColor, ";\n    }\n\n    @media only screen and (max-width: 450px) {\n      .gleap-frame-container {\n        left: 20px;\n        right: 20px;\n        width: calc(100% - 40px) !important;\n      }\n\n      .bb-tooltip {\n        display: none !important;\n      }\n    \n      .bb-capture-toolbar-item-colorpicker {\n        top: 75px;\n      }\n    \n      .bb-capture-button-next {\n        margin-left: auto;\n      }\n    \n      .bb-capture-dismiss {\n        display: none;\n      }\n    \n      .bb-capture-toolbar {\n        top: 15px;\n        right: 15px;\n        left: 15px;\n        width: auto;\n        transform: none;\n      }\n    \n      .bb-capture-editor-drag-info {\n        display: none;\n      }\n    \n      .bb-capture-editor-borderlayer {\n        border-width: 4px;\n      }\n    }\n    \n    @media print {\n      .bb-feedback-button {\n        display: none !important;\n      }\n      \n      .gleap-frame-container {\n        display: none !important;\n      }\n    }\n    ");
  var oldNode = document.querySelector(".gleap-styles");

  if (oldNode) {
    oldNode.remove();
  }

  var node = document.createElement("style");
  node.innerHTML = colorStyleSheet;
  node.className = "gleap-styles";
  document.body.appendChild(node);
};
var loadIcon = function loadIcon(name, color) {
  if (name === "button") {
    return "<svg class=\"bb-logo-logo bb-logo-logo--default\" width=\"700px\" height=\"700px\" viewBox=\"0 0 700 700\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n    <g stroke=\"none\" stroke-width=\"1\" fill=\"none\" fill-rule=\"evenodd\">\n        <g transform=\"translate(77.000000, 119.000000)\" fill=\"#FFFFFF\" fill-rule=\"nonzero\">\n            <path d=\"M476.856373,0 L68.122339,0 C30.601832,0 0,30.5935323 0,67.1461527 L0,372.655827 C0,410.166158 30.601832,439.80198 68.122339,439.80198 L170.305847,439.80198 L170.305847,528.23059 C170.305847,538.605788 182.280477,544.671288 190.657396,538.552581 L323.602398,438.844269 L476.877661,438.844269 C514.398168,438.844269 545,408.250737 545,371.698116 L545,67.1461527 C544.978712,30.5935323 515.28163,0 476.856373,0 Z\"></path>\n        </g>\n    </g>\n</svg>";
  }

  if (name === "dismiss") {
    return "<svg width=\"1200pt\" height=\"1200pt\" version=\"1.1\" viewBox=\"0 0 1200 1200\" xmlns=\"http://www.w3.org/2000/svg\">\n    <path d=\"m684 600 439.2-439.2c22.801-22.801 22.801-60 0-84s-60-22.801-84 0l-439.2 439.2-439.2-439.2c-22.801-22.801-60-22.801-84 0s-22.801 60 0 84l439.2 439.2-439.2 439.2c-22.801 22.801-22.801 60 0 84 12 12 26.398 16.801 42 16.801 15.602 0 30-6 42-16.801l439.2-439.2 439.2 439.2c12 12 26.398 16.801 42 16.801 15.602 0 30-6 42-16.801 22.801-22.801 22.801-60 0-84z\" fill=\"#333\"/>\n   </svg>";
  }

  if (name === "blur") {
    return "<svg width=\"1200pt\" height=\"1200pt\" version=\"1.1\" viewBox=\"0 0 1200 1200\" xmlns=\"http://www.w3.org/2000/svg\">\n <path class=\"bb-svg-path\" d=\"m602.25 1200c238.2 0 435.95-193.26 435.95-435.95 0-269.66-220.23-615.73-435.95-764.05-220.23 161.8-440.45 485.39-440.45 764.05 0 242.7 197.75 435.95 440.45 435.95zm-260.68-382.02c0 112.36 89.887 206.74 206.74 206.74v62.922c-148.32 0-274.16-121.35-274.16-269.66z\" fill=\"#333\"/>\n</svg>";
  }

  if (name === "pen") {
    return "<svg width=\"1072px\" height=\"1034px\" viewBox=\"0 0 1072 1034\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n    <g stroke=\"none\" stroke-width=\"1\" fill=\"none\" fill-rule=\"evenodd\">\n        <g transform=\"translate(-907.000000, -217.000000)\" fill-rule=\"nonzero\">\n            <g transform=\"translate(907.268457, 217.009827)\">\n                <g transform=\"translate(132.335119, 0.000000)\" fill=\"#000\" class=\"bb-svg-path\">\n                    <path d=\"M20.3764235,730.530173 L10.1884235,720.342173 C-0.791576454,709.362173 -3.16357645,692.432173 4.37592355,678.858173 L83.1809235,537.018173 C71.7589235,502.979173 82.3098335,463.998173 112.254924,440.706173 L655.334924,18.3161733 C689.951924,-8.6058267 739.197924,-5.5388267 770.214924,25.4684733 L913.774924,169.028473 C944.782924,200.040473 947.848924,249.286473 920.927224,283.908473 L498.537224,826.988473 C496.322424,829.836173 493.935624,832.543173 491.384924,835.090073 C467.271924,859.207073 432.513924,866.195073 402.232924,856.063073 L260.382924,934.868073 C246.804924,942.407173 229.874924,940.036073 218.894924,929.055573 L208.706924,918.867573 L20.3764235,730.530173 Z M866.006424,241.190173 C871.393124,234.264373 870.779824,224.417173 864.576724,218.213173 L721.016724,74.6531733 C714.813624,68.4500733 704.965724,67.8367733 698.043724,73.2234733 L154.963724,495.613473 C147.381724,501.507973 146.018424,512.433473 151.912924,520.015473 C152.358234,520.585783 152.834804,521.128773 153.346524,521.636573 L417.586524,785.886573 C424.379524,792.675673 435.391524,792.675673 442.180524,785.886573 C442.692244,785.374853 443.168804,784.831873 443.610224,784.265473 L866.006424,241.190173 Z M342.796424,809.480173 L129.746424,596.430173 L77.9264235,689.707173 L249.516424,861.297173 L342.796424,809.480173 Z\"></path>\n                </g>\n                <g transform=\"translate(-0.000000, 755.530173)\" fill=\"#EB144C\">\n                    <path d=\"M124.711543,0 L313.042043,188.3374 L233.288043,268.0914 C222.003043,279.3764 204.483043,281.5324 190.800043,273.3219 L16.8900429,168.9719 C-2.51595711,157.3309 -5.80895711,130.5499 10.1908429,114.5499 L124.711543,0 Z\" class=\"bb-pen-tip\"></path>\n                </g>\n            </g>\n        </g>\n    </g>\n</svg>";
  }

  if (name === "rect") {
    return "<svg width=\"339px\" height=\"241px\" viewBox=\"0 0 339 241\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n    <g stroke=\"none\" stroke-width=\"1\" fill=\"none\" fill-rule=\"evenodd\">\n        <g transform=\"translate(-0.000865, 0.000000)\" fill-rule=\"nonzero\">\n            <g transform=\"translate(0.000865, 0.000000)\" fill=\"#000000\" class=\"bb-svg-path\">\n                <path d=\"M339,0 L339,241 L0,241 L0,0 L339,0 Z M312.826351,26.168387 L26.1855674,26.168387 L26.1855674,214.41156 L312.826351,214.41156 L312.826351,26.168387 Z\"></path>\n            </g>\n            <g transform=\"translate(0.000000, 83.206095)\" fill=\"#EB144C\" class=\"bb-pen-tip\">\n                <path d=\"M0,0 L26.186,26.186 L26.1864325,131.205465 L131.204,131.205 L157.792,157.793 L0.000865118243,157.793905 L0,0 Z\"></path>\n            </g>\n        </g>\n    </g>\n</svg>";
  }

  if (name === "pointer") {
    return "<svg width=\"1200pt\" height=\"1200pt\" version=\"1.1\" viewBox=\"0 0 1200 1200\" xmlns=\"http://www.w3.org/2000/svg\">\n    <path d=\"m1050.7 508.95-225.94 157.5 160.31 160.31c4.4531 4.4531 6.9141 10.43 6.9141 16.758s-2.4609 12.305-6.9141 16.758l-126.09 126.09c-4.4531 4.4531-10.43 6.9141-16.758 6.9141-6.3281 0-12.188-2.4609-16.758-6.9141l-160.2-160.43-157.62 225.94c-3.3984 4.9219-9.0234 7.8516-14.883 7.8516-0.70313 0-1.5234 0-2.2266-0.11719-6.7969-0.82031-12.422-5.2734-14.766-11.719l-333.16-880.55c-2.5781-6.6797-0.9375-14.297 4.2188-19.336 5.0391-5.0391 12.656-6.6797 19.336-4.2188l880.66 333.05c6.3281 2.3438 10.781 8.0859 11.602 14.766 0.82031 6.7969-2.1094 13.359-7.7344 17.344z\" fill=\"#333\"/>\n   </svg>";
  }

  if (name === "clip") {
    return "<svg width=\"600px\" height=\"1126px\" viewBox=\"0 0 600 1126\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n    <g stroke=\"none\" stroke-width=\"1\" fill=\"none\" fill-rule=\"evenodd\">\n        <g transform=\"translate(-0.002000, 0.501000)\" fill=\"#333333\" fill-rule=\"nonzero\">\n            <path d=\"M225.002,1124.999 C165.33,1124.999 108.102,1101.292 65.902,1059.097 C23.707,1016.902 5.68434189e-14,959.671 5.68434189e-14,899.997 L5.68434189e-14,299.997 C5.68434189e-14,220.431 31.605,144.127 87.867,87.867 C144.129,31.605 220.437,-4.26325641e-14 299.997,-4.26325641e-14 C379.557,-4.26325641e-14 455.867,31.605 512.127,87.867 C568.389,144.129 599.994,220.437 599.994,299.997 L599.994,1012.497 C599.994,1025.895 592.8456,1038.274 581.244,1044.974 C569.642,1051.6732 555.346,1051.6732 543.744,1044.974 C532.142,1038.2748 524.994,1025.896 524.994,1012.497 L524.994,299.997 C524.994,240.325 501.287,183.097 459.092,140.897 C416.897,98.702 359.666,74.995 299.992,74.995 C240.318,74.995 183.092,98.702 140.892,140.897 C98.697,183.092 74.99,240.323 74.99,299.997 L74.99,899.997 C74.99,953.587 103.58,1003.107 149.99,1029.897 C196.4,1056.694 253.58,1056.694 299.99,1029.897 C346.4,1003.104 374.99,953.585 374.99,899.997 L374.99,337.497 C374.99,310.704 360.697,285.942 337.49,272.544 C314.283,259.149 285.697,259.149 262.49,272.544 C239.283,285.942 224.99,310.704 224.99,337.497 L224.99,824.997 C224.99,838.395 217.8416,850.774 206.24,857.474 C194.638,864.1732 180.342,864.1732 168.74,857.474 C157.138,850.7748 149.99,838.396 149.99,824.997 L149.99,337.497 C149.99,283.907 178.58,234.387 224.99,207.597 C271.4,180.8 328.58,180.8 374.99,207.597 C421.4,234.39 449.99,283.909 449.99,337.497 L449.99,899.997 C449.99,959.669 426.283,1016.897 384.088,1059.097 C341.893,1101.292 284.662,1124.999 224.988,1124.999 L225.002,1124.999 Z\" id=\"Path\"></path>\n        </g>\n    </g>\n</svg>";
  }

  if (name === "mic") {
    return "<svg\n    width=\"1200pt\"\n    height=\"1200pt\"\n    version=\"1.1\"\n    viewBox=\"0 0 1200 1200\"\n    xmlns=\"http://www.w3.org/2000/svg\"\n  >\n    <g class=\"bb-svg-path\">\n      <path\n        d=\"m600 862.5c144.75 0 262.5-117.75 262.5-262.5v-300c0-144.75-117.75-262.5-262.5-262.5s-262.5 117.75-262.5 262.5v300c0 144.75 117.75 262.5 262.5 262.5z\"\n      />\n      <path\n        d=\"m1012.5 600c0-20.707-16.793-37.5-37.5-37.5s-37.5 16.793-37.5 37.5c0 186.11-151.41 337.5-337.5 337.5s-337.5-151.39-337.5-337.5c0-20.707-16.793-37.5-37.5-37.5s-37.5 16.793-37.5 37.5c0 214.8 165.08 391.57 375 410.6v114.4c0 20.727 16.793 37.5 37.5 37.5s37.5-16.773 37.5-37.5v-114.4c209.92-19.031 375-195.8 375-410.6z\"\n      />\n    </g>\n  </svg>";
  }

  if (name === "camera") {
    return "<svg width=\"1155px\" height=\"1004px\" viewBox=\"0 0 1155 1004\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n    <g stroke=\"none\" stroke-width=\"1\" fill=\"none\" fill-rule=\"evenodd\">\n        <g fill=\"#333333\" fill-rule=\"nonzero\">\n            <g transform=\"translate(128.324095, 0.000000)\">\n                <path d=\"M42.7803063,0.00413459787 C31.4357421,0.00413459787 20.5549853,4.41399115 12.5336107,12.2572687 C4.51223664,20.1005462 0.00420584816,30.741831 0.00420584816,41.8370305 L0.00420584816,251.00151 C-0.156199045,262.200455 4.27736739,272.989996 12.315738,280.963903 C20.3585574,288.938257 31.3288589,293.431222 42.7803063,293.431222 C54.2317532,293.431222 65.2018267,288.938592 73.2448746,280.963903 C81.2832452,272.989549 85.7172445,262.200455 85.5564062,251.00151 L85.5564062,83.6699265 L256.660808,83.6699265 C268.112255,83.8267939 279.145066,79.4909873 287.298762,71.6298611 C295.452913,63.7643845 300.04718,53.0359758 300.04718,41.8370305 C300.04718,30.6380854 295.453255,19.9098998 287.298762,12.0441998 C279.144611,4.18307356 268.112255,-0.153157091 256.660808,0.00413459787 L42.7803063,0.00413459787 Z\"></path>\n                <path d=\"M983.227131,710.59444 C971.895913,710.764382 961.099907,715.326799 953.20401,723.279287 C945.312674,731.227538 940.964345,741.91668 941.119476,752.99849 L941.119476,920.330075 L770.015075,920.330075 C758.563631,920.173205 747.530815,924.509015 739.377123,932.370139 C731.222968,940.235615 726.628705,950.964028 726.628705,962.16297 C726.628705,973.361918 731.222627,984.090105 739.377123,991.955802 C747.531272,999.816926 758.563631,1004.15316 770.015075,1003.99587 L983.895579,1003.99587 C995.24014,1003.99587 1006.1209,999.586011 1014.14227,991.742733 C1022.16365,983.899455 1026.67168,973.258169 1026.67168,962.16297 L1026.67168,752.99849 C1026.83208,741.690223 1022.30053,730.801401 1014.11489,722.812989 C1005.93394,714.825472 994.790363,710.415949 983.227131,710.59444 L983.227131,710.59444 Z\"></path>\n                <path d=\"M983.227131,375.93127 C971.895913,376.101212 961.099907,380.66363 953.20401,388.61612 C945.312674,396.56437 940.964345,407.253512 941.119476,418.335325 L941.119476,585.66691 C940.959072,596.865853 945.39264,607.655394 953.431008,615.629303 C961.47383,623.603658 972.444131,628.096618 983.895579,628.096618 C995.347023,628.096618 1006.3171,623.603989 1014.36015,615.629303 C1022.39852,607.654947 1026.83251,596.865853 1026.67168,585.66691 L1026.67168,418.335325 C1026.83208,407.027056 1022.30053,396.138232 1014.11489,388.149822 C1005.93394,380.162305 994.790363,375.752783 983.227131,375.93127 L983.227131,375.93127 Z\"></path>\n                <path d=\"M769.974012,0.00413459787 C758.522563,-0.152733184 747.489752,4.18307356 739.336055,12.0441998 C731.181906,19.9096767 726.587637,30.6380854 726.587637,41.8370305 C726.587637,53.0359758 731.181564,63.7641611 739.336055,71.6298611 C747.490209,79.4909873 758.522563,83.8272181 769.974012,83.6699265 L941.078414,83.6699265 L941.078414,251.00151 C940.918009,262.200455 945.351572,272.989996 953.389945,280.963903 C961.432763,288.938257 972.403063,293.431222 983.854512,293.431222 C995.30596,293.431222 1006.27603,288.938592 1014.31908,280.963903 C1022.35745,272.989549 1026.79145,262.200455 1026.63061,251.00151 L1026.63061,41.8370305 C1026.63061,30.7426118 1022.12133,20.1017733 1014.10121,12.2572687 C1006.08109,4.41276405 995.199876,0.00413459787 983.854512,0.00413459787 L769.974012,0.00413459787 Z\"></path>\n                <path d=\"M427.765208,0.00413459787 C416.31376,-0.152733184 405.280949,4.18307356 397.127256,12.0441998 C388.973102,19.9096767 384.378838,30.6380854 384.378838,41.8370305 C384.378838,53.0359758 388.972761,63.7641611 397.127256,71.6298611 C405.281406,79.4909873 416.31376,83.8272181 427.765208,83.6699265 L598.86961,83.6699265 C610.321058,83.8267939 621.35387,79.4909873 629.507562,71.6298611 C637.661716,63.7643845 642.255985,53.0359758 642.255985,41.8370305 C642.255985,30.6380854 637.662058,19.9098998 629.507562,12.0441998 C621.353413,4.18307356 610.321058,-0.153157091 598.86961,0.00413459787 L427.765208,0.00413459787 Z\"></path>\n            </g>\n            <g transform=\"translate(0.000000, 427.000000)\">\n                <path d=\"M768.516184,22.1826583 C752.659627,13.73125 732.573775,13.73125 717.773442,24.29375 L562.379192,124.6375 L562.379192,31.6875 C562.379192,13.7330104 548.635081,0 530.666079,0 L31.7131123,0 C13.7441105,0 0,13.7330104 0,31.6875 L0,475.3125 C0,493.26699 13.7441105,507 31.7131123,507 L530.666079,507 C548.635081,507 562.379192,493.26699 562.379192,475.3125 L562.379192,382.3625 L717.773442,482.70625 C726.231681,487.9875 735.742444,491.157658 745.257258,491.157658 C753.715498,491.157658 761.113815,489.046567 769.572406,484.820862 C786.485185,475.313732 796,458.414612 796,439.400352 L796,68.6566021 C794.943601,48.5869719 785.428963,31.6878521 768.516184,22.1807219 L768.516184,22.1826583 Z\"></path>\n            </g>\n        </g>\n    </g>\n</svg>";
  }

  if (name === "recorderon") {
    return "<svg width=\"1251px\" height=\"1251px\" viewBox=\"0 0 1251 1251\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n    <g stroke=\"none\" stroke-width=\"1\" fill=\"none\" fill-rule=\"evenodd\">\n        <g>\n            <circle fill=\"#E31810\" cx=\"625.5\" cy=\"625.5\" r=\"625.5\"></circle>\n            <circle fill=\"#F71008\" cx=\"625\" cy=\"625\" r=\"507\"></circle>\n            <g transform=\"translate(175.000000, 449.000000)\" fill=\"#FFFFFF\" fill-rule=\"nonzero\">\n                <path d=\"M0,347.097493 L0,4.90250696 L135.528311,4.90250696 C161.471024,4.90250696 183.639743,9.49741034 202.034469,18.6872171 C220.429194,27.8770239 234.46286,40.8541449 244.135466,57.6185803 C253.808072,74.3830156 258.644376,94.0714804 258.644376,116.683975 C258.644376,139.40786 253.724206,158.929238 243.883867,175.248107 C234.043527,191.566976 219.814173,204.070682 201.195803,212.759227 C182.577434,221.447772 160.073248,225.792044 133.683247,225.792044 L42.9396629,225.792044 L42.9396629,167.64563 L121.941933,167.64563 C135.807866,167.64563 147.325536,165.751973 156.494943,161.964659 C165.66435,158.177344 172.51345,152.496373 177.042243,144.921744 C181.571035,137.347116 183.835432,127.934526 183.835432,116.683975 C183.835432,105.322032 181.571035,95.7423543 177.042243,87.9449425 C172.51345,80.1475308 165.636395,74.2159282 156.411077,70.1501349 C147.185759,66.0843416 135.584222,64.051445 121.606467,64.051445 L72.6284142,64.051445 L72.6284142,347.097493 L0,347.097493 Z M185.512762,191.37204 L270.888889,347.097493 L190.712487,347.097493 L107.181424,191.37204 L185.512762,191.37204 Z\"></path>\n                <polygon points=\"309.166667 347.097493 309.166667 4.90250696 540.126846 4.90250696 540.126846 64.5527072 381.634607 64.5527072 381.634607 146.091356 528.244113 146.091356 528.244113 205.741556 381.634607 205.741556 381.634607 287.447293 540.796296 287.447293 540.796296 347.097493\"></polygon>\n                <path d=\"M901,124.638783 L827.757943,124.638783 C826.420189,115.158428 823.68894,106.709759 819.564197,99.2927757 C815.439454,91.8757921 810.144176,85.5462611 803.678363,80.3041825 C797.212549,75.0621039 789.77129,71.0468948 781.354585,68.2585551 C772.93788,65.4702155 763.824427,64.0760456 754.014228,64.0760456 C736.288981,64.0760456 720.849065,68.4537389 707.69448,77.2091255 C694.539894,85.964512 684.339516,98.6793409 677.093346,115.353612 C669.847176,132.027883 666.224091,152.243346 666.224091,176 C666.224091,200.425856 669.875046,220.948035 677.176956,237.56654 C684.478866,254.185044 694.707113,266.732573 707.861699,275.209125 C721.016285,283.685678 736.233242,287.923954 753.51257,287.923954 C763.21129,287.923954 772.213263,286.641318 780.518488,284.076046 C788.823714,281.510773 796.209233,277.746515 802.675047,272.78327 C809.14086,267.820025 814.519748,261.769328 818.81171,254.631179 C823.103672,247.493029 826.08575,239.351077 827.757943,230.205323 L901,230.539924 C899.104848,246.26616 894.394837,261.406844 886.869968,275.961977 C879.3451,290.51711 869.256201,303.510773 856.603274,314.942966 C843.950346,326.375158 828.900608,335.409379 811.45406,342.045627 C794.007513,348.681876 774.303504,352 752.342035,352 C721.796641,352 694.512024,345.084918 670.488184,331.254753 C646.464343,317.424588 627.512821,297.404309 613.633619,271.193916 C599.754416,244.983523 592.814815,213.252218 592.814815,176 C592.814815,138.636248 599.838026,106.849176 613.884448,80.6387833 C627.93087,54.4283904 646.993871,34.4359949 671.073451,20.661597 C695.153031,6.88719899 722.242559,0 752.342035,0 C772.185393,0 790.607387,2.78833967 807.608016,8.36501901 C824.608646,13.9416984 839.686254,22.0557668 852.840839,32.7072243 C865.995425,43.3586819 876.72533,56.3802281 885.030556,71.7718631 C893.335782,87.1634981 898.65893,104.785805 901,124.638783 Z\"></path>\n            </g>\n        </g>\n    </g>\n</svg>";
  }

  if (name === "recorderoff") {
    return "<svg width=\"1251px\" height=\"1251px\" viewBox=\"0 0 1251 1251\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n      <g stroke=\"none\" stroke-width=\"1\" fill=\"none\" fill-rule=\"evenodd\">\n          <g class=\"bb-rec-on-circle\" fill=\"#EEEEEE\" fill-rule=\"nonzero\">\n              <path d=\"M625.5,0 C970.954111,0 1251,280.045889 1251,625.5 C1251,970.954111 970.954111,1251 625.5,1251 C280.045889,1251 0,970.954111 0,625.5 C0,280.045889 280.045889,0 625.5,0 Z M626,124 C348.753056,124 124,348.753056 124,626 C124,903.246944 348.753056,1128 626,1128 C903.246944,1128 1128,903.246944 1128,626 C1128,348.753056 903.246944,124 626,124 Z\"></path>\n          </g>\n          <g class=\"bb-rec-on-cont\" fill=\"#E31810\" transform=\"translate(86.000000, 86.000000)\" fill-rule=\"nonzero\">\n              <path d=\"M540,0 C241.2,0 0,241.2 0,540 C0,838.8 241.2,1080 540,1080 C838.8,1080 1080,838.8 1080,540 C1080,241.2 838.8,0 540,0 Z M777.6,741.6 C777.6,761.998 761.998,777.6 741.6,777.6 L338.4,777.6 C318.002,777.6 302.4,761.998 302.4,741.6 L302.4,338.4 C302.4,318.002 318.002,302.4 338.4,302.4 L741.6,302.4 C761.998,302.4 777.6,318.002 777.6,338.4 L777.6,741.6 Z\"></path>\n          </g>\n      </g>\n  </svg>";
  }

  if (name === "arrowdown") {
    return "<svg class=\"bb-logo-arrowdown\" fill=\"".concat(color, "\" width=\"100pt\" height=\"100pt\" version=\"1.1\" viewBox=\"0 0 100 100\" xmlns=\"http://www.w3.org/2000/svg\">\n    <path d=\"m50 77.637c-1.3477 0-2.6953-0.51562-3.7266-1.543l-44.73-44.73c-2.0586-2.0586-2.0586-5.3945 0-7.4531 2.0586-2.0586 5.3945-2.0586 7.4531 0l41.004 41 41.004-41c2.0586-2.0586 5.3945-2.0586 7.4531 0 2.0586 2.0586 2.0586 5.3945 0 7.4531l-44.73 44.727c-1.0312 1.0312-2.3789 1.5469-3.7266 1.5469z\"/>\n   </svg>");
  }

  if (name === "arrowleft") {
    return "<svg fill=\"".concat(color, "\" width=\"100pt\" height=\"100pt\" version=\"1.1\" viewBox=\"0 0 100 100\" xmlns=\"http://www.w3.org/2000/svg\">\n    <path d=\"m70.988 1.6211c2.1875-2.168 5.7344-2.168 7.9297 0 2.1836 2.168 2.1836 5.7227 0 7.8906l-46.016 40.445 46.016 40.5c2.1836 2.168 2.1836 5.668 0 7.8906-2.1953 2.168-5.7383 2.168-7.9297 0l-50.039-44.109c-1.168-1.168-1.668-2.7227-1.5898-4.2773-0.078125-1.5 0.42188-3.0547 1.5898-4.2227l50.039-44.109z\" fill-rule=\"evenodd\"/>\n   </svg>");
  }

  if (name === "close") {
    return "<svg fill=\"".concat(color, "\" width=\"100pt\" height=\"100pt\" version=\"1.1\" viewBox=\"0 0 100 100\" xmlns=\"http://www.w3.org/2000/svg\">\n    <path d=\"m72.812 33.02l-5.832-5.832-16.98 16.875-16.98-16.875-5.832 5.832 16.875 16.98-16.875 16.98 5.832 5.832 16.98-16.875 16.98 16.875 5.832-5.832-16.875-16.98z\"/>\n   </svg>");
  }

  if (name === "undo") {
    return "<svg width=\"62px\" height=\"60px\" viewBox=\"0 0 62 60\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n    <g stroke=\"none\" stroke-width=\"1\" fill=\"none\" fill-rule=\"evenodd\">\n      <g class=\"bb-svg-path\" transform=\"translate(-0.000500, 0.001926)\" fill-rule=\"nonzero\">\n        <path d=\"M28.0005,51.6270739 C24.9653,51.0684839 22.0825,49.8731739 19.5396,48.1192739 L13.8208,53.8380739 C17.9536,57.0060739 22.8403,59.0333739 28.0008,59.7286739 L28.0005,51.6270739 Z\" id=\"Path\"></path>\n        <path d=\"M2.2705,33.9980739 C2.96581,39.1582739 4.9932,44.0450739 8.1611,48.1780739 L13.8799,42.4592739 C12.126,39.9162739 10.9307,37.0334739 10.3721,33.9983739 L2.2705,33.9980739 Z\" id=\"Path\"></path>\n        <path d=\"M61.7305,33.9980739 L53.6289,33.9980739 C53.07031,37.0332739 51.875,39.9160739 50.1211,42.4589739 L55.8399,48.1777739 C59.0079,44.0449739 61.0352,39.1582739 61.7305,33.9977739 L61.7305,33.9980739 Z\" id=\"Path\"></path>\n        <path d=\"M4.0005,24.9980739 L24.0005,24.9980739 L24.0005,16.9980739 L14.27,16.9980739 C17.6762,12.3613739 22.7622,9.24417393 28.442,8.31057393 C34.1178,7.38088393 39.934,8.70901393 44.645,12.0175739 C49.352,15.3222739 52.5786,20.3417739 53.6294,25.9975739 L61.731,25.9975739 C60.6646,18.0834739 56.4888,10.9235739 50.129,6.09957393 C43.7657,1.27147393 35.746,-0.818426068 27.836,0.290973932 C19.9298,1.39647393 12.793,5.61127393 8,11.9979739 L8,0.997973932 L-3.55271368e-15,0.997973932 L-3.55271368e-15,20.9979739 C-3.55271368e-15,22.0604739 0.42188,23.0760739 1.1719,23.8260739 C1.92192,24.5760739 2.9375,24.9979739 4,24.9979739 L4.0005,24.9980739 Z\" id=\"Path\"></path>\n        <path d=\"M36.0005,51.6270739 L36.0005,59.7286739 C41.1607,59.0333639 46.0475,57.0059739 50.1805,53.8380739 L44.4617,48.1192739 C41.9187,49.8731739 39.0359,51.0684739 36.0008,51.6270739 L36.0005,51.6270739 Z\" id=\"Path\"></path>\n      </g>\n    </g>\n  </svg>";
  }

  return "";
};
;// CONCATENATED MODULE: ./src/GleapNetworkIntercepter.js
function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var GleapNetworkIntercepter = /*#__PURE__*/function () {
  function GleapNetworkIntercepter() {
    _classCallCheck(this, GleapNetworkIntercepter);

    _defineProperty(this, "startTimestamp", Date.now());

    _defineProperty(this, "requestId", 0);

    _defineProperty(this, "requests", {});

    _defineProperty(this, "maxRequests", 10);

    _defineProperty(this, "filters", []);

    _defineProperty(this, "blacklist", ["gleap.io"]);

    _defineProperty(this, "initialized", false);

    _defineProperty(this, "stopped", false);

    _defineProperty(this, "loadAllResources", false);
  }

  _createClass(GleapNetworkIntercepter, [{
    key: "setLoadAllResources",
    value: function setLoadAllResources(loadAllResources) {
      this.loadAllResources = loadAllResources;
    }
  }, {
    key: "isContentTypeSupported",
    value: function isContentTypeSupported(contentType) {
      if (typeof contentType !== "string") {
        return false;
      }

      if (contentType === "") {
        return true;
      }

      contentType = contentType.toLocaleLowerCase();
      var supportedContentTypes = ["text/", "xml", "json"];

      for (var i = 0; i < supportedContentTypes.length; i++) {
        if (contentType.includes(supportedContentTypes[i])) {
          return true;
        }
      }

      return false;
    }
  }, {
    key: "getRequests",
    value: function getRequests() {
      var _this = this;

      var requests = JSON.parse(JSON.stringify(Object.values(this.requests)));

      if (this.filters && this.filters.length > 0) {
        // Perform network log filtering.
        for (var i = 0; i < requests.length; i++) {
          var request = requests[i]; // Headers

          if (request && request.request && request.request.headers) {
            for (var j = 0; j < this.filters.length; j++) {
              delete request.request.headers[this.filters[j]];
            }
          } // Payload


          if (request && request.request && request.request.payload) {
            var payloadObj = request.request.payload;

            try {
              payloadObj = JSON.parse(request.request.payload);
            } catch (e) {}

            if (payloadObj) {
              for (var j = 0; j < this.filters.length; j++) {
                delete payloadObj[this.filters[j]];
              }

              request.request.payload = JSON.stringify(payloadObj);
            }
          } // Response


          if (request && request.response && request.response.responseText) {
            try {
              var data = JSON.parse(request.response.responseText);

              for (var j = 0; j < this.filters.length; j++) {
                delete data[this.filters[j]];
              }

              request.response.responseText = JSON.stringify(data);
            } catch (e) {}
          }
        }
      } // Get static resources from performance.


      try {
        if (typeof window !== "undefined" && window.performance) {
          var resources = window.performance.getEntriesByType("resource");

          for (var i = 0; i < resources.length; i++) {
            var resource = resources[i];

            if (resource && resource.name) {
              if ((this.loadAllResources || ["xmlhttprequest", "fetch"].indexOf(resource.initiatorType) > -1) && !requests.find(function (request) {
                return request.url === resource.name;
              })) {
                requests.push({
                  type: "RESOURCE",
                  date: new Date(this.startTimestamp + resource.startTime),
                  url: resource.name,
                  duration: Math.round(resource.duration),
                  initiatorType: resource.initiatorType
                });
              }
            }
          }
        }
      } catch (exp) {}

      if (this.blacklist && this.blacklist.length > 0) {
        requests = requests.filter(function (request) {
          for (var i = 0; i < _this.blacklist.length; i++) {
            if (request.url && request.url.includes(_this.blacklist[i])) {
              return false;
            }
          }

          return true;
        });
      }

      return requests;
    }
  }, {
    key: "setMaxRequests",
    value: function setMaxRequests(maxRequests) {
      this.maxRequests = maxRequests;
    }
  }, {
    key: "setStopped",
    value: function setStopped(stopped) {
      this.stopped = stopped;
    }
  }, {
    key: "setFilters",
    value: function setFilters(filters) {
      this.filters = filters ? filters : [];
    }
  }, {
    key: "setBlacklist",
    value: function setBlacklist(blacklist) {
      this.blacklist = blacklist ? blacklist : [];
    }
  }, {
    key: "cleanRequests",
    value: function cleanRequests() {
      var keys = Object.keys(this.requests);

      if (keys.length > this.maxRequests) {
        var keysToRemove = keys.slice(0, keys.length - this.maxRequests);

        for (var i = 0; i < keysToRemove.length; i++) {
          delete this.requests[keysToRemove[i]];
        }
      }
    }
  }, {
    key: "calcRequestTime",
    value: function calcRequestTime(bbRequestId) {
      if (!bbRequestId || !this.requests || !this.requests[bbRequestId]) {
        return;
      }

      var startDate = this.requests[bbRequestId]["date"];

      if (startDate) {
        this.requests[bbRequestId]["duration"] = new Date().getTime() - startDate.getTime();
      }
    }
  }, {
    key: "getTextContentSize",
    value: function getTextContentSize(text) {
      var size = new TextEncoder().encode(text).length;
      var kiloBytes = size / 1024;
      var megaBytes = kiloBytes / 1024;
      return megaBytes;
    }
  }, {
    key: "cleanupContentSize",
    value: function cleanupContentSize(text) {
      var contentSize = this.getTextContentSize(text);

      if (contentSize > 0.2) {
        return "<content_too_large>";
      }

      return text;
    }
  }, {
    key: "cleanupPayload",
    value: function cleanupPayload(payload) {
      if (payload === undefined || payload === null) {
        return "{}";
      }

      try {
        if ((typeof TextDecoder === "undefined" ? "undefined" : _typeof(TextDecoder)) !== undefined && ArrayBuffer.isView(payload)) {
          var value = new TextDecoder().decode(payload);
          return value;
        }
      } catch (exp) {}

      return payload;
    }
  }, {
    key: "preparePayload",
    value: function preparePayload(payload) {
      var payloadText = this.cleanupPayload(payload);
      return this.cleanupContentSize(payloadText);
    }
  }, {
    key: "start",
    value: function start() {
      var _this2 = this;

      if (this.initialized) {
        return;
      }

      this.initialized = true;
      var self = this;
      this.interceptNetworkRequests({
        onFetch: function onFetch(params, bbRequestId) {
          if (_this2.stopped || !bbRequestId || !_this2.requests) {
            return;
          }

          if (params.length > 0 && typeof params[0] !== "undefined" && typeof params[0].url !== "undefined") {
            _this2.requests[bbRequestId] = {
              url: params[0].url,
              date: new Date(),
              request: {
                payload: "",
                headers: typeof params[0].headers !== "undefined" ? Object.fromEntries(params[0].headers.entries()) : {}
              },
              type: typeof params[0].method !== "undefined" ? params[0].method : ""
            };
          } else {
            if (params.length >= 2 && params[1]) {
              var method = params[1] && params[1].method ? params[1].method : "GET";
              _this2.requests[bbRequestId] = {
                request: {
                  payload: self.preparePayload(params[1].body),
                  headers: params[1].headers
                },
                type: method,
                url: params[0],
                date: new Date()
              };
            } else {
              _this2.requests[bbRequestId] = {
                url: params[0],
                date: new Date()
              };
            }
          }

          _this2.cleanRequests();
        },
        onFetchLoad: function onFetchLoad(req, bbRequestId) {
          if (_this2.stopped || !bbRequestId || !_this2.requests || !_this2.requests[bbRequestId]) {
            return;
          }

          try {
            _this2.requests[bbRequestId]["success"] = true;
            _this2.requests[bbRequestId]["response"] = {
              status: req.status,
              statusText: "",
              responseText: "<request_still_open>"
            };

            _this2.calcRequestTime(bbRequestId);
          } catch (exp) {}

          try {
            var contentType = "";

            if (req.headers && typeof req.headers.get !== "undefined") {
              contentType = req.headers.get("content-type");
            }

            if (_this2.isContentTypeSupported(contentType)) {
              req.text().then(function (responseText) {
                if (_this2.requests[bbRequestId]) {
                  _this2.requests[bbRequestId]["success"] = true;
                  _this2.requests[bbRequestId]["response"] = {
                    status: req.status,
                    statusText: req.statusText,
                    responseText: self.cleanupContentSize(responseText)
                  };
                }

                _this2.calcRequestTime(bbRequestId);

                _this2.cleanRequests();
              })["catch"](function (err) {
                _this2.cleanRequests();
              });
            } else {
              if (_this2.requests[bbRequestId]) {
                _this2.requests[bbRequestId]["success"] = true;
                _this2.requests[bbRequestId]["response"] = {
                  status: req.status,
                  statusText: req.statusText,
                  responseText: "<content_type_not_supported>"
                };
              }

              _this2.calcRequestTime(bbRequestId);

              _this2.cleanRequests();
            }
          } catch (exp) {}
        },
        onFetchFailed: function onFetchFailed(err, bbRequestId) {
          if (_this2.stopped || !bbRequestId || !_this2.requests || !_this2.requests[bbRequestId]) {
            return;
          }

          _this2.requests[bbRequestId]["success"] = false;

          _this2.calcRequestTime(bbRequestId);

          _this2.cleanRequests();
        },
        onOpen: function onOpen(request, args) {
          if (_this2.stopped) {
            return;
          }

          if (request && request.bbRequestId && args.length >= 2 && _this2.requests) {
            _this2.requests[request.bbRequestId] = {
              type: args[0],
              url: args[1],
              date: new Date()
            };
          }

          _this2.cleanRequests();
        },
        onSend: function onSend(request, args) {
          if (_this2.stopped) {
            return;
          }

          if (request && request.bbRequestId && _this2.requests && _this2.requests[request.bbRequestId]) {
            _this2.requests[request.bbRequestId]["request"] = {
              payload: _this2.preparePayload(args.length > 0 ? args[0] : "{}"),
              headers: request.requestHeaders
            };
          }

          _this2.cleanRequests();
        },
        onError: function onError(request, args) {
          if (!_this2.stopped && _this2.requests && request && request.currentTarget && request.currentTarget.bbRequestId && _this2.requests[request.currentTarget.bbRequestId]) {
            _this2.requests[request.currentTarget.bbRequestId]["success"] = false;

            _this2.calcRequestTime(request.bbRequestId);
          }

          _this2.cleanRequests();
        },
        onLoad: function onLoad(request, args) {
          if (_this2.stopped) {
            return;
          }

          if (request && request.currentTarget && request.currentTarget.bbRequestId && _this2.requests && _this2.requests[request.currentTarget.bbRequestId]) {
            var target = request.currentTarget;
            var responseType = target.responseType;
            var responseText = "<" + responseType + ">";

            if (responseType === "" || responseType === "text") {
              responseText = _this2.cleanupContentSize(target.responseText);
            }

            _this2.requests[target.bbRequestId]["success"] = true;
            _this2.requests[target.bbRequestId]["response"] = {
              status: target.status,
              statusText: target.statusText,
              responseText: responseText
            };

            _this2.calcRequestTime(target.bbRequestId);
          }

          _this2.cleanRequests();
        }
      });
    }
  }, {
    key: "interceptNetworkRequests",
    value: function interceptNetworkRequests(callback) {
      var self = this;
      var open = XMLHttpRequest.prototype.open;
      var send = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.wrappedSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

      XMLHttpRequest.prototype.setRequestHeader = function (header, value) {
        if (!this.requestHeaders) {
          this.requestHeaders = {};
        }

        if (this.requestHeaders && this.requestHeaders.hasOwnProperty(header)) {
          return;
        }

        if (!this.requestHeaders[header]) {
          this.requestHeaders[header] = [];
        }

        this.requestHeaders[header].push(value);
        this.wrappedSetRequestHeader(header, value);
      };

      XMLHttpRequest.prototype.open = function () {
        this["bbRequestId"] = ++self.requestId;
        callback.onOpen && callback.onOpen(this, arguments);

        if (callback.onLoad) {
          this.addEventListener("load", callback.onLoad.bind(callback));
        }

        if (callback.onError) {
          this.addEventListener("error", callback.onError.bind(callback));
        }

        return open.apply(this, arguments);
      };

      XMLHttpRequest.prototype.send = function () {
        callback.onSend && callback.onSend(this, arguments);
        return send.apply(this, arguments);
      };

      if (window.fetch) {
        (function () {
          var originalFetch = window.fetch;

          window.fetch = function () {
            var bbRequestId = ++self.requestId;
            callback.onFetch(arguments, bbRequestId);
            return originalFetch.apply(this, arguments).then(function (response) {
              if (response && typeof response.clone === "function") {
                var data = response.clone();
                callback.onFetchLoad(data, bbRequestId);
              }

              return response;
            })["catch"](function (err) {
              callback.onFetchFailed(err, bbRequestId);
              throw err;
            });
          };
        })();
      }

      return callback;
    }
  }, {
    key: "blobToTextPromise",
    value: function blobToTextPromise(blob) {
      return new Promise(function (resolve, reject) {
        var fr = new FileReader();

        fr.onload = function (evt) {
          if (evt && evt.target && evt.target.result) {
            resolve(evt.target.result);
          } else {
            reject();
          }
        };

        fr.onerror = function (err) {
          reject(err);
        };

        fr.readAsText(blob);
      });
    }
  }], [{
    key: "getInstance",
    value: function getInstance() {
      if (!this.instance) {
        this.instance = new GleapNetworkIntercepter();
      }

      return this.instance;
    }
  }]);

  return GleapNetworkIntercepter;
}();

_defineProperty(GleapNetworkIntercepter, "instance", void 0);

/* harmony default export */ const src_GleapNetworkIntercepter = (GleapNetworkIntercepter);
;// CONCATENATED MODULE: ./src/GleapHelper.js
var resizeImage = function resizeImage(base64Str) {
  var maxWidth = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 400;
  var maxHeight = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 400;
  return new Promise(function (resolve, reject) {
    var isJPEG = base64Str.indexOf("data:image/jpeg") === 0;
    var img = new Image();
    img.src = base64Str;

    img.onerror = function () {
      reject();
    };

    img.onload = function () {
      var canvas = document.createElement("canvas");
      var MAX_WIDTH = maxWidth;
      var MAX_HEIGHT = maxHeight; // Adjust max width / height based on image props

      if (maxWidth > img.width / 4) {
        MAX_WIDTH = img.width / 4;
      }

      if (maxHeight > img.height / 4) {
        MAX_HEIGHT = img.height / 4;
      }

      var width = img.width;
      var height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      var ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      if (isJPEG) {
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      } else {
        resolve(canvas.toDataURL());
      }
    };
  });
};
var isMobile = function isMobile() {
  if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0, 4))) {
    return true;
  }

  return false;
};
var gleapDataParser = function gleapDataParser(data) {
  if (typeof data === "string" || data instanceof String) {
    try {
      return JSON.parse(data);
    } catch (e) {
      return {};
    }
  }

  return data;
};
var truncateString = function truncateString(str, num) {
  if (str.length > num) {
    return str.slice(0, num) + "...";
  } else {
    return str;
  }
};
var loadFromGleapCache = function loadFromGleapCache(key) {
  try {
    var cachedData = localStorage.getItem("gleap-widget-".concat(key));

    if (cachedData) {
      var config = JSON.parse(cachedData);
      return config;
    }
  } catch (exp) {}

  return null;
};
var saveToGleapCache = function saveToGleapCache(key, data) {
  var k = "gleap-widget-".concat(key);

  if (data) {
    try {
      localStorage.setItem(k, JSON.stringify(data));
    } catch (exp) {}
  } else {
    localStorage.removeItem(k);
  }
};
var getDOMElementDescription = function getDOMElementDescription(element) {
  var html = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
  var innerText = truncateString(element.innerText || '', 40).replace(/(\r\n|\n|\r)/gm, "").replace(/ +(?= )/g, '');
  var elementId = "";
  var elementClass = "";

  if (typeof element.getAttribute !== "undefined") {
    var elemId = element.getAttribute("id");

    if (elemId) {
      elementId = " id=\"".concat(elemId, "\"");
    }

    var elemClass = element.getAttribute("class");

    if (elemClass) {
      elementClass = " class=\"".concat(elemClass, "\"");
    }
  }

  var elementTag = (element.tagName || '').toLowerCase();
  var htmlPre = "<";
  var htmlPost = ">";

  if (!html) {
    htmlPre = "[";
    htmlPost = "]";
  }

  return "".concat(htmlPre).concat(elementTag).concat(elementId).concat(elementClass).concat(htmlPost).concat(innerText).concat(htmlPre, "/").concat(elementTag).concat(htmlPost);
};
;// CONCATENATED MODULE: ./src/GleapSession.js
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { GleapSession_defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function GleapSession_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function GleapSession_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function GleapSession_createClass(Constructor, protoProps, staticProps) { if (protoProps) GleapSession_defineProperties(Constructor.prototype, protoProps); if (staticProps) GleapSession_defineProperties(Constructor, staticProps); return Constructor; }

function GleapSession_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }




var GleapSession = /*#__PURE__*/function () {
  function GleapSession() {
    var _this = this;

    GleapSession_classCallCheck(this, GleapSession);

    GleapSession_defineProperty(this, "apiUrl", "https://api.gleap.io");

    GleapSession_defineProperty(this, "sdkKey", null);

    GleapSession_defineProperty(this, "session", {
      gleapId: null,
      gleapHash: null,
      name: "",
      email: "",
      userId: "",
      phone: "",
      value: 0
    });

    GleapSession_defineProperty(this, "ready", false);

    GleapSession_defineProperty(this, "onSessionReadyListener", []);

    GleapSession_defineProperty(this, "setOnSessionReady", function (onSessionReady) {
      if (_this.ready) {
        onSessionReady();
      } else {
        _this.onSessionReadyListener.push(onSessionReady);
      }
    });

    GleapSession_defineProperty(this, "injectSession", function (http) {
      if (http && _this.session) {
        http.setRequestHeader("Api-Token", _this.sdkKey);
        http.setRequestHeader("Gleap-Id", _this.session.gleapId);
        http.setRequestHeader("Gleap-Hash", _this.session.gleapHash);
      }
    });

    GleapSession_defineProperty(this, "clearSession", function () {
      var attemp = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;

      try {
        saveToGleapCache("session-".concat(_this.sdkKey), null);
      } catch (exp) {}

      _this.session = {
        id: null,
        hash: null,
        type: null,
        name: "",
        email: "",
        phone: "",
        value: 0
      };

      if (!isNaN(attemp)) {
        // Exponentially retry to renew session.
        var newTimeout = Math.pow(attemp, 2) * 10 + 10;
        setTimeout(function () {
          _this.startSession(attemp + 1);
        }, newTimeout * 1000);
      }
    });

    GleapSession_defineProperty(this, "validateSession", function (session) {
      if (!session) {
        return;
      }

      saveToGleapCache("session-".concat(_this.sdkKey), session);
      _this.session = session;
      _this.ready = true;

      _this.notifySessionReady();
    });

    GleapSession_defineProperty(this, "startSession", function () {
      var attemp = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
      // Check if session is already ready.
      var cachedSession = loadFromGleapCache("session-".concat(_this.sdkKey));

      if (cachedSession) {
        _this.validateSession(cachedSession);
      }

      var self = _this;
      var http = new XMLHttpRequest();
      http.open("POST", self.apiUrl + "/sessions");
      http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      http.setRequestHeader("Api-Token", self.sdkKey);

      try {
        if (_this.session && _this.session.gleapId && _this.session.gleapHash) {
          http.setRequestHeader("Gleap-Id", _this.session.gleapId);
          http.setRequestHeader("Gleap-Hash", _this.session.gleapHash);
        }
      } catch (exp) {}

      http.onreadystatechange = function (e) {
        if (http.readyState === 4) {
          if (http.status === 200 || http.status === 201) {
            try {
              var sessionData = JSON.parse(http.responseText);
              self.validateSession(sessionData);
            } catch (exp) {}
          } else {
            if (http.status !== 429) {
              self.clearSession(attemp);
            }
          }
        }
      };

      http.send(JSON.stringify({}));
    });

    GleapSession_defineProperty(this, "checkIfSessionNeedsUpdate", function (userId, userData) {
      if (!_this.session || !_this.session.userId || !userId) {
        return true;
      }

      try {
        if (_this.session.userId.toString() !== userId.toString()) {
          return true;
        }
      } catch (exp) {}

      if (userData) {
        var userDataKeys = Object.keys(userData);

        for (var i = 0; i < userDataKeys.length; i++) {
          var userDataKey = userDataKeys[i];

          if (_this.session[userDataKey] !== userData[userDataKey]) {
            return true;
          }
        }
      }

      return false;
    });

    GleapSession_defineProperty(this, "identifySession", function (userId, userData, userHash) {
      var sessionNeedsUpdate = _this.checkIfSessionNeedsUpdate(userId, userData);

      if (!sessionNeedsUpdate) {
        return;
      }

      var self = _this;
      return new Promise(function (resolve, reject) {
        // Wait for gleap session to be ready.
        _this.setOnSessionReady(function () {
          if (!self.session.gleapId || !self.session.gleapHash) {
            return reject();
          }

          var http = new XMLHttpRequest();
          http.open("POST", self.apiUrl + "/sessions/identify");
          http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
          http.setRequestHeader("Api-Token", self.sdkKey);

          try {
            http.setRequestHeader("Gleap-Id", self.session.gleapId);
            http.setRequestHeader("Gleap-Hash", self.session.gleapHash);
          } catch (exp) {}

          http.onerror = function () {
            reject();
          };

          http.onreadystatechange = function (e) {
            if (http.readyState === 4) {
              if (http.status === 200 || http.status === 201) {
                try {
                  var sessionData = JSON.parse(http.responseText);
                  self.validateSession(sessionData);
                  resolve(sessionData);
                } catch (exp) {
                  reject(exp);
                }
              } else {
                reject();
              }
            }
          };

          http.send(JSON.stringify(_objectSpread(_objectSpread({}, userData), {}, {
            userId: userId,
            userHash: userHash
          })));
        });
      });
    });
  }

  GleapSession_createClass(GleapSession, [{
    key: "getSession",
    value:
    /**
     * Returns the Gleap session object.
     * @returns 
     */
    function getSession() {
      return this.session;
    }
  }, {
    key: "notifySessionReady",
    value: function notifySessionReady() {
      if (this.onSessionReadyListener.length > 0) {
        for (var i = 0; i < this.onSessionReadyListener.length; i++) {
          this.onSessionReadyListener[i]();
        }
      }

      this.onSessionReadyListener = []; // Send session update to frame.

      GleapFrameManager.getInstance().sendSessionUpdate();
    }
  }], [{
    key: "getInstance",
    value: // GleapSession singleton
    function getInstance() {
      if (!this.instance) {
        this.instance = new GleapSession();
        return this.instance;
      } else {
        return this.instance;
      }
    }
  }]);

  return GleapSession;
}();

GleapSession_defineProperty(GleapSession, "instance", void 0);


;// CONCATENATED MODULE: ./src/GleapStreamedEvent.js
function GleapStreamedEvent_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function GleapStreamedEvent_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function GleapStreamedEvent_createClass(Constructor, protoProps, staticProps) { if (protoProps) GleapStreamedEvent_defineProperties(Constructor.prototype, protoProps); if (staticProps) GleapStreamedEvent_defineProperties(Constructor, staticProps); return Constructor; }

function GleapStreamedEvent_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }




var GleapStreamedEvent = /*#__PURE__*/function () {
  function GleapStreamedEvent() {
    var _this = this;

    GleapStreamedEvent_classCallCheck(this, GleapStreamedEvent);

    GleapStreamedEvent_defineProperty(this, "eventArray", []);

    GleapStreamedEvent_defineProperty(this, "streamedEventArray", []);

    GleapStreamedEvent_defineProperty(this, "eventMaxLength", 500);

    GleapStreamedEvent_defineProperty(this, "lastUrl", undefined);

    GleapStreamedEvent_defineProperty(this, "startEventStream", function () {
      var self = _this;
      var interval = 1500;

      if (GleapSession.getInstance().ready && self.streamedEventArray && self.streamedEventArray.length > 0) {
        self.streamEvents();
        interval = 3000;
      }

      setTimeout(function () {
        self.startEventStream();
      }, interval);
    });

    GleapStreamedEvent_defineProperty(this, "streamEvents", function () {
      if (GleapSession.getInstance().ready) {
        var http = new XMLHttpRequest();
        http.open("POST", GleapSession.getInstance().apiUrl + "/sessions/stream");
        http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        GleapSession.getInstance().injectSession(http);

        http.onerror = function (error) {};

        http.onreadystatechange = function (e) {
          if (http.readyState === 4) {
            if (http.status === 200 || http.status === 201) {
              try {
                var action = JSON.parse(http.responseText);
                src_Gleap.getInstance().performAction(action);
              } catch (exp) {}
            }
          }
        };

        http.send(JSON.stringify({
          events: _this.streamedEventArray
        }));
        _this.streamedEventArray = [];
      }
    });
  }

  GleapStreamedEvent_createClass(GleapStreamedEvent, [{
    key: "getEventArray",
    value: function getEventArray() {
      return this.eventArray;
    }
  }, {
    key: "start",
    value: function start() {
      this.startEventStream();
      this.startPageListener();
    }
  }, {
    key: "startPageListener",
    value: function startPageListener() {
      this.logEvent("sessionStarted");
      var self = this;
      setInterval(function () {
        var currentUrl = window.location.href;

        if (currentUrl && currentUrl !== self.lastUrl) {
          self.lastUrl = currentUrl;
          self.logEvent("pageView", {
            page: currentUrl
          });
        }
      }, 1000);
    }
  }, {
    key: "logEvent",
    value: function logEvent(name, data) {
      var log = {
        name: name,
        date: new Date()
      };

      if (data) {
        log.data = gleapDataParser(data);
      }

      this.eventArray.push(log);
      this.streamedEventArray.push(log); // Check max size of event log

      if (this.eventArray.length > this.eventMaxLength) {
        this.eventArray.shift();
      } // Check max size of streamed event log


      if (this.streamedEventArray.length > this.eventMaxLength) {
        this.streamedEventArray.shift();
      }
    }
  }], [{
    key: "getInstance",
    value: // GleapStreamedEvent singleton
    function getInstance() {
      if (!this.instance) {
        this.instance = new GleapStreamedEvent();
        return this.instance;
      } else {
        return this.instance;
      }
    }
  }]);

  return GleapStreamedEvent;
}();

GleapStreamedEvent_defineProperty(GleapStreamedEvent, "instance", void 0);


;// CONCATENATED MODULE: ./src/GleapConfigManager.js
function GleapConfigManager_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function GleapConfigManager_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function GleapConfigManager_createClass(Constructor, protoProps, staticProps) { if (protoProps) GleapConfigManager_defineProperties(Constructor.prototype, protoProps); if (staticProps) GleapConfigManager_defineProperties(Constructor, staticProps); return Constructor; }

function GleapConfigManager_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }




var GleapConfigManager = /*#__PURE__*/function () {
  function GleapConfigManager() {
    var _this = this;

    GleapConfigManager_classCallCheck(this, GleapConfigManager);

    GleapConfigManager_defineProperty(this, "flowConfig", null);

    GleapConfigManager_defineProperty(this, "projectActions", null);

    GleapConfigManager_defineProperty(this, "start", function () {
      var session = GleapSession.getInstance();
      var cachedConfig = loadFromGleapCache("config-".concat(session.sdkKey));

      if (cachedConfig) {
        _this.applyConfig(cachedConfig);

        _this.loadConfigFromServer()["catch"](function (e) {});

        return Promise.resolve();
      }

      return _this.loadConfigFromServer();
    });

    GleapConfigManager_defineProperty(this, "loadConfigFromServer", function () {
      var self = _this;
      return new Promise(function (resolve, reject) {
        var session = GleapSession.getInstance();
        var http = new XMLHttpRequest();
        http.open("GET", session.apiUrl + "/config/" + session.sdkKey);
        http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        session.injectSession(http);

        http.onerror = function () {
          reject();
        };

        http.onreadystatechange = function (e) {
          if (http.readyState === 4) {
            if (http.status === 200 || http.status === 201) {
              try {
                var config = JSON.parse(http.responseText);

                try {
                  saveToGleapCache("config-".concat(session.sdkKey), config);
                } catch (exp) {}

                self.applyConfig(config);
                return resolve();
              } catch (e) {}
            }

            reject();
          }
        };

        http.send();
      });
    });
  }

  GleapConfigManager_createClass(GleapConfigManager, [{
    key: "getFlowConfig",
    value:
    /**
     * Returns the loaded flow config.
     * @returns 
     */
    function getFlowConfig() {
      return this.flowConfig;
    }
    /**
     * Returns the loaded project actions.
     * @returns 
     */

  }, {
    key: "getProjectActions",
    value: function getProjectActions() {
      return this.projectActions;
    }
  }, {
    key: "applyConfig",
    value:
    /**
     * Applies the Gleap config.
     * @param {*} config
     */
    function applyConfig(config) {
      try {
        var flowConfig = config.flowConfig;
        var projectActions = config.projectActions;
        this.flowConfig = flowConfig;
        this.projectActions = projectActions; // Send config update.

        GleapFrameManager.getInstance().sendConfigUpdate();
        GleapFeedbackButtonManager.getInstance().updateFeedbackButtonState();

        if (flowConfig.color) {
          src_Gleap.setStyles(flowConfig.color, flowConfig.headerColor, flowConfig.buttonColor, flowConfig.backgroundColor ? flowConfig.backgroundColor : "#FFFFFF", flowConfig.borderRadius);
        }

        if (flowConfig.enableReplays) {
          GleapReplayRecorder.getInstance().start();
        } else {
          GleapReplayRecorder.getInstance().stop();
        }

        if (flowConfig.enableNetworkLogs) {
          src_GleapNetworkIntercepter.getInstance().start();
        }

        src_GleapNetworkIntercepter.getInstance().setLoadAllResources(flowConfig.sendNetworkResources ? true : false);

        if (flowConfig.networkLogPropsToIgnore) {
          src_GleapNetworkIntercepter.getInstance().setFilters(flowConfig.networkLogPropsToIgnore);
        }

        if (flowConfig.networkLogBlacklist) {
          src_GleapNetworkIntercepter.getInstance().setBlacklist(flowConfig.networkLogBlacklist);
        }

        if (flowConfig.customTranslations) {
          GleapTranslationManager.getInstance().setCustomTranslation(flowConfig.customTranslations);
          GleapTranslationManager.getInstance().updateRTLSupport();
        }

        src_Gleap.enableShortcuts(flowConfig.enableShortcuts ? true : false);
      } catch (e) {}
    }
  }, {
    key: "getFeedbackOptions",
    value: function getFeedbackOptions(feedbackFlow) {
      var feedbackOptions = null; // Try to load the specific feedback flow.

      if (feedbackFlow) {
        feedbackOptions = this.projectActions[feedbackFlow];
      } // Fallback


      if (!feedbackOptions) {
        feedbackOptions = this.projectActions.bugreporting;
      } // Deep copy to prevent changes.


      try {
        feedbackOptions = JSON.parse(JSON.stringify(feedbackOptions));
      } catch (e) {}

      return feedbackOptions;
    }
  }], [{
    key: "getInstance",
    value: function getInstance() {
      if (!this.instance) {
        this.instance = new GleapConfigManager();
      }

      return this.instance;
    }
  }]);

  return GleapConfigManager;
}();

GleapConfigManager_defineProperty(GleapConfigManager, "instance", void 0);


;// CONCATENATED MODULE: ./src/ResourceExclusionList.js
var blacklist = ["//fonts.googleapis.com", "//cdn.jsdelivr.net", "//cdnjs.cloudflare.com", "//ajax.googleapis.com", "//use.typekit.net", ".amazonaws.com", "//jssdk.gleap.io", ".gstatic.com"];
var isBlacklisted = function isBlacklisted(url) {
  if (!url) {
    return false;
  }

  for (var i = 0; i < blacklist.length; i++) {
    if (url.indexOf(blacklist[i]) !== -1) {
      return true;
    }
  }

  return false;
};
;// CONCATENATED MODULE: ./src/ScreenCapture.js


var startScreenCapture = function startScreenCapture(isLiveSite) {
  return prepareScreenshotData(isLiveSite);
};

var documentToHTML = function documentToHTML(clone) {
  var html = "";
  var node = window.document.doctype;

  if (node) {
    html = "<!DOCTYPE " + node.name + (node.publicId ? ' PUBLIC "' + node.publicId + '"' : "") + (!node.publicId && node.systemId ? " SYSTEM" : "") + (node.systemId ? ' "' + node.systemId + '"' : "") + ">";
  }

  if (clone && clone.childNodes && clone.childNodes.length > 0) {
    for (var i = 0; i < clone.childNodes.length; i++) {
      if (clone.childNodes[i]) {
        html += clone.childNodes[i].outerHTML;
      }
    }
  }

  return html;
};

var replaceAsync = function replaceAsync(str, regex, asyncFn) {
  return new Promise(function (resolve, reject) {
    var promises = [];
    str.replace(regex, function (match) {
      for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      var promise = asyncFn.apply(void 0, [match].concat(args));
      promises.push(promise);
    });
    Promise.all(promises).then(function (data) {
      resolve(str.replace(regex, function () {
        return data.shift();
      }));
    })["catch"](function () {
      reject();
    });
  });
};

var loadCSSUrlResources = function loadCSSUrlResources(data, basePath) {
  return replaceAsync(data, /url\((.*?)\)/g, function (matchedData) {
    return new Promise(function (resolve, reject) {
      if (!matchedData) {
        return resolve(matchedData);
      }

      var matchedUrl = matchedData.substr(4, matchedData.length - 5).replaceAll("'", "").replaceAll('"', ""); // Remote file or data

      if (matchedUrl.indexOf("http") === 0 || matchedUrl.indexOf("//") === 0 || matchedUrl.indexOf("data") === 0) {
        return resolve(matchedData);
      }

      try {
        var resourcePath = matchedUrl;

        if (basePath) {
          resourcePath = basePath + "/" + matchedUrl;
        }

        return fetchCSSResource(resourcePath).then(function (resourceData) {
          return resolve("url(" + resourceData + ")");
        });
      } catch (exp) {
        return resolve(matchedData);
      }
    });
  });
};

var fetchCSSResource = function fetchCSSResource(url) {
  return new Promise(function (resolve, reject) {
    if (url) {
      var xhr = new XMLHttpRequest();

      xhr.onload = function () {
        var reader = new FileReader();

        reader.onloadend = function () {
          resolve(reader.result);
        };

        reader.onerror = function () {
          reject();
        };

        reader.readAsDataURL(xhr.response);
      };

      xhr.onerror = function (err) {
        resolve();
      };

      xhr.open("GET", url);
      xhr.responseType = "blob";
      xhr.send();
    } else {
      resolve();
    }
  });
};

var progressResource = function progressResource(data, elem, resolve, reject) {
  resizeImage(data, 500, 500).then(function (data) {
    elem.src = data;
    resolve();
  })["catch"](function () {
    console.warn("BB: Image resize failed.");
    resolve();
  });
};

var fetchItemResource = function fetchItemResource(elem) {
  return new Promise(function (resolve, reject) {
    if (elem && elem.src) {
      if (isBlacklisted(elem.src)) {
        return resolve();
      }

      var xhr = new XMLHttpRequest();

      xhr.onload = function () {
        var reader = new FileReader();

        reader.onloadend = function () {
          progressResource(reader.result, elem, resolve, reject);
        };

        reader.onerror = function () {
          resolve();
        };

        reader.readAsDataURL(xhr.response);
      };

      xhr.onerror = function (err) {
        resolve();
      };

      var url = elem.src;
      xhr.open("GET", url);
      xhr.responseType = "blob";
      xhr.send();
    } else {
      resolve();
    }
  });
};

var downloadAllImages = function downloadAllImages(dom) {
  var imgItems = dom.querySelectorAll("img");
  var imgItemsPromises = [];

  for (var i = 0; i < imgItems.length; i++) {
    var item = imgItems[i];
    imgItemsPromises.push(fetchItemResource(item));
  }

  return Promise.all(imgItemsPromises);
};

var replaceStyleNodes = function replaceStyleNodes(clone, styleSheet, cssTextContent, styleId) {
  {
    var cloneTargetNode = null;

    if (styleSheet.ownerNode) {
      cloneTargetNode = clone.querySelector('[bb-styleid="' + styleId + '"]');
    }

    try {
      if (cloneTargetNode) {
        var replacementNode = null;

        if (cssTextContent != "") {
          // Create node.
          var head = clone.querySelector("head");
          var styleNode = window.document.createElement("style");
          head.appendChild(styleNode);
          styleNode.type = "text/css";

          if (styleNode.styleSheet) {
            styleNode.styleSheet.cssText = cssTextContent;
          } else {
            styleNode.appendChild(window.document.createTextNode(cssTextContent));
          }

          replacementNode = styleNode;
        } else {
          var linkNode = window.document.createElement("link");
          linkNode.rel = "stylesheet";
          linkNode.type = styleSheet.type;
          linkNode.href = styleSheet.href;
          linkNode.media = styleSheet.media;
          replacementNode = linkNode;
        }

        if (replacementNode) {
          cloneTargetNode.parentNode.insertBefore(replacementNode, cloneTargetNode);
          cloneTargetNode.remove();
        }
      }
    } catch (exp) {}
  }
};

var getTextContentFromStyleSheet = function getTextContentFromStyleSheet(styleSheet) {
  var cssRules = null;

  try {
    if (styleSheet.cssRules) {
      cssRules = styleSheet.cssRules;
    } else if (styleSheet.rules) {
      cssRules = styleSheet.rules;
    }
  } catch (exp) {}

  var cssTextContent = "";

  if (cssRules) {
    for (var cssRuleItem in cssRules) {
      if (cssRules[cssRuleItem].cssText) {
        cssTextContent += cssRules[cssRuleItem].cssText;
      }
    }
  }

  return cssTextContent;
};

var downloadAllCSSUrlResources = function downloadAllCSSUrlResources(clone, remote) {
  var promises = [];

  var _loop = function _loop() {
    var styleSheet = document.styleSheets[i];
    var cssTextContent = getTextContentFromStyleSheet(styleSheet);

    if (styleSheet && styleSheet.ownerNode) {
      if (cssTextContent != "" && !remote) {
        // Resolve resources.
        var baseTags = document.getElementsByTagName("base");
        basePathURL = baseTags.length ? baseTags[0].href.substr(location.origin.length, 999) : window.location.href;

        if (styleSheet.href) {
          basePathURL = styleSheet.href;
        }

        var basePath = basePathURL.substring(0, basePathURL.lastIndexOf("/"));
        promises.push(loadCSSUrlResources(cssTextContent, basePath).then(function (replacedStyle) {
          return {
            styletext: replacedStyle,
            stylesheet: styleSheet,
            styleId: styleSheet.ownerNode.getAttribute("bb-styleid")
          };
        }));
      } else {
        promises.push(Promise.resolve({
          styletext: cssTextContent,
          stylesheet: styleSheet,
          styleId: styleSheet.ownerNode.getAttribute("bb-styleid")
        }));
      }
    }
  };

  for (var i = 0; i < document.styleSheets.length; i++) {
    var basePathURL;

    _loop();
  }

  return Promise.all(promises).then(function (results) {
    if (results) {
      for (var i = 0; i < results.length; i++) {
        replaceStyleNodes(clone, results[i].stylesheet, results[i].styletext, results[i].styleId);
      }
    }

    return true;
  });
};

var prepareRemoteData = function prepareRemoteData(clone, remote) {
  return new Promise(function (resolve, reject) {
    if (remote) {
      // Always download CSS.
      return downloadAllCSSUrlResources(clone, remote).then(function () {
        resolve();
      })["catch"](function () {
        resolve();
      });
    } else {
      return downloadAllImages(clone).then(function () {
        return downloadAllCSSUrlResources(clone, remote).then(function () {
          resolve();
        });
      })["catch"](function () {
        console.warn("Gleap: Failed with resolving local resources. Please contact the Gleap support team.");
        resolve();
      });
    }
  });
};

var handleAdoptedStyleSheets = function handleAdoptedStyleSheets(doc, clone, shadowNodeId) {
  if (typeof doc.adoptedStyleSheets !== "undefined") {
    for (var i = 0; i < doc.adoptedStyleSheets.length; i++) {
      var styleSheet = doc.adoptedStyleSheets[i];
      var cssTextContent = getTextContentFromStyleSheet(styleSheet);
      var shadowStyleNode = window.document.createElement("style");
      shadowStyleNode.type = "text/css";

      if (shadowStyleNode.styleSheet) {
        shadowStyleNode.styleSheet.cssText = cssTextContent;
      } else {
        shadowStyleNode.appendChild(window.document.createTextNode(cssTextContent));
      }

      if (shadowNodeId) {
        shadowStyleNode.setAttribute("bb-shadow-child", shadowNodeId);
      }

      clone.insertBefore(shadowStyleNode, clone.firstElementChild);
    }
  }
};

var deepClone = function deepClone(host) {
  var shadowNodeId = 1;

  var cloneNode = function cloneNode(node, parent, shadowRoot) {
    var walkTree = function walkTree(nextn, nextp, innerShadowRoot) {
      while (nextn) {
        cloneNode(nextn, nextp, innerShadowRoot);
        nextn = nextn.nextSibling;
      }
    };

    var clone = node.cloneNode();

    if (typeof clone.setAttribute !== "undefined") {
      if (shadowRoot) {
        clone.setAttribute("bb-shadow-child", shadowRoot);
      }

      if (node instanceof HTMLCanvasElement) {
        clone.setAttribute("bb-canvas-data", node.toDataURL());
      }

      if (node instanceof HTMLCanvasElement) {
        clone.setAttribute("bb-canvas-data", node.toDataURL());
      }
    }

    if (node.nodeType == Node.ELEMENT_NODE) {
      var tagName = node.tagName ? node.tagName.toUpperCase() : node.tagName;

      if (tagName == "IFRAME" || tagName == "VIDEO" || tagName == "EMBED" || tagName == "IMG" || tagName == "SVG") {
        var boundingRect = node.getBoundingClientRect();
        clone.setAttribute("bb-element", true);
        clone.setAttribute("bb-height", boundingRect.height);
        clone.setAttribute("bb-width", boundingRect.width);
      }

      if (tagName == "DIV" && (node.scrollTop > 0 || node.scrollLeft > 0)) {
        clone.setAttribute("bb-scrollpos", true);
        clone.setAttribute("bb-scrolltop", node.scrollTop);
        clone.setAttribute("bb-scrollleft", node.scrollLeft);
      }

      if (tagName === "SELECT" || tagName === "TEXTAREA" || tagName === "INPUT") {
        var val = node.value;

        if (node.getAttribute("gleap-ignore") === "value") {
          val = new Array(val.length + 1).join("*");
        }

        clone.setAttribute("bb-data-value", val);

        if ((node.type === "checkbox" || node.type === "radio") && node.checked) {
          clone.setAttribute("bb-data-checked", true);
        }
      }
    }

    parent.appendChild(clone);

    if (node.shadowRoot) {
      var rootShadowNodeId = shadowNodeId;
      shadowNodeId++;
      walkTree(node.shadowRoot.firstChild, clone, rootShadowNodeId);
      handleAdoptedStyleSheets(node.shadowRoot, clone, rootShadowNodeId);

      if (typeof clone.setAttribute !== "undefined") {
        clone.setAttribute("bb-shadow-parent", rootShadowNodeId);
      }
    }

    walkTree(node.firstChild, clone);
  };

  var fragment = document.createDocumentFragment();
  cloneNode(host, fragment); // Work on adopted stylesheets.

  var clonedHead = fragment.querySelector("head");

  if (!clonedHead) {
    clonedHead = fragment;
  }

  handleAdoptedStyleSheets(window.document, clonedHead);
  return fragment;
};

var prepareScreenshotData = function prepareScreenshotData(remote) {
  return new Promise(function (resolve, reject) {
    var styleTags = window.document.querySelectorAll("style, link");

    for (var i = 0; i < styleTags.length; ++i) {
      styleTags[i].setAttribute("bb-styleid", i);
    }

    var clone = deepClone(window.document.documentElement); // Fix for web imports (depracted).

    var linkImportElems = clone.querySelectorAll("link[rel=import]");

    for (var i = 0; i < linkImportElems.length; ++i) {
      var referenceNode = linkImportElems[i];

      if (referenceNode && referenceNode.childNodes && referenceNode.childNodes.length > 0) {
        var childNodes = referenceNode.childNodes;

        while (childNodes.length > 0) {
          referenceNode.parentNode.insertBefore(childNodes[0], referenceNode);
        }

        referenceNode.remove();
      }
    } // Remove all scripts & style


    var scriptElems = clone.querySelectorAll("script, noscript");

    for (var i = 0; i < scriptElems.length; ++i) {
      scriptElems[i].remove();
    } // Cleanup base path


    var baseElems = clone.querySelectorAll("base");

    for (var i = 0; i < baseElems.length; ++i) {
      baseElems[i].remove();
    } // Fix base node


    var baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf("/")) + "/";
    var baseNode = window.document.createElement("base");
    baseNode.href = baseUrl;
    var head = clone.querySelector("head");
    head.insertBefore(baseNode, head.firstChild); // Do further cleanup.

    var dialogElems = clone.querySelectorAll(".bb-feedback-dialog-container, .bb-capture-editor-borderlayer");

    for (var i = 0; i < dialogElems.length; ++i) {
      dialogElems[i].remove();
    } // Calculate heights


    var bbElems = clone.querySelectorAll("[bb-element=true]");

    for (var i = 0; i < bbElems.length; ++i) {
      if (bbElems[i]) {
        bbElems[i].style.height = bbElems[i].getAttribute("bb-height") + "px";
      }
    }

    prepareRemoteData(clone, remote).then(function () {
      var html = documentToHTML(clone);
      resolve({
        html: html,
        baseUrl: baseUrl,
        width: window.innerWidth,
        height: window.innerHeight,
        isMobile: isMobile()
      });
    });
  });
};
;// CONCATENATED MODULE: ./src/GleapScreenRecorder.js
function GleapScreenRecorder_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function GleapScreenRecorder_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function GleapScreenRecorder_createClass(Constructor, protoProps, staticProps) { if (protoProps) GleapScreenRecorder_defineProperties(Constructor.prototype, protoProps); if (staticProps) GleapScreenRecorder_defineProperties(Constructor, staticProps); return Constructor; }

function GleapScreenRecorder_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }


var GleapScreenRecorder = /*#__PURE__*/function () {
  function GleapScreenRecorder(rerender, permissionErrorText) {
    var _this = this;

    GleapScreenRecorder_classCallCheck(this, GleapScreenRecorder);

    GleapScreenRecorder_defineProperty(this, "rerender", void 0);

    GleapScreenRecorder_defineProperty(this, "stream", void 0);

    GleapScreenRecorder_defineProperty(this, "mediaRecorder", void 0);

    GleapScreenRecorder_defineProperty(this, "audioMuted", false);

    GleapScreenRecorder_defineProperty(this, "audioAvailable", true);

    GleapScreenRecorder_defineProperty(this, "available", true);

    GleapScreenRecorder_defineProperty(this, "isRecording", false);

    GleapScreenRecorder_defineProperty(this, "file", null);

    GleapScreenRecorder_defineProperty(this, "maxRecordTime", 120);

    GleapScreenRecorder_defineProperty(this, "recordTime", 0);

    GleapScreenRecorder_defineProperty(this, "recordingTimer", null);

    GleapScreenRecorder_defineProperty(this, "permissionErrorText", "");

    GleapScreenRecorder_defineProperty(this, "startScreenRecording", function () {
      var self = this;

      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia || this.isRecording) {
        this.available = false;
        this.rerender();
        return;
      }

      navigator.mediaDevices.getDisplayMedia({
        video: {
          width: 1280
        },
        audio: true
      }).then(function (displayStream) {
        self.stream = displayStream;

        if (!self.audioMuted) {
          self.startAudioRecording();
        } else {
          self.audioAvailable = false;
          self.handleRecord({
            stream: displayStream
          });
        }

        self.rerender();
      })["catch"](function (err) {
        window.alert(self.permissionErrorText);
        self.rerender();
      });
    });

    GleapScreenRecorder_defineProperty(this, "stopScreenRecording", function () {
      if (!this.mediaRecorder || !this.stream || !this.isRecording) {
        return;
      }

      if (this.recordingTimer) {
        clearInterval(this.recordingTimer);
        this.recordingTimer = null;
      }

      this.mediaRecorder.stop();
      this.stream.getTracks().forEach(function (track) {
        track.stop();
      });
      this.rerender();
    });

    GleapScreenRecorder_defineProperty(this, "startAudioRecording", function () {
      var self = this;

      if (!this.stream) {
        return;
      }

      navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      }).then(function (voiceStream) {
        for (var i = 0; i < voiceStream.getAudioTracks().length; i++) {
          self.stream.addTrack(voiceStream.getAudioTracks()[i]);
        }

        self.audioMuted = false;
        self.audioAvailable = true;
        self.handleRecord({
          stream: self.stream
        });
        self.rerender();
      })["catch"](function (audioErr) {
        self.audioAvailable = false;
        self.handleRecord({
          stream: self.stream
        });
        self.rerender();
      });
    });

    GleapScreenRecorder_defineProperty(this, "toggleAudio", function () {
      this.audioMuted = !this.audioMuted;
      this.rerender();

      if (!this.stream) {
        return;
      }

      var audioTracks = this.stream.getAudioTracks();

      for (var i = 0; i < audioTracks.length; i++) {
        var audioTrack = audioTracks[i];
        audioTrack.enabled = !this.audioMuted;
      }
    });

    GleapScreenRecorder_defineProperty(this, "clearPreview", function () {
      document.querySelector(".bb-capture-preview video").src = null;
      this.file = null;
      this.rerender();
    });

    GleapScreenRecorder_defineProperty(this, "handleRecord", function (_ref) {
      var stream = _ref.stream;
      var self = this;
      var recordedChunks = [];
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: this.getSupportedMimeType()
      });
      this.isRecording = true;
      this.recordTime = 0; // Set timer.

      var timerLabel = document.querySelector(".bb-capture-toolbar-item-timer");
      this.recordingTimer = setInterval(function () {
        self.recordTime++;
        var remainingTime = self.maxRecordTime - self.recordTime;

        if (remainingTime > 0) {
          timerLabel.innerHTML = self.formatTime(remainingTime);
        } else {
          timerLabel.innerHTML = "2:00";
          self.stopScreenRecording();
        }
      }, 1000);

      this.mediaRecorder.ondataavailable = function (e) {
        if (e.data.size > 0) {
          recordedChunks.push(e.data);
        }
      };

      stream.getVideoTracks()[0].onended = function () {
        self.prepareRecording(recordedChunks);
      };

      this.mediaRecorder.onstop = function () {
        self.prepareRecording(recordedChunks);
      };

      this.mediaRecorder.start(200); // here 200ms is interval of chunk collection

      self.rerender();
    });

    GleapScreenRecorder_defineProperty(this, "prepareRecording", function (recordedChunks) {
      var completeBlob = new Blob(recordedChunks, {
        type: this.getSupportedMimeType()
      });
      this.file = new File([completeBlob], "screen-recording.".concat(this.getSupportedMimeType() === "video/mp4" ? 'mp4' : "webm"), {
        type: this.getSupportedMimeType()
      });
      var previewVideoElement = document.querySelector(".bb-capture-preview video");

      if (previewVideoElement) {
        previewVideoElement.src = URL.createObjectURL(completeBlob);
        this.audioAvailable = true;
        this.isRecording = false;
        this.rerender();
      }
    });

    this.rerender = rerender;
    this.permissionErrorText = permissionErrorText;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      this.available = false;
    }

    setTimeout(function () {
      _this.rerender();
    }, 100);
  }

  GleapScreenRecorder_createClass(GleapScreenRecorder, [{
    key: "getSupportedMimeType",
    value: function getSupportedMimeType() {
      if (MediaRecorder.isTypeSupported("video/mp4")) {
        return "video/mp4";
      }

      if (MediaRecorder.isTypeSupported("video/webm;codecs=h264")) {
        return "video/webm;codecs=h264";
      }

      return "video/webm";
    }
  }, {
    key: "formatTime",
    value: function formatTime(s) {
      return (s - (s %= 60)) / 60 + (9 < s ? ":" : ":0") + s;
    }
  }]);

  return GleapScreenRecorder;
}();

GleapScreenRecorder_defineProperty(GleapScreenRecorder, "uploadScreenRecording", function (screenRecordingData) {
  return new Promise(function (resolve, reject) {
    if (screenRecordingData == null) {
      resolve(null);
    }

    var xhr = new XMLHttpRequest();
    xhr.open("POST", GleapSession.getInstance().apiUrl + "/uploads/sdk");
    GleapSession.getInstance().injectSession(xhr);
    var formdata = new FormData();
    formdata.append("file", screenRecordingData);
    xhr.send(formdata);

    xhr.onerror = function () {
      reject();
    };

    xhr.onreadystatechange = function () {
      if (xhr.readyState == 4) {
        if (xhr.status == 200) {
          resolve(JSON.parse(xhr.response).fileUrl);
        } else {
          reject();
        }
      }
    };
  });
});
;// CONCATENATED MODULE: ./src/GleapFeedback.js
function GleapFeedback_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function GleapFeedback_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function GleapFeedback_createClass(Constructor, protoProps, staticProps) { if (protoProps) GleapFeedback_defineProperties(Constructor.prototype, protoProps); if (staticProps) GleapFeedback_defineProperties(Constructor, staticProps); return Constructor; }

function GleapFeedback_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }





var GleapFeedback = /*#__PURE__*/function () {
  function GleapFeedback(type, priority, formData, isSilent, excludeData, outboundId, spamToken) {
    GleapFeedback_classCallCheck(this, GleapFeedback);

    GleapFeedback_defineProperty(this, "excludeData", {});

    GleapFeedback_defineProperty(this, "type", "BUG");

    GleapFeedback_defineProperty(this, "priority", "LOW");

    GleapFeedback_defineProperty(this, "customData", {});

    GleapFeedback_defineProperty(this, "metaData", {});

    GleapFeedback_defineProperty(this, "consoleLog", []);

    GleapFeedback_defineProperty(this, "networkLogs", []);

    GleapFeedback_defineProperty(this, "customEventLog", []);

    GleapFeedback_defineProperty(this, "formData", {});

    GleapFeedback_defineProperty(this, "isSilent", false);

    GleapFeedback_defineProperty(this, "outboundId", undefined);

    GleapFeedback_defineProperty(this, "screenshotData", undefined);

    GleapFeedback_defineProperty(this, "webReplay", undefined);

    GleapFeedback_defineProperty(this, "screenRecordingUrl", undefined);

    GleapFeedback_defineProperty(this, "spamToken", undefined);

    this.type = type;
    this.priority = priority;
    this.formData = formData;
    this.isSilent = isSilent;
    this.excludeData = excludeData;
    this.outboundId = outboundId;
    this.spamToken = spamToken;
  }

  GleapFeedback_createClass(GleapFeedback, [{
    key: "takeSnapshot",
    value: function takeSnapshot() {
      var _this = this;

      var gleapInstance = src_Gleap.getInstance();
      this.customData = GleapCustomDataManager.getInstance().getCustomData();
      this.metaData = GleapMetaDataManager.getInstance().getMetaData();
      this.consoleLog = GleapConsoleLogManager.getInstance().getLogs();
      this.networkLogs = src_GleapNetworkIntercepter.getInstance().getRequests();
      this.customEventLog = GleapStreamedEvent.getInstance().getEventArray();
      var dataPromises = []; // Assign replays

      var webReplay = gleapInstance.getGlobalDataItem("webReplay");

      if (webReplay !== null) {
        this.webReplay = webReplay;
      } // Prepare screen recording


      var screenRecordingData = gleapInstance.getGlobalDataItem("screenRecordingData");

      if (screenRecordingData != null) {
        var recordingUrlPromise = GleapScreenRecorder.uploadScreenRecording(screenRecordingData).then(function (recordingUrl) {
          if (recordingUrl) {
            _this.screenRecordingUrl = recordingUrl;
          }
        });
        dataPromises.push(recordingUrlPromise);
      } // Prepare screenshot


      if (!(this.excludeData && this.excludeData.screenshot)) {
        var screenshotDataPromise = startScreenCapture(gleapInstance.isLiveMode()).then(function (screenshotData) {
          if (screenshotData) {
            var snapshotPosition = gleapInstance.getGlobalDataItem("snapshotPosition");
            screenshotData["x"] = snapshotPosition.x;
            screenshotData["y"] = snapshotPosition.y;
            _this.screenshotData = screenshotData;
          }
        });
        dataPromises.push(screenshotDataPromise);
      }

      return Promise.all(dataPromises);
    }
  }, {
    key: "getData",
    value: function getData() {
      var feedbackData = {
        type: this.type,
        priority: this.priority,
        customData: this.customData,
        metaData: this.metaData,
        consoleLog: this.consoleLog,
        networkLogs: this.networkLogs,
        customEventLog: this.customEventLog,
        formData: this.formData,
        isSilent: this.isSilent,
        outbound: this.outboundId,
        screenshotData: this.screenshotData,
        webReplay: this.webReplay,
        screenRecordingUrl: this.screenRecordingUrl,
        spamToken: this.spamToken
      };
      var keysToExclude = Object.keys(this.excludeData);

      for (var i = 0; i < keysToExclude.length; i++) {
        var keyToExclude = keysToExclude[i];

        if (this.excludeData[keyToExclude] === true) {
          delete feedbackData[keyToExclude];

          if (keyToExclude === "screenshot") {
            delete feedbackData.screenshotData;
          }

          if (keyToExclude === "replays") {
            delete feedbackData.webReplay;
          }
        }
      }

      return feedbackData;
    }
  }, {
    key: "sendFeedback",
    value: function sendFeedback() {
      var _this2 = this;

      return new Promise(function (resolve, reject) {
        _this2.takeSnapshot().then(function () {
          var dataToSend = _this2.getData();

          var http = new XMLHttpRequest();
          http.open("POST", GleapSession.getInstance().apiUrl + "/bugs/v2");
          http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
          GleapSession.getInstance().injectSession(http);

          http.onerror = function (error) {
            reject();
          };

          http.onreadystatechange = function (e) {
            if (http.readyState === 4) {
              if (http.status === 200 || http.status === 201) {
                resolve();
              } else {
                reject();
              }
            }
          };

          http.send(JSON.stringify(dataToSend));
        })["catch"](function (exp) {
          reject();
        });
      });
    }
  }]);

  return GleapFeedback;
}();


;// CONCATENATED MODULE: ./src/GleapFrameManager.js
function GleapFrameManager_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function GleapFrameManager_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function GleapFrameManager_createClass(Constructor, protoProps, staticProps) { if (protoProps) GleapFrameManager_defineProperties(Constructor.prototype, protoProps); if (staticProps) GleapFrameManager_defineProperties(Constructor, staticProps); return Constructor; }

function GleapFrameManager_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }



var GleapFrameManager = /*#__PURE__*/function () {
  function GleapFrameManager() {
    var _this = this;

    GleapFrameManager_classCallCheck(this, GleapFrameManager);

    GleapFrameManager_defineProperty(this, "frameUrl", "https://frame.gleap.io");

    GleapFrameManager_defineProperty(this, "gleapFrameContainer", null);

    GleapFrameManager_defineProperty(this, "gleapFrame", null);

    GleapFrameManager_defineProperty(this, "injectedFrame", false);

    GleapFrameManager_defineProperty(this, "widgetOpened", false);

    GleapFrameManager_defineProperty(this, "listeners", []);

    GleapFrameManager_defineProperty(this, "markerManager", undefined);

    GleapFrameManager_defineProperty(this, "escListener", undefined);

    GleapFrameManager_defineProperty(this, "frameHeight", 0);

    GleapFrameManager_defineProperty(this, "injectFrame", function () {
      if (_this.injectedFrame) {
        return;
      }

      _this.injectedFrame = true;
      var elem = document.createElement("div");
      elem.className = "gleap-frame-container gleap-frame-container--hidden gleap-hidden";
      elem.innerHTML = "<div class=\"gleap-frame-container-inner\"><iframe src=\"".concat(_this.frameUrl, "\" class=\"gleap-frame\" scrolling=\"yes\" title=\"Gleap Widget Window\" allow=\"autoplay; encrypted-media; fullscreen;\" frameborder=\"0\"></iframe></div>");
      document.body.appendChild(elem);
      _this.gleapFrameContainer = elem;
      _this.gleapFrame = document.querySelector(".gleap-frame");

      _this.updateFrameStyle();
    });

    GleapFrameManager_defineProperty(this, "updateFrameStyle", function () {
      if (!_this.gleapFrameContainer) {
        return;
      }

      var classicStyle = "gleap-frame-container--classic";
      var classicStyleLeft = "gleap-frame-container--classic-left";
      var modernStyleLeft = "gleap-frame-container--modern-left";
      var allStyles = [classicStyle, classicStyleLeft, modernStyleLeft];

      for (var i = 0; i < allStyles.length; i++) {
        _this.gleapFrameContainer.classList.remove(allStyles[i]);
      }

      var styleToApply = undefined;
      var flowConfig = GleapConfigManager.getInstance().getFlowConfig();

      if (flowConfig.feedbackButtonPosition === GleapFeedbackButtonManager.FEEDBACK_BUTTON_CLASSIC || flowConfig.feedbackButtonPosition === GleapFeedbackButtonManager.FEEDBACK_BUTTON_CLASSIC_BOTTOM) {
        styleToApply = classicStyle;
      }

      if (flowConfig.feedbackButtonPosition === GleapFeedbackButtonManager.FEEDBACK_BUTTON_CLASSIC_LEFT) {
        styleToApply = classicStyleLeft;
      }

      if (flowConfig.feedbackButtonPosition === GleapFeedbackButtonManager.FEEDBACK_BUTTON_BOTTOM_LEFT) {
        styleToApply = modernStyleLeft;
      }

      if (styleToApply) {
        _this.gleapFrameContainer.classList.add(styleToApply);
      }

      _this.gleapFrameContainer.setAttribute("dir", GleapTranslationManager.getInstance().isRTLLayout ? "rtl" : "ltr");
    });

    this.startCommunication();
  }

  GleapFrameManager_createClass(GleapFrameManager, [{
    key: "registerEscListener",
    value: function registerEscListener() {
      var _this2 = this;

      if (this.escListener) {
        return;
      }

      this.escListener = function (evt) {
        evt = evt || window.event;

        if (evt.key === "Escape") {
          _this2.hideWidget();
        }
      };

      document.addEventListener("keydown", this.escListener);
    }
  }, {
    key: "unregisterEscListener",
    value: function unregisterEscListener() {
      if (this.escListener) {
        document.removeEventListener("keydown", this.escListener);
        this.escListener = null;
      }
    }
  }, {
    key: "isOpened",
    value: function isOpened() {
      return this.widgetOpened;
    }
  }, {
    key: "showWidget",
    value: function showWidget() {
      var _this3 = this;

      if (this.gleapFrameContainer.classList) {
        this.gleapFrameContainer.classList.remove('gleap-frame-container--hidden');
        setTimeout(function () {
          _this3.gleapFrameContainer.classList.add('gleap-frame-container--animate');
        }, 500);
      }

      this.widgetOpened = true;
      GleapFeedbackButtonManager.getInstance().updateFeedbackButtonState();
      GleapEventManager.notifyEvent("open");
      this.registerEscListener();
    }
  }, {
    key: "hideMarkerManager",
    value: function hideMarkerManager() {
      if (this.markerManager) {
        this.markerManager.clear();
        this.markerManager = null;
      }
    }
  }, {
    key: "hideWidget",
    value: function hideWidget() {
      this.hideMarkerManager();

      if (this.gleapFrameContainer) {
        this.gleapFrameContainer.classList.add('gleap-frame-container--hidden');
        this.gleapFrameContainer.classList.remove('gleap-frame-container--animate');
      }

      this.widgetOpened = false;
      GleapFeedbackButtonManager.getInstance().updateFeedbackButtonState();
      GleapEventManager.notifyEvent("close");
      this.unregisterEscListener();

      if (typeof window !== "undefined" && typeof window.focus !== "undefined") {
        window.focus();
      }
    }
  }, {
    key: "sendMessage",
    value: function sendMessage(data) {
      if (this.gleapFrame) {
        this.gleapFrame.contentWindow.postMessage(JSON.stringify(data), "*");
      }
    }
  }, {
    key: "sendSessionUpdate",
    value: function sendSessionUpdate() {
      this.sendMessage({
        name: "session-update",
        data: {
          sessionData: GleapSession.getInstance().getSession(),
          apiUrl: GleapSession.getInstance().apiUrl,
          sdkKey: GleapSession.getInstance().sdkKey
        }
      });
    }
  }, {
    key: "sendFormPreFillData",
    value: function sendFormPreFillData() {
      this.sendMessage({
        name: "prefill-form-data",
        data: GleapPreFillManager.getInstance().formPreFill
      });
    }
  }, {
    key: "sendConfigUpdate",
    value: function sendConfigUpdate() {
      this.sendMessage({
        name: "config-update",
        data: {
          config: GleapConfigManager.getInstance().getFlowConfig(),
          actions: GleapConfigManager.getInstance().getProjectActions(),
          overrideLanguage: GleapTranslationManager.getInstance().getOverrideLanguage()
        }
      });
      this.updateFrameStyle();
    }
  }, {
    key: "showDrawingScreen",
    value: function showDrawingScreen(type) {
      var _this4 = this;

      this.hideWidget(); // Show screen drawing.

      this.markerManager = new GleapMarkerManager(type);
      this.markerManager.show(function (success) {
        if (!success) {
          _this4.hideMarkerManager();
        }

        _this4.showWidget();
      });
    }
  }, {
    key: "calculateFrameHeight",
    value: function calculateFrameHeight() {
      if (this.gleapFrameContainer) {
        var flowConfig = GleapConfigManager.getInstance().getFlowConfig();
        var bottomOffset = 40;

        if (flowConfig.feedbackButtonPosition === GleapFeedbackButtonManager.FEEDBACK_BUTTON_BOTTOM_LEFT || flowConfig.feedbackButtonPosition === GleapFeedbackButtonManager.FEEDBACK_BUTTON_BOTTOM_RIGHT) {
          bottomOffset = 115;
        }

        var newMaxHeight = Math.min(this.frameHeight, window.innerHeight - bottomOffset);
        this.gleapFrameContainer.style.maxHeight = newMaxHeight + "px";
      }
    }
  }, {
    key: "startCommunication",
    value: function startCommunication() {
      var _this5 = this;

      window.addEventListener('resize', function (event) {
        _this5.calculateFrameHeight();
      }, true); // Listen for messages.

      this.addMessageListener(function (data) {
        if (data.name === "ping") {
          GleapStreamedEvent.getInstance().start(); // Inject the widget buttons

          GleapFeedbackButtonManager.getInstance().injectFeedbackButton();

          _this5.sendConfigUpdate();

          _this5.sendSessionUpdate();

          _this5.sendFormPreFillData();
        }

        if (data.name === "height-update") {
          _this5.frameHeight = data.data;

          _this5.calculateFrameHeight();
        }

        if (data.name === "notify-event") {
          GleapEventManager.notifyEvent(data.data.type, data.data.data);
        }

        if (data.name === "cleanup-drawings") {
          _this5.hideMarkerManager();
        }

        if (data.name === "open-url") {
          var url = data.data;

          if (url && url.length > 0) {
            window.open(url, '_blank').focus();
          }
        }

        if (data.name === "run-custom-action") {
          GleapCustomActionManager.triggerCustomAction(data.data);
        }

        if (data.name === "close-widget") {
          _this5.hideWidget();
        }

        if (data.name === "send-feedback") {
          var formData = data.data.formData;
          var action = data.data.action;
          var outboundId = data.data.outboundId;
          var spamToken = data.data.spamToken;
          var feedback = new GleapFeedback(action.feedbackType, "MEDIUM", formData, false, action.excludeData, outboundId, spamToken);
          feedback.sendFeedback().then(function () {
            _this5.sendMessage({
              name: "feedback-sent"
            });

            GleapEventManager.notifyEvent("feedback-sent", formData);
          })["catch"](function (error) {
            _this5.sendMessage({
              name: "feedback-sending-failed",
              data: "Something went wrong, please try again."
            });

            GleapEventManager.notifyEvent("error-while-sending");
          });
        }

        if (data.name === "start-screen-drawing") {
          _this5.showDrawingScreen(data.data);
        }
      }); // Add window message listener.

      window.addEventListener("message", function (event) {
        if (event.origin !== _this5.frameUrl) {
          return;
        }

        try {
          var data = JSON.parse(event.data);

          for (var i = 0; i < _this5.listeners.length; i++) {
            if (_this5.listeners[i]) {
              _this5.listeners[i](data);
            }
          }
        } catch (exp) {}
      });
    }
  }, {
    key: "addMessageListener",
    value: function addMessageListener(callback) {
      this.listeners.push(callback);
    }
  }], [{
    key: "getInstance",
    value: // GleapFrameManager singleton
    function getInstance() {
      if (!this.instance) {
        this.instance = new GleapFrameManager();
      }

      return this.instance;
    }
  }]);

  return GleapFrameManager;
}();

GleapFrameManager_defineProperty(GleapFrameManager, "instance", void 0);


;// CONCATENATED MODULE: ./src/GleapMetaDataManager.js
function GleapMetaDataManager_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function GleapMetaDataManager_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function GleapMetaDataManager_createClass(Constructor, protoProps, staticProps) { if (protoProps) GleapMetaDataManager_defineProperties(Constructor.prototype, protoProps); if (staticProps) GleapMetaDataManager_defineProperties(Constructor, staticProps); return Constructor; }

function GleapMetaDataManager_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }



var GleapMetaDataManager = /*#__PURE__*/function () {
  function GleapMetaDataManager() {
    GleapMetaDataManager_classCallCheck(this, GleapMetaDataManager);

    GleapMetaDataManager_defineProperty(this, "sessionStart", new Date());

    GleapMetaDataManager_defineProperty(this, "appBuildNumber", "");

    GleapMetaDataManager_defineProperty(this, "appVersionCode", "");
  }

  GleapMetaDataManager_createClass(GleapMetaDataManager, [{
    key: "getMetaData",
    value: function getMetaData() {
      var nAgt = navigator.userAgent;
      var browserName = navigator.appName;
      var fullVersion = "" + parseFloat(navigator.appVersion);
      var majorVersion = parseInt(navigator.appVersion, 10);
      var nameOffset, verOffset, ix; // In Opera, the true version is after "Opera" or after "Version"

      if ((verOffset = nAgt.indexOf("Opera")) !== -1) {
        browserName = "Opera";
        fullVersion = nAgt.substring(verOffset + 6);
        if ((verOffset = nAgt.indexOf("Version")) !== -1) fullVersion = nAgt.substring(verOffset + 8);
      } // In MSIE, the true version is after "MSIE" in userAgent
      else if ((verOffset = nAgt.indexOf("MSIE")) !== -1) {
          browserName = "Microsoft Internet Explorer";
          fullVersion = nAgt.substring(verOffset + 5);
        } // In Chrome, the true version is after "Chrome"
        else if ((verOffset = nAgt.indexOf("Chrome")) !== -1) {
            browserName = "Chrome";
            fullVersion = nAgt.substring(verOffset + 7);
          } // In Safari, the true version is after "Safari" or after "Version"
          else if ((verOffset = nAgt.indexOf("Safari")) !== -1) {
              browserName = "Safari";
              fullVersion = nAgt.substring(verOffset + 7);
              if ((verOffset = nAgt.indexOf("Version")) !== -1) fullVersion = nAgt.substring(verOffset + 8);
            } // In Firefox, the true version is after "Firefox"
            else if ((verOffset = nAgt.indexOf("Firefox")) !== -1) {
                browserName = "Firefox";
                fullVersion = nAgt.substring(verOffset + 8);
              } // In most other browsers, "name/version" is at the end of userAgent
              else if ((nameOffset = nAgt.lastIndexOf(" ") + 1) < (verOffset = nAgt.lastIndexOf("/"))) {
                  browserName = nAgt.substring(nameOffset, verOffset);
                  fullVersion = nAgt.substring(verOffset + 1);

                  if (browserName.toLowerCase() === browserName.toUpperCase()) {
                    browserName = navigator.appName;
                  }
                } // trim the fullVersion string at semicolon/space if present


      if ((ix = fullVersion.indexOf(";")) !== -1) fullVersion = fullVersion.substring(0, ix);
      if ((ix = fullVersion.indexOf(" ")) !== -1) fullVersion = fullVersion.substring(0, ix);
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
      var now = new Date();
      var sessionDuration = (now.getTime() - this.sessionStart.getTime()) / 1000;
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
        sdkVersion: "7.0.28",
        sdkType: "javascript"
      };
    }
  }], [{
    key: "getInstance",
    value: function getInstance() {
      if (!this.instance) {
        this.instance = new GleapMetaDataManager();
      }

      return this.instance;
    }
    /**
     * Sets the app version code.
     * @param {string} appVersionCode
     */

  }, {
    key: "setAppVersionCode",
    value: function setAppVersionCode(appVersionCode) {
      this.getInstance().appVersionCode = appVersionCode;
    }
    /**
     * Sets the app version code.
     * @param {string} appVersionCode
     */

  }, {
    key: "setAppBuildNumber",
    value: function setAppBuildNumber(appBuildNumber) {
      this.getInstance().appBuildNumber = appBuildNumber;
    }
  }]);

  return GleapMetaDataManager;
}();

GleapMetaDataManager_defineProperty(GleapMetaDataManager, "instance", void 0);


;// CONCATENATED MODULE: ./src/GleapConsoleLogManager.js
function GleapConsoleLogManager_ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function GleapConsoleLogManager_objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { GleapConsoleLogManager_ownKeys(Object(source), true).forEach(function (key) { GleapConsoleLogManager_defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { GleapConsoleLogManager_ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function GleapConsoleLogManager_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function GleapConsoleLogManager_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function GleapConsoleLogManager_createClass(Constructor, protoProps, staticProps) { if (protoProps) GleapConsoleLogManager_defineProperties(Constructor.prototype, protoProps); if (staticProps) GleapConsoleLogManager_defineProperties(Constructor, staticProps); return Constructor; }

function GleapConsoleLogManager_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }



var GleapConsoleLogManager = /*#__PURE__*/function () {
  function GleapConsoleLogManager() {
    GleapConsoleLogManager_classCallCheck(this, GleapConsoleLogManager);

    GleapConsoleLogManager_defineProperty(this, "logArray", []);

    GleapConsoleLogManager_defineProperty(this, "disabled", false);

    GleapConsoleLogManager_defineProperty(this, "originalConsoleLog", void 0);

    GleapConsoleLogManager_defineProperty(this, "logMaxLength", 500);
  }

  GleapConsoleLogManager_createClass(GleapConsoleLogManager, [{
    key: "getLogs",
    value:
    /**
     * Return the console logs
     * @returns {any[]} logs
     */
    function getLogs() {
      return this.logArray;
    }
    /**
     * Revert console log overwrite.
     */

  }, {
    key: "stop",
    value: function stop() {
      this.disabled = true;
      window.console = this.originalConsoleLog;
    }
    /**
     * Add message with log level to logs.
     * @param {*} message
     * @param {*} logLevel
     * @returns
     */

  }, {
    key: "addLog",
    value: function addLog(message) {
      var logLevel = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "INFO";

      if (!message || message.length <= 0) {
        return;
      }

      this.logArray.push({
        log: truncateString(message, 1000),
        date: new Date(),
        priority: logLevel
      });

      if (this.logArray.length > this.logMaxLength) {
        this.logArray.shift();
      }
    }
    /**
     * Add entry to logs.
     * @param {*} args
     * @param {*} logLevel
     * @returns
     */

  }, {
    key: "addLogWithArgs",
    value: function addLogWithArgs(args, logLevel) {
      if (!args || args.length <= 0) {
        return;
      }

      var log = "";

      for (var i = 0; i < args.length; i++) {
        log += args[i] + " ";
      }

      this.addLog(log, logLevel);
    }
    /**
     * Start console log overwrite.
     */

  }, {
    key: "start",
    value: function start() {
      if (this.disabled) {
        return;
      }

      var self = this;

      window.console = function (origConsole) {
        if (!window.console || !origConsole) {
          origConsole = {};
        }

        self.originalConsoleLog = origConsole;
        return GleapConsoleLogManager_objectSpread(GleapConsoleLogManager_objectSpread({}, origConsole), {}, {
          log: function log() {
            self.addLogWithArgs(arguments, "INFO");
            origConsole.log && origConsole.log.apply(origConsole, arguments);
          },
          warn: function warn() {
            self.addLogWithArgs(arguments, "WARNING");
            origConsole.warn && origConsole.warn.apply(origConsole, arguments);
          },
          error: function error() {
            self.addLogWithArgs(arguments, "ERROR");
            origConsole.error && origConsole.error.apply(origConsole, arguments);
          },
          info: function info(v) {
            self.addLogWithArgs(arguments, "INFO");
            origConsole.info && origConsole.info.apply(origConsole, arguments);
          }
        });
      }(window.console);
    }
  }], [{
    key: "getInstance",
    value: function getInstance() {
      if (!this.instance) {
        this.instance = new GleapConsoleLogManager();
      }

      return this.instance;
    }
  }]);

  return GleapConsoleLogManager;
}();

GleapConsoleLogManager_defineProperty(GleapConsoleLogManager, "instance", void 0);


;// CONCATENATED MODULE: ./src/GleapClickListener.js
function GleapClickListener_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function GleapClickListener_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function GleapClickListener_createClass(Constructor, protoProps, staticProps) { if (protoProps) GleapClickListener_defineProperties(Constructor.prototype, protoProps); if (staticProps) GleapClickListener_defineProperties(Constructor, staticProps); return Constructor; }

function GleapClickListener_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }




var GleapClickListener = /*#__PURE__*/function () {
  function GleapClickListener() {
    GleapClickListener_classCallCheck(this, GleapClickListener);
  }

  GleapClickListener_createClass(GleapClickListener, [{
    key: "start",
    value: function start() {
      document.addEventListener("click", function (event) {
        if (!event.target) {
          return;
        }

        if (!GleapFrameManager.getInstance().isOpened()) {
          GleapConsoleLogManager.getInstance().addLog(getDOMElementDescription(event.target), "CLICK");
        }
      });
    }
  }], [{
    key: "getInstance",
    value: function getInstance() {
      if (!this.instance) {
        this.instance = new GleapClickListener();
      }

      return this.instance;
    }
  }]);

  return GleapClickListener;
}();

GleapClickListener_defineProperty(GleapClickListener, "instance", void 0);


;// CONCATENATED MODULE: ./src/GleapCrashDetector.js
function GleapCrashDetector_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function GleapCrashDetector_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function GleapCrashDetector_createClass(Constructor, protoProps, staticProps) { if (protoProps) GleapCrashDetector_defineProperties(Constructor.prototype, protoProps); if (staticProps) GleapCrashDetector_defineProperties(Constructor, staticProps); return Constructor; }

function GleapCrashDetector_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }



var GleapCrashDetector = /*#__PURE__*/function () {
  function GleapCrashDetector() {
    GleapCrashDetector_classCallCheck(this, GleapCrashDetector);
  }

  GleapCrashDetector_createClass(GleapCrashDetector, [{
    key: "start",
    value: function start() {
      window.addEventListener('error', function (e) {
        var message = e.message,
            filename = e.filename,
            lineno = e.lineno,
            colno = e.colno,
            error = e.error;
        var stackTrace = "";

        if (error !== null && typeof error.stack !== "undefined") {
          stackTrace = error.stack;
        }

        var messageObject = ["Message: " + message, "URL: " + filename, "Line: " + lineno, "Column: " + colno, "Stack: " + stackTrace];
        GleapConsoleLogManager.getInstance().addLogWithArgs(messageObject, "ERROR");
        var flowConfig = GleapConfigManager.getInstance().getFlowConfig();

        if (flowConfig && typeof flowConfig.enableCrashDetector !== "undefined" && flowConfig.enableCrashDetector) {
          if (flowConfig.crashDetectorIsSilent) {
            src_Gleap.sendSilentCrashReportWithFormData({
              errorMessage: message,
              url: filename,
              lineNo: lineno,
              columnNo: colno,
              stackTrace: stackTrace
            }, "MEDIUM", {
              screenshot: true,
              replays: true
            });
          } else {
            src_Gleap.startFeedbackFlowWithOptions("crash");
          }
        }
      });
    }
  }], [{
    key: "getInstance",
    value: // GleapCrashDetector singleton
    function getInstance() {
      if (!this.instance) {
        this.instance = new GleapCrashDetector();
      }

      return this.instance;
    }
  }]);

  return GleapCrashDetector;
}();

GleapCrashDetector_defineProperty(GleapCrashDetector, "instance", void 0);


;// CONCATENATED MODULE: ./src/GleapFeedbackButtonManager.js
function GleapFeedbackButtonManager_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function GleapFeedbackButtonManager_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function GleapFeedbackButtonManager_createClass(Constructor, protoProps, staticProps) { if (protoProps) GleapFeedbackButtonManager_defineProperties(Constructor.prototype, protoProps); if (staticProps) GleapFeedbackButtonManager_defineProperties(Constructor, staticProps); return Constructor; }

function GleapFeedbackButtonManager_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }




var GleapFeedbackButtonManager = /*#__PURE__*/function () {
  function GleapFeedbackButtonManager() {
    GleapFeedbackButtonManager_classCallCheck(this, GleapFeedbackButtonManager);

    GleapFeedbackButtonManager_defineProperty(this, "feedbackButton", null);

    GleapFeedbackButtonManager_defineProperty(this, "injectedFeedbackButton", false);
  }

  GleapFeedbackButtonManager_createClass(GleapFeedbackButtonManager, [{
    key: "toggleFeedbackButton",
    value:
    /**
     * Toggles the feedback button visibility.
     * @param {*} show 
     * @returns 
     */
    function toggleFeedbackButton(show) {
      if (!this.feedbackButton) {
        return;
      }

      this.feedbackButton.style.display = show ? "flex" : "none";
    }
  }, {
    key: "feedbackButtonPressed",
    value: function feedbackButtonPressed() {
      var frameManager = GleapFrameManager.getInstance();

      if (frameManager.isOpened()) {
        frameManager.hideWidget();
      } else {
        frameManager.showWidget();
      }
    }
    /**
     * Injects the feedback button into the current DOM.
     */

  }, {
    key: "injectFeedbackButton",
    value: function injectFeedbackButton() {
      var _this = this;

      if (this.injectedFeedbackButton) {
        return;
      }

      this.injectedFeedbackButton = true;
      var elem = document.createElement("div");

      elem.onclick = function () {
        _this.feedbackButtonPressed();
      };

      document.body.appendChild(elem);
      this.feedbackButton = elem;
      this.updateFeedbackButtonState();
    }
    /**
     * Updates the feedback button state
     * @returns 
     */

  }, {
    key: "updateFeedbackButtonState",
    value: function updateFeedbackButtonState() {
      if (this.feedbackButton === null) {
        return;
      }

      var flowConfig = GleapConfigManager.getInstance().getFlowConfig();
      var buttonIcon = "";

      if (flowConfig.buttonLogo) {
        buttonIcon = "<img class=\"bb-logo-logo\" src=\"".concat(flowConfig.buttonLogo, "\" alt=\"Feedback Button\" />");
      } else {
        buttonIcon = loadIcon("button", "#fff");
      }

      this.feedbackButton.className = "bb-feedback-button gleap-hidden";
      this.feedbackButton.setAttribute("dir", GleapTranslationManager.getInstance().isRTLLayout ? "rtl" : "ltr");

      if (flowConfig.feedbackButtonPosition === GleapFeedbackButtonManager.FEEDBACK_BUTTON_CLASSIC || flowConfig.feedbackButtonPosition === GleapFeedbackButtonManager.FEEDBACK_BUTTON_CLASSIC_BOTTOM || flowConfig.feedbackButtonPosition === GleapFeedbackButtonManager.FEEDBACK_BUTTON_CLASSIC_LEFT) {
        this.feedbackButton.innerHTML = "<div class=\"bb-feedback-button-classic ".concat(flowConfig.feedbackButtonPosition === GleapFeedbackButtonManager.FEEDBACK_BUTTON_CLASSIC_LEFT ? "bb-feedback-button-classic--left" : "").concat(flowConfig.feedbackButtonPosition === GleapFeedbackButtonManager.FEEDBACK_BUTTON_CLASSIC_BOTTOM ? "bb-feedback-button-classic--bottom" : "", "\">").concat(GleapTranslationManager.translateText(flowConfig.widgetButtonText), "</div>");
      } else {
        this.feedbackButton.innerHTML = "<div class=\"bb-feedback-button-icon\">".concat(buttonIcon).concat(loadIcon("arrowdown", "#fff"), "</div>");
      }

      if (flowConfig.feedbackButtonPosition === GleapFeedbackButtonManager.FEEDBACK_BUTTON_NONE) {
        this.feedbackButton.classList.add("bb-feedback-button--disabled");
      }

      if (flowConfig.feedbackButtonPosition === GleapFeedbackButtonManager.FEEDBACK_BUTTON_BOTTOM_LEFT) {
        this.feedbackButton.classList.add("bb-feedback-button--bottomleft");
      }

      if (GleapFrameManager.getInstance().isOpened()) {
        this.feedbackButton.classList.add("bb-feedback-button--open");
      }
    }
  }], [{
    key: "getInstance",
    value: function getInstance() {
      if (!this.instance) {
        this.instance = new GleapFeedbackButtonManager();
      }

      return this.instance;
    }
  }]);

  return GleapFeedbackButtonManager;
}();

GleapFeedbackButtonManager_defineProperty(GleapFeedbackButtonManager, "FEEDBACK_BUTTON_BOTTOM_RIGHT", "BOTTOM_RIGHT");

GleapFeedbackButtonManager_defineProperty(GleapFeedbackButtonManager, "FEEDBACK_BUTTON_BOTTOM_LEFT", "BOTTOM_LEFT");

GleapFeedbackButtonManager_defineProperty(GleapFeedbackButtonManager, "FEEDBACK_BUTTON_CLASSIC", "BUTTON_CLASSIC");

GleapFeedbackButtonManager_defineProperty(GleapFeedbackButtonManager, "FEEDBACK_BUTTON_CLASSIC_LEFT", "BUTTON_CLASSIC_LEFT");

GleapFeedbackButtonManager_defineProperty(GleapFeedbackButtonManager, "FEEDBACK_BUTTON_CLASSIC_BOTTOM", "BUTTON_CLASSIC_BOTTOM");

GleapFeedbackButtonManager_defineProperty(GleapFeedbackButtonManager, "FEEDBACK_BUTTON_NONE", "BUTTON_NONE");

GleapFeedbackButtonManager_defineProperty(GleapFeedbackButtonManager, "instance", void 0);


;// CONCATENATED MODULE: ./src/GleapCustomDataManager.js
function GleapCustomDataManager_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function GleapCustomDataManager_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function GleapCustomDataManager_createClass(Constructor, protoProps, staticProps) { if (protoProps) GleapCustomDataManager_defineProperties(Constructor.prototype, protoProps); if (staticProps) GleapCustomDataManager_defineProperties(Constructor, staticProps); return Constructor; }

function GleapCustomDataManager_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }



var GleapCustomDataManager = /*#__PURE__*/function () {
  function GleapCustomDataManager() {
    GleapCustomDataManager_classCallCheck(this, GleapCustomDataManager);

    GleapCustomDataManager_defineProperty(this, "customData", {});
  }

  GleapCustomDataManager_createClass(GleapCustomDataManager, [{
    key: "getCustomData",
    value:
    /**
     * Returns the custom data object
     * @returns {*}
     */
    function getCustomData() {
      return this.customData;
    }
    /**
     * Set custom data that will be attached to the bug-report.
     * @param {*} data
     */

  }, {
    key: "attachCustomData",
    value: function attachCustomData(data) {
      this.customData = Object.assign(this.customData, gleapDataParser(data));
    }
    /**
     * Add one key value pair to the custom data object
     * @param {*} key The key of the custom data entry you want to add.
     * @param {*} value The custom data you want to add.
     */

  }, {
    key: "setCustomData",
    value: function setCustomData(key, value) {
      this.customData[key] = value;
    }
    /**
     * Remove one key value pair of the custom data object
     * @param {*} key The key of the custom data entry you want to remove.
     */

  }, {
    key: "removeCustomData",
    value: function removeCustomData(key) {
      delete this.customData[key];
    }
    /**
     * Clear the custom data
     */

  }, {
    key: "clearCustomData",
    value: function clearCustomData() {
      this.customData = {};
    }
  }], [{
    key: "getInstance",
    value: function getInstance() {
      if (!this.instance) {
        this.instance = new GleapCustomDataManager();
      }

      return this.instance;
    }
  }]);

  return GleapCustomDataManager;
}();

GleapCustomDataManager_defineProperty(GleapCustomDataManager, "instance", void 0);


;// CONCATENATED MODULE: ./src/GleapEventManager.js
function GleapEventManager_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function GleapEventManager_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function GleapEventManager_createClass(Constructor, protoProps, staticProps) { if (protoProps) GleapEventManager_defineProperties(Constructor.prototype, protoProps); if (staticProps) GleapEventManager_defineProperties(Constructor, staticProps); return Constructor; }

function GleapEventManager_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }



var GleapEventManager = /*#__PURE__*/function () {
  function GleapEventManager() {
    GleapEventManager_classCallCheck(this, GleapEventManager);

    GleapEventManager_defineProperty(this, "eventListeners", {});
  }

  GleapEventManager_createClass(GleapEventManager, null, [{
    key: "getInstance",
    value: function getInstance() {
      if (!this.instance) {
        this.instance = new GleapEventManager();
      }

      return this.instance;
    }
    /**
     * Notify all registrants for event.
     */

  }, {
    key: "notifyEvent",
    value: function notifyEvent(event) {
      var data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      if (event === "flow-started") {
        var gleapInstance = src_Gleap.getInstance();
        gleapInstance.setGlobalDataItem("webReplay", null);
        gleapInstance.setGlobalDataItem("screenRecordingData", null);
        gleapInstance.takeCurrentReplay();
      }

      var eventListeners = this.getInstance().eventListeners[event];

      if (eventListeners) {
        for (var i = 0; i < eventListeners.length; i++) {
          var eventListener = eventListeners[i];

          if (eventListener) {
            eventListener(data);
          }
        }
      }
    }
    /**
     * Register events for Gleap.
     * @param {*} eventName
     * @param {*} callback
     */

  }, {
    key: "on",
    value: function on(eventName, callback) {
      var instance = this.getInstance();

      if (!instance.eventListeners[eventName]) {
        instance.eventListeners[eventName] = [];
      }

      instance.eventListeners[eventName].push(callback);
    }
  }]);

  return GleapEventManager;
}();

GleapEventManager_defineProperty(GleapEventManager, "instance", void 0);


;// CONCATENATED MODULE: ./src/GleapCustomActionManager.js
function GleapCustomActionManager_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function GleapCustomActionManager_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function GleapCustomActionManager_createClass(Constructor, protoProps, staticProps) { if (protoProps) GleapCustomActionManager_defineProperties(Constructor.prototype, protoProps); if (staticProps) GleapCustomActionManager_defineProperties(Constructor, staticProps); return Constructor; }

function GleapCustomActionManager_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var GleapCustomActionManager = /*#__PURE__*/function () {
  function GleapCustomActionManager() {
    GleapCustomActionManager_classCallCheck(this, GleapCustomActionManager);

    GleapCustomActionManager_defineProperty(this, "customActionCallbacks", []);
  }

  GleapCustomActionManager_createClass(GleapCustomActionManager, null, [{
    key: "getInstance",
    value: function getInstance() {
      if (!this.instance) {
        this.instance = new GleapCustomActionManager();
      }

      return this.instance;
    }
    /**
     * Register custom action
     */

  }, {
    key: "registerCustomAction",
    value: function registerCustomAction(customAction) {
      var instance = this.getInstance();

      if (instance.customActionCallbacks) {
        instance.customActionCallbacks.push(customAction);
      }
    }
    /**
     * Triggers a custom action
     */

  }, {
    key: "triggerCustomAction",
    value: function triggerCustomAction(name) {
      var instance = this.getInstance();

      if (instance.customActionCallbacks) {
        for (var i = 0; i < instance.customActionCallbacks.length; i++) {
          var callback = instance.customActionCallbacks[i];

          if (callback) {
            callback({
              name: name
            });
          }
        }
      }
    }
  }]);

  return GleapCustomActionManager;
}();

GleapCustomActionManager_defineProperty(GleapCustomActionManager, "instance", void 0);


;// CONCATENATED MODULE: ./src/GleapRageClickDetector.js
function GleapRageClickDetector_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function GleapRageClickDetector_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function GleapRageClickDetector_createClass(Constructor, protoProps, staticProps) { if (protoProps) GleapRageClickDetector_defineProperties(Constructor.prototype, protoProps); if (staticProps) GleapRageClickDetector_defineProperties(Constructor, staticProps); return Constructor; }

function GleapRageClickDetector_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }




var detectRageClicks = function detectRageClicks(subscribe, options) {
  var interval = options.interval,
      limit = options.limit;
  var count = 1;
  var countClear = setInterval(function () {
    count = 1;
  }, interval);

  var listener = function listener(event) {
    if (count === limit) {
      subscribe(event.target);
    }

    count++;
  };

  document.addEventListener("click", listener);
};

var startRageClickDetector = function startRageClickDetector(callback) {
  detectRageClicks(function (target, unsubscribe) {
    callback(target);
  }, {
    interval: 750,
    limit: 4
  });
};

var GleapRageClickDetector = /*#__PURE__*/function () {
  function GleapRageClickDetector() {
    GleapRageClickDetector_classCallCheck(this, GleapRageClickDetector);

    GleapRageClickDetector_defineProperty(this, "initializedRageClickDetector", false);
  }

  GleapRageClickDetector_createClass(GleapRageClickDetector, [{
    key: "start",
    value: function start() {
      if (this.initializedRageClickDetector) {
        return;
      }

      this.initializedRageClickDetector = true;
      startRageClickDetector(function (target) {
        var elementDescription = getDOMElementDescription(target, false);
        var flowConfig = GleapConfigManager.getInstance().getFlowConfig();

        if (flowConfig && typeof flowConfig.enableRageClickDetector !== "undefined" && flowConfig.enableRageClickDetector) {
          if (flowConfig.rageClickDetectorIsSilent) {
            src_Gleap.sendSilentCrashReportWithFormData({
              description: "Rage click detected.",
              element: elementDescription
            }, "MEDIUM");
          } else {
            src_Gleap.startFeedbackFlowWithOptions("crash");
          }
        }
      });
    }
  }], [{
    key: "getInstance",
    value: function getInstance() {
      if (!this.instance) {
        this.instance = new GleapRageClickDetector();
      }

      return this.instance;
    }
  }]);

  return GleapRageClickDetector;
}();

GleapRageClickDetector_defineProperty(GleapRageClickDetector, "instance", void 0);


;// CONCATENATED MODULE: ./src/GleapReplayConstants.js
function GleapReplayConstants_typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { GleapReplayConstants_typeof = function _typeof(obj) { return typeof obj; }; } else { GleapReplayConstants_typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return GleapReplayConstants_typeof(obj); }

var REPLAYREC_ADD = "p";
var REPLAYREC_CANVAS_DATA = "c";
var REPLAYREC_DELAY = "o";
var REPLAYREC_FORCE_STYLE_FLUSH = "f";
var REPLAYREC_INPUT = "i";
var REPLAYREC_INPUTCHECK = "z";
var REPLAYREC_MOUSE_MOVE = "m";
var REPLAYREC_MOUSE_DOWN = "n";
var REPLAYREC_ATTR = "r";
var REPLAYREC_TEXT = "t";
var REPLAYREC_MOUSE_UP = "u";
var REPLAYREC_REMOVE = "v";
var REPLAYREC_SCROLL = "s";
var REPLAYREC_MAINSCROLL = "x";
function gleapRoughSizeOfObject(object) {
  var objectList = [];
  var stack = [object];
  var bytes = 0;

  while (stack.length) {
    var value = stack.pop();

    if (typeof value === "boolean") {
      bytes += 4;
    } else if (typeof value === "string") {
      bytes += value.length * 2;
    } else if (typeof value === "number") {
      bytes += 8;
    } else if (GleapReplayConstants_typeof(value) === "object" && objectList.indexOf(value) === -1) {
      objectList.push(value);

      for (var i in value) {
        stack.push(value[i]);
      }
    }
  }

  return bytes / 1024 / 1024;
}
;// CONCATENATED MODULE: ./src/GleapReplayRecFrame.js
function GleapReplayRecFrame_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function GleapReplayRecFrame_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function GleapReplayRecFrame_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function GleapReplayRecFrame_createClass(Constructor, protoProps, staticProps) { if (protoProps) GleapReplayRecFrame_defineProperties(Constructor.prototype, protoProps); if (staticProps) GleapReplayRecFrame_defineProperties(Constructor, staticProps); return Constructor; }



var GleapReplayRecFrame = /*#__PURE__*/function () {
  function GleapReplayRecFrame(win, node, rec) {
    var _this = this;

    GleapReplayRecFrame_classCallCheck(this, GleapReplayRecFrame);

    this.win = win;
    this.node = node;
    this.rec = rec;
    this.initialState = {};
    this.initialActions = [];

    this.prepEvent = function (event) {
      var _a;

      _this.flushObserver();

      return ((_a = event.target) === null || _a === void 0 ? void 0 : _a.ReplayRecID) || 0;
    };

    this.mouseListener = function (event) {
      var x = event.clientX;
      var y = event.clientY;
      var target = event.target;
      var mouseEventNode = _this.node;

      if (!mouseEventNode.contains(target)) {
        return;
      }

      _this.flushObserver();

      var nodeRect = mouseEventNode.getBoundingClientRect();
      x -= nodeRect.left;
      y -= nodeRect.top;
      var key;

      switch (event.type) {
        case "mousemove":
          key = REPLAYREC_MOUSE_MOVE;
          break;

        case "mouseup":
          key = REPLAYREC_MOUSE_UP;
          break;

        case "mousedown":
          key = REPLAYREC_MOUSE_DOWN;
          break;

        default:
          throw new Error("Unknown event type: ".concat(event.type));
      }

      _this.rec.actions.push(GleapReplayRecFrame_defineProperty({}, key, [Math.round(x), Math.round(y)]));
    };

    this.scrollListener = function (event) {
      if (!_this.node.contains(event.target)) {
        return;
      }

      var id = _this.prepEvent(event);

      if (id) {
        _this.rec.pushScrollAction(id, event.target);
      }
    };

    this.mainScrollListener = function () {
      _this.flushObserver();

      _this.rec.actions.push(GleapReplayRecFrame_defineProperty({}, REPLAYREC_MAINSCROLL, [window.scrollX, window.scrollY]));
    };

    this.inputListener = function (event) {
      if (!_this.node.contains(event.target)) {
        return;
      }

      var id = _this.prepEvent(event);

      if (id && "value" in event.target) {
        var val = event.target.value;

        if (event.target.type === "password" && val && val.length) {
          val = new Array(val.length + 1).join("*");
        }

        if (event.target.getAttribute("gleap-ignore") === "value") {
          val = new Array(val.length + 1).join("*");
        }

        _this.rec.actions.push(GleapReplayRecFrame_defineProperty({}, REPLAYREC_INPUT, [id, val]));
      }

      if (id && "type" in event.target && event.target.type === "checkbox") {
        var checked = event.target.checked;

        _this.rec.actions.push(GleapReplayRecFrame_defineProperty({}, REPLAYREC_INPUTCHECK, [id, checked]));
      }
    };

    this.flushListener = function (event) {
      if (!_this.node.contains(event.target)) {
        return;
      }

      var id = _this.prepEvent(event);

      if (id) {
        _this.rec.actions.push(GleapReplayRecFrame_defineProperty({}, REPLAYREC_FORCE_STYLE_FLUSH, id));
      }
    };

    this.canvasListener = function (event) {
      if (!_this.node.contains(event.target)) {
        return;
      }

      var id = _this.prepEvent(event);

      if (id) {
        _this.rec.actions.push(GleapReplayRecFrame_defineProperty({}, REPLAYREC_CANVAS_DATA, [id, event.target.toDataURL(), "didDraw"]));
      }
    };

    this.focusListener = function () {};

    node.ownerDocument.ReplayRecInner = this;
    var initialActions = [];
    var serializedNode = this.rec.serializeNode(this.node, initialActions);

    if (serializedNode) {
      this.initialState = serializedNode;
      this.initialActions = initialActions; // Fix for patched mutation observer.

      var GleapMutationObserver = MutationObserver;

      if (window && window.Zone && window[window.Zone.__symbol__("MutationObserver")]) {
        GleapMutationObserver = window[window.Zone.__symbol__("MutationObserver")];
      }

      this.observer = new GleapMutationObserver(rec.observerCallback);
      this.observer.observe(node, {
        attributes: true,
        characterData: true,
        childList: true,
        subtree: true
      }); // Get scroll position

      this.mainScrollListener();
      win.addEventListener("input", this.inputListener, {
        capture: true,
        passive: true
      });
      win.addEventListener("mousemove", this.mouseListener, {
        capture: true,
        passive: true
      });
      win.addEventListener("mousedown", this.mouseListener, {
        capture: true,
        passive: true
      });
      win.addEventListener("mouseup", this.mouseListener, {
        capture: true,
        passive: true
      });
      win.addEventListener("forceStyleFlush", this.flushListener, {
        capture: true,
        passive: true
      });
      win.addEventListener("didDrawCanvas", this.canvasListener, {
        capture: true,
        passive: true
      });
      win.addEventListener("focus", this.focusListener, {
        capture: true,
        passive: true
      });
      win.addEventListener("scroll", this.mainScrollListener, {
        capture: true,
        passive: true
      });
    }
  }

  GleapReplayRecFrame_createClass(GleapReplayRecFrame, [{
    key: "stop",
    value: function stop() {
      this.flushObserver();

      if (this.observer) {
        this.observer.disconnect();
      }

      this.win.removeEventListener("input", this.inputListener, {
        capture: true,
        passive: true
      });
      this.win.removeEventListener("mousemove", this.mouseListener, {
        capture: true,
        passive: true
      });
      this.win.removeEventListener("mousedown", this.mouseListener, {
        capture: true,
        passive: true
      });
      this.win.removeEventListener("mouseup", this.mouseListener, {
        capture: true,
        passive: true
      });
      this.win.removeEventListener("forceStyleFlush", this.flushListener, {
        capture: true,
        passive: true
      });
      this.win.removeEventListener("didDrawCanvas", this.canvasListener, {
        capture: true,
        passive: true
      });
      this.win.removeEventListener("focus", this.focusListener, {
        capture: true,
        passive: true
      });
      this.win.removeEventListener("scroll", this.mainScrollListener, {
        capture: true,
        passive: true
      });
      this.rec.deleteAllReplayRecIDs(this.node);
    }
  }, {
    key: "flushObserver",
    value: function flushObserver() {
      if (this.observer && typeof this.observer.takeRecords !== "undefined") {
        this.rec.observerCallback(this.observer.takeRecords());
      }
    }
  }]);

  return GleapReplayRecFrame;
}();


;// CONCATENATED MODULE: ./src/GleapReplayRecorder.js
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = GleapReplayRecorder_unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function GleapReplayRecorder_unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return GleapReplayRecorder_arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return GleapReplayRecorder_arrayLikeToArray(o, minLen); }

function GleapReplayRecorder_arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function GleapReplayRecorder_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function GleapReplayRecorder_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function GleapReplayRecorder_createClass(Constructor, protoProps, staticProps) { if (protoProps) GleapReplayRecorder_defineProperties(Constructor.prototype, protoProps); if (staticProps) GleapReplayRecorder_defineProperties(Constructor, staticProps); return Constructor; }

function GleapReplayRecorder_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }







var GleapReplayRecorder = /*#__PURE__*/function () {
  function GleapReplayRecorder() {
    var _this = this;

    GleapReplayRecorder_classCallCheck(this, GleapReplayRecorder);

    GleapReplayRecorder_defineProperty(this, "startDate", undefined);

    GleapReplayRecorder_defineProperty(this, "stopped", true);

    GleapReplayRecorder_defineProperty(this, "fetchCSSResource", function (url) {
      var self = _this;
      return new Promise(function (resolve, reject) {
        if (url) {
          var xhr = new XMLHttpRequest();

          xhr.onload = function () {
            var reader = new FileReader();

            reader.onloadend = function () {
              resolve(reader.result);
            };

            reader.onerror = function () {
              resolve();
            };

            reader.readAsDataURL(xhr.response);
          };

          xhr.onerror = function (err) {
            resolve();
          };

          xhr.open("GET", url);
          xhr.responseType = "blob";
          xhr.send();
        } else {
          resolve();
        }
      });
    });

    GleapReplayRecorder_defineProperty(this, "replaceAsync", function (str, regex, asyncFn) {
      return new Promise(function (resolve, reject) {
        var promises = [];
        str.replace(regex, function (match) {
          for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
            args[_key - 1] = arguments[_key];
          }

          var promise = asyncFn.apply(void 0, [match].concat(args));
          promises.push(promise);
        });
        Promise.all(promises).then(function (data) {
          resolve(str.replace(regex, function () {
            return data.shift();
          }));
        })["catch"](function () {
          reject();
        });
      });
    });

    GleapReplayRecorder_defineProperty(this, "validateStylesheetResources", function (data, url) {
      var basePath = url.substring(0, url.lastIndexOf("/"));
      var split = data.split(",");

      if (split.length !== 2) {
        return Promise.reject();
      }

      data = atob(split[1]);
      delete split[1];
      return _this.replaceAsync(data, /url\((.*?)\)/g, function (matchedData) {
        return new Promise(function (resolve, reject) {
          var matchedUrl = matchedData.substr(4, matchedData.length - 5).replaceAll("'", "").replaceAll('"', ""); // Remote file or data

          if (matchedUrl.indexOf("http") === 0 || matchedUrl.indexOf("//") === 0 || matchedUrl.indexOf("data") === 0) {
            return resolve(matchedData);
          }

          try {
            var resourcePath = matchedUrl;

            if (basePath) {
              resourcePath = basePath + "/" + matchedUrl;
            }

            return _this.fetchCSSResource(resourcePath).then(function (resourceData) {
              if (matchedUrl.indexOf("data:text/html") === 0) {
                return resolve(matchedData);
              }

              return resolve("url(" + resourceData + ")");
            });
          } catch (exp) {
            return resolve(matchedData);
          }
        });
      }).then(function (result) {
        return split[0] + "," + btoa(result);
      });
    });

    GleapReplayRecorder_defineProperty(this, "progressResource", function (data, src, resolve, reject) {
      if (data && data.indexOf("data:text/css") === 0) {
        _this.validateStylesheetResources(data, src).then(function (data) {
          _this.resourcesToResolve[src] = data;
          resolve();
        });
      } else if (data && (data.indexOf("data:image/jpeg") === 0 || data.indexOf("data:image/png") === 0)) {
        resizeImage(data, 500, 500).then(function (data) {
          _this.resourcesToResolve[src] = data;
          resolve();
        });
      } else {
        _this.resourcesToResolve[src] = data;
        resolve();
      }
    });

    GleapReplayRecorder_defineProperty(this, "fetchItemResource", function (src) {
      var self = _this;
      return new Promise(function (resolve, reject) {
        if (src) {
          var xhr = new XMLHttpRequest();

          xhr.onload = function () {
            var reader = new FileReader();

            reader.onloadend = function () {
              self.progressResource(reader.result, src, resolve, reject);
            };

            reader.onerror = function () {
              resolve();
            };

            reader.readAsDataURL(xhr.response);
          };

          xhr.onerror = function (err) {
            resolve();
          };

          var url = src;
          xhr.open("GET", url);
          xhr.responseType = "blob";
          xhr.send();
        } else {
          resolve();
        }
      });
    });

    this.initReplaySizeCheck();
  }

  GleapReplayRecorder_createClass(GleapReplayRecorder, [{
    key: "initReplaySizeCheck",
    value: function initReplaySizeCheck() {
      var _this2 = this;

      setInterval(function () {
        if (_this2.isFull()) {
          _this2.stop();

          _this2.start();
        }
      }, 1000);
    }
    /**
     * Start Replays
     * @returns 
     */

  }, {
    key: "start",
    value: function start() {
      if (!this.stopped) {
        return;
      }

      this.stopped = false;
      this.startDate = Date.now();
      this.node = document.documentElement;
      this.nextID = 1;
      this.actions = [];
      this.actionsSize = 0;
      this.lastActionTime = Date.now();
      this.observerCallback = this.callback.bind(this);
      this.resourcesToResolve = {};
      this.rootFrame = new GleapReplayRecFrame(window, this.node, this);
      this.evaluateFocus();
    }
    /**
     * Stop Replays
     * @returns 
     */

  }, {
    key: "stop",
    value: function stop() {
      this.stopped = true;

      if (!this.rootFrame) {
        this.rootFrame = null;
        return;
      }

      this.rootFrame.stop();
      this.rootFrame = null;
    }
    /**
     * Get the current replay data
     * @returns {Promise<void>}
     */

  }, {
    key: "getReplayData",
    value: function getReplayData() {
      var _this3 = this;

      if (!this.startDate) {
        return Promise.resolve(null);
      }

      var replayResult = {
        startDate: this.startDate,
        initialState: this.rootFrame.initialState,
        initialActions: this.rootFrame.initialActions,
        actions: this.actions,
        baseUrl: window.location.origin,
        width: window.innerWidth,
        height: window.innerHeight,
        resourcesToResolve: this.resourcesToResolve,
        isMobile: isMobile()
      };

      if (src_Gleap.getInstance().isLiveMode()) {
        return this.fetchImageResources().then(function () {
          return _this3.cleanupResources(replayResult);
        });
      } else {
        return this.cleanupResources(replayResult);
      }
    }
  }, {
    key: "isFull",
    value: function isFull() {
      if (this.actions && this.actionsSize > 10) {
        return true;
      }

      return false;
    }
  }, {
    key: "fetchImageResources",
    value: function fetchImageResources() {
      var resolvePromises = [];
      var resourceKeys = Object.keys(this.resourcesToResolve);

      for (var i = 0; i < resourceKeys.length; i++) {
        if (!isBlacklisted(resourceKeys[i])) {
          resolvePromises.push(this.fetchItemResource(resourceKeys[i]));
        }
      }

      return Promise.all(resolvePromises);
    }
  }, {
    key: "cleanupResources",
    value: function cleanupResources(replayResult) {
      var resourceKeys = Object.keys(this.resourcesToResolve);

      for (var i = 0; i < resourceKeys.length; i++) {
        if (this.resourcesToResolve[resourceKeys[i]] === "--") {
          delete this.resourcesToResolve[resourceKeys[i]];
        }
      }

      return Promise.resolve(JSON.parse(JSON.stringify(replayResult)));
    }
  }, {
    key: "evaluateFocus",
    value: function evaluateFocus() {
      this.rootFrame.flushObserver();
    }
  }, {
    key: "allowAttribute",
    value: function allowAttribute(e, name) {
      // eslint-disable-next-line default-case
      switch (name) {
        case "srcdoc":
          if (e.tagName === "IFRAME") {
            return false;
          }

          break;

        case "title":
          return false;
      }

      return true;
    }
  }, {
    key: "pushScrollAction",
    value: function pushScrollAction(id, element, actionsList) {
      var actions = actionsList ? actionsList : this.actions;
      var scrolledIntoView = element.elementScrolledIntoView;

      if (scrolledIntoView) {
        var a = {};

        if (scrolledIntoView.ReplayRecID) {
          var scrolledIntoViewOffset = "elementScrolledIntoViewOffset" in element ? element.elementScrolledIntoViewOffset : null;
          a[REPLAYREC_SCROLL] = [id, scrolledIntoView.ReplayRecID, scrolledIntoViewOffset];
        } else {
          if (scrolledIntoView !== "bottom") {
            throw new Error("Unknown scrolledIntoView: ".concat(scrolledIntoView));
          }

          a[REPLAYREC_SCROLL] = [id, scrolledIntoView];
        }

        actions.push(a);
      }
    }
  }, {
    key: "serializeNode",
    value: function serializeNode(node, actions) {
      if ("ReplayRecID" in node) {
        return null;
      }

      var id = this.nextID++;
      var obj = {
        id: id
      };
      node.ReplayRecID = id;

      switch (node.nodeType) {
        case Node.ELEMENT_NODE:
          {
            var tag = node.tagName;

            switch (tag) {
              case "INPUT":
              case "TEXTAREA":
                {
                  var a = {};
                  var val = node.value;

                  if (node.type && node.type === "password" && val && val.length) {
                    val = new Array(val.length + 1).join("*");
                  }

                  if (node.getAttribute("gleap-ignore") === "value") {
                    val = new Array(val.length + 1).join("*");
                  }

                  a[REPLAYREC_INPUT] = [id, val];
                  actions.push(a);
                  var listener = node.ownerDocument.ReplayRecInner.scrollListener;
                  node.addEventListener("scroll", listener, {
                    passive: true
                  });
                  break;
                }

              case "PRE":
              case "DIV":
                {
                  var _listener = node.ownerDocument.ReplayRecInner.scrollListener;
                  node.addEventListener("scroll", _listener, {
                    passive: true
                  });
                  break;
                }

              case "SCRIPT":
              case "LINK":
                delete node.ReplayRecID;
                var nodeRel = node.getAttribute("rel"); // Stylesheets

                if (node && node.href && (node.href.includes(".css") || nodeRel && nodeRel.includes("stylesheet"))) {
                  this.resourcesToResolve[node.getAttribute("href")] = "--";
                  break;
                } // HTML Imports


                if (nodeRel && nodeRel === "import") {
                  break;
                }

                return null;

              case "CANVAS":
                {
                  var _a = {};
                  _a[REPLAYREC_CANVAS_DATA] = [id, node.toDataURL()];
                  actions.push(_a);
                  break;
                }
            }

            obj[""] = tag;
            var attrs = {};
            var hasAttr = false;

            var _iterator = _createForOfIteratorHelper(node.attributes),
                _step;

            try {
              for (_iterator.s(); !(_step = _iterator.n()).done;) {
                var _a2 = _step.value;
                var name = _a2.name;

                if (this.allowAttribute(node, name)) {
                  attrs[name] = _a2.value;
                  hasAttr = true;
                }
              }
            } catch (err) {
              _iterator.e(err);
            } finally {
              _iterator.f();
            }

            if (hasAttr) {
              obj.a = attrs;

              if (obj.a && obj.a.src && tag !== "SOURCE" && tag !== "IFRAME") {
                this.optionallyAddAttribute("src", obj.a.src);
              }
            }

            var children = [];

            var _iterator2 = _createForOfIteratorHelper(node.childNodes),
                _step2;

            try {
              for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
                var c = _step2.value;
                var serialized = this.serializeNode(c, actions);

                if (serialized) {
                  children.push(serialized);
                }
              }
            } catch (err) {
              _iterator2.e(err);
            } finally {
              _iterator2.f();
            }

            if (children.length > 0) {
              obj.c = children;
            }

            if (node.scrollLeft || node.scrollTop) {
              this.pushScrollAction(id, node, actions);
            }

            break;
          }

        case Node.TEXT_NODE:
        case Node.CDATA_SECTION_NODE:
          {
            // Check if it's a child of a style node.
            var parentNode = node.parentNode;

            if (node.parentNode && parentNode.tagName && parentNode.tagName === "STYLE" && parentNode.ownerDocument) {
              var styleSheets = parentNode.ownerDocument.styleSheets;

              if (styleSheets) {
                for (var i = 0; i < styleSheets.length; i++) {
                  var styleSheet = styleSheets[i];

                  if (styleSheet.ownerNode && styleSheet.ownerNode.ReplayRecID && parentNode.ReplayRecID === styleSheet.ownerNode.ReplayRecID) {
                    var cssRules = null;

                    if (styleSheet.cssRules) {
                      cssRules = styleSheet.cssRules;
                    } else if (styleSheet.rules) {
                      cssRules = styleSheet.rules;
                    }

                    if (cssRules) {
                      var cssTextContent = "";

                      for (var cssRuleItem in cssRules) {
                        if (cssRules[cssRuleItem].cssText) {
                          cssTextContent += cssRules[cssRuleItem].cssText;
                        }
                      }

                      obj.d = cssTextContent;
                    }
                  }
                }
              }
            } // Simply pass the data of the text.


            var data = node.data;

            if (data.length > 0 && !obj.d) {
              obj.d = data;
            }

            break;
          }

        case Node.PROCESSING_INSTRUCTION_NODE:
        case Node.COMMENT_NODE:
          break;

        default:
          delete node.ReplayRecID;
          throw new Error("Bad node ".concat(node));
      }

      return obj;
    }
  }, {
    key: "delay",
    value: function delay(seconds) {
      this.lastActionTime -= seconds * 1000;
    }
  }, {
    key: "deleteAllReplayRecIDs",
    value: function deleteAllReplayRecIDs(e) {
      delete e.ReplayRecID;
      var listener = e.ownerDocument.ReplayRecInner.scrollListener;
      e.removeEventListener("scroll", listener, {
        passive: true
      });

      for (var c = e.firstChild; c; c = c.nextSibling) {
        if (c.ReplayRecID) {
          this.deleteAllReplayRecIDs(c);
        }
      }
    }
  }, {
    key: "optionallyAddAttribute",
    value: function optionallyAddAttribute(name, value) {
      if (name === "src" && value) {
        var url = value;

        if (url.indexOf("data") !== 0) {
          this.resourcesToResolve[url] = "--";
        }
      }
    }
  }, {
    key: "appendAction",
    value: function appendAction(action) {
      this.actions.push(action);
      var self = this;
      setTimeout(function () {
        self.actionsSize += gleapRoughSizeOfObject(action);
      }, 0);
    }
  }, {
    key: "callback",
    value: function callback(records, // eslint-disable-next-line @typescript-eslint/no-unused-vars
    observer) {
      var now = Date.now();

      if (now > this.lastActionTime) {
        var a = {};
        a[REPLAYREC_DELAY] = now - this.lastActionTime;
        this.appendAction(a);
      }

      this.lastActionTime = Date.now();

      try {
        var _iterator3 = _createForOfIteratorHelper(records),
            _step3;

        try {
          for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
            var r = _step3.value;

            if (r.target.ReplayRecID && r.type === "childList") {
              var _iterator5 = _createForOfIteratorHelper(r.removedNodes),
                  _step5;

              try {
                for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
                  var child = _step5.value;
                  var childID = child.ReplayRecID;

                  if (!childID) {
                    continue;
                  }

                  var _a4 = {};
                  _a4[REPLAYREC_REMOVE] = childID;
                  this.appendAction(_a4);
                  this.deleteAllReplayRecIDs(child);
                }
              } catch (err) {
                _iterator5.e(err);
              } finally {
                _iterator5.f();
              }
            }
          }
        } catch (err) {
          _iterator3.e(err);
        } finally {
          _iterator3.f();
        }

        var nodesWithAddedChildren = [];

        var _iterator4 = _createForOfIteratorHelper(records),
            _step4;

        try {
          for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
            var _r = _step4.value;
            var target = _r.target;
            var id = target.ReplayRecID;

            if (!id) {
              continue;
            } // eslint-disable-next-line default-case


            switch (_r.type) {
              case "attributes":
                {
                  var attributeName = _r.attributeName;

                  if (this.allowAttribute(target, attributeName)) {
                    var _a5 = {};
                    _a5[REPLAYREC_ATTR] = [id, attributeName, target.getAttribute(attributeName)];

                    if (target.tagName !== "SOURCE") {
                      this.optionallyAddAttribute(attributeName, target.getAttribute(attributeName));
                    }

                    this.appendAction(_a5);
                  }

                  break;
                }

              case "characterData":
                {
                  var _a6 = {};

                  if (target.nodeType === Node.TEXT_NODE) {
                    _a6[REPLAYREC_TEXT] = [id, target.data];
                  }

                  this.appendAction(_a6);
                  break;
                }

              case "childList":
                {
                  if (_r.addedNodes.length > 0 && !target.ReplayRecNodesAdded) {
                    target.ReplayRecNodesAdded = true;
                    nodesWithAddedChildren.push(target);
                  }
                }
            }
          }
        } catch (err) {
          _iterator4.e(err);
        } finally {
          _iterator4.f();
        }

        for (var _i = 0, _nodesWithAddedChildr = nodesWithAddedChildren; _i < _nodesWithAddedChildr.length; _i++) {
          var node = _nodesWithAddedChildr[_i];
          delete node.ReplayRecNodesAdded;

          for (var c = node.lastChild; c; c = c.previousSibling) {
            if (c.ReplayRecID) {
              continue;
            }

            var _a3 = {};
            var actions = [];
            var serializedNode = this.serializeNode(c, actions);

            if (!serializedNode) {
              continue;
            }

            var nextSibling = c.nextSibling;
            _a3[REPLAYREC_ADD] = [node.ReplayRecID, nextSibling ? nextSibling.ReplayRecID : null, serializedNode, actions];
            this.appendAction(_a3);
          }
        }
      } catch (ex) {
        throw ex;
      }
    }
  }], [{
    key: "getInstance",
    value: // GleapReplayRecorder singleton
    function getInstance() {
      if (!this.instance) {
        this.instance = new GleapReplayRecorder();
        return this.instance;
      } else {
        return this.instance;
      }
    }
  }]);

  return GleapReplayRecorder;
}();

GleapReplayRecorder_defineProperty(GleapReplayRecorder, "instance", void 0);


;// CONCATENATED MODULE: ./src/ScreenDrawer.js
function ScreenDrawer_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function ScreenDrawer_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function ScreenDrawer_createClass(Constructor, protoProps, staticProps) { if (protoProps) ScreenDrawer_defineProperties(Constructor.prototype, protoProps); if (staticProps) ScreenDrawer_defineProperties(Constructor, staticProps); return Constructor; }

function ScreenDrawer_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var ScreenDrawer = /*#__PURE__*/function () {
  function ScreenDrawer(rerender) {
    var _this = this;

    ScreenDrawer_classCallCheck(this, ScreenDrawer);

    ScreenDrawer_defineProperty(this, "rerender", void 0);

    ScreenDrawer_defineProperty(this, "svgElement", null);

    ScreenDrawer_defineProperty(this, "path", null);

    ScreenDrawer_defineProperty(this, "strPath", void 0);

    ScreenDrawer_defineProperty(this, "strokeWidth", 12);

    ScreenDrawer_defineProperty(this, "strokeWidthRect", 6);

    ScreenDrawer_defineProperty(this, "bufferSize", 4);

    ScreenDrawer_defineProperty(this, "buffer", []);

    ScreenDrawer_defineProperty(this, "startPoint", null);

    ScreenDrawer_defineProperty(this, "tool", "rect");

    ScreenDrawer_defineProperty(this, "color", "#EB144C");

    ScreenDrawer_defineProperty(this, "mouseDown", null);

    ScreenDrawer_defineProperty(this, "mouseMove", null);

    ScreenDrawer_defineProperty(this, "mouseUp", null);

    ScreenDrawer_defineProperty(this, "resizeListener", null);

    ScreenDrawer_defineProperty(this, "pathBuffer", []);

    var self = this;
    this.rerender = rerender;
    this.svgElement = document.querySelector(".bb-capture-svg");
    this.svgElement.style.minHeight = "".concat(document.documentElement.scrollHeight, "px"); // Window resize listener.

    this.resizeListener = function (e) {
      self.svgElement.style.minHeight = "".concat(document.documentElement.scrollHeight, "px");
    };

    window.addEventListener("resize", this.resizeListener, true);

    this.mouseDown = function (e) {
      e.preventDefault();
      var colorpicker = document.querySelector(".bb-capture-toolbar-item-colorpicker");

      if (colorpicker) {
        colorpicker.style.display = "none";
      }

      self.fadeOutToolbar();

      if (self.tool === "pen" || self.tool === "blur") {
        self.mouseDownPen(e);
      }

      if (self.tool === "rect") {
        self.mouseDownRect(e);
      }
    };

    this.mouseMove = function (e) {
      e.preventDefault();

      if (self.tool === "pen" || self.tool === "blur") {
        self.mouseMovePen(e);
      }

      if (self.tool === "rect") {
        self.mouseMoveRect(e);
      }
    };

    this.mouseUp = function (e) {
      e.preventDefault();
      self.fadeInToolbar();

      if (self.tool === "pen" || self.tool === "blur") {
        self.mouseUpPen(e);
      }

      if (self.tool === "rect") {
        self.mouseUpRect(e);
      }
    };

    this.svgElement.addEventListener("mousedown", this.mouseDown);
    this.svgElement.addEventListener("mousemove", this.mouseMove);
    this.svgElement.addEventListener("mouseup", this.mouseUp);
    this.svgElement.addEventListener("touchstart", this.mouseDown, false);
    this.svgElement.addEventListener("touchmove", this.mouseMove, false);
    this.svgElement.addEventListener("touchend", this.mouseUp, false);
    setTimeout(function () {
      _this.rerender();
    }, 100);
  }

  ScreenDrawer_createClass(ScreenDrawer, [{
    key: "clear",
    value: function clear() {
      if (this.svgElement) {
        while (this.svgElement.firstChild) {
          this.svgElement.firstChild.remove();
        }
      }
    }
  }, {
    key: "destroy",
    value: function destroy() {
      this.svgElement.removeEventListener("mousedown", this.mouseDown);
      this.svgElement.removeEventListener("mousemove", this.mouseMove);
      this.svgElement.removeEventListener("mouseup", this.mouseUp);
      this.svgElement.removeEventListener("touchstart", this.mouseDown);
      this.svgElement.removeEventListener("touchmove", this.mouseMove);
      this.svgElement.removeEventListener("touchend", this.mouseUp);
      window.removeEventListener("resize", this.resizeListener);
    }
  }, {
    key: "mouseUpPen",
    value: function mouseUpPen() {
      if (this.path) {
        this.path = null;
      }
    }
  }, {
    key: "mouseUpRect",
    value: function mouseUpRect() {
      if (this.path) {
        this.path = null;
      }
    }
  }, {
    key: "mouseMovePen",
    value: function mouseMovePen(e) {
      if (this.path) {
        this.appendToBuffer(this.getMousePosition(e));
        this.updateSvgPath();
      }
    }
  }, {
    key: "mouseMoveRect",
    value: function mouseMoveRect(e) {
      if (this.path) {
        var p = this.getMousePosition(e);
        var w = Math.abs(p.x - this.startPoint.x);
        var h = Math.abs(p.y - this.startPoint.y);
        var x = p.x;
        var y = p.y;

        if (p.x > this.startPoint.x) {
          x = this.startPoint.x;
        }

        if (p.y > this.startPoint.y) {
          y = this.startPoint.y;
        }

        this.path.setAttributeNS(null, "x", x);
        this.path.setAttributeNS(null, "y", y);
        this.path.setAttributeNS(null, "width", w);
        this.path.setAttributeNS(null, "height", h);
      }
    }
  }, {
    key: "mouseDownRect",
    value: function mouseDownRect(e) {
      this.path = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      this.path.setAttribute("fill", "none");
      this.path.setAttribute("stroke", this.color);
      this.path.setAttribute("stroke-linecap", "round");
      this.path.setAttribute("stroke-width", this.strokeWidthRect);
      this.startPoint = this.getMousePosition(e);
      this.appendPathToSvg(this.path);
    }
  }, {
    key: "mouseDownPen",
    value: function mouseDownPen(e) {
      var color = this.color + "AA";
      var strokeWidth = this.strokeWidth;

      if (this.tool === "blur") {
        color = "#000000";
        strokeWidth = 40;
      }

      this.path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      this.path.setAttribute("fill", "none");
      this.path.setAttribute("stroke", color);
      this.path.setAttribute("stroke-linecap", "round");
      this.path.setAttribute("stroke-width", strokeWidth);
      this.buffer = [];
      var pt = this.getMousePosition(e);
      this.appendToBuffer(pt);
      this.strPath = "M" + pt.x + " " + pt.y;
      this.path.setAttribute("d", this.strPath);
      this.appendPathToSvg(this.path);
    }
  }, {
    key: "setTool",
    value: function setTool(tool) {
      this.tool = tool;
    }
  }, {
    key: "setColor",
    value: function setColor(color) {
      this.color = color;
    }
  }, {
    key: "getMousePosition",
    value: function getMousePosition(e) {
      if (e.touches && e.touches.length > 0) {
        return {
          x: e.touches[0].pageX,
          y: e.touches[0].pageY
        };
      }

      return {
        x: e.pageX,
        y: e.pageY
      };
    } // Calculate the average point, starting at offset in the buffer

  }, {
    key: "getAveragePoint",
    value: function getAveragePoint(offset) {
      var len = this.buffer.length;

      if (len % 2 === 1 || len >= this.bufferSize) {
        var totalX = 0;
        var totalY = 0;
        var pt, i;
        var count = 0;

        for (i = offset; i < len; i++) {
          count++;
          pt = this.buffer[i];
          totalX += pt.x;
          totalY += pt.y;
        }

        return {
          x: totalX / count,
          y: totalY / count
        };
      }

      return null;
    }
  }, {
    key: "updateSvgPath",
    value: function updateSvgPath() {
      var pt = this.getAveragePoint(0);

      if (pt) {
        // Get the smoothed part of the path that will not change
        this.strPath += " L" + pt.x + " " + pt.y; // Get the last part of the path (close to the current mouse position)
        // This part will change if the mouse moves again

        var tmpPath = "";

        for (var offset = 2; offset < this.buffer.length; offset += 2) {
          pt = this.getAveragePoint(offset);
          tmpPath += " L" + pt.x + " " + pt.y;
        } // Set the complete current path coordinates


        this.path.setAttribute("d", this.strPath + tmpPath);
      }
    }
  }, {
    key: "appendToBuffer",
    value: function appendToBuffer(pt) {
      this.buffer.push(pt);

      while (this.buffer.length > this.bufferSize) {
        this.buffer.shift();
      }
    }
  }, {
    key: "appendPathToSvg",
    value: function appendPathToSvg(path) {
      this.svgElement.appendChild(path);
      this.pathBuffer.push(path);
      this.rerender();
    }
  }, {
    key: "removeLastAddedPathFromSvg",
    value: function removeLastAddedPathFromSvg() {
      if (this.pathBuffer.length <= 0 || !this.svgElement) {
        return;
      }

      this.svgElement.removeChild(this.pathBuffer[this.pathBuffer.length - 1]);
      this.pathBuffer.pop();
      this.rerender();
    }
  }, {
    key: "fadeOutToolbar",
    value: function fadeOutToolbar() {
      var fadeTarget = document.querySelector(".bb-capture-toolbar");

      if (fadeTarget) {
        fadeTarget.style.opacity = 0;
        fadeTarget.style.pointerEvents = "none";
      }
    }
  }, {
    key: "fadeInToolbar",
    value: function fadeInToolbar() {
      var fadeTarget = document.querySelector(".bb-capture-toolbar");

      if (fadeTarget) {
        fadeTarget.style.opacity = 1;
        fadeTarget.style.pointerEvents = "auto";
      }
    }
  }]);

  return ScreenDrawer;
}();
;// CONCATENATED MODULE: ./src/GleapScrollStopper.js
function GleapScrollStopper_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function GleapScrollStopper_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function GleapScrollStopper_createClass(Constructor, protoProps, staticProps) { if (protoProps) GleapScrollStopper_defineProperties(Constructor.prototype, protoProps); if (staticProps) GleapScrollStopper_defineProperties(Constructor, staticProps); return Constructor; }

function GleapScrollStopper_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var GleapScrollStopper = /*#__PURE__*/function () {
  function GleapScrollStopper() {
    GleapScrollStopper_classCallCheck(this, GleapScrollStopper);

    GleapScrollStopper_defineProperty(this, "keys", {
      37: 1,
      38: 1,
      39: 1,
      40: 1
    });

    GleapScrollStopper_defineProperty(this, "supportsPassive", false);

    GleapScrollStopper_defineProperty(this, "wheelOpt", this.supportsPassive ? {
      passive: false
    } : false);

    GleapScrollStopper_defineProperty(this, "wheelEvent", "onwheel" in document.createElement("div") ? "wheel" : "mousewheel");

    GleapScrollStopper_defineProperty(this, "scrollDisabled", false);

    var self = this;

    try {
      window.addEventListener("test", null, Object.defineProperty({}, "passive", {
        get: function get() {
          self.supportsPassive = true;
          self.wheelOpt = self.supportsPassive ? {
            passive: false
          } : false;
        }
      }));
    } catch (e) {}
  }

  GleapScrollStopper_createClass(GleapScrollStopper, [{
    key: "preventDefault",
    value: function preventDefault(e) {
      e.preventDefault();
    }
  }, {
    key: "preventDefaultForScrollKeys",
    value: function preventDefaultForScrollKeys(e) {
      if (this.keys && this.keys[e.keyCode]) {
        this.preventDefault(e);
        return false;
      }
    }
  }], [{
    key: "getInstance",
    value: // GleapScrollStopper singleton
    function getInstance() {
      if (!this.instance) {
        this.instance = new GleapScrollStopper();
        return this.instance;
      } else {
        return this.instance;
      }
    }
  }, {
    key: "disableScroll",
    value: function disableScroll() {
      var instance = this.getInstance();

      if (instance.scrollDisabled) {
        return;
      }

      instance.scrollDisabled = true;
      window.addEventListener("DOMMouseScroll", instance.preventDefault, false); // older FF

      window.addEventListener(instance.wheelEvent, instance.preventDefault, instance.wheelOpt); // modern desktop

      window.addEventListener("touchmove", instance.preventDefault, instance.wheelOpt); // mobile

      window.addEventListener("keydown", instance.preventDefaultForScrollKeys, false);
    }
  }, {
    key: "enableScroll",
    value: function enableScroll() {
      var instance = this.getInstance();

      if (!instance.scrollDisabled) {
        return;
      }

      instance.scrollDisabled = false;
      window.removeEventListener("DOMMouseScroll", instance.preventDefault, false);
      window.removeEventListener(instance.wheelEvent, instance.preventDefault, instance.wheelOpt);
      window.removeEventListener("touchmove", instance.preventDefault, instance.wheelOpt);
      window.removeEventListener("keydown", instance.preventDefaultForScrollKeys, false);
    }
  }]);

  return GleapScrollStopper;
}();

GleapScrollStopper_defineProperty(GleapScrollStopper, "instance", void 0);
;// CONCATENATED MODULE: ./src/GleapMarkerManager.js
function GleapMarkerManager_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function GleapMarkerManager_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function GleapMarkerManager_createClass(Constructor, protoProps, staticProps) { if (protoProps) GleapMarkerManager_defineProperties(Constructor.prototype, protoProps); if (staticProps) GleapMarkerManager_defineProperties(Constructor, staticProps); return Constructor; }

function GleapMarkerManager_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }







var GleapMarkerManager = /*#__PURE__*/function () {
  function GleapMarkerManager(type) {
    GleapMarkerManager_classCallCheck(this, GleapMarkerManager);

    GleapMarkerManager_defineProperty(this, "type", "screenshot");

    GleapMarkerManager_defineProperty(this, "dragCursor", null);

    GleapMarkerManager_defineProperty(this, "screenRecorder", null);

    GleapMarkerManager_defineProperty(this, "callback", null);

    GleapMarkerManager_defineProperty(this, "screenDrawer", null);

    GleapMarkerManager_defineProperty(this, "escListener", null);

    GleapMarkerManager_defineProperty(this, "pageLeaveListener", null);

    GleapMarkerManager_defineProperty(this, "overrideLanguage", src_Gleap.getInstance().overrideLanguage);

    GleapMarkerManager_defineProperty(this, "showNextStep", function () {
      // Adapt the UI
      this.showWidgetUI();

      if (this.callback) {
        GleapFrameManager.getInstance().sendMessage({
          name: "set-form-data",
          data: {
            formKey: "capture",
            data: {
              value: this.type,
              dirty: true
            }
          }
        });
        this.callback(true);
      }
    });

    this.type = type;
  }

  GleapMarkerManager_createClass(GleapMarkerManager, [{
    key: "hideWidgetUI",
    value: function hideWidgetUI() {
      var feedbackButton = document.querySelector(".bb-feedback-button");

      if (feedbackButton) {
        feedbackButton.style.display = "none";
      }

      var dialogUI = document.querySelector(".bb-feedback-dialog-container");

      if (dialogUI) {
        dialogUI.style.display = "none";
      }
    }
  }, {
    key: "showWidgetUI",
    value: function showWidgetUI() {
      if (this.type === "screenshot") {
        GleapScrollStopper.enableScroll();
      } // Stop screenrecording.


      if (this.screenRecorder) {
        this.screenRecorder.stopScreenRecording();
      } // Unregister ESC listener


      this.unregisterListeners(); // Cleanup mouse pointer

      this.cleanupMousePointer();

      if (this.screenDrawer) {
        this.screenDrawer.destroy();
      } // Remove the toolbar UI


      var dialog = document.querySelector(".bb-capture-toolbar");

      if (dialog) {
        dialog.remove();
      } // Capture SVG ref


      var captureSVG = document.querySelector(".bb-capture-svg");

      if (captureSVG) {
        captureSVG.classList.add("bb-capture-svg--preview");
      } // Remove the preview UI


      var videoPreviewContainer = document.querySelector(".bb-capture-preview");

      if (videoPreviewContainer) {
        videoPreviewContainer.remove();
      } // Feedback button


      var feedbackButton = document.querySelector(".bb-feedback-button");

      if (feedbackButton) {
        feedbackButton.style.display = "flex";
      } // Feedback dialog container


      var dialogUI = document.querySelector(".bb-feedback-dialog-container");

      if (dialogUI) {
        dialogUI.style.display = "block";
      } // Dismiss button


      var dismissUI = document.querySelector(".bb-capture-dismiss");

      if (dismissUI) {
        dismissUI.style.display = "none";
      } // Hide the color picker


      var colorPicker = document.querySelector(".bb-capture-toolbar-item-colorpicker");

      if (colorPicker) {
        colorPicker.style.display = "none";
      } // Border layer


      var borderLayer = document.querySelector(".bb-capture-editor-borderlayer");

      if (borderLayer) {
        borderLayer.style.display = "none";
      }
    }
  }, {
    key: "clear",
    value: function clear() {
      var captureEditor = document.querySelector(".bb-capture-editor");

      if (captureEditor) {
        captureEditor.remove();
      }
    }
  }, {
    key: "setMouseMove",
    value: function setMouseMove(x, y) {
      if (!this.dragCursor) {
        return;
      }

      this.dragCursor.style.left = "".concat(x + 6, "px");
      this.dragCursor.style.top = "".concat(y - 26, "px");
      this.dragCursor.style.right = null;
    }
  }, {
    key: "mouseMoveEventHandler",
    value: function mouseMoveEventHandler(e) {
      var x = e.pageX - document.documentElement.scrollLeft;
      var y = e.pageY - document.documentElement.scrollTop;
      this.setMouseMove(x, y);
    }
  }, {
    key: "touchMoveEventHandler",
    value: function touchMoveEventHandler(e) {
      var x = e.touches[0].pageX - document.documentElement.scrollLeft;
      var y = e.touches[0].pageY - document.documentElement.scrollTop;
      this.setMouseMove(x, y);
    }
  }, {
    key: "setupMousePointer",
    value: function setupMousePointer() {
      var self = this;
      this.dragCursor = document.querySelector(".bb-capture-editor-drag-info");
      var captureSVG = document.querySelector(".bb-capture-svg");
      captureSVG.addEventListener("mouseenter", function (e) {
        self.dragCursor.style.opacity = 1;
      });
      captureSVG.addEventListener("mouseleave", function (e) {
        self.dragCursor.style.opacity = 0;
      });
      document.documentElement.addEventListener("mousemove", this.mouseMoveEventHandler.bind(this));
      document.documentElement.addEventListener("touchmove", this.touchMoveEventHandler.bind(this));
    }
  }, {
    key: "cleanupMousePointer",
    value: function cleanupMousePointer() {
      document.documentElement.removeEventListener("mousemove", this.mouseMoveEventHandler);
      document.documentElement.removeEventListener("touchmove", this.touchMoveEventHandler);

      if (this.dragCursor) {
        this.dragCursor.remove();
      }
    }
  }, {
    key: "createEditorUI",
    value: function createEditorUI() {
      // Add HTML for drawing and recording
      var bugReportingEditor = document.createElement("div");
      bugReportingEditor.className = "bb-capture-editor";
      bugReportingEditor.innerHTML = "\n          <div class=\"bb-capture-editor-borderlayer\"></div>\n          <svg class=\"bb-capture-svg\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" version=\"1.1\" xml:space=\"preserve\"></svg>\n          <div class=\"bb-capture-dismiss\">".concat(loadIcon("dismiss"), "</div>\n          <div class='bb-capture-editor-drag-info'>").concat(loadIcon("rect"), "</div>\n          <div class=\"bb-capture-toolbar\">\n            ").concat(this.type === "capture" ? "<div class=\"bb-capture-toolbar-item bb-capture-item-rec bb-capture-toolbar-item-recording\" data-type=\"recording\">\n                  ".concat(loadIcon("recorderon"), "\n                  ").concat(loadIcon("recorderoff"), "\n                  <span class=\"bb-tooltip bb-tooltip-screen-recording\"></span>\n                </div>\n                <div class=\"bb-capture-toolbar-item bb-capture-item-rec\" data-type=\"mic\">\n                  ").concat(loadIcon("mic"), "\n                  <span class=\"bb-tooltip bb-tooltip-audio-recording\"></span>\n                </div>\n                <div class=\"bb-capture-toolbar-item-timer bb-capture-item-rec\">2:00</div>\n                <div class=\"bb-capture-toolbar-item-spacer\"></div>\n                <div class=\"bb-capture-toolbar-item bb-capture-toolbar-drawingitem bb-capture-toolbar-item-tool\" data-type=\"pointer\">\n                  ").concat(loadIcon("pointer"), "\n                </div>") : "", "\n            <div class=\"bb-capture-toolbar-item bb-capture-toolbar-drawingitem bb-capture-toolbar-item-tool bb-capture-toolbar-item--active\" data-type=\"rect\">\n              ").concat(loadIcon("rect"), "\n            </div>\n            <div class=\"bb-capture-toolbar-item bb-capture-toolbar-drawingitem bb-capture-toolbar-item-tool\" data-type=\"pen\">\n              ").concat(loadIcon("pen"), "\n            </div>\n            <div class=\"bb-capture-toolbar-item bb-capture-toolbar-drawingitem bb-capture-toolbar-item-tool\" data-type=\"blur\">\n              ").concat(loadIcon("blur"), "\n            </div>\n            <div class=\"bb-capture-toolbar-item bb-capture-toolbar-drawingitem\" data-type=\"colorpicker\">\n              <div class=\"bb-capture-toolbar-item-selectedcolor\"></div>\n              <span class=\"bb-tooltip\">").concat(GleapTranslationManager.translateText("Pick a color"), "</span>\n            </div>\n            <div class=\"bb-capture-toolbar-item bb-capture-toolbar-drawingitem bb-capture-toolbar-item-tool\" data-type=\"undo\">\n              ").concat(loadIcon("undo"), "\n              <span class=\"bb-tooltip\">").concat(GleapTranslationManager.translateText("Undo"), "</span>\n            </div>\n            ").concat(this.type !== "capture" ? "<div class=\"bb-capture-button-next\">".concat(GleapTranslationManager.translateText("Next"), "</div>") : "", "\n          </div>\n          <div class=\"bb-capture-toolbar-item-colorpicker\">\n            <div class=\"bb-capture-toolbar-item-color\" data-color=\"#EB144C\"></div>\n            <div class=\"bb-capture-toolbar-item-color\" data-color=\"#FF6705\"></div>\n            <div class=\"bb-capture-toolbar-item-color\" data-color=\"#FDB903\"></div>\n            <div class=\"bb-capture-toolbar-item-color\" data-color=\"#9900EE\"></div>\n            <div class=\"bb-capture-toolbar-item-color\" data-color=\"#00D082\"></div>\n            <div class=\"bb-capture-toolbar-item-color\" data-color=\"#0A93E4\"></div>\n            <div class=\"bb-capture-toolbar-item-color\" data-color=\"#CCCCCC\"></div>\n          </div>\n          <div class=\"bb-capture-preview\">\n            <div class=\"bb-capture-preview-inner\">\n              <video controls muted autoplay></video>\n              <div class=\"bb-capture-preview-buttons\">\n                <div class=\"bb-capture-preview-retrybutton\">").concat(GleapTranslationManager.translateText("Retry"), "</div>\n                <div class=\"bb-capture-preview-sendbutton\">").concat(GleapTranslationManager.translateText("Next"), "</div>\n              </div>\n            </div>\n          </div>\n        ");
      document.body.appendChild(bugReportingEditor); // Set RTL layout

      bugReportingEditor.setAttribute("dir", GleapTranslationManager.getInstance().isRTLLayout ? "rtl" : "ltr");
    }
  }, {
    key: "unregisterListeners",
    value: function unregisterListeners() {
      if (this.escListener) {
        document.removeEventListener("keydown", this.escListener);
      }

      if (this.pageLeaveListener) {
        window.removeEventListener("beforeunload", this.pageLeaveListener);
      }
    }
  }, {
    key: "registerListeners",
    value: function registerListeners() {
      var self = this; // Esc listener

      this.escListener = function (evt) {
        evt = evt || window.event;
        var isEscape = false;
        var isEnter = false;

        if ("key" in evt) {
          isEscape = evt.key === "Escape";
          isEnter = evt.key === "Enter";
        }

        if (isEscape) {
          self.dismiss();
        }

        if (self.type === "screenshot" && isEnter) {
          self.showNextStep();
        }
      };

      document.addEventListener("keydown", this.escListener); // Page leave listener

      this.pageLeaveListener = function (event) {
        event.preventDefault();
        event.returnValue = "";
      };

      window.addEventListener("beforeunload", this.pageLeaveListener);
    }
  }, {
    key: "show",
    value: function show(callback) {
      this.callback = callback;
      var self = this; // Register for listeners

      this.registerListeners(); // Hide widget UI

      this.hideWidgetUI(); // Create the editor UI

      this.createEditorUI(); // Setup the mouse pointer

      this.setupMousePointer(); // Setup screenshot data

      if (this.type === "screenshot") {
        // Overwrite snapshot position
        src_Gleap.getInstance().setGlobalDataItem("snapshotPosition", {
          x: window.scrollX,
          y: window.scrollY
        }); // Disable scroll

        GleapScrollStopper.disableScroll();
      } else {
        // Setup screen recording
        this.setupScreenRecording();
      } // Hook up the drawing.


      this.screenDrawer = new ScreenDrawer(this.captureScreenDrawerRerender.bind(this));
      this.setupColorPicker();
      this.setupToolbar();
    }
  }, {
    key: "setupColorPicker",
    value: function setupColorPicker() {
      var self = this;
      var selectedColor = document.querySelector(".bb-capture-toolbar-item-selectedcolor");
      var colorItems = document.querySelectorAll(".bb-capture-toolbar-item-color");
      var colorpicker = document.querySelector(".bb-capture-toolbar-item-colorpicker");

      var _loop = function _loop() {
        var colorItem = colorItems[i];
        var hexColor = colorItem.getAttribute("data-color");
        colorItem.style.backgroundColor = hexColor;

        colorItem.onclick = function () {
          if (colorItem) {
            self.screenDrawer.setColor(hexColor);

            if (colorpicker) {
              colorpicker.style.display = "none";
            }

            selectedColor.style.backgroundColor = colorItem.style.backgroundColor;
            GleapMarkerManager.setPenColor(hexColor);
          }
        };
      };

      for (var i = 0; i < colorItems.length; i++) {
        _loop();
      }
    }
  }, {
    key: "dismiss",
    value: function dismiss() {
      this.showWidgetUI();

      if (this.callback) {
        this.callback(false);
      }
    }
  }, {
    key: "setupToolbar",
    value: function setupToolbar() {
      var self = this; // Hook up dismiss button

      var dismissButton = document.querySelector(".bb-capture-dismiss");

      dismissButton.onclick = function () {
        self.dismiss();
      }; // Hook up send button


      var nextButton = document.querySelector(".bb-capture-button-next");

      if (nextButton) {
        nextButton.onclick = this.showNextStep.bind(this);
      }

      var colorpicker = document.querySelector(".bb-capture-toolbar-item-colorpicker"); // Capture SVG ref

      var captureSVG = document.querySelector(".bb-capture-svg"); // Setup toolbar items

      var toolbarItems = document.querySelectorAll(".bb-capture-toolbar-item");

      var _loop2 = function _loop2() {
        var toolbarItem = toolbarItems[i];

        toolbarItem.onclick = function () {
          var type = toolbarItem.getAttribute("data-type");

          if (colorpicker && type !== "colorpicker") {
            colorpicker.style.display = "none";
          } // Mic & recording buttons


          if (type === "mic") {
            self.screenRecorder.toggleAudio();
          }

          if (type === "recording") {
            if (self.screenRecorder.isRecording) {
              self.screenRecorder.stopScreenRecording();
            } else {
              self.screenRecorder.startScreenRecording();
            }
          } // Marker buttons


          if (self.type === "capture" && !self.screenRecorder.isRecording) {
            // Inactivate buttons.
            return;
          }

          if (type === "pen" || type === "blur" || type === "rect" || type === "pointer") {
            var toolbarTools = document.querySelectorAll(".bb-capture-toolbar-item-tool");

            for (var j = 0; j < toolbarTools.length; j++) {
              toolbarTools[j].classList.remove("bb-capture-toolbar-item--active");
            }

            toolbarItem.classList.add("bb-capture-toolbar-item--active");
            self.screenDrawer.setTool(type);
            self.dragCursor.innerHTML = "";

            if (type === "pointer") {
              captureSVG.style.pointerEvents = "none";
            } else {
              captureSVG.style.pointerEvents = "auto";

              try {
                var svgClone = toolbarItem.querySelector("svg").cloneNode(true);

                if (svgClone && self.dragCursor) {
                  self.dragCursor.appendChild(svgClone);
                }
              } catch (exp) {}
            }
          }

          if (type === "colorpicker") {
            if (colorpicker.style.display === "flex") {
              colorpicker.style.display = "none";
            } else {
              colorpicker.style.display = "flex";
            }
          }

          if (type === "undo") {
            self.screenDrawer.removeLastAddedPathFromSvg();
          }
        };
      };

      for (var i = 0; i < toolbarItems.length; i++) {
        _loop2();
      }
    }
  }, {
    key: "captureScreenDrawerRerender",
    value: function captureScreenDrawerRerender() {
      if (!this.screenDrawer) {
        return;
      }

      var itemInactiveClass = "bb-capture-editor-item-inactive";
      var toolbarItems = document.querySelectorAll(".bb-capture-toolbar-item");

      for (var i = 0; i < toolbarItems.length; i++) {
        var toolbarItem = toolbarItems[i];
        var type = toolbarItem.getAttribute("data-type");

        switch (type) {
          case "undo":
            if (this.screenDrawer.pathBuffer != null && this.screenDrawer.pathBuffer.length > 0) {
              toolbarItem.classList.remove(itemInactiveClass);
            } else {
              toolbarItem.classList.add(itemInactiveClass);
            }

            break;

          default:
            break;
        }
      }
    }
  }, {
    key: "captureRenderer",
    value: function captureRenderer() {
      if (!this.screenRecorder) {
        return;
      }

      if (this.screenRecorder.file) {
        src_Gleap.getInstance().setGlobalDataItem("screenRecordingData", this.screenRecorder.file);
      }

      var itemInactiveClass = "bb-capture-editor-item-inactive";
      var timerLabel = document.querySelector(".bb-capture-toolbar-item-timer");
      var toolbarItems = document.querySelectorAll(".bb-capture-toolbar-item");
      var screenRecordingTooltip = document.querySelector(".bb-tooltip-screen-recording");
      var audioRecordingTooltip = document.querySelector(".bb-tooltip-audio-recording");
      var captureEditor = document.querySelector(".bb-capture-editor");
      var recordingClass = "bb-capture-editor-recording";
      var notRecordingClass = "bb-capture-editor-notrecording";

      if (this.screenRecorder.isRecording) {
        captureEditor.classList.add(recordingClass);
        captureEditor.classList.remove(notRecordingClass);
      } else {
        captureEditor.classList.add(notRecordingClass);
        captureEditor.classList.remove(recordingClass);
      } // Update UI.


      var dialog = document.querySelector(".bb-capture-toolbar");
      var videoPreviewContainer = document.querySelector(".bb-capture-preview");
      videoPreviewContainer.style.display = this.screenRecorder.file ? "flex" : "none";
      dialog.style.display = !this.screenRecorder.file ? "flex" : "none";

      for (var i = 0; i < toolbarItems.length; i++) {
        var toolbarItem = toolbarItems[i];
        var type = toolbarItem.getAttribute("data-type");

        switch (type) {
          case "mic":
            if (this.screenRecorder.audioAvailable && this.screenRecorder.available) {
              toolbarItem.classList.remove(itemInactiveClass);

              if (!this.screenRecorder.audioMuted) {
                toolbarItem.classList.remove("bb-capture-toolbar-item--inactivecross");
                audioRecordingTooltip.innerHTML = GleapTranslationManager.translateText("Mute");
              } else {
                toolbarItem.classList.add("bb-capture-toolbar-item--inactivecross");
                audioRecordingTooltip.innerHTML = GleapTranslationManager.translateText("Unmute");
              }
            } else {
              toolbarItem.classList.add(itemInactiveClass);
              toolbarItem.classList.add("bb-capture-toolbar-item--inactivecross");
              audioRecordingTooltip.innerHTML = GleapTranslationManager.translateText("Browser not supported");
            }

            break;

          case "recording":
            if (this.screenRecorder.available) {
              toolbarItem.classList.remove(itemInactiveClass);

              if (this.screenRecorder.isRecording) {
                toolbarItem.setAttribute("data-active", "true");
                screenRecordingTooltip.innerHTML = GleapTranslationManager.translateText("Stop recording");
                timerLabel.style.display = "block";
              } else {
                toolbarItem.setAttribute("data-active", "false");
                screenRecordingTooltip.innerHTML = GleapTranslationManager.translateText("Start recording");
                timerLabel.style.display = "none";
              }
            } else {
              // Recording is not available.
              toolbarItem.classList.add(itemInactiveClass);
              screenRecordingTooltip.innerHTML = GleapTranslationManager.translateText("Browser not supported");
            }

            break;

          default:
            break;
        }
      }
    }
  }, {
    key: "setupScreenRecording",
    value: function setupScreenRecording() {
      var self = this; // Hook preview next button

      var nextButtonPreview = document.querySelector(".bb-capture-preview-sendbutton");
      nextButtonPreview.onclick = this.showNextStep.bind(this); // Hook retry button

      var retryButton = document.querySelector(".bb-capture-preview-retrybutton");

      retryButton.onclick = function () {
        self.screenRecorder.clearPreview();

        if (self.screenDrawer) {
          self.screenDrawer.clear();
        }
      }; // Setup screen recorder


      this.screenRecorder = new GleapScreenRecorder(this.captureRenderer.bind(this), GleapTranslationManager.translateText("You denied access to screen sharing. Please turn it on in your browser settings."));
    }
  }], [{
    key: "setPenColor",
    value: function setPenColor(hexColor) {
      var penTips = document.querySelectorAll(".bb-pen-tip");

      for (var j = 0; j < penTips.length; j++) {
        penTips[j].style.fill = hexColor;
      }
    }
  }]);

  return GleapMarkerManager;
}();


;// CONCATENATED MODULE: ./src/GleapTranslationManager.js
function GleapTranslationManager_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function GleapTranslationManager_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function GleapTranslationManager_createClass(Constructor, protoProps, staticProps) { if (protoProps) GleapTranslationManager_defineProperties(Constructor.prototype, protoProps); if (staticProps) GleapTranslationManager_defineProperties(Constructor, staticProps); return Constructor; }

function GleapTranslationManager_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }



var GleapTranslationManager = /*#__PURE__*/function () {
  function GleapTranslationManager() {
    GleapTranslationManager_classCallCheck(this, GleapTranslationManager);

    GleapTranslationManager_defineProperty(this, "customTranslation", {});

    GleapTranslationManager_defineProperty(this, "overrideLanguage", "");

    GleapTranslationManager_defineProperty(this, "isRTLLayout", false);
  }

  GleapTranslationManager_createClass(GleapTranslationManager, [{
    key: "getOverrideLanguage",
    value:
    /**
     * Returns the language to override the default language.
     * @returns {string}
     */
    function getOverrideLanguage() {
      return this.overrideLanguage;
    }
    /**
     * Sets the language to override the default language.
     * @param {*} language 
     */

  }, {
    key: "setOverrideLanguage",
    value: function setOverrideLanguage(language) {
      this.overrideLanguage = language;
      GleapFrameManager.getInstance().sendConfigUpdate();
      this.updateRTLSupport();
    }
  }, {
    key: "updateRTLSupport",
    value: function updateRTLSupport() {
      // Update RTL support.
      this.isRTLLayout = GleapTranslationManager.translateText("rtlLang") === "true";
      GleapFeedbackButtonManager.getInstance().updateFeedbackButtonState();
      GleapFrameManager.getInstance().updateFrameStyle();
    }
    /**
     * Sets the custom translations.
     * @param {*} customTranslation 
     */

  }, {
    key: "setCustomTranslation",
    value: function setCustomTranslation(customTranslation) {
      this.customTranslation = customTranslation;
    }
  }], [{
    key: "getInstance",
    value: function getInstance() {
      if (!this.instance) {
        this.instance = new GleapTranslationManager();
      }

      return this.instance;
    }
  }, {
    key: "translateText",
    value: function translateText(key) {
      if (!key) {
        return "";
      }

      var instance = GleapTranslationManager.getInstance();
      var language = "en";

      if (typeof navigator !== "undefined") {
        language = navigator.language.substring(0, 2).toLowerCase();
      }

      if (instance.overrideLanguage && instance.overrideLanguage !== "") {
        language = instance.overrideLanguage.toLowerCase();
      }

      var searchForTranslationTable = function searchForTranslationTable(langKey) {
        var customTranslation = null;
        var translationKeys = Object.keys(instance.customTranslation);

        for (var i = 0; i < translationKeys.length; i++) {
          var translationKey = translationKeys[i];

          if (langKey && translationKey && langKey === translationKey.toLowerCase()) {
            if (instance.customTranslation[translationKey]) {
              customTranslation = instance.customTranslation[translationKey];
            }
          }
        }

        return customTranslation;
      };

      var customTranslation = searchForTranslationTable(language); // Extended search for language match only.

      if (!customTranslation && language) {
        var langKeys = language.split("-");

        if (langKeys && langKeys.length > 1) {
          customTranslation = searchForTranslationTable(langKeys[0]);
        }
      }

      if (customTranslation && customTranslation[key]) {
        return customTranslation[key];
      }

      return key;
    }
  }]);

  return GleapTranslationManager;
}();

GleapTranslationManager_defineProperty(GleapTranslationManager, "instance", void 0);


;// CONCATENATED MODULE: ./src/GleapShortcutListener.js
function GleapShortcutListener_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function GleapShortcutListener_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function GleapShortcutListener_createClass(Constructor, protoProps, staticProps) { if (protoProps) GleapShortcutListener_defineProperties(Constructor.prototype, protoProps); if (staticProps) GleapShortcutListener_defineProperties(Constructor, staticProps); return Constructor; }

function GleapShortcutListener_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }



var GleapShortcutListener = /*#__PURE__*/function () {
  function GleapShortcutListener() {
    GleapShortcutListener_classCallCheck(this, GleapShortcutListener);

    GleapShortcutListener_defineProperty(this, "shortCutListener", undefined);
  }

  GleapShortcutListener_createClass(GleapShortcutListener, [{
    key: "start",
    value: function start() {
      if (this.shortCutListener) {
        return;
      }

      var charForEvent = function charForEvent(event) {
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

      this.shortCutListener = document.addEventListener("keyup", function (e) {
        var _char = charForEvent(e);

        if (e.ctrlKey && (_char === "i" || _char === "I" || _char === 73)) {
          src_Gleap.startFeedbackFlowWithOptions("bugreporting", {
            autostartDrawing: true
          });
        }
      });
    }
  }, {
    key: "stop",
    value: function stop() {
      if (this.shortCutListener) {
        document.removeEventListener("keyup", this.shortCutListener);
        this.shortCutListener = undefined;
      }
    }
  }], [{
    key: "getInstance",
    value: function getInstance() {
      if (!this.instance) {
        this.instance = new GleapShortcutListener();
      }

      return this.instance;
    }
  }]);

  return GleapShortcutListener;
}();

GleapShortcutListener_defineProperty(GleapShortcutListener, "instance", void 0);


;// CONCATENATED MODULE: ./src/GleapPreFillManager.js
function GleapPreFillManager_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function GleapPreFillManager_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function GleapPreFillManager_createClass(Constructor, protoProps, staticProps) { if (protoProps) GleapPreFillManager_defineProperties(Constructor.prototype, protoProps); if (staticProps) GleapPreFillManager_defineProperties(Constructor, staticProps); return Constructor; }

function GleapPreFillManager_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var GleapPreFillManager = /*#__PURE__*/function () {
  function GleapPreFillManager() {
    GleapPreFillManager_classCallCheck(this, GleapPreFillManager);

    GleapPreFillManager_defineProperty(this, "formPreFill", {});
  }

  GleapPreFillManager_createClass(GleapPreFillManager, null, [{
    key: "getInstance",
    value: function getInstance() {
      if (!this.instance) {
        this.instance = new GleapPreFillManager();
      }

      return this.instance;
    }
  }]);

  return GleapPreFillManager;
}();

GleapPreFillManager_defineProperty(GleapPreFillManager, "instance", void 0);


;// CONCATENATED MODULE: ./src/Gleap.js
function Gleap_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function Gleap_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function Gleap_createClass(Constructor, protoProps, staticProps) { if (protoProps) Gleap_defineProperties(Constructor.prototype, protoProps); if (staticProps) Gleap_defineProperties(Constructor, staticProps); return Constructor; }

function Gleap_ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function Gleap_objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { Gleap_ownKeys(Object(source), true).forEach(function (key) { Gleap_defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { Gleap_ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function Gleap_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
























if (typeof HTMLCanvasElement !== "undefined" && HTMLCanvasElement.prototype) {
  HTMLCanvasElement.prototype.__originalGetContext = HTMLCanvasElement.prototype.getContext;

  HTMLCanvasElement.prototype.getContext = function (type, options) {
    return this.__originalGetContext(type, Gleap_objectSpread(Gleap_objectSpread({}, options), {}, {
      preserveDrawingBuffer: true
    }));
  };
}

var Gleap = /*#__PURE__*/function () {
  /**
   * Main constructor
   */
  function Gleap() {
    Gleap_classCallCheck(this, Gleap);

    Gleap_defineProperty(this, "initialized", false);

    Gleap_defineProperty(this, "offlineMode", false);

    Gleap_defineProperty(this, "globalData", {
      screenRecordingData: null,
      webReplay: null,
      snapshotPosition: {
        x: 0,
        y: 0
      }
    });

    if (typeof window !== "undefined") {
      // Make sure all instances are ready.
      GleapMetaDataManager.getInstance();
      GleapConsoleLogManager.getInstance().start();
      GleapClickListener.getInstance().start();
      GleapCrashDetector.getInstance().start();
      GleapRageClickDetector.getInstance().start();
    }
  }
  /**
   * Active the Gleap offline mode.
   * @param {*} offlineMode
   */


  Gleap_createClass(Gleap, [{
    key: "isLiveMode",
    value: function isLiveMode() {
      if (this.offlineMode === true) {
        return false;
      }

      var hostname = window.location.hostname;
      var isLocalHost = ["localhost", "127.0.0.1", "0.0.0.0", "", "::1"].includes(hostname) || hostname.startsWith("192.168.") || hostname.startsWith("10.0.") || hostname.endsWith(".local") || !hostname.includes(".");
      return !isLocalHost;
    }
    /**
     * Post initialization
     */

  }, {
    key: "postInitialization",
    value: function postInitialization() {
      // Load session.
      var onGleapReady = function onGleapReady() {
        setTimeout(function () {
          GleapFrameManager.getInstance().injectFrame();
        }, 100);
      };

      GleapSession.getInstance().setOnSessionReady(onGleapReady.bind(this));
    }
  }, {
    key: "softReInitialize",
    value: function softReInitialize() {
      GleapFeedbackButtonManager.getInstance().injectedFeedbackButton = false;
      GleapFrameManager.getInstance().injectedFrame = false; // Reload config.

      GleapConfigManager.getInstance().start().then(function () {
        GleapFrameManager.getInstance().injectFrame();
      })["catch"](function (exp) {});
    }
    /**
     * Performs an action.
     * @param {*} action 
     */

  }, {
    key: "performAction",
    value: function performAction(action) {
      if (action && action.outbound && action.actionType) {
        Gleap.startFeedbackFlowWithOptions(action.actionType, {
          actionOutboundId: action.outbound,
          hideBackButton: true
        });
      }
    }
    /**
     * Sets a global data value
     * @param {*} key 
     * @param {*} value 
     */

  }, {
    key: "setGlobalDataItem",
    value: function setGlobalDataItem(key, value) {
      this.globalData[key] = value;
    }
    /**
     * Gets a global data value
     * @param {*} key 
     * @returns 
     */

  }, {
    key: "getGlobalDataItem",
    value: function getGlobalDataItem(key) {
      return this.globalData[key];
    }
    /**
     * Takes the current replay and assigns it to the global data array.
     */

  }, {
    key: "takeCurrentReplay",
    value: function takeCurrentReplay() {
      var _this = this;

      GleapReplayRecorder.getInstance().getReplayData().then(function (replayData) {
        if (replayData) {
          _this.setGlobalDataItem("webReplay", replayData);
        }
      })["catch"](function (exp) {});
    }
  }], [{
    key: "getInstance",
    value: // Global data
    // Gleap singleton
    function getInstance() {
      if (!this.instance) {
        this.instance = new Gleap();
        return this.instance;
      } else {
        return this.instance;
      }
    }
  }, {
    key: "setOfflineMode",
    value: function setOfflineMode(offlineMode) {
      var instance = this.getInstance();
      instance.offlineMode = offlineMode;
    }
    /**
     * Revert console log overwrite
     */

  }, {
    key: "disableConsoleLogOverwrite",
    value: function disableConsoleLogOverwrite() {
      GleapConsoleLogManager.getInstance().stop();
    }
    /**
    * Add entry to logs.
    * @param {*} message
    * @param {*} logLevel
    * @returns
    */

  }, {
    key: "log",
    value: function log(message) {
      var logLevel = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "INFO";
      GleapConsoleLogManager.getInstance().addLog(message, logLevel);
    }
    /**
     * Initializes the SDK
     * @param {*} sdkKey
     */

  }, {
    key: "initialize",
    value: function initialize(sdkKey) {
      var instance = this.getInstance();

      if (instance.initialized) {
        console.warn("Gleap already initialized.");
        return;
      }

      instance.initialized = true; // Start session

      var sessionInstance = GleapSession.getInstance();
      sessionInstance.sdkKey = sdkKey;
      sessionInstance.setOnSessionReady(function () {
        // Run auto configuration.
        GleapConfigManager.getInstance().start().then(function () {
          if (document.readyState === "complete" || document.readyState === "loaded" || document.readyState === "interactive") {
            instance.postInitialization();
          } else {
            document.addEventListener("DOMContentLoaded", function (event) {
              instance.postInitialization();
            });
          }
        })["catch"](function (err) {
          console.warn("Failed to initialize Gleap.");
        });
      });
      sessionInstance.startSession();
    }
    /**
     * Indentifies the user session
     * @param {string} userId
     * @param {*} userData
     */

  }, {
    key: "identify",
    value: function identify(userId, userData, userHash) {
      return GleapSession.getInstance().identifySession(userId, gleapDataParser(userData), userHash);
    }
    /**
     * Clears the current user session
     */

  }, {
    key: "clearIdentity",
    value: function clearIdentity() {
      GleapSession.getInstance().clearSession();
    }
    /**
     * Widget opened status
     * @returns {boolean} isOpened
     */

  }, {
    key: "isOpened",
    value: function isOpened() {
      return GleapFrameManager.getInstance().isOpened();
    }
    /**
     * Hides any open Gleap dialogs.
     */

  }, {
    key: "hide",
    value: function hide() {
      GleapFrameManager.getInstance().hideWidget();
    }
    /**
     * Closes any open Gleap dialogs.
     */

  }, {
    key: "close",
    value: function close() {
      GleapFrameManager.getInstance().hideWidget();
    }
    /**
     * Starts the Gleap flow.
     */

  }, {
    key: "open",
    value: function open() {
      GleapFrameManager.getInstance().showWidget();
    }
    /**
     * Logs a custom event
     * @param {string} name
     * @param {any} data
     */

  }, {
    key: "logEvent",
    value: function logEvent(name, data) {
      GleapStreamedEvent.getInstance().logEvent(name, data);
    }
    /**
     * Prefills a specific form field.
     * @param {*} key 
     * @param {*} value 
     */

  }, {
    key: "preFillForm",
    value: function preFillForm(data) {
      GleapPreFillManager.getInstance().formPreFill = gleapDataParser(data);
      GleapFrameManager.getInstance().sendFormPreFillData();
    }
    /**
     * Register events for Gleap.
     * @param {*} eventName
     * @param {*} callback
     */

  }, {
    key: "on",
    value: function on(eventName, callback) {
      GleapEventManager.on(eventName, callback);
    }
    /**
     * Enable or disable shortcuts
     * @param {boolean} enabled
     */

  }, {
    key: "enableShortcuts",
    value: function enableShortcuts(enabled) {
      if (enabled) {
        GleapShortcutListener.getInstance().start();
      } else {
        GleapShortcutListener.getInstance().stop();
      }
    }
    /**
     * Show or hide the feedback button
     * @param {*} show
     * @returns
     */

  }, {
    key: "showFeedbackButton",
    value: function showFeedbackButton(show) {
      GleapFeedbackButtonManager.getInstance().toggleFeedbackButton(show);
    }
    /**
     * Sets the app version code.
     * @param {string} appVersionCode
     */

  }, {
    key: "setAppVersionCode",
    value: function setAppVersionCode(appVersionCode) {
      GleapMetaDataManager.setAppVersionCode(appVersionCode);
    }
    /**
     * Sets the app version code.
     * @param {string} appVersionCode
     */

  }, {
    key: "setAppBuildNumber",
    value: function setAppBuildNumber(appBuildNumber) {
      GleapMetaDataManager.setAppBuildNumber(appBuildNumber);
    }
    /**
     * Set a custom api url.
     * @param {string} apiUrl
     */

  }, {
    key: "setApiUrl",
    value: function setApiUrl(apiUrl) {
      GleapSession.getInstance().apiUrl = apiUrl;
    }
    /**
     * Set a custom frame api url.
     * @param {string} frameUrl
     */

  }, {
    key: "setFrameUrl",
    value: function setFrameUrl(frameUrl) {
      GleapFrameManager.getInstance().frameUrl = frameUrl;
    }
    /**
     * Set custom data that will be attached to the bug-report.
     * @param {*} data
     */

  }, {
    key: "attachCustomData",
    value: function attachCustomData(data) {
      GleapCustomDataManager.getInstance().attachCustomData(data);
    }
    /**
     * Add one key value pair to the custom data object
     * @param {*} key The key of the custom data entry you want to add.
     * @param {*} value The custom data you want to add.
     */

  }, {
    key: "setCustomData",
    value: function setCustomData(key, value) {
      GleapCustomDataManager.getInstance().setCustomData(key, value);
    }
    /**
     * Remove one key value pair of the custom data object
     * @param {*} key The key of the custom data entry you want to remove.
     */

  }, {
    key: "removeCustomData",
    value: function removeCustomData(key) {
      GleapCustomDataManager.getInstance().removeCustomData(key);
    }
    /**
     * Clear the custom data
     */

  }, {
    key: "clearCustomData",
    value: function clearCustomData() {
      GleapCustomDataManager.getInstance().clearCustomData();
    }
    /**
     * Override the browser language.
     * @param {string} language country code with two letters
     */

  }, {
    key: "setLanguage",
    value: function setLanguage(language) {
      GleapTranslationManager.getInstance().setOverrideLanguage(language);
    }
    /**
     * Register custom action
     * @param {*} action
     */

  }, {
    key: "registerCustomAction",
    value: function registerCustomAction(customAction) {
      GleapCustomActionManager.registerCustomAction(customAction);
    }
    /**
     * Triggers a custom action
     * @param {*} actionName
     */

  }, {
    key: "triggerCustomAction",
    value: function triggerCustomAction(name) {
      GleapCustomActionManager.triggerCustomAction(name);
    }
    /**
     * Sets a custom color scheme.
     * @param {string} primaryColor
     */

  }, {
    key: "setStyles",
    value: function setStyles(primaryColor, headerColor, buttonColor) {
      var backgroundColor = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : "#ffffff";
      var borderRadius = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 20;

      if (document.readyState === "complete" || document.readyState === "loaded" || document.readyState === "interactive") {
        injectStyledCSS(primaryColor, headerColor, buttonColor, borderRadius, backgroundColor);
      } else {
        document.addEventListener("DOMContentLoaded", function (event) {
          injectStyledCSS(primaryColor, headerColor, buttonColor, borderRadius, backgroundColor);
        });
      }
    }
    /**
     * Sends a silent feedback report
     * @param {*} formData
     * @param {*} priority
     * @param {*} excludeData
     */

  }, {
    key: "sendSilentCrashReport",
    value: function sendSilentCrashReport() {
      var description = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
      var priority = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "MEDIUM";
      var excludeData = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {
        screenshot: true,
        replays: true,
        attachments: true
      };
      return Gleap.sendSilentCrashReportWithFormData({
        description: description
      }, priority, excludeData);
    }
    /**
     * Sends a silent feedback report
     * @param {*} formData
     * @param {*} priority
     * @param {*} excludeData
     */

  }, {
    key: "sendSilentCrashReportWithFormData",
    value: function sendSilentCrashReportWithFormData(formData) {
      var _this2 = this;

      var priority = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "MEDIUM";
      var excludeData = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {
        screenshot: true,
        replays: true,
        attachments: true
      };

      if (this.silentCrashReportSent) {
        return;
      }

      this.silentCrashReportSent = true;
      setTimeout(function () {
        _this2.silentCrashReportSent = false;
      }, 10000);
      var excludeDataCleaned = excludeData ? gleapDataParser(excludeData) : {};
      var sessionInstance = GleapSession.getInstance();

      if (!sessionInstance.ready) {
        return;
      }

      var newFormData = formData ? formData : {};

      if (sessionInstance.session.email) {
        newFormData.reportedBy = sessionInstance.session.email;
      }

      var feedback = new GleapFeedback("CRASH", priority, newFormData, true, excludeDataCleaned);
      feedback.sendFeedback().then(function () {})["catch"](function (error) {});
    }
    /**
     * Starts the bug reporting flow.
     */

  }, {
    key: "startFeedbackFlow",
    value: function startFeedbackFlow(feedbackFlow, showBackButton) {
      Gleap.startFeedbackFlowWithOptions(feedbackFlow, {
        hideBackButton: !showBackButton
      });
    }
    /**
     * Starts the bug reporting flow.
     */

  }, {
    key: "startFeedbackFlowWithOptions",
    value: function startFeedbackFlowWithOptions(feedbackFlow) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var actionOutboundId = options.actionOutboundId,
          autostartDrawing = options.autostartDrawing,
          hideBackButton = options.hideBackButton;
      var sessionInstance = GleapSession.getInstance();

      if (!sessionInstance.ready) {
        return;
      } // Initially set scroll position


      Gleap.getInstance().setGlobalDataItem("snapshotPosition", {
        x: window.scrollX,
        y: window.scrollY
      });
      GleapFrameManager.getInstance().sendMessage({
        name: "start-feedbackflow",
        data: {
          flow: feedbackFlow,
          actionOutboundId: actionOutboundId,
          hideBackButton: hideBackButton
        }
      });

      if (autostartDrawing) {
        GleapFrameManager.getInstance().showDrawingScreen("screenshot");
      } else {
        GleapFrameManager.getInstance().showWidget();
      }
    }
  }]);

  return Gleap;
}(); // Check for unperformed Gleap actions.


Gleap_defineProperty(Gleap, "silentCrashReportSent", false);

Gleap_defineProperty(Gleap, "instance", void 0);

if (typeof window !== "undefined") {
  var GleapActions = window.GleapActions;

  if (GleapActions && GleapActions.length > 0) {
    for (var i = 0; i < GleapActions.length; i++) {
      var GLAction = GleapActions[i];

      if (GLAction && GLAction.e && Gleap[GLAction.e]) {
        Gleap[GLAction.e].apply(Gleap, GLAction.a);
      }
    }
  }
}


/* harmony default export */ const src_Gleap = (Gleap);
;// CONCATENATED MODULE: ./src/index.js

/* harmony default export */ const src = (src_Gleap);
__webpack_exports__ = __webpack_exports__.default;
/******/ 	return __webpack_exports__;
/******/ })()
;
});