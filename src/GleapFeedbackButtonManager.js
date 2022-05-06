import GleapConfigManager from "./GleapConfigManager";
import Gleap from "./Gleap";
import GleapFrameManager from "./GleapFrameManager";
import { translateText } from "./Translation";
import { loadIcon } from "./UI";

export default class GleapFeedbackButtonManager {
    feedbackButton = null;
    injectedFeedbackButton = false;

    // Feedback button types
    static FEEDBACK_BUTTON_BOTTOM_RIGHT = "BOTTOM_RIGHT";
    static FEEDBACK_BUTTON_BOTTOM_LEFT = "BOTTOM_LEFT";
    static FEEDBACK_BUTTON_CLASSIC = "BUTTON_CLASSIC";
    static FEEDBACK_BUTTON_CLASSIC_LEFT = "BUTTON_CLASSIC_LEFT";
    static FEEDBACK_BUTTON_CLASSIC_BOTTOM = "BUTTON_CLASSIC_BOTTOM";
    static FEEDBACK_BUTTON_NONE = "BUTTON_NONE";

    // GleapFeedbackButtonManager singleton
    static instance;
    static getInstance() {
        if (!this.instance) {
            this.instance = new GleapFeedbackButtonManager();
        }
        return this.instance;
    }

    /**
     * Toggles the feedback button visibility.
     * @param {*} show 
     * @returns 
     */
    toggleFeedbackButton(show) {
        if (!this.feedbackButton) {
            return;
        }

        this.feedbackButton.style.display = show ? "flex" : "none";
    }

    feedbackButtonPressed() {
        GleapFrameManager.getInstance().showWidget();
    }

    /**
     * Injects the feedback button into the current DOM.
     */
    injectFeedbackButton() {
        if (this.injectedFeedbackButton) {
            return;
        }
        this.injectedFeedbackButton = true;

        const flowConfig = GleapConfigManager.getInstance().getFlowConfig();

        var buttonIcon = "";
        if (flowConfig.buttonLogo) {
            buttonIcon = `<img class="bb-logo-logo" src="${flowConfig.buttonLogo}" alt="Feedback Button" />`;
        } else {
            buttonIcon = loadIcon("bblogo", "#fff");
        }

        var elem = document.createElement("div");
        elem.className = "bb-feedback-button";
        if (
            flowConfig.feedbackButtonPosition === GleapFeedbackButtonManager.FEEDBACK_BUTTON_CLASSIC ||
            flowConfig.feedbackButtonPosition === GleapFeedbackButtonManager.FEEDBACK_BUTTON_CLASSIC_BOTTOM ||
            flowConfig.feedbackButtonPosition === GleapFeedbackButtonManager.FEEDBACK_BUTTON_CLASSIC_LEFT
        ) {
            elem.innerHTML = `<div class="bb-feedback-button-classic ${flowConfig.feedbackButtonPosition === GleapFeedbackButtonManager.FEEDBACK_BUTTON_CLASSIC_LEFT
                ? "bb-feedback-button-classic--left"
                : ""
                }${flowConfig.feedbackButtonPosition === GleapFeedbackButtonManager.FEEDBACK_BUTTON_CLASSIC_BOTTOM
                    ? "bb-feedback-button-classic--bottom"
                    : ""
                }">${translateText(
                    flowConfig.widgetButtonText,
                    Gleap.getInstance().overrideLanguage
                )}</div>`;
        } else {
            elem.innerHTML = `<div class="bb-feedback-button-icon">${buttonIcon}${loadIcon(
                "arrowdown",
                "#fff"
            )}</div>`;
        }

        elem.onclick = () => {
            this.feedbackButtonPressed();
        };
        
        if (flowConfig.feedbackButtonPosition === GleapFeedbackButtonManager.FEEDBACK_BUTTON_NONE) {
            elem.classList.add("bb-feedback-button--disabled");
        }

        if (flowConfig.feedbackButtonPosition === GleapFeedbackButtonManager.FEEDBACK_BUTTON_BOTTOM_LEFT) {
            elem.classList.add("bb-feedback-button--bottomleft");
        }

        document.body.appendChild(elem);

        this.feedbackButton = elem;
    }

    /**
     * Updates the feedback button state
     * @param {*} retry 
     * @returns 
     */
    updateFeedbackButtonState(retry = false) {
        /*if (this.feedbackButton === null) {
            if (!retry) {
                setTimeout(() => {
                    this.updateFeedbackButtonState(true);
                }, 500);
            }
            return;
        }

        const sendingClass = "bb-feedback-button--sending";
        if (this.widgetOpened) {
            this.feedbackButton.classList.add(sendingClass);
        } else {
            this.feedbackButton.classList.remove(sendingClass);
        }

        const crashedClass = "bb-feedback-button--crashed";
        if (this.appCrashDetected || this.rageClickDetected) {
            this.feedbackButton.classList.add(crashedClass);
        } else {
            this.feedbackButton.classList.remove(crashedClass);
        }

        const dialogContainer = document.querySelector(
            ".bb-feedback-dialog-container"
        );
        const containerFocusClass = "bb-feedback-dialog-container--focused";
        if (dialogContainer) {
            if (this.appCrashDetected || this.rageClickDetected) {
                dialogContainer.classList.add(containerFocusClass);
            } else {
                dialogContainer.classList.remove(containerFocusClass);
            }
        }*/
    }
}
