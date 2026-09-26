import { isMobile, resizeImage } from './GleapHelper';
import { getFieldValueMask, getTextMask, isBlockedElement, isMaskMarker } from './GleapInputMasking';
import { isBlacklisted } from './ResourceExclusionList';

/**
 * Captures the page as HTML for the screenshot renderer.
 * @param {boolean} isLiveSite
 * @param {object} privacyOptions The replay options (Gleap.setReplayOptions), so form fields are
 * masked by the same rule as in replays.
 */
export const startScreenCapture = (isLiveSite, privacyOptions) => {
  return prepareScreenshotData(isLiveSite, privacyOptions || {});
};

const documentToHTML = (clone) => {
  var html = '';
  var node = window.document.doctype;
  if (node) {
    html =
      '<!DOCTYPE ' +
      node.name +
      (node.publicId ? ' PUBLIC "' + node.publicId + '"' : '') +
      (!node.publicId && node.systemId ? ' SYSTEM' : '') +
      (node.systemId ? ' "' + node.systemId + '"' : '') +
      '>';
  }

  if (clone && clone.childNodes && clone.childNodes.length > 0) {
    for (var i = 0; i < clone.childNodes.length; i++) {
      if (clone.childNodes[i]) {
        html += clone.childNodes[i].outerHTML;
      }
    }
  }

  return html;
};

const replaceAsync = (str, regex, asyncFn) => {
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

const loadCSSUrlResources = (data, basePath, remote) => {
  return replaceAsync(
    data,
    /url\((.*?)\)/g,
    (matchedData) =>
      new Promise((resolve, reject) => {
        if (!matchedData) {
          return resolve(matchedData);
        }

        var matchedUrl = matchedData
          .substr(4, matchedData.length - 5)
          .replaceAll("'", '')
          .replaceAll('"', '');

        // Remote file or data
        if (matchedUrl.indexOf('http') === 0 || matchedUrl.indexOf('//') === 0 || matchedUrl.indexOf('data') === 0) {
          return resolve(matchedData);
        }

        try {
          var resourcePath = matchedUrl;
          if (basePath) {
            resourcePath = new URL(matchedUrl, basePath + '/').href;
          }

          // Try to fetch external resource.
          if (!remote) {
            return fetchCSSResource(resourcePath).then((resourceData) => {
              return resolve('url(' + resourceData + ')');
            });
          } else {
            return resolve('url(' + resourcePath + ')');
          }
        } catch (exp) {
          return resolve(matchedData);
        }
      })
  );
};

const fetchCSSResource = (url) => {
  return new Promise((resolve, reject) => {
    if (url) {
      var xhr = new XMLHttpRequest();
      xhr.onload = function () {
        var reader = new FileReader();
        reader.onloadend = function () {
          resolve(reader.result);
        };
        reader.onerror = function () {
          reject();
        };
        reader.readAsDataURL(xhr.response);
      };
      xhr.onerror = function (err) {
        resolve();
      };
      xhr.open('GET', url);
      xhr.responseType = 'blob';
      xhr.send();
    } else {
      resolve();
    }
  });
};

const progressResource = (data, elem, resolve, reject) => {
  resizeImage(data, 500, 500)
    .then((data) => {
      elem.src = data;
      resolve();
    })
    .catch(() => {
      console.warn('BB: Image resize failed.');
      resolve();
    });
};

const fetchItemResource = (elem) => {
  return new Promise((resolve, reject) => {
    if (elem && elem.src) {
      if (isBlacklisted(elem.src)) {
        return resolve();
      }

      var xhr = new XMLHttpRequest();
      xhr.onload = function () {
        var reader = new FileReader();
        reader.onloadend = function () {
          progressResource(reader.result, elem, resolve, reject);
        };
        reader.onerror = function () {
          resolve();
        };
        reader.readAsDataURL(xhr.response);
      };
      xhr.onerror = function (err) {
        resolve();
      };
      var url = elem.src;
      xhr.open('GET', url);
      xhr.responseType = 'blob';
      xhr.send();
    } else {
      resolve();
    }
  });
};

const downloadAllImages = (dom) => {
  const imgItems = dom.querySelectorAll('img');
  const imgItemsPromises = [];
  for (var i = 0; i < imgItems.length; i++) {
    const item = imgItems[i];
    imgItemsPromises.push(fetchItemResource(item));
  }

  return Promise.all(imgItemsPromises);
};

const replaceStyleNodes = (clone, styleSheet, cssTextContent, styleId) => {
  {
    var cloneTargetNode = null;
    if (styleSheet.ownerNode) {
      cloneTargetNode = clone.querySelector('[bb-styleid="' + styleId + '"]');
    }

    try {
      if (cloneTargetNode) {
        var replacementNode = null;
        if (cssTextContent != '') {
          // Create node.
          const head = clone.querySelector('head');
          var styleNode = window.document.createElement('style');
          head.appendChild(styleNode);
          styleNode.type = 'text/css';
          if (styleNode.styleSheet) {
            styleNode.styleSheet.cssText = cssTextContent;
          } else {
            styleNode.appendChild(window.document.createTextNode(cssTextContent));
          }
          replacementNode = styleNode;
        } else {
          var linkNode = window.document.createElement('link');
          linkNode.rel = 'stylesheet';
          linkNode.type = styleSheet.type;
          linkNode.href = styleSheet.href;
          linkNode.media = styleSheet.media;
          replacementNode = linkNode;
        }

        if (replacementNode) {
          cloneTargetNode.parentNode.insertBefore(replacementNode, cloneTargetNode);
          cloneTargetNode.remove();
        }
      }
    } catch (exp) {}
  }
};

const sanitizeCSSBraces = (css) => {
  var result = '';
  var depth = 0;
  for (var i = 0; i < css.length; i++) {
    if (css[i] === '{') {
      depth++;
      result += css[i];
    } else if (css[i] === '}') {
      if (depth > 0) {
        depth--;
        result += css[i];
      }
      // Skip stray closing braces at depth 0
    } else {
      result += css[i];
    }
  }
  return result;
};

const getTextContentFromStyleSheet = (styleSheet) => {
  var cssRules = null;
  try {
    if (styleSheet.cssRules) {
      cssRules = styleSheet.cssRules;
    } else if (styleSheet.rules) {
      cssRules = styleSheet.rules;
    }
  } catch (exp) {}

  var cssTextContent = '';
  if (cssRules) {
    for (var cssRuleItem in cssRules) {
      if (cssRules[cssRuleItem].cssText) {
        cssTextContent += cssRules[cssRuleItem].cssText + '\n';
      }
    }
  }

  return sanitizeCSSBraces(cssTextContent);
};

const downloadAllCSSUrlResources = (clone, remote) => {
  var promises = [];
  for (var i = 0; i < document.styleSheets.length; i++) {
    const styleSheet = document.styleSheets[i];

    // Skip if the stylesheet is meant for print
    if (styleSheet.media && styleSheet.media.mediaText === 'print') {
      continue;
    }

    const cssTextContent = getTextContentFromStyleSheet(styleSheet);
    if (styleSheet && styleSheet.ownerNode) {
      if (cssTextContent != '') {
        // Resolve resources.
        const baseTags = document.getElementsByTagName('base');
        var basePathURL = baseTags.length
          ? baseTags[0].href.substr(location.origin.length, 999)
          : window.location.href.split(/[?#]/)[0];

        if (styleSheet.href) {
          basePathURL = styleSheet.href;
        }

        const basePath = basePathURL.substring(0, basePathURL.lastIndexOf('/'));

        promises.push(
          loadCSSUrlResources(cssTextContent, basePath, remote).then((replacedStyle) => {
            return {
              styletext: replacedStyle,
              stylesheet: styleSheet,
              styleId: styleSheet.ownerNode.getAttribute('bb-styleid'),
            };
          })
        );
      } else {
        promises.push(
          Promise.resolve({
            styletext: cssTextContent,
            stylesheet: styleSheet,
            styleId: styleSheet.ownerNode.getAttribute('bb-styleid'),
          })
        );
      }
    }
  }

  return Promise.all(promises).then((results) => {
    if (results) {
      for (var i = 0; i < results.length; i++) {
        replaceStyleNodes(clone, results[i].stylesheet, results[i].styletext, results[i].styleId);
      }
    }
    return true;
  });
};

const prepareRemoteData = (clone, remote) => {
  return new Promise((resolve, reject) => {
    if (remote) {
      // Always download CSS.
      return downloadAllCSSUrlResources(clone, remote)
        .then(() => {
          resolve();
        })
        .catch(() => {
          resolve();
        });
    } else {
      return downloadAllImages(clone)
        .then(() => {
          return downloadAllCSSUrlResources(clone, remote).then(() => {
            resolve();
          });
        })
        .catch(() => {
          console.warn('Gleap: Failed with resolving local resources. Please contact the Gleap support team.');
          resolve();
        });
    }
  });
};

const handleAdoptedStyleSheets = (doc, clone, shadowNodeId) => {
  if (typeof doc.adoptedStyleSheets !== 'undefined') {
    for (let i = 0; i < doc.adoptedStyleSheets.length; i++) {
      const styleSheet = doc.adoptedStyleSheets[i];
      const cssTextContent = getTextContentFromStyleSheet(styleSheet);

      var shadowStyleNode = window.document.createElement('style');
      shadowStyleNode.type = 'text/css';
      if (shadowStyleNode.styleSheet) {
        shadowStyleNode.styleSheet.cssText = cssTextContent;
      } else {
        shadowStyleNode.appendChild(window.document.createTextNode(cssTextContent));
      }

      if (shadowNodeId) {
        shadowStyleNode.setAttribute('bb-shadow-child', shadowNodeId);
      }

      clone.insertBefore(shadowStyleNode, clone.firstElementChild);
    }
  }
};

// Element.getAnimations() has to flush pending style before it can answer, and a page with a
// running animation (a spinner, a pulsing dot) re-dirties style the moment it does — so asking
// per node made the clone walk force one full style recalc per element. That is quadratic in DOM
// size: ~2.8s at 6k elements, ~17.6s at 12k, minutes on a dashboard-sized page, all of it while
// the user waits for their report to send. Asking the ROOT instead answers the same question for
// every element under it in a single flush, so we resolve it once and index the result by target.
//
// One root is not enough: document.getAnimations() stops at shadow boundaries, so a web
// component's animations would silently drop out of the capture. Shadow roots expose the same
// call, and deepClone already discovers each one as it walks — so we index them as we go, which
// costs one flush per shadow ROOT rather than one per element.
const collectAnimationsInto = (animationsByTarget, root) => {
  try {
    if (!root || typeof root.getAnimations !== 'function') {
      return animationsByTarget;
    }

    const animations = root.getAnimations();
    for (var i = 0; i < animations.length; i++) {
      const target = animations[i].effect && animations[i].effect.target;
      if (!target) {
        continue;
      }

      const existing = animationsByTarget.get(target);
      if (existing) {
        existing.push(animations[i]);
      } else {
        animationsByTarget.set(target, [animations[i]]);
      }
    }
  } catch (exp) {}

  return animationsByTarget;
};

const extractFinalCSSState = (element, animationsByTarget) => {
  const animations = animationsByTarget.get(element);
  if (!animations) {
    return null;
  }

  const finalCSSState = {};
  // One live computed-style object per element rather than one lookup per animated property.
  const computedStyle = getComputedStyle(element);

  animations.forEach((animation) => {
    const keyframes = animation.effect?.getKeyframes() || [];
    const finalKeyframe = keyframes[keyframes.length - 1] || {};

    // Extract only the keys (CSS properties) from the final keyframe
    Object.keys(finalKeyframe).forEach((property) => {
      if (property !== 'offset') {
        // Store the computed style for each animated property
        finalCSSState[property] = computedStyle[property];
      }
    });
  });

  if (Object.keys(finalCSSState).length === 0) {
    return null;
  }

  return JSON.stringify(finalCSSState);
};

// Computed values that decide where a box sits among its siblings, and how tall the line an inline
// box sits on is. A blocked element's placeholder copies them, because the inline styles and
// attributes that may have set them are not captured.
const PLACEHOLDER_LAYOUT_PROPERTIES = [
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'float',
  'clear',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'order',
  'grid-row-start',
  'grid-row-end',
  'grid-column-start',
  'grid-column-end',
  'vertical-align',
  'font-family',
  'font-size',
  'line-height',
];

const setImportant = (style, property, value) => style.setProperty(property, value, 'important');

// A fixed border-box size, whatever the page's CSS says about min / max sizes or flex and grid
// sizing.
const pinSize = (style, width, height) => {
  setImportant(style, 'box-sizing', 'border-box');
  ['width', 'min-width', 'max-width'].forEach((property) => setImportant(style, property, width + 'px'));
  ['height', 'min-height', 'max-height'].forEach((property) => setImportant(style, property, height + 'px'));
};

// Width is 'auto' where it does not apply: an inline box of text, not an image, a media element or a
// form field.
const isTextInline = (style) => style.display === 'inline' && style.width === 'auto';

// The boxes inside an inline element that its line fragments do not cover: block boxes (a <div> in
// an <a>, or in the shadow tree of a web component), which sit between the fragments, and images,
// inline-blocks and form fields, which can make a line taller. Margin boxes, with vertical-align.
const collectInlineContent = (element, content) => {
  const root = element.shadowRoot || element;
  for (let child = root.firstElementChild; child; child = child.nextElementSibling) {
    const style = window.getComputedStyle(child);
    if (style.display === 'none' || style.position === 'absolute' || style.position === 'fixed' || style.float !== 'none') {
      continue;
    }

    if (style.display === 'contents' || isTextInline(style)) {
      collectInlineContent(child, content);
      continue;
    }

    const rect = child.getBoundingClientRect();
    const box = {
      left: rect.left - parseFloat(style.marginLeft),
      right: rect.right + parseFloat(style.marginRight),
      top: rect.top - parseFloat(style.marginTop),
      bottom: rect.bottom + parseFloat(style.marginBottom),
      verticalAlign: style.verticalAlign,
    };
    if (style.display.indexOf('inline') !== 0) {
      content.blocks.push(box);
      continue;
    }

    // Its spacer is empty, so it sits on its bottom edge like an image. A box with text in it, a
    // badge or a form field, sits on its text's baseline instead, which middle comes closest to.
    if (box.verticalAlign === 'baseline' && !/^(img|video|audio|canvas|iframe|embed|object|svg)$/i.test(child.tagName)) {
      box.verticalAlign = 'middle';
    }
    content.atomicInlines.push(box);
  }
  return content;
};

// An inline box of text wraps into one fragment per line. The placeholder gets an empty inline-block
// per fragment, as wide as the fragment, and a line break between fragments on different lines, so
// the text around it stays in place. A spacer has no height, which leaves the line as tall as the
// element's font makes it, unless an image, inline-block or form field made that line taller: then
// it takes the tallest one's height and vertical-align.
const appendLineSpacers = (placeholder, node, atomicInlines) => {
  const fragments = node.getClientRects();
  const middle = (box) => (box.top + box.bottom) / 2;
  const tallestOnLine = [];
  atomicInlines.forEach((box) => {
    let line = 0;
    for (let i = 1; i < fragments.length; i++) {
      if (Math.abs(middle(fragments[i]) - middle(box)) < Math.abs(middle(fragments[line]) - middle(box))) {
        line = i;
      }
    }
    const tallest = tallestOnLine[line];
    if (!tallest || box.bottom - box.top > tallest.bottom - tallest.top) {
      tallestOnLine[line] = box;
    }
  });

  for (let i = 0; i < fragments.length; i++) {
    const previous = fragments[i - 1];
    if (previous && fragments[i].top >= previous.top + previous.height / 2) {
      placeholder.appendChild(placeholder.ownerDocument.createElement('br'));
    }

    const tallest = tallestOnLine[i];
    const spacer = placeholder.ownerDocument.createElement('span');
    setImportant(spacer.style, 'display', 'inline-block');
    ['margin', 'padding', 'border-width'].forEach((property) => setImportant(spacer.style, property, '0'));
    setImportant(spacer.style, 'vertical-align', tallest ? tallest.verticalAlign : 'baseline');
    pinSize(spacer.style, fragments[i].width, tallest ? tallest.bottom - tallest.top : 0);
    placeholder.appendChild(spacer);
  }
};

// A blocked element (rr-block, gl-block, or the blockClass / blockSelector replay options) is
// captured the way rrweb records it in replays: as an empty element of the same tag and size, so
// none of its text, attributes, children, shadow tree or images reach the snapshot. It keeps its
// class and id for the page's CSS, and renders blank. placeholderDocument has no window, so
// building the placeholder runs no custom element constructor and loads nothing.
const createBlockedPlaceholder = (node, placeholderDocument) => {
  const placeholder = placeholderDocument.createElementNS(node.namespaceURI, node.localName);
  ['class', 'id'].forEach((name) => {
    if (node.hasAttribute(name)) {
      placeholder.setAttribute(name, node.getAttribute(name));
    }
  });

  if (!placeholder.style) {
    return placeholder;
  }

  try {
    const computedStyle = window.getComputedStyle(node);
    const style = placeholder.style;
    PLACEHOLDER_LAYOUT_PROPERTIES.forEach((property) =>
      setImportant(style, property, computedStyle.getPropertyValue(property))
    );
    setImportant(style, 'visibility', 'hidden');

    const content =
      node instanceof HTMLElement && isTextInline(computedStyle)
        ? collectInlineContent(node, { blocks: [], atomicInlines: [] })
        : null;

    if (content && content.blocks.length === 0) {
      setImportant(style, 'display', 'inline');
      // The line fragments include the element's padding and border.
      setImportant(style, 'padding', '0');
      setImportant(style, 'border-width', '0');
      appendLineSpacers(placeholder, node, content.atomicInlines);
    } else if (content) {
      // Block boxes inside an inline element break its line, as a block placeholder does, and make
      // up its height.
      const area = content.blocks.reduce((union, box) => ({
        left: Math.min(union.left, box.left),
        right: Math.max(union.right, box.right),
        top: Math.min(union.top, box.top),
        bottom: Math.max(union.bottom, box.bottom),
      }));
      setImportant(style, 'display', 'block');
      setImportant(style, 'margin-top', '0');
      setImportant(style, 'margin-bottom', '0');
      pinSize(style, area.right - area.left, area.bottom - area.top);
    } else {
      const rect = node.getBoundingClientRect();
      // An inline image or media element without a source is an empty inline box, which width and
      // height do not apply to.
      setImportant(style, 'display', computedStyle.display === 'inline' ? 'inline-block' : computedStyle.display);
      pinSize(style, rect.width, rect.height);
    }
  } catch (exp) {}

  return placeholder;
};

const deepClone = async (host, privacyOptions) => {
  let shadowNodeId = 1;
  const animationsByTarget = collectAnimationsInto(new Map(), window.document);
  const maskText = getTextMask(privacyOptions);
  let placeholderDocument = null;

  const cloneNode = async (node, parent, shadowRoot, insideMaskMarker) => {
    const isElement = node.nodeType == Node.ELEMENT_NODE;

    if (isElement && isBlockedElement(node, privacyOptions)) {
      placeholderDocument = placeholderDocument || document.implementation.createHTMLDocument('');
      const placeholder = createBlockedPlaceholder(node, placeholderDocument);
      if (shadowRoot) {
        placeholder.setAttribute('bb-shadow-child', shadowRoot);
      }
      parent.appendChild(placeholder);
      return;
    }

    // Replays do not record comments, and inside a mask marker one may hold the values it masks.
    if (insideMaskMarker && node.nodeType == Node.COMMENT_NODE) {
      return;
    }

    // Text inside a mask marker, or inside any of its descendants, is masked.
    const masksText = insideMaskMarker || (isElement && isMaskMarker(node, privacyOptions));

    const walkTree = async (nextn, nextp, innerShadowRoot) => {
      while (nextn) {
        try {
          await cloneNode(nextn, nextp, innerShadowRoot, masksText);
        } catch (exp) { }

        // Fix missing element nodes.
        if (
          nextn.nextElementSibling &&
          (nextn.nextElementSibling.nextSibling === nextn.nextSibling || nextn.nextSibling === null)
        ) {
          nextn = nextn.nextElementSibling;
        } else {
          nextn = nextn.nextSibling;
        }
      }
    };

    const clone = node.cloneNode();
    const tagName = node.tagName ? node.tagName.toUpperCase() : node.tagName;
    // Set for form fields whose value must not reach the snapshot (see GleapInputMasking.js).
    let fieldMask = null;

    // Masked the way rrweb masks text in replays. A style sheet keeps its CSS.
    if (insideMaskMarker && node.nodeType == Node.TEXT_NODE && node.parentNode.nodeName.toUpperCase() !== 'STYLE') {
      clone.data = maskText(node.data, node.parentElement);
    }

    const webAnimations = extractFinalCSSState(node, animationsByTarget);
    if (webAnimations != null) {
      clone.setAttribute('bb-web-animations', webAnimations);
    }

    if (typeof clone.setAttribute !== 'undefined') {
      if (shadowRoot) {
        clone.setAttribute('bb-shadow-child', shadowRoot);
      }

      if (node instanceof HTMLCanvasElement) {
        try {
          const boundingRect = node.getBoundingClientRect();
          const resizedImage = await resizeImage(node.toDataURL(), 1400, 1400);

          clone.setAttribute('bb-canvas-data', resizedImage);
          clone.setAttribute('bb-canvas-height', boundingRect.height);
          clone.setAttribute('bb-canvas-width', boundingRect.width);
        } catch (exp) {
          console.warn('Gleap: Failed to clone canvas data.', exp);
        }
      }
    }

    if (isElement) {
      if (tagName == 'IFRAME' || tagName == 'VIDEO' || tagName == 'EMBED' || tagName == 'IMG' || tagName == 'SVG') {
        const boundingRect = node.getBoundingClientRect();
        clone.setAttribute('bb-element', true);
        clone.setAttribute('bb-height', boundingRect.height);
        clone.setAttribute('bb-width', boundingRect.width);
      }

      if (node.scrollTop > 0 || node.scrollLeft > 0) {
        clone.setAttribute('bb-scrollpos', true);
        clone.setAttribute('bb-scrolltop', node.scrollTop);
        clone.setAttribute('bb-scrollleft', node.scrollLeft);
      }

      if (tagName === 'SELECT' || tagName === 'TEXTAREA' || tagName === 'INPUT') {
        fieldMask = getFieldValueMask(node, privacyOptions);
        clone.setAttribute('bb-data-value', fieldMask ? fieldMask(node.value) : node.value);

        // Frameworks mirror what the user typed into the value attribute (React does, password
        // fields included), and cloneNode() copies attributes.
        if (fieldMask && clone.hasAttribute('value')) {
          clone.setAttribute('value', fieldMask(clone.getAttribute('value')));
        }

        if ((node.type === 'checkbox' || node.type === 'radio') && node.checked) {
          clone.setAttribute('bb-data-checked', true);
        }
      }
    }

    parent.appendChild(clone);

    if (node.shadowRoot) {
      var rootShadowNodeId = shadowNodeId;
      shadowNodeId++;
      // Index this shadow tree's animations before descending into it — document.getAnimations()
      // does not cross the boundary, so its elements are not in the map yet.
      collectAnimationsInto(animationsByTarget, node.shadowRoot);
      await walkTree(node.shadowRoot.firstChild, clone, rootShadowNodeId);
      handleAdoptedStyleSheets(node.shadowRoot, clone, rootShadowNodeId);

      if (typeof clone.setAttribute !== 'undefined') {
        clone.setAttribute('bb-shadow-parent', rootShadowNodeId);
      }
    }

    // A textarea's text is its initial value, and React mirrors every keystroke into it. For a
    // masked textarea it stays out; the renderer fills the field from bb-data-value.
    if (!(fieldMask && tagName === 'TEXTAREA')) {
      await walkTree(node.firstChild, clone);
    }

    // A masked select would still reveal its choice through an option's selected attribute.
    if (fieldMask && tagName === 'SELECT') {
      const selectedOptions = clone.querySelectorAll('option[selected]');
      for (var i = 0; i < selectedOptions.length; i++) {
        selectedOptions[i].removeAttribute('selected');
      }
    }
  };

  const fragment = document.createDocumentFragment();
  await cloneNode(host, fragment);

  // Work on adopted stylesheets.
  var clonedHead = fragment.querySelector('head');
  if (!clonedHead) {
    clonedHead = fragment;
  }
  handleAdoptedStyleSheets(window.document, clonedHead);

  return fragment;
};

// HTML cannot represent nested <button>, <a> or <form> elements: when the
// serialized capture is re-parsed (screenshot rendering), the parser
// force-closes the outer element at the inner start tag and re-parents
// everything after it one level up — which can eject the page's main content
// out of its flex container and collapse it to a blank area. A JS-built DOM
// can legally contain such nesting, so rewrite the INNER occurrences to <div>
// with identical attributes before serialization; the tree then survives the
// HTML round-trip.
const fixParserUnsafeNesting = (clone) => {
  const rewrites = [
    { selector: 'button button', role: 'button' },
    { selector: 'a a', role: 'link' },
    { selector: 'form form', role: null },
  ];
  for (var r = 0; r < rewrites.length; r++) {
    const nestedElems = clone.querySelectorAll(rewrites[r].selector);
    for (var i = 0; i < nestedElems.length; i++) {
      const el = nestedElems[i];
      try {
        // SVG <a> is a different (foreign content) element and parses fine.
        if (el.namespaceURI && el.namespaceURI !== 'http://www.w3.org/1999/xhtml') {
          continue;
        }
        const div = window.document.createElement('div');
        for (var a = 0; a < el.attributes.length; a++) {
          div.setAttribute(el.attributes[a].name, el.attributes[a].value);
        }
        if (rewrites[r].role && !div.hasAttribute('role')) {
          div.setAttribute('role', rewrites[r].role);
        }
        div.setAttribute('bb-nested-' + el.tagName.toLowerCase(), 'true');
        while (el.firstChild) {
          div.appendChild(el.firstChild);
        }
        el.parentNode.replaceChild(div, el);
      } catch (exp) {}
    }
  }
};

const prepareScreenshotData = (remote, privacyOptions) => {
  return new Promise(async (resolve, reject) => {
    try {
    const styleTags = window.document.querySelectorAll('style, link');
    for (var i = 0; i < styleTags.length; ++i) {
      styleTags[i].setAttribute('bb-styleid', i);
    }

    const clone = await deepClone(window.document.documentElement, privacyOptions);

    try {
      fixParserUnsafeNesting(clone);
    } catch (exp) {}

    // Fix for web imports (depracted).
    const linkImportElems = clone.querySelectorAll('link[rel=import]');
    for (var i = 0; i < linkImportElems.length; ++i) {
      const referenceNode = linkImportElems[i];
      if (referenceNode && referenceNode.childNodes && referenceNode.childNodes.length > 0) {
        const childNodes = referenceNode.childNodes;
        while (childNodes.length > 0) {
          referenceNode.parentNode.insertBefore(childNodes[0], referenceNode);
        }
        referenceNode.remove();
      }
    }

    // Remove all scripts & style
    const scriptElems = clone.querySelectorAll('script, noscript');
    for (var i = 0; i < scriptElems.length; ++i) {
      scriptElems[i].remove();
    }

    // Cleanup base path
    var existingBasePath = '';
    const baseElems = clone.querySelectorAll('base');
    for (var i = 0; i < baseElems.length; ++i) {
      if (baseElems[i].href) {
        existingBasePath = baseElems[i].href;
      }
      baseElems[i].remove();
    }

    // Adjust the base node
    const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
    var newBaseUrl = baseUrl + '/';
    if (existingBasePath) {
      if (existingBasePath.startsWith('http')) {
        // Absolute path.
        newBaseUrl = existingBasePath;
      } else {
        // Relative path.
        newBaseUrl = baseUrl + existingBasePath;
        if (!newBaseUrl.endsWith('/')) {
          newBaseUrl += '/';
        }
      }
    }

    const baseNode = window.document.createElement('base');
    baseNode.href = newBaseUrl;
    const head = clone.querySelector('head');
    head.insertBefore(baseNode, head.firstChild);

    // Do further cleanup.
    const dialogElems = clone.querySelectorAll('.bb-feedback-dialog-container, .bb-capture-editor-borderlayer');
    for (var i = 0; i < dialogElems.length; ++i) {
      dialogElems[i].remove();
    }

    // Calculate heights
    const bbElems = clone.querySelectorAll('[bb-element=true]');
    for (var i = 0; i < bbElems.length; ++i) {
      if (bbElems[i]) {
        bbElems[i].style.height = bbElems[i].getAttribute('bb-height') + 'px';
      }
    }

    prepareRemoteData(clone, remote).then(() => {
      const html = documentToHTML(clone);

      resolve({
        html: html,
        baseUrl: baseUrl,
        width: window.innerWidth,
        height: window.innerHeight,
        isMobile: isMobile(),
      });
    });
    } catch (exp) {
      console.warn('Gleap: Failed to capture screenshot', exp);
      resolve(null);
    }
  });
};
