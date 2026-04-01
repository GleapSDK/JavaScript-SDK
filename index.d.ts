export namespace Gleap {
  function initialize(sdkKey: string, disablePing?: boolean): void;
  function sendSilentCrashReport(
    description: string,
    priority?: "LOW" | "MEDIUM" | "HIGH",
    excludeData?: {
      customData?: Boolean;
      metaData?: Boolean;
      attachments?: Boolean;
      consoleLog?: Boolean;
      networkLogs?: Boolean;
      customEventLog?: Boolean;
      screenshot?: Boolean;
      replays?: Boolean;
    }
  ): void;
  function sendSilentCrashReportWithFormData(
    formData: {
      [key: string]: string;
    },
    priority?: "LOW" | "MEDIUM" | "HIGH",
    excludeData?: {
      customData: Boolean;
      metaData: Boolean;
      attachments: Boolean;
      consoleLog: Boolean;
      networkLogs: Boolean;
      customEventLog: Boolean;
      screenshot: Boolean;
      replays: Boolean;
    }
  ): void;
  function startClassicForm(
    formId: string,
    showBackButton?: boolean
  ): void;
  function startBot(botId: string, showBackButton?: boolean): void;
  function startConversation(showBackButton?: boolean): void;
  function attachCustomData(customData: any): void;
  function setTicketAttribute(key: string, value: string): void;
  function unsetTicketAttribute(key: string): void;
  function clearTicketAttributes(): void;
  function setCustomData(key: string, value: string): void;
  function removeCustomData(key: string): void;
  function clearCustomData(): void;
  function playSound(play: boolean): void;
  function destroy(): void;
  function showAiChatbar(): void;
  function hideAiChatbar(): void;
  function askAI(question: string, showBackButton?: boolean): void;
  function setAiChatbarQuickActions(quickActions: string[]): void;
  function isOpened(): boolean;
  function setApiUrl(apiUrl: string): void;
  function setWSApiUrl(wsApiUrl: string): void;
  function setFrameUrl(frameUrl: string): void;
  function closeBanner(): void;
  function closeModal(): void;
  function setBannerUrl(bannerUrl: string): void;
  function setModalUrl(modalUrl: string): void;
  function startAgent(
    agentId: string,
    context?: Record<string, any>
  ): void;
  /** @deprecated Agent popup replaced by inline chatbar. No-op. */
  function closeAgentPopup(): void;
  /** @deprecated Agent popup replaced by inline chatbar. No-op. */
  function setAgentPopupUrl(agentPopupUrl: string): void;
  function setMaxNetworkRequests(maxRequests: number): void;
  function startNetworkLogger(): void;
  function setNetworkLogsBlacklist(networkLogBlacklist: string[]): void;
  function setNetworkLogPropsToIgnore(filters: string[]): void;
  function registerCustomAction(
    customAction: (action: { name: string }) => void
  ): void;
  function log(message: string, logLevel?: "INFO" | "WARNING" | "ERROR"): void;
  /**
   * @deprecated Please use trackEvent instead.
   */
  function logEvent(name: string, data?: any): void;
  function trackEvent(name: string, data?: any): void;
  function setAppBuildNumber(buildNumber: string): void;
  function setAppVersionCode(versionCode: string): void;
  function setStyles(styles: {
    primaryColor: string;
    headerColor: string;
    buttonColor: string;
    backgroundColor: string;
    borderRadius?: number;
    buttonX?: number;
    buttonY?: number;
    buttonStyle?: string;
  }): void;
  function disableConsoleLogOverwrite(): void;
  function setLiveSite(isLiveSite: boolean): void;
  function enableShortcuts(enabled: boolean): void;
  function setLanguage(language: string): void;
  function preFillForm(data: object): void;
  function setAiTools(tools: {
    name: string;
    description: string;
    executionType?: 'button' | 'auto';
    response?: string;
    parameters: {
      name: string;
      description: string;
      type: "string" | "number" | "boolean";
      required: boolean;
      enums?: string[];
    }[];
  }[]): void;
  function showTabNotificationBadge(showNotificationBadge: boolean): void;
  function attachNetworkLogs(networkLogs: string): void;
  function clearIdentity(): void;
  function setTags(tags: string[]): void;
  function setDisableInAppNotifications(
    disableInAppNotifications: boolean
  ): void;
  function setDisablePageTracking(
    disablePageTracking: boolean
  ): void;
  function identify(
    userId: string,
    customerData: {
      name?: string | null;
      email?: string | null;
      phone?: string | null;
      value?: number | null;
      companyId?: string | null;
      companyName?: string | null;
      sla?: number | null;
      plan?: string | null;
      customData?: object | null;
      avatar?: string | null;
      createdAt?: Date | null;
    },
    userHash?: string
  ): void;
  function updateContact(
    customerData: {
      name?: string | null;
      email?: string | null;
      phone?: string | null;
      value?: number | null;
      companyId?: string | null;
      companyName?: string | null;
      sla?: number | null;
      plan?: string | null;
      avatar?: string | null;
      customData?: object | null;
    }
  ): void;
  function getInstance(): any;
  function open(): void;
  function openChecklists(showBackButton?: boolean): void;
  function openChecklist(checklistId: string, showBackButton?: boolean): void;
  function startChecklist(outboundId: string, showBackButton?: boolean, sharedKey?: string): void;
  function openNews(showBackButton?: boolean): void;
  function openNewsArticle(id: string, showBackButton?: boolean): void;
  function openConversations(showBackButton?: boolean): void;
  function startProductTour(tourId: string): void;
  function openConversation(
    shareToken?: string,
    showBackButton?: boolean
  ): void;
  function setUrlHandler(
    urlHandler: (url: string, newTab?: boolean) => void
  ): void;
  function openHelpCenter(showBackButton?: boolean): void;
  function openHelpCenterCollection(
    collectionId: string,
    showBackButton?: boolean
  ): void;
  function openHelpCenterArticle(
    articleId: string,
    showBackButton?: boolean
  ): void;
  function searchHelpCenter(term: string, showBackButton?: boolean): void;
  function openFeatureRequests(showBackButton?: boolean): void;
  function close(): void;
  function hide(): void;
  function setUseCookies(useCookies: boolean): void;
  function setEnvironment(environment: "dev" | "staging" | "prod"): void;
  function showFeedbackButton(show: boolean): void;
  function startFeedbackFlow(
    feedbackFlow: string,
    showBackButton?: boolean
  ): void;
  function showSurvey(surveyId: string, format?: string): void;
  function on(
    event:
      | "initialized"
      | "open"
      | "close"
      | "flow-started"
      | "checklist-loaded"
      | "checklist-step-completed"
      | "checklist-completed"
      | "agent-message-sent"
      | "agent-reply-received"
      | "agent-error"
      | "agent-conversation-created"
      | string,
    callback: (data?: any) => void
  ): void;
  function sendAgentMessage(
    agentId: string,
    message: string,
    options?: {
      conversationId?: string;
      additionalContext?: Record<string, any>;
    }
  ): Promise<{
    runId: string;
    status: string;
    response: string;
    conversationId?: string;
    outcome?: { type: string };
  }>;
  function clearAgentConversation(): void;

  interface AgentChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: string;
  }

  interface AgentChatState {
    messages: AgentChatMessage[];
    isExecuting: boolean;
    error: any;
    conversationId: string | null;
  }

  interface AgentChatOptions {
    /** The agent ID to talk to. */
    agentId: string;
    /** Additional context sent with every message to the AI. */
    context?: Record<string, any>;
    /** Resume an existing conversation by ID. */
    conversationId?: string;
    /** Called on every state change (messages, loading, error). */
    onChange?: (state: AgentChatState) => void;
    /** Called when the agent replies. */
    onReplyReceived?: (data: any) => void;
    /** Called on error. */
    onError?: (error: any) => void;
    /** Called when a new conversation is created. */
    onConversationCreated?: (conversationId: string) => void;
  }

  interface AgentChatInstance {
    /** Send a message to the agent. */
    sendMessage(content: string): Promise<void>;
    /** Clear all messages and start a new conversation. */
    clearMessages(): void;
    /** Update the context sent with future messages. */
    setContext(context: Record<string, any>): void;
    /** Get the current state snapshot. */
    getState(): AgentChatState;
    /** Destroy this instance and stop all callbacks. */
    destroy(): void;
  }

  /**
   * Create a headless agent chat instance.
   * Framework-agnostic — wire onChange to React setState, Vue ref, Svelte store, etc.
   *
   * @example
   * ```js
   * const chat = Gleap.createAgentChat({
   *   agentId: 'abc123',
   *   context: { page: '/billing' },
   *   onChange: ({ messages, isExecuting }) => { ... },
   * });
   * chat.sendMessage('Hello!');
   * ```
   */
  function createAgentChat(options: AgentChatOptions): AgentChatInstance;

  function getIdentity(): any;
  function isUserIdentified(): boolean;
  function setReplayOptions(options: {
    blockClass?: string | RegExp;
    blockSelector?: string;
    ignoreClass?: string | RegExp;
    ignoreSelector?: string;
    ignoreCSSAttributes?: string[];
    maskTextClass?: string | RegExp;
    maskTextSelector?: string;
    maskAllInputs?: boolean;
    maskInputOptions?: {
      password?: boolean;
      [key: string]: any;
    };
    maskInputFn?: (text: string) => string;
    maskTextFn?: (text: string) => string;
    slimDOMOptions?: {
      [key: string]: any;
    };
    dataURLOptions?: {
      [key: string]: any;
    };
    hooks?: {
      [key: string]: any;
    };
    packFn?: (events: any) => any;
    sampling?: any;
    recordCanvas?: boolean;
    recordCrossOriginIframes?: boolean;
    recordAfter?: 'DOMContentLoaded' | 'load';
    inlineImages?: boolean;
    collectFonts?: boolean;
    userTriggeredOnInput?: boolean;
    plugins?: {
      [key: string]: any;
    }[];
    errorHandler?: (error: Error) => void;
  }): void;
}
export default Gleap;

// Custom element type declarations — makes <gleap-*> work in JSX without extra setup
// Covers both React 18 (global JSX) and React 19+ (React.JSX)
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'gleap-agent-conversation': any;
      'gleap-agent-input': any;
      'gleap-agent-profile-image': any;
      'gleap-agent-reply-bubble': any;
      'gleap-agent-user-bubble': any;
      'gleap-agent-typing-indicator': any;
      'gleap-agent-send-button': any;
      'gleap-agent-message-list': any;
      'gleap-checklist': any;
    }
  }
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'gleap-agent-conversation': any;
      'gleap-agent-input': any;
      'gleap-agent-profile-image': any;
      'gleap-agent-reply-bubble': any;
      'gleap-agent-user-bubble': any;
      'gleap-agent-typing-indicator': any;
      'gleap-agent-send-button': any;
      'gleap-agent-message-list': any;
      'gleap-checklist': any;
    }
  }
}
