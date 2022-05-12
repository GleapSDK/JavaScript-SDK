import ReplayRecFrame from "./ReplayRecFrame";
import {
  gleapRoughSizeOfObject,
  REPLAYREC_ADD,
  REPLAYREC_ATTR,
  REPLAYREC_CANVAS_DATA,
  REPLAYREC_DELAY,
  REPLAYREC_INPUT,
  REPLAYREC_REMOVE,
  REPLAYREC_SCROLL,
  REPLAYREC_TEXT,
} from "./ReplayConstants";
import { isMobile, resizeImage } from "./GleapHelper";
import { isBlacklisted } from "./ResourceExclusionList";
import Gleap from "./Gleap";

export default class GleapReplayRecorder {
  startDate = undefined;

  // GleapReplayRecorder singleton
  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new GleapReplayRecorder();
      return this.instance;
    } else {
      return this.instance;
    }
  }

  constructor() {
    this.initReplaySizeCheck();
  }

  initReplaySizeCheck() {
    setInterval(() => {
      if (this.isFull()) {
        this.stop();
        this.start();
      }
    }, 1000);
  }

  /**
   * Start Replays
   * @returns 
   */
  start() {
    if (!this.stopped) {
      return;
    }

    this.stopped = false;
    this.startDate = Date.now();
    this.node = document.documentElement;
    this.nextID = 1;
    this.actions = [];
    this.actionsSize = 0;
    this.lastActionTime = Date.now();
    this.observerCallback = this.callback.bind(this);
    this.resourcesToResolve = {};
    this.rootFrame = new ReplayRecFrame(window, this.node, this);
    this.evaluateFocus();
  }

  /**
   * Stop Replays
   * @returns 
   */
  stop() {
    this.stopped = true;
    if (!this.rootFrame) {
      this.rootFrame = null;
      return;
    }

    this.rootFrame.stop();
    this.rootFrame = null;
  }

  /**
   * Get the current replay data
   * @returns {Promise<void>}
   */
  getReplayData() {
    if (!this.startDate) {
      return Promise.resolve(null);
    }

    const replayResult = {
      startDate: this.startDate,
      initialState: this.rootFrame.initialState,
      initialActions: this.rootFrame.initialActions,
      actions: this.actions,
      baseUrl: window.location.origin,
      width: window.innerWidth,
      height: window.innerHeight,
      resourcesToResolve: this.resourcesToResolve,
      isMobile: isMobile(),
    };

    if (Gleap.getInstance().isLiveMode()) {
      return this.fetchImageResources().then(() => {
        return this.cleanupResources(replayResult);
      });
    } else {
      return this.cleanupResources(replayResult);
    }
  }

  isFull() {
    if (this.actions && this.actionsSize > 10) {
      return true;
    }
    return false;
  }

  fetchCSSResource = (url) => {
    var self = this;
    return new Promise((resolve, reject) => {
      if (url) {
        var xhr = new XMLHttpRequest();
        xhr.onload = function () {
          var reader = new FileReader();
          reader.onloadend = function () {
            resolve(reader.result);
          };
          reader.onerror = function () {
            resolve();
          };
          reader.readAsDataURL(xhr.response);
        };
        xhr.onerror = function (err) {
          resolve();
        };
        xhr.open("GET", url);
        xhr.responseType = "blob";
        xhr.send();
      } else {
        resolve();
      }
    });
  };

  replaceAsync = (str, regex, asyncFn) => {
    return new Promise((resolve, reject) => {
      const promises = [];
      str.replace(regex, (match, ...args) => {
        const promise = asyncFn(match, ...args);
        promises.push(promise);
      });
      Promise.all(promises)
        .then((data) => {
          resolve(str.replace(regex, () => data.shift()));
        })
        .catch(() => {
          reject();
        });
    });
  };

  validateStylesheetResources = (data, url) => {
    var basePath = url.substring(0, url.lastIndexOf("/"));
    var split = data.split(",");
    if (split.length !== 2) {
      return Promise.reject();
    }
    data = atob(split[1]);
    delete split[1];
    return this.replaceAsync(
      data,
      /url\((.*?)\)/g,
      (matchedData) =>
        new Promise((resolve, reject) => {
          var matchedUrl = matchedData
            .substr(4, matchedData.length - 5)
            .replaceAll("'", "")
            .replaceAll('"', "");

          // Remote file or data
          if (
            matchedUrl.indexOf("http") === 0 ||
            matchedUrl.indexOf("//") === 0 ||
            matchedUrl.indexOf("data") === 0
          ) {
            return resolve(matchedData);
          }

          try {
            var resourcePath = matchedUrl;
            if (basePath) {
              resourcePath = basePath + "/" + matchedUrl;
            }

            return this.fetchCSSResource(resourcePath).then((resourceData) => {
              if (matchedUrl.indexOf("data:text/html") === 0) {
                return resolve(matchedData);
              }
              return resolve("url(" + resourceData + ")");
            });
          } catch (exp) {
            return resolve(matchedData);
          }
        })
    ).then((result) => {
      return split[0] + "," + btoa(result);
    });
  };

  progressResource = (data, src, resolve, reject) => {
    if (data && data.indexOf("data:text/css") === 0) {
      this.validateStylesheetResources(data, src).then((data) => {
        this.resourcesToResolve[src] = data;
        resolve();
      });
    } else if (
      data &&
      (data.indexOf("data:image/jpeg") === 0 ||
        data.indexOf("data:image/png") === 0)
    ) {
      resizeImage(data, 500, 500).then((data) => {
        this.resourcesToResolve[src] = data;
        resolve();
      });
    } else {
      this.resourcesToResolve[src] = data;
      resolve();
    }
  };

  fetchItemResource = (src) => {
    const self = this;
    return new Promise((resolve, reject) => {
      if (src) {
        var xhr = new XMLHttpRequest();
        xhr.onload = function () {
          var reader = new FileReader();
          reader.onloadend = function () {
            self.progressResource(reader.result, src, resolve, reject);
          };
          reader.onerror = function () {
            resolve();
          };
          reader.readAsDataURL(xhr.response);
        };
        xhr.onerror = function (err) {
          resolve();
        };
        var url = src;
        xhr.open("GET", url);
        xhr.responseType = "blob";
        xhr.send();
      } else {
        resolve();
      }
    });
  };

  fetchImageResources() {
    var resolvePromises = [];
    var resourceKeys = Object.keys(this.resourcesToResolve);
    for (var i = 0; i < resourceKeys.length; i++) {
      if (!isBlacklisted(resourceKeys[i])) {
        resolvePromises.push(this.fetchItemResource(resourceKeys[i]));
      }
    }

    return Promise.all(resolvePromises);
  }

  cleanupResources(replayResult) {
    var resourceKeys = Object.keys(this.resourcesToResolve);
    for (var i = 0; i < resourceKeys.length; i++) {
      if (this.resourcesToResolve[resourceKeys[i]] === "--") {
        delete this.resourcesToResolve[resourceKeys[i]];
      }
    }

    return Promise.resolve(replayResult);
  }

  evaluateFocus() {
    this.rootFrame.flushObserver();
  }

  allowAttribute(e, name) {
    // eslint-disable-next-line default-case
    switch (name) {
      case "srcdoc":
        if (e.tagName === "IFRAME") {
          return false;
        }
        break;
      case "title":
        return false;
    }
    return true;
  }

  pushScrollAction(id, element, actionsList) {
    const actions = actionsList ? actionsList : this.actions;
    const scrolledIntoView = element.elementScrolledIntoView;
    if (scrolledIntoView) {
      const a = {};
      if (scrolledIntoView.ReplayRecID) {
        const scrolledIntoViewOffset =
          "elementScrolledIntoViewOffset" in element
            ? element.elementScrolledIntoViewOffset
            : null;
        a[REPLAYREC_SCROLL] = [
          id,
          scrolledIntoView.ReplayRecID,
          scrolledIntoViewOffset,
        ];
      } else {
        if (scrolledIntoView !== "bottom") {
          throw new Error(`Unknown scrolledIntoView: ${scrolledIntoView}`);
        }
        a[REPLAYREC_SCROLL] = [id, scrolledIntoView];
      }
      actions.push(a);
    }
  }

  serializeNode(node, actions) {
    if ("ReplayRecID" in node) {
      return null;
    }
    const id = this.nextID++;
    const obj = { id };
    node.ReplayRecID = id;
    switch (node.nodeType) {
      case Node.ELEMENT_NODE: {
        const tag = node.tagName;
        switch (tag) {
          case "INPUT":
          case "TEXTAREA": {
            const a = {};
            var val = node.value;
            if (node.type && node.type === "password" && val && val.length) {
              val = new Array(val.length + 1).join("*");
            }
            if (node.getAttribute("gleap-ignore") === "value") {
              val = new Array(val.length + 1).join("*");
            }
            a[REPLAYREC_INPUT] = [id, val];
            actions.push(a);
            const listener = node.ownerDocument.ReplayRecInner.scrollListener;
            node.addEventListener("scroll", listener, { passive: true });
            break;
          }
          case "PRE":
          case "DIV": {
            const listener = node.ownerDocument.ReplayRecInner.scrollListener;
            node.addEventListener("scroll", listener, { passive: true });
            break;
          }
          case "SCRIPT":
          case "LINK":
            delete node.ReplayRecID;
            const nodeRel = node.getAttribute("rel");

            // Stylesheets
            if (
              node &&
              node.href &&
              (node.href.includes(".css") ||
                (nodeRel && nodeRel.includes("stylesheet")))
            ) {
              this.resourcesToResolve[node.getAttribute("href")] = "--";
              break;
            }

            // HTML Imports
            if (nodeRel && nodeRel === "import") {
              break;
            }

            return null;
          case "CANVAS": {
            const a = {};
            a[REPLAYREC_CANVAS_DATA] = [id, node.toDataURL()];
            actions.push(a);
            break;
          }
        }

        obj[""] = tag;
        const attrs = {};
        var hasAttr = false;
        for (const a of node.attributes) {
          const name = a.name;
          if (this.allowAttribute(node, name)) {
            attrs[name] = a.value;
            hasAttr = true;
          }
        }
        if (hasAttr) {
          obj.a = attrs;
          if (obj.a && obj.a.src && tag !== "SOURCE" && tag !== "IFRAME") {
            this.optionallyAddAttribute("src", obj.a.src);
          }
        }
        const children = [];
        for (const c of node.childNodes) {
          const serialized = this.serializeNode(c, actions);
          if (serialized) {
            children.push(serialized);
          }
        }

        if (children.length > 0) {
          obj.c = children;
        }
        if (node.scrollLeft || node.scrollTop) {
          this.pushScrollAction(id, node, actions);
        }
        break;
      }

      case Node.TEXT_NODE:
      case Node.CDATA_SECTION_NODE: {
        // Check if it's a child of a style node.
        const parentNode = node.parentNode;
        if (
          node.parentNode &&
          parentNode.tagName &&
          parentNode.tagName === "STYLE" &&
          parentNode.ownerDocument
        ) {
          const styleSheets = parentNode.ownerDocument.styleSheets;
          if (styleSheets) {
            for (var i = 0; i < styleSheets.length; i++) {
              const styleSheet = styleSheets[i];
              if (
                styleSheet.ownerNode &&
                styleSheet.ownerNode.ReplayRecID &&
                parentNode.ReplayRecID === styleSheet.ownerNode.ReplayRecID
              ) {
                var cssRules = null;
                if (styleSheet.cssRules) {
                  cssRules = styleSheet.cssRules;
                } else if (styleSheet.rules) {
                  cssRules = styleSheet.rules;
                }
                if (cssRules) {
                  var cssTextContent = "";
                  for (var cssRuleItem in cssRules) {
                    if (cssRules[cssRuleItem].cssText) {
                      cssTextContent += cssRules[cssRuleItem].cssText;
                    }
                  }
                  obj.d = cssTextContent;
                }
              }
            }
          }
        }

        // Simply pass the data of the text.
        const data = node.data;
        if (data.length > 0 && !obj.d) {
          obj.d = data;
        }
        break;
      }

      case Node.PROCESSING_INSTRUCTION_NODE:
      case Node.COMMENT_NODE:
        break;

      default:
        delete node.ReplayRecID;
        throw new Error(`Bad node ${node}`);
    }

    return obj;
  }

  delay(seconds) {
    this.lastActionTime -= seconds * 1000;
  }

  deleteAllReplayRecIDs(e) {
    delete e.ReplayRecID;
    const listener = e.ownerDocument.ReplayRecInner.scrollListener;
    e.removeEventListener("scroll", listener, { passive: true });
    for (var c = e.firstChild; c; c = c.nextSibling) {
      if (c.ReplayRecID) {
        this.deleteAllReplayRecIDs(c);
      }
    }
  }

  optionallyAddAttribute(name, value) {
    if (name === "src" && value) {
      var url = value;
      if (url.indexOf("data") !== 0) {
        this.resourcesToResolve[url] = "--";
      }
    }
  }

  appendAction(action) {
    this.actions.push(action);
    const self = this;
    setTimeout(function () {
      self.actionsSize += gleapRoughSizeOfObject(action);
    }, 0);
  }

  callback(
    records,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    observer
  ) {
    const now = Date.now();
    if (now > this.lastActionTime) {
      const a = {};
      a[REPLAYREC_DELAY] = now - this.lastActionTime;
      this.appendAction(a);
    }
    this.lastActionTime = Date.now();

    try {
      for (const r of records) {
        if (r.target.ReplayRecID && r.type === "childList") {
          for (const child of r.removedNodes) {
            const childID = child.ReplayRecID;
            if (!childID) {
              continue;
            }
            const a = {};
            a[REPLAYREC_REMOVE] = childID;
            this.appendAction(a);
            this.deleteAllReplayRecIDs(child);
          }
        }
      }

      const nodesWithAddedChildren = [];
      for (const r of records) {
        const target = r.target;
        const id = target.ReplayRecID;
        if (!id) {
          continue;
        }
        // eslint-disable-next-line default-case
        switch (r.type) {
          case "attributes": {
            const attributeName = r.attributeName;
            if (this.allowAttribute(target, attributeName)) {
              const a = {};
              a[REPLAYREC_ATTR] = [
                id,
                attributeName,
                target.getAttribute(attributeName),
              ];

              if (target.tagName !== "SOURCE") {
                this.optionallyAddAttribute(
                  attributeName,
                  target.getAttribute(attributeName)
                );
              }

              this.appendAction(a);
            }
            break;
          }
          case "characterData": {
            const a = {};
            if (target.nodeType === Node.TEXT_NODE) {
              a[REPLAYREC_TEXT] = [id, target.data];
            }
            this.appendAction(a);
            break;
          }
          case "childList": {
            if (r.addedNodes.length > 0 && !target.ReplayRecNodesAdded) {
              target.ReplayRecNodesAdded = true;
              nodesWithAddedChildren.push(target);
            }
          }
        }
      }
      for (const node of nodesWithAddedChildren) {
        delete node.ReplayRecNodesAdded;
        for (var c = node.lastChild; c; c = c.previousSibling) {
          if (c.ReplayRecID) {
            continue;
          }
          const a = {};
          const actions = [];
          const serializedNode = this.serializeNode(c, actions);
          if (!serializedNode) {
            continue;
          }
          const nextSibling = c.nextSibling;
          a[REPLAYREC_ADD] = [
            node.ReplayRecID,
            nextSibling ? nextSibling.ReplayRecID : null,
            serializedNode,
            actions,
          ];
          this.appendAction(a);
        }
      }
    } catch (ex) {
      throw ex;
    }
  }
}
