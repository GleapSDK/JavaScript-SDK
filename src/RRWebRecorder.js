export const rrwebRecord = (function () {
    'use strict';

    var NodeType;
    (function(NodeType2) {
      NodeType2[NodeType2["Document"] = 0] = "Document";
      NodeType2[NodeType2["DocumentType"] = 1] = "DocumentType";
      NodeType2[NodeType2["Element"] = 2] = "Element";
      NodeType2[NodeType2["Text"] = 3] = "Text";
      NodeType2[NodeType2["CDATA"] = 4] = "CDATA";
      NodeType2[NodeType2["Comment"] = 5] = "Comment";
    })(NodeType || (NodeType = {}));
    function isElement(n) {
      return n.nodeType === n.ELEMENT_NODE;
    }
    function isShadowRoot(n) {
      var host = n === null || n === void 0 ? void 0 : n.host;
      return Boolean((host === null || host === void 0 ? void 0 : host.shadowRoot) === n);
    }
    function isNativeShadowDom(shadowRoot) {
      return Object.prototype.toString.call(shadowRoot) === "[object ShadowRoot]";
    }
    function fixBrowserCompatibilityIssuesInCSS(cssText) {
      if (cssText.includes(" background-clip: text;") && !cssText.includes(" -webkit-background-clip: text;")) {
        cssText = cssText.replace(" background-clip: text;", " -webkit-background-clip: text; background-clip: text;");
      }
      return cssText;
    }
    function getCssRulesString(s) {
      try {
        var rules = s.rules || s.cssRules;
        return rules ? fixBrowserCompatibilityIssuesInCSS(Array.from(rules).map(getCssRuleString).join("")) : null;
      } catch (error) {
        return null;
      }
    }
    function getCssRuleString(rule) {
      var cssStringified = rule.cssText;
      if (isCSSImportRule(rule)) {
        try {
          cssStringified = getCssRulesString(rule.styleSheet) || cssStringified;
        } catch (_a) {
        }
      }
      return cssStringified;
    }
    function isCSSImportRule(rule) {
      return "styleSheet" in rule;
    }
    var Mirror = function() {
      function Mirror2() {
        this.idNodeMap = /* @__PURE__ */ new Map();
        this.nodeMetaMap = /* @__PURE__ */ new WeakMap();
      }
      Mirror2.prototype.getId = function(n) {
        var _a;
        if (!n)
          return -1;
        var id = (_a = this.getMeta(n)) === null || _a === void 0 ? void 0 : _a.id;
        return id !== null && id !== void 0 ? id : -1;
      };
      Mirror2.prototype.getNode = function(id) {
        return this.idNodeMap.get(id) || null;
      };
      Mirror2.prototype.getIds = function() {
        return Array.from(this.idNodeMap.keys());
      };
      Mirror2.prototype.getMeta = function(n) {
        return this.nodeMetaMap.get(n) || null;
      };
      Mirror2.prototype.removeNodeFromMap = function(n) {
        var _this = this;
        var id = this.getId(n);
        this.idNodeMap["delete"](id);
        if (n.childNodes) {
          n.childNodes.forEach(function(childNode) {
            return _this.removeNodeFromMap(childNode);
          });
        }
      };
      Mirror2.prototype.has = function(id) {
        return this.idNodeMap.has(id);
      };
      Mirror2.prototype.hasNode = function(node) {
        return this.nodeMetaMap.has(node);
      };
      Mirror2.prototype.add = function(n, meta) {
        var id = meta.id;
        this.idNodeMap.set(id, n);
        this.nodeMetaMap.set(n, meta);
      };
      Mirror2.prototype.replace = function(id, n) {
        var oldNode = this.getNode(id);
        if (oldNode) {
          var meta = this.nodeMetaMap.get(oldNode);
          if (meta)
            this.nodeMetaMap.set(n, meta);
        }
        this.idNodeMap.set(id, n);
      };
      Mirror2.prototype.reset = function() {
        this.idNodeMap = /* @__PURE__ */ new Map();
        this.nodeMetaMap = /* @__PURE__ */ new WeakMap();
      };
      return Mirror2;
    }();
    function createMirror() {
      return new Mirror();
    }
    function maskInputValue(_a) {
      var maskInputOptions = _a.maskInputOptions, tagName = _a.tagName, type = _a.type, value = _a.value, maskInputFn = _a.maskInputFn;
      var text = value || "";
      if (maskInputOptions[tagName.toLowerCase()] || maskInputOptions[type]) {
        if (maskInputFn) {
          text = maskInputFn(text);
        } else {
          text = "*".repeat(text.length);
        }
      }
      return text;
    }
    var ORIGINAL_ATTRIBUTE_NAME = "__rrweb_original__";
    function is2DCanvasBlank(canvas) {
      var ctx = canvas.getContext("2d");
      if (!ctx)
        return true;
      var chunkSize = 50;
      for (var x = 0; x < canvas.width; x += chunkSize) {
        for (var y = 0; y < canvas.height; y += chunkSize) {
          var getImageData = ctx.getImageData;
          var originalGetImageData = ORIGINAL_ATTRIBUTE_NAME in getImageData ? getImageData[ORIGINAL_ATTRIBUTE_NAME] : getImageData;
          var pixelBuffer = new Uint32Array(originalGetImageData.call(ctx, x, y, Math.min(chunkSize, canvas.width - x), Math.min(chunkSize, canvas.height - y)).data.buffer);
          if (pixelBuffer.some(function(pixel) {
            return pixel !== 0;
          }))
            return false;
        }
      }
      return true;
    }
    var _id = 1;
    var tagNameRegex = new RegExp("[^a-z0-9-_:]");
    var IGNORED_NODE = -2;
    function genId() {
      return _id++;
    }
    function getValidTagName(element) {
      if (element instanceof HTMLFormElement) {
        return "form";
      }
      var processedTagName = element.tagName.toLowerCase().trim();
      if (tagNameRegex.test(processedTagName)) {
        return "div";
      }
      return processedTagName;
    }
    function stringifyStyleSheet(sheet) {
      return sheet.cssRules ? Array.from(sheet.cssRules).map(function(rule) {
        return rule.cssText || "";
      }).join("") : "";
    }
    function extractOrigin(url) {
      var origin = "";
      if (url.indexOf("//") > -1) {
        origin = url.split("/").slice(0, 3).join("/");
      } else {
        origin = url.split("/")[0];
      }
      origin = origin.split("?")[0];
      return origin;
    }
    var canvasService;
    var canvasCtx;
    var URL_IN_CSS_REF = /url\((?:(')([^']*)'|(")(.*?)"|([^)]*))\)/gm;
    var RELATIVE_PATH = /^(?!www\.|(?:http|ftp)s?:\/\/|[A-Za-z]:\\|\/\/|#).*/;
    var DATA_URI = /^(data:)([^,]*),(.*)/i;
    function absoluteToStylesheet(cssText, href) {
      return (cssText || "").replace(URL_IN_CSS_REF, function(origin, quote1, path1, quote2, path2, path3) {
        var filePath = path1 || path2 || path3;
        var maybeQuote = quote1 || quote2 || "";
        if (!filePath) {
          return origin;
        }
        if (!RELATIVE_PATH.test(filePath)) {
          return "url(".concat(maybeQuote).concat(filePath).concat(maybeQuote, ")");
        }
        if (DATA_URI.test(filePath)) {
          return "url(".concat(maybeQuote).concat(filePath).concat(maybeQuote, ")");
        }
        if (filePath[0] === "/") {
          return "url(".concat(maybeQuote).concat(extractOrigin(href) + filePath).concat(maybeQuote, ")");
        }
        var stack = href.split("/");
        var parts = filePath.split("/");
        stack.pop();
        for (var _i = 0, parts_1 = parts; _i < parts_1.length; _i++) {
          var part = parts_1[_i];
          if (part === ".") {
            continue;
          } else if (part === "..") {
            stack.pop();
          } else {
            stack.push(part);
          }
        }
        return "url(".concat(maybeQuote).concat(stack.join("/")).concat(maybeQuote, ")");
      });
    }
    var SRCSET_NOT_SPACES = /^[^ \t\n\r\u000c]+/;
    var SRCSET_COMMAS_OR_SPACES = /^[, \t\n\r\u000c]+/;
    function getAbsoluteSrcsetString(doc, attributeValue) {
      if (attributeValue.trim() === "") {
        return attributeValue;
      }
      var pos = 0;
      function collectCharacters(regEx) {
        var chars;
        var match = regEx.exec(attributeValue.substring(pos));
        if (match) {
          chars = match[0];
          pos += chars.length;
          return chars;
        }
        return "";
      }
      var output = [];
      while (true) {
        collectCharacters(SRCSET_COMMAS_OR_SPACES);
        if (pos >= attributeValue.length) {
          break;
        }
        var url = collectCharacters(SRCSET_NOT_SPACES);
        if (url.slice(-1) === ",") {
          url = absoluteToDoc(doc, url.substring(0, url.length - 1));
          output.push(url);
        } else {
          var descriptorsStr = "";
          url = absoluteToDoc(doc, url);
          var inParens = false;
          while (true) {
            var c = attributeValue.charAt(pos);
            if (c === "") {
              output.push((url + descriptorsStr).trim());
              break;
            } else if (!inParens) {
              if (c === ",") {
                pos += 1;
                output.push((url + descriptorsStr).trim());
                break;
              } else if (c === "(") {
                inParens = true;
              }
            } else {
              if (c === ")") {
                inParens = false;
              }
            }
            descriptorsStr += c;
            pos += 1;
          }
        }
      }
      return output.join(", ");
    }
    function absoluteToDoc(doc, attributeValue) {
      if (!attributeValue || attributeValue.trim() === "") {
        return attributeValue;
      }
      var a = doc.createElement("a");
      a.href = attributeValue;
      return a.href;
    }
    function isSVGElement(el) {
      return Boolean(el.tagName === "svg" || el.ownerSVGElement);
    }
    function getHref() {
      var a = document.createElement("a");
      a.href = "";
      return a.href;
    }
    function transformAttribute(doc, tagName, name, value) {
      if (name === "src" || name === "href" && value && !(tagName === "use" && value[0] === "#")) {
        return absoluteToDoc(doc, value);
      } else if (name === "xlink:href" && value && value[0] !== "#") {
        return absoluteToDoc(doc, value);
      } else if (name === "background" && value && (tagName === "table" || tagName === "td" || tagName === "th")) {
        return absoluteToDoc(doc, value);
      } else if (name === "srcset" && value) {
        return getAbsoluteSrcsetString(doc, value);
      } else if (name === "style" && value) {
        return absoluteToStylesheet(value, getHref());
      } else if (tagName === "object" && name === "data" && value) {
        return absoluteToDoc(doc, value);
      } else {
        return value;
      }
    }
    function _isBlockedElement(element, blockClass, blockSelector) {
      if (typeof blockClass === "string") {
        if (element.classList.contains(blockClass)) {
          return true;
        }
      } else {
        for (var eIndex = element.classList.length; eIndex--; ) {
          var className = element.classList[eIndex];
          if (blockClass.test(className)) {
            return true;
          }
        }
      }
      if (blockSelector) {
        return element.matches(blockSelector);
      }
      return false;
    }
    function classMatchesRegex(node, regex, checkAncestors) {
      if (!node)
        return false;
      if (node.nodeType !== node.ELEMENT_NODE) {
        if (!checkAncestors)
          return false;
        return classMatchesRegex(node.parentNode, regex, checkAncestors);
      }
      for (var eIndex = node.classList.length; eIndex--; ) {
        var className = node.classList[eIndex];
        if (regex.test(className)) {
          return true;
        }
      }
      if (!checkAncestors)
        return false;
      return classMatchesRegex(node.parentNode, regex, checkAncestors);
    }
    function needMaskingText(node, maskTextClass, maskTextSelector) {
      var el = node.nodeType === node.ELEMENT_NODE ? node : node.parentElement;
      if (el === null)
        return false;
      if (typeof maskTextClass === "string") {
        if (el.classList.contains(maskTextClass))
          return true;
        if (el.closest(".".concat(maskTextClass)))
          return true;
      } else {
        if (classMatchesRegex(el, maskTextClass, true))
          return true;
      }
      if (maskTextSelector) {
        if (el.matches(maskTextSelector))
          return true;
        if (el.closest(maskTextSelector))
          return true;
      }
      return false;
    }
    function onceIframeLoaded(iframeEl, listener, iframeLoadTimeout) {
      var win = iframeEl.contentWindow;
      if (!win) {
        return;
      }
      var fired = false;
      var readyState;
      try {
        readyState = win.document.readyState;
      } catch (error) {
        return;
      }
      if (readyState !== "complete") {
        var timer_1 = setTimeout(function() {
          if (!fired) {
            listener();
            fired = true;
          }
        }, iframeLoadTimeout);
        iframeEl.addEventListener("load", function() {
          clearTimeout(timer_1);
          fired = true;
          listener();
        });
        return;
      }
      var blankUrl = "about:blank";
      if (win.location.href !== blankUrl || iframeEl.src === blankUrl || iframeEl.src === "") {
        setTimeout(listener, 0);
        return iframeEl.addEventListener("load", listener);
      }
      iframeEl.addEventListener("load", listener);
    }
    function onceStylesheetLoaded(link, listener, styleSheetLoadTimeout) {
      var fired = false;
      var styleSheetLoaded;
      try {
        styleSheetLoaded = link.sheet;
      } catch (error) {
        return;
      }
      if (styleSheetLoaded)
        return;
      var timer = setTimeout(function() {
        if (!fired) {
          listener();
          fired = true;
        }
      }, styleSheetLoadTimeout);
      link.addEventListener("load", function() {
        clearTimeout(timer);
        fired = true;
        listener();
      });
    }
    function serializeNode(n, options) {
      var doc = options.doc, mirror = options.mirror, blockClass = options.blockClass, blockSelector = options.blockSelector, maskTextClass = options.maskTextClass, maskTextSelector = options.maskTextSelector, inlineStylesheet = options.inlineStylesheet, _a = options.maskInputOptions, maskInputOptions = _a === void 0 ? {} : _a, maskTextFn = options.maskTextFn, maskInputFn = options.maskInputFn, _b = options.dataURLOptions, dataURLOptions = _b === void 0 ? {} : _b, inlineImages = options.inlineImages, recordCanvas = options.recordCanvas, keepIframeSrcFn = options.keepIframeSrcFn, _c = options.newlyAddedElement, newlyAddedElement = _c === void 0 ? false : _c;
      var rootId = getRootId(doc, mirror);
      switch (n.nodeType) {
        case n.DOCUMENT_NODE:
          if (n.compatMode !== "CSS1Compat") {
            return {
              type: NodeType.Document,
              childNodes: [],
              compatMode: n.compatMode
            };
          } else {
            return {
              type: NodeType.Document,
              childNodes: []
            };
          }
        case n.DOCUMENT_TYPE_NODE:
          return {
            type: NodeType.DocumentType,
            name: n.name,
            publicId: n.publicId,
            systemId: n.systemId,
            rootId
          };
        case n.ELEMENT_NODE:
          return serializeElementNode(n, {
            doc,
            blockClass,
            blockSelector,
            inlineStylesheet,
            maskInputOptions,
            maskInputFn,
            dataURLOptions,
            inlineImages,
            recordCanvas,
            keepIframeSrcFn,
            newlyAddedElement,
            rootId
          });
        case n.TEXT_NODE:
          return serializeTextNode(n, {
            maskTextClass,
            maskTextSelector,
            maskTextFn,
            rootId
          });
        case n.CDATA_SECTION_NODE:
          return {
            type: NodeType.CDATA,
            textContent: "",
            rootId
          };
        case n.COMMENT_NODE:
          return {
            type: NodeType.Comment,
            textContent: n.textContent || "",
            rootId
          };
        default:
          return false;
      }
    }
    function getRootId(doc, mirror) {
      if (!mirror.hasNode(doc))
        return void 0;
      var docId = mirror.getId(doc);
      return docId === 1 ? void 0 : docId;
    }
    function serializeTextNode(n, options) {
      var _a;
      var maskTextClass = options.maskTextClass, maskTextSelector = options.maskTextSelector, maskTextFn = options.maskTextFn, rootId = options.rootId;
      var parentTagName = n.parentNode && n.parentNode.tagName;
      var textContent = n.textContent;
      var isStyle = parentTagName === "STYLE" ? true : void 0;
      var isScript = parentTagName === "SCRIPT" ? true : void 0;
      if (isStyle && textContent) {
        try {
          if (n.nextSibling || n.previousSibling) {
          } else if ((_a = n.parentNode.sheet) === null || _a === void 0 ? void 0 : _a.cssRules) {
            textContent = stringifyStyleSheet(n.parentNode.sheet);
          }
        } catch (err) {
          console.warn("Cannot get CSS styles from text's parentNode. Error: ".concat(err), n);
        }
        textContent = absoluteToStylesheet(textContent, getHref());
      }
      if (isScript) {
        textContent = "SCRIPT_PLACEHOLDER";
      }
      if (!isStyle && !isScript && textContent && needMaskingText(n, maskTextClass, maskTextSelector)) {
        textContent = maskTextFn ? maskTextFn(textContent) : textContent.replace(/[\S]/g, "*");
      }
      return {
        type: NodeType.Text,
        textContent: textContent || "",
        isStyle,
        rootId
      };
    }
    function serializeElementNode(n, options) {
      var doc = options.doc, blockClass = options.blockClass, blockSelector = options.blockSelector, inlineStylesheet = options.inlineStylesheet, _a = options.maskInputOptions, maskInputOptions = _a === void 0 ? {} : _a, maskInputFn = options.maskInputFn, _b = options.dataURLOptions, dataURLOptions = _b === void 0 ? {} : _b, inlineImages = options.inlineImages, recordCanvas = options.recordCanvas, keepIframeSrcFn = options.keepIframeSrcFn, _c = options.newlyAddedElement, newlyAddedElement = _c === void 0 ? false : _c, rootId = options.rootId;
      var needBlock = _isBlockedElement(n, blockClass, blockSelector);
      var tagName = getValidTagName(n);
      var attributes = {};
      var len = n.attributes.length;
      for (var i = 0; i < len; i++) {
        var attr = n.attributes[i];
        attributes[attr.name] = transformAttribute(doc, tagName, attr.name, attr.value);
      }
      if (tagName === "link" && inlineStylesheet) {
        var stylesheet = Array.from(doc.styleSheets).find(function(s) {
          return s.href === n.href;
        });
        var cssText = null;
        if (stylesheet) {
          cssText = getCssRulesString(stylesheet);
        }
        if (cssText) {
          delete attributes.rel;
          delete attributes.href;
          attributes._cssText = absoluteToStylesheet(cssText, stylesheet.href);
        }
      }
      if (tagName === "style" && n.sheet && !(n.innerText || n.textContent || "").trim().length) {
        var cssText = getCssRulesString(n.sheet);
        if (cssText) {
          attributes._cssText = absoluteToStylesheet(cssText, getHref());
        }
      }
      if (tagName === "input" || tagName === "textarea" || tagName === "select") {
        var value = n.value;
        var checked = n.checked;
        if (attributes.type !== "radio" && attributes.type !== "checkbox" && attributes.type !== "submit" && attributes.type !== "button" && value) {
          attributes.value = maskInputValue({
            type: attributes.type,
            tagName,
            value,
            maskInputOptions,
            maskInputFn
          });
        } else if (checked) {
          attributes.checked = checked;
        }
      }
      if (tagName === "option") {
        if (n.selected && !maskInputOptions["select"]) {
          attributes.selected = true;
        } else {
          delete attributes.selected;
        }
      }
      if (tagName === "canvas" && recordCanvas) {
        if (n.__context === "2d") {
          if (!is2DCanvasBlank(n)) {
            attributes.rr_dataURL = n.toDataURL(dataURLOptions.type, dataURLOptions.quality);
          }
        } else if (!("__context" in n)) {
          var canvasDataURL = n.toDataURL(dataURLOptions.type, dataURLOptions.quality);
          var blankCanvas = document.createElement("canvas");
          blankCanvas.width = n.width;
          blankCanvas.height = n.height;
          var blankCanvasDataURL = blankCanvas.toDataURL(dataURLOptions.type, dataURLOptions.quality);
          if (canvasDataURL !== blankCanvasDataURL) {
            attributes.rr_dataURL = canvasDataURL;
          }
        }
      }
      if (tagName === "img" && inlineImages) {
        if (!canvasService) {
          canvasService = doc.createElement("canvas");
          canvasCtx = canvasService.getContext("2d");
        }
        var image_1 = n;
        var oldValue_1 = image_1.crossOrigin;
        image_1.crossOrigin = "anonymous";
        var recordInlineImage = function() {
          try {
            canvasService.width = image_1.naturalWidth;
            canvasService.height = image_1.naturalHeight;
            canvasCtx.drawImage(image_1, 0, 0);
            attributes.rr_dataURL = canvasService.toDataURL(dataURLOptions.type, dataURLOptions.quality);
          } catch (err) {
            console.warn("Cannot inline img src=".concat(image_1.currentSrc, "! Error: ").concat(err));
          }
          oldValue_1 ? attributes.crossOrigin = oldValue_1 : image_1.removeAttribute("crossorigin");
        };
        if (image_1.complete && image_1.naturalWidth !== 0)
          recordInlineImage();
        else
          image_1.onload = recordInlineImage;
      }
      if (tagName === "audio" || tagName === "video") {
        attributes.rr_mediaState = n.paused ? "paused" : "played";
        attributes.rr_mediaCurrentTime = n.currentTime;
      }
      if (!newlyAddedElement) {
        if (n.scrollLeft) {
          attributes.rr_scrollLeft = n.scrollLeft;
        }
        if (n.scrollTop) {
          attributes.rr_scrollTop = n.scrollTop;
        }
      }
      if (needBlock) {
        var _d = n.getBoundingClientRect(), width = _d.width, height = _d.height;
        attributes = {
          "class": attributes["class"],
          rr_width: "".concat(width, "px"),
          rr_height: "".concat(height, "px")
        };
      }
      if (tagName === "iframe" && !keepIframeSrcFn(attributes.src)) {
        if (!n.contentDocument) {
          attributes.rr_src = attributes.src;
        }
        delete attributes.src;
      }
      return {
        type: NodeType.Element,
        tagName,
        attributes,
        childNodes: [],
        isSVG: isSVGElement(n) || void 0,
        needBlock,
        rootId
      };
    }
    function lowerIfExists(maybeAttr) {
      if (maybeAttr === void 0) {
        return "";
      } else {
        return maybeAttr.toLowerCase();
      }
    }
    function slimDOMExcluded(sn, slimDOMOptions) {
      if (slimDOMOptions.comment && sn.type === NodeType.Comment) {
        return true;
      } else if (sn.type === NodeType.Element) {
        if (slimDOMOptions.script && (sn.tagName === "script" || sn.tagName === "link" && sn.attributes.rel === "preload" && sn.attributes.as === "script" || sn.tagName === "link" && sn.attributes.rel === "prefetch" && typeof sn.attributes.href === "string" && sn.attributes.href.endsWith(".js"))) {
          return true;
        } else if (slimDOMOptions.headFavicon && (sn.tagName === "link" && sn.attributes.rel === "shortcut icon" || sn.tagName === "meta" && (lowerIfExists(sn.attributes.name).match(/^msapplication-tile(image|color)$/) || lowerIfExists(sn.attributes.name) === "application-name" || lowerIfExists(sn.attributes.rel) === "icon" || lowerIfExists(sn.attributes.rel) === "apple-touch-icon" || lowerIfExists(sn.attributes.rel) === "shortcut icon"))) {
          return true;
        } else if (sn.tagName === "meta") {
          if (slimDOMOptions.headMetaDescKeywords && lowerIfExists(sn.attributes.name).match(/^description|keywords$/)) {
            return true;
          } else if (slimDOMOptions.headMetaSocial && (lowerIfExists(sn.attributes.property).match(/^(og|twitter|fb):/) || lowerIfExists(sn.attributes.name).match(/^(og|twitter):/) || lowerIfExists(sn.attributes.name) === "pinterest")) {
            return true;
          } else if (slimDOMOptions.headMetaRobots && (lowerIfExists(sn.attributes.name) === "robots" || lowerIfExists(sn.attributes.name) === "googlebot" || lowerIfExists(sn.attributes.name) === "bingbot")) {
            return true;
          } else if (slimDOMOptions.headMetaHttpEquiv && sn.attributes["http-equiv"] !== void 0) {
            return true;
          } else if (slimDOMOptions.headMetaAuthorship && (lowerIfExists(sn.attributes.name) === "author" || lowerIfExists(sn.attributes.name) === "generator" || lowerIfExists(sn.attributes.name) === "framework" || lowerIfExists(sn.attributes.name) === "publisher" || lowerIfExists(sn.attributes.name) === "progid" || lowerIfExists(sn.attributes.property).match(/^article:/) || lowerIfExists(sn.attributes.property).match(/^product:/))) {
            return true;
          } else if (slimDOMOptions.headMetaVerification && (lowerIfExists(sn.attributes.name) === "google-site-verification" || lowerIfExists(sn.attributes.name) === "yandex-verification" || lowerIfExists(sn.attributes.name) === "csrf-token" || lowerIfExists(sn.attributes.name) === "p:domain_verify" || lowerIfExists(sn.attributes.name) === "verify-v1" || lowerIfExists(sn.attributes.name) === "verification" || lowerIfExists(sn.attributes.name) === "shopify-checkout-api-token")) {
            return true;
          }
        }
      }
      return false;
    }
    function serializeNodeWithId(n, options) {
      var doc = options.doc, mirror = options.mirror, blockClass = options.blockClass, blockSelector = options.blockSelector, maskTextClass = options.maskTextClass, maskTextSelector = options.maskTextSelector, _a = options.skipChild, skipChild = _a === void 0 ? false : _a, _b = options.inlineStylesheet, inlineStylesheet = _b === void 0 ? true : _b, _c = options.maskInputOptions, maskInputOptions = _c === void 0 ? {} : _c, maskTextFn = options.maskTextFn, maskInputFn = options.maskInputFn, slimDOMOptions = options.slimDOMOptions, _d = options.dataURLOptions, dataURLOptions = _d === void 0 ? {} : _d, _e = options.inlineImages, inlineImages = _e === void 0 ? false : _e, _f = options.recordCanvas, recordCanvas = _f === void 0 ? false : _f, onSerialize = options.onSerialize, onIframeLoad = options.onIframeLoad, _g = options.iframeLoadTimeout, iframeLoadTimeout = _g === void 0 ? 5e3 : _g, onStylesheetLoad = options.onStylesheetLoad, _h = options.stylesheetLoadTimeout, stylesheetLoadTimeout = _h === void 0 ? 5e3 : _h, _j = options.keepIframeSrcFn, keepIframeSrcFn = _j === void 0 ? function() {
        return false;
      } : _j, _k = options.newlyAddedElement, newlyAddedElement = _k === void 0 ? false : _k;
      var _l = options.preserveWhiteSpace, preserveWhiteSpace = _l === void 0 ? true : _l;
      var _serializedNode = serializeNode(n, {
        doc,
        mirror,
        blockClass,
        blockSelector,
        maskTextClass,
        maskTextSelector,
        inlineStylesheet,
        maskInputOptions,
        maskTextFn,
        maskInputFn,
        dataURLOptions,
        inlineImages,
        recordCanvas,
        keepIframeSrcFn,
        newlyAddedElement
      });
      if (!_serializedNode) {
        console.warn(n, "not serialized");
        return null;
      }
      var id;
      if (mirror.hasNode(n)) {
        id = mirror.getId(n);
      } else if (slimDOMExcluded(_serializedNode, slimDOMOptions) || !preserveWhiteSpace && _serializedNode.type === NodeType.Text && !_serializedNode.isStyle && !_serializedNode.textContent.replace(/^\s+|\s+$/gm, "").length) {
        id = IGNORED_NODE;
      } else {
        id = genId();
      }
      var serializedNode = Object.assign(_serializedNode, { id });
      mirror.add(n, serializedNode);
      if (id === IGNORED_NODE) {
        return null;
      }
      if (onSerialize) {
        onSerialize(n);
      }
      var recordChild = !skipChild;
      if (serializedNode.type === NodeType.Element) {
        recordChild = recordChild && !serializedNode.needBlock;
        delete serializedNode.needBlock;
        var shadowRoot = n.shadowRoot;
        if (shadowRoot && isNativeShadowDom(shadowRoot))
          serializedNode.isShadowHost = true;
      }
      if ((serializedNode.type === NodeType.Document || serializedNode.type === NodeType.Element) && recordChild) {
        if (slimDOMOptions.headWhitespace && serializedNode.type === NodeType.Element && serializedNode.tagName === "head") {
          preserveWhiteSpace = false;
        }
        var bypassOptions = {
          doc,
          mirror,
          blockClass,
          blockSelector,
          maskTextClass,
          maskTextSelector,
          skipChild,
          inlineStylesheet,
          maskInputOptions,
          maskTextFn,
          maskInputFn,
          slimDOMOptions,
          dataURLOptions,
          inlineImages,
          recordCanvas,
          preserveWhiteSpace,
          onSerialize,
          onIframeLoad,
          iframeLoadTimeout,
          onStylesheetLoad,
          stylesheetLoadTimeout,
          keepIframeSrcFn
        };
        for (var _i = 0, _m = Array.from(n.childNodes); _i < _m.length; _i++) {
          var childN = _m[_i];
          var serializedChildNode = serializeNodeWithId(childN, bypassOptions);
          if (serializedChildNode) {
            serializedNode.childNodes.push(serializedChildNode);
          }
        }
        if (isElement(n) && n.shadowRoot) {
          for (var _o = 0, _p = Array.from(n.shadowRoot.childNodes); _o < _p.length; _o++) {
            var childN = _p[_o];
            var serializedChildNode = serializeNodeWithId(childN, bypassOptions);
            if (serializedChildNode) {
              isNativeShadowDom(n.shadowRoot) && (serializedChildNode.isShadow = true);
              serializedNode.childNodes.push(serializedChildNode);
            }
          }
        }
      }
      if (n.parentNode && isShadowRoot(n.parentNode) && isNativeShadowDom(n.parentNode)) {
        serializedNode.isShadow = true;
      }
      if (serializedNode.type === NodeType.Element && serializedNode.tagName === "iframe") {
        onceIframeLoaded(n, function() {
          var iframeDoc = n.contentDocument;
          if (iframeDoc && onIframeLoad) {
            var serializedIframeNode = serializeNodeWithId(iframeDoc, {
              doc: iframeDoc,
              mirror,
              blockClass,
              blockSelector,
              maskTextClass,
              maskTextSelector,
              skipChild: false,
              inlineStylesheet,
              maskInputOptions,
              maskTextFn,
              maskInputFn,
              slimDOMOptions,
              dataURLOptions,
              inlineImages,
              recordCanvas,
              preserveWhiteSpace,
              onSerialize,
              onIframeLoad,
              iframeLoadTimeout,
              onStylesheetLoad,
              stylesheetLoadTimeout,
              keepIframeSrcFn
            });
            if (serializedIframeNode) {
              onIframeLoad(n, serializedIframeNode);
            }
          }
        }, iframeLoadTimeout);
      }
      if (serializedNode.type === NodeType.Element && serializedNode.tagName === "link" && serializedNode.attributes.rel === "stylesheet") {
        onceStylesheetLoaded(n, function() {
          if (onStylesheetLoad) {
            var serializedLinkNode = serializeNodeWithId(n, {
              doc,
              mirror,
              blockClass,
              blockSelector,
              maskTextClass,
              maskTextSelector,
              skipChild: false,
              inlineStylesheet,
              maskInputOptions,
              maskTextFn,
              maskInputFn,
              slimDOMOptions,
              dataURLOptions,
              inlineImages,
              recordCanvas,
              preserveWhiteSpace,
              onSerialize,
              onIframeLoad,
              iframeLoadTimeout,
              onStylesheetLoad,
              stylesheetLoadTimeout,
              keepIframeSrcFn
            });
            if (serializedLinkNode) {
              onStylesheetLoad(n, serializedLinkNode);
            }
          }
        }, stylesheetLoadTimeout);
      }
      return serializedNode;
    }
    function snapshot(n, options) {
      var _a = options || {}, _b = _a.mirror, mirror = _b === void 0 ? new Mirror() : _b, _c = _a.blockClass, blockClass = _c === void 0 ? "rr-block" : _c, _d = _a.blockSelector, blockSelector = _d === void 0 ? null : _d, _e = _a.maskTextClass, maskTextClass = _e === void 0 ? "rr-mask" : _e, _f = _a.maskTextSelector, maskTextSelector = _f === void 0 ? null : _f, _g = _a.inlineStylesheet, inlineStylesheet = _g === void 0 ? true : _g, _h = _a.inlineImages, inlineImages = _h === void 0 ? false : _h, _j = _a.recordCanvas, recordCanvas = _j === void 0 ? false : _j, _k = _a.maskAllInputs, maskAllInputs = _k === void 0 ? false : _k, maskTextFn = _a.maskTextFn, maskInputFn = _a.maskInputFn, _l = _a.slimDOM, slimDOM = _l === void 0 ? false : _l, dataURLOptions = _a.dataURLOptions, preserveWhiteSpace = _a.preserveWhiteSpace, onSerialize = _a.onSerialize, onIframeLoad = _a.onIframeLoad, iframeLoadTimeout = _a.iframeLoadTimeout, onStylesheetLoad = _a.onStylesheetLoad, stylesheetLoadTimeout = _a.stylesheetLoadTimeout, _m = _a.keepIframeSrcFn, keepIframeSrcFn = _m === void 0 ? function() {
        return false;
      } : _m;
      var maskInputOptions = maskAllInputs === true ? {
        color: true,
        date: true,
        "datetime-local": true,
        email: true,
        month: true,
        number: true,
        range: true,
        search: true,
        tel: true,
        text: true,
        time: true,
        url: true,
        week: true,
        textarea: true,
        select: true,
        password: true
      } : maskAllInputs === false ? {
        password: true
      } : maskAllInputs;
      var slimDOMOptions = slimDOM === true || slimDOM === "all" ? {
        script: true,
        comment: true,
        headFavicon: true,
        headWhitespace: true,
        headMetaDescKeywords: slimDOM === "all",
        headMetaSocial: true,
        headMetaRobots: true,
        headMetaHttpEquiv: true,
        headMetaAuthorship: true,
        headMetaVerification: true
      } : slimDOM === false ? {} : slimDOM;
      return serializeNodeWithId(n, {
        doc: n,
        mirror,
        blockClass,
        blockSelector,
        maskTextClass,
        maskTextSelector,
        skipChild: false,
        inlineStylesheet,
        maskInputOptions,
        maskTextFn,
        maskInputFn,
        slimDOMOptions,
        dataURLOptions,
        inlineImages,
        recordCanvas,
        preserveWhiteSpace,
        onSerialize,
        onIframeLoad,
        iframeLoadTimeout,
        onStylesheetLoad,
        stylesheetLoadTimeout,
        keepIframeSrcFn,
        newlyAddedElement: false
      });
    }

    function on(type, fn, target = document) {
      const options = { capture: true, passive: true };
      target.addEventListener(type, fn, options);
      return () => target.removeEventListener(type, fn, options);
    }
    const DEPARTED_MIRROR_ACCESS_WARNING = "Please stop import mirror directly. Instead of that,\r\nnow you can use replayer.getMirror() to access the mirror instance of a replayer,\r\nor you can use record.mirror to access the mirror instance during recording.";
    let _mirror = {
      map: {},
      getId() {
        console.error(DEPARTED_MIRROR_ACCESS_WARNING);
        return -1;
      },
      getNode() {
        console.error(DEPARTED_MIRROR_ACCESS_WARNING);
        return null;
      },
      removeNodeFromMap() {
        console.error(DEPARTED_MIRROR_ACCESS_WARNING);
      },
      has() {
        console.error(DEPARTED_MIRROR_ACCESS_WARNING);
        return false;
      },
      reset() {
        console.error(DEPARTED_MIRROR_ACCESS_WARNING);
      }
    };
    if (typeof window !== "undefined" && window.Proxy && window.Reflect) {
      _mirror = new Proxy(_mirror, {
        get(target, prop, receiver) {
          if (prop === "map") {
            console.error(DEPARTED_MIRROR_ACCESS_WARNING);
          }
          return Reflect.get(target, prop, receiver);
        }
      });
    }
    function throttle(func, wait, options = {}) {
      let timeout = null;
      let previous = 0;
      return function(...args) {
        const now = Date.now();
        if (!previous && options.leading === false) {
          previous = now;
        }
        const remaining = wait - (now - previous);
        const context = this;
        if (remaining <= 0 || remaining > wait) {
          if (timeout) {
            clearTimeout(timeout);
            timeout = null;
          }
          previous = now;
          func.apply(context, args);
        } else if (!timeout && options.trailing !== false) {
          timeout = setTimeout(() => {
            previous = options.leading === false ? 0 : Date.now();
            timeout = null;
            func.apply(context, args);
          }, remaining);
        }
      };
    }
    function hookSetter(target, key, d, isRevoked, win = window) {
      const original = win.Object.getOwnPropertyDescriptor(target, key);
      win.Object.defineProperty(target, key, isRevoked ? d : {
        set(value) {
          setTimeout(() => {
            d.set.call(this, value);
          }, 0);
          if (original && original.set) {
            original.set.call(this, value);
          }
        }
      });
      return () => hookSetter(target, key, original || {}, true);
    }
    function patch(source, name, replacement) {
      try {
        if (!(name in source)) {
          return () => {
          };
        }
        const original = source[name];
        const wrapped = replacement(original);
        if (typeof wrapped === "function") {
          wrapped.prototype = wrapped.prototype || {};
          Object.defineProperties(wrapped, {
            __rrweb_original__: {
              enumerable: false,
              value: original
            }
          });
        }
        source[name] = wrapped;
        return () => {
          source[name] = original;
        };
      } catch (e) {
        return () => {
        };
      }
    }
    function getWindowHeight() {
      return window.innerHeight || document.documentElement && document.documentElement.clientHeight || document.body && document.body.clientHeight;
    }
    function getWindowWidth() {
      return window.innerWidth || document.documentElement && document.documentElement.clientWidth || document.body && document.body.clientWidth;
    }
    function isBlocked(node, blockClass, blockSelector, checkAncestors) {
      if (!node) {
        return false;
      }
      const el = node.nodeType === node.ELEMENT_NODE ? node : node.parentElement;
      if (!el)
        return false;
      if (typeof blockClass === "string") {
        if (el.classList.contains(blockClass))
          return true;
        if (checkAncestors && el.closest("." + blockClass) !== null)
          return true;
      } else {
        if (classMatchesRegex(el, blockClass, checkAncestors))
          return true;
      }
      if (blockSelector) {
        if (node.matches(blockSelector))
          return true;
        if (checkAncestors && el.closest(blockSelector) !== null)
          return true;
      }
      return false;
    }
    function isSerialized(n, mirror) {
      return mirror.getId(n) !== -1;
    }
    function isIgnored(n, mirror) {
      return mirror.getId(n) === IGNORED_NODE;
    }
    function isAncestorRemoved(target, mirror) {
      if (isShadowRoot(target)) {
        return false;
      }
      const id = mirror.getId(target);
      if (!mirror.has(id)) {
        return true;
      }
      if (target.parentNode && target.parentNode.nodeType === target.DOCUMENT_NODE) {
        return false;
      }
      if (!target.parentNode) {
        return true;
      }
      return isAncestorRemoved(target.parentNode, mirror);
    }
    function isTouchEvent(event) {
      return Boolean(event.changedTouches);
    }
    function polyfill(win = window) {
      if ("NodeList" in win && !win.NodeList.prototype.forEach) {
        win.NodeList.prototype.forEach = Array.prototype.forEach;
      }
      if ("DOMTokenList" in win && !win.DOMTokenList.prototype.forEach) {
        win.DOMTokenList.prototype.forEach = Array.prototype.forEach;
      }
      if (!Node.prototype.contains) {
        Node.prototype.contains = (...args) => {
          let node = args[0];
          if (!(0 in args)) {
            throw new TypeError("1 argument is required");
          }
          do {
            if (this === node) {
              return true;
            }
          } while (node = node && node.parentNode);
          return false;
        };
      }
    }
    function isSerializedIframe(n, mirror) {
      return Boolean(n.nodeName === "IFRAME" && mirror.getMeta(n));
    }
    function isSerializedStylesheet(n, mirror) {
      return Boolean(n.nodeName === "LINK" && n.nodeType === n.ELEMENT_NODE && n.getAttribute && n.getAttribute("rel") === "stylesheet" && mirror.getMeta(n));
    }
    function hasShadowRoot(n) {
      return Boolean(n == null ? void 0 : n.shadowRoot);
    }
    class StyleSheetMirror {
      constructor() {
        this.id = 1;
        this.styleIDMap = /* @__PURE__ */ new WeakMap();
        this.idStyleMap = /* @__PURE__ */ new Map();
      }
      getId(stylesheet) {
        var _a;
        return (_a = this.styleIDMap.get(stylesheet)) != null ? _a : -1;
      }
      has(stylesheet) {
        return this.styleIDMap.has(stylesheet);
      }
      add(stylesheet, id) {
        if (this.has(stylesheet))
          return this.getId(stylesheet);
        let newId;
        if (id === void 0) {
          newId = this.id++;
        } else
          newId = id;
        this.styleIDMap.set(stylesheet, newId);
        this.idStyleMap.set(newId, stylesheet);
        return newId;
      }
      getStyle(id) {
        return this.idStyleMap.get(id) || null;
      }
      reset() {
        this.styleIDMap = /* @__PURE__ */ new WeakMap();
        this.idStyleMap = /* @__PURE__ */ new Map();
        this.id = 1;
      }
      generateId() {
        return this.id++;
      }
    }

    var EventType = /* @__PURE__ */ ((EventType2) => {
      EventType2[EventType2["DomContentLoaded"] = 0] = "DomContentLoaded";
      EventType2[EventType2["Load"] = 1] = "Load";
      EventType2[EventType2["FullSnapshot"] = 2] = "FullSnapshot";
      EventType2[EventType2["IncrementalSnapshot"] = 3] = "IncrementalSnapshot";
      EventType2[EventType2["Meta"] = 4] = "Meta";
      EventType2[EventType2["Custom"] = 5] = "Custom";
      EventType2[EventType2["Plugin"] = 6] = "Plugin";
      return EventType2;
    })(EventType || {});
    var IncrementalSource = /* @__PURE__ */ ((IncrementalSource2) => {
      IncrementalSource2[IncrementalSource2["Mutation"] = 0] = "Mutation";
      IncrementalSource2[IncrementalSource2["MouseMove"] = 1] = "MouseMove";
      IncrementalSource2[IncrementalSource2["MouseInteraction"] = 2] = "MouseInteraction";
      IncrementalSource2[IncrementalSource2["Scroll"] = 3] = "Scroll";
      IncrementalSource2[IncrementalSource2["ViewportResize"] = 4] = "ViewportResize";
      IncrementalSource2[IncrementalSource2["Input"] = 5] = "Input";
      IncrementalSource2[IncrementalSource2["TouchMove"] = 6] = "TouchMove";
      IncrementalSource2[IncrementalSource2["MediaInteraction"] = 7] = "MediaInteraction";
      IncrementalSource2[IncrementalSource2["StyleSheetRule"] = 8] = "StyleSheetRule";
      IncrementalSource2[IncrementalSource2["CanvasMutation"] = 9] = "CanvasMutation";
      IncrementalSource2[IncrementalSource2["Font"] = 10] = "Font";
      IncrementalSource2[IncrementalSource2["Log"] = 11] = "Log";
      IncrementalSource2[IncrementalSource2["Drag"] = 12] = "Drag";
      IncrementalSource2[IncrementalSource2["StyleDeclaration"] = 13] = "StyleDeclaration";
      IncrementalSource2[IncrementalSource2["Selection"] = 14] = "Selection";
      IncrementalSource2[IncrementalSource2["AdoptedStyleSheet"] = 15] = "AdoptedStyleSheet";
      return IncrementalSource2;
    })(IncrementalSource || {});
    var MouseInteractions = /* @__PURE__ */ ((MouseInteractions2) => {
      MouseInteractions2[MouseInteractions2["MouseUp"] = 0] = "MouseUp";
      MouseInteractions2[MouseInteractions2["MouseDown"] = 1] = "MouseDown";
      MouseInteractions2[MouseInteractions2["Click"] = 2] = "Click";
      MouseInteractions2[MouseInteractions2["ContextMenu"] = 3] = "ContextMenu";
      MouseInteractions2[MouseInteractions2["DblClick"] = 4] = "DblClick";
      MouseInteractions2[MouseInteractions2["Focus"] = 5] = "Focus";
      MouseInteractions2[MouseInteractions2["Blur"] = 6] = "Blur";
      MouseInteractions2[MouseInteractions2["TouchStart"] = 7] = "TouchStart";
      MouseInteractions2[MouseInteractions2["TouchMove_Departed"] = 8] = "TouchMove_Departed";
      MouseInteractions2[MouseInteractions2["TouchEnd"] = 9] = "TouchEnd";
      MouseInteractions2[MouseInteractions2["TouchCancel"] = 10] = "TouchCancel";
      return MouseInteractions2;
    })(MouseInteractions || {});
    var CanvasContext = /* @__PURE__ */ ((CanvasContext2) => {
      CanvasContext2[CanvasContext2["2D"] = 0] = "2D";
      CanvasContext2[CanvasContext2["WebGL"] = 1] = "WebGL";
      CanvasContext2[CanvasContext2["WebGL2"] = 2] = "WebGL2";
      return CanvasContext2;
    })(CanvasContext || {});
    var MediaInteractions = /* @__PURE__ */ ((MediaInteractions2) => {
      MediaInteractions2[MediaInteractions2["Play"] = 0] = "Play";
      MediaInteractions2[MediaInteractions2["Pause"] = 1] = "Pause";
      MediaInteractions2[MediaInteractions2["Seeked"] = 2] = "Seeked";
      MediaInteractions2[MediaInteractions2["VolumeChange"] = 3] = "VolumeChange";
      MediaInteractions2[MediaInteractions2["RateChange"] = 4] = "RateChange";
      return MediaInteractions2;
    })(MediaInteractions || {});

    function isNodeInLinkedList(n) {
      return "__ln" in n;
    }
    class DoubleLinkedList {
      constructor() {
        this.length = 0;
        this.head = null;
      }
      get(position) {
        if (position >= this.length) {
          throw new Error("Position outside of list range");
        }
        let current = this.head;
        for (let index = 0; index < position; index++) {
          current = (current == null ? void 0 : current.next) || null;
        }
        return current;
      }
      addNode(n) {
        const node = {
          value: n,
          previous: null,
          next: null
        };
        n.__ln = node;
        if (n.previousSibling && isNodeInLinkedList(n.previousSibling)) {
          const current = n.previousSibling.__ln.next;
          node.next = current;
          node.previous = n.previousSibling.__ln;
          n.previousSibling.__ln.next = node;
          if (current) {
            current.previous = node;
          }
        } else if (n.nextSibling && isNodeInLinkedList(n.nextSibling) && n.nextSibling.__ln.previous) {
          const current = n.nextSibling.__ln.previous;
          node.previous = current;
          node.next = n.nextSibling.__ln;
          n.nextSibling.__ln.previous = node;
          if (current) {
            current.next = node;
          }
        } else {
          if (this.head) {
            this.head.previous = node;
          }
          node.next = this.head;
          this.head = node;
        }
        this.length++;
      }
      removeNode(n) {
        const current = n.__ln;
        if (!this.head) {
          return;
        }
        if (!current.previous) {
          this.head = current.next;
          if (this.head) {
            this.head.previous = null;
          }
        } else {
          current.previous.next = current.next;
          if (current.next) {
            current.next.previous = current.previous;
          }
        }
        if (n.__ln) {
          delete n.__ln;
        }
        this.length--;
      }
    }
    const moveKey = (id, parentId) => `${id}@${parentId}`;
    class MutationBuffer {
      constructor() {
        this.frozen = false;
        this.locked = false;
        this.texts = [];
        this.attributes = [];
        this.removes = [];
        this.mapRemoves = [];
        this.movedMap = {};
        this.addedSet = /* @__PURE__ */ new Set();
        this.movedSet = /* @__PURE__ */ new Set();
        this.droppedSet = /* @__PURE__ */ new Set();
        this.processMutations = (mutations) => {
          mutations.forEach(this.processMutation);
          this.emit();
        };
        this.emit = () => {
          if (this.frozen || this.locked) {
            return;
          }
          const adds = [];
          const addList = new DoubleLinkedList();
          const getNextId = (n) => {
            let ns = n;
            let nextId = IGNORED_NODE;
            while (nextId === IGNORED_NODE) {
              ns = ns && ns.nextSibling;
              nextId = ns && this.mirror.getId(ns);
            }
            return nextId;
          };
          const pushAdd = (n) => {
            var _a, _b, _c, _d;
            let shadowHost = null;
            if (((_b = (_a = n.getRootNode) == null ? void 0 : _a.call(n)) == null ? void 0 : _b.nodeType) === Node.DOCUMENT_FRAGMENT_NODE && n.getRootNode().host)
              shadowHost = n.getRootNode().host;
            let rootShadowHost = shadowHost;
            while (((_d = (_c = rootShadowHost == null ? void 0 : rootShadowHost.getRootNode) == null ? void 0 : _c.call(rootShadowHost)) == null ? void 0 : _d.nodeType) === Node.DOCUMENT_FRAGMENT_NODE && rootShadowHost.getRootNode().host)
              rootShadowHost = rootShadowHost.getRootNode().host;
            const notInDoc = !this.doc.contains(n) && (!rootShadowHost || !this.doc.contains(rootShadowHost));
            if (!n.parentNode || notInDoc) {
              return;
            }
            const parentId = isShadowRoot(n.parentNode) ? this.mirror.getId(shadowHost) : this.mirror.getId(n.parentNode);
            const nextId = getNextId(n);
            if (parentId === -1 || nextId === -1) {
              return addList.addNode(n);
            }
            const sn = serializeNodeWithId(n, {
              doc: this.doc,
              mirror: this.mirror,
              blockClass: this.blockClass,
              blockSelector: this.blockSelector,
              maskTextClass: this.maskTextClass,
              maskTextSelector: this.maskTextSelector,
              skipChild: true,
              newlyAddedElement: true,
              inlineStylesheet: this.inlineStylesheet,
              maskInputOptions: this.maskInputOptions,
              maskTextFn: this.maskTextFn,
              maskInputFn: this.maskInputFn,
              slimDOMOptions: this.slimDOMOptions,
              dataURLOptions: this.dataURLOptions,
              recordCanvas: this.recordCanvas,
              inlineImages: this.inlineImages,
              onSerialize: (currentN) => {
                if (isSerializedIframe(currentN, this.mirror)) {
                  this.iframeManager.addIframe(currentN);
                }
                if (isSerializedStylesheet(currentN, this.mirror)) {
                  this.stylesheetManager.trackLinkElement(currentN);
                }
                if (hasShadowRoot(n)) {
                  this.shadowDomManager.addShadowRoot(n.shadowRoot, this.doc);
                }
              },
              onIframeLoad: (iframe, childSn) => {
                this.iframeManager.attachIframe(iframe, childSn);
                this.shadowDomManager.observeAttachShadow(iframe);
              },
              onStylesheetLoad: (link, childSn) => {
                this.stylesheetManager.attachLinkElement(link, childSn);
              }
            });
            if (sn) {
              adds.push({
                parentId,
                nextId,
                node: sn
              });
            }
          };
          while (this.mapRemoves.length) {
            this.mirror.removeNodeFromMap(this.mapRemoves.shift());
          }
          for (const n of Array.from(this.movedSet.values())) {
            if (isParentRemoved(this.removes, n, this.mirror) && !this.movedSet.has(n.parentNode)) {
              continue;
            }
            pushAdd(n);
          }
          for (const n of Array.from(this.addedSet.values())) {
            if (!isAncestorInSet(this.droppedSet, n) && !isParentRemoved(this.removes, n, this.mirror)) {
              pushAdd(n);
            } else if (isAncestorInSet(this.movedSet, n)) {
              pushAdd(n);
            } else {
              this.droppedSet.add(n);
            }
          }
          let candidate = null;
          while (addList.length) {
            let node = null;
            if (candidate) {
              const parentId = this.mirror.getId(candidate.value.parentNode);
              const nextId = getNextId(candidate.value);
              if (parentId !== -1 && nextId !== -1) {
                node = candidate;
              }
            }
            if (!node) {
              for (let index = addList.length - 1; index >= 0; index--) {
                const _node = addList.get(index);
                if (_node) {
                  const parentId = this.mirror.getId(_node.value.parentNode);
                  const nextId = getNextId(_node.value);
                  if (nextId === -1)
                    continue;
                  else if (parentId !== -1) {
                    node = _node;
                    break;
                  } else {
                    const unhandledNode = _node.value;
                    if (unhandledNode.parentNode && unhandledNode.parentNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
                      const shadowHost = unhandledNode.parentNode.host;
                      const parentId2 = this.mirror.getId(shadowHost);
                      if (parentId2 !== -1) {
                        node = _node;
                        break;
                      }
                    }
                  }
                }
              }
            }
            if (!node) {
              while (addList.head) {
                addList.removeNode(addList.head.value);
              }
              break;
            }
            candidate = node.previous;
            addList.removeNode(node.value);
            pushAdd(node.value);
          }
          const payload = {
            texts: this.texts.map((text) => ({
              id: this.mirror.getId(text.node),
              value: text.value
            })).filter((text) => this.mirror.has(text.id)),
            attributes: this.attributes.map((attribute) => ({
              id: this.mirror.getId(attribute.node),
              attributes: attribute.attributes
            })).filter((attribute) => this.mirror.has(attribute.id)),
            removes: this.removes,
            adds
          };
          if (!payload.texts.length && !payload.attributes.length && !payload.removes.length && !payload.adds.length) {
            return;
          }
          this.texts = [];
          this.attributes = [];
          this.removes = [];
          this.addedSet = /* @__PURE__ */ new Set();
          this.movedSet = /* @__PURE__ */ new Set();
          this.droppedSet = /* @__PURE__ */ new Set();
          this.movedMap = {};
          this.mutationCb(payload);
        };
        this.processMutation = (m) => {
          if (isIgnored(m.target, this.mirror)) {
            return;
          }
          switch (m.type) {
            case "characterData": {
              const value = m.target.textContent;
              if (!isBlocked(m.target, this.blockClass, this.blockSelector, false) && value !== m.oldValue) {
                this.texts.push({
                  value: needMaskingText(m.target, this.maskTextClass, this.maskTextSelector) && value ? this.maskTextFn ? this.maskTextFn(value) : value.replace(/[\S]/g, "*") : value,
                  node: m.target
                });
              }
              break;
            }
            case "attributes": {
              const target = m.target;
              let value = m.target.getAttribute(m.attributeName);
              if (m.attributeName === "value") {
                value = maskInputValue({
                  maskInputOptions: this.maskInputOptions,
                  tagName: m.target.tagName,
                  type: m.target.getAttribute("type"),
                  value,
                  maskInputFn: this.maskInputFn
                });
              }
              if (isBlocked(m.target, this.blockClass, this.blockSelector, false) || value === m.oldValue) {
                return;
              }
              let item = this.attributes.find((a) => a.node === m.target);
              if (target.tagName === "IFRAME" && m.attributeName === "src" && !this.keepIframeSrcFn(value)) {
                if (!target.contentDocument) {
                  m.attributeName = "rr_src";
                } else {
                  return;
                }
              }
              if (!item) {
                item = {
                  node: m.target,
                  attributes: {}
                };
                this.attributes.push(item);
              }
              if (m.attributeName === "style") {
                const old = this.doc.createElement("span");
                if (m.oldValue) {
                  old.setAttribute("style", m.oldValue);
                }
                if (item.attributes.style === void 0 || item.attributes.style === null) {
                  item.attributes.style = {};
                }
                const styleObj = item.attributes.style;
                for (const pname of Array.from(target.style)) {
                  const newValue = target.style.getPropertyValue(pname);
                  const newPriority = target.style.getPropertyPriority(pname);
                  if (newValue !== old.style.getPropertyValue(pname) || newPriority !== old.style.getPropertyPriority(pname)) {
                    if (newPriority === "") {
                      styleObj[pname] = newValue;
                    } else {
                      styleObj[pname] = [newValue, newPriority];
                    }
                  }
                }
                for (const pname of Array.from(old.style)) {
                  if (target.style.getPropertyValue(pname) === "") {
                    styleObj[pname] = false;
                  }
                }
              } else {
                item.attributes[m.attributeName] = transformAttribute(this.doc, target.tagName, m.attributeName, value);
              }
              break;
            }
            case "childList": {
              if (isBlocked(m.target, this.blockClass, this.blockSelector, true))
                return;
              m.addedNodes.forEach((n) => this.genAdds(n, m.target));
              m.removedNodes.forEach((n) => {
                const nodeId = this.mirror.getId(n);
                const parentId = isShadowRoot(m.target) ? this.mirror.getId(m.target.host) : this.mirror.getId(m.target);
                if (isBlocked(m.target, this.blockClass, this.blockSelector, false) || isIgnored(n, this.mirror) || !isSerialized(n, this.mirror)) {
                  return;
                }
                if (this.addedSet.has(n)) {
                  deepDelete(this.addedSet, n);
                  this.droppedSet.add(n);
                } else if (this.addedSet.has(m.target) && nodeId === -1) ; else if (isAncestorRemoved(m.target, this.mirror)) ; else if (this.movedSet.has(n) && this.movedMap[moveKey(nodeId, parentId)]) {
                  deepDelete(this.movedSet, n);
                } else {
                  this.removes.push({
                    parentId,
                    id: nodeId,
                    isShadow: isShadowRoot(m.target) && isNativeShadowDom(m.target) ? true : void 0
                  });
                }
                this.mapRemoves.push(n);
              });
              break;
            }
          }
        };
        this.genAdds = (n, target) => {
          if (this.mirror.hasNode(n)) {
            if (isIgnored(n, this.mirror)) {
              return;
            }
            this.movedSet.add(n);
            let targetId = null;
            if (target && this.mirror.hasNode(target)) {
              targetId = this.mirror.getId(target);
            }
            if (targetId && targetId !== -1) {
              this.movedMap[moveKey(this.mirror.getId(n), targetId)] = true;
            }
          } else {
            this.addedSet.add(n);
            this.droppedSet.delete(n);
          }
          if (!isBlocked(n, this.blockClass, this.blockSelector, false))
            n.childNodes.forEach((childN) => this.genAdds(childN));
        };
      }
      init(options) {
        [
          "mutationCb",
          "blockClass",
          "blockSelector",
          "maskTextClass",
          "maskTextSelector",
          "inlineStylesheet",
          "maskInputOptions",
          "maskTextFn",
          "maskInputFn",
          "keepIframeSrcFn",
          "recordCanvas",
          "inlineImages",
          "slimDOMOptions",
          "dataURLOptions",
          "doc",
          "mirror",
          "iframeManager",
          "stylesheetManager",
          "shadowDomManager",
          "canvasManager"
        ].forEach((key) => {
          this[key] = options[key];
        });
      }
      freeze() {
        this.frozen = true;
        this.canvasManager.freeze();
      }
      unfreeze() {
        this.frozen = false;
        this.canvasManager.unfreeze();
        this.emit();
      }
      isFrozen() {
        return this.frozen;
      }
      lock() {
        this.locked = true;
        this.canvasManager.lock();
      }
      unlock() {
        this.locked = false;
        this.canvasManager.unlock();
        this.emit();
      }
      reset() {
        this.shadowDomManager.reset();
        this.canvasManager.reset();
      }
    }
    function deepDelete(addsSet, n) {
      addsSet.delete(n);
      n.childNodes.forEach((childN) => deepDelete(addsSet, childN));
    }
    function isParentRemoved(removes, n, mirror) {
      if (removes.length === 0)
        return false;
      return _isParentRemoved(removes, n, mirror);
    }
    function _isParentRemoved(removes, n, mirror) {
      const { parentNode } = n;
      if (!parentNode) {
        return false;
      }
      const parentId = mirror.getId(parentNode);
      if (removes.some((r) => r.id === parentId)) {
        return true;
      }
      return _isParentRemoved(removes, parentNode, mirror);
    }
    function isAncestorInSet(set, n) {
      if (set.size === 0)
        return false;
      return _isAncestorInSet(set, n);
    }
    function _isAncestorInSet(set, n) {
      const { parentNode } = n;
      if (!parentNode) {
        return false;
      }
      if (set.has(parentNode)) {
        return true;
      }
      return _isAncestorInSet(set, parentNode);
    }

    var __defProp$2 = Object.defineProperty;
    var __defProps$2 = Object.defineProperties;
    var __getOwnPropDescs$2 = Object.getOwnPropertyDescriptors;
    var __getOwnPropSymbols$3 = Object.getOwnPropertySymbols;
    var __hasOwnProp$3 = Object.prototype.hasOwnProperty;
    var __propIsEnum$3 = Object.prototype.propertyIsEnumerable;
    var __defNormalProp$2 = (obj, key, value) => key in obj ? __defProp$2(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __spreadValues$2 = (a, b) => {
      for (var prop in b || (b = {}))
        if (__hasOwnProp$3.call(b, prop))
          __defNormalProp$2(a, prop, b[prop]);
      if (__getOwnPropSymbols$3)
        for (var prop of __getOwnPropSymbols$3(b)) {
          if (__propIsEnum$3.call(b, prop))
            __defNormalProp$2(a, prop, b[prop]);
        }
      return a;
    };
    var __spreadProps$2 = (a, b) => __defProps$2(a, __getOwnPropDescs$2(b));
    const mutationBuffers = [];
    const isCSSGroupingRuleSupported = typeof CSSGroupingRule !== "undefined";
    const isCSSMediaRuleSupported = typeof CSSMediaRule !== "undefined";
    const isCSSSupportsRuleSupported = typeof CSSSupportsRule !== "undefined";
    const isCSSConditionRuleSupported = typeof CSSConditionRule !== "undefined";
    function getEventTarget(event) {
      try {
        if ("composedPath" in event) {
          const path = event.composedPath();
          if (path.length) {
            return path[0];
          }
        } else if ("path" in event && event.path.length) {
          return event.path[0];
        }
        return event.target;
      } catch (e) {
        return event.target;
      }
    }
    function initMutationObserver(options, rootEl) {
      var _a, _b;
      const mutationBuffer = new MutationBuffer();
      mutationBuffers.push(mutationBuffer);
      mutationBuffer.init(options);
      let mutationObserverCtor = window.MutationObserver || window.__rrMutationObserver;
      const angularZoneSymbol = (_b = (_a = window == null ? void 0 : window.Zone) == null ? void 0 : _a.__symbol__) == null ? void 0 : _b.call(_a, "MutationObserver");
      if (angularZoneSymbol && window[angularZoneSymbol]) {
        mutationObserverCtor = window[angularZoneSymbol];
      }
      const observer = new mutationObserverCtor(mutationBuffer.processMutations.bind(mutationBuffer));
      observer.observe(rootEl, {
        attributes: true,
        attributeOldValue: true,
        characterData: true,
        characterDataOldValue: true,
        childList: true,
        subtree: true
      });
      return observer;
    }
    function initMoveObserver({
      mousemoveCb,
      sampling,
      doc,
      mirror
    }) {
      if (sampling.mousemove === false) {
        return () => {
        };
      }
      const threshold = typeof sampling.mousemove === "number" ? sampling.mousemove : 50;
      const callbackThreshold = typeof sampling.mousemoveCallback === "number" ? sampling.mousemoveCallback : 500;
      let positions = [];
      let timeBaseline;
      const wrappedCb = throttle((source) => {
        const totalOffset = Date.now() - timeBaseline;
        mousemoveCb(positions.map((p) => {
          p.timeOffset -= totalOffset;
          return p;
        }), source);
        positions = [];
        timeBaseline = null;
      }, callbackThreshold);
      const updatePosition = throttle((evt) => {
        const target = getEventTarget(evt);
        const { clientX, clientY } = isTouchEvent(evt) ? evt.changedTouches[0] : evt;
        if (!timeBaseline) {
          timeBaseline = Date.now();
        }
        positions.push({
          x: clientX,
          y: clientY,
          id: mirror.getId(target),
          timeOffset: Date.now() - timeBaseline
        });
        wrappedCb(typeof DragEvent !== "undefined" && evt instanceof DragEvent ? IncrementalSource.Drag : evt instanceof MouseEvent ? IncrementalSource.MouseMove : IncrementalSource.TouchMove);
      }, threshold, {
        trailing: false
      });
      const handlers = [
        on("mousemove", updatePosition, doc),
        on("touchmove", updatePosition, doc),
        on("drag", updatePosition, doc)
      ];
      return () => {
        handlers.forEach((h) => h());
      };
    }
    function initMouseInteractionObserver({
      mouseInteractionCb,
      doc,
      mirror,
      blockClass,
      blockSelector,
      sampling
    }) {
      if (sampling.mouseInteraction === false) {
        return () => {
        };
      }
      const disableMap = sampling.mouseInteraction === true || sampling.mouseInteraction === void 0 ? {} : sampling.mouseInteraction;
      const handlers = [];
      const getHandler = (eventKey) => {
        return (event) => {
          const target = getEventTarget(event);
          if (isBlocked(target, blockClass, blockSelector, true)) {
            return;
          }
          const e = isTouchEvent(event) ? event.changedTouches[0] : event;
          if (!e) {
            return;
          }
          const id = mirror.getId(target);
          const { clientX, clientY } = e;
          mouseInteractionCb({
            type: MouseInteractions[eventKey],
            id,
            x: clientX,
            y: clientY
          });
        };
      };
      Object.keys(MouseInteractions).filter((key) => Number.isNaN(Number(key)) && !key.endsWith("_Departed") && disableMap[key] !== false).forEach((eventKey) => {
        const eventName = eventKey.toLowerCase();
        const handler = getHandler(eventKey);
        handlers.push(on(eventName, handler, doc));
      });
      return () => {
        handlers.forEach((h) => h());
      };
    }
    function initScrollObserver({
      scrollCb,
      doc,
      mirror,
      blockClass,
      blockSelector,
      sampling
    }) {
      const updatePosition = throttle((evt) => {
        const target = getEventTarget(evt);
        if (!target || isBlocked(target, blockClass, blockSelector, true)) {
          return;
        }
        const id = mirror.getId(target);
        if (target === doc) {
          const scrollEl = doc.scrollingElement || doc.documentElement;
          scrollCb({
            id,
            x: scrollEl.scrollLeft,
            y: scrollEl.scrollTop
          });
        } else {
          scrollCb({
            id,
            x: target.scrollLeft,
            y: target.scrollTop
          });
        }
      }, sampling.scroll || 100);
      return on("scroll", updatePosition, doc);
    }
    function initViewportResizeObserver({
      viewportResizeCb
    }) {
      let lastH = -1;
      let lastW = -1;
      const updateDimension = throttle(() => {
        const height = getWindowHeight();
        const width = getWindowWidth();
        if (lastH !== height || lastW !== width) {
          viewportResizeCb({
            width: Number(width),
            height: Number(height)
          });
          lastH = height;
          lastW = width;
        }
      }, 200);
      return on("resize", updateDimension, window);
    }
    function wrapEventWithUserTriggeredFlag(v, enable) {
      const value = __spreadValues$2({}, v);
      if (!enable)
        delete value.userTriggered;
      return value;
    }
    const INPUT_TAGS = ["INPUT", "TEXTAREA", "SELECT"];
    const lastInputValueMap = /* @__PURE__ */ new WeakMap();
    function initInputObserver({
      inputCb,
      doc,
      mirror,
      blockClass,
      blockSelector,
      ignoreClass,
      maskInputOptions,
      maskInputFn,
      sampling,
      userTriggeredOnInput
    }) {
      function eventHandler(event) {
        let target = getEventTarget(event);
        const userTriggered = event.isTrusted;
        if (target && target.tagName === "OPTION")
          target = target.parentElement;
        if (!target || !target.tagName || INPUT_TAGS.indexOf(target.tagName) < 0 || isBlocked(target, blockClass, blockSelector, true)) {
          return;
        }
        const type = target.type;
        if (target.classList.contains(ignoreClass)) {
          return;
        }
        let text = target.value;
        let isChecked = false;
        if (type === "radio" || type === "checkbox") {
          isChecked = target.checked;
        } else if (maskInputOptions[target.tagName.toLowerCase()] || maskInputOptions[type]) {
          text = maskInputValue({
            maskInputOptions,
            tagName: target.tagName,
            type,
            value: text,
            maskInputFn
          });
        }
        cbWithDedup(target, wrapEventWithUserTriggeredFlag({ text, isChecked, userTriggered }, userTriggeredOnInput));
        const name = target.name;
        if (type === "radio" && name && isChecked) {
          doc.querySelectorAll(`input[type="radio"][name="${name}"]`).forEach((el) => {
            if (el !== target) {
              cbWithDedup(el, wrapEventWithUserTriggeredFlag({
                text: el.value,
                isChecked: !isChecked,
                userTriggered: false
              }, userTriggeredOnInput));
            }
          });
        }
      }
      function cbWithDedup(target, v) {
        const lastInputValue = lastInputValueMap.get(target);
        if (!lastInputValue || lastInputValue.text !== v.text || lastInputValue.isChecked !== v.isChecked) {
          lastInputValueMap.set(target, v);
          const id = mirror.getId(target);
          inputCb(__spreadProps$2(__spreadValues$2({}, v), {
            id
          }));
        }
      }
      const events = sampling.input === "last" ? ["change"] : ["input", "change"];
      const handlers = events.map((eventName) => on(eventName, eventHandler, doc));
      const currentWindow = doc.defaultView;
      if (!currentWindow) {
        return () => {
          handlers.forEach((h) => h());
        };
      }
      const propertyDescriptor = currentWindow.Object.getOwnPropertyDescriptor(currentWindow.HTMLInputElement.prototype, "value");
      const hookProperties = [
        [currentWindow.HTMLInputElement.prototype, "value"],
        [currentWindow.HTMLInputElement.prototype, "checked"],
        [currentWindow.HTMLSelectElement.prototype, "value"],
        [currentWindow.HTMLTextAreaElement.prototype, "value"],
        [currentWindow.HTMLSelectElement.prototype, "selectedIndex"],
        [currentWindow.HTMLOptionElement.prototype, "selected"]
      ];
      if (propertyDescriptor && propertyDescriptor.set) {
        handlers.push(...hookProperties.map((p) => hookSetter(p[0], p[1], {
          set() {
            eventHandler({ target: this });
          }
        }, false, currentWindow)));
      }
      return () => {
        handlers.forEach((h) => h());
      };
    }
    function getNestedCSSRulePositions(rule) {
      const positions = [];
      function recurse(childRule, pos) {
        if (isCSSGroupingRuleSupported && childRule.parentRule instanceof CSSGroupingRule || isCSSMediaRuleSupported && childRule.parentRule instanceof CSSMediaRule || isCSSSupportsRuleSupported && childRule.parentRule instanceof CSSSupportsRule || isCSSConditionRuleSupported && childRule.parentRule instanceof CSSConditionRule) {
          const rules = Array.from(childRule.parentRule.cssRules);
          const index = rules.indexOf(childRule);
          pos.unshift(index);
        } else if (childRule.parentStyleSheet) {
          const rules = Array.from(childRule.parentStyleSheet.cssRules);
          const index = rules.indexOf(childRule);
          pos.unshift(index);
        }
        return pos;
      }
      return recurse(rule, positions);
    }
    function getIdAndStyleId(sheet, mirror, styleMirror) {
      let id, styleId;
      if (!sheet)
        return {};
      if (sheet.ownerNode)
        id = mirror.getId(sheet.ownerNode);
      else
        styleId = styleMirror.getId(sheet);
      return {
        styleId,
        id
      };
    }
    function initStyleSheetObserver({ styleSheetRuleCb, mirror, stylesheetManager }, { win }) {
      const insertRule = win.CSSStyleSheet.prototype.insertRule;
      win.CSSStyleSheet.prototype.insertRule = function(rule, index) {
        const { id, styleId } = getIdAndStyleId(this, mirror, stylesheetManager.styleMirror);
        if (id && id !== -1 || styleId && styleId !== -1) {
          styleSheetRuleCb({
            id,
            styleId,
            adds: [{ rule, index }]
          });
        }
        return insertRule.apply(this, [rule, index]);
      };
      const deleteRule = win.CSSStyleSheet.prototype.deleteRule;
      win.CSSStyleSheet.prototype.deleteRule = function(index) {
        const { id, styleId } = getIdAndStyleId(this, mirror, stylesheetManager.styleMirror);
        if (id && id !== -1 || styleId && styleId !== -1) {
          styleSheetRuleCb({
            id,
            styleId,
            removes: [{ index }]
          });
        }
        return deleteRule.apply(this, [index]);
      };
      let replace;
      if (win.CSSStyleSheet.prototype.replace) {
        replace = win.CSSStyleSheet.prototype.replace;
        win.CSSStyleSheet.prototype.replace = function(text) {
          const { id, styleId } = getIdAndStyleId(this, mirror, stylesheetManager.styleMirror);
          if (id && id !== -1 || styleId && styleId !== -1) {
            styleSheetRuleCb({
              id,
              styleId,
              replace: text
            });
          }
          return replace.apply(this, [text]);
        };
      }
      let replaceSync;
      if (win.CSSStyleSheet.prototype.replaceSync) {
        replaceSync = win.CSSStyleSheet.prototype.replaceSync;
        win.CSSStyleSheet.prototype.replaceSync = function(text) {
          const { id, styleId } = getIdAndStyleId(this, mirror, stylesheetManager.styleMirror);
          if (id && id !== -1 || styleId && styleId !== -1) {
            styleSheetRuleCb({
              id,
              styleId,
              replaceSync: text
            });
          }
          return replaceSync.apply(this, [text]);
        };
      }
      const supportedNestedCSSRuleTypes = {};
      if (isCSSGroupingRuleSupported) {
        supportedNestedCSSRuleTypes.CSSGroupingRule = win.CSSGroupingRule;
      } else {
        if (isCSSMediaRuleSupported) {
          supportedNestedCSSRuleTypes.CSSMediaRule = win.CSSMediaRule;
        }
        if (isCSSConditionRuleSupported) {
          supportedNestedCSSRuleTypes.CSSConditionRule = win.CSSConditionRule;
        }
        if (isCSSSupportsRuleSupported) {
          supportedNestedCSSRuleTypes.CSSSupportsRule = win.CSSSupportsRule;
        }
      }
      const unmodifiedFunctions = {};
      Object.entries(supportedNestedCSSRuleTypes).forEach(([typeKey, type]) => {
        unmodifiedFunctions[typeKey] = {
          insertRule: type.prototype.insertRule,
          deleteRule: type.prototype.deleteRule
        };
        type.prototype.insertRule = function(rule, index) {
          const { id, styleId } = getIdAndStyleId(this.parentStyleSheet, mirror, stylesheetManager.styleMirror);
          if (id && id !== -1 || styleId && styleId !== -1) {
            styleSheetRuleCb({
              id,
              styleId,
              adds: [
                {
                  rule,
                  index: [
                    ...getNestedCSSRulePositions(this),
                    index || 0
                  ]
                }
              ]
            });
          }
          return unmodifiedFunctions[typeKey].insertRule.apply(this, [rule, index]);
        };
        type.prototype.deleteRule = function(index) {
          const { id, styleId } = getIdAndStyleId(this.parentStyleSheet, mirror, stylesheetManager.styleMirror);
          if (id && id !== -1 || styleId && styleId !== -1) {
            styleSheetRuleCb({
              id,
              styleId,
              removes: [
                { index: [...getNestedCSSRulePositions(this), index] }
              ]
            });
          }
          return unmodifiedFunctions[typeKey].deleteRule.apply(this, [index]);
        };
      });
      return () => {
        win.CSSStyleSheet.prototype.insertRule = insertRule;
        win.CSSStyleSheet.prototype.deleteRule = deleteRule;
        replace && (win.CSSStyleSheet.prototype.replace = replace);
        replaceSync && (win.CSSStyleSheet.prototype.replaceSync = replaceSync);
        Object.entries(supportedNestedCSSRuleTypes).forEach(([typeKey, type]) => {
          type.prototype.insertRule = unmodifiedFunctions[typeKey].insertRule;
          type.prototype.deleteRule = unmodifiedFunctions[typeKey].deleteRule;
        });
      };
    }
    function initAdoptedStyleSheetObserver({
      mirror,
      stylesheetManager
    }, host) {
      var _a, _b, _c;
      let hostId = null;
      if (host.nodeName === "#document")
        hostId = mirror.getId(host);
      else
        hostId = mirror.getId(host.host);
      const patchTarget = host.nodeName === "#document" ? (_a = host.defaultView) == null ? void 0 : _a.Document : (_c = (_b = host.ownerDocument) == null ? void 0 : _b.defaultView) == null ? void 0 : _c.ShadowRoot;
      const originalPropertyDescriptor = Object.getOwnPropertyDescriptor(patchTarget == null ? void 0 : patchTarget.prototype, "adoptedStyleSheets");
      if (hostId === null || hostId === -1 || !patchTarget || !originalPropertyDescriptor)
        return () => {
        };
      Object.defineProperty(host, "adoptedStyleSheets", {
        configurable: originalPropertyDescriptor.configurable,
        enumerable: originalPropertyDescriptor.enumerable,
        get() {
          var _a2;
          return (_a2 = originalPropertyDescriptor.get) == null ? void 0 : _a2.call(this);
        },
        set(sheets) {
          var _a2;
          const result = (_a2 = originalPropertyDescriptor.set) == null ? void 0 : _a2.call(this, sheets);
          if (hostId !== null && hostId !== -1) {
            try {
              stylesheetManager.adoptStyleSheets(sheets, hostId);
            } catch (e) {
            }
          }
          return result;
        }
      });
      return () => {
        Object.defineProperty(host, "adoptedStyleSheets", {
          configurable: originalPropertyDescriptor.configurable,
          enumerable: originalPropertyDescriptor.enumerable,
          get: originalPropertyDescriptor.get,
          set: originalPropertyDescriptor.set
        });
      };
    }
    function initStyleDeclarationObserver({
      styleDeclarationCb,
      mirror,
      ignoreCSSAttributes,
      stylesheetManager
    }, { win }) {
      const setProperty = win.CSSStyleDeclaration.prototype.setProperty;
      win.CSSStyleDeclaration.prototype.setProperty = function(property, value, priority) {
        var _a;
        if (ignoreCSSAttributes.has(property)) {
          return setProperty.apply(this, [property, value, priority]);
        }
        const { id, styleId } = getIdAndStyleId((_a = this.parentRule) == null ? void 0 : _a.parentStyleSheet, mirror, stylesheetManager.styleMirror);
        if (id && id !== -1 || styleId && styleId !== -1) {
          styleDeclarationCb({
            id,
            styleId,
            set: {
              property,
              value,
              priority
            },
            index: getNestedCSSRulePositions(this.parentRule)
          });
        }
        return setProperty.apply(this, [property, value, priority]);
      };
      const removeProperty = win.CSSStyleDeclaration.prototype.removeProperty;
      win.CSSStyleDeclaration.prototype.removeProperty = function(property) {
        var _a;
        if (ignoreCSSAttributes.has(property)) {
          return removeProperty.apply(this, [property]);
        }
        const { id, styleId } = getIdAndStyleId((_a = this.parentRule) == null ? void 0 : _a.parentStyleSheet, mirror, stylesheetManager.styleMirror);
        if (id && id !== -1 || styleId && styleId !== -1) {
          styleDeclarationCb({
            id,
            styleId,
            remove: {
              property
            },
            index: getNestedCSSRulePositions(this.parentRule)
          });
        }
        return removeProperty.apply(this, [property]);
      };
      return () => {
        win.CSSStyleDeclaration.prototype.setProperty = setProperty;
        win.CSSStyleDeclaration.prototype.removeProperty = removeProperty;
      };
    }
    function initMediaInteractionObserver({
      mediaInteractionCb,
      blockClass,
      blockSelector,
      mirror,
      sampling
    }) {
      const handler = (type) => throttle((event) => {
        const target = getEventTarget(event);
        if (!target || isBlocked(target, blockClass, blockSelector, true)) {
          return;
        }
        const {
          currentTime,
          volume,
          muted,
          playbackRate
        } = target;
        mediaInteractionCb({
          type,
          id: mirror.getId(target),
          currentTime,
          volume,
          muted,
          playbackRate
        });
      }, sampling.media || 500);
      const handlers = [
        on("play", handler(MediaInteractions.Play)),
        on("pause", handler(MediaInteractions.Pause)),
        on("seeked", handler(MediaInteractions.Seeked)),
        on("volumechange", handler(MediaInteractions.VolumeChange)),
        on("ratechange", handler(MediaInteractions.RateChange))
      ];
      return () => {
        handlers.forEach((h) => h());
      };
    }
    function initFontObserver({ fontCb, doc }) {
      const win = doc.defaultView;
      if (!win) {
        return () => {
        };
      }
      const handlers = [];
      const fontMap = /* @__PURE__ */ new WeakMap();
      const originalFontFace = win.FontFace;
      win.FontFace = function FontFace(family, source, descriptors) {
        const fontFace = new originalFontFace(family, source, descriptors);
        fontMap.set(fontFace, {
          family,
          buffer: typeof source !== "string",
          descriptors,
          fontSource: typeof source === "string" ? source : JSON.stringify(Array.from(new Uint8Array(source)))
        });
        return fontFace;
      };
      const restoreHandler = patch(doc.fonts, "add", function(original) {
        return function(fontFace) {
          setTimeout(() => {
            const p = fontMap.get(fontFace);
            if (p) {
              fontCb(p);
              fontMap.delete(fontFace);
            }
          }, 0);
          return original.apply(this, [fontFace]);
        };
      });
      handlers.push(() => {
        win.FontFace = originalFontFace;
      });
      handlers.push(restoreHandler);
      return () => {
        handlers.forEach((h) => h());
      };
    }
    function initSelectionObserver(param) {
      const { doc, mirror, blockClass, blockSelector, selectionCb } = param;
      let collapsed = true;
      const updateSelection = () => {
        const selection = doc.getSelection();
        if (!selection || collapsed && (selection == null ? void 0 : selection.isCollapsed))
          return;
        collapsed = selection.isCollapsed || false;
        const ranges = [];
        const count = selection.rangeCount || 0;
        for (let i = 0; i < count; i++) {
          const range = selection.getRangeAt(i);
          const { startContainer, startOffset, endContainer, endOffset } = range;
          const blocked = isBlocked(startContainer, blockClass, blockSelector, true) || isBlocked(endContainer, blockClass, blockSelector, true);
          if (blocked)
            continue;
          ranges.push({
            start: mirror.getId(startContainer),
            startOffset,
            end: mirror.getId(endContainer),
            endOffset
          });
        }
        selectionCb({ ranges });
      };
      updateSelection();
      return on("selectionchange", updateSelection);
    }
    function mergeHooks(o, hooks) {
      const {
        mutationCb,
        mousemoveCb,
        mouseInteractionCb,
        scrollCb,
        viewportResizeCb,
        inputCb,
        mediaInteractionCb,
        styleSheetRuleCb,
        styleDeclarationCb,
        canvasMutationCb,
        fontCb,
        selectionCb
      } = o;
      o.mutationCb = (...p) => {
        if (hooks.mutation) {
          hooks.mutation(...p);
        }
        mutationCb(...p);
      };
      o.mousemoveCb = (...p) => {
        if (hooks.mousemove) {
          hooks.mousemove(...p);
        }
        mousemoveCb(...p);
      };
      o.mouseInteractionCb = (...p) => {
        if (hooks.mouseInteraction) {
          hooks.mouseInteraction(...p);
        }
        mouseInteractionCb(...p);
      };
      o.scrollCb = (...p) => {
        if (hooks.scroll) {
          hooks.scroll(...p);
        }
        scrollCb(...p);
      };
      o.viewportResizeCb = (...p) => {
        if (hooks.viewportResize) {
          hooks.viewportResize(...p);
        }
        viewportResizeCb(...p);
      };
      o.inputCb = (...p) => {
        if (hooks.input) {
          hooks.input(...p);
        }
        inputCb(...p);
      };
      o.mediaInteractionCb = (...p) => {
        if (hooks.mediaInteaction) {
          hooks.mediaInteaction(...p);
        }
        mediaInteractionCb(...p);
      };
      o.styleSheetRuleCb = (...p) => {
        if (hooks.styleSheetRule) {
          hooks.styleSheetRule(...p);
        }
        styleSheetRuleCb(...p);
      };
      o.styleDeclarationCb = (...p) => {
        if (hooks.styleDeclaration) {
          hooks.styleDeclaration(...p);
        }
        styleDeclarationCb(...p);
      };
      o.canvasMutationCb = (...p) => {
        if (hooks.canvasMutation) {
          hooks.canvasMutation(...p);
        }
        canvasMutationCb(...p);
      };
      o.fontCb = (...p) => {
        if (hooks.font) {
          hooks.font(...p);
        }
        fontCb(...p);
      };
      o.selectionCb = (...p) => {
        if (hooks.selection) {
          hooks.selection(...p);
        }
        selectionCb(...p);
      };
    }
    function initObservers(o, hooks = {}) {
      const currentWindow = o.doc.defaultView;
      if (!currentWindow) {
        return () => {
        };
      }
      mergeHooks(o, hooks);
      const mutationObserver = initMutationObserver(o, o.doc);
      const mousemoveHandler = initMoveObserver(o);
      const mouseInteractionHandler = initMouseInteractionObserver(o);
      const scrollHandler = initScrollObserver(o);
      const viewportResizeHandler = initViewportResizeObserver(o);
      const inputHandler = initInputObserver(o);
      const mediaInteractionHandler = initMediaInteractionObserver(o);
      const styleSheetObserver = initStyleSheetObserver(o, { win: currentWindow });
      const adoptedStyleSheetObserver = initAdoptedStyleSheetObserver(o, o.doc);
      const styleDeclarationObserver = initStyleDeclarationObserver(o, {
        win: currentWindow
      });
      const fontObserver = o.collectFonts ? initFontObserver(o) : () => {
      };
      const selectionObserver = initSelectionObserver(o);
      const pluginHandlers = [];
      for (const plugin of o.plugins) {
        pluginHandlers.push(plugin.observer(plugin.callback, currentWindow, plugin.options));
      }
      return () => {
        mutationBuffers.forEach((b) => b.reset());
        mutationObserver.disconnect();
        mousemoveHandler();
        mouseInteractionHandler();
        scrollHandler();
        viewportResizeHandler();
        inputHandler();
        mediaInteractionHandler();
        styleSheetObserver();
        adoptedStyleSheetObserver();
        styleDeclarationObserver();
        fontObserver();
        selectionObserver();
        pluginHandlers.forEach((h) => h());
      };
    }

    class CrossOriginIframeMirror {
      constructor(generateIdFn) {
        this.generateIdFn = generateIdFn;
        this.iframeIdToRemoteIdMap = /* @__PURE__ */ new WeakMap();
        this.iframeRemoteIdToIdMap = /* @__PURE__ */ new WeakMap();
      }
      getId(iframe, remoteId, idToRemoteMap, remoteToIdMap) {
        const idToRemoteIdMap = idToRemoteMap || this.getIdToRemoteIdMap(iframe);
        const remoteIdToIdMap = remoteToIdMap || this.getRemoteIdToIdMap(iframe);
        let id = idToRemoteIdMap.get(remoteId);
        if (!id) {
          id = this.generateIdFn();
          idToRemoteIdMap.set(remoteId, id);
          remoteIdToIdMap.set(id, remoteId);
        }
        return id;
      }
      getIds(iframe, remoteId) {
        const idToRemoteIdMap = this.getIdToRemoteIdMap(iframe);
        const remoteIdToIdMap = this.getRemoteIdToIdMap(iframe);
        return remoteId.map((id) => this.getId(iframe, id, idToRemoteIdMap, remoteIdToIdMap));
      }
      getRemoteId(iframe, id, map) {
        const remoteIdToIdMap = map || this.getRemoteIdToIdMap(iframe);
        if (typeof id !== "number")
          return id;
        const remoteId = remoteIdToIdMap.get(id);
        if (!remoteId)
          return -1;
        return remoteId;
      }
      getRemoteIds(iframe, ids) {
        const remoteIdToIdMap = this.getRemoteIdToIdMap(iframe);
        return ids.map((id) => this.getRemoteId(iframe, id, remoteIdToIdMap));
      }
      reset(iframe) {
        if (!iframe) {
          this.iframeIdToRemoteIdMap = /* @__PURE__ */ new WeakMap();
          this.iframeRemoteIdToIdMap = /* @__PURE__ */ new WeakMap();
          return;
        }
        this.iframeIdToRemoteIdMap.delete(iframe);
        this.iframeRemoteIdToIdMap.delete(iframe);
      }
      getIdToRemoteIdMap(iframe) {
        let idToRemoteIdMap = this.iframeIdToRemoteIdMap.get(iframe);
        if (!idToRemoteIdMap) {
          idToRemoteIdMap = /* @__PURE__ */ new Map();
          this.iframeIdToRemoteIdMap.set(iframe, idToRemoteIdMap);
        }
        return idToRemoteIdMap;
      }
      getRemoteIdToIdMap(iframe) {
        let remoteIdToIdMap = this.iframeRemoteIdToIdMap.get(iframe);
        if (!remoteIdToIdMap) {
          remoteIdToIdMap = /* @__PURE__ */ new Map();
          this.iframeRemoteIdToIdMap.set(iframe, remoteIdToIdMap);
        }
        return remoteIdToIdMap;
      }
    }

    class IframeManager {
      constructor(options) {
        this.iframes = /* @__PURE__ */ new WeakMap();
        this.crossOriginIframeMap = /* @__PURE__ */ new WeakMap();
        this.crossOriginIframeMirror = new CrossOriginIframeMirror(genId);
        this.mutationCb = options.mutationCb;
        this.wrappedEmit = options.wrappedEmit;
        this.stylesheetManager = options.stylesheetManager;
        this.recordCrossOriginIframes = options.recordCrossOriginIframes;
        this.crossOriginIframeStyleMirror = new CrossOriginIframeMirror(this.stylesheetManager.styleMirror.generateId.bind(this.stylesheetManager.styleMirror));
        this.mirror = options.mirror;
        if (this.recordCrossOriginIframes) {
          window.addEventListener("message", this.handleMessage.bind(this));
        }
      }
      addIframe(iframeEl) {
        this.iframes.set(iframeEl, true);
        if (iframeEl.contentWindow)
          this.crossOriginIframeMap.set(iframeEl.contentWindow, iframeEl);
      }
      addLoadListener(cb) {
        this.loadListener = cb;
      }
      attachIframe(iframeEl, childSn) {
        var _a;
        this.mutationCb({
          adds: [
            {
              parentId: this.mirror.getId(iframeEl),
              nextId: null,
              node: childSn
            }
          ],
          removes: [],
          texts: [],
          attributes: [],
          isAttachIframe: true
        });
        (_a = this.loadListener) == null ? void 0 : _a.call(this, iframeEl);
        if (iframeEl.contentDocument && iframeEl.contentDocument.adoptedStyleSheets && iframeEl.contentDocument.adoptedStyleSheets.length > 0)
          this.stylesheetManager.adoptStyleSheets(iframeEl.contentDocument.adoptedStyleSheets, this.mirror.getId(iframeEl.contentDocument));
      }
      handleMessage(message) {
        if (message.data.type === "rrweb") {
          const iframeSourceWindow = message.source;
          if (!iframeSourceWindow)
            return;
          const iframeEl = this.crossOriginIframeMap.get(message.source);
          if (!iframeEl)
            return;
          const transformedEvent = this.transformCrossOriginEvent(iframeEl, message.data.event);
          if (transformedEvent)
            this.wrappedEmit(transformedEvent, message.data.isCheckout);
        }
      }
      transformCrossOriginEvent(iframeEl, e) {
        var _a;
        switch (e.type) {
          case EventType.FullSnapshot: {
            this.crossOriginIframeMirror.reset(iframeEl);
            this.crossOriginIframeStyleMirror.reset(iframeEl);
            this.replaceIdOnNode(e.data.node, iframeEl);
            return {
              timestamp: e.timestamp,
              type: EventType.IncrementalSnapshot,
              data: {
                source: IncrementalSource.Mutation,
                adds: [
                  {
                    parentId: this.mirror.getId(iframeEl),
                    nextId: null,
                    node: e.data.node
                  }
                ],
                removes: [],
                texts: [],
                attributes: [],
                isAttachIframe: true
              }
            };
          }
          case EventType.Meta:
          case EventType.Load:
          case EventType.DomContentLoaded: {
            return false;
          }
          case EventType.Plugin: {
            return e;
          }
          case EventType.Custom: {
            this.replaceIds(e.data.payload, iframeEl, ["id", "parentId", "previousId", "nextId"]);
            return e;
          }
          case EventType.IncrementalSnapshot: {
            switch (e.data.source) {
              case IncrementalSource.Mutation: {
                e.data.adds.forEach((n) => {
                  this.replaceIds(n, iframeEl, [
                    "parentId",
                    "nextId",
                    "previousId"
                  ]);
                  this.replaceIdOnNode(n.node, iframeEl);
                });
                e.data.removes.forEach((n) => {
                  this.replaceIds(n, iframeEl, ["parentId", "id"]);
                });
                e.data.attributes.forEach((n) => {
                  this.replaceIds(n, iframeEl, ["id"]);
                });
                e.data.texts.forEach((n) => {
                  this.replaceIds(n, iframeEl, ["id"]);
                });
                return e;
              }
              case IncrementalSource.Drag:
              case IncrementalSource.TouchMove:
              case IncrementalSource.MouseMove: {
                e.data.positions.forEach((p) => {
                  this.replaceIds(p, iframeEl, ["id"]);
                });
                return e;
              }
              case IncrementalSource.ViewportResize: {
                return false;
              }
              case IncrementalSource.MediaInteraction:
              case IncrementalSource.MouseInteraction:
              case IncrementalSource.Scroll:
              case IncrementalSource.CanvasMutation:
              case IncrementalSource.Input: {
                this.replaceIds(e.data, iframeEl, ["id"]);
                return e;
              }
              case IncrementalSource.StyleSheetRule:
              case IncrementalSource.StyleDeclaration: {
                this.replaceIds(e.data, iframeEl, ["id"]);
                this.replaceStyleIds(e.data, iframeEl, ["styleId"]);
                return e;
              }
              case IncrementalSource.Font: {
                return e;
              }
              case IncrementalSource.Selection: {
                e.data.ranges.forEach((range) => {
                  this.replaceIds(range, iframeEl, ["start", "end"]);
                });
                return e;
              }
              case IncrementalSource.AdoptedStyleSheet: {
                this.replaceIds(e.data, iframeEl, ["id"]);
                this.replaceStyleIds(e.data, iframeEl, ["styleIds"]);
                (_a = e.data.styles) == null ? void 0 : _a.forEach((style) => {
                  this.replaceStyleIds(style, iframeEl, ["styleId"]);
                });
                return e;
              }
            }
          }
        }
      }
      replace(iframeMirror, obj, iframeEl, keys) {
        for (const key of keys) {
          if (!Array.isArray(obj[key]) && typeof obj[key] !== "number")
            continue;
          if (Array.isArray(obj[key])) {
            obj[key] = iframeMirror.getIds(iframeEl, obj[key]);
          } else {
            obj[key] = iframeMirror.getId(iframeEl, obj[key]);
          }
        }
        return obj;
      }
      replaceIds(obj, iframeEl, keys) {
        return this.replace(this.crossOriginIframeMirror, obj, iframeEl, keys);
      }
      replaceStyleIds(obj, iframeEl, keys) {
        return this.replace(this.crossOriginIframeStyleMirror, obj, iframeEl, keys);
      }
      replaceIdOnNode(node, iframeEl) {
        this.replaceIds(node, iframeEl, ["id"]);
        if ("childNodes" in node) {
          node.childNodes.forEach((child) => {
            this.replaceIdOnNode(child, iframeEl);
          });
        }
      }
    }

    var __defProp$1 = Object.defineProperty;
    var __defProps$1 = Object.defineProperties;
    var __getOwnPropDescs$1 = Object.getOwnPropertyDescriptors;
    var __getOwnPropSymbols$2 = Object.getOwnPropertySymbols;
    var __hasOwnProp$2 = Object.prototype.hasOwnProperty;
    var __propIsEnum$2 = Object.prototype.propertyIsEnumerable;
    var __defNormalProp$1 = (obj, key, value) => key in obj ? __defProp$1(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __spreadValues$1 = (a, b) => {
      for (var prop in b || (b = {}))
        if (__hasOwnProp$2.call(b, prop))
          __defNormalProp$1(a, prop, b[prop]);
      if (__getOwnPropSymbols$2)
        for (var prop of __getOwnPropSymbols$2(b)) {
          if (__propIsEnum$2.call(b, prop))
            __defNormalProp$1(a, prop, b[prop]);
        }
      return a;
    };
    var __spreadProps$1 = (a, b) => __defProps$1(a, __getOwnPropDescs$1(b));
    class ShadowDomManager {
      constructor(options) {
        this.shadowDoms = /* @__PURE__ */ new WeakSet();
        this.restorePatches = [];
        this.mutationCb = options.mutationCb;
        this.scrollCb = options.scrollCb;
        this.bypassOptions = options.bypassOptions;
        this.mirror = options.mirror;
        const manager = this;
        this.restorePatches.push(patch(Element.prototype, "attachShadow", function(original) {
          return function(option) {
            const shadowRoot = original.call(this, option);
            if (this.shadowRoot)
              manager.addShadowRoot(this.shadowRoot, this.ownerDocument);
            return shadowRoot;
          };
        }));
      }
      addShadowRoot(shadowRoot, doc) {
        if (!isNativeShadowDom(shadowRoot))
          return;
        if (this.shadowDoms.has(shadowRoot))
          return;
        this.shadowDoms.add(shadowRoot);
        initMutationObserver(__spreadProps$1(__spreadValues$1({}, this.bypassOptions), {
          doc,
          mutationCb: this.mutationCb,
          mirror: this.mirror,
          shadowDomManager: this
        }), shadowRoot);
        initScrollObserver(__spreadProps$1(__spreadValues$1({}, this.bypassOptions), {
          scrollCb: this.scrollCb,
          doc: shadowRoot,
          mirror: this.mirror
        }));
        setTimeout(() => {
          if (shadowRoot.adoptedStyleSheets && shadowRoot.adoptedStyleSheets.length > 0)
            this.bypassOptions.stylesheetManager.adoptStyleSheets(shadowRoot.adoptedStyleSheets, this.mirror.getId(shadowRoot.host));
          initAdoptedStyleSheetObserver({
            mirror: this.mirror,
            stylesheetManager: this.bypassOptions.stylesheetManager
          }, shadowRoot);
        }, 0);
      }
      observeAttachShadow(iframeElement) {
        if (iframeElement.contentWindow) {
          const manager = this;
          this.restorePatches.push(patch(iframeElement.contentWindow.HTMLElement.prototype, "attachShadow", function(original) {
            return function(option) {
              const shadowRoot = original.call(this, option);
              if (this.shadowRoot)
                manager.addShadowRoot(this.shadowRoot, iframeElement.contentDocument);
              return shadowRoot;
            };
          }));
        }
      }
      reset() {
        this.restorePatches.forEach((restorePatch) => restorePatch());
        this.shadowDoms = /* @__PURE__ */ new WeakSet();
      }
    }

    /*
     * base64-arraybuffer 1.0.1 <https://github.com/niklasvh/base64-arraybuffer>
     * Copyright (c) 2021 Niklas von Hertzen <https://hertzen.com>
     * Released under MIT License
     */
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    // Use a lookup table to find the index.
    var lookup = typeof Uint8Array === 'undefined' ? [] : new Uint8Array(256);
    for (var i = 0; i < chars.length; i++) {
        lookup[chars.charCodeAt(i)] = i;
    }
    var encode = function (arraybuffer) {
        var bytes = new Uint8Array(arraybuffer), i, len = bytes.length, base64 = '';
        for (i = 0; i < len; i += 3) {
            base64 += chars[bytes[i] >> 2];
            base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
            base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
            base64 += chars[bytes[i + 2] & 63];
        }
        if (len % 3 === 2) {
            base64 = base64.substring(0, base64.length - 1) + '=';
        }
        else if (len % 3 === 1) {
            base64 = base64.substring(0, base64.length - 2) + '==';
        }
        return base64;
    };

    const canvasVarMap = /* @__PURE__ */ new Map();
    function variableListFor(ctx, ctor) {
      let contextMap = canvasVarMap.get(ctx);
      if (!contextMap) {
        contextMap = /* @__PURE__ */ new Map();
        canvasVarMap.set(ctx, contextMap);
      }
      if (!contextMap.has(ctor)) {
        contextMap.set(ctor, []);
      }
      return contextMap.get(ctor);
    }
    const saveWebGLVar = (value, win, ctx) => {
      if (!value || !(isInstanceOfWebGLObject(value, win) || typeof value === "object"))
        return;
      const name = value.constructor.name;
      const list = variableListFor(ctx, name);
      let index = list.indexOf(value);
      if (index === -1) {
        index = list.length;
        list.push(value);
      }
      return index;
    };
    function serializeArg(value, win, ctx) {
      if (value instanceof Array) {
        return value.map((arg) => serializeArg(arg, win, ctx));
      } else if (value === null) {
        return value;
      } else if (value instanceof Float32Array || value instanceof Float64Array || value instanceof Int32Array || value instanceof Uint32Array || value instanceof Uint8Array || value instanceof Uint16Array || value instanceof Int16Array || value instanceof Int8Array || value instanceof Uint8ClampedArray) {
        const name = value.constructor.name;
        return {
          rr_type: name,
          args: [Object.values(value)]
        };
      } else if (value instanceof ArrayBuffer) {
        const name = value.constructor.name;
        const base64 = encode(value);
        return {
          rr_type: name,
          base64
        };
      } else if (value instanceof DataView) {
        const name = value.constructor.name;
        return {
          rr_type: name,
          args: [
            serializeArg(value.buffer, win, ctx),
            value.byteOffset,
            value.byteLength
          ]
        };
      } else if (value instanceof HTMLImageElement) {
        const name = value.constructor.name;
        const { src } = value;
        return {
          rr_type: name,
          src
        };
      } else if (value instanceof HTMLCanvasElement) {
        const name = "HTMLImageElement";
        const src = value.toDataURL();
        return {
          rr_type: name,
          src
        };
      } else if (value instanceof ImageData) {
        const name = value.constructor.name;
        return {
          rr_type: name,
          args: [serializeArg(value.data, win, ctx), value.width, value.height]
        };
      } else if (isInstanceOfWebGLObject(value, win) || typeof value === "object") {
        const name = value.constructor.name;
        const index = saveWebGLVar(value, win, ctx);
        return {
          rr_type: name,
          index
        };
      }
      return value;
    }
    const serializeArgs = (args, win, ctx) => {
      return [...args].map((arg) => serializeArg(arg, win, ctx));
    };
    const isInstanceOfWebGLObject = (value, win) => {
      const webGLConstructorNames = [
        "WebGLActiveInfo",
        "WebGLBuffer",
        "WebGLFramebuffer",
        "WebGLProgram",
        "WebGLRenderbuffer",
        "WebGLShader",
        "WebGLShaderPrecisionFormat",
        "WebGLTexture",
        "WebGLUniformLocation",
        "WebGLVertexArrayObject",
        "WebGLVertexArrayObjectOES"
      ];
      const supportedWebGLConstructorNames = webGLConstructorNames.filter((name) => typeof win[name] === "function");
      return Boolean(supportedWebGLConstructorNames.find((name) => value instanceof win[name]));
    };

    function initCanvas2DMutationObserver(cb, win, blockClass2, blockSelector) {
      const handlers = [];
      const props2D = Object.getOwnPropertyNames(win.CanvasRenderingContext2D.prototype);
      for (const prop of props2D) {
        try {
          if (typeof win.CanvasRenderingContext2D.prototype[prop] !== "function") {
            continue;
          }
          const restoreHandler = patch(win.CanvasRenderingContext2D.prototype, prop, function(original) {
            return function(...args) {
              if (!isBlocked(this.canvas, blockClass2, blockSelector, true)) {
                setTimeout(() => {
                  const recordArgs = serializeArgs([...args], win, this);
                  cb(this.canvas, {
                    type: CanvasContext["2D"],
                    property: prop,
                    args: recordArgs
                  });
                }, 0);
              }
              return original.apply(this, args);
            };
          });
          handlers.push(restoreHandler);
        } catch (e) {
          const hookHandler = hookSetter(win.CanvasRenderingContext2D.prototype, prop, {
            set(v) {
              cb(this.canvas, {
                type: CanvasContext["2D"],
                property: prop,
                args: [v],
                setter: true
              });
            }
          });
          handlers.push(hookHandler);
        }
      }
      return () => {
        handlers.forEach((h) => h());
      };
    }

    function initCanvasContextObserver(win, blockClass, blockSelector) {
      const handlers = [];
      try {
        const restoreHandler = patch(win.HTMLCanvasElement.prototype, "getContext", function(original) {
          return function(contextType, ...args) {
            if (!isBlocked(this, blockClass, blockSelector, true)) {
              if (!("__context" in this))
                this.__context = contextType;
            }
            return original.apply(this, [contextType, ...args]);
          };
        });
        handlers.push(restoreHandler);
      } catch (e) {
        console.error("failed to patch HTMLCanvasElement.prototype.getContext");
      }
      return () => {
        handlers.forEach((h) => h());
      };
    }

    function patchGLPrototype(prototype, type, cb, blockClass2, blockSelector, mirror, win) {
      const handlers = [];
      const props = Object.getOwnPropertyNames(prototype);
      for (const prop of props) {
        if ([
          "isContextLost",
          "canvas",
          "drawingBufferWidth",
          "drawingBufferHeight"
        ].includes(prop)) {
          continue;
        }
        try {
          if (typeof prototype[prop] !== "function") {
            continue;
          }
          const restoreHandler = patch(prototype, prop, function(original) {
            return function(...args) {
              const result = original.apply(this, args);
              saveWebGLVar(result, win, this);
              if (!isBlocked(this.canvas, blockClass2, blockSelector, true)) {
                const recordArgs = serializeArgs([...args], win, this);
                const mutation = {
                  type,
                  property: prop,
                  args: recordArgs
                };
                cb(this.canvas, mutation);
              }
              return result;
            };
          });
          handlers.push(restoreHandler);
        } catch (e) {
          const hookHandler = hookSetter(prototype, prop, {
            set(v) {
              cb(this.canvas, {
                type,
                property: prop,
                args: [v],
                setter: true
              });
            }
          });
          handlers.push(hookHandler);
        }
      }
      return handlers;
    }
    function initCanvasWebGLMutationObserver(cb, win, blockClass2, blockSelector, mirror) {
      const handlers = [];
      handlers.push(...patchGLPrototype(win.WebGLRenderingContext.prototype, CanvasContext.WebGL, cb, blockClass2, blockSelector, mirror, win));
      if (typeof win.WebGL2RenderingContext !== "undefined") {
        handlers.push(...patchGLPrototype(win.WebGL2RenderingContext.prototype, CanvasContext.WebGL2, cb, blockClass2, blockSelector, mirror, win));
      }
      return () => {
        handlers.forEach((h) => h());
      };
    }

    function decodeBase64(base64, enableUnicode) {
        var binaryString = atob(base64);
        if (enableUnicode) {
            var binaryView = new Uint8Array(binaryString.length);
            for (var i = 0, n = binaryString.length; i < n; ++i) {
                binaryView[i] = binaryString.charCodeAt(i);
            }
            return String.fromCharCode.apply(null, new Uint16Array(binaryView.buffer));
        }
        return binaryString;
    }

    function createURL(base64, sourcemapArg, enableUnicodeArg) {
        var sourcemap = sourcemapArg === undefined ? null : sourcemapArg;
        var enableUnicode = enableUnicodeArg === undefined ? false : enableUnicodeArg;
        var source = decodeBase64(base64, enableUnicode);
        var start = source.indexOf('\n', 10) + 1;
        var body = source.substring(start) + (sourcemap ? '\/\/# sourceMappingURL=' + sourcemap : '');
        var blob = new Blob([body], { type: 'application/javascript' });
        return URL.createObjectURL(blob);
    }

    function createBase64WorkerFactory(base64, sourcemapArg, enableUnicodeArg) {
        var url;
        return function WorkerFactory(options) {
            url = url || createURL(base64, sourcemapArg, enableUnicodeArg);
            return new Worker(url, options);
        };
    }

    var WorkerFactory = createBase64WorkerFactory('Lyogcm9sbHVwLXBsdWdpbi13ZWItd29ya2VyLWxvYWRlciAqLwooZnVuY3Rpb24gKCkgewogICAgJ3VzZSBzdHJpY3QnOwoKICAgIC8qCiAgICAgKiBiYXNlNjQtYXJyYXlidWZmZXIgMS4wLjEgPGh0dHBzOi8vZ2l0aHViLmNvbS9uaWtsYXN2aC9iYXNlNjQtYXJyYXlidWZmZXI+CiAgICAgKiBDb3B5cmlnaHQgKGMpIDIwMjEgTmlrbGFzIHZvbiBIZXJ0emVuIDxodHRwczovL2hlcnR6ZW4uY29tPgogICAgICogUmVsZWFzZWQgdW5kZXIgTUlUIExpY2Vuc2UKICAgICAqLwogICAgdmFyIGNoYXJzID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky8nOwogICAgLy8gVXNlIGEgbG9va3VwIHRhYmxlIHRvIGZpbmQgdGhlIGluZGV4LgogICAgdmFyIGxvb2t1cCA9IHR5cGVvZiBVaW50OEFycmF5ID09PSAndW5kZWZpbmVkJyA/IFtdIDogbmV3IFVpbnQ4QXJyYXkoMjU2KTsKICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2hhcnMubGVuZ3RoOyBpKyspIHsKICAgICAgICBsb29rdXBbY2hhcnMuY2hhckNvZGVBdChpKV0gPSBpOwogICAgfQogICAgdmFyIGVuY29kZSA9IGZ1bmN0aW9uIChhcnJheWJ1ZmZlcikgewogICAgICAgIHZhciBieXRlcyA9IG5ldyBVaW50OEFycmF5KGFycmF5YnVmZmVyKSwgaSwgbGVuID0gYnl0ZXMubGVuZ3RoLCBiYXNlNjQgPSAnJzsKICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpICs9IDMpIHsKICAgICAgICAgICAgYmFzZTY0ICs9IGNoYXJzW2J5dGVzW2ldID4+IDJdOwogICAgICAgICAgICBiYXNlNjQgKz0gY2hhcnNbKChieXRlc1tpXSAmIDMpIDw8IDQpIHwgKGJ5dGVzW2kgKyAxXSA+PiA0KV07CiAgICAgICAgICAgIGJhc2U2NCArPSBjaGFyc1soKGJ5dGVzW2kgKyAxXSAmIDE1KSA8PCAyKSB8IChieXRlc1tpICsgMl0gPj4gNildOwogICAgICAgICAgICBiYXNlNjQgKz0gY2hhcnNbYnl0ZXNbaSArIDJdICYgNjNdOwogICAgICAgIH0KICAgICAgICBpZiAobGVuICUgMyA9PT0gMikgewogICAgICAgICAgICBiYXNlNjQgPSBiYXNlNjQuc3Vic3RyaW5nKDAsIGJhc2U2NC5sZW5ndGggLSAxKSArICc9JzsKICAgICAgICB9CiAgICAgICAgZWxzZSBpZiAobGVuICUgMyA9PT0gMSkgewogICAgICAgICAgICBiYXNlNjQgPSBiYXNlNjQuc3Vic3RyaW5nKDAsIGJhc2U2NC5sZW5ndGggLSAyKSArICc9PSc7CiAgICAgICAgfQogICAgICAgIHJldHVybiBiYXNlNjQ7CiAgICB9OwoKICAgIGNvbnN0IGxhc3RCbG9iTWFwID0gLyogQF9fUFVSRV9fICovIG5ldyBNYXAoKTsKICAgIGNvbnN0IHRyYW5zcGFyZW50QmxvYk1hcCA9IC8qIEBfX1BVUkVfXyAqLyBuZXcgTWFwKCk7CiAgICBhc3luYyBmdW5jdGlvbiBnZXRUcmFuc3BhcmVudEJsb2JGb3Iod2lkdGgsIGhlaWdodCwgZGF0YVVSTE9wdGlvbnMpIHsKICAgICAgY29uc3QgaWQgPSBgJHt3aWR0aH0tJHtoZWlnaHR9YDsKICAgICAgaWYgKCJPZmZzY3JlZW5DYW52YXMiIGluIGdsb2JhbFRoaXMpIHsKICAgICAgICBpZiAodHJhbnNwYXJlbnRCbG9iTWFwLmhhcyhpZCkpCiAgICAgICAgICByZXR1cm4gdHJhbnNwYXJlbnRCbG9iTWFwLmdldChpZCk7CiAgICAgICAgY29uc3Qgb2Zmc2NyZWVuID0gbmV3IE9mZnNjcmVlbkNhbnZhcyh3aWR0aCwgaGVpZ2h0KTsKICAgICAgICBvZmZzY3JlZW4uZ2V0Q29udGV4dCgiMmQiKTsKICAgICAgICBjb25zdCBibG9iID0gYXdhaXQgb2Zmc2NyZWVuLmNvbnZlcnRUb0Jsb2IoZGF0YVVSTE9wdGlvbnMpOwogICAgICAgIGNvbnN0IGFycmF5QnVmZmVyID0gYXdhaXQgYmxvYi5hcnJheUJ1ZmZlcigpOwogICAgICAgIGNvbnN0IGJhc2U2NCA9IGVuY29kZShhcnJheUJ1ZmZlcik7CiAgICAgICAgdHJhbnNwYXJlbnRCbG9iTWFwLnNldChpZCwgYmFzZTY0KTsKICAgICAgICByZXR1cm4gYmFzZTY0OwogICAgICB9IGVsc2UgewogICAgICAgIHJldHVybiAiIjsKICAgICAgfQogICAgfQogICAgY29uc3Qgd29ya2VyID0gc2VsZjsKICAgIHdvcmtlci5vbm1lc3NhZ2UgPSBhc3luYyBmdW5jdGlvbihlKSB7CiAgICAgIGlmICgiT2Zmc2NyZWVuQ2FudmFzIiBpbiBnbG9iYWxUaGlzKSB7CiAgICAgICAgY29uc3QgeyBpZCwgYml0bWFwLCB3aWR0aCwgaGVpZ2h0LCBkYXRhVVJMT3B0aW9ucyB9ID0gZS5kYXRhOwogICAgICAgIGNvbnN0IHRyYW5zcGFyZW50QmFzZTY0ID0gZ2V0VHJhbnNwYXJlbnRCbG9iRm9yKHdpZHRoLCBoZWlnaHQsIGRhdGFVUkxPcHRpb25zKTsKICAgICAgICBjb25zdCBvZmZzY3JlZW4gPSBuZXcgT2Zmc2NyZWVuQ2FudmFzKHdpZHRoLCBoZWlnaHQpOwogICAgICAgIGNvbnN0IGN0eCA9IG9mZnNjcmVlbi5nZXRDb250ZXh0KCIyZCIpOwogICAgICAgIGN0eC5kcmF3SW1hZ2UoYml0bWFwLCAwLCAwKTsKICAgICAgICBiaXRtYXAuY2xvc2UoKTsKICAgICAgICBjb25zdCBibG9iID0gYXdhaXQgb2Zmc2NyZWVuLmNvbnZlcnRUb0Jsb2IoZGF0YVVSTE9wdGlvbnMpOwogICAgICAgIGNvbnN0IHR5cGUgPSBibG9iLnR5cGU7CiAgICAgICAgY29uc3QgYXJyYXlCdWZmZXIgPSBhd2FpdCBibG9iLmFycmF5QnVmZmVyKCk7CiAgICAgICAgY29uc3QgYmFzZTY0ID0gZW5jb2RlKGFycmF5QnVmZmVyKTsKICAgICAgICBpZiAoIWxhc3RCbG9iTWFwLmhhcyhpZCkgJiYgYXdhaXQgdHJhbnNwYXJlbnRCYXNlNjQgPT09IGJhc2U2NCkgewogICAgICAgICAgbGFzdEJsb2JNYXAuc2V0KGlkLCBiYXNlNjQpOwogICAgICAgICAgcmV0dXJuIHdvcmtlci5wb3N0TWVzc2FnZSh7IGlkIH0pOwogICAgICAgIH0KICAgICAgICBpZiAobGFzdEJsb2JNYXAuZ2V0KGlkKSA9PT0gYmFzZTY0KQogICAgICAgICAgcmV0dXJuIHdvcmtlci5wb3N0TWVzc2FnZSh7IGlkIH0pOwogICAgICAgIHdvcmtlci5wb3N0TWVzc2FnZSh7CiAgICAgICAgICBpZCwKICAgICAgICAgIHR5cGUsCiAgICAgICAgICBiYXNlNjQsCiAgICAgICAgICB3aWR0aCwKICAgICAgICAgIGhlaWdodAogICAgICAgIH0pOwogICAgICAgIGxhc3RCbG9iTWFwLnNldChpZCwgYmFzZTY0KTsKICAgICAgfSBlbHNlIHsKICAgICAgICByZXR1cm4gd29ya2VyLnBvc3RNZXNzYWdlKHsgaWQ6IGUuZGF0YS5pZCB9KTsKICAgICAgfQogICAgfTsKCn0pKCk7Cgo=', null, false);
    /* eslint-enable */

    var __getOwnPropSymbols$1 = Object.getOwnPropertySymbols;
    var __hasOwnProp$1 = Object.prototype.hasOwnProperty;
    var __propIsEnum$1 = Object.prototype.propertyIsEnumerable;
    var __objRest = (source, exclude) => {
      var target = {};
      for (var prop in source)
        if (__hasOwnProp$1.call(source, prop) && exclude.indexOf(prop) < 0)
          target[prop] = source[prop];
      if (source != null && __getOwnPropSymbols$1)
        for (var prop of __getOwnPropSymbols$1(source)) {
          if (exclude.indexOf(prop) < 0 && __propIsEnum$1.call(source, prop))
            target[prop] = source[prop];
        }
      return target;
    };
    var __async = (__this, __arguments, generator) => {
      return new Promise((resolve, reject) => {
        var fulfilled = (value) => {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        };
        var rejected = (value) => {
          try {
            step(generator.throw(value));
          } catch (e) {
            reject(e);
          }
        };
        var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
        step((generator = generator.apply(__this, __arguments)).next());
      });
    };
    class CanvasManager {
      constructor(options) {
        this.pendingCanvasMutations = /* @__PURE__ */ new Map();
        this.rafStamps = { latestId: 0, invokeId: null };
        this.frozen = false;
        this.locked = false;
        this.processMutation = (target, mutation) => {
          const newFrame = this.rafStamps.invokeId && this.rafStamps.latestId !== this.rafStamps.invokeId;
          if (newFrame || !this.rafStamps.invokeId)
            this.rafStamps.invokeId = this.rafStamps.latestId;
          if (!this.pendingCanvasMutations.has(target)) {
            this.pendingCanvasMutations.set(target, []);
          }
          this.pendingCanvasMutations.get(target).push(mutation);
        };
        const {
          sampling = "all",
          win,
          blockClass,
          blockSelector,
          recordCanvas,
          dataURLOptions
        } = options;
        this.mutationCb = options.mutationCb;
        this.mirror = options.mirror;
        if (recordCanvas && sampling === "all")
          this.initCanvasMutationObserver(win, blockClass, blockSelector);
        if (recordCanvas && typeof sampling === "number")
          this.initCanvasFPSObserver(sampling, win, blockClass, blockSelector, {
            dataURLOptions
          });
      }
      reset() {
        this.pendingCanvasMutations.clear();
        this.resetObservers && this.resetObservers();
      }
      freeze() {
        this.frozen = true;
      }
      unfreeze() {
        this.frozen = false;
      }
      lock() {
        this.locked = true;
      }
      unlock() {
        this.locked = false;
      }
      initCanvasFPSObserver(fps, win, blockClass, blockSelector, options) {
        const canvasContextReset = initCanvasContextObserver(win, blockClass, blockSelector);
        const snapshotInProgressMap = /* @__PURE__ */ new Map();
        const worker = new WorkerFactory();
        worker.onmessage = (e) => {
          const { id } = e.data;
          snapshotInProgressMap.set(id, false);
          if (!("base64" in e.data))
            return;
          const { base64, type, width, height } = e.data;
          this.mutationCb({
            id,
            type: CanvasContext["2D"],
            commands: [
              {
                property: "clearRect",
                args: [0, 0, width, height]
              },
              {
                property: "drawImage",
                args: [
                  {
                    rr_type: "ImageBitmap",
                    args: [
                      {
                        rr_type: "Blob",
                        data: [{ rr_type: "ArrayBuffer", base64 }],
                        type
                      }
                    ]
                  },
                  0,
                  0
                ]
              }
            ]
          });
        };
        const timeBetweenSnapshots = 1e3 / fps;
        let lastSnapshotTime = 0;
        let rafId;
        const getCanvas = () => {
          const matchedCanvas = [];
          win.document.querySelectorAll("canvas").forEach((canvas) => {
            if (!isBlocked(canvas, blockClass, blockSelector, true)) {
              matchedCanvas.push(canvas);
            }
          });
          return matchedCanvas;
        };
        const takeCanvasSnapshots = (timestamp) => {
          if (lastSnapshotTime && timestamp - lastSnapshotTime < timeBetweenSnapshots) {
            rafId = requestAnimationFrame(takeCanvasSnapshots);
            return;
          }
          lastSnapshotTime = timestamp;
          getCanvas().forEach((canvas) => __async(this, null, function* () {
            var _a;
            const id = this.mirror.getId(canvas);
            if (snapshotInProgressMap.get(id))
              return;
            snapshotInProgressMap.set(id, true);
            if (["webgl", "webgl2"].includes(canvas.__context)) {
              const context = canvas.getContext(canvas.__context);
              if (((_a = context == null ? void 0 : context.getContextAttributes()) == null ? void 0 : _a.preserveDrawingBuffer) === false) {
                context == null ? void 0 : context.clear(context.COLOR_BUFFER_BIT);
              }
            }
            const bitmap = yield createImageBitmap(canvas);
            worker.postMessage({
              id,
              bitmap,
              width: canvas.width,
              height: canvas.height,
              dataURLOptions: options.dataURLOptions
            }, [bitmap]);
          }));
          rafId = requestAnimationFrame(takeCanvasSnapshots);
        };
        rafId = requestAnimationFrame(takeCanvasSnapshots);
        this.resetObservers = () => {
          canvasContextReset();
          cancelAnimationFrame(rafId);
        };
      }
      initCanvasMutationObserver(win, blockClass, blockSelector) {
        this.startRAFTimestamping();
        this.startPendingCanvasMutationFlusher();
        const canvasContextReset = initCanvasContextObserver(win, blockClass, blockSelector);
        const canvas2DReset = initCanvas2DMutationObserver(this.processMutation.bind(this), win, blockClass, blockSelector);
        const canvasWebGL1and2Reset = initCanvasWebGLMutationObserver(this.processMutation.bind(this), win, blockClass, blockSelector, this.mirror);
        this.resetObservers = () => {
          canvasContextReset();
          canvas2DReset();
          canvasWebGL1and2Reset();
        };
      }
      startPendingCanvasMutationFlusher() {
        requestAnimationFrame(() => this.flushPendingCanvasMutations());
      }
      startRAFTimestamping() {
        const setLatestRAFTimestamp = (timestamp) => {
          this.rafStamps.latestId = timestamp;
          requestAnimationFrame(setLatestRAFTimestamp);
        };
        requestAnimationFrame(setLatestRAFTimestamp);
      }
      flushPendingCanvasMutations() {
        this.pendingCanvasMutations.forEach((values, canvas) => {
          const id = this.mirror.getId(canvas);
          this.flushPendingCanvasMutationFor(canvas, id);
        });
        requestAnimationFrame(() => this.flushPendingCanvasMutations());
      }
      flushPendingCanvasMutationFor(canvas, id) {
        if (this.frozen || this.locked) {
          return;
        }
        const valuesWithType = this.pendingCanvasMutations.get(canvas);
        if (!valuesWithType || id === -1)
          return;
        const values = valuesWithType.map((value) => {
          const _a = value, rest = __objRest(_a, ["type"]);
          return rest;
        });
        const { type } = valuesWithType[0];
        this.mutationCb({ id, type, commands: values });
        this.pendingCanvasMutations.delete(canvas);
      }
    }

    class StylesheetManager {
      constructor(options) {
        this.trackedLinkElements = /* @__PURE__ */ new WeakSet();
        this.styleMirror = new StyleSheetMirror();
        this.mutationCb = options.mutationCb;
        this.adoptedStyleSheetCb = options.adoptedStyleSheetCb;
      }
      attachLinkElement(linkEl, childSn) {
        if ("_cssText" in childSn.attributes)
          this.mutationCb({
            adds: [],
            removes: [],
            texts: [],
            attributes: [
              {
                id: childSn.id,
                attributes: childSn.attributes
              }
            ]
          });
        this.trackLinkElement(linkEl);
      }
      trackLinkElement(linkEl) {
        if (this.trackedLinkElements.has(linkEl))
          return;
        this.trackedLinkElements.add(linkEl);
        this.trackStylesheetInLinkElement(linkEl);
      }
      adoptStyleSheets(sheets, hostId) {
        if (sheets.length === 0)
          return;
        const adoptedStyleSheetData = {
          id: hostId,
          styleIds: []
        };
        const styles = [];
        for (const sheet of sheets) {
          let styleId;
          if (!this.styleMirror.has(sheet)) {
            styleId = this.styleMirror.add(sheet);
            const rules = Array.from(sheet.rules || CSSRule);
            styles.push({
              styleId,
              rules: rules.map((r, index) => {
                return {
                  rule: getCssRuleString(r),
                  index
                };
              })
            });
          } else
            styleId = this.styleMirror.getId(sheet);
          adoptedStyleSheetData.styleIds.push(styleId);
        }
        if (styles.length > 0)
          adoptedStyleSheetData.styles = styles;
        this.adoptedStyleSheetCb(adoptedStyleSheetData);
      }
      reset() {
        this.styleMirror.reset();
        this.trackedLinkElements = /* @__PURE__ */ new WeakSet();
      }
      trackStylesheetInLinkElement(linkEl) {
      }
    }

    var __defProp = Object.defineProperty;
    var __defProps = Object.defineProperties;
    var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
    var __getOwnPropSymbols = Object.getOwnPropertySymbols;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __propIsEnum = Object.prototype.propertyIsEnumerable;
    var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __spreadValues = (a, b) => {
      for (var prop in b || (b = {}))
        if (__hasOwnProp.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      if (__getOwnPropSymbols)
        for (var prop of __getOwnPropSymbols(b)) {
          if (__propIsEnum.call(b, prop))
            __defNormalProp(a, prop, b[prop]);
        }
      return a;
    };
    var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
    function wrapEvent(e) {
      return __spreadProps(__spreadValues({}, e), {
        timestamp: Date.now()
      });
    }
    let wrappedEmit;
    let takeFullSnapshot;
    let canvasManager;
    let recording = false;
    const mirror = createMirror();
    function record(options = {}) {
      const {
        emit,
        checkoutEveryNms,
        checkoutEveryNth,
        blockClass = "rr-block",
        blockSelector = null,
        ignoreClass = "rr-ignore",
        maskTextClass = "rr-mask",
        maskTextSelector = null,
        inlineStylesheet = true,
        maskAllInputs,
        maskInputOptions: _maskInputOptions,
        slimDOMOptions: _slimDOMOptions,
        maskInputFn,
        maskTextFn,
        hooks,
        packFn,
        sampling = {},
        dataURLOptions = {},
        mousemoveWait,
        recordCanvas = false,
        recordCrossOriginIframes = false,
        userTriggeredOnInput = false,
        collectFonts = false,
        inlineImages = false,
        plugins,
        keepIframeSrcFn = () => false,
        ignoreCSSAttributes = /* @__PURE__ */ new Set([])
      } = options;
      const inEmittingFrame = recordCrossOriginIframes ? window.parent === window : true;
      let passEmitsToParent = false;
      if (!inEmittingFrame) {
        try {
          window.parent.document;
          passEmitsToParent = false;
        } catch (e) {
          passEmitsToParent = true;
        }
      }
      if (inEmittingFrame && !emit) {
        throw new Error("emit function is required");
      }
      if (mousemoveWait !== void 0 && sampling.mousemove === void 0) {
        sampling.mousemove = mousemoveWait;
      }
      mirror.reset();
      const maskInputOptions = maskAllInputs === true ? {
        color: true,
        date: true,
        "datetime-local": true,
        email: true,
        month: true,
        number: true,
        range: true,
        search: true,
        tel: true,
        text: true,
        time: true,
        url: true,
        week: true,
        textarea: true,
        select: true,
        password: true
      } : _maskInputOptions !== void 0 ? _maskInputOptions : { password: true };
      const slimDOMOptions = _slimDOMOptions === true || _slimDOMOptions === "all" ? {
        script: true,
        comment: true,
        headFavicon: true,
        headWhitespace: true,
        headMetaSocial: true,
        headMetaRobots: true,
        headMetaHttpEquiv: true,
        headMetaVerification: true,
        headMetaAuthorship: _slimDOMOptions === "all",
        headMetaDescKeywords: _slimDOMOptions === "all"
      } : _slimDOMOptions ? _slimDOMOptions : {};
      polyfill();
      let lastFullSnapshotEvent;
      let incrementalSnapshotCount = 0;
      const eventProcessor = (e) => {
        for (const plugin of plugins || []) {
          if (plugin.eventProcessor) {
            e = plugin.eventProcessor(e);
          }
        }
        if (packFn) {
          e = packFn(e);
        }
        return e;
      };
      wrappedEmit = (e, isCheckout) => {
        var _a;
        if (((_a = mutationBuffers[0]) == null ? void 0 : _a.isFrozen()) && e.type !== EventType.FullSnapshot && !(e.type === EventType.IncrementalSnapshot && e.data.source === IncrementalSource.Mutation)) {
          mutationBuffers.forEach((buf) => buf.unfreeze());
        }
        if (inEmittingFrame) {
          emit == null ? void 0 : emit(eventProcessor(e), isCheckout);
        } else if (passEmitsToParent) {
          const message = {
            type: "rrweb",
            event: eventProcessor(e),
            isCheckout
          };
          window.parent.postMessage(message, "*");
        }
        if (e.type === EventType.FullSnapshot) {
          lastFullSnapshotEvent = e;
          incrementalSnapshotCount = 0;
        } else if (e.type === EventType.IncrementalSnapshot) {
          if (e.data.source === IncrementalSource.Mutation && e.data.isAttachIframe) {
            return;
          }
          incrementalSnapshotCount++;
          const exceedCount = checkoutEveryNth && incrementalSnapshotCount >= checkoutEveryNth;
          const exceedTime = checkoutEveryNms && e.timestamp - lastFullSnapshotEvent.timestamp > checkoutEveryNms;
          if (exceedCount || exceedTime) {
            takeFullSnapshot(true);
          }
        }
      };
      const wrappedMutationEmit = (m) => {
        wrappedEmit(wrapEvent({
          type: EventType.IncrementalSnapshot,
          data: __spreadValues({
            source: IncrementalSource.Mutation
          }, m)
        }));
      };
      const wrappedScrollEmit = (p) => wrappedEmit(wrapEvent({
        type: EventType.IncrementalSnapshot,
        data: __spreadValues({
          source: IncrementalSource.Scroll
        }, p)
      }));
      const wrappedCanvasMutationEmit = (p) => wrappedEmit(wrapEvent({
        type: EventType.IncrementalSnapshot,
        data: __spreadValues({
          source: IncrementalSource.CanvasMutation
        }, p)
      }));
      const wrappedAdoptedStyleSheetEmit = (a) => wrappedEmit(wrapEvent({
        type: EventType.IncrementalSnapshot,
        data: __spreadValues({
          source: IncrementalSource.AdoptedStyleSheet
        }, a)
      }));
      const stylesheetManager = new StylesheetManager({
        mutationCb: wrappedMutationEmit,
        adoptedStyleSheetCb: wrappedAdoptedStyleSheetEmit
      });
      const iframeManager = new IframeManager({
        mirror,
        mutationCb: wrappedMutationEmit,
        stylesheetManager,
        recordCrossOriginIframes,
        wrappedEmit
      });
      for (const plugin of plugins || []) {
        if (plugin.getMirror)
          plugin.getMirror({
            nodeMirror: mirror,
            crossOriginIframeMirror: iframeManager.crossOriginIframeMirror,
            crossOriginIframeStyleMirror: iframeManager.crossOriginIframeStyleMirror
          });
      }
      canvasManager = new CanvasManager({
        recordCanvas,
        mutationCb: wrappedCanvasMutationEmit,
        win: window,
        blockClass,
        blockSelector,
        mirror,
        sampling: sampling.canvas,
        dataURLOptions
      });
      const shadowDomManager = new ShadowDomManager({
        mutationCb: wrappedMutationEmit,
        scrollCb: wrappedScrollEmit,
        bypassOptions: {
          blockClass,
          blockSelector,
          maskTextClass,
          maskTextSelector,
          inlineStylesheet,
          maskInputOptions,
          dataURLOptions,
          maskTextFn,
          maskInputFn,
          recordCanvas,
          inlineImages,
          sampling,
          slimDOMOptions,
          iframeManager,
          stylesheetManager,
          canvasManager,
          keepIframeSrcFn
        },
        mirror
      });
      takeFullSnapshot = (isCheckout = false) => {
        var _a, _b, _c, _d, _e, _f;
        wrappedEmit(wrapEvent({
          type: EventType.Meta,
          data: {
            href: window.location.href,
            width: getWindowWidth(),
            height: getWindowHeight()
          }
        }), isCheckout);
        stylesheetManager.reset();
        mutationBuffers.forEach((buf) => buf.lock());
        const node = snapshot(document, {
          mirror,
          blockClass,
          blockSelector,
          maskTextClass,
          maskTextSelector,
          inlineStylesheet,
          maskAllInputs: maskInputOptions,
          maskTextFn,
          slimDOM: slimDOMOptions,
          dataURLOptions,
          recordCanvas,
          inlineImages,
          onSerialize: (n) => {
            if (isSerializedIframe(n, mirror)) {
              iframeManager.addIframe(n);
            }
            if (isSerializedStylesheet(n, mirror)) {
              stylesheetManager.trackLinkElement(n);
            }
            if (hasShadowRoot(n)) {
              shadowDomManager.addShadowRoot(n.shadowRoot, document);
            }
          },
          onIframeLoad: (iframe, childSn) => {
            iframeManager.attachIframe(iframe, childSn);
            shadowDomManager.observeAttachShadow(iframe);
          },
          onStylesheetLoad: (linkEl, childSn) => {
            stylesheetManager.attachLinkElement(linkEl, childSn);
          },
          keepIframeSrcFn
        });
        if (!node) {
          return console.warn("Failed to snapshot the document");
        }
        wrappedEmit(wrapEvent({
          type: EventType.FullSnapshot,
          data: {
            node,
            initialOffset: {
              left: window.pageXOffset !== void 0 ? window.pageXOffset : (document == null ? void 0 : document.documentElement.scrollLeft) || ((_b = (_a = document == null ? void 0 : document.body) == null ? void 0 : _a.parentElement) == null ? void 0 : _b.scrollLeft) || ((_c = document == null ? void 0 : document.body) == null ? void 0 : _c.scrollLeft) || 0,
              top: window.pageYOffset !== void 0 ? window.pageYOffset : (document == null ? void 0 : document.documentElement.scrollTop) || ((_e = (_d = document == null ? void 0 : document.body) == null ? void 0 : _d.parentElement) == null ? void 0 : _e.scrollTop) || ((_f = document == null ? void 0 : document.body) == null ? void 0 : _f.scrollTop) || 0
            }
          }
        }));
        mutationBuffers.forEach((buf) => buf.unlock());
        if (document.adoptedStyleSheets && document.adoptedStyleSheets.length > 0)
          stylesheetManager.adoptStyleSheets(document.adoptedStyleSheets, mirror.getId(document));
      };
      try {
        const handlers = [];
        handlers.push(on("DOMContentLoaded", () => {
          wrappedEmit(wrapEvent({
            type: EventType.DomContentLoaded,
            data: {}
          }));
        }));
        const observe = (doc) => {
          var _a;
          return initObservers({
            mutationCb: wrappedMutationEmit,
            mousemoveCb: (positions, source) => wrappedEmit(wrapEvent({
              type: EventType.IncrementalSnapshot,
              data: {
                source,
                positions
              }
            })),
            mouseInteractionCb: (d) => wrappedEmit(wrapEvent({
              type: EventType.IncrementalSnapshot,
              data: __spreadValues({
                source: IncrementalSource.MouseInteraction
              }, d)
            })),
            scrollCb: wrappedScrollEmit,
            viewportResizeCb: (d) => wrappedEmit(wrapEvent({
              type: EventType.IncrementalSnapshot,
              data: __spreadValues({
                source: IncrementalSource.ViewportResize
              }, d)
            })),
            inputCb: (v) => wrappedEmit(wrapEvent({
              type: EventType.IncrementalSnapshot,
              data: __spreadValues({
                source: IncrementalSource.Input
              }, v)
            })),
            mediaInteractionCb: (p) => wrappedEmit(wrapEvent({
              type: EventType.IncrementalSnapshot,
              data: __spreadValues({
                source: IncrementalSource.MediaInteraction
              }, p)
            })),
            styleSheetRuleCb: (r) => wrappedEmit(wrapEvent({
              type: EventType.IncrementalSnapshot,
              data: __spreadValues({
                source: IncrementalSource.StyleSheetRule
              }, r)
            })),
            styleDeclarationCb: (r) => wrappedEmit(wrapEvent({
              type: EventType.IncrementalSnapshot,
              data: __spreadValues({
                source: IncrementalSource.StyleDeclaration
              }, r)
            })),
            canvasMutationCb: wrappedCanvasMutationEmit,
            fontCb: (p) => wrappedEmit(wrapEvent({
              type: EventType.IncrementalSnapshot,
              data: __spreadValues({
                source: IncrementalSource.Font
              }, p)
            })),
            selectionCb: (p) => {
              wrappedEmit(wrapEvent({
                type: EventType.IncrementalSnapshot,
                data: __spreadValues({
                  source: IncrementalSource.Selection
                }, p)
              }));
            },
            blockClass,
            ignoreClass,
            maskTextClass,
            maskTextSelector,
            maskInputOptions,
            inlineStylesheet,
            sampling,
            recordCanvas,
            inlineImages,
            userTriggeredOnInput,
            collectFonts,
            doc,
            maskInputFn,
            maskTextFn,
            keepIframeSrcFn,
            blockSelector,
            slimDOMOptions,
            dataURLOptions,
            mirror,
            iframeManager,
            stylesheetManager,
            shadowDomManager,
            canvasManager,
            ignoreCSSAttributes,
            plugins: ((_a = plugins == null ? void 0 : plugins.filter((p) => p.observer)) == null ? void 0 : _a.map((p) => ({
              observer: p.observer,
              options: p.options,
              callback: (payload) => wrappedEmit(wrapEvent({
                type: EventType.Plugin,
                data: {
                  plugin: p.name,
                  payload
                }
              }))
            }))) || []
          }, hooks);
        };
        iframeManager.addLoadListener((iframeEl) => {
          handlers.push(observe(iframeEl.contentDocument));
        });
        const init = () => {
          takeFullSnapshot();
          handlers.push(observe(document));
          recording = true;
        };
        if (document.readyState === "interactive" || document.readyState === "complete") {
          init();
        } else {
          handlers.push(on("load", () => {
            wrappedEmit(wrapEvent({
              type: EventType.Load,
              data: {}
            }));
            init();
          }, window));
        }
        return () => {
          handlers.forEach((h) => h());
          recording = false;
        };
      } catch (error) {
        console.warn(error);
      }
    }
    record.addCustomEvent = (tag, payload) => {
      if (!recording) {
        throw new Error("please add custom event after start recording");
      }
      wrappedEmit(wrapEvent({
        type: EventType.Custom,
        data: {
          tag,
          payload
        }
      }));
    };
    record.freezePage = () => {
      mutationBuffers.forEach((buf) => buf.freeze());
    };
    record.takeFullSnapshot = (isCheckout) => {
      if (!recording) {
        throw new Error("please take full snapshot after start recording");
      }
      takeFullSnapshot(isCheckout);
    };
    record.mirror = mirror;

    return record;

})();