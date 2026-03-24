/**
 * Agent Input Web Component (no Shadow DOM)
 *
 * ContentEditable div with embedded send button (ChatGPT-style).
 * Enter sends, Shift+Enter inserts newline.
 *
 * **Dumb mode** (no agentId): Dispatches `gleap-agent-send` event only.
 * **Smart mode** (agentId set): Handles the full API call internally and dispatches:
 *   - `gleap-agent-message-sent`
 *   - `gleap-agent-reply-received`
 *   - `gleap-agent-error`
 *   - `gleap-agent-conversation-created`
 *
 * @element gleap-agent-input
 */
import AgentNetworkManager from './AgentNetworkManager';
import { injectAgentStyles } from './GleapAgentStyles';

const SEND_ICON = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 4L12 20M12 4L6 10M12 4L18 10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export const GleapAgentInputComponent = (typeof customElements !== 'undefined' && typeof HTMLElement !== 'undefined') ? class GleapAgentInput extends HTMLElement {
  _boundKeyDown = this._handleKeyDown.bind(this);
  _boundInput = this._handleInput.bind(this);
  _boundPaste = this._handlePaste.bind(this);
  _boundSendClick = this._handleSendClick.bind(this);

  _conversationId = null;
  _isExecuting = false;
  _context = null;

  static get observedAttributes() { return ['placeholder', 'disabled', 'dark', 'agentId', 'context']; }

  connectedCallback() {
    injectAgentStyles();
    this.render();
    this._attachListeners();
  }

  disconnectedCallback() { this._detachListeners(); }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      const editable = this.querySelector('.gleap-agent-editable');
      if (editable) {
        if (name === 'placeholder') editable.setAttribute('data-placeholder', newValue || 'Type a message...');
        if (name === 'disabled') { editable.setAttribute('contenteditable', this.isDisabled ? 'false' : 'true'); this._updateSendButton(); }
        if (name === 'agentId') { this._conversationId = null; this._isExecuting = false; }
        if (name === 'dark') { this.render(); this._attachListeners(); }
      } else {
        this.render();
        this._attachListeners();
      }
    }
  }

  get isDisabled() { return this.hasAttribute('disabled') || this._isExecuting; }
  get context() {
    if (this._context) return this._context;
    const attr = this.getAttribute('context');
    if (attr) { try { return JSON.parse(attr); } catch (e) { return null; } }
    return null;
  }
  set context(val) { this._context = val; }
  get isSmartMode() { return !!this.getAttribute('agentId'); }
  get conversationId() { return this._conversationId; }

  _attachListeners() {
    const editable = this.querySelector('.gleap-agent-editable');
    const btn = this.querySelector('.gleap-agent-input-send');
    if (editable) {
      editable.addEventListener('keydown', this._boundKeyDown);
      editable.addEventListener('input', this._boundInput);
      editable.addEventListener('paste', this._boundPaste);
    }
    if (btn) btn.addEventListener('click', this._boundSendClick);
  }

  _detachListeners() {
    const editable = this.querySelector('.gleap-agent-editable');
    const btn = this.querySelector('.gleap-agent-input-send');
    if (editable) {
      editable.removeEventListener('keydown', this._boundKeyDown);
      editable.removeEventListener('input', this._boundInput);
      editable.removeEventListener('paste', this._boundPaste);
    }
    if (btn) btn.removeEventListener('click', this._boundSendClick);
  }

  _getText() {
    const editable = this.querySelector('.gleap-agent-editable');
    if (!editable) return '';
    return (editable.innerText || '').replace(/\n$/, '');
  }

  _handleKeyDown(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._send(); } }
  _handleInput() { this._updateSendButton(); }
  _handlePaste(e) { e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain')); }
  _handleSendClick(e) { e.stopPropagation(); this._send(); }

  _send() {
    if (this.isDisabled) return;
    const content = this._getText().trim();
    if (!content) return;

    const editable = this.querySelector('.gleap-agent-editable');
    if (editable) editable.textContent = '';
    this._updateSendButton();

    this.dispatchEvent(new CustomEvent('gleap-agent-send', { bubbles: true, composed: true, detail: { content } }));

    const agentId = this.getAttribute('agentId');
    if (agentId) this._executeAgent(agentId, content);
    if (editable) editable.focus();
  }

  async _executeAgent(agentId, content) {
    this._isExecuting = true;
    this._setDisabledState(true);

    this._dispatch('gleap-agent-message-sent', { agentId, content, conversationId: this._conversationId });

    const body = { messages: [{ role: 'user', content }] };
    if (this._conversationId) body.conversationId = this._conversationId;
    const ctx = this.context;
    if (ctx) body.additionalContext = ctx;

    const isNew = !this._conversationId;
    let fullResponse = '';

    this._abortController = new AbortController();

    await AgentNetworkManager.getInstance().streamAgent(agentId, body, {
      onMeta: (data) => {
        if (!this.isConnected) return;
        if (data.conversationId) {
          this._conversationId = data.conversationId;
          if (isNew) this._dispatch('gleap-agent-conversation-created', { agentId, conversationId: data.conversationId });
        }
      },
      onToken: (data) => {
        if (!this.isConnected) return;
        fullResponse += data.content || '';
        this._dispatch('gleap-agent-token', { agentId, content: data.content, fullResponse, conversationId: this._conversationId });
      },
      onDone: (data) => {
        if (!this.isConnected) return;
        this._isExecuting = false; this._abortController = null;
        this._setDisabledState(false);
        this._dispatch('gleap-agent-reply-received', { agentId, response: fullResponse || data?.response, status: data?.status, conversationId: this._conversationId });
      },
      onError: (data) => {
        if (!this.isConnected) return;
        this._isExecuting = false; this._abortController = null;
        this._setDisabledState(false);
        this._dispatch('gleap-agent-error', { agentId, error: data, conversationId: this._conversationId });
      },
      onToolStart: () => {},
      onToolEnd: () => {},
    }, this._abortController.signal);
  }

  _dispatch(name, detail) { this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true, detail })); }

  _setDisabledState(disabled) {
    const editable = this.querySelector('.gleap-agent-editable');
    if (editable) editable.setAttribute('contenteditable', disabled ? 'false' : 'true');
    this._updateSendButton();
  }

  _updateSendButton() {
    const btn = this.querySelector('.gleap-agent-input-send');
    if (btn) btn.disabled = this.isDisabled || !this._getText().trim();
  }

  clear() { const e = this.querySelector('.gleap-agent-editable'); if (e) e.textContent = ''; this._updateSendButton(); }
  focusInput() { const e = this.querySelector('.gleap-agent-editable'); if (e) e.focus(); }
  resetConversation() { this._conversationId = null; }

  render() {
    const placeholder = this.getAttribute('placeholder') || 'Type a message...';
    this.innerHTML = `
      <div class="gleap-agent-input-box">
        <div class="gleap-agent-editable" contenteditable="${this.isDisabled ? 'false' : 'true'}" role="textbox" aria-multiline="true" data-placeholder="${placeholder}"></div>
        <button class="gleap-agent-input-send" disabled aria-label="Send message">${SEND_ICON}</button>
      </div>
    `;
  }
} : null;

export const registerGleapAgentInput = () => {
  if (GleapAgentInputComponent && typeof customElements !== 'undefined' && !customElements.get('gleap-agent-input')) {
    customElements.define('gleap-agent-input', GleapAgentInputComponent);
  }
};
