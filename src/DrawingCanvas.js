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
  elem.innerHTML = `<div class="bb-feedback-dialog-backdrop"></div><div class='bb-feedback-dialog bb-feedback-dialog-drawing bb-anim-fadeinright'>
    <div class="bb-feedback-dialog-header bb-feedback-dialog-header--back">
      <div class="bb-feedback-dialog-header-back ${
        !showBack && "bb-feedback-dialog-header-back--close"
      }">
        ${loadIcon(showBack ? "arrowleft" : "close", "#192027")}
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
                <svg width="60px" height="60px" viewBox="0 0 60 60" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
                  <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                      <g transform="translate(0.000263, -0.000166)" fill="#000000" fill-rule="nonzero">
                          <path d="M45.5117372,6.58111838e-05 C41.6679372,-0.0115531888 37.9805372,1.51576581 35.2697372,4.23846581 L4.1017372,35.4104658 C1.4650372,38.0315658 -0.0115628024,41.5940658 6.81945382e-05,45.3088658 L6.81945382e-05,59.999935 L14.6911372,59.999935 C18.4059372,60.0115848 21.9684372,58.5350658 24.5895372,55.8982658 L55.7615372,24.7302658 C58.4763372,22.0114658 59.9998372,18.3279658 59.9998372,14.4842658 C59.9959312,10.6444658 58.4686372,6.96086581 55.7537372,4.24226581 C53.0349372,1.52746581 49.3514372,6.58111838e-05 45.5117372,6.58111838e-05 L45.5117372,6.58111838e-05 Z M20.3397372,51.6601658 C18.8397372,53.1562658 16.8085372,53.9999658 14.6913372,53.9999658 L5.9999372,53.9999658 L5.9999372,45.3085658 C5.9999372,43.1874658 6.8397772,41.1523658 8.3397372,39.6483658 L31.8787372,16.1213658 L43.8787372,28.1213658 L20.3397372,51.6601658 Z M51.5117372,20.4881658 L48.1211372,23.8787658 L36.1211372,11.8787658 L39.5117372,8.48816581 C41.0820372,6.80846581 43.2695372,5.83976581 45.5703372,5.80066581 C47.8672372,5.76160381 50.0859372,6.66004581 51.7148372,8.28506581 C53.3398372,9.91396581 54.2382372,12.1327658 54.1992372,14.4295658 C54.1601742,16.7303658 53.1914372,18.9178658 51.5117372,20.4881658 L51.5117372,20.4881658 Z" id="Shape"></path>
                      </g>
                  </g>
                </svg>
              </div>
              <div class="bb-drawing-tool-item bb-drawing-tool-item--last" data-tool="blur">
                <svg width="100pt" height="100pt" version="1.1" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <path d="m86.5 42.5c-1.1016 0-2-0.89844-2-2s0.89844-2 2-2 2 0.89844 2 2-0.89844 2-2 2zm-10 38c-2.1992 0-4-1.8008-4-4s1.8008-4 4-4 4 1.8008 4 4-1.8008 4-4 4zm0-18c-2.1992 0-4-1.8008-4-4s1.8008-4 4-4 4 1.8008 4 4-1.8008 4-4 4zm0-18c-2.1992 0-4-1.8008-4-4s1.8008-4 4-4 4 1.8008 4 4-1.8008 4-4 4zm0-18c-2.1992 0-4-1.8008-4-4s1.8008-4 4-4 4 1.8008 4 4-1.8008 4-4 4zm-27 40c-9.3984 0-17-7.6016-17-17s7.6016-17 17-17 17 7.6016 17 17-7.6016 17-17 17zm9-40c-2.1992 0-4-1.8008-4-4s1.8008-4 4-4 4 1.8008 4 4-1.8008 4-4 4zm0-12c-1.1016 0-2-0.89844-2-2s0.89844-2 2-2 2 0.89844 2 2-0.89844 2-2 2zm-18 12c-2.1992 0-4-1.8008-4-4s1.8008-4 4-4 4 1.8008 4 4-1.8008 4-4 4zm0-12c-1.1016 0-2-0.89844-2-2s0.89844-2 2-2 2 0.89844 2 2-0.89844 2-2 2zm-18 66c-2.1992 0-4-1.8008-4-4s1.8008-4 4-4 4 1.8008 4 4-1.8008 4-4 4zm0-18c-2.1992 0-4-1.8008-4-4s1.8008-4 4-4 4 1.8008 4 4-1.8008 4-4 4zm0-18c-2.1992 0-4-1.8008-4-4s1.8008-4 4-4 4 1.8008 4 4-1.8008 4-4 4zm0-18c-2.1992 0-4-1.8008-4-4s1.8008-4 4-4 4 1.8008 4 4-1.8008 4-4 4zm-10 34c-1.1016 0-2-0.89844-2-2s0.89844-2 2-2 2 0.89844 2 2-0.89844 2-2 2zm0-18c-1.1016 0-2-0.89844-2-2s0.89844-2 2-2 2 0.89844 2 2-0.89844 2-2 2zm28 30c2.1992 0 4 1.8008 4 4s-1.8008 4-4 4-4-1.8008-4-4 1.8008-4 4-4zm0 12c1.1016 0 2 0.89844 2 2s-0.89844 2-2 2-2-0.89844-2-2 0.89844-2 2-2zm18-12c2.1992 0 4 1.8008 4 4s-1.8008 4-4 4-4-1.8008-4-4 1.8008-4 4-4zm0 12c1.1016 0 2 0.89844 2 2s-0.89844 2-2 2-2-0.89844-2-2 0.89844-2 2-2zm28-28c1.1016 0 2 0.89844 2 2s-0.89844 2-2 2-2-0.89844-2-2 0.89844-2 2-2z" fill-rule="evenodd"/>
                </svg>
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
                <svg width="62px" height="60px" viewBox="0 0 62 60" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
                  <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                    <g transform="translate(-0.000500, 0.001926)" fill="#000000" fill-rule="nonzero">
                      <path d="M28.0005,51.6270739 C24.9653,51.0684839 22.0825,49.8731739 19.5396,48.1192739 L13.8208,53.8380739 C17.9536,57.0060739 22.8403,59.0333739 28.0008,59.7286739 L28.0005,51.6270739 Z" id="Path"></path>
                      <path d="M2.2705,33.9980739 C2.96581,39.1582739 4.9932,44.0450739 8.1611,48.1780739 L13.8799,42.4592739 C12.126,39.9162739 10.9307,37.0334739 10.3721,33.9983739 L2.2705,33.9980739 Z" id="Path"></path>
                      <path d="M61.7305,33.9980739 L53.6289,33.9980739 C53.07031,37.0332739 51.875,39.9160739 50.1211,42.4589739 L55.8399,48.1777739 C59.0079,44.0449739 61.0352,39.1582739 61.7305,33.9977739 L61.7305,33.9980739 Z" id="Path"></path>
                      <path d="M4.0005,24.9980739 L24.0005,24.9980739 L24.0005,16.9980739 L14.27,16.9980739 C17.6762,12.3613739 22.7622,9.24417393 28.442,8.31057393 C34.1178,7.38088393 39.934,8.70901393 44.645,12.0175739 C49.352,15.3222739 52.5786,20.3417739 53.6294,25.9975739 L61.731,25.9975739 C60.6646,18.0834739 56.4888,10.9235739 50.129,6.09957393 C43.7657,1.27147393 35.746,-0.818426068 27.836,0.290973932 C19.9298,1.39647393 12.793,5.61127393 8,11.9979739 L8,0.997973932 L-3.55271368e-15,0.997973932 L-3.55271368e-15,20.9979739 C-3.55271368e-15,22.0604739 0.42188,23.0760739 1.1719,23.8260739 C1.92192,24.5760739 2.9375,24.9979739 4,24.9979739 L4.0005,24.9980739 Z" id="Path"></path>
                      <path d="M36.0005,51.6270739 L36.0005,59.7286739 C41.1607,59.0333639 46.0475,57.0059739 50.1805,53.8380739 L44.4617,48.1192739 C41.9187,49.8731739 39.0359,51.0684739 36.0008,51.6270739 L36.0005,51.6270739 Z" id="Path"></path>
                    </g>
                  </g>
                </svg>
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
      ctx.lineWidth = 6 * scale;
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
