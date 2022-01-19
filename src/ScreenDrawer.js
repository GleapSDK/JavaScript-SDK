export class GleapScreenDrawer {
  svgElement = document.querySelector(".bb-capture-svg");
  path = null;
  strPath;
  strokeWidth = 12;
  bufferSize;
  buffer = [];
  tool = "pen";
  color = "#FF0000AA";

  constructor() {
    const self = this;
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

    this.svgElement.addEventListener("mousedown", function (e) {
      self.bufferSize = 6;
      self.path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );
      self.path.setAttribute("fill", "none");
      self.path.setAttribute("stroke", "#FF0000AA");
      self.path.setAttribute("stroke-linecap", "round");
      self.path.setAttribute("stroke-width", self.strokeWidth);
      self.buffer = [];
      var pt = self.getMousePosition(e);
      self.appendToBuffer(pt);
      self.strPath = "M" + pt.x + " " + pt.y;
      self.path.setAttribute("d", self.strPath);
      self.svgElement.appendChild(self.path);
      self.fadeOutToolbar();
    });

    this.svgElement.addEventListener("mousemove", function (e) {
      if (self.path) {
        self.appendToBuffer(self.getMousePosition(e));
        self.updateSvgPath();
      }
    });

    this.svgElement.addEventListener("mouseup", function () {
      if (self.path) {
        self.path = null;
      }
      self.fadeInToolbar();
    });
  }

  setTool(tool, color) {
    this.tool = tool;
    this.color = color;
  }

  getMousePosition(e) {
    return {
      x: e.pageX,
      y: e.pageY,
    };
  }

  // Calculate the average point, starting at offset in the buffer
  getAveragePoint(offset) {
    var len = this.buffer.length;
    if (len % 2 === 1 || len >= this.bufferSize) {
      var totalX = 0;
      var totalY = 0;
      var pt, i;
      var count = 0;
      for (i = offset; i < len; i++) {
        count++;
        pt = this.buffer[i];
        totalX += pt.x;
        totalY += pt.y;
      }
      return {
        x: totalX / count,
        y: totalY / count,
      };
    }
    return null;
  }

  updateSvgPath() {
    var pt = this.getAveragePoint(0);

    if (pt) {
      // Get the smoothed part of the path that will not change
      this.strPath += " L" + pt.x + " " + pt.y;

      // Get the last part of the path (close to the current mouse position)
      // This part will change if the mouse moves again
      var tmpPath = "";
      for (var offset = 2; offset < this.buffer.length; offset += 2) {
        pt = this.getAveragePoint(offset);
        tmpPath += " L" + pt.x + " " + pt.y;
      }

      // Set the complete current path coordinates
      this.path.setAttribute("d", this.strPath + tmpPath);
    }
  }

  appendToBuffer(pt) {
    this.buffer.push(pt);
    while (this.buffer.length > this.bufferSize) {
      this.buffer.shift();
    }
  }

  fadeOutToolbar() {
    var fadeTarget = document.querySelector(".bb-capture-toolbar");
    fadeTarget.style.opacity = 0;
    fadeTarget.style.pointerEvents = "none";
  }

  fadeInToolbar() {
    var fadeTarget = document.querySelector(".bb-capture-toolbar");
    fadeTarget.style.opacity = 1;
    fadeTarget.style.pointerEvents = "auto";
  }
}
