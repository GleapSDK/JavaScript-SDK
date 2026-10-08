import Gleap, { GleapFrameManager } from './Gleap';
import { isOutboundActionBlocked } from './GleapCaptureSettings';
import { bootstrapGleapFrame } from './GleapHelper';

const clipsOverflow = (style) => {
  if (!style) {
    return false;
  }

  return [style.overflowX || style.overflow, style.overflowY || style.overflow].some(
    (value) => !!value && value !== 'visible'
  );
};

/**
 * Whether body clips content outside its padding box. Body's overflow only clips when the root
 * element's overflow is not `visible`; otherwise it is propagated to the viewport.
 */
export const bodyClipsInlineBanner = (htmlStyle, bodyStyle) => clipsOverflow(htmlStyle) && clipsOverflow(bodyStyle);

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
          } else {
            this.applyInlineClipLayout();
          }
        }
        if (data.name === 'banner-close') {
          this.removeBannerUI();
        }
        // While the widget is hidden for a capture (screenshot or recording), actions open nothing.
        if (isOutboundActionBlocked(data.name)) {
          return;
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
    document.body.classList.remove('gleap-b-clip');
  }

  /**
   * The inline banner sits in body's top margin, above body's padding box. On pages whose
   * body clips its overflow (app shells with `html, body { overflow: hidden }`) that area is
   * cut off, so only an empty strip shows. There the banner moves into body's top padding,
   * which body does not clip, on top of the page's own padding.
   */
  applyInlineClipLayout() {
    // Already applied: body's padding now includes the banner, so it is no longer the page's own.
    if (document.body.classList.contains('gleap-b-clip')) {
      return;
    }

    try {
      const bodyStyle = window.getComputedStyle(document.body);
      if (!bodyClipsInlineBanner(window.getComputedStyle(document.documentElement), bodyStyle)) {
        return;
      }

      document.documentElement.style.setProperty('--gleap-b-body-padding-top', bodyStyle.paddingTop || '0px');
      document.body.classList.add('gleap-b-clip');
    } catch (exp) {}
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
