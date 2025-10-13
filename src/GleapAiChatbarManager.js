import {
  GleapFrameManager,
} from "./Gleap";

export default class GleapAiChatbarManager {
  aiUIContainer = null;
  shadowRoot = null;
  innerContainer = null;
  quickActionsContainer = null;
  quickActions = [];
  animationTimeouts = new Set();
  inputText = '';
  inputElement = null;
  sendButton = null;
  manuallyHidden = false;
  placeholder = 'Ask me anything...';
  onMessageSend = null;
  isHidden = true;
  config = null;

  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new GleapAiChatbarManager();
    }
    return this.instance;
  }

  constructor() {
    // Bind methods to ensure proper context
    this.show = this.show.bind(this);
    this.hide = this.hide.bind(this);
    this.destroy = this.destroy.bind(this);
  }

  setConfig(config) {
    this.config = config;

    if (config.placeholder) {
      this.setPlaceholder(config.placeholder);
    }

    if (config.quickActions) {
      this.setQuickActions(config.quickActions);
    }

    if (config.enabled) {
      this.show();
    }
  }

  updateUIVisibility() {
    if (!this.config?.enabled) {
      return;
    }

    const isOpened = GleapFrameManager.getInstance().isOpened();

    console.log("updateUIVisibility", isOpened);

    if (isOpened) {
      this.hide();
    } else {
      this.show();
    }
  }

  setPlaceholder(placeholder) {
    this.placeholder = placeholder;

    if (this.inputElement) {
      this.inputElement.placeholder = placeholder;
    }
  }

  setOnMessageSend(callback) {
    this.onMessageSend = callback;
  }

  arraysEqual(arr1, arr2) {
    // Quick length check
    if (arr1.length !== arr2.length) {
      return false;
    }

    // Compare each element
    for (let i = 0; i < arr1.length; i++) {
      if (arr1[i] !== arr2[i]) {
        return false;
      }
    }

    return true;
  }

  show() {
    if (!this.config?.enabled) {
      return;
    }

    if (this.manuallyHidden) {
      return;
    }

    if (!this.aiUIContainer) {
      return;
    }

    if (!this.isHidden) {
      return;
    }

    this.isHidden = false;
    this.aiUIContainer.style.display = "block";
    this.aiUIContainer.setAttribute('aria-hidden', 'false');
    // Remove fade-out from inner container and reset animation
    if (this.innerContainer) {
      this.innerContainer.classList.remove('fade-out');
    }
  }

  hide() {
    if (this.isHidden) {
      return;
    }

    if (!this.aiUIContainer) {
      return;
    }

    this.isHidden = true;

    // Fade out the inner container
    if (this.innerContainer) {
      this.innerContainer.classList.add('fade-out');
    }

    // Hide the whole component after animation
    const timeoutId = setTimeout(() => {
      if (this.aiUIContainer) {
        this.aiUIContainer.style.display = "none";
        this.aiUIContainer.setAttribute('aria-hidden', 'true');
      }
      this.animationTimeouts.delete(timeoutId);
    }, 300);

    this.animationTimeouts.add(timeoutId);
  }

  setQuickActions(quickActions) {
    if (!Array.isArray(quickActions)) {
      return;
    }

    // Check if they changed using array comparison
    if (this.arraysEqual(this.quickActions, quickActions)) {
      return;
    }

    this.quickActions = quickActions;
    this.updateQuickActions();
  }

  updateQuickActions() {
    if (!this.quickActionsContainer) return;

    // Clear existing content
    this.quickActionsContainer.innerHTML = '';

    // Add new actions with staggered animation
    this.quickActions.slice(0, 2).forEach((action, index) => {
      if (typeof action !== 'string' || !action.trim()) {
        console.warn('GleapAiChatbarManager: Invalid quick action:', action);
        return;
      }

      const actionElement = document.createElement('div');
      actionElement.className = 'gleap-ai-ui-quick-action';
      actionElement.textContent = action.trim();
      actionElement.setAttribute('role', 'button');
      actionElement.setAttribute('tabindex', '0');
      actionElement.setAttribute('aria-label', `Quick action: ${action.trim()}`);

      // Add click and keyboard support
      actionElement.addEventListener('click', () => {
        this.sendMessage(action.trim());
      });

      actionElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.sendMessage(action.trim());
        }
      });

      this.quickActionsContainer.appendChild(actionElement);

      // Trigger animation with delay
      const timeoutId = setTimeout(() => {
        if (actionElement.parentNode) {
          actionElement.classList.add('animate-in');
        }
        this.animationTimeouts.delete(timeoutId);
      }, index * 150 + 500);

      this.animationTimeouts.add(timeoutId);
    });
  }

  injectAIUI() {
    if (this.aiUIContainer) {
      return;
    }

    if (!document.body) {
      console.error('GleapAiChatbarManager: Document body not available');
      return;
    }

    // Create the host element (this will be in the main document)
    const elem = document.createElement("div");
    elem.className = "gleap-ai-ui-widget";
    elem.setAttribute('role', 'dialog');
    elem.setAttribute('aria-label', 'AI Assistant');
    elem.setAttribute('aria-hidden', 'true');
    document.body.appendChild(elem);
    this.aiUIContainer = elem;

    // Create shadow DOM on the host element
    this.shadowRoot = this.aiUIContainer.attachShadow({ mode: 'open' });

    // Add styles to shadow DOM
    this.addStylesToShadow();

    // Create and add HTML content directly to shadow DOM
    this.createUIInShadow();

    // Update the UI visibility
    this.updateUIVisibility();
  }

  addStylesToShadow() {
    const style = document.createElement('style');
    style.textContent = `
      .gleap-font, .gleap-font * {
        font-style: normal;
        font-variant-caps: normal;
        font-variant-ligatures: normal;
        font-variant-numeric: normal;
        font-variant-east-asian: normal;
        font-weight: normal;
        font-stretch: normal;
        font-size: 100%;
        line-height: 1;
        font-family: system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
      }

      .gleap-ai-ui-container {
        position: fixed;
        bottom: 20px;
        left: 50%;
        z-index: 999999;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        opacity: 0;
        transform: translateX(-50%) translateY(20px);
        animation: fadeUpInContainer 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      }
      
      .gleap-ai-ui-quick-actions {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin-bottom: 12px;
        opacity: 0;
        transform: translateY(10px);
        animation: fadeUpIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.5s forwards;
      }
      
      .gleap-ai-ui-quick-action {
        background: #fff;
        color: #000;
        padding: 8px 12px;
        border-radius: 16px;
        border-bottom-right-radius: 4px;
        font-size: 13px;
        cursor: pointer;
        border: 1px solid #00000022;
        transition: background-color 0.2s, transform 0.2s;
        box-shadow: rgba(149, 157, 165, 0.2) 0px 8px 24px;
        opacity: 0;
        transform: translateY(15px) scale(0.95);
      }
      
      .gleap-ai-ui-quick-action.animate-in {
        animation: fadeUpInAction 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      }
      
      .gleap-ai-ui-quick-action:nth-child(1).animate-in {
        animation-delay: 0.5s;
      }
      
      .gleap-ai-ui-quick-action:nth-child(2).animate-in {
        animation-delay: 0.65s;
      }
      
      .gleap-ai-ui-quick-action:hover {
        background: #000;
        color: #fff;
        border: 1px solid #000000;
        transform: translateY(-2px) scale(1.02);
      }
      
      .gleap-ai-ui-input-container {
        position: relative;
        width: auto;
        min-width: min(280px, calc(100vw - 40px));
        margin: 0 auto;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        opacity: 0;
        transform: translateY(15px);
        animation: fadeUpIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.45s forwards;
      }
      
      .gleap-ai-ui-input-container:focus-within,
      .gleap-ai-ui-container.active .gleap-ai-ui-input-container {
        min-width: 430px;
      }
      
      /* Mobile responsive styles */
      @media (max-width: 768px) {
        .gleap-ai-ui-input-container {
          min-width: 200px;
          max-width: calc(100vw - 40px);
          margin: 0 20px;
        }
        
        .gleap-ai-ui-input-container:focus-within {
          min-width: calc(100vw - 40px);
        }
      }
      
      @media (max-width: 480px) {
        .gleap-ai-ui-input-container {
          min-width: 180px;
          max-width: calc(100vw - 32px);
          margin: 0 16px;
        }
        
        .gleap-ai-ui-input-container:focus-within {
          min-width: calc(100vw - 32px);
        }
      }
      
      .animated-gradient-border-wrapper {
        position: absolute;
        overflow: hidden;
        border-radius: 50px;
        transition: all 0.2s ease-in-out;
        left: -2px;
        top: -2px;
        right: -2px;
        bottom: -2px;
      }
      
      .animated-gradient-border-wrapper-glow {
        position: absolute;
        overflow: hidden;
        border-radius: 50px;
        filter: blur(15px);
        left: -2px;
        top: -2px;
        right: -2px;
        bottom: -2px;
      }
      
      .group:hover .animated-gradient-border-wrapper,
      .group:focus-within .animated-gradient-border-wrapper {
        left: -4px;
        top: -4px;
        right: -4px;
        bottom: -4px;
      }
      
      .group:hover .animated-gradient-border-wrapper-glow,
      .group:focus-within .animated-gradient-border-wrapper-glow {
        left: -4px;
        top: -4px;
        right: -4px;
        bottom: -4px;
      }
      
      .animated-gradient-border-wrapper:before,
      .animated-gradient-border-wrapper-glow:before {
        content: "";
        position: absolute;
        top: 50%;
        left: 50%;
        width: 99999px;
        height: 99999px;
        background-repeat: no-repeat;
        background-position: 0 0;
        opacity: 0.4;
        background-image: conic-gradient(
          #0000,
          #b6e0dc,
          #eaef8c,
          #fdc19e,
          #f29be5,
          #c4aeff,
          #0000 95%
        );
        filter: blur(20px);
        transform: translate(-50%, -50%) rotate(0deg);
        transition: opacity 0.5s ease-in-out;
        animation: border-spin 4s linear infinite;
      }
      
      .group:hover .animated-gradient-border-wrapper-glow:before {
        opacity: 1;
      }
      
      .bg-gradient-blur {
        position: relative;
        background: white;
        border-radius: 42px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        overflow: hidden;
        z-index: 1;
      }
      
      .bg-gradient-blur:before {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: inherit;
        will-change: filter;
        filter: blur(14px);
        opacity: 0.2;
        background-image: radial-gradient(
          circle at left top,
          #b6e0dc,
          #eaef8c,
          #fdc19e,
          #f29be5,
          #c4aeff
        );
        background-size: 200% 200%;
        animation: gradient-shift 10s linear infinite;
        z-index: -1;
      }
      
      .gleap-ai-ui-input {
        position: relative;
        z-index: 1;
        width: 100%;
        height: 42px;
        padding: 0px;
        background: #fff;
        border-radius: 42px;
      }

      .gleap-ai-ui-input-content {
        display: flex;
        align-items: center;
        padding: 0px;
        height: 100%;
      }
      
      .gleap-ai-ui-input input {
        flex-grow: 1;
        height: 100%;
        padding-left: 16px;
        padding-right: 8px;
        border: none;
        background: transparent;
        font-size: 16px;
        line-height: 24px;
        font-weight: 400;
        color: #000;
        outline: none;
        box-sizing: border-box;
      }

      .gleap-ai-ui-input-send-button {
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: #efefef;
        margin-left: 0px;
        margin-right: 4px;
      }

      .gleap-ai-ui-input-send-button svg {
        width: 18px;
        height: 18px;
        flex-shrink: 0;
        color: #666;
        pointer-events: none;
        z-index: 2;
        transition: color 0.2s ease;
      }

      .gleap-ai-ui-container.active .gleap-ai-ui-input-send-button {
        background: #000;
        transition: background-color 0.2s ease;
      }

      .gleap-ai-ui-container.active .gleap-ai-ui-input-send-button svg {
        fill: #fff;
      }
      
      .gleap-ai-ui-input input::placeholder {
        color: rgba(0, 0, 0, 0.6);
        transition: color 0.2s ease;
      }
      
      @keyframes gradient-shift {
        0% {
          background-position: 0% 50%;
        }
        50% {
          background-position: 100% 50%;
        }
        100% {
          background-position: 0% 50%;
        }
      }
      
      @keyframes border-spin {
        0% {
          transform: translate(-50%, -50%) rotate(0deg);
        }
        100% {
          transform: translate(-50%, -50%) rotate(-360deg);
        }
      }
      
      @keyframes fadeUpIn {
        0% {
          opacity: 0;
          transform: translateY(20px) scale(0.95);
        }
        100% {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      @keyframes fadeUpInAction {
        0% {
          opacity: 0;
          transform: translateY(15px) scale(0.95);
        }
        100% {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      @keyframes fadeUpInContainer {
        0% {
          opacity: 0;
          transform: translateX(-50%) translateY(20px);
        }
        100% {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }
      
      @keyframes fadeOutDownContainer {
        0% {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
        100% {
          opacity: 0;
          transform: translateX(-50%) translateY(20px);
        }
      }
      
      .gleap-ai-ui-container.fade-out {
        animation: fadeOutDownContainer 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards !important;
      }      
    `;
    this.shadowRoot.appendChild(style);
  }

  createUIInShadow() {
    // Create the main container div inside shadow DOM
    this.innerContainer = document.createElement("div");
    this.innerContainer.className = "gleap-ai-ui-container";

    // Create the HTML structure inside shadow DOM
    this.innerContainer.innerHTML = `
      <div class="gleap-ai-ui-quick-actions"></div>
      <div class="gleap-ai-ui-input-container">
        <div class="relative group" style="--border-width: 2px; --border-width-hover: 4px;">
          <div class="animated-gradient-border-wrapper"></div>
          <div class="animated-gradient-border-wrapper animated-gradient-border-wrapper-glow"></div>
          <div class="bg-gradient-blur">
            <div class="gleap-ai-ui-input">
              <div class="gleap-ai-ui-input-content">
                <input name="AI question" type="text" placeholder="${this.placeholder}" />
                <div class="gleap-ai-ui-input-send-button">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M342.6 81.4C330.1 68.9 309.8 68.9 297.3 81.4L137.3 241.4C124.8 253.9 124.8 274.2 137.3 286.7C149.8 299.2 170.1 299.2 182.6 286.7L288 181.3L288 552C288 569.7 302.3 584 320 584C337.7 584 352 569.7 352 552L352 181.3L457.4 286.7C469.9 299.2 490.2 299.2 502.7 286.7C515.2 274.2 515.2 253.9 502.7 241.4L342.7 81.4z"/></svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Append the container directly to shadow DOM
    this.shadowRoot.appendChild(this.innerContainer);

    // Get the quick actions container
    this.quickActionsContainer = this.shadowRoot.querySelector(".gleap-ai-ui-quick-actions");

    // Get input and send button elements
    this.inputElement = this.shadowRoot.querySelector("input");
    this.sendButton = this.shadowRoot.querySelector(".gleap-ai-ui-input-send-button");

    // Add input event listener
    this.setupInputListener();

    // Update the quick actions
    this.updateQuickActions();
  }

  setupInputListener() {
    if (!this.inputElement || !this.sendButton) {
      return;
    }

    this.inputElement.addEventListener('input', (e) => {
      this.inputText = e.target.value.trim();
      this.updateSendButtonState();
    });

    // Add Enter key listener for sending message
    this.inputElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this.inputText.length > 0) {
        e.preventDefault();
        this.sendMessage(this.inputText);
      }
    });

    // Add click listener for send button
    this.sendButton.addEventListener('click', () => {
      if (this.inputText.length > 0) {
        this.sendMessage(this.inputText);
      }
    });
  }

  updateSendButtonState() {
    if (!this.sendButton || !this.innerContainer) {
      return;
    }

    if (this.inputText.length > 0) {
      this.innerContainer.classList.add('active');
    } else {
      this.innerContainer.classList.remove('active');
    }
  }

  sendMessage(question) {
    if (!question || question.trim().length === 0) {
      return;
    }

    // Call the callback if it exists
    if (this.onMessageSend && typeof this.onMessageSend === 'function') {
      this.onMessageSend(question.trim());
    }

    // Reset the input text
    this.inputText = '';
    if (this.inputElement) {
      this.inputElement.value = '';
    }
    this.updateSendButtonState();
  }

  destroy() {
    // Clear all pending timeouts
    this.animationTimeouts.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    this.animationTimeouts.clear();

    // Remove DOM elements
    if (this.aiUIContainer) {
      this.aiUIContainer.remove();
      this.aiUIContainer = null;
    }

    // Clear references
    this.shadowRoot = null;
    this.innerContainer = null;
    this.quickActionsContainer = null;
    this.quickActions = [];
    this.inputElement = null;
    this.sendButton = null;
    this.inputText = '';
    this.onMessageSend = null;

    // Reset singleton instance
    GleapAiChatbarManager.instance = null;
  }
}
