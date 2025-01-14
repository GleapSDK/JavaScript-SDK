const localStorageKey = "gleap-tour-data";
const pointerContainerId = "copilot-pointer-container";
const styleId = "copilot-tour-styles";
const copilotInfoContainerId = "copilot-info-container";

function estimateReadTime(text) {
  const wordsPerSecond = 3.5; // Average reading speed
  const wordCount = text.split(/\s+/).filter((word) => word.length > 0).length;
  const readTimeInSeconds = Math.ceil(wordCount / wordsPerSecond);
  return readTimeInSeconds + 1.5;
}

function htmlToPlainText(html) {
  const tempDiv = document.createElement("div"); // Create a temporary div
  tempDiv.innerHTML = html; // Set the HTML content
  return tempDiv.textContent || ""; // Extract and return plain text
}

export default class GleapCopilotTours {
  productTourData = undefined;
  productTourId = undefined;
  currentActiveIndex = undefined;
  lastArrowPositionX = undefined;
  lastArrowPositionY = undefined;

  // GleapReplayRecorder singleton
  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new GleapCopilotTours();
      return this.instance;
    } else {
      return this.instance;
    }
  }

  constructor() {}

  startWithConfig(tourId, config, delay = 0) {
    // Prevent multiple tours from being started.
    if (this.productTourId) {
      return;
    }

    this.productTourId = tourId;
    this.productTourData = config;
    this.currentActiveIndex = 0;

    const self = this;

    if (delay > 0) {
      return setTimeout(() => {
        self.start();
      }, delay);
    } else {
      return this.start();
    }
  }

  loadUncompletedTour() {
    try {
      const data = JSON.parse(localStorage.getItem(localStorageKey));
      if (data?.tourData && data?.tourId) {
        return data;
      }
    } catch (e) {}

    return null;
  }

  storeUncompletedTour() {
    if (this.productTourId && this.productTourData) {
      try {
        let data = JSON.parse(
          JSON.stringify({
            tourData: this.productTourData,
            tourId: this.productTourId,
          })
        );

        data.tourData.steps = data.tourData.steps.slice(
          this.currentActiveIndex || 0,
          data.tourData.steps.length
        );

        console.log("Storing uncompleted tour:", data);

        localStorage.setItem(localStorageKey, JSON.stringify(data));
      } catch (e) {}
    } else {
      this.clearUncompletedTour();
    }
  }

  clearUncompletedTour() {
    try {
      localStorage.removeItem(localStorageKey);
    } catch (e) {}
  }

  updatePointerPosition(anchor) {
    const container = document.getElementById(pointerContainerId);
    if (!container) {
      return;
    }

    const infoBubble = container.querySelector("#info-bubble");

    // If no anchor, center on screen.
    if (!anchor) {
      const scrollX = window.scrollX || 0;
      const scrollY = window.scrollY || 0;

      // The center of the *viewport* in document coordinates:
      const centerX = scrollX + window.innerWidth / 2;
      const centerY = scrollY + window.innerHeight / 2;

      container.style.position = "absolute";
      container.style.left = `${centerX}px`;
      container.style.top = `${centerY}px`;
      container.style.transform = `translate(-50%, -50%)`;
      return;
    }

    // 1) Calculate the anchor’s position on the page (not just viewport).
    const anchorRect = anchor.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    // Suppose the arrow’s tip is ~15px from the top and left (tweak as needed).
    const arrowTipOffsetX = 15;
    const arrowTipOffsetY = 15;

    // Center of anchor:
    const anchorCenterX =
      anchorRect.left + anchorRect.width / 2 + window.scrollX;
    const anchorCenterY =
      anchorRect.top + anchorRect.height / 2 + window.scrollY;

    // We want the arrow’s tip at the anchorCenter.
    // So offset the pointer container so that (container’s top-left + arrowTipOffset) = anchor center
    const containerLeft = anchorCenterX - arrowTipOffsetX;
    const containerTop = anchorCenterY - arrowTipOffsetY;

    // Position the pointer container (arrow + bubble).
    container.style.left = `${containerLeft}px`;
    container.style.top = `${containerTop}px`;
    container.style.transform = ""; // no translate needed, or clear any you might have

    // 2) Check if the info bubble goes off the right edge
    if (infoBubble) {
      // Reset bubble style so we can measure it properly
      infoBubble.style.marginLeft = "10px"; // default to the right side
      infoBubble.style.marginRight = ""; // clear any previous override
      infoBubble.style.transform = "none";

      const bubbleRect = infoBubble.getBoundingClientRect();
      const bubbleRightEdge = bubbleRect.right;
      const windowWidth = window.innerWidth;

      // If bubble extends past the right edge by any amount, flip it to the left side
      if (bubbleRightEdge > windowWidth) {
        // Move bubble to the left side of the arrow
        // One approach: negative margin-left by the bubble’s width + some padding
        // Another approach: transform: translateX(-100%) etc.

        infoBubble.style.marginLeft = "";
        infoBubble.style.marginRight = "10px";
        // Or do something like:
        // infoBubble.style.transform = `translateX(-${bubbleRect.width + 10}px)`;
      }
    }

    console.log("Pointer placed at:", containerLeft, containerTop);
  }

  cleanup() {
    this.removePointerUI();
    this.clearUncompletedTour();
  }

  removePointerUI() {
    const container = document.getElementById(pointerContainerId);
    if (container) {
      container.remove();
    }

    // Remove style node.
    const styleNode = document.getElementById(styleId);
    if (styleNode) {
      styleNode.remove();
    }

    // Remove copilot info container.
    const copilotInfoContainer = document.getElementById(
      copilotInfoContainerId
    );
    if (copilotInfoContainer) {
      copilotInfoContainer.remove();
    }
  }

  setupCopilotTour() {
    // Inject CSS into the document head
    let styleNode = document.getElementById(styleId);
    if (!styleNode) {
      styleNode = document.createElement("style");
      styleNode.id = styleId;
      styleNode.type = "text/css";
      styleNode.textContent = `
        #${pointerContainerId} {
          position: absolute;
          top: 0;
          left: 0;
          display: flex;
          align-items: center;
          pointer-events: none;
          z-index: 9999;
          transition: transform 0.5s ease, top 0.5s ease, left 0.5s ease;;
        }
  
        #${pointerContainerId} svg {
          width: 20px;
          height: auto;
          fill: none;
        }
  
        #info-bubble {
          margin-left: 10px;
          padding: 10px 15px;
          border-radius: 20px;
          background-color: black;
          color: white;
          font-family: Arial, sans-serif;
          font-size: 14px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        }

        body::before {
          content: "";
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          pointer-events: all;
          z-index: 2147483610;
          box-sizing: border-box;
          border: 6px solid transparent;
          filter: blur(15px);
          border-image-slice: 1;
          border-image-source: linear-gradient(45deg, #2142e7, #e721b3);
          animation: animateBorder 4s infinite alternate ease-in-out;
        }
  
        body::after {
          content: "";
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          pointer-events: all;
          z-index: 2147483610;
          opacity: 0.5;
          box-sizing: border-box;
          border: 2px solid transparent;
          border-image-slice: 1;
          border-image-source: linear-gradient(45deg, #2142e7, #e721b3);
          animation: animateBorder 4s infinite alternate ease-in-out;
        }
  
        @keyframes animateBorder {
          0% {
            border-image-source: linear-gradient(45deg, #2142e7, #e721b3);
          }
          50% {
            border-image-source: linear-gradient(135deg, #e721b3, #ff8a00);
          }
          100% {
            border-image-source: linear-gradient(225deg, #ff8a00, #2142e7);
          }
        }

        .copilot-info-container {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 2147483610;
          background: #fff;
          padding: 5px;
          padding-left: 10px;
          border-radius: 10px;
          box-shadow: 0 0 20px 0 #e721b263;
          font-family: sans-serif;
          font-size: 13px;
          color: #000;
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid #e721b3;
        }

        .copilot-info-container svg {
          width: 24px;
          height: 24px;
        }
      `;
      document.head.appendChild(styleNode);
    }

    // Create the container div
    const container = document.createElement("div");
    container.id = pointerContainerId;
    container.style.opacity = 0;

    // Create the SVG mouse pointer
    const svgMouse = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    svgMouse.setAttribute("viewBox", "0 0 380 476");
    svgMouse.innerHTML =
      '<path d="M352.595 268.315L352.581 268.302L352.566 268.29L78.6092 24.7278C71.6245 18.433 62.5487 15 53.2 15C32.1157 15 15 32.1157 15 53.2V424C15 444.34 31.4714 461 52 461C62.6797 461 72.8089 456.467 79.8863 448.38C79.8871 448.379 79.8879 448.378 79.8886 448.378L180.804 333.1H327.9C348.384 333.1 365 316.484 365 296C365 285.404 360.46 275.344 352.595 268.315Z" fill="black" stroke="white" stroke-width="30"/>';

    // Create the info bubble
    const infoBubble = document.createElement("div");
    infoBubble.id = "info-bubble";
    infoBubble.textContent = "";

    // Append elements
    container.appendChild(svgMouse);
    container.appendChild(infoBubble);
    document.body.appendChild(container);
  }

  start() {
    const config = this.productTourData;
    if (!config) {
      return;
    }

    // Setup the copilot tour.
    this.setupCopilotTour();

    // Render the first step.
    this.renderNextStep();
  }

  renderNextStep() {
    const config = this.productTourData;
    const steps = config.steps;
    const self = this;

    // Check if we have reached the end of the tour.
    if (this.currentActiveIndex >= steps.length) {
      this.cleanup();
      return;
    }

    const currentStep = steps[this.currentActiveIndex];
    const element = document.querySelector(currentStep.selector);

    // Wait for the pointer to be rendered. (by checking if the pointer container exists)
    setTimeout(() => {
      this.updatePointerPosition(element);
    }, 100);

    const message =
      currentStep && currentStep.message
        ? htmlToPlainText(currentStep.message)
        : "🤔";

    // Set content of info bubble.
    document.getElementById("info-bubble").textContent = message;
    document.getElementById(pointerContainerId).style.opacity = 1;

    // Estimate readtime in seconds.
    const readTime = estimateReadTime(message);

    // Automatically move to next step after 3 seconds.
    setTimeout(() => {
      self.currentActiveIndex++;
      self.renderNextStep();
      self.storeUncompletedTour();

      if (currentStep.mode === "CLICK") {
        // Perform click on element.
        setTimeout(() => {
          try {
            element.click();
          } catch (e) {}
        }, 1000 * 60);
      }
    }, readTime * 1000);
  }
}
