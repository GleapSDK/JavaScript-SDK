import {
  GleapNotificationManager,
  GleapSession,
  GleapFeedbackButtonManager,
  GleapAiChatbarManager,
} from './Gleap';

/**
 * Cross-tab communication channel.
 *
 * When the Gleap SDK is loaded in several tabs at once, each tab has its own
 * WebSocket and renders notifications independently. Reading the messages in one
 * tab therefore leaves stale toasts + badge in the other tabs. This singleton
 * uses a same-origin BroadcastChannel to propagate the "notifications were
 * cleared" intent so sibling tabs can tear down their already-read toasts.
 *
 * We deliberately only broadcast the clear intent, never the unread count: the
 * count `u` and notification actions `a` travel together in the same WebSocket
 * `update` frame, so every tab already receives its own authoritative count.
 * The receiving tab optimistically hides its badge (mirroring
 * GleapFrameManager.updateUI) and its next socket frame reconciles the number.
 *
 * The same seam also carries `chatbar-notification-cleared`: chatbar-routed
 * replies surface as a pill inside the AI chatbar iframe (see
 * GleapAiChatbarManager.showChatbarNotification), which the widget bubble's clear
 * never touches. Reading that pill in one tab broadcasts here so sibling tabs
 * dismiss their own pill (relayed into their iframe by hideChatbarNotification).
 *
 * The transport (sendMessage/handleMessage) is kept as a single seam so a
 * localStorage `storage`-event fallback could be added later without touching
 * the rest of the SDK. BroadcastChannel is supported in all evergreen browsers
 * and Safari >= 15.4; older browsers simply degrade to today's behavior.
 */
export default class GleapTabCommunication {
  channel = null;

  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new GleapTabCommunication();
    }
    return this.instance;
  }

  constructor() {}

  /**
   * Opens the cross-tab channel. Idempotent and safe to call when
   * BroadcastChannel is unavailable (SSR / old browsers) or blocked (privacy
   * mode) — it simply no-ops.
   */
  start() {
    if (this.channel) {
      return;
    }

    if (typeof BroadcastChannel === 'undefined') {
      return;
    }

    try {
      // Namespaced by sdkKey (stable across login/logout). Per-user isolation is
      // handled per-message via the gleapId guard in handleMessage.
      const sdkKey = GleapSession.getInstance().sdkKey;
      this.channel = new BroadcastChannel(`gleap-tabs-${sdkKey}`);
      this.channel.onmessage = (event) => this.handleMessage(event && event.data);
    } catch (exp) {
      this.channel = null;
    }
  }

  sendMessage(data) {
    if (!this.channel) {
      return;
    }

    try {
      this.channel.postMessage(data);
    } catch (exp) {}
  }

  handleMessage(data) {
    try {
      if (!data || !data.type) {
        return;
      }

      // Only apply when both tabs are the same identified user. This also drops
      // clearSession-originated broadcasts (gleapId null), so logout stays local.
      const localId = GleapSession.getInstance().session?.gleapId;
      if (!data.gleapId || !localId || data.gleapId !== localId) {
        return;
      }

      if (data.type === 'notifications-cleared') {
        // fromOtherTab = true prevents a re-broadcast loop.
        GleapNotificationManager.getInstance().clearAllNotifications(false, true);
        // Optimistically hide the badge, mirroring GleapFrameManager.updateUI.
        // Each tab's next WebSocket frame reconciles the true count.
        GleapFeedbackButtonManager.getInstance().updateNotificationBadge(0);
      }

      if (data.type === 'conversation-notifications-cleared' && data.shareToken) {
        // A sibling tab read a conversation; drop its bubbles here too. Covers
        // tabs whose socket is dead/reconnecting and thus missed the `rc`
        // frame. fromOtherTab = true prevents a re-broadcast loop.
        GleapNotificationManager.getInstance().clearNotificationsForConversation(data.shareToken, true);
      }

      if (data.type === 'chatbar-notification-cleared') {
        // A sibling tab read/dismissed the AI chatbar pill. Dismiss ours too,
        // applying with fromOtherTab = true so it isn't re-broadcast (loop guard).
        GleapAiChatbarManager.getInstance().hideChatbarNotification(true);
      }
    } catch (exp) {}
  }

  stop() {
    try {
      this.channel && this.channel.close();
    } catch (exp) {}
    this.channel = null;
  }
}
