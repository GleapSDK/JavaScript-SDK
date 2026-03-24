import { GleapSession, GleapTranslationManager } from './Gleap';
import { parseSSEStream } from './GleapSSEParser';

const RequestStatus = {
  PENDING: 'pending',
  SUCCESS: 'success',
  ERROR: 'error',
};

class AgentNetworkManager {
  static instance = null;

  /** @private {Map<string, boolean>} agentId -> true if currently executing */
  executeInFlight = new Map();

  /** @private {Map<string, { status, data?, error? }>} */
  messagesCache = new Map();
  /** @private {Map<string, Promise>} */
  messagesRequests = new Map();

  constructor() {
    if (AgentNetworkManager.instance) {
      return AgentNetworkManager.instance;
    }
    AgentNetworkManager.instance = this;
  }

  static getInstance() {
    if (!AgentNetworkManager.instance) {
      AgentNetworkManager.instance = new AgentNetworkManager();
    }
    return AgentNetworkManager.instance;
  }

  clearCache() {
    this.messagesCache.clear();
    this.messagesRequests.clear();
    this.executeInFlight.clear();
  }

  /** @private */
  _getApiUrl() {
    const s = GleapSession.getInstance();
    return s?.apiUrl || null;
  }

  /** @private — build auth headers for fetch */
  _getHeaders() {
    const s = GleapSession.getInstance();
    const headers = { 'Content-Type': 'application/json' };
    if (s?.sdkKey) headers['Api-Token'] = s.sdkKey;
    if (s?.session?.gleapId) headers['Gleap-Id'] = s.session.gleapId;
    if (s?.session?.gleapHash) headers['Gleap-Hash'] = s.session.gleapHash;
    return headers;
  }

  /** @private — XHR for non-streaming requests */
  _makeRequest(method, url, data) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(method, url);
      const s = GleapSession.getInstance();
      s?.injectSession(xhr);
      if (data) xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');

      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(xhr.responseText ? JSON.parse(xhr.responseText) : null);
            } catch (err) {
              reject({ status: xhr.status, statusText: 'JSON Parse Error', error: err });
            }
          } else {
            reject({ status: xhr.status, statusText: xhr.statusText, responseText: xhr.responseText });
          }
        }
      };
      xhr.onerror = () => reject({ status: 0, statusText: 'Network Error' });
      xhr.send(data ? JSON.stringify(data) : null);
    });
  }

  /**
   * Stream an agent execution via SSE.
   *
   * @param {string} agentId
   * @param {object} body - { messages, conversationId?, additionalContext? }
   * @param {object} callbacks - { onMeta, onToken, onDone, onError, onToolStart?, onToolEnd? }
   * @param {AbortSignal} [signal] - optional abort signal
   * @returns {Promise<void>}
   */
  async streamAgent(agentId, body, callbacks, signal) {
    if (this.executeInFlight.get(agentId)) return;
    this.executeInFlight.set(agentId, true);

    const apiUrl = this._getApiUrl();
    if (!apiUrl) {
      this.executeInFlight.delete(agentId);
      callbacks.onError?.({ message: 'Gleap API URL not configured.' });
      return;
    }

    const url = `${apiUrl}/v3/shared/agents/${agentId}/stream`;
    const headers = { ...this._getHeaders(), Accept: 'text/event-stream' };

    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal,
      });
    } catch (err) {
      this.executeInFlight.delete(agentId);
      if (err?.name === 'AbortError') return;
      callbacks.onError?.({ message: 'Failed to connect to agent.' });
      return;
    }

    if (!response.ok) {
      this.executeInFlight.delete(agentId);
      callbacks.onError?.({ message: `Server error: ${response.status}` });
      return;
    }

    // Use shared SSE parser
    await parseSSEStream(response, callbacks);

    // Invalidate caches
    if (body.conversationId) this._invalidateMessagesCache(body.conversationId);
    this.executeInFlight.delete(agentId);
  }

  /**
   * Non-streaming execute (fallback).
   */
  executeAgent(agentId, body) {
    if (this.executeInFlight.get(agentId)) {
      return Promise.reject(new Error('Agent execution already in progress.'));
    }

    const apiUrl = this._getApiUrl();
    if (!apiUrl) return Promise.reject(new Error('AgentNetworkManager: Gleap API URL not configured.'));

    this.executeInFlight.set(agentId, true);
    const url = `${apiUrl}/v3/shared/agents/${agentId}/execute`;
    return this._makeRequest('POST', url, body)
      .then((responseData) => {
        if (body.conversationId) this._invalidateMessagesCache(body.conversationId);
        if (responseData?.conversationId) this._invalidateMessagesCache(responseData.conversationId);
        return responseData;
      })
      .finally(() => { this.executeInFlight.delete(agentId); });
  }

  getConversationMessages(agentId, conversationId, limit = 50, skip = 0) {
    const cacheKey = `${conversationId}:${limit}:${skip}`;
    const cached = this.messagesCache.get(cacheKey);
    if (cached) {
      return cached.status === RequestStatus.SUCCESS
        ? Promise.resolve(JSON.parse(JSON.stringify(cached.data)))
        : Promise.reject(cached.error);
    }
    if (this.messagesRequests.has(cacheKey)) {
      return this.messagesRequests.get(cacheKey).then((d) => JSON.parse(JSON.stringify(d)));
    }

    const apiUrl = this._getApiUrl();
    if (!apiUrl) return Promise.reject(new Error('AgentNetworkManager: Gleap API URL not configured.'));

    const url = `${apiUrl}/v3/shared/agents/${agentId}/conversations/${conversationId}/messages?limit=${limit}&skip=${skip}`;
    const p = this._makeRequest('GET', url, null)
      .then((d) => { this.messagesCache.set(cacheKey, { status: RequestStatus.SUCCESS, data: d }); return JSON.parse(JSON.stringify(d)); })
      .catch((e) => { this.messagesCache.set(cacheKey, { status: RequestStatus.ERROR, error: e }); throw e; })
      .finally(() => { this.messagesRequests.delete(cacheKey); });

    this.messagesRequests.set(cacheKey, p);
    return p.then((d) => JSON.parse(JSON.stringify(d)));
  }

  getConversations(agentId, limit = 10, skip = 0) {
    const apiUrl = this._getApiUrl();
    if (!apiUrl) return Promise.reject(new Error('AgentNetworkManager: Gleap API URL not configured.'));
    return this._makeRequest('GET', `${apiUrl}/v3/shared/agents/${agentId}/conversations?limit=${limit}&skip=${skip}`, null);
  }

  /** @private */
  _invalidateMessagesCache(conversationId) {
    for (const key of this.messagesCache.keys()) {
      if (key.startsWith(conversationId + ':')) this.messagesCache.delete(key);
    }
    for (const key of this.messagesRequests.keys()) {
      if (key.startsWith(conversationId + ':')) this.messagesRequests.delete(key);
    }
  }
}

export default AgentNetworkManager;
