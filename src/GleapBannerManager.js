import Gleap, { GleapFrameManager } from './Gleap';
import { bootstrapGleapFrame } from './GleapHelper';

export default class GleapBannerManager {
  bannerUrl = 'https://outboundmedia.gleap.io';
  bannerContainer = null;
  bannerData = null;
  disabled = false;

  // GleapBannerManager singleton
  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new GleapBannerManager();
    }
    return this.instance;
  }

  constructor() {
    this.startCommunication();
  }

  setBannerUrl(url) {
    this.bannerUrl = url;
  }

  startCommunication() {
    // Add window message listener.
    // With about:blank bootstrapping (see injectBannerUI), event.origin is the parent's origin
    // — not the bannerUrl. We accept both: source-based match for the bootstrapped iframe,
    // origin-based match for the legacy / fallback case.
    window.addEventListener('message', (event) => {
      const bannerFrame = this.bannerContainer
        ? this.bannerContainer.querySelector('.gleap-b-frame')
        : null;
      const sourceMatches = bannerFrame && event.source === bannerFrame.contentWindow;
      const originMatches = this.bannerUrl?.includes(event.origin);
      if (!sourceMatches && !originMatches) {
        return;
      }

      try {
        const data = JSON.parse(event.data);

        if (data?.type !== 'BANNER') {
          return;
        }

        if (data.name === 'banner-loaded' && this.bannerData) {
          this.sendMessage({
            name: 'banner-data',
            data: this.bannerData,
          });
        }
        if (data.name === 'banner-height') {
          document.documentElement.style.setProperty('--gleap-margin-top', data.data.height + 'px');
        }
        if (data.name === 'banner-data-set') {
          document.body.classList.add('gleap-b-shown');

          if (this.bannerData?.format === 'floating') {
            document.body.classList.add('gleap-b-f');
          }
        }
        if (data.name === 'banner-close') {
          this.removeBannerUI();
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

  removeBannerUI() {
    if (this.bannerContainer) {
      document.body.removeChild(this.bannerContainer);
      this.bannerContainer = null;
    }

    document.body.classList.remove('gleap-b-shown');
    document.body.classList.remove('gleap-b-f');
  }

  disable() {
    this.disabled = true;
    this.removeBannerUI();
  }

  /**
   * Injects the feedback button into the current DOM.
   */
  injectBannerUI(bannerData) {
    if (!document.body) {
      return false;
    }

    if (this.disabled) {
      return false;
    }

    if (this.bannerContainer) {
      this.removeBannerUI();
    }

    this.bannerData = bannerData;

    // Create the iframe without a src so it becomes an about:blank document (same-origin to parent).
    // Then bootstrap the actual banner content via doc.write. See bootstrapGleapFrame in GleapHelper.
    // If the bootstrap fails (e.g. CORS not enabled on the bannerUrl), the helper falls back to
    // setting iframe.src directly, preserving the original behavior.
    var elem = document.createElement('div');
    elem.className = 'gleap-b';
    elem.innerHTML = `<iframe class="gleap-b-frame" scrolling="no" title="Gleap Banner" role="dialog" frameborder="0"></iframe>`;
    document.body.appendChild(elem);
    this.bannerContainer = elem;

    const iframe = elem.querySelector('.gleap-b-frame');
    if (iframe) {
      bootstrapGleapFrame(iframe, this.bannerUrl);
    }
  }

  sendMessage(data) {
    try {
      const gleapBFrame = document.querySelector('.gleap-b-frame');
      if (gleapBFrame && gleapBFrame.contentWindow) {
        gleapBFrame.contentWindow.postMessage(
          JSON.stringify({
            ...data,
            type: 'banner',
          }),
          '*'
        );
      }
    } catch (e) {}
  }

  showBanner(bannerData) {
    this.injectBannerUI(bannerData);
  }
}
