import { loadIcon } from "./UI";
import GleapTours from "./GleapTours";

export default class GleapProductTours {
    productTourData = undefined;
    productTourId = undefined;
    onCompletion = undefined;

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

    constructor() { }

    startWithConfig(tourId, config, onCompletion) {
        this.productTourId = tourId;
        this.productTourData = config;
        this.onCompletion = onCompletion;

        return this.start();
    }

    start() {
        const config = this.productTourData;
        if (!config) {
            return;
        }

        const steps = config.steps;
        const self = this;

        var driverSteps = [];

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];

            var message = "";

            if (step.type === "video-pointer") {
                message = `<div class="gleap-tour-video">
              <video class="gleap-tour-video-obj">
                <source src="${step.videoUrl}" type="video/mp4">
              </video>
              <div class="gleap-tour-video-playpause">${loadIcon("play")}</div>
            </div>`;
            } else {
                var senderHTML = ``;
                if (step.sender && step.sender.name) {
                    senderHTML = `<div class="gleap-tour-sender">
                <div class="gleap-tour-sender-image" style="background-image: url('${step.sender.profileImageUrl}');"></div>
                <div class="gleap-tour-sender-name">${step.sender.name}</div>
              </div>`;
                }

                message = `${senderHTML}<div class="gleap-tour-message">${step.message}</div>`;
            }

            var driverStep = {
                popover: {
                    description: message,
                    popoverClass: `gleap-tour-popover-${step.type}`,
                },
            }
            if (step.selector && step.selector.length > 0) {
                driverStep.element = step.selector;
            }
            driverSteps.push(driverStep);
        }

        const gleapTourObj = GleapTours({
            showProgress: true,
            steps: driverSteps,
            allowClose: config.allowClose,
            nextBtnText: config.nextText,
            doneBtnText: config.doneText,
            showButtons: [
                'next',
                'close'
            ],
            onDestroyStarted: () => {
                if (!gleapTourObj.hasNextStep()) {
                    gleapTourObj.destroy();

                    if (self.onCompletion) {
                        self.onCompletion({
                            tourId: self.productTourId
                        });
                    }
                }
            },
            onPopoverRender: (popoverElement) => {
                // Fix for images and videos.
                if (popoverElement) {
                    const mediaElements = document.querySelectorAll('.gleap-tour-popover-description img, .gleap-tour-popover-description video');

                    const performRequentialRefresh = () => {
                        setTimeout(() => {
                            gleapTourObj.refresh();
                        }, 750);
                    };

                    for (let i = 0; i < mediaElements.length; i++) {
                        const mediaElement = mediaElements[i];
                        if (mediaElement.tagName === 'IMG') {
                            mediaElement.addEventListener('load', () => {
                                performRequentialRefresh();
                            });
                            mediaElement.addEventListener('error', () => {
                                performRequentialRefresh();
                            });
                        } else if (mediaElement.tagName === 'VIDEO') {
                            mediaElement.addEventListener('canplaythrough', () => {
                                performRequentialRefresh();
                            });
                            mediaElement.addEventListener('error', () => {
                                performRequentialRefresh();
                            });
                        }
                    }
                }

                // Video player controller.
                const playButtonElem = document.querySelector('.gleap-tour-video-playpause');
                if (playButtonElem) {
                    playButtonElem.addEventListener('click', () => {
                        const playingClass = 'gleap-tour-video--playing';
                        const videoElement = playButtonElem.previousElementSibling;
                        const videoContainer = playButtonElem.closest('.gleap-tour-video');

                        const onVideoEnded = () => {
                            videoElem.innerHTML = loadIcon("play");
                            videoContainer.classList.remove(playingClass);
                        };

                        if (videoElement.paused) {
                            videoElement.play();
                            playButtonElem.innerHTML = loadIcon("pause");
                            videoContainer.classList.add(playingClass);

                            // Add event listener for video ended
                            videoElement.addEventListener('ended', onVideoEnded);
                        } else {
                            videoElement.pause();
                            playButtonElem.innerHTML = loadIcon("play");
                            videoContainer.classList.remove(playingClass);

                            // Remove event listener for video ended
                            videoElement.removeEventListener('ended', onVideoEnded);
                        }
                    });
                }
            }
        });
        gleapTourObj.drive();
    }
}