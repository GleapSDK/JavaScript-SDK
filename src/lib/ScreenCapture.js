import $ from "jquery";
import { isMobile, resizeImage } from "./ImageHelper";

export const startScreenCapture = (snapshotPosition) => {
  return checkOnlineStatus(window.location.origin).then((status) => {
    if (status && status.up) {
      return prepareScreenshotData(snapshotPosition, true);
    } else {
      return prepareScreenshotData(snapshotPosition, false);
    }
  }).catch(() => {
    return prepareScreenshotData(snapshotPosition, false);
  });
};

const checkOnlineStatus = (url) => {
  return new Promise((resolve, reject) => {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        const status = JSON.parse(xhr.responseText);
        resolve(status);
      }
    };
    xhr.ontimeout = function () {
      reject();
    };
    xhr.onerror = function () {
      reject();
    };
    xhr.open(
      "GET",
      "https://uptime.bugbattle.io/?url=" + encodeURIComponent(url),
      true
    );
    xhr.send();
  });
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

  html += clone.prop("outerHTML");
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
          let resourcePath = matchedUrl;
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

const fetchLinkItemResource = (elem, proxy = false) => {
  return new Promise((resolve, reject) => {
    var isCSS =
      elem.href.includes(".css") ||
      (elem.rel && elem.rel.includes("stylesheet"));
    if (elem && elem.href && isCSS) {
      var basePath = elem.href.substring(0, elem.href.lastIndexOf("/"));
      var xhr = new XMLHttpRequest();
      xhr.onload = function () {
        $(
          '<style type="text/css" bb-basepath="' +
            basePath +
            '">' +
            xhr.responseText +
            "</style>"
        ).insertAfter(elem);
        elem.remove();
        resolve();
      };
      xhr.onerror = function (err) {
        // Retry with proxy.
        if (proxy === false) {
          fetchLinkItemResource(elem, true)
            .then(() => {
              resolve();
            })
            .catch(() => {
              resolve();
            });
        } else {
          resolve();
        }
      };
      xhr.open("GET", elem.href);
      xhr.send();
    } else {
      resolve();
    }
  });
};

const downloadAllScripts = (dom) => {
  let linkItems = dom.find("link");
  let linkItemsPromises = [];
  for (var i = 0; i < linkItems.length; i++) {
    let item = linkItems[i];
    linkItemsPromises.push(fetchLinkItemResource(item));
  }

  return Promise.all(linkItemsPromises);
};

const fetchCSSResource = (url, proxy = false) => {
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
        // Retry with proxy.
        if (proxy === false) {
          fetchCSSResource(url, true)
            .then(() => {
              resolve();
            })
            .catch(() => {
              resolve();
            });
        } else {
          resolve();
        }
      };
      if (proxy) {
        url = "https://jsproxy.bugbattle.io/?url=" + encodeURIComponent(url);
      }
      xhr.open("GET", url);
      xhr.responseType = "blob";
      xhr.send();
    } else {
      resolve();
    }
  });
};

const fetchItemResource = (elem, proxy = false) => {
  return new Promise((resolve, reject) => {
    if (elem && elem.src) {
      var xhr = new XMLHttpRequest();
      xhr.onload = function () {
        var reader = new FileReader();
        reader.onloadend = function () {
          resizeImage(reader.result, 500, 500)
            .then((data) => {
              elem.src = data;
              resolve();
            })
            .catch(() => {
              reject();
            });
        };
        reader.onerror = function () {
          reject();
        };
        reader.readAsDataURL(xhr.response);
      };
      xhr.onerror = function (err) {
        if (proxy === false) {
          fetchItemResource(elem, true)
            .then(() => {
              resolve();
            })
            .catch(() => {
              resolve();
            });
        } else {
          resolve();
        }
      };
      var url = elem.src;
      if (proxy) {
        url =
          "https://jsproxy.bugbattle.io/?url=" + encodeURIComponent(elem.src);
      }
      xhr.open("GET", url);
      xhr.responseType = "blob";
      xhr.send();
    } else {
      resolve();
    }
  });
};

const downloadAllImages = (dom) => {
  let imgItems = dom.find("img");
  let imgItemsPromises = [];
  for (var i = 0; i < imgItems.length; i++) {
    let item = imgItems[i];
    imgItemsPromises.push(fetchItemResource(item));
  }

  return Promise.all(imgItemsPromises);
};

const downloadAllCSSUrlResources = (clone) => {
  let promises = [];

  let styleTags = clone.find("style");
  for (const style of styleTags) {
    if (style) {
      let basePath = style.getAttribute("bb-basepath");
      promises.push(
        loadCSSUrlResources(style.innerHTML, basePath).then((replacedStyle) => {
          return (style.innerHTML = replacedStyle);
        })
      );
    }
  }

  return Promise.all(promises);
};

const optionallyPrepareRemoteData = (clone, remote) => {
  return new Promise((resolve, reject) => {
    if (remote) {
      resolve();
    } else {
      return downloadAllImages(clone).then(() => {
        return downloadAllScripts(clone).then(() => {
          return downloadAllCSSUrlResources(clone).then(() => {
            resolve();
          });
        });
      });
    }
  });
};

const prepareScreenshotData = (snapshotPosition, remote) => {
  return new Promise((resolve, reject) => {
    $(window.document)
      .find("iframe, video, embed, img, svg")
      .each(function () {
        var height = 0;

        if ($(this).css("box-sizing") === "border-box") {
          height = $(this).outerHeight();
        } else {
          height = $(this).height();
        }

        $(this).attr("bb-element", true);
        $(this).attr("bb-height", height);
      });

    $(window.document)
      .find("div")
      .each(function () {
        let scrollTop = $(this).scrollTop();
        let scrollLeft = $(this).scrollLeft();
        if (scrollTop > 0 || scrollLeft > 0) {
          $(this).attr("bb-scrollpos", true);
          $(this).attr("bb-scrolltop", scrollTop);
          $(this).attr("bb-scrollleft", scrollLeft);
        }
      });

    let clone = $(window.document.documentElement).clone(true, true);

    clone.find("select, textarea, input").each(function () {
      const tagName = $(this).prop("tagName").toUpperCase();
      if (
        tagName === "SELECT" ||
        tagName === "TEXTAREA" ||
        tagName === "INPUT"
      ) {
        $(this).attr("bb-data-value", $(this).val());
        if (
          $(this).prop("type") === "checkbox" ||
          $(this).prop("type") === "radio"
        ) {
          if ($(this).prop("checked") === true) {
            $(this).attr("bb-data-checked", "true");
          }
        }
      }
    });

    // Cleanup
    $(window.document)
      .find("*")
      .each(function () {
        $(this).attr("bb-element", null);
        $(this).attr("bb-height", null);
      });

    clone.find("script, noscript").remove();

    // Cleanup base path
    clone.remove("base");
    clone.find("head").prepend('<base href="' + window.location.origin + '">');

    clone.find(".bugbattle--feedback-dialog-container").remove();
    clone.find(".bugbattle-screenshot-editor-borderlayer").remove();

    clone.find("[bb-element=true]").each(function () {
      $(this).css("height", $(this).attr("bb-height"));
    });

    optionallyPrepareRemoteData(clone, remote).then(() => {
      let html = documentToHTML(clone);

      resolve({
        html: html,
        baseUrl: window.location.origin,
        x: snapshotPosition.x,
        y: snapshotPosition.y,
        width: window.innerWidth,
        height: window.innerHeight,
        isMobile: isMobile(),
      });
    });
  });
};
