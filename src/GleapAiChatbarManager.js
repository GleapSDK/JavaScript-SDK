import {
  GleapFrameManager,
  GleapConfigManager,
  GleapSession,
  GleapEventManager,
  GleapTranslationManager,
} from './Gleap';
import GleapAgentToolManager from './GleapAgentToolManager';
import { bootstrapGleapFrame, runFunctionWhenDomIsReady } from './GleapHelper';

export default class GleapAiChatbarManager {
  chatbarUrl = 'http://localhost:3001/chatbar';
  chatbarContainer = null;
  chatbarFrame = null;
  config = null;
  agentId = 'kai';
  agentContext = null;
  isHidden = true;
  manuallyHidden = false;
  manuallyShown = false;
  comReady = false;
  pendingMessages = [];
  chatbarStyle = null;
  _panelOpen = false;

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

        // Generic event forwarding (e.g. message-sent / conversation-created / reply-received).
        if (data.name === 'notify-event' && data.data) {
          GleapEventManager.notifyEvent(data.data.type, data.data.data);
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

  _resizeFrame({ width, height }) {
    if (!this.chatbarContainer) return;

    if (Number.isFinite(width)) {
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

  _updateBlurBackdrop({ visible, top, bottom, left, right, radius }) {
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
      bd.opacity = '1';
    } else {
      this.blurBackdrop.style.opacity = '0';
    }
  }

  setConfig(config) {
    this.config = config;

    if (this.agentId === 'kai' || !this.agentId) {
      if (!config.agentId || config.agentId === 'default') {
        this.agentId = 'kai';
      } else {
        this.agentId = config.agentId;
      }
    }

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

  _resolveAgentId(agentId) {
    if (!agentId || agentId === 'default') {
      return 'kai';
    }
    return agentId;
  }

  _sendAgentCommand(agentId, options = {}, openPanel = false) {
    const resolvedAgentId = this._resolveAgentId(agentId);
    this.agentId = resolvedAgentId;
    if (options.context) this.agentContext = options.context;
    this.manuallyHidden = false;

    const messageData = {
      agentId: this.agentId,
      context: this.agentContext,
      primaryColor: options.primaryColor || undefined,
      initialMessage: options.initialMessage || undefined,
    };

    const messageName = openPanel ? 'chatbar-show-agent' : 'chatbar-set-agent';

    // Suppress outside-click for this tick so a button that calls
    // startAgent() doesn't immediately close the conversation.
    this._suppressOutsideClick = true;
    setTimeout(() => { this._suppressOutsideClick = false; }, 0);

    // Show the chatbar (preloads iframe if needed)
    this.show();

    // Post the agent command (queued automatically if iframe not ready yet)
    this._postMessageRaw({ name: messageName, data: messageData });
  }

  setAgent(agentId, options = {}) {
    this._sendAgentCommand(agentId, options, false);
  }

  showWithAgent(agentId, options = {}) {
    this._sendAgentCommand(agentId, options, true);
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
    this.agentId = null;
    this.agentContext = null;
    this.isHidden = true;
    this.comReady = false;
    this._panelOpen = false;
    this.pendingMessages = [];
    GleapAiChatbarManager.instance = null;
  }
}
