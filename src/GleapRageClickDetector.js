const detectRageClicks = function (subscribe, options) {
  var interval = options.interval,
    limit = options.limit;
  var count = 1;
  var countClear = setInterval(function () {
    count = 1;
  }, interval);
  var listener = function (event) {
    if (count === limit) {
      subscribe(event.target);
    }
    count++;
  };
  document.addEventListener("click", listener);
};

export const startRageClickDetector = function (callback) {
  detectRageClicks(
    function (target, unsubscribe) {
      callback(target);
    },
    {
      interval: 750,
      limit: 4,
    }
  );
};

export default class GleapRageClickDetector {
  // GleapRageClickDetector singleton
  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new GleapRageClickDetector();
    }
    return this.instance;
  }

  start() {
    /*const instance = this.getInstance();

    if (instance.enabledRageClickDetector) {
      return;
    }

    instance.enabledRageClickDetector = true;
    instance.enabledRageClickDetectorSilent = silent;

    startRageClickDetector(function (target) {
      const elementDescription = getDOMElementDescription(target, false);
      if (instance.enabledRageClickDetectorSilent) {
        Gleap.sendSilentReport({
          description: `Rage click detected.`,
          element: elementDescription,
        });
      } else {
        Gleap.startFeedbackFlow("crash");
      }
    });*/
  }
}
