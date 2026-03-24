/**
 * Agent Profile Image Web Component (no Shadow DOM)
 * @element gleap-agent-profile-image
 */
import { injectAgentStyles } from './GleapAgentStyles';

export const GleapAgentProfileImageComponent = (typeof customElements !== 'undefined' && typeof HTMLElement !== 'undefined') ? class GleapAgentProfileImage extends HTMLElement {
  static get observedAttributes() { return ['color', 'icon', 'image-url', 'size', 'dark']; }
  connectedCallback() { injectAgentStyles(); this.render(); }
  attributeChangedCallback(name, o, n) { if (o !== n) this.render(); }

  get sizeValue() { return parseInt(this.getAttribute('size'), 10) || 36; }

  render() {
    const color = this.getAttribute('color') || '#485BFF';
    const icon = this.getAttribute('icon') || '';
    const imageUrl = this.getAttribute('image-url') || '';
    const size = this.sizeValue;
    const fontSize = Math.round(size * 0.45);

    if (imageUrl) {
      this.innerHTML = `<img class="gleap-agent-avatar-img" src="${imageUrl}" alt="Agent avatar" width="${size}" height="${size}" />`;
    } else {
      this.innerHTML = `<div class="gleap-agent-avatar-icon" style="width:${size}px;height:${size}px;font-size:${fontSize}px;background-color:${color};">${icon || '🤖'}</div>`;
    }
  }
} : null;

export const registerGleapAgentProfileImage = () => {
  if (GleapAgentProfileImageComponent && typeof customElements !== 'undefined' && !customElements.get('gleap-agent-profile-image')) {
    customElements.define('gleap-agent-profile-image', GleapAgentProfileImageComponent);
  }
};
