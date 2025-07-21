import {
  arrow,
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
} from "@floating-ui/dom";
import { GleapSession } from "./Gleap";
import { loadIcon } from "./UI";
import { checkPageFilter } from "./GleapPageFilter";

export default class GleapTooltipManager {
  tooltips = [];
  filteredTooltips = [];
  lastUrl = null;
  elementToFloatingUIMap = new WeakMap();
  elementToTooltipMap = new WeakMap();
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
        if (tooltip.selector && node.matches(tooltip.selector)) {
          this.linkTooltip(node, tooltip);
        }
      });
    }
  }

  start() {
    const self = this;

    if (!window) {
      return;
    }

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

    const handleResizeThrottled = throttle(
      self.updateHotspotPositions.bind(self),
      250
    );
    window.addEventListener("resize", handleResizeThrottled);

    window.requestAnimationFrame(() => {
      this.observer = new MutationObserver((mutations) => {
        if (self.lastUrl !== window.location.href) {
          self.lastUrl = window.location.href;
          self.filteredTooltips = self.getFilteredTooltips();
        }

        mutations.forEach((mutation) => {
          // Check for added nodes
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              self.processNodeInsertion(node);
            }
          });

          // Check for removed nodes
          mutation.removedNodes.forEach((node) => {
            if (
              node.nodeType === Node.ELEMENT_NODE &&
              this.elementToFloatingUIMap.has(node)
            ) {
              const floatingUI = this.elementToFloatingUIMap.get(node);
              if (floatingUI) {
                if (floatingUI.tooltip) {
                  floatingUI.tooltip.remove();
                }
                floatingUI.cleanup();

                this.elementToFloatingUIMap.delete(node);
              }
            }

            if (this.elementToTooltipMap.has(node)) {
              this.elementToTooltipMap.delete(node);
            }
          });
        });
      });

      // Start observing the document for changes.
      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    });
  }

  updateHotspotPositions() {
    const elements = document.querySelectorAll(
      `[data-gleap-tooltip-mode='hotspot']`
    );
    elements.forEach((element) => {
      const tooltip = this.elementToTooltipMap.get(element);
      if (tooltip) {
        this.repositionHotspot(element, tooltip);
      }
    });
  }

  createTooltip(element, tooltipText, tooltipData) {
    // Create tooltip element
    const tooltip = document.createElement("div");
    tooltip.className = "gleap-tooltip";
    tooltip.innerHTML = `<div class="gleap-tooltip-inner">
            ${tooltipText}
            <div class="gleap-tooltip-arrow">
                <svg width="116" height="56" viewBox="0 0 116 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M57.75 0.74998L115.5 0.680177L66.8726 49.3076C61.7958 54.3844 53.5646 54.3844 48.4878 49.3076L4.05618e-05 0.819784L57.75 0.74998Z" fill="white"/>
                </svg>
            </div>
        </div>`;
    document.body.appendChild(tooltip);

    // Create a Popper instance with arrow and offset

    const arrowEl = tooltip.querySelector(".gleap-tooltip-arrow");
    const cleanup = autoUpdate(element, tooltip, () => {
      computePosition(element, tooltip, {
        placement: tooltipData.posX === "left" ? "left" : "right",
        middleware: [offset(10), flip(), shift(), arrow({ element: arrowEl })],
      }).then(({ x, y, middlewareData, placement }) => {
        try {
          Object.assign(tooltip.style, {
            left: `${x}px`,
            top: `${y}px`,
          });

          if (middlewareData.arrow) {
            let arrowSize = 20; // Arrow size should be consistent with the border width used in CSS
            let arrowPos = { left: "", top: "", transform: "" };

            if (middlewareData.arrow.x != null) {
              arrowPos.left = `${middlewareData.arrow.x}px`;
              if (placement === "bottom") {
                arrowPos.transform = "translateY(-7px) rotate(180deg)";
                arrowPos.top = `${-arrowSize}px`; // Move arrow outside the tooltip
              } else if (placement === "top") {
                arrowPos.transform = "translateY(7px) rotate(0deg)";
                arrowPos.top = `100%`; // Adjust based on the tooltip's height
              }
            }
            if (middlewareData.arrow.y != null) {
              arrowPos.top = `${middlewareData.arrow.y}px`;
              if (placement === "right") {
                arrowPos.transform = "translateX(-7px) rotate(90deg)";
                arrowPos.left = `${-arrowSize}px`; // Move arrow outside the tooltip
              } else if (placement === "left") {
                arrowPos.transform = "translateX(7px) rotate(270deg)";
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
      tooltip.style.visibility = "visible";
      tooltip.style.opacity = "1";
      tooltip.style.pointerEvents = "auto";
    }

    function hide() {
      hideTimeout = setTimeout(() => {
        tooltip.style.opacity = "0";

        setTimeout(() => {
          tooltip.style.visibility = "hidden";
          tooltip.style.pointerEvents = "none";
        }, 200);
      }, 500);
    }

    // Event listeners to show/hide the tooltip
    element.addEventListener("mouseenter", show);
    element.addEventListener("mouseleave", hide);
    tooltip.addEventListener("mouseenter", show);
    tooltip.addEventListener("mouseleave", hide);

    return {
      cleanup,
      tooltip,
    };
  }

  canEmbed(element) {
    const voidElements = new Set([
      "area",
      "base",
      "br",
      "embed",
      "hr",
      "img",
      "input",
      "source",
      "track",
      "wbr",
      "canvas",
    ]);

    return element && !voidElements.has(element.tagName.toLowerCase());
  }

  linkTooltip = (element, tooltip) => {
    if (element.hasAttribute("data-gleap-tooltip")) {
      return;
    }

    const nextId = this.nextId++;
    element.setAttribute("data-gleap-tooltip", nextId);
    if (element) {
      var tooltipElem = null;

      if (tooltip.mode === "hotspot") {
        // Create hotspot container.
        const hotspotContainer = document.createElement("div");
        hotspotContainer.setAttribute("data-gleap-tooltip-anchor", nextId);
        hotspotContainer.classList.add("gleap-tooltip-anchor");
        element.setAttribute("data-gleap-tooltip-mode", "hotspot");

        if (this.canEmbed(element)) {
          if (element.firstChild) {
            element.insertBefore(hotspotContainer, element.firstChild);
          } else {
            element.appendChild(hotspotContainer);
          }
        } else {
          element.parentNode.insertBefore(
            hotspotContainer,
            element.nextSibling
          );
        }

        // Create hotspot.
        const hotspot = document.createElement("div");
        hotspot.classList.add("gleap-tooltip-hotspot");
        hotspot.setAttribute("data-gleap-tooltip-hotspot", nextId);

        hotspot.innerHTML = `${loadIcon(tooltip.icon, tooltip.color)}${
          tooltip.animated
            ? `<div style="background-color: ${tooltip.color}" class="gleap-tooltip-hotspot-animation"></div>`
            : ""
        }`;
        hotspotContainer.appendChild(hotspot);

        // Update hotspot position.
        this.repositionHotspot(element, tooltip);

        tooltipElem = hotspot;
        this.elementToTooltipMap.set(element, tooltip);
      } else {
        tooltipElem = element;
      }

      const floatingUIInstance = this.createTooltip(
        tooltipElem,
        tooltip.html,
        tooltip
      );

      this.elementToFloatingUIMap.set(element, floatingUIInstance);
    }
  };

  destroy() {
    // Disconnect the MutationObserver if it exists.
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    // Remove the window resize event listener if it was stored.
    // (In start() you can assign the listener to a class property, e.g., this.resizeListener.)
    if (this.resizeListener) {
      window.removeEventListener("resize", this.resizeListener);
      this.resizeListener = null;
    }

    // Remove all tooltip elements created by Gleap.
    const tooltipElements = document.querySelectorAll(".gleap-tooltip");
    tooltipElements.forEach((tooltip) => tooltip.remove());

    // Remove any tooltip anchors and hotspots.
    const anchors = document.querySelectorAll("[data-gleap-tooltip-anchor]");
    anchors.forEach((anchor) => anchor.remove());
    const hotspots = document.querySelectorAll("[data-gleap-tooltip-hotspot]");
    hotspots.forEach((hotspot) => hotspot.remove());

    // Clear internal references.
    this.elementToFloatingUIMap = new WeakMap();
    this.elementToTooltipMap = new WeakMap();
    this.tooltips = [];
    this.filteredTooltips = [];
  }

  repositionHotspot(element, tooltip) {
    if (!element || !tooltip) {
      return;
    }

    const tooltipId = element.getAttribute("data-gleap-tooltip");
    if (!tooltipId) {
      return;
    }

    const hotspot = document.querySelector(
      `[data-gleap-tooltip-hotspot="${tooltipId}"]`
    );
    if (!hotspot) {
      return;
    }

    if (!tooltip.posX) {
      tooltip.posX = "right";
    }
    if (!tooltip.posY) {
      tooltip.posY = "center";
    }
    if (!tooltip.offsetX) {
      tooltip.offsetX = 4;
    }
    if (!tooltip.offsetY) {
      tooltip.offsetY = 0;
    }

    var elementRect = element.getBoundingClientRect();

    try {
      // Improve width calculation for text elements.
      var range = document.createRange();
      range.selectNodeContents(element);
      const style = window.getComputedStyle(element);
      const fixedWidth =
        range.getBoundingClientRect().width + parseFloat(style.paddingLeft);
      if (fixedWidth < elementRect.width) {
        elementRect.width = fixedWidth;
      }
    } catch (exp) {}

    const anchorElement = document.querySelector(
      `[data-gleap-tooltip-anchor="${tooltipId}"]`
    );
    const anchorRect = anchorElement.getBoundingClientRect();

    // Offset calculation for hotspot position.
    const offsetX = anchorRect.left - elementRect.left;
    const offsetY = anchorRect.top - elementRect.top;

    let top = 0;
    let left = 0;
    let tooltipSize = 17 / 2;

    switch (tooltip.posX) {
      case "left":
        left = (tooltip.offsetX + tooltipSize * 2) * -1;
        break;
      case "right":
        left = elementRect.width + tooltip.offsetX;
        break;
    }

    switch (tooltip.posY) {
      case "top":
        top = 0 + tooltip.offsetY;
        break;
      case "bottom":
        top = elementRect.height - tooltipSize * 2 + tooltip.offsetY;
        break;
      case "center":
        top = elementRect.height / 2 - tooltipSize + tooltip.offsetY;
        break;
    }

    if (hotspot) {
      hotspot.style.position = "absolute";
      hotspot.style.top = top - offsetY + "px";
      hotspot.style.left = left - offsetX + "px";
    }
  }

  updateFilteredTooltips = () => {
    this.filteredTooltips = this.getFilteredTooltips();
    this.checkForTooltips();
  };

  getFilteredTooltips = () => {
    if (!this.tooltips) {
      return [];
    }

    const currentUrl = window.location.href;

    return this.tooltips.filter((tooltip) => {
      if (!tooltip.page || tooltip.page.length === 0) {
        return true;
      }

      const passed = checkPageFilter(
        currentUrl,
        tooltip.page,
        tooltip.pageType
      );

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
        const elements = document.querySelectorAll(tooltip.selector);

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
    const sessionInstance = GleapSession.getInstance();

    const http = new XMLHttpRequest();
    http.open(
      "GET",
      sessionInstance.apiUrl + "/config/" + sessionInstance.sdkKey + "/tooltips"
    );
    http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    http.setRequestHeader("Api-Token", sessionInstance.sdkKey);
    try {
      http.setRequestHeader("Gleap-Id", sessionInstance.session.gleapId);
      http.setRequestHeader("Gleap-Hash", sessionInstance.session.gleapHash);
    } catch (exp) {}

    http.onerror = () => {
      console.error("Failed to fetch tooltips");
    };
    http.onreadystatechange = function (e) {
      if (http.readyState === 4) {
        if (http.status === 200) {
          try {
            self.tooltips = JSON.parse(http.responseText);
            self.updateFilteredTooltips();
          } catch (exp) {
            console.error("Failed to parse tooltips", exp);
          }
        }
      }
    };

    http.send();
  };
}
