import { createContext, destroyContext, domToCanvas } from 'modern-screenshot';
import { GleapNetworkIntercepter } from './Gleap';
import { getFieldValueMask, isBlockedElement, isMaskMarker } from './GleapInputMasking';

// Screenshots for capture requests (contract §8). Desktop Chromium grabs one frame of the current
// tab (getDisplayMedia, one click in the browser's share dialog); everything else, and a declined or
// failed tab capture, renders the DOM in the browser (modern-screenshot). Both paint black boxes over
// everything masked: blocked and masked elements (rr-/gl- classes and the replay options), form
// fields whose value is private (GleapInputMasking), payment frames and flowConfig.capture.maskSelectors.

export const MAX_CAPTURE_EDGE = 2560;
const JPEG_QUALITY = 0.85;
const TRANSPARENT_GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

// Gleap's own UI never appears in a capture.
export const GLEAP_UI_SELECTOR = [
  '.gleap-frame-container',
  '.bb-feedback-button',
  '.gleap-notification-container',
  '.gleap-chatbar',
  '.gleap-capture-root',
  '.gleap-image-view',
  '.bb-capture-editor',
].join(', ');

// Frames that take card details. Their content is not the page's, so no class or field rule can
// reach inside; a tab capture would show what the customer typed.
const PAYMENT_FRAME_HOST_NAMES = [
  'stripe.com',
  'stripe.network',
  'braintreegateway.com',
  'braintree-api.com',
  'paypal.com',
  'adyen.com',
  'adyenpayments.com',
  'checkout.com',
  'squareup.com',
  'squareupsandbox.com',
  'recurly.com',
  'chargebee.com',
  'paddle.com',
  'mollie.com',
  'klarna.com',
  'worldpay.com',
  'authorize.net',
  'razorpay.com',
  '2checkout.com',
  'cybersource.com',
  'spreedly.com',
  'gocardless.com',
  'payu.com',
  'mercadopago.com',
  'paystack.co',
  'flutterwave.com',
];
const PAYMENT_FRAME_HOSTS = new RegExp(
  '(^|\\.)(' + PAYMENT_FRAME_HOST_NAMES.map((host) => host.replace(/\./g, '\\.')).join('|') + ')$',
  'i'
);
const PAYMENT_FRAME_LABEL_WORDS = ['card', 'payment', 'cvc', 'cvv', 'security code', 'expir', 'iban'];
const PAYMENT_FRAME_LABEL = new RegExp(PAYMENT_FRAME_LABEL_WORDS.join('|'), 'i');

/**
 * isPaymentFrame as one CSS selector, for masking the live page (the privacy veil over screen
 * recordings). A host in the src matches a bit more loosely than isPaymentFrame's host test.
 */
export const paymentFrameSelector = () => {
  const parts = ['iframe[allow*="payment" i]'];
  PAYMENT_FRAME_LABEL_WORDS.forEach((word) => {
    parts.push('iframe[title*="' + word + '" i]', 'iframe[name*="' + word + '" i]');
  });
  PAYMENT_FRAME_HOST_NAMES.forEach((host) => {
    parts.push('iframe[src*="//' + host + '" i]', 'iframe[src*=".' + host + '" i]');
  });
  return parts.join(', ');
};

const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Two animation frames (so a style change is painted), or a short timeout in a background tab.
const nextPaint = () =>
  new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        resolve();
      }
    };
    setTimeout(finish, 120);
    try {
      requestAnimationFrame(() => requestAnimationFrame(finish));
    } catch (exp) {
      finish();
    }
  });

const withTimeout = (promise, ms, label) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(label || 'timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });

export const cssEscape = (value) => {
  try {
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
      return CSS.escape(value);
    }
  } catch (exp) {}
  return String(value).replace(/[^a-zA-Z0-9_-]/g, (char) => '\\' + char);
};

const validSelector = (selector) => {
  if (typeof selector !== 'string' || selector.trim().length === 0) {
    return null;
  }
  try {
    document.createDocumentFragment().querySelector(selector);
    return selector.trim();
  } catch (exp) {
    return null;
  }
};

/**
 * One selector for everything masked as a whole (block and mask markers, the site's replay options
 * and flowConfig.capture.maskSelectors). Invalid parts are left out.
 */
export const buildMaskSelector = (privacyOptions, maskSelectors) =>
  maskSelectorParts(privacyOptions, maskSelectors).join(', ');

/**
 * The parts of buildMaskSelector: the block and mask markers first (one selector list), then each
 * valid selector and class name of the site's replay options and flowConfig.capture.maskSelectors.
 */
export const maskSelectorParts = (privacyOptions, maskSelectors) => {
  const options = privacyOptions || {};
  const parts = ['.rr-block, .gl-block, .rr-mask, .gl-mask'];
  [options.blockSelector, options.maskTextSelector]
    .concat(Array.isArray(maskSelectors) ? maskSelectors : [])
    .forEach((selector) => {
      const valid = validSelector(selector);
      if (valid) {
        parts.push(valid);
      }
    });
  [options.blockClass, options.maskTextClass].forEach((className) => {
    if (typeof className === 'string' && className.length > 0) {
      const valid = validSelector('.' + cssEscape(className));
      if (valid) {
        parts.push(valid);
      }
    }
  });
  return parts;
};

// Class names given as a RegExp (blockClass, maskTextClass): no selector can express them.
export const classPatterns = (privacyOptions) => {
  const options = privacyOptions || {};
  return [options.blockClass, options.maskTextClass].filter((value) => value && typeof value.test === 'function');
};

const matchesClassPattern = (element, patterns) => {
  if (!patterns.length || !element.classList) {
    return false;
  }
  for (let i = 0; i < element.classList.length; i++) {
    for (let j = 0; j < patterns.length; j++) {
      if (patterns[j].test(element.classList[i])) {
        return true;
      }
    }
  }
  return false;
};

// Whether the element itself is one of Gleap's UI roots (its ancestors are not tested).
const isGleapUiRoot = (element) => {
  try {
    return !!(element && element.matches && element.matches(GLEAP_UI_SELECTOR));
  } catch (exp) {
    return false;
  }
};

export const isGleapUiElement = (element) => {
  try {
    return !!(element && element.closest && element.closest(GLEAP_UI_SELECTOR));
  } catch (exp) {
    return false;
  }
};

export const isPaymentFrame = (frame) => {
  try {
    const allow = (frame.getAttribute('allow') || '').toLowerCase();
    if (allow.indexOf('payment') !== -1) {
      return true;
    }
    const label = (frame.getAttribute('title') || '') + ' ' + (frame.getAttribute('name') || '');
    if (PAYMENT_FRAME_LABEL.test(label)) {
      return true;
    }
    const src = frame.getAttribute('src');
    if (src) {
      return PAYMENT_FRAME_HOSTS.test(new URL(src, window.location.href).hostname);
    }
  } catch (exp) {}
  return false;
};

const isMaskedField = (field, privacyOptions) => {
  try {
    return !!getFieldValueMask(field, privacyOptions);
  } catch (exp) {
    return true;
  }
};

const unionRect = (a, b) => {
  if (!a || a.width <= 0 || a.height <= 0) {
    return b;
  }
  if (!b || b.width <= 0 || b.height <= 0) {
    return a;
  }
  const left = Math.min(a.left, b.left);
  const top = Math.min(a.top, b.top);
  const right = Math.max(a.left + a.width, b.left + b.width);
  const bottom = Math.max(a.top + a.height, b.top + b.height);
  return { left, top, width: right - left, height: bottom - top };
};

// The element's box together with its content (text or children that overflow it, and elements
// with display: contents that have no box of their own).
const contentRect = (element) => {
  let rect = null;
  try {
    rect = element.getBoundingClientRect();
  } catch (exp) {}
  try {
    const range = (element.ownerDocument || document).createRange();
    range.selectNodeContents(element);
    rect = unionRect(rect, range.getBoundingClientRect());
  } catch (exp) {}
  return rect;
};

/**
 * Where to paint black boxes, in CSS pixels of the top-level viewport: the rects of everything
 * masked, through open shadow roots and same-origin frames. Gleap's own UI is skipped.
 * @param {{privacyOptions?: object, maskSelectors?: string[]}} options
 * @returns {Array<{x: number, y: number, width: number, height: number}>}
 */
export const collectMaskRects = (options = {}) => {
  const rects = [];
  const seen = {};
  const privacyOptions = options.privacyOptions || {};
  const selector = buildMaskSelector(privacyOptions, options.maskSelectors);
  const patterns = classPatterns(privacyOptions);

  const add = (rect, frame) => {
    if (!rect || !(rect.width > 0) || !(rect.height > 0)) {
      return;
    }
    let left = rect.left + frame.x;
    let top = rect.top + frame.y;
    let right = left + rect.width;
    let bottom = top + rect.height;
    if (frame.clip) {
      left = Math.max(left, frame.clip.left);
      top = Math.max(top, frame.clip.top);
      right = Math.min(right, frame.clip.right);
      bottom = Math.min(bottom, frame.clip.bottom);
    }
    const key = [left, top, right, bottom].join(',');
    if (right > left && bottom > top && !seen[key]) {
      seen[key] = true;
      rects.push({ x: left, y: top, width: right - left, height: bottom - top });
    }
  };

  const visit = (root, frame, depth) => {
    if (!root || depth > 8) {
      return;
    }
    const each = (query, callback) => {
      let nodes = [];
      try {
        nodes = root.querySelectorAll(query);
      } catch (exp) {}
      for (let i = 0; i < nodes.length; i++) {
        if (!isGleapUiElement(nodes[i])) {
          callback(nodes[i]);
        }
      }
    };

    each(selector, (element) => add(contentRect(element), frame));
    each('input, textarea, select', (field) => {
      if (isMaskedField(field, privacyOptions)) {
        add(field.getBoundingClientRect(), frame);
      }
    });
    each('iframe, frame', (child) => {
      const rect = child.getBoundingClientRect();
      if (isPaymentFrame(child)) {
        add(rect, frame);
        return;
      }
      let childDocument = null;
      try {
        childDocument = child.contentDocument;
      } catch (exp) {}
      if (childDocument && childDocument.documentElement && rect.width > 0 && rect.height > 0) {
        const x = frame.x + rect.left + (child.clientLeft || 0);
        const y = frame.y + rect.top + (child.clientTop || 0);
        let clip = {
          left: frame.x + rect.left,
          top: frame.y + rect.top,
          right: frame.x + rect.right,
          bottom: frame.y + rect.bottom,
        };
        if (frame.clip) {
          clip = {
            left: Math.max(clip.left, frame.clip.left),
            top: Math.max(clip.top, frame.clip.top),
            right: Math.min(clip.right, frame.clip.right),
            bottom: Math.min(clip.bottom, frame.clip.bottom),
          };
        }
        visit(childDocument, { x, y, clip }, depth + 1);
      }
    });

    // Open shadow roots, and class names given as RegExp in the replay options. Gleap's UI is skipped
    // as a whole.
    try {
      const ownerDocument = root.ownerDocument || root;
      const walker = ownerDocument.createTreeWalker(root, 1, {
        acceptNode: (node) => (isGleapUiRoot(node) ? 2 : 1),
      });
      let node = walker.nextNode();
      while (node) {
        if (node.shadowRoot) {
          visit(node.shadowRoot, frame, depth + 1);
        }
        if (patterns.length && matchesClassPattern(node, patterns)) {
          add(contentRect(node), frame);
        }
        node = walker.nextNode();
      }
    } catch (exp) {}
  };

  visit(document, { x: 0, y: 0, clip: null }, 0);
  return rects;
};

const paintMaskRects = (context, rects, scaleX, scaleY) => {
  context.save();
  context.fillStyle = '#000000';
  for (let i = 0; i < rects.length; i++) {
    const rect = rects[i];
    const x = Math.floor(rect.x * scaleX) - 1;
    const y = Math.floor(rect.y * scaleY) - 1;
    const width = Math.ceil(rect.width * scaleX) + 2;
    const height = Math.ceil(rect.height * scaleY) + 2;
    context.fillRect(x, y, width, height);
  }
  context.restore();
};

const createCanvas = (width, height) => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
};

const releaseCanvas = (canvas) => {
  try {
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  } catch (exp) {}
};

// Samples the canvas at 48x48: 'transparent' when nothing was drawn, 'black' when all is black.
const sampleCanvas = (canvas) => {
  try {
    const size = 48;
    const sample = createCanvas(size, size);
    const context = sample.getContext('2d');
    context.drawImage(canvas, 0, 0, size, size);
    const data = context.getImageData(0, 0, size, size).data;
    releaseCanvas(sample);
    let transparent = true;
    let black = true;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) {
        transparent = false;
        if (data[i] > 12 || data[i + 1] > 12 || data[i + 2] > 12) {
          black = false;
        }
      }
    }
    return transparent ? 'transparent' : black ? 'black' : 'content';
  } catch (exp) {
    return 'content';
  }
};

// The color the page's canvas shows where nothing else is painted.
const pageBackgroundColor = () => {
  const visible = (color) => color && color !== 'transparent' && !/rgba\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(color);
  try {
    const htmlColor = window.getComputedStyle(document.documentElement).backgroundColor;
    if (visible(htmlColor)) {
      return htmlColor;
    }
    const bodyColor = document.body ? window.getComputedStyle(document.body).backgroundColor : null;
    if (visible(bodyColor)) {
      return bodyColor;
    }
  } catch (exp) {}
  return '#ffffff';
};

/**
 * The final image: page background, the capture, black boxes, scaled down to MAX_CAPTURE_EDGE on
 * the long edge, JPEG.
 */
const encodeCapture = ({ canvas, scaleX, scaleY, rects, background }) => {
  const longEdge = Math.max(canvas.width, canvas.height);
  const factor = longEdge > MAX_CAPTURE_EDGE ? MAX_CAPTURE_EDGE / longEdge : 1;
  const output = createCanvas(canvas.width * factor, canvas.height * factor);
  const context = output.getContext('2d');
  context.fillStyle = background || '#ffffff';
  context.fillRect(0, 0, output.width, output.height);
  context.imageSmoothingEnabled = true;
  try {
    context.imageSmoothingQuality = 'high';
  } catch (exp) {}
  context.drawImage(canvas, 0, 0, output.width, output.height);
  paintMaskRects(context, rects, scaleX * factor, scaleY * factor);
  const dataUrl = output.toDataURL('image/jpeg', JPEG_QUALITY);
  const result = { dataUrl, width: output.width, height: output.height };
  releaseCanvas(output);
  return result;
};

export const stopStream = (stream) => {
  try {
    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (exp) {}
      });
    }
  } catch (exp) {}
};

/**
 * Asks for the current tab (desktop Chromium). Must run synchronously inside the Capture click:
 * that click is the user activation the browser requires.
 * @returns {Promise<MediaStream>}
 */
export const requestTabStream = () => {
  let promise;
  try {
    promise = navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: 'browser' },
      audio: false,
      preferCurrentTab: true,
      selfBrowserSurface: 'include',
      surfaceSwitching: 'exclude',
      monitorTypeSurfaces: 'exclude',
    });
  } catch (error) {
    promise = Promise.reject(error);
  }
  // Handled by the caller; this keeps an unused rejection out of the page's console.
  promise.catch(() => {});
  return promise;
};

/**
 * One frame of a video track: ImageCapture.grabFrame, then MediaStreamTrackProcessor, then a
 * <video> element (requestVideoFrameCallback).
 * @returns {Promise<{source: CanvasImageSource, width: number, height: number, release: function}>}
 */
const grabFrame = (track, stream) => {
  const viaImageCapture = () => {
    if (typeof ImageCapture !== 'function') {
      return Promise.resolve(null);
    }
    return withTimeout(new ImageCapture(track).grabFrame(), 3000, 'grab-timeout').then(
      (bitmap) =>
        bitmap && bitmap.width > 0
          ? { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close && bitmap.close() }
          : null,
      () => null
    );
  };

  const viaTrackProcessor = () => {
    if (typeof MediaStreamTrackProcessor !== 'function') {
      return Promise.resolve(null);
    }
    let reader = null;
    const cancel = () => {
      try {
        if (reader) {
          reader.cancel();
        }
      } catch (exp) {}
    };
    try {
      reader = new MediaStreamTrackProcessor({ track }).readable.getReader();
    } catch (exp) {
      return Promise.resolve(null);
    }
    return withTimeout(reader.read(), 3000, 'read-timeout').then(
      (result) => {
        cancel();
        const frame = result && result.value;
        return frame
          ? {
              source: frame,
              width: frame.displayWidth || frame.codedWidth,
              height: frame.displayHeight || frame.codedHeight,
              release: () => frame.close(),
            }
          : null;
      },
      () => {
        cancel();
        return null;
      }
    );
  };

  const viaVideo = () => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    const release = () => {
      try {
        video.pause();
        video.srcObject = null;
      } catch (exp) {}
    };
    const firstFrame = new Promise((resolve) => {
      if (typeof video.requestVideoFrameCallback === 'function') {
        video.requestVideoFrameCallback(() => resolve());
      } else {
        video.addEventListener('loadeddata', () => setTimeout(resolve, 60), { once: true });
      }
    });
    return withTimeout(Promise.resolve(video.play()), 3000, 'play-timeout')
      .then(() => withTimeout(firstFrame, 3000, 'frame-timeout'))
      .then(
        () => ({ source: video, width: video.videoWidth, height: video.videoHeight, release }),
        (error) => {
          release();
          throw error;
        }
      );
  };

  return viaImageCapture()
    .then((frame) => frame || viaTrackProcessor())
    .then((frame) => frame || viaVideo());
};

/**
 * Takes one frame of the shared tab with Gleap's UI hidden, then stops sharing right away.
 * Rejects when the shared surface is not this tab (or no usable frame came).
 */
export const captureFromTabStream = (stream, { setUiHidden, privacyOptions, maskSelectors }) => {
  const track = stream && stream.getVideoTracks ? stream.getVideoTracks()[0] : null;
  const finish = () => {
    stopStream(stream);
    setUiHidden(false);
  };
  if (!track) {
    finish();
    return Promise.reject(new Error('no-video-track'));
  }
  let settings = {};
  try {
    settings = track.getSettings ? track.getSettings() : {};
  } catch (exp) {}
  if (settings.displaySurface && settings.displaySurface !== 'browser') {
    finish();
    return Promise.reject(new Error('not-this-tab'));
  }

  const attempt = (index) => {
    if (index >= 3) {
      throw new Error('no-usable-frame');
    }
    if (track.readyState === 'ended') {
      throw new Error('track-ended');
    }
    const rectsBefore = collectMaskRects({ privacyOptions, maskSelectors });
    return grabFrame(track, stream).then((frame) => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const rects = rectsBefore.concat(collectMaskRects({ privacyOptions, maskSelectors }));
      let canvas = null;
      try {
        if (frame && frame.width > 0 && frame.height > 0) {
          // The frame must show this viewport (a different tab, or a resize in between, doesn't).
          const viewportRatio = viewportWidth / viewportHeight;
          if (Math.abs(frame.width / frame.height - viewportRatio) / viewportRatio <= 0.04) {
            canvas = createCanvas(frame.width, frame.height);
            canvas.getContext('2d').drawImage(frame.source, 0, 0, frame.width, frame.height);
            // The first frames of a new capture can be black.
            if (index < 2 && sampleCanvas(canvas) !== 'content') {
              releaseCanvas(canvas);
              canvas = null;
            }
          }
        }
      } finally {
        try {
          if (frame) {
            frame.release();
          }
        } catch (exp) {}
      }
      if (!canvas) {
        return wait(150).then(() => attempt(index + 1));
      }
      return {
        canvas,
        scaleX: canvas.width / viewportWidth,
        scaleY: canvas.height / viewportHeight,
        rects,
        background: '#000000',
        method: 'tab',
      };
    });
  };

  setUiHidden(true);
  return nextPaint()
    .then(() => attempt(0))
    .then(
      (capture) => {
        finish();
        return capture;
      },
      (error) => {
        finish();
        throw error;
      }
    );
};

const cloneNamesMatch = (original, clone) => {
  const a = String(original.nodeName).toUpperCase();
  const b = String(clone.nodeName).toUpperCase();
  if (a === b) {
    return true;
  }
  if (a === 'IFRAME' || a === 'FRAME') {
    return b === 'HTML';
  }
  if (a === 'VIDEO' || a === 'CANVAS') {
    return b === 'IMG' || b === 'CANVAS' || b === 'VIDEO';
  }
  return false;
};

const hasSameOriginDocument = (frame) => {
  try {
    return !!(frame.contentDocument && frame.contentDocument.documentElement);
  } catch (exp) {
    return false;
  }
};

const isViewportFilling = (rect) =>
  Math.abs(rect.left) <= 2 &&
  Math.abs(rect.top) <= 2 &&
  Math.abs(rect.right - window.innerWidth) <= 20 &&
  Math.abs(rect.bottom - window.innerHeight) <= 20;

/**
 * The modern-screenshot hooks that keep the clone private and show the scrolled state. The filter
 * runs right before an element is cloned and onCloneEachNode right after it (children first), so a
 * stack pairs every clone with its original. If a pair ever doesn't match, the clone is left
 * alone: the black boxes painted from the live page still cover everything masked.
 */
const createCloneHooks = (root, privacyOptions, maskSelectors, pageScroll) => {
  const stack = [root];
  const extraSelector = (Array.isArray(maskSelectors) ? maskSelectors : []).map(validSelector).filter(Boolean).join(', ');
  const scrollingElement = document.scrollingElement || document.documentElement;
  // canYield: set once modern-screenshot's style sandbox is loaded (see renderDom).
  const state = { broken: false, offsetX: 0, offsetY: 0, lastYield: now(), canYield: false };

  const filter = (node) => {
    if (!node || node.nodeType !== 1) {
      return true;
    }
    const tag = String(node.tagName).toUpperCase();
    // Rendered as text inside an SVG image, where scripting is off.
    if (tag === 'NOSCRIPT' || tag === 'TEMPLATE') {
      return false;
    }
    // Gleap's UI (skipped with its subtree), and modern-screenshot's own style sandbox.
    if (isGleapUiRoot(node) || (typeof node.id === 'string' && node.id.indexOf('__SANDBOX__') === 0)) {
      return false;
    }
    stack.push(node);
    // A same-origin frame's document element is cloned (and reported) as well.
    if ((tag === 'IFRAME' || tag === 'FRAME') && hasSameOriginDocument(node)) {
      stack.push(node);
    }
    return true;
  };

  const hide = (clone) => clone.style && clone.style.setProperty('visibility', 'hidden', 'important');

  const maskClone = (original, clone) => {
    const tag = String(original.tagName).toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      let mask = null;
      try {
        mask = getFieldValueMask(original, privacyOptions);
      } catch (exp) {
        mask = () => '';
      }
      if (mask) {
        const masked = mask(original.value);
        clone.setAttribute('value', typeof masked === 'string' ? masked : '');
        if (tag === 'TEXTAREA') {
          clone.textContent = typeof masked === 'string' ? masked : '';
        }
        if (tag === 'SELECT') {
          const selected = clone.querySelectorAll('option[selected]');
          for (let i = 0; i < selected.length; i++) {
            selected[i].removeAttribute('selected');
          }
        }
        hide(clone);
      }
      return;
    }
    const frame = tag === 'IFRAME' || tag === 'FRAME';
    let masked = false;
    try {
      masked =
        isBlockedElement(original, privacyOptions) ||
        isMaskMarker(original, privacyOptions) ||
        (!!extraSelector && original.matches(extraSelector)) ||
        (frame && isPaymentFrame(original));
    } catch (exp) {}
    if (masked) {
      hide(clone);
    }
    if (frame && String(clone.nodeName).toUpperCase() === 'HTML') {
      // A same-origin frame is cloned as its document element, which is not a replaced element:
      // inline it would ignore the frame's size and let the rest of the page move up.
      try {
        const display = window.getComputedStyle(original).display;
        clone.style.setProperty('display', display === 'inline' ? 'inline-block' : display, 'important');
        clone.style.setProperty('overflow', 'hidden', 'important');
      } catch (exp) {}
    }
  };

  const restoreScroll = (original, clone) => {
    if (original === document.documentElement || original === scrollingElement) {
      return;
    }
    const top = original.scrollTop || 0;
    const left = original.scrollLeft || 0;
    if (!top && !left) {
      return;
    }
    let rect = null;
    try {
      rect = original.getBoundingClientRect();
    } catch (exp) {}
    if (rect && isViewportFilling(rect)) {
      // A scroller that fills the viewport (body or an app root) scrolls like the page: unclip it and
      // shift the whole page, so fixed and sticky elements keep their places.
      state.offsetX += left;
      state.offsetY += top;
      clone.style.setProperty('overflow', 'visible', 'important');
      return;
    }
    const children = clone.children || [];
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (!child.style || child.style.position === 'fixed') {
        continue;
      }
      child.style.transform = 'translate(' + -left + 'px, ' + -top + 'px) ' + (child.style.transform || '');
    }
  };

  const onCloneEachNode = (clone) => {
    if (!clone || clone.nodeType !== 1) {
      return undefined;
    }
    const original = stack.pop();
    if (!original || !cloneNamesMatch(original, clone)) {
      state.broken = true;
    }
    if (!state.broken) {
      try {
        maskClone(original, clone);
        restoreScroll(original, clone);
      } catch (exp) {}
    }
    // Cloning reads every element's computed style: give the page a chance to breathe.
    if (state.canYield && now() - state.lastYield > 40) {
      state.lastYield = now();
      return wait(0);
    }
    return undefined;
  };

  const onCloneNode = (rootClone) => {
    if (!state.broken && (state.offsetX || state.offsetY) && rootClone && rootClone.style) {
      rootClone.style.top = -(pageScroll.y + state.offsetY) + 'px';
      rootClone.style.left = -(pageScroll.x + state.offsetX) + 'px';
    }
  };

  return { filter, onCloneEachNode, onCloneNode, state };
};

// modern-screenshot reads default styles from a hidden srcdoc frame it creates on first use. Made and
// loaded up front instead: the render then may yield to the page without racing the frame's load.
const createStyleSandbox = () =>
  new Promise((resolve) => {
    const frame = document.createElement('iframe');
    frame.id = '__SANDBOX__gleap';
    frame.width = '0';
    frame.height = '0';
    frame.tabIndex = -1;
    frame.setAttribute('aria-hidden', 'true');
    frame.style.visibility = 'hidden';
    frame.style.position = 'fixed';
    let settled = false;
    const done = () => {
      if (settled) {
        return;
      }
      settled = true;
      let ready = false;
      try {
        const doc = frame.contentDocument;
        ready = !!(doc && doc.body && doc.readyState === 'complete' && frame.contentWindow.location.href === 'about:srcdoc');
      } catch (exp) {}
      if (!ready) {
        frame.remove();
      }
      resolve(ready ? frame : null);
    };
    frame.addEventListener('load', done);
    setTimeout(done, 1500);
    try {
      (document.body || document.documentElement).appendChild(frame);
      frame.srcdoc = '<!DOCTYPE html><meta charset="UTF-8"><title></title><body>';
    } catch (exp) {
      done();
    }
  });

// Images still loading inside the viewport are worth waiting for; offscreen lazy images never load.
const mediaLoadingInViewport = () => {
  try {
    const viewportHeight = window.innerHeight;
    const media = document.querySelectorAll('img, video');
    for (let i = 0; i < media.length; i++) {
      const element = media[i];
      const loading =
        element.tagName === 'IMG' ? !element.complete : element.readyState < 2 && !!(element.currentSrc || element.src);
      if (!loading) {
        continue;
      }
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < viewportHeight) {
        return true;
      }
    }
  } catch (exp) {}
  return false;
};

// Images far below the fold don't show; they get a transparent pixel instead of a download.
const createImageFetcher = () => {
  try {
    const limit = window.innerHeight + 400;
    const below = new Set();
    const needed = new Set();
    const images = document.images;
    for (let i = 0; i < images.length; i++) {
      const url = images[i].currentSrc || images[i].src;
      if (!url) {
        continue;
      }
      if (images[i].getBoundingClientRect().top > limit) {
        below.add(url);
      } else {
        needed.add(url);
      }
    }
    needed.forEach((url) => below.delete(url));
    if (below.size === 0) {
      return null;
    }
    return (url) => Promise.resolve(below.has(url) ? TRANSPARENT_GIF : false);
  } catch (exp) {
    return null;
  }
};

/**
 * Renders the visible part of the page in the browser.
 */
export const renderDom = ({ privacyOptions, maskSelectors }) => {
  const root = document.documentElement;
  const width = Math.max(1, root.clientWidth || window.innerWidth);
  const height = Math.max(1, root.clientHeight || window.innerHeight);
  const scale = Math.min(Math.max(window.devicePixelRatio || 1, 1), MAX_CAPTURE_EDGE / Math.max(width, height));
  const pageScroll = { x: window.scrollX || 0, y: window.scrollY || 0 };
  const rects = collectMaskRects({ privacyOptions, maskSelectors });
  const background = pageBackgroundColor();
  const hooks = createCloneHooks(root, privacyOptions, maskSelectors, pageScroll);

  // Its asset downloads (fonts, images) are not the app's traffic: keep them out of the network logs.
  let interceptor = null;
  let wasStopped = false;
  try {
    interceptor = GleapNetworkIntercepter.getInstance();
    wasStopped = !!interceptor.stopped;
    interceptor.setStopped(true);
  } catch (exp) {
    interceptor = null;
  }

  let context = null;
  const cleanup = () => {
    if (context) {
      try {
        destroyContext(context);
      } catch (exp) {}
      context = null;
    }
    if (interceptor) {
      interceptor.setStopped(wasStopped);
    }
  };

  return Promise.resolve()
    .then(() =>
      createContext(root, {
        width,
        height,
        scale,
        backgroundColor: null,
        filter: hooks.filter,
        onCloneEachNode: hooks.onCloneEachNode,
        onCloneNode: hooks.onCloneNode,
        // The clone isn't scrollable: shift the page instead. Fixed and sticky elements keep their
        // places relative to the image, as they do relative to the viewport.
        style: {
          position: 'relative',
          top: -pageScroll.y + 'px',
          left: -pageScroll.x + 'px',
          overflow: 'visible',
        },
        features: { restoreScrollPosition: false },
        fetchFn: createImageFetcher(),
        // How long to wait for images that are still loading; the render itself gets longer below.
        timeout: mediaLoadingInViewport() ? 3000 : 50,
      })
    )
    .then((created) => {
      context = created;
      context.timeout = 8000;
      return createStyleSandbox();
    })
    .then((sandbox) => {
      if (sandbox) {
        // destroyContext removes it again.
        context.sandbox = sandbox;
        hooks.state.canYield = true;
      }
      return domToCanvas(context);
    })
    .then(
      (canvas) => {
        cleanup();
        if (sampleCanvas(canvas) === 'transparent') {
          releaseCanvas(canvas);
          throw new Error('render-empty');
        }
        return { canvas, scaleX: canvas.width / width, scaleY: canvas.height / height, rects, background, method: 'dom' };
      },
      (error) => {
        cleanup();
        throw error;
      }
    );
};

/**
 * Takes the screenshot: the shared tab when `streamPromise` (from requestTabStream) delivers one,
 * the DOM render otherwise (declined, cancelled, another surface or any error) — without asking again.
 * @returns {Promise<{dataUrl: string, width: number, height: number, method: 'tab'|'dom'}>}
 */
export const captureScreenshot = ({ streamPromise, setUiHidden, privacyOptions, maskSelectors, isActive }) => {
  const active = () => !isActive || isActive();
  const fromTab = streamPromise
    ? streamPromise.then(
        (stream) => {
          if (!active()) {
            stopStream(stream);
            return null;
          }
          return captureFromTabStream(stream, { setUiHidden, privacyOptions, maskSelectors }).catch(() => null);
        },
        () => null
      )
    : Promise.resolve(null);

  return fromTab
    .then((capture) => {
      if (!active()) {
        if (capture) {
          releaseCanvas(capture.canvas);
        }
        throw new Error('aborted');
      }
      return capture || renderDom({ privacyOptions, maskSelectors });
    })
    .then((capture) => {
      try {
        const encoded = encodeCapture(capture);
        encoded.method = capture.method;
        return encoded;
      } finally {
        releaseCanvas(capture.canvas);
      }
    });
};
