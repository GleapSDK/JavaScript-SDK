import { GleapSession } from './Gleap';

export const registerGleapAgentComponents = () => {
  if (typeof customElements === 'undefined' || typeof HTMLElement === 'undefined' || typeof window === 'undefined') return;

  if (!customElements.get('gleap-agent-conversation')) {
    class GleapAgentConversation extends HTMLElement {
      _iframe = null;
      _agentConvUrl = 'http://localhost:5173/agent-conversation';
      _messageListener = null;
      _config = {};

      static get observedAttributes() {
        return ['agentId', 'conversationId', 'dark', 'placeholder', 'agentColor', 'emptyText', 'context'];
      }

      connectedCallback() {
        this._injectIframe();
        this._listenForMessages();
      }

      disconnectedCallback() {
        if (this._messageListener) {
          window.removeEventListener('message', this._messageListener);
        }
        this._messageListener = null;
      }

      attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue && this._iframe) {
          this._sendConfig();
        }
      }

      _injectIframe() {
        if (this._iframe) return;
        this.style.display = 'block';
        this.style.width = '100%';
        this.style.height = '100%';

        const iframe = document.createElement('iframe');
        iframe.src = this._agentConvUrl;
        iframe.style.cssText = 'width: 100%; height: 100%; border: 0; background: transparent;';
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('allow', 'autoplay; encrypted-media; microphone *;');
        iframe.title = 'Gleap Agent Conversation';
        this.appendChild(iframe);
        this._iframe = iframe;
      }

      _listenForMessages() {
        if (this._messageListener) return; // already listening — prevent duplicate on reconnect
        this._messageListener = (event) => {
          try {
            const url = new URL(this._agentConvUrl);
            if (event.origin !== url.origin) return;
          } catch (e) {
            return; // URL parse failed — reject message to be safe
          }

          let data;
          try { data = JSON.parse(event.data); } catch (e) { return; }
          if (data?.type !== 'AGENT_CONVERSATION') return;

          if (data.name === 'agent-conv-loaded') {
            this._sendConfig();
          }
          if (data.name === 'agent-conv-conversation-created') {
            this.dispatchEvent(new CustomEvent('gleap-agent-conversation-created', { bubbles: true, composed: true, detail: data.data }));
          }
          if (data.name === 'agent-conv-message-sent') {
            this.dispatchEvent(new CustomEvent('gleap-agent-message-sent', { bubbles: true, composed: true, detail: data.data }));
          }
          if (data.name === 'agent-conv-reply-received') {
            this.dispatchEvent(new CustomEvent('gleap-agent-reply-received', { bubbles: true, composed: true, detail: data.data }));
          }
          if (data.name === 'agent-conv-error') {
            this.dispatchEvent(new CustomEvent('gleap-agent-error', { bubbles: true, composed: true, detail: data.data }));
          }
        };
        window.addEventListener('message', this._messageListener);
      }

      _sendConfig() {
        if (!this._iframe?.contentWindow) return;

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

        const config = {
          agentId: this.getAttribute('agentId') || '',
          conversationId: this.getAttribute('conversationId') || null,
          dark: this.getAttribute('dark') === 'true' || this.getAttribute('dark') === '',
          placeholder: this.getAttribute('placeholder') || 'Type a message...',
          agentColor: this.getAttribute('agentColor') || null,
          emptyText: this.getAttribute('emptyText') || 'How can I help you today?',
          context: (() => { try { const c = this.getAttribute('context'); return c ? JSON.parse(c) : null; } catch { return null; } })(),
          apiUrl,
          sdkKey,
          gleapId,
          gleapHash,
        };

        this._config = config;

        this._iframe.contentWindow.postMessage(
          JSON.stringify({ type: 'agent-conversation', name: 'agent-conv-data', data: config }),
          '*'
        );
      }

      sendMessage(content) {
        if (!this._iframe?.contentWindow || !content?.trim()) return;
        this._iframe.contentWindow.postMessage(
          JSON.stringify({ type: 'agent-conversation', name: 'agent-conv-send-message', data: { content } }),
          '*'
        );
      }

      clearConversation() {
        if (!this._iframe?.contentWindow) return;
        this._iframe.contentWindow.postMessage(
          JSON.stringify({ type: 'agent-conversation', name: 'agent-conv-clear', data: {} }),
          '*'
        );
      }
    }

    customElements.define('gleap-agent-conversation', GleapAgentConversation);
  }
};
