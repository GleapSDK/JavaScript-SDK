import Gleap, { GleapConfigManager, GleapFrameManager, GleapSession, GleapEventManager } from './Gleap';
import { runFunctionWhenDomIsReady } from './GleapHelper';

export default class GleapAgentPopupManager {
  agentPopupUrl = 'http://localhost:5173/agent';
  popupContainer = null;
  agentData = null;
  backdropClickListener = null;
  disabled = false;

  // singleton
  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new GleapAgentPopupManager();
    }
    return this.instance;
  }

  constructor() {
    this._listenForMessages();
  }

  setAgentPopupUrl(url) {
    this.agentPopupUrl = url;
  }

  disable() {
    this.disabled = true;
    this.hideAgentPopup();
  }

  _listenForMessages() {
    window.addEventListener('message', (event) => {
      if (!this.agentPopupUrl?.includes(event.origin)) {
        return;
      }

      try {
        const data = JSON.parse(event.data);

        if (data?.type !== 'AGENT') {
          return;
        }

        if (data.name === 'agent-loaded' && this.agentData) {
          const flowConfig = GleapConfigManager.getInstance().getFlowConfig();
          const primaryColor = flowConfig.color ? flowConfig.color : '#485BFF';
          const backgroundColor = flowConfig.backgroundColor ? flowConfig.backgroundColor : '#FFFFFF';

          const session = GleapSession.getInstance();
          const apiUrl = session.apiUrl || 'https://api.gleap.io';
          const sdkKey = session.sdkKey || '';
          const gleapId = session.session?.gleapId || '';
          const gleapHash = session.session?.gleapHash || '';

          this._postMessage({
            name: 'agent-data',
            data: {
              agentId: this.agentData.agentId,
              context: this.agentData.context,
              conversationId: this.agentData.conversationId,
              apiUrl,
              sdkKey,
              gleapId,
              gleapHash,
              primaryColor,
              backgroundColor,
            },
          });
        }
        if (data.name === 'agent-close') {
          this.hideAgentPopup();
        }
        if (data.name === 'agent-conversation-created') {
          GleapEventManager.notifyEvent('agent-conversation-created', data.data);
        }
        if (data.name === 'agent-message-sent') {
          GleapEventManager.notifyEvent('agent-message-sent', data.data);
        }
        if (data.name === 'agent-reply-received') {
          GleapEventManager.notifyEvent('agent-reply-received', data.data);
        }
        if (data.name === 'agent-error') {
          GleapEventManager.notifyEvent('agent-error', data.data);
        }
      } catch (exp) {}
    });
  }

  _injectPopupUI() {
    if (!document.body) {
      return false;
    }

    if (this.disabled) {
      return false;
    }

    if (this.popupContainer) {
      this.hideAgentPopup();
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'gleap-agent-popup-wrapper';
    wrapper.innerHTML = `
      <div class="gleap-agent-popup-backdrop"></div>
      <div class="gleap-agent-popup">
        <iframe
          src="${this.agentPopupUrl}"
          class="gleap-agent-popup-frame"
          scrolling="no"
          title="Gleap Agent"
          role="dialog"
          frameborder="0"
          allow="autoplay; encrypted-media; fullscreen; microphone *;"
        ></iframe>
      </div>
    `;
    document.body.appendChild(wrapper);
    this.popupContainer = wrapper;

    // Backdrop click to close
    this.backdropClickListener = this.popupContainer
      .querySelector('.gleap-agent-popup-backdrop')
      .addEventListener('click', () => {
        this.hideAgentPopup();
      });

    // Lock background scroll
    document.body.classList.add('gleap-agent-popup-open');
  }

  _postMessage(message) {
    try {
      const frame = this.popupContainer.querySelector('.gleap-agent-popup-frame');
      if (frame?.contentWindow) {
        frame.contentWindow.postMessage(JSON.stringify({ ...message, type: 'agent' }), this.agentPopupUrl);
      }
    } catch (err) {}
  }

  showAgentPopup(agentId, context, conversationId) {
    if (!agentId) return;

    this.agentData = { agentId, context, conversationId };
    runFunctionWhenDomIsReady(() => {
      this._injectPopupUI();
    });
  }

  hideAgentPopup() {
    if (!this.popupContainer) return;

    if (this.backdropClickListener) {
      this.popupContainer
        .querySelector('.gleap-agent-popup-backdrop')
        .removeEventListener('click', this.backdropClickListener);
    }

    document.body.removeChild(this.popupContainer);
    this.popupContainer = null;
    this.agentData = null;
    document.body.classList.remove('gleap-agent-popup-open');
  }
}
