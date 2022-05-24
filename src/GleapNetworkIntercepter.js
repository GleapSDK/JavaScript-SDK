class GleapNetworkIntercepter {
  startTimestamp = Date.now();
  requestId = 0;
  requests = {};
  maxRequests = 10;
  filters = [];
  blacklist = [];
  initialized = false;
  stopped = false;
  loadAllResources = false;

  // GleapNetworkIntercepter singleton
  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new GleapNetworkIntercepter();
    }
    return this.instance;
  }

  setLoadAllResources(loadAllResources) {
    this.loadAllResources = loadAllResources;
  }

  isContentTypeSupported(contentType) {
    if (typeof contentType !== "string") {
      return false;
    }

    if (contentType === "") {
      return true;
    }

    contentType = contentType.toLocaleLowerCase();

    const supportedContentTypes = ["text/", "xml", "json"];
    for (var i = 0; i < supportedContentTypes.length; i++) {
      if (contentType.includes(supportedContentTypes[i])) {
        return true;
      }
    }

    return false;
  }

  getRequests() {
    var requests = JSON.parse(JSON.stringify(Object.values(this.requests)));

    if (this.filters && this.filters.length > 0) {
      // Perform network log filtering.
      for (var i = 0; i < requests.length; i++) {
        var request = requests[i];

        // Headers
        if (request && request.request && request.request.headers) {
          for (var j = 0; j < this.filters.length; j++) {
            delete request.request.headers[this.filters[j]];
          }
        }

        // Payload
        if (request && request.request && request.request.payload) {
          var payloadObj = request.request.payload;
          try {
            payloadObj = JSON.parse(request.request.payload);
          } catch (e) { }

          if (payloadObj) {
            for (var j = 0; j < this.filters.length; j++) {
              delete payloadObj[this.filters[j]];
            }
            request.request.payload = JSON.stringify(payloadObj);
          }
        }

        // Response
        if (request && request.response && request.response.responseText) {
          try {
            var data = JSON.parse(request.response.responseText);
            for (var j = 0; j < this.filters.length; j++) {
              delete data[this.filters[j]];
            }
            request.response.responseText = JSON.stringify(data);
          } catch (e) { }
        }
      }
    }

    // Get static resources from performance.
    try {
      if (typeof window !== "undefined" && window.performance) {
        var resources = window.performance.getEntriesByType("resource");
        for (var i = 0; i < resources.length; i++) {
          var resource = resources[i];
          if (resource && resource.name) {
            if ((this.loadAllResources || ["xmlhttprequest", "fetch"].indexOf(resource.initiatorType) > -1) && !requests.find(request => request.url === resource.name)) {
              requests.push({
                type: "RESOURCE",
                date: new Date(this.startTimestamp + resource.startTime),
                url: resource.name,
                duration: Math.round(resource.duration),
                initiatorType: resource.initiatorType
              });
            }
          }
        }
      }
    } catch (exp) { }

    if (this.blacklist && this.blacklist.length > 0) {
      requests = requests.filter((request) => {
        for (var i = 0; i < this.blacklist.length; i++) {
          if (request.url && request.url.includes(this.blacklist[i])) {
            return false;
          }
        }
        return true;
      });
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
    this.filters = filters ? filters : [];
  }

  setBlacklist(blacklist) {
    this.blacklist = blacklist ? blacklist : [];
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

  getTextContentSize(text) {
    const size = new TextEncoder().encode(text).length;
    const kiloBytes = size / 1024;
    const megaBytes = kiloBytes / 1024;
    return megaBytes;
  }

  cleanupContentSize(text) {
    const contentSize = this.getTextContentSize(text);
    if (contentSize > 0.2) {
      return "<content_too_large>";
    }

    return text;
  }

  cleanupPayload(payload) {
    if (payload === undefined || payload === null) {
      return "{}";
    }

    try {
      if (typeof TextDecoder !== undefined && ArrayBuffer.isView(payload)) {
        let value = new TextDecoder().decode(payload);
        return value;
      }
    } catch (exp) { }

    return payload;
  }

  preparePayload(payload) {
    var payloadText = this.cleanupPayload(payload);
    return this.cleanupContentSize(payloadText);
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

        if (
          params.length > 0 &&
          typeof params[0] !== "undefined" &&
          typeof params[0].url !== "undefined"
        ) {
          this.requests[bbRequestId] = {
            url: params[0].url,
            date: new Date(),
            request: {
              payload: "",
              headers:
                typeof params[0].headers !== "undefined"
                  ? Object.fromEntries(params[0].headers.entries())
                  : {},
            },
            type:
              typeof params[0].method !== "undefined" ? params[0].method : "",
          };
        } else {
          if (params.length >= 2 && params[1]) {
            var method =
              params[1] && params[1].method ? params[1].method : "GET";
            this.requests[bbRequestId] = {
              request: {
                payload: self.preparePayload(params[1].body),
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

        try {
          this.requests[bbRequestId]["success"] = true;
          this.requests[bbRequestId]["response"] = {
            status: req.status,
            statusText: "",
            responseText: "<request_still_open>",
          };
          this.calcRequestTime(bbRequestId);
        } catch (exp) { }

        try {
          var contentType = "";
          if (req.headers && typeof req.headers.get !== "undefined") {
            contentType = req.headers.get("content-type");
          }

          if (this.isContentTypeSupported(contentType)) {
            req
              .text()
              .then((responseText) => {
                if (this.requests[bbRequestId]) {
                  this.requests[bbRequestId]["success"] = true;
                  this.requests[bbRequestId]["response"] = {
                    status: req.status,
                    statusText: req.statusText,
                    responseText: self.cleanupContentSize(responseText)
                  };
                }
                this.calcRequestTime(bbRequestId);
                this.cleanRequests();
              })
              .catch((err) => {
                this.cleanRequests();
              });
          } else {
            if (this.requests[bbRequestId]) {
              this.requests[bbRequestId]["success"] = true;
              this.requests[bbRequestId]["response"] = {
                status: req.status,
                statusText: req.statusText,
                responseText: "<content_type_not_supported>",
              };
            }
            this.calcRequestTime(bbRequestId);
            this.cleanRequests();
          }
        } catch (exp) { }
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
            payload: this.preparePayload(args.length > 0 ? args[0] : "{}"),
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
          this.requests[request.currentTarget.bbRequestId]["success"] = false;
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
            responseText = this.cleanupContentSize(target.responseText);
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
            .then(function (response) {
              if (response && typeof response.clone === "function") {
                const data = response.clone();
                callback.onFetchLoad(data, bbRequestId);
              }

              return response;
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
