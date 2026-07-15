import {
  GleapFrameManager,
  GleapConfigManager,
  GleapSession,
  GleapEventManager,
  GleapTranslationManager,
  GleapTabCommunication,
} from './Gleap';
import GleapAgentToolManager from './GleapAgentToolManager';
import { bootstrapGleapFrame, runFunctionWhenDomIsReady } from './GleapHelper';

export default class GleapAiChatbarManager {
  chatbarUrl = "https://messenger-app.gleap.io/chatbar";
  chatbarContainer = null;
  chatbarFrame = null;
  config = null;
  isHidden = true;
  manuallyHidden = false;
  manuallyShown = false;
  comReady = false;
  pendingMessages = [];
  chatbarStyle = null;
  _panelOpen = false;
  // Agent targeted by the public Gleap.startAgent() API. agentId is 'kai' (the
  // default AI agent) or a resolved workflow/bot id; agentName is the display
  // name resolved via the shared agents endpoint.
  agentId = null;
  agentName = null;
  agentContext = null;

  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new GleapAiChatbarManager();
    }
    return this.instance;
  }

  constructor() {
    this._listenForMessages();
    this._listenForOutsideClicks();
  }

  _listenForOutsideClicks() {
    document.addEventListener('click', (event) => {
      if (!this.chatbarContainer) return;
      if (this.chatbarContainer.contains(event.target)) return;
      if (this._suppressOutsideClick) return;
      this._postMessageRaw({ name: 'chatbar-outside-click' });
    });
  }

  _listenForMessages() {
    window.addEventListener('message', (event) => {
      // The chatbar now hosts a Messenger-App frame bootstrapped via about:blank, so
      // event.origin is the host page's origin (not the Gleap origin). Identify the
      // frame's messages by event.source, mirroring GleapFrameManager.
      if (!this.chatbarFrame || event.source !== this.chatbarFrame.contentWindow) {
        return;
      }

      try {
        const data = JSON.parse(event.data);
        if (!data || !data.name) return;

        // Handshake: the Messenger frame posts a bare { name: 'ping' } on boot.
        if (data.name === 'ping') {
          this.comReady = true;
          this._sendSessionUpdate();
          this._sendConfigUpdate();
          this._flushPendingMessages();
          // Declare the chatbar "open" on boot so the frame connects Pusher and loads
          // its (origin-filtered) conversation list. See Task 21 note.
          this.setPanelOpen(true);
          return;
        }

        // Reuse the widget's data collection so chatbar tickets carry the same metadata.
        if (data.name === 'collect-ticket-data') {
          GleapFrameManager.getInstance().answerCollectTicketData(this.chatbarFrame, data);
          return;
        }

        // The chatbar frame reports its expand/collapse state so we can drive Pusher.
        if (data.name === 'chatbar-panel-state') {
          this.setPanelOpen(!!data.data?.isOpen);
          return;
        }

        // Surface concerns kept from the legacy protocol.
        if (data.name === 'chatbar-resize' && data.data) {
          this._resizeFrame(data.data);
          return;
        }
        if (data.name === 'chatbar-panel-blur' && data.data) {
          this._updateBlurBackdrop(data.data);
          return;
        }
        if (data.name === 'close-widget') {
          this.setPanelOpen(false);
          return;
        }

        // Open external links posted by the frame.
        if (data.name === 'open-url') {
          const url = data.data;
          const newTab = data.newTab ? true : false;
          try {
            GleapFrameManager.getInstance().urlHandler(url, newTab);
          } catch (e) {}
          return;
        }

        // Tool execution requested from inside a chatbar conversation.
        if (data.name === 'tool-execution' && data.data) {
          GleapEventManager.notifyEvent('tool-execution', data.data);
          GleapAgentToolManager.getInstance().triggerToolAction(data.data);
          return;
        }

        // Frontend tool execution request: run the registered handler and
        // return its result to the frame, which delivers it to the agent.
        if (data.name === 'frontend-tool-execute' && data.data) {
          GleapAgentToolManager.getInstance()
            .executeToolAction(data.data)
            .then((result) => {
              this._postMessageRaw({
                name: 'frontend-tool-result',
                data: result,
              });
            });
          return;
        }

        // Generic event forwarding (e.g. message-sent / conversation-created / reply-received).
        if (data.name === 'notify-event' && data.data) {
          GleapEventManager.notifyEvent(data.data.type, data.data.data);
          return;
        }

        // The frame reports that the user read/opened the chatbar notification pill.
        // Propagate the dismissal to sibling tabs so they hide their pill too.
        if (data.name === 'chatbar-notification-read') {
          this.hideChatbarNotification();
          return;
        }
      } catch (e) {}
    });
  }

  // Posts a BARE Messenger-protocol message to the chatbar frame (no legacy
  // type:'chatbar' wrapper). Queues until the handshake completes.
  _postMessageRaw(message) {
    try {
      if (!this.comReady || !this.chatbarFrame?.contentWindow) {
        this.pendingMessages.push(message);
        return;
      }
      this.chatbarFrame.contentWindow.postMessage(JSON.stringify(message), '*');
    } catch (e) {}
  }

  _flushPendingMessages() {
    const queued = this.pendingMessages || [];
    this.pendingMessages = [];
    queued.forEach((m) => this._postMessageRaw(m));
  }

  _sendSessionUpdate() {
    this._postMessageRaw({
      name: 'session-update',
      data: {
        sessionData: GleapSession.getInstance().getSession(),
        apiUrl: GleapSession.getInstance().apiUrl,
        sdkKey: GleapSession.getInstance().sdkKey,
      },
    });
  }

  _sendConfigUpdate() {
    this._postMessageRaw({
      name: 'config-update',
      data: {
        config: this._withChatbarConfig(GleapConfigManager.getInstance().getFlowConfig()),
        aiTools: GleapAgentToolManager.getInstance().getAgentTools(),
        agentTools: GleapAgentToolManager.getInstance().getAgentTools(),
        overrideLanguage: GleapTranslationManager.getInstance().getOverrideLanguage(),
      },
    });
  }

  // Merge the websocket `ai` config (placeholder, quickActions, style, color) onto the
  // flow config under the chatbar* keys the Messenger /chatbar frame reads.
  _withChatbarConfig(flowConfig) {
    const base = flowConfig || {};
    return {
      ...base,
      chatbarPlaceholder: this.config?.placeholder,
      chatbarQuickActions: this.config?.quickActions || [],
      chatbarStyle: this.config?.style,
      chatbarColor: base?.color,
      chatbarWorkflowId: this.config?.workflowId ?? null,
    };
  }

  // Drives the chatbar frame's Pusher connection + conversation loaders via the shared
  // widget-status-update message (handled in Messenger CommunicationManager).
  setPanelOpen(isOpen) {
    this._panelOpen = !!isOpen;
    this._postMessageRaw({ name: 'widget-status-update', data: { isWidgetOpen: !!isOpen } });
  }

  // Forwards a single latest-message pill to the chatbar frame. Called by
  // GleapNotificationManager when a comment notification's lastSource === 'chatbar'.
  showChatbarNotification(data) {
    this._postMessageRaw({
      name: 'chatbar-notification',
      data: {
        sender: data?.sender?.name,
        text: data?.text,
        shareToken: data?.conversation?.shareToken,
      },
    });
  }

  // Dismisses the chatbar notification pill in the frame — the counterpart to
  // showChatbarNotification. Called when the pill is read in THIS tab (the frame
  // reports `chatbar-notification-read`) or when a sibling tab broadcasts that it
  // was read (via GleapTabCommunication). A genuine local dismissal
  // (fromOtherTab = false) is propagated to sibling tabs; an inbound cross-tab
  // dismissal (fromOtherTab = true) is applied WITHOUT re-broadcasting, mirroring
  // the fromOtherTab loop guard in GleapNotificationManager.clearAllNotifications.
  // (Re-posting the clear to the local frame after its own read is a harmless
  // no-op — the pill is already gone.)
  hideChatbarNotification(fromOtherTab = false) {
    this._postMessageRaw({ name: 'chatbar-notification-clear' });

    if (!fromOtherTab) {
      try {
        GleapTabCommunication.getInstance().sendMessage({
          type: 'chatbar-notification-cleared',
          gleapId: GleapSession.getInstance().session?.gleapId,
        });
      } catch (e) {}
    }
  }

  _resizeFrame({ width, height }) {
    if (!this.chatbarContainer) return;

    // Below 600px the width is owned by CSS (the ≤460px media query takes it fluid);
    // don't write an inline width that would override it.
    if (Number.isFinite(width) && window.innerWidth >= 600) {
      const maxWidth = window.innerWidth - 20;
      this.chatbarContainer.style.width = Math.min(Math.ceil(width), maxWidth) + 'px';
    }
    if (Number.isFinite(height)) {
      this.chatbarContainer.style.height = Math.ceil(height) + 'px';
    }
    if (!this.isHidden) {
      this.chatbarContainer.style.display = 'block';
    }
  }

  _updateBlurBackdrop({ visible, top, bottom, left, right, radius, dark }) {
    // The blur is a PARENT div sized to the panel and placed BEHIND the transparent
    // iframe, so ONLY the panel is frosted — not the padding, gap, or input bar. The
    // frame sends the panel's insets; top+bottom (not height) make the div track the
    // bottom-anchored panel as the container animates. (The container no longer has a
    // `transform`, which previously clipped this div's backdrop-filter to nothing.)
    if (!this.blurBackdrop) return;
    // Make sure the older whole-iframe blur is off.
    if (this.chatbarFrame) {
      this.chatbarFrame.style.backdropFilter = '';
      this.chatbarFrame.style.webkitBackdropFilter = '';
    }
    if (visible) {
      const bd = this.blurBackdrop.style;
      bd.top = (top ?? 0) + 'px';
      bd.bottom = (bottom ?? 0) + 'px';
      bd.left = (left ?? 0) + 'px';
      bd.right = (right ?? 0) + 'px';
      bd.height = 'auto';
      bd.borderRadius = (radius ?? 20) + 'px';
      // Match the chatbar style: a dark frosted tint for the dark variants, the light
      // white tint otherwise. brightness < 1 darkens the blurred page behind it so the
      // panel reads as a true dark surface (mirrors the dark input bar's gray frost).
      if (dark) {
        bd.background = 'rgba(40, 40, 40, 0.55)';
        bd.backdropFilter = 'blur(20px) saturate(140%) brightness(0.75)';
        bd.webkitBackdropFilter = 'blur(20px) saturate(140%) brightness(0.75)';
      } else {
        bd.background = 'rgba(255, 255, 255, 0.45)';
        bd.backdropFilter = 'blur(20px) saturate(150%) brightness(1.04)';
        bd.webkitBackdropFilter = 'blur(20px) saturate(150%) brightness(1.04)';
      }
      bd.opacity = '1';
    } else {
      this.blurBackdrop.style.opacity = '0';
    }
  }

  setConfig(config) {
    this.config = config;

    if (config.enabled) {
      this.show();
    } else if (!this.manuallyShown) {
      this.hide();
    }

    // Forward updated config to the chatbar frame once the handshake is done so late
    // `ai` updates from the websocket reach the frame.
    if (this.comReady) {
      this._sendConfigUpdate();
    }
  }

  setPlaceholder(placeholder) {
    if (!this.config) this.config = {};
    this.config.placeholder = placeholder;
    if (this.comReady) {
      this._sendConfigUpdate();
    }
  }

  setQuickActions(quickActions) {
    if (!this.config) this.config = {};
    this.config.quickActions = quickActions;
    if (this.comReady) {
      this._sendConfigUpdate();
    }
  }

  sendAgentToolsUpdate() {
    this._postMessageRaw({
      name: 'config-update',
      data: {
        config: this._withChatbarConfig(GleapConfigManager.getInstance().getFlowConfig()),
        aiTools: GleapAgentToolManager.getInstance().getAgentTools(),
        agentTools: GleapAgentToolManager.getInstance().getAgentTools(),
        overrideLanguage: GleapTranslationManager.getInstance().getOverrideLanguage(),
      },
    });
  }

  // Normalize the second argument of startAgent()/showWithAgent(). For backward
  // compatibility a bare context object (no recognized option keys) is accepted
  // and treated as { context }.
  _normalizeAgentOptions(options) {
    if (!options || typeof options !== 'object') return {};
    const hasKnownKeys =
      'context' in options ||
      'initialQuestion' in options ||
      'initialMessage' in options;
    return hasKnownKeys ? options : { context: options };
  }

  // The project's configured chatbar agent (aiBar.workflowId), used when
  // startAgent() is called without an explicit id.
  _getDefaultAgentId() {
    try {
      if (this.config?.workflowId) return this.config.workflowId;
      const flowConfig = GleapConfigManager.getInstance().getFlowConfig() || {};
      return flowConfig?.aiBar?.workflowId || null;
    } catch (e) {
      return null;
    }
  }

  // Legacy agent validation: resolve the agent's display name via the shared
  // agents endpoint. Sets agentId/agentName on success, leaves them untouched
  // (and returns null) on any failure so the caller can still proceed.
  async _validateAgent(agentId) {
    try {
      const session = GleapSession.getInstance();
      const apiUrl = session.apiUrl || 'https://api.gleap.io';

      const headers = {};
      if (session.sdkKey) headers['Api-Token'] = session.sdkKey;
      if (session.session?.gleapId) headers['Gleap-Id'] = session.session.gleapId;
      if (session.session?.gleapHash) headers['Gleap-Hash'] = session.session.gleapHash;

      const res = await fetch(`${apiUrl}/v3/shared/agents/${encodeURIComponent(agentId)}`, { headers });
      if (!res.ok) return null;

      const agentInfo = await res.json();
      if (!agentInfo || agentInfo.error) return null;

      this.agentId = agentId;
      this.agentName = agentInfo.name || 'AI Agent';
      return agentInfo;
    } catch (e) {
      return null;
    }
  }

  // Reveal the inline chatbar and start a fresh conversation with the given
  // agent. agentId resolves to the configured default (or 'kai') when empty or
  // 'default'. options:
  //   { context?, initialQuestion?, initialMessage? }
  //   • initialQuestion — a customer question delivered into the conversation
  //     and ANSWERED by the agent (the customer's first message).
  //   • initialMessage  — a greeting FROM the agent shown first (e.g. "Hey, how
  //     can I help you"); a static bot message, not answered.
  async showWithAgent(agentId, options) {
    const opts = this._normalizeAgentOptions(options);

    // startAgent() is typically called from a host-page click. That same click
    // bubbles to our document listener and would post `chatbar-outside-click`,
    // collapsing the panel the instant it opens. Suppress outside-click handling
    // SYNCHRONOUSLY here — before the awaited validation below — so the
    // triggering click (which finishes bubbling during that await) can't close
    // the panel; otherwise the validated, non-'kai' path is left unprotected.
    this._suppressOutsideClick = true;
    clearTimeout(this._suppressOutsideClickTimeout);
    this._suppressOutsideClickTimeout = setTimeout(() => {
      this._suppressOutsideClick = false;
    }, 600);

    let resolvedAgentId = agentId;
    if (!resolvedAgentId || resolvedAgentId === 'default') {
      resolvedAgentId = this._getDefaultAgentId() || 'kai';
    }

    if (resolvedAgentId && resolvedAgentId !== 'kai') {
      // Target the requested id up front: _validateAgent only enriches
      // agentName on success, so on a failed lookup (404, network error) we'd
      // otherwise post a stale id from a previous call — or null on the first
      // call. Setting it here means a failed validation still targets the
      // requested agent.
      this.agentId = resolvedAgentId;
      this.agentName = null;
      await this._validateAgent(resolvedAgentId);
    } else {
      this.agentId = 'kai';
      this.agentName = null;
    }

    if (opts.context) this.agentContext = opts.context;

    // Reveal the chatbar (mirrors showAiChatbar) and ensure the frame is mounted.
    this.manuallyHidden = false;
    this.manuallyShown = true;
    this.show();

    // Mark the panel open BEFORE starting the agent so the frame connects Pusher
    // and subscribes first. The initial message is delivered back to the frame
    // over the WebSocket (~500ms after create); without an active subscription
    // at create time that push is missed and the message never renders.
    this.setPanelOpen(true);

    // Queued until the handshake completes (_postMessageRaw buffers until the
    // frame posts `ping`), so this works whether or not the chatbar was already
    // mounted. The frame opens its panel and starts the conversation.
    this._postMessageRaw({
      name: 'chatbar-start-agent',
      data: {
        agentId: this.agentId,
        agentName: this.agentName,
        context: this.agentContext,
        initialQuestion: opts.initialQuestion || undefined,
        initialMessage: opts.initialMessage || undefined,
      },
    });
  }

  updateUIVisibility() {
    const isOpened = GleapFrameManager.getInstance().isOpened();
    if (isOpened) {
      this.hide();
    } else if (this.config?.enabled || this.manuallyShown) {
      this.show();
    } else {
      this.hide();
    }
  }

  show() {
    if (this.manuallyHidden) {
      return;
    }
    this.isHidden = false;
    this._preloadIframe();
    if (this.chatbarContainer) {
      this.chatbarContainer.style.display = 'block';
    }
  }

  hide() {
    this.isHidden = true;
    this._removeUI();
  }

  _removeUI() {
    if (!this.chatbarContainer) return;
    if (document.body && document.body.contains(this.chatbarContainer)) {
      document.body.removeChild(this.chatbarContainer);
    }
    this.chatbarContainer = null;
    this.chatbarFrame = null;
    this.blurBackdrop = null;
    this.comReady = false;
    this._panelOpen = false;
    this.pendingMessages = [];
  }

  _preloadIframe() {
    if (this.chatbarContainer) return;
    runFunctionWhenDomIsReady(() => this._injectUI());
  }

  _injectUI() {
    if (!document.body || this.chatbarContainer) return;

    let flowConfig = {};
    try {
      flowConfig = GleapConfigManager.getInstance().getFlowConfig() || {};
    } catch (e) {}

    if (!document.getElementById('gleap-chatbar-styles')) {
      const widgetPosition = flowConfig.feedbackButtonPosition;
      let positionStyle = '';

      if (widgetPosition === "BOTTOM_RIGHT") {
        positionStyle = 'right: 60px !important;';
      } else if (widgetPosition === "BOTTOM_LEFT") {
        positionStyle = 'left: 60px !important;';
      } else {
        positionStyle = 'right: 0 !important;';
      }

      const styleEl = document.createElement('style');
      styleEl.id = 'gleap-chatbar-styles';
      styleEl.innerHTML = `
        @media (max-width: 460px) {
          .gleap-chatbar {
            width: auto !important;
            max-width: 100% !important;
            ${positionStyle}
          }
        }
      `;
      document.head.appendChild(styleEl);
    }

    const container = document.createElement('div');
    container.className = 'gleap-chatbar';

    container.style.cssText = `
      position: fixed;
      bottom: 10px;
      z-index: 2147483000;
      border: 0;
      width: 280px;
      max-width: calc(100vw - 20px);
      overflow: visible;
      height: 80px;
      display: none;
      transition: width 0.32s cubic-bezier(0.22, 1, 0.36, 1), height 0.32s cubic-bezier(0.22, 1, 0.36, 1);
      left: 0;
      right: 0;
      margin-left: auto;
      margin-right: auto;
    `;

    const frame = document.createElement('iframe');
    frame.className = 'gleap-chatbar-frame';
    frame.title = 'Gleap AI Chatbar';
    frame.setAttribute('role', 'dialog');
    frame.setAttribute('frameborder', '0');
    frame.setAttribute('allow', 'autoplay; encrypted-media; microphone *;');
    frame.style.cssText = `
      position: relative;
      width: 100%;
      height: 100%;
      border: 0;
      background: transparent;
      z-index: 1;
    `;

    const blurBackdrop = document.createElement('div');
    // Real backdrop blur, tuned to scroll as smoothly as Chromium allows. backdrop-filter
    // re-samples the page behind it every scroll frame — that readback is what flickers.
    // Mitigations (none of which blank the blur):
    //   • smaller radius (20px vs 40px): the radius dominates per-frame cost, so this is
    //     the biggest win for dropped frames / flicker.
    //   • a translucent white tint OVER the blur: masks the moving blurred content so any
    //     residual flicker is far less visible, and keeps text readable.
    //   • translateZ(0) + will-change: promote the blur to a stable compositing layer.
    // IMPORTANT: the transform is ON THIS ELEMENT (safe). Do NOT move a transform/filter/
    // will-change onto the parent container — that makes backdrop-filter sample only the
    // container and the blur goes blank. If the blur ever renders blank, drop the
    // `transform` line here first.
    blurBackdrop.style.cssText = `
      position: absolute;
      opacity: 0;
      transition: opacity 0.24s ease;
      background: rgba(255, 255, 255, 0.45);
      backdrop-filter: blur(20px) saturate(150%) brightness(1.04);
      -webkit-backdrop-filter: blur(20px) saturate(150%) brightness(1.04);
      transform: translateZ(0);
      will-change: backdrop-filter, transform;
      backface-visibility: hidden;
      border-radius: 20px;
      pointer-events: none;
      z-index: 0;
    `;

    container.appendChild(blurBackdrop);
    container.appendChild(frame);
    document.body.appendChild(container);

    this.chatbarContainer = container;
    this.chatbarFrame = frame;
    this.blurBackdrop = blurBackdrop;

    // Bootstrap the Messenger /chatbar frame from the Gleap origin via about:blank +
    // doc.write (mirrors GleapFrameManager.injectFrame). bootstrapGleapFrame injects
    // history.replaceState('/chatbar') so the Messenger router boots into CHATBAR mode.
    bootstrapGleapFrame(this.chatbarFrame, this.chatbarUrl);
  }

  destroy() {
    this._removeUI();
    this.config = null;
    this.isHidden = true;
    this.comReady = false;
    this._panelOpen = false;
    this.pendingMessages = [];
    this.agentId = null;
    this.agentName = null;
    this.agentContext = null;
    GleapAiChatbarManager.instance = null;
  }
}
