import { GleapConsoleLogManager, GleapFrameManager, handleGleapLink } from './Gleap';
import { getDOMElementDescription } from './GleapHelper';

export default class GleapClickListener {
  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new GleapClickListener();
    }
    return this.instance;
  }

  start() {
    document.addEventListener('click', (e) => {
      if (!e.target) {
        return;
      }

      if (e.target.tagName === 'A' && e.target.protocol === 'gleap:') {
        e.preventDefault();

        const href = e.target.href;
        handleGleapLink(href);
      }

      if (!GleapFrameManager.getInstance().isOpened()) {
        GleapConsoleLogManager.getInstance().addLog(getDOMElementDescription(e.target), 'CLICK');
      }
    });
  }
}
