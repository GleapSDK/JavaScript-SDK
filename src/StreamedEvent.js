import Gleap from "./Gleap";
import { gleapDataParser } from "./GleapHelper";
import GleapSession from "./GleapSession";

export default class StreamedEvent {
  eventArray = [];
  streamedEventArray = [];
  eventMaxLength = 500;
  lastUrl = undefined;

  // StreamedEvent singleton
  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new StreamedEvent();
      return this.instance;
    } else {
      return this.instance;
    }
  }

  constructor() {}

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
    let interval = 1500;
    if (
      GleapSession.getInstance().ready &&
      self.streamedEventArray &&
      self.streamedEventArray.length > 0
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
            } catch (exp) {}
          } else {
            GleapSession.getInstance().clearSession(true);
          }
        }
      };
      http.send(
        JSON.stringify({
          events: this.streamedEventArray,
        })
      );

      this.streamedEventArray = [];
    }
  };
}
