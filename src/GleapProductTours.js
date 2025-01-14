import { loadIcon } from "./UI";
import GleapTours from "./GleapTours";
import Gleap, { GleapEventManager } from "./Gleap";

const localStorageKey = "gleap-tour-data";
const pointerContainerId = "copilot-pointer-container";
const styleId = "copilot-tour-styles";
const copilotInfoContainerId = "copilot-info-container";

function estimateReadTime(text) {
  const wordsPerSecond = 3.5; // Average reading speed
  const wordCount = text.split(/\s+/).filter((word) => word.length > 0).length;
  const readTimeInSeconds = Math.ceil(wordCount / wordsPerSecond);
  return readTimeInSeconds + 10.5;
}

function htmlToPlainText(html) {
  const tempDiv = document.createElement("div"); // Create a temporary div
  tempDiv.innerHTML = html; // Set the HTML content
  return tempDiv.textContent || ""; // Extract and return plain text
}

export default class GleapProductTours {
  productTourData = undefined;
  productTourId = undefined;
  unmuted = false;
  currentActiveIndex = undefined;
  gleapTourObj = undefined;
  type = undefined;
  disabled = false;

  copilotAnchor = undefined;
  lastArrowPositionX = undefined;
  lastArrowPositionY = undefined;

  // GleapReplayRecorder singleton
  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new GleapProductTours();
      return this.instance;
    } else {
      return this.instance;
    }
  }

  disable() {
    if (this.gleapTourObj) {
      this.gleapTourObj.destroy();
    }

    this.gleapTourObj = undefined;
    this.disabled = true;
  }

  constructor() {
    const self = this;

    const beforeUnloadListener = (event) => {
      self.storeUncompletedTour();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", beforeUnloadListener);

      this.arrowChecker = setInterval(() => {
        if (
          self.type === "copilot" &&
          self.productTourId &&
          self.copilotAnchor
        ) {
          self.updatePointerPosition(self.copilotAnchor);
        }
      }, 500);
    }
  }

  startWithConfig(tourId, config, delay = 0) {
    // Prevent multiple tours from being started.
    if (this.productTourId || this.disabled) {
      return;
    }

    this.type = "copilot";
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

    if (!anchor) {
      // Center element on screen.
      container.style.position = "fixed";
      container.style.left = `50%`;
      container.style.top = `50%`;
      container.style.transform = `translate(-50%, -50%)`;
      return;
    }

    // Get the viewport-relative bounding rectangle
    const anchorRect = anchor.getBoundingClientRect();

    // Move the pointer container
    if (container) {
      // Get container size.
      const containerRect = container.getBoundingClientRect();

      console.log(containerRect);
      console.log(anchorRect);

      // e.g. place the pointer at the center of the anchor
      const x = anchorRect.left + containerRect.width / 2;
      const y = anchorRect.top + containerRect.height / 2;

      // If using absolute positioning
      container.style.position = "fixed";
      container.style.left = `${x}px`;
      container.style.top = `${y}px`;

      // log final pos.
      console.log(x, y);
    }
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
          transition: transform 0.2s ease;
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

        .gleap-tour-popover {
          opacity: 0 !important;
        }
          
        .gleap-tour-overlay {
          background: transparent !important;
        }

        .gleap-tour-overlay path {
          fill: transparent !important;
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

    // Add info container.
    /*const copilotInfoContainer = document.createElement("div");
    copilotInfoContainer.id = copilotInfoContainerId;
    copilotInfoContainer.classList.add("copilot-info-container");
    copilotInfoContainer.innerHTML = `
      Kai has joined the session
      <svg
        width="473"
        height="473"
        viewBox="0 0 473 473"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M323 0H150C67.1573 0 0 67.1573 0 150V323C0 405.843 67.1573 473 150 473H323C405.843 473 473 405.843 473 323V150C473 67.1573 405.843 0 323 0Z"
          fill="black"
        />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M150.369 160.81C133.262 181.651 125.78 209.628 125.781 236.425C125.781 263.222 133.263 291.199 150.369 312.04C166.878 332.152 194.063 347.763 238.59 347.763C285.535 347.763 308.911 327.361 321.205 307.963C329.855 294.316 332.954 284.342 334.064 277.623C334.807 273.127 338.425 269.414 343.04 269.414H368.108C372.725 269.414 376.519 273.108 376.125 277.646C375.089 289.587 371.091 307.013 356.627 329.832C337.268 360.377 300.982 388.999 238.59 388.999C182.841 388.999 143.177 368.786 117.905 337.997C93.2305 307.937 83.9999 269.936 83.9999 236.425C83.9999 202.914 93.23 164.913 117.905 134.853C141.894 105.627 178.852 85.9299 230.225 84.0056C234.837 83.8329 238.59 87.5431 238.59 92.0979V116.84C238.59 121.395 234.844 125.064 230.234 125.277C190.62 127.108 165.819 141.987 150.369 160.81Z"
          fill="white"
        />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M154.234 163.982C138.044 183.706 130.78 210.459 130.781 236.425C130.781 262.391 138.045 289.144 154.234 308.868C169.687 327.694 195.385 342.763 238.59 342.763C283.72 342.763 305.548 323.326 316.982 305.286L321.205 307.963C308.911 327.361 285.535 347.763 238.59 347.763C194.063 347.763 166.878 332.152 150.369 312.04C133.263 291.199 125.781 263.222 125.781 236.425C125.78 209.628 133.262 181.651 150.369 160.81C165.819 141.987 190.62 127.108 230.234 125.277L230.465 130.271C192.147 132.043 168.713 146.343 154.234 163.982ZM334.064 277.623C332.954 284.342 329.855 294.316 321.205 307.963L316.982 305.286C325.32 292.131 328.144 282.783 329.131 276.808M334.064 277.623C334.807 273.127 338.425 269.414 343.04 269.414H368.108C372.725 269.414 376.519 273.108 376.125 277.646C375.089 289.587 371.091 307.013 356.627 329.832C337.268 360.377 300.982 388.999 238.59 388.999C182.841 388.999 143.177 368.786 117.905 337.997C93.2305 307.937 83.9999 269.936 83.9999 236.425C83.9999 202.914 93.23 164.913 117.905 134.853C141.894 105.627 178.852 85.9299 230.225 84.0056C234.837 83.8329 238.59 87.5431 238.59 92.0979V116.84C238.59 121.395 234.844 125.064 230.234 125.277L230.465 130.271C237.531 129.945 243.59 124.275 243.59 116.84V92.0979C243.59 84.7616 237.535 78.7283 230.038 79.0091C177.376 80.9816 139.024 101.243 114.04 131.68C88.4461 162.861 78.9999 202.087 78.9999 236.425C78.9999 270.763 88.4466 309.989 114.04 341.17C140.37 373.248 181.524 393.999 238.59 393.999C302.802 393.999 340.633 364.407 360.85 332.509C375.744 309.012 380.002 290.815 381.106 278.077"
          fill="white"
        />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M117.905 134.853L112.993 130.821C138.246 100.056 176.976 79.6415 229.987 77.6559C238.266 77.3458 244.944 84.0082 244.944 92.0979V116.84C244.944 125.055 238.258 131.267 230.528 131.624C192.561 133.379 169.496 147.523 155.28 164.842C139.339 184.262 132.134 210.684 132.135 236.425C132.135 262.166 139.34 288.588 155.281 308.008C170.448 326.487 195.743 341.409 238.59 341.409C283.228 341.409 304.638 322.233 315.838 304.561L321.205 307.963C308.911 327.361 285.535 347.763 238.59 347.763C194.063 347.763 166.878 332.152 150.369 312.04C133.263 291.199 125.781 263.222 125.781 236.425C125.78 209.628 133.262 181.651 150.369 160.81C165.819 141.987 190.62 127.108 230.234 125.277C234.844 125.064 238.59 121.395 238.59 116.84V92.0979C238.59 87.5431 234.837 83.8329 230.225 84.0056C178.852 85.9299 141.894 105.627 117.905 134.853ZM356.627 329.832C337.268 360.377 300.982 388.999 238.59 388.999C182.841 388.999 143.177 368.786 117.905 337.997C93.2305 307.937 83.9999 269.936 83.9999 236.425C83.9999 202.914 93.23 164.913 117.905 134.853L112.993 130.821C87.1504 162.305 77.6458 201.863 77.6458 236.425C77.6458 270.987 87.151 310.545 112.993 342.029C139.61 374.456 181.168 395.353 238.59 395.353C303.295 395.353 341.544 365.499 361.993 333.234C377.003 309.554 381.332 291.15 382.455 278.196C383.213 269.472 375.96 263.06 368.108 263.06H343.04C334.73 263.06 328.943 269.639 327.795 276.587C326.841 282.361 324.092 291.54 315.838 304.561L321.205 307.963C329.855 294.316 332.954 284.342 334.064 277.623C334.807 273.127 338.425 269.414 343.04 269.414H368.108C372.725 269.414 376.519 273.108 376.125 277.646C375.089 289.587 371.091 307.013 356.627 329.832Z"
          fill="white"
        />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M355.575 226.285C377.466 226.285 395.354 208.748 395.354 186.941C395.354 165.135 377.466 147.598 355.575 147.598C333.685 147.598 315.797 165.135 315.797 186.941C315.797 208.748 333.685 226.285 355.575 226.285Z"
          fill="white"
        />
      </svg>
    `;
    document.body.appendChild(copilotInfoContainer);*/

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

    this.unmuted = false;
    const steps = config.steps;
    const self = this;

    if (this.type === "copilot") {
      this.setupCopilotTour();
    }

    var driverSteps = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      const isClickMode = step.mode === "CLICK";
      const isInputMode = step.mode === "INPUT";

      var message = "";
      var hasSender = false;

      if (step.type === "video-pointer") {
        message = `<div class="gleap-tour-video">
              <video class="gleap-tour-video-obj" muted autoplay>
                <source src="${step.videoUrl}" type="video/mp4">
              </video>
              <div class="gleap-tour-video-playpause">${loadIcon(
                "unmute"
              )}</div>
            </div>`;
      } else {
        var senderHTML = ``;

        if (config.sender && config.sender.firstName) {
          hasSender = true;
          senderHTML = `<div class="gleap-tour-sender">
                <div class="gleap-tour-sender-image" style="background-image: url('${config.sender.profileImageUrl}');"></div>
                <div class="gleap-tour-sender-name">${config.sender.firstName}</div>
              </div>`;
        }

        message = `${senderHTML}<div class="gleap-tour-message">${step.message}</div>`;
      }

      const disableInteraction = !isClickMode && !isInputMode;

      var driverStep = {
        disableActiveInteraction: disableInteraction,
        mode: step.mode,
        popover: {
          description: message,
          popoverClass: `gleap-tour-popover-${step.type} ${
            !hasSender && "gleap-tour-popover-no-sender"
          } ${config.allowClose && "gleap-tour-popover-can-close"}`,
          ...(isClickMode
            ? {
                showButtons: [],
              }
            : {}),
        },
      };
      if (step.selector && step.selector.length > 0) {
        driverStep.element = step.selector;
      }
      driverSteps.push(driverStep);
    }

    var buttons = ["next", "close"];

    if (config.backButton) {
      buttons.push("previous");
    }

    function onDocumentClick(evnt) {
      // If copilot, do nothing. Copilot will handle clicks.
      if (this.type === "copilot") {
        return;
      }

      try {
        var gleapTourPopover = document.querySelector(".gleap-tour-popover");
        if (gleapTourPopover && !gleapTourPopover.contains(evnt.target)) {
          const stepIndex = self.gleapTourObj.getActiveIndex();
          const step = steps[stepIndex];
          const element = self.gleapTourObj.getActiveElement();

          if (step?.mode === "CLICK" && evnt?.target !== element) {
            const isInsideElement = element.contains(evnt?.target);
            if (!isInsideElement) {
              // Ignore clicks outside of the actual element.
              return;
            }
          }

          // Store next step index.
          self.currentActiveIndex = (self.currentActiveIndex || 0) + 1;
          self.storeUncompletedTour();

          if (
            (element && element.tagName === "INPUT") ||
            step.mode === "INPUT" ||
            evnt?.target?.id.includes("tooltip-svg")
          ) {
            // Prevent.
          } else {
            self.gleapTourObj.moveNext();
          }
        }
      } catch (e) {}
    }

    this.gleapTourObj = GleapTours({
      showProgress: true,
      allowKeyboardControl: false,
      steps: driverSteps,
      showProgress: steps.length > 1,
      allowClose: config.allowClose,
      nextBtnText: config.nextText,
      doneBtnText: config.doneText,
      prevBtnText: config.prevText,
      showButtons: buttons,
      onHighlightStarted: (element, step, config) => {
        // Update pointer position for copilot.
        if (this.type === "copilot") {
          // Wait for the pointer to be rendered. (by checking if the pointer container exists)
          setTimeout(() => {
            this.updatePointerPosition(element);
          }, 100);

          const currentStep = steps[config?.state?.activeIndex];

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
            self.gleapTourObj.moveNext();

            if (step.mode === "CLICK") {
              // Perform click on element.
              try {
                element.click();
              } catch (e) {}
            }
          }, readTime * 1000);
        }

        this.currentActiveIndex = config?.state?.activeIndex;
        this.storeUncompletedTour();
      },
      onDestroyStarted: () => {
        if (!this.gleapTourObj.hasNextStep()) {
          this.gleapTourObj.destroy();

          const comData = {
            tourId: self.productTourId,
          };

          GleapEventManager.notifyEvent("productTourCompleted", comData);
          Gleap.trackEvent(`tour-${self.productTourId}-completed`, comData);

          // Clear data.
          self.productTourData = undefined;
          self.productTourId = undefined;
          self.currentActiveIndex = undefined;
          self.clearUncompletedTour();
          this.removePointerUI();
          this.type = undefined;
        } else {
          this.gleapTourObj.destroy();
        }

        document.removeEventListener("click", onDocumentClick);
      },
      onPopoverRender: (popoverElement) => {
        // Fix for images and videos.
        if (popoverElement) {
          const mediaElements = document.querySelectorAll(
            ".gleap-tour-popover-description img, .gleap-tour-popover-description video"
          );

          const performRequentialRefresh = () => {
            setTimeout(() => {
              this.gleapTourObj.refresh();
            }, 500);
            setTimeout(() => {
              this.gleapTourObj.refresh();
            }, 750);
          };

          for (let i = 0; i < mediaElements.length; i++) {
            const mediaElement = mediaElements[i];
            if (mediaElement.tagName === "IMG") {
              mediaElement.addEventListener("load", () => {
                performRequentialRefresh();
              });
              mediaElement.addEventListener("error", () => {
                performRequentialRefresh();
              });
            } else if (mediaElement.tagName === "VIDEO") {
              mediaElement.addEventListener("canplaythrough", () => {
                performRequentialRefresh();
              });
              mediaElement.addEventListener("error", () => {
                performRequentialRefresh();
              });
            }
          }
        }

        const playingClass = "gleap-tour-video--playing";
        const playPauseContainer = document.querySelector(
          ".gleap-tour-video-playpause"
        );

        const videoElement = document.querySelector(".gleap-tour-video-obj");
        if (videoElement) {
          const videoContainer = videoElement.closest(".gleap-tour-video");

          if (self.unmuted) {
            if (videoElement) {
              videoElement.pause();
              videoElement.muted = false;
              videoElement.play();
              videoContainer.classList.add(playingClass);
            }
          }

          videoElement.addEventListener("ended", function () {
            playPauseContainer.innerHTML = loadIcon("replay");
            playPauseContainer.classList.add(
              "gleap-tour-video-svg--fullscreen"
            );
            videoContainer.classList.remove(playingClass);
          });

          videoElement.addEventListener("play", function () {
            playPauseContainer.classList.remove(
              "gleap-tour-video-svg--fullscreen"
            );
          });

          if (playPauseContainer) {
            playPauseContainer.addEventListener("click", () => clickVideo());
          }

          const clickVideo = () => {
            if (videoElement.muted) {
              self.unmuted = true;

              videoElement.pause();
              videoElement.currentTime = 0;
              videoElement.muted = false;
              videoElement.play();

              playPauseContainer.innerHTML = loadIcon("mute");
              videoContainer.classList.add(playingClass);
            } else if (videoElement.paused) {
              videoElement.muted = false;
              videoElement.play();

              playPauseContainer.innerHTML = loadIcon("mute");
              videoContainer.classList.add(playingClass);
            } else {
              videoElement.pause();
              playPauseContainer.innerHTML = loadIcon("unmute");
              videoContainer.classList.remove(playingClass);
            }
          };
        }
      },
    });
    this.gleapTourObj.drive();

    document.addEventListener("click", onDocumentClick);
  }
}
