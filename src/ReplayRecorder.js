import ReplayRecFrame from "./ReplayRecFrame";
import {
  REPLAYREC_ADD,
  REPLAYREC_ATTR,
  REPLAYREC_CANVAS_DATA,
  REPLAYREC_DELAY,
  REPLAYREC_INPUT,
  REPLAYREC_REMOVE,
  REPLAYREC_SCROLL,
  REPLAYREC_TEXT,
} from "./ReplayConstants";
import { isMobile, resizeImage } from "./ImageHelper";
import { isBlacklisted } from "./ResourceExclusionList";

export default class ReplayRecorder {
  constructor() {
    this.startDate = Date.now();
    this.node = document.documentElement;
    this.nextID = 1;
    this.actions = [];
    this.lastActionTime = Date.now();
    this.nestedObserverCallbacks = 0;
    this.focusedElement = null;
    this.observerCallback = this.callback.bind(this);
    this.resourcesToResolve = {};
    this.rootFrame = new ReplayRecFrame(window, this.node, this);
    this.evaluateFocus();
    this.result = null;
    this.finalizingResult = false;
  }

  isFull() {
    if (this.actions && this.actions.length > 10000) {
      return true;
    }
    return false;
  }

  fetchCSSResource = (url, proxy = false) => {
    var self = this;
    return new Promise((resolve, reject) => {
      if (url) {
        var xhr = new XMLHttpRequest();
        xhr.onload = function () {
          if (proxy) {
            xhr.response
              .text()
              .then((text) => {
                resolve(text);
              })
              .catch(() => {
                reject();
              });
          } else {
            var reader = new FileReader();
            reader.onloadend = function () {
              resolve(reader.result);
            };
            reader.onerror = function () {
              reject();
            };
            reader.readAsDataURL(xhr.response);
          }
        };
        xhr.onerror = function (err) {
          // Retry with proxy.
          if (proxy === false) {
            self
              .fetchCSSResource(url, true)
              .then(() => {
                resolve();
              })
              .catch(() => {
                resolve();
              });
          } else {
            resolve();
          }
        };
        if (proxy) {
          url = "https://jsproxy.bugbattle.io/?url=" + encodeURIComponent(url);
        }
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
            let resourcePath = matchedUrl;
            if (basePath) {
              resourcePath = basePath + "/" + matchedUrl;
            }

            console.log(resourcePath);
            return this.fetchCSSResource(resourcePath).then((resourceData) => {
              console.log(resourceData);
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
    console.log(data);
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

  fetchItemResource = (src, proxy = false) => {
    const self = this;

    return new Promise((resolve, reject) => {
      if (src) {
        var xhr = new XMLHttpRequest();
        xhr.onload = function () {
          if (proxy) {
            xhr.response
              .text()
              .then((text) => {
                self.progressResource(text, src, resolve, reject);
              })
              .catch(() => {
                reject();
              });
          } else {
            var reader = new FileReader();
            reader.onloadend = function () {
              self.progressResource(reader.result, src, resolve, reject);
            };
            reader.onerror = function () {
              resolve();
            };
            reader.readAsDataURL(xhr.response);
          }
        };
        xhr.onerror = function (err) {
          if (proxy === false) {
            self
              .fetchItemResource(src, true)
              .then(() => {
                resolve();
              })
              .catch(() => {
                resolve();
              });
          } else {
            reject();
          }
        };
        var url = src;
        if (proxy) {
          url = "https://jsproxy.bugbattle.io/?url=" + encodeURIComponent(src);
        }
        xhr.open("GET", url);
        xhr.responseType = "blob";
        xhr.send();
      } else {
        resolve();
      }
    });
  };

  fetchImageResources() {
    let resolvePromises = [];
    let resourceKeys = Object.keys(this.resourcesToResolve);
    for (var i = 0; i < resourceKeys.length; i++) {
      if (!isBlacklisted(resourceKeys[i])) {
        resolvePromises.push(this.fetchItemResource(resourceKeys[i]));
      }
    }

    return Promise.all(resolvePromises);
  }

  stop(fetchResources = false) {
    if (!this.rootFrame) {
      this.clearFakeFocus();
      this.rootFrame = null;
      return;
    }

    const ret = {
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

    this.rootFrame.stop();
    this.clearFakeFocus();
    this.rootFrame = null;

    this.finalizingResult = true;
    if (fetchResources) {
      return this.fetchImageResources().then(() => {
        this.result = ret;
        this.finalizingResult = false;
      });
    } else {
      this.result = ret;
      this.finalizingResult = false;
    }
  }

  clearFakeFocus() {
    if (!this.focusedElement) {
      return;
    }
    this.focusedElement.removeAttribute("fakeFocus");
    let ancestor = this.focusedElement;
    while (ancestor) {
      ancestor.removeAttribute("fakeFocusWithin");
      const nextAncestor = ancestor.parentElement;
      if (!nextAncestor) {
        ancestor = ancestor.ownerDocument.ReplayRecInner.iframeElement;
      } else {
        ancestor = nextAncestor;
      }
    }
  }

  evaluateFocus() {
    let frame = this.rootFrame;
    let e;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      e = frame.win.document.activeElement;
      if (!frame.node.contains(e)) {
        e = null;
        break;
      }
      if (e.tagName === "IFRAME") {
        frame = e.contentDocument.ReplayRecInner;
      } else {
        break;
      }
    }
    if (e === this.focusedElement) {
      return;
    }
    this.clearFakeFocus();
    e.setAttribute("fakeFocus", "");
    let ancestor = e;
    while (ancestor) {
      ancestor.setAttribute("fakeFocusWithin", "");
      const nextAncestor = ancestor.parentElement;
      if (!nextAncestor) {
        ancestor.ownerDocument.ReplayRecInner.flushObserver();
        ancestor = ancestor.ownerDocument.ReplayRecInner.iframeElement;
      } else {
        ancestor = nextAncestor;
      }
    }
    // Flush observer so that during startup we have the right set of actions
    this.rootFrame.flushObserver();
    this.focusedElement = e;
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
      throw new Error(`Already serialized ${node.ReplayRecID}`);
    }
    const id = this.nextID++;
    const obj = { id };
    node.ReplayRecID = id;
    switch (node.nodeType) {
      case Node.ELEMENT_NODE: {
        const tag = node.tagName;
        // eslint-disable-next-line default-case
        switch (tag) {
          case "INPUT":
          case "TEXTAREA": {
            const a = {};
            a[REPLAYREC_INPUT] = [id, node.value];
            actions.push(a);
            const listener = node.ownerDocument.ReplayRecInner.scrollListener;
            node.addEventListener("scroll", listener, { passive: true });
            break;
          }
          case "PRE":
          case "DIV": {
            if (
              node.classList.contains("hidden") &&
              window.REPLAYREC_SKIP_HIDDEN_IDS.indexOf(node.id) >= 0
            ) {
              delete node.ReplayRecID;
              return null;
            }
            // In Pernosco all scrollable elements happen to be DIV/INPUT/TEXTAREA
            const listener = node.ownerDocument.ReplayRecInner.scrollListener;
            node.addEventListener("scroll", listener, { passive: true });
            break;
          }
          case "SCRIPT":
          case "LINK":
            delete node.ReplayRecID;

            if (
              node &&
              node.href &&
              (node.href.includes(".css") ||
                (node.rel && node.rel.includes("stylesheet")))
            ) {
              this.resourcesToResolve[node.getAttribute("href")] = "--";
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
        let hasAttr = false;
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
        const data = node.data;
        if (data.length > 0) {
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
    for (let c = e.firstChild; c; c = c.nextSibling) {
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

  callback(
    records,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    observer
  ) {
    // Observer callbacks can nest when we flush while detaching from an IFRAME
    if (this.nestedObserverCallbacks === 0) {
      const now = Date.now();
      if (now > this.lastActionTime) {
        const a = {};
        a[REPLAYREC_DELAY] = now - this.lastActionTime;
        this.actions.push(a);
      }
    }
    ++this.nestedObserverCallbacks;

    try {
      // A node has a ReplayRecID if and only if it was in the non-excluded DOM at the start of the records
      // batch.
      // If a node has a ReplayRecID and is not our root, then its parent must also
      // have a ReplayRecID.
      for (const r of records) {
        if (r.target.ReplayRecID && r.type === "childList") {
          for (const child of r.removedNodes) {
            const childID = child.ReplayRecID;
            if (!childID) {
              continue;
            }
            const a = {};
            a[REPLAYREC_REMOVE] = childID;
            this.actions.push(a);
            this.deleteAllReplayRecIDs(child);
          }
        }
      }
      // A node has a ReplayRecID if and only if it was in the non-excluded DOM at the start of the records
      // batch, and was not ever removed during this records batch.
      // If a node has a ReplayRecID and is not our root, then its parent must also
      // have a ReplayRecID.
      const nodesWithAddedChildren = [];
      for (const r of records) {
        const target = r.target;
        const id = target.ReplayRecID;
        if (!id) {
          // Node not in non-excluded DOM at the start of the records batch.
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

              this.actions.push(a);
            }
            break;
          }
          case "characterData": {
            const a = {};
            a[REPLAYREC_TEXT] = [id, target.data];
            this.actions.push(a);
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
        for (let c = node.lastChild; c; c = c.previousSibling) {
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
          this.actions.push(a);
        }
      }
    } catch (ex) {
      --this.nestedObserverCallbacks;
      // eslint-disable-next-line no-console
      throw ex;
    }
    --this.nestedObserverCallbacks;
    if (this.nestedObserverCallbacks === 0) {
      // Ignore time spent doing ReplayRec recording.
      // Note that during this processing, the browser might be downloading stuff or
      // doing other off-main-thread work, so this could give an optimistic picture
      // of actual performance. Doesn't really matter.
      this.lastActionTime = Date.now();
    }
  }
}
