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
  elem.innerHTML = `<div class="bb-feedback-dialog-backdrop"></div><div class='bb-feedback-dialog bb-feedback-dialog-drawing bb-anim-fadein'>
    <div class="bb-feedback-dialog-header bb-feedback-dialog-header--back">
        <div class="bb-feedback-dialog-header-back">
          ${loadIcon(showBack ? 'arrowleft' : 'close', "#fff")}
        </div>
        <div class="bb-feedback-dialog-header-text">
            <div class="bb-feedback-dialog-header-title">${translateText(
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
              <div class="bb-drawing-tool-item" data-tool="blur">
                <svg width="88px" height="73px" viewBox="0 0 88 73" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
                  <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                    <g fill="#000000" fill-rule="nonzero">
                        <polygon id="Path" points="46 73 0 73 0 53 46 53"></polygon>
                        <path d="M87.9390396,70 C85.4917256,70 84.398667,67.578856 83.6801803,65.9812544 C83.445025,65.4585751 83.0618135,64.6104931 82.813604,64.344142 C82.5610356,64.6054817 82.1778241,65.4536142 81.9426688,65.9812544 C81.2197898,67.5837791 80.1311235,70 77.6838096,70 C75.2364956,70 74.1477847,67.578856 73.4249503,65.9812544 C73.189795,65.4585751 72.8065835,64.6104931 72.558374,64.344142 C72.3058056,64.6104174 71.9269418,65.4536142 71.6917976,65.9812544 C70.9732775,67.5837791 69.8802524,70 67.4329384,70 C64.9856244,70 63.8969136,67.578856 63.1740792,65.9812544 C62.9389239,65.4585751 62.5600713,64.6104931 62.3075028,64.3490651 C62.0549344,64.6153404 61.6760706,65.4585373 61.4409265,65.9812544 C60.7224063,67.5837791 59.6293813,70 57.186415,70 C54.739101,70 53.6503902,67.578856 52.9319035,65.9812544 C52.6749762,65.4092686 52.2438619,64.4527022 52,64.2899882 C52.0174176,64.2998507 52.0479006,64.309712 52.0653193,64.309712 L52.0653193,60 C54.5126333,60 55.6013441,62.421144 56.3198308,64.0236686 C56.5549861,64.5463479 56.9338387,65.3895069 57.1864072,65.655858 C57.4389756,65.3895826 57.8178394,64.5463858 58.0529835,64.0236686 C58.7715037,62.421144 59.8645287,60 62.307495,60 C64.754809,60 65.8435198,62.421144 66.5663543,64.0187456 C66.8015095,64.5414249 67.184721,65.3895069 67.4329306,65.655858 C67.685499,65.3895826 68.0643628,64.5414627 68.299507,64.0187456 C69.0180271,62.4162209 70.1110522,60 72.5583662,60 C75.0056802,60 76.094391,62.421144 76.8172254,64.0187456 C77.0523807,64.5414249 77.4355922,65.3895069 77.6838017,65.655858 C77.9363702,65.3895826 78.315234,64.5414627 78.5503781,64.0187456 C79.2732571,62.4162209 80.3619233,60 82.8092373,60 C85.2565513,60 86.3452621,62.4162209 87.0680965,64.0187456 C87.3250238,64.590744 87.7561381,65.5472978 88,65.7100118 C87.9825813,65.7001505 87.9520994,65.690288 87.9346796,65.690288 L87.9390396,70 Z" id="Path"></path>
                        <path d="M31.9419642,15 C29.7668368,15 28.7992107,12.583777 28.1567688,10.9812509 C27.9477672,10.4585711 27.6071759,9.61048833 27.3826977,9.34413701 C27.1582196,9.60547689 26.8214924,10.4536102 26.6086266,10.9812509 C25.9700192,12.583777 24.9985587,15 22.8234312,15 C20.6483038,15 19.6806777,12.583777 19.0421,10.9812509 C18.8330983,10.4585711 18.492507,9.61048833 18.2719029,9.34413701 C18.0474248,9.61041259 17.7106977,10.4536102 17.5017059,10.9812509 C16.8592244,12.583777 15.891638,15 13.7165105,15 C11.541383,15 10.573757,12.583777 9.93517928,10.9812509 C9.72617761,10.4585711 9.38558631,9.61541142 9.16498224,9.3490601 C8.94050409,9.61533568 8.60377696,10.4585333 8.39478519,10.9812509 C7.75230368,12.583777 6.78471726,15 4.6095898,15 C2.43446234,15 1.46683629,12.583777 0.828258575,10.9812509 C0.599906356,10.4092646 0.216739913,9.45762035 0,9.28998312 C0.0154814224,9.29984569 0.0425741593,9.309707 0.0580555817,9.31463892 L0.0580555817,5.00492308 C2.23318304,5.00492308 3.2008091,7.4260692 3.84325097,9.02367219 C4.05225265,9.54635195 4.38896987,10.3895117 4.61344802,10.655863 C4.83792617,10.3895874 5.1746533,9.54638982 5.38364507,9.02367219 C6.02612657,7.42114612 6.99371299,5.00492308 9.16884045,5.00492308 C11.3439679,5.00492308 12.311594,7.4260692 12.9501717,9.02367219 C13.1591734,9.54635195 13.4997647,10.3944347 13.7203687,10.655863 C13.9448469,10.3895874 14.281574,9.54638982 14.4905658,9.02367219 C15.1330473,7.42114612 16.1006337,5.00492308 18.2757612,5.00492308 C20.4508886,5.00492308 21.4185147,7.4260692 22.0570924,9.02367219 C22.2660941,9.54635195 22.6066854,10.3944347 22.8272894,10.655863 C23.0517676,10.3895874 23.3884947,9.54638982 23.5974865,9.01874911 C24.239968,7.41622304 25.2075544,5 27.3826819,5 C29.5578093,5 30.5292996,7.41622304 31.1678773,9.01874911 C31.3962295,9.59074804 31.7793959,10.5473027 32,10.7100169 C31.9883887,10.7001556 31.9574258,10.690293 31.9419454,10.690293 L31.9419642,15 Z" id="Path"></path>
                        <polygon id="Path" points="1 26 88 26 88 46 1 46"></polygon>
                        <polygon id="Path" points="38 0 88 0 88 20 38 20"></polygon>
                    </g>
                  </g>
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
      ctx.lineWidth = 24 * scale;
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
    for (let i = 0; i < drawingHistory.length; i++) {
      const steps = drawingHistory[i];
      for (let j = 0; j < steps.length; j++) {
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
