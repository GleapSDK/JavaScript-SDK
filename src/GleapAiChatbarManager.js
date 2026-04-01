import { GleapFrameManager, GleapConfigManager, GleapSession, GleapEventManager } from './Gleap';
import { runFunctionWhenDomIsReady } from './GleapHelper';

export default class GleapAiChatbarManager {
  chatbarUrl = 'http://localhost:5173/chatbar';
  chatbarContainer = null;
  chatbarFrame = null;
  config = null;
  agentId = 'kai';
  agentName = 'AI Agent';
  agentContext = null;
  isHidden = true;
  manuallyHidden = false;
  onMessageSend = null; // kept for backward compat

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
          this._sendChatbarData();
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
        if (data.name === 'chatbar-error') {
          GleapEventManager.notifyEvent('agent-error', data.data);
        }
      } catch (e) {}
    });
  }

  async _sendChatbarData() {
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

    if (this.agentId && this.agentId !== 'kai' && !this.agentName) {
      await this._validateAgent(this.agentId);
    }

    this._postMessage({
      name: 'chatbar-data',
      data: {
        agentId: this.agentId,
        agentName: this.agentName,
        placeholder: this.config?.placeholder || 'Ask me anything...',
        quickActions: this.config?.quickActions || [],
        style: this.config?.style || 'glow',
        primaryColor: flowConfig?.color || '#485BFF',
        apiUrl,
        sdkKey,
        gleapId,
        gleapHash,
      },
    });
  }

  _postMessage(message) {
    try {
      if (this.chatbarFrame?.contentWindow) {
        this.chatbarFrame.contentWindow.postMessage(JSON.stringify({ ...message, type: 'chatbar' }), '*');
      }
    } catch (e) {}
  }

  _resizeFrame({ width, height }) {
    if (!this.chatbarContainer) return;
    this.chatbarContainer.style.width = Math.ceil(width) + 'px';
    this.chatbarContainer.style.height = Math.ceil(height) + 'px';
  }

  setConfig(config) {
    this.config = config;

    if (!config.agentId || config.agentId === 'default') {
      this.agentId = 'kai';
    } else {
      this.agentId = config.agentId;
    }

    if (config.agentName) this.agentName = config.agentName;

    if (config.enabled) {
      this.show();
    }

    // Forward updated config to chatbar iframe if already loaded
    if (this.chatbarFrame) {
      this._sendChatbarData();
    }
  }

  setPlaceholder(placeholder) {
    if (!this.config) {
      this.config = {};
    }
    this.config.placeholder = placeholder;

    if (this.chatbarFrame) {
      this._sendChatbarData();
    }
  }

  setQuickActions(quickActions) {
    if (!this.config) {
      this.config = {};
    }
    this.config.quickActions = quickActions;

    // Forward to chatbar iframe if already loaded
    if (this.chatbarFrame) {
      this._sendChatbarData();
    }
  }

  setOnMessageSend(callback) {
    this.onMessageSend = callback;
  }

  updateUIVisibility() {
    if (!this.config?.enabled) return;
    const isOpened = GleapFrameManager.getInstance().isOpened();
    if (isOpened) {
      this.hide();
    } else {
      this.show();
    }
  }

  show() {
    if (!this.config?.enabled) return;
    if (this.manuallyHidden) return;

    if (!this.chatbarContainer) {
      runFunctionWhenDomIsReady(() => this._injectUI());
      return;
    }

    this.isHidden = false;
    this.chatbarContainer.style.display = 'block';
  }

  hide() {
    this.isHidden = true;
    if (this.chatbarContainer) {
      this.chatbarContainer.style.display = 'none';
    }
  }

  async _validateAgent(agentId) {
    try {
      let apiUrl = 'https://api.gleap.io';
      let sdkKey = '';
      let gleapId = '';
      let gleapHash = '';

      try {
        const session = GleapSession.getInstance();
        apiUrl = session.apiUrl || apiUrl;
        sdkKey = session.sdkKey || '';
        gleapId = session.session?.gleapId || '';
        gleapHash = session.session?.gleapHash || '';
      } catch (e) {}

      const headers = {};
      if (sdkKey) headers['Api-Token'] = sdkKey;
      if (gleapId) headers['Gleap-Id'] = gleapId;
      if (gleapHash) headers['Gleap-Hash'] = gleapHash;

      const res = await fetch(`${apiUrl}/v3/shared/agents/${agentId}`, { headers });
      if (!res.ok) return null;

      const agentInfo = await res.json();

      if (!agentInfo || agentInfo.error) {
        console.error('Agent not found!');
        return;
      }

      this.agentId = agentId;
      this.agentName = agentInfo.name || 'AI Agent';
      return agentInfo;
    } catch (e) {
      return null;
    }
  }

  _getDefaultAgentId() {
    try {
      const flowConfig = GleapConfigManager.getInstance().getFlowConfig() || {};
      return flowConfig?.aiBar?.agentId || null;
    } catch (e) {
      return null;
    }
  }

  async setAgent(agentId, options = {}) {
    // Resolve to the project's default agent, or fall back to 'kai'
    let resolvedAgentId = agentId;
    if (!resolvedAgentId || resolvedAgentId === 'default') {
      resolvedAgentId = this._getDefaultAgentId() || 'kai';
    }

    if (resolvedAgentId !== 'kai') {
      await this._validateAgent(resolvedAgentId);
    } else {
      this.agentId = 'kai';
    }

    if (options.context) this.agentContext = options.context;

    this.manuallyHidden = false;

    const messageData = {
      agentId: this.agentId,
      agentName: this.agentName,
      context: this.agentContext,
      primaryColor: options.primaryColor || undefined,
    };

    if (!this.chatbarContainer) {
      runFunctionWhenDomIsReady(() => {
        this._injectUI();
        setTimeout(() => {
          this._postMessage({ name: 'chatbar-set-agent', data: messageData });
        }, 500);
      });
      return;
    }

    this.chatbarContainer.style.display = 'block';
    this.isHidden = false;
    this._postMessage({
      name: 'chatbar-set-agent',
      data: messageData,
    });
  }

  async showWithAgent(agentId, options = {}) {
    // Resolve to the project's default agent, or fall back to 'kai'
    let resolvedAgentId = agentId;
    if (!resolvedAgentId || resolvedAgentId === 'default') {
      resolvedAgentId = this._getDefaultAgentId() || 'kai';
    }

    if (resolvedAgentId !== 'kai') {
      await this._validateAgent(resolvedAgentId);
    } else {
      this.agentId = 'kai';
    }

    if (options.context) this.agentContext = options.context;

    this.manuallyHidden = false;

    const messageData = {
      agentId: this.agentId,
      agentName: this.agentName,
      context: this.agentContext,
      primaryColor: options.primaryColor || undefined,
      initialMessage: options.initialMessage || undefined,
    };

    if (!this.chatbarContainer) {
      runFunctionWhenDomIsReady(() => {
        this._injectUI();
        setTimeout(() => {
          this._postMessage({ name: 'chatbar-show-agent', data: messageData });
        }, 500);
      });
      return;
    }

    this.chatbarContainer.style.display = 'block';
    this.isHidden = false;
    this._postMessage({
      name: 'chatbar-show-agent',
      data: messageData,
    });
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
      overflow: hidden;
      height: 80px;
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;

    if (flowConfig?.feedbackButtonPosition === 'BOTTOM_RIGHT') {
      container.style.right = '20px';
      container.style.left = 'auto';
    } else if (flowConfig?.feedbackButtonPosition === 'BOTTOM_LEFT') {
      container.style.left = '20px';
      container.style.right = 'auto';
    } else {
      container.style.left = '50%';
      container.style.transform = 'translateX(-50%)';
    }

    const frame = document.createElement('iframe');
    frame.src = this.chatbarUrl;
    frame.className = 'gleap-chatbar-frame';
    frame.title = 'Gleap AI Chatbar';
    frame.setAttribute('role', 'dialog');
    frame.setAttribute('frameborder', '0');
    frame.setAttribute('allow', 'autoplay; encrypted-media; microphone *;');
    frame.style.cssText = `
      width: 100%;
      height: 100%;
      border: 0;
      background: transparent;
    `;

    container.appendChild(frame);
    document.body.appendChild(container);

    this.chatbarContainer = container;
    this.chatbarFrame = frame;
    this.isHidden = false;
  }

  destroy() {
    if (this.chatbarContainer && document.body.contains(this.chatbarContainer)) {
      document.body.removeChild(this.chatbarContainer);
    }
    this.chatbarContainer = null;
    this.chatbarFrame = null;
    this.config = null;
    this.agentId = null;
    this.agentContext = null;
    this.isHidden = true;
    GleapAiChatbarManager.instance = null;
  }
}
