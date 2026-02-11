import Gleap, { GleapConfigManager, GleapFrameManager } from './Gleap';

export default class GleapModalManager {
  modalUrl = 'https://outboundmedia.gleap.io/modal';
  modalContainer = null;
  modalData = null;
  modalBackdropClickListener = null;
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

  disable() {
    this.disabled = true;
    this.hideModal();
  }

  _listenForMessages() {
    window.addEventListener('message', (event) => {
      if (!this.modalUrl?.includes(event.origin)) {
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

          this._postMessage({
            name: 'modal-data',
            data: {
              ...this.modalData,
              primaryColor: primaryColor,
              backgroundColor: backgroundColor,
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

    const wrapper = document.createElement('div');
    wrapper.className = 'gleap-modal-wrapper';
    wrapper.innerHTML = `
      <div class="gleap-modal-backdrop"></div>
      <div class="gleap-modal">
        <iframe
          src="${this.modalUrl}"
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

    // Add on backdrop click listener
    this.modalBackdropClickListener = this.modalContainer
      .querySelector('.gleap-modal-backdrop')
      .addEventListener('click', () => {
        if (this.modalData?.showCloseButton ?? true) {
          this.hideModal();
        }
      });

    // lock background scroll
    document.body.classList.add('gleap-modal-open');
  }

  _postMessage(message) {
    try {
      const frame = this.modalContainer.querySelector('.gleap-modal-frame');
      if (frame?.contentWindow) {
        frame.contentWindow.postMessage(JSON.stringify({ ...message, type: 'modal' }), this.modalUrl);
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

    document.body.removeChild(this.modalContainer);
    this.modalContainer = null;
    document.body.classList.remove('gleap-modal-open');
  }
}
