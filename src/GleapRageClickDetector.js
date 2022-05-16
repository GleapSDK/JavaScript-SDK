import Gleap, { GleapConfigManager } from "./Gleap";

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
  initializedRageClickDetector = false;

  // GleapRageClickDetector singleton
  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new GleapRageClickDetector();
    }
    return this.instance;
  }

  start() {
    if (this.initializedRageClickDetector) {
      return;
    }
    this.initializedRageClickDetector = true;

    startRageClickDetector(function (target) {
      const elementDescription = getDOMElementDescription(target, false);
      const flowConfig = GleapConfigManager.getInstance().getFlowConfig();
      if (flowConfig && typeof flowConfig.enableRageClickDetector !== "undefined" && flowConfig.enableRageClickDetector) {
        if (flowConfig.rageClickDetectorIsSilent) {
          Gleap.sendSilentReport(
            {
              description: `Rage click detected.`,
              element: elementDescription,
            },
            "MEDIUM",
            "CRASH"
          );
        } else {
          Gleap.startFeedbackFlow("crash");
        }
      }
    });
  }
}
