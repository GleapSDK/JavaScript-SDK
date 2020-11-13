import "./css/App.css";
import html2canvas from "html2canvas";

class BugBattle {
  apiUrl = "https://api.bugbattle.io";
  sdkKey = null;
  activation = "";
  screenshot = null;
  screenshotURL = "";
  actionLog = [];
  customData = {};
  sessionStart = new Date();
  description = "";
  email = "";
  severity = "LOW";
  appVersionCode = "";
  appBuildNumber = "";

  // Activation methods
  static SHAKE = "SHAKE_GESTURE";
  static FEEDBACK_BUTTON = "FEEDBACK_BUTTON";
  static NONE = "NONE";

  constructor(sdkKey, activation) {
    this.sdkKey = sdkKey;
    this.activation = activation;

    this.init();
  }

  /**
   * Sets the app version code.
   * @param {*} appVersionCode
   */
  setAppVersionCode(appVersionCode) {
    this.appVersionCode = appVersionCode;
  }

  /**
   * Sets the app version code.
   * @param {*} appVersionCode
   */
  setAppBuildNumber(appBuildNumber) {
    this.appBuildNumber = appBuildNumber;
  }

  /**
   * Set custom data that will be attached to the bug-report.
   * @param {*} data
   */
  setCustomData(data) {
    this.customData = data;
  }

  /**
   * Sets a custom color (HEX-String i.e. #086EFB) as new main color scheme.
   * @param {string} color
   */
  setMainColor(color) {
    let colorStyleSheet =
      ".bugbattle--feedback-button { background-color: " +
      color +
      "; } .bugbattle--feedback-dialog-header { background-color: " +
      color +
      "; } .bugbattle--toggle { border: 1px solid " +
      color +
      "; color: " +
      color +
      "; } .bugbattle--toggle label:before { background: " +
      color +
      "; } .bugbattle--toggle label:not(:last-child) { border-right: 1px solid " +
      color +
      "; }";
    let node = document.createElement("style");
    node.innerHTML = colorStyleSheet;
    document.body.appendChild(node);
  }

  overwriteConsoleLog() {
    window.console = (function (origConsole) {
      if (!window.console || !origConsole) {
        origConsole = {};
      }

      let logArray = [];

      return {
        log: function () {
          this.addLog(arguments, "logs");
          origConsole.log && origConsole.log.apply(origConsole, arguments);
        },
        warn: function () {
          this.addLog(arguments, "errors");
          origConsole.warn && origConsole.warn.apply(origConsole, arguments);
        },
        error: function () {
          this.addLog(arguments, "warns");
          origConsole.error && origConsole.error.apply(origConsole, arguments);
        },
        info: function (v) {
          this.addLog(arguments, "infos");
          origConsole.info && origConsole.info.apply(origConsole, arguments);
        },
        addLog: function (args, type) {
          let log = args[0];
          if (!log) {
            return;
          }

          logArray.push({
            log: log,
            date: new Date(),
            type: type,
          });
        },
        logArray: function () {
          return logArray;
        },
      };
    })(window.console);
  }

  reportBug() {
    let feedbackBtn = document.querySelector(".bugbattle--feedback-button");
    if (feedbackBtn) {
      feedbackBtn.style.display = "none";
    }
    html2canvas(document.body).then((img) => {
      this.screenshot = img.toDataURL();
      if (feedbackBtn) {
        feedbackBtn.style.display = "block";
      }
      this.createBugReportingDialog();
    });
  }

  createBugReportingDialog() {
    var elem = document.createElement("div");
    elem.className = "bugbattle--feedback-dialog-container";
    elem.innerHTML = `<div class='bugbattle--feedback-dialog'>
      <div class="bugbattle--feedback-dialog-header">
        <div class="bugbattle--feedback-dialog-header-button bugbattle--feedback-dialog-header-button-cancel">Cancel</div>
        <div class="bugbattle--feedback-dialog-header-title">Report a bug</div>
        <div class="bugbattle--feedback-dialog-header-button bugbattle--feedback-dialog-header-button-send">Send</div>
      </div>
      <div class="bugbattle--feedback-dialog-loading">
        <div class="bugbattle-spinner">
          <div class="bugbattle-double-bounce1"></div>
          <div class="bugbattle-double-bounce2"></div>
        </div>
      </div>
      <div class="bugbattle--feedback-dialog-success">
        <svg fill="#E60000" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" x="0px" y="0px"><title>07- love</title><path d="M22,4a8,8,0,0,0-5.66,2.34q-.18.18-.33.36s0,0,0,0,0,0,0,0-.21-.24-.33-.36A8,8,0,0,0,4.34,17.66q.18.18.36.33h0l9.9,9.9a2,2,0,0,0,2.83,0l9.9-9.9h0q.18-.15.36-.33A8,8,0,0,0,22,4Z"></path></svg>
        <div class="bugbattle--feedback-dialog-info-text">Thank you for your report!</div>
      </div>
      <div class="bugbattle--feedback-dialog-body">
        <div class="bugbattle--feedback-inputgroup">
          <input class="bugbattle--feedback-email" type="text" placeholder="Email" />
        </div>
        <div class="bugbattle--feedback-inputgroup">
          <textarea class="bugbattle--feedback-description" placeholder="What went wrong?"></textarea>
        </div>
        <div class="bugbattle--feedback-inputgroup">
          <div class="bugbattle-feedback-importance">How important is this to you?</div>
          <div class="bugbattle--toggle">
            <input type="radio" name="bugbattle--bug-severity" value="LOW" id="low" />
            <label for="low">
                LOW
            </label>
            <input type="radio" name="bugbattle--bug-severity" value="MEDIUM" id="medium" checked />
            <label for="medium">
                MEDIUM
            </label>
            <input type="radio" name="bugbattle--bug-severity" value="HIGH" id="high" />
            <label for="high">
                HIGH
            </label>
          </div>
        </div>
        <div class="bugbattle--feedback-image">
          <img src="" />
          <div class="bugbattle--edit-button bugbattle--feedback-dialog-button-edit-screenshot">
            <svg fill="#FFFFFF" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve"><path d="M425.9,125L387,86.1c-13.3-13.2-34.9-13.2-48.1,0L117.3,307.6c-0.4,0.4-0.7,0.7-1,1.1c-0.1,0.1-0.1,0.2-0.2,0.3  c-0.2,0.3-0.5,0.6-0.7,1c-0.1,0.1-0.1,0.2-0.2,0.3c-0.2,0.3-0.4,0.6-0.5,1c-0.1,0.1-0.1,0.3-0.2,0.4c-0.1,0.3-0.3,0.6-0.4,1  c0,0.1-0.1,0.1-0.1,0.2L76.9,417.1c-1.8,5.1-0.5,10.8,3.3,14.6c2.7,2.7,6.3,4.1,9.9,4.1c1.6,0,3.2-0.3,4.7-0.8L199.1,398  c0.1,0,0.1-0.1,0.2-0.1c0.3-0.1,0.6-0.3,1-0.4c0.1-0.1,0.3-0.1,0.4-0.2c0.3-0.2,0.6-0.3,1-0.5c0.1-0.1,0.2-0.1,0.3-0.2  c0.3-0.2,0.6-0.4,0.9-0.7c0.1-0.1,0.2-0.1,0.3-0.2c0.4-0.3,0.8-0.6,1.1-1l184.6-184.6l37-37C439.2,159.8,439.2,138.3,425.9,125z   M113.2,398.8l19.8-55.6l35.8,35.8L113.2,398.8z M194.4,364.9L147,317.6L311.8,153l47.4,47.4L194.4,364.9z M406.1,153.1L379,180.3  l-47.4-47.4l27.1-27c2.3-2.3,6.1-2.3,8.5,0l38.9,38.9c1.5,1.5,1.8,3.3,1.8,4.2C407.9,149.9,407.7,151.6,406.1,153.1z"></path></svg>
          </div>
        </div>
      </div>
    </div>`;
    document.body.appendChild(elem);

    let feedbackImage = document.querySelector(
      ".bugbattle--feedback-image img"
    );
    let sendButton = document.querySelector(
      ".bugbattle--feedback-dialog-header-button-send"
    );
    let cancelButton = document.querySelector(
      ".bugbattle--feedback-dialog-header-button-cancel"
    );
    let editButton = document.querySelector(
      ".bugbattle--feedback-dialog-button-edit-screenshot"
    );
    let emailField = document.querySelector(".bugbattle--feedback-email");
    let textArea = document.querySelector(".bugbattle--feedback-description");

    textArea.oninput = () => {
      textArea.style.height = "inherit";
      textArea.style.height = textArea.scrollHeight + "px";
    };

    editButton.onclick = () => {
      this.initScreenshotEditor();
    };

    cancelButton.onclick = () => {
      this.hide();
    };

    feedbackImage.src = this.screenshot;
    emailField.value = localStorage.getItem("bugbattle-sender-email");

    sendButton.onclick = () => {
      this.email = emailField.value;
      this.description = textArea.value;
      this.severity = document.querySelector(
        "input[name=bugbattle--bug-severity]:checked"
      ).value;

      localStorage.setItem("bugbattle-sender-email", this.email);

      this.toggleLoading(true);

      if (!this.sdkKey) {
        console.log("BUGBATTLE: Please provide a valid API key!");
      }

      this.uploadScreenshot();
    };
  }

  hide() {
    document.querySelector(".bugbattle--feedback-dialog-container").remove();
  }

  init() {
    this.overwriteConsoleLog();

    let self = this;
    if (
      document.readyState === "complete" ||
      document.readyState === "loaded"
    ) {
      self.checkForInitType();
    } else {
      document.addEventListener("DOMContentLoaded", function (event) {
        self.checkForInitType();
      });
    }
  }

  checkForInitType() {
    if (this.activation === BugBattle.SHAKE) {
      // TODO: implement shake gesture on mobile!
    } else if (this.activation === BugBattle.FEEDBACK_BUTTON) {
      this.injectFeedbackButton();
    }
  }

  injectFeedbackButton() {
    var elem = document.createElement("div");
    elem.className = "bugbattle--feedback-button";
    elem.innerHTML = "";
    elem.onclick = () => {
      this.reportBug();
    };
    document.body.appendChild(elem);
  }

  toggleLoading(loading) {
    let sendButton = document.querySelector(
      ".bugbattle--feedback-dialog-header-button-send"
    );
    let cancelButton = document.querySelector(
      ".bugbattle--feedback-dialog-header-button-cancel"
    );
    let body = document.querySelector(".bugbattle--feedback-dialog-body");
    let loader = document.querySelector(".bugbattle--feedback-dialog-loading");
    if (loading) {
      body.style.display = "none";
      loader.style.display = "block";
      sendButton.style.display = "none";
      cancelButton.style.display = "none";
    } else {
      body.style.display = "block";
      loader.style.display = "none";
      sendButton.style.display = "block";
      cancelButton.style.display = "block";
    }
  }

  showSuccessMessage() {
    let success = document.querySelector(".bugbattle--feedback-dialog-success");
    let body = document.querySelector(".bugbattle--feedback-dialog-body");
    let loader = document.querySelector(".bugbattle--feedback-dialog-loading");
    body.style.display = "none";
    loader.style.display = "none";
    success.style.display = "flex";
  }

  dataURItoBlob(dataURI) {
    var byteString = atob(dataURI.split(",")[1]);
    var mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];
    var ab = new ArrayBuffer(byteString.length);
    var ia = new Uint8Array(ab);
    for (var i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    var blob = new Blob([ab], { type: mimeString });
    return blob;
  }

  uploadScreenshot() {
    const http = new XMLHttpRequest();
    http.open("POST", this.apiUrl + "/uploads/sdk");
    http.setRequestHeader("Api-Token", this.sdkKey);
    const self = this;
    http.onreadystatechange = (e) => {
      if (http.readyState == XMLHttpRequest.DONE) {
        try {
          const response = JSON.parse(http.responseText);
          if (response && response.fileUrl) {
            self.screenshotURL = response.fileUrl;
            self.sendBugReportToServer();
          } else {
            this.showError();
          }
        } catch (e) {
          this.showError();
        }
      }
    };

    const file = this.dataURItoBlob(this.screenshot);
    const formData = new FormData();
    formData.append("file", file, "screenshot.jpg");
    http.send(formData);
  }

  sendBugReportToServer() {
    const http = new XMLHttpRequest();
    http.open("POST", this.apiUrl + "/bugs");
    http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    http.setRequestHeader("Api-Token", this.sdkKey);
    http.onreadystatechange = (e) => {
      if (
        http.readyState === XMLHttpRequest.DONE &&
        (http.status === 200 || http.status === 201)
      ) {
        this.showSuccessMessage();
        setTimeout(() => {
          this.hide();
        }, 2000);
      }
    };
    const bugReportData = {
      reportedBy: this.email,
      description: this.description,
      priority: this.severity,
      screenshotUrl: this.screenshotURL,
      customData: this.customData,
      metaData: this.getMetaData(),
    };
    http.send(
      JSON.stringify(bugReportData)
    );
  }

  showError() {
    this.toggleLoading(false);
  }

  getMetaData() {
    var nVer = navigator.appVersion;
    var nAgt = navigator.userAgent;
    var browserName = navigator.appName;
    var fullVersion = "" + parseFloat(navigator.appVersion);
    var majorVersion = parseInt(navigator.appVersion, 10);
    var nameOffset, verOffset, ix;

    // In Opera, the true version is after "Opera" or after "Version"
    if ((verOffset = nAgt.indexOf("Opera")) != -1) {
      browserName = "Opera";
      fullVersion = nAgt.substring(verOffset + 6);
      if ((verOffset = nAgt.indexOf("Version")) != -1)
        fullVersion = nAgt.substring(verOffset + 8);
    }
    // In MSIE, the true version is after "MSIE" in userAgent
    else if ((verOffset = nAgt.indexOf("MSIE")) != -1) {
      browserName = "Microsoft Internet Explorer";
      fullVersion = nAgt.substring(verOffset + 5);
    }
    // In Chrome, the true version is after "Chrome"
    else if ((verOffset = nAgt.indexOf("Chrome")) != -1) {
      browserName = "Chrome";
      fullVersion = nAgt.substring(verOffset + 7);
    }
    // In Safari, the true version is after "Safari" or after "Version"
    else if ((verOffset = nAgt.indexOf("Safari")) != -1) {
      browserName = "Safari";
      fullVersion = nAgt.substring(verOffset + 7);
      if ((verOffset = nAgt.indexOf("Version")) != -1)
        fullVersion = nAgt.substring(verOffset + 8);
    }
    // In Firefox, the true version is after "Firefox"
    else if ((verOffset = nAgt.indexOf("Firefox")) != -1) {
      browserName = "Firefox";
      fullVersion = nAgt.substring(verOffset + 8);
    }
    // In most other browsers, "name/version" is at the end of userAgent
    else if (
      (nameOffset = nAgt.lastIndexOf(" ") + 1) <
      (verOffset = nAgt.lastIndexOf("/"))
    ) {
      browserName = nAgt.substring(nameOffset, verOffset);
      fullVersion = nAgt.substring(verOffset + 1);
      if (browserName.toLowerCase() == browserName.toUpperCase()) {
        browserName = navigator.appName;
      }
    }
    // trim the fullVersion string at semicolon/space if present
    if ((ix = fullVersion.indexOf(";")) != -1)
      fullVersion = fullVersion.substring(0, ix);
    if ((ix = fullVersion.indexOf(" ")) != -1)
      fullVersion = fullVersion.substring(0, ix);

    majorVersion = parseInt("" + fullVersion, 10);
    if (isNaN(majorVersion)) {
      fullVersion = "" + parseFloat(navigator.appVersion);
      majorVersion = parseInt(navigator.appVersion, 10);
    }

    var OSName = "Unknown OS";
    if (navigator.appVersion.indexOf("Win") != -1) OSName = "Windows";
    if (navigator.appVersion.indexOf("Mac") != -1) OSName = "MacOS";
    if (navigator.appVersion.indexOf("X11") != -1) OSName = "UNIX";
    if (navigator.appVersion.indexOf("Linux") != -1) OSName = "Linux";
    if (navigator.appVersion.indexOf("iPad") != -1) OSName = "iPad";
    if (navigator.appVersion.indexOf("iPhone") != -1) OSName = "iPhone";
    if (navigator.appVersion.indexOf("Android") != -1) OSName = "Android";

    let now = new Date();
    let sessionDuration = (now.getTime() - this.sessionStart.getTime()) / 1000;

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
      language: navigator.language || navigator.userLanguage
    };
  }

  initScreenshotEditor() {
    let flag = false;
    let prevX = 0;
    let currX = 0;
    let prevY = 0;
    let currY = 0;
    let dot_flag = true;
    let color = "rgba(237, 68, 61, 0.05)";

    var elem = document.createElement("div");
    elem.className = "bugbattle-screenshot-editor-container";
    elem.innerHTML = `
      <canvas class='bugbattle-screenshot-editor-canvas'></canvas>
      <div drawcolor="rgba(65, 79, 176, 0.05)" class="bugbattle-screenshot-editor-color bugbattle-screenshot-editor-color--blue"></div>
      <div drawcolor="rgba(237, 68, 61, 0.05)" class="bugbattle-screenshot-editor-color bugbattle-screenshot-editor-color--red bugbattle-screenshot-editor-color--selected"></div>
      <div drawcolor="rgba(80, 175, 87, 0.05)" class="bugbattle-screenshot-editor-color bugbattle-screenshot-editor-color--green"></div>
      <div drawcolor="rgba(49, 49, 49, 0.05)" class="bugbattle-screenshot-editor-color bugbattle-screenshot-editor-color--black"></div>
      <div drawcolor="rgba(252, 200, 61, 0.05)" class="bugbattle-screenshot-editor-color bugbattle-screenshot-editor-color--yellow"></div>
      <div drawcolor="rgba(153, 36, 171, 0.05)" class="bugbattle-screenshot-editor-color bugbattle-screenshot-editor-color--pink"></div>
      <div drawcolor="rgba(39, 187, 209, 0.05)" class="bugbattle-screenshot-editor-color bugbattle-screenshot-editor-color--marine"></div>
      <div class="bugbattle-screenshot-editor-done">Done</div>
    `;
    document.body.appendChild(elem);

    let canvas = document.querySelector(".bugbattle-screenshot-editor-canvas");
    let doneButton = document.querySelector(
      ".bugbattle-screenshot-editor-done"
    );
    doneButton.onclick = () => {
      this.screenshot = canvas.toDataURL();
      let feedbackImage = document.querySelector(
        ".bugbattle--feedback-image img"
      );
      feedbackImage.src = this.screenshot;
      elem.remove();
    };

    let colorButtons = document.querySelectorAll(
      ".bugbattle-screenshot-editor-color"
    );
    colorButtons.forEach((colorButton) => {
      colorButton.onclick = () => {
        let newColor = colorButton.getAttribute("drawcolor");
        color = newColor;
        colorButtons.forEach((colorButton) => {
          colorButton.className = colorButton.className.replace(
            "bugbattle-screenshot-editor-color--selected",
            ""
          );
        });
        colorButton.className += " bugbattle-screenshot-editor-color--selected";
      };
    });

    let context = canvas.getContext("2d");

    // Load screenshot
    var imageObj = new Image();
    imageObj.onload = function () {
      var height = document.body.clientHeight;
      var width = document.body.clientWidth;

      canvas.width = width;
      canvas.height = height;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";

      context.drawImage(imageObj, 0, 0, width, height);
    };
    imageObj.src = this.screenshot;

    var clickX = [];
    var clickY = [];
    var clickDrag = [];
    var paint;

    function addClick(x, y, dragging) {
      clickX.push(x);
      clickY.push(y);
      clickDrag.push(dragging);
    }

    function drawNew() {
      context.strokeStyle = color;
      context.lineJoin = "round";
      context.lineWidth = 10;

      var i = clickX.length - 1;
      if (!clickDrag[i]) {
        if (clickX.length == 0) {
          context.beginPath();
          context.moveTo(clickX[i], clickY[i]);
          context.stroke();
        } else {
          context.closePath();

          context.beginPath();
          context.moveTo(clickX[i], clickY[i]);
          context.stroke();
        }
      } else {
        context.lineTo(clickX[i], clickY[i]);
        context.stroke();
      }
    }

    function mouseDownEventHandler(e) {
      paint = true;
      var x = e.pageX - canvas.offsetLeft;
      var y = e.pageY - canvas.offsetTop;
      if (paint) {
        addClick(x, y, false);
        drawNew();
      }
    }

    function touchstartEventHandler(e) {
      paint = true;
      if (paint) {
        addClick(
          e.touches[0].pageX - canvas.offsetLeft,
          e.touches[0].pageY - canvas.offsetTop,
          false
        );
        drawNew();
      }
    }

    function mouseUpEventHandler(e) {
      context.closePath();
      paint = false;
    }

    function mouseMoveEventHandler(e) {
      var x = e.pageX - canvas.offsetLeft;
      var y = e.pageY - canvas.offsetTop;
      if (paint) {
        addClick(x, y, true);
        drawNew();
      }
    }

    function touchMoveEventHandler(e) {
      if (paint) {
        addClick(
          e.touches[0].pageX - canvas.offsetLeft,
          e.touches[0].pageY - canvas.offsetTop,
          true
        );
        drawNew();
      }
    }

    function setUpHandler(isMouseandNotTouch, detectEvent) {
      removeRaceHandlers();
      if (isMouseandNotTouch) {
        canvas.addEventListener("mouseup", mouseUpEventHandler);
        canvas.addEventListener("mousemove", mouseMoveEventHandler);
        canvas.addEventListener("mousedown", mouseDownEventHandler);
        mouseDownEventHandler(detectEvent);
      } else {
        canvas.addEventListener("touchstart", touchstartEventHandler);
        canvas.addEventListener("touchmove", touchMoveEventHandler);
        canvas.addEventListener("touchend", mouseUpEventHandler);
        touchstartEventHandler(detectEvent);
      }
    }

    function mouseWins(e) {
      setUpHandler(true, e);
    }

    function touchWins(e) {
      setUpHandler(false, e);
    }

    function removeRaceHandlers() {
      canvas.removeEventListener("mousedown", mouseWins);
      canvas.removeEventListener("touchstart", touchWins);
    }

    canvas.addEventListener("mousedown", mouseWins);
    canvas.addEventListener("touchstart", touchWins);
  }
}

export default BugBattle;
