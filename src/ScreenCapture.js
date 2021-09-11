import { isMobile, resizeImage } from "./ImageHelper";
import { isBlacklisted } from "./ResourceExclusionList";

export const startScreenCapture = (snapshotPosition, isLiveSite) => {
  return prepareScreenshotData(snapshotPosition, isLiveSite);
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

  html += clone.outerHTML;
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

const loadCSSUrlResources = (data, basePath) => {
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
            resourcePath = basePath + "/" + matchedUrl;
          }

          return fetchCSSResource(resourcePath).then((resourceData) => {
            return resolve("url(" + resourceData + ")");
          });
        } catch (exp) {
          return resolve(matchedData);
        }
      })
  );
};

const fetchLinkItemResource = (elem) => {
  return new Promise((resolve, reject) => {
    var isCSS =
      elem.href.includes(".css") ||
      (elem.rel && elem.rel.includes("stylesheet"));
    if (elem && elem.href && isCSS) {
      if (isBlacklisted(elem.href)) {
        return resolve();
      }

      var basePath = elem.href.substring(0, elem.href.lastIndexOf("/"));
      var xhr = new XMLHttpRequest();
      xhr.onload = function () {
        const styleNode = document.createElement("style");
        styleNode.type = "text/css";
        styleNode.setAttribute("bb-basepath", basePath);
        styleNode.appendChild(document.createTextNode(xhr.responseText));
        elem.parentNode.insertBefore(styleNode, elem.nextSibling);
        elem.remove();
        resolve();
      };
      xhr.onerror = function (err) {
        resolve();
      };
      xhr.open("GET", elem.href);
      xhr.send();
    } else {
      resolve();
    }
  });
};

const downloadAllLinkRefs = (dom) => {
  const linkItems = dom.querySelectorAll("link");
  const linkItemsPromises = [];
  for (var i = 0; i < linkItems.length; i++) {
    const item = linkItems[i];
    linkItemsPromises.push(fetchLinkItemResource(item));
  }

  return Promise.all(linkItemsPromises);
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

const getStyleSheetContentForStyle = (styleElement) => {
  const styleSheets = document.styleSheets;
  if (styleSheets) {
    for (var i = 0; i < styleSheets.length; i++) {
      const styleSheet = styleSheets[i];
      if (
        styleSheet &&
        styleElement &&
        styleSheet.ownerNode &&
        styleElement.getAttribute("bb-styleid") &&
        styleSheet.ownerNode.getAttribute("bb-styleid") &&
        styleElement.getAttribute("bb-styleid") ===
          styleSheet.ownerNode.getAttribute("bb-styleid")
      ) {
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
          styleSheet.ownerNode.removeAttribute("bb-styleid");
          return cssTextContent;
        }
      }
    }
  }

  return styleElement.innerHTML;
};

const downloadAllCSSUrlResources = (clone, remote) => {
  var promises = [];

  const styleTags = clone.querySelectorAll("style");
  for (const style of styleTags) {
    if (style) {
      const stylesheetContent = getStyleSheetContentForStyle(style);
      const basePath = style.getAttribute("bb-basepath");

      if (remote) {
        // No need to resolve nested resources.
        style.innerHTML = stylesheetContent;
      } else {
        promises.push(
          loadCSSUrlResources(stylesheetContent, basePath).then(
            (replacedStyle) => {
              style.innerHTML = replacedStyle;
              return;
            }
          )
        );
      }
    }
  }

  return Promise.all(promises);
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
          return downloadAllLinkRefs(clone).then(() => {
            return downloadAllCSSUrlResources(clone, remote).then(() => {
              resolve();
            });
          });
        })
        .catch(() => {
          console.warn("BB: Failed with resolving local resources. Please contact the Bugbattle support team.")
          resolve();
        });
    }
  });
};

const prepareScreenshotData = (snapshotPosition, remote) => {
  return new Promise((resolve, reject) => {
    const imgElems = window.document.querySelectorAll(
      "iframe, video, embed, img, svg"
    );
    for (var i = 0; i < imgElems.length; ++i) {
      const elem = imgElems[i];
      var height = 0;

      if (elem.style.boxSizing === "border-box") {
        height =
          elem.height +
          elem.marginTop +
          elem.marginBottom +
          elem.bordorTop +
          elem.borderBottom;
      } else {
        height = elem.height;
      }

      elem.setAttribute("bb-element", true);
      elem.setAttribute("bb-height", height);
    }

    // Prepare canvas
    const canvasElems = window.document.querySelectorAll("canvas");
    for (var i = 0; i < canvasElems.length; ++i) {
      canvasElems[i].setAttribute("bb-canvas-data", canvasElems[i].toDataURL());
    }

    const styleTags = window.document.querySelectorAll("style");
    for (var i = 0; i < styleTags.length; ++i) {
      styleTags[i].setAttribute("bb-styleid", i);
    }

    const divElems = window.document.querySelectorAll("div");
    for (var i = 0; i < divElems.length; ++i) {
      const elem = divElems[i];
      if (elem.scrollTop > 0 || elem.scrollLeft > 0) {
        elem.setAttribute("bb-scrollpos", true);
        elem.setAttribute("bb-scrolltop", elem.scrollTop);
        elem.setAttribute("bb-scrollleft", elem.scrollLeft);
      }
    }

    const clone = window.document.documentElement.cloneNode(true);

    // Fix for web imports (depracted).
    const linkImportElems = clone.querySelectorAll("link[rel=import]");
    for (var i = 0; i < linkImportElems.length; ++i) {
      const referenceNode = linkImportElems[i];
      if (referenceNode && referenceNode.childNodes && referenceNode.childNodes.length > 0) {
        const childNodes = referenceNode.childNodes;
        while (childNodes.length > 0) {
          referenceNode.parentNode.insertBefore(childNodes[0], referenceNode);
        }
        referenceNode.remove();
      }
    }
    
    // Copy values
    const selectElems = clone.querySelectorAll("select, textarea, input");
    for (var i = 0; i < selectElems.length; ++i) {
      const elem = selectElems[i];
      const tagName = elem.tagName ? elem.tagName.toUpperCase() : elem.tagName;
      if (
        tagName === "SELECT" ||
        tagName === "TEXTAREA" ||
        tagName === "INPUT"
      ) {
        elem.setAttribute("bb-data-value", elem.value);
        if (elem.type === "checkbox" || elem.type === "radio") {
          if (elem.checked) {
            elem.setAttribute("bb-data-checked", true);
          }
        }
      }
    }

    // Cleanup
    const allElems = window.document.querySelectorAll("*");
    for (var i = 0; i < allElems.length; ++i) {
      const elem = allElems[i];
      elem.removeAttribute("bb-element");
      elem.removeAttribute("bb-height");
      elem.removeAttribute("bb-canvas-data");
    }

    // Remove all scripts
    const scriptElems = clone.querySelectorAll("script, noscript");
    for (var i = 0; i < scriptElems.length; ++i) {
      scriptElems[i].remove();
    }
    
    // Cleanup base path
    const baseElems = clone.querySelectorAll("base");
    for (var i = 0; i < baseElems.length; ++i) {
      baseElems[i].remove();
    }

    // Fix base node
    const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/')) + "/";
    const baseNode = window.document.createElement("base");
    baseNode.href = baseUrl;
    const head = clone.querySelector("head");
    head.insertBefore(baseNode, head.firstChild);

    // Do further cleanup.
    const dialogElems = clone.querySelectorAll(
      ".bb-feedback-dialog-container, .bb-screenshot-editor-borderlayer"
    );
    for (var i = 0; i < dialogElems.length; ++i) {
      dialogElems[i].remove();
    }

    // Calculate heights
    const bbElems = clone.querySelectorAll("[bb-element=true]");
    for (var i = 0; i < bbElems.length; ++i) {
      bbElems[i].style.height = bbElems[i].getAttribute("bb-height");
    }
    
    prepareRemoteData(clone, remote).then(() => {
      const html = documentToHTML(clone);

      resolve({
        html: html,
        baseUrl: baseUrl,
        x: snapshotPosition.x,
        y: snapshotPosition.y,
        width: window.innerWidth,
        height: window.innerHeight,
        isMobile: isMobile(),
      });
    });
  });
};
