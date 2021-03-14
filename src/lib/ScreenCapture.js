import $ from "jquery";
import html2canvas from "html2canvas";
import BugBattle from "./BugBattle";

export const startScreenCapture = (mainColor, snapshotPosition) => {
  return checkOnlineStatus(window.location.origin).then((status) => {
    if (status && status.up) {
      return prepareRemoteScreenshot(snapshotPosition);
    } else {
      return prepareHTML2canvas(mainColor, snapshotPosition);
    }
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
    xhr.send(null);
  });
};

const prepareHTML2canvas = (mainColor, snapshotPosition) => {
  return html2canvas(document.body, {
    x: snapshotPosition.x,
    y: snapshotPosition.y,
    width: window.innerWidth,
    height: window.innerHeight,
    letterRendering: 1,
    allowTaint: true,
    useCORS: false,
    logging: false,
    scale: window.devicePixelRatio,
    imageTimeout: 10000,
    proxy: "https://jsproxy.bugbattle.io/",
  }).then(function (canvas) {
    if (canvas) {
      return prepareScreenshot(canvas.toDataURL(), mainColor);
    } else {
      return Promise.reject();
    }
  });
};

const prepareScreenshot = (screenshot, mainColor) => {
  return new Promise((resolve, reject) => {
    const imageObj = new Image();
    imageObj.onload = function () {
      const pixelRatio = window.devicePixelRatio;
      const canvas = document.createElement("canvas");

      canvas.width = this.width;
      canvas.height = this.height;
      const context = canvas.getContext("2d");

      // Draw image
      context.drawImage(imageObj, 0, 0, this.width, this.height);

      // Draw markers
      const editorDot = document.querySelector(
        ".bugbattle-screenshot-editor-dot"
      );
      const editorRectangle = document.querySelector(
        ".bugbattle-screenshot-editor-rectangle"
      );

      if (editorDot && editorRectangle) {
        context.beginPath();
        context.arc(
          (editorDot.offsetLeft -
            document.documentElement.scrollLeft +
            editorDot.offsetWidth / 2) *
            pixelRatio,
          (editorDot.offsetTop -
            document.documentElement.scrollTop +
            editorDot.offsetHeight / 2) *
            pixelRatio,
          6 * pixelRatio,
          0,
          2 * Math.PI,
          false
        );
        context.fillStyle = mainColor;
        context.fill();
        context.closePath();

        context.lineWidth = 3 * pixelRatio;
        context.strokeStyle = mainColor;
        context.stroke();
        if (editorRectangle.offsetTop > 0 || editorRectangle.offsetLeft) {
          context.strokeRect(
            (editorRectangle.offsetLeft - document.documentElement.scrollLeft) *
              pixelRatio,
            (editorRectangle.offsetTop - document.documentElement.scrollTop) *
              pixelRatio,
            editorRectangle.offsetWidth * pixelRatio,
            editorRectangle.offsetHeight * pixelRatio
          );
        }
      }

      uploadScreenshot(canvas.toDataURL("image/jpeg", 0.5))
        .then((fileUrl) => {
          resolve({
            fileUrl: fileUrl,
          });
        })
        .catch((err) => {
          reject(err);
        });
    };
    imageObj.onerror = function () {
      reject();
    };
    imageObj.src = screenshot;
  });
};

const uploadScreenshot = (screenshot) => {
  return new Promise((resolve, reject) => {
    const http = new XMLHttpRequest();
    http.open("POST", BugBattle.instance.apiUrl + "/uploads/sdk");
    http.setRequestHeader("Api-Token", BugBattle.instance.sdkKey);
    http.onreadystatechange = function (e) {
      if (http.readyState === XMLHttpRequest.DONE) {
        try {
          const response = JSON.parse(http.responseText);
          console.log(response);
          if (response && response.fileUrl) {
            resolve(response.fileUrl);
          } else {
            reject();
          }
        } catch (e) {
          reject(e);
        }
      }
    };

    const file = dataURItoBlob(screenshot);
    const formData = new FormData();
    formData.append("file", file, "screenshot.jpg");
    http.send(formData);
  });
};

const dataURItoBlob = (dataURI) => {
  var byteString = atob(dataURI.split(",")[1]);
  var mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];
  var ab = new ArrayBuffer(byteString.length);
  var ia = new Uint8Array(ab);
  for (var i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  var blob = new Blob([ab], { type: mimeString });
  return blob;
};

const prepareRemoteScreenshot = (snapshotPosition) => {
  return new Promise((resolve, reject) => {
    $(document)
      .find("iframe, video, embed")
      .each(function () {
        var width = $(this).width();
        var height = $(this).height();

        $(this).attr("bugbattle-element", true);
        $(this).attr("bugbattle-width", width);
        $(this).attr("bugbattle-height", height);
      });

    let clone = $(document.documentElement).clone(true, true);

    // Cleanup
    $(document)
      .find("[bugbattle-element=true]")
      .each(function () {
        $(this).attr("bugbattle-element", null);
        $(this).attr("bugbattle-width", null);
        $(this).attr("bugbattle-height", null);
      });

    clone.find("script, noscript").remove();

    // Cleanup base path
    clone.remove("base");
    clone.find("head").append('<base href="' + window.location.origin + '">');

    clone.find(".bugbattle--feedback-dialog-container").remove();
    clone.find(".bugbattle-screenshot-editor-borderlayer").remove();

    clone.find("[bugbattle-element=true]").each(function () {
      $(this).css("width", $(this).attr("bugbattle-width"));
      $(this).css("height", $(this).attr("bugbattle-height"));
    });

    var node = document.doctype;
    var html =
      "<!DOCTYPE " +
      node.name +
      (node.publicId ? ' PUBLIC "' + node.publicId + '"' : "") +
      (!node.publicId && node.systemId ? " SYSTEM" : "") +
      (node.systemId ? ' "' + node.systemId + '"' : "") +
      ">";

    html += clone.prop("outerHTML");

    var isMobile = false;
    if (
      /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(
        navigator.userAgent
      ) ||
      /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
        navigator.userAgent.substr(0, 4)
      )
    ) {
      isMobile = true;
    }

    resolve({
      html: html,
      baseUrl: window.location.origin,
      x: snapshotPosition.x,
      y: snapshotPosition.y,
      width: window.innerWidth,
      height: window.innerHeight,
      isMobile: isMobile
    });
  });
};
