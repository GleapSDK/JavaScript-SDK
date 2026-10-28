import { arrow, autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom';
import { GleapSession } from './Gleap';
import { loadIcon } from './UI';
import { checkPageFilter, checkPageRules } from './GleapPageFilter';
import { matchesSelectorSafe, querySelectorAllSafe } from './GleapSafeSelector';

export default class GleapTooltipManager {
  tooltips = [];
  filteredTooltips = [];
  lastUrl = null;
  elementToFloatingUIMap = new WeakMap();
  elementToTooltipMap = new WeakMap();
  anchorToElementMap = new WeakMap();
  livePopups = new WeakSet();
  nextId = 0;

  // GleapTooltipManager singleton
  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new GleapTooltipManager();
      this.instance.start();
    }
    return this.instance;
  }

  // Recursive function to process each node and its children
  processNodeInsertion(node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      // Our own hotspot anchors never carry a tooltip.
      if (node.hasAttribute('data-gleap-tooltip-anchor')) {
        return;
      }

      // Copy of a tooltip popup brought back with a cached page snapshot: not ours anymore.
      if (node.classList.contains('gleap-tooltip')) {
        if (!this.livePopups.has(node)) {
          node.remove();
        }
        return;
      }

      // Check the node itself
      this.checkNodeTooltip(node);

      // Check all children of the node recursively
      if (node.childNodes) {
        node.childNodes.forEach((childNode) => {
          this.processNodeInsertion(childNode);
        });
      }
    }
  }

  // Function to check a single node against the filtered tooltips
  checkNodeTooltip(node) {
    if (this.filteredTooltips.length > 0) {
      this.filteredTooltips.forEach((tooltip) => {
        if (tooltip.selector && matchesSelectorSafe(node, tooltip.selector)) {
          this.linkTooltip(node, tooltip);
        }
      });
    }
  }

  start() {
    const self = this;

    if (typeof window === 'undefined' || this.started) {
      return;
    }
    this.started = true;

    const throttle = (fn, time) => {
      let timeout = null;
      return function () {
        if (timeout) return;
        const context = this;
        const args = arguments;
        const later = () => {
          fn.call(context, ...args);
          timeout = null;
        };
        timeout = setTimeout(later, time);
      };
    };

    this.resizeListener = throttle(self.updateHotspotPositions.bind(self), 250);
    window.addEventListener('resize', this.resizeListener);

    // Client-side navigation does not always touch the DOM after the URL flips
    // (or the new page rendered before it), so watch the URL on its own as well.
    this.urlCheckInterval = setInterval(() => {
      self.checkUrlChange();
    }, 1000);

    if (!this.observer && typeof MutationObserver !== 'undefined' && document.documentElement) {
      this.observer = new MutationObserver((mutations) => {
        self.checkUrlChange();

        mutations.forEach((mutation) => {
          // Check for attribute changes that might affect hotspot positioning
          if (mutation.type === 'attributes') {
            const target = mutation.target;
            if (target.nodeType === Node.ELEMENT_NODE) {
              // Check if the changed element has tooltip hotspots or is a parent of tooltip elements
              const hasTooltipHotspots =
                target.querySelector('[data-gleap-tooltip-hotspot]') || target.hasAttribute('data-gleap-tooltip-mode');

              if (hasTooltipHotspots || target.hasAttribute('data-gleap-tooltip')) {
                self.updateHotspotPositions();
              }
            }
          }

          // Check for added nodes
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              self.processNodeInsertion(node);
            }
          });

          // Check for removed nodes (a node that was only moved is still connected).
          mutation.removedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE && !node.isConnected) {
              self.processNodeRemoval(node);
            }
          });
        });
      });

      // Observe the whole document, not just the current <body>: Turbo Drive and
      // similar routers swap in a brand-new <body> on every visit.
      this.observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class'],
      });
    }
  }

  // Re-evaluates the page rules when the URL changed (client-side navigation).
  checkUrlChange() {
    if (this.lastUrl === window.location.href) {
      return;
    }
    this.lastUrl = window.location.href;
    this.filteredTooltips = this.getFilteredTooltips();

    // Remove tooltips whose page rules no longer match the new page.
    const linkedElements = document.querySelectorAll('[data-gleap-tooltip]');
    linkedElements.forEach((element) => {
      const link = this.elementToFloatingUIMap.get(element);
      if (link && this.filteredTooltips.indexOf(link.data) === -1) {
        this.unlinkElement(element);
      }
    });

    // The target may have rendered before the URL changed, so scan the whole page.
    this.checkForTooltips();
  }

  processNodeRemoval(node) {
    // Linked elements that left the page.
    const removedElements = Array.from(node.querySelectorAll('[data-gleap-tooltip]'));
    if (node.hasAttribute('data-gleap-tooltip')) {
      removedElements.push(node);
    }
    removedElements.forEach((element) => {
      if (this.elementToFloatingUIMap.has(element)) {
        this.unlinkElement(element);
      }
    });

    // A hotspot wiped by a re-render (e.g. the framework replaced the element's text)
    // while the element itself stayed on the page: put it back.
    const removedAnchors = Array.from(node.querySelectorAll('[data-gleap-tooltip-anchor]'));
    if (node.hasAttribute('data-gleap-tooltip-anchor')) {
      removedAnchors.push(node);
    }
    removedAnchors.forEach((anchor) => {
      const element = this.anchorToElementMap.get(anchor);
      const link = element ? this.elementToFloatingUIMap.get(element) : null;
      if (element && element.isConnected && link && link.anchor === anchor) {
        const tooltip = link.data;
        this.unlinkElement(element);
        if (this.filteredTooltips.indexOf(tooltip) !== -1) {
          this.linkTooltip(element, tooltip);
        }
      }
    });
  }

  // Whether the element has a working tooltip (not just our marker attribute).
  isLinked(element) {
    const link = this.elementToFloatingUIMap.get(element);
    if (!link) {
      return false;
    }
    if (link.anchor && !link.anchor.isConnected) {
      return false;
    }
    return !!(link.tooltip && link.tooltip.isConnected);
  }

  unlinkElement(element) {
    const link = this.elementToFloatingUIMap.get(element);
    if (link) {
      try {
        link.cleanup();
      } catch (exp) {}
      if (link.tooltip) {
        link.tooltip.remove();
      }
      if (link.anchor) {
        link.anchor.remove();
      }
      this.elementToFloatingUIMap.delete(element);
    }

    // Hotspot anchors copied along with the element (e.g. from a cached page snapshot).
    const tooltipId = element.getAttribute('data-gleap-tooltip');
    if (tooltipId !== null) {
      Array.from(element.children).forEach((child) => {
        if (child.getAttribute('data-gleap-tooltip-anchor') === tooltipId) {
          child.remove();
        }
      });
      const sibling = element.nextElementSibling;
      if (sibling && sibling.getAttribute('data-gleap-tooltip-anchor') === tooltipId) {
        sibling.remove();
      }
    }

    element.removeAttribute('data-gleap-tooltip');
    element.removeAttribute('data-gleap-tooltip-mode');
    this.elementToTooltipMap.delete(element);
  }

  updateHotspotPositions() {
    const elements = document.querySelectorAll(`[data-gleap-tooltip-mode='hotspot']`);
    elements.forEach((element) => {
      const tooltip = this.elementToTooltipMap.get(element);
      if (tooltip) {
        this.repositionHotspot(element, tooltip);
      }
    });
  }

  createTooltip(element, tooltipText, tooltipData) {
    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'gleap-tooltip';
    tooltip.innerHTML = `<div class="gleap-tooltip-inner">
            ${tooltipText}
            <div class="gleap-tooltip-arrow">
                <svg width="116" height="56" viewBox="0 0 116 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M57.75 0.74998L115.5 0.680177L66.8726 49.3076C61.7958 54.3844 53.5646 54.3844 48.4878 49.3076L4.05618e-05 0.819784L57.75 0.74998Z" fill="white"/>
                </svg>
            </div>
        </div>`;
    document.body.appendChild(tooltip);
    this.livePopups.add(tooltip);

    // Create a Popper instance with arrow and offset

    const arrowEl = tooltip.querySelector('.gleap-tooltip-arrow');
    const cleanup = autoUpdate(element, tooltip, () => {
      computePosition(element, tooltip, {
        placement: tooltipData.posX === 'left' ? 'left' : 'right',
        middleware: [offset(10), flip(), shift(), arrow({ element: arrowEl })],
      }).then(({ x, y, middlewareData, placement }) => {
        try {
          Object.assign(tooltip.style, {
            left: `${x}px`,
            top: `${y}px`,
          });

          if (middlewareData.arrow) {
            let arrowSize = 20; // Arrow size should be consistent with the border width used in CSS
            let arrowPos = { left: '', top: '', transform: '' };

            if (middlewareData.arrow.x != null) {
              arrowPos.left = `${middlewareData.arrow.x}px`;
              if (placement === 'bottom') {
                arrowPos.transform = 'translateY(-7px) rotate(180deg)';
                arrowPos.top = `${-arrowSize}px`; // Move arrow outside the tooltip
              } else if (placement === 'top') {
                arrowPos.transform = 'translateY(7px) rotate(0deg)';
                arrowPos.top = `100%`; // Adjust based on the tooltip's height
              }
            }
            if (middlewareData.arrow.y != null) {
              arrowPos.top = `${middlewareData.arrow.y}px`;
              if (placement === 'right') {
                arrowPos.transform = 'translateX(-7px) rotate(90deg)';
                arrowPos.left = `${-arrowSize}px`; // Move arrow outside the tooltip
              } else if (placement === 'left') {
                arrowPos.transform = 'translateX(7px) rotate(270deg)';
                arrowPos.left = `100%`; // Adjust based on the tooltip's width
              }
            }
            // Apply the computed styles to the arrow
            Object.assign(arrowEl.style, arrowPos);
          }
        } catch (exp) {}
      });
    });

    let hideTimeout;

    function show() {
      clearTimeout(hideTimeout);
      tooltip.style.visibility = 'visible';
      tooltip.style.opacity = '1';
      tooltip.style.pointerEvents = 'auto';
    }

    function hide() {
      hideTimeout = setTimeout(() => {
        tooltip.style.opacity = '0';

        setTimeout(() => {
          tooltip.style.visibility = 'hidden';
          tooltip.style.pointerEvents = 'none';
        }, 200);
      }, 500);
    }

    // Event listeners to show/hide the tooltip
    element.addEventListener('mouseenter', show);
    element.addEventListener('mouseleave', hide);
    tooltip.addEventListener('mouseenter', show);
    tooltip.addEventListener('mouseleave', hide);

    element.addEventListener('click', hide);
    tooltip.addEventListener('click', hide);

    return {
      cleanup: () => {
        cleanup();
        clearTimeout(hideTimeout);
        element.removeEventListener('mouseenter', show);
        element.removeEventListener('mouseleave', hide);
        element.removeEventListener('click', hide);
      },
      tooltip,
    };
  }

  canEmbed(element) {
    const voidElements = new Set(['area', 'base', 'br', 'embed', 'hr', 'img', 'input', 'source', 'track', 'wbr', 'canvas']);

    return element && !voidElements.has(element.tagName.toLowerCase());
  }

  linkTooltip = (element, tooltip) => {
    if (!element) {
      return;
    }

    if (element.hasAttribute('data-gleap-tooltip')) {
      if (this.isLinked(element)) {
        return;
      }

      // Only our marker is left (page snapshot restored by the router, or the
      // hotspot was wiped by a re-render): set the tooltip up again.
      this.unlinkElement(element);
    }

    const nextId = this.nextId++;
    element.setAttribute('data-gleap-tooltip', nextId);

    var tooltipElem = null;
    var hotspotContainer = null;

    if (tooltip.mode === 'hotspot') {
      // Create hotspot container. It is absolutely positioned and added as the last
      // child, so the element's own layout (flex/grid gaps, sibling margins,
      // :first-child styles, text flow) stays exactly as it was.
      hotspotContainer = document.createElement('div');
      hotspotContainer.setAttribute('data-gleap-tooltip-anchor', nextId);
      hotspotContainer.classList.add('gleap-tooltip-anchor');
      const anchorStyles = {
        position: 'absolute',
        display: 'block',
        float: 'none',
        width: '0px',
        height: '0px',
        margin: '0px',
        padding: '0px',
        border: 'none',
        overflow: 'visible',
      };
      Object.keys(anchorStyles).forEach((key) => {
        hotspotContainer.style.setProperty(key, anchorStyles[key], 'important');
      });
      element.setAttribute('data-gleap-tooltip-mode', 'hotspot');

      if (this.canEmbed(element)) {
        element.appendChild(hotspotContainer);
      } else if (element.parentNode) {
        element.parentNode.insertBefore(hotspotContainer, element.nextSibling);
      }

      // Create hotspot.
      const hotspot = document.createElement('div');
      hotspot.classList.add('gleap-tooltip-hotspot');
      hotspot.setAttribute('data-gleap-tooltip-hotspot', nextId);

      hotspot.innerHTML = `${loadIcon(tooltip.icon, tooltip.color)}${
        tooltip.animated
          ? `<div style="background-color: ${tooltip.color}" class="gleap-tooltip-hotspot-animation"></div>`
          : ''
      }`;
      hotspotContainer.appendChild(hotspot);

      tooltipElem = hotspot;
      this.elementToTooltipMap.set(element, tooltip);
      this.anchorToElementMap.set(hotspotContainer, element);
    } else {
      tooltipElem = element;
    }

    const floatingUIInstance = this.createTooltip(tooltipElem, tooltip.html, tooltip);

    this.elementToFloatingUIMap.set(element, {
      ...floatingUIInstance,
      anchor: hotspotContainer,
      data: tooltip,
    });

    if (hotspotContainer) {
      // Update hotspot position.
      this.repositionHotspot(element, tooltip);
    }
  };

  destroy() {
    // Disconnect the MutationObserver if it exists.
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    // Remove the window resize event listener if it was stored.
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
      this.resizeListener = null;
    }

    if (this.urlCheckInterval) {
      clearInterval(this.urlCheckInterval);
      this.urlCheckInterval = null;
    }

    // Stop floating UI updates and hover listeners of linked elements.
    document.querySelectorAll('[data-gleap-tooltip]').forEach((element) => {
      const link = this.elementToFloatingUIMap.get(element);
      if (link) {
        try {
          link.cleanup();
        } catch (exp) {}
      }
    });

    // Remove all tooltip elements created by Gleap.
    const tooltipElements = document.querySelectorAll('.gleap-tooltip');
    tooltipElements.forEach((tooltip) => tooltip.remove());

    // Remove any tooltip anchors and hotspots.
    const anchors = document.querySelectorAll('[data-gleap-tooltip-anchor]');
    anchors.forEach((anchor) => anchor.remove());
    const hotspots = document.querySelectorAll('[data-gleap-tooltip-hotspot]');
    hotspots.forEach((hotspot) => hotspot.remove());

    // Remove all attributes from elements.
    const elements = document.querySelectorAll('[data-gleap-tooltip]');
    elements.forEach((element) => element.removeAttribute('data-gleap-tooltip'));

    // Remove all attributes from elements.
    const modeElements = document.querySelectorAll('[data-gleap-tooltip-mode]');
    modeElements.forEach((element) => element.removeAttribute('data-gleap-tooltip-mode'));

    // Clear internal references.
    this.elementToFloatingUIMap = new WeakMap();
    this.elementToTooltipMap = new WeakMap();
    this.anchorToElementMap = new WeakMap();
    this.livePopups = new WeakSet();
    this.tooltips = [];
    this.filteredTooltips = [];
    this.lastUrl = null;

    // load() starts watching the page again.
    this.started = false;
  }

  repositionHotspot(element, tooltip) {
    if (!element || !tooltip) {
      return;
    }

    const link = this.elementToFloatingUIMap.get(element);
    const anchorElement = link ? link.anchor : null;
    if (!anchorElement) {
      return;
    }

    const hotspot = anchorElement.querySelector('[data-gleap-tooltip-hotspot]');
    if (!hotspot) {
      return;
    }

    if (!tooltip.posX) {
      tooltip.posX = 'right';
    }
    if (!tooltip.posY) {
      tooltip.posY = 'center';
    }
    // An explicit 0 is a valid offset; only fall back when none is set.
    tooltip.offsetX = this.toOffset(tooltip.offsetX, 4);
    tooltip.offsetY = this.toOffset(tooltip.offsetY, 0);

    const rect = element.getBoundingClientRect();
    const elementRect = {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };

    try {
      // Text elements are often wider than their text: place the hotspot next to
      // the content's right edge instead (our own anchor excluded).
      if (anchorElement.parentNode === element) {
        const range = document.createRange();
        range.setStart(element, 0);
        range.setEndBefore(anchorElement);
        const contentRect = range.getBoundingClientRect();
        if (contentRect && contentRect.width > 0) {
          const contentWidth = contentRect.right - elementRect.left;
          if (contentWidth > 0 && contentWidth < elementRect.width) {
            elementRect.width = contentWidth;
          }
        }
      }
    } catch (exp) {}

    const anchorRect = anchorElement.getBoundingClientRect();

    // Offset calculation for hotspot position.
    const offsetX = anchorRect.left - elementRect.left;
    const offsetY = anchorRect.top - elementRect.top;

    let top = 0;
    let left = 0;
    let tooltipSize = 17 / 2;

    switch (tooltip.posX) {
      case 'left':
        left = (tooltip.offsetX + tooltipSize * 2) * -1;
        break;
      case 'right':
        left = elementRect.width + tooltip.offsetX;
        break;
    }

    switch (tooltip.posY) {
      case 'top':
        top = 0 + tooltip.offsetY;
        break;
      case 'bottom':
        top = elementRect.height - tooltipSize * 2 + tooltip.offsetY;
        break;
      case 'center':
        top = elementRect.height / 2 - tooltipSize + tooltip.offsetY;
        break;
    }

    if (hotspot) {
      hotspot.style.position = 'absolute';
      hotspot.style.top = top - offsetY + 'px';
      hotspot.style.left = left - offsetX + 'px';
    }
  }

  toOffset(value, fallback) {
    if (value === null || value === undefined || value === '') {
      return fallback;
    }
    const number = Number(value);
    return isFinite(number) ? number : fallback;
  }

  updateFilteredTooltips = () => {
    this.lastUrl = window.location.href;
    this.filteredTooltips = this.getFilteredTooltips();
    this.checkForTooltips();
  };

  getFilteredTooltips = () => {
    if (!this.tooltips) {
      return [];
    }

    const currentUrl = window.location.href;

    return this.tooltips.filter((tooltip) => {
      if (tooltip.pageRules && tooltip.pageRules.length > 0) {
        return checkPageRules(currentUrl, { pageRules: tooltip.pageRules });
      }

      if (!tooltip.page || tooltip.page.length === 0) {
        return true;
      }

      const passed = checkPageFilter(currentUrl, tooltip.page, tooltip.pageType);

      if (!passed) {
        return false;
      }
      return true;
    });
  };

  checkForTooltips = () => {
    for (let i = 0; i < this.filteredTooltips.length; i++) {
      const tooltip = this.filteredTooltips[i];

      try {
        const elements = querySelectorAllSafe(tooltip.selector);

        for (let j = 0; j < elements.length; j++) {
          const element = elements[j];

          if (element) {
            this.linkTooltip(element, tooltip);
          }
        }
      } catch (exp) {}
    }
  };

  load = () => {
    const self = this;

    // destroy() stops watching the page; make sure we watch it again.
    this.start();

    const sessionInstance = GleapSession.getInstance();

    const http = new XMLHttpRequest();
    http.open('GET', sessionInstance.apiUrl + '/config/' + sessionInstance.sdkKey + '/tooltips');
    http.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
    http.setRequestHeader('Api-Token', sessionInstance.sdkKey);
    try {
      http.setRequestHeader('Gleap-Id', sessionInstance.session.gleapId);
      http.setRequestHeader('Gleap-Hash', sessionInstance.session.gleapHash);
    } catch (exp) {}

    http.onerror = () => {
      console.error('Failed to fetch tooltips');
    };
    http.onreadystatechange = function (e) {
      if (http.readyState === 4) {
        if (http.status === 200) {
          try {
            self.tooltips = JSON.parse(http.responseText);
            self.updateFilteredTooltips();
          } catch (exp) {
            console.error('Failed to parse tooltips', exp);
          }
        }
      }
    };

    http.send();
  };
}
