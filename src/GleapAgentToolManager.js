import GleapEventManager from './GleapEventManager';

/**
 * Manages agent tool definitions and tool execution callbacks.
 * Shared across chatbar, messenger, and any future agent surface.
 */
export default class GleapAgentToolManager {
  agentTools = [];
  agentToolCallbacks = [];
  registeredAgentTools = {};
  runningToolExecutions = {};

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
   * @deprecated Use registerAgentTool(name, handler) with a dashboard-defined
   * Frontend tool instead. Register a callback for agent tool executions.
   */
  registerAgentToolAction(callback) {
    if (callback) {
      this.agentToolCallbacks.push(callback);
    }
  }

  /**
   * Register the handler for a dashboard-defined Frontend tool. The agent
   * calls it with the configured parameters and waits for the return value.
   */
  registerAgentTool(name, handler) {
    if (name && typeof handler === 'function') {
      this.registeredAgentTools[name] = handler;
    }
  }

  /**
   * Execute a registered Frontend tool handler. Always resolves with a
   * result string — missing handlers and thrown errors become error
   * messages for the AI instead of leaving it waiting.
   *
   * Deduped by toolCallId: the widget and the AI chatbar are separate
   * frames on the same session channel, so both can request the same
   * execution — the handler must only run once.
   */
  executeToolAction({ toolCallId, name, params }) {
    if (toolCallId && this.runningToolExecutions[toolCallId]) {
      return this.runningToolExecutions[toolCallId];
    }

    const execution = this._runToolAction({ toolCallId, name, params });
    if (toolCallId) {
      this.runningToolExecutions[toolCallId] = execution;
    }
    return execution;
  }

  async _runToolAction({ toolCallId, name, params }) {
    const handler = this.registeredAgentTools[name];
    let result;

    if (!handler) {
      result = `No handler registered for tool '${name}' in the app. Register one via Gleap.registerAgentTool('${name}', handler).`;
    } else {
      try {
        const handlerResult = await handler(params ?? {});
        result = typeof handlerResult === 'string' ? handlerResult : JSON.stringify(handlerResult ?? '');
        if (!result) {
          result = 'The action completed without returning a result.';
        }
      } catch (error) {
        result = `Tool execution failed: ${error?.message ?? 'unknown error'}`;
      }
    }

    GleapEventManager.notifyEvent('agent-tool-executed', {
      name,
      params: params ?? {},
      result,
      toolCallId,
    });

    return { toolCallId, name, result };
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
