import Gleap, {
  GleapAudioManager,
  GleapBannerManager,
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
import { bootstrapGleapFrame, runFunctionWhenDomIsReady } from './GleapHelper';
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
        appHeight();
      } catch (e) {}
    }
  }

  setUrlHandler(handler) {
    this.urlHandler = handler;
  }

  isSurvey() {
    return this.appMode === 'survey' || this.appMode === 'survey_full' || this.appMode === 'survey_web';
  }

  setAppMode(appMode) {
    this.appMode = appMode;
    this.updateFrameStyle();

    const innerContainer = document.querySelector('.gleap-frame-container-inner');
    if ((this.appMode === 'widget' || this.appMode === 'survey_full' || this.appMode === 'survey_web') && innerContainer) {
      innerContainer.style.maxHeight = `${widgetMaxHeight}px`;
    }
  }

  registerEscListener() {
    if (this.escListener) {
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
    this.gleapFrameContainer = null;
    this.gleapFrame = null;
  }

  isOpened() {
    return this.widgetOpened || this.markerManager != null;
  }

  autoWhiteListCookieManager = () => {
    if (window && window.cmp_block_ignoredomains) {
      window.cmp_block_ignoredomains.concat(['messenger-app.gleap.io']);
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
        elem.className = 'gleap-frame-container gleap-frame-container--hidden rr-block';
        elem.innerHTML = `<div class="gleap-frame-container-inner">${widgetLoaderMarkup(
          GleapConfigManager.getInstance().getFlowConfig()
        )}<iframe class="gleap-frame" scrolling="yes" allow="autoplay; encrypted-media; fullscreen; microphone *; display-capture *; camera *;" frameborder="0"></iframe></div>`;
        document.body.appendChild(elem);

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
    const classicStyle = 'gleap-frame-container--classic';
    const classicStyleLeft = 'gleap-frame-container--classic-left';
    const modernStyleLeft = 'gleap-frame-container--modern-left';
    const noButtonStyleLeft = 'gleap-frame-container--no-button';
    const allStyles = [
      classicStyle,
      classicStyleLeft,
      extendedStyle,
      modernStyleLeft,
      noButtonStyleLeft,
      surveyStyle,
      surveyFullStyle,
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
    if (this.appMode === 'survey_full' || this.appMode === 'survey_web') {
      this.gleapFrameContainer.classList.add(surveyFullStyle);
    }
    if (this.appMode === 'extended') {
      this.gleapFrameContainer.classList.add(extendedStyle);
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
    // Prevent for survey web.
    if (this.appMode === 'survey_web') {
      return;
    }

    this.hideMarkerManager();
    if (this.gleapFrameContainer) {
      const container = this.gleapFrameContainer;
      container.classList.remove('gleap-frame-container--animate');

      if (this.closeTimeout) {
        clearTimeout(this.closeTimeout);
        this.closeTimeout = null;
      }

      // Survey-full has no open/close animation, hide it instantly.
      if (container.classList.contains('gleap-frame-container--survey-full')) {
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
        this.frameHeight = data.data;

        const innerContainer = document.querySelector('.gleap-frame-container-inner');
        if (
          (this.appMode === 'survey' || this.appMode === 'survey_full' || this.appMode === 'survey_web') &&
          innerContainer
        ) {
          innerContainer.style.maxHeight = `${this.frameHeight}px`;
        }
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
