/**
 * Agent Typing Indicator Web Component (no Shadow DOM)
 * @element gleap-agent-typing-indicator
 */
import { injectAgentStyles } from './GleapAgentStyles';

export const GleapAgentTypingIndicatorComponent = (typeof customElements !== 'undefined' && typeof HTMLElement !== 'undefined') ? class GleapAgentTypingIndicator extends HTMLElement {
  static get observedAttributes() { return ['active', 'dark']; }
  connectedCallback() { injectAgentStyles(); this.render(); }
  attributeChangedCallback(name, o, n) { if (o !== n) this.render(); }

  get isActive() { return this.getAttribute('active') === 'true'; }

  render() {
    if (!this.isActive) {
      this.innerHTML = '';
      return;
    }
    this.innerHTML = `
      <div class="gleap-agent-typing-indicator">
        <span class="gleap-agent-typing-dot"></span>
        <span class="gleap-agent-typing-dot"></span>
        <span class="gleap-agent-typing-dot"></span>
      </div>
    `;
  }
} : null;

export const registerGleapAgentTypingIndicator = () => {
  if (GleapAgentTypingIndicatorComponent && typeof customElements !== 'undefined' && !customElements.get('gleap-agent-typing-indicator')) {
    customElements.define('gleap-agent-typing-indicator', GleapAgentTypingIndicatorComponent);
  }
};
