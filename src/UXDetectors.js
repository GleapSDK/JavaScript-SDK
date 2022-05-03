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
