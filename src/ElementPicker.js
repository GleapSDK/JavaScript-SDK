/**
 * Utility function to get the bounding rectangle of an element.
 * @param {HTMLElement} el - The target element.
 * @returns {Object} An object containing x, y, width, and height.
 */
function getElementBounds(el) {
  const rect = el.getBoundingClientRect();
  return {
    x: window.pageXOffset + rect.left,
    y: window.pageYOffset + rect.top,
    width: el.offsetWidth,
    height: el.offsetHeight,
  };
}

/**
 * Class representing an overlay element.
 */
class ElementOverlay {
  /**
   * Create an ElementOverlay.
   * @param {Object} options - Configuration options.
   * @param {string} [options.className] - CSS class name for the overlay.
   * @param {Object} [options.style] - Style overrides for the overlay.
   */
  constructor(options) {
    // Create and style the overlay element.
    this.overlay = document.createElement('div');
    this.overlay.className = options.className || '_ext-element-overlay';
    this.overlay.style.background = (options.style && options.style.background) || 'rgba(250, 240, 202, 0.2)';
    this.overlay.style.borderColor = (options.style && options.style.borderColor) || '#F95738';
    this.overlay.style.borderStyle = (options.style && options.style.borderStyle) || 'solid';
    this.overlay.style.borderRadius = (options.style && options.style.borderRadius) || '1px';
    this.overlay.style.borderWidth = (options.style && options.style.borderWidth) || '1px';
    this.overlay.style.boxSizing = (options.style && options.style.boxSizing) || 'border-box';
    this.overlay.style.cursor = (options.style && options.style.cursor) || 'crosshair';
    this.overlay.style.position = (options.style && options.style.position) || 'absolute';
    this.overlay.style.zIndex = (options.style && options.style.zIndex) || '2147483647';
    this.overlay.style.margin = (options.style && options.style.margin) || '0px';
    this.overlay.style.padding = (options.style && options.style.padding) || '0px';

    // Create a container that will host a Shadow DOM.
    this.shadowContainer = document.createElement('div');
    this.shadowContainer.className = '_ext-element-overlay-container';
    this.shadowContainer.style.position = 'absolute';
    this.shadowContainer.style.top = '0px';
    this.shadowContainer.style.left = '0px';
    this.shadowContainer.style.margin = '0px';
    this.shadowContainer.style.padding = '0px';
    this.shadowRoot = this.shadowContainer.attachShadow({ mode: 'open' });
  }

  /**
   * Adds the overlay to the DOM.
   * @param {Node} parent - The parent element.
   * @param {boolean} useShadowDOM - Whether to use Shadow DOM.
   */
  addToDOM(parent, useShadowDOM) {
    this.usingShadowDOM = useShadowDOM;
    if (useShadowDOM) {
      parent.insertBefore(this.shadowContainer, parent.firstChild);
      this.shadowRoot.appendChild(this.overlay);
    } else {
      parent.appendChild(this.overlay);
    }
  }

  /**
   * Removes the overlay from the DOM.
   */
  removeFromDOM() {
    this.setBounds({ x: 0, y: 0, width: 0, height: 0 });
    if (this.overlay.remove) {
      this.overlay.remove();
    } else if (this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    if (this.usingShadowDOM) {
      if (this.shadowContainer.remove) {
        this.shadowContainer.remove();
      } else if (this.shadowContainer.parentNode) {
        this.shadowContainer.parentNode.removeChild(this.shadowContainer);
      }
    }
  }

  /**
   * Enables pointer events on the overlay.
   */
  captureCursor() {
    this.overlay.style.pointerEvents = 'auto';
  }

  /**
   * Disables pointer events on the overlay.
   */
  ignoreCursor() {
    this.overlay.style.pointerEvents = 'none';
  }

  /**
   * Sets the position and size of the overlay.
   * @param {Object} bounds - The bounding box.
   * @param {number} bounds.x - The x-coordinate.
   * @param {number} bounds.y - The y-coordinate.
   * @param {number} bounds.width - The width.
   * @param {number} bounds.height - The height.
   */
  setBounds(bounds) {
    const { x, y, width, height } = bounds;
    this.overlay.style.left = x + 'px';
    this.overlay.style.top = y + 'px';
    this.overlay.style.width = width + 'px';
    this.overlay.style.height = height + 'px';
  }
}

/**
 * Class representing an element picker that uses the overlay.
 */
class ElementPicker {
  /**
   * Create an ElementPicker.
   * @param {Object} [overlayOptions] - Options to pass to ElementOverlay.
   */
  constructor(overlayOptions) {
    this.active = false;
    this.overlay = new ElementOverlay(overlayOptions || {});
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.tick = this.tick.bind(this);
  }

  /**
   * Starts the element picking process.
   * @param {Object} options - Picker options.
   * @param {Node} [options.parentElement] - Parent element to attach the overlay.
   * @param {boolean} [options.useShadowDOM=true] - Whether to use Shadow DOM.
   * @param {Function} [options.onClick] - Callback invoked on click.
   * @param {Function} [options.onHover] - Callback invoked on hover.
   * @param {Function} [options.elementFilter] - Function to filter elements.
   * @returns {boolean} True if started successfully, false if already active.
   */
  start(options) {
    if (this.active) {
      return false;
    }
    this.active = true;
    this.options = options;

    document.addEventListener('mousemove', this.handleMouseMove, true);
    document.addEventListener('click', this.handleClick, true);

    const parentElement = options.parentElement || document.body;
    const useShadowDOM = options.useShadowDOM !== undefined ? options.useShadowDOM : true;
    this.overlay.addToDOM(parentElement, useShadowDOM);
    this.tick();

    return true;
  }

  /**
   * Stops the element picking process.
   */
  stop() {
    this.active = false;
    this.options = undefined;

    document.removeEventListener('mousemove', this.handleMouseMove, true);
    document.removeEventListener('click', this.handleClick, true);

    this.overlay.removeFromDOM();
    this.target = undefined;
    this.mouseX = undefined;
    this.mouseY = undefined;

    if (this.tickReq) {
      window.cancelAnimationFrame(this.tickReq);
    }
  }

  /**
   * Handles mouse move events.
   * @param {MouseEvent} event - The mousemove event.
   */
  handleMouseMove(event) {
    this.mouseX = event.clientX;
    this.mouseY = event.clientY;
  }

  /**
   * Handles click events.
   * @param {MouseEvent} event - The click event.
   */
  handleClick(event) {
    const clickedEl = document.elementFromPoint(event.clientX, event.clientY);
    if (this.options && this.options.elementFilter && clickedEl && !this.options.elementFilter(clickedEl)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (this.target && this.options && this.options.onClick) {
      this.options.onClick(this.target);
    }
  }

  /**
   * The tick function that continuously updates the target element.
   */
  tick() {
    this.updateTarget();
    this.tickReq = window.requestAnimationFrame(this.tick);
  }

  /**
   * Updates the target element based on the current mouse position.
   */
  updateTarget() {
    if (this.mouseX === undefined || this.mouseY === undefined) {
      return;
    }

    // Temporarily ignore the overlay's pointer events to detect the underlying element.
    this.overlay.ignoreCursor();
    const elAtCursor = document.elementFromPoint(this.mouseX, this.mouseY);
    const newTarget = elAtCursor;
    this.overlay.captureCursor();

    // If the target hasn't changed, do nothing.
    if (!newTarget || newTarget === this.target) {
      return;
    }

    // If an element filter is provided and the new target doesn't match, clear the target.
    if (this.options && this.options.elementFilter) {
      if (!this.options.elementFilter(newTarget)) {
        this.target = undefined;
        this.overlay.setBounds({ x: 0, y: 0, width: 0, height: 0 });
        return;
      }
    }

    this.target = newTarget;
    const bounds = getElementBounds(newTarget);
    this.overlay.setBounds(bounds);

    if (this.options && this.options.onHover) {
      this.options.onHover(newTarget);
    }
  }
}

export default ElementPicker;
