import ReplayRecFrame from "./ReplayRecFrame";
import {
  REPLAYREC_ADD,
  REPLAYREC_ATTR,
  REPLAYREC_CANVAS_DATA,
  REPLAYREC_DELAY,
  REPLAYREC_FRAME,
  REPLAYREC_INPUT,
  REPLAYREC_LABEL,
  REPLAYREC_REMOVE,
  REPLAYREC_SCROLL,
  REPLAYREC_TEXT,
} from "./ReplayConstants";

export default class ReplayRecorder {
  constructor() {
    this.node = document.documentElement;
    this.nextID = 1;
    this.actions = [];
    this.lastActionTime = Date.now();
    this.nestedObserverCallbacks = 0;
    this.focusedElement = null;
    this.observerCallback = this.callback.bind(this);
    this.iFrameStylesheets = {};
    this.iframeLoadedListener = (event) =>
      this.iframeLoaded(event.target, this.actions);
    this.rootFrame = new ReplayRecFrame(window, this.node, this, null);
    this.evaluateFocus();
    this.actions = [];
  }

  stop() {
    const width = this.rootFrame.node.getBoundingClientRect().width;
    const height = this.rootFrame.node.getBoundingClientRect().height;
    const ret = {
      initialState: this.rootFrame.initialState,
      iframeStylesheets: this.iFrameStylesheets,
      actions: this.actions,
      width,
      height,
    };
    this.rootFrame.stop();
    this.clearFakeFocus();
    this.rootFrame = null;
    return ret;
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
      case "src":
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
    } else {
      // eslint-disable-next-line no-console
      console.log("Warning: unknown scroll operation ignored");
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
            return null;
          case "CANVAS": {
            const a = {};
            a[REPLAYREC_CANVAS_DATA] = [id, node.toDataURL()];
            actions.push(a);
            break;
          }
          case "IFRAME":
            this.attachToIFrame(node, actions);
            break;
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

  attachToIFrame(e, actions) {
    e.addEventListener("load", this.iframeLoadedListener);
    if (e.contentDocument && e.contentDocument.readyState === "complete") {
      this.iframeLoaded(e, actions);
    }
  }

  iframeLoaded(e, actions) {
    e.ReplayRecInner = new ReplayRecFrame(
      e.contentWindow,
      e.contentDocument.body,
      this,
      e
    );
    const bodyElement = e.ReplayRecInner.initialState[0];
    if (!bodyElement.c) {
      bodyElement.c = [];
    }
    for (
      let c = e.contentDocument.head.firstElementChild;
      c;
      c = c.nextElementSibling
    ) {
      if (c.tagName === "STYLE") {
        bodyElement.c.push(
          this.serializeNode(c, e.ReplayRecInner.initialState[1])
        );
        this.deleteAllReplayRecIDs(c);
      } else if (
        c.tagName === "LINK" &&
        c.getAttribute("rel") === "stylesheet"
      ) {
        const href = c.getAttribute("href");
        const lastSlash = href.lastIndexOf("/");
        let key = href;
        if (lastSlash >= 0) {
          key = href.substring(lastSlash + 1);
        }
        const style = {
          "": "STYLE",
          a: { cached: key },
          id: this.nextID++,
        };
        this.iFrameStylesheets[key] = href;
        bodyElement.c.push(style);
      }
    }
    const styles = {
      "": "STYLE",
      c: [{ d: ".scrollbar { opacity: 0 ! important }", id: this.nextID++ }],
      id: this.nextID++,
    };
    bodyElement.c.push(styles);
    const a = {};
    a[REPLAYREC_FRAME] = [e.ReplayRecID, bodyElement];
    actions.push(a);
    for (const aa of e.ReplayRecInner.initialState[1]) {
      actions.push(aa);
    }
    delete e.ReplayRecInner.initialState;
  }

  detachFromIFrame(e) {
    if (e.ReplayRecInner) {
      e.ReplayRecInner.stop();
    }
    e.removeEventListener("load", this.iframeLoadedListener);
  }

  label(name) {
    this.callback(this.observer.takeRecords());
    const a = {};
    a[REPLAYREC_LABEL] = name;
    this.actions.push(a);
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
    if (e.tagName === "IFRAME") {
      this.detachFromIFrame(e);
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
      console.log("MutationObserver exception: ", ex);
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
