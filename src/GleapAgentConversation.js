/**
 * Gleap Agent Conversation Web Component — Preset (no Shadow DOM)
 *
 * Plug-and-play component that composes all granular agent sub-components.
 * Fully stylable with normal CSS since there is no Shadow DOM boundary.
 *
 * @element gleap-agent-conversation
 *
 * @attr {string} agentId - The agent ID to talk to. Required.
 * @attr {string} [conversationId] - Resume an existing conversation.
 * @attr {boolean} [dark=false] - Dark mode styling.
 * @attr {string} [placeholder="Type a message..."] - Input placeholder.
 * @attr {string} [agentColor] - Override primary color for accent.
 * @attr {string} [emptyText="How can I help you today?"] - Empty state text.
 * @attr {string} [context] - JSON string of additional context for the AI.
 */
import AgentNetworkManager from './AgentNetworkManager';
import Gleap, { GleapSession, GleapConfigManager, GleapEventManager } from './Gleap';
import { injectAgentStyles } from './GleapAgentStyles';

import { registerGleapAgentProfileImage } from './GleapAgentProfileImage';
import { registerGleapAgentReplyBubble } from './GleapAgentReplyBubble';
import { registerGleapAgentUserBubble } from './GleapAgentUserBubble';
import { registerGleapAgentTypingIndicator } from './GleapAgentTypingIndicator';
import { registerGleapAgentSendButton } from './GleapAgentSendButton';
import { registerGleapAgentInput } from './GleapAgentInput';
import { registerGleapAgentMessageList } from './GleapAgentMessageList';

/**
 * Registers all agent sub-components and the preset.
 */
export const registerGleapAgentComponents = () => {
  if (typeof customElements === 'undefined' || typeof HTMLElement === 'undefined' || typeof window === 'undefined') return;

  registerGleapAgentProfileImage();
  registerGleapAgentReplyBubble();
  registerGleapAgentUserBubble();
  registerGleapAgentTypingIndicator();
  registerGleapAgentSendButton();
  registerGleapAgentInput();
  registerGleapAgentMessageList();

  if (!customElements.get('gleap-agent-conversation')) {
    class GleapAgentConversation extends HTMLElement {
      _messages = [];
      _conversationId = null;
      _isExecuting = false;
      _isSessionReady = false;
      _hasLoaded = false;
      _structureRendered = false;
      _error = null;
      _context = null;

      _boundSessionUpdate = this._handleSessionUpdate.bind(this);
      _boundSendEvent = this._handleSendEvent.bind(this);

      constructor() {
        super();
        try { this._networkManager = AgentNetworkManager.getInstance(); } catch (e) { this._networkManager = null; }
      }

      static get observedAttributes() {
        return ['agentId', 'conversationId', 'dark', 'placeholder', 'agentColor', 'emptyText', 'context'];
      }

      // --- Lifecycle ---
      connectedCallback() {
        injectAgentStyles();
        window.addEventListener('session-updated', this._boundSessionUpdate);
        this._renderStructure();
        this._checkSessionAndLoad();
      }

      disconnectedCallback() {
        window.removeEventListener('session-updated', this._boundSessionUpdate);
        this.removeEventListener('gleap-agent-send', this._boundSendEvent);
        this._structureRendered = false;
      }

      attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
          if (name === 'agentId') {
            this._messages = []; this._conversationId = null; this._isExecuting = false; this._error = null; this._hasLoaded = false;
            if (this._isSessionReady) this._loadConversation(); else this._updateMessages();
          } else if (name === 'conversationId') {
            this._conversationId = newValue || null; this._messages = []; this._hasLoaded = false;
            if (this._isSessionReady) this._loadConversation();
          } else if (name === 'dark') {
            this._structureRendered = false; this._renderStructure(); this._updateMessages(); this._updateExecutingState();
          } else if (name === 'placeholder') {
            const input = this.querySelector('gleap-agent-input');
            if (input) input.setAttribute('placeholder', newValue || 'Type a message...');
          } else if (name === 'emptyText') {
            this._updateMessages();
          }
        }
      }

      // --- Session ---
      _checkSessionAndLoad() {
        let s; try { s = GleapSession.getInstance(); } catch (e) { s = null; }
        const agentId = this.getAttribute('agentId');
        if (s?.ready && agentId) {
          this._isSessionReady = true;
          this._networkManager = AgentNetworkManager.getInstance();
          this._loadConversation();
        } else {
          this._isSessionReady = false; this._hasLoaded = false; this._messages = []; this._conversationId = null;
          this._updateMessages();
        }
      }

      _handleSessionUpdate() { this._checkSessionAndLoad(); }

      // --- Data Loading ---
      _loadConversation() {
        const conversationId = this.getAttribute('conversationId') || this._conversationId;
        if (conversationId && this._networkManager) {
          this._conversationId = conversationId;
          const agentId = this.getAttribute('agentId');
          this._networkManager.getConversationMessages(agentId, conversationId)
            .then((data) => {
              if (!this.isConnected || !this._isSessionReady) return;
              this._messages = (data?.messages || data || [])
                .filter((m) => m.role === 'user' || m.role === 'assistant')
                .map((m) => ({ id: m.id || m._id || `msg-${Date.now()}-${Math.random()}`, role: m.role, content: m.content || '', createdAt: m.createdAt || new Date().toISOString() }));
              this._hasLoaded = true;
              this._updateMessages(); this._scrollToBottom();
            })
            .catch(() => { this._hasLoaded = true; this._updateMessages(); });
        } else {
          this._hasLoaded = true; this._updateMessages();
        }
      }

      // --- Getters ---
      get context() {
        if (this._context) return this._context;
        const attr = this.getAttribute('context');
        if (attr) { try { return JSON.parse(attr); } catch (e) { return null; } }
        return null;
      }
      set context(val) { this._context = val; }

      get agentColor() {
        const c = this.getAttribute('agentColor'); if (c) return c;
        try { return GleapConfigManager.getInstance().getFlowConfig()?.color || '#485BFF'; } catch (e) { return '#485BFF'; }
      }

      get isDark() { return this.getAttribute('dark') === 'true' || this.getAttribute('dark') === ''; }

      // --- Send / Receive ---
      _handleSendEvent(e) { if (e.detail?.content) this._handleSend(e.detail.content); }

      _handleSend(content) {
        if (!content?.trim() || this._isExecuting) return;
        const agentId = this.getAttribute('agentId');
        if (!agentId || !this._networkManager) return;
        const trimmed = content.trim();

        // Add user message
        this._messages = [...this._messages, { id: `user-${Date.now()}`, role: 'user', content: trimmed, createdAt: new Date().toISOString() }];

        // Add empty streaming assistant message
        const streamingId = `stream-${Date.now()}`;
        this._messages = [...this._messages, { id: streamingId, role: 'assistant', content: '', createdAt: new Date().toISOString(), isStreaming: true }];

        this._isExecuting = true; this._error = null;
        this._updateMessages(); this._updateExecutingState(); this._scrollToBottom();

        this._dispatchEvent('gleap-agent-message-sent', { agentId, content: trimmed, conversationId: this._conversationId });
        GleapEventManager.notifyEvent('agent-message-sent', { agentId, content: trimmed, conversationId: this._conversationId });

        const body = { messages: [{ role: 'user', content: trimmed }] };
        if (this._conversationId) body.conversationId = this._conversationId;
        const ctx = this.context; if (ctx) body.additionalContext = ctx;

        this._abortController = new AbortController();
        const isNewConversation = !this._conversationId;

        // Track the streaming message by index (stable, unlike id which may change)
        const streamingIdx = this._messages.length - 1;

        this._networkManager.streamAgent(agentId, body, {
          onMeta: (data) => {
            if (!this.isConnected) return;
            if (data.conversationId) {
              this._conversationId = data.conversationId;
              this._networkManager._invalidateMessagesCache(data.conversationId);
              if (isNewConversation) {
                this._dispatchEvent('gleap-agent-conversation-created', { agentId, conversationId: data.conversationId });
                GleapEventManager.notifyEvent('agent-conversation-created', { agentId, conversationId: data.conversationId });
              }
            }
            if (data.runId && this._messages[streamingIdx]) {
              this._messages[streamingIdx] = { ...this._messages[streamingIdx], id: data.runId };
            }
          },
          onToken: (data) => {
            if (!this.isConnected) return;
            const msg = this._messages[streamingIdx];
            if (msg) {
              msg.content += data.content || '';
              // Update the existing DOM bubble in-place (no full re-render)
              this._updateStreamingBubble(msg.content);
              this._scrollToBottom();
            }
          },
          onDone: (data) => {
            if (!this.isConnected) return;
            const msg = this._messages[streamingIdx];
            if (msg) {
              msg.isStreaming = false;
              if (data.response && !msg.content) msg.content = data.response;
            }
            this._isExecuting = false; this._abortController = null;
            // Full re-render now that streaming is done
            this._updateMessages(); this._updateExecutingState(); this._scrollToBottom();
            const finalContent = msg?.content || data?.response || '';
            this._dispatchEvent('gleap-agent-reply-received', { agentId, response: finalContent, status: data?.status, conversationId: this._conversationId });
            GleapEventManager.notifyEvent('agent-reply-received', { agentId, response: finalContent, status: data?.status, conversationId: this._conversationId });
          },
          onError: (data) => {
            if (!this.isConnected) return;
            const msg = this._messages[streamingIdx];
            if (msg && !msg.content) {
              // Remove empty streaming message
              this._messages.splice(streamingIdx, 1);
            } else if (msg) {
              msg.isStreaming = false;
            }
            this._isExecuting = false; this._error = data; this._abortController = null;
            this._updateMessages(); this._updateExecutingState();
            this._dispatchEvent('gleap-agent-error', { agentId, error: data, conversationId: this._conversationId });
            GleapEventManager.notifyEvent('agent-error', { agentId, error: data });
          },
          onToolStart: () => {},
          onToolEnd: () => {},
        }, this._abortController.signal);
      }

      /**
       * Update the streaming bubble in-place without full re-render.
       * On first token: replaces typing indicator with a reply bubble.
       * On subsequent tokens: updates the existing bubble's content.
       */
      _updateStreamingBubble(content) {
        const container = this.querySelector('#gleap-agent-msg-container');
        if (!container) return;
        const dark = this.isDark;

        // Check if typing indicator is still showing (first token arriving)
        const typing = container.querySelector('gleap-agent-typing-indicator');
        if (typing) {
          const bubble = document.createElement('gleap-agent-reply-bubble');
          bubble.setAttribute('content', content);
          bubble.setAttribute('data-streaming', 'true');
          if (dark) bubble.setAttribute('dark', '');
          typing.replaceWith(bubble);
          return;
        }

        // Update existing streaming bubble
        const streamingBubble = container.querySelector('gleap-agent-reply-bubble[data-streaming="true"]');
        if (streamingBubble) {
          streamingBubble.setAttribute('content', content);
        }
      }

      _dispatchEvent(name, detail) { this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true, detail })); }

      _scrollToBottom() {
        requestAnimationFrame(() => {
          const c = this.querySelector('.gleap-agent-messages');
          if (c) c.scrollTop = c.scrollHeight;
        });
      }

      _escapeHtml(str) { return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

      // --- Structural Render (once) ---
      _renderStructure() {
        if (this._structureRendered) return;
        this._structureRendered = true;
        const placeholder = this.getAttribute('placeholder') || 'Type a message...';
        const dark = this.isDark;

        this.innerHTML = `
          <div class="gleap-agent-messages" id="gleap-agent-msg-container"></div>
          <div class="gleap-agent-input-wrapper">
            <gleap-agent-input placeholder="${placeholder}" ${dark ? 'dark' : ''}></gleap-agent-input>
          </div>
        `;

        this.addEventListener('gleap-agent-send', this._boundSendEvent);
      }

      // --- Targeted Updates ---
      _updateMessages() {
        if (!this._structureRendered) return;
        const container = this.querySelector('#gleap-agent-msg-container');
        if (!container) return;
        const dark = this.isDark;

        container.innerHTML = '';

        if (this._messages.length === 0) {
          const emptyText = this.getAttribute('emptyText') || 'How can I help you today?';
          container.innerHTML = `
            <div class="gleap-agent-empty-state">
              <div class="gleap-agent-empty-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 11.5C21.0034 12.8199 20.6951 14.1219 20.1 15.3C19.3944 16.7118 18.3098 17.8992 16.9674 18.7293C15.6251 19.5594 14.0782 19.9994 12.5 20C11.1801 20.0035 9.87812 19.6951 8.7 19.1L3 21L4.9 15.3C4.30493 14.1219 3.99656 12.8199 4 11.5C4.00061 9.92179 4.44061 8.37488 5.27072 7.03258C6.10083 5.69028 7.28825 4.6056 8.7 3.90003C9.87812 3.30496 11.1801 2.99659 12.5 3.00003H13C15.0843 3.11502 17.053 3.99479 18.5291 5.47089C20.0052 6.94699 20.885 8.91568 21 11V11.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="gleap-agent-empty-text">${this._escapeHtml(emptyText)}</div>
            </div>
          `;
          return;
        }

        this._messages.forEach((msg) => {
          // Streaming message with no content yet — show typing indicator instead
          if (msg.isStreaming && !msg.content) {
            const typing = document.createElement('gleap-agent-typing-indicator');
            typing.setAttribute('active', 'true');
            if (dark) typing.setAttribute('dark', '');
            container.appendChild(typing);
            return;
          }

          if (msg.role === 'assistant') {
            const bubble = document.createElement('gleap-agent-reply-bubble');
            bubble.setAttribute('content', msg.content);
            if (dark) bubble.setAttribute('dark', '');
            container.appendChild(bubble);
          } else {
            const bubble = document.createElement('gleap-agent-user-bubble');
            bubble.setAttribute('content', msg.content);
            if (dark) bubble.setAttribute('dark', '');
            container.appendChild(bubble);
          }
        });

        if (this._error) {
          const errDiv = document.createElement('div');
          errDiv.className = 'gleap-agent-error-msg';
          errDiv.textContent = 'Something went wrong. Please try again.';
          container.appendChild(errDiv);
        }
      }

      _updateExecutingState() {
        if (!this._structureRendered) return;
        const input = this.querySelector('gleap-agent-input');
        if (input) {
          if (this._isExecuting) input.setAttribute('disabled', '');
          else input.removeAttribute('disabled');
        }
      }
    }

    customElements.define('gleap-agent-conversation', GleapAgentConversation);
  }
};
