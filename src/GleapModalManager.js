import Gleap, { GleapConfigManager, GleapFrameManager } from './Gleap';
import { bootstrapGleapFrame } from './GleapHelper';

export default class GleapModalManager {
  modalUrl = 'https://outboundmedia.gleap.io/modal';
  modalContainer = null;
  modalData = null;
  modalBackdropClickListener = null;
  modalResizeListener = null;
  lastSentMaxHeight = 0;
  disabled = false;
  // singleton
  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new GleapModalManager();
    }
    return this.instance;
  }

  constructor() {
    this._listenForMessages();
  }

  setModalUrl(url) {
    this.modalUrl = url;
  }

  // How tall the card may be. Must stay in step with the `max-height: 90vh` on
  // `.gleap-modal` in UI.js: that rule plus `overflow: hidden` clips the iframe,
  // and the card's footer with it, on viewports the content doesn't know about.
  // documentElement.clientHeight is the same box `vh` resolves against, and the
  // floor keeps us at or under the CSS cap rather than a sub-pixel over it.
  _maxModalHeight() {
    const viewportHeight = document.documentElement?.clientHeight || window.innerHeight || 0;
    return Math.floor(viewportHeight * 0.9);
  }

  disable() {
    this.disabled = true;
    this.hideModal();
  }

  _listenForMessages() {
    // With about:blank bootstrapping (see _injectModalUI), event.origin is the parent's origin,
    // not modalUrl. We accept both: source-based match for the bootstrapped iframe, origin-based
    // match for the legacy / fallback case.
    window.addEventListener('message', (event) => {
      const modalFrame = this.modalContainer
        ? this.modalContainer.querySelector('.gleap-modal-frame')
        : null;
      const sourceMatches = modalFrame && event.source === modalFrame.contentWindow;
      const originMatches = this.modalUrl?.includes(event.origin);
      if (!sourceMatches && !originMatches) {
        return;
      }

      try {
        const data = JSON.parse(event.data);

        if (data?.type !== 'MODAL') {
          return;
        }

        if (data.name === 'modal-loaded' && this.modalData) {
          const flowConfig = GleapConfigManager.getInstance().getFlowConfig();
          const primaryColor = flowConfig.color ? flowConfig.color : '#485BFF';
          const backgroundColor = flowConfig.backgroundColor ? flowConfig.backgroundColor : '#FFFFFF';

          this.lastSentMaxHeight = this._maxModalHeight();

          this._postMessage({
            name: 'modal-data',
            data: {
              ...this.modalData,
              primaryColor: primaryColor,
              backgroundColor: backgroundColor,
              // Tell the card its bounds so it scrolls its own content instead of
              // reporting a height we'd silently clip.
              maxHeight: this.lastSentMaxHeight,
            },
          });
        }
        if (data.name === 'modal-height') {
          const height = data?.data?.height;
          if (height) {
            // Set the height of the modal iframe
            const iframe = this.modalContainer.querySelector('.gleap-modal-frame');
            if (iframe) {
              iframe.style.height = `${height}px`;
            }
          }
        }
        if (data.name === 'modal-data-set') {
          // TODO: Implement
        }
        if (data.name === 'modal-close') {
          this.hideModal();
        }
        if (data.name === 'start-conversation') {
          Gleap.startBot(data.data?.botId);
        }
        if (data.name === 'start-custom-action') {
          Gleap.triggerCustomAction(data.data?.action);
        }
        if (data.name === 'start-product-tour') {
          Gleap.startProductTour(data.data?.tourId, true);
        }
        if (data.name === 'open-url') {
          const url = data.data;
          const newTab = data.newTab ? true : false;
          GleapFrameManager.getInstance().urlHandler(url, newTab);
        }
        if (data.name === 'show-form') {
          Gleap.startFeedbackFlow(data.data?.formId);
        }
        if (data.name === 'show-survey') {
          Gleap.showSurvey(data.data?.formId, data.data?.surveyFormat);
        }
        if (data.name === 'show-news-article') {
          Gleap.openNewsArticle(data.data?.articleId);
        }
        if (data.name === 'show-help-article') {
          Gleap.openHelpCenterArticle(data.data?.articleId);
        }
        if (data.name === 'show-checklist') {
          Gleap.startChecklist(data.data?.checklistId, true, data.data?.sharedKey);
        }
      } catch (exp) {}
    });
  }

  _injectModalUI(modalData) {
    if (!document.body) return false;

    if (this.disabled) {
      return false;
    }

    if (this.modalContainer) {
      this.hideModal();
    }

    this.modalData = modalData;

    // The iframe is created without a src so it becomes an about:blank document (same-origin
    // to parent). bootstrapGleapFrame then injects the actual modal content via doc.write.
    // See bootstrapGleapFrame in GleapHelper for the why and the fallback behavior.
    const wrapper = document.createElement('div');
    wrapper.className = 'gleap-modal-wrapper';
    wrapper.innerHTML = `
      <div class="gleap-modal-backdrop"></div>
      <div class="gleap-modal">
        <iframe
          class="gleap-modal-frame"
          scrolling="no"
          title="Gleap Modal"
          role="dialog"
          frameborder="0"
          allow="autoplay; encrypted-media; fullscreen; microphone *;"
        ></iframe>
      </div>
    `;
    document.body.appendChild(wrapper);
    this.modalContainer = wrapper;

    const iframe = wrapper.querySelector('.gleap-modal-frame');
    if (iframe) {
      bootstrapGleapFrame(iframe, this.modalUrl);
    }

    // Add on backdrop click listener
    this.modalBackdropClickListener = this.modalContainer
      .querySelector('.gleap-modal-backdrop')
      .addEventListener('click', () => {
        if (this.modalData?.showCloseButton ?? true) {
          this.hideModal();
        }
      });

    // Resizing the window (or rotating a phone) changes the card's bounds.
    window.addEventListener('resize', (this.modalResizeListener = this._handleResize.bind(this)));

    // lock background scroll
    document.body.classList.add('gleap-modal-open');
  }

  _handleResize() {
    const maxHeight = this._maxModalHeight();
    if (maxHeight <= 0 || maxHeight === this.lastSentMaxHeight) {
      return;
    }
    this.lastSentMaxHeight = maxHeight;

    this._postMessage({
      name: 'modal-max-height',
      data: { maxHeight },
    });
  }

  _postMessage(message) {
    try {
      const frame = this.modalContainer.querySelector('.gleap-modal-frame');
      if (frame?.contentWindow) {
        // targetOrigin '*' because with about:blank bootstrapping the iframe inherits the
        // parent's origin, not modalUrl. Using modalUrl here would cause the browser to drop
        // the message. '*' is safe here: the message is intended for the iframe we created,
        // and only contains non-sensitive UI config.
        frame.contentWindow.postMessage(JSON.stringify({ ...message, type: 'modal' }), '*');
      }
    } catch (err) {}
  }

  showModal(modalData) {
    if (modalData && modalData.config) {
      this._injectModalUI(modalData.config);
    }
  }

  hideModal() {
    if (!this.modalContainer) return;

    if (this.modalBackdropClickListener) {
      this.modalContainer
        .querySelector('.gleap-modal-backdrop')
        .removeEventListener('click', this.modalBackdropClickListener);
    }

    if (this.modalResizeListener) {
      window.removeEventListener('resize', this.modalResizeListener);
      this.modalResizeListener = null;
    }
    this.lastSentMaxHeight = 0;

    document.body.removeChild(this.modalContainer);
    this.modalContainer = null;
    document.body.classList.remove('gleap-modal-open');
  }
}
