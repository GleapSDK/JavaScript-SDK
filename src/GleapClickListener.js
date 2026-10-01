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

      // Resolve the closest anchor, as the click target can be a child node
      // of the link (bold text, a span, an icon, ...).
      const anchor = e.target.closest ? e.target.closest('a') : null;
      if (anchor && anchor.protocol === 'gleap:') {
        e.preventDefault();

        handleGleapLink(anchor.href);
      }

      // While a capture request hides the widget the customer uses the page, so clicks count; the
      // capture bar's own clicks don't.
      const frameManager = GleapFrameManager.getInstance();
      const captureHidden = typeof frameManager.isCaptureHidden === 'function' && frameManager.isCaptureHidden();
      if (!frameManager.isOpened() || captureHidden) {
        const ownCaptureUi = e.target.closest ? e.target.closest('.gleap-capture-root') : null;
        if (!ownCaptureUi) {
          GleapConsoleLogManager.getInstance().addLog(getDOMElementDescription(e.target), 'CLICK');
        }
      }
    });
  }
}
