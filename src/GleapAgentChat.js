import AgentNetworkManager from './AgentNetworkManager';

/**
 * Headless agent chat manager with streaming support.
 *
 * Framework-agnostic state manager for AI agent conversations.
 * Uses SSE streaming for real-time token-by-token responses.
 *
 * @example
 * const chat = Gleap.createAgentChat({
 *   agentId: 'abc123',
 *   onChange: ({ messages, isExecuting }) => { ... },
 * });
 * chat.sendMessage('Hello!');
 */
class GleapAgentChat {
  constructor(options = {}) {
    this._agentId = options.agentId || null;
    this._context = options.context || null;
    this._onChange = options.onChange || null;
    this._onError = options.onError || null;
    this._onReplyReceived = options.onReplyReceived || null;
    this._onConversationCreated = options.onConversationCreated || null;
    this._onToken = options.onToken || null;

    this._messages = [];
    this._conversationId = options.conversationId || null;
    this._isExecuting = false;
    this._error = null;
    this._destroyed = false;
    this._abortController = null;

    try {
      this._networkManager = AgentNetworkManager.getInstance();
    } catch (e) {
      this._networkManager = null;
    }
  }

  // --- Public API ---

  /**
   * Send a message to the agent (streaming).
   * @param {string} content
   * @returns {Promise<void>}
   */
  async sendMessage(content) {
    const trimmed = (content || '').trim();
    if (!trimmed || this._isExecuting || !this._agentId || this._destroyed) return;

    // Add user message optimistically
    this._messages = [...this._messages, {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    }];

    // Add empty streaming assistant message
    const streamingId = `stream-${Date.now()}`;
    this._messages = [...this._messages, {
      id: streamingId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      isStreaming: true,
    }];

    this._isExecuting = true;
    this._error = null;
    this._notify();

    const body = { messages: [{ role: 'user', content: trimmed }] };
    if (this._conversationId) body.conversationId = this._conversationId;
    if (this._context) body.additionalContext = this._context;

    this._abortController = new AbortController();
    const isNewConversation = !this._conversationId;
    // Track by index — stable even when id changes
    const streamingIdx = this._messages.length - 1;

    await this._networkManager.streamAgent(this._agentId, body, {
      onMeta: (data) => {
        if (this._destroyed) return;
        if (data.conversationId) {
          this._conversationId = data.conversationId;
          this._networkManager._invalidateMessagesCache(data.conversationId);
          if (isNewConversation && this._onConversationCreated) {
            this._onConversationCreated(data.conversationId);
          }
        }
        if (data.runId && this._messages[streamingIdx]) {
          this._messages[streamingIdx] = { ...this._messages[streamingIdx], id: data.runId };
        }
      },

      onToken: (data) => {
        if (this._destroyed) return;
        const msg = this._messages[streamingIdx];
        if (msg) {
          msg.content += data.content || '';
        }
        this._notify();
        if (this._onToken) this._onToken(data);
      },

      onDone: (data) => {
        if (this._destroyed) return;
        const msg = this._messages[streamingIdx];
        if (msg) {
          msg.isStreaming = false;
          if (data.response && !msg.content) msg.content = data.response;
        }
        this._isExecuting = false;
        this._abortController = null;
        this._notify();
        if (this._onReplyReceived) this._onReplyReceived(data);
      },

      onError: (data) => {
        if (this._destroyed) return;
        const msg = this._messages[streamingIdx];
        if (msg && !msg.content) {
          this._messages.splice(streamingIdx, 1);
        } else if (msg) {
          msg.isStreaming = false;
        }
        this._isExecuting = false;
        this._error = data;
        this._abortController = null;
        this._notify();
        if (this._onError) this._onError(data);
      },

      onToolStart: () => {},
      onToolEnd: () => {},
    }, this._abortController.signal);
  }

  /** Cancel the current streaming request. */
  cancelStream() {
    if (this._abortController) {
      this._abortController.abort();
      this._abortController = null;
    }
    // Finalize any streaming message
    this._messages = this._messages.map((m) => m.isStreaming ? { ...m, isStreaming: false } : m);
    // Remove empty streaming messages
    this._messages = this._messages.filter((m) => m.content || m.role === 'user');
    this._isExecuting = false;
    this._notify();
  }

  clearMessages() {
    this._messages = [];
    this._conversationId = null;
    this._isExecuting = false;
    this._error = null;
    this.cancelStream();
    AgentNetworkManager.getInstance().clearCache();
    this._notify();
  }

  setContext(context) { this._context = context; }

  getState() {
    return {
      messages: this._messages,
      isExecuting: this._isExecuting,
      error: this._error,
      conversationId: this._conversationId,
    };
  }

  destroy() {
    this.cancelStream();
    this._destroyed = true;
    this._onChange = null;
    this._onError = null;
    this._onReplyReceived = null;
    this._onConversationCreated = null;
    this._onToken = null;
  }

  // --- Private ---

  _notify() {
    if (this._onChange && !this._destroyed) {
      this._onChange(this.getState());
    }
  }
}

export default GleapAgentChat;
