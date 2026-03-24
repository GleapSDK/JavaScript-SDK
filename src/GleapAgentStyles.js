/**
 * Shared CSS for all agent components.
 * Injected once into document.head via injectAgentStyles().
 * All classes namespaced with "gleap-agent-" to avoid conflicts.
 */

let stylesInjected = false;

export const injectAgentStyles = () => {
  if (stylesInjected || typeof document === 'undefined') return;
  stylesInjected = true;

  const style = document.createElement('style');
  style.setAttribute('data-gleap-agent', '');
  style.textContent = `
    /* =============================================
       Gleap Agent Components — Shared Styles
       All classes prefixed with "gleap-agent-"
       ============================================= */

    /* --- Profile Image --- */
    gleap-agent-profile-image {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .gleap-agent-avatar-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      color: #ffffff;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-weight: 600;
      line-height: 1;
      user-select: none;
    }
    .gleap-agent-avatar-img {
      border-radius: 50%;
      object-fit: cover;
      display: block;
    }

    /* --- Reply Bubble (assistant) --- */
    gleap-agent-reply-bubble {
      display: block;
    }
    .gleap-agent-reply-bubble {
      background-color: #f3f4f6;
      color: #1f2937;
      padding: 10px 14px;
      border-radius: 16px 16px 16px 6px;
      max-width: 85%;
      width: fit-content;
      word-wrap: break-word;
      overflow-wrap: break-word;
      font-size: 0.9rem;
      line-height: 1.5;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .gleap-agent-reply-bubble p { margin: 0 0 8px 0; }
    .gleap-agent-reply-bubble p:last-child { margin-bottom: 0; }
    .gleap-agent-reply-bubble strong { font-weight: 600; }
    .gleap-agent-reply-bubble em { font-style: italic; }
    .gleap-agent-reply-bubble code {
      background-color: #e5e7eb;
      padding: 2px 5px;
      border-radius: 4px;
      font-size: 0.85em;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    }
    .gleap-agent-reply-bubble pre {
      background-color: #1f2937;
      color: #f9fafb;
      padding: 12px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 8px 0;
      font-size: 0.85em;
    }
    .gleap-agent-reply-bubble pre code {
      background: none;
      padding: 0;
      border-radius: 0;
      color: inherit;
    }
    .gleap-agent-reply-bubble a { color: #485BFF; text-decoration: none; }
    .gleap-agent-reply-bubble a:hover { text-decoration: underline; }
    .gleap-agent-reply-bubble h1, .gleap-agent-reply-bubble h2, .gleap-agent-reply-bubble h3,
    .gleap-agent-reply-bubble h4, .gleap-agent-reply-bubble h5, .gleap-agent-reply-bubble h6 {
      margin: 12px 0 6px 0;
      font-weight: 600;
    }
    .gleap-agent-reply-bubble h1 { font-size: 1.3em; }
    .gleap-agent-reply-bubble h2 { font-size: 1.15em; }
    .gleap-agent-reply-bubble h3 { font-size: 1.05em; }
    .gleap-agent-reply-bubble ul, .gleap-agent-reply-bubble ol { margin: 6px 0; padding-left: 20px; }
    .gleap-agent-reply-bubble li { margin: 2px 0; }

    /* --- User Bubble --- */
    gleap-agent-user-bubble {
      display: flex;
      justify-content: flex-end;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .gleap-agent-user-bubble {
      background-color: #485BFF;
      color: #ffffff;
      padding: 10px 14px;
      border-radius: 16px 16px 6px 16px;
      max-width: 85%;
      word-wrap: break-word;
      overflow-wrap: break-word;
      font-size: 0.9rem;
      line-height: 1.5;
      white-space: pre-wrap;
    }

    /* --- Typing Indicator --- */
    gleap-agent-typing-indicator {
      display: block;
    }
    .gleap-agent-typing-indicator {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 10px 14px;
      background-color: #f3f4f6;
      border-radius: 16px 16px 16px 6px;
    }
    .gleap-agent-typing-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background-color: #9ca3af;
      animation: gleap-agent-typing-bounce 1.4s ease-in-out infinite;
    }
    .gleap-agent-typing-dot:nth-child(1) { animation-delay: 0s; }
    .gleap-agent-typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .gleap-agent-typing-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes gleap-agent-typing-bounce {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-4px); opacity: 1; }
    }

    /* --- Send Button --- */
    gleap-agent-send-button {
      display: inline-flex;
    }
    .gleap-agent-send-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      border: none;
      background-color: #485BFF;
      color: #ffffff;
      cursor: pointer;
      padding: 0;
      transition: opacity 0.15s ease, background-color 0.15s ease;
      flex-shrink: 0;
    }
    .gleap-agent-send-btn:hover:not(:disabled) { opacity: 0.85; }
    .gleap-agent-send-btn:active:not(:disabled) { transform: scale(0.92); }
    .gleap-agent-send-btn:disabled {
      background-color: #d1d5db;
      color: #9ca3af;
      cursor: not-allowed;
    }
    .gleap-agent-send-btn svg { width: 18px; height: 18px; }

    /* --- Input --- */
    gleap-agent-input {
      display: block;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .gleap-agent-input-box {
      position: relative;
      border: 1px solid #e5e7eb;
      border-radius: 22px;
      background: #ffffff;
      transition: border-color 0.15s ease;
    }
    .gleap-agent-input-box:focus-within {
      border-color: #485BFF;
    }
    .gleap-agent-editable {
      outline: none;
      color: #1f2937;
      font-size: 0.9rem;
      font-family: inherit;
      line-height: 1.5;
      min-height: 24px;
      max-height: 160px;
      overflow-y: auto;
      padding: 10px 48px 10px 16px;
      word-wrap: break-word;
      overflow-wrap: break-word;
      white-space: pre-wrap;
    }
    .gleap-agent-editable::-webkit-scrollbar { width: 4px; }
    .gleap-agent-editable::-webkit-scrollbar-thumb {
      background-color: rgba(0,0,0,0.12);
      border-radius: 2px;
    }
    .gleap-agent-editable:empty::before {
      content: attr(data-placeholder);
      color: #9ca3af;
      pointer-events: none;
    }
    .gleap-agent-editable[contenteditable="false"] {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .gleap-agent-input-send {
      position: absolute;
      bottom: 6px;
      right: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: none;
      background-color: #485BFF;
      color: #ffffff;
      cursor: pointer;
      padding: 0;
      transition: opacity 0.15s ease, background-color 0.15s ease, transform 0.1s ease;
      flex-shrink: 0;
    }
    .gleap-agent-input-send:hover:not(:disabled) { opacity: 0.85; }
    .gleap-agent-input-send:active:not(:disabled) { transform: scale(0.92); }
    .gleap-agent-input-send:disabled {
      background-color: #d1d5db;
      color: #9ca3af;
      cursor: not-allowed;
    }
    .gleap-agent-input-send svg { width: 16px; height: 16px; }

    /* --- Message List --- */
    gleap-agent-message-list {
      display: block;
      flex: 1;
      min-height: 0;
    }
    .gleap-agent-message-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      overflow-y: auto;
      height: 100%;
      padding: 16px;
      box-sizing: border-box;
    }
    .gleap-agent-message-list::-webkit-scrollbar { width: 6px; }
    .gleap-agent-message-list::-webkit-scrollbar-track { background: transparent; }
    .gleap-agent-message-list::-webkit-scrollbar-thumb {
      background-color: rgba(0,0,0,0.15);
      border-radius: 3px;
    }

    /* --- Conversation (preset) --- */
    gleap-agent-conversation {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 300px;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
    }
    .gleap-agent-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-height: 0;
    }
    .gleap-agent-messages::-webkit-scrollbar { width: 6px; }
    .gleap-agent-messages::-webkit-scrollbar-track { background: transparent; }
    .gleap-agent-messages::-webkit-scrollbar-thumb {
      background-color: rgba(0,0,0,0.15);
      border-radius: 3px;
    }
    .gleap-agent-empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      min-height: 120px;
      padding: 32px 16px;
    }
    .gleap-agent-empty-icon {
      color: #6b7280;
      opacity: 0.4;
    }
    .gleap-agent-empty-text {
      font-weight: 500;
      color: #9ca3af;
      text-align: center;
      max-width: 240px;
      line-height: 1.4;
    }
    .gleap-agent-error-msg {
      align-self: center;
      color: #ef4444;
      font-size: 0.85rem;
      padding: 6px 12px;
      background-color: #fef2f2;
      border-radius: 8px;
    }
    .gleap-agent-input-wrapper {
      padding: 12px 0px;
      border-top: 1px solid #e5e7eb;
      flex-shrink: 0;
    }
  `;
  document.head.appendChild(style);
};
