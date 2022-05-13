import {
  REPLAYREC_CANVAS_DATA,
  REPLAYREC_FORCE_STYLE_FLUSH,
  REPLAYREC_INPUT,
  REPLAYREC_INPUTCHECK,
  REPLAYREC_MOUSE_DOWN,
  REPLAYREC_MOUSE_MOVE,
  REPLAYREC_MOUSE_UP,
  REPLAYREC_MAINSCROLL,
} from "./GleapReplayConstants";

export default class GleapReplayRecFrame {
  constructor(win, node, rec) {
    this.win = win;
    this.node = node;
    this.rec = rec;
    this.initialState = {};
    this.initialActions = [];

    this.prepEvent = (event) => {
      var _a;
      this.flushObserver();

      return (
        ((_a = event.target) === null || _a === void 0
          ? void 0
          : _a.ReplayRecID) || 0
      );
    };

    this.mouseListener = (event) => {
      var x = event.clientX;
      var y = event.clientY;
      var target = event.target;
      var mouseEventNode = this.node;
      if (!mouseEventNode.contains(target)) {
        return;
      }

      this.flushObserver();
      const nodeRect = mouseEventNode.getBoundingClientRect();
      x -= nodeRect.left;
      y -= nodeRect.top;
      var key;
      switch (event.type) {
        case "mousemove":
          key = REPLAYREC_MOUSE_MOVE;
          break;
        case "mouseup":
          key = REPLAYREC_MOUSE_UP;
          break;
        case "mousedown":
          key = REPLAYREC_MOUSE_DOWN;
          break;
        default:
          throw new Error(`Unknown event type: ${event.type}`);
      }
      this.rec.actions.push({ [key]: [Math.round(x), Math.round(y)] });
    };

    this.scrollListener = (event) => {
      if (!this.node.contains(event.target)) {
        return;
      }
      const id = this.prepEvent(event);
      if (id) {
        this.rec.pushScrollAction(id, event.target);
      }
    };

    this.mainScrollListener = () => {
      this.flushObserver();
      this.rec.actions.push({
        [REPLAYREC_MAINSCROLL]: [window.scrollX, window.scrollY],
      });
    };

    this.inputListener = (event) => {
      if (!this.node.contains(event.target)) {
        return;
      }

      const id = this.prepEvent(event);
      if (id && "value" in event.target) {
        var val = event.target.value;
        if (event.target.type === "password" && val && val.length) {
          val = new Array(val.length + 1).join("*");
        }
        if (event.target.getAttribute("gleap-ignore") === "value") {
          val = new Array(val.length + 1).join("*");
        }
        this.rec.actions.push({
          [REPLAYREC_INPUT]: [id, val],
        });
      }

      if (id && "type" in event.target && event.target.type === "checkbox") {
        var checked = event.target.checked;
        this.rec.actions.push({
          [REPLAYREC_INPUTCHECK]: [id, checked],
        });
      }
    };

    this.flushListener = (event) => {
      if (!this.node.contains(event.target)) {
        return;
      }
      const id = this.prepEvent(event);
      if (id) {
        this.rec.actions.push({
          [REPLAYREC_FORCE_STYLE_FLUSH]: id,
        });
      }
    };

    this.canvasListener = (event) => {
      if (!this.node.contains(event.target)) {
        return;
      }
      const id = this.prepEvent(event);
      if (id) {
        this.rec.actions.push({
          [REPLAYREC_CANVAS_DATA]: [id, event.target.toDataURL(), "didDraw"],
        });
      }
    };

    this.focusListener = () => { };

    node.ownerDocument.ReplayRecInner = this;

    var initialActions = [];
    var serializedNode = this.rec.serializeNode(this.node, initialActions);
    if (serializedNode) {
      this.initialState = serializedNode;
      this.initialActions = initialActions;

      // Fix for patched mutation observer.
      var GleapMutationObserver = MutationObserver;
      if (
        window &&
        window.Zone &&
        window[window.Zone.__symbol__("MutationObserver")]
      ) {
        GleapMutationObserver =
          window[window.Zone.__symbol__("MutationObserver")];
      }
      this.observer = new GleapMutationObserver(rec.observerCallback);
      this.observer.observe(node, {
        attributes: true,
        characterData: true,
        childList: true,
        subtree: true,
      });

      // Get scroll position
      this.mainScrollListener();

      win.addEventListener("input", this.inputListener, {
        capture: true,
        passive: true,
      });
      win.addEventListener("mousemove", this.mouseListener, {
        capture: true,
        passive: true,
      });
      win.addEventListener("mousedown", this.mouseListener, {
        capture: true,
        passive: true,
      });
      win.addEventListener("mouseup", this.mouseListener, {
        capture: true,
        passive: true,
      });
      win.addEventListener("forceStyleFlush", this.flushListener, {
        capture: true,
        passive: true,
      });
      win.addEventListener("didDrawCanvas", this.canvasListener, {
        capture: true,
        passive: true,
      });
      win.addEventListener("focus", this.focusListener, {
        capture: true,
        passive: true,
      });
      win.addEventListener("scroll", this.mainScrollListener, {
        capture: true,
        passive: true,
      });
    }
  }

  stop() {
    this.flushObserver();
    if (this.observer) {
      this.observer.disconnect();
    }
    this.win.removeEventListener("input", this.inputListener, {
      capture: true,
      passive: true,
    });
    this.win.removeEventListener("mousemove", this.mouseListener, {
      capture: true,
      passive: true,
    });
    this.win.removeEventListener("mousedown", this.mouseListener, {
      capture: true,
      passive: true,
    });
    this.win.removeEventListener("mouseup", this.mouseListener, {
      capture: true,
      passive: true,
    });
    this.win.removeEventListener("forceStyleFlush", this.flushListener, {
      capture: true,
      passive: true,
    });
    this.win.removeEventListener("didDrawCanvas", this.canvasListener, {
      capture: true,
      passive: true,
    });
    this.win.removeEventListener("focus", this.focusListener, {
      capture: true,
      passive: true,
    });
    this.win.removeEventListener("scroll", this.mainScrollListener, {
      capture: true,
      passive: true,
    });
    this.rec.deleteAllReplayRecIDs(this.node);
  }

  flushObserver() {
    if (this.observer && typeof this.observer.takeRecords !== "undefined") {
      this.rec.observerCallback(this.observer.takeRecords());
    }
  }
}
