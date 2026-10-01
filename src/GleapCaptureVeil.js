import { applyGleapCSPNonce } from './GleapHelper';
import { getMaskedFieldSelectors } from './GleapInputMasking';
import {
  classPatterns,
  cssEscape,
  GLEAP_UI_SELECTOR,
  maskSelectorParts,
  paymentFrameSelector,
} from './GleapCaptureScreenshot';

// The privacy veil for screen recordings (getDisplayMedia): a video can't be masked afterwards, so
// while one runs the live page blurs everything screenshots paint black boxes over: blocked and
// masked elements (rr-/gl- classes and the site's replay options), private form fields (password,
// one-time code and card fields, gleap-ignore="value", the replay options' input masking), payment
// frames and flowConfig.capture.maskSelectors. It is one stylesheet, adopted by this document, its
// open shadow roots and its same-origin frames; nothing else on the page changes. Page recordings
// (rrweb) and screenshots mask on their own and never use it.

const BLUR = 'filter: blur(12px) !important;';
const FIELD_BLUR = BLUR + ' -webkit-text-security: disc !important;';
const NOT_GLEAP_UI = GLEAP_UI_SELECTOR.split(',')
  .map((selector) => ':not(' + selector.trim() + ')')
  .join('');
// Shadow roots and frames inside each other.
const MAX_DEPTH = 8;

const isGleapUiRoot = (element) => {
  try {
    return !!(element.matches && element.matches(GLEAP_UI_SELECTOR));
  } catch (exp) {
    return false;
  }
};

/**
 * The rules for one selector of elements masked as a whole: the outermost matches below <body>
 * (nested matches would stack the blur, each on a layer of its own), and everything in <body> when
 * <html> or <body> matches (a filter there would also turn fixed elements, the capture bar too,
 * into ones that scroll with the page). Browsers without :is() get the plain selector instead.
 * @param {string} selector
 * @returns {{rules: string[], fallback: string}}
 */
export const elementVeilRules = (selector) => {
  const match = ':is(' + selector + '):not(html):not(body)' + NOT_GLEAP_UI;
  const inMaskedBody = ['html:is(' + selector + ') > body > *', 'body:is(' + selector + ') > *']
    .map((part) => part + NOT_GLEAP_UI)
    .join(', ');
  return {
    rules: [match + ':not(' + match + ' *) { ' + BLUR + ' }', inMaskedBody + ' { ' + BLUR + ' }'],
    fallback: selector + ' { ' + BLUR + ' }',
  };
};

/**
 * Every rule of the veil, in order.
 * @param {object} privacyOptions The site's Gleap.setReplayOptions.
 * @param {string[]} maskSelectors flowConfig.capture.maskSelectors
 * @returns {Array<{rules: string[], fallback: ?string}>}
 */
export const buildVeilRules = (privacyOptions, maskSelectors) => {
  const entries = maskSelectorParts(privacyOptions, maskSelectors).map(elementVeilRules);
  // Frames don't contain each other: one plain rule.
  entries.push({ rules: [paymentFrameSelector() + ' { ' + BLUR + ' }'], fallback: null });
  getMaskedFieldSelectors(privacyOptions).forEach((selector) => {
    entries.push({ rules: [selector + ' { ' + FIELD_BLUR + ' }'], fallback: null });
  });
  return entries;
};

// A rule a browser rejects leaves the others working.
const insertEntry = (sheet, entry) => {
  let inserted = false;
  entry.rules.forEach((rule) => {
    try {
      sheet.insertRule(rule, sheet.cssRules.length);
      inserted = true;
    } catch (exp) {}
  });
  if (!inserted && entry.fallback) {
    try {
      sheet.insertRule(entry.fallback, sheet.cssRules.length);
    } catch (exp) {}
  }
};

// Two animation frames (the veil is painted), or a short timeout in a background tab.
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

/**
 * Puts the veil on the live page until remove() (and at the latest when the page is left). Never
 * throws.
 * @param {{privacyOptions?: object, maskSelectors?: string[]}} options
 * @returns {{ready: function(): Promise<void>, remove: function(): void}} ready resolves once the
 * veil is painted
 */
export const applyPrivacyVeil = (options = {}) => {
  const privacyOptions = options.privacyOptions || {};
  const entries = buildVeilRules(privacyOptions, options.maskSelectors);
  const patterns = classPatterns(privacyOptions);
  // Class names that match a RegExp of the replay options, found on the page so far.
  const classNames = Object.create(null);
  // One stylesheet per document: { doc, sheet, style, roots }.
  const targets = [];
  const seenRoots = new WeakSet();
  const frames = [];
  let observer = null;
  let removed = false;

  const targetFor = (doc) => {
    for (let i = 0; i < targets.length; i++) {
      if (targets[i].doc === doc) {
        return targets[i];
      }
    }
    let target = null;
    // A constructed stylesheet: not subject to the page's CSP, shared with the open shadow roots.
    try {
      const view = doc.defaultView;
      if (view && typeof view.CSSStyleSheet === 'function' && 'adoptedStyleSheets' in doc) {
        target = { doc, sheet: new view.CSSStyleSheet(), style: null, roots: [] };
      }
    } catch (exp) {}
    if (!target) {
      try {
        const style = doc.createElement('style');
        applyGleapCSPNonce(style);
        (doc.head || doc.documentElement).appendChild(style);
        if (style.sheet) {
          target = { doc, sheet: style.sheet, style, roots: [] };
        } else {
          style.parentNode.removeChild(style);
        }
      } catch (exp) {}
    }
    if (target) {
      entries.forEach((entry) => insertEntry(target.sheet, entry));
      Object.keys(classNames).forEach((name) => insertEntry(target.sheet, elementVeilRules('.' + cssEscape(name))));
      targets.push(target);
    }
    return target;
  };

  // root: a document or an open shadow root.
  const attach = (root) => {
    const target = targetFor(root.nodeType === 9 ? root : root.ownerDocument);
    // A <style> element (browsers without constructed stylesheets) covers its document only.
    if (!target || target.style) {
      return;
    }
    try {
      root.adoptedStyleSheets = Array.prototype.slice.call(root.adoptedStyleSheets || []).concat([target.sheet]);
      target.roots.push(root);
    } catch (exp) {}
  };

  const observe = (root) => {
    if (!observer) {
      return;
    }
    try {
      observer.observe(
        root,
        patterns.length
          ? { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] }
          : { childList: true, subtree: true }
      );
    } catch (exp) {}
  };

  const checkClasses = (element) => {
    const list = element.classList;
    if (!patterns.length || !list) {
      return;
    }
    for (let i = 0; i < list.length; i++) {
      const name = list[i];
      if (classNames[name]) {
        continue;
      }
      const matches = patterns.some((pattern) => {
        pattern.lastIndex = 0;
        return pattern.test(name);
      });
      if (matches) {
        classNames[name] = true;
        const entry = elementVeilRules('.' + cssEscape(name));
        targets.forEach((target) => insertEntry(target.sheet, entry));
      }
    }
  };

  let scan = null;

  const addRoot = (root, depth) => {
    if (!root || seenRoots.has(root) || depth > MAX_DEPTH) {
      return;
    }
    seenRoots.add(root);
    attach(root);
    observe(root);
    scan(root, depth);
  };

  const attachFrame = (frame, depth) => {
    let frameDocument = null;
    try {
      frameDocument = frame.contentDocument;
    } catch (exp) {}
    if (frameDocument && frameDocument.documentElement) {
      addRoot(frameDocument, depth);
    }
  };

  // A same-origin frame loading another page gets the veil again.
  const addFrame = (frame, depth) => {
    for (let i = 0; i < frames.length; i++) {
      if (frames[i].frame === frame) {
        attachFrame(frame, depth);
        return;
      }
    }
    const onLoad = () => {
      if (!removed) {
        attachFrame(frame, depth);
      }
    };
    try {
      frame.addEventListener('load', onLoad);
      frames.push({ frame, onLoad });
    } catch (exp) {}
    attachFrame(frame, depth);
  };

  const visit = (element, depth) => {
    checkClasses(element);
    if (element.shadowRoot) {
      addRoot(element.shadowRoot, depth + 1);
    }
    if (element.tagName === 'IFRAME' || element.tagName === 'FRAME') {
      addFrame(element, depth + 1);
    }
  };

  // Open shadow roots, same-origin frames and RegExp class names in a document, shadow root or
  // element (and below). Gleap's own UI is skipped.
  scan = (start, depth) => {
    if (removed || !start) {
      return;
    }
    try {
      if (start.nodeType === 1) {
        if (isGleapUiRoot(start)) {
          return;
        }
        visit(start, depth);
      }
      const walker = (start.ownerDocument || start).createTreeWalker(start, 1, {
        acceptNode: (node) => (isGleapUiRoot(node) ? 2 : 1),
      });
      let node = walker.nextNode();
      while (node) {
        visit(node, depth);
        node = walker.nextNode();
      }
    } catch (exp) {}
  };

  const remove = () => {
    if (removed) {
      return;
    }
    removed = true;
    try {
      if (observer) {
        observer.disconnect();
      }
    } catch (exp) {}
    observer = null;
    frames.forEach((entry) => {
      try {
        entry.frame.removeEventListener('load', entry.onLoad);
      } catch (exp) {}
    });
    frames.length = 0;
    targets.forEach((target) => {
      target.roots.forEach((root) => {
        try {
          root.adoptedStyleSheets = Array.prototype.filter.call(
            root.adoptedStyleSheets || [],
            (sheet) => sheet !== target.sheet
          );
        } catch (exp) {}
      });
      try {
        if (target.style && target.style.parentNode) {
          target.style.parentNode.removeChild(target.style);
        }
      } catch (exp) {}
    });
    targets.length = 0;
    try {
      window.removeEventListener('pagehide', remove);
    } catch (exp) {}
  };

  try {
    window.addEventListener('pagehide', remove);
    if (typeof MutationObserver === 'function') {
      // Content added later: shadow roots, frames and class names the stylesheet doesn't reach yet.
      observer = new MutationObserver((records) => {
        if (removed) {
          return;
        }
        try {
          records.forEach((record) => {
            if (record.type === 'attributes') {
              checkClasses(record.target);
              return;
            }
            for (let i = 0; i < record.addedNodes.length; i++) {
              if (record.addedNodes[i].nodeType === 1) {
                scan(record.addedNodes[i], 0);
              }
            }
          });
        } catch (exp) {}
      });
    }
    addRoot(document, 0);
  } catch (exp) {}

  return { ready: nextPaint, remove };
};
