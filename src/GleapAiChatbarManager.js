import { GleapFrameManager, GleapConfigManager, GleapSession, GleapEventManager } from './Gleap';
import GleapAgentToolManager from './GleapAgentToolManager';
import { runFunctionWhenDomIsReady } from './GleapHelper';

export default class GleapAiChatbarManager {
  chatbarUrl = 'https://outboundmedia.gleap.io/chatbar';
  chatbarContainer = null;
  chatbarFrame = null;
  config = null;
  agentId = 'kai';
  agentContext = null;
  isHidden = true;
  manuallyHidden = false;
  manuallyShown = false;
  iframeReady = false;
  pendingMessages = [];
  chatbarStyle = null;

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
      this._postMessage({ name: 'chatbar-outside-click' });
    });
  }

  _listenForMessages() {
    window.addEventListener('message', (event) => {
      if (this.chatbarUrl && !this.chatbarUrl.includes(event.origin)) {
        return;
      }

      try {
        const data = JSON.parse(event.data);
        if (data?.type !== 'CHATBAR') return;

        if (data.name === 'chatbar-loaded') {
          this.iframeReady = true;
          this._sendChatbarData();
          this._flushPendingMessages();
        }
        if (data.name === 'chatbar-resize' && data.data) {
          this._resizeFrame(data.data);
        }
        if (data.name === 'chatbar-message-sent') {
          GleapEventManager.notifyEvent('agent-message-sent', data.data);
        }
        if (data.name === 'chatbar-conversation-created') {
          GleapEventManager.notifyEvent('agent-conversation-created', data.data);
        }
        if (data.name === 'chatbar-reply-received') {
          GleapEventManager.notifyEvent('agent-reply-received', data.data);
        }
        if (data.name === 'chatbar-tool-executed' && data.data) {
          GleapAgentToolManager.getInstance().triggerToolAction(data.data);
        }
        if (data.name === 'chatbar-error') {
          GleapEventManager.notifyEvent('agent-error', data.data);
        }
        if (data.name === 'chatbar-panel-blur' && data.data) {
          this._updateBlurBackdrop(data.data);
        }
      } catch (e) {}
    });
  }

  _postMessage(message) {
    try {
      if (!this.iframeReady || !this.chatbarFrame?.contentWindow) {
        this.pendingMessages.push(message);
        return;
      }
      this.chatbarFrame.contentWindow.postMessage(JSON.stringify({ ...message, type: 'chatbar' }), '*');
    } catch (e) {}
  }

  _flushPendingMessages() {
    const queued = this.pendingMessages;
    this.pendingMessages = [];
    for (const msg of queued) {
      this._postMessage(msg);
    }
  }

  _sendChatbarData() {
    if (!this.chatbarContainer) return;
    let flowConfig = {};
    let apiUrl = 'https://api.gleap.io';
    let sdkKey = '';
    let gleapId = '';
    let gleapHash = '';

    try {
      flowConfig = GleapConfigManager.getInstance().getFlowConfig() || {};
    } catch (e) {}

    try {
      const session = GleapSession.getInstance();
      apiUrl = session.apiUrl || apiUrl;
      sdkKey = session.sdkKey || '';
      gleapId = session.session?.gleapId || '';
      gleapHash = session.session?.gleapHash || '';
    } catch (e) {}

    const defaultAgentName = this.config?.agentName || 'Kai';

    this._postMessage({
      name: 'chatbar-data',
      data: {
        agentId: this.agentId,
        defaultAgentName,
        placeholder: this.config?.placeholder || 'Ask me anything...',
        quickActions: this.config?.quickActions || [],
        style: this.config?.style || 'glow',
        primaryColor: flowConfig?.color || '#485BFF',
        agentTools: GleapAgentToolManager.getInstance().getAgentTools(),
        apiUrl,
        sdkKey,
        gleapId,
        gleapHash,
      },
    });
  }

  _resizeFrame({ width, height }) {
    if (!this.chatbarContainer) return;
    this.chatbarContainer.style.width = Math.ceil(width) + 'px';
    this.chatbarContainer.style.height = Math.ceil(height) + 'px';
    if (!this.isHidden) {
      this.chatbarContainer.style.display = 'block';
    }
  }

  _updateBlurBackdrop({ visible, height, borderRadius }) {
    if (!this.blurBackdrop) return;
    if (visible) {
      this.blurBackdrop.style.height = height + 'px';
      this.blurBackdrop.style.borderRadius = borderRadius + 'px';
      this.blurBackdrop.style.display = 'block';
    } else {
      this.blurBackdrop.style.display = 'none';
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

    // Forward updated config to chatbar iframe (queued if not ready yet)
    this._sendChatbarData();
  }

  setPlaceholder(placeholder) {
    if (!this.config) this.config = {};
    this.config.placeholder = placeholder;
    this._sendChatbarData();
  }

  setQuickActions(quickActions) {
    if (!this.config) this.config = {};
    this.config.quickActions = quickActions;
    this._sendChatbarData();
  }

  sendAgentToolsUpdate() {
    this._postMessage({
      name: 'chatbar-set-agent-tools',
      data: { tools: GleapAgentToolManager.getInstance().getAgentTools() },
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
    if (this.chatbarStyle && this.chatbarStyle.parentNode) {
      this.chatbarStyle.parentNode.removeChild(this.chatbarStyle);
    }
    this.chatbarContainer = null;
    this.chatbarFrame = null;
    this.blurBackdrop = null;
    this.chatbarStyle = null;
    this.iframeReady = false;
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
    this._postMessage({ name: messageName, data: messageData });
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
    const style = document.createElement('style');
    style.textContent = `
      @media (max-width: 768px) {
        .gleap-chatbar {
          width: 70% !important;
          left: 40% !important;
        }
      }
    `;
    container.style.cssText = `
      position: fixed;
      bottom: 10px;
      z-index: 2147483000;
      border: 0;
      width: 280px;
      overflow: hidden;
      height: 80px;
      display: none;
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      left: 50%;
      transform: translateX(-50%);
    `;

    const frame = document.createElement('iframe');
    frame.src = this.chatbarUrl;
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
    blurBackdrop.style.cssText = `
      position: absolute;
      bottom: 70px;
      left: 20px;
      right: 20px;
      height: 0;
      display: none;
      backdrop-filter: blur(40px) saturate(180%);
      -webkit-backdrop-filter: blur(40px) saturate(180%);
      border-radius: 20px;
      pointer-events: none;
      z-index: 0;
    `;

    container.appendChild(blurBackdrop);
    container.appendChild(frame);
    (document.head || document.body).appendChild(style);
    document.body.appendChild(container);

    this.chatbarContainer = container;
    this.chatbarFrame = frame;
    this.blurBackdrop = blurBackdrop;
    this.chatbarStyle = style;
  }

  destroy() {
    this._removeUI();
    this.config = null;
    this.agentId = null;
    this.agentContext = null;
    this.isHidden = true;
    this.iframeReady = false;
    this.pendingMessages = [];
    GleapAiChatbarManager.instance = null;
  }
}
