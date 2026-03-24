/**
 * Agent User Bubble Web Component (no Shadow DOM)
 * @element gleap-agent-user-bubble
 */
import { injectAgentStyles } from './GleapAgentStyles';

export const GleapAgentUserBubbleComponent = (typeof customElements !== 'undefined' && typeof HTMLElement !== 'undefined') ? class GleapAgentUserBubble extends HTMLElement {
  static get observedAttributes() { return ['content', 'dark']; }
  connectedCallback() { injectAgentStyles(); this.render(); }
  attributeChangedCallback(name, o, n) { if (o !== n) this.render(); }

  render() {
    const content = this.getAttribute('content') || '';
    const escaped = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    this.innerHTML = `<div class="gleap-agent-user-bubble">${escaped}</div>`;
  }
} : null;

export const registerGleapAgentUserBubble = () => {
  if (GleapAgentUserBubbleComponent && typeof customElements !== 'undefined' && !customElements.get('gleap-agent-user-bubble')) {
    customElements.define('gleap-agent-user-bubble', GleapAgentUserBubbleComponent);
  }
};
