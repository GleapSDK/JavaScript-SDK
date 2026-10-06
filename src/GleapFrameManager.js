import Gleap, {
  GleapAudioManager,
  GleapBannerManager,
  GleapCaptureManager,
  GleapConfigManager,
  GleapConsoleLogManager,
  GleapCustomActionManager,
  GleapCustomDataManager,
  GleapEventManager,
  GleapFeedback,
  GleapFeedbackButtonManager,
  GleapMarkerManager,
  GleapMetaDataManager,
  GleapNetworkIntercepter,
  GleapNotificationManager,
  GleapSession,
  GleapStreamedEvent,
  GleapTagManager,
  GleapTranslationManager,
} from './Gleap';
import GleapAgentToolManager from './GleapAgentToolManager';
import { getCaptureCapabilities } from './GleapCaptureSettings';
import { bootstrapGleapFrame, loadFromGleapCache, runFunctionWhenDomIsReady, saveToGleapCache } from './GleapHelper';
import { widgetLoaderMarkup, widgetMaxHeight } from './UI';

export default class GleapFrameManager {
  frameUrl = 'https://messenger-app.gleap.io';
  gleapFrameContainer = null;
  gleapFrame = null;
  comReady = false;
  injectedFrame = false;
  widgetOpened = false;
  listeners = [];
  appMode = 'widget';
  markerManager = undefined;
  escListener = undefined;
  frameHeight = 0;
  sendingFeedback = false;
  queue = [];
  // The end user's expand/collapse choice (undefined = not read from the cache yet).
  widgetExpanded = undefined;
  appliedWidgetExpanded = false;
  lastWidgetSizeUpdate = null;
  // Hidden while the customer answers a capture request (see setCaptureHidden).
  captureHidden = false;
  // Where the messenger frame is mounted: null = document.body, else the inline survey container.
  frameHost = null;
  // Card and page surveys stay invisible until the messenger reports their height (no tall blank flash).
  surveyAwaitingHeight = false;
  surveyRevealTimeout = null;
  // The messenger fell back to a legacy (pre Surveys 2.0) survey: use the old survey chrome.
  surveyLegacy = false;
  urlHandler = function (url, newTab) {
    if (url && url.length > 0) {
      if (newTab) {
        const newWindow = window.open(url, '_blank');
        if (newWindow) {
          newWindow.focus();
        }
      } else {
        window.location.href = url;
      }
    }
  };

  // GleapFrameManager singleton
  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new GleapFrameManager();
    }
    return this.instance;
  }

  constructor() {
    this.startCommunication();
    if (typeof window !== 'undefined') {
      function appHeight() {
        try {
          const doc = document.documentElement;
          doc.style.setProperty('--glvh', window.innerHeight * 0.01 + 'px');
        } catch (e) {}
      }

      try {
        window.addEventListener('resize', appHeight);
        window.addEventListener('resize', () => this.handleViewportResize());
        appHeight();
      } catch (e) {}
    }
  }

  setUrlHandler(handler) {
    this.urlHandler = handler;
  }

  isSurvey() {
    return (
      this.appMode === 'survey' ||
      this.appMode === 'survey_full' ||
      this.appMode === 'survey_web' ||
      this.appMode === 'survey_page'
    );
  }

  isFullSurvey() {
    return this.appMode === 'survey_full' || this.appMode === 'survey_web';
  }

  // Legacy full-screen surveys keep the old centred card.
  isLegacyFullSurvey() {
    return this.surveyLegacy && this.isFullSurvey();
  }

  // Card and page surveys (and legacy full-screen ones) size their frame to the survey (height-update).
  isAutoHeightSurvey() {
    return this.appMode === 'survey' || this.appMode === 'survey_page' || this.isLegacyFullSurvey();
  }

  setAppMode(appMode) {
    this.appMode = appMode;
    // A new survey starts as Surveys 2.0 until the messenger says otherwise (survey-legacy).
    this.surveyLegacy = false;
    this.updateFrameStyle();

    // Wait for the survey's height before showing a card/page survey in a frame that has none yet.
    this.surveyAwaitingHeight = this.isAutoHeightSurvey() && (!this.comReady || !this.frameHeight);
    this.applyInnerSize();

    // Lay the hidden frame out (invisibly) so the messenger can measure the survey right away.
    const container = this.gleapFrameContainer;
    if (this.surveyAwaitingHeight && container && container.classList.contains('gleap-frame-container--hidden')) {
      container.classList.add('gleap-frame-container--measuring');
      container.classList.remove('gleap-frame-container--hidden');
    } else if (!this.surveyAwaitingHeight && container && container.classList.contains('gleap-frame-container--measuring')) {
      // Switched to a mode that doesn't wait (widget, full screen): back to the regular hidden state.
      container.classList.remove('gleap-frame-container--measuring');
      if (!this.widgetOpened) {
        container.classList.add('gleap-frame-container--hidden');
      }
      if (this.surveyRevealTimeout) {
        clearTimeout(this.surveyRevealTimeout);
        this.surveyRevealTimeout = null;
      }
    }

    this.sendWidgetSizeUpdate();
    if (this.isSurvey()) {
      this.sendSafeAreaInsets();
    }
  }

  /**
   * Mounts the messenger frame in `host` (an inline survey page) or in document.body (null).
   * Moving an iframe reloads its document, so a frame mounted elsewhere is replaced by a fresh one;
   * queued messages (start-survey) are delivered to it once it pings.
   */
  setFrameHost(host) {
    const target = host && host.nodeType === 1 ? host : null;
    this.frameHost = target;

    const container = this.gleapFrameContainer;
    if (!container || typeof document === 'undefined') {
      return;
    }
    const desiredParent = target || document.body;
    if (container.parentNode === desiredParent) {
      return;
    }

    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }
    this.unregisterEscListener();
    this.destroy();
    this.comReady = false;
    this.frameHeight = 0;
    this.lastWidgetSizeUpdate = null;
  }

  // Sizes the frame's inner container for the current mode.
  applyInnerSize() {
    const innerContainer = this.gleapFrameContainer
      ? this.gleapFrameContainer.querySelector('.gleap-frame-container-inner')
      : null;
    if (!innerContainer) {
      return;
    }

    if (this.appMode === 'survey_page') {
      // Inline: the frame is exactly as tall as the survey.
      innerContainer.style.maxHeight = 'none';
      innerContainer.style.height = this.frameHeight > 0 ? `${this.frameHeight}px` : '';
      return;
    }

    innerContainer.style.height = '';
    if (this.appMode === 'survey' || this.isLegacyFullSurvey()) {
      innerContainer.style.maxHeight = this.frameHeight > 0 ? `${this.frameHeight}px` : '';
    } else if (this.isFullSurvey()) {
      // Full screen: the messenger fills the viewport and draws the background itself.
      innerContainer.style.maxHeight = 'none';
    } else {
      innerContainer.style.maxHeight = `${widgetMaxHeight}px`;
    }
  }

  /**
   * The page's safe-area insets (notch, home indicator) in px. env() always resolves to 0 inside the
   * messenger iframe, so the full-screen survey gets them from here.
   */
  getSafeAreaInsets() {
    const insets = { top: 0, right: 0, bottom: 0, left: 0 };
    try {
      if (typeof document === 'undefined' || !document.body || typeof window.getComputedStyle !== 'function') {
        return insets;
      }
      const probe = document.createElement('div');
      probe.style.position = 'fixed';
      probe.style.top = '0';
      probe.style.left = '0';
      probe.style.width = '0';
      probe.style.height = '0';
      probe.style.visibility = 'hidden';
      probe.style.pointerEvents = 'none';
      probe.style.paddingTop = 'env(safe-area-inset-top, 0px)';
      probe.style.paddingRight = 'env(safe-area-inset-right, 0px)';
      probe.style.paddingBottom = 'env(safe-area-inset-bottom, 0px)';
      probe.style.paddingLeft = 'env(safe-area-inset-left, 0px)';
      document.body.appendChild(probe);
      const style = window.getComputedStyle(probe);
      insets.top = parseFloat(style.paddingTop) || 0;
      insets.right = parseFloat(style.paddingRight) || 0;
      insets.bottom = parseFloat(style.paddingBottom) || 0;
      insets.left = parseFloat(style.paddingLeft) || 0;
      probe.remove();
    } catch (e) {}
    return insets;
  }

  sendSafeAreaInsets() {
    if (!this.comReady) {
      return;
    }
    this.sendMessage({
      name: 'survey-safe-area',
      data: this.getSafeAreaInsets(),
    });
  }

  // Shows a card/page survey that waited for its height (or gave up waiting).
  revealSurvey() {
    this.surveyAwaitingHeight = false;
    if (this.surveyRevealTimeout) {
      clearTimeout(this.surveyRevealTimeout);
      this.surveyRevealTimeout = null;
    }
    const container = this.gleapFrameContainer;
    if (container) {
      container.classList.remove('gleap-frame-container--measuring');
    }
  }

  /**
   * The v2 survey wasn't found and the messenger runs the legacy survey flow: switch to the
   * pre-Surveys 2.0 chrome for the current format.
   */
  setSurveyLegacy() {
    if (!this.isSurvey() || this.surveyLegacy) {
      return;
    }
    this.surveyLegacy = true;
    this.updateFrameStyle();
    this.applyInnerSize();
  }

  // The widget is full screen at <= 450px and the expanded CSS only applies from
  // 451px (see UI.js). Test the same query as that CSS so a fractional (zoomed)
  // viewport between the two never counts as expandable.
  isMobileViewport() {
    try {
      return typeof window.matchMedia === 'function' && !window.matchMedia('(min-width: 451px)').matches;
    } catch (e) {
      return false;
    }
  }

  canExpandWidget() {
    const flowConfig = GleapConfigManager.getInstance().getFlowConfig();
    if (flowConfig && flowConfig.hideExpandButton) {
      return false;
    }
    return !this.isSurvey() && !this.isMobileViewport();
  }

  getWidgetExpandedPreference() {
    if (typeof this.widgetExpanded === 'undefined') {
      this.widgetExpanded = loadFromGleapCache('widget-expanded') === true;
    }
    return this.widgetExpanded;
  }

  isWidgetExpanded() {
    return this.getWidgetExpandedPreference() && this.canExpandWidget();
  }

  setWidgetExpanded(expanded) {
    this.widgetExpanded = expanded ? true : false;
    try {
      saveToGleapCache('widget-expanded', this.widgetExpanded ? true : null);
    } catch (e) {}
    this.updateFrameStyle();
    // Always answer, so a refused request (e.g. on mobile) re-syncs the messenger's button.
    this.sendWidgetSizeUpdate(true);
  }

  // Tells the messenger whether to show the expand/collapse button and in which state.
  sendWidgetSizeUpdate(force = false) {
    if (!this.comReady) {
      return;
    }

    const data = {
      expandable: this.canExpandWidget(),
      expanded: this.isWidgetExpanded(),
    };
    const last = this.lastWidgetSizeUpdate;
    if (!force && last && last.expandable === data.expandable && last.expanded === data.expanded) {
      return;
    }

    this.lastWidgetSizeUpdate = data;
    this.sendMessage({
      name: 'widget-size-update',
      data,
    });
  }

  handleViewportResize() {
    if (this.isWidgetExpanded() !== this.appliedWidgetExpanded) {
      this.updateFrameStyle();
    }
    this.sendWidgetSizeUpdate();
    if (this.widgetOpened && this.isFullSurvey()) {
      this.sendSafeAreaInsets();
    }
  }

  registerEscListener() {
    // While a capture request hides the widget, Escape belongs to the page and the capture bar.
    // An inline survey page can't be closed.
    if (this.escListener || this.captureHidden || this.appMode === 'survey_page') {
      return;
    }

    this.escListener = (evt) => {
      evt = evt || window.event;
      if (evt.key === 'Escape') {
        // If an image lightbox is open, close it first instead of hiding the widget.
        // Only on a subsequent Escape press (no lightbox left) the widget closes.
        const imageViews = document.querySelectorAll('.gleap-image-view');
        if (imageViews.length > 0) {
          imageViews[imageViews.length - 1].remove();
          return;
        }
        this.hideWidget();
      }
    };
    document.addEventListener('keydown', this.escListener);
  }

  unregisterEscListener() {
    if (this.escListener) {
      document.removeEventListener('keydown', this.escListener);
      this.escListener = null;
    }
  }

  destroy() {
    if (this.gleapFrame) {
      this.gleapFrame.remove();
    }
    if (this.gleapFrameContainer) {
      this.gleapFrameContainer.remove();
    }
    this.injectedFrame = false;
    this.widgetOpened = false;
    this.markerManager = undefined;
    if (this.surveyRevealTimeout) {
      clearTimeout(this.surveyRevealTimeout);
      this.surveyRevealTimeout = null;
    }
    this.gleapFrameContainer = null;
    this.gleapFrame = null;
    this.captureHidden = false;
    try {
      if (GleapCaptureManager) {
        GleapCaptureManager.getInstance().onWidgetDestroyed();
      }
    } catch (e) {}
  }

  /**
   * Hides the widget while the customer answers a capture request (capture bar, recording) without
   * closing it: the Messenger keeps its state and connection and gets the result when it shows again.
   * @param {boolean} hidden
   * @param {boolean} reopen When showing it again: reopen the widget if it was closed meanwhile.
   */
  setCaptureHidden(hidden, reopen = true) {
    this.captureHidden = !!hidden;
    const container = this.gleapFrameContainer;
    if (container) {
      container.classList.toggle('gleap-frame-container--capture-hidden', this.captureHidden);
    }
    if (this.captureHidden) {
      // Escape belongs to the page (and the capture bar) meanwhile.
      this.unregisterEscListener();
      this.setCaptureEditorOpen(false);
      return;
    }
    if (!container) {
      return;
    }
    if (!this.widgetOpened) {
      if (reopen) {
        this.showWidget();
      }
    } else {
      this.registerEscListener();
    }
  }

  isCaptureHidden() {
    return this.captureHidden;
  }

  /**
   * The Messenger's capture editor (annotating a screenshot) uses the whole viewport.
   */
  setCaptureEditorOpen(open) {
    if (this.gleapFrameContainer) {
      this.gleapFrameContainer.classList.toggle('gleap-frame-container--capture-editor', !!open);
    }
  }

  /**
   * Tells the Messenger what this page can capture (contract §7). Sent after every ping.
   */
  sendCaptureCapabilities() {
    if (!this.comReady) {
      return;
    }
    try {
      this.sendMessage({
        name: 'capture-capabilities',
        data: getCaptureCapabilities(),
      });
    } catch (e) {}
  }

  isOpened() {
    return this.widgetOpened || this.markerManager != null;
  }

  autoWhiteListCookieManager = () => {
    // Push in place: concat returns a new array and would leave the allowlist untouched.
    if (window && Array.isArray(window.cmp_block_ignoredomains)) {
      if (window.cmp_block_ignoredomains.indexOf('messenger-app.gleap.io') === -1) {
        window.cmp_block_ignoredomains.push('messenger-app.gleap.io');
      }
    }
  };

  injectFrame = () => {
    if (this.injectedFrame) {
      return;
    }
    this.injectedFrame = true;

    this.autoWhiteListCookieManager();

    // Inject the frame manager after it has been loaded.
    runFunctionWhenDomIsReady(() => {
      GleapConfigManager.getInstance().onConfigLoaded(() => {
        // Apply CSS.
        GleapConfigManager.getInstance().applyStylesFromConfig();

        // Inject widget HTML.
        // The iframe is created WITHOUT a src attribute so it becomes an about:blank document
        // that inherits the parent page's origin. This avoids Safari ITP throttling iframes
        // to classified tracker domains. The actual messenger app is then bootstrapped into the
        // iframe via doc.write (see bootstrapGleapFrame in GleapHelper.js). If bootstrapping
        // fails (e.g. CORS not available on the frameUrl), the helper falls back to direct
        // src loading, preserving the original behavior.
        var elem = document.createElement('div');
        // A card/page survey waiting for its height starts laid out but invisible, so the messenger can
        // measure it before it shows; everything else starts hidden.
        const startState =
          this.isAutoHeightSurvey() && this.surveyAwaitingHeight
            ? 'gleap-frame-container--measuring'
            : 'gleap-frame-container--hidden';
        elem.className = `gleap-frame-container ${startState} rr-block`;
        elem.innerHTML = `<div class="gleap-frame-container-inner">${widgetLoaderMarkup(
          GleapConfigManager.getInstance().getFlowConfig()
        )}<iframe class="gleap-frame" scrolling="yes" allow="autoplay; encrypted-media; fullscreen; microphone *; display-capture *; camera *;" frameborder="0"></iframe></div>`;
        const host = this.frameHost && document.body.contains(this.frameHost) ? this.frameHost : document.body;
        host.appendChild(elem);

        // Image-type loader: fade the background image in once it has loaded.
        // Until then (or if it fails) the plain white fallback stays.
        const loaderImage = elem.querySelector('.gleap-frame-loader-image');
        if (loaderImage) {
          const revealLoaderImage = () => {
            const wrap = elem.querySelector('.gleap-frame-loader-image-wrap');
            if (wrap) {
              wrap.classList.add('gleap-frame-loader-image-wrap--loaded');
            }
          };
          if (loaderImage.complete && loaderImage.naturalWidth > 0) {
            revealLoaderImage();
          } else {
            loaderImage.addEventListener('load', revealLoaderImage);
          }
        }

        this.gleapFrameContainer = elem;
        this.gleapFrame = document.querySelector('.gleap-frame');

        // Bootstrap the iframe content from the Gleap origin via about:blank + doc.write.
        bootstrapGleapFrame(this.gleapFrame, this.frameUrl);

        this.updateFrameStyle();

        // Show loading preview for widget app mode.
        if (this.appMode === 'widget') {
          this.showFrameContainer(true);
        }
      });
    });
  };

  showImage = (url) => {
    runFunctionWhenDomIsReady(() => {
      var elem = document.createElement('div');
      elem.className = 'gleap-image-view';
      // Make the overlay focusable so we can pull keyboard focus out of the
      // messenger iframe. Without this, Escape is handled inside the iframe and
      // closes the whole widget instead of just the image lightbox.
      elem.setAttribute('tabindex', '-1');
      elem.innerHTML = `<div class="gleap-image-view-close">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zm97.9-320l-17 17-47 47 47 47 17 17L320 353.9l-17-17-47-47-47 47-17 17L158.1 320l17-17 47-47-47-47-17-17L192 158.1l17 17 47 47 47-47 17-17L353.9 192z"/></svg>
      </div><img class="gleap-image-view-image" src="${url}" />`;
      document.body.appendChild(elem);

      const closeElement = () => {
        document.removeEventListener('keydown', keyListener, true);
        elem.remove();
      };

      // Close only the image on Escape and stop the event so neither the
      // widget's own Escape handler nor the iframe's handler closes the widget.
      // The next Escape press (no lightbox open) then closes the widget.
      const keyListener = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          closeElement();
        }
      };
      document.addEventListener('keydown', keyListener, true);

      const close = elem.querySelector('.gleap-image-view-close');
      close.addEventListener('click', () => {
        closeElement();
      });

      elem.addEventListener('click', (e) => {
        if (e.target === elem) {
          closeElement();
        }
      });

      // Move keyboard focus to the overlay (out of the messenger iframe) so the
      // Escape key is captured here and closes the image, not the widget.
      try {
        elem.focus({ preventScroll: true });
      } catch (e) {
        elem.focus();
      }
    });
  };

  updateFrameStyle = () => {
    if (!this.gleapFrameContainer) {
      return;
    }

    const surveyStyle = 'gleap-frame-container--survey';
    const extendedStyle = 'gleap-frame-container--extended';
    const surveyFullStyle = 'gleap-frame-container--survey-full';
    const surveyPageStyle = 'gleap-frame-container--survey-page';
    const surveyLegacyStyle = 'gleap-frame-container--survey-legacy';
    const classicStyle = 'gleap-frame-container--classic';
    const classicStyleLeft = 'gleap-frame-container--classic-left';
    const modernStyleLeft = 'gleap-frame-container--modern-left';
    const noButtonStyleLeft = 'gleap-frame-container--no-button';
    const expandedStyle = 'gleap-frame-container--expanded';
    const allStyles = [
      classicStyle,
      classicStyleLeft,
      expandedStyle,
      extendedStyle,
      modernStyleLeft,
      noButtonStyleLeft,
      surveyStyle,
      surveyFullStyle,
      surveyPageStyle,
      surveyLegacyStyle,
    ];
    for (let i = 0; i < allStyles.length; i++) {
      this.gleapFrameContainer.classList.remove(allStyles[i]);
    }

    var styleToApply = undefined;
    const flowConfig = GleapConfigManager.getInstance().getFlowConfig();
    if (
      flowConfig.feedbackButtonPosition === GleapFeedbackButtonManager.FEEDBACK_BUTTON_CLASSIC ||
      flowConfig.feedbackButtonPosition === GleapFeedbackButtonManager.FEEDBACK_BUTTON_CLASSIC_BOTTOM
    ) {
      styleToApply = classicStyle;
    }
    if (flowConfig.feedbackButtonPosition === GleapFeedbackButtonManager.FEEDBACK_BUTTON_CLASSIC_LEFT) {
      styleToApply = classicStyleLeft;
    }
    if (flowConfig.feedbackButtonPosition === GleapFeedbackButtonManager.FEEDBACK_BUTTON_BOTTOM_LEFT) {
      styleToApply = modernStyleLeft;
    }
    if (GleapFeedbackButtonManager.getInstance().buttonHidden === null) {
      if (flowConfig.feedbackButtonPosition === GleapFeedbackButtonManager.FEEDBACK_BUTTON_NONE) {
        styleToApply = noButtonStyleLeft;
      }
    } else {
      if (GleapFeedbackButtonManager.getInstance().buttonHidden) {
        styleToApply = noButtonStyleLeft;
      }
    }
    if (styleToApply) {
      this.gleapFrameContainer.classList.add(styleToApply);
    }

    if (this.appMode === 'survey') {
      this.gleapFrameContainer.classList.add(surveyStyle);
    }
    if (this.isFullSurvey()) {
      this.gleapFrameContainer.classList.add(surveyFullStyle);
    }
    if (this.appMode === 'survey_page') {
      this.gleapFrameContainer.classList.add(surveyPageStyle);
    }
    if (this.surveyLegacy && this.isSurvey()) {
      this.gleapFrameContainer.classList.add(surveyLegacyStyle);
    }
    if (this.appMode === 'extended') {
      this.gleapFrameContainer.classList.add(extendedStyle);
    }

    // The end user's choice, independent of the page-driven extended mode.
    this.appliedWidgetExpanded = this.isWidgetExpanded();
    if (this.appliedWidgetExpanded) {
      this.gleapFrameContainer.classList.add(expandedStyle);
    }

    this.gleapFrameContainer.setAttribute('dir', GleapTranslationManager.getInstance().isRTLLayout ? 'rtl' : 'ltr');
  };

  showFrameContainer(showLoader) {
    if (!this.gleapFrameContainer) {
      return;
    }

    const loadingClass = 'gleap-frame-container--loading';
    if (this.gleapFrameContainer?.classList) {
      // Cancel any in-flight close animation so re-opening is instant.
      if (this.closeTimeout) {
        clearTimeout(this.closeTimeout);
        this.closeTimeout = null;
      }
      this.gleapFrameContainer.classList.remove('gleap-frame-container--closing');
      if (this.isAutoHeightSurvey() && this.surveyAwaitingHeight) {
        this.gleapFrameContainer.classList.add('gleap-frame-container--measuring');
        if (!this.surveyRevealTimeout) {
          this.surveyRevealTimeout = setTimeout(() => {
            this.surveyRevealTimeout = null;
            this.revealSurvey();
          }, 1200);
        }
      } else {
        this.gleapFrameContainer.classList.remove('gleap-frame-container--measuring');
      }
      this.gleapFrameContainer.classList.remove('gleap-frame-container--hidden');
      if (showLoader) {
        this.gleapFrameContainer.classList.add(loadingClass);
      } else {
        this.gleapFrameContainer.classList.remove(loadingClass);
      }

      setTimeout(() => {
        this.gleapFrameContainer?.classList.add('gleap-frame-container--animate');
      }, 500);
    }

    this.widgetOpened = true;
    this.updateUI();
  }

  runWidgetShouldOpenCallback() {
    if (!this.gleapFrameContainer) {
      return;
    }

    this.workThroughQueue();

    Gleap.getInstance().setGlobalDataItem('snapshotPosition', {
      x: window.scrollX,
      y: window.scrollY,
    });

    this.showFrameContainer(false);
    this.updateWidgetStatus();

    GleapEventManager.notifyEvent('open');
    this.registerEscListener();

    // Full-screen surveys take the keyboard (digits, letters, Enter) right away. The
    // messenger can't pull focus into its cross-origin frame without a user gesture
    // (a survey shown by a trigger has none), so the host page focuses the frame.
    if (this.isFullSurvey() && !this.isLegacyFullSurvey()) {
      try {
        const frame = this.gleapFrameContainer.querySelector('.gleap-frame');
        if (frame) frame.focus({ preventScroll: true });
      } catch (e) {}
    }
  }

  updateUI() {
    // Clear notifications only when not opening a survey.
    GleapNotificationManager.getInstance().clearAllNotifications(this.isSurvey());

    GleapFeedbackButtonManager.getInstance().updateNotificationBadge(0);
    GleapFeedbackButtonManager.getInstance().updateFeedbackButtonState();
  }

  showWidget() {
    setTimeout(() => {
      if (this.gleapFrameContainer) {
        this.runWidgetShouldOpenCallback();
      } else {
        GleapFrameManager.getInstance().injectFrame();
      }
      this.updateUI();
    }, 0);
  }

  updateWidgetStatus() {
    this.sendMessage({
      name: 'widget-status-update',
      data: {
        isWidgetOpen: this.widgetOpened,
      },
    });
  }

  hideMarkerManager() {
    if (this.markerManager) {
      this.markerManager.clear();
      this.markerManager = null;
    }
  }

  hideWidget(resetRoutes = false) {
    // The standalone survey page (legacy) and inline survey pages can't be closed.
    if (this.appMode === 'survey_web' || this.appMode === 'survey_page') {
      return;
    }

    this.hideMarkerManager();
    this.setCaptureEditorOpen(false);
    if (this.gleapFrameContainer) {
      const container = this.gleapFrameContainer;
      container.classList.remove('gleap-frame-container--animate');

      if (this.closeTimeout) {
        clearTimeout(this.closeTimeout);
        this.closeTimeout = null;
      }

      if (this.surveyRevealTimeout) {
        clearTimeout(this.surveyRevealTimeout);
        this.surveyRevealTimeout = null;
      }

      if (container.classList.contains('gleap-frame-container--measuring')) {
        // Never shown: nothing to animate.
        container.classList.remove('gleap-frame-container--measuring');
        container.classList.add('gleap-frame-container--hidden');
      } else {
        // Play the close animation, then remove from view once it finishes.
        container.classList.add('gleap-frame-container--closing');
        this.closeTimeout = setTimeout(() => {
          container.classList.add('gleap-frame-container--hidden');
          container.classList.remove('gleap-frame-container--closing');
          this.closeTimeout = null;
        }, 260);
      }
    }
    if (resetRoutes) {
      this.sendMessage({
        name: 'reset-routes',
        data: {},
      });
    }
    this.widgetOpened = false;
    this.updateWidgetStatus();
    GleapFeedbackButtonManager.getInstance().updateFeedbackButtonState();
    GleapEventManager.notifyEvent('close');
    GleapNotificationManager.getInstance().reloadNotificationsFromCache();

    this.unregisterEscListener();

    if (typeof window !== 'undefined' && typeof window.focus !== 'undefined') {
      window.focus();
    }
  }

  sendMessage(data, queue = false) {
    try {
      this.gleapFrame = document.querySelector('.gleap-frame');
      if (this.comReady && this.gleapFrame && this.gleapFrame.contentWindow) {
        this.gleapFrame.contentWindow.postMessage(JSON.stringify(data), '*');
      } else {
        if (queue) {
          this.queue.push(data);
        }
      }
    } catch (e) {}
  }

  sendSessionUpdate() {
    this.sendMessage({
      name: 'session-update',
      data: {
        sessionData: GleapSession.getInstance().getSession(),
        apiUrl: GleapSession.getInstance().apiUrl,
        realtimeHost: GleapSession.getInstance().realtimeHost,
        sdkKey: GleapSession.getInstance().sdkKey,
      },
    });
  }

  sendConfigUpdate() {
    if (!this.comReady) {
      return;
    }

    this.sendMessage({
      name: 'config-update',
      data: {
        config: GleapConfigManager.getInstance().getFlowConfig(),
        aiTools: GleapAgentToolManager.getInstance().getAgentTools(),
        agentTools: GleapAgentToolManager.getInstance().getAgentTools(),
        overrideLanguage: GleapTranslationManager.getInstance().getOverrideLanguage(),
      },
    });

    this.updateFrameStyle();
    this.sendWidgetSizeUpdate(true);
  }

  showDrawingScreen(type) {
    this.hideWidget();

    // Show screen drawing.
    this.markerManager = new GleapMarkerManager(type);
    this.markerManager.show((success) => {
      if (!success) {
        this.hideMarkerManager();
      }
      this.showWidget();
    });
  }

  workThroughQueue() {
    const workQueue = [...this.queue];
    this.queue = [];
    for (let i = 0; i < workQueue.length; i++) {
      this.sendMessage(workQueue[i], true);
    }
  }

  startCommunication() {
    // Listen for messages.
    this.addMessageListener((data) => {
      if (data.name === 'ping') {
        this.comReady = true;
        this.sendConfigUpdate();
        this.sendSessionUpdate();
        this.sendCaptureCapabilities();
        this.workThroughQueue();
        setTimeout(() => {
          this.runWidgetShouldOpenCallback();
        }, 300);
      }

      if (data.name === 'play-ping') {
        GleapAudioManager.ping();
      }

      if (data.name === 'open-image') {
        this.showImage(data.data.url);
      }

      if (data.name === 'page-changed') {
        if (data.data && (data.data.name === 'newsdetails' || data.data.name === 'appextended')) {
          this.setAppMode('extended');
        } else {
          if (this.appMode === 'extended') {
            this.setAppMode('widget');
          }
        }
      }

      if (data.name === 'collect-ticket-data') {
        this.gleapFrame = document.querySelector('.gleap-frame');
        this.answerCollectTicketData(this.gleapFrame, data);
      }

      if (data.name === 'height-update') {
        const height = parseInt(data.data, 10);
        if (height > 0) {
          this.frameHeight = height;
          // Full-screen surveys fill the viewport; only card and page surveys follow the height.
          if (this.isAutoHeightSurvey()) {
            this.applyInnerSize();
            this.revealSurvey();
          }
        }
      }

      if (data.name === 'survey-legacy') {
        this.setSurveyLegacy();
      }

      // Surveys 2.0 lifecycle, reported by the messenger. (outbound-sent keeps coming as notify-event.)
      if (
        data.name === 'survey-shown' ||
        data.name === 'survey-answered' ||
        data.name === 'survey-completed' ||
        data.name === 'survey-closed'
      ) {
        GleapEventManager.notifyEvent(data.name, data.data || {});
      }

      if (data.name === 'notify-event') {
        GleapEventManager.notifyEvent(data.data.type, data.data.data);
      }

      if (data.name === 'cleanup-drawings') {
        this.hideMarkerManager();
      }

      if (data.name === 'open-url') {
        const url = data.data;
        const newTab = data.newTab ? true : false;
        this.urlHandler(url, newTab);
      }

      if (data.name === 'start-product-tour') {
        Gleap.startProductTour(data.data?.tourId, true);
      }

      if (data.name === 'run-custom-action') {
        GleapCustomActionManager.triggerCustomAction(data.data, {
          shareToken: data.shareToken,
        });
      }

      if (data.name === 'close-widget') {
        this.hideWidget();
      }

      if (data.name === 'set-widget-expanded') {
        this.setWidgetExpanded(data.data && data.data.expanded);
      }

      if (data.name === 'video-call-joined') {
        GleapFeedbackButtonManager.getInstance().showingRedDot = true;
        GleapFeedbackButtonManager.getInstance().updateRedDot(true);
      }

      if (data.name === 'video-call-left') {
        GleapFeedbackButtonManager.getInstance().showingRedDot = false;
        GleapFeedbackButtonManager.getInstance().updateRedDot(false);
      }

      if (data.name === 'tool-execution') {
        GleapEventManager.notifyEvent('tool-execution', data.data);
        GleapAgentToolManager.getInstance().triggerToolAction(data.data);
      }

      // Frontend tool execution request: run the registered handler and
      // return its result to the frame, which delivers it to the agent.
      if (data.name === 'frontend-tool-execute' && data.data) {
        GleapAgentToolManager.getInstance()
          .executeToolAction(data.data)
          .then((result) => {
            this.sendMessage({
              name: 'frontend-tool-result',
              data: result,
            });
          });
      }

      if (data.name === 'checklist-loaded') {
        const checklistData = data.data;
        GleapEventManager.notifyEvent('checklist-loaded', {
          checklistId: checklistData.id,
          outboundId: checklistData.outbound?.id,
          completedSteps: checklistData.completedSteps,
          status: checklistData.status,
          data: checklistData,
        });
      }

      if (data.name === 'checklist-step-completed') {
        const { checklistData, step, index } = data.data;
        GleapEventManager.notifyEvent('checklist-step-completed', {
          checklistId: checklistData.id,
          outboundId: checklistData.outbound?.id,
          stepId: step.id,
          stepIndex: index,
          step: step,
          completedSteps: checklistData.completedSteps,
          status: checklistData.status,
          data: checklistData,
        });
      }

      if (data.name === 'checklist-completed') {
        const checklistData = data.data;
        GleapEventManager.notifyEvent('checklist-completed', {
          checklistId: checklistData.id,
          outboundId: checklistData.outbound?.id,
          completedSteps: checklistData.completedSteps,
          status: checklistData.status,
          data: checklistData,
        });
      }

      if (data.name === 'send-feedback') {
        if (this.sendingFeedback) {
          return;
        }

        this.sendingFeedback = true;

        const formData = data.data.formData;
        const action = data.data.action;
        const outboundId = data.data.outboundId;
        const spamToken = data.data.spamToken;

        const feedback = new GleapFeedback(
          action.feedbackType,
          'MEDIUM',
          formData,
          false,
          action.excludeData,
          outboundId,
          spamToken
        );
        feedback
          .sendFeedback()
          .then((feedbackData) => {
            setTimeout(() => {
              this.sendingFeedback = false;
            }, 1000);

            this.sendMessage({
              name: 'feedback-sent',
              data: feedbackData,
            });
            GleapEventManager.notifyEvent('feedback-sent', formData);

            if (outboundId && outboundId.length > 0) {
              GleapEventManager.notifyEvent('outbound-sent', {
                outboundId: outboundId,
                outbound: action,
                formData: formData,
              });

              try {
                delete formData.reportedBy;
              } catch (e) {}
              Gleap.trackEvent(`outbound-${outboundId}-submitted`, formData);
            }
          })
          .catch((error) => {
            setTimeout(() => {
              this.sendingFeedback = false;

              this.sendMessage({
                name: 'feedback-sending-failed',
                data: 'Something went wrong, please try again.',
              });
              GleapEventManager.notifyEvent('error-while-sending');
            }, 1000);
          });
      }

      if (data.name === 'start-screen-drawing') {
        this.showDrawingScreen(data.data);
      }

      if (
        GleapCaptureManager &&
        (data.name === 'capture-start' ||
          data.name === 'capture-cancel' ||
          data.name === 'capture-editor' ||
          data.name === 'capture-done')
      ) {
        GleapCaptureManager.getInstance().handleMessengerMessage(data);
      }
    });

    // Add window message listener.
    // With about:blank bootstrapping, the iframe inherits the parent's origin, so event.origin
    // is no longer the Gleap frameUrl — it's the customer site's origin. We verify the message
    // source via event.source (iframe.contentWindow) instead. For backwards compatibility with
    // the legacy src-loaded iframe (fallback case), we also accept the original frameUrl origin.
    window.addEventListener('message', (event) => {
      const bannerManager = GleapBannerManager.getInstance();
      const bannerFrame = bannerManager.bannerContainer
        ? bannerManager.bannerContainer.querySelector('.gleap-b-frame')
        : null;

      const sourceMatchesGleapFrame = this.gleapFrame && event.source === this.gleapFrame.contentWindow;
      const sourceMatchesBannerFrame = bannerFrame && event.source === bannerFrame.contentWindow;
      const originMatchesGleapFrame = event.origin === this.frameUrl;
      const originMatchesBannerFrame = event.origin === bannerManager.bannerUrl;

      if (!sourceMatchesGleapFrame && !sourceMatchesBannerFrame && !originMatchesGleapFrame && !originMatchesBannerFrame) {
        return;
      }

      try {
        const data = JSON.parse(event.data);

        // Outbound-media iframes (banner, modal, chatbar, agent-conversation) share the
        // outboundmedia.gleap.io origin and each has its own manager. They tag messages with a
        // `type`; the messenger frame never does. Without this guard a modal/banner CTA (open-url,
        // start-product-tour, ...) is handled here AND by its own manager → the action fires twice.
        if (
          data?.type === 'MODAL' ||
          data?.type === 'BANNER' ||
          data?.type === 'CHATBAR' ||
          data?.type === 'AGENT_CONVERSATION'
        ) {
          return;
        }

        for (var i = 0; i < this.listeners.length; i++) {
          if (this.listeners[i]) {
            this.listeners[i](data);
          }
        }
      } catch (exp) {}
    });
  }

  addMessageListener(callback) {
    this.listeners.push(callback);
  }

  // Collects the ticket metadata (customData, metaData, consoleLog, networkLogs,
  // customEventLog, formData, tags) and posts the `collect-ticket-data` response to the
  // given target frame. Extracted so both the widget frame (GleapFrameManager) and the
  // AI chatbar frame (GleapAiChatbarManager) collect identical metadata. Posts bare
  // (Messenger-protocol) messages directly to targetFrame.contentWindow.
  answerCollectTicketData(targetFrame, requestData) {
    var ticketData = {
      customData: GleapCustomDataManager.getInstance().getCustomData(),
      metaData: GleapMetaDataManager.getInstance().getMetaData(),
      consoleLog: GleapConsoleLogManager.getInstance().getLogs(),
      networkLogs: GleapNetworkIntercepter.getInstance().getRequests(),
      customEventLog: GleapStreamedEvent.getInstance().getEventArray(),
      formData: GleapCustomDataManager.getInstance().getTicketAttributes(),
    };

    // Add tags
    const tags = GleapTagManager.getInstance().getTags();
    if (tags && tags.length > 0) {
      ticketData.tags = tags;
    }

    try {
      if (targetFrame && targetFrame.contentWindow) {
        targetFrame.contentWindow.postMessage(
          JSON.stringify({
            name: 'collect-ticket-data',
            data: ticketData,
          }),
          '*'
        );
      }
    } catch (e) {}
  }
}
