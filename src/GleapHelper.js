export const resizeImage = (base64Str, maxWidth = 400, maxHeight = 400) => {
  return new Promise((resolve, reject) => {
    var isJPEG = base64Str.indexOf("data:image/jpeg") === 0;
    var img = new Image();
    img.src = base64Str;
    img.onerror = () => {
      reject();
    };
    img.onload = () => {
      var canvas = document.createElement("canvas");
      var MAX_WIDTH = maxWidth;
      var MAX_HEIGHT = maxHeight;

      // Adjust max width / height based on image props
      if (maxWidth > img.width / 1.5) {
        MAX_WIDTH = img.width / 1.5;
      }

      if (maxHeight > img.height / 1.5) {
        MAX_HEIGHT = img.height / 1.5;
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

const MOBILE_UA_REGEX =
  /(android|iphone|ipod|ipad|blackberry|iemobile|opera mini|webos)/i;

export const getDeviceType = () => {
  return isMobile() ? "mobile" : "desktop";
};

export const isMobile = () => {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const nav = typeof navigator !== "undefined" ? navigator : undefined;

    if (
      nav?.userAgentData &&
      typeof nav.userAgentData.mobile === "boolean" &&
      nav.userAgentData.mobile !== null
    ) {
      return nav.userAgentData.mobile;
    }

    if (nav && MOBILE_UA_REGEX.test(nav.userAgent || nav.vendor || "")) {
      return true;
    }

    if (nav?.maxTouchPoints > 1 && window.matchMedia) {
      const coarsePointer = window.matchMedia(
        "(hover: none) and (pointer: coarse)"
      );
      if (coarsePointer?.matches) {
        return true;
      }
    }
  } catch (exp) {
    // Swallow errors and treat as desktop fallback.
  }

  return false;
};

export const gleapDataParser = function (data) {
  if (!data) {
    return {};
  }
  if (typeof data === "string" || data instanceof String) {
    try {
      return JSON.parse(data);
    } catch (e) {
      return {};
    }
  }
  return data;
};

export const truncateString = (str, num) => {
  if (str.length > num) {
    return str.slice(0, num) + "...";
  } else {
    return str;
  }
};

const removeSubDomain = (v) => {
  try {
    var parts = v.split(".");
    var is2ndLevelDomain = false;
    const secondLevel = parts[parts.length - 2];
    if (
      secondLevel === "co" ||
      secondLevel === "com" ||
      secondLevel === "gv" ||
      secondLevel === "ac" ||
      secondLevel === "edu" ||
      secondLevel === "gov" ||
      secondLevel === "mil" ||
      secondLevel === "net" ||
      secondLevel === "org"
    ) {
      is2ndLevelDomain = true;
    }
    parts = parts.slice(is2ndLevelDomain ? -3 : -2);
    return parts.join(".");
  } catch (exp) {}
  return v;
};

export const loadFromGleapCache = (key) => {
  try {
    const cachedData = localStorage.getItem(`gleap-widget-${key}`);
    if (cachedData) {
      const config = JSON.parse(cachedData);
      return config;
    }
  } catch (exp) {}
  return null;
};

export const saveToGleapCache = (key, data) => {
  const k = `gleap-widget-${key}`;
  if (data) {
    try {
      localStorage.setItem(k, JSON.stringify(data));
    } catch (exp) {}
  } else {
    localStorage.removeItem(k);
  }
};

export const clearGleapCache = (key) => {
  try {
    const k = `gleap-widget-${key}`;
    localStorage.removeItem(k);
  } catch {}
};

export const setGleapCookie = (name, value, days) => {
  try {
    var expires = "";
    if (days) {
      var date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      expires = "; expires=" + date.toUTCString();
    }
    const host = removeSubDomain(window.location.host.split(":")[0]);
    document.cookie =
      name + "=" + (value || "") + expires + "; path=/; domain=" + host;
  } catch (exp) {}
};

export const getGleapCookie = (name) => {
  try {
    var nameEQ = name + "=";
    var ca = document.cookie.split(";");
    for (var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
  } catch (exp) {}
  return null;
};

export const eraseGleapCookie = (name) => {
  try {
    const host = removeSubDomain(window.location.host.split(":")[0]);
    document.cookie =
      name + "=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Domain=" + host;
  } catch (exp) {}
};

export const getDOMElementDescription = (element, html = true) => {
  var innerText = truncateString(element.innerText || "", 40)
    .replace(/(\r\n|\n|\r)/gm, "")
    .replace(/ +(?= )/g, "");
  var elementId = "";
  var elementClass = "";
  if (typeof element.getAttribute !== "undefined") {
    const elemId = element.getAttribute("id");
    if (elemId) {
      elementId = ` id="${elemId}"`;
    }
    const elemClass = element.getAttribute("class");
    if (elemClass) {
      elementClass = ` class="${elemClass}"`;
    }
  }
  const elementTag = (element.tagName || "").toLowerCase();

  var htmlPre = "<";
  var htmlPost = ">";
  if (!html) {
    htmlPre = "[";
    htmlPost = "]";
  }

  return `${htmlPre}${elementTag}${elementId}${elementClass}${htmlPost}${innerText}${htmlPre}/${elementTag}${htmlPost}`;
};

export const runFunctionWhenDomIsReady = (callback) => {
  if (
    document.readyState === "complete" ||
    document.readyState === "loaded" ||
    document.readyState === "interactive"
  ) {
    callback();
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      callback();
    });
  }
};

export const fixGleapHeight = () => {
  try {
    if (
      "visualViewport" in window &&
      /iPad|iPhone|iPod/.test(navigator.userAgent)
    ) {
      let initialHeight = window.innerHeight;

      function updateContainerHeight() {
        try {
          const gleapFrameContainer = document.querySelector(
            ".gleap-frame-container-inner iframe"
          );

          if (!gleapFrameContainer) {
            return;
          }

          // Check if the keyboard is open
          if (window.visualViewport.height < initialHeight) {
            gleapFrameContainer.style.setProperty(
              "max-height",
              window.visualViewport.height + "px",
              "important"
            );
          } else {
            // Remove the padding bottom
            gleapFrameContainer.style.removeProperty("max-height");
          }
        } catch (error) {}
      }

      function handleOrientationChange() {
        try {
          // Update initial dimensions
          initialHeight = window.innerHeight;
          updateContainerHeight();
        } catch (error) {}
      }

      // Update on resize (keyboard show/hide and viewport resize)
      window.visualViewport.addEventListener("resize", updateContainerHeight);

      // Handle orientation changes
      window.addEventListener("orientationchange", handleOrientationChange);

      // Update initially
      updateContainerHeight();
    }
  } catch (error) {}
};
