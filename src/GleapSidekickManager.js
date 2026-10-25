import {
  GleapAiChatbarManager,
  GleapEventManager,
  GleapFrameManager,
  GleapModalManager,
  GleapProductTours,
  GleapTranslationManager,
} from './Gleap';
import { loadFromGleapCache, saveToGleapCache } from './GleapHelper';
import {
  SIDEKICK_HIDDEN_MAX_WAIT_MS,
  SIDEKICK_TYPING_IDLE_MS,
  SIDEKICK_TYPING_MAX_WAIT_MS,
  SIDEKICK_WIDTH,
  buildSidekickEnvelope,
  normalizeSidekickContext,
  proactiveRefusalOf,
  proactiveSidekickOf,
  sidekickModeOf,
} from './GleapSidekickRules';

const DISMISSED_CACHE_KEY = 'sidekick-dismissed';
const BACKDROP_CLASS = 'gleap-sidekick-backdrop';
const OPEN_CLASS = 'gleap-sidekick-open';
const PUSH_CLASS = 'gleap-sidekick-push';
// The panel slides out in 0.24 s; the page and its margin come back with it.
const CLOSE_ANIMATION_MS = 280;
const PUSH_TRANSITION = 'margin 0.32s cubic-bezier(0.16, 1, 0.3, 1)';

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
      window.addEventListener('resize', () => this.relayout());
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
    this.activeProactive = meta && meta.proactive ? { ...meta.proactive, engaged: false } : null;
    this.requestedMode = opts.mode === 'push' ? 'push' : 'overlay';
    this.mode = sidekickModeOf({ requested: this.requestedMode, viewportWidth: window.innerWidth });
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
    this.sendContextIfChanged();
  }

  // ── Proactive opens (socket `sidekick`) ─────────────────────────────────

  handleProactive(data) {
    const proactive = proactiveSidekickOf(data);
    if (!proactive) {
      return;
    }
    const startedAt = Date.now();
    const attempt = () => {
      this.pendingProactiveTimer = null;
      const refusal = proactiveRefusalOf({
        enabled: this.proactiveEnabled,
        shownThisPageView: this.proactivePageView !== null && this.proactivePageView === this.pageView,
        busy: this.isBusy(),
        dismissedAt: this.dismissedAt(proactive.triggerKey),
        now: Date.now(),
      });
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

  applyLayout() {
    if (typeof document === 'undefined' || !document.body) {
      return;
    }
    const html = document.documentElement;
    html.classList.add(OPEN_CLASS);

    // The dim layer: blocks the page (clicks close the panel, wheel/touch never scroll the page).
    if (this.mode !== 'sheet') {
      this.showBackdrop();
    } else {
      this.removeBackdrop(true);
    }

    const state = this.restoreState;
    if (this.mode === 'push' && state) {
      html.classList.add(PUSH_CLASS);
      html.style.transition = PUSH_TRANSITION;
      html.style.overflowX = 'clip';
      if (this.isRtl()) {
        html.style.marginLeft = `${SIDEKICK_WIDTH}px`;
      } else {
        html.style.marginRight = `${SIDEKICK_WIDTH}px`;
      }
      state.pushed = true;
    } else if (state && state.pushed) {
      this.restorePageStyles(false);
    }

    this.updateFrameAccessibility(true);
  }

  // The viewport changed while open: phone ↔ desktop, room for the push or not.
  relayout() {
    if (!this.isOpen) {
      return;
    }
    const next = sidekickModeOf({ requested: this.requestedMode, viewportWidth: window.innerWidth });
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
        container.setAttribute('aria-modal', this.mode === 'sheet' || this.mode === 'overlay' || this.mode === 'push' ? 'true' : 'false');
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
    GleapSidekickManager.instance = null;
  }
}
