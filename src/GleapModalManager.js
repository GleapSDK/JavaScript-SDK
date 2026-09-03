import Gleap, { GleapConfigManager, GleapFrameManager } from './Gleap';
import { bootstrapGleapFrame } from './GleapHelper';

// How long the card renderer gets to announce itself (`modal-loaded`) before we assume the
// bootstrapped frame is dead and load it directly — and, after a second period, give up.
export const MODAL_LOAD_TIMEOUT_MS = 8000;

export default class GleapModalManager {
  modalUrl = 'https://outboundmedia.gleap.io/modal';
  modalContainer = null;
  modalData = null;
  modalBackdropClickListener = null;
  modalResizeListener = null;
  modalLoadTimeout = null;
  modalLoaded = false;
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

        if (data.name === 'modal-loaded') {
          this.modalLoaded = true;
          this._clearLoadWatchdog();
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
            // First height = the card has real content. Only now is it safe to show.
            this._revealModal();
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
    // --loading keeps the card invisible until the frame reports a height (see _revealModal):
    // until then the iframe is an empty 150px box, i.e. a blank white card.
    wrapper.className = 'gleap-modal-wrapper gleap-modal-wrapper--loading';
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
      this._armLoadWatchdog(iframe);
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

  _revealModal() {
    if (this.modalContainer) {
      this.modalContainer.classList.remove('gleap-modal-wrapper--loading');
    }
  }

  // The about:blank bootstrap can fail without any signal reaching us — the host page's CSP
  // blocking the card bundle inside the inherited frame, the router not matching, a desktop
  // shell origin (see bootstrapGleapFrame) — and then `modal-loaded` simply never arrives.
  // Stage 1: load the card URL directly into the frame (the legacy cross-origin path, which
  // none of those failure modes affect). Stage 2: still nothing — take the card down rather
  // than leave a blank overlay the user has to dismiss.
  _armLoadWatchdog(iframe) {
    this._clearLoadWatchdog();
    this.modalLoaded = false;

    this.modalLoadTimeout = setTimeout(() => {
      this.modalLoadTimeout = null;
      if (this.modalLoaded || !this.modalContainer) {
        return;
      }

      try {
        // The bootstrap may already have fallen back to a (slow) direct load; don't restart it.
        if (iframe.getAttribute('src') !== this.modalUrl) {
          iframe.src = this.modalUrl;
        }
      } catch (e) {}

      this.modalLoadTimeout = setTimeout(() => {
        this.modalLoadTimeout = null;
        if (this.modalLoaded || !this.modalContainer) {
          return;
        }
        try {
          console.warn(
            'Gleap: the info card (' +
              this.modalUrl +
              ') did not load and was closed. If this keeps happening, check that your ' +
              "Content-Security-Policy allows frame-src, script-src and style-src for https://*.gleap.io."
          );
        } catch (e) {}
        this.hideModal();
      }, MODAL_LOAD_TIMEOUT_MS);
    }, MODAL_LOAD_TIMEOUT_MS);
  }

  _clearLoadWatchdog() {
    if (this.modalLoadTimeout) {
      clearTimeout(this.modalLoadTimeout);
      this.modalLoadTimeout = null;
    }
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
    this._clearLoadWatchdog();
    this.modalLoaded = false;
    this.lastSentMaxHeight = 0;

    document.body.removeChild(this.modalContainer);
    this.modalContainer = null;
    document.body.classList.remove('gleap-modal-open');
  }
}
