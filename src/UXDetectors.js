const getSelectorFromTarget = function (target) {
  var className = target.className !== "" ? "." + target.className : "";
  var targetId = target.id !== "" ? "#" + target.id : "";
  return [target.nodeName, className, targetId].join(" ");
};

const detectRageClicks = function (subscribe, options) {
  var interval = options.interval,
    limit = options.limit;
  var count = 1;
  var countClear = setInterval(function () {
    count = 1;
  }, interval);
  var listener = function (event) {
    if (count === limit) {
      subscribe(getSelectorFromTarget(event.target), function () {
        clearInterval(countClear);
        document.removeEventListener("click", listener);
      });
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
      limit: 3,
    }
  );
};
