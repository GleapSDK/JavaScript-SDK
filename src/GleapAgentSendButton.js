/**
 * Agent Send Button Web Component (no Shadow DOM)
 * @element gleap-agent-send-button
 */
import { injectAgentStyles } from './GleapAgentStyles';

export const GleapAgentSendButtonComponent = (typeof customElements !== 'undefined' && typeof HTMLElement !== 'undefined') ? class GleapAgentSendButton extends HTMLElement {
  _boundClick = this._handleClick.bind(this);

  static get observedAttributes() { return ['disabled', 'dark']; }
  connectedCallback() { injectAgentStyles(); this.render(); }
  disconnectedCallback() {
    const btn = this.querySelector('.gleap-agent-send-btn');
    if (btn) btn.removeEventListener('click', this._boundClick);
  }
  attributeChangedCallback(name, o, n) { if (o !== n) this.render(); }

  get isDisabled() { return this.hasAttribute('disabled'); }

  _handleClick(e) {
    e.stopPropagation();
    if (this.isDisabled) return;
    this.dispatchEvent(new CustomEvent('gleap-agent-send', { bubbles: true, composed: true, detail: {} }));
  }

  render() {
    this.innerHTML = `
      <button class="gleap-agent-send-btn" ${this.isDisabled ? 'disabled' : ''} aria-label="Send message">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 4L12 20M12 4L6 10M12 4L18 10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    `;
    const btn = this.querySelector('.gleap-agent-send-btn');
    if (btn) btn.addEventListener('click', this._boundClick);
  }
} : null;

export const registerGleapAgentSendButton = () => {
  if (GleapAgentSendButtonComponent && typeof customElements !== 'undefined' && !customElements.get('gleap-agent-send-button')) {
    customElements.define('gleap-agent-send-button', GleapAgentSendButtonComponent);
  }
};
