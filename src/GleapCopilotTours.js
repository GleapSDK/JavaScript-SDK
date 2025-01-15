const localStorageKey = "gleap-tour-data";
const pointerContainerId = "copilot-pointer-container";
const styleId = "copilot-tour-styles";
const copilotInfoContainerId = "copilot-info-container";

function estimateReadTime(text) {
  const wordsPerSecond = 3.6; // Average reading speed
  const wordCount = text.split(/\s+/).filter((word) => word.length > 0).length;
  const readTimeInSeconds = Math.ceil(wordCount / wordsPerSecond);
  return readTimeInSeconds + 1;
}

function htmlToPlainText(html) {
  const tempDiv = document.createElement("div"); // Create a temporary div
  tempDiv.innerHTML = html; // Set the HTML content
  return tempDiv.textContent || ""; // Extract and return plain text
}

function scrollToElement(element) {
  if (element) {
    element.scrollIntoView({
      behavior: "smooth", // Ensures smooth scrolling
      block: "center", // Aligns the element in the center of the viewport
      inline: "center", // Aligns inline elements in the center horizontally
    });
  }
}

function performClickAnimation(posX, posY) {
  // Create a new div element to act as the wave
  const wave = document.createElement("div");

  // Apply the CSS class for styling
  wave.className = "click-wave";

  // Set the position dynamically
  wave.style.left = `${posX - 17}px`;
  wave.style.top = `${posY - 17}px`;

  // Append the wave to the body
  document.body.appendChild(wave);

  // Remove the wave after the animation ends
  setTimeout(() => {
    wave.remove();
  }, 800);
}

function waitForElement(selector, timeout = 5000) {
  const pollInterval = 100;
  const maxAttempts = timeout / pollInterval;
  let attempts = 0;

  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      const element = document.querySelector(selector);
      if (element) {
        clearInterval(interval);
        resolve(element);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        reject(new Error(`Element not found for selector: ${selector}`));
      }
      attempts++;
    }, pollInterval);
  });
}

function smoothScrollToY(yPosition) {
  const viewportHeight = window.innerHeight;
  const targetScrollPosition = yPosition - viewportHeight / 2;

  window.scrollTo({
    top: targetScrollPosition,
    behavior: "smooth", // Ensures smooth scrolling
  });
}

export default class GleapCopilotTours {
  productTourData = undefined;
  productTourId = undefined;
  currentActiveIndex = undefined;
  lastArrowPositionX = undefined;
  lastArrowPositionY = undefined;
  onCompleteCallback = undefined;

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

  constructor() {
    const self = this;
    // Add on window resize listener.
    window.addEventListener("resize", () => {
      // Check if we currently have a tour.
      if (
        self.productTourId &&
        self.currentActiveIndex >= 0 &&
        self.productTourData &&
        self.productTourData.steps
      ) {
        const steps = self.productTourData.steps;
        const currentStep = steps[self.currentActiveIndex];

        if (
          currentStep &&
          currentStep.selector &&
          currentStep.selector !== ""
        ) {
          // Wait for the element to be rendered.
          self.updatePointerPosition(
            document.querySelector(currentStep.selector)
          );
        }
      }
    });
  }

  startWithConfig(tourId, config, onCompleteCallback = undefined) {
    // Prevent multiple tours from being started.
    if (this.productTourId) {
      return;
    }

    this.productTourId = tourId;
    this.productTourData = config;
    this.currentActiveIndex = 0;
    this.onCompleteCallback = onCompleteCallback;
    this.start();
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
      localStorage.removeItem(localStorageKey);
    }
  }

  updatePointerPosition(anchor) {
    try {
      const container = document.getElementById(pointerContainerId);
      if (!container) {
        return;
      }

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

        smoothScrollToY(centerY);

        return;
      }

      // 1) Calculate the anchor’s position on the page (not just viewport).
      const anchorRect = anchor.getBoundingClientRect();

      // Center of anchor:
      let anchorCenterX =
        anchorRect.left + anchorRect.width / 2 + window.scrollX;
      let anchorCenterY =
        anchorRect.top + anchorRect.height / 2 + window.scrollY;

      let containerWidthSpace = 350;
      if (containerWidthSpace > window.innerWidth - 40) {
        containerWidthSpace = window.innerWidth - 40;
      }

      const windowWidth = window.innerWidth;
      const isTooFarRight =
        anchorCenterX + containerWidthSpace > windowWidth - 20;

      container.style.transform = "";

      if (isTooFarRight) {
        container.classList.add("copilot-pointer-container-right");

        // Reverse the arrow direction and recalculate the position.
        container.style.right = `${windowWidth - anchorCenterX}px`;
        container.style.top = `${anchorCenterY}px`;
        container.style.left = "";
      } else {
        container.classList.remove("copilot-pointer-container-right");
        container.style.left = `${anchorCenterX}px`;
        container.style.top = `${anchorCenterY}px`;
      }

      scrollToElement(anchor);
    } catch (e) {
      console.error("Error updating pointer position:", e);
    }
  }

  cleanup() {
    const container = document.getElementById(pointerContainerId);
    if (container) {
      container.remove();
    }

    const copilotInfoContainer = document.getElementById(
      copilotInfoContainerId
    );
    if (copilotInfoContainer) {
      copilotInfoContainer.remove();
    }

    setTimeout(() => {
      const styleNode = document.getElementById(styleId);
      if (styleNode) {
        styleNode.remove();
      }
    }, 1000);
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
          align-items: flex-start;
          pointer-events: none;
          z-index: 9999;
          transition: all 0.5s ease;;
        }
  
        #${pointerContainerId} svg {
          width: 20px;
          height: auto;
          fill: none;
        }
                  
        .${pointerContainerId}-right {
          left: auto;
          right: 0;
          flex-direction: row-reverse;
        }

        .${pointerContainerId}-right svg {
          transform: scaleX(-1);
        }

        .${pointerContainerId}-right #info-bubble {
          margin-left: 0px;
          margin-right: 5px;
        }
  
        #info-bubble {
          margin-left: 5px;
          margin-top: 18px;
          padding: 10px 15px;
          border-radius: 20px;
          background-color: black;
          color: white;
          font-family: Arial, sans-serif;
          font-size: 14px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        }

        .copilot-info-container {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 2147483612;
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
          max-width: min(330px, 100vw - 40px);
        }

        .copilot-info-container svg {
          width: 24px;
          height: 24px;
          flex-shrink: 0;
        }

        .click-wave {
          position: absolute;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background-color: rgba(0, 0, 0, 0.5);
          pointer-events: none;
          z-index: 2147483611;
          animation: click-wave-animation 0.8s ease forwards;
        }

        @keyframes click-wave-animation {
          0% {
            transform: scale(0.2);
            opacity: 1;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }

        ${
          this.productTourData.gradient
            ? `body::before {
          content: "";
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          pointer-events: all;
          z-index: 2147483610;
          box-sizing: border-box;
          border: 20px solid transparent;
          filter: blur(28px);
          border-image-slice: 1;
          border-image-source: linear-gradient(45deg, #ED5587, #FBE6A9, #a6e3f8, #C294F2);
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
          border-image-source: linear-gradient(45deg, #ED5587, #FBE6A9, #a6e3f8, #C294F2);
        }`
            : ""
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

    // Show copilot joined info.

    // Render the first step.
    this.renderNextStep();
  }

  renderNextStep() {
    const config = this.productTourData;
    const steps = config.steps;

    // Check if we have reached the end of the tour.
    if (this.currentActiveIndex >= steps.length) {
      this.cleanup();
      if (this.onCompleteCallback) {
        this.onCompleteCallback();
      }
      return;
    }

    const currentStep = steps[this.currentActiveIndex];

    const handleStep = (element) => {
      const gotToNextStep = () => {
        this.currentActiveIndex++;
        this.storeUncompletedTour();

        if (currentStep.mode === "CLICK" && element) {
          const rect = element.getBoundingClientRect();

          // Get current scroll position.
          const scrollX = window.scrollX || 0;
          const scrollY = window.scrollY || 0;

          performClickAnimation(
            rect.left + rect.width / 2 + scrollX,
            rect.top + rect.height / 2 + scrollY
          );

          element.click();
        }

        this.renderNextStep();
      };

      // Update pointer position, even if element is null.
      this.updatePointerPosition(element);

      const message = currentStep?.message
        ? htmlToPlainText(currentStep.message)
        : "🤔";

      // Set content of info bubble.
      document.getElementById("info-bubble").textContent = message;
      document.getElementById(pointerContainerId).style.opacity = 1;

      // Estimate read time in seconds.
      const readTime = estimateReadTime(message);

      console.log("Read time:", currentStep);

      // Read the message.
      if (currentStep.voice && currentStep.voice.length > 0) {
        try {
          const audio = new Audio(currentStep.voice);

          // Add an event listener for the 'ended' event
          audio.addEventListener("ended", () => {
            setTimeout(() => {
              gotToNextStep();
            }, 1000);
          });

          // Play the audio
          audio.play();
        } catch (error) {
          setTimeout(() => {
            gotToNextStep();
          }, readTime * 1000);
        }
      } else {
        setTimeout(() => {
          gotToNextStep();
        }, readTime * 1000);
      }
    };

    const elementPromise = currentStep.selector
      ? waitForElement(currentStep.selector)
      : Promise.resolve(null);

    elementPromise.then(handleStep).catch(() => handleStep(null));
  }
}
