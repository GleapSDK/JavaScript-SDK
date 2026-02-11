export class ScreenDrawer {
  rerender;
  svgElement = null;
  path = null;
  strPath;
  strokeWidth = 12;
  strokeWidthRect = 6;
  bufferSize = 4;
  buffer = [];
  startPoint = null;
  tool = 'rect';
  color = '#EB144C';
  mouseDown = null;
  mouseMove = null;
  mouseUp = null;
  resizeListener = null;
  pathBuffer = [];

  constructor(rerender) {
    const self = this;

    this.rerender = rerender;

    this.svgElement = document.querySelector('.bb-capture-svg');
    this.svgElement.style.minHeight = `${document.documentElement.scrollHeight}px`;

    // Window resize listener.
    this.resizeListener = function (e) {
      self.svgElement.style.minHeight = `${document.documentElement.scrollHeight}px`;
    };
    window.addEventListener('resize', this.resizeListener, true);

    this.mouseDown = function (e) {
      e.preventDefault();

      const colorpicker = document.querySelector('.bb-capture-toolbar-item-colorpicker');
      if (colorpicker) {
        colorpicker.style.display = 'none';
      }

      self.fadeOutToolbar();
      if (self.tool === 'pen' || self.tool === 'blur') {
        self.mouseDownPen(e);
      }
      if (self.tool === 'rect') {
        self.mouseDownRect(e);
      }
    };

    this.mouseMove = function (e) {
      e.preventDefault();
      if (self.tool === 'pen' || self.tool === 'blur') {
        self.mouseMovePen(e);
      }
      if (self.tool === 'rect') {
        self.mouseMoveRect(e);
      }
    };

    this.mouseUp = function (e) {
      e.preventDefault();
      self.fadeInToolbar();
      if (self.tool === 'pen' || self.tool === 'blur') {
        self.mouseUpPen(e);
      }
      if (self.tool === 'rect') {
        self.mouseUpRect(e);
      }
    };

    this.svgElement.addEventListener('mousedown', this.mouseDown);
    this.svgElement.addEventListener('mousemove', this.mouseMove);
    this.svgElement.addEventListener('mouseup', this.mouseUp);
    this.svgElement.addEventListener('touchstart', this.mouseDown, false);
    this.svgElement.addEventListener('touchmove', this.mouseMove, false);
    this.svgElement.addEventListener('touchend', this.mouseUp, false);

    setTimeout(() => {
      this.rerender();
    }, 100);
  }

  clear() {
    if (this.svgElement) {
      while (this.svgElement.firstChild) {
        this.svgElement.firstChild.remove();
      }
    }
  }

  destroy() {
    this.svgElement.removeEventListener('mousedown', this.mouseDown);
    this.svgElement.removeEventListener('mousemove', this.mouseMove);
    this.svgElement.removeEventListener('mouseup', this.mouseUp);
    this.svgElement.removeEventListener('touchstart', this.mouseDown);
    this.svgElement.removeEventListener('touchmove', this.mouseMove);
    this.svgElement.removeEventListener('touchend', this.mouseUp);
    window.removeEventListener('resize', this.resizeListener);
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

      this.path.setAttributeNS(null, 'x', x);
      this.path.setAttributeNS(null, 'y', y);
      this.path.setAttributeNS(null, 'width', w);
      this.path.setAttributeNS(null, 'height', h);
    }
  }

  mouseDownRect(e) {
    this.path = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    this.path.setAttribute('fill', 'none');
    this.path.setAttribute('stroke', this.color);
    this.path.setAttribute('stroke-linecap', 'round');
    this.path.setAttribute('stroke-width', this.strokeWidthRect);

    this.startPoint = this.getMousePosition(e);
    this.appendPathToSvg(this.path);
  }

  mouseDownPen(e) {
    var color = this.color + 'AA';
    var strokeWidth = this.strokeWidth;

    if (this.tool === 'blur') {
      color = '#000000';
      strokeWidth = 40;
    }

    this.path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.path.setAttribute('fill', 'none');
    this.path.setAttribute('stroke', color);
    this.path.setAttribute('stroke-linecap', 'round');
    this.path.setAttribute('stroke-width', strokeWidth);
    this.buffer = [];
    var pt = this.getMousePosition(e);
    this.appendToBuffer(pt);
    this.strPath = 'M' + pt.x + ' ' + pt.y;
    this.path.setAttribute('d', this.strPath);
    this.appendPathToSvg(this.path);
  }

  setTool(tool) {
    this.tool = tool;
  }

  setColor(color) {
    this.color = color;
  }

  getMousePosition(e) {
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }

    return {
      x: e.clientX,
      y: e.clientY,
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
      this.strPath += ' L' + pt.x + ' ' + pt.y;

      // Get the last part of the path (close to the current mouse position)
      // This part will change if the mouse moves again
      var tmpPath = '';
      for (var offset = 2; offset < this.buffer.length; offset += 2) {
        pt = this.getAveragePoint(offset);
        tmpPath += ' L' + pt.x + ' ' + pt.y;
      }

      // Set the complete current path coordinates
      this.path.setAttribute('d', this.strPath + tmpPath);
    }
  }

  appendToBuffer(pt) {
    this.buffer.push(pt);
    while (this.buffer.length > this.bufferSize) {
      this.buffer.shift();
    }
  }

  appendPathToSvg(path) {
    this.svgElement.appendChild(path);
    this.pathBuffer.push(path);
    this.rerender();
  }

  removeLastAddedPathFromSvg() {
    if (this.pathBuffer.length <= 0 || !this.svgElement) {
      return;
    }

    this.svgElement.removeChild(this.pathBuffer[this.pathBuffer.length - 1]);

    this.pathBuffer.pop();

    this.rerender();
  }

  fadeOutToolbar() {
    var fadeTarget = document.querySelector('.bb-capture-toolbar');
    if (fadeTarget) {
      fadeTarget.style.opacity = 0;
      fadeTarget.style.pointerEvents = 'none';
    }
  }

  fadeInToolbar() {
    var fadeTarget = document.querySelector('.bb-capture-toolbar');
    if (fadeTarget) {
      fadeTarget.style.opacity = 1;
      fadeTarget.style.pointerEvents = 'auto';
    }
  }
}
