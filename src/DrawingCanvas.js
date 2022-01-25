import MarkerManager from "./MarkerManager";
import { translateText } from "./Translation";
import { loadIcon } from "./UI";

export const createScreenshotEditor = function (
  screenshot,
  onDone,
  onCancel,
  overrideLanguage,
  showBack
) {
  var elem = document.createElement("div");
  elem.className = "bb-feedback-dialog-container";
  elem.innerHTML = `<div class='bb-feedback-dialog bb-feedback-dialog-drawing bb-anim-fadeinright'>
    <div class="bb-feedback-dialog-header bb-feedback-dialog-header--back">
      <div class="bb-feedback-dialog-header-back ${
        !showBack && "bb-feedback-dialog-header-back--close"
      }">
        ${loadIcon(showBack ? "arrowleft" : "close", "#fff")}
      </div>
      <div class="bb-feedback-dialog-header-text">
          <div class="bb-feedback-dialog-header-title-small">${translateText(
            "Mark the bug",
            overrideLanguage
          )}</div>
      </div>
      <div class="bb-feedback-dialog-header-next">
        <span>${translateText("Next", overrideLanguage)}</span>
        ${loadIcon("arrowleft", "#000")}
      </div>
    </div>
    <div class="bb-feedback-dialog-body">
        <div class="bb-screenshot-editor-canv">
            <canvas id="bb-screenshot-editor-canvas" />
        </div>
        <div class="bb-drawing-container">
            <div class="bb-drawing-tools">
              <div class="bb-drawing-tool-item bb-drawing-tool-item--active" data-tool="pen">
                ${loadIcon("pen")}
              </div>
              <div class="bb-drawing-tool-item bb-drawing-tool-item--last" data-tool="blur">
                ${loadIcon("blur")}
              </div>
              <div class="bb-drawing-tool-spacer"></div>
              <div id="bb-drawing-color" style="background-color: #EB144C">
                <div id="bb-drawing-colorpopup">
                  <div class="bb-drawing-coloritem bb-drawing-coloritem--active" data-color="#EB144C"></div>
                  <div class="bb-drawing-coloritem" data-color="#FF6705"></div>
                  <div class="bb-drawing-coloritem" data-color="#FDB903"></div>
                  <div class="bb-drawing-coloritem" data-color="#9900EE"></div>
                  <div class="bb-drawing-coloritem" data-color="#00D082"></div>
                  <div class="bb-drawing-coloritem" data-color="#0A93E4"></div>
                </div>
              </div>
              <div class="bb-drawing-tool-spacer"></div>
              <div class="bb-drawing-tool-action bb-drawing-tool-action--disabled bb-drawing-tool-back">
                ${loadIcon("undo")}
              </div>
            </div>
        </div>
    </div>
</div>`;
  document.body.appendChild(elem);

  setTimeout(function () {
    const drawingDialog = document.querySelector(".bb-feedback-dialog-drawing");
    if (drawingDialog) {
      drawingDialog.classList.remove("bb-anim-fadeinright");
    }
  }, 500);

  const drawBack = document.querySelector(".bb-drawing-tool-back");
  const canvas = document.getElementById("bb-screenshot-editor-canvas");
  const ctx = canvas.getContext("2d");
  var currentColor = "#EB144C";
  var currentTool = "pen";
  var baseImage = null;
  var drawingStack = [];
  var drawingHistory = [];

  function getCanvasScale() {
    return canvas.width / canvas.offsetWidth;
  }

  function updateDrawingTools() {
    const scale = getCanvasScale();
    if (currentTool === "pen") {
      ctx.lineWidth = 8 * scale;
      ctx.strokeStyle = currentColor;
      ctx.lineCap = "round";
    } else {
      ctx.lineWidth = 34 * scale;
      ctx.strokeStyle = "#000";
      ctx.lineCap = "round";
    }
    drawingStack.push({
      t: "t",
      lw: ctx.lineWidth,
      ss: ctx.strokeStyle,
    });
  }

  function validateBackButton() {
    const disabled = "bb-drawing-tool-action--disabled";
    if (drawingHistory.length > 0) {
      drawBack.classList.remove(disabled);
    } else {
      drawBack.classList.add(disabled);
    }
  }

  function drawBackAction() {
    drawingHistory.pop();

    // Redraw base image
    ctx.drawImage(baseImage, 0, 0);

    // Replay
    for (var i = 0; i < drawingHistory.length; i++) {
      const steps = drawingHistory[i];
      for (var j = 0; j < steps.length; j++) {
        const step = steps[j];
        if (step.t === "t") {
          ctx.lineWidth = step.lw;
          ctx.strokeStyle = step.ss;
          ctx.lineCap = "round";
        }
        if (step.t === "m") {
          ctx.beginPath();
          ctx.lineTo(step.x, step.y);
        }
        if (step.t === "l") {
          ctx.lineTo(step.x, step.y);
          ctx.stroke();
        }
      }
    }

    // Reset tools to current
    updateDrawingTools();

    // Update back button
    validateBackButton();
  }

  const resizeCanvas = function () {
    // Calculate canvas scale.
    const vw = Math.max(
      document.documentElement.clientWidth || 0,
      window.innerWidth || 0
    );
    const vh = Math.max(
      document.documentElement.clientHeight || 0,
      window.innerHeight || 0
    );

    var ratio = 0;
    var maxWidth = Math.min(vw - 60, 700);
    var maxHeight = Math.min(vh - 200, 700);

    var width = canvas.width;
    var height = canvas.height;

    if (width > maxWidth) {
      ratio = maxWidth / width;
      height = height * ratio;
      width = width * ratio;
    }

    if (height > maxHeight) {
      ratio = maxHeight / height;
      width = width * ratio;
      height = height * ratio;
    }

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  };

  drawBack.addEventListener("click", function () {
    drawBackAction();
  });

  const backButton = document.querySelector(".bb-feedback-dialog-header-back");
  backButton.addEventListener("click", function () {
    window.removeEventListener("resize", resizeCanvas);
    onCancel();
  });
  const nextButton = document.querySelector(".bb-feedback-dialog-header-next");
  nextButton.addEventListener("click", function () {
    window.removeEventListener("resize", resizeCanvas);
    onDone(canvas.toDataURL("image/png"));
  });

  const colorItem = document.getElementById("bb-drawing-color");
  const colorPopup = document.getElementById("bb-drawing-colorpopup");
  colorPopup.style.display = "none";

  colorItem.addEventListener("click", function () {
    if (colorPopup.style.display === "none") {
      colorPopup.style.display = "flex";
    } else {
      colorPopup.style.display = "none";
    }
  });

  // Prepare tools
  const drawingItems = document.querySelectorAll(".bb-drawing-tool-item");
  const selectTool = function (tool) {
    const activeTool = "bb-drawing-tool-item--active";
    for (var i = 0; i < drawingItems.length; i++) {
      const drawingItem = drawingItems[i];
      const drawingItemTool = drawingItem.getAttribute("data-tool");
      if (drawingItemTool === tool) {
        drawingItem.classList.add(activeTool);
      } else {
        drawingItem.classList.remove(activeTool);
      }
    }

    currentTool = tool;
    updateDrawingTools();
  };

  for (var i = 0; i < drawingItems.length; i++) {
    const drawingItem = drawingItems[i];
    const tool = drawingItem.getAttribute("data-tool");
    drawingItem.addEventListener("click", function () {
      selectTool(tool);
    });
  }

  // Prepare drawing color.
  const drawingColorActive = "bb-drawing-coloritem--active";
  const drawingColors = document.querySelectorAll(".bb-drawing-coloritem");
  for (var i = 0; i < drawingColors.length; i++) {
    const drawingColor = drawingColors[i];
    const color = drawingColor.getAttribute("data-color");
    drawingColor.style.backgroundColor = color;
    drawingColor.addEventListener("click", function () {
      for (var j = 0; j < drawingColors.length; j++) {
        drawingColors[j].classList.remove(drawingColorActive);
      }
      currentColor = color;
      MarkerManager.setPenColor(color);
      colorItem.style.backgroundColor = color;
      drawingColor.classList.add(drawingColorActive);
      selectTool("pen");
      updateDrawingTools();
    });
  }

  // Draw screenshot.
  baseImage = new Image();
  baseImage.onload = function () {
    ctx.canvas.width = this.width;
    ctx.canvas.height = this.height;

    resizeCanvas();
    ctx.drawImage(this, 0, 0);
    updateDrawingTools();
  };
  baseImage.src = screenshot;

  window.addEventListener("resize", resizeCanvas);

  var isIdle = true;

  function drawstart(event) {
    const scale = getCanvasScale();
    ctx.beginPath();
    const x = (event.pageX - canvas.offsetLeft) * scale;
    const y = (event.pageY - canvas.offsetTop) * scale;
    ctx.lineTo(x, y);
    drawingStack.push({
      t: "m",
      x: x,
      y: y,
    });
    isIdle = false;
  }

  function drawmove(event) {
    if (isIdle) return;
    const scale = getCanvasScale();
    const x = (event.pageX - canvas.offsetLeft) * scale;
    const y = (event.pageY - canvas.offsetTop) * scale;
    ctx.lineTo(x, y);
    ctx.stroke();
    drawingStack.push({
      t: "l",
      x: x,
      y: y,
    });
  }

  function drawend(event) {
    if (isIdle) return;
    drawmove(event);
    drawingHistory.push(drawingStack);
    drawingStack = [];
    validateBackButton();
    isIdle = true;
  }
  function touchstart(event) {
    drawstart(event.touches[0]);
  }
  function touchmove(event) {
    drawmove(event.touches[0]);
    event.preventDefault();
  }
  function touchend(event) {
    drawend(event.changedTouches[0]);
  }

  canvas.addEventListener("touchstart", touchstart, false);
  canvas.addEventListener("touchmove", touchmove, false);
  canvas.addEventListener("touchend", touchend, false);

  canvas.addEventListener("mousedown", drawstart, false);
  canvas.addEventListener("mousemove", drawmove, false);
  canvas.addEventListener("mouseup", drawend, false);
};
