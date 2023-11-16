import { loadIcon } from "./UI";
import GleapTours from "./GleapTours";

export default class GleapProductTours {
    productTourData = undefined;
    productTourId = undefined;
    onCompletion = undefined;
    unmuted = false;

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

        this.unmuted = false;
        const steps = config.steps;
        const self = this;

        var driverSteps = [];

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];

            var message = "";

            if (step.type === "video-pointer") {
                message = `<div class="gleap-tour-video">
              <video class="gleap-tour-video-obj" muted autoplay>
                <source src="${step.videoUrl}" type="video/mp4">
              </video>
              <div class="gleap-tour-video-playpause">${loadIcon("unmute")}</div>
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
                disableActiveInteraction: !(step.allowClick ?? true),
                popover: {
                    description: message,
                    popoverClass: `gleap-tour-popover-${step.type} ${config.allowClose && 'gleap-tour-popover-can-close'}`,
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
                } else {
                    gleapTourObj.destroy();
                }
            },
            onPopoverRender: (popoverElement) => {
                // Fix for images and videos.
                if (popoverElement) {
                    const mediaElements = document.querySelectorAll('.gleap-tour-popover-description img, .gleap-tour-popover-description video');

                    const performRequentialRefresh = () => {
                        setTimeout(() => {
                            gleapTourObj.refresh();
                        }, 500);
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

                const playingClass = 'gleap-tour-video--playing';

                const videoElement = document.querySelector('.gleap-tour-video-obj');
                if (videoElement) {
                    const videoContainer = videoElement.closest('.gleap-tour-video');

                    if (self.unmuted) {
                        if (videoElement) {
                            videoElement.pause();
                            videoElement.muted = false;
                            videoElement.play();
                            videoContainer.classList.add(playingClass);
                        }
                    }

                    videoElement.addEventListener('ended', function () {
                        playButtonElem.innerHTML = loadIcon("replay");
                        videoContainer.classList.remove(playingClass);
                    });

                    // Video player controller.
                    const playButtonElem = document.querySelector('.gleap-tour-video-playpause');
                    if (playButtonElem) {
                        playButtonElem.addEventListener('click', () => {
                            if (videoElement.muted) {
                                self.unmuted = true;

                                videoElement.pause();
                                videoElement.currentTime = 0;
                                videoElement.muted = false;
                                videoElement.play();

                                playButtonElem.innerHTML = loadIcon("mute");
                                videoContainer.classList.add(playingClass);
                            } else if (videoElement.paused) {
                                videoElement.muted = false;
                                videoElement.play();

                                playButtonElem.innerHTML = loadIcon("mute");
                                videoContainer.classList.add(playingClass);
                            } else {
                                videoElement.pause();
                                playButtonElem.innerHTML = loadIcon("unmute");
                                videoContainer.classList.remove(playingClass);
                            }
                        });
                    }
                }
            }
        });
        gleapTourObj.drive();
    }
}