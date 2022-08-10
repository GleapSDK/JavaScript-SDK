import { gleapDataParser } from "./GleapHelper";
import Gleap, { GleapSession, GleapNotificationManager, GleapMetaDataManager } from "./Gleap";

export default class GleapStreamedEvent {
  eventArray = [];
  streamedEventArray = [];
  eventMaxLength = 500;
  streamingEvents = false;
  lastUrl = undefined;

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

  start() {
    this.startPageListener();
    this.runEventStreamLoop();
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
    this.logEvent("sessionStarted");
    this.logCurrentPage();

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

    setTimeout(function () {
      self.runEventStreamLoop();
    }, 6000);
  };

  streamEvents = () => {
    if (!GleapSession.getInstance().ready || this.streamingEvents) {
      return;
    }

    const self = this;
    this.streamingEvents = true;

    const http = new XMLHttpRequest();
    http.open("POST", GleapSession.getInstance().apiUrl + "/sessions/ping");
    http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    GleapSession.getInstance().injectSession(http);
    http.onerror = (error) => {
      GleapSession.getInstance().clearSession(true);
      self.streamingEvents = false;
    };
    http.onreadystatechange = function (e) {
      if (http.readyState === XMLHttpRequest.DONE) {
        if (http.status === 200 || http.status === 201) {
          try {
            const response = JSON.parse(http.responseText);
            const { actions, unreadCount } = response;
            if (actions) {
              Gleap.getInstance().performActions(actions);
            }
            if (unreadCount != null) {
              GleapNotificationManager.getInstance().setNotificationCount(unreadCount);
            }
          } catch (exp) {}
        } else {
          GleapSession.getInstance().clearSession(true);
        }

        self.streamingEvents = false;
      }
    };

    const sessionDuration = GleapMetaDataManager.getInstance().getSessionDuration();
    http.send(
      JSON.stringify({
        time: sessionDuration,
        events: this.streamedEventArray,
      })
    );

    this.streamedEventArray = [];
  };
}
