export const hookScreenDrawing = function () {
  const captureEditor = document.querySelector(".bb-capture-svg");
  captureEditor.style.minHeight = `${document.documentElement.scrollHeight}px`;

  // Window resize
  window.addEventListener(
    "resize",
    function (event) {
      captureEditor.style.minHeight = `${document.documentElement.scrollHeight}px`;
    },
    true
  );

  var svgElement = document.querySelector(".bb-capture-svg");
  var path = null;
  var strPath;
  var strokeWidth = 12;
  var bufferSize;
  var buffer = []; // Contains the last positions of the mouse cursor

  svgElement.addEventListener("mousedown", function (e) {
    bufferSize = 6;
    path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "#FF0000AA");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-width", strokeWidth);
    buffer = [];
    var pt = getMousePosition(e);
    appendToBuffer(pt);
    strPath = "M" + pt.x + " " + pt.y;
    path.setAttribute("d", strPath);
    svgElement.appendChild(path);
    fadeOutToolbar();
  });

  svgElement.addEventListener("mousemove", function (e) {
    if (path) {
      appendToBuffer(getMousePosition(e));
      updateSvgPath();
    }
  });

  svgElement.addEventListener("mouseup", function () {
    if (path) {
      path = null;
    }
    fadeInToolbar();
  });

  var getMousePosition = function (e) {
    return {
      x: e.pageX,
      y: e.pageY,
    };
  };

  var appendToBuffer = function (pt) {
    buffer.push(pt);
    while (buffer.length > bufferSize) {
      buffer.shift();
    }
  };

  // Calculate the average point, starting at offset in the buffer
  var getAveragePoint = function (offset) {
    var len = buffer.length;
    if (len % 2 === 1 || len >= bufferSize) {
      var totalX = 0;
      var totalY = 0;
      var pt, i;
      var count = 0;
      for (i = offset; i < len; i++) {
        count++;
        pt = buffer[i];
        totalX += pt.x;
        totalY += pt.y;
      }
      return {
        x: totalX / count,
        y: totalY / count,
      };
    }
    return null;
  };

  var updateSvgPath = function () {
    var pt = getAveragePoint(0);

    if (pt) {
      // Get the smoothed part of the path that will not change
      strPath += " L" + pt.x + " " + pt.y;

      // Get the last part of the path (close to the current mouse position)
      // This part will change if the mouse moves again
      var tmpPath = "";
      for (var offset = 2; offset < buffer.length; offset += 2) {
        pt = getAveragePoint(offset);
        tmpPath += " L" + pt.x + " " + pt.y;
      }

      // Set the complete current path coordinates
      path.setAttribute("d", strPath + tmpPath);
    }
  };
};

const fadeOutToolbar = function () {
  var fadeTarget = document.querySelector(".bb-capture-toolbar");
  fadeTarget.style.opacity = 0;
  fadeTarget.style.pointerEvents = "none";
};

const fadeInToolbar = function () {
  var fadeTarget = document.querySelector(".bb-capture-toolbar");
  fadeTarget.style.opacity = 1;
  fadeTarget.style.pointerEvents = "auto";
};
