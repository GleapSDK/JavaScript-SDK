import { gleapDataParser } from "./GleapHelper";
import Gleap, { GleapSession, GleapNotificationManager, GleapMetaDataManager, GleapFrameManager } from "./Gleap";

export default class GleapStreamedEvent {
  eventArray = [];
  streamedEventArray = [];
  eventMaxLength = 500;
  errorCount = 0;
  skippedCount = 1;
  streamingEvents = false;
  lastUrl = undefined;
  stopped = false;
  mainLoopTimeout = null;

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
    this.stopped = true;
  }

  resetErrorCountLoop() {
    setInterval(() => {
      this.errorCount = 0;
    }, 60000);
  }

  restart() {
    if (this.mainLoopTimeout) {
      clearInterval(this.mainLoopTimeout);
      this.mainLoopTimeout = null;
    }
    this.skippedCount = 1;

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
      if (self.stopped) {
        return;
      }
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
    if (this.stopped) {
      return;
    }

    const self = this;
    this.streamEvents();
    
    this.mainLoopTimeout = setTimeout(function () {
      self.runEventStreamLoop();
    }, 10000);
  };

  streamEvents = () => {
    if (!GleapSession.getInstance().ready || this.streamingEvents || this.errorCount > 2) {
      return;
    }

    if ((!this.streamedEventArray || this.streamedEventArray.length === 0) && this.skippedCount < 1) {
      this.skippedCount++;
      return;
    }
    
    const self = this;
    this.streamingEvents = true;

    const preGleapId = GleapSession.getInstance().getGleapId();

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
          self.skippedCount = 0;

          // Only perform actions if gleapId was not changed.
          if (GleapSession.getInstance().getGleapId() === preGleapId) {
            try {
              const response = JSON.parse(http.responseText);
              const { a, u } = response;
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
        opened: GleapFrameManager.getInstance().isOpened()
      })
    );

    this.streamedEventArray = [];
  };
}
