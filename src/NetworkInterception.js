class BugBattleNetworkIntercepter {
  requestId = 0;
  requests = {};
  maxRequests = 15;
  stopped = false;

  getRequests() {
    return Object.values(this.requests);
  }

  setMaxRequests(maxRequests) {
    this.maxRequests = maxRequests;
  }

  setStopped(stopped) {
    this.stopped = stopped;
  }

  cleanRequests() {
    var keys = Object.keys(this.requests);
    if (keys.length > this.maxRequests) {
      var keysToRemove = keys.slice(0, keys.length - this.maxRequests);
      for (var i = 0; i < keysToRemove.length; i++) {
        delete this.requests[keysToRemove[i]];
      }
    }
  }

  calcRequestTime(bbRequestId) {
    if (!bbRequestId || !this.requests || !this.requests[bbRequestId]) {
      return;
    }

    var startDate = this.requests[bbRequestId]["date"];
    if (startDate) {
      this.requests[bbRequestId]["duration"] =
        new Date().getTime() - startDate.getTime();
    }
  }

  start() {
    this.interceptNetworkRequests({
      onFetch: (params, bbRequestId) => {
        if (this.stopped || !bbRequestId || !this.requests) {
          return;
        }

        if (params.length >= 2) {
          var method = params[1].method ? params[1].method : "GET";
          this.requests[bbRequestId] = {
            request: {
              payload: params[1].body,
              headers: params[1].headers,
            },
            type: method,
            url: params[0],
            date: new Date(),
          };
        } else {
          this.requests[bbRequestId] = {
            url: params[0],
            date: new Date(),
          };
        }

        this.cleanRequests();
      },
      onFetchLoad: (req, bbRequestId) => {
        if (
          this.stopped ||
          !bbRequestId ||
          !this.requests ||
          !this.requests[bbRequestId]
        ) {
          return;
        }

        req.text().then((responseText) => {
          this.requests[bbRequestId]["success"] = true;
          this.requests[bbRequestId]["response"] = {
            status: req.status,
            statusText: req.statusText,
            responseText: responseText,
          };

          this.calcRequestTime(bbRequestId);

          this.cleanRequests();
        });
      },
      onFetchFailed: (err, bbRequestId) => {
        if (
          this.stopped ||
          !bbRequestId ||
          !this.requests ||
          !this.requests[bbRequestId]
        ) {
          return;
        }

        this.requests[bbRequestId]["success"] = false;
        this.calcRequestTime(bbRequestId);
        this.cleanRequests();
      },
      onOpen: (request, args) => {
        if (this.stopped) {
          return;
        }

        if (
          request &&
          request.bbRequestId &&
          args.length >= 2 &&
          this.requests
        ) {
          this.requests[request.bbRequestId] = {
            type: args[0],
            url: args[1],
            date: new Date(),
          };
        }

        this.cleanRequests();
      },
      onSend: (request, args) => {
        if (this.stopped) {
          return;
        }

        if (
          request &&
          request.bbRequestId &&
          args.length > 0 &&
          this.requests &&
          this.requests[request.bbRequestId]
        ) {
          this.requests[request.bbRequestId]["request"] = {
            payload: args[0],
            headers: request.requestHeaders,
          };
          this.calcRequestTime(request.bbRequestId);
        }

        this.cleanRequests();
      },
      onError: (request, args) => {
        if (
          !this.stopped &&
          this.requests &&
          request &&
          request.currentTarget &&
          request.currentTarget.bbRequestId &&
          this.requests[request.currentTarget.bbRequestId]
        ) {
          var target = request.currentTarget;
          this.requests[target.bbRequestId]["success"] = false;
          this.calcRequestTime(request.bbRequestId);
        }

        this.cleanRequests();
      },
      onLoad: (request, args) => {
        if (this.stopped) {
          return;
        }

        if (
          request &&
          request.currentTarget &&
          request.currentTarget.bbRequestId &&
          this.requests &&
          this.requests[request.currentTarget.bbRequestId]
        ) {
          var target = request.currentTarget;
          this.requests[target.bbRequestId]["success"] = true;
          this.requests[target.bbRequestId]["response"] = {
            status: target.status,
            statusText: target.statusText,
            responseText:
              target.responseType === "text"
                ? target.responseText
                : "<" + target.responseType + ">",
          };
        }

        this.cleanRequests();
      },
    });
  }

  interceptNetworkRequests(callback) {
    var self = this;
    const open = XMLHttpRequest.prototype.open;
    const send = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.wrappedSetRequestHeader =
      XMLHttpRequest.prototype.setRequestHeader;
    XMLHttpRequest.prototype.setRequestHeader = function (header, value) {
      this.wrappedSetRequestHeader(header, value);

      if (!this.requestHeaders) {
        this.requestHeaders = {};
      }

      if (!this.requestHeaders[header]) {
        this.requestHeaders[header] = [];
      }

      this.requestHeaders[header].push(value);
    };
    XMLHttpRequest.prototype.open = function () {
      this["bbRequestId"] = ++self.requestId;
      callback.onOpen && callback.onOpen(this, arguments);
      if (callback.onLoad) {
        this.addEventListener("load", callback.onLoad.bind(callback));
      }
      if (callback.onError) {
        this.addEventListener("error", callback.onError.bind(callback));
      }
      return open.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function () {
      callback.onSend && callback.onSend(this, arguments);
      return send.apply(this, arguments);
    };

    if (window.fetch) {
      (function () {
        var originalFetch = window.fetch;
        window.fetch = function () {
          var bbRequestId = ++self.requestId;
          callback.onFetch(arguments, bbRequestId);

          return originalFetch
            .apply(this, arguments)
            .then(function (data) {
              return data.text().then((textData) => {
                data.text = function () {
                  return Promise.resolve(textData);
                };

                data.json = function () {
                  return Promise.resolve(JSON.parse(textData));
                };

                callback.onFetchLoad(data, bbRequestId);

                return data;
              });
            })
            .catch((err) => {
              callback.onFetchFailed(err, bbRequestId);
              throw err;
            });
        };
      })();
    }

    return callback;
  }
}

export default BugBattleNetworkIntercepter;
