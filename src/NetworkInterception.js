class GleapNetworkIntercepter {
  requestId = 0;
  requests = {};
  externalConsoleLogs = [];
  maxRequests = 10;
  filters = [];
  initialized = false;
  stopped = false;

  getRequests() {
    var requests = this.externalConsoleLogs.concat(Object.values(this.requests));
    console.log(requests);
    if (!this.filters || this.filters.length === 0) {
      return requests;
    }

    // Perform network log filtering.
    for (var i = 0; i < requests.length; i++) {
      var request = requests[i];

      if (request && request.request && request.request.headers) {
        for (var j = 0; j < this.filters.length; j++) {
          delete request.request.headers[this.filters[j]];
        }
      }

      if (request && request.response && request.response.responseText) {
        try {
          var data = JSON.parse(request.response.responseText);
          for (var j = 0; j < this.filters.length; j++) {
            delete data[this.filters[j]];
          }
          request.response.responseText = JSON.stringify(data);
        } catch (e) {}
      }
    }

    return requests;
  }

  setMaxRequests(maxRequests) {
    this.maxRequests = maxRequests;
  }

  setStopped(stopped) {
    this.stopped = stopped;
  }

  setFilters(filters) {
    if (filters) {
      this.filters = filters;
    }
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

  calculateTextSize(text) {
    const size = new TextEncoder().encode(text).length;
    const kiloBytes = size / 1024;
    const megaBytes = kiloBytes / 1024;
    return megaBytes;
  }

  start() {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    const self = this;
    this.interceptNetworkRequests({
      onFetch: (params, bbRequestId) => {
        if (this.stopped || !bbRequestId || !this.requests) {
          return;
        }
        if (params.length >= 2 && params[1]) {
          var method = params[1] && params[1].method ? params[1].method : "GET";
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
            responseText:
              self.calculateTextSize(responseText) > 0.5
                ? "<response_too_large>"
                : responseText,
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
          this.requests &&
          this.requests[request.bbRequestId]
        ) {
          this.requests[request.bbRequestId]["request"] = {
            payload: args.length > 0 ? args[0] : "{}",
            headers: request.requestHeaders,
          };
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
          var responseType = target.responseType;
          var responseText = "<" + responseType + ">";
          if (responseType === "" || responseType === "text") {
            responseText =
              this.calculateTextSize(target.responseText) > 0.5
                ? "<response_too_large>"
                : target.responseText;
          }

          this.requests[target.bbRequestId]["success"] = true;
          this.requests[target.bbRequestId]["response"] = {
            status: target.status,
            statusText: target.statusText,
            responseText: responseText,
          };

          this.calcRequestTime(target.bbRequestId);
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
      if (!this.requestHeaders) {
        this.requestHeaders = {};
      }

      if (this.requestHeaders && this.requestHeaders.hasOwnProperty(header)) {
        return;
      }

      if (!this.requestHeaders[header]) {
        this.requestHeaders[header] = [];
      }

      this.requestHeaders[header].push(value);
      this.wrappedSetRequestHeader(header, value);
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
              return data.blob().then((blobData) => {
                data.text = function () {
                  return self.blobToTextPromise(blobData);
                };

                data.json = function () {
                  return self
                    .blobToTextPromise(blobData)
                    .then(function (textData) {
                      return JSON.parse(textData);
                    });
                };

                data.blob = function () {
                  return Promise.resolve(blobData);
                };

                data.arrayBuffer = function () {
                  return blobData.arrayBuffer();
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

  blobToTextPromise(blob) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function (evt) {
        if (evt && evt.target && evt.target.result) {
          resolve(evt.target.result);
        } else {
          reject();
        }
      };
      fr.onerror = function (err) {
        reject(err);
      };
      fr.readAsText(blob);
    });
  }
}

export default GleapNetworkIntercepter;
