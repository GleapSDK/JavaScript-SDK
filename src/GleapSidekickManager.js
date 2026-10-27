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
  SIDEKICK_TYPING_IDLE_MS,
  SIDEKICK_TYPING_MAX_WAIT_MS,
  SIDEKICK_WIDTH,
  buildSidekickEnvelope,
  fixedBarAdjustmentOf,
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
    // <html> and <body> carry Gleap's state classes (gleap-sidekick-open): never Gleap's own element.
    if (node === document.body || node === document.documentElement) {
      return false;
    }
    const className = typeof node.className === 'string' ? node.className : '';
    if (/(^|\s)(gleap-|bb-feedback|bb-capture)/.test(className)) {
      return true;
    }
  }
  return false;
};

// The inline properties a fixed bar's push adjustment touches (saved and put back exactly).
const FIXED_BAR_PROPS = ['left', 'right', 'width', 'max-width', 'box-sizing', 'transition'];
const FIXED_BAR_TRANSITION = 'left 0.32s cubic-bezier(0.16, 1, 0.3, 1), width 0.32s cubic-bezier(0.16, 1, 0.3, 1)';
// At most this many elements are looked at per scan (a page's fixed bars sit near the top of the tree).
const FIXED_SCAN_LIMIT = 15000;

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
  // Fixed bars narrowed for the push: element → { saved inline values }.
  fixedBars = new Map();
  fixedBarsRestoreTimer = null;
  pendingFixedBarsRestore = null;
  fixedObserver = null;
  fixedObserverTimer = null;
  fixedObserverTargets = [];
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
    // Push is the default; 'push' asked for explicitly pushes wherever there is room, 'overlay' never pushes.
    this.requestedMode = opts.mode === 'overlay' ? 'overlay' : opts.mode === 'push' ? 'push' : 'auto';
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

  /** The mode for the viewport now: a push where it has room (720 px for the page), never on phones. */
  modeForViewport() {
    let inIframe = false;
    try {
      inIframe = window.self !== window.top;
    } catch (e) {
      inIframe = true;
    }
    const pushRisk = pushRiskOf({ inIframe });
    const mode = sidekickModeOf({ requested: this.requestedMode, viewportWidth: window.innerWidth, pushRisk });
    this.pushFallback = mode === 'overlay' && this.requestedMode === 'auto' && pushRisk ? pushRisk : null;
    return mode;
  }

  // The panel's side: right, or left when the widget is right-to-left (its frame docks left).
  panelSide() {
    return this.isRtl() ? 'left' : 'right';
  }

  // ── Fixed bars follow the push ──────────────────────────────────────────
  // A margin on <html> moves the page, but position: fixed elements are placed against the
  // viewport: a full-width header or footer would keep running under the panel. Each one that spans
  // the viewport gets narrower on the panel's side (inline left / width, !important), and gets its
  // own inline values back exactly when the panel closes. Sticky elements are in the flow and move
  // with the margin by themselves.

  /** Narrows the fixed bars under `root` (default: the whole body), skipping Gleap's own elements. */
  adjustFixedBars(root) {
    if (this.mode !== 'push' || typeof document === 'undefined' || !document.body) {
      return;
    }
    this.flushFixedBarsRestore();
    const start = root && root.nodeType === 1 ? root : document.body;
    const viewportWidth = window.innerWidth;
    const side = this.panelSide();
    let seen = 0;
    const visit = (element) => {
      if (!element || element.nodeType !== 1 || seen > FIXED_SCAN_LIMIT) {
        return;
      }
      seen += 1;
      if (isGleapElement(element)) {
        return;
      }
      let style = null;
      try {
        style = window.getComputedStyle(element);
      } catch (e) {
        return;
      }
      if (style.position === 'fixed') {
        if (!this.fixedBars.has(element)) {
          this.adjustFixedBar(element, style, viewportWidth, side);
        }
        // Whatever is inside it moves with it.
        return;
      }
      if (style.display === 'none') {
        return;
      }
      for (let child = element.firstElementChild; child; child = child.nextElementSibling) {
        visit(child);
      }
    };
    if (start === document.body) {
      for (let child = start.firstElementChild; child; child = child.nextElementSibling) {
        visit(child);
      }
    } else {
      visit(start);
    }
  }

  adjustFixedBar(element, style, viewportWidth, side) {
    try {
      // Centered with a transform (left: 50%; translateX(-50%)): moving its left edge would shift it.
      if (style.transform && style.transform !== 'none') {
        return;
      }
      const rect = element.getBoundingClientRect();
      const adjustment = fixedBarAdjustmentOf({ rect, viewportWidth, side });
      if (!adjustment) {
        return;
      }
      const saved = { hadStyleAttribute: element.hasAttribute('style') };
      FIXED_BAR_PROPS.forEach((prop) => {
        saved[prop] = [element.style.getPropertyValue(prop), element.style.getPropertyPriority(prop)];
      });
      this.fixedBars.set(element, saved);
      // It slides along with the page unless it animates its own box already.
      const ownTransition = (style.transitionDuration || '').split(',').some((duration) => parseFloat(duration) > 0);
      if (!ownTransition) {
        element.style.setProperty('transition', FIXED_BAR_TRANSITION, 'important');
      }
      element.style.setProperty('box-sizing', 'border-box', 'important');
      element.style.setProperty('max-width', 'none', 'important');
      element.style.setProperty('right', 'auto', 'important');
      element.style.setProperty('left', `${adjustment.left}px`, 'important');
      element.style.setProperty('width', `${adjustment.width}px`, 'important');
    } catch (e) {}
  }

  /** Puts one bar's own inline values back (the transition after the slide back, unless `now`). */
  restoreFixedBar(element, saved, now) {
    try {
      FIXED_BAR_PROPS.forEach((prop) => {
        if (prop === 'transition' && !now) {
          return;
        }
        const [value, priority] = saved[prop] || ['', ''];
        if (value) {
          element.style.setProperty(prop, value, priority);
        } else {
          element.style.removeProperty(prop);
        }
      });
      if (now) {
        this.dropEmptyStyleAttribute(element, saved);
      }
    } catch (e) {}
  }

  // An element that had no style attribute gets none back (not an empty one).
  dropEmptyStyleAttribute(element, saved) {
    try {
      if (!saved.hadStyleAttribute && element.getAttribute('style') === '') {
        element.removeAttribute('style');
      }
    } catch (e) {}
  }

  restoreFixedBars({ now = false } = {}) {
    this.stopFixedObserver();
    const bars = Array.from(this.fixedBars.entries());
    this.fixedBars = new Map();
    bars.forEach(([element, saved]) => this.restoreFixedBar(element, saved, now));
    if (now) {
      return;
    }
    // The transitions stay for the slide back, then the bars' own values.
    this.flushFixedBarsRestore();
    this.pendingFixedBarsRestore = () => {
      bars.forEach(([element, saved]) => {
        if (this.fixedBars.has(element)) {
          return;
        }
        const [value, priority] = saved.transition || ['', ''];
        try {
          if (value) {
            element.style.setProperty('transition', value, priority);
          } else {
            element.style.removeProperty('transition');
          }
          this.dropEmptyStyleAttribute(element, saved);
        } catch (e) {}
      });
    };
    this.fixedBarsRestoreTimer = setTimeout(() => this.flushFixedBarsRestore(), CLOSE_ANIMATION_MS + 60);
  }

  // Runs a waiting transition restore now (before bars are measured and saved again).
  flushFixedBarsRestore() {
    clearTimeout(this.fixedBarsRestoreTimer);
    this.fixedBarsRestoreTimer = null;
    const pending = this.pendingFixedBarsRestore;
    this.pendingFixedBarsRestore = null;
    if (pending) {
      pending();
    }
  }

  // New fixed elements while the panel is pushed (a toast, a header that turns fixed on scroll): a
  // throttled look at what changed. Bars that are no longer fixed get their values back.
  startFixedObserver() {
    if (this.fixedObserver || typeof MutationObserver === 'undefined' || !document.body) {
      return;
    }
    this.fixedObserver = new MutationObserver((mutations) => {
      for (let index = 0; index < mutations.length; index += 1) {
        const mutation = mutations[index];
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node && node.nodeType === 1) this.fixedObserverTargets.push(node);
          });
        } else if (mutation.target && mutation.target.nodeType === 1) {
          this.fixedObserverTargets.push(mutation.target);
        }
      }
      if (this.fixedObserverTargets.length > 500) {
        this.fixedObserverTargets = [document.body];
      }
      if (!this.fixedObserverTimer) {
        this.fixedObserverTimer = setTimeout(() => this.flushFixedObserver(), 250);
      }
    });
    this.fixedObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
  }

  flushFixedObserver() {
    this.fixedObserverTimer = null;
    const targets = this.fixedObserverTargets;
    this.fixedObserverTargets = [];
    if (!this.isOpen || this.mode !== 'push') {
      return;
    }
    const viewportWidth = window.innerWidth;
    const side = this.panelSide();
    targets.forEach((target) => {
      if (!target || !target.isConnected) {
        return;
      }
      const saved = this.fixedBars.get(target);
      if (saved) {
        // Our own writes land here too: only a bar that stopped being fixed goes back.
        try {
          if (window.getComputedStyle(target).position !== 'fixed') {
            this.fixedBars.delete(target);
            this.restoreFixedBar(target, saved, true);
          }
        } catch (e) {}
        return;
      }
      if (target === document.body) {
        this.adjustFixedBars();
        return;
      }
      // An element inside an adjusted bar moves with it.
      for (let node = target.parentElement; node && node !== document.body; node = node.parentElement) {
        if (this.fixedBars.has(node)) {
          return;
        }
      }
      try {
        const style = window.getComputedStyle(target);
        if (style.position === 'fixed') {
          if (!isGleapElement(target)) this.adjustFixedBar(target, style, viewportWidth, side);
          return;
        }
      } catch (e) {
        return;
      }
      this.adjustFixedBars(target);
    });
  }

  stopFixedObserver() {
    if (this.fixedObserver) {
      this.fixedObserver.disconnect();
      this.fixedObserver = null;
    }
    clearTimeout(this.fixedObserverTimer);
    this.fixedObserverTimer = null;
    this.fixedObserverTargets = [];
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
      // A margin on <html> on the panel's side, never a transform (media queries, 100vw and the
      // page's own layout keep working), plus the page's own margin there. Fixed bars follow.
      const side = this.panelSide();
      const property = side === 'left' ? 'marginLeft' : 'marginRight';
      if (!state.pushed) {
        let ownMargin = 0;
        try {
          ownMargin = parseFloat(window.getComputedStyle(html)[property]) || 0;
        } catch (e) {}
        state.pushSide = side;
        state.ownMargin = ownMargin;
      }
      html.classList.add(PUSH_CLASS);
      html.style.transition = PUSH_TRANSITION;
      html.style.overflowX = 'clip';
      html.style[property] = `${(state.ownMargin || 0) + SIDEKICK_WIDTH}px`;
      state.pushed = true;
      this.restoreFixedBars({ now: true });
      this.adjustFixedBars();
      this.startFixedObserver();
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
    } else if (next === 'push') {
      // The bars' widths depend on the viewport: measure them again.
      this.restoreFixedBars({ now: true });
      this.adjustFixedBars();
      this.startFixedObserver();
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
    this.restoreFixedBars();
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
    this.restoreFixedBars({ now: true });
    this.removeCard('destroy');
    GleapSidekickManager.instance = null;
  }
}
