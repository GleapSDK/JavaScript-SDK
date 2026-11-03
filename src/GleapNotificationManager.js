import Gleap, {
  GleapFeedbackButtonManager,
  GleapConfigManager,
  GleapSession,
  GleapAudioManager,
  GleapTranslationManager,
  GleapEventManager,
  GleapAiChatbarManager,
  GleapTabCommunication,
  GleapSidekickManager,
} from './Gleap';
import { formatRelativeTime, loadFromGleapCache, saveToGleapCache } from './GleapHelper';
import { checkPageRules } from './GleapPageFilter';
import { loadIcon } from './UI';

// How many notifications may pile up before the oldest drop off. More than one
// renders as a collapsed stack (newest in front), so a higher cap no longer
// costs vertical space.
const MAX_NOTIFICATIONS = 4;

export default class GleapNotificationManager {
  notificationContainer = null;
  notifications = [];
  unreadCount = 0;
  unreadNotificationsKey = 'unread-notifications';
  isTabActive = true;
  showNotificationBadge = true;
  lastPageRulesUrl = undefined;
  stackResizeObserver = null;
  // A sidekick message card (GleapSidekickManager.showCard): rendered in front of the stack, never
  // cached (it belongs to one page view), and not one of `notifications`.
  sidekickCard = null;
  sidekickLiveRegion = null;

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
    GleapEventManager.notifyEvent('unread-count-changed', this.unreadCount);
  }

  injectNotificationUI() {
    if (this.notificationContainer) {
      return;
    }

    var elem = document.createElement('div');
    elem.className = 'gleap-notification-container gleap-font';
    document.body.appendChild(elem);
    this.notificationContainer = elem;

    // Touch devices have no hover to expand a collapsed stack, so the first
    // tap expands it instead of activating the front card. Capture phase, so
    // that first tap never reaches the card's own onclick.
    elem.addEventListener(
      'click',
      (event) => {
        if (
          !elem.classList.contains('gleap-notification-container--stack') ||
          elem.classList.contains('gleap-notification-container--expanded') ||
          !(window.matchMedia && window.matchMedia('(hover: none)').matches)
        ) {
          return;
        }
        // The close button clears directly — expanding first would only be in the way.
        if (event.target && event.target.closest && event.target.closest('.gleap-notification-close')) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        elem.classList.add('gleap-notification-container--expanded');
      },
      true
    );

    this.updateContainerStyle();
    this.reloadNotificationsFromCache();
    if (this.sidekickCard) {
      this.renderNotifications();
    }

    // Start listening for cross-tab notification events (e.g. another tab
    // clearing already-read notifications). Safe/idempotent; no-ops when
    // BroadcastChannel is unavailable.
    GleapTabCommunication.getInstance().start();
  }

  reloadNotificationsFromCache() {
    try {
      const notificationsFromCache = loadFromGleapCache(this.unreadNotificationsKey);
      if (notificationsFromCache && notificationsFromCache.length > 0) {
        const gleapId = GleapSession.getInstance().session?.gleapId;
        let nots = notificationsFromCache.filter(
          (notification) =>
            // Only the contact that received it (unstamped pre-fix entries are dropped).
            gleapId &&
            notification?.cachedForGleapId === gleapId &&
            // Never resurface chatbar-routed notifications in the widget bubble.
            // (Pre-fix builds may have cached them before the routing guard existed.)
            notification?.data?.lastSource !== 'chatbar' &&
            new Date(notification.createdAt) > new Date(Date.now() - 1 * 60 * 60 * 1000)
        );

        // Keep the newest MAX_NOTIFICATIONS — the same end shift() trims from.
        this.notifications = nots.slice(-MAX_NOTIFICATIONS);
        this.renderNotifications();
      } else if (this.sidekickCard) {
        this.renderNotifications();
      }
    } catch (exp) {}
  }

  /**
   * Shows (or, with null, removes) the sidekick message card: the agent's avatar, its message
   * (three lines at most), "<agent> · now", a dismiss button. Clicking it opens the sidekick with
   * the message as the agent's first message (GleapSidekickManager.onCardClicked).
   */
  setSidekickCard(card) {
    const hadCard = !!this.sidekickCard;
    this.sidekickCard = card || null;
    if (!this.notificationContainer) {
      return;
    }
    this.renderNotifications();
    if (card && !hadCard) {
      this.announceSidekickCard(card);
    }
  }

  // Screen readers hear the new message once (a polite live region that outlives the re-renders).
  announceSidekickCard(card) {
    try {
      if (!this.sidekickLiveRegion || !document.body.contains(this.sidekickLiveRegion)) {
        const region = document.createElement('div');
        region.className = 'gleap-sidekick-live';
        region.setAttribute('aria-live', 'polite');
        region.setAttribute('role', 'status');
        document.body.appendChild(region);
        this.sidekickLiveRegion = region;
      }
      const region = this.sidekickLiveRegion;
      region.textContent = '';
      setTimeout(() => {
        region.textContent = `${card.sender && card.sender.name ? card.sender.name + ': ' : ''}${card.message}`;
      }, 100);
    } catch (exp) {}
  }

  renderSidekickCard(card) {
    const sender = card.sender || {};
    const elem = document.createElement('div');
    elem.className = 'gleap-notification-item gleap-notification-card gleap-sidekick-card';
    elem.setAttribute('role', 'group');
    elem.setAttribute('aria-label', sender.name || 'Message');

    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'gleap-notification-item-container gleap-sidekick-card-open';
    open.onclick = (event) => {
      event.stopPropagation();
      try {
        GleapSidekickManager.getInstance().onCardClicked();
      } catch (exp) {}
    };

    if (sender.profileImageUrl) {
      const avatar = document.createElement('img');
      avatar.className = 'gleap-notification-item-avatar gleap-notification-item-avatar--bot';
      avatar.src = sender.profileImageUrl;
      avatar.alt = '';
      open.appendChild(avatar);
    } else {
      const avatar = document.createElement('span');
      avatar.className = 'gleap-notification-item-avatar gleap-notification-item-avatar--bot gleap-sidekick-card-glyph';
      avatar.setAttribute('aria-hidden', 'true');
      avatar.textContent = (sender.name || 'K').trim().charAt(0).toUpperCase();
      open.appendChild(avatar);
    }

    const body = document.createElement('span');
    body.className = 'gleap-notification-item-body';
    const text = document.createElement('span');
    text.className = 'gleap-notification-item-content gleap-sidekick-card-text';
    text.textContent = card.message;
    body.appendChild(text);

    const meta = document.createElement('span');
    meta.className = 'gleap-notification-item-meta';
    if (sender.name) {
      const name = document.createElement('span');
      name.className = 'gleap-notification-item-sender';
      name.textContent = sender.name;
      meta.appendChild(name);
    }
    const time = formatRelativeTime(card.createdAt, GleapTranslationManager.getInstance().getActiveLanguage());
    if (time) {
      if (sender.name) {
        const dot = document.createElement('span');
        dot.className = 'gleap-notification-item-meta-dot';
        dot.setAttribute('aria-hidden', 'true');
        dot.textContent = '·';
        meta.appendChild(dot);
      }
      const timeElem = document.createElement('span');
      timeElem.className = 'gleap-notification-item-time';
      timeElem.textContent = time;
      meta.appendChild(timeElem);
    }
    body.appendChild(meta);
    open.appendChild(body);
    elem.appendChild(open);

    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'gleap-sidekick-card-dismiss';
    const closeLabel = GleapTranslationManager.translateText('close');
    dismiss.setAttribute('aria-label', closeLabel && closeLabel !== 'close' ? closeLabel : 'Close');
    dismiss.innerHTML = loadIcon('dismiss');
    dismiss.onclick = (event) => {
      event.stopPropagation();
      try {
        GleapSidekickManager.getInstance().onCardDismissed();
      } catch (exp) {}
    };
    elem.appendChild(dismiss);

    elem.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        try {
          GleapSidekickManager.getInstance().onCardDismissed();
        } catch (exp) {}
      }
    });
    return elem;
  }

  /**
   * Whether the notification's page rules allow it on the current page.
   * Notifications keep their outbound pageRules/pageFilter when cached, so
   * this can be re-evaluated long after arrival.
   */
  notificationPassesPageRules(notification) {
    try {
      const currentUrl = typeof window !== 'undefined' && window.location ? window.location.href : undefined;
      if (!currentUrl) {
        return true;
      }
      return checkPageRules(currentUrl, notification);
    } catch (exp) {
      return true;
    }
  }

  /**
   * Notifications allowed on the current page. Page rules are evaluated at
   * render time instead of arrival (see performActions): the server marks
   * outbound actions as sent on delivery, so an arrival-time check silently
   * consumed notifications that arrived on an excluded page — and bubbles
   * rendered on an allowed page followed users onto excluded ones.
   */
  getVisibleNotifications() {
    // Cached cards and direct deliveries bypass performActions' arrival guard.
    if (Gleap.getInstance().disableInAppNotifications) {
      return [];
    }
    return this.notifications.filter((notification) => this.notificationPassesPageRules(notification));
  }

  /**
   * Re-evaluates page rules when the URL changes (SPA navigations), so
   * bubbles hide on excluded pages and re-appear on allowed ones. Invoked
   * ~1x/s by GleapStreamedEvent's page listener.
   */
  checkPageRulesForUrl(currentUrl) {
    if (!currentUrl || currentUrl === this.lastPageRulesUrl) {
      return;
    }
    this.lastPageRulesUrl = currentUrl;

    // Only page-ruled notifications can change visibility with the URL.
    const hasPageRuleNotifications = this.notifications.some(
      (notification) => notification?.pageRules?.length > 0 || notification?.pageFilter
    );
    if (!hasPageRuleNotifications) {
      return;
    }

    this.renderNotifications();
  }

  setNotificationCount(unreadCount) {
    this.unreadCount = unreadCount;
    this.updateTabBarNotificationCount();

    // Update the badge counter.
    GleapFeedbackButtonManager.getInstance().updateNotificationBadge(this.unreadCount);
  }

  showNotification(notification) {
    if (!(this.notificationContainer && notification && notification.data)) {
      return;
    }

    // Route conversation notifications by lastSource. Chatbar-origin replies go to the
    // chatbar pill; everything else stays in the widget bubble (unchanged behavior).
    try {
      const lastSource = notification?.data?.lastSource;
      const chatbar = GleapAiChatbarManager.getInstance();
      // Available if enabled for the project, manually shown, or currently visible
      // (e.g. shown before config arrives). showChatbarNotification
      // queues the pill until the frame handshakes, so routing pre-handshake is safe.
      const chatbarAvailable =
        chatbar?.config?.enabled || chatbar?.manuallyShown || (chatbar && !chatbar.isHidden);
      if (lastSource === 'chatbar' && chatbarAvailable) {
        chatbar.showChatbarNotification(notification.data);
        return;
      }
    } catch (e) {}

    const notificationsForOutbound = this.notifications.find((e) => notification.outbound === e.outbound);
    if (!notificationsForOutbound) {
      // The cache key is shared by every contact on this browser; remember who
      // received it so a reload never shows it to another contact.
      notification.cachedForGleapId = GleapSession.getInstance().session?.gleapId;
      this.notifications.push(notification);

      // Play sound only if it's a new one and its page rules allow the
      // current page (it may have arrived on an excluded page and only
      // become visible later).
      if (
        notification.sound &&
        !Gleap.getInstance().disableInAppNotifications &&
        this.notificationPassesPageRules(notification)
      ) {
        GleapAudioManager.ping();
      }
    }
    while (this.notifications.length > MAX_NOTIFICATIONS) {
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

    // Only render notifications whose page rules allow the current page.
    // The full list stays in memory + cache, so they re-appear when the
    // user navigates back to an allowed page (see checkPageRulesForUrl).
    const visibleNotifications = this.getVisibleNotifications();
    const sidekickCard = this.sidekickCard;

    // Append a close button (which clears everything). A sidekick card on its own has its own
    // dismiss button instead.
    if (visibleNotifications.length > 0) {
      const clearElem = document.createElement('div');
      clearElem.onclick = () => {
        // Clearing everything dismisses the sidekick card too.
        if (this.sidekickCard) {
          try {
            GleapSidekickManager.getInstance().onCardDismissed();
          } catch (exp) {}
        }
        this.clearAllNotifications();
        // Reset the news index when everything is closed
        this.currentNewsIndex = 0;
      };
      clearElem.className = 'gleap-notification-close';
      clearElem.innerHTML = loadIcon('dismiss');
      this.notificationContainer.appendChild(clearElem);
    }

    // Separate out news notifications vs. others, then sort news by date ascending
    const newsNotifications = visibleNotifications
      .filter((n) => n.data.news)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const otherNotifications = visibleNotifications.filter((n) => !n.data.news);

    // --- Render NEWS notifications (with pagination) ---
    if (newsNotifications.length > 0) {
      // We only show ONE news item at a time if there's more than one
      const currentIndex = this.currentNewsIndex < newsNotifications.length ? this.currentNewsIndex : 0;
      const currentNews = newsNotifications[currentIndex];

      // Main wrapper for the news notification
      const newsElem = document.createElement('div');
      newsElem.className = 'gleap-notification-item-news gleap-notification-card';

      // The container that holds image + content
      const newsContainerElem = document.createElement('div');
      newsContainerElem.className = 'gleap-notification-item-news-container';

      // Create the image element (clickable)
      if (
        currentNews.data.coverImageUrl &&
        currentNews.data.coverImageUrl !== '' &&
        !currentNews.data.coverImageUrl.includes('NewsImagePlaceholder')
      ) {
        const newsImageElem = document.createElement('img');
        newsImageElem.className = 'gleap-notification-item-news-image';
        newsImageElem.src = currentNews.data.coverImageUrl;

        // Only the image is clickable
        newsImageElem.onclick = (e) => {
          e.stopPropagation();
          this.openNews(currentNews);
        };
        newsContainerElem.appendChild(newsImageElem);
      }

      // The content container
      const newsContentElem = document.createElement('div');
      newsContentElem.className = 'gleap-notification-item-news-content';

      // Title (clickable)
      const newsTitleElem = document.createElement('div');
      newsTitleElem.className = 'gleap-notification-item-news-content-title';

      let content = currentNews.data.text || '';
      content = content.replaceAll('{{name}}', GleapSession.getInstance().getName());
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
        const descElem = document.createElement('div');
        descElem.className = 'gleap-notification-item-news-preview';
        descElem.innerHTML = descHTML;
        newsContentElem.appendChild(descElem);
      }

      // If there's more than one news item, show pagination + next/done button
      if (newsNotifications.length > 1) {
        // Pagination container (still inside .gleap-notification-item-news-content)
        const paginationElem = document.createElement('div');
        paginationElem.className = 'gleap-news-pagination';

        // Show current item / total
        const pageIndicator = document.createElement('span');
        pageIndicator.className = 'gleap-news-page-indicator';
        pageIndicator.innerText = `${currentIndex + 1} / ${newsNotifications.length}`;
        paginationElem.appendChild(pageIndicator);

        // Next or Done button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'gleap-news-next-button';

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
      let content = notification.data.text || '';
      // Replace placeholders
      content = content.replaceAll('{{name}}', GleapSession.getInstance().getName());

      const elem = document.createElement('div');
      elem.onclick = () => {
        if (notification.data.conversation) {
          Gleap.openConversation(notification.data.conversation.shareToken, true);
        } else if (notification.data.checklist) {
          Gleap.openChecklist(notification.data.checklist.id, true);
        } else {
          Gleap.open();
        }
      };

      // Check if it's a checklist type
      if (notification.data.checklist) {
        let progress = Math.round((notification.data.currentStep / notification.data.totalSteps) * 100);
        if (progress < 100) {
          progress += 4;
        }

        elem.className = 'gleap-notification-item-checklist gleap-notification-card';
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
        // Standard non-news notification. Avatar and text live inside one card
        // (no speech-bubble tail), with the sender + time as a meta line below
        // the message.
        elem.className = 'gleap-notification-item gleap-notification-card';
        elem.innerHTML = `
          <div class="gleap-notification-item-container">
            ${this.renderAvatar(notification.data.sender, 'gleap-notification-item-avatar')}
            <div class="gleap-notification-item-body">
              <div class="gleap-notification-item-content">${content}</div>
              ${this.renderMeta(notification)}
            </div>
          </div>`;
      }
      this.notificationContainer.appendChild(elem);
    }

    // The sidekick card goes in front (the newest).
    if (sidekickCard) {
      this.notificationContainer.appendChild(this.renderSidekickCard(sidekickCard));
    }
    if (this.notificationContainer.classList) {
      this.notificationContainer.classList.toggle('gleap-notification-container--sidekick', !!sidekickCard);
    }

    const hasNotifications = newsNotifications.length > 0 || otherNotifications.length > 0 || !!sidekickCard;
    if (!hasNotifications) {
      // Clear the notification container
      this.clearAllNotifications(true);
    }

    // More than one card collapses into a stack — the newest in front, older
    // ones peeking behind it — instead of a full list. Hovering (or, via the
    // container's tap handler, tapping) expands it; any re-render collapses it
    // again. News pagination already folds all news into one card, so it
    // counts once.
    const cardCount = (newsNotifications.length > 0 ? 1 : 0) + otherNotifications.length + (sidekickCard ? 1 : 0);
    if (this.notificationContainer.classList) {
      this.notificationContainer.classList.toggle('gleap-notification-container--stack', cardCount > 1);
      this.notificationContainer.classList.remove('gleap-notification-container--expanded');
    }
    this.updateStackLayout();
  }

  /**
   * Measures the stacked cards and writes the offsets the stack CSS animates
   * between. Every stacked card is bottom-anchored; both its collapsed peek
   * and its expanded slot are plain translateY values, so collapsing and
   * expanding is a pure transform + height transition instead of a layout
   * jump. Re-measures when a card resizes (news cover images load async).
   */
  updateStackLayout() {
    try {
      if (this.stackResizeObserver) {
        this.stackResizeObserver.disconnect();
        this.stackResizeObserver = null;
      }

      const container = this.notificationContainer;
      if (
        !container ||
        !container.classList ||
        !container.classList.contains('gleap-notification-container--stack') ||
        typeof container.querySelectorAll !== 'function'
      ) {
        return;
      }

      const cards = Array.prototype.slice.call(container.querySelectorAll('.gleap-notification-card'));
      if (cards.length < 2) {
        return;
      }

      const measure = () => {
        try {
          // Bottom-anchored boxes, so offsetHeight includes each card's 12px
          // bottom margin — the inter-card gap comes along for free.
          const heights = cards.map((card) => card.offsetHeight || 0);
          const frontHeight = heights[heights.length - 1];
          let totalHeight = 0;
          let expandOffset = 0;
          for (let i = cards.length - 1; i >= 0; i--) {
            const depth = cards.length - 1 - i;
            const peek = depth === 0 ? 0 : depth === 1 ? 9 : 17;
            // Collapsed: tuck the card's top edge `peek`px above the front
            // card's top. Back cards get their bottom clipped so that nothing
            // reaches past the front card's VISUAL bottom (frontHeight minus
            // its 12px margin) — the gap under the front card is transparent,
            // and an unclipped card behind (a news cover) shines through it.
            cards[i].style.setProperty('--gleap-nstack-collapse', `${heights[i] - frontHeight - peek}px`);
            cards[i].style.setProperty('--gleap-nstack-expand', `${-expandOffset}px`);
            const overhang = heights[i] - (frontHeight - 12);
            cards[i].style.setProperty(
              '--gleap-nstack-clip',
              depth > 0 && overhang > 0 ? `${overhang}px` : '-40px'
            );
            expandOffset += heights[i];
            totalHeight += heights[i];
          }
          // 17px of headroom keeps the peeking card edges inside the
          // container's hover area.
          container.style.setProperty('--gleap-nstack-h-collapsed', `${frontHeight + 17}px`);
          container.style.setProperty('--gleap-nstack-h-expanded', `${totalHeight}px`);
        } catch (exp) {}
      };

      measure();

      if (typeof ResizeObserver !== 'undefined') {
        this.stackResizeObserver = new ResizeObserver(measure);
        for (let i = 0; i < cards.length; i++) {
          this.stackResizeObserver.observe(cards[i]);
        }
      }
    } catch (exp) {}
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
   * Sender avatar markup, or '' when there is no image to show.
   *
   * Teammates stay circular and the bot gets a rounded square (shapes live in
   * the stylesheet), the same split the messenger makes in ChatMessageAuthor.
   * `isBot` is absent on notifications cached before the server started sending
   * it, which falls through to the teammate shape — what every avatar looked
   * like until now.
   */
  renderAvatar(sender, className) {
    if (!sender || !sender.profileImageUrl) {
      return '';
    }
    // A team member is free to put a quote in their display name, which would
    // otherwise close the alt attribute and swallow the rest of the tag.
    const alt = String(sender.name || '').replace(/"/g, '&quot;');
    const classes = sender.isBot ? `${className} ${className}--bot` : className;
    return `<img class="${classes}" src="${sender.profileImageUrl}" alt="${alt}" />`;
  }

  /**
   * The "Sender · 5 minutes ago" line under a notification's message. Either
   * half may be missing (no sender on some outbounds, no usable timestamp on
   * browsers without Intl.RelativeTimeFormat), so the separator is only emitted
   * when both are present.
   *
   * The age is taken from sendAt rather than createdAt: a scheduled outbound is
   * written to the database long before it is delivered, and its creation time
   * would surface as an hours-old message the user just received.
   */
  renderMeta(notification) {
    const sender = notification.data.sender;
    const parts = [];

    if (sender && sender.name) {
      parts.push(`<span class="gleap-notification-item-sender">${sender.name}</span>`);
    }

    const time = formatRelativeTime(
      notification.sendAt || notification.createdAt,
      GleapTranslationManager.getInstance().getActiveLanguage()
    );
    if (time) {
      parts.push(`<span class="gleap-notification-item-time">${time}</span>`);
    }

    if (parts.length === 0) {
      return '';
    }

    return `<div class="gleap-notification-item-meta">${parts.join(
      '<span class="gleap-notification-item-meta-dot">•</span>'
    )}</div>`;
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
          ${this.renderAvatar(sender, 'gleap-notification-item-news-sender-avatar')}
          ${sender.name}
        </div>
      `;
    }
    return '';
  }

  /**
   * Removes every notification bubble belonging to one conversation — from this
   * tab's memory, from the shared localStorage cache (so sibling/new tabs and
   * the widget-close reload can't resurrect it), and re-renders. Driven by the
   * WebSocket `rc` (read conversation) field on the session update frame, sent
   * when the conversation transitions unread → read; relayed cross-tab so tabs
   * with a dead/reconnecting socket clear too.
   *
   * @param {string} shareToken - The read conversation's shareToken.
   * @param {boolean} fromOtherTab - True when applying a sibling tab's broadcast (prevents re-broadcast loops).
   */
  clearNotificationsForConversation(shareToken, fromOtherTab = false) {
    if (!shareToken) {
      return;
    }

    try {
      const belongsToConversation = (notification) => notification?.data?.conversation?.shareToken === shareToken;

      // Filter the CACHE contents, not this tab's memory — the cache may hold
      // entries this tab never rendered (bubbles shown while the widget was
      // open here but closed elsewhere), and unrelated cached entries (news,
      // checklists, other conversations) must survive.
      const cachedNotifications = loadFromGleapCache(this.unreadNotificationsKey);
      if (cachedNotifications && cachedNotifications.length > 0) {
        saveToGleapCache(
          this.unreadNotificationsKey,
          cachedNotifications.filter((notification) => !belongsToConversation(notification))
        );
      }

      const countBefore = this.notifications.length;
      this.notifications = this.notifications.filter((notification) => !belongsToConversation(notification));
      if (this.notifications.length !== countBefore) {
        this.renderNotifications();
      }

      // Badge intentionally untouched: the authoritative count `u` travels in
      // the same WebSocket frame (see the GleapTabCommunication docstring).
      if (!fromOtherTab) {
        GleapTabCommunication.getInstance().sendMessage({
          type: 'conversation-notifications-cleared',
          shareToken,
          gleapId: GleapSession.getInstance().session?.gleapId,
        });
      }
    } catch (exp) {}
  }

  /**
   * Clears all notifications from the container.
   *
   * @param {boolean} uiOnly - Whether to only clear the UI or also the notifications.
   * @param {boolean} fromOtherTab - True when applying a clear broadcast from a sibling tab (prevents re-broadcast loops).
   */
  clearAllNotifications(uiOnly = false, fromOtherTab = false) {
    // Clear the state and cache even before the UI is mounted: a clearIdentity()
    // queued in the snippet runs before injectNotificationUI(), which would
    // otherwise replay the previous contact's notifications from the cache.
    if (!uiOnly) {
      this.notifications = [];
      // Reset currentNewsIndex whenever we clear them out
      this.currentNewsIndex = 0;
      saveToGleapCache(this.unreadNotificationsKey, this.notifications);
      // The sidekick card goes with them (the widget opened, another identity…): not a dismissal.
      if (this.sidekickCard) {
        this.sidekickCard = null;
        try {
          GleapSidekickManager.getInstance().onNotificationsCleared();
        } catch (exp) {}
      }
    }

    if (!this.notificationContainer) {
      return;
    }

    while (this.notificationContainer.firstChild) {
      this.notificationContainer.removeChild(this.notificationContainer.firstChild);
    }

    // Propagate genuine (persisted) reads to sibling tabs so they clear the same
    // already-read notifications. The !uiOnly gate keeps this off the per-render
    // clearAllNotifications(true) calls in renderNotifications; fromOtherTab keeps
    // an inbound clear from bouncing back out.
    if (!uiOnly && !fromOtherTab) {
      try {
        GleapTabCommunication.getInstance().sendMessage({
          type: 'notifications-cleared',
          gleapId: GleapSession.getInstance().session?.gleapId,
        });
      } catch (exp) {}
    }
  }

  updateContainerStyle() {
    if (!this.notificationContainer) {
      return;
    }

    const flowConfig = GleapConfigManager.getInstance().getFlowConfig();
    const classLeft = 'gleap-notification-container--left';
    const classNoButton = 'gleap-notification-container--no-button';
    this.notificationContainer.classList.remove(classLeft);
    this.notificationContainer.classList.remove(classNoButton);

    if (
      flowConfig.feedbackButtonPosition === GleapFeedbackButtonManager.FEEDBACK_BUTTON_CLASSIC_LEFT ||
      flowConfig.feedbackButtonPosition === GleapFeedbackButtonManager.FEEDBACK_BUTTON_BOTTOM_LEFT
    ) {
      this.notificationContainer.classList.add(classLeft);
    }

    if (GleapFeedbackButtonManager.getInstance().buttonHidden === null) {
      if (flowConfig.feedbackButtonPosition === GleapFeedbackButtonManager.FEEDBACK_BUTTON_NONE) {
        this.notificationContainer.classList.add(classNoButton);
      }
    } else {
      if (GleapFeedbackButtonManager.getInstance().buttonHidden) {
        this.notificationContainer.classList.add(classNoButton);
      }
    }

    this.notificationContainer.setAttribute('dir', GleapTranslationManager.getInstance().isRTLLayout ? 'rtl' : 'ltr');
  }
}
