/**
 * Bootstraps an iframe by injecting a Gleap-hosted HTML document via about:blank + doc.write,
 * so the iframe inherits the parent page's origin instead of being a cross-site iframe to a
 * classified tracker domain.
 *
 * Why: Safari ITP applies restrictions (storage block, classification-based heuristics) to
 * iframes whose src is a classified tracker domain. By creating the iframe as about:blank and
 * writing the document content from the parent, the iframe becomes same-origin to the parent,
 * which Safari treats as first-party. The scripts inside the iframe still load from the
 * original Gleap origin, but as cross-origin script loads (not iframe navigations), which
 * ITP does not throttle.
 *
 * Requirements: the Gleap origin must serve the index.html with CORS (Access-Control-Allow-Origin).
 * `messenger-app.gleap.io` already does. For `outboundmedia.gleap.io` the helper will fall back
 * to direct iframe.src loading until CORS is enabled there.
 *
 * @param {HTMLIFrameElement} iframe - the iframe element (must already be appended to the DOM)
 * @param {string} url - the Gleap origin URL (e.g. https://messenger-app.gleap.io). May include a path.
 * @returns {void}
 */
export const bootstrapGleapFrame = (iframe, url) => {
  if (!iframe || !url) {
    return;
  }

  const fallbackToSrc = () => {
    try {
      iframe.src = url;
    } catch (e) {}
  };

  try {
    if (!iframe.contentDocument) return fallbackToSrc();
  } catch (e) {
    return fallbackToSrc();
  }

  // The asset base is the URL's origin + any path (e.g. https://outboundmedia.gleap.io/modal/).
  // We need a trailing slash so root-relative URLs resolve correctly via <base>.
  let baseHref;
  try {
    const parsed = new URL(url);
    // For a URL like https://outboundmedia.gleap.io/modal, assets are served from the origin root,
    // not from /modal/. So we use the origin as base. The path is just the entry HTML.
    baseHref = parsed.origin + '/';
  } catch (e) {
    return fallbackToSrc();
  }

  fetch(url, { mode: 'cors', credentials: 'omit' })
    .then((response) => {
      if (!response.ok) {
        throw new Error('Bootstrap fetch failed: ' + response.status);
      }
      return response.text();
    })
    .then((html) => {
      // Rewrite root-relative URLs (href="/x", src="/x") to absolute URLs on the Gleap origin,
      // so that the about:blank document (which has no base URL) can still resolve them.
      const absolutized = html.replace(
        /(\s(?:href|src)\s*=\s*["'])\/([^"'/][^"']*)/g,
        '$1' + baseHref + '$2'
      );

      // The Gleap apps (banner, modal, agent-conversation, chatbar) are SPAs that route based
      // on window.location.pathname. Since the iframe inherits the parent's origin via about:blank,
      // pathname would be the parent page's pathname — not the intended app route.
      // We use history.replaceState() to set the iframe's URL to the intended path BEFORE the
      // app's router initializes. replaceState is allowed because the iframe is same-origin to the parent.
      let targetPath = '/';
      try {
        const parsedTarget = new URL(url);
        targetPath = parsedTarget.pathname + parsedTarget.search + parsedTarget.hash;
      } catch (e) {}
      const routeScript =
        '<script>try{history.replaceState(null,"",' +
        JSON.stringify(targetPath) +
        ');}catch(e){}</script>';

      // Inject the route-setter script BEFORE the first existing <script> tag so it runs
      // before any app bundle. If no <script> is found, inject just before </head> as a fallback.
      let withRouteScript;
      if (/<script\b/i.test(absolutized)) {
        withRouteScript = absolutized.replace(/<script\b/i, routeScript + '<script');
      } else if (/<\/head>/i.test(absolutized)) {
        withRouteScript = absolutized.replace(/<\/head>/i, routeScript + '</head>');
      } else {
        withRouteScript = absolutized;
      }

      // Re-grab contentDocument here — Firefox may have replaced the initial about:blank
      // document during the fetch. Writing into the original reference would be a silent no-op.
      let doc;
      try {
        doc = iframe.contentDocument;
      } catch (e) {
        return fallbackToSrc();
      }
      if (!doc) {
        return fallbackToSrc();
      }

      try {
        doc.open();
        doc.write(withRouteScript);
        doc.close();
      } catch (e) {
        fallbackToSrc();
      }
    })
    .catch(() => {
      // CORS error, network error, or non-OK status: fall back to direct iframe.src loading.
      // This preserves the original behavior — the patch is a no-op when bootstrap can't work.
      fallbackToSrc();
    });
};

export const resizeImage = (base64Str, maxWidth = 400, maxHeight = 400) => {
  return new Promise((resolve, reject) => {
    var isJPEG = base64Str.indexOf('data:image/jpeg') === 0;
    var img = new Image();
    img.src = base64Str;
    img.onerror = () => {
      reject();
    };
    img.onload = () => {
      var canvas = document.createElement('canvas');
      var MAX_WIDTH = maxWidth;
      var MAX_HEIGHT = maxHeight;

      // Adjust max width / height based on image props
      if (maxWidth > img.width / 1.5) {
        MAX_WIDTH = img.width / 1.5;
      }

      if (maxHeight > img.height / 1.5) {
        MAX_HEIGHT = img.height / 1.5;
      }

      var width = img.width;
      var height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }
      canvas.width = width;
      canvas.height = height;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      if (isJPEG) {
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      } else {
        resolve(canvas.toDataURL());
      }
    };
  });
};

const MOBILE_UA_REGEX = /(android|iphone|ipod|ipad|blackberry|iemobile|opera mini|webos)/i;

export const getDeviceType = () => {
  return isMobile() ? 'mobile' : 'desktop';
};

export const isMobile = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const nav = typeof navigator !== 'undefined' ? navigator : undefined;

    if (nav?.userAgentData && typeof nav.userAgentData.mobile === 'boolean' && nav.userAgentData.mobile !== null) {
      return nav.userAgentData.mobile;
    }

    if (nav && MOBILE_UA_REGEX.test(nav.userAgent || nav.vendor || '')) {
      return true;
    }

    if (nav?.maxTouchPoints > 1 && window.matchMedia) {
      const coarsePointer = window.matchMedia('(hover: none) and (pointer: coarse)');
      if (coarsePointer?.matches) {
        return true;
      }
    }
  } catch (exp) {
    // Swallow errors and treat as desktop fallback.
  }

  return false;
};

export const gleapDataParser = function (data) {
  if (!data) {
    return {};
  }
  if (typeof data === 'string' || data instanceof String) {
    try {
      return JSON.parse(data);
    } catch (e) {
      return {};
    }
  }
  return data;
};

export const truncateString = (str, num) => {
  if (str.length > num) {
    return str.slice(0, num) + '...';
  } else {
    return str;
  }
};

const removeSubDomain = (v) => {
  try {
    var parts = v.split('.');
    var is2ndLevelDomain = false;
    const secondLevel = parts[parts.length - 2];
    if (
      secondLevel === 'co' ||
      secondLevel === 'com' ||
      secondLevel === 'gv' ||
      secondLevel === 'ac' ||
      secondLevel === 'edu' ||
      secondLevel === 'gov' ||
      secondLevel === 'mil' ||
      secondLevel === 'net' ||
      secondLevel === 'org'
    ) {
      is2ndLevelDomain = true;
    }
    parts = parts.slice(is2ndLevelDomain ? -3 : -2);
    return parts.join('.');
  } catch (exp) {}
  return v;
};

export const loadFromGleapCache = (key) => {
  try {
    const cachedData = localStorage.getItem(`gleap-widget-${key}`);
    if (cachedData) {
      const config = JSON.parse(cachedData);
      return config;
    }
  } catch (exp) {}
  return null;
};

export const saveToGleapCache = (key, data) => {
  const k = `gleap-widget-${key}`;
  if (data) {
    try {
      localStorage.setItem(k, JSON.stringify(data));
    } catch (exp) {}
  } else {
    localStorage.removeItem(k);
  }
};

export const clearGleapCache = (key) => {
  try {
    const k = `gleap-widget-${key}`;
    localStorage.removeItem(k);
  } catch {}
};

export const setGleapCookie = (name, value, days) => {
  try {
    var expires = '';
    if (days) {
      var date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      expires = '; expires=' + date.toUTCString();
    }
    const host = removeSubDomain(window.location.host.split(':')[0]);
    document.cookie = name + '=' + (value || '') + expires + '; path=/; domain=' + host;
  } catch (exp) {}
};

export const getGleapCookie = (name) => {
  try {
    var nameEQ = name + '=';
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
  } catch (exp) {}
  return null;
};

export const eraseGleapCookie = (name) => {
  try {
    const host = removeSubDomain(window.location.host.split(':')[0]);
    document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Domain=' + host;
  } catch (exp) {}
};

export const getDOMElementDescription = (element, html = true) => {
  var innerText = truncateString(element.innerText || '', 40)
    .replace(/(\r\n|\n|\r)/gm, '')
    .replace(/ +(?= )/g, '');
  var elementId = '';
  var elementClass = '';
  if (typeof element.getAttribute !== 'undefined') {
    const elemId = element.getAttribute('id');
    if (elemId) {
      elementId = ` id="${elemId}"`;
    }
    const elemClass = element.getAttribute('class');
    if (elemClass) {
      elementClass = ` class="${elemClass}"`;
    }
  }
  const elementTag = (element.tagName || '').toLowerCase();

  var htmlPre = '<';
  var htmlPost = '>';
  if (!html) {
    htmlPre = '[';
    htmlPost = ']';
  }

  return `${htmlPre}${elementTag}${elementId}${elementClass}${htmlPost}${innerText}${htmlPre}/${elementTag}${htmlPost}`;
};

export const runFunctionWhenDomIsReady = (callback) => {
  if (document.readyState === 'complete' || document.readyState === 'loaded' || document.readyState === 'interactive') {
    callback();
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      callback();
    });
  }
};

// Bind the iOS keyboard viewport fix at most once per page session. Even though
// fixGleapHeight() is only called from Gleap.initialize() today, a SPA re-init
// must never stack a second set of visualViewport listeners — duplicates would
// fight each other on every event, which can leave the widget stuck shrunk.
let gleapHeightFixInstalled = false;

export const fixGleapHeight = () => {
  try {
    // Strict no-op off iOS / when the VisualViewport API is unavailable.
    if (
      !('visualViewport' in window) ||
      !window.visualViewport ||
      !/iPad|iPhone|iPod/.test(navigator.userAgent)
    ) {
      return;
    }

    // Idempotent: install the listeners only once.
    if (gleapHeightFixInstalled) {
      return;
    }
    gleapHeightFixInstalled = true;

    // Minimum keyboard height that counts as "the keyboard is open". We detect
    // the keyboard as the gap between the LAYOUT viewport (window.innerHeight)
    // and the VISUAL viewport (visualViewport.height): on iOS the soft keyboard
    // shrinks ONLY the visual viewport, so innerHeight - visualViewport.height is
    // the keyboard height. Crucially, the iOS dynamic toolbar (address bar /
    // bottom bar) shrinks BOTH viewports together, so it leaves this gap at ~0 —
    // it can never be misread as a keyboard (measured on iPhone the toolbar moves
    // the viewport by ~160px, which a naive "shrunk vs full height" check would
    // wrongly treat as a keyboard and leave the widget stuck). Real iOS keyboards
    // are ~260px+; 150px sits in the safe valley above toolbar/rounding noise and
    // below the smallest real keyboard. Erring below the threshold always means
    // "treat as closed" (full size) — the safe direction that can never stick.
    const KEYBOARD_OPEN_THRESHOLD = 150;

    // iOS usually fires a single visualViewport 'resize' at the END of the
    // keyboard transition, and that value can still be mid-animation. Some
    // dismiss gestures fire no final event at all. So after every event we also
    // re-measure once, slightly later, to read the settled dimensions. This is
    // the self-correcting safety net that removes the styles even if no further
    // event arrives.
    const SETTLE_DELAY = 350;

    const round = (value) => Math.round(value);

    let settleTimer = null;
    let pendingUpdate = false;

    function measure() {
      try {
        const gleapFrameContainer = document.querySelector(
          '.gleap-frame-container-inner iframe'
        );

        if (!gleapFrameContainer) {
          return;
        }

        const visualViewport = window.visualViewport;

        // Keyboard height = layout viewport - visual viewport. Read live every
        // time (never a stale once-captured baseline). Rounded so a fractional
        // visualViewport.height can't sit a sub-pixel below innerHeight and read
        // as open. Toolbar moves both viewports together -> gap ~0 -> closed.
        const keyboardHeight = round(window.innerHeight) - round(visualViewport.height);
        const keyboardIsOpen = keyboardHeight >= KEYBOARD_OPEN_THRESHOLD;

        if (keyboardIsOpen) {
          gleapFrameContainer.style.setProperty(
            'max-height',
            visualViewport.height + 'px',
            'important'
          );
          // When the keyboard opens, iOS pans the visual viewport up to reveal
          // the focused field. The widget is position:fixed (anchored to the
          // layout viewport), so without compensation it appears to "scroll up"
          // behind the status bar. Translate it down by the viewport offset to
          // keep it pinned to the visible area above the keyboard.
          gleapFrameContainer.style.setProperty(
            'transform',
            'translateY(' + visualViewport.offsetTop + 'px)',
            'important'
          );
        } else {
          // Reset in EVERY non-open path. removeProperty is idempotent and safe
          // even when nothing was set.
          gleapFrameContainer.style.removeProperty('max-height');
          gleapFrameContainer.style.removeProperty('transform');
        }
      } catch (error) {}
    }

    // Coalesce simultaneous resize + scroll into a single update per frame
    // (canonical VisualViewport pattern), then arm a delayed settle re-check to
    // read the final post-animation dimensions.
    function scheduleUpdate() {
      try {
        if (!pendingUpdate) {
          pendingUpdate = true;
          window.requestAnimationFrame(() => {
            pendingUpdate = false;
            measure();
          });
        }

        if (settleTimer) {
          clearTimeout(settleTimer);
        }
        settleTimer = setTimeout(measure, SETTLE_DELAY);
      } catch (error) {}
    }

    function handleOrientationChange() {
      try {
        // innerHeight/visualViewport settle a bit after a rotation; the settle
        // timer re-checks with the gap method, which needs no per-orientation
        // baseline.
        scheduleUpdate();
      } catch (error) {}
    }

    const visualViewport = window.visualViewport;

    // Keyboard show/hide and viewport resizes.
    visualViewport.addEventListener('resize', scheduleUpdate);

    // Visual-viewport pan (offsetTop changes) while the keyboard animates in/out
    // so the widget stays aligned with the visible area.
    visualViewport.addEventListener('scroll', scheduleUpdate);

    // Re-check after orientation changes.
    window.addEventListener('orientationchange', handleOrientationChange);

    // Initial measure (no keyboard expected -> no-op).
    measure();
  } catch (error) {}
};
