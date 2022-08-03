import { gleapDataParser } from "./GleapHelper";
import Gleap, { GleapSession, GleapNotificationManager } from "./Gleap";

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
    this.startEventStream();
    this.startPageListener();
  }

  startPageListener() {
    this.logEvent("sessionStarted");

    const self = this;
    setInterval(function () {
      const currentUrl = window.location.href;
      if (currentUrl && currentUrl !== self.lastUrl) {
        self.lastUrl = currentUrl;
        self.logEvent("pageView", {
          page: currentUrl,
        });
      }
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

  startEventStream = () => {
    const self = this;
    this.streamEvents();

    setTimeout(function () {
      self.startEventStream();
    }, 5000);
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
          } catch (exp) {
            console.log(exp);
          }
        } else {
          GleapSession.getInstance().clearSession(true);
        }

        self.streamingEvents = false;
      }
    };
    http.send(
      JSON.stringify({
        events: this.streamedEventArray,
      })
    );

    this.streamedEventArray = [];
  };
}
