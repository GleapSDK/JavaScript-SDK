import GleapEventManager from './GleapEventManager';

/**
 * Manages agent tool definitions and tool execution callbacks.
 * Shared across chatbar, messenger, and any future agent surface.
 */
export default class GleapAgentToolManager {
  agentTools = [];
  agentToolCallbacks = [];

  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new GleapAgentToolManager();
    }
    return this.instance;
  }

  /**
   * Set frontend-side tool definitions for AI agents.
   */
  setAgentTools(tools) {
    this.agentTools = tools || [];
  }

  /**
   * Get the current tool definitions.
   */
  getAgentTools() {
    return this.agentTools;
  }

  /**
   * Register a callback for agent tool executions.
   */
  registerAgentToolAction(callback) {
    if (callback) {
      this.agentToolCallbacks.push(callback);
    }
  }

  /**
   * Called when a tool execution event is received from any surface
   * (chatbar, messenger, etc.). Emits the event and triggers all callbacks.
   */
  triggerToolAction(data) {
    if (!data) return;

    GleapEventManager.notifyEvent('agent-tool-executed', data);

    for (const cb of this.agentToolCallbacks) {
      try {
        cb(data);
      } catch (e) {}
    }
  }
}
