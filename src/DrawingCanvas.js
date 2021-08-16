import { loadIcon } from "./UI";

export const createScreenshotEditor = function (screenshot, onDone, onCancel) {
  var elem = document.createElement("div");
  elem.className = "bb-feedback-dialog-container";
  elem.innerHTML = `<div class="bb-feedback-dialog-backdrop"></div><div class='bb-feedback-dialog bb-feedback-dialog-drawing bb-anim-fadein'>
    <div class="bb-feedback-dialog-header bb-feedback-dialog-header--back">
        <div class="bb-feedback-dialog-header-back">
        ${loadIcon("arrowleft", "#fff")}
        </div>
        <div class="bb-feedback-dialog-header-text">
            <div class="bb-feedback-dialog-header-title">Mark the bug</div>
        </div>
          <div class="bb-feedback-dialog-header-next">
          <span>Next</span>
          ${loadIcon("arrowleft", "#000")}
        </div>
    </div>
    <div class="bb-feedback-dialog-body">
        <div class="bb-screenshot-editor-canv">
            <canvas id="bb-screenshot-editor-canvas" />
        </div>
        <div class="bb-drawing-container">
            <div id="bb-drawing-color" style="background-color: #EB144C">
                <div id="bb-drawing-colorpopup">
                    <div class="bb-drawing-coloritem" data-color="#EB144C"></div>
                    <div class="bb-drawing-coloritem" data-color="#FF6705"></div>
                    <div class="bb-drawing-coloritem" data-color="#FDB903"></div>
                    <div class="bb-drawing-coloritem" data-color="#9900EE"></div>
                    <div class="bb-drawing-coloritem" data-color="#00D082"></div>
                    <div class="bb-drawing-coloritem" data-color="#0A93E4"></div>
                </div>
            </div>
        </div>
    </div>
</div>`;
  document.body.appendChild(elem);

  var canvas = document.getElementById("bb-screenshot-editor-canvas");
  var ctx = canvas.getContext("2d");
  var currentColor = "#EB144C";

  const backButton = document.querySelector(".bb-feedback-dialog-header-back");
  backButton.addEventListener("click", function () {
    onCancel();
  });
  const nextButton = document.querySelector(".bb-feedback-dialog-header-next");
  nextButton.addEventListener("click", function () {
    onDone(canvas.toDataURL('image/png'));
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

  // Prepare drawing tools.
  const drawingItems = document.querySelectorAll(".bb-drawing-coloritem");
  for (var i = 0; i < drawingItems.length; i++) {
    const drawingItem = drawingItems[i];
    const color = drawingItem.getAttribute("data-color");
    drawingItem.style.backgroundColor = color;
    drawingItem.addEventListener("click", function () {
      currentColor = color;
      colorItem.style.backgroundColor = color;
    });
  }

  // Draw screenshot.
  var image = new Image();
  image.onload = function () {
    ctx.canvas.width = this.width;
    ctx.canvas.height = this.height;
    ctx.drawImage(this, 0, 0);
  };
  image.src = screenshot;

  var isIdle = true;

  function getCanvasScale() {
    return canvas.width / canvas.offsetWidth;
  }

  function drawstart(event) {
    ctx.save();
    const scale = getCanvasScale();
    ctx.beginPath();
    ctx.moveTo(
      (event.pageX - canvas.offsetLeft) * scale,
      (event.pageY - canvas.offsetTop) * scale
    );
    isIdle = false;
  }

  function drawmove(event) {
    if (isIdle) return;
    const scale = getCanvasScale();
    ctx.lineWidth = 6 * scale;
    ctx.strokeStyle = currentColor;
    ctx.lineCap = "round";
    ctx.lineTo(
      (event.pageX - canvas.offsetLeft) * scale,
      (event.pageY - canvas.offsetTop) * scale
    );
    ctx.stroke();
  }

  function drawend(event) {
    if (isIdle) return;
    drawmove(event);
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
