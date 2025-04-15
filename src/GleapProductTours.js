import { loadIcon } from "./UI";
import GleapTours from "./GleapTours";
import Gleap, { GleapEventManager, GleapSession } from "./Gleap";
import GleapCopilotTours from "./GleapCopilotTours";

const localStorageKey = "gleap-tour-data";

export default class GleapProductTours {
  productTourData = undefined;
  productTourId = undefined;
  unmuted = false;
  currentActiveIndex = undefined;
  gleapTourObj = undefined;
  disabled = false;

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

    // Disable copilot tours.
    GleapCopilotTours.getInstance().disable();

    this.gleapTourObj = undefined;
    this.disabled = true;
  }

  constructor() {
    const self = this;

    if (typeof window !== "undefined") {
      const beforeUnloadListener = (event) => {
        if (
          !self?.disabled &&
          self?.productTourId &&
          self?.productTourData &&
          self?.productTourData?.tourType !== "cobrowse"
        ) {
          self.storeUncompletedTour();
        }
      };

      if (typeof window !== "undefined") {
        window.addEventListener("beforeunload", beforeUnloadListener);
      }
    }
  }

  startWithConfig(tourId, config, delay = 0) {
    // Prevent multiple tours from being started.
    if (this.productTourId || this.disabled) {
      return;
    }

    this.productTourId = tourId;
    this.productTourData = config;
    this.currentActiveIndex = 0;

    const self = this;

    // Validate product tour.
    GleapSession.getInstance()
      .validateProductTour(tourId)
      .then(() => {
        if (delay > 0) {
          return setTimeout(() => {
            self.start();
          }, delay);
        } else {
          return this.start();
        }
      })
      .catch((error) => {
        console.log("Product tour is not live. Cleaning up...");
        console.error(error);

        self.onComplete(false);
      });
  }

  onComplete(success = true) {
    const comData = {
      tourId: this.productTourId,
    };

    if (success) {
      GleapEventManager.notifyEvent("productTourCompleted", comData);
      Gleap.trackEvent(`tour-${this.productTourId}-completed`, comData);
    } else {
      GleapEventManager.notifyEvent("productTourQuit", comData);
      Gleap.trackEvent(`tour-${this.productTourId}-quit`, comData);
    }

    // Clear data.
    if (this.gleapTourObj) {
      this.gleapTourObj.destroy();
    }

    this.gleapTourObj = undefined;
    this.productTourData = undefined;
    this.productTourId = undefined;
    this.currentActiveIndex = undefined;
    this.clearUncompletedTour();
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

  start() {
    const config = this.productTourData;
    if (!config) {
      return;
    }

    if (config.tourType === "cobrowse") {
      return GleapCopilotTours.getInstance().startWithConfig(
        this.productTourId,
        config,
        (success) => {
          this.onComplete(success);
        }
      );
    }

    this.unmuted = false;
    const steps = config.steps;
    const self = this;

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
        this.currentActiveIndex = config?.state?.activeIndex;
        this.storeUncompletedTour();
      },
      onElementNotFound: (step) => {
        document.removeEventListener("click", onDocumentClick);

        this.onComplete(false);
      },
      onDestroyStarted: () => {
        if (!this.gleapTourObj.hasNextStep()) {
          // Mark as completed.
          this.onComplete(true);
        } else {
          // Mark as quit.
          this.onComplete(false);
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
