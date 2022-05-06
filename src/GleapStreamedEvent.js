import { gleapDataParser } from "./GleapHelper";
import Gleap, { GleapSession } from "./Gleap";

export default class GleapStreamedEvent {
  eventArray = [];
  GleapStreamedEventArray = [];
  eventMaxLength = 500;
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
    this.GleapStreamedEventArray.push(log);

    // Check max size of event log
    if (this.eventArray.length > this.eventMaxLength) {
      this.eventArray.shift();
    }

    // Check max size of streamed event log
    if (this.GleapStreamedEventArray.length > this.eventMaxLength) {
      this.GleapStreamedEventArray.shift();
    }
  }

  startEventStream = () => {
    const self = this;
    let interval = 1500;
    if (
      GleapSession.getInstance().ready &&
      self.GleapStreamedEventArray &&
      self.GleapStreamedEventArray.length > 0
    ) {
      self.streamEvents();
      interval = 3000;
    }

    setTimeout(function () {
      self.startEventStream();
    }, interval);
  };

  streamEvents = () => {
    if (GleapSession.getInstance().ready) {
      const http = new XMLHttpRequest();
      http.open("POST", GleapSession.getInstance().apiUrl + "/sessions/stream");
      http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      GleapSession.getInstance().injectSession(http);
      http.onerror = (error) => {
        GleapSession.getInstance().clearSession(true);
      };
      http.onreadystatechange = function (e) {
        if (http.readyState === XMLHttpRequest.DONE) {
          if (http.status === 200 || http.status === 201) {
            try {
              const action = JSON.parse(http.responseText);
              Gleap.getInstance().performAction(action);
            } catch (exp) { }
          } else {
            GleapSession.getInstance().clearSession(true);
          }
        }
      };
      http.send(
        JSON.stringify({
          events: this.GleapStreamedEventArray,
        })
      );

      this.GleapStreamedEventArray = [];
    }
  };
}
