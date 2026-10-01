import { createContext, destroyContext, domToCanvas } from 'modern-screenshot';
import { GleapNetworkIntercepter } from './Gleap';
import { getFieldValueMask, isBlockedElement, isMaskMarker } from './GleapInputMasking';
import { now, yieldToPage } from './GleapCaptureTasks';

// Screenshots for capture requests (contract §8). Desktop Chromium grabs one frame of the current
// tab (getDisplayMedia, one click in the browser's share dialog); everything else, and a declined or
// failed tab capture, renders the DOM in the browser (modern-screenshot). Both paint black boxes over
// everything masked: blocked and masked elements (rr-/gl- classes and the replay options), form
// fields whose value is private (GleapInputMasking), payment frames and flowConfig.capture.maskSelectors.

export const MAX_CAPTURE_EDGE = 2560;
const JPEG_QUALITY = 0.85;
const TRANSPARENT_GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

// Gleap's own UI never appears in a capture: the widget, launcher, notifications, banners, modals,
// tooltips, tours, the admin helper and the capture UI itself.
export const GLEAP_UI_SELECTOR = [
  '.gleap-frame-container',
  '.bb-feedback-button',
  '.gleap-notification-container',
  '.gleap-chatbar',
  '.gleap-capture-root',
  '.gleap-image-view',
  '.bb-capture-editor',
  '.gleap-b',
  '.gleap-modal-wrapper',
  '.gleap-tooltip',
  '.gleap-tour-popover',
  '.gleap-tour-overlay',
  '#copilot-pointer-container',
  '#copilot-joined-container',
  '.gleap-audio-unmute-modal-overlay',
  '.gleap-admin-frame-container',
  '.gleap-admin-collapse-ui',
  '.click-wave',
].join(', ');

// Gleap UI that can sit in the page's flow (checklists placed in the page, tooltip hotspots inside
// the page's elements): left blank in a capture, keeping its space.
export const GLEAP_INFLOW_UI_SELECTOR = 'gleap-checklist, .gleap-tooltip-anchor';

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

// The longest Gleap's UI (the capture bar too) stays hidden for a tab frame.
const TAB_CAPTURE_MAX_MS = 15000;

// Rects from getBoundingClientRect are in the layout viewport; a tab frame shows the visual viewport
// (pinch zoom) stretched over the window.
const toVisualViewport = (rects) => {
  const viewport = window.visualViewport;
  const zoom = viewport && viewport.scale ? viewport.scale : 1;
  if (!viewport || (zoom === 1 && !viewport.offsetLeft && !viewport.offsetTop)) {
    return rects;
  }
  return rects.map((rect) => ({
    x: (rect.x - viewport.offsetLeft) * zoom,
    y: (rect.y - viewport.offsetTop) * zoom,
    width: rect.width * zoom,
    height: rect.height * zoom,
  }));
};

/**
 * Takes one frame of the shared tab with Gleap's UI hidden, then stops sharing right away.
 * Rejects when the shared surface is not this tab, no usable frame came, or after
 * TAB_CAPTURE_MAX_MS.
 */
export const captureFromTabStream = (stream, { setUiHidden, privacyOptions, maskSelectors, isActive }) => {
  const track = stream && stream.getVideoTracks ? stream.getVideoTracks()[0] : null;
  let done = false;
  const finish = () => {
    done = true;
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
    if (done) {
      throw new Error('tab-timeout');
    }
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
      const rects = toVisualViewport(rectsBefore.concat(collectMaskRects({ privacyOptions, maskSelectors })));
      let canvas = null;
      try {
        if (!done && frame && frame.width > 0 && frame.height > 0) {
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
      if (done) {
        releaseCanvas(canvas);
        throw new Error('tab-timeout');
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
  return new Promise((resolve, reject) => {
    let watch = null;
    const settle = (error, capture) => {
      if (done) {
        if (capture) {
          releaseCanvas(capture.canvas);
        }
        return;
      }
      clearInterval(watch);
      finish();
      if (error) {
        reject(error);
      } else {
        resolve(capture);
      }
    };
    // Cancelled meanwhile: stop sharing right away.
    watch = setInterval(() => {
      try {
        if (isActive && !isActive()) {
          settle(new Error('aborted'));
        }
      } catch (exp) {}
    }, 200);
    withTimeout(
      nextPaint().then(() => attempt(0)),
      TAB_CAPTURE_MAX_MS,
      'tab-timeout'
    ).then(
      (capture) => settle(null, capture),
      (error) => settle(error)
    );
  });
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

// Everything this close to the viewport is rendered; boxes further away are rendered empty.
const VIEWPORT_MARGIN = 200;
// The DOM render gives up after this long or this many elements (the customer can upload a file).
const RENDER_DEADLINE_MS = 10000;
const MAX_RENDER_ELEMENTS = 10000;
// Safari and Firefox decode the images inside the rendered SVG late, so modern-screenshot redraws
// it once per image, waiting longer each time (fixSvgXmlDecode). A couple of redraws do the job.
const MAX_IMAGE_REDRAWS = 2;
const IMAGE_PROPERTIES = ['background-image', 'border-image-source', 'mask-image', '-webkit-mask-image', 'list-style-image'];

const nearViewport = (rect, box) =>
  (rect.width > 0 || rect.height > 0) &&
  rect.bottom > box.top &&
  rect.top < box.bottom &&
  rect.right > box.left &&
  rect.left < box.right;

const childElements = (element) => {
  const list = [];
  const add = (nodes) => {
    for (let i = 0; i < nodes.length; i++) {
      list.push(nodes[i]);
    }
  };
  try {
    if (element.shadowRoot) {
      add(element.shadowRoot.children);
    }
    add(element.children);
  } catch (exp) {}
  return list;
};

/**
 * The elements (with a box) whose whole subtree, open shadow roots included, is away from the
 * viewport. Measured in slices.
 * @returns {Promise<Set<Element>>}
 */
const findOffscreenElements = (isStopped) =>
  new Promise((resolve, reject) => {
    const offscreen = new Set();
    const box = {
      top: -VIEWPORT_MARGIN,
      left: -VIEWPORT_MARGIN,
      bottom: window.innerHeight + VIEWPORT_MARGIN,
      right: window.innerWidth + VIEWPORT_MARGIN,
    };
    const root = document.documentElement;
    const stack = [{ element: root, children: childElements(root), index: 0, visible: true, sized: false }];
    const step = () => {
      try {
        if (isStopped()) {
          reject(new Error('aborted'));
          return;
        }
        const start = now();
        while (stack.length) {
          const frame = stack[stack.length - 1];
          if (frame.index < frame.children.length) {
            const child = frame.children[frame.index];
            frame.index += 1;
            let rect = null;
            try {
              rect = child.getBoundingClientRect();
            } catch (exp) {}
            stack.push({
              element: child,
              children: childElements(child),
              index: 0,
              visible: !!rect && nearViewport(rect, box),
              sized: !!rect && rect.width > 0 && rect.height > 0,
            });
          } else {
            stack.pop();
            if (stack.length) {
              if (frame.visible) {
                stack[stack.length - 1].visible = true;
              } else if (frame.sized) {
                offscreen.add(frame.element);
              }
            }
          }
          if (stack.length && now() - start > 25) {
            yieldToPage().then(step);
            return;
          }
        }
        resolve(offscreen);
      } catch (error) {
        reject(error);
      }
    };
    step();
  });

// Boxes whose size and place don't depend on their content (it is in the clone as copied width and
// height): no margin of a child collapses through them. Inline content and table parts never.
const BOX_DISPLAYS = { block: true, 'flow-root': true, 'list-item': true, flex: true, grid: true, table: true };
const CONTAINING_DISPLAYS = { flex: true, 'inline-flex': true, grid: true, 'inline-grid': true };

const canEmpty = (element) => {
  try {
    if (element.ownerDocument !== document || element === document.body) {
      return false;
    }
    const style = window.getComputedStyle(element);
    if (!BOX_DISPLAYS[style.display]) {
      return false;
    }
    if (style.display !== 'block' && style.display !== 'list-item') {
      return true;
    }
    const scrolls = (value) => value === 'hidden' || value === 'scroll' || value === 'auto';
    if (
      scrolls(style.overflowX) ||
      scrolls(style.overflowY) ||
      style.float !== 'none' ||
      style.position === 'absolute' ||
      style.position === 'fixed'
    ) {
      return true;
    }
    const parent = element.parentElement;
    if (parent && CONTAINING_DISPLAYS[window.getComputedStyle(parent).display]) {
      return true;
    }
    const edge = (side) => parseFloat(style['padding' + side]) > 0 || parseFloat(style['border' + side + 'Width']) > 0;
    return edge('Top') && edge('Bottom');
  } catch (exp) {
    return false;
  }
};

// modern-screenshot never gets a <video> (it waits for a seek that may never come, e.g. for camera
// streams or videos that don't load): this takes its place, with its computed style. The current
// frame when the page may read it, else the poster, else a dark box.
const createVideoPlaceholder = (video, { offscreen, masked }) => {
  let src = null;
  if (!offscreen && !masked) {
    try {
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (video.readyState >= 2 && width > 0 && height > 0) {
        const factor = Math.min(1, 1280 / Math.max(width, height));
        const canvas = createCanvas(width * factor, height * factor);
        try {
          canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
          src = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
        } finally {
          releaseCanvas(canvas);
        }
      }
    } catch (exp) {
      // A cross-origin video taints the canvas.
      src = null;
    }
    if (!src) {
      try {
        src = video.poster || null;
      } catch (exp) {}
    }
  }
  const placeholder = document.createElement(src ? 'img' : 'div');
  try {
    const style = window.getComputedStyle(video);
    for (let i = 0; i < style.length; i++) {
      const name = style[i];
      // Visibility stays inherited, so a masked (hidden) container hides this as well.
      if (name !== 'visibility') {
        placeholder.style.setProperty(name, style.getPropertyValue(name));
      }
    }
  } catch (exp) {}
  if (src) {
    placeholder.setAttribute('src', src);
    placeholder.setAttribute('alt', '');
  } else {
    placeholder.style.setProperty('background-color', '#1f2430');
  }
  if (masked) {
    placeholder.style.setProperty('visibility', 'hidden', 'important');
  }
  return placeholder;
};

/**
 * The modern-screenshot hooks that keep the clone private, small and show the scrolled state. The
 * filter runs right before a node is cloned and onCloneEachNode right after an element (children
 * first), so a stack pairs every clone with its original. If a pair ever doesn't match, the clone
 * is left alone: the black boxes painted from the live page still cover everything masked.
 * checkActive throws to stop the render (cancelled or out of time).
 */
const createCloneHooks = (root, privacyOptions, maskSelectors, pageScroll, checkActive) => {
  const stack = [root];
  const extraSelector = (Array.isArray(maskSelectors) ? maskSelectors : []).map(validSelector).filter(Boolean).join(', ');
  const scrollingElement = document.scrollingElement || document.documentElement;
  // offscreen: from findOffscreenElements; canYield: set once the style sandbox is in place.
  const state = {
    broken: false,
    offsetX: 0,
    offsetY: 0,
    lastYield: now(),
    canYield: false,
    elements: 0,
    offscreen: null,
  };
  // Per parent: how many children its clone got so far, and the video stand-ins to insert.
  const childCounts = new Map();
  const pendingVideos = new Map();
  // Away from the viewport: cloned without their content.
  const emptied = new Set();

  const isMasked = (element) => {
    try {
      return (
        isBlockedElement(element, privacyOptions) ||
        isMaskMarker(element, privacyOptions) ||
        (!!extraSelector && element.matches(extraSelector))
      );
    } catch (exp) {
      return false;
    }
  };

  const countChild = (parent) => childCounts.set(parent, (childCounts.get(parent) || 0) + 1);

  const filter = (node) => {
    checkActive();
    const parent = stack[stack.length - 1];
    if (emptied.has(parent)) {
      return false;
    }
    if (!node || node.nodeType !== 1) {
      countChild(parent);
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
    if (tag === 'VIDEO') {
      const list = pendingVideos.get(parent) || [];
      list.push({
        index: childCounts.get(parent) || 0,
        placeholder: createVideoPlaceholder(node, {
          offscreen: !!state.offscreen && state.offscreen.has(node),
          masked: isMasked(node),
        }),
      });
      pendingVideos.set(parent, list);
      return false;
    }
    state.elements += 1;
    if (state.elements > MAX_RENDER_ELEMENTS) {
      throw new Error('render-budget');
    }
    countChild(parent);
    stack.push(node);
    // A same-origin frame's document element is cloned (and reported) as well.
    if ((tag === 'IFRAME' || tag === 'FRAME') && hasSameOriginDocument(node)) {
      stack.push(node);
    }
    if (state.offscreen && state.offscreen.has(node) && canEmpty(node)) {
      emptied.add(node);
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
    let hidden = false;
    try {
      hidden = isMasked(original) || (frame && isPaymentFrame(original)) || original.matches(GLEAP_INFLOW_UI_SELECTOR);
    } catch (exp) {}
    if (hidden) {
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

  const insertVideos = (original, clone) => {
    const list = pendingVideos.get(original);
    if (!list) {
      return;
    }
    pendingVideos.delete(original);
    list.forEach((entry, inserted) => {
      clone.insertBefore(entry.placeholder, clone.childNodes[entry.index + inserted] || null);
    });
  };

  // Nothing of it shows: no image downloads for it.
  const dropImages = (clone) => {
    if (clone.style) {
      IMAGE_PROPERTIES.forEach((property) => clone.style.setProperty(property, 'none', 'important'));
    }
    if (String(clone.nodeName).toUpperCase() === 'IMG') {
      clone.removeAttribute('srcset');
      clone.setAttribute('src', TRANSPARENT_GIF);
    }
  };

  const onCloneEachNode = (clone) => {
    checkActive();
    if (!clone || clone.nodeType !== 1) {
      return undefined;
    }
    const original = stack.pop();
    if (!original || !cloneNamesMatch(original, clone)) {
      state.broken = true;
    }
    if (!state.broken) {
      try {
        insertVideos(original, clone);
        maskClone(original, clone);
        restoreScroll(original, clone);
        if (state.offscreen && state.offscreen.has(original)) {
          dropImages(clone);
        }
      } catch (exp) {}
    }
    childCounts.delete(original);
    // Cloning reads every element's computed style: give the page a chance to breathe.
    if (state.canYield && now() - state.lastYield > 40) {
      state.lastYield = now();
      return yieldToPage();
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

const SANDBOX_HTML = '<!DOCTYPE html><meta charset="UTF-8"><title></title><body>';
// Stands in for the style sandbox when none could be made: modern-screenshot then copies every
// style instead of creating its own sandbox (which would leak under Trusted Types).
const SANDBOX_STUB = { contentWindow: null, remove: () => {} };

// modern-screenshot reads default styles from a hidden frame it creates on first use. Made and
// loaded up front instead: the render then may yield to the page without racing the frame's load.
// srcdoc is set before the frame is inserted (inserting a frame without one fires a synchronous
// load for about:blank); under Trusted Types, where srcdoc can't be set, the initial about:blank
// document serves.
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
    let srcdoc = false;
    try {
      frame.srcdoc = SANDBOX_HTML;
      srcdoc = true;
    } catch (exp) {}
    const usable = () => {
      try {
        const doc = frame.contentDocument;
        return !!(
          doc &&
          doc.body &&
          doc.readyState === 'complete' &&
          (!srcdoc || frame.contentWindow.location.href === 'about:srcdoc')
        );
      } catch (exp) {
        return false;
      }
    };
    let settled = false;
    let timer = null;
    const settle = (ready) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      frame.removeEventListener('load', onLoad);
      if (!ready) {
        try {
          frame.remove();
        } catch (exp) {}
      }
      resolve(ready ? frame : null);
    };
    const onLoad = () => {
      if (usable()) {
        settle(true);
      }
    };
    frame.addEventListener('load', onLoad);
    timer = setTimeout(() => settle(usable()), 1500);
    try {
      (document.body || document.documentElement).appendChild(frame);
    } catch (exp) {
      settle(false);
      return;
    }
    if (!srcdoc) {
      settle(usable());
    }
  });

// Images still loading near the viewport are worth waiting for; offscreen lazy images never load.
const imagesLoadingInViewport = () => {
  try {
    const viewportHeight = window.innerHeight;
    const images = document.images;
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      if (image.complete) {
        continue;
      }
      const rect = image.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < viewportHeight) {
        return true;
      }
    }
  } catch (exp) {}
  return false;
};

// Images away from the viewport don't show; they get a transparent pixel instead of a download.
const createImageFetcher = () => {
  try {
    const top = -VIEWPORT_MARGIN;
    const bottom = window.innerHeight + VIEWPORT_MARGIN;
    const away = new Set();
    const needed = new Set();
    const images = document.images;
    for (let i = 0; i < images.length; i++) {
      const url = images[i].currentSrc || images[i].src;
      if (!url) {
        continue;
      }
      const rect = images[i].getBoundingClientRect();
      if (rect.top > bottom || rect.bottom < top) {
        away.add(url);
      } else {
        needed.add(url);
      }
    }
    // Posters stand in for videos (createVideoPlaceholder).
    const videos = document.querySelectorAll('video[poster]');
    for (let i = 0; i < videos.length; i++) {
      const rect = videos[i].getBoundingClientRect();
      if (!(rect.top > bottom || rect.bottom < top)) {
        needed.add(videos[i].poster);
      }
    }
    needed.forEach((url) => away.delete(url));
    if (away.size === 0) {
      return null;
    }
    return (url) => Promise.resolve(away.has(url) ? TRANSPARENT_GIF : false);
  } catch (exp) {
    return null;
  }
};

// Network logging is paused while renders download assets; overlapping renders share one pause.
let networkLogPauses = 0;
let networkLogsWereStopped = false;

const pauseNetworkLogs = () => {
  let interceptor = null;
  try {
    interceptor = GleapNetworkIntercepter.getInstance();
    if (networkLogPauses === 0) {
      networkLogsWereStopped = !!interceptor.stopped;
      interceptor.setStopped(true);
    }
    networkLogPauses += 1;
  } catch (exp) {
    return () => {};
  }
  let resumed = false;
  return () => {
    if (resumed) {
      return;
    }
    resumed = true;
    networkLogPauses = Math.max(0, networkLogPauses - 1);
    if (networkLogPauses === 0) {
      try {
        interceptor.setStopped(networkLogsWereStopped);
      } catch (exp) {}
    }
  };
};

/**
 * Renders the visible part of the page in the browser. Gives up (and cleans up) when isActive()
 * turns false, after RENDER_DEADLINE_MS or beyond MAX_RENDER_ELEMENTS.
 */
export const renderDom = ({ privacyOptions, maskSelectors, isActive }) =>
  new Promise((resolve, reject) => {
    const root = document.documentElement;
    const width = Math.max(1, root.clientWidth || window.innerWidth);
    const height = Math.max(1, root.clientHeight || window.innerHeight);
    const scale = Math.min(Math.max(window.devicePixelRatio || 1, 1), MAX_CAPTURE_EDGE / Math.max(width, height));
    const pageScroll = { x: window.scrollX || 0, y: window.scrollY || 0 };
    const rects = collectMaskRects({ privacyOptions, maskSelectors });
    const background = pageBackgroundColor();

    let stopped = null;
    const isStopped = () => {
      if (!stopped && isActive && !isActive()) {
        stopped = 'aborted';
      }
      return !!stopped;
    };
    const checkActive = () => {
      if (isStopped()) {
        throw new Error(stopped);
      }
    };
    const hooks = createCloneHooks(root, privacyOptions, maskSelectors, pageScroll, checkActive);

    // Its asset downloads (fonts, images) are not the app's traffic: keep them out of the network logs.
    const resumeNetworkLogs = pauseNetworkLogs();
    let context = null;
    let sandbox = null;
    let settled = false;
    let deadline = null;
    let watch = null;
    const cleanup = () => {
      clearTimeout(deadline);
      clearInterval(watch);
      if (context) {
        try {
          // Removes the sandbox as well.
          destroyContext(context);
        } catch (exp) {}
        context = null;
      }
      if (sandbox) {
        try {
          sandbox.remove();
        } catch (exp) {}
        sandbox = null;
      }
      resumeNetworkLogs();
    };
    const finish = (error, result) => {
      if (settled) {
        if (result) {
          releaseCanvas(result.canvas);
        }
        return;
      }
      settled = true;
      cleanup();
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    };
    deadline = setTimeout(() => {
      try {
        stopped = stopped || 'render-timeout';
        finish(new Error('render-timeout'));
      } catch (exp) {}
    }, RENDER_DEADLINE_MS);
    // A cancel cleans up right away, also while modern-screenshot waits for images.
    watch = setInterval(() => {
      try {
        if (isStopped()) {
          finish(new Error(stopped));
        }
      } catch (exp) {}
    }, 200);

    Promise.all([findOffscreenElements(isStopped), createStyleSandbox()])
      .then(([offscreen, frame]) => {
        if (settled) {
          if (frame) {
            frame.remove();
          }
          return null;
        }
        sandbox = frame;
        checkActive();
        hooks.state.offscreen = offscreen;
        return createContext(root, {
          width,
          height,
          scale,
          backgroundColor: null,
          filter: hooks.filter,
          onCloneEachNode: hooks.onCloneEachNode,
          onCloneNode: hooks.onCloneNode,
          onCreateForeignObjectSvg: () => {
            if (context) {
              context.drawImageCount = Math.min(context.drawImageCount || 0, MAX_IMAGE_REDRAWS);
            }
          },
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
          timeout: imagesLoadingInViewport() ? 3000 : 50,
        });
      })
      .then((created) => {
        if (!created) {
          return null;
        }
        if (settled) {
          try {
            destroyContext(created);
          } catch (exp) {}
          return null;
        }
        context = created;
        context.timeout = 8000;
        // modern-screenshot would make its own sandbox lazily: ours (removed by destroyContext), or
        // the stub.
        context.sandbox = sandbox || SANDBOX_STUB;
        sandbox = null;
        hooks.state.canYield = true;
        checkActive();
        return domToCanvas(context);
      })
      .then((canvas) => {
        if (!canvas) {
          return;
        }
        if (settled) {
          releaseCanvas(canvas);
          return;
        }
        if (sampleCanvas(canvas) === 'transparent') {
          releaseCanvas(canvas);
          finish(new Error('render-empty'));
          return;
        }
        finish(null, {
          canvas,
          scaleX: canvas.width / width,
          scaleY: canvas.height / height,
          rects,
          background,
          method: 'dom',
        });
      })
      .catch((error) => finish(error));
  });

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
          return captureFromTabStream(stream, { setUiHidden, privacyOptions, maskSelectors, isActive: active }).catch(
            () => null
          );
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
      return capture || renderDom({ privacyOptions, maskSelectors, isActive: active });
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
