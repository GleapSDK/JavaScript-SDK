import {
  GleapFrameManager,
  GleapConfigManager,
  GleapNotificationManager,
  GleapTranslationManager,
  GleapSession,
} from "./Gleap";
import { loadIcon } from "./UI";

export default class GleapFeedbackButtonManager {
  feedbackButton = null;
  injectedFeedbackButton = false;
  buttonHidden = null;
  lastButtonIcon = null;

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

  destroy() {
    if (this.feedbackButton) {
      this.feedbackButton.remove();
      this.feedbackButton = null;
    }

    this.buttonHidden = null;
    this.lastButtonIcon = null;
    this.injectedFeedbackButton = false;
    this.instance = null;
  }

  /**
   * Toggles the feedback button visibility.
   * @param {*} show
   * @returns
   */
  toggleFeedbackButton(show) {
    this.buttonHidden = !show;

    GleapFeedbackButtonManager.getInstance().updateFeedbackButtonState();
    GleapNotificationManager.getInstance().updateContainerStyle();
  }

  feedbackButtonPressed() {
    var frameManager = GleapFrameManager.getInstance();
    if (frameManager.isOpened()) {
      frameManager.hideWidget();
    } else {
      frameManager.setAppMode("widget");
      frameManager.showWidget();
    }
  }

  /**
   * Injects the feedback button into the current DOM.
   */
  injectFeedbackButton() {
    if (this.injectedFeedbackButton) {
      return;
    }
    this.injectedFeedbackButton = true;

    var elem = document.createElement("div");
    elem.addEventListener("click", () => {
      this.feedbackButtonPressed();
    });
    document.body.appendChild(elem);
    this.feedbackButton = elem;

    this.updateFeedbackButtonState();
  }

  updateNotificationBadge(count) {
    const notificationBadge = document.querySelector(".bb-notification-bubble");
    if (!notificationBadge) {
      return;
    }

    const notificationHiddenClass = "bb-notification-bubble--hidden";
    if (count > 0) {
      notificationBadge.classList.remove(notificationHiddenClass);
      notificationBadge.innerText = count;
    } else {
      notificationBadge.classList.add(notificationHiddenClass);
    }
  }

  refresh() {
    const feedbackButton = document.querySelector(".bb-feedback-button");
    if (feedbackButton) {
      this.updateFeedbackButtonText();
      this.updateFeedbackButtonState();
    } else {
      this.injectedFeedbackButton = false;
      this.feedbackButton = null;
      this.buttonHidden = null;
      this.lastButtonIcon = null;
      this.injectFeedbackButton();
    }
  }

  updateFeedbackButtonText() {
    const flowConfig = GleapConfigManager.getInstance().getFlowConfig();

    if (
      !(
        flowConfig.feedbackButtonPosition ===
          GleapFeedbackButtonManager.FEEDBACK_BUTTON_CLASSIC ||
        flowConfig.feedbackButtonPosition ===
          GleapFeedbackButtonManager.FEEDBACK_BUTTON_CLASSIC_BOTTOM ||
        flowConfig.feedbackButtonPosition ===
          GleapFeedbackButtonManager.FEEDBACK_BUTTON_CLASSIC_LEFT
      )
    ) {
      return;
    }

    const feedbackButton = document.querySelector(
      ".bb-feedback-button-classic"
    );
    if (!feedbackButton) {
      return;
    }

    feedbackButton.innerText = flowConfig.widgetButtonText;
  }

  /**
   * Updates the feedback button state
   * @returns
   */
  updateFeedbackButtonState() {
    if (this.feedbackButton === null) {
      return;
    }

    const flowConfig = GleapConfigManager.getInstance().getFlowConfig();

    var buttonIcon = "";
    if (flowConfig.buttonLogo) {
      buttonIcon = `<img class="bb-logo-logo" src="${flowConfig.buttonLogo}" alt="Feedback Button" />`;
    } else {
      buttonIcon = loadIcon("button", "#fff");
    }

    this.feedbackButton.className = "bb-feedback-button gleap-font gl-block";
    this.feedbackButton.setAttribute(
      "dir",
      GleapTranslationManager.getInstance().isRTLLayout ? "rtl" : "ltr"
    );

    if (
      flowConfig.feedbackButtonPosition ===
        GleapFeedbackButtonManager.FEEDBACK_BUTTON_CLASSIC ||
      flowConfig.feedbackButtonPosition ===
        GleapFeedbackButtonManager.FEEDBACK_BUTTON_CLASSIC_BOTTOM ||
      flowConfig.feedbackButtonPosition ===
        GleapFeedbackButtonManager.FEEDBACK_BUTTON_CLASSIC_LEFT
    ) {
      this.feedbackButton.classList.add(
        "bb-feedback-button--classic-button-style"
      );

      this.feedbackButton.innerHTML = `<div class="bb-feedback-button-classic ${
        flowConfig.feedbackButtonPosition ===
        GleapFeedbackButtonManager.FEEDBACK_BUTTON_CLASSIC_LEFT
          ? "bb-feedback-button-classic--left"
          : ""
      }${
        flowConfig.feedbackButtonPosition ===
        GleapFeedbackButtonManager.FEEDBACK_BUTTON_CLASSIC_BOTTOM
          ? "bb-feedback-button-classic--bottom"
          : ""
      }">${flowConfig.widgetButtonText}</div>`;
    } else {
      if (buttonIcon !== this.lastButtonIcon) {
        this.feedbackButton.innerHTML = `<div class="bb-feedback-button-icon">${buttonIcon}${loadIcon(
          "arrowdown",
          "#fff"
        )}</div><div class="bb-notification-bubble bb-notification-bubble--hidden"></div>`;
      }
    }

    // Prevent dom update if not needed.
    this.lastButtonIcon = buttonIcon;

    var hideButton = false;
    if (GleapFeedbackButtonManager.getInstance().buttonHidden === null) {
      if (
        flowConfig.feedbackButtonPosition ===
        GleapFeedbackButtonManager.FEEDBACK_BUTTON_NONE
      ) {
        hideButton = true;
      }
    } else {
      if (GleapFeedbackButtonManager.getInstance().buttonHidden) {
        hideButton = true;
      }
    }
    if (hideButton) {
      this.feedbackButton.classList.add("bb-feedback-button--disabled");
    }

    if (
      flowConfig.feedbackButtonPosition ===
      GleapFeedbackButtonManager.FEEDBACK_BUTTON_BOTTOM_LEFT
    ) {
      this.feedbackButton.classList.add("bb-feedback-button--bottomleft");
    }

    if (GleapFrameManager.getInstance().isOpened()) {
      this.feedbackButton.classList.add("bb-feedback-button--open");
    }

    const appMode = GleapFrameManager.getInstance().appMode;
    if (
      appMode === "survey" ||
      appMode === "survey_full" ||
      appMode === "survey_web"
    ) {
      this.feedbackButton.classList.add("bb-feedback-button--survey");
    }

    if (
      flowConfig.hideForGuests === true &&
      !GleapSession.getInstance().isUser()
    ) {
      this.feedbackButton.classList.add("bb-feedback-button--hidden");
    }
  }
}
