import { GleapConfigManager, GleapTranslationManager } from "./Gleap";
import { calculateContrast, loadIcon } from "./UI";

const localStorageKey = "gleap-tour-data";
const pointerContainerId = "copilot-pointer-container";
const styleId = "copilot-tour-styles";
const copilotJoinedContainerId = "copilot-joined-container";

function estimateReadTime(text) {
  if (typeof window === "undefined") return;

  const wordsPerSecond = 3.6; // Average reading speed
  const wordCount = text.split(/\s+/).filter((word) => word.length > 0).length;
  const readTimeInSeconds = Math.ceil(wordCount / wordsPerSecond);
  return readTimeInSeconds + 1;
}

function htmlToPlainText(html) {
  if (typeof window === "undefined") return;

  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;
  return tempDiv.textContent || "";
}

function scrollToElement(element) {
  if (typeof window === "undefined") return;

  if (element) {
    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center",
    });
  }
}

function performClickAnimation(posX, posY) {
  if (typeof window === "undefined") return;

  const wave = document.createElement("div");
  wave.className = "click-wave";
  wave.style.left = `${posX - 17}px`;
  wave.style.top = `${posY - 17}px`;
  document.body.appendChild(wave);
  setTimeout(() => {
    wave.remove();
  }, 800);
}

function waitForElement(selector, timeout = 5000) {
  if (typeof window === "undefined") return;

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
  if (typeof window === "undefined") return;

  const viewportHeight = window.innerHeight;
  const targetScrollPosition = yPosition - viewportHeight / 2;
  window.scrollTo({
    top: targetScrollPosition,
    behavior: "smooth",
  });
}

async function canPlayAudio() {
  if (typeof window === "undefined") return;

  const audio = new Audio(
    "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAABCxAgAEABAAZGF0YQAAAAA="
  );
  try {
    await audio.play();
    return true;
  } catch (err) {
    return false;
  }
}

// Helper: Check if an element is fully visible in the viewport.
function isElementFullyVisible(el) {
  if (typeof window === "undefined") return;

  const rect = el.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= window.innerHeight &&
    rect.right <= window.innerWidth
  );
}

// Helper: Get scrollable ancestors of an element.
function getScrollableAncestors(el) {
  if (typeof window === "undefined") return;

  let ancestors = [];
  let current = el.parentElement;
  while (current) {
    const style = window.getComputedStyle(current);
    if (
      (style.overflowY === "auto" || style.overflowY === "scroll") &&
      current.scrollHeight > current.clientHeight
    ) {
      ancestors.push(current);
    }
    current = current.parentElement;
  }
  return ancestors;
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

  // Cached pointer container.
  _pointerContainer = null;
  // For scroll handling.
  _scrollListeners = [];
  _currentAnchor = null;
  _currentStep = null;
  _scrollDebounceTimer = null;

  // GleapReplayRecorder singleton.
  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new GleapCopilotTours();
    }
    return this.instance;
  }

  constructor() {
    const self = this;

    if (typeof window !== "undefined") {
      this._scrollListeners = [];
      this._currentAnchor = null;
      this._currentStep = null;
      this._scrollDebounceTimer = null;

      window.addEventListener("resize", () => {
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
            self.updatePointerPosition(
              document.querySelector(currentStep.selector),
              currentStep
            );
          }
        }
      });
    }
  }

  disable() {
    this.cleanup();
    this.disabled = true;
  }

  startWithConfig(tourId, config, onCompleteCallback = undefined) {
    if (typeof window === "undefined") return;
    if (this.productTourId) return;
    this.productTourId = tourId;
    this.productTourData = config;
    this.currentActiveIndex = 0;
    this.onCompleteCallback = onCompleteCallback;
    this.start();
  }

  storeUncompletedTour() {
    if (typeof window === "undefined") return;
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
      } catch (e) {
        // Optionally log error in development mode.
      }
    } else {
      localStorage.removeItem(localStorageKey);
    }
  }

  // Attach scroll listeners with a debounce to update the pointer position after scrolling stops.
  attachScrollListeners(anchor, currentStep) {
    if (typeof window === "undefined") return;
    if (!anchor) return;
    const scrollableAncestors = getScrollableAncestors(anchor);
    // Also include window.
    scrollableAncestors.push(window);
    scrollableAncestors.forEach((el) => {
      const handler = () => {
        clearTimeout(this._scrollDebounceTimer);
        this._scrollDebounceTimer = setTimeout(() => {
          this.updatePointerPosition(anchor, currentStep);
        }, 150);
      };
      el.addEventListener("scroll", handler, { passive: true });
      this._scrollListeners.push({ el, handler });
    });
  }

  // Remove scroll listeners and clear debounce timer.
  removeScrollListeners() {
    if (typeof window === "undefined") return;
    if (this._scrollListeners && this._scrollListeners.length > 0) {
      this._scrollListeners.forEach(({ el, handler }) => {
        el.removeEventListener("scroll", handler);
      });
      this._scrollListeners = [];
    }
    if (this._scrollDebounceTimer) {
      clearTimeout(this._scrollDebounceTimer);
      this._scrollDebounceTimer = null;
    }
  }

  // Updated pointer position:
  // 1. Scroll the element into view.
  // 2. After the element is fully visible (or after a maximum delay), update the pointer position to point towards the element.
  updatePointerPosition(anchor, currentStep) {
    if (typeof window === "undefined") return;
    try {
      const container =
        this._pointerContainer || document.getElementById(pointerContainerId);
      if (!container) return;

      if (!anchor) {
        container.style.position = "fixed";
        container.style.left = "50%";
        container.style.top = "50%";
        container.style.transform = "translate(-50%, -50%)";
        smoothScrollToY(window.innerHeight / 2);
        this.removeScrollListeners();
        this._currentAnchor = null;
        this._currentStep = null;
        return;
      }

      // Step 1: Scroll the element into view.
      scrollToElement(anchor);

      // Step 2: Poll until the element is fully visible (or after maximum polls).
      const pollInterval = 100;
      const maxPolls = 20;
      let pollCount = 0;
      const updateFinalPosition = () => {
        if (isElementFullyVisible(anchor) || pollCount >= maxPolls) {
          // Compute final target coordinates.
          const anchorRect = anchor.getBoundingClientRect();
          const targetX = anchorRect.left + anchorRect.width / 2;
          const targetY = anchorRect.top + anchorRect.height / 2 + 10; // 10px downward offset.
          container.style.position = "fixed";
          container.style.left = `${targetX}px`;
          container.style.top = `${targetY}px`;
          container.style.transform = "translate(-50%, -50%)";

          // Adjust container if too far right.
          let containerWidthSpace = 350;
          if (containerWidthSpace > window.innerWidth - 40) {
            containerWidthSpace = window.innerWidth - 40;
          }
          if (targetX + containerWidthSpace > window.innerWidth - 20) {
            container.classList.add("copilot-pointer-container-right");
          } else {
            container.classList.remove("copilot-pointer-container-right");
          }

          // Reattach scroll listeners if the target or step has changed.
          if (
            this._currentAnchor !== anchor ||
            this._currentStep !== currentStep
          ) {
            this.removeScrollListeners();
            this._currentAnchor = anchor;
            this._currentStep = currentStep;
            this.attachScrollListeners(anchor, currentStep);
          }
        } else {
          pollCount++;
          setTimeout(updateFinalPosition, pollInterval);
        }
      };
      updateFinalPosition();
    } catch (e) {
      // Optionally log errors.
    }
  }

  cleanup() {
    if (typeof window === "undefined") return;
    document.body.classList.add("gl-copilot-fade-out");
    setTimeout(() => {
      if (this._pointerContainer) {
        this._pointerContainer.remove();
        this._pointerContainer = null;
      } else {
        const container = document.getElementById(pointerContainerId);
        if (container) container.remove();
      }
      const copilotInfoContainer = document.getElementById(
        copilotJoinedContainerId
      );
      if (copilotInfoContainer) copilotInfoContainer.remove();
      const styleNode = document.getElementById(styleId);
      if (styleNode) styleNode.remove();
      document.body.classList.remove("gl-copilot-fade-out");
    }, 800);
    this.removeScrollListeners();
  }

  toggleAudio(muted = false) {
    this.audioMuted = muted;
    if (this.currentAudio) {
      this.currentAudio.muted = this.audioMuted;
    }
    document.querySelector(`.${copilotJoinedContainerId}-mute`).innerHTML =
      loadIcon(this.audioMuted ? "unmute" : "mute");
  }

  setupCopilotTour() {
    if (typeof window === "undefined") return;

    const primaryColor =
      GleapConfigManager.getInstance().flowConfig?.color ?? "#485BFF";
    const contrastColor = calculateContrast(primaryColor);

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
        .${pointerContainerId}-clickmode #copilot-info-bubble-content {
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
        #copilot-info-bubble {
          position: relative;
        }
        #copilot-info-bubble-content-container {
          position: absolute;
          top: 0px;
          left: 0px;
          min-width: min(300px, 80vw);
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }
        .${pointerContainerId}-right #copilot-info-bubble-content-container {
          left: auto !important;
          right: 0px !important;
          align-items: flex-end;
        }
        .${pointerContainerId}-right .copilot-info-bubble-content {
          margin-right: 5px;
        }
        .${pointerContainerId}-right svg {
          transform: scaleX(-1);
        }
        #copilot-info-bubble-content svg {
          width: 16px;
          height: 16px;
          display: inline-block !important;
          margin-left: 5px;
        }
        #copilot-info-bubble-content {
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
        .${pointerContainerId}-right #copilot-info-bubble-content {
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
        .${copilotJoinedContainerId}-dismiss {
          display: flex;
          align-items: center;
          justify-content: center;
          padding-right: 3px;
        }
        .${copilotJoinedContainerId}-dismiss svg {
          width: 15px;
          height: auto;
          cursor: pointer;
        }
        .${copilotJoinedContainerId}-dismiss svg:hover {
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

        .gleap-audio-unmute-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 2147483620;
        }

        .gleap-audio-unmute-modal {
          background-color: #fff;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
          text-align: center;
          max-width: 90%;
          width: 400px;
        }

        .gleap-audio-unmute-modal p {
          margin-bottom: 20px;
          font-size: 16px;
          line-height: 22px;
          font-weight: normal;
        }

        .gleap-audio-unmute-button {
          background: ${primaryColor};
          color: ${contrastColor};
          outline: none;
          border: none;
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: bold;
          cursor: pointer;
        }

        .gleap-audio-unmute-button:hover {
          opacity: 0.8;
        }

        .gleap-tour-continue-button {
          color: ${primaryColor};
          text-decoration: none;
          cursor: pointer;
          font-size: 14px;
          font-weight: bold;
          border: none;
          background: none;
          padding: 0;
          margin: 0;
          margin-left: 20px;
        }

        .gleap-tour-continue-button:hover {
          opacity: 0.8;
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

    const container = document.createElement("div");
    container.id = pointerContainerId;
    container.style.opacity = 0;
    // Cache the pointer container.
    this._pointerContainer = container;

    const svgMouse = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    svgMouse.setAttribute("viewBox", "0 0 380 476");
    svgMouse.innerHTML =
      '<path d="M352.595 268.315L352.581 268.302L352.566 268.29L78.6092 24.7278C71.6245 18.433 62.5487 15 53.2 15C32.1157 15 15 32.1157 15 53.2V424C15 444.34 31.4714 461 52 461C62.6797 461 72.8089 456.467 79.8863 448.38C79.8871 448.379 79.8879 448.378 79.8886 448.378L180.804 333.1H327.9C348.384 333.1 365 316.484 365 296C365 285.404 360.46 275.344 352.595 268.315Z" fill="black" stroke="white" stroke-width="30"/>';

    const infoBubble = document.createElement("div");
    infoBubble.id = "copilot-info-bubble";
    infoBubble.innerHTML = `<div id='copilot-info-bubble-content-container'><div id='copilot-info-bubble-content'></div></div>`;

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
      ${
        this.productTourData?.allowClose
          ? `<div class="${copilotJoinedContainerId}-dismiss">
               ${loadIcon("dismiss")}
             </div>`
          : ""
      }
    `;
    document.body.appendChild(copilotInfoContainer);

    const self = this;

    document
      .querySelector(`.${copilotJoinedContainerId}-mute`)
      .addEventListener("click", () => {
        this.toggleAudio(!this.audioMuted);
      });

    if (this.productTourData?.allowClose) {
      document
        .querySelector(`.${copilotJoinedContainerId}-dismiss`)
        .addEventListener("click", () => {
          this.completeTour(false);
        });
    }

    container.appendChild(svgMouse);
    container.appendChild(infoBubble);
    document.body.appendChild(container);
  }

  start() {
    if (typeof window === "undefined") return;
    const config = this.productTourData;
    if (!config) return;
    canPlayAudio().then((supported) => {
      this.audioMuted = !supported;
      this.setupCopilotTour();

      console.log(this.audioMuted, config);

      if (this.audioMuted && config?.showUnmuteModal) {
        this.showAudioUnmuteModal();
      } else {
        setTimeout(() => {
          this.renderNextStep();
        }, 1500);
      }
    });
  }

  showAudioUnmuteModal() {
    // Create the overlay element
    const modalOverlay = document.createElement("div");
    modalOverlay.classList.add("gleap-audio-unmute-modal-overlay");

    // Create the modal container element
    const modal = document.createElement("div");
    modal.classList.add("gleap-audio-unmute-modal");

    // Create and add the modal message
    const message = document.createElement("p");
    message.textContent = this.productTourData?.unmuteModalTitle;
    modal.appendChild(message);

    // Create the "Unmute Audio" button
    const unmuteButton = document.createElement("button");
    unmuteButton.classList.add("gleap-audio-unmute-button");
    unmuteButton.textContent = this.productTourData?.unmuteModalButton;
    unmuteButton.addEventListener("click", () => {
      this.toggleAudio(false);
      if (modalOverlay.parentNode) {
        modalOverlay.parentNode.removeChild(modalOverlay);
      }
      setTimeout(() => {
        this.renderNextStep();
      }, 1000);
    });
    modal.appendChild(unmuteButton);

    // Create the "Start Anyway" button
    const startAnywayButton = document.createElement("button");
    startAnywayButton.classList.add("gleap-tour-continue-button");
    startAnywayButton.textContent = this.productTourData?.unmuteModalContinue;
    startAnywayButton.addEventListener("click", () => {
      if (modalOverlay.parentNode) {
        modalOverlay.parentNode.removeChild(modalOverlay);
      }
      setTimeout(() => {
        this.renderNextStep();
      }, 1000);
    });
    modal.appendChild(startAnywayButton);

    // Build the modal and attach it to the DOM
    modalOverlay.appendChild(modal);
    document.body.appendChild(modalOverlay);
  }

  completeTour(success = true) {
    if (typeof window === "undefined") return;
    this.cleanup();
    if (this.onCompleteCallback) {
      this.onCompleteCallback(success);
    }
  }

  renderNextStep() {
    if (typeof window === "undefined") return;

    if (this.disabled) return;
    const self = this;
    const config = this.productTourData;
    const steps = config.steps;
    if (this.currentActiveIndex >= steps.length) {
      setTimeout(() => {
        this.completeTour();
      }, 500);
      return;
    }
    const currentStep = steps[this.currentActiveIndex];
    const handleStep = (element) => {
      this._pointerContainer.style.display = "flex";
      if (currentStep.selector && currentStep.selector.length > 0 && !element) {
        this.completeTour(false);
        return;
      }
      const gotToNextStep = () => {
        if (currentStep.mode === "INPUT" && element) {
          function proceedClickmode() {
            document
              .querySelector(`#${pointerContainerId}`)
              .classList.remove("copilot-pointer-container-clickmode");
            element.classList.remove("gleap-input-highlight");
            document.getElementById(pointerContainerId).style.display = "none";
            self.currentActiveIndex++;
            self.storeUncompletedTour();
            self.renderNextStep();
          }
          const inputModeType = currentStep.inputType ?? "default";
          if (inputModeType === "default") {
            function handleInputEvent(e) {
              if (e?.target?.value?.length === 0) return;
              const cursor = document.getElementById(
                `copilot-info-bubble-content`
              );
              if (!cursor) return;
              cursor.innerHTML = `${GleapTranslationManager.translateText(
                "next"
              )} <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
  <path fill="currentColor" d="M438.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-160-160c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L338.8 224 32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l306.7 0L233.4 393.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l160-160z"/>
</svg>`;
              cursor.addEventListener("click", proceedClickmode, {
                once: true,
              });
              element.classList.add("gleap-input-highlight");
              document
                .querySelector(`#${pointerContainerId}`)
                .classList.add("copilot-pointer-container-clickmode");
              element.removeEventListener("input", handleInputEvent);
            }
            element.addEventListener("input", handleInputEvent, {
              once: false,
            });
            if (element.hasAttribute("contenteditable")) {
              element.addEventListener("keyup", handleInputEvent, {
                once: false,
              });
            }
            element.addEventListener(
              "blur",
              () => {
                element.focus();
              },
              { once: true }
            );
            element.focus();
          } else {
            const inputValue = currentStep.inputValue ?? "";
            let index = 0;
            function typeCharacter() {
              if (index < inputValue.length) {
                element.value += inputValue[index];
                index++;
                setTimeout(typeCharacter, 100);
              } else {
                setTimeout(() => {
                  proceedClickmode();
                }, 1200);
              }
            }
            typeCharacter();
          }
          return;
        }
        self.currentActiveIndex++;
        self.storeUncompletedTour();
        if (currentStep.mode === "CLICK" && element) {
          const rect = element.getBoundingClientRect();
          const scrollX = window.scrollX || 0;
          const scrollY = window.scrollY || 0;
          performClickAnimation(
            rect.left + rect.width / 2 + scrollX,
            rect.top + rect.height / 2 + scrollY
          );
          element.click();
        }
        self.renderNextStep();
      };

      this.updatePointerPosition(element, currentStep);
      const message = currentStep?.message
        ? htmlToPlainText(currentStep.message)
        : "🤔";
      document.getElementById(`copilot-info-bubble-content`).textContent =
        message;
      this._pointerContainer.style.opacity = 1;
      const readTime = estimateReadTime(message);
      const continueWithNoAudio = () => {
        this.currentAudio = undefined;
        setTimeout(() => {
          gotToNextStep();
        }, readTime * 1000);
      };
      if (currentStep.voice && currentStep.voice.length > 0) {
        this.currentAudio = new Audio(currentStep.voice);
        if (this.audioMuted) {
          this.currentAudio.muted = true;
        }
        this.currentAudio.addEventListener("ended", () => {
          setTimeout(() => {
            gotToNextStep();
          }, 1000);
        });
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
