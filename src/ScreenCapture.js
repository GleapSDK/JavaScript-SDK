import { isMobile, resizeImage } from "./GleapHelper";
import { isBlacklisted } from "./ResourceExclusionList";

export const startScreenCapture = (isLiveSite) => {
  return prepareScreenshotData(isLiveSite);
};

const documentToHTML = (clone) => {
  var html = "";
  var node = window.document.doctype;
  if (node) {
    html =
      "<!DOCTYPE " +
      node.name +
      (node.publicId ? ' PUBLIC "' + node.publicId + '"' : "") +
      (!node.publicId && node.systemId ? " SYSTEM" : "") +
      (node.systemId ? ' "' + node.systemId + '"' : "") +
      ">";
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

const replaceAsync = (str, regex, asyncFn) => {
  return new Promise((resolve, reject) => {
    const promises = [];
    str.replace(regex, (match, ...args) => {
      const promise = asyncFn(match, ...args);
      promises.push(promise);
    });
    Promise.all(promises)
      .then((data) => {
        resolve(str.replace(regex, () => data.shift()));
      })
      .catch(() => {
        reject();
      });
  });
};

const loadCSSUrlResources = (data, basePath, remote) => {
  return replaceAsync(
    data,
    /url\((.*?)\)/g,
    (matchedData) =>
      new Promise((resolve, reject) => {
        if (!matchedData) {
          return resolve(matchedData);
        }

        var matchedUrl = matchedData
          .substr(4, matchedData.length - 5)
          .replaceAll("'", "")
          .replaceAll('"', "");

        // Remote file or data
        if (
          matchedUrl.indexOf("http") === 0 ||
          matchedUrl.indexOf("//") === 0 ||
          matchedUrl.indexOf("data") === 0
        ) {
          return resolve(matchedData);
        }

        try {
          var resourcePath = matchedUrl;
          if (basePath) {
            resourcePath = new URL(matchedUrl, basePath + "/").href;
          }

          // Try to fetch external resource.
          if (!remote) {
            return fetchCSSResource(resourcePath).then((resourceData) => {
              return resolve("url(" + resourceData + ")");
            });
          } else {
            return resolve("url(" + resourcePath + ")");
          }
        } catch (exp) {
          return resolve(matchedData);
        }
      })
  );
};

const fetchCSSResource = (url) => {
  return new Promise((resolve, reject) => {
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

const progressResource = (data, elem, resolve, reject) => {
  resizeImage(data, 500, 500)
    .then((data) => {
      elem.src = data;
      resolve();
    })
    .catch(() => {
      console.warn("BB: Image resize failed.");
      resolve();
    });
};

const fetchItemResource = (elem) => {
  return new Promise((resolve, reject) => {
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

const downloadAllImages = (dom) => {
  const imgItems = dom.querySelectorAll("img");
  const imgItemsPromises = [];
  for (var i = 0; i < imgItems.length; i++) {
    const item = imgItems[i];
    imgItemsPromises.push(fetchItemResource(item));
  }

  return Promise.all(imgItemsPromises);
};

const replaceStyleNodes = (clone, styleSheet, cssTextContent, styleId) => {
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
          const head = clone.querySelector("head");
          var styleNode = window.document.createElement("style");
          head.appendChild(styleNode);
          styleNode.type = "text/css";
          if (styleNode.styleSheet) {
            styleNode.styleSheet.cssText = cssTextContent;
          } else {
            styleNode.appendChild(
              window.document.createTextNode(cssTextContent)
            );
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
          cloneTargetNode.parentNode.insertBefore(
            replacementNode,
            cloneTargetNode
          );
          cloneTargetNode.remove();
        }
      }
    } catch (exp) {}
  }
};

const getTextContentFromStyleSheet = (styleSheet) => {
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

const downloadAllCSSUrlResources = (clone, remote) => {
  var promises = [];
  for (var i = 0; i < document.styleSheets.length; i++) {
    const styleSheet = document.styleSheets[i];

    // Skip if the stylesheet is meant for print
    if (styleSheet.media && styleSheet.media.mediaText === "print") {
      continue;
    }

    const cssTextContent = getTextContentFromStyleSheet(styleSheet);
    if (styleSheet && styleSheet.ownerNode) {
      if (cssTextContent != "") {
        // Resolve resources.
        const baseTags = document.getElementsByTagName("base");
        var basePathURL = baseTags.length
          ? baseTags[0].href.substr(location.origin.length, 999)
          : window.location.href.split(/[?#]/)[0];

        if (styleSheet.href) {
          basePathURL = styleSheet.href;
        }

        const basePath = basePathURL.substring(0, basePathURL.lastIndexOf("/"));

        promises.push(
          loadCSSUrlResources(cssTextContent, basePath, remote).then(
            (replacedStyle) => {
              return {
                styletext: replacedStyle,
                stylesheet: styleSheet,
                styleId: styleSheet.ownerNode.getAttribute("bb-styleid"),
              };
            }
          )
        );
      } else {
        promises.push(
          Promise.resolve({
            styletext: cssTextContent,
            stylesheet: styleSheet,
            styleId: styleSheet.ownerNode.getAttribute("bb-styleid"),
          })
        );
      }
    }
  }

  return Promise.all(promises).then((results) => {
    if (results) {
      for (var i = 0; i < results.length; i++) {
        replaceStyleNodes(
          clone,
          results[i].stylesheet,
          results[i].styletext,
          results[i].styleId
        );
      }
    }
    return true;
  });
};

const prepareRemoteData = (clone, remote) => {
  return new Promise((resolve, reject) => {
    if (remote) {
      // Always download CSS.
      return downloadAllCSSUrlResources(clone, remote)
        .then(() => {
          resolve();
        })
        .catch(() => {
          resolve();
        });
    } else {
      return downloadAllImages(clone)
        .then(() => {
          return downloadAllCSSUrlResources(clone, remote).then(() => {
            resolve();
          });
        })
        .catch(() => {
          console.warn(
            "Gleap: Failed with resolving local resources. Please contact the Gleap support team."
          );
          resolve();
        });
    }
  });
};

const handleAdoptedStyleSheets = (doc, clone, shadowNodeId) => {
  if (typeof doc.adoptedStyleSheets !== "undefined") {
    for (let i = 0; i < doc.adoptedStyleSheets.length; i++) {
      const styleSheet = doc.adoptedStyleSheets[i];
      const cssTextContent = getTextContentFromStyleSheet(styleSheet);

      var shadowStyleNode = window.document.createElement("style");
      shadowStyleNode.type = "text/css";
      if (shadowStyleNode.styleSheet) {
        shadowStyleNode.styleSheet.cssText = cssTextContent;
      } else {
        shadowStyleNode.appendChild(
          window.document.createTextNode(cssTextContent)
        );
      }

      if (shadowNodeId) {
        shadowStyleNode.setAttribute("bb-shadow-child", shadowNodeId);
      }

      clone.insertBefore(shadowStyleNode, clone.firstElementChild);
    }
  }
};

const extractFinalCSSState = (element) => {
  if (element && typeof element.getAnimations === "function") {
    const animations = element.getAnimations();
    const finalCSSState = {};

    animations.forEach((animation) => {
      const keyframes = animation.effect?.getKeyframes() || [];
      const finalKeyframe = keyframes[keyframes.length - 1] || {};

      // Extract only the keys (CSS properties) from the final keyframe
      Object.keys(finalKeyframe).forEach((property) => {
        if (property !== "offset") {
          // Store the computed style for each animated property
          finalCSSState[property] = getComputedStyle(element)[property];
        }
      });
    });

    if (Object.keys(finalCSSState).length === 0) {
      return null;
    }

    return JSON.stringify(finalCSSState);
  }

  return null;
};

const deepClone = async (host) => {
  let shadowNodeId = 1;

  const cloneNode = async (node, parent, shadowRoot) => {
    const walkTree = async (nextn, nextp, innerShadowRoot) => {
      while (nextn) {
        await cloneNode(nextn, nextp, innerShadowRoot);

        // Fix missing element nodes.
        if (
          nextn.nextElementSibling &&
          nextn.nextElementSibling.nextSibling === nextn.nextSibling
        ) {
          nextn = nextn.nextElementSibling;
        } else {
          nextn = nextn.nextSibling;
        }
      }
    };

    const clone = node.cloneNode();

    const webAnimations = extractFinalCSSState(node);
    if (webAnimations != null) {
      clone.setAttribute("bb-web-animations", webAnimations);
    }

    if (typeof clone.setAttribute !== "undefined") {
      if (shadowRoot) {
        clone.setAttribute("bb-shadow-child", shadowRoot);
      }

      if (node instanceof HTMLCanvasElement) {
        try {
          const boundingRect = node.getBoundingClientRect();
          const resizedImage = await resizeImage(node.toDataURL(), 1400, 1400);

          clone.setAttribute("bb-canvas-data", resizedImage);
          clone.setAttribute("bb-canvas-height", boundingRect.height);
          clone.setAttribute("bb-canvas-width", boundingRect.width);
        } catch (exp) {
          console.warn("Gleap: Failed to clone canvas data.", exp);
        }
      }
    }

    if (node.nodeType == Node.ELEMENT_NODE) {
      const tagName = node.tagName ? node.tagName.toUpperCase() : node.tagName;
      if (
        tagName == "IFRAME" ||
        tagName == "VIDEO" ||
        tagName == "EMBED" ||
        tagName == "IMG" ||
        tagName == "SVG"
      ) {
        const boundingRect = node.getBoundingClientRect();
        clone.setAttribute("bb-element", true);
        clone.setAttribute("bb-height", boundingRect.height);
        clone.setAttribute("bb-width", boundingRect.width);
      }

      if (node.scrollTop > 0 || node.scrollLeft > 0) {
        clone.setAttribute("bb-scrollpos", true);
        clone.setAttribute("bb-scrolltop", node.scrollTop);
        clone.setAttribute("bb-scrollleft", node.scrollLeft);
      }

      if (
        tagName === "SELECT" ||
        tagName === "TEXTAREA" ||
        tagName === "INPUT"
      ) {
        var val = node.value;
        if (
          node.getAttribute("gleap-ignore") === "value" ||
          node.classList.contains("gl-mask")
        ) {
          val = new Array(val.length + 1).join("*");
        }

        clone.setAttribute("bb-data-value", val);
        if (
          (node.type === "checkbox" || node.type === "radio") &&
          node.checked
        ) {
          clone.setAttribute("bb-data-checked", true);
        }
      }
    }

    parent.appendChild(clone);

    if (node.shadowRoot) {
      var rootShadowNodeId = shadowNodeId;
      shadowNodeId++;
      await walkTree(node.shadowRoot.firstChild, clone, rootShadowNodeId);
      handleAdoptedStyleSheets(node.shadowRoot, clone, rootShadowNodeId);

      if (typeof clone.setAttribute !== "undefined") {
        clone.setAttribute("bb-shadow-parent", rootShadowNodeId);
      }
    }

    await walkTree(node.firstChild, clone);
  };

  const fragment = document.createDocumentFragment();
  await cloneNode(host, fragment);

  // Work on adopted stylesheets.
  var clonedHead = fragment.querySelector("head");
  if (!clonedHead) {
    clonedHead = fragment;
  }
  handleAdoptedStyleSheets(window.document, clonedHead);

  return fragment;
};

const prepareScreenshotData = (remote) => {
  return new Promise(async (resolve, reject) => {
    const styleTags = window.document.querySelectorAll("style, link");
    for (var i = 0; i < styleTags.length; ++i) {
      styleTags[i].setAttribute("bb-styleid", i);
    }

    const clone = await deepClone(window.document.documentElement);

    // Fix for web imports (depracted).
    const linkImportElems = clone.querySelectorAll("link[rel=import]");
    for (var i = 0; i < linkImportElems.length; ++i) {
      const referenceNode = linkImportElems[i];
      if (
        referenceNode &&
        referenceNode.childNodes &&
        referenceNode.childNodes.length > 0
      ) {
        const childNodes = referenceNode.childNodes;
        while (childNodes.length > 0) {
          referenceNode.parentNode.insertBefore(childNodes[0], referenceNode);
        }
        referenceNode.remove();
      }
    }

    // Remove all scripts & style
    const scriptElems = clone.querySelectorAll("script, noscript");
    for (var i = 0; i < scriptElems.length; ++i) {
      scriptElems[i].remove();
    }

    // Cleanup base path
    var existingBasePath = "";
    const baseElems = clone.querySelectorAll("base");
    for (var i = 0; i < baseElems.length; ++i) {
      if (baseElems[i].href) {
        existingBasePath = baseElems[i].href;
      }
      baseElems[i].remove();
    }

    // Adjust the base node
    const baseUrl = window.location.href.substring(
      0,
      window.location.href.lastIndexOf("/")
    );
    var newBaseUrl = baseUrl + "/";
    if (existingBasePath) {
      if (existingBasePath.startsWith("http")) {
        // Absolute path.
        newBaseUrl = existingBasePath;
      } else {
        // Relative path.
        newBaseUrl = baseUrl + existingBasePath;
        if (!newBaseUrl.endsWith("/")) {
          newBaseUrl += "/";
        }
      }
    }

    const baseNode = window.document.createElement("base");
    baseNode.href = newBaseUrl;
    const head = clone.querySelector("head");
    head.insertBefore(baseNode, head.firstChild);

    // Do further cleanup.
    const dialogElems = clone.querySelectorAll(
      ".bb-feedback-dialog-container, .bb-capture-editor-borderlayer"
    );
    for (var i = 0; i < dialogElems.length; ++i) {
      dialogElems[i].remove();
    }

    // Calculate heights
    const bbElems = clone.querySelectorAll("[bb-element=true]");
    for (var i = 0; i < bbElems.length; ++i) {
      if (bbElems[i]) {
        bbElems[i].style.height = bbElems[i].getAttribute("bb-height") + "px";
      }
    }

    prepareRemoteData(clone, remote).then(() => {
      const html = documentToHTML(clone);

      resolve({
        html: html,
        baseUrl: baseUrl,
        width: window.innerWidth,
        height: window.innerHeight,
        isMobile: isMobile(),
      });
    });
  });
};
