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

;// CONCATENATED MODULE: ./src/ImageHelper.js
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

var downloadAllCSSUrlResources = function downloadAllCSSUrlResources(clone, remote) {
  var promises = [];

  var _loop = function _loop() {
    var styleSheet = document.styleSheets[i];
    cssRules = null;

    try {
      if (styleSheet.cssRules) {
        cssRules = styleSheet.cssRules;
      } else if (styleSheet.rules) {
        cssRules = styleSheet.rules;
      }
    } catch (exp) {}

    cssTextContent = "";

    if (cssRules) {
      for (cssRuleItem in cssRules) {
        if (cssRules[cssRuleItem].cssText) {
          cssTextContent += cssRules[cssRuleItem].cssText;
        }
      }
    }

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
    var cssRules;
    var cssTextContent;
    var cssRuleItem;
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
        var height = 0;

        if (node.style.boxSizing === "border-box") {
          height = node.height + node.marginTop + node.marginBottom + node.bordorTop + node.borderBottom;
        } else {
          height = node.height;
        }

        clone.setAttribute("bb-element", true);
        clone.setAttribute("bb-height", height);
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
      walkTree(node.shadowRoot.firstChild, clone, shadowNodeId);

      if (typeof clone.setAttribute !== "undefined") {
        clone.setAttribute("bb-shadow-parent", shadowNodeId);
      }

      ++shadowNodeId;
    }

    walkTree(node.firstChild, clone);
  };

  var fragment = document.createDocumentFragment();
  cloneNode(host, fragment);
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
        bbElems[i].style.height = bbElems[i].getAttribute("bb-height");
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
;// CONCATENATED MODULE: ./src/Translation.js

var translateText = function translateText(key, overrideLanguage) {
  var instance = src_Gleap.getInstance();
  var language = navigator.language;

  if (overrideLanguage !== "") {
    language = overrideLanguage;
  }

  var customTranslation = {};
  var translationKeys = Object.keys(instance.customTranslation);

  for (var i = 0; i < translationKeys.length; i++) {
    var translationKey = translationKeys[i];

    if (language && language.includes(translationKey)) {
      if (instance.customTranslation[translationKey]) {
        customTranslation = instance.customTranslation[translationKey];
      }
    }
  }

  if (customTranslation[key]) {
    return customTranslation[key];
  }

  if (!key) {
    return "";
  }

  return key;
};
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
  var contrastHeaderColor = calculateContrast(headerColor);
  var contrastButtonColor = calculateContrast(buttonColor);
  var contrastBackgroundColor = calculateContrast(backgroundColor);
  var isDarkMode = contrastBackgroundColor === "#ffffff";
  var subTextColor = isDarkMode ? calculateShadeColor(backgroundColor, 100) : calculateShadeColor(backgroundColor, -100);
  var backgroundColorHover = isDarkMode ? calculateShadeColor(backgroundColor, 30) : calculateShadeColor(backgroundColor, -12);
  var hoverHoverColor = isDarkMode ? calculateShadeColor(backgroundColor, 80) : calculateShadeColor(backgroundColor, -30);
  var borderColor = isDarkMode ? calculateShadeColor(backgroundColor, 70) : calculateShadeColor(backgroundColor, -70);
  var borderRadius = parseInt(borderRadius, 10);

  if (borderRadius === NaN || borderRadius === undefined) {
    borderRadius = 20;
  }

  var containerBorderRadius = Math.round(borderRadius * 0.6);
  var buttonBorderRadius = Math.round(borderRadius * 1.05);
  var formItemBorderRadius = Math.round(borderRadius * 0.4);
  var formItemSmallBorderRadius = Math.round(borderRadius * 0.25);
  var colorStyleSheet = "\n    .bb-capture-preview-retrybutton {\n      color: ".concat(contrastBackgroundColor, ";\n      border-radius: ").concat(buttonBorderRadius, "px;\n    }\n    .bb-capture-preview-retrybutton:hover {\n      background-color: ").concat(backgroundColorHover, ";\n    }\n    .bb-capture-dismiss {\n      background-color: ").concat(primaryColor, ";\n    }\n    .bb-capture-dismiss svg path {\n      fill: ").concat(contrastColor, ";\n    }\n    .bb-capture-toolbar-item-spacer {\n      background-color: ").concat(backgroundColorHover, ";\n    }\n    .bb-tooltip {\n      border-radius: ").concat(formItemBorderRadius, "px;\n    }\n    @keyframes bbRecIconFade {\n      0% {\n        fill: transparent;\n      }\n      50% {\n        fill: ").concat(hoverHoverColor, ";\n      }\n      100% {\n        fill: transparent;\n      }\n    }\n    .bb-capture-preview-sendbutton {\n      color: ").concat(contrastColor, ";\n      background-color: ").concat(primaryColor, ";\n      border-radius: ").concat(buttonBorderRadius, "px;\n    }\n    .bb-capture-button-next {\n      color: ").concat(contrastColor, ";\n      background-color: ").concat(primaryColor, ";\n      border-radius: ").concat(formItemSmallBorderRadius, "px;\n    }\n    .bb-feedback-capture-item {\n      border-radius: ").concat(buttonBorderRadius, "px;\n      background-color: ").concat(backgroundColorHover, ";\n    }\n    .bb-capture-preview-inner {\n      background-color: ").concat(backgroundColor, ";\n      border-radius: ").concat(formItemBorderRadius, "px;\n    }\n    .bb-feedback-capture-item .bb-item-title {\n      color: ").concat(contrastBackgroundColor, ";\n    }\n    .bb-capture-toolbar-item-timer {\n      color: ").concat(subTextColor, ";\n    }\n    .bb-feedback-capture-item-selected-icon path,\n    .bb-feedback-capture-item-selected-action path,\n    .bb-feedback-capture-item path {\n      fill: ").concat(contrastBackgroundColor, ";\n    }\n    .bb-svg-path {\n      fill: ").concat(contrastBackgroundColor, ";\n    }\n    .bb-feedback-capture-item-selected-button {\n      border-radius: ").concat(formItemBorderRadius, "px;\n      background-color: ").concat(backgroundColorHover, ";\n    }\n    .bb-feedback-capture-item-selected-label {\n      color: ").concat(contrastBackgroundColor, ";\n    }\n    .bb-feedback-capture-item-selected-action:hover {\n      background-color: ").concat(hoverHoverColor, ";\n      border-radius: ").concat(formItemSmallBorderRadius, "px;\n    }\n    .bb-capture-toolbar-item {\n      border-radius: ").concat(formItemBorderRadius, "px;\n    }\n    .bb-capture-toolbar {\n      background-color: ").concat(backgroundColor, ";\n      border-radius: ").concat(formItemBorderRadius, "px;\n    }\n    .bb-capture-toolbar-item-colorpicker {\n      background-color: ").concat(backgroundColor, ";\n    }\n    .bb-capture-toolbar-item--active {\n      background-color: ").concat(backgroundColorHover, ";\n    }\n    .bb-feedback-capture-item:hover {\n      background-color: ").concat(hoverHoverColor, ";\n    }\n    .bb-feedback-onetofive-button {\n      border-radius: ").concat(formItemSmallBorderRadius, "px;\n    }\n    .bb-feedback-button-classic {\n      border-top-left-radius: ").concat(formItemBorderRadius, "px;\n      border-top-right-radius: ").concat(formItemBorderRadius, "px;\n    }\n    .bb-logo-logo--default path {\n      fill: ").concat(contrastButtonColor, ";\n    }\n    .bb-feedback-dialog-header-logo .bb-logo-logo--default path {\n      fill: ").concat(contrastHeaderColor, ";\n    }\n    .bb-feedback-inputgroup textarea,\n    .bb-feedback-inputgroup > input,\n    .bb-feedback-inputgroup input {\n      border-radius: ").concat(formItemBorderRadius, "px;\n    }\n    .bb-feedback-dialog-header-back:hover {\n      background-color: ").concat(contrastHeaderColor, ";\n      border-radius: ").concat(containerBorderRadius, "px;\n    }\n    .bb-feedback-dialog-header-next {\n      background-color: ").concat(contrastHeaderColor, ";\n    }\n    .bb-feedback-dialog-header-next span {\n      color: ").concat(headerColor, ";\n    }\n    .bb-feedback-dialog-header-next svg {\n      fill: ").concat(headerColor, ";\n    }\n    .bb-feedback-type {\n      border-radius: ").concat(containerBorderRadius, "px;\n      background-color: ").concat(backgroundColor, ";\n    }\n    .bb-feedback-type-description,\n    .bb-feedback-poweredbycontainer span,\n    .bb-feedback-onetofive-description span {\n      color: ").concat(subTextColor, ";\n    }\n    .bb-feedback-poweredbycontainer svg g {\n      fill: ").concat(subTextColor, ";\n    }\n    .bb-feedback-type:hover {\n      background-color: ").concat(backgroundColorHover, ";\n    }\n    #bb-drawing-colorpopup {\n      background-color: ").concat(backgroundColor, ";\n    }\n    .bb-feedback-type-title,\n    .bb-feedback-form-description,\n    .bb-feedback-elementtitle,\n    .bb-feedback-multiplechoice-container,\n    .bb-feedback-dialog-info-text\n    {\n      color: ").concat(contrastBackgroundColor, ";\n    }\n    .bb-drawing-tool-item svg,\n    .bb-drawing-tool-item svg g,\n    .bb-drawing-tool-back svg,\n    .bb-drawing-tool-back svg g {\n      fill: ").concat(contrastBackgroundColor, ";\n    }\n    .bb-drawing-tool-spacer {\n      background-color: ").concat(backgroundColorHover, ";\n    }\n    .bb-feedback-dialog {\n      border-radius: ").concat(borderRadius, "px;\n      background-color: ").concat(backgroundColor, ";\n    }\n    .bb-logo-arrowdown {\n      fill: ").concat(contrastButtonColor, ";\n    }\n    .bb-feedback-dialog-header-back svg {\n      fill: ").concat(contrastHeaderColor, ";\n    }\n    .bb-feedback-dialog-header-back:hover svg {\n      fill: ").concat(headerColor, ";\n    }\n    .bb-feedback-dialog-header-close svg {\n      fill: ").concat(contrastHeaderColor, ";\n    }\n    .bb-feedback-dialog-header-title,\n    .bb-feedback-dialog-header-title span {\n      color: ").concat(contrastHeaderColor, ";\n    }\n    .bb-feedback-dialog-header-title-small {\n      color: ").concat(contrastHeaderColor, ";\n    }\n    .bb-feedback-dialog-header-description {\n      color: ").concat(contrastHeaderColor, ";\n    }\n    .bb-feedback-onetofive-button-active,\n    .bb-feedback-onetofive-button:hover {\n      background-color: ").concat(primaryColor, ";\n      color: ").concat(contrastColor, ";\n    }    \n    .bb-feedback-button-icon {\n        background-color: ").concat(buttonColor, ";\n    }\n    .bb-feedback-multiplechoice-container:hover\n      input\n      ~ .bb-feedback-multiplechoice-checkmark {\n      border: 2px solid ").concat(primaryColor, ";\n    }    \n    .bb-feedback-multiplechoice-container input:checked ~ .bb-feedback-multiplechoice-checkmark {\n      background-color: ").concat(primaryColor, ";\n      border: 2px solid ").concat(primaryColor, ";\n    }\n    .bb-feedback-dialog-header-button {\n        color: ").concat(primaryColor, ";\n    }\n    .bb-drawing-tool-item--active {\n      background-color: ").concat(primaryColor, ";\n    }\n    .bb-capture-editor-borderlayer {\n        border-color: ").concat(primaryColor, ";\n    }\n    .bb-feedback-button-classic {\n      background-color: ").concat(buttonColor, ";\n      color: ").concat(contrastButtonColor, ";\n    }\n    .bb-feedback-dialog-header {\n      background-color: ").concat(headerColor, ";\n    }\n    .bb-form-progress-inner {\n      background-color: ").concat(headerColor, "66;\n    }\n    .bb-feedback-inputgroup textarea,\n    .bb-feedback-inputgroup > input,\n    .bb-feedback-inputgroup input {\n      background-color: ").concat(backgroundColor, ";\n      color: ").concat(contrastBackgroundColor, ";\n      border-color: ").concat(borderColor, ";\n    }\n    .bb-feedback-inputgroup textarea:focus {\n      border-color: ").concat(primaryColor, ";\n    }\n    .bb-feedback-inputgroup > input:focus, .bb-feedback-inputgroup input:focus {\n      border-color: ").concat(primaryColor, ";\n    }\n    .bb-feedback-send-button {\n      color: ").concat(contrastColor, ";\n      background-color: ").concat(primaryColor, ";\n      border-radius: ").concat(buttonBorderRadius, "px;\n    }\n    .bb-double-bounce1,\n    .bb-double-bounce2 {\n      background-color: ").concat(primaryColor, ";\n    }\n    .bb-feedback-dialog-header-button-cancel {\n      background-color: ").concat(primaryColor, ";\n    }\n    .bb-feedback-type-icon {\n      background-color: ").concat(primaryColor, ";\n    }\n    .bb-feedback-inputgroup--privacy-policy\n    [type=\"checkbox\"]:not(:checked)\n    + label:after,\n    .bb-feedback-inputgroup--privacy-policy\n    [type=\"checkbox\"]:checked\n    + label:after {\n    color: ").concat(primaryColor, ";\n    }\n    ");
  var node = document.createElement("style");
  node.innerHTML = colorStyleSheet;
  src_Gleap.appendNode(node);
};
var getHeaderImage = function getHeaderImage(customLogoUrl) {
  var headerImage = loadIcon("bblogo", "#fff");

  if (customLogoUrl) {
    headerImage = "<img src=\"".concat(customLogoUrl, "\" alt=\"bb-logo\" />");
  }

  return headerImage;
};
var createWidgetDialog = function createWidgetDialog(title, description, customLogoUrl, content, back) {
  var showBack = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : true;
  var appendClass = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : "";
  var elem = document.createElement("div");
  elem.className = "bb-feedback-dialog-container";
  elem.innerHTML = "<div class=\"bb-feedback-dialog-backdrop\"></div><div class='bb-feedback-dialog ".concat(appendClass, "'>\n      <div class=\"bb-feedback-dialog-header").concat(back ? " bb-feedback-dialog-header--back" : "").concat(!showBack ? " bb-feedback-dialog-header--backhidden" : "", "\">\n        ").concat(back ? "<div class=\"bb-feedback-dialog-header-back\">\n        ".concat(loadIcon("arrowleft", "#fff"), "\n        </div>") : "<div class=\"bb-feedback-dialog-header-logo\">\n          ".concat(getHeaderImage(customLogoUrl), "\n        </div>"), "\n        <div class=\"bb-feedback-dialog-header-text\">\n          <div class=\"bb-feedback-dialog-header-title\">\n            ").concat(title, "\n          </div>\n          ").concat(description === null ? "" : "<div class=\"bb-feedback-dialog-header-description\">\n          ".concat(description, "\n        </div>"), "\n        </div>\n        <div class=\"bb-feedback-dialog-header-close\">\n          ").concat(loadIcon("close", "#fff"), "\n        </div>\n      </div>\n      <div class=\"bb-feedback-dialog-body\">\n        ").concat(content, "\n        <div class=\"bb-feedback-poweredbycontainer\">\n          <span>Powered by</span>\n          <svg width=\"90px\" height=\"32px\" viewBox=\"0 0 90 32\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n              <g stroke=\"none\" stroke-width=\"1\" fill=\"none\" fill-rule=\"evenodd\">\n                  <g transform=\"translate(0.653299, 0.000000)\" fill=\"#59617D\" fill-rule=\"nonzero\">\n                      <path d=\"M16.7989119,8.32577189 L22.1014291,8.32577189 C21.4265888,3.43890649 17.1242771,0 11.5448484,0 C5.02513746,0 0,4.70586291 0,12.7178969 C0,20.5368768 4.69977222,25.3876017 11.6532254,25.3876017 C17.8836188,25.3876017 22.3303551,21.4418423 22.3303551,14.9380999 L22.3303551,11.8250016 L12.0027005,11.8250016 L12.0027005,15.7586204 L17.3052177,15.7586204 C17.2328883,18.823461 15.1479759,20.7661416 11.6773352,20.7661416 C7.76078035,20.7661416 5.29034525,17.8340271 5.29034525,12.6696392 C5.29034525,7.52939191 7.85721955,4.62139446 11.6291156,4.62139446 C14.3165389,4.62139446 16.1362435,6.00903014 16.7989119,8.32577189 Z\"></path>\n                      <polygon points=\"30.2692671 0.337857389 25.1355185 0.337857389 25.1355185 25.0496341 30.2692671 25.0496341\"></polygon>\n                      <path d=\"M41.7991346,25.4117422 C46.3785919,25.4117422 49.4634758,23.1793283 50.1865357,19.7404968 L45.4385438,19.426787 C44.9203002,20.8385398 43.5947294,21.5745684 41.883636,21.5745684 C39.3167617,21.5745684 37.6897014,19.8732229 37.6897014,17.1100453 L37.6897014,17.097975 L50.2951468,17.097975 L50.2951468,15.6862222 C50.2951468,9.38760404 46.486969,6.27448232 41.5943184,6.27448232 C36.1473765,6.27448232 32.6163443,10.1477732 32.6163443,15.8672059 C32.6163443,21.7435053 36.0991569,25.4117422 41.7991346,25.4117422 Z M37.6897014,13.9124785 C37.7983125,11.8008611 39.4010289,10.1115858 41.6785856,10.1115858 C43.9081568,10.1115858 45.4507158,11.7043223 45.4626536,13.9124785 L37.6897014,13.9124785 Z\"></path>\n                      <path d=\"M57.9054165,25.3995548 C60.6410594,25.3995548 62.4125444,24.2049497 63.3163107,22.4795574 L63.4609695,22.4795574 L63.4609695,25.0496341 L68.3295103,25.0496341 L68.3295103,12.5489834 C68.3295103,8.13269445 64.593896,6.27448232 60.4722908,6.27448232 C56.0377263,6.27448232 53.121377,8.39817007 52.410255,11.7767205 L57.1582468,12.162852 C57.5077218,10.9320829 58.6043666,10.0271174 60.448181,10.0271174 C62.1955562,10.0271174 63.1957617,10.9079424 63.1957617,12.4283041 L63.1957617,12.5007023 C63.1957617,13.695284 61.9305825,13.8521272 58.7129777,14.1658604 C55.0494587,14.5037108 51.7595245,15.7344799 51.7595245,19.8732229 C51.7595245,23.5414364 54.3746184,25.3995548 57.9054165,25.3995548 Z M59.375646,21.8521143 C57.7970394,21.8521143 56.664347,21.1160622 56.664347,19.7043095 C56.664347,18.2563459 57.8571969,17.5444343 59.6649636,17.291029 C60.7857181,17.1341858 62.6173606,16.8687102 63.2320434,16.4584616 L63.2320434,18.4252828 C63.2320434,20.3679399 61.629327,21.8521143 59.375646,21.8521143 Z\"></path>\n                      <path d=\"M71.2943133,32 L76.4280619,32 L76.4280619,22.0813791 L76.5846586,22.0813791 C77.2957806,23.6258111 78.8502774,25.3512737 81.8389562,25.3512737 C86.0567665,25.3512737 89.3467007,22.0089575 89.3467007,15.806878 C89.3467007,9.43586168 85.9121077,6.27448232 81.850894,6.27448232 C78.7538382,6.27448232 77.2716708,8.12062418 76.5846586,9.62891568 L76.3557325,9.62891568 L76.3557325,6.5158174 L71.2943133,6.5158174 L71.2943133,32 Z M76.3196849,15.7827375 C76.3196849,12.4765852 77.717585,10.3649677 80.2121299,10.3649677 C82.7548944,10.3649677 84.104575,12.5731005 84.104575,15.7827375 C84.104575,19.016515 82.7307846,21.2608586 80.2121299,21.2608586 C77.7416948,21.2608586 76.3196849,19.0889132 76.3196849,15.7827375 Z\"></path>\n                  </g>\n              </g>\n          </svg>\n        </div>\n      </div>\n    </div>");
  src_Gleap.appendNode(elem);
  var buttonType = src_Gleap.getInstance().buttonType;

  if (buttonType === src_Gleap.FEEDBACK_BUTTON_BOTTOM_LEFT) {
    elem.classList.add("bb-feedback-button--bottomleft");
  }

  if (buttonType === src_Gleap.FEEDBACK_BUTTON_NONE) {
    elem.classList.add("bb-feedback-button--disabled");
  }

  if (buttonType === src_Gleap.FEEDBACK_BUTTON_CLASSIC || buttonType === src_Gleap.FEEDBACK_BUTTON_CLASSIC_LEFT || buttonType === src_Gleap.FEEDBACK_BUTTON_CLASSIC_BOTTOM) {
    elem.classList.add("bb-feedback-button--classic");
  }

  if (buttonType === src_Gleap.FEEDBACK_BUTTON_CLASSIC_LEFT) {
    elem.classList.add("bb-feedback-button--classic-left");
  }

  var closeButton = document.querySelector(".bb-feedback-dialog-header-close");

  closeButton.onclick = function () {
    if (closeButton && closeButton.getAttribute("d") === "t") {
      return;
    }

    src_Gleap.getInstance().closeGleap();
  }; // Hook back action


  if (back) {
    var backButton = document.querySelector(".bb-feedback-dialog-header-back");

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

var createFeedbackTypeDialog = function createFeedbackTypeDialog(feedbackTypeActions, overrideLanguage, customLogoUrl, poweredByHidden, selectedMenuOption, title, subtitle, fromBack) {
  // Generate options
  var optionsHTML = "<div class=\"bb-feedback-types\">";

  for (var i = 0; i < feedbackTypeActions.length; i++) {
    var action = feedbackTypeActions[i];
    optionsHTML += "<div id=\"bb-feedback-type-".concat(i, "\" class=\"bb-feedback-type\">\n        <div class=\"bb-feedback-type-icon\" style=\"background-color: ").concat(action.color, ";\">\n          <img src=\"").concat(action.icon, "\">\n        </div>\n        <div class=\"bb-feedback-type-text\">\n          <div class=\"bb-feedback-type-title\">").concat(translateText(action.title, overrideLanguage), "</div>\n          <div class=\"bb-feedback-type-description\">").concat(translateText(action.description, overrideLanguage), "</div>\n        </div>\n      </div>");
  }

  optionsHTML += "</div>";
  var dialog = createWidgetDialog(title, subtitle, customLogoUrl, optionsHTML, null, true, fromBack ? "bb-anim-fadeinfromback" : "bb-anim-fadein"); // Hook actions

  var _loop = function _loop() {
    var index = i;

    document.getElementById("bb-feedback-type-".concat(index)).onclick = function () {
      dialog.remove();

      if (feedbackTypeActions[index].action) {
        // Cleanup widget.
        src_Gleap.getInstance().closeGleap(); // Call custom action.

        feedbackTypeActions[index].action();
      }

      if (feedbackTypeActions[index].actionFlow) {
        src_Gleap.startFeedbackFlow(feedbackTypeActions[index].actionFlow);
      }

      if (selectedMenuOption) {
        selectedMenuOption();
      }
    };
  };

  for (var i = 0; i < feedbackTypeActions.length; i++) {
    _loop();
  }

  validatePoweredBy(poweredByHidden);
};
var validatePoweredBy = function validatePoweredBy(poweredByHidden) {
  var poweredByContainer = document.querySelector(".bb-feedback-poweredbycontainer");

  if (poweredByHidden) {
    poweredByContainer.style.display = "none";
  } else {
    poweredByContainer.onclick = function () {
      window.open("https://www.gleap.io/", "_blank");
    };
  }
};
var setLoadingIndicatorProgress = function setLoadingIndicatorProgress(percentComplete) {
  var loader = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "main";
  var circle = window.document.querySelector(".bb-feedback-dialog-loading--".concat(loader, " .bb--progress-ring__circle"));
  var circumference = 213.628300444;
  var offset = circumference - percentComplete / 100 * circumference;

  if (circle) {
    circle.style.strokeDasharray = "".concat(circumference, " ").concat(circumference);
    circle.style.strokeDashoffset = offset;
  }
};
var loadIcon = function loadIcon(name, color) {
  if (name === "bblogo") {
    return "<svg class=\"bb-logo-logo bb-logo-logo--default\" width=\"127px\" height=\"129px\" viewBox=\"0 0 127 129\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n        <g stroke=\"none\" stroke-width=\"1\" fill=\"none\" fill-rule=\"evenodd\">\n            <g transform=\"translate(-11.000000, -6.000000)\">\n                <g transform=\"translate(11.000000, 6.000000)\">\n                    <path d=\"M27.5507,32.306 C20.4495,41.0714 17.3437,52.8384 17.3438,64.1091 C17.3438,75.3799 20.4497,87.1469 27.5508,95.9123 C34.4039,104.372 45.6889,110.937 64.1725,110.937 C83.6599,110.937 93.3637,102.356 98.4673,94.1976 C102.058,88.4577 103.344,84.2626 103.805,81.4366 C104.114,79.5459 105.616,77.9841 107.531,77.9841 L117.938,77.9841 C119.853,77.9841 121.429,79.5376 121.265,81.4463 C120.835,86.4687 119.175,93.7981 113.171,103.396 C105.135,116.242 90.0723,128.281 64.1725,128.281 C41.0305,128.281 24.5652,119.779 14.0745,106.83 C3.83175,94.1866 -7.10542736e-15,78.2036 -7.10542736e-15,64.1092 C-7.10542736e-15,50.0147 3.83155,34.0317 14.0744,21.3884 C24.0327,9.09622 39.3744,0.811764004 60.7001,0.00243821374 C62.6145,-0.0702130963 64.1725,1.49027 64.1725,3.40601 L64.1725,13.8123 C64.1725,15.728 62.6176,17.2712 60.704,17.3608 C44.2594,18.1311 33.9643,24.3893 27.5507,32.306 Z\"></path>\n                    <path d=\"M126.609,43.2966 C126.609,50.9596 120.397,57.1716 112.734,57.1716 C105.071,57.1716 98.8594,50.9596 98.8594,43.2966 C98.8594,35.6337 105.071,29.4216 112.734,29.4216 C120.397,29.4216 126.609,35.6337 126.609,43.2966 Z\" id=\"Path\" fill-rule=\"nonzero\"></path>\n                </g>\n            </g>\n        </g>\n    </svg>";
  }

  if (name === "dismiss") {
    return "<svg width=\"1200pt\" height=\"1200pt\" version=\"1.1\" viewBox=\"0 0 1200 1200\" xmlns=\"http://www.w3.org/2000/svg\">\n    <path d=\"m1089.5 228.38-117.85-117.85-371.62 371.62-371.62-371.62-117.85 117.85 371.62 371.62-371.62 371.62 117.85 117.85 371.62-371.62 371.62 371.62 117.85-117.85-371.62-371.62z\" fill=\"#fff\"/>\n  </svg>";
  }

  if (name === "screenshot") {
    return "<svg width=\"23px\" height=\"20px\" viewBox=\"0 0 23 20\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n    <g stroke=\"none\" stroke-width=\"1\" fill=\"none\" fill-rule=\"evenodd\">\n        <g transform=\"translate(-1172.000000, -570.000000)\" fill=\"#333333\" fill-rule=\"nonzero\">\n            <g transform=\"translate(1155.000000, 558.000000)\">\n                <g transform=\"translate(17.000000, 12.000000)\">\n                    <path d=\"M3.40727379,8.2362507e-05 C3.18136472,8.2362507e-05 2.96469164,0.0879281104 2.80495864,0.244168699 C2.64522565,0.400409287 2.55545534,0.61238707 2.55545534,0.83340698 L2.55545534,5.00003007 C2.55226113,5.22311663 2.6405486,5.43804771 2.80062005,5.59689049 C2.96078009,5.75574217 3.17923631,5.84524345 3.40727379,5.84524345 C3.63531126,5.84524345 3.85376294,5.75574883 4.01392753,5.59689049 C4.17399898,5.43803882 4.26229507,5.22311663 4.25909223,5.00003007 L4.25909223,1.6667316 L7.66636602,1.6667316 C7.8944035,1.66985645 8.11410451,1.5834858 8.27647247,1.42688966 C8.43884951,1.27020686 8.53033708,1.05649354 8.53033708,0.83340698 C8.53033708,0.610320425 8.43885632,0.396611549 8.27647247,0.239924299 C8.11409543,0.0833281585 7.8944035,-0.00305093806 7.66636602,8.2362507e-05 L3.40727379,8.2362507e-05 Z\"></path>\n                    <path d=\"M22.1347863,14.1552677 C21.909143,14.158653 21.6941576,14.2495378 21.5369233,14.4079539 C21.3797798,14.5662856 21.2931897,14.7792167 21.2962789,14.9999699 L21.2962789,18.3332684 L17.8890051,18.3332684 C17.6609677,18.3301435 17.4412666,18.4165142 17.2788987,18.5731103 C17.1165216,18.7297931 17.0250341,18.9435065 17.0250341,19.166593 C17.0250341,19.3896796 17.1165148,19.6033885 17.2788987,19.7600757 C17.4412757,19.9166718 17.6609677,20.0030509 17.8890051,19.9999176 L22.1480974,19.9999176 C22.3740064,19.9999176 22.5906795,19.9120719 22.7504125,19.7558313 C22.9101455,19.5995907 22.9999158,19.3876129 22.9999158,19.166593 L22.9999158,14.9999699 C23.00311,14.7747056 22.9128713,14.5577968 22.7498673,14.3986651 C22.5869565,14.2395512 22.3650498,14.1517121 22.1347863,14.1552677 L22.1347863,14.1552677 Z\"></path>\n                    <path d=\"M22.1347863,7.48867071 C21.909143,7.49205601 21.6941576,7.58294083 21.5369233,7.74135696 C21.3797798,7.89968863 21.2931897,8.11261974 21.2962789,8.33337299 L21.2962789,11.6666715 C21.2930847,11.889758 21.3813722,12.1046891 21.5414436,12.2635319 C21.7016037,12.4223836 21.9200599,12.5118848 22.1480974,12.5118848 C22.3761348,12.5118848 22.5945865,12.4223902 22.7547511,12.2635319 C22.9148226,12.1046802 23.0031186,11.889758 22.9999158,11.6666715 L22.9999158,8.33337299 C23.00311,8.10810868 22.9128713,7.89119983 22.7498673,7.73206816 C22.5869565,7.57295427 22.3650498,7.48511519 22.1347863,7.48867071 L22.1347863,7.48867071 Z\"></path>\n                    <path d=\"M17.8881874,8.2362507e-05 C17.6601499,-0.0030424937 17.4404489,0.0833281585 17.2780809,0.239924299 C17.1157039,0.396607104 17.0242163,0.610320425 17.0242163,0.83340698 C17.0242163,1.05649354 17.1156971,1.27020241 17.2780809,1.42688966 C17.440458,1.5834858 17.6601499,1.6698649 17.8881874,1.6667316 L21.2954612,1.6667316 L21.2954612,5.00003007 C21.292267,5.22311663 21.3805544,5.43804771 21.5406259,5.59689049 C21.7007859,5.75574217 21.9192421,5.84524345 22.1472796,5.84524345 C22.3753171,5.84524345 22.5937688,5.75574883 22.7539334,5.59689049 C22.9140048,5.43803882 23.0023009,5.22311663 22.9990981,5.00003007 L22.9990981,0.83340698 C22.9990981,0.612402625 22.9093028,0.400433731 22.7495948,0.244168699 C22.5898868,0.0879036662 22.3732046,8.2362507e-05 22.1472796,8.2362507e-05 L17.8881874,8.2362507e-05 Z\"></path>\n                    <path d=\"M11.0736398,8.2362507e-05 C10.8456023,-0.0030424937 10.6259013,0.0833281585 10.4635334,0.239924299 C10.3011563,0.396607104 10.2096688,0.610320425 10.2096688,0.83340698 C10.2096688,1.05649354 10.3011495,1.27020241 10.4635334,1.42688966 C10.6259104,1.5834858 10.8456023,1.6698649 11.0736398,1.6667316 L14.4809136,1.6667316 C14.7089511,1.66985645 14.9286521,1.5834858 15.09102,1.42688966 C15.2533971,1.27020686 15.3448847,1.05649354 15.3448847,0.83340698 C15.3448847,0.610320425 15.2534039,0.396611549 15.09102,0.239924299 C14.928643,0.0833281585 14.7089511,-0.00305093806 14.4809136,8.2362507e-05 L11.0736398,8.2362507e-05 Z\"></path>\n                    <path d=\"M5.11091068,7.50000392 C3.70993056,7.50000392 2.55545534,8.62941433 2.55545534,9.99997778 C1.15447522,9.99997778 0,11.1293882 0,12.4999516 L0,17.4998993 C0,18.8704628 1.15447522,19.9998732 2.55545534,19.9998732 L12.7772767,19.9998732 C14.1782568,19.9998732 15.332732,18.8704628 15.332732,17.4998993 L15.332732,12.4999516 C15.332732,11.1293882 14.1782568,9.99997778 12.7772767,9.99997778 C12.7772767,8.62941433 11.6228015,7.50000392 10.2218214,7.50000392 L5.11091068,7.50000392 Z M7.66636602,11.666627 C9.06761872,11.666627 10.2218214,12.7957708 10.2218214,14.1666009 C10.2218214,15.537431 9.06761872,16.6665747 7.66636602,16.6665747 C6.26511332,16.6665747 5.11091068,15.537431 5.11091068,14.1666009 C5.11091068,12.7957708 6.26511332,11.666627 7.66636602,11.666627 Z\"></path>\n                </g>\n            </g>\n        </g>\n    </g>\n</svg>";
  }

  if (name === "pen") {
    return "<svg width=\"1072px\" height=\"1034px\" viewBox=\"0 0 1072 1034\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n    <g stroke=\"none\" stroke-width=\"1\" fill=\"none\" fill-rule=\"evenodd\">\n        <g transform=\"translate(-907.000000, -217.000000)\" fill-rule=\"nonzero\">\n            <g transform=\"translate(907.268457, 217.009827)\">\n                <g transform=\"translate(132.335119, 0.000000)\" fill=\"#000\" class=\"bb-svg-path\">\n                    <path d=\"M20.3764235,730.530173 L10.1884235,720.342173 C-0.791576454,709.362173 -3.16357645,692.432173 4.37592355,678.858173 L83.1809235,537.018173 C71.7589235,502.979173 82.3098335,463.998173 112.254924,440.706173 L655.334924,18.3161733 C689.951924,-8.6058267 739.197924,-5.5388267 770.214924,25.4684733 L913.774924,169.028473 C944.782924,200.040473 947.848924,249.286473 920.927224,283.908473 L498.537224,826.988473 C496.322424,829.836173 493.935624,832.543173 491.384924,835.090073 C467.271924,859.207073 432.513924,866.195073 402.232924,856.063073 L260.382924,934.868073 C246.804924,942.407173 229.874924,940.036073 218.894924,929.055573 L208.706924,918.867573 L20.3764235,730.530173 Z M866.006424,241.190173 C871.393124,234.264373 870.779824,224.417173 864.576724,218.213173 L721.016724,74.6531733 C714.813624,68.4500733 704.965724,67.8367733 698.043724,73.2234733 L154.963724,495.613473 C147.381724,501.507973 146.018424,512.433473 151.912924,520.015473 C152.358234,520.585783 152.834804,521.128773 153.346524,521.636573 L417.586524,785.886573 C424.379524,792.675673 435.391524,792.675673 442.180524,785.886573 C442.692244,785.374853 443.168804,784.831873 443.610224,784.265473 L866.006424,241.190173 Z M342.796424,809.480173 L129.746424,596.430173 L77.9264235,689.707173 L249.516424,861.297173 L342.796424,809.480173 Z\"></path>\n                </g>\n                <g transform=\"translate(-0.000000, 755.530173)\" fill=\"#D50202\">\n                    <path d=\"M124.711543,0 L313.042043,188.3374 L233.288043,268.0914 C222.003043,279.3764 204.483043,281.5324 190.800043,273.3219 L16.8900429,168.9719 C-2.51595711,157.3309 -5.80895711,130.5499 10.1908429,114.5499 L124.711543,0 Z\" class=\"bb-pen-tip\"></path>\n                </g>\n            </g>\n        </g>\n    </g>\n</svg>";
  }

  if (name === "rect") {
    return "<svg width=\"339px\" height=\"241px\" viewBox=\"0 0 339 241\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n    <g stroke=\"none\" stroke-width=\"1\" fill=\"none\" fill-rule=\"evenodd\">\n        <g transform=\"translate(-0.000865, 0.000000)\" fill-rule=\"nonzero\">\n            <g transform=\"translate(0.000865, 0.000000)\" fill=\"#000000\" class=\"bb-svg-path\">\n                <path d=\"M339,0 L339,241 L0,241 L0,0 L339,0 Z M312.826351,26.168387 L26.1855674,26.168387 L26.1855674,214.41156 L312.826351,214.41156 L312.826351,26.168387 Z\"></path>\n            </g>\n            <g transform=\"translate(0.000000, 83.206095)\" fill=\"#D50202\" class=\"bb-pen-tip\">\n                <path d=\"M0,0 L26.186,26.186 L26.1864325,131.205465 L131.204,131.205 L157.792,157.793 L0.000865118243,157.793905 L0,0 Z\"></path>\n            </g>\n        </g>\n    </g>\n</svg>";
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

  return "";
};
var toggleLoading = function toggleLoading(loading) {
  var form = document.querySelector(".bb-feedback-form");
  var loader = document.querySelector(".bb-feedback-dialog-loading--main");
  var next = document.querySelector(".bb-feedback-dialog-header-back");
  var close = document.querySelector(".bb-feedback-dialog-header-close");

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
;// CONCATENATED MODULE: ./src/NetworkInterception.js
function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var GleapNetworkIntercepter = /*#__PURE__*/function () {
  function GleapNetworkIntercepter() {
    _classCallCheck(this, GleapNetworkIntercepter);

    _defineProperty(this, "requestId", 0);

    _defineProperty(this, "requests", {});

    _defineProperty(this, "externalConsoleLogs", []);

    _defineProperty(this, "maxRequests", 10);

    _defineProperty(this, "filters", []);

    _defineProperty(this, "initialized", false);

    _defineProperty(this, "stopped", false);
  }

  _createClass(GleapNetworkIntercepter, [{
    key: "getRequests",
    value: function getRequests() {
      var requests = this.externalConsoleLogs.concat(Object.values(this.requests));

      if (!this.filters || this.filters.length === 0) {
        return requests;
      } // Perform network log filtering.


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
      if (filters) {
        this.filters = filters;
      }
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
    key: "calculateTextSize",
    value: function calculateTextSize(text) {
      var size = new TextEncoder().encode(text).length;
      var kiloBytes = size / 1024;
      var megaBytes = kiloBytes / 1024;
      return megaBytes;
    }
  }, {
    key: "fixPayload",
    value: function fixPayload(payload) {
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
    key: "start",
    value: function start() {
      var _this = this;

      if (this.initialized) {
        return;
      }

      this.initialized = true;
      var self = this;
      this.interceptNetworkRequests({
        onFetch: function onFetch(params, bbRequestId) {
          if (_this.stopped || !bbRequestId || !_this.requests) {
            return;
          }

          if (params.length > 0 && typeof params[0] !== "undefined" && typeof params[0].url !== "undefined") {
            _this.requests[bbRequestId] = {
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
              _this.requests[bbRequestId] = {
                request: {
                  payload: self.fixPayload(params[1].body),
                  headers: params[1].headers
                },
                type: method,
                url: params[0],
                date: new Date()
              };
            } else {
              _this.requests[bbRequestId] = {
                url: params[0],
                date: new Date()
              };
            }
          }

          _this.cleanRequests();
        },
        onFetchLoad: function onFetchLoad(req, bbRequestId) {
          if (_this.stopped || !bbRequestId || !_this.requests || !_this.requests[bbRequestId]) {
            return;
          }

          try {
            _this.requests[bbRequestId]["success"] = true;
            _this.requests[bbRequestId]["response"] = {
              status: req.status,
              statusText: "",
              responseText: "<request_still_open>"
            };

            _this.calcRequestTime(bbRequestId);
          } catch (exp) {}

          req.text().then(function (responseText) {
            _this.requests[bbRequestId]["success"] = true;
            _this.requests[bbRequestId]["response"] = {
              status: req.status,
              statusText: req.statusText,
              responseText: self.calculateTextSize(responseText) > 0.5 ? "<response_too_large>" : responseText
            };

            _this.calcRequestTime(bbRequestId);

            _this.cleanRequests();
          })["catch"](function (err) {
            _this.cleanRequests();
          });
        },
        onFetchFailed: function onFetchFailed(err, bbRequestId) {
          if (_this.stopped || !bbRequestId || !_this.requests || !_this.requests[bbRequestId]) {
            return;
          }

          _this.requests[bbRequestId]["success"] = false;

          _this.calcRequestTime(bbRequestId);

          _this.cleanRequests();
        },
        onOpen: function onOpen(request, args) {
          if (_this.stopped) {
            return;
          }

          if (request && request.bbRequestId && args.length >= 2 && _this.requests) {
            _this.requests[request.bbRequestId] = {
              type: args[0],
              url: args[1],
              date: new Date()
            };
          }

          _this.cleanRequests();
        },
        onSend: function onSend(request, args) {
          if (_this.stopped) {
            return;
          }

          if (request && request.bbRequestId && _this.requests && _this.requests[request.bbRequestId]) {
            _this.requests[request.bbRequestId]["request"] = {
              payload: _this.fixPayload(args.length > 0 ? args[0] : "{}"),
              headers: request.requestHeaders
            };
          }

          _this.cleanRequests();
        },
        onError: function onError(request, args) {
          if (!_this.stopped && _this.requests && request && request.currentTarget && request.currentTarget.bbRequestId && _this.requests[request.currentTarget.bbRequestId]) {
            var target = request.currentTarget;
            _this.requests[target.bbRequestId]["success"] = false;

            _this.calcRequestTime(request.bbRequestId);
          }

          _this.cleanRequests();
        },
        onLoad: function onLoad(request, args) {
          if (_this.stopped) {
            return;
          }

          if (request && request.currentTarget && request.currentTarget.bbRequestId && _this.requests && _this.requests[request.currentTarget.bbRequestId]) {
            var target = request.currentTarget;
            var responseType = target.responseType;
            var responseText = "<" + responseType + ">";

            if (responseType === "" || responseType === "text") {
              responseText = _this.calculateTextSize(target.responseText) > 0.5 ? "<response_too_large>" : target.responseText;
            }

            _this.requests[target.bbRequestId]["success"] = true;
            _this.requests[target.bbRequestId]["response"] = {
              status: target.status,
              statusText: target.statusText,
              responseText: responseText
            };

            _this.calcRequestTime(target.bbRequestId);
          }

          _this.cleanRequests();
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
  }]);

  return GleapNetworkIntercepter;
}();

/* harmony default export */ const NetworkInterception = (GleapNetworkIntercepter);
;// CONCATENATED MODULE: ./src/ReplayConstants.js
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
;// CONCATENATED MODULE: ./src/ReplayRecFrame.js
function ReplayRecFrame_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function ReplayRecFrame_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function ReplayRecFrame_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function ReplayRecFrame_createClass(Constructor, protoProps, staticProps) { if (protoProps) ReplayRecFrame_defineProperties(Constructor.prototype, protoProps); if (staticProps) ReplayRecFrame_defineProperties(Constructor, staticProps); return Constructor; }



var ReplayRecFrame = /*#__PURE__*/function () {
  function ReplayRecFrame(win, node, rec) {
    var _this = this;

    ReplayRecFrame_classCallCheck(this, ReplayRecFrame);

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

      _this.rec.actions.push(ReplayRecFrame_defineProperty({}, key, [Math.round(x), Math.round(y)]));
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

      _this.rec.actions.push(ReplayRecFrame_defineProperty({}, REPLAYREC_MAINSCROLL, [window.scrollX, window.scrollY]));
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

        _this.rec.actions.push(ReplayRecFrame_defineProperty({}, REPLAYREC_INPUT, [id, val]));
      }

      if (id && "type" in event.target && event.target.type === "checkbox") {
        var checked = event.target.checked;

        _this.rec.actions.push(ReplayRecFrame_defineProperty({}, REPLAYREC_INPUTCHECK, [id, checked]));
      }
    };

    this.flushListener = function (event) {
      if (!_this.node.contains(event.target)) {
        return;
      }

      var id = _this.prepEvent(event);

      if (id) {
        _this.rec.actions.push(ReplayRecFrame_defineProperty({}, REPLAYREC_FORCE_STYLE_FLUSH, id));
      }
    };

    this.canvasListener = function (event) {
      if (!_this.node.contains(event.target)) {
        return;
      }

      var id = _this.prepEvent(event);

      if (id) {
        _this.rec.actions.push(ReplayRecFrame_defineProperty({}, REPLAYREC_CANVAS_DATA, [id, event.target.toDataURL(), "didDraw"]));
      }
    };

    this.focusListener = function () {};

    node.ownerDocument.ReplayRecInner = this;
    var initialActions = [];
    var serializedNode = this.rec.serializeNode(this.node, initialActions);

    if (serializedNode) {
      this.initialState = serializedNode;
      this.initialActions = initialActions;
      this.observer = new MutationObserver(rec.observerCallback);
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

  ReplayRecFrame_createClass(ReplayRecFrame, [{
    key: "stop",
    value: function stop() {
      this.flushObserver();
      this.observer.disconnect();
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
      this.rec.observerCallback(this.observer.takeRecords());
    }
  }]);

  return ReplayRecFrame;
}();


;// CONCATENATED MODULE: ./src/ReplayRecorder.js
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = ReplayRecorder_unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function ReplayRecorder_unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return ReplayRecorder_arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return ReplayRecorder_arrayLikeToArray(o, minLen); }

function ReplayRecorder_arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function ReplayRecorder_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function ReplayRecorder_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function ReplayRecorder_createClass(Constructor, protoProps, staticProps) { if (protoProps) ReplayRecorder_defineProperties(Constructor.prototype, protoProps); if (staticProps) ReplayRecorder_defineProperties(Constructor, staticProps); return Constructor; }

function ReplayRecorder_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }






var ReplayRecorder = /*#__PURE__*/function () {
  function ReplayRecorder() {
    var _this = this;

    ReplayRecorder_classCallCheck(this, ReplayRecorder);

    ReplayRecorder_defineProperty(this, "fetchCSSResource", function (url) {
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

    ReplayRecorder_defineProperty(this, "replaceAsync", function (str, regex, asyncFn) {
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

    ReplayRecorder_defineProperty(this, "validateStylesheetResources", function (data, url) {
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

    ReplayRecorder_defineProperty(this, "progressResource", function (data, src, resolve, reject) {
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

    ReplayRecorder_defineProperty(this, "fetchItemResource", function (src) {
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

    this.stopped = false;
    this.startDate = Date.now();
    this.node = document.documentElement;
    this.nextID = 1;
    this.actions = [];
    this.lastActionTime = Date.now();
    this.observerCallback = this.callback.bind(this);
    this.resourcesToResolve = {};
    this.rootFrame = new ReplayRecFrame(window, this.node, this);
    this.evaluateFocus();
    this.result = null;
    this.finalizingResult = false;
  }

  ReplayRecorder_createClass(ReplayRecorder, [{
    key: "isFull",
    value: function isFull() {
      if (this.actions && this.actions.length > 7000) {
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
    key: "stop",
    value: function stop() {
      var _this2 = this;

      var fetchResources = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
      this.stopped = true;

      if (!this.rootFrame) {
        this.rootFrame = null;
        return;
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
      this.rootFrame.stop();
      this.rootFrame = null;
      this.finalizingResult = true;

      if (fetchResources) {
        return this.fetchImageResources().then(function () {
          _this2.cleanupAfterStop(replayResult);
        });
      } else {
        this.cleanupAfterStop(replayResult);
      }
    }
  }, {
    key: "cleanupAfterStop",
    value: function cleanupAfterStop(replayResult) {
      this.cleanupResources();
      this.result = replayResult;
      this.finalizingResult = false;
    }
  }, {
    key: "cleanupResources",
    value: function cleanupResources() {
      var resourceKeys = Object.keys(this.resourcesToResolve);

      for (var i = 0; i < resourceKeys.length; i++) {
        if (this.resourcesToResolve[resourceKeys[i]] === "--") {
          delete this.resourcesToResolve[resourceKeys[i]];
        }
      }
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
            var tag = node.tagName; // eslint-disable-next-line default-case

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
                  if (node.classList.contains("bb-hidden")) {
                    delete node.ReplayRecID;
                    return null;
                  } // In Pernosco all scrollable elements happen to be DIV/INPUT/TEXTAREA


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
    key: "callback",
    value: function callback(records, // eslint-disable-next-line @typescript-eslint/no-unused-vars
    observer) {
      var now = Date.now();

      if (now > this.lastActionTime) {
        var a = {};
        a[REPLAYREC_DELAY] = now - this.lastActionTime;
        this.actions.push(a);
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
                  this.actions.push(_a4);
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

                    this.actions.push(_a5);
                  }

                  break;
                }

              case "characterData":
                {
                  var _a6 = {};

                  if (target.nodeType === Node.TEXT_NODE) {
                    _a6[REPLAYREC_TEXT] = [id, target.data];
                  }

                  this.actions.push(_a6);
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
            this.actions.push(_a3);
          }
        }
      } catch (ex) {
        throw ex;
      }
    }
  }]);

  return ReplayRecorder;
}();


;// CONCATENATED MODULE: ./src/ScreenDrawer.js
function ScreenDrawer_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function ScreenDrawer_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function ScreenDrawer_createClass(Constructor, protoProps, staticProps) { if (protoProps) ScreenDrawer_defineProperties(Constructor.prototype, protoProps); if (staticProps) ScreenDrawer_defineProperties(Constructor, staticProps); return Constructor; }

function ScreenDrawer_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var ScreenDrawer = /*#__PURE__*/function () {
  function ScreenDrawer() {
    ScreenDrawer_classCallCheck(this, ScreenDrawer);

    ScreenDrawer_defineProperty(this, "svgElement", null);

    ScreenDrawer_defineProperty(this, "path", null);

    ScreenDrawer_defineProperty(this, "strPath", void 0);

    ScreenDrawer_defineProperty(this, "strokeWidth", 12);

    ScreenDrawer_defineProperty(this, "strokeWidthRect", 6);

    ScreenDrawer_defineProperty(this, "bufferSize", 4);

    ScreenDrawer_defineProperty(this, "buffer", []);

    ScreenDrawer_defineProperty(this, "startPoint", null);

    ScreenDrawer_defineProperty(this, "tool", "pen");

    ScreenDrawer_defineProperty(this, "color", "#DB4035");

    ScreenDrawer_defineProperty(this, "mouseDown", null);

    ScreenDrawer_defineProperty(this, "mouseMove", null);

    ScreenDrawer_defineProperty(this, "mouseUp", null);

    ScreenDrawer_defineProperty(this, "resizeListener", null);

    var self = this;
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

      if (self.tool === "pen") {
        self.mouseDownPen(e);
      }

      if (self.tool === "rect") {
        self.mouseDownRect(e);
      }
    };

    this.mouseMove = function (e) {
      e.preventDefault();

      if (self.tool === "pen") {
        self.mouseMovePen(e);
      }

      if (self.tool === "rect") {
        self.mouseMoveRect(e);
      }
    };

    this.mouseUp = function (e) {
      e.preventDefault();
      self.fadeInToolbar();

      if (self.tool === "pen") {
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
        this.svgElement.appendChild(this.path);
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
    }
  }, {
    key: "mouseDownPen",
    value: function mouseDownPen(e) {
      this.path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      this.path.setAttribute("fill", "none");
      this.path.setAttribute("stroke", this.color + "AA");
      this.path.setAttribute("stroke-linecap", "round");
      this.path.setAttribute("stroke-width", this.strokeWidth);
      this.buffer = [];
      var pt = this.getMousePosition(e);
      this.appendToBuffer(pt);
      this.strPath = "M" + pt.x + " " + pt.y;
      this.path.setAttribute("d", this.strPath);
      this.svgElement.appendChild(this.path);
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
;// CONCATENATED MODULE: ./src/ScrollStopper.js
function ScrollStopper_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function ScrollStopper_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function ScrollStopper_createClass(Constructor, protoProps, staticProps) { if (protoProps) ScrollStopper_defineProperties(Constructor.prototype, protoProps); if (staticProps) ScrollStopper_defineProperties(Constructor, staticProps); return Constructor; }

function ScrollStopper_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var ScrollStopper = /*#__PURE__*/function () {
  function ScrollStopper() {
    ScrollStopper_classCallCheck(this, ScrollStopper);

    ScrollStopper_defineProperty(this, "keys", {
      37: 1,
      38: 1,
      39: 1,
      40: 1
    });

    ScrollStopper_defineProperty(this, "supportsPassive", false);

    ScrollStopper_defineProperty(this, "wheelOpt", this.supportsPassive ? {
      passive: false
    } : false);

    ScrollStopper_defineProperty(this, "wheelEvent", "onwheel" in document.createElement("div") ? "wheel" : "mousewheel");

    ScrollStopper_defineProperty(this, "scrollDisabled", false);

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

  ScrollStopper_createClass(ScrollStopper, [{
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
    value: // ScrollStopper singleton
    function getInstance() {
      if (!this.instance) {
        this.instance = new ScrollStopper();
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

  return ScrollStopper;
}();

ScrollStopper_defineProperty(ScrollStopper, "instance", void 0);
;// CONCATENATED MODULE: ./src/Session.js
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { Session_defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function Session_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function Session_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function Session_createClass(Constructor, protoProps, staticProps) { if (protoProps) Session_defineProperties(Constructor.prototype, protoProps); if (staticProps) Session_defineProperties(Constructor, staticProps); return Constructor; }

function Session_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }



var Session = /*#__PURE__*/function () {
  function Session() {
    var _this = this;

    Session_classCallCheck(this, Session);

    Session_defineProperty(this, "apiUrl", "https://api.gleap.io");

    Session_defineProperty(this, "widgetUrl", "https://widget.gleap.io");

    Session_defineProperty(this, "sdkKey", null);

    Session_defineProperty(this, "session", {
      gleapId: null,
      gleapHash: null,
      name: "",
      email: ""
    });

    Session_defineProperty(this, "ready", false);

    Session_defineProperty(this, "onSessionReadyListener", []);

    Session_defineProperty(this, "setOnSessionReady", function (onSessionReady) {
      if (_this.ready) {
        onSessionReady();
      } else {
        _this.onSessionReadyListener.push(onSessionReady);
      }
    });

    Session_defineProperty(this, "injectSession", function (http) {
      if (http && _this.session) {
        http.setRequestHeader("Api-Token", _this.sdkKey);
        http.setRequestHeader("Gleap-Id", _this.session.gleapId);
        http.setRequestHeader("Gleap-Hash", _this.session.gleapHash);
      }
    });

    Session_defineProperty(this, "clearSession", function () {
      var renewSession = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;

      try {
        localStorage.removeItem("gleap-id");
        localStorage.removeItem("gleap-hash");
      } catch (exp) {}

      _this.session = {
        id: null,
        hash: null,
        type: null,
        name: "",
        email: ""
      }; // Start guest session.

      if (renewSession) {
        _this.startSession();
      }
    });

    Session_defineProperty(this, "validateSession", function (session) {
      _this.session = session;
      _this.ready = true;
    });

    Session_defineProperty(this, "startSession", function () {
      var self = _this;
      var http = new XMLHttpRequest();
      http.open("POST", self.apiUrl + "/sessions");
      http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      http.setRequestHeader("Api-Token", self.sdkKey);

      try {
        var gleapId = localStorage.getItem("gleap-id");
        var gleapHash = localStorage.getItem("gleap-hash");

        if (gleapId && gleapHash) {
          http.setRequestHeader("Gleap-Id", gleapId);
          http.setRequestHeader("Gleap-Hash", gleapHash);
        }
      } catch (exp) {}

      http.onerror = function (error) {
        self.clearSession(false);
      };

      http.onreadystatechange = function (e) {
        if (http.readyState === XMLHttpRequest.DONE) {
          if (http.status === 200 || http.status === 201) {
            try {
              var sessionData = JSON.parse(http.responseText);

              try {
                localStorage.setItem("gleap-id", sessionData.gleapId);
                localStorage.setItem("gleap-hash", sessionData.gleapHash);
              } catch (exp) {}

              self.validateSession(sessionData); // Session is ready. Notify all subscribers.

              if (self.onSessionReadyListener.length > 0) {
                for (var i = 0; i < self.onSessionReadyListener.length; i++) {
                  self.onSessionReadyListener[i]();
                }
              }

              self.onSessionReadyListener = [];
            } catch (exp) {}
          } else {
            self.clearSession(false);
          }
        }
      };

      http.send(JSON.stringify({}));
    });

    Session_defineProperty(this, "identifySession", function (userId, userData) {
      var self = _this;
      return new Promise(function (resolve, reject) {
        // Wait for gleap session to be ready.
        _this.setOnSessionReady(function () {
          var http = new XMLHttpRequest();
          http.open("POST", self.apiUrl + "/sessions/identify");
          http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
          http.setRequestHeader("Api-Token", self.sdkKey);

          try {
            var gleapId = localStorage.getItem("gleap-id");
            var gleapHash = localStorage.getItem("gleap-hash");

            if (gleapId && gleapHash) {
              http.setRequestHeader("Gleap-Id", gleapId);
              http.setRequestHeader("Gleap-Hash", gleapHash);
            }
          } catch (exp) {}

          http.onerror = function () {
            reject();
          };

          http.onreadystatechange = function (e) {
            if (http.readyState === XMLHttpRequest.DONE) {
              if (http.status === 200 || http.status === 201) {
                try {
                  var sessionData = JSON.parse(http.responseText);

                  try {
                    localStorage.setItem("gleap-id", sessionData.gleapId);
                    localStorage.setItem("gleap-hash", sessionData.gleapHash);
                  } catch (exp) {}

                  self.validateSession(sessionData); // Optionally update UI.

                  var userNameInfo = document.querySelector("#bb-user-name");

                  if (userNameInfo && sessionData.name) {
                    userNameInfo.textContent = sessionData.name;
                  }

                  resolve(sessionData);
                } catch (exp) {
                  reject(exp);
                }
              } else {
                self.clearSession(false);
                reject();
              }
            }
          };

          http.send(JSON.stringify(_objectSpread(_objectSpread({}, userData), {}, {
            userId: userId
          })));
        });
      });
    });
  }

  Session_createClass(Session, null, [{
    key: "getInstance",
    value: // Session singleton
    function getInstance() {
      if (!this.instance) {
        this.instance = new Session();
        return this.instance;
      } else {
        return this.instance;
      }
    }
  }]);

  return Session;
}();

Session_defineProperty(Session, "instance", void 0);


;// CONCATENATED MODULE: ./src/ScreenRecorder.js
function ScreenRecorder_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function ScreenRecorder_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function ScreenRecorder_createClass(Constructor, protoProps, staticProps) { if (protoProps) ScreenRecorder_defineProperties(Constructor.prototype, protoProps); if (staticProps) ScreenRecorder_defineProperties(Constructor, staticProps); return Constructor; }

function ScreenRecorder_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }


var ScreenRecorder = /*#__PURE__*/function () {
  function ScreenRecorder(rerender) {
    var _this = this;

    ScreenRecorder_classCallCheck(this, ScreenRecorder);

    ScreenRecorder_defineProperty(this, "rerender", void 0);

    ScreenRecorder_defineProperty(this, "stream", void 0);

    ScreenRecorder_defineProperty(this, "mediaRecorder", void 0);

    ScreenRecorder_defineProperty(this, "audioMuted", false);

    ScreenRecorder_defineProperty(this, "audioAvailable", true);

    ScreenRecorder_defineProperty(this, "available", true);

    ScreenRecorder_defineProperty(this, "isRecording", false);

    ScreenRecorder_defineProperty(this, "file", null);

    ScreenRecorder_defineProperty(this, "maxRecordTime", 180);

    ScreenRecorder_defineProperty(this, "recordTime", 0);

    ScreenRecorder_defineProperty(this, "recordingTimer", null);

    ScreenRecorder_defineProperty(this, "startScreenRecording", function () {
      var self = this;

      if (!navigator.mediaDevices || this.isRecording) {
        this.available = false;
        this.rerender();
        return;
      }

      navigator.mediaDevices.getDisplayMedia({
        video: true,
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
      })["catch"](function (displayErr) {
        self.rerender();
      });
    });

    ScreenRecorder_defineProperty(this, "stopScreenRecording", function () {
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

    ScreenRecorder_defineProperty(this, "startAudioRecording", function () {
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
        self.rerender();
      });
    });

    ScreenRecorder_defineProperty(this, "toggleAudio", function () {
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

    ScreenRecorder_defineProperty(this, "clearPreview", function () {
      document.querySelector(".bb-capture-preview video").src = null;
      this.file = null;
      this.rerender();
    });

    ScreenRecorder_defineProperty(this, "handleRecord", function (_ref) {
      var stream = _ref.stream,
          _ref$mimeType = _ref.mimeType,
          mimeType = _ref$mimeType === void 0 ? "video/mp4" : _ref$mimeType;
      var self = this;
      var recordedChunks = [];
      this.mediaRecorder = new MediaRecorder(stream);
      this.isRecording = true;
      this.recordTime = 0; // Set timer.

      var timerLabel = document.querySelector(".bb-capture-toolbar-item-timer");
      this.recordingTimer = setInterval(function () {
        self.recordTime++;
        var remainingTime = self.maxRecordTime - self.recordTime;

        if (remainingTime > 0) {
          timerLabel.innerHTML = self.formatTime(remainingTime);
        } else {
          timerLabel.innerHTML = "3:00";
          self.stopScreenRecording();
        }
      }, 1000);

      this.mediaRecorder.ondataavailable = function (e) {
        if (e.data.size > 0) {
          recordedChunks.push(e.data);
        }
      };

      stream.getVideoTracks()[0].onended = function () {
        self.prepareRecording(recordedChunks, mimeType);
      };

      this.mediaRecorder.onstop = function () {
        self.prepareRecording(recordedChunks, mimeType);
      };

      this.mediaRecorder.start(200); // here 200ms is interval of chunk collection

      self.rerender();
    });

    ScreenRecorder_defineProperty(this, "prepareRecording", function (recordedChunks, mimeType) {
      var completeBlob = new Blob(recordedChunks, {
        type: mimeType
      });
      this.file = new File([completeBlob], "screen-recording.mp4", {
        type: "video/mp4"
      });
      document.querySelector(".bb-capture-preview video").src = URL.createObjectURL(completeBlob);
      this.audioAvailable = true;
      this.isRecording = false;
      this.rerender();
    });

    this.rerender = rerender;

    if (!navigator.mediaDevices) {
      this.available = false;
    }

    setTimeout(function () {
      _this.rerender();
    }, 100);
  }

  ScreenRecorder_createClass(ScreenRecorder, [{
    key: "formatTime",
    value: function formatTime(s) {
      return (s - (s %= 60)) / 60 + (9 < s ? ":" : ":0") + s;
    }
  }]);

  return ScreenRecorder;
}();

ScreenRecorder_defineProperty(ScreenRecorder, "uploadScreenRecording", function (screenRecordingData) {
  return new Promise(function (resolve, reject) {
    if (screenRecordingData == null) {
      resolve(null);
    }

    var xhr = new XMLHttpRequest();
    xhr.open("POST", Session.getInstance().apiUrl + "/uploads/sdk");
    Session.getInstance().injectSession(xhr);
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
;// CONCATENATED MODULE: ./src/MarkerManager.js
function MarkerManager_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function MarkerManager_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function MarkerManager_createClass(Constructor, protoProps, staticProps) { if (protoProps) MarkerManager_defineProperties(Constructor.prototype, protoProps); if (staticProps) MarkerManager_defineProperties(Constructor, staticProps); return Constructor; }

function MarkerManager_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }








var MarkerManager = /*#__PURE__*/function () {
  function MarkerManager(type) {
    MarkerManager_classCallCheck(this, MarkerManager);

    MarkerManager_defineProperty(this, "type", "screenshot");

    MarkerManager_defineProperty(this, "dragCursor", null);

    MarkerManager_defineProperty(this, "screenRecorder", null);

    MarkerManager_defineProperty(this, "callback", null);

    MarkerManager_defineProperty(this, "screenDrawer", null);

    MarkerManager_defineProperty(this, "escListener", null);

    MarkerManager_defineProperty(this, "overrideLanguage", src_Gleap.getInstance().overrideLanguage);

    MarkerManager_defineProperty(this, "showNextStep", function () {
      // Adapt the UI
      this.showWidgetUI();

      if (this.callback) {
        this.callback(true);
      }
    });

    this.type = type;
  }

  MarkerManager_createClass(MarkerManager, [{
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
        ScrollStopper.enableScroll();
      } // Unregister ESC listener


      if (this.escListener) {
        document.removeEventListener("keydown", this.escListener);
      } // Cleanup mouse pointer


      this.cleanupMousePointer(); // Remove the toolbar UI

      var dialog = document.querySelector(".bb-capture-toolbar");

      if (dialog) {
        dialog.remove();
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
      bugReportingEditor.innerHTML = "\n          <div class=\"bb-capture-editor-borderlayer\"></div>\n          <svg class=\"bb-capture-svg\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" version=\"1.1\" xml:space=\"preserve\"></svg>\n          <div class=\"bb-capture-mousetool\"></div>\n          <div class=\"bb-capture-dismiss\">".concat(loadIcon("dismiss"), "</div>\n          <div class='bb-capture-editor-drag-info'>").concat(loadIcon("pen"), "</div>\n          <div class=\"bb-capture-toolbar\">\n            ").concat(this.type === "capture" ? "<div class=\"bb-capture-toolbar-item bb-capture-item-rec bb-capture-toolbar-item-recording\" data-type=\"recording\" data-active=\"false\">\n                  ".concat(loadIcon("recorderon"), "\n                  ").concat(loadIcon("recorderoff"), "\n                  <span class=\"bb-tooltip bb-tooltip-screen-recording\"></span>\n                </div>\n                <div class=\"bb-capture-toolbar-item bb-capture-item-rec\" data-type=\"mic\" data-active=\"false\">\n                  ").concat(loadIcon("mic"), "\n                  <span class=\"bb-tooltip bb-tooltip-audio-recording\"></span>\n                </div>\n                <div class=\"bb-capture-toolbar-item-timer bb-capture-item-rec\">3:00</div>\n                <div class=\"bb-capture-toolbar-item-spacer\"></div>") : "", "\n            <div class=\"bb-capture-toolbar-item bb-capture-toolbar-drawingitem bb-capture-toolbar-item-tool bb-capture-toolbar-item--active\" data-type=\"pen\" data-active=\"true\">\n              ").concat(loadIcon("pen"), "\n            </div>\n            <div class=\"bb-capture-toolbar-item bb-capture-toolbar-drawingitem bb-capture-toolbar-item-tool\" data-type=\"rect\" data-active=\"false\">\n              ").concat(loadIcon("rect"), "\n            </div>\n            <div class=\"bb-capture-toolbar-item bb-capture-toolbar-drawingitem\" data-type=\"colorpicker\">\n              <div class=\"bb-capture-toolbar-item-selectedcolor\"></div>\n            </div>\n            ").concat(this.type !== "capture" ? "<div class=\"bb-capture-button-next\">".concat(translateText("Next", this.overrideLanguage), "</div>") : "", "\n          </div>\n          <div class=\"bb-capture-toolbar-item-colorpicker\">\n            <div class=\"bb-capture-toolbar-item-color\" data-color=\"#DB4035\"></div>\n            <div class=\"bb-capture-toolbar-item-color\" data-color=\"#FAD000\"></div>\n            <div class=\"bb-capture-toolbar-item-color\" data-color=\"#7ECC49\"></div>\n            <div class=\"bb-capture-toolbar-item-color\" data-color=\"#158FAD\"></div>\n            <div class=\"bb-capture-toolbar-item-color\" data-color=\"#4073FF\"></div>\n            <div class=\"bb-capture-toolbar-item-color\" data-color=\"#AF38EB\"></div>\n            <div class=\"bb-capture-toolbar-item-color\" data-color=\"#CCCCCC\"></div>\n          </div>\n          <div class=\"bb-capture-preview\">\n            <div class=\"bb-capture-preview-inner\">\n              <video controls muted autoplay></video>\n              <div class=\"bb-capture-preview-buttons\">\n                <div class=\"bb-capture-preview-retrybutton\">").concat(translateText("Retry", this.overrideLanguage), "</div>\n                <div class=\"bb-capture-preview-sendbutton\">").concat(translateText("Next", this.overrideLanguage), "</div>\n              </div>\n            </div>\n          </div>\n        ");
      src_Gleap.appendNode(bugReportingEditor);
    }
  }, {
    key: "registerEscapeListener",
    value: function registerEscapeListener() {
      var self = this;

      this.escListener = function (evt) {
        evt = evt || window.event;
        var isEscape = false;

        if ("key" in evt) {
          isEscape = evt.key === "Escape" || evt.key === "Esc";
        } else {
          isEscape = evt.keyCode === 27;
        }

        if (isEscape) {
          self.dismiss();
        }
      };

      document.addEventListener("keydown", this.escListener);
    }
  }, {
    key: "show",
    value: function show(callback) {
      this.callback = callback;
      var self = this;
      this.registerEscapeListener(); // Hide widget UI

      this.hideWidgetUI(); // Create the editor UI

      this.createEditorUI(); // Setup the mouse pointer

      this.setupMousePointer(); // Setup screenshot data

      if (this.type === "screenshot") {
        // Overwrite snapshot position
        src_Gleap.getInstance().snapshotPosition = {
          x: window.scrollX,
          y: window.scrollY
        }; // Disable scroll

        ScrollStopper.disableScroll();
      } else {
        // Setup screen recording
        this.setupScreenRecording();
      } // Hook up the drawing.


      this.screenDrawer = new ScreenDrawer();
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
            var penTips = document.querySelectorAll(".bb-pen-tip");

            for (var j = 0; j < penTips.length; j++) {
              penTips[j].style.fill = hexColor;
            }
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

      var colorpicker = document.querySelector(".bb-capture-toolbar-item-colorpicker"); // Setup toolbar items

      var toolbarItems = document.querySelectorAll(".bb-capture-toolbar-item");

      var _loop2 = function _loop2() {
        var toolbarItem = toolbarItems[i];

        toolbarItem.onclick = function () {
          var type = toolbarItem.getAttribute("data-type");

          if (colorpicker && type !== "colorpicker") {
            colorpicker.style.display = "none";
          }

          var active = false;

          if (type !== "recording") {
            if (toolbarItem.getAttribute("data-active") === "true") {
              toolbarItem.setAttribute("data-active", "false");
              active = false;
            } else {
              toolbarItem.setAttribute("data-active", "true");
              active = true;
            }
          }

          if (type === "pen" || type === "rect") {
            var toolbarTools = document.querySelectorAll(".bb-capture-toolbar-item-tool");

            for (var j = 0; j < toolbarTools.length; j++) {
              toolbarTools[j].classList.remove("bb-capture-toolbar-item--active");
            }

            toolbarItem.classList.add("bb-capture-toolbar-item--active");
            self.screenDrawer.setTool(type);

            try {
              var svgClone = toolbarItem.querySelector("svg").cloneNode(true);

              if (svgClone && self.dragCursor) {
                self.dragCursor.innerHTML = "";
                self.dragCursor.appendChild(svgClone);
              }
            } catch (exp) {
              console.log(exp);
            }
          }

          if (type === "colorpicker") {
            if (colorpicker.style.display === "flex") {
              colorpicker.style.display = "none";
            } else {
              colorpicker.style.display = "flex";
            }
          }

          if (type === "mic") {
            self.screenRecorder.toggleAudio();
          }

          if (type === "recording") {
            if (self.screenRecorder.isRecording) {
              self.screenRecorder.stopScreenRecording();
            } else {
              self.screenRecorder.startScreenRecording();
            }
          }
        };
      };

      for (var i = 0; i < toolbarItems.length; i++) {
        _loop2();
      }
    }
  }, {
    key: "captureRenderer",
    value: function captureRenderer() {
      if (!this.screenRecorder) {
        return;
      }

      if (this.screenRecorder.file) {
        src_Gleap.getInstance().screenRecordingData = this.screenRecorder.file;
      }

      var nextButton = document.querySelector(".bb-capture-button-next");
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
              toolbarItem.style.opacity = 1;

              if (!this.screenRecorder.audioMuted) {
                toolbarItem.classList.remove("bb-capture-toolbar-item--inactivecross");
                audioRecordingTooltip.innerHTML = translateText("Mute", this.overrideLanguage);
              } else {
                toolbarItem.style.opacity = 1;
                toolbarItem.classList.add("bb-capture-toolbar-item--inactivecross");
                audioRecordingTooltip.innerHTML = translateText("Unmute", this.overrideLanguage);
              }
            } else {
              toolbarItem.style.opacity = 0.3;
              toolbarItem.classList.add("bb-capture-toolbar-item--inactivecross");
              audioRecordingTooltip.innerHTML = translateText("Browser not supported", this.overrideLanguage);
            }

            break;

          case "recording":
            if (this.screenRecorder.available) {
              toolbarItem.style.opacity = 1;

              if (this.screenRecorder.isRecording) {
                toolbarItem.setAttribute("data-active", "true");
                screenRecordingTooltip.innerHTML = translateText("Stop screen recording", this.overrideLanguage);
                timerLabel.style.display = "block";
              } else {
                toolbarItem.setAttribute("data-active", "false");
                screenRecordingTooltip.innerHTML = translateText("Start screen recording", this.overrideLanguage);
                timerLabel.style.display = "none";
              }
            } else {
              // Recording is not available.
              toolbarItem.style.opacity = 0.3;
              screenRecordingTooltip.innerHTML = translateText("Browser not supported", this.overrideLanguage);
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


      this.screenRecorder = new ScreenRecorder(this.captureRenderer.bind(this));
    }
  }]);

  return MarkerManager;
}();


;// CONCATENATED MODULE: ./src/FeedbackForm.js




var formPageClass = "bb-feedback-formpage";

var getTitleHTML = function getTitleHTML(title, overrideLanguage, required) {
  if (title === undefined) {
    return "";
  }

  return "<div class=\"bb-feedback-elementtitle\">".concat(translateText(title, overrideLanguage)).concat(required ? "<span>*</span>" : "", "</div>");
};

var getDescriptionHTML = function getDescriptionHTML(description, overrideLanguage) {
  if (description === undefined || description.length === 0) {
    return "";
  }

  return "<div class=\"bb-feedback-form-description\">".concat(translateText(description, overrideLanguage), "</div>");
};

var getFormPageClass = function getFormPageClass(formPage) {
  if (formPage === undefined) {
    return "";
  }

  return "".concat(formPageClass, " ").concat(formPageClass, "-").concat(formPage);
};

var renderButtonsForPage = function renderButtonsForPage(currentPage, totalPages, overrideLanguage) {
  var lastButton = currentPage === totalPages - 1;
  return "<div class=\"bb-feedback-inputgroup bb-feedback-inputgroup-button ".concat(getFormPageClass(currentPage), "\">\n      <div class=\"bb-feedback-send-button bb-feedback-next-btn-").concat(currentPage, "\" bb-form-page=\"").concat(currentPage, "\">").concat(translateText(lastButton ? "Submit" : "Next", overrideLanguage), "</div>\n    </div>");
};

var isTypeAutoNext = function isTypeAutoNext(type) {
  if (type === "rating" || type === "onetofive") {
    return true;
  }

  return false;
};

var buildForm = function buildForm(feedbackOptions, overrideLanguage) {
  var form = feedbackOptions.form;
  var formHTML = "<div class=\"bb-form-progress\"><div class=\"bb-form-progress-inner\"></div></div>";

  for (var i = 0; i < form.length; i++) {
    var formItem = form[i];

    if (!formItem) {
      break;
    } // Determine current page.


    var currentPage = formItem.page;
    var formItemData = "bb-form-page=\"".concat(currentPage, "\" bb-form-item=\"").concat(encodeURIComponent(JSON.stringify(formItem)), "\"");

    if (formItem.type === "text") {
      formHTML += "<div class=\"bb-feedback-inputgroup ".concat(getFormPageClass(currentPage), "\">\n      ").concat(getDescriptionHTML(formItem.description, overrideLanguage), "\n      ").concat(getTitleHTML(formItem.title, overrideLanguage, formItem.required), "\n          <input class=\"bb-feedback-formdata bb-feedback-").concat(formItem.name, "\" ").concat(formItemData, " type=\"").concat(formItem.inputtype, "\" placeholder=\"").concat(translateText(formItem.placeholder, overrideLanguage), "\" />\n      </div>");
    }

    if (formItem.type === "capture") {
      formHTML += "<div class=\"bb-feedback-inputgroup ".concat(getFormPageClass(currentPage), "\">\n        ").concat(getDescriptionHTML(formItem.description, overrideLanguage), "\n        ").concat(getTitleHTML(formItem.title, overrideLanguage, formItem.required), "\n        <input class=\"bb-feedback-formdata bb-feedback-").concat(formItem.name, "\" ").concat(formItemData, " type=\"hidden\" />\n        <div class=\"bb-feedback-capture-items\">\n        ").concat(formItem.enableScreenshot ? "<div class=\"bb-feedback-capture-item\" data-type=\"screenshot\">\n        ".concat(loadIcon("screenshot"), "\n        <span class=\"bb-item-title\">").concat(translateText(formItem.screenshotTitle, overrideLanguage), "</span>\n        <span class=\"bb-tooltip\">").concat(translateText(formItem.screenshotTooltip, overrideLanguage), "</span>\n      </div>") : "", "\n        ").concat(formItem.enableCapture && typeof navigator !== "undefined" && navigator.mediaDevices ? "<div class=\"bb-feedback-capture-item\" data-type=\"capture\">\n        ".concat(loadIcon("camera"), "\n        <span class=\"bb-item-title\">").concat(translateText(formItem.captureTitle, overrideLanguage), "</span>\n        <span class=\"bb-tooltip\">").concat(translateText(formItem.captureTooltip, overrideLanguage), "</span>\n      </div>") : "", "\n        </div>\n        <div class=\"bb-feedback-capture-item-selected\">\n          <div class=\"bb-feedback-capture-item-selected-button\">\n            <div class=\"bb-feedback-capture-item-selected-icon\"></div>\n            <div class=\"bb-feedback-capture-item-selected-label\"></div>\n            <div class=\"bb-feedback-capture-item-selected-action\">").concat(loadIcon("dismiss"), "</div>\n          </div>\n        </div>\n      </div>");
    }

    if (formItem.type === "upload") {
      var acceptAttribute = "";

      if (formItem.restrictions && formItem.restrictions.length > 0) {
        acceptAttribute = "accept=\"".concat(formItem.restrictions, "\"");
      }

      formHTML += "<div class=\"bb-feedback-inputgroup ".concat(getFormPageClass(currentPage), "\">\n      ").concat(getDescriptionHTML(formItem.description, overrideLanguage), "\n      ").concat(getTitleHTML(formItem.title, overrideLanguage, formItem.required), "\n      <div class=\"bb-feedback-dialog-loading bb-feedback-dialog-loading--").concat(formItem.name, "\">\n        <svg\n          class=\"bb--progress-ring\"\n          width=\"120\"\n          height=\"120\">\n          <circle\n            class=\"bb--progress-ring__circle\"\n            stroke=\"").concat(Gleap.getInstance().mainColor, "\"\n            stroke-width=\"6\"\n            fill=\"transparent\"\n            r=\"34\"\n            cx=\"60\"\n            cy=\"60\"/>\n        </svg>\n      </div>\n      <input class=\"bb-feedback-formdata bb-feedback-").concat(formItem.name, "\" ").concat(formItemData, " type=\"hidden\" />\n        <input class=\"bb-feedback-formdata bb-form-fileupload-").concat(formItem.name, "\" type=\"file\" ").concat(acceptAttribute, " />\n        <span class=\"bb-feedback-filesizeinfo bb-feedback-filesizeinfo-").concat(formItem.name, "\">").concat(translateText("The file you chose exceeds the file size limit of 3MB.", overrideLanguage), "</span>\n      </div>");
    }

    if (formItem.type === "textarea") {
      formHTML += "<div class=\"bb-feedback-inputgroup ".concat(getFormPageClass(currentPage), "\">\n      ").concat(getDescriptionHTML(formItem.description, overrideLanguage), "\n      ").concat(getTitleHTML(formItem.title, overrideLanguage, formItem.required), "\n          <textarea class=\"bb-feedback-formdata bb-feedback-").concat(formItem.name, "\" ").concat(formItemData, " placeholder=\"").concat(translateText(formItem.placeholder, overrideLanguage), "\"></textarea>\n        </div>");
    }

    if (formItem.type === "privacypolicy") {
      formHTML += "<div class=\"bb-feedback-inputgroup bb-feedback-inputgroup--privacy-policy ".concat(getFormPageClass(currentPage), "\">\n        <input id=\"gleap-privacy-policy\" ").concat(formItemData, " class=\"bb-feedback-").concat(formItem.name, "\" type=\"checkbox\" required />\n        <label for=\"gleap-privacy-policy\" class=\"bb-feedback-inputgroup--privacy-policy-label\">").concat(translateText("I read and accept the ", overrideLanguage), "<a id=\"bb-privacy-policy-link\" href=\"").concat(formItem.url, "\" target=\"_blank\">").concat(translateText("privacy policy", overrideLanguage), "</a>.</label>\n      </div>");
    }

    if (formItem.type === "rating") {
      formHTML += "<div class=\"bb-feedback-rating ".concat(getFormPageClass(currentPage), " bb-feedback-rating-").concat(formItem.name, "\" ").concat(formItemData, "\">\n      ").concat(getDescriptionHTML(formItem.description, overrideLanguage), "\n      ").concat(getTitleHTML(formItem.title, overrideLanguage, formItem.required), "\n      <input class=\"bb-feedback-formdata bb-feedback-").concat(formItem.name, "\" ").concat(formItemData, " type=\"hidden\" />\n          <ul class=\"bb-feedback-emojigroup\">\n            <li class=\"bb-feedback-angry\" data-value=\"0\">\n              <div>\n                <svg class=\"bb-feedback-eye bb-feedback-left\">\n                    <use xlink:href=\"#eye\">\n                </svg>\n                <svg class=\"bb-feedback-eye bb-feedback-right\">\n                    <use xlink:href=\"#eye\">\n                </svg>\n                <svg class=\"bb-feedback-mouth\">\n                    <use xlink:href=\"#mouth\">\n                </svg>\n              </div>\n            </li>\n            <li class=\"bb-feedback-sad\" data-value=\"2.5\">\n              <div>\n                <svg class=\"bb-feedback-eye bb-feedback-left\">\n                    <use xlink:href=\"#eye\">\n                </svg>\n                <svg class=\"bb-feedback-eye bb-feedback-right\">\n                    <use xlink:href=\"#eye\">\n                </svg>\n                <svg class=\"bb-feedback-mouth\">\n                    <use xlink:href=\"#mouth\">\n                </svg>\n              </div>\n            </li>\n            <li class=\"bb-feedback-ok\" data-value=\"5\">\n                <div></div>\n            </li>\n            <li class=\"bb-feedback-good\" data-value=\"7.5\">\n              <div>\n                <svg class=\"bb-feedback-eye bb-feedback-left\">\n                    <use xlink:href=\"#eye\">\n                </svg>\n                <svg class=\"bb-feedback-eye bb-feedback-right\">\n                    <use xlink:href=\"#eye\">\n                </svg>\n                <svg class=\"bb-feedback-mouth\">\n                    <use xlink:href=\"#mouth\">\n                </svg>\n              </div>\n            </li>\n            <li class=\"bb-feedback-happy\" data-value=\"10\">\n              <div>\n                <svg class=\"bb-feedback-eye bb-feedback-left\">\n                    <use xlink:href=\"#eye\">\n                </svg>\n                <svg class=\"bb-feedback-eye bb-feedback-right\">\n                    <use xlink:href=\"#eye\">\n                </svg>\n              </div>\n          </li>\n        </ul>\n        <svg xmlns=\"http://www.w3.org/2000/svg\" style=\"display: none;\">\n            <symbol xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 7 4\" id=\"eye\">\n                <path d=\"M1,1 C1.83333333,2.16666667 2.66666667,2.75 3.5,2.75 C4.33333333,2.75 5.16666667,2.16666667 6,1\"></path>\n            </symbol>\n            <symbol xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 18 7\" id=\"mouth\">\n                <path d=\"M1,5.5 C3.66666667,2.5 6.33333333,1 9,1 C11.6666667,1 14.3333333,2.5 17,5.5\"></path>\n            </symbol>\n        </svg>\n        </div>");
    }

    if (formItem.type === "onetofive") {
      var getNumberButtonHTML = function getNumberButtonHTML(formItem, number) {
        return "<div class=\"bb-feedback-onetofive-button\" data-value=\"".concat(number, "\">").concat(number, "</div>");
      };

      formHTML += "<div class=\"bb-feedback-onetofive ".concat(getFormPageClass(currentPage), " bb-feedback-onetofive-").concat(formItem.name, "\" ").concat(formItemData, "\">\n      ").concat(getDescriptionHTML(formItem.description, overrideLanguage), "\n      ").concat(getTitleHTML(formItem.title, overrideLanguage, formItem.required), "\n      <input class=\"bb-feedback-formdata bb-feedback-").concat(formItem.name, "\" ").concat(formItemData, " type=\"hidden\" />\n        <div class=\"bb-feedback-onetofive-buttons\">\n          ").concat(getNumberButtonHTML(formItem, 1), "\n          ").concat(getNumberButtonHTML(formItem, 2), "\n          ").concat(getNumberButtonHTML(formItem, 3), "\n          ").concat(getNumberButtonHTML(formItem, 4), "\n          ").concat(getNumberButtonHTML(formItem, 5), "\n        </div>\n        <div class=\"bb-feedback-onetofive-description\"><span>").concat(translateText(formItem.lowestValueLabel, overrideLanguage), "</span><span>").concat(translateText(formItem.highestValueLabel, overrideLanguage), "</span></div>\n      </div>");
    }

    if (formItem.type === "multiplechoice" && formItem.choices && formItem.choices.length > 0) {
      var getOptionHTML = function getOptionHTML(formItem, value) {
        return "<label class=\"bb-feedback-multiplechoice-container\" data-value=\"".concat(value, "\">").concat(value, "\n        <input type=\"radio\" name=\"").concat(formItem.name, "\" />\n        <span class=\"bb-feedback-multiplechoice-checkmark\"></span>\n      </label>");
      };

      var optionHTML = "";

      for (var j = 0; j < formItem.choices.length; j++) {
        optionHTML += getOptionHTML(formItem, formItem.choices[j]);
      }

      formHTML += "<div class=\"bb-feedback-multiplechoice ".concat(getFormPageClass(currentPage), " bb-feedback-multiplechoice-").concat(formItem.name, "\" ").concat(formItemData, ">\n      ").concat(getDescriptionHTML(formItem.description, overrideLanguage), "\n      ").concat(getTitleHTML(formItem.title, overrideLanguage, formItem.required), "\n      <input class=\"bb-feedback-formdata bb-feedback-").concat(formItem.name, "\" ").concat(formItemData, " type=\"hidden\" />\n      ").concat(optionHTML, "\n      </div>");
    }

    if ((form[i + 1] && form[i + 1].page !== currentPage || i + 1 === form.length) && !isTypeAutoNext(formItem.type)) {
      formHTML += renderButtonsForPage(currentPage, feedbackOptions.pages, overrideLanguage);
    }
  }

  return formHTML;
};
var getFormData = function getFormData(form) {
  var formData = {};

  for (var i = 0; i < form.length; i++) {
    var formItem = form[i];
    var formElement = document.querySelector(".bb-feedback-".concat(formItem.name));

    if (formElement && formElement.value) {
      formData[formItem.name] = formElement.value;
    }
  }

  return formData;
};
var rememberForm = function rememberForm(form) {
  for (var i = 0; i < form.length; i++) {
    var formItem = form[i];

    if (formItem.remember) {
      var formElement = document.querySelector(".bb-feedback-".concat(formItem.name));

      if (formElement && formElement.value) {
        try {
          localStorage.setItem("bb-remember-".concat(formItem.name), formElement.value);
        } catch (exp) {}
      }
    }
  }
};

var validateEmail = function validateEmail(email) {
  var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
};

var validateFormItem = function validateFormItem(formItem) {
  var shouldShowError = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
  var valid = true;
  var formElement = document.querySelector(".bb-feedback-".concat(formItem.name));

  if (!formElement) {
    return false;
  }

  var formElementDirtyFlag = formElement.getAttribute("bb-dirty");
  var showError = shouldShowError && formElementDirtyFlag === "true";

  if ((formItem.type === "text" || formItem.type === "textarea") && formItem.required) {
    if (!formElement.value || formElement.value === "") {
      showError && formElement.classList.add("bb-feedback-required");
      valid = false;
    } else {
      formElement.classList.remove("bb-feedback-required");
    }
  }

  if (formItem.type === "text" && formItem.inputtype === "email" && formItem.required) {
    if (!validateEmail(formElement.value)) {
      showError && formElement.classList.add("bb-feedback-required");
      valid = false;
    } else {
      formElement.classList.remove("bb-feedback-required");
    }
  }

  if (formItem.type === "upload" && formItem.required) {
    if (!formElement.value || formElement.value === "") {
      showError && formElement.parentElement.classList.add("bb-feedback-required");
      valid = false;
    } else {
      formElement.parentElement.classList.remove("bb-feedback-required");
    }
  }

  if (formItem.type === "rating" && formItem.required) {
    if (!formElement.value || formElement.value === "") {
      showError && formElement.parentElement.classList.add("bb-feedback-required");
      valid = false;
    } else {
      formElement.parentElement.classList.remove("bb-feedback-required");
    }
  }

  if (formItem.type === "onetofive" && formItem.required) {
    if (!formElement.value || formElement.value === "") {
      showError && formElement.parentElement.classList.add("bb-feedback-required");
      valid = false;
    } else {
      formElement.parentElement.classList.remove("bb-feedback-required");
    }
  }

  if (formItem.type === "multiplechoice" && formItem.required) {
    if (!formElement.value || formElement.value === "") {
      showError && formElement.parentElement.classList.add("bb-feedback-required");
      valid = false;
    } else {
      formElement.parentElement.classList.remove("bb-feedback-required");
    }
  }

  if (formItem.type === "privacypolicy" && formItem.required) {
    if (!formElement.checked) {
      showError && formElement.parentElement.classList.add("bb-feedback-required");
      valid = false;
    } else {
      formElement.parentElement.classList.remove("bb-feedback-required");
    }
  }

  return valid;
};

var updateFormProgressBar = function updateFormProgressBar(currentPage, pages) {
  var innerProgressBar = document.querySelector(".bb-form-progress-inner");

  if (innerProgressBar && pages > 0) {
    var progress = Math.round((currentPage + 1) / pages * 100);

    if (progress > 100) {
      progress = 100;
    }

    innerProgressBar.style.width = "".concat(progress, "%");
  }
};

var handleNextFormStep = function handleNextFormStep(currentPage, pages, submitForm) {
  if (!validateFormPage(currentPage)) {
    return;
  }

  updateFormProgressBar(currentPage + 1, pages);

  if (currentPage === pages - 1) {
    submitForm();
  } else {
    showFormPage(currentPage + 1);
  }
};

var showFormPage = function showFormPage(pageToShow) {
  var formPagesToHide = document.querySelectorAll(".".concat(formPageClass));

  for (var i = 0; i < formPagesToHide.length; i++) {
    if (formPagesToHide[i]) {
      formPagesToHide[i].style.display = "none";
    }
  }

  var formPagesToShow = document.querySelectorAll(".".concat(formPageClass, "-").concat(pageToShow));

  for (var i = 0; i < formPagesToShow.length; i++) {
    if (formPagesToShow[i]) {
      formPagesToShow[i].style.display = "flex";
    }
  }
};

var addDirtyFlagToFormElement = function addDirtyFlagToFormElement(formElement) {
  formElement.setAttribute("bb-dirty", "true");
};

var hookForm = function hookForm(formOptions, submitForm, overrideLanguage) {
  var form = formOptions.form;
  var singlePageForm = formOptions.singlePageForm; // Hook up submit buttons

  var sendButtons = document.querySelectorAll(".bb-feedback-send-button");

  var _loop = function _loop() {
    var sendButton = sendButtons[i];

    sendButton.onclick = function () {
      if (sendButton && sendButton.getAttribute("disabled") !== "true" && sendButton.getAttribute("bb-form-page")) {
        var currentPage = parseInt(sendButton.getAttribute("bb-form-page"));
        handleNextFormStep(currentPage, formOptions.pages, submitForm);
      }
    };
  };

  for (var i = 0; i < sendButtons.length; i++) {
    _loop();
  } // Hook up form


  var _loop2 = function _loop2() {
    var formItem = form[i];

    if (!formItem) {
      return "break";
    }

    var formInput = document.querySelector(".bb-feedback-".concat(formItem.name));

    if (!formInput) {
      return "break";
    }

    var currentPage = parseInt(formInput.getAttribute("bb-form-page"));

    if (formItem.type === "text") {
      if (formItem.remember) {
        try {
          var rememberedValue = localStorage.getItem("bb-remember-".concat(formItem.name));

          if (rememberedValue) {
            formInput.value = rememberedValue;
          }
        } catch (exp) {}
      }

      if (formItem.defaultValue) {
        formInput.value = formItem.defaultValue;
      }

      if (formItem.defaultValue && formItem.hideOnDefaultSet) {
        formInput.parentElement.classList.add("bb-feedback-form--hidden");
      }

      formInput.addEventListener("focusin", function () {
        addDirtyFlagToFormElement(formInput);
      });
      formInput.addEventListener("focusout", function () {
        validateFormPage(currentPage);
      });

      formInput.oninput = function () {
        validateFormPage(currentPage, false);
      };
    }

    if (formItem.type === "privacypolicy") {
      formInput.onchange = function () {
        addDirtyFlagToFormElement(formInput);
        validateFormPage(currentPage);
      };
    }

    if (formItem.type === "capture") {
      (function () {
        var captureItemsContainer = document.querySelector(".bb-feedback-capture-items");
        var captureItems = document.querySelectorAll(".bb-feedback-capture-item");
        var selectedItem = document.querySelector(".bb-feedback-capture-item-selected");
        var selectedItemLabel = document.querySelector(".bb-feedback-capture-item-selected-label");
        var selectedItemIcon = document.querySelector(".bb-feedback-capture-item-selected-icon");
        var selectedItemAction = document.querySelector(".bb-feedback-capture-item-selected-action");

        var _loop3 = function _loop3() {
          var captureItem = captureItems[j];
          var type = captureItem.getAttribute("data-type");

          captureItem.onclick = function () {
            var manager = new MarkerManager(type);
            manager.show(function (success) {
              if (!success) {
                manager.clear();
              } else {
                var actionLabel = "";

                if (type === "screenshot") {
                  actionLabel = translateText("Screenshot", overrideLanguage);
                } else {
                  actionLabel = translateText("Screen recording", overrideLanguage);
                }

                selectedItemLabel.innerHTML = actionLabel;
                selectedItemIcon.innerHTML = type === "screenshot" ? loadIcon("screenshot") : loadIcon("camera");
                captureItemsContainer.style.display = "none";
                selectedItem.style.display = "flex";

                selectedItemAction.onclick = function () {
                  manager.clear();
                  captureItemsContainer.style.display = "flex";
                  selectedItem.style.display = "none"; // asdf
                };
              }
            });
          };
        };

        for (j = 0; j < captureItems.length; j++) {
          _loop3();
        }
      })();
    }

    if (formItem.type === "upload") {
      var formFileUploadInput = document.querySelector(".bb-form-fileupload-".concat(formItem.name));
      var fileSizeInfo = document.querySelector(".bb-feedback-filesizeinfo-".concat(formItem.name));

      if (formFileUploadInput) {
        formFileUploadInput.addEventListener("change", function () {
          addDirtyFlagToFormElement(formInput);
          validateFormPage(currentPage);

          if (fileSizeInfo) {
            fileSizeInfo.style.display = "none";
          }

          if (formFileUploadInput.files && formFileUploadInput.files.length > 0) {
            var file = formFileUploadInput.files[0];

            if (file.size / 1024 / 1024 > 3) {
              if (fileSizeInfo) {
                fileSizeInfo.style.display = "block";
              }

              return;
            }

            var formData = new FormData();
            formData.append("file", file);
            var uploadLoader = document.querySelector(".bb-feedback-dialog-loading--".concat(formItem.name));

            if (uploadLoader) {
              uploadLoader.style.display = "flex";
              formFileUploadInput.style.display = "none";
            }

            var xhr = new XMLHttpRequest();
            xhr.open("POST", Session.getInstance().apiUrl + "/uploads/attachments");
            Session.getInstance().injectSession(xhr);

            xhr.upload.onprogress = function (e) {
              if (e.lengthComputable) {
                var percentComplete = parseInt(e.loaded / e.total * 100);
                setLoadingIndicatorProgress(percentComplete, formItem.name);
              }
            };

            xhr.onerror = function () {
              if (uploadLoader) {
                uploadLoader.style.display = "none";
              }

              formFileUploadInput.style.display = "block";
            };

            xhr.onreadystatechange = function () {
              if (xhr.readyState == 4 && xhr.status == 200 && xhr.responseText) {
                try {
                  var data = JSON.parse(xhr.responseText);

                  if (data.fileUrls && data.fileUrls.length > 0) {
                    formInput.value = data.fileUrls[0];

                    if (!singlePageForm) {
                      handleNextFormStep(currentPage, formOptions.pages, submitForm);
                    }
                  }
                } catch (exp) {}

                if (uploadLoader) {
                  uploadLoader.style.display = "none";
                }

                formFileUploadInput.style.display = "block";
              }
            };

            xhr.send(formData);
          }
        });
      }
    }

    if (formItem.type === "textarea") {
      formInput.style.height = "inherit";
      formInput.style.height = formInput.scrollHeight + "px";
      formInput.addEventListener("focusin", function () {
        addDirtyFlagToFormElement(formInput);
      });

      formInput.oninput = function () {
        formInput.style.height = "inherit";
        formInput.style.height = formInput.scrollHeight + "px";
        validateFormPage(currentPage);
      };
    }

    if (formItem.type === "rating") {
      var ratingItems = document.querySelectorAll(".bb-feedback-rating-".concat(formItem.name, " .bb-feedback-emojigroup li"));

      var _loop4 = function _loop4() {
        var ratingItem = ratingItems[j];
        ratingItem.addEventListener("click", function (e) {
          if (!ratingItem) {
            return;
          }

          formInput.value = ratingItem.getAttribute("data-value");
          validateFormPage(currentPage);
          var lastActiveItem = document.querySelector(".bb-feedback-rating-".concat(formItem.name, " .bb-feedback-emojigroup li.bb-feedback-active"));

          if (lastActiveItem) {
            lastActiveItem.classList.remove("bb-feedback-active");
          }

          ratingItem.classList.add("bb-feedback-active");
          e.preventDefault();

          if (!singlePageForm) {
            handleNextFormStep(currentPage, formOptions.pages, submitForm);
          }
        });
      };

      for (j = 0; j < ratingItems.length; j++) {
        _loop4();
      }
    }

    if (formItem.type === "onetofive") {
      var onetofiveItems = document.querySelectorAll(".bb-feedback-onetofive-".concat(formItem.name, " .bb-feedback-onetofive-button"));

      var _loop5 = function _loop5() {
        var onetofiveItem = onetofiveItems[j];
        onetofiveItem.addEventListener("click", function (e) {
          if (!onetofiveItem) {
            return;
          }

          formInput.value = onetofiveItem.getAttribute("data-value");
          validateFormPage(currentPage);
          var lastActiveItem = document.querySelector(".bb-feedback-onetofive-".concat(formItem.name, " .bb-feedback-onetofive-button-active"));

          if (lastActiveItem) {
            lastActiveItem.classList.remove("bb-feedback-onetofive-button-active");
          }

          onetofiveItem.classList.add("bb-feedback-onetofive-button-active");
          e.preventDefault();

          if (!singlePageForm) {
            handleNextFormStep(currentPage, formOptions.pages, submitForm);
          }
        });
      };

      for (j = 0; j < onetofiveItems.length; j++) {
        _loop5();
      }
    }

    if (formItem.type === "multiplechoice") {
      var multiplechoiceItems = document.querySelectorAll(".bb-feedback-multiplechoice-".concat(formItem.name, " .bb-feedback-multiplechoice-container"));

      var _loop6 = function _loop6() {
        var multiplechoiceItem = multiplechoiceItems[j];
        multiplechoiceItem.addEventListener("click", function (e) {
          if (!multiplechoiceItem) {
            return;
          }

          formInput.value = multiplechoiceItem.getAttribute("data-value");
          validateFormPage(currentPage);
        });
      };

      for (j = 0; j < multiplechoiceItems.length; j++) {
        _loop6();
      }
    } // Validate form item initially.


    validateFormPage(currentPage, false);
  };

  for (var i = 0; i < form.length; i++) {
    var j;
    var j;
    var j;
    var j;

    var _ret = _loop2();

    if (_ret === "break") break;
  } // Show first page.


  showFormPage(0);
  updateFormProgressBar(0, formOptions.pages);
};
var validateFormPage = function validateFormPage(page) {
  var showError = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
  var formValid = true;
  var formElementsToCheck = document.querySelectorAll("[bb-form-page=\"".concat(page, "\"]"));

  for (var i = 0; i < formElementsToCheck.length; i++) {
    var formElementToCheck = formElementsToCheck[i];

    if (formElementToCheck && formElementToCheck.getAttribute("bb-form-item")) {
      var formItem = JSON.parse(decodeURIComponent(formElementToCheck.getAttribute("bb-form-item")));

      if (!validateFormItem(formItem, showError)) {
        formValid = false;
      }
    }
  }

  var currentNextButton = document.querySelector(".bb-feedback-next-btn-".concat(page));

  if (currentNextButton) {
    if (!formValid) {
      currentNextButton.setAttribute("disabled", "true");
      currentNextButton.classList.add("bb-feedback-send-button--disabled");
    } else {
      currentNextButton.removeAttribute("disabled");
      currentNextButton.classList.remove("bb-feedback-send-button--disabled");
    }
  }

  return formValid;
};
;// CONCATENATED MODULE: ./src/UXDetectors.js
var getSelectorFromTarget = function getSelectorFromTarget(target) {
  var className = target.className !== "" ? "." + target.className : "";
  var targetId = target.id !== "" ? "#" + target.id : "";
  return [target.nodeName, className, targetId].join(" ");
};

var detectRageClicks = function detectRageClicks(subscribe, options) {
  var interval = options.interval,
      limit = options.limit;
  var count = 1;
  var countClear = setInterval(function () {
    count = 1;
  }, interval);

  var listener = function listener(event) {
    if (count === limit) {
      subscribe(getSelectorFromTarget(event.target), function () {
        clearInterval(countClear);
        document.removeEventListener("click", listener);
      });
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
;// CONCATENATED MODULE: ./src/DrawingCanvas.js


var createScreenshotEditor = function createScreenshotEditor(screenshot, onDone, onCancel, overrideLanguage, showBack) {
  var elem = document.createElement("div");
  elem.className = "bb-feedback-dialog-container";
  elem.innerHTML = "<div class='bb-feedback-dialog bb-feedback-dialog-drawing bb-anim-fadeinright'>\n    <div class=\"bb-feedback-dialog-header bb-feedback-dialog-header--back\">\n      <div class=\"bb-feedback-dialog-header-back ".concat(!showBack && "bb-feedback-dialog-header-back--close", "\">\n        ").concat(loadIcon(showBack ? "arrowleft" : "close", "#fff"), "\n      </div>\n      <div class=\"bb-feedback-dialog-header-text\">\n          <div class=\"bb-feedback-dialog-header-title-small\">").concat(translateText("Mark the bug", overrideLanguage), "</div>\n      </div>\n      <div class=\"bb-feedback-dialog-header-next\">\n        <span>").concat(translateText("Next", overrideLanguage), "</span>\n        ").concat(loadIcon("arrowleft", "#000"), "\n      </div>\n    </div>\n    <div class=\"bb-feedback-dialog-body\">\n        <div class=\"bb-screenshot-editor-canv\">\n            <canvas id=\"bb-screenshot-editor-canvas\" />\n        </div>\n        <div class=\"bb-drawing-container\">\n            <div class=\"bb-drawing-tools\">\n              <div class=\"bb-drawing-tool-item bb-drawing-tool-item--active\" data-tool=\"pen\">\n                <svg width=\"60px\" height=\"60px\" viewBox=\"0 0 60 60\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n                  <g stroke=\"none\" stroke-width=\"1\" fill=\"none\" fill-rule=\"evenodd\">\n                      <g transform=\"translate(0.000263, -0.000166)\" fill=\"#000000\" fill-rule=\"nonzero\">\n                          <path d=\"M45.5117372,6.58111838e-05 C41.6679372,-0.0115531888 37.9805372,1.51576581 35.2697372,4.23846581 L4.1017372,35.4104658 C1.4650372,38.0315658 -0.0115628024,41.5940658 6.81945382e-05,45.3088658 L6.81945382e-05,59.999935 L14.6911372,59.999935 C18.4059372,60.0115848 21.9684372,58.5350658 24.5895372,55.8982658 L55.7615372,24.7302658 C58.4763372,22.0114658 59.9998372,18.3279658 59.9998372,14.4842658 C59.9959312,10.6444658 58.4686372,6.96086581 55.7537372,4.24226581 C53.0349372,1.52746581 49.3514372,6.58111838e-05 45.5117372,6.58111838e-05 L45.5117372,6.58111838e-05 Z M20.3397372,51.6601658 C18.8397372,53.1562658 16.8085372,53.9999658 14.6913372,53.9999658 L5.9999372,53.9999658 L5.9999372,45.3085658 C5.9999372,43.1874658 6.8397772,41.1523658 8.3397372,39.6483658 L31.8787372,16.1213658 L43.8787372,28.1213658 L20.3397372,51.6601658 Z M51.5117372,20.4881658 L48.1211372,23.8787658 L36.1211372,11.8787658 L39.5117372,8.48816581 C41.0820372,6.80846581 43.2695372,5.83976581 45.5703372,5.80066581 C47.8672372,5.76160381 50.0859372,6.66004581 51.7148372,8.28506581 C53.3398372,9.91396581 54.2382372,12.1327658 54.1992372,14.4295658 C54.1601742,16.7303658 53.1914372,18.9178658 51.5117372,20.4881658 L51.5117372,20.4881658 Z\" id=\"Shape\"></path>\n                      </g>\n                  </g>\n                </svg>\n              </div>\n              <div class=\"bb-drawing-tool-item bb-drawing-tool-item--last\" data-tool=\"blur\">\n                <svg width=\"100pt\" height=\"100pt\" version=\"1.1\" viewBox=\"0 0 100 100\" xmlns=\"http://www.w3.org/2000/svg\">\n                  <path d=\"m86.5 42.5c-1.1016 0-2-0.89844-2-2s0.89844-2 2-2 2 0.89844 2 2-0.89844 2-2 2zm-10 38c-2.1992 0-4-1.8008-4-4s1.8008-4 4-4 4 1.8008 4 4-1.8008 4-4 4zm0-18c-2.1992 0-4-1.8008-4-4s1.8008-4 4-4 4 1.8008 4 4-1.8008 4-4 4zm0-18c-2.1992 0-4-1.8008-4-4s1.8008-4 4-4 4 1.8008 4 4-1.8008 4-4 4zm0-18c-2.1992 0-4-1.8008-4-4s1.8008-4 4-4 4 1.8008 4 4-1.8008 4-4 4zm-27 40c-9.3984 0-17-7.6016-17-17s7.6016-17 17-17 17 7.6016 17 17-7.6016 17-17 17zm9-40c-2.1992 0-4-1.8008-4-4s1.8008-4 4-4 4 1.8008 4 4-1.8008 4-4 4zm0-12c-1.1016 0-2-0.89844-2-2s0.89844-2 2-2 2 0.89844 2 2-0.89844 2-2 2zm-18 12c-2.1992 0-4-1.8008-4-4s1.8008-4 4-4 4 1.8008 4 4-1.8008 4-4 4zm0-12c-1.1016 0-2-0.89844-2-2s0.89844-2 2-2 2 0.89844 2 2-0.89844 2-2 2zm-18 66c-2.1992 0-4-1.8008-4-4s1.8008-4 4-4 4 1.8008 4 4-1.8008 4-4 4zm0-18c-2.1992 0-4-1.8008-4-4s1.8008-4 4-4 4 1.8008 4 4-1.8008 4-4 4zm0-18c-2.1992 0-4-1.8008-4-4s1.8008-4 4-4 4 1.8008 4 4-1.8008 4-4 4zm0-18c-2.1992 0-4-1.8008-4-4s1.8008-4 4-4 4 1.8008 4 4-1.8008 4-4 4zm-10 34c-1.1016 0-2-0.89844-2-2s0.89844-2 2-2 2 0.89844 2 2-0.89844 2-2 2zm0-18c-1.1016 0-2-0.89844-2-2s0.89844-2 2-2 2 0.89844 2 2-0.89844 2-2 2zm28 30c2.1992 0 4 1.8008 4 4s-1.8008 4-4 4-4-1.8008-4-4 1.8008-4 4-4zm0 12c1.1016 0 2 0.89844 2 2s-0.89844 2-2 2-2-0.89844-2-2 0.89844-2 2-2zm18-12c2.1992 0 4 1.8008 4 4s-1.8008 4-4 4-4-1.8008-4-4 1.8008-4 4-4zm0 12c1.1016 0 2 0.89844 2 2s-0.89844 2-2 2-2-0.89844-2-2 0.89844-2 2-2zm28-28c1.1016 0 2 0.89844 2 2s-0.89844 2-2 2-2-0.89844-2-2 0.89844-2 2-2z\" fill-rule=\"evenodd\"/>\n                </svg>\n              </div>\n              <div class=\"bb-drawing-tool-spacer\"></div>\n              <div id=\"bb-drawing-color\" style=\"background-color: #EB144C\">\n                <div id=\"bb-drawing-colorpopup\">\n                  <div class=\"bb-drawing-coloritem bb-drawing-coloritem--active\" data-color=\"#EB144C\"></div>\n                  <div class=\"bb-drawing-coloritem\" data-color=\"#FF6705\"></div>\n                  <div class=\"bb-drawing-coloritem\" data-color=\"#FDB903\"></div>\n                  <div class=\"bb-drawing-coloritem\" data-color=\"#9900EE\"></div>\n                  <div class=\"bb-drawing-coloritem\" data-color=\"#00D082\"></div>\n                  <div class=\"bb-drawing-coloritem\" data-color=\"#0A93E4\"></div>\n                </div>\n              </div>\n              <div class=\"bb-drawing-tool-spacer\"></div>\n              <div class=\"bb-drawing-tool-action bb-drawing-tool-action--disabled bb-drawing-tool-back\">\n                <svg width=\"62px\" height=\"60px\" viewBox=\"0 0 62 60\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n                  <g stroke=\"none\" stroke-width=\"1\" fill=\"none\" fill-rule=\"evenodd\">\n                    <g transform=\"translate(-0.000500, 0.001926)\" fill=\"#000000\" fill-rule=\"nonzero\">\n                      <path d=\"M28.0005,51.6270739 C24.9653,51.0684839 22.0825,49.8731739 19.5396,48.1192739 L13.8208,53.8380739 C17.9536,57.0060739 22.8403,59.0333739 28.0008,59.7286739 L28.0005,51.6270739 Z\" id=\"Path\"></path>\n                      <path d=\"M2.2705,33.9980739 C2.96581,39.1582739 4.9932,44.0450739 8.1611,48.1780739 L13.8799,42.4592739 C12.126,39.9162739 10.9307,37.0334739 10.3721,33.9983739 L2.2705,33.9980739 Z\" id=\"Path\"></path>\n                      <path d=\"M61.7305,33.9980739 L53.6289,33.9980739 C53.07031,37.0332739 51.875,39.9160739 50.1211,42.4589739 L55.8399,48.1777739 C59.0079,44.0449739 61.0352,39.1582739 61.7305,33.9977739 L61.7305,33.9980739 Z\" id=\"Path\"></path>\n                      <path d=\"M4.0005,24.9980739 L24.0005,24.9980739 L24.0005,16.9980739 L14.27,16.9980739 C17.6762,12.3613739 22.7622,9.24417393 28.442,8.31057393 C34.1178,7.38088393 39.934,8.70901393 44.645,12.0175739 C49.352,15.3222739 52.5786,20.3417739 53.6294,25.9975739 L61.731,25.9975739 C60.6646,18.0834739 56.4888,10.9235739 50.129,6.09957393 C43.7657,1.27147393 35.746,-0.818426068 27.836,0.290973932 C19.9298,1.39647393 12.793,5.61127393 8,11.9979739 L8,0.997973932 L-3.55271368e-15,0.997973932 L-3.55271368e-15,20.9979739 C-3.55271368e-15,22.0604739 0.42188,23.0760739 1.1719,23.8260739 C1.92192,24.5760739 2.9375,24.9979739 4,24.9979739 L4.0005,24.9980739 Z\" id=\"Path\"></path>\n                      <path d=\"M36.0005,51.6270739 L36.0005,59.7286739 C41.1607,59.0333639 46.0475,57.0059739 50.1805,53.8380739 L44.4617,48.1192739 C41.9187,49.8731739 39.0359,51.0684739 36.0008,51.6270739 L36.0005,51.6270739 Z\" id=\"Path\"></path>\n                    </g>\n                  </g>\n                </svg>\n              </div>\n            </div>\n        </div>\n    </div>\n</div>");
  document.body.appendChild(elem);
  setTimeout(function () {
    var drawingDialog = document.querySelector(".bb-feedback-dialog-drawing");

    if (drawingDialog) {
      drawingDialog.classList.remove("bb-anim-fadeinright");
    }
  }, 500);
  var drawBack = document.querySelector(".bb-drawing-tool-back");
  var canvas = document.getElementById("bb-screenshot-editor-canvas");
  var ctx = canvas.getContext("2d");
  var currentColor = "#EB144C";
  var currentTool = "pen";
  var baseImage = null;
  var drawingStack = [];
  var drawingHistory = [];

  function getCanvasScale() {
    return canvas.width / canvas.offsetWidth;
  }

  function updateDrawingTools() {
    var scale = getCanvasScale();

    if (currentTool === "pen") {
      ctx.lineWidth = 6 * scale;
      ctx.strokeStyle = currentColor;
      ctx.lineCap = "round";
    } else {
      ctx.lineWidth = 34 * scale;
      ctx.strokeStyle = "#000";
      ctx.lineCap = "round";
    }

    drawingStack.push({
      t: "t",
      lw: ctx.lineWidth,
      ss: ctx.strokeStyle
    });
  }

  function validateBackButton() {
    var disabled = "bb-drawing-tool-action--disabled";

    if (drawingHistory.length > 0) {
      drawBack.classList.remove(disabled);
    } else {
      drawBack.classList.add(disabled);
    }
  }

  function drawBackAction() {
    drawingHistory.pop(); // Redraw base image

    ctx.drawImage(baseImage, 0, 0); // Replay

    for (var i = 0; i < drawingHistory.length; i++) {
      var steps = drawingHistory[i];

      for (var j = 0; j < steps.length; j++) {
        var step = steps[j];

        if (step.t === "t") {
          ctx.lineWidth = step.lw;
          ctx.strokeStyle = step.ss;
          ctx.lineCap = "round";
        }

        if (step.t === "m") {
          ctx.beginPath();
          ctx.lineTo(step.x, step.y);
        }

        if (step.t === "l") {
          ctx.lineTo(step.x, step.y);
          ctx.stroke();
        }
      }
    } // Reset tools to current


    updateDrawingTools(); // Update back button

    validateBackButton();
  }

  var resizeCanvas = function resizeCanvas() {
    // Calculate canvas scale.
    var vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    var vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    var ratio = 0;
    var maxWidth = Math.min(vw - 60, 700);
    var maxHeight = Math.min(vh - 200, 700);
    var width = canvas.width;
    var height = canvas.height;

    if (width > maxWidth) {
      ratio = maxWidth / width;
      height = height * ratio;
      width = width * ratio;
    }

    if (height > maxHeight) {
      ratio = maxHeight / height;
      width = width * ratio;
      height = height * ratio;
    }

    canvas.style.width = "".concat(width, "px");
    canvas.style.height = "".concat(height, "px");
  };

  drawBack.addEventListener("click", function () {
    drawBackAction();
  });
  var backButton = document.querySelector(".bb-feedback-dialog-header-back");
  backButton.addEventListener("click", function () {
    window.removeEventListener("resize", resizeCanvas);
    onCancel();
  });
  var nextButton = document.querySelector(".bb-feedback-dialog-header-next");
  nextButton.addEventListener("click", function () {
    window.removeEventListener("resize", resizeCanvas);
    onDone(canvas.toDataURL("image/png"));
  });
  var colorItem = document.getElementById("bb-drawing-color");
  var colorPopup = document.getElementById("bb-drawing-colorpopup");
  colorPopup.style.display = "none";
  colorItem.addEventListener("click", function () {
    if (colorPopup.style.display === "none") {
      colorPopup.style.display = "flex";
    } else {
      colorPopup.style.display = "none";
    }
  }); // Prepare tools

  var drawingItems = document.querySelectorAll(".bb-drawing-tool-item");

  var selectTool = function selectTool(tool) {
    var activeTool = "bb-drawing-tool-item--active";

    for (var i = 0; i < drawingItems.length; i++) {
      var drawingItem = drawingItems[i];
      var drawingItemTool = drawingItem.getAttribute("data-tool");

      if (drawingItemTool === tool) {
        drawingItem.classList.add(activeTool);
      } else {
        drawingItem.classList.remove(activeTool);
      }
    }

    currentTool = tool;
    updateDrawingTools();
  };

  var _loop = function _loop() {
    var drawingItem = drawingItems[i];
    var tool = drawingItem.getAttribute("data-tool");
    drawingItem.addEventListener("click", function () {
      selectTool(tool);
    });
  };

  for (var i = 0; i < drawingItems.length; i++) {
    _loop();
  } // Prepare drawing color.


  var drawingColorActive = "bb-drawing-coloritem--active";
  var drawingColors = document.querySelectorAll(".bb-drawing-coloritem");

  var _loop2 = function _loop2() {
    var drawingColor = drawingColors[i];
    var color = drawingColor.getAttribute("data-color");
    drawingColor.style.backgroundColor = color;
    drawingColor.addEventListener("click", function () {
      for (var j = 0; j < drawingColors.length; j++) {
        drawingColors[j].classList.remove(drawingColorActive);
      }

      currentColor = color;
      colorItem.style.backgroundColor = color;
      drawingColor.classList.add(drawingColorActive);
      selectTool("pen");
      updateDrawingTools();
    });
  };

  for (var i = 0; i < drawingColors.length; i++) {
    _loop2();
  } // Draw screenshot.


  baseImage = new Image();

  baseImage.onload = function () {
    ctx.canvas.width = this.width;
    ctx.canvas.height = this.height;
    resizeCanvas();
    ctx.drawImage(this, 0, 0);
    updateDrawingTools();
  };

  baseImage.src = screenshot;
  window.addEventListener("resize", resizeCanvas);
  var isIdle = true;

  function drawstart(event) {
    var scale = getCanvasScale();
    ctx.beginPath();
    var x = (event.pageX - canvas.offsetLeft) * scale;
    var y = (event.pageY - canvas.offsetTop) * scale;
    ctx.lineTo(x, y);
    drawingStack.push({
      t: "m",
      x: x,
      y: y
    });
    isIdle = false;
  }

  function drawmove(event) {
    if (isIdle) return;
    var scale = getCanvasScale();
    var x = (event.pageX - canvas.offsetLeft) * scale;
    var y = (event.pageY - canvas.offsetTop) * scale;
    ctx.lineTo(x, y);
    ctx.stroke();
    drawingStack.push({
      t: "l",
      x: x,
      y: y
    });
  }

  function drawend(event) {
    if (isIdle) return;
    drawmove(event);
    drawingHistory.push(drawingStack);
    drawingStack = [];
    validateBackButton();
    isIdle = true;
  }

  function touchstart(event) {
    drawstart(event.touches[0]);
  }

  function touchmove(event) {
    drawmove(event.touches[0]);
    event.preventDefault();
  }

  function touchend(event) {
    drawend(event.changedTouches[0]);
  }

  canvas.addEventListener("touchstart", touchstart, false);
  canvas.addEventListener("touchmove", touchmove, false);
  canvas.addEventListener("touchend", touchend, false);
  canvas.addEventListener("mousedown", drawstart, false);
  canvas.addEventListener("mousemove", drawmove, false);
  canvas.addEventListener("mouseup", drawend, false);
};
;// CONCATENATED MODULE: ./src/StreamedEvent.js
function StreamedEvent_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function StreamedEvent_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function StreamedEvent_createClass(Constructor, protoProps, staticProps) { if (protoProps) StreamedEvent_defineProperties(Constructor.prototype, protoProps); if (staticProps) StreamedEvent_defineProperties(Constructor, staticProps); return Constructor; }

function StreamedEvent_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }




var StreamedEvent = /*#__PURE__*/function () {
  function StreamedEvent() {
    var _this = this;

    StreamedEvent_classCallCheck(this, StreamedEvent);

    StreamedEvent_defineProperty(this, "eventArray", []);

    StreamedEvent_defineProperty(this, "streamedEventArray", []);

    StreamedEvent_defineProperty(this, "eventMaxLength", 500);

    StreamedEvent_defineProperty(this, "lastUrl", undefined);

    StreamedEvent_defineProperty(this, "startEventStream", function () {
      var self = _this;
      var interval = 1500;

      if (Session.getInstance().ready && self.streamedEventArray && self.streamedEventArray.length > 0) {
        self.streamEvents();
        interval = 3000;
      }

      setTimeout(function () {
        self.startEventStream();
      }, interval);
    });

    StreamedEvent_defineProperty(this, "streamEvents", function () {
      if (Session.getInstance().ready) {
        var http = new XMLHttpRequest();
        http.open("POST", Session.getInstance().apiUrl + "/sessions/stream");
        http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        Session.getInstance().injectSession(http);

        http.onerror = function (error) {};

        http.onreadystatechange = function (e) {
          if (http.readyState === XMLHttpRequest.DONE) {
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

  StreamedEvent_createClass(StreamedEvent, [{
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
    value: // Session singleton
    function getInstance() {
      if (!this.instance) {
        this.instance = new StreamedEvent();
        return this.instance;
      } else {
        return this.instance;
      }
    }
  }]);

  return StreamedEvent;
}();

StreamedEvent_defineProperty(StreamedEvent, "instance", void 0);


;// CONCATENATED MODULE: ./src/AutoConfig.js
function AutoConfig_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function AutoConfig_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }




var AutoConfig = function AutoConfig() {
  AutoConfig_classCallCheck(this, AutoConfig);
};

AutoConfig_defineProperty(AutoConfig, "run", function () {
  return new Promise(function (resolve) {
    var session = Session.getInstance();
    var http = new XMLHttpRequest();
    http.open("GET", session.widgetUrl + "/widget/" + session.sdkKey + "/config");
    http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    session.injectSession(http);

    http.onerror = function () {
      resolve();
    };

    http.onreadystatechange = function (e) {
      if (http.readyState === XMLHttpRequest.DONE) {
        if (http.status === 200 || http.status === 201) {
          try {
            var config = JSON.parse(http.responseText);
            var flowConfig = config.flowConfig;
            var projectActions = config.projectActions;

            if (flowConfig.logo && flowConfig.logo.length > 0) {
              src_Gleap.setLogoUrl(flowConfig.logo);
            }

            if (flowConfig.color) {
              src_Gleap.setStyles({
                primaryColor: flowConfig.color,
                headerColor: flowConfig.headerColor,
                buttonColor: flowConfig.buttonColor,
                borderRadius: flowConfig.borderRadius,
                backgroundColor: flowConfig.backgroundColor ? flowConfig.backgroundColor : "#FFFFFF"
              });
            }

            if (flowConfig.hideBranding) {
              src_Gleap.enablePoweredBy();
            }

            if (flowConfig.enableReplays) {
              src_Gleap.enableReplays(flowConfig.enableReplays);
            }

            src_Gleap.enableShortcuts(flowConfig.enableShortcuts ? true : false);

            if (flowConfig.enableNetworkLogs) {
              src_Gleap.enableNetworkLogger();
            }

            if (flowConfig.networkLogPropsToIgnore) {
              src_Gleap.setNetworkLogFilters(flowConfig.networkLogPropsToIgnore);
            }

            if (!flowConfig.enableConsoleLogs) {
              src_Gleap.disableConsoleLogOverwrite();
            }

            if (typeof flowConfig.enableCrashDetector !== "undefined" && flowConfig.enableCrashDetector) {
              src_Gleap.enableCrashDetector(true, flowConfig.enableCrashDetector);
            }

            if (typeof flowConfig.enableRageClickDetector !== "undefined" && flowConfig.enableRageClickDetector) {
              src_Gleap.enableRageClickDetector(flowConfig.enableRageClickDetector);
            }

            if (flowConfig.customTranslations) {
              src_Gleap.setCustomTranslation(flowConfig.customTranslations);
            }

            if (typeof flowConfig.feedbackButtonPosition !== "undefined" && flowConfig.feedbackButtonPosition.length > 0) {
              src_Gleap.setButtonType(flowConfig.feedbackButtonPosition);
            }

            if (typeof flowConfig.widgetButtonText !== "undefined" && flowConfig.widgetButtonText.length > 0) {
              src_Gleap.setFeedbackButtonText(flowConfig.widgetButtonText);
            }

            if (typeof flowConfig.hideWavingHandAfterName !== "undefined" && flowConfig.hideWavingHandAfterName) {
              src_Gleap.setWelcomeIcon("");
            }

            if (typeof flowConfig.hideUsersName !== "undefined" && flowConfig.hideUsersName) {
              src_Gleap.setShowUserName(false);
            }

            if (flowConfig.widgetInfoTitle && flowConfig.widgetInfoTitle.length > 0) {
              src_Gleap.setWidgetInfo({
                title: flowConfig.widgetInfoTitle
              });
            }

            if (flowConfig.widgetInfoSubtitle && flowConfig.widgetInfoSubtitle.length > 0) {
              src_Gleap.setWidgetInfo({
                subtitle: flowConfig.widgetInfoSubtitle
              });
            }

            if (flowConfig.widgetInfoDialogSubtitle && flowConfig.widgetInfoDialogSubtitle.length > 0) {
              src_Gleap.setWidgetInfo({
                dialogSubtitle: flowConfig.widgetInfoDialogSubtitle
              });
            }

            if (flowConfig.enableMenu && flowConfig.menuItems && flowConfig.menuItems.length > 0) {
              var menuItems = [];

              var _loop = function _loop(i) {
                var menuItem = flowConfig.menuItems[i];
                var actionFlow = null;
                var action = null;

                if (menuItem.actionType === "OPEN_INTERCOM") {
                  action = function action() {
                    Intercom("showNewMessage");
                  };
                } else if (menuItem.actionType === "REDIRECT_URL") {
                  if (menuItem.actionOpenInNewTab) {
                    action = function action() {
                      window.open(menuItem.actionBody, "_blank").focus();
                    };
                  } else {
                    action = function action() {
                      window.location.href = menuItem.actionBody;
                    };
                  }
                } else if (menuItem.actionType === "CUSTOM_ACTION") {
                  action = function action() {
                    src_Gleap.triggerCustomAction(menuItem.actionBody);
                  };
                } else {
                  actionFlow = menuItem.actionType;
                } // Action flow


                if (actionFlow != null || action != null) {
                  item = {
                    title: menuItem.title,
                    description: menuItem.description,
                    icon: menuItem.icon,
                    color: menuItem.color
                  };

                  if (actionFlow) {
                    item["actionFlow"] = actionFlow;
                  }

                  if (action) {
                    item["action"] = action;
                  }

                  menuItems.push(item);
                }
              };

              for (var i = 0; i < flowConfig.menuItems.length; i++) {
                var item;

                _loop(i);
              }

              src_Gleap.setMenuOptions(menuItems);
            }

            if (projectActions) {
              src_Gleap.setFeedbackActions(projectActions);
            }

            if (flowConfig.buttonLogo && flowConfig.buttonLogo.length > 0) {
              src_Gleap.setButtonLogoUrl(flowConfig.buttonLogo);
            }
          } catch (e) {}
        }

        resolve();
      }
    };

    http.send();
  });
});


;// CONCATENATED MODULE: ./src/NetworkUtils.js
var isLocalNetwork = function isLocalNetwork() {
  var hostname = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : window.location.hostname;
  return ["localhost", "127.0.0.1", "0.0.0.0", "", "::1"].includes(hostname) || hostname.startsWith("192.168.") || hostname.startsWith("10.0.") || hostname.endsWith(".local");
};
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

var Gleap_Gleap = /*#__PURE__*/function () {
  /**
   * Main constructor
   */
  function Gleap() {
    var _this = this;

    Gleap_classCallCheck(this, Gleap);

    Gleap_defineProperty(this, "uiContainer", null);

    Gleap_defineProperty(this, "widgetOnly", false);

    Gleap_defineProperty(this, "widgetStartFlow", undefined);

    Gleap_defineProperty(this, "widgetCallback", null);

    Gleap_defineProperty(this, "overrideLanguage", "");

    Gleap_defineProperty(this, "screenshot", null);

    Gleap_defineProperty(this, "actionLog", []);

    Gleap_defineProperty(this, "logArray", []);

    Gleap_defineProperty(this, "customData", {});

    Gleap_defineProperty(this, "formData", {});

    Gleap_defineProperty(this, "excludeData", {});

    Gleap_defineProperty(this, "logMaxLength", 500);

    Gleap_defineProperty(this, "buttonType", Gleap.FEEDBACK_BUTTON_BOTTOM_RIGHT);

    Gleap_defineProperty(this, "feedbackType", "BUG");

    Gleap_defineProperty(this, "sessionStart", new Date());

    Gleap_defineProperty(this, "customActionCallbacks", []);

    Gleap_defineProperty(this, "poweredByHidden", false);

    Gleap_defineProperty(this, "enabledCrashDetector", false);

    Gleap_defineProperty(this, "enabledCrashDetectorSilent", false);

    Gleap_defineProperty(this, "enabledRageClickDetector", false);

    Gleap_defineProperty(this, "enabledRageClickDetectorSilent", false);

    Gleap_defineProperty(this, "appCrashDetected", false);

    Gleap_defineProperty(this, "rageClickDetected", false);

    Gleap_defineProperty(this, "currentlySendingBug", false);

    Gleap_defineProperty(this, "isLiveSite", false);

    Gleap_defineProperty(this, "replaysEnabled", false);

    Gleap_defineProperty(this, "customLogoUrl", null);

    Gleap_defineProperty(this, "shortcutsEnabled", true);

    Gleap_defineProperty(this, "silentBugReport", false);

    Gleap_defineProperty(this, "initialized", false);

    Gleap_defineProperty(this, "screenshotFeedbackOptions", null);

    Gleap_defineProperty(this, "customerInfo", {});

    Gleap_defineProperty(this, "showUserName", true);

    Gleap_defineProperty(this, "welcomeIcon", "👋");

    Gleap_defineProperty(this, "feedbackButtonText", "Feedback");

    Gleap_defineProperty(this, "widgetInfo", {
      title: "Feedback",
      subtitle: "var us know how we can do better.",
      dialogSubtitle: "Report a bug, or share your feedback with us."
    });

    Gleap_defineProperty(this, "originalConsoleLog", void 0);

    Gleap_defineProperty(this, "severity", "LOW");

    Gleap_defineProperty(this, "appVersionCode", "");

    Gleap_defineProperty(this, "appBuildNumber", "");

    Gleap_defineProperty(this, "mainColor", "#485bff");

    Gleap_defineProperty(this, "feedbackTypeActions", []);

    Gleap_defineProperty(this, "customTranslation", {});

    Gleap_defineProperty(this, "networkIntercepter", new NetworkInterception());

    Gleap_defineProperty(this, "replay", null);

    Gleap_defineProperty(this, "feedbackButton", null);

    Gleap_defineProperty(this, "fakeLoading", null);

    Gleap_defineProperty(this, "fakeLoadingProgress", 0);

    Gleap_defineProperty(this, "widgetOpened", false);

    Gleap_defineProperty(this, "openedMenu", false);

    Gleap_defineProperty(this, "showInfoPopup", false);

    Gleap_defineProperty(this, "snapshotPosition", {
      x: 0,
      y: 0
    });

    Gleap_defineProperty(this, "eventListeners", {});

    Gleap_defineProperty(this, "feedbackActions", {});

    Gleap_defineProperty(this, "actionToPerform", undefined);

    Gleap_defineProperty(this, "screenRecordingData", null);

    Gleap_defineProperty(this, "screenRecordingUrl", null);

    Gleap_defineProperty(this, "getWidgetDialogClass", function () {
      if (_this.appCrashDetected || _this.rageClickDetected) {
        return "bb-feedback-dialog--crashed";
      }

      return "";
    });

    if (typeof window !== "undefined") {
      this.init();
    }
  }
  /**
   * Sets a custom UI container.
   */


  Gleap_createClass(Gleap, [{
    key: "postInit",
    value: function postInit() {
      if (!this.widgetCallback) {
        // Start event stream only on web.
        StreamedEvent.getInstance().start();
      }

      var self = this;

      if (document.readyState === "complete" || document.readyState === "loaded" || document.readyState === "interactive") {
        self.checkForInitType();
      } else {
        document.addEventListener("DOMContentLoaded", function (event) {
          self.checkForInitType();
        });
      }

      if (this.widgetCallback) {
        self.widgetCallback("sessionReady");
      }
    }
    /**
     * Indentifies the user session
     * @param {string} userId
     * @param {*} userData
     */

  }, {
    key: "notifyEvent",
    value:
    /**
     * Notify all registrants for event.
     */
    function notifyEvent(event) {
      var data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var eventListeners = this.eventListeners[event];

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
     * Appends a node to the widgets container.
     * @param {*} node
     */

  }, {
    key: "getFeedbackOptions",
    value: function getFeedbackOptions(feedbackFlow) {
      var feedbackOptions = null; // Try to load the specific feedback flow.

      if (feedbackFlow) {
        feedbackOptions = this.feedbackActions[feedbackFlow];
      } // Fallback


      if (!feedbackOptions) {
        feedbackOptions = this.feedbackActions.bugreporting;
      } // Deep copy to prevent changes.


      try {
        feedbackOptions = JSON.parse(JSON.stringify(feedbackOptions));
      } catch (e) {}

      return feedbackOptions;
    }
    /**
     * Starts the bug reporting flow.
     */

  }, {
    key: "stopBugReportingAnalytics",
    value: function stopBugReportingAnalytics() {
      this.networkIntercepter.setStopped(true);

      if (this.replay && !this.replay.stopped) {
        this.replay.stop(!this.isLiveSite);
      }
    }
  }, {
    key: "startCrashDetection",
    value: function startCrashDetection() {
      var self = this;

      window.onerror = function (msg, url, lineNo, columnNo, error) {
        var message = ["Message: " + msg, "URL: " + url, "Line: " + lineNo, "Column: " + columnNo, "Stack: " + (error && error.stack) ? error.stack : 0];
        self.addLog(message, "ERROR");

        if (self.enabledCrashDetector && !self.appCrashDetected && !self.currentlySendingBug) {
          self.appCrashDetected = true;

          if (self.enabledCrashDetectorSilent) {
            return Gleap.sendSilentReport({
              errorMessage: msg,
              url: url,
              lineNo: lineNo,
              columnNo: columnNo,
              stackTrace: error && error.stack ? error.stack : ""
            }, Gleap.PRIORITY_MEDIUM, "CRASH", {
              screenshot: true,
              replays: true
            });
          } else {
            Gleap.startFeedbackFlow("crash");
          }
        }

        return false;
      };
    }
  }, {
    key: "truncateString",
    value: function truncateString(str, num) {
      if (str.length > num) {
        return str.slice(0, num) + "...";
      } else {
        return str;
      }
    }
  }, {
    key: "addLog",
    value: function addLog(args, priority) {
      if (!args) {
        return;
      }

      var log = "";

      for (var i = 0; i < args.length; i++) {
        log += args[i] + " ";
      }

      this.logArray.push({
        log: this.truncateString(log, 1000),
        date: new Date(),
        priority: priority
      });

      if (this.logArray.length > this.logMaxLength) {
        this.logArray.shift();
      }
    }
  }, {
    key: "overwriteConsoleLog",
    value: function overwriteConsoleLog() {
      var self = this;

      window.console = function (origConsole) {
        if (!window.console || !origConsole) {
          origConsole = {};
        }

        self.originalConsoleLog = origConsole;
        return Gleap_objectSpread(Gleap_objectSpread({}, origConsole), {}, {
          log: function log() {
            self.addLog(arguments, "INFO");
            origConsole.log && origConsole.log.apply(origConsole, arguments);
          },
          warn: function warn() {
            self.addLog(arguments, "WARNING");
            origConsole.warn && origConsole.warn.apply(origConsole, arguments);
          },
          error: function error() {
            self.addLog(arguments, "ERROR");
            origConsole.error && origConsole.error.apply(origConsole, arguments);
          },
          info: function info(v) {
            self.addLog(arguments, "INFO");
            origConsole.info && origConsole.info.apply(origConsole, arguments);
          }
        });
      }(window.console);
    }
  }, {
    key: "resetLoading",
    value: function resetLoading(resetProgress) {
      if (this.fakeLoading) {
        clearInterval(this.fakeLoading);
      }

      this.fakeLoading = null;
      this.fakeLoadingProgress = 0;

      if (resetProgress) {
        setLoadingIndicatorProgress(1);
      }
    }
  }, {
    key: "createFeedbackFormDialog",
    value: function createFeedbackFormDialog(feedbackOptions) {
      var self = this;
      var formData = buildForm(feedbackOptions, this.overrideLanguage);
      var title = translateText(feedbackOptions.title, this.overrideLanguage);
      var htmlContent = "<div class=\"bb-feedback-dialog-error\">".concat(translateText("Something went wrong, please try again.", self.overrideLanguage), "</div><div class=\"bb-feedback-dialog-loading bb-feedback-dialog-loading--main\">\n    <svg\n      class=\"bb--progress-ring\"\n      width=\"120\"\n      height=\"120\">\n      <circle\n        class=\"bb--progress-ring__circle\"\n        stroke=\"").concat(this.mainColor, "\"\n        stroke-width=\"6\"\n        fill=\"transparent\"\n        r=\"34\"\n        cx=\"60\"\n        cy=\"60\"/>\n    </svg>\n  </div>\n  <div class=\"bb-feedback-dialog-success\">\n    <svg width=\"120px\" height=\"92px\" viewBox=\"0 0 120 92\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n        <g stroke=\"none\" stroke-width=\"1\" fill=\"none\" fill-rule=\"evenodd\">\n            <g fill=\"").concat(this.mainColor, "\" fill-rule=\"nonzero\">\n                <path d=\"M107.553103,1.03448276 L101.669379,6.85344828 C81.2141379,27.3490345 62.5845517,47.5706897 42.7038621,67.7596552 L17.5535172,47.6517931 L11.088,42.4793793 L0.743172414,55.4104138 L38.2431724,85.4104138 L44.0621379,90.0010345 L49.2991034,84.764069 C71.5404828,62.4751034 91.5349655,40.4985517 113.437034,18.5571724 L119.256,12.6734483 L107.553103,1.03448276 Z\" id=\"Path\"></path>\n            </g>\n        </g>\n    </svg>\n    <div class=\"bb-feedback-dialog-info-text\">").concat(translateText(feedbackOptions.thanksMessage ? feedbackOptions.thanksMessage : "Thank you!", this.overrideLanguage), "</div>\n  </div>\n  <div class=\"bb-feedback-form\">\n    ").concat(formData, "\n  </div>");
      createWidgetDialog(title, null, this.customLogoUrl, htmlContent, function () {
        self.goBackToMainMenu();
      }, this.openedMenu, "bb-anim-fadeinright ".concat(this.getWidgetDialogClass(), " bb-feedback-dialog-form"));
      this.openedMenu = true;
      this.resetLoading(true);
      validatePoweredBy(this.poweredByHidden);
      hookForm(feedbackOptions, function () {
        self.formSubmitAction(feedbackOptions);
      }, this.overrideLanguage);
    }
  }, {
    key: "formSubmitAction",
    value: function formSubmitAction(feedbackOptions) {
      var self = this; // Remember form items

      rememberForm(feedbackOptions.form); // Show loading spinner

      toggleLoading(true); // Start fake loading

      self.fakeLoading = setInterval(function () {
        if (self.fakeLoadingProgress > 75) {
          self.resetLoading(false);
          return;
        }

        self.fakeLoadingProgress += 2;
        setLoadingIndicatorProgress(self.fakeLoadingProgress);
      }, 150); // Send form

      var formData = getFormData(feedbackOptions.form);
      self.formData = formData;
      self.excludeData = feedbackOptions.excludeData ? feedbackOptions.excludeData : {};
      self.feedbackType = feedbackOptions.feedbackType ? feedbackOptions.feedbackType : "BUG";

      if (self.widgetOnly && self.widgetCallback) {
        self.widgetCallback("sendFeedback", {
          type: self.feedbackType,
          formData: self.formData,
          screenshot: self.screenshot,
          excludeData: self.excludeData
        });
      } else {
        self.checkReplayLoaded();
      }
    }
  }, {
    key: "checkReplayLoaded",
    value: function checkReplayLoaded() {
      var _this2 = this;

      var retries = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;

      if (this.replaysEnabled && !(this.replay && this.replay.result) && retries < 5) {
        // Replay is not ready yet.
        setTimeout(function () {
          _this2.checkReplayLoaded(++retries);
        }, 1000);
      } else {
        this.checkForScreenRecording();
      }
    }
  }, {
    key: "checkForScreenRecording",
    value: function checkForScreenRecording() {
      var self = this;

      if (this.screenRecordingData != null) {
        ScreenRecorder.uploadScreenRecording(this.screenRecordingData).then(function (recordingUrl) {
          self.screenRecordingUrl = recordingUrl;
          self.takeScreenshotAndSend();
        })["catch"](function (err) {
          self.takeScreenshotAndSend();
        });
      } else {
        this.takeScreenshotAndSend();
      }
    }
  }, {
    key: "takeScreenshotAndSend",
    value: function takeScreenshotAndSend() {
      var _this3 = this;

      var self = this;

      if (this.excludeData && this.excludeData.screenshot) {
        // Screenshot excluded.
        this.sendBugReportToServer();
      } else {
        return startScreenCapture(this.isLiveSite).then(function (data) {
          // Set scroll position
          if (data) {
            data["x"] = self.snapshotPosition.x;
            data["y"] = self.snapshotPosition.y;
          }

          _this3.sendBugReportToServer(data);
        })["catch"](function (err) {
          _this3.showError();
        });
      }
    }
  }, {
    key: "reportCleanupOnClose",
    value: function reportCleanupOnClose() {
      try {
        Gleap.enableReplays(this.replaysEnabled);
      } catch (exp) {}

      try {
        this.networkIntercepter.setStopped(false);
      } catch (exp) {}

      this.actionToPerform = undefined;

      if (this.widgetCallback) {
        this.widgetCallback("closeGleap", {});
      }
    }
  }, {
    key: "closeModalUI",
    value: function closeModalUI(cleanUp) {
      var dialogContainer = document.querySelector(".bb-feedback-dialog-container");

      if (dialogContainer) {
        dialogContainer.remove();
      }
    }
  }, {
    key: "closeGleap",
    value: function closeGleap() {
      var cleanUp = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;

      if (cleanUp) {
        this.reportCleanupOnClose();
      }

      ScrollStopper.enableScroll();
      this.currentlySendingBug = false;
      this.widgetOpened = false;
      this.openedMenu = false;
      this.appCrashDetected = false;
      this.rageClickDetected = false;
      this.updateFeedbackButtonState(); // Remove editor.

      var editorContainer = document.querySelector(".bb-capture-editor");

      if (editorContainer) {
        editorContainer.remove();
      }

      this.notifyEvent("close");
      this.closeModalUI(cleanUp);
    }
  }, {
    key: "init",
    value: function init() {
      this.overwriteConsoleLog();
      this.startCrashDetection();
      this.registerKeyboardListener(); // Initially check network

      if (isLocalNetwork()) {
        this.isLiveSite = false;
      } else {
        this.isLiveSite = true;
      }
    }
  }, {
    key: "registerKeyboardListener",
    value: function registerKeyboardListener() {
      var self = this;

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

      document.onkeyup = function (e) {
        var _char = charForEvent(e);

        if (e.ctrlKey && (_char === "i" || _char === "I" || _char === 73) && self.shortcutsEnabled) {
          Gleap.startFeedbackFlow();
        }
      };
    }
  }, {
    key: "checkForInitType",
    value: function checkForInitType() {
      var _this4 = this;

      if (window && window.onGleapLoaded) {
        window.onGleapLoaded(Gleap);
      }

      setInterval(function () {
        if (_this4.replay && _this4.replay.isFull()) {
          Gleap.enableReplays(_this4.replaysEnabled);
        }
      }, 1000);

      if (this.widgetOnly) {
        // App widget
        var self = this;

        if (self.widgetStartFlow) {
          Gleap.startFeedbackFlow(self.widgetStartFlow);
        } else {
          if (self.feedbackTypeActions.length > 0) {
            Gleap.startFeedbackTypeSelection();
          } else {
            Gleap.startFeedbackFlow();
          }
        }
      } else {
        // Web widget
        Session.getInstance().setOnSessionReady(function () {
          _this4.injectFeedbackButton();
        });
      }
    }
  }, {
    key: "injectFeedbackButton",
    value: function injectFeedbackButton() {
      var self = this;
      var buttonIcon = "";

      if (self.customButtonLogoUrl) {
        buttonIcon = "<img class=\"bb-logo-logo\" src=\"".concat(self.customButtonLogoUrl, "\" alt=\"Feedback Button\" />");
      } else {
        buttonIcon = loadIcon("bblogo", "#fff");
      }

      var elem = document.createElement("div");
      elem.className = "bb-feedback-button";

      if (this.buttonType === Gleap.FEEDBACK_BUTTON_CLASSIC || this.buttonType === Gleap.FEEDBACK_BUTTON_CLASSIC_BOTTOM || this.buttonType === Gleap.FEEDBACK_BUTTON_CLASSIC_LEFT) {
        elem.innerHTML = "<div class=\"bb-feedback-button-classic ".concat(this.buttonType === Gleap.FEEDBACK_BUTTON_CLASSIC_LEFT ? "bb-feedback-button-classic--left" : "").concat(this.buttonType === Gleap.FEEDBACK_BUTTON_CLASSIC_BOTTOM ? "bb-feedback-button-classic--bottom" : "", "\">").concat(translateText(this.feedbackButtonText, this.overrideLanguage), "</div>");
      } else {
        elem.innerHTML = "<div class=\"bb-feedback-button-icon\">".concat(buttonIcon).concat(loadIcon("arrowdown", "#fff"), "</div>");
      }

      elem.onclick = function () {
        self.feedbackButtonPressed();
      };

      Gleap.appendNode(elem);

      if (this.buttonType === Gleap.FEEDBACK_BUTTON_NONE) {
        elem.classList.add("bb-feedback-button--disabled");
      }

      if (this.buttonType === Gleap.FEEDBACK_BUTTON_BOTTOM_LEFT) {
        elem.classList.add("bb-feedback-button--bottomleft");
      }

      this.feedbackButton = elem;
    }
  }, {
    key: "showGleap",
    value: function showGleap() {
      if (this.widgetOpened) {
        return;
      }

      if (this.feedbackTypeActions.length > 0) {
        Gleap.startFeedbackTypeSelection();
      } else {
        Gleap.startFeedbackFlow();
      } // Remove shoutout.


      var feedbackShoutout = window.document.getElementsByClassName("bb-feedback-button-shoutout");

      if (feedbackShoutout && feedbackShoutout.length > 0) {
        feedbackShoutout[0].remove();
      } // Prevent shoutout from showing again.


      try {
        localStorage.setItem("bb-fto", true);
      } catch (exp) {}

      this.notifyEvent("open");
    }
  }, {
    key: "feedbackButtonPressed",
    value: function feedbackButtonPressed() {
      if (this.widgetOpened) {
        this.closeGleap();
        return;
      }

      this.showGleap();
    }
  }, {
    key: "updateFeedbackButtonState",
    value: function updateFeedbackButtonState() {
      var _this5 = this;

      var retry = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

      if (this.feedbackButton === null) {
        if (!retry) {
          setTimeout(function () {
            _this5.updateFeedbackButtonState(true);
          }, 500);
        }

        return;
      }

      var sendingClass = "bb-feedback-button--sending";

      if (this.widgetOpened) {
        this.feedbackButton.classList.add(sendingClass);
      } else {
        this.feedbackButton.classList.remove(sendingClass);
      }

      var crashedClass = "bb-feedback-button--crashed";

      if (this.appCrashDetected || this.rageClickDetected) {
        this.feedbackButton.classList.add(crashedClass);
      } else {
        this.feedbackButton.classList.remove(crashedClass);
      }

      var dialogContainer = document.querySelector(".bb-feedback-dialog-container");
      var containerFocusClass = "bb-feedback-dialog-container--focused";

      if (dialogContainer) {
        if (this.appCrashDetected || this.rageClickDetected) {
          dialogContainer.classList.add(containerFocusClass);
        } else {
          dialogContainer.classList.remove(containerFocusClass);
        }
      }
    }
  }, {
    key: "showSuccessMessage",
    value: function showSuccessMessage() {
      var success = document.querySelector(".bb-feedback-dialog-success");
      var form = document.querySelector(".bb-feedback-form");
      var loader = document.querySelector(".bb-feedback-dialog-loading");
      form.style.display = "none";
      loader.style.display = "none";
      success.style.display = "flex";
    }
  }, {
    key: "performAction",
    value: function performAction(action) {
      if (action && action.outbound && action.actionType) {
        this.actionToPerform = action;
        Gleap.startFeedbackFlow(action.actionType);
      }
    }
  }, {
    key: "sendBugReportToServer",
    value: function sendBugReportToServer(screenshotData) {
      var self = this;
      var http = new XMLHttpRequest();
      http.open("POST", Session.getInstance().apiUrl + "/bugs");
      http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      Session.getInstance().injectSession(http);

      http.onerror = function (error) {
        if (self.silentBugReport) {
          self.closeGleap();
          return;
        }

        self.showError();
      };

      http.upload.onprogress = function (e) {
        if (self.silentBugReport) {
          self.closeGleap();
          return;
        }

        if (e.lengthComputable) {
          var percentComplete = parseInt(e.loaded / e.total * 100);

          if (percentComplete > 25 && percentComplete > self.fakeLoadingProgress) {
            if (self.fakeLoading) {
              self.resetLoading(false);
            }

            setLoadingIndicatorProgress(percentComplete);
          }
        }
      };

      http.onreadystatechange = function (e) {
        if (self.silentBugReport) {
          self.closeGleap();
          return;
        }

        if (http.readyState === XMLHttpRequest.DONE) {
          if (http.status === 200 || http.status === 201) {
            self.notifyEvent("feedback-sent");
            self.showSuccessAndClose();
          } else {
            self.showError();
          }
        }
      };

      var bugReportData = {
        priority: this.severity,
        customData: this.customData,
        metaData: this.getMetaData(),
        consoleLog: this.logArray,
        networkLogs: this.networkIntercepter.getRequests(),
        customEventLog: StreamedEvent.getInstance().eventArray,
        type: this.feedbackType,
        formData: this.formData,
        isSilent: this.silentBugReport
      };

      if (this.actionToPerform && this.actionToPerform.outbound) {
        bugReportData["outbound"] = this.actionToPerform.outbound;
      }

      if (screenshotData && screenshotData.fileUrl) {
        bugReportData["screenshotUrl"] = screenshotData.fileUrl;
      }

      if (screenshotData && screenshotData.html) {
        bugReportData["screenshotData"] = screenshotData;
      }

      if (this.replay && this.replay.result) {
        bugReportData["webReplay"] = this.replay.result;
      }

      if (this.screenRecordingUrl && this.screenRecordingUrl != "uploading") {
        bugReportData["screenRecordingUrl"] = this.screenRecordingUrl;
      } // Exclude data logic.


      var keysToExclude = Object.keys(this.excludeData);

      for (var _i = 0; _i < keysToExclude.length; _i++) {
        var keyToExclude = keysToExclude[_i];

        if (this.excludeData[keyToExclude] === true) {
          delete bugReportData[keyToExclude];

          if (keyToExclude === "screenshot") {
            delete bugReportData.screenshotData;
            delete bugReportData.screenshotUrl;
          }

          if (keyToExclude === "replays") {
            delete bugReportData.webReplay;
          }
        }
      }

      http.send(JSON.stringify(bugReportData));
    }
  }, {
    key: "jsonSize",
    value: function jsonSize(obj) {
      var size = new TextEncoder().encode(JSON.stringify(obj)).length;
      var kiloBytes = size / 1024;
      var megaBytes = kiloBytes / 1024;
    }
  }, {
    key: "showSuccessAndClose",
    value: function showSuccessAndClose() {
      var self = this;
      self.showSuccessMessage();
      setTimeout(function () {
        self.closeGleap();
      }, 2800);
    }
  }, {
    key: "showError",
    value: function showError() {
      if (this.silentBugReport) {
        this.closeGleap();
        return;
      }

      this.notifyEvent("error-while-sending");
      toggleLoading(false);
      document.querySelector(".bb-feedback-dialog-error").style.display = "flex";
    }
  }, {
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
        sdkVersion: "6.7.0",
        sdkType: "javascript"
      };
    }
  }, {
    key: "showBugReportEditor",
    value: function showBugReportEditor(feedbackOptions) {
      // Native screenshot SDK.
      if (!feedbackOptions.disableUserScreenshot) {
        if (this.screenshot) {
          this.showMobileScreenshotEditor(feedbackOptions);
          return;
        } // Fetch screenshot from native SDK.


        if (this.widgetOnly && this.widgetCallback) {
          this.screenshotFeedbackOptions = feedbackOptions;
          this.widgetCallback("requestScreenshot", {});
          return;
        }
      }

      this.createFeedbackFormDialog(feedbackOptions);
    }
  }, {
    key: "goBackToMainMenu",
    value: function goBackToMainMenu() {
      if (this.feedbackTypeActions.length > 0) {
        // Go back to menu
        this.closeGleap(false);
        Gleap.startFeedbackTypeSelection(true);
      } else {
        // Close
        this.closeGleap();
      }
    }
  }, {
    key: "showMobileScreenshotEditor",
    value: function showMobileScreenshotEditor(feedbackOptions) {
      var self = this;
      createScreenshotEditor(this.screenshot, function (screenshot) {
        // Update screenshot.
        self.screenshot = screenshot;
        self.closeModalUI();
        self.createFeedbackFormDialog(feedbackOptions);
      }, function () {
        self.goBackToMainMenu();
      }, this.overrideLanguage, this.feedbackTypeActions.length > 0);
    }
  }], [{
    key: "getInstance",
    value: // Feedback button types
    // Bug priorities
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
    key: "setUIContainer",
    value: function setUIContainer(container) {
      var instance = this.getInstance();
      instance.uiContainer = container;
    }
    /**
     * Attaches external network logs that get merged with the internal network logs.
     * @param {*} externalConsoleLogs
     */

  }, {
    key: "attachNetworkLogs",
    value: function attachNetworkLogs(externalConsoleLogs) {
      this.getInstance().networkIntercepter.externalConsoleLogs = externalConsoleLogs;
    }
    /**
     * Set if you running on a live site or local environment.
     * @param {*} isLiveSite
     */

  }, {
    key: "setLiveSite",
    value: function setLiveSite(isLiveSite) {
      var instance = this.getInstance();
      instance.isLiveSite = isLiveSite;
    }
    /**
     * Initializes the SDK
     * @param {*} sdkKey
     */

  }, {
    key: "initialize",
    value: function initialize(sdkKey, gleapId, gleapHash) {
      var instance = this.getInstance();

      if (instance.initialized) {
        console.warn("Gleap already initialized.");
        return;
      }

      instance.initialized = true; // Set default session (i.e. from the app SDK).

      if (gleapId && gleapHash) {
        try {
          localStorage.setItem("gleap-id", gleapId);
          localStorage.getItem("gleap-hash", gleapHash);
        } catch (exp) {}
      }

      var sessionInstance = Session.getInstance();
      sessionInstance.sdkKey = sdkKey;
      sessionInstance.startSession();
      sessionInstance.setOnSessionReady(function () {
        if (instance.widgetCallback) {
          // Directly run post init as we don't need to run the auto config on app.
          instance.postInit();
        } else {
          // Run auto configuration.
          AutoConfig.run().then(function () {
            instance.postInit();
          });
        }
      });
    }
  }, {
    key: "identify",
    value: function identify(userId, userData) {
      Session.getInstance().identifySession(userId, gleapDataParser(userData));
    }
    /**
     * Clears the current user session
     */

  }, {
    key: "clearIdentity",
    value: function clearIdentity() {
      Session.getInstance().clearSession();
    }
    /**
     * Widget opened status
     * @returns {boolean} isOpened
     */

  }, {
    key: "isOpened",
    value: function isOpened() {
      return this.getInstance().openedMenu;
    }
    /**
     * Hides any open Gleap dialogs.
     */

  }, {
    key: "hide",
    value: function hide() {
      var instance = this.getInstance();
      instance.closeGleap();
    }
    /**
     * Starts the Gleap flow.
     */

  }, {
    key: "open",
    value: function open() {
      var instance = this.getInstance();
      instance.showGleap();
    }
    /**
     * Sets a custom translation
     * @param {*} customTranslation
     */

  }, {
    key: "setCustomTranslation",
    value: function setCustomTranslation(customTranslation) {
      var instance = this.getInstance();
      instance.customTranslation = customTranslation;
    }
    /**
     * Sets a custom screenshot
     * @param {*} screenshot
     */

  }, {
    key: "setScreenshot",
    value: function setScreenshot(screenshot) {
      var instance = this.getInstance();
      instance.screenshot = screenshot; // Open screenshot

      if (instance.screenshotFeedbackOptions) {
        instance.showMobileScreenshotEditor(instance.screenshotFeedbackOptions);
        instance.screenshotFeedbackOptions = null;
      }
    }
    /**
     * Sets the feedback button text
     * @param {string} feedbackButtonText
     */

  }, {
    key: "setFeedbackButtonText",
    value: function setFeedbackButtonText(feedbackButtonText) {
      var instance = this.getInstance();
      instance.feedbackButtonText = feedbackButtonText;
    }
    /**
     * Enable replays
     * @param {*} enabled
     */

  }, {
    key: "enableReplays",
    value: function enableReplays(enabled) {
      var instance = this.getInstance();
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
     * Logs a custom event
     * @param {string} name
     * @param {any} data
     */

  }, {
    key: "logEvent",
    value: function logEvent(name, data) {
      StreamedEvent.getInstance().logEvent(name, data);
    }
    /**
     * Show info popup
     * @param {boolean} showInfoPopup
     */

  }, {
    key: "showInfoPopup",
    value: function showInfoPopup(_showInfoPopup) {
      this.getInstance().showInfoPopup = _showInfoPopup;
    }
    /**
     * Set widget only
     * @param {boolean} widgetOnly
     */

  }, {
    key: "isWidgetOnly",
    value: function isWidgetOnly(widgetOnly) {
      this.getInstance().widgetOnly = widgetOnly;
    }
    /**
     * Set widget only start feedback flow
     * @param {boolean} widgetStartFlow
     */

  }, {
    key: "setWidgetStartFlow",
    value: function setWidgetStartFlow(widgetStartFlow) {
      this.getInstance().widgetStartFlow = widgetStartFlow;
    }
    /**
     * Set welcome icon
     * @param {string} welcomeIcon
     */

  }, {
    key: "setWelcomeIcon",
    value: function setWelcomeIcon(welcomeIcon) {
      this.getInstance().welcomeIcon = welcomeIcon;
    }
    /**
     * Show or hide the user name within the widget header
     * @param {boolean} showUserName
     */

  }, {
    key: "setShowUserName",
    value: function setShowUserName(showUserName) {
      this.getInstance().showUserName = showUserName;
    }
    /**
     * Sets the button type.
     * @param {string} buttonType
     */

  }, {
    key: "setButtonType",
    value: function setButtonType(buttonType) {
      this.getInstance().buttonType = buttonType;
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
  }, {
    key: "appendNode",
    value: function appendNode(node) {
      var instance = this.getInstance();

      if (instance.uiContainer) {
        instance.uiContainer.appendChild(node);
      } else {
        document.body.appendChild(node);
      }
    }
    /**
     * Sets the native widget callback
     * @param {*} widgetCallback
     */

  }, {
    key: "widgetCallback",
    value: function widgetCallback(_widgetCallback) {
      this.getInstance().widgetCallback = _widgetCallback;
    }
    /**
     * Enable or disable shortcuts
     * @param {boolean} enabled
     */

  }, {
    key: "enableShortcuts",
    value: function enableShortcuts(enabled) {
      this.getInstance().shortcutsEnabled = enabled;
    }
    /**
     * Enable Intercom compatibility mode
     */

  }, {
    key: "enableIntercomCompatibilityMode",
    value: function enableIntercomCompatibilityMode() {}
    /**
     * Show or hide the feedback button
     * @param {*} show
     * @returns
     */

  }, {
    key: "showFeedbackButton",
    value: function showFeedbackButton(show) {
      var feedbackButton = this.getInstance().feedbackButton;

      if (!feedbackButton) {
        return;
      }

      if (show) {
        feedbackButton.style.display = "flex";
      } else {
        feedbackButton.style.display = "none";
      }
    }
    /**
     * Hides the powered by Gleap logo.
     * @param {boolean} hide
     */

  }, {
    key: "enablePoweredBy",
    value: function enablePoweredBy(enabled) {
      this.getInstance().poweredByHidden = !enabled;
    }
    /**
     * Enables the network logger.
     */

  }, {
    key: "enableNetworkLogger",
    value: function enableNetworkLogger() {
      this.getInstance().networkIntercepter.start();
    }
    /**
     * Enables the network logger.
     */

  }, {
    key: "setNetworkLogFilters",
    value: function setNetworkLogFilters(filters) {
      this.getInstance().networkIntercepter.setFilters(filters);
    }
    /**
     * Sets the logo url.
     * @param {string} logoUrl
     */

  }, {
    key: "setLogoUrl",
    value: function setLogoUrl(logoUrl) {
      this.getInstance().customLogoUrl = logoUrl;
    }
    /**
     * Sets the button logo url.
     * @param {string} logoUrl
     */

  }, {
    key: "setButtonLogoUrl",
    value: function setButtonLogoUrl(logoUrl) {
      this.getInstance().customButtonLogoUrl = logoUrl;
    }
    /**
     * Enables the privacy policy.
     * @param {boolean} enabled
     */

  }, {
    key: "enablePrivacyPolicy",
    value: function enablePrivacyPolicy(enabled) {}
    /**
     * Sets the privacy policy url.
     * @param {string} privacyPolicyUrl
     */

  }, {
    key: "setPrivacyPolicyUrl",
    value: function setPrivacyPolicyUrl(privacyPolicyUrl) {}
    /**
     * Sets the widget info texts.
     * @param {string} widgetInfo
     */

  }, {
    key: "setWidgetInfo",
    value: function setWidgetInfo(widgetInfo) {
      if (!widgetInfo) {
        return;
      }

      this.getInstance().widgetInfo = Object.assign(this.getInstance().widgetInfo, widgetInfo);
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
    /**
     * Set a custom api url.
     * @param {string} apiUrl
     */

  }, {
    key: "setApiUrl",
    value: function setApiUrl(apiUrl) {
      Session.getInstance().apiUrl = apiUrl;
    }
    /**
     * Set a custom widget api url.
     * @param {string} widgetUrl
     */

  }, {
    key: "setWidgetUrl",
    value: function setWidgetUrl(widgetUrl) {
      Session.getInstance().widgetUrl = widgetUrl;
    }
    /**
     * Set custom data that will be attached to the bug-report.
     * @param {*} data
     */

  }, {
    key: "attachCustomData",
    value: function attachCustomData(data) {
      var instance = this.getInstance();
      instance.customData = Object.assign(instance.customData, gleapDataParser(data));
    }
    /**
     * Add one key value pair to the custom data object
     * @param {*} key The key of the custom data entry you want to add.
     * @param {*} value The custom data you want to add.
     */

  }, {
    key: "setCustomData",
    value: function setCustomData(key, value) {
      this.getInstance().customData[key] = value;
    }
    /**
     * Remove one key value pair of the custom data object
     * @param {*} key The key of the custom data entry you want to remove.
     */

  }, {
    key: "removeCustomData",
    value: function removeCustomData(key) {
      delete this.getInstance().customData[key];
    }
    /**
     * Clear the custom data
     */

  }, {
    key: "clearCustomData",
    value: function clearCustomData() {
      this.getInstance().customData = {};
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

  }, {
    key: "setLanguage",
    value: function setLanguage(language) {
      this.getInstance().overrideLanguage = language;
    }
    /**
     * Enables crash detection.
     * @param {*} enabled
     * @param {*} silent
     */

  }, {
    key: "enableCrashDetector",
    value: function enableCrashDetector(enabled) {
      var silent = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      var instance = this.getInstance();
      instance.enabledCrashDetector = enabled;
      instance.enabledCrashDetectorSilent = silent;
    }
    /**
     * Enables rage click detection.
     * @param {*} silent
     */

  }, {
    key: "enableRageClickDetector",
    value: function enableRageClickDetector() {
      var silent = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
      var instance = this.getInstance();

      if (instance.enabledRageClickDetector) {
        return;
      }

      instance.enabledRageClickDetector = true;
      instance.enabledRageClickDetectorSilent = silent;
      startRageClickDetector(function (target) {
        instance.rageClickDetected = true;

        if (instance.enabledRageClickDetectorSilent) {
          Gleap.sendSilentReport({
            description: "Rage click detected."
          });
        } else {
          Gleap.startFeedbackFlow("crash");
        }
      });
    }
    /**
     * Sets a custom color scheme.
     * @param {string} primaryColor
     */

  }, {
    key: "setColors",
    value: function setColors(primaryColor, headerColor, buttonColor) {
      var backgroundColor = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : "#ffffff";
      this.setStyles({
        headerColor: headerColor,
        primaryColor: primaryColor,
        buttonColor: buttonColor,
        backgroundColor: backgroundColor
      });
    }
    /**
     * Sets a custom color scheme.
     * @param {any} styles
     */

  }, {
    key: "setStyles",
    value: function setStyles(styles) {
      this.getInstance().mainColor = styles.primaryColor;
      var headerColor = styles.headerColor ? styles.headerColor : styles.primaryColor;
      var buttonColor = styles.buttonColor ? styles.buttonColor : styles.primaryColor;
      var borderRadius = styles.borderRadius != null ? styles.borderRadius : 20;
      var backgroundColor = styles.backgroundColor != null ? styles.backgroundColor : "#fff";

      if (document.readyState === "complete" || document.readyState === "loaded" || document.readyState === "interactive") {
        injectStyledCSS(styles.primaryColor, headerColor, buttonColor, borderRadius, backgroundColor);
      } else {
        document.addEventListener("DOMContentLoaded", function (event) {
          injectStyledCSS(styles.primaryColor, headerColor, buttonColor, borderRadius, backgroundColor);
        });
      }
    }
    /**
     * Sends a silent feedback report
     * @param {*} formData
     * @param {*} priority
     * @param {*} feedbackType
     */

  }, {
    key: "sendSilentReport",
    value: function sendSilentReport(formData) {
      var priority = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : Gleap.PRIORITY_MEDIUM;
      var feedbackType = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "BUG";
      var excludeData = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
      var instance = this.getInstance();
      var sessionInstance = Session.getInstance();

      if (!sessionInstance.ready) {
        return;
      }

      instance.excludeData = excludeData ? excludeData : {};
      instance.severity = priority;
      instance.feedbackType = feedbackType;
      instance.formData = formData ? formData : {};

      if (sessionInstance.session.email) {
        instance.formData.reportedBy = sessionInstance.session.email;
      }

      this.startFeedbackFlow(null, true);
    }
    /**
     * Reports a bug silently
     * @param {*} description
     * @deprecated Please use sendSilentReport instead.
     */

  }, {
    key: "sendSilentBugReport",
    value: function sendSilentBugReport(description) {
      var priority = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : Gleap.PRIORITY_MEDIUM;
      return Gleap.sendSilentReport({
        description: description
      }, priority, "BUG");
    }
    /**
     * Starts the feedback type selection flow.
     */

  }, {
    key: "startFeedbackTypeSelection",
    value: function startFeedbackTypeSelection() {
      var fromBack = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
      var sessionInstance = Session.getInstance();
      var instance = this.getInstance();
      instance.stopBugReportingAnalytics();
      instance.widgetOpened = true;
      instance.openedMenu = true;
      instance.updateFeedbackButtonState(); // Start feedback type dialog

      createFeedbackTypeDialog(instance.feedbackTypeActions, instance.overrideLanguage, instance.customLogoUrl, instance.poweredByHidden, function () {}, "".concat(translateText("Hi", instance.overrideLanguage), " <span id=\"bb-user-name\">").concat(instance.showUserName && sessionInstance.session.name ? sessionInstance.session.name : "", "</span> ").concat(instance.welcomeIcon), translateText(instance.widgetInfo.dialogSubtitle, instance.overrideLanguage), fromBack);
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

      if (instance.widgetCallback) {
        instance.widgetCallback("customActionCalled", {
          name: name
        });
      }

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
    /**
     * Sets the feedback flow options.
     */

  }, {
    key: "setFeedbackActions",
    value: function setFeedbackActions(feedbackActions) {
      this.getInstance().feedbackActions = feedbackActions;
    }
    /**
     * Sets the menu options.
     */

  }, {
    key: "setMenuOptions",
    value: function setMenuOptions(options) {
      this.getInstance().feedbackTypeActions = options;
    }
  }, {
    key: "startFeedbackFlow",
    value: function startFeedbackFlow(feedbackFlow) {
      var silentBugReport = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      var sessionInstance = Session.getInstance();
      var instance = this.getInstance();

      if (instance.currentlySendingBug) {
        return;
      }

      if (!sessionInstance.ready) {
        return;
      } // Initially set scroll position


      instance.snapshotPosition = {
        x: window.scrollX,
        y: window.scrollY
      }; // Get feedback options

      var feedbackOptions = instance.getFeedbackOptions(feedbackFlow);

      if (!feedbackOptions) {
        return;
      }

      instance.notifyEvent("flow-started", feedbackOptions);
      instance.closeModalUI();
      instance.currentlySendingBug = true;
      instance.silentBugReport = silentBugReport;

      if (!silentBugReport) {
        instance.widgetOpened = true;
      }

      if (feedbackOptions.form && feedbackOptions.form.length > 0) {
        // Cleanup form from unsupported items.
        var newFormArray = [];

        for (var i = 0; i < feedbackOptions.form.length; i++) {
          var feedbackOption = feedbackOptions.form[i];

          if (feedbackOption && feedbackOption.type !== "privacypolicy" && feedbackOption.type !== "spacer" && feedbackOption.type !== "submit" && feedbackOption.name !== "reportedBy") {
            newFormArray.push(feedbackOption);
          }
        }

        var emailFormItem = feedbackOptions.collectEmail === true || feedbackOptions.collectEmail === undefined ? {
          title: "Email",
          placeholder: "Your e-mail",
          type: "text",
          inputtype: "email",
          name: "reportedBy",
          required: true,
          remember: true
        } : null; // Collect email when user needs to enter it.

        if (emailFormItem && !(sessionInstance.session && sessionInstance.session.email)) {
          emailFormItem.hideOnDefaultSet = false;
          newFormArray.push(emailFormItem);
        } // Update form.


        feedbackOptions.form = newFormArray;
        feedbackOptions.pages = feedbackOptions.singlePageForm === true ? 1 : newFormArray.length; // Add page id's

        for (var i = 0; i < feedbackOptions.form.length; i++) {
          var feedbackOption = feedbackOptions.form[i];

          if (feedbackOptions.singlePageForm === true) {
            feedbackOption.page = 0;
          } else {
            feedbackOption.page = i;
          }
        } // Add email as hidden default option.


        if (emailFormItem && sessionInstance.session && sessionInstance.session.email) {
          emailFormItem.hideOnDefaultSet = true;
          emailFormItem.defaultValue = sessionInstance.session.email;
          emailFormItem.page = feedbackOptions.form[feedbackOptions.form.length - 1].page;
          newFormArray.push(emailFormItem);
        } // Inject privacy policy.


        if (!feedbackOptions.disableUserScreenshot && !instance.widgetCallback) {
          var captureItem = {
            name: "capture",
            type: "capture",
            enableScreenshot: true,
            enableCapture: feedbackOptions.enableUserScreenRecording ? true : false,
            captureTitle: "Record screen",
            captureTooltip: "Record a screen recording",
            screenshotTitle: "Mark the bug",
            screenshotTooltip: "Draw on the screenshot",
            page: feedbackOptions.form[feedbackOptions.form.length - 1].page
          };
          feedbackOptions.form.push(captureItem);
        } // Inject privacy policy.


        if (feedbackOptions.privacyPolicyEnabled) {
          var policyItem = {
            name: "privacypolicy",
            type: "privacypolicy",
            required: true,
            url: feedbackOptions.privacyPolicyUrl,
            page: feedbackOptions.form[feedbackOptions.form.length - 1].page
          };
          feedbackOptions.form.push(policyItem);
        }
      }

      instance.stopBugReportingAnalytics();

      if (instance.silentBugReport) {
        // Move on
        instance.checkReplayLoaded();
      } else {
        // Show editor
        instance.showBugReportEditor(feedbackOptions);
      }

      instance.updateFeedbackButtonState();
    }
  }, {
    key: "disableConsoleLogOverwrite",
    value: function disableConsoleLogOverwrite() {
      window.console = this.getInstance().originalConsoleLog;
    }
  }]);

  return Gleap;
}(); // Check for unperformed Gleap actions.


Gleap_defineProperty(Gleap_Gleap, "FEEDBACK_BUTTON_BOTTOM_RIGHT", "BOTTOM_RIGHT");

Gleap_defineProperty(Gleap_Gleap, "FEEDBACK_BUTTON_BOTTOM_LEFT", "BOTTOM_LEFT");

Gleap_defineProperty(Gleap_Gleap, "FEEDBACK_BUTTON_CLASSIC", "BUTTON_CLASSIC");

Gleap_defineProperty(Gleap_Gleap, "FEEDBACK_BUTTON_CLASSIC_LEFT", "BUTTON_CLASSIC_LEFT");

Gleap_defineProperty(Gleap_Gleap, "FEEDBACK_BUTTON_CLASSIC_BOTTOM", "BUTTON_CLASSIC_BOTTOM");

Gleap_defineProperty(Gleap_Gleap, "FEEDBACK_BUTTON_NONE", "BUTTON_NONE");

Gleap_defineProperty(Gleap_Gleap, "PRIORITY_LOW", "LOW");

Gleap_defineProperty(Gleap_Gleap, "PRIORITY_MEDIUM", "MEDIUM");

Gleap_defineProperty(Gleap_Gleap, "PRIORITY_HIGH", "HIGH");

Gleap_defineProperty(Gleap_Gleap, "instance", void 0);

if (typeof window !== "undefined") {
  var GleapActions = window.GleapActions;

  if (GleapActions && GleapActions.length > 0) {
    for (var i = 0; i < GleapActions.length; i++) {
      var GLAction = GleapActions[i];

      if (GLAction && GLAction.e && Gleap_Gleap[GLAction.e]) {
        Gleap_Gleap[GLAction.e].apply(Gleap_Gleap, GLAction.a);
      }
    }
  }
}

/* harmony default export */ const src_Gleap = (Gleap_Gleap);
;// CONCATENATED MODULE: ./src/index.js

/* harmony default export */ const src = (src_Gleap);
__webpack_exports__ = __webpack_exports__.default;
/******/ 	return __webpack_exports__;
/******/ })()
;
});