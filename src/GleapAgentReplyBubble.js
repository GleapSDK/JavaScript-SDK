/**
 * Agent Reply Bubble Web Component (no Shadow DOM)
 * @element gleap-agent-reply-bubble
 */
import { renderMarkdown } from './GleapAgentMarkdown';
import { injectAgentStyles } from './GleapAgentStyles';

export const GleapAgentReplyBubbleComponent = (typeof customElements !== 'undefined' && typeof HTMLElement !== 'undefined') ? class GleapAgentReplyBubble extends HTMLElement {
  static get observedAttributes() { return ['content', 'dark']; }
  connectedCallback() { injectAgentStyles(); this.render(); }
  attributeChangedCallback(name, o, n) { if (o !== n) this.render(); }

  render() {
    const content = this.getAttribute('content') || '';
    this.innerHTML = `<div class="gleap-agent-reply-bubble">${renderMarkdown(content)}</div>`;
  }
} : null;

export const registerGleapAgentReplyBubble = () => {
  if (GleapAgentReplyBubbleComponent && typeof customElements !== 'undefined' && !customElements.get('gleap-agent-reply-bubble')) {
    customElements.define('gleap-agent-reply-bubble', GleapAgentReplyBubbleComponent);
  }
};
