import Gleap from "./Gleap";
import { ScreenDrawer } from "./ScreenDrawer";
import { ScrollStopper } from "./ScrollStopper";
import { ScreenRecorder } from "./ScreenRecorder";
import { translateText } from "./Translation";
import { loadIcon } from "./UI";

export default class MarkerManager {
  type = "screenshot";
  dragCursor = null;
  screenRecorder = null;
  callback = null;
  screenDrawer = null;
  overrideLanguage = Gleap.getInstance().overrideLanguage;
  snapshotPosition = {
    x: 0,
    y: 0,
  };

  constructor(type) {
    this.type = type;
  }

  hideWidgetUI() {
    const feedbackButton = document.querySelector(".bb-feedback-button");
    if (feedbackButton) {
      feedbackButton.style.display = "none";
    }

    const dialogUI = document.querySelector(".bb-feedback-dialog-container");
    if (dialogUI) {
      dialogUI.style.display = "none";
    }
  }

  showWidgetUI() {
    if (this.type === "screenshot") {
      ScrollStopper.enableScroll();
    }

    // Cleanup mouse pointer
    this.cleanupMousePointer();

    // Remove the toolbar UI
    const dialog = document.querySelector(".bb-capture-toolbar");
    if (dialog) {
      dialog.remove();
    }

    // Remove the preview UI
    const videoPreviewContainer = document.querySelector(".bb-capture-preview");
    if (videoPreviewContainer) {
      videoPreviewContainer.remove();
    }

    // Feedback button
    const feedbackButton = document.querySelector(".bb-feedback-button");
    if (feedbackButton) {
      feedbackButton.style.display = "flex";
    }

    // Feedback dialog container
    const dialogUI = document.querySelector(".bb-feedback-dialog-container");
    if (dialogUI) {
      dialogUI.style.display = "block";
    }

    // Dismiss button
    const dismissUI = document.querySelector(".bb-capture-dismiss");
    if (dismissUI) {
      dismissUI.style.display = "none";
    }

    // Hide the color picker
    const colorPicker = document.querySelector(
      ".bb-capture-toolbar-item-colorpicker"
    );
    if (colorPicker) {
      colorPicker.style.display = "none";
    }

    // Border layer
    const borderLayer = document.querySelector(
      ".bb-capture-editor-borderlayer"
    );
    if (borderLayer) {
      borderLayer.style.display = "none";
    }
  }

  clear() {
    const captureEditor = document.querySelector(".bb-capture-editor");
    if (captureEditor) {
      captureEditor.remove();
    }
  }

  setMouseMove(x, y) {
    if (!this.dragCursor) {
      return;
    }

    this.dragCursor.style.left = `${x + 6}px`;
    this.dragCursor.style.top = `${y - 26}px`;
    this.dragCursor.style.right = null;
  }

  mouseMoveEventHandler(e) {
    const x = e.pageX - document.documentElement.scrollLeft;
    const y = e.pageY - document.documentElement.scrollTop;
    this.setMouseMove(x, y);
  }

  touchMoveEventHandler(e) {
    const x = e.touches[0].pageX - document.documentElement.scrollLeft;
    const y = e.touches[0].pageY - document.documentElement.scrollTop;
    this.setMouseMove(x, y);
  }

  setupMousePointer() {
    const self = this;
    this.dragCursor = document.querySelector(".bb-capture-editor-drag-info");
    const captureSVG = document.querySelector(".bb-capture-svg");
    captureSVG.addEventListener("mouseenter", (e) => {
      self.dragCursor.style.opacity = 1;
    });

    captureSVG.addEventListener("mouseleave", (e) => {
      self.dragCursor.style.opacity = 0;
    });

    document.documentElement.addEventListener(
      "mousemove",
      this.mouseMoveEventHandler.bind(this)
    );
    document.documentElement.addEventListener(
      "touchmove",
      this.touchMoveEventHandler.bind(this)
    );
  }

  cleanupMousePointer() {
    document.documentElement.removeEventListener(
      "mousemove",
      this.mouseMoveEventHandler
    );
    document.documentElement.removeEventListener(
      "touchmove",
      this.touchMoveEventHandler
    );

    if (this.dragCursor) {
      this.dragCursor.remove();
    }
  }

  createEditorUI() {
    // Add HTML for drawing and recording
    var bugReportingEditor = document.createElement("div");
    bugReportingEditor.className = "bb-capture-editor";
    bugReportingEditor.innerHTML = `
          <div class="bb-capture-editor-borderlayer"></div>
          <svg class="bb-capture-svg" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" xml:space="preserve">
          <div class="bb-capture-mousetool"></div>
          <div class="bb-capture-dismiss">${loadIcon("dismiss")}</div>
          <div class='bb-capture-editor-drag-info'>${loadIcon("pen")}</div>
          <div class="bb-capture-toolbar">
            <div class="bb-capture-toolbar-item-timer bb-capture-item-rec">3:00</div>
            ${
              this.type === "capture"
                ? `<div class="bb-capture-toolbar-item bb-capture-item-rec bb-capture-toolbar-item-recording" data-type="recording" data-active="false">
                ${loadIcon("recorderon")}
                ${loadIcon("recorderoff")}
                <span class="bb-tooltip bb-tooltip-screen-recording"></span>
                </div>
                <div class="bb-capture-toolbar-item bb-capture-item-rec" data-type="mic" data-active="false">
                ${loadIcon("mic")}
                <span class="bb-tooltip bb-tooltip-audio-recording"></span>
                </div>
                <div class="bb-capture-toolbar-spacer bb-capture-item-rec"></div>`
                : ""
            }
            <div class="bb-capture-toolbar-item bb-capture-toolbar-item-tool bb-capture-toolbar-item--active" data-type="pen" data-active="true">
              ${loadIcon("pen")}
            </div>
            <div class="bb-capture-toolbar-item bb-capture-toolbar-item-tool" data-type="rect" data-active="false">
              ${loadIcon("rect")}
            </div>
            <div class="bb-capture-toolbar-item" data-type="colorpicker">
              <div class="bb-capture-toolbar-item-selectedcolor"></div>
            </div>
            ${
              this.type !== "capture"
                ? `<div class="bb-capture-button-next">${translateText(
                    `Next`,
                    this.overrideLanguage
                  )}</div>`
                : ""
            }
          </div>
          <div class="bb-capture-toolbar-item-colorpicker">
            <div class="bb-capture-toolbar-item-color" data-color="#DB4035"></div>
            <div class="bb-capture-toolbar-item-color" data-color="#FAD000"></div>
            <div class="bb-capture-toolbar-item-color" data-color="#7ECC49"></div>
            <div class="bb-capture-toolbar-item-color" data-color="#158FAD"></div>
            <div class="bb-capture-toolbar-item-color" data-color="#4073FF"></div>
            <div class="bb-capture-toolbar-item-color" data-color="#AF38EB"></div>
            <div class="bb-capture-toolbar-item-color" data-color="#CCCCCC"></div>
          </div>
          <div class="bb-capture-preview">
            <div class="bb-capture-preview-inner">
              <video controls muted autoplay></video>
              <div class="bb-capture-preview-buttons">
                <div class="bb-capture-preview-retrybutton">${translateText(
                  `Retry`,
                  this.overrideLanguage
                )}</div>
                <div class="bb-capture-preview-sendbutton">${translateText(
                  `Next`,
                  this.overrideLanguage
                )}</div>
              </div>
            </div>
          </div>
        `;
    Gleap.appendNode(bugReportingEditor);
  }

  showNextStep = function () {
    // Start the screen recording upload (optionally)
    if (this.screenRecorder) {
      this.screenRecorder.stopScreenRecording();
      this.screenRecordingUrl = "uploading";
      this.screenRecorder
        .uploadScreenRecording()
        .then(function (screenRecordingUrl) {
          self.screenRecordingUrl = screenRecordingUrl;
        })
        .catch(function (err) {
          self.screenRecordingUrl = null;
        });
    }

    // Adapt the UI
    this.showWidgetUI();

    if (this.callback) {
      this.callback(true);
    }
  };

  show(callback) {
    this.callback = callback;
    const self = this;

    // Hide widget UI
    this.hideWidgetUI();

    // Create the editor UI
    this.createEditorUI();

    // Setup the mouse pointer
    this.setupMousePointer();

    // Setup screenshot data
    if (this.type === "screenshot") {
      this.snapshotPosition = {
        x: window.scrollX,
        y: window.scrollY,
      };

      // Disable scroll
      ScrollStopper.disableScroll();
    } else {
      // Setup screen recording
      this.setupScreenRecording();
    }

    // Hook up the drawing.
    this.screenDrawer = new ScreenDrawer();

    this.setupColorPicker();
    this.setupToolbar();
  }

  setupColorPicker() {
    const self = this;
    const selectedColor = document.querySelector(
      ".bb-capture-toolbar-item-selectedcolor"
    );
    const colorItems = document.querySelectorAll(
      ".bb-capture-toolbar-item-color"
    );
    for (var i = 0; i < colorItems.length; i++) {
      const colorItem = colorItems[i];
      const hexColor = colorItem.getAttribute("data-color");
      colorItem.style.backgroundColor = hexColor;
      colorItem.onclick = function () {
        if (colorItem) {
          self.screenDrawer.setColor(hexColor);
          selectedColor.style.backgroundColor = colorItem.style.backgroundColor;
          const penTips = document.querySelectorAll(".bb-pen-tip");
          for (var j = 0; j < penTips.length; j++) {
            penTips[j].style.fill = hexColor;
          }
        }
      };
    }
  }

  setupToolbar() {
    const self = this;

    // Hook up dismiss button
    const dismissButton = document.querySelector(".bb-capture-dismiss");
    dismissButton.onclick = function () {
      self.showWidgetUI();

      if (self.callback) {
        self.callback(false);
      }
    };

    // Hook up send button
    const nextButton = document.querySelector(".bb-capture-button-next");
    if (nextButton) {
      nextButton.onclick = this.showNextStep.bind(this);
    }

    const colorpicker = document.querySelector(
      ".bb-capture-toolbar-item-colorpicker"
    );

    // Setup toolbar items
    var toolbarItems = document.querySelectorAll(".bb-capture-toolbar-item");
    for (var i = 0; i < toolbarItems.length; i++) {
      const toolbarItem = toolbarItems[i];
      toolbarItem.onclick = function () {
        const type = toolbarItem.getAttribute("data-type");
        if (colorpicker) {
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
          const toolbarTools = document.querySelectorAll(
            ".bb-capture-toolbar-item-tool"
          );
          for (let j = 0; j < toolbarTools.length; j++) {
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
    }
  }

  captureRenderer() {
    if (!this.screenRecorder) {
      return;
    }

    const nextButton = document.querySelector(".bb-capture-button-next");
    const timerLabel = document.querySelector(".bb-capture-toolbar-item-timer");
    const toolbarItems = document.querySelectorAll(".bb-capture-toolbar-item");
    const screenRecordingTooltip = document.querySelector(
      ".bb-tooltip-screen-recording"
    );
    const audioRecordingTooltip = document.querySelector(
      ".bb-tooltip-audio-recording"
    );

    // Update UI.
    const dialog = document.querySelector(".bb-capture-toolbar");
    const videoPreviewContainer = document.querySelector(".bb-capture-preview");
    videoPreviewContainer.style.display = this.screenRecorder.file
      ? "flex"
      : "none";
    dialog.style.display = !this.screenRecorder.file ? "flex" : "none";

    for (var i = 0; i < toolbarItems.length; i++) {
      const toolbarItem = toolbarItems[i];
      const type = toolbarItem.getAttribute("data-type");
      switch (type) {
        case "mic":
          if (
            this.screenRecorder.audioAvailable &&
            this.screenRecorder.available
          ) {
            toolbarItem.style.opacity = 1;
            if (!this.screenRecorder.audioMuted) {
              toolbarItem.classList.remove(
                "bb-capture-toolbar-item--inactivecross"
              );
              audioRecordingTooltip.innerHTML = translateText(
                "Mute",
                this.overrideLanguage
              );
            } else {
              toolbarItem.style.opacity = 1;
              toolbarItem.classList.add(
                "bb-capture-toolbar-item--inactivecross"
              );
              audioRecordingTooltip.innerHTML = translateText(
                "Unmute",
                this.overrideLanguage
              );
            }
          } else {
            toolbarItem.style.opacity = 0.3;
            toolbarItem.classList.add("bb-capture-toolbar-item--inactivecross");
            audioRecordingTooltip.innerHTML = translateText(
              "Browser not supported",
              this.overrideLanguage
            );
          }
          break;

        case "recording":
          if (this.screenRecorder.available) {
            toolbarItem.style.opacity = 1;
            if (this.screenRecorder.isRecording) {
              toolbarItem.setAttribute("data-active", "true");
              screenRecordingTooltip.innerHTML = translateText(
                "Stop screen recording",
                this.overrideLanguage
              );
              timerLabel.style.display = "block";
            } else {
              toolbarItem.setAttribute("data-active", "false");
              screenRecordingTooltip.innerHTML = translateText(
                "Start screen recording",
                this.overrideLanguage
              );
              timerLabel.style.display = "none";
            }
          } else {
            // Recording is not available.
            toolbarItem.style.opacity = 0.3;
            screenRecordingTooltip.innerHTML = translateText(
              "Browser not supported",
              this.overrideLanguage
            );
          }
          break;

        default:
          break;
      }
    }
  }

  setupScreenRecording() {
    const self = this;

    // Hook preview next button
    const nextButtonPreview = document.querySelector(
      ".bb-capture-preview-sendbutton"
    );
    nextButtonPreview.onclick = this.showNextStep.bind(this);

    // Hook retry button
    const retryButton = document.querySelector(
      ".bb-capture-preview-retrybutton"
    );
    retryButton.onclick = function () {
      self.screenRecorder.clearPreview();
    };

    // Setup screen recorder
    this.screenRecorder = new ScreenRecorder(this.captureRenderer.bind(this));
  }
}
