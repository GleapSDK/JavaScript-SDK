import Gleap from "./Gleap";

export default class GleapFeedbackButtonManager {
    feedbackButton = null;

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
    
    /**
     * Injects the feedback button into the current DOM.
     */
    injectFeedbackButton() {
        var buttonIcon = "";
        if (this.customButtonLogoUrl) {
            buttonIcon = `<img class="bb-logo-logo" src="${this.customButtonLogoUrl}" alt="Feedback Button" />`;
        } else {
            buttonIcon = loadIcon("bblogo", "#fff");
        }

        var elem = document.createElement("div");
        elem.className = "bb-feedback-button";
        if (
            this.buttonType === Gleap.FEEDBACK_BUTTON_CLASSIC ||
            this.buttonType === Gleap.FEEDBACK_BUTTON_CLASSIC_BOTTOM ||
            this.buttonType === Gleap.FEEDBACK_BUTTON_CLASSIC_LEFT
        ) {
            elem.innerHTML = `<div class="bb-feedback-button-classic ${this.buttonType === Gleap.FEEDBACK_BUTTON_CLASSIC_LEFT
                ? "bb-feedback-button-classic--left"
                : ""
                }${this.buttonType === Gleap.FEEDBACK_BUTTON_CLASSIC_BOTTOM
                    ? "bb-feedback-button-classic--bottom"
                    : ""
                }">${translateText(
                    this.feedbackButtonText,
                    this.overrideLanguage
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

        Gleap.appendNode(elem);

        if (this.buttonType === Gleap.FEEDBACK_BUTTON_NONE) {
            elem.classList.add("bb-feedback-button--disabled");
        }

        if (this.buttonType === Gleap.FEEDBACK_BUTTON_BOTTOM_LEFT) {
            elem.classList.add("bb-feedback-button--bottomleft");
        }

        this.feedbackButton = elem;
    }

    updateFeedbackButtonState(retry = false) {
        if (this.feedbackButton === null) {
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
        }
    }
}
