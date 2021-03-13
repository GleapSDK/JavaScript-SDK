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
          (editorDot.offsetLeft + editorDot.offsetWidth / 2) * pixelRatio,
          (editorDot.offsetTop + editorDot.offsetHeight / 2) * pixelRatio,
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
            editorRectangle.offsetLeft * pixelRatio,
            editorRectangle.offsetTop * pixelRatio,
            editorRectangle.offsetWidth * pixelRatio,
            editorRectangle.offsetHeight * pixelRatio
          );
        }
      }

      uploadScreenshot(canvas.toDataURL("image/jpeg", 0.5))
        .then((fileUrl) => {
          resolve({
            fileUrl: fileUrl
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
    /*$(document)
      .find("img, video, iframe, svg, picture, embed")
      .each(function () {
        var width = $(this).width();
        var height = $(this).height();

        $(this).attr("bugbattle-element", true);
        $(this).attr("bugbattle-width", width);
        $(this).attr("bugbattle-height", height);
      });*/

    let clone = $(document.documentElement).clone();

    // Cleanup
    /*$(document)
      .find("[bugbattle-element=true]")
      .each(function () {
        $(this).attr("bugbattle-element", null);
        $(this).attr("bugbattle-width", null);
        $(this).attr("bugbattle-height", null);
      });*/

    // Cleanup base path
    clone.remove("base");
    clone.find("head").append('<base href="' + window.location.origin + '">');

    clone.find(".bugbattle--feedback-dialog-container").remove();
    clone.find(".bugbattle-screenshot-editor-borderlayer").remove();

    clone.find("[bugbattle-element=true]").each(function () {
      $(this).css("width", $(this).attr("bugbattle-width"));
      $(this).css("height", $(this).attr("bugbattle-height"));
      $(this).css("min-width", $(this).attr("bugbattle-width"));
      $(this).css("min-height", $(this).attr("bugbattle-height"));
    });

    const html = clone.html();

    resolve({
      html: html,
      baseUrl: window.location.origin,
      x: snapshotPosition.x,
      y: snapshotPosition.y,
      width: window.innerWidth,
      height: window.innerHeight,
    });
  });
};
