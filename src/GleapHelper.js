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

export const isMobile = () => {
  if (
    /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(
      navigator.userAgent
    ) ||
    /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
      navigator.userAgent.substr(0, 4)
    )
  ) {
    return true;
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
