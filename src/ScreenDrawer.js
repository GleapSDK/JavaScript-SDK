export class GleapScreenDrawer {
  svgElement = document.querySelector(".bb-capture-svg");
  path = null;
  strPath;
  strokeWidth = 12;
  strokeWidthRect = 6;
  bufferSize;
  buffer = [];
  startPoint = null;
  tool = "pen";
  color = "#FF0000";

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
      self.fadeOutToolbar();
      if (self.tool === "pen") {
        self.mouseDownPen(e);
      }
      if (self.tool === "rect") {
        self.mouseDownRect(e);
      }
    });

    this.svgElement.addEventListener("mousemove", function (e) {
      if (self.tool === "pen") {
        self.mouseMovePen(e);
      }
      if (self.tool === "rect") {
        self.mouseMoveRect(e);
      }
    });

    this.svgElement.addEventListener("mouseup", function (e) {
      self.fadeInToolbar();
      if (self.tool === "pen") {
        self.mouseUpPen(e);
      }
      if (self.tool === "rect") {
        self.mouseUpRect(e);
      }
    });
  }

  mouseUpPen() {
    if (this.path) {
      this.path = null;
    }
  }

  mouseUpRect() {
    if (this.path) {
      this.path = null;
    }
  }

  mouseMovePen(e) {
    if (this.path) {
      this.appendToBuffer(this.getMousePosition(e));
      this.updateSvgPath();
    }
  }

  mouseMoveRect(e) {
    if (this.path) {
      var p = this.getMousePosition(e);
      var w = Math.abs(p.x - this.startPoint.x);
      var h = Math.abs(p.y - this.startPoint.y);
      var x = p.x;
      var y = p.y;
      if (p.x > this.startPoint.x) {
        x = this.startPoint.x;
      }
      if (p.y > this.startPoint.y) {
        y = this.startPoint.y;
      }

      this.path.setAttributeNS(null, "x", x);
      this.path.setAttributeNS(null, "y", y);
      this.path.setAttributeNS(null, "width", w);
      this.path.setAttributeNS(null, "height", h);

      this.svgElement.appendChild(this.path);
    }
  }

  mouseDownRect(e) {
    this.bufferSize = 6;
    this.path = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    this.path.setAttribute("fill", "none");
    this.path.setAttribute("stroke", this.color);
    this.path.setAttribute("stroke-linecap", "round");
    this.path.setAttribute("stroke-width", this.strokeWidthRect);

    this.startPoint = this.getMousePosition(e);
  }

  mouseDownPen(e) {
    this.bufferSize = 6;
    this.path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    this.path.setAttribute("fill", "none");
    this.path.setAttribute("stroke", this.color + "AA");
    this.path.setAttribute("stroke-linecap", "round");
    this.path.setAttribute("stroke-width", this.strokeWidth);
    this.buffer = [];
    var pt = this.getMousePosition(e);
    this.appendToBuffer(pt);
    this.strPath = "M" + pt.x + " " + pt.y;
    this.path.setAttribute("d", this.strPath);
    this.svgElement.appendChild(this.path);
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
