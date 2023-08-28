import Gleap from "./Gleap";

export default class GleapBannerManager {
  bannerUrl = "https://outboundmedia.gleap.io";
  bannerContainer = null;
  bannerData = null;

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
    window.addEventListener("message", (event) => {
      if (event.origin !== this.bannerUrl) {
        return;
      }

      try {
        const data = JSON.parse(event.data);
        if (data.name === "banner-loaded" && this.bannerData) {
          this.sendMessage({
            name: "banner-data",
            data: this.bannerData,
          });
        }
        if (data.name === "banner-height") {
          document.documentElement.style.setProperty('--gleap-margin-top', data.data.height + 'px');
        }
        if (data.name === "banner-data-set") {
          document.body.classList.add("gleap-b-shown");

          if (this.bannerData?.format === "floating") {
            document.body.classList.add("gleap-b-f");
          }
        }
        if (data.name === "banner-close") {
          this.removeBannerUI();
        }
        if (data.name === "start-conversation") {
          Gleap.startBot(data.data?.botId);
        }
        if (data.name === "start-custom-action") {
          Gleap.triggerCustomAction(data.data?.action);
        }
        if (data.name === "show-form") {
          Gleap.startFeedbackFlow(data.data?.formId);
        }
        if (data.name === "show-survey") {
          Gleap.showSurvey(data.data?.formId, data.data?.surveyFormat);
        }
        if (data.name === "show-news-article") {
          Gleap.openNewsArticle(data.data?.articleId);
        }
        if (data.name === "show-help-article") {
          Gleap.openHelpCenterArticle(data.data?.articleId);
        }
      } catch (exp) { }
    });
  }

  removeBannerUI() {
    if (this.bannerContainer) {
      document.body.removeChild(this.bannerContainer);
      this.bannerContainer = null;
    }
    
    document.body.classList.remove("gleap-b-shown");
    document.body.classList.remove("gleap-b-f");
  }

  /**
   * Injects the feedback button into the current DOM.
   */
  injectBannerUI(bannerData) {
    if (this.bannerContainer || !document.body) {
      return false;
    }

    this.bannerData = bannerData;

    var elem = document.createElement("div");
    elem.className = "gleap-b";
    elem.innerHTML = `<iframe src="${this.bannerUrl}" class="gleap-b-frame" scrolling="no" title="Gleap Banner" role="dialog" frameborder="0"></iframe>`;
    document.body.appendChild(elem);
    this.bannerContainer = elem;
  }

  sendMessage(data) {
    try {
      const gleapBFrame = document.querySelector(".gleap-b-frame");
      if (gleapBFrame && gleapBFrame.contentWindow) {
        gleapBFrame.contentWindow.postMessage(JSON.stringify({
          ...data,
          type: "banner"
        }), "*");
      }
    } catch (e) { }
  }

  showBanner(bannerData) {
    this.injectBannerUI(bannerData);
  }
}
