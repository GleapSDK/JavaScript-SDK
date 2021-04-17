import {
  REPLAYREC_CANVAS_DATA,
  REPLAYREC_FORCE_STYLE_FLUSH,
  REPLAYREC_INPUT,
  REPLAYREC_MOUSE_DOWN,
  REPLAYREC_MOUSE_MOVE,
  REPLAYREC_MOUSE_UP,
} from "./ReplayConstants";
import { startScreenCapture } from "./ScreenCapture";

export default class ReplayRecFrame {
  constructor(win, node, rec, iframeElement) {
    this.win = win;
    this.node = node;
    this.rec = rec;
    this.iframeElement = iframeElement;
    this.initialState = {};
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
      let x = event.clientX;
      let y = event.clientY;
      let frameElem = this.iframeElement;
      let target = event.target;
      let mouseEventNode = this.node;
      // Translate to root document coordinates.
      while (frameElem) {
        const frameRect = frameElem.getBoundingClientRect();
        // XXX assumes no border/padding on the IFRAME. handling that is a pain.
        x += frameRect.left;
        y += frameRect.top;
        target = frameElem;
        const nextInner = frameElem.ownerDocument.ReplayRecInner;
        mouseEventNode = nextInner.node;
        frameElem = nextInner.iframeElement;
      }
      if (!mouseEventNode.contains(target)) {
        return;
      }
      this.flushObserver();
      const nodeRect = mouseEventNode.getBoundingClientRect();
      x -= nodeRect.left;
      y -= nodeRect.top;
      let key;
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
    this.inputListener = (event) => {
      if (!this.node.contains(event.target)) {
        return;
      }
      const id = this.prepEvent(event);
      if (id) {
        let value = null;
        // For contenteditable elements, the DOM changes will just
        // be recorded and we don't have to do anything here except
        // record an input event so the caret can be updated.
        if ("value" in event.target) {
          value = event.target.value;
        }
        // eslint-disable-next-line no-console
        console.log(
          value,
          "just in order to have tsc tolerating the unused variable for now"
        );
        this.rec.actions.push({
          [REPLAYREC_INPUT]: [id, event.target.value],
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
    this.focusListener = () => this.rec.evaluateFocus();
    node.ownerDocument.ReplayRecInner = this;

    // Grab initial HTML.
    startScreenCapture({
      x: window.scrollX,
      y: window.scrollY,
    }).then((data) => {
      this.initialState = data;
    });
    
    this.observer = new MutationObserver(rec.observerCallback);
    this.observer.observe(node, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });
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
  }
  stop() {
    this.flushObserver();
    this.observer.disconnect();
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
    this.rec.deleteAllReplayRecIDs(this.node);
  }
  flushObserver() {
    this.rec.observerCallback(this.observer.takeRecords());
  }
}
