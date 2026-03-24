/**
 * Agent Message List Web Component (no Shadow DOM)
 * @element gleap-agent-message-list
 */
import { injectAgentStyles } from './GleapAgentStyles';

export const GleapAgentMessageListComponent = (typeof customElements !== 'undefined' && typeof HTMLElement !== 'undefined') ? class GleapAgentMessageList extends HTMLElement {
  _observer = null;

  static get observedAttributes() { return ['dark']; }

  connectedCallback() {
    injectAgentStyles();
    if (!this.querySelector('.gleap-agent-message-list')) {
      // Wrap existing children in the scrollable container
      const wrapper = document.createElement('div');
      wrapper.className = 'gleap-agent-message-list';
      while (this.firstChild) {
        wrapper.appendChild(this.firstChild);
      }
      this.appendChild(wrapper);
    }
    this._setupAutoScroll();
  }

  disconnectedCallback() {
    if (this._observer) { this._observer.disconnect(); this._observer = null; }
  }

  scrollToBottom() {
    const container = this.querySelector('.gleap-agent-message-list');
    if (container) {
      requestAnimationFrame(() => { container.scrollTop = container.scrollHeight; });
    }
  }

  _setupAutoScroll() {
    if (this._observer) this._observer.disconnect();
    const container = this.querySelector('.gleap-agent-message-list');
    if (container) {
      this._observer = new MutationObserver(() => { this.scrollToBottom(); });
      this._observer.observe(container, { childList: true, subtree: false });
    }
  }
} : null;

export const registerGleapAgentMessageList = () => {
  if (GleapAgentMessageListComponent && typeof customElements !== 'undefined' && !customElements.get('gleap-agent-message-list')) {
    customElements.define('gleap-agent-message-list', GleapAgentMessageListComponent);
  }
};
