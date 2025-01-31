import { GleapTranslationManager } from "./Gleap";
import { loadIcon } from "./UI";

const localStorageKey = "gleap-tour-data";
const pointerContainerId = "copilot-pointer-container";
const styleId = "copilot-tour-styles";
const copilotJoinedContainerId = "copilot-joined-container";
const copilotInfoBubbleId = "copilot-info-bubble";

const arrowRightIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M438.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-160-160c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L338.8 224 32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l306.7 0L233.4 393.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l160-160z"/></svg>`;

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

async function canPlayAudio() {
  // Create an audio element and set a silent audio source
  const audio = new Audio(
    "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAABCxAgAEABAAZGF0YQAAAAA="
  );

  try {
    // Attempt to play the silent audio
    await audio.play();
    // If no exception is thrown, autoplay works
    return true;
  } catch (err) {
    // If an error is thrown, autoplay is restricted
    return false;
  }
}

export default class GleapCopilotTours {
  productTourData = undefined;
  productTourId = undefined;
  currentActiveIndex = undefined;
  lastArrowPositionX = undefined;
  lastArrowPositionY = undefined;
  onCompleteCallback = undefined;
  audioMuted = false;
  currentAudio = undefined;

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
            document.querySelector(currentStep.selector),
            currentStep
          );
        }
      }
    });
  }

  disable() {
    this.cleanup();

    this.disabled = true;
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

        localStorage.setItem(localStorageKey, JSON.stringify(data));
      } catch (e) {}
    } else {
      localStorage.removeItem(localStorageKey);
    }
  }

  updatePointerPosition(anchor, currentStep) {
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

      if (currentStep?.mode === "INPUT") {
        anchorCenterX -= anchorRect.width / 2 - 10;
        anchorCenterY += anchorRect.height / 2 - 5;
      }

      let containerWidthSpace = 350;
      if (containerWidthSpace > window.innerWidth - 40) {
        containerWidthSpace = window.innerWidth - 40;
      }

      const windowWidth = window.innerWidth;
      const isTooFarRight =
        anchorCenterX + containerWidthSpace > windowWidth - 20;

      container.style.transform = "";
      container.style.left = `${anchorCenterX}px`;
      container.style.top = `${anchorCenterY}px`;

      if (isTooFarRight) {
        container.classList.add("copilot-pointer-container-right");
      } else {
        container.classList.remove("copilot-pointer-container-right");
      }

      scrollToElement(anchor);
    } catch (e) {}
  }

  cleanup() {
    // Add fade out class to body.
    document.body.classList.add("gl-copilot-fade-out");

    setTimeout(() => {
      const container = document.getElementById(pointerContainerId);
      if (container) {
        container.remove();
      }

      const copilotInfoContainer = document.getElementById(
        copilotJoinedContainerId
      );
      if (copilotInfoContainer) {
        copilotInfoContainer.remove();
      }

      const styleNode = document.getElementById(styleId);
      if (styleNode) {
        styleNode.remove();
      }

      // Remove fade out class from body.
      document.body.classList.remove("gl-copilot-fade-out");
    }, 800);
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
          z-index: 2147483610;
          transition: all 0.5s ease;
        }

        .${pointerContainerId}-clickmode {
          cursor: pointer;
          pointer-events: all !important;
        }

        .${pointerContainerId}-clickmode #${copilotInfoBubbleId}-content {
          display: flex !important;
        }

        .${pointerContainerId}-clickmode svg {
          display: none !important;
        }
  
        #${pointerContainerId} svg {
          width: 20px;
          height: auto;
          fill: none;
        }
  
        #${copilotInfoBubbleId} {
          position: relative;
        }

        .${pointerContainerId}-right #${copilotInfoBubbleId}-content-container {
          left: auto !important;
          right: 0px !important;
        }

        #${copilotInfoBubbleId}-content-container {
          position: absolute;
          top: 0px;
          left: 0px;
          min-width: min(300px, 80vw);
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        #${copilotInfoBubbleId}-content svg {
          width: 16px;
          height: 16px;
          display: inline-block !important;
          margin-left: 5px;
        }

        #${copilotInfoBubbleId}-content {
          margin-top: 18px;
          margin-left: 5px;
          padding: 10px 15px;
          border-radius: 20px;
          background-color: black;
          color: white;
          font-family: Arial, sans-serif;
          font-size: 14px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
          max-width: 100%;
          white-space: normal;
          overflow-wrap: break-word;
          word-break: normal;
          hyphens: none;
        }

        .${pointerContainerId}-right #${copilotInfoBubbleId}-content {
          margin-top: 30px;
          margin-left: 0px;
          margin-right: 5px;
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

        @keyframes slideInFromTop {
          0% {
            transform: translateY(-100%);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .${copilotJoinedContainerId} {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 2147483610;
          background: #fff;
          padding: 6px;
          border-radius: 10px;
          box-shadow: 0 0 20px 0 #C294F2;
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(192, 146, 242, 0.5);
          animation: slideInFromTop 0.5s ease-out forwards;
        }

        .${copilotJoinedContainerId} span {
          font-size: 13px;
          color: #000;
          font-family: sans-serif;
        }

        .${copilotJoinedContainerId}-avatar {
          width: 24px;
          height: 24px;
          flex-shrink: 0;
          border-radius: 6px;
        }

        .${copilotJoinedContainerId}-mute {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .${copilotJoinedContainerId}-mute svg {
          width: 20px;
          height: auto;
          cursor: pointer;
          animation: pulsate 2s infinite;
        }

        .${copilotJoinedContainerId}-mute svg:hover {
          opacity: 0.8;
        }

        @keyframes pulsate {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes glCoFadeIn {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }

        @keyframes glCoFadeOut {
          0% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }

        body.gl-copilot-fade-out::before,
        body.gl-copilot-fade-out::after,
        body.gl-copilot-fade-out #${copilotJoinedContainerId} {
          animation: glCoFadeOut 0.8s ease-out forwards;
        }
          
        ${
          this.productTourData?.playVoice ?? true
            ? ""
            : `
          .${copilotJoinedContainerId}-mute {
            display: none;
          }
        `
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
          z-index: 2147483609;
          box-sizing: border-box;
          border: 18px solid transparent;
          filter: blur(25px);
          border-image-slice: 1;
          border-image-source: linear-gradient(45deg, #ED5587, #FBE6A9, #a6e3f8, #C294F2);
          animation: glCoFadeIn 1.5s ease-out forwards;
        }
  
        body::after {
          content: "";
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          pointer-events: all;
          z-index: 2147483609;
          opacity: 0.5;
          box-sizing: border-box;
          border: 3px solid transparent;
          border-image-slice: 1;
          border-image-source: linear-gradient(45deg, #ED5587, #FBE6A9, #a6e3f8, #C294F2);
          animation: glCoFadeIn 1.5s ease-out forwards;
        }`
            : `body::after {
          content: "";
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          pointer-events: all;
          z-index: 2147483609;
          opacity: 0;
        }`
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
    infoBubble.id = copilotInfoBubbleId;
    infoBubble.innerHTML = `<div id='${copilotInfoBubbleId}-content-container'><div id='${copilotInfoBubbleId}-content'></div></div>`;

    // Add info container.
    const copilotInfoContainer = document.createElement("div");
    copilotInfoContainer.id = copilotJoinedContainerId;
    copilotInfoContainer.classList.add(copilotJoinedContainerId);
    copilotInfoContainer.innerHTML = `
      <img class="${copilotJoinedContainerId}-avatar" src="${
      this.productTourData?.kaiAvatar
    }" />
      <span>${this.productTourData?.kaiSlug}</span>
      <div class="${copilotJoinedContainerId}-mute">
        ${loadIcon(this.audioMuted ? "unmute" : "mute")}
      </div>
    `;
    document.body.appendChild(copilotInfoContainer);

    const self = this;

    // Add on click listener to mute/unmute audio.
    document
      .querySelector(`.${copilotJoinedContainerId}-mute`)
      .addEventListener("click", () => {
        self.audioMuted = !self.audioMuted;

        if (self.currentAudio) {
          self.currentAudio.muted = self.audioMuted;
        }

        document.querySelector(`.${copilotJoinedContainerId}-mute`).innerHTML =
          loadIcon(self.audioMuted ? "unmute" : "mute");
      });

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

    // Check if audio is supported.
    canPlayAudio().then((supported) => {
      this.audioMuted = !supported;

      // Setup the copilot tour.
      this.setupCopilotTour();

      setTimeout(() => {
        // Render the first step.
        this.renderNextStep();
      }, 1500);
    });
  }

  completeTour(success = true) {
    this.cleanup();
    if (this.onCompleteCallback) {
      this.onCompleteCallback(success);
    }
  }

  renderNextStep() {
    if (this.disabled) {
      return;
    }

    const self = this;
    const config = this.productTourData;
    const steps = config.steps;

    // Check if we have reached the end of the tour.
    if (this.currentActiveIndex >= steps.length) {
      setTimeout(() => {
        this.completeTour();
      }, 500);
      return;
    }

    const currentStep = steps[this.currentActiveIndex];

    const handleStep = (element) => {
      document.getElementById(pointerContainerId).style.display = "flex";

      // If we have a selector but the element was null, close the tour.
      if (currentStep.selector && currentStep.selector.length > 0 && !element) {
        this.completeTour(false);
        return;
      }

      const gotToNextStep = () => {
        if (currentStep.mode === "INPUT" && element) {
          // Wait for text to be entered. Continue tour on enter. element is the input.
          function handleClick() {
            document
              .querySelector(`#${pointerContainerId}`)
              .classList.remove("copilot-pointer-container-clickmode");

            // Remove the highlight from the input fields.
            element.classList.remove("gleap-input-highlight");

            // Hide the info bubble.
            document.getElementById(pointerContainerId).style.display = "none";

            self.currentActiveIndex++;
            self.storeUncompletedTour();
            self.renderNextStep();
          }

          function handleInputEvent(e) {
            if (e.target.value.length === 0) return;

            const cursor = document.getElementById(
              `${copilotInfoBubbleId}-content`
            );
            if (!cursor) return;

            cursor.innerHTML = `${GleapTranslationManager.translateText(
              `next`
            )} ${arrowRightIcon}`;
            cursor.addEventListener("click", handleClick, { once: true });

            // Add highlight to the input fields. red shadow glow.
            element.classList.add("gleap-input-highlight");

            document
              .querySelector(`#${pointerContainerId}`)
              .classList.add("copilot-pointer-container-clickmode");

            // Remove the input event listener after execution
            element.removeEventListener("input", handleInputEvent);
          }

          element.addEventListener("input", handleInputEvent);

          // Focus on the input.
          element.addEventListener("blur", () => {
            element.focus();
          });

          element.focus();

          return;
        }

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
      this.updatePointerPosition(element, currentStep);

      const message = currentStep?.message
        ? htmlToPlainText(currentStep.message)
        : "🤔";

      // Set content of info bubble.
      document.getElementById(`${copilotInfoBubbleId}-content`).textContent =
        message;
      document.getElementById(pointerContainerId).style.opacity = 1;

      // Estimate read time in seconds.
      const readTime = estimateReadTime(message);

      const continueWithNoAudio = () => {
        this.currentAudio = undefined;

        setTimeout(() => {
          gotToNextStep();
        }, readTime * 1000);
      };

      // Read the message.
      if (currentStep.voice && currentStep.voice.length > 0) {
        this.currentAudio = new Audio(currentStep.voice);

        if (this.audioMuted) {
          this.currentAudio.muted = true;
        }

        // Add an event listener for the 'ended' event
        this.currentAudio.addEventListener("ended", () => {
          setTimeout(() => {
            gotToNextStep();
          }, 1000);
        });

        // Play the audio
        this.currentAudio
          .play()
          .then(() => {})
          .catch((error) => {
            continueWithNoAudio();
          });
      } else {
        continueWithNoAudio();
      }
    };

    const elementPromise = currentStep.selector
      ? waitForElement(currentStep.selector)
      : Promise.resolve(null);

    elementPromise.then(handleStep).catch(() => handleStep(null));
  }
}
