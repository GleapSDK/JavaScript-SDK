import Gleap, {
  GleapFeedbackButtonManager,
  GleapConfigManager,
  GleapSession,
  GleapAudioManager,
  GleapTranslationManager,
  GleapEventManager,
} from "./Gleap";
import { loadFromGleapCache, saveToGleapCache } from "./GleapHelper";
import { loadIcon } from "./UI";

export default class GleapNotificationManager {
  notificationContainer = null;
  notifications = [];
  unreadCount = 0;
  unreadNotificationsKey = "unread-notifications";
  isTabActive = true;
  showNotificationBadge = true;

  // Keep track of the current index of news being shown
  currentNewsIndex = 0;

  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new GleapNotificationManager();
    }
    return this.instance;
  }

  constructor() {}

  updateTabBarNotificationCount() {
    GleapEventManager.notifyEvent("unread-count-changed", this.unreadCount);
  }

  injectNotificationUI() {
    if (this.notificationContainer) {
      return;
    }

    var elem = document.createElement("div");
    elem.className = "gleap-notification-container gleap-font";
    document.body.appendChild(elem);
    this.notificationContainer = elem;

    this.updateContainerStyle();
    this.reloadNotificationsFromCache();
  }

  reloadNotificationsFromCache() {
    try {
      const notificationsFromCache = loadFromGleapCache(
        this.unreadNotificationsKey
      );
      if (notificationsFromCache && notificationsFromCache.length > 0) {
        let nots = notificationsFromCache.filter(
          (notification) =>
            new Date(notification.createdAt) >
            new Date(Date.now() - 1 * 60 * 60 * 1000)
        );

        if (nots.length > 2) {
          this.notifications = nots.splice(0, nots.length - 2);
        } else {
          this.notifications = nots;
        }
        this.renderNotifications();
      }
    } catch (exp) {}
  }

  setNotificationCount(unreadCount) {
    this.unreadCount = unreadCount;
    this.updateTabBarNotificationCount();

    // Update the badge counter.
    GleapFeedbackButtonManager.getInstance().updateNotificationBadge(
      this.unreadCount
    );
  }

  showNotification(notification) {
    if (!(this.notificationContainer && notification && notification.data)) {
      return;
    }

    const notificationsForOutbound = this.notifications.find(
      (e) => notification.outbound === e.outbound
    );
    if (!notificationsForOutbound) {
      this.notifications.push(notification);

      // Play sound only if it's a new one
      if (notification.sound) {
        GleapAudioManager.ping();
      }
    }
    if (this.notifications.length > 2) {
      this.notifications.shift();
    }

    // Persist notifications.
    saveToGleapCache(this.unreadNotificationsKey, this.notifications);

    this.renderNotifications();
  }

  /**
   * Renders notifications. For news-type notifications, only show
   * one at a time if there are multiple, with a "Next" button to cycle.
   * The "Next" button + pagination are placed within the news content area.
   *
   * - Sorts news notifications by createdAt (oldest first).
   * - Shows "Done" on the last news item instead of "Next".
   */
  renderNotifications() {
    if (!this.notificationContainer) {
      return;
    }

    // Clear the existing notifications in the container (UI only).
    this.clearAllNotifications(true);

    // Append a close button (which clears everything).
    const clearElem = document.createElement("div");
    clearElem.onclick = () => {
      this.clearAllNotifications();
      // Reset the news index when everything is closed
      this.currentNewsIndex = 0;
    };
    clearElem.className = "gleap-notification-close";
    clearElem.innerHTML = loadIcon("dismiss");
    this.notificationContainer.appendChild(clearElem);

    // Separate out news notifications vs. others, then sort news by date ascending
    const newsNotifications = this.notifications
      .filter((n) => n.data.news)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const otherNotifications = this.notifications.filter((n) => !n.data.news);

    // --- Render NEWS notifications (with pagination) ---
    if (newsNotifications.length > 0) {
      // We only show ONE news item at a time if there's more than one
      const currentIndex =
        this.currentNewsIndex < newsNotifications.length
          ? this.currentNewsIndex
          : 0;
      const currentNews = newsNotifications[currentIndex];

      // Main wrapper for the news notification
      const newsElem = document.createElement("div");
      newsElem.className = "gleap-notification-item-news";

      // The container that holds image + content
      const newsContainerElem = document.createElement("div");
      newsContainerElem.className = "gleap-notification-item-news-container";

      // Create the image element (clickable)
      if (
        currentNews.data.coverImageUrl &&
        currentNews.data.coverImageUrl !== "" &&
        !currentNews.data.coverImageUrl.includes("NewsImagePlaceholder")
      ) {
        const newsImageElem = document.createElement("img");
        newsImageElem.className = "gleap-notification-item-news-image";
        newsImageElem.src = currentNews.data.coverImageUrl;

        // Only the image is clickable
        newsImageElem.onclick = (e) => {
          e.stopPropagation();
          this.openNews(currentNews);
        };
        newsContainerElem.appendChild(newsImageElem);
      }

      // The content container
      const newsContentElem = document.createElement("div");
      newsContentElem.className = "gleap-notification-item-news-content";

      // Title (clickable)
      const newsTitleElem = document.createElement("div");
      newsTitleElem.className = "gleap-notification-item-news-content-title";

      let content = currentNews.data.text || "";
      content = content.replaceAll(
        "{{name}}",
        GleapSession.getInstance().getName()
      );
      newsTitleElem.innerText = content;

      // Only the title is clickable
      newsTitleElem.onclick = (e) => {
        e.stopPropagation();
        this.openNews(currentNews);
      };

      newsContentElem.appendChild(newsTitleElem);

      // Description / Sender
      const descHTML = this.renderDescription(currentNews);
      if (descHTML) {
        const descElem = document.createElement("div");
        descElem.className = "gleap-notification-item-news-preview";
        descElem.innerHTML = descHTML;
        newsContentElem.appendChild(descElem);
      }

      // If there's more than one news item, show pagination + next/done button
      if (newsNotifications.length > 1) {
        // Pagination container (still inside .gleap-notification-item-news-content)
        const paginationElem = document.createElement("div");
        paginationElem.className = "gleap-news-pagination";

        // Show current item / total
        const pageIndicator = document.createElement("span");
        pageIndicator.className = "gleap-news-page-indicator";
        pageIndicator.innerText = `${currentIndex + 1} / ${
          newsNotifications.length
        }`;
        paginationElem.appendChild(pageIndicator);

        // Next or Done button
        const nextBtn = document.createElement("button");
        nextBtn.className = "gleap-news-next-button";

        if (currentIndex < newsNotifications.length - 1) {
          nextBtn.innerText = GleapTranslationManager.translateText(`next`);
          nextBtn.onclick = (e) => {
            e.stopPropagation(); // so we can click the button freely
            this.currentNewsIndex++;
            this.renderNotifications();
          };
        } else {
          nextBtn.innerText = GleapTranslationManager.translateText(`done`);
          nextBtn.onclick = (e) => {
            e.stopPropagation();
            this.clearAllNotifications();
            this.currentNewsIndex = 0;
          };
        }
        paginationElem.appendChild(nextBtn);
        newsContentElem.appendChild(paginationElem);
      }

      // Append content to container
      newsContainerElem.appendChild(newsContentElem);
      // Append container to the main element
      newsElem.appendChild(newsContainerElem);
      // Finally append to the notification container
      this.notificationContainer.appendChild(newsElem);
    }

    // --- Render OTHER notifications normally ---
    for (let i = 0; i < otherNotifications.length; i++) {
      const notification = otherNotifications[i];
      let content = notification.data.text || "";
      // Replace placeholders
      content = content.replaceAll(
        "{{name}}",
        GleapSession.getInstance().getName()
      );

      const elem = document.createElement("div");
      elem.onclick = () => {
        if (notification.data.conversation) {
          Gleap.openConversation(
            notification.data.conversation.shareToken,
            true
          );
        } else if (notification.data.checklist) {
          Gleap.openChecklist(notification.data.checklist.id, true);
        } else {
          Gleap.open();
        }
      };

      // Check if it's a checklist type
      if (notification.data.checklist) {
        let progress = Math.round(
          (notification.data.currentStep / notification.data.totalSteps) * 100
        );
        if (progress < 100) {
          progress += 4;
        }

        elem.className = "gleap-notification-item-checklist";
        elem.innerHTML = `
          <div class="gleap-notification-item-checklist-container">
            <div class="gleap-notification-item-checklist-content">
              <div class="gleap-notification-item-checklist-content-title">
                ${notification.data.text}
              </div>
              <div class="gleap-notification-item-checklist-content-progress">
                <div class="gleap-notification-item-checklist-content-progress-inner" style="width: ${progress}%;"></div>
              </div>
              <div class="gleap-notification-item-checklist-content-next">
                <svg width="24" height="24" viewBox="0 0 24 24"
                  fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 12H20M20 12L14 6M20 12L14 18"
                    stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                ${notification.data.nextStepTitle}
              </div>
            </div>
          </div>`;
      } else {
        // Standard non-news notification
        elem.className = "gleap-notification-item";
        elem.innerHTML = `
          ${
            notification.data.sender &&
            notification.data.sender.profileImageUrl &&
            `<img src="${notification.data.sender.profileImageUrl}" />`
          }
          <div class="gleap-notification-item-container">
            ${
              notification.data.sender
                ? `<div class="gleap-notification-item-sender">
                     ${notification.data.sender.name}
                   </div>`
                : ""
            }
            <div class="gleap-notification-item-content">${content}</div>
          </div>`;
      }
      this.notificationContainer.appendChild(elem);
    }

    const hasNotifications =
      newsNotifications.length > 0 || otherNotifications.length > 0;
    if (!hasNotifications) {
      // Clear the notification container
      this.clearAllNotifications(true);
    }
  }

  /**
   * Helper to open news from a given notification.
   */
  openNews(notification) {
    if (notification.data.news) {
      Gleap.openNewsArticle(notification.data.news.id, true);
    } else {
      Gleap.open();
    }
  }

  /**
   * Helper to render preview or sender info for news notifications.
   */
  renderDescription(notification) {
    const { previewText, sender } = notification.data;
    if (previewText && previewText.length > 0) {
      return previewText;
    } else if (sender) {
      // Return HTML for the sender name + optional image
      return `
        <div class="gleap-notification-item-news-sender">
          ${
            sender.profileImageUrl
              ? `<img src="${sender.profileImageUrl}" alt="${sender.name}" />`
              : ""
          }
          ${sender.name}
        </div>
      `;
    }
    return "";
  }

  /**
   * Clears all notifications from the container.
   *
   * @param {boolean} uiOnly - Whether to only clear the UI or also the notifications.
   */
  clearAllNotifications(uiOnly = false) {
    if (!this.notificationContainer) {
      return;
    }

    if (!uiOnly) {
      this.notifications = [];
      // Reset currentNewsIndex whenever we clear them out
      this.currentNewsIndex = 0;
      saveToGleapCache(this.unreadNotificationsKey, this.notifications);
    }

    while (this.notificationContainer.firstChild) {
      this.notificationContainer.removeChild(
        this.notificationContainer.firstChild
      );
    }
  }

  updateContainerStyle() {
    if (!this.notificationContainer) {
      return;
    }

    const flowConfig = GleapConfigManager.getInstance().getFlowConfig();
    const classLeft = "gleap-notification-container--left";
    const classNoButton = "gleap-notification-container--no-button";
    this.notificationContainer.classList.remove(classLeft);
    this.notificationContainer.classList.remove(classNoButton);

    if (
      flowConfig.feedbackButtonPosition ===
        GleapFeedbackButtonManager.FEEDBACK_BUTTON_CLASSIC_LEFT ||
      flowConfig.feedbackButtonPosition ===
        GleapFeedbackButtonManager.FEEDBACK_BUTTON_BOTTOM_LEFT
    ) {
      this.notificationContainer.classList.add(classLeft);
    }

    if (GleapFeedbackButtonManager.getInstance().buttonHidden === null) {
      if (
        flowConfig.feedbackButtonPosition ===
        GleapFeedbackButtonManager.FEEDBACK_BUTTON_NONE
      ) {
        this.notificationContainer.classList.add(classNoButton);
      }
    } else {
      if (GleapFeedbackButtonManager.getInstance().buttonHidden) {
        this.notificationContainer.classList.add(classNoButton);
      }
    }

    this.notificationContainer.setAttribute(
      "dir",
      GleapTranslationManager.getInstance().isRTLLayout ? "rtl" : "ltr"
    );
  }
}
