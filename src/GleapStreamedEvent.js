import Gleap, { GleapFrameManager, GleapMetaDataManager, GleapSession } from "./Gleap";
import { gleapDataParser } from "./GleapHelper";

export default class GleapStreamedEvent {
  eventArray = [];
  streamedEventArray = [];
  eventMaxLength = 500;
  errorCount = 0;
  streamingEvents = false;
  lastUrl = undefined;
  mainLoopTimeout = null;
  socket = null;
  connectedWebSocketGleapId = null;
  connectionTimeout = null;
  pingWS = null;
  handleOpenBound = null;
  handleErrorBound = null;
  handleMessageBound = null;
  handleCloseBound = null;

  // GleapStreamedEvent singleton
  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new GleapStreamedEvent();
      return this.instance;
    } else {
      return this.instance;
    }
  }

  constructor() {
    this.handleOpenBound = this.handleOpen.bind(this);
    this.handleErrorBound = this.handleError.bind(this);
    this.handleMessageBound = this.handleMessage.bind(this);
    this.handleCloseBound = this.handleClose.bind(this);
  }

  cleanupWebSocket() {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    if (this.pingWS) {
      clearInterval(this.pingWS);
    }

    if (this.socket) {
      this.socket.removeEventListener('open', this.handleOpenBound);
      this.socket.removeEventListener('error', this.handleErrorBound);
      this.socket.removeEventListener('message', this.handleMessageBound);
      this.socket.removeEventListener('close', this.handleCloseBound);
      this.socket.close();
      this.socket = null;
    }
  }

  initWebSocket() {
    this.cleanupWebSocket();

    this.connectedWebSocketGleapId = GleapSession.getInstance().session.gleapId;

    if (!GleapSession.getInstance().session || !GleapSession.getInstance().sdkKey) {
      return;
    }

    this.socket = new WebSocket(`${GleapSession.getInstance().wsApiUrl}?gleapId=${GleapSession.getInstance().session.gleapId}&gleapHash=${GleapSession.getInstance().session.gleapHash}&apiKey=${GleapSession.getInstance().sdkKey}&sdkVersion=${SDK_VERSION}`);
    this.socket.addEventListener('open', this.handleOpenBound);
    this.socket.addEventListener('message', this.handleMessageBound);
    this.socket.addEventListener('error', this.handleErrorBound);
    this.socket.addEventListener('close', this.handleCloseBound);
  }

  handleOpen(event) {
    this.pingWS = setInterval(() => {
      if (this.socket.readyState === this.socket.OPEN) {
        this.socket.send("PING");
        this.socket.send(0x9);
      }
    }, 10000);

    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  handleMessage(event) {
    this.processMessage(JSON.parse(event.data));
  }

  handleError(error) { }

  handleClose(event) {
    setTimeout(() => {
      this.initWebSocket();
    }, 5000);
  }

  processMessage(message) {
    try {
      if (message.name === 'update') {
        const { a, u } = message.data;
        if (!GleapFrameManager.getInstance().isOpened()) {
          if (a) {
            Gleap.getInstance().performActions(a);
          }
          if (u != null) {
            GleapNotificationManager.getInstance().setNotificationCount(u);
          }
        }
      }
    } catch (exp) { }
  }

  getEventArray() {
    return this.eventArray;
  }

  stop() {
    this.cleanupMainLoop();
  }

  resetErrorCountLoop() {
    setInterval(() => {
      this.errorCount = 0;
    }, 60000);
  }

  cleanupMainLoop() {
    if (this.mainLoopTimeout) {
      clearInterval(this.mainLoopTimeout);
      this.mainLoopTimeout = null;
    }
  }

  restart() {
    // Only reconnect websockets when needed.
    if (this.connectedWebSocketGleapId !== GleapSession.getInstance().session.gleapId) {
      this.initWebSocket();
    }

    this.cleanupMainLoop();
    this.trackInitialEvents();
    this.runEventStreamLoop();
  }

  start() {
    this.startPageListener();
    this.resetErrorCountLoop();
  }

  trackInitialEvents() {
    GleapStreamedEvent.getInstance().logEvent("sessionStarted");
    GleapStreamedEvent.getInstance().logCurrentPage();
  }

  logCurrentPage() {
    if (Gleap.getInstance().disablePageTracking) {
      return;
    }

    const currentUrl = window.location.href;
    if (currentUrl && currentUrl !== this.lastUrl) {
      this.lastUrl = currentUrl;
      this.logEvent("pageView", {
        page: currentUrl,
      });
    }
  }

  startPageListener() {
    const self = this;
    setInterval(function () {
      self.logCurrentPage();
    }, 1000);
  }

  logEvent(name, data) {
    var log = {
      name,
      date: new Date(),
    };
    if (data) {
      log.data = gleapDataParser(data);
    }
    this.eventArray.push(log);
    this.streamedEventArray.push(log);

    // Check max size of event log
    if (this.eventArray.length > this.eventMaxLength) {
      this.eventArray.shift();
    }

    // Check max size of streamed event log
    if (this.streamedEventArray.length > this.eventMaxLength) {
      this.streamedEventArray.shift();
    }
  }

  runEventStreamLoop = () => {
    const self = this;
    this.streamEvents();

    this.mainLoopTimeout = setTimeout(function () {
      self.runEventStreamLoop();
    }, 3000);
  };

  streamEvents = () => {
    if (!GleapSession.getInstance().ready || this.streamingEvents || this.errorCount > 2) {
      return;
    }

    // Nothing to stream.
    if (this.streamedEventArray.length === 0) {
      return;
    }

    // Sockets not connected.
    if (!this.socket || this.socket.readyState !== this.socket.OPEN) {
      return;
    }

    const self = this;
    this.streamingEvents = true;

    const http = new XMLHttpRequest();
    http.open("POST", GleapSession.getInstance().apiUrl + "/sessions/ping");
    http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    GleapSession.getInstance().injectSession(http);
    http.onerror = () => {
      self.errorCount++;
      self.streamingEvents = false;
    };
    http.onreadystatechange = function (e) {
      if (http.readyState === 4) {
        if (http.status === 200 || http.status === 201) {
          self.errorCount = 0;
        } else {
          self.errorCount++;
        }

        self.streamingEvents = false;
      }
    };

    const sessionDuration = GleapMetaDataManager.getInstance().getSessionDuration();
    http.send(
      JSON.stringify({
        time: sessionDuration,
        events: this.streamedEventArray,
        opened: GleapFrameManager.getInstance().isOpened(),
        sdkVersion: SDK_VERSION,
        ws: true,
      })
    );

    this.streamedEventArray = [];
  };
}
