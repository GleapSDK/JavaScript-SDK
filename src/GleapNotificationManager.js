import Gleap, {
  GleapFeedbackButtonManager,
  GleapConfigManager,
  GleapFrameManager,
  GleapSession,
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

  // GleapNotificationManager singleton
  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new GleapNotificationManager();
    }
    return this.instance;
  }

  constructor() {

  }

  updateTabBarNotificationCount() {

  }

  /**
   * Injects the feedback button into the current DOM.
   */
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
    // Load persisted notifications.
    const notificationsFromCache = loadFromGleapCache(
      this.unreadNotificationsKey
    );
    if (notificationsFromCache && notificationsFromCache.length > 0) {
      this.notifications = notificationsFromCache;
      this.renderNotifications();
    }
  }

  setNotificationCount(unreadCount) {
    if (GleapFrameManager.getInstance().isOpened()) {
      this.unreadCount = 0;
      this.updateTabBarNotificationCount();
      return;
    } else {
      this.unreadCount = unreadCount;
    }

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
    }
    if (this.notifications.length > 3) {
      this.notifications.shift();
    }

    // Persist notifications.
    saveToGleapCache(this.unreadNotificationsKey, this.notifications);

    this.renderNotifications();
  }

  renderNotifications() {
    if (!this.notificationContainer) {
      return;
    }

    // Clear the existing notifications.
    this.clearAllNotifications(true);

    // Append close button.
    const clearElem = document.createElement("div");
    clearElem.onclick = () => {
      this.clearAllNotifications();
    };
    clearElem.className = "gleap-notification-close";
    clearElem.innerHTML = loadIcon("dismiss");
    this.notificationContainer.appendChild(clearElem);

    // Render the notifications.
    for (var i = 0; i < this.notifications.length; i++) {
      const notification = this.notifications[i];

      var content = notification.data.text;

      // Try replacing the session name.
      content = content.replaceAll(
        "{{name}}",
        GleapSession.getInstance().getName()
      );

      const elem = document.createElement("div");
      elem.onclick = () => {
        if (notification.data.conversation) {
          Gleap.openConversation(notification.data.conversation.shareToken);
        } else if (notification.data.news) {
          Gleap.openNewsArticle(notification.data.news.id);
        } else {
          Gleap.open();
        }
      };

      if (notification.data.news) {
        // News preview
        elem.className = "gleap-notification-item-news";
        elem.innerHTML = `
        <div class="gleap-notification-item-news-container">
          ${notification.data.coverImageUrl ? `<img class="gleap-notification-item-news-image" src="${notification.data.coverImageUrl}" />` : ''}
          <div class="gleap-notification-item-news-content">
          <div class="gleap-notification-item-news-content-title">${content}</div>
            ${notification.data.sender ? `
            <div  class="gleap-notification-item-news-sender">
              ${notification.data.sender.profileImageUrl &&
            `<img src="${notification.data.sender.profileImageUrl}" />`
            } ${notification.data.sender.name}</div>`
            : ""
          }
          </div>
        </div>`;
      } else {
        // Notification item.
        elem.className = "gleap-notification-item";
        elem.innerHTML = `
            ${notification.data.sender &&
          notification.data.sender.profileImageUrl &&
          `<img src="${notification.data.sender.profileImageUrl}" />`
          }
            <div class="gleap-notification-item-container">
                ${notification.data.sender
            ? `<div  class="gleap-notification-item-sender">${notification.data.sender.name}</div>`
            : ""
          }
                <div class="gleap-notification-item-content">${content}</div>
            </div>`;
      }

      this.notificationContainer.appendChild(elem);
    }
  }

  clearAllNotifications(uiOnly = false) {
    if (!this.notificationContainer) {
      return;
    }

    if (!uiOnly) {
      this.notifications = [];
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
  }
}
