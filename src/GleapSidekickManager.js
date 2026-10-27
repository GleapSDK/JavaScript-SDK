import Gleap, {
  GleapAiChatbarManager,
  GleapConfigManager,
  GleapEventManager,
  GleapFrameManager,
  GleapModalManager,
  GleapNotificationManager,
  GleapProductTours,
  GleapSession,
  GleapTabCommunication,
  GleapTranslationManager,
} from './Gleap';
import { loadFromGleapCache, saveToGleapCache } from './GleapHelper';
import {
  SIDEKICK_HIDDEN_MAX_WAIT_MS,
  SIDEKICK_PHONE_MAX_WIDTH,
  SIDEKICK_PUSH_MIN_PAGE_WIDTH,
  SIDEKICK_TYPING_IDLE_MS,
  SIDEKICK_TYPING_MAX_WAIT_MS,
  SIDEKICK_WIDTH,
  buildSidekickEnvelope,
  normalizeSidekickContext,
  proactiveRefusalOf,
  proactiveSidekickOf,
  pushRiskOf,
  sidekickCardKeyOf,
  sidekickCardOf,
  sidekickModeOf,
} from './GleapSidekickRules';

const DISMISSED_CACHE_KEY = 'sidekick-dismissed';
const BACKDROP_CLASS = 'gleap-sidekick-backdrop';
const OPEN_CLASS = 'gleap-sidekick-open';
const PUSH_CLASS = 'gleap-sidekick-push';
// The panel slides out in 0.24 s; the page and its margin come back with it.
const CLOSE_ANIMATION_MS = 280;
const PUSH_TRANSITION = 'margin 0.32s cubic-bezier(0.16, 1, 0.3, 1)';

// Gleap's own elements never count as page content under the panel.
const isGleapElement = (element) => {
  for (let node = element, depth = 0; node && node.nodeType === 1 && depth < 12; node = node.parentElement, depth += 1) {
    const className = typeof node.className === 'string' ? node.className : '';
    if (/(^|\s)(gleap-|bb-feedback|bb-capture)/.test(className)) {
      return true;
    }
  }
  return false;
};

// The element's (or an ancestor's) fixed box, if it is positioned fixed.
const fixedAncestorOf = (element) => {
  for (let node = element, depth = 0; node && node.nodeType === 1 && depth < 12; node = node.parentElement, depth += 1) {
    if (node === document.body || node === document.documentElement) {
      return null;
    }
    try {
      if (window.getComputedStyle(node).position === 'fixed') {
        return node;
      }
    } catch (e) {
      return null;
    }
  }
  return null;
};

const pagePathOf = (href) => {
  try {
    const url = new URL(href);
    return url.origin + url.pathname;
  } catch (e) {
    return href || '';
  }
};

const isEditable = (element) => {
  if (!element || element.nodeType !== 1) {
    return false;
  }
  const tag = element.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || element.isContentEditable === true;
};

/**
 * The sidekick (decision 13): an agent (Kai Support or one of the workspace's
 * customer agents) in a full-height side panel next to the page, with the
 * page's context. It is an app mode of the widget frame (`sidekick`): one
 * frame, one connection. This manager owns the page side: the backdrop that
 * dims and blocks the page, the push margin, restoring the page exactly, the
 * context envelope, proactive opens from the socket and their limits.
 */
export default class GleapSidekickManager {
  isOpen = false;
  mode = null;
  // What the open asked for ('push' or not): the layout follows the viewport with it.
  requestedMode = null;
  // What the app said with setSidekickContext / openSidekick ({ title?, step?, data? }).
  appContext = null;
  // The open's options (agent, greeting, question) as the frame got them.
  openOptions = null;
  // Set while a proactive open is on screen: { id, triggerKey, engaged }.
  activeProactive = null;
  // What the messenger frame announced in its ping: null until it pinged.
  frameCaps = null;
  proactiveEnabled = true;
  // The page view a proactive open already used (the page's href).
  proactivePageView = null;
  pageView = null;
  lastSentEnvelope = null;
  lastHostKeyAt = 0;
  closeReason = null;
  restoreState = null;
  // The page styles a closing push still has to put back (its timer runs after the slide).
  pendingRestore = null;
  backdrop = null;
  closeTimer = null;
  pendingProactiveTimer = null;
  // Why the last open did not push (pushRiskOf), for the sidekick-opened event.
  pushFallback = null;
  relayoutFrame = null;
  // The message card above the launcher (showCard): { key, agentId, message, sender, proactive, pagePath }.
  card = null;

  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new GleapSidekickManager();
    }
    return this.instance;
  }

  constructor() {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }
    try {
      this.pageView = window.location.href;
      // Typing on the page (never inside the frame: another document) holds proactive opens back.
      document.addEventListener(
        'keydown',
        (event) => {
          if (isEditable(event.target)) {
            this.lastHostKeyAt = Date.now();
          }
        },
        true
      );
      window.addEventListener('resize', () => this.scheduleRelayout());
    } catch (e) {}
  }

  // ── Public API (Gleap.openSidekick & co.) ───────────────────────────────

  /**
   * Opens the sidekick. options: { agentId?, context?, initialMessage?, initialQuestion?, mode?, newConversation? }.
   * meta (internal): { proactive?: { id, triggerKey } }.
   */
  open(options = {}, meta = {}) {
    const opts = options && typeof options === 'object' ? options : {};
    if (Object.prototype.hasOwnProperty.call(opts, 'context')) {
      this.appContext = normalizeSidekickContext(opts.context);
    }

    // A messenger frame that pinged without the sidekick (an older build somewhere): the AI bar's
    // startAgent still gets the customer to the agent.
    if (this.frameCaps && this.frameCaps.indexOf('sidekick') === -1) {
      this.fallbackToChatbar(opts);
      return;
    }

    const frameManager = GleapFrameManager.getInstance();
    const agentId = typeof opts.agentId === 'string' && opts.agentId.trim() && opts.agentId !== 'kai' ? opts.agentId.trim() : null;
    const wasOpen = this.isOpen;
    if (!wasOpen) {
      this.captureRestoreState();
    }
    clearTimeout(this.closeTimer);
    this.closeTimer = null;
    this.isOpen = true;
    this.closeReason = null;
    // Opened from a card the customer clicked: chosen, so closing it is not a dismissal.
    this.activeProactive =
      meta && meta.proactive ? { ...meta.proactive, engaged: meta.proactive.engaged === true } : null;
    // Push is the default; overlay only when asked for (or when the page has no room / could break).
    this.requestedMode = opts.mode === 'overlay' ? 'overlay' : 'push';
    this.mode = this.modeForViewport();
    // The panel takes over from any message card.
    this.removeCard('opened');
    this.openOptions = {
      agentId,
      botId: agentId ? null : this.defaultWorkflowId(),
      initialMessage: typeof opts.initialMessage === 'string' ? opts.initialMessage : undefined,
      initialQuestion: typeof opts.initialQuestion === 'string' ? opts.initialQuestion : undefined,
      newConversation: opts.newConversation === true,
      proactiveId: this.activeProactive ? this.activeProactive.id : null,
    };

    this.applyLayout();

    const envelope = this.currentEnvelope();
    this.lastSentEnvelope = JSON.stringify(envelope);
    frameManager.setAppMode('sidekick');
    frameManager.sendMessage({ name: 'sidekick-open', data: { ...this.openOptions, context: envelope } }, true);
    frameManager.showWidget();

    if (!wasOpen) {
      GleapEventManager.notifyEvent('sidekick-opened', {
        agentId,
        mode: this.mode,
        proactive: !!this.activeProactive,
        ...(this.pushFallback ? { pushFallback: this.pushFallback } : {}),
      });
    }
  }

  close(reason = 'api') {
    if (!this.isOpen) {
      return;
    }
    this.closeReason = reason;
    GleapFrameManager.getInstance().hideWidget();
  }

  setContext(context) {
    this.appContext = normalizeSidekickContext(context);
    this.sendContextIfChanged();
  }

  setProactiveEnabled(enabled) {
    this.proactiveEnabled = enabled !== false;
  }

  // ── Hooks from the frame manager ────────────────────────────────────────

  /** The messenger frame pinged. Returns true when the sidekick fell back and the frame must not open. */
  onFramePing(pingData) {
    const caps = pingData && Array.isArray(pingData.caps) ? pingData.caps.filter((cap) => typeof cap === 'string') : [];
    this.frameCaps = caps;
    if (!this.isOpen || caps.indexOf('sidekick') !== -1) {
      return false;
    }
    // Opened before the frame said what it can, and it can't: undo and use the AI bar.
    const frameManager = GleapFrameManager.getInstance();
    frameManager.queue = (frameManager.queue || []).filter((message) => !message || message.name !== 'sidekick-open');
    const opts = { ...this.openOptions };
    this.teardown('replaced');
    frameManager.appMode = 'widget';
    frameManager.updateFrameStyle();
    this.fallbackToChatbar(opts);
    return true;
  }

  /** The frame manager hid the widget while it was the sidekick. */
  onWidgetHidden() {
    if (!this.isOpen) {
      return;
    }
    this.teardown(this.closeReason || 'api');
    clearTimeout(this.closeTimer);
    this.closeTimer = setTimeout(() => {
      this.closeTimer = null;
      const frameManager = GleapFrameManager.getInstance();
      // Back to the widget once the panel slid out, unless something reopened it meanwhile.
      if (!this.isOpen && !frameManager.widgetOpened && frameManager.appMode === 'sidekick') {
        frameManager.appMode = 'widget';
        frameManager.updateFrameStyle();
      }
    }, CLOSE_ANIMATION_MS);
  }

  /** Something switches the frame to another mode (Gleap.open, a survey…) while the sidekick is open. */
  onLeaveSidekickMode() {
    if (!this.isOpen) {
      return;
    }
    this.closeReason = 'replaced';
    GleapFrameManager.getInstance().hideWidget();
  }

  /** Messages from the messenger frame about the sidekick. */
  onFrameMessage(data) {
    if (!data || !data.name) {
      return;
    }
    if (data.name === 'sidekick-close') {
      const reason = data.data && data.data.reason === 'escape' ? 'escape' : 'close';
      this.close(reason);
    }
    if (data.name === 'sidekick-engaged' && this.activeProactive) {
      this.activeProactive.engaged = true;
    }
  }

  /** The page poll (1 s): a new page view, a new URL or title for the open panel. */
  checkUrl(href) {
    if (href && href !== this.pageView) {
      this.pageView = href;
    }
    // A card belongs to the page it showed on: another route takes it away (not a dismissal).
    if (this.card && href && pagePathOf(href) !== this.card.pagePath) {
      this.removeCard('navigation');
    }
    this.sendContextIfChanged();
  }

  /** Escape on the host page: closes an overlay/sheet; a push panel leaves the usable page its own Escape. */
  shouldCloseOnPageEscape(event) {
    if (!this.isOpen) {
      return false;
    }
    if (this.mode !== 'push') {
      return true;
    }
    if (event && event.defaultPrevented) {
      return false;
    }
    try {
      const active = document.activeElement;
      const frame = GleapFrameManager.getInstance().gleapFrame;
      return !active || active === document.body || active === document.documentElement || active === frame;
    } catch (e) {
      return false;
    }
  }

  // ── Proactive opens (socket `sidekick`) ─────────────────────────────────

  handleProactive(data) {
    const proactive = proactiveSidekickOf(data);
    if (!proactive) {
      return;
    }
    const startedAt = Date.now();
    const refusalNow = () =>
      proactiveRefusalOf({
        // A page that turned off in-app notifications gets no cards either (an open was never one).
        enabled: this.proactiveEnabled && !(proactive.display === 'card' && this.inAppNotificationsDisabled()),
        shownThisPageView: this.proactivePageView !== null && this.proactivePageView === this.pageView,
        busy: this.isBusy(),
        dismissedAt: this.dismissedAt(proactive.triggerKey),
        now: Date.now(),
      });

    // A card waits for nothing: it sits above the launcher until it is clicked or dismissed.
    if (proactive.display === 'card') {
      clearTimeout(this.pendingProactiveTimer);
      this.pendingProactiveTimer = null;
      const refusal = refusalNow();
      if (refusal) {
        this.reportProactive(proactive, false, refusal);
        return;
      }
      this.proactivePageView = this.pageView;
      this.showCard(
        { agentId: proactive.agentId, message: proactive.message, sender: proactive.sender },
        { proactive: { id: proactive.id, triggerKey: proactive.triggerKey } }
      );
      this.reportProactive(proactive, true);
      return;
    }

    const attempt = () => {
      this.pendingProactiveTimer = null;
      const refusal = refusalNow();
      if (refusal) {
        this.reportProactive(proactive, false, refusal);
        return;
      }
      const waited = Date.now() - startedAt;
      // Never while they type, and not into a tab nobody looks at: wait, then give up.
      if (this.isTyping()) {
        if (waited >= SIDEKICK_TYPING_MAX_WAIT_MS) {
          this.reportProactive(proactive, false, 'typing');
          return;
        }
        this.pendingProactiveTimer = setTimeout(attempt, 1000);
        return;
      }
      if (typeof document !== 'undefined' && document.hidden) {
        if (waited >= SIDEKICK_HIDDEN_MAX_WAIT_MS) {
          this.reportProactive(proactive, false, 'hidden');
          return;
        }
        this.pendingProactiveTimer = setTimeout(attempt, 1000);
        return;
      }
      this.proactivePageView = this.pageView;
      this.open(
        { agentId: proactive.agentId || undefined, initialMessage: proactive.message, newConversation: true },
        { proactive: { id: proactive.id, triggerKey: proactive.triggerKey } }
      );
      this.reportProactive(proactive, true);
    };
    clearTimeout(this.pendingProactiveTimer);
    attempt();
  }

  reportProactive(proactive, shown, reason) {
    GleapEventManager.notifyEvent('sidekick-proactive', {
      id: proactive.id,
      triggerId: proactive.triggerKey,
      display: proactive.display,
      shown,
      ...(reason ? { reason } : {}),
    });
  }

  isTyping() {
    try {
      return isEditable(document.activeElement) && Date.now() - this.lastHostKeyAt < SIDEKICK_TYPING_IDLE_MS;
    } catch (e) {
      return false;
    }
  }

  // Something else of Gleap's is on screen: the widget (or a survey), the sidekick, a modal, a tour.
  isBusy() {
    try {
      if (this.isOpen || GleapFrameManager.getInstance().isOpened()) {
        return true;
      }
      if (GleapModalManager && GleapModalManager.getInstance().modalContainer) {
        return true;
      }
      if (GleapProductTours && GleapProductTours.getInstance().productTourId) {
        return true;
      }
    } catch (e) {}
    return false;
  }

  dismissedAt(triggerKey) {
    try {
      const dismissed = loadFromGleapCache(DISMISSED_CACHE_KEY);
      const at = dismissed && dismissed[triggerKey];
      return typeof at === 'number' ? at : null;
    } catch (e) {
      return null;
    }
  }

  recordDismissal(triggerKey) {
    try {
      const now = Date.now();
      const dismissed = loadFromGleapCache(DISMISSED_CACHE_KEY) || {};
      const kept = {};
      // Only the recent ones, at most 50 triggers.
      Object.keys(dismissed)
        .filter((key) => typeof dismissed[key] === 'number' && now - dismissed[key] < 7 * 24 * 60 * 60 * 1000)
        .slice(-49)
        .forEach((key) => {
          kept[key] = dismissed[key];
        });
      kept[triggerKey] = now;
      saveToGleapCache(DISMISSED_CACHE_KEY, kept);
    } catch (e) {}
  }

  // ── Message cards (a proactive message above the launcher) ─────────────

  inAppNotificationsDisabled() {
    try {
      return !!Gleap.getInstance().disableInAppNotifications;
    } catch (e) {
      return false;
    }
  }

  /** The bot persona the widget shows for AI messages (flowConfig operatorName / operatorAvatarImage). */
  defaultSender() {
    try {
      const flowConfig = GleapConfigManager.getInstance().getFlowConfig() || {};
      const name = typeof flowConfig.operatorName === 'string' && flowConfig.operatorName.trim() ? flowConfig.operatorName.trim() : 'Kai';
      const image = typeof flowConfig.operatorAvatarImage === 'string' ? flowConfig.operatorAvatarImage : '';
      return image && /^https:\/\//i.test(image) ? { name, profileImageUrl: image } : { name };
    } catch (e) {
      return { name: 'Kai' };
    }
  }

  /**
   * Gleap.showSidekickMessage: shows the card unless the panel or the widget is open, or this card
   * was dismissed in the last day (any tab). Returns whether it shows.
   */
  showMessage(options) {
    const card = sidekickCardOf(options);
    if (!card) {
      return false;
    }
    const key = sidekickCardKeyOf(card);
    if (this.isOpen || this.isWidgetOpen()) {
      return false;
    }
    const dismissedAt = this.dismissedAt(key);
    if (proactiveRefusalOf({ enabled: true, shownThisPageView: false, busy: false, dismissedAt, now: Date.now() })) {
      return false;
    }
    this.showCard(card, {});
    return true;
  }

  isWidgetOpen() {
    try {
      return GleapFrameManager.getInstance().isOpened();
    } catch (e) {
      return false;
    }
  }

  showCard(card, meta = {}) {
    let href = '';
    try {
      href = window.location.href;
    } catch (e) {}
    const proactive = meta.proactive || null;
    this.card = {
      key: sidekickCardKeyOf({ triggerKey: proactive && proactive.triggerKey, agentId: card.agentId, message: card.message }),
      agentId: card.agentId || null,
      message: card.message,
      sender: card.sender || this.defaultSender(),
      proactive,
      pagePath: pagePathOf(href),
      createdAt: new Date().toISOString(),
    };
    try {
      GleapNotificationManager.getInstance().setSidekickCard(this.card);
    } catch (e) {}
  }

  /** The card was clicked: the panel opens with its message as the agent's first message. */
  onCardClicked() {
    const card = this.card;
    if (!card) {
      return;
    }
    this.broadcastCardCleared(card.key);
    this.open(
      { agentId: card.agentId || undefined, initialMessage: card.message, newConversation: true },
      card.proactive ? { proactive: { ...card.proactive, engaged: true } } : {}
    );
  }

  /** The card's × (or Escape on it): gone for this page view, and quiet for a day in every tab. */
  onCardDismissed() {
    const card = this.card;
    if (!card) {
      return;
    }
    this.recordDismissal(card.key);
    this.broadcastCardCleared(card.key);
    this.removeCard('dismissed');
    GleapEventManager.notifyEvent('sidekick-message-dismissed', {
      agentId: card.agentId,
      ...(card.proactive ? { id: card.proactive.id, triggerId: card.proactive.triggerKey } : {}),
    });
  }

  /** Another tab clicked or dismissed the same card. */
  onCardClearedElsewhere(key) {
    if (this.card && key && this.card.key === key) {
      this.removeCard('other_tab');
    }
  }

  /** The notifications were cleared (the widget opened, the identity changed, …): the card goes with them. */
  onNotificationsCleared() {
    this.card = null;
  }

  removeCard() {
    if (!this.card) {
      return;
    }
    this.card = null;
    try {
      GleapNotificationManager.getInstance().setSidekickCard(null);
    } catch (e) {}
  }

  broadcastCardCleared(key) {
    try {
      GleapTabCommunication.getInstance().sendMessage({
        type: 'sidekick-card-cleared',
        key,
        gleapId: GleapSession.getInstance().session?.gleapId,
      });
    } catch (e) {}
  }

  // ── Context ─────────────────────────────────────────────────────────────

  currentEnvelope() {
    let href = '';
    let documentTitle = '';
    try {
      href = window.location.href;
      documentTitle = document.title;
    } catch (e) {}
    return buildSidekickEnvelope({ href, documentTitle, context: this.appContext });
  }

  sendContextIfChanged() {
    if (!this.isOpen) {
      return;
    }
    const envelope = this.currentEnvelope();
    const json = JSON.stringify(envelope);
    if (json === this.lastSentEnvelope) {
      return;
    }
    this.lastSentEnvelope = json;
    GleapFrameManager.getInstance().sendMessage({ name: 'sidekick-context', data: { context: envelope } }, true);
  }

  // The project's AI workflow (the AI bar's) Kai Support starts with when no agent is named.
  defaultWorkflowId() {
    try {
      const chatbar = GleapAiChatbarManager.getInstance();
      return (chatbar && chatbar._getDefaultAgentId && chatbar._getDefaultAgentId()) || null;
    } catch (e) {
      return null;
    }
  }

  fallbackToChatbar(opts) {
    try {
      const context = this.appContext && this.appContext.data ? this.appContext.data : undefined;
      GleapAiChatbarManager.getInstance().showWithAgent(opts.agentId || undefined, {
        context,
        initialMessage: opts.initialMessage || undefined,
        initialQuestion: opts.initialQuestion || undefined,
      });
    } catch (e) {}
  }

  // ── Layout: dim + block the page, push it aside, restore it exactly ─────

  captureRestoreState() {
    try {
      const html = document.documentElement;
      // Reopened while the last push was still sliding back: the page's own values are the ones
      // that close saved, not what is on the element now.
      const pending = this.pendingRestore;
      if (pending) {
        clearTimeout(pending.timer);
        this.pendingRestore = null;
        html.style.transition = pending.state.transition;
      }
      const own = pending ? pending.state : html.style;
      this.restoreState = {
        activeElement: document.activeElement,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        marginLeft: own.marginLeft,
        marginRight: own.marginRight,
        overflowX: own.overflowX,
        transition: own.transition,
        pushed: false,
      };
    } catch (e) {
      this.restoreState = null;
    }
  }

  isRtl() {
    try {
      return !!GleapTranslationManager.getInstance().isRTLLayout;
    } catch (e) {
      return false;
    }
  }

  /** The mode for the viewport now: a push only where it has room and cannot break the page. */
  modeForViewport() {
    const viewportWidth = window.innerWidth;
    this.pushFallback = null;
    const wantsPush =
      this.requestedMode === 'push' &&
      viewportWidth > SIDEKICK_PHONE_MAX_WIDTH &&
      viewportWidth - SIDEKICK_WIDTH >= SIDEKICK_PUSH_MIN_PAGE_WIDTH;
    const pushRisk = wantsPush ? this.probePush() : null;
    if (pushRisk) {
      this.pushFallback = pushRisk;
    }
    return sidekickModeOf({ requested: this.requestedMode, viewportWidth, pushRisk });
  }

  /**
   * Whether pushing this page aside could break it (pushRiskOf). Applies the push margin for one
   * synchronous layout (no transition, never painted), looks at what still sits where the panel
   * goes, and puts the page's own values back.
   */
  probePush() {
    try {
      let inIframe = false;
      try {
        inIframe = window.self !== window.top;
      } catch (e) {
        inIframe = true;
      }
      const html = document.documentElement;
      let rtl = this.isRtl();
      try {
        rtl = rtl || window.getComputedStyle(html).direction === 'rtl' || (document.body && window.getComputedStyle(document.body).direction === 'rtl');
      } catch (e) {}
      if (inIframe || rtl) {
        return pushRiskOf({ inIframe, rtl });
      }

      const state = this.restoreState;
      const pushed = !!(state && state.pushed);
      // The page's own horizontal margin on <html> (ours would replace it).
      const ownMarginLeft = pushed ? state.marginLeft : html.style.marginLeft;
      const ownMarginRight = pushed ? state.marginRight : html.style.marginRight;
      let htmlMargin = !!(ownMarginLeft && parseFloat(ownMarginLeft)) || !!(ownMarginRight && parseFloat(ownMarginRight));
      if (!pushed && !htmlMargin) {
        try {
          const computed = window.getComputedStyle(html);
          htmlMargin = (parseFloat(computed.marginLeft) || 0) !== 0 || (parseFloat(computed.marginRight) || 0) !== 0;
        } catch (e) {}
      }
      if (htmlMargin) {
        return pushRiskOf({ htmlMargin });
      }

      const saved = { marginRight: html.style.marginRight, overflowX: html.style.overflowX, transition: html.style.transition };
      if (!pushed) {
        html.style.transition = 'none';
        html.style.marginRight = `${SIDEKICK_WIDTH}px`;
        html.style.overflowX = 'clip';
      }
      const stripHits = [];
      try {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const xs = [viewportWidth - SIDEKICK_WIDTH + 24, viewportWidth - SIDEKICK_WIDTH / 2, viewportWidth - 40];
        const ys = [2, 32, 72, Math.round(viewportHeight / 2), viewportHeight - 72, viewportHeight - 32, viewportHeight - 2];
        const seen = [];
        xs.forEach((x) => {
          ys.forEach((y) => {
            const elements = typeof document.elementsFromPoint === 'function' ? document.elementsFromPoint(x, y) : [];
            elements.forEach((element) => {
              if (!element || element === html || element === document.body || seen.indexOf(element) !== -1 || isGleapElement(element)) {
                return;
              }
              seen.push(element);
              const fixed = fixedAncestorOf(element);
              const width = fixed ? fixed.getBoundingClientRect().width : 0;
              stripHits.push({ fixed: !!fixed, wide: !!fixed && width >= viewportWidth / 2 });
            });
          });
        });
        // A body with its own width (or 100vw) did not move with the margin.
        if (document.body) {
          const bodyRect = document.body.getBoundingClientRect();
          if (bodyRect.right > viewportWidth - SIDEKICK_WIDTH + 1 && bodyRect.height > 0) {
            stripHits.push({ fixed: false, wide: true });
          }
        }
      } finally {
        if (!pushed) {
          html.style.marginRight = saved.marginRight;
          html.style.overflowX = saved.overflowX;
          html.style.transition = saved.transition;
        }
      }
      return pushRiskOf({ stripHits });
    } catch (e) {
      // Measuring failed: the overlay never moves the page.
      return 'unknown';
    }
  }

  applyLayout() {
    if (typeof document === 'undefined' || !document.body) {
      return;
    }
    const html = document.documentElement;
    html.classList.add(OPEN_CLASS);

    // The dim layer only over an overlay (blocks the page; a click closes the panel). A push keeps
    // the page visible and usable; the phone sheet covers the screen.
    if (this.mode === 'overlay') {
      this.showBackdrop();
    } else {
      this.removeBackdrop(true);
    }

    const state = this.restoreState;
    if (this.mode === 'push' && state) {
      // A margin on <html>, never a transform (fixed headers, 100vw and media queries keep working).
      // RTL pages never push (probePush), so the panel is always on the right here.
      html.classList.add(PUSH_CLASS);
      html.style.transition = PUSH_TRANSITION;
      html.style.overflowX = 'clip';
      html.style.marginRight = `${SIDEKICK_WIDTH}px`;
      state.pushed = true;
    } else if (state && state.pushed) {
      this.restorePageStyles(false);
    }

    this.updateFrameAccessibility(true);
  }

  scheduleRelayout() {
    if (!this.isOpen || this.relayoutFrame !== null) {
      return;
    }
    const run = () => {
      this.relayoutFrame = null;
      this.relayout();
    };
    try {
      this.relayoutFrame = window.requestAnimationFrame(run);
    } catch (e) {
      this.relayoutFrame = null;
      run();
    }
  }

  // The viewport changed while open: phone ↔ desktop, room for the push or not.
  relayout() {
    if (!this.isOpen) {
      return;
    }
    const next = this.modeForViewport();
    if (next !== this.mode) {
      this.mode = next;
      this.applyLayout();
    }
  }

  showBackdrop() {
    if (this.backdrop && document.body.contains(this.backdrop)) {
      this.backdrop.classList.remove(`${BACKDROP_CLASS}--closing`);
      return;
    }
    const backdrop = document.createElement('div');
    backdrop.className = BACKDROP_CLASS;
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.addEventListener('click', () => this.close('backdrop'));
    const block = (event) => {
      if (event.cancelable) {
        event.preventDefault();
      }
    };
    backdrop.addEventListener('wheel', block, { passive: false });
    backdrop.addEventListener('touchmove', block, { passive: false });
    document.body.appendChild(backdrop);
    this.backdrop = backdrop;
  }

  removeBackdrop(immediately = false) {
    const backdrop = this.backdrop;
    this.backdrop = null;
    if (!backdrop) {
      return;
    }
    if (immediately) {
      backdrop.remove();
      return;
    }
    backdrop.classList.add(`${BACKDROP_CLASS}--closing`);
    setTimeout(() => backdrop.remove(), CLOSE_ANIMATION_MS);
  }

  restorePageStyles(restoreScroll) {
    const state = this.restoreState;
    if (!state || typeof document === 'undefined') {
      return;
    }
    const html = document.documentElement;
    html.classList.remove(PUSH_CLASS);
    if (state.pushed) {
      html.style.marginLeft = state.marginLeft;
      html.style.marginRight = state.marginRight;
      html.style.overflowX = state.overflowX;
      state.pushed = false;
      // Keep the transition for the slide back, then the page's own value.
      const timer = setTimeout(() => {
        this.pendingRestore = null;
        html.style.transition = state.transition;
        if (restoreScroll) {
          try {
            window.scrollTo(state.scrollX, state.scrollY);
          } catch (e) {}
        }
      }, CLOSE_ANIMATION_MS + 60);
      this.pendingRestore = { state, timer };
    }
  }

  updateFrameAccessibility(open) {
    try {
      const container = GleapFrameManager.getInstance().gleapFrameContainer;
      if (!container) {
        return;
      }
      if (open) {
        container.setAttribute('role', 'dialog');
        // Overlay and sheet block the page (modal); a push leaves it usable next to the panel.
        container.setAttribute('aria-modal', this.mode === 'push' ? 'false' : 'true');
        container.setAttribute('aria-label', 'Sidekick');
      } else {
        container.removeAttribute('role');
        container.removeAttribute('aria-modal');
        container.removeAttribute('aria-label');
      }
    } catch (e) {}
  }

  teardown(reason, { silent = false } = {}) {
    if (!this.isOpen) {
      return;
    }
    this.isOpen = false;
    const state = this.restoreState;
    const proactive = this.activeProactive;
    this.activeProactive = null;

    this.removeBackdrop(false);
    this.restorePageStyles(true);
    try {
      document.documentElement.classList.remove(OPEN_CLASS);
    } catch (e) {}
    this.updateFrameAccessibility(false);

    // Focus goes back where it was once the panel is gone (the frame may hold or take it while it
    // slides out), unless the person put it somewhere else meanwhile or the panel reopened.
    const previous = state && state.activeElement;
    if (previous && previous !== document.body) {
      setTimeout(() => {
        try {
          if (this.isOpen || !document.contains(previous) || typeof previous.focus !== 'function') {
            return;
          }
          const active = document.activeElement;
          const frame = GleapFrameManager.getInstance().gleapFrame;
          if (!active || active === document.body || active === document.documentElement || active === frame) {
            previous.focus({ preventScroll: true });
          }
        } catch (e) {}
      }, CLOSE_ANIMATION_MS + 40);
    }
    this.restoreState = state && state.pushed ? state : null;

    // A proactive open closed before the customer wrote: dismissed for a day.
    if (proactive && !proactive.engaged && reason !== 'replaced') {
      this.recordDismissal(proactive.triggerKey);
    }

    if (!silent) {
      GleapEventManager.notifyEvent('sidekick-closed', { reason });
    }
  }

  destroy() {
    try {
      this.teardown('api', { silent: true });
      this.removeBackdrop(true);
    } catch (e) {}
    clearTimeout(this.closeTimer);
    clearTimeout(this.pendingProactiveTimer);
    this.removeCard('destroy');
    GleapSidekickManager.instance = null;
  }
}
