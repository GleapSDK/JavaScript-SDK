import Gleap, { GleapFrameManager, GleapMetaDataManager, GleapSession } from "./Gleap";
import { gleapDataParser } from "./GleapHelper";

const serverUrl = 'wss://ws.gleap.io';

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

  cleanupWebSocket() {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    if (this.socket) {
      this.socket.onclose = null;
      this.socket.onerror = null;
      this.socket.onmessage = null;
      this.socket.onopen = null;
      this.socket.close();
      this.socket = null;
    }
  }

  initWebSocket() {
    const self = this;
    this.connectedWebSocketGleapId = GleapSession.getInstance().session.gleapId;

    console.log("Init websocket");

    if (!GleapSession.getInstance().session || !GleapSession.getInstance().sdkKey) {
      return;
    }

    this.socket = new WebSocket(`${serverUrl}?gleapId=${GleapSession.getInstance().session.gleapId}&gleapHash=${GleapSession.getInstance().session.gleapHash}&apiKey=${GleapSession.getInstance().sdkKey}&sdkVersion=${SDK_VERSION}`);

    // Set a timeout for the connection to open
    this.connectionTimeout = setTimeout(() => {
      if (self.socket.readyState !== self.socket.OPEN) {
        self.socket.close();
        console.error('Connection timeout');

        GleapStreamedEvent.getInstance().initWebSocket();
      }
    }, 5000); // Set timeout to 5 seconds

    // Event handler for the open event
    this.socket.onopen = (event) => {
      console.log('Connected to the WebSocket server:', event);

      // Clear the connection timeout as the connection is open
      if (self.connectionTimeout) {
        clearTimeout(self.connectionTimeout);
        self.connectionTimeout = null;
      }
    };

    // Event handler for the message event to handle incoming messages
    this.socket.onmessage = (event) => {
      this.processMessage(JSON.parse(event.data));
    };

    // Event handler for the error event
    this.socket.onerror = (error) => {
      console.error('WebSocket Error:', error);
    };

    // Event handler for the close event
    this.socket.onclose = (event) => {
      // Check event.wasClean to see if the socket was closed cleanly
      if (event.wasClean) {
        console.log(`Closed. Reason: ${event.reason} Code: ${event.code}`);
      } else {
        console.error(`Connection died. Reason: ${event.reason} Code: ${event.code}`);
      }

      // Attempt to reconnect after a delay
      setTimeout(() => {
        GleapStreamedEvent.getInstance().initWebSocket();
      }, 5000);
    };
  }

  processMessage(message) {
    try {
      const { a, u } = message;
      if (!GleapFrameManager.getInstance().isOpened()) {
        if (a) {
          Gleap.getInstance().performActions(a);
        }
        if (u != null) {
          GleapNotificationManager.getInstance().setNotificationCount(u);
        }
      }
    } catch (exp) { }
  }

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

  constructor() { }

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
      this.cleanupWebSocket();
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
    }, 2000);
  };

  streamEvents = () => {
    if (!GleapSession.getInstance().ready || this.streamingEvents || this.errorCount > 2) {
      console.log("Not ready to stream events");
      return;
    }

    // Nothing to stream.
    if (this.streamedEventArray.length === 0) {
      console.log("Nothing to stream");
      return;
    }

    // Sockets not connected.
    if (!this.socket || this.socket.readyState !== this.socket.OPEN) {
      console.log("Socket not connected");
      return;
    }

    const self = this;
    this.streamingEvents = true;

    console.log(this.streamedEventArray);

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
