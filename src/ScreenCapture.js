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
// box sits on is (overflow: whether its margins and floats stay inside it). A blocked element's
// placeholder copies them, because the inline styles, attributes and id selectors that may have set
// them do not reach the snapshot.
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
  'overflow-x',
  'overflow-y',
  'order',
  'align-self',
  'justify-self',
  'grid-row-start',
  'grid-row-end',
  'grid-column-start',
  'grid-column-end',
  'vertical-align',
  'font-family',
  'font-size',
  'line-height',
];

// Table parts made of the rows and cells of the table's grid, which size the cells around them.
const TABLE_PART_DISPLAY = /^table-(row-group|header-group|footer-group|row|column-group)$/;

// A table cell's box. With collapsed borders, a cell's box takes half of each border it shares, the
// widest of those on either side, so its size depends on its neighbours; its width and height,
// padding and borders make the same box again.
const CELL_BOX_PROPERTIES = [
  'box-sizing',
  'width',
  'height',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-top-style',
  'border-right-style',
  'border-bottom-style',
  'border-left-style',
];

const REPLACED_TAGS = /^(img|video|audio|canvas|iframe|embed|object|svg)$/;

const FORM_FIELD_TAGS = /^(input|select|textarea)$/;

const setImportant = (style, property, value) => style.setProperty(property, value, 'important');

const px = (style, property) => parseFloat(style.getPropertyValue(property)) || 0;

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

const isOutOfFlow = (style) => style.position === 'absolute' || style.position === 'fixed' || style.float !== 'none';

const isScrollContainer = (style) => !/^(visible|clip)$/.test(style.overflowX) || !/^(visible|clip)$/.test(style.overflowY);

// The nodes an element's box is made of: a shadow host's shadow tree, the nodes assigned to a slot.
const flatChildNodes = (element) => {
  if (element.shadowRoot) {
    return Array.from(element.shadowRoot.childNodes);
  }
  const assigned = typeof element.assignedNodes === 'function' ? element.assignedNodes() : [];
  return Array.from(assigned.length ? assigned : element.childNodes);
};

const flatParent = (node) => node.assignedSlot || node.parentElement || (node.parentNode && node.parentNode.host) || null;

// The box a node is laid out in: its parent's, or, past display: contents elements, an ancestor's.
const boxParent = (node) => {
  let parent = flatParent(node);
  while (parent && window.getComputedStyle(parent).display === 'contents') {
    parent = flatParent(parent);
  }
  return parent;
};

const textRects = (text) => {
  const range = document.createRange();
  range.selectNodeContents(text);
  return typeof range.getClientRects === 'function' ? Array.from(range.getClientRects()) : [];
};

// An element's border-box size in its own CSS pixels, from its used width and height.
// getBoundingClientRect() measures it on screen, where a transform or zoom on the element or an
// ancestor scales it, and the placeholder, rendered in the same place, would be scaled a second time.
// offsetWidth and offsetHeight are rounded to whole pixels, which can wrap a row of floats.
const layoutSize = (element, style) => {
  let width = parseFloat(style.width);
  let height = parseFloat(style.height);
  if (isNaN(width) || isNaN(height)) {
    const rect = element.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }
  if (style.boxSizing !== 'border-box') {
    width +=
      px(style, 'padding-left') +
      px(style, 'padding-right') +
      px(style, 'border-left-width') +
      px(style, 'border-right-width');
    height +=
      px(style, 'padding-top') +
      px(style, 'padding-bottom') +
      px(style, 'border-top-width') +
      px(style, 'border-bottom-width');
  }
  return { width, height };
};

// How much transforms and zoom scale a box on screen. Up to a pixel off is rounding.
const screenScale = (rect, size) => {
  const ratio = (onScreen, layout) =>
    onScreen > 0 && layout > 0 && Math.abs(onScreen - layout) > 1 ? onScreen / layout : 1;
  return { x: ratio(rect.width, size.width), y: ratio(rect.height, size.height) };
};

// Line fragments, which only getClientRects() measures, are scaled on screen as much as the content of
// the nearest box around them.
const contentScale = (node) => {
  for (let element = flatParent(node); element; element = flatParent(element)) {
    const style = window.getComputedStyle(element);
    if (parseFloat(style.width) > 0 && parseFloat(style.height) > 0) {
      return screenScale(element.getBoundingClientRect(), layoutSize(element, style));
    }
  }
  return { x: 1, y: 1 };
};

const inLayoutPixels = (rect, scale) => ({
  left: rect.left / scale.x,
  right: rect.right / scale.x,
  top: rect.top / scale.y,
  bottom: rect.bottom / scale.y,
  width: rect.width / scale.x,
  height: rect.height / scale.y,
});

const createSpacer = (ownerDocument) => {
  const spacer = ownerDocument.createElement('span');
  setImportant(spacer.style, 'display', 'inline-block');
  ['margin', 'padding', 'border-width'].forEach((property) => setImportant(spacer.style, property, '0'));
  return spacer;
};

// The boxes inside an inline element that its line fragments do not cover: block boxes (a <div> in
// an <a>, or in the shadow tree of a web component), which sit between the fragments, and images,
// inline-blocks and form fields, which can make a line taller. Margin boxes, with vertical-align.
const collectInlineContent = (element, scale, content) => {
  flatChildNodes(element).forEach((child) => {
    if (child.nodeType !== Node.ELEMENT_NODE) {
      return;
    }
    const style = window.getComputedStyle(child);
    if (style.display === 'none' || isOutOfFlow(style)) {
      return;
    }

    if (style.display === 'contents' || isTextInline(style)) {
      collectInlineContent(child, scale, content);
      return;
    }

    const rect = inLayoutPixels(child.getBoundingClientRect(), scale);
    const box = {
      left: rect.left - px(style, 'margin-left'),
      right: rect.right + px(style, 'margin-right'),
      top: rect.top - px(style, 'margin-top'),
      bottom: rect.bottom + px(style, 'margin-bottom'),
      verticalAlign: style.verticalAlign,
    };
    if (style.display.indexOf('inline') !== 0) {
      content.blocks.push(box);
      return;
    }

    // Its spacer is empty, so it sits on its bottom edge like an image. A box with text in it, a
    // badge or a form field, sits on its text's baseline instead, which middle comes closest to.
    if (box.verticalAlign === 'baseline' && !REPLACED_TAGS.test(child.localName)) {
      box.verticalAlign = 'middle';
    }
    content.atomicInlines.push(box);
  });
  return content;
};

// An inline box of text wraps into one fragment per line. The placeholder gets an empty inline-block
// per fragment, as wide as the fragment, and a line break between fragments on different lines, so
// the text around it stays in place. A spacer has no height, which leaves the line as tall as the
// element's font makes it, unless an image, inline-block or form field made that line taller: then
// it takes the tallest one's height and vertical-align.
const appendLineSpacers = (placeholder, fragments, atomicInlines) => {
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
    const spacer = createSpacer(placeholder.ownerDocument);
    setImportant(spacer.style, 'vertical-align', tallest ? tallest.verticalAlign : 'baseline');
    pinSize(spacer.style, fragments[i].width, tallest ? tallest.bottom - tallest.top : 0);
    placeholder.appendChild(spacer);
  }
};

// Text in a display: contents element is laid out in its parent's lines, like an inline element of
// text.
const appendTextPlaceholder = (placeholder, text) => {
  const rects = textRects(text);
  if (!rects.length) {
    return;
  }

  const scale = contentScale(text);
  const box = placeholder.ownerDocument.createElement('span');
  setImportant(box.style, 'display', 'inline');
  ['margin', 'padding', 'border-width'].forEach((property) => setImportant(box.style, property, '0'));
  appendLineSpacers(
    box,
    rects.map((rect) => inLayoutPixels(rect, scale)),
    []
  );
  placeholder.appendChild(box);
};

// A display: contents element has no box: its children's boxes are laid out by its parent. The rows
// and cells of a table part make up the table's grid. Each of these boxes gets an inner placeholder of
// its own.
const appendInnerPlaceholders = (placeholder, node, isTableGrid) => {
  flatChildNodes(node).forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      appendTextPlaceholder(placeholder, child);
      return;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) {
      return;
    }
    const display = window.getComputedStyle(child).display;
    if (display === 'contents') {
      appendInnerPlaceholders(placeholder, child, isTableGrid);
    } else if (display !== 'none') {
      placeholder.appendChild(createBlockedPlaceholder(child, placeholder.ownerDocument, true, isTableGrid));
    }
  });
};

// A block container whose first and last children's margins can collapse with its own: one that
// starts no formatting context of its own, as floats, absolutely positioned boxes, scroll containers
// and flow-roots do. Flex and grid items pass for one here; touchesEdge() tells them apart.
const collapsesWithChildren = (style) =>
  (style.display === 'block' || style.display === 'list-item') &&
  !isOutOfFlow(style) &&
  !isScrollContainer(style) &&
  !/layout|paint|strict|content/.test(style.contain);

// Whether a child's top (or bottom) border edge is where its parent's is, as it is when the child's
// margin collapses through the parent's edge. Compared in layout offsets, which transforms (a
// scroll-reveal animation, say) do not move; they are whole pixels, hence the tolerance.
const touchesEdge = (parent, child, childStyle, side) => {
  if (!(child instanceof HTMLElement)) {
    return false;
  }
  let parentTop = parent.offsetTop;
  let parentBottom = parent.offsetTop + parent.offsetHeight;
  if (child.offsetParent === parent) {
    // Offsets from the parent's padding edge, which is its border edge on this side.
    parentTop = 0;
    parentBottom = parent.clientHeight;
  } else if (child.offsetParent !== parent.offsetParent) {
    return false;
  }
  // offsetTop includes a relatively positioned box's offset.
  const top = child.offsetTop - (childStyle.position === 'relative' ? px(childStyle, 'top') : 0);
  const distance = side === 'top' ? top - parentTop : top + child.offsetHeight - parentBottom;
  return Math.abs(distance) <= 1;
};

// Text puts a line box between margins, unless it is white space that collapses away.
const rendersText = (text) => /[^\t\n\f\r ]/.test(text.data) || textRects(text).length > 0;

// The margins that collapse with an element's own top (or bottom) margin (CSS 2.1, 8.3.1): those of
// its first (or last) in-flow child, when no padding, border, line box or clearance separates them,
// and on through that child's children, and past empty children, whose own margins collapse too. They
// sit outside the element's box, where its placeholder, which has no children, has to carry them.
const addAdjoiningMargins = (element, style, side, margins) => {
  margins.push(px(style, 'margin-' + side));
  if (collapsesWithChildren(style) && !px(style, 'padding-' + side) && !px(style, 'border-' + side + '-width')) {
    addEdgeChildMargins(element, flatChildNodes(element), side, margins);
  }
  return margins;
};

// Returns whether the margins continue past all of the children.
const addEdgeChildMargins = (parent, children, side, margins) => {
  if (side === 'bottom') {
    children.reverse();
  }
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.nodeType === Node.TEXT_NODE && rendersText(child)) {
      return false;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) {
      continue;
    }

    const style = window.getComputedStyle(child);
    if (style.display === 'none' || isOutOfFlow(style)) {
      continue;
    }
    if (style.display === 'contents') {
      if (!addEdgeChildMargins(parent, flatChildNodes(child), side, margins)) {
        return false;
      }
      continue;
    }
    // Inline content makes a line box; clearance, or a formatting context of the parent's own, moves
    // the child off the edge.
    if (/^(inline|ruby)/.test(style.display) || !touchesEdge(parent, child, style, side)) {
      return false;
    }

    addAdjoiningMargins(child, style, side, margins);
    if (child.getBoundingClientRect().height !== 0 || !collapsesWithChildren(style)) {
      return false;
    }
    addAdjoiningMargins(child, style, side === 'top' ? 'bottom' : 'top', margins);
  }
  return true;
};

// Adjoining margins collapse into the largest positive one plus the most negative one. The
// placeholder carries that sum, which collapses with a neighbour's margin as the margins did, unless
// they were of both signs.
const collapse = (margins) => Math.max(0, Math.max.apply(null, margins)) + Math.min(0, Math.min.apply(null, margins));

let fontMetricsContext = null;
const fontAscents = new Map();

// How far a font's line of text reaches above its baseline.
const fontAscent = (element) => {
  const style = window.getComputedStyle(element);
  const font = [style.fontStyle, style.fontWeight, style.fontSize, style.fontFamily].join(' ');
  if (!fontAscents.has(font)) {
    fontMetricsContext = fontMetricsContext || document.createElement('canvas').getContext('2d');
    fontMetricsContext.font = font;
    fontAscents.set(font, fontMetricsContext.measureText('').fontBoundingBoxAscent);
  }
  return fontAscents.get(font);
};

// The baseline of the first (or last) line of text in an element, or of an image on that line, on
// screen.
const edgeBaseline = (element, last, scale) => {
  const children = flatChildNodes(element);
  if (last) {
    children.reverse();
  }
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.nodeType === Node.TEXT_NODE && /[^\t\n\f\r ]/.test(child.data)) {
      const rects = textRects(child);
      if (rects.length) {
        const rect = rects[last ? rects.length - 1 : 0];
        return rect.top + fontAscent(flatParent(child)) * scale.y;
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const style = window.getComputedStyle(child);
      if (style.display === 'none' || isOutOfFlow(style)) {
        continue;
      }
      if (REPLACED_TAGS.test(child.localName)) {
        if (style.verticalAlign === 'baseline') {
          return child.getBoundingClientRect().bottom + px(style, 'margin-bottom') * scale.y;
        }
        continue;
      }
      const baseline = edgeBaseline(child, last, scale);
      if (baseline !== null) {
        return baseline;
      }
    }
  }
  return null;
};

// Which line of text in it a box is aligned on, if on any: on a line of text (an inline-level box on
// the baseline, or a length or a subscript away from it), in a table row, or in a flex or grid line.
// It aligns its first line, an inline-block its last.
const baselineLine = (node, style) => {
  if (style.display === 'table-cell') {
    return style.verticalAlign === 'baseline' ? 'first' : null;
  }
  const parent = boxParent(node);
  const parentStyle = parent && window.getComputedStyle(parent);
  if (parentStyle && /flex|grid/.test(parentStyle.display) && !isOutOfFlow(style)) {
    const align = /^(auto|normal)$/.test(style.alignSelf) ? parentStyle.alignItems : style.alignSelf;
    return /baseline/.test(align) ? (/last/.test(align) ? 'last' : 'first') : null;
  }
  // The placeholder of an image or a form field, of the same tag, has its baseline where the element
  // has: on its bottom edge, or on its own line of text.
  if (
    style.display.indexOf('inline-') !== 0 ||
    /^(top|bottom|middle|text-top|text-bottom)$/.test(style.verticalAlign) ||
    REPLACED_TAGS.test(node.localName) ||
    FORM_FIELD_TAGS.test(node.localName)
  ) {
    return null;
  }
  if (style.display === 'inline-block' && node.localName !== 'button') {
    // A scroll container sits on its bottom edge, as the empty placeholder does.
    return isScrollContainer(style) ? null : 'last';
  }
  return 'first';
};

// An empty box has no baseline and sits on its bottom edge. A spacer lowered so that the line it makes
// has its baseline where the element's is puts it back.
const appendBaselineSpacer = (placeholder, baseline, height) => {
  setImportant(placeholder.style, 'font-size', '0');
  setImportant(placeholder.style, 'line-height', '0');
  const spacer = createSpacer(placeholder.ownerDocument);
  setImportant(spacer.style, 'vertical-align', baseline - height + 'px');
  pinSize(spacer.style, 0, height);
  placeholder.appendChild(spacer);
};

// How many columns and rows a cell or column spans, and a list item's number, decide where the cells
// and items after it go. Taken from the element's properties, which are numbers whatever the
// attributes say.
const copyGridAttributes = (node, placeholder) => {
  if (node instanceof HTMLTableCellElement) {
    [
      ['colspan', 'colSpan'],
      ['rowspan', 'rowSpan'],
    ].forEach(([attribute, property]) => {
      if (node.hasAttribute(attribute)) {
        placeholder.setAttribute(attribute, node[property]);
      }
    });
  } else if (node instanceof HTMLTableColElement && node.hasAttribute('span')) {
    placeholder.setAttribute('span', node.span);
  } else if (node instanceof HTMLLIElement && node.hasAttribute('value')) {
    placeholder.setAttribute('value', node.value);
  }
};

// A row or a cell inside a blocked table part is placed by the table's grid, styled by the page's CSS
// for its tag as the original was, and hidden with the part. A cell keeps its size, which sizes its
// column and row. The cells around it are placeholders too, with no text to align on: aligned on its
// baseline, an empty cell would sit on its bottom edge and could stretch the row. Plain declarations
// keep the placeholder of a long table short.
const placeGridPart = (placeholder, node, computedStyle) => {
  if (computedStyle.display === 'table-cell') {
    const style = placeholder.style;
    style.setProperty('vertical-align', 'top');
    CELL_BOX_PROPERTIES.forEach((property) => style.setProperty(property, computedStyle.getPropertyValue(property)));
  } else if (TABLE_PART_DISPLAY.test(computedStyle.display)) {
    appendInnerPlaceholders(placeholder, node, true);
  }
};

// A box keeps its size, without its padding and border, which draw nothing, and with the margins of
// its children that collapse through its edges, and the baseline of its text.
const placeBox = (placeholder, node, computedStyle) => {
  const style = placeholder.style;
  const display = computedStyle.display;
  const isCell = display === 'table-cell';
  const size = layoutSize(node, computedStyle);
  // An inline image or media element without a source is an empty inline box, which width and height
  // do not apply to.
  setImportant(style, 'display', display === 'inline' ? 'inline-block' : display);
  if (isCell) {
    CELL_BOX_PROPERTIES.forEach((property) => setImportant(style, property, computedStyle.getPropertyValue(property)));
  } else {
    pinSize(style, size.width, size.height);
    setImportant(style, 'padding', '0');
    setImportant(style, 'border-width', '0');
    setImportant(style, 'margin-top', collapse(addAdjoiningMargins(node, computedStyle, 'top', [])) + 'px');
    setImportant(style, 'margin-bottom', collapse(addAdjoiningMargins(node, computedStyle, 'bottom', [])) + 'px');
  }

  const line = baselineLine(node, computedStyle);
  if (!line) {
    return;
  }
  const rect = node.getBoundingClientRect();
  // offsetHeight has a cell's share of collapsed borders.
  const scale = screenScale(rect, { width: node.offsetWidth, height: node.offsetHeight });
  const baseline = edgeBaseline(node, line === 'last', scale);
  if (baseline === null || isNaN(baseline)) {
    return;
  }
  const offset = (baseline - rect.top) / scale.y;
  if (isCell) {
    // The line starts at the top of its content box (clientTop is the border the cell has), and the
    // row aligns it on its baseline.
    const contentOffset = offset - node.clientTop - px(computedStyle, 'padding-top');
    appendBaselineSpacer(placeholder, contentOffset, contentOffset);
  } else {
    // An inline-block's line is its baseline, whatever layout the element had. The spacer fills it,
    // so a button, which centres its content, leaves the line where it is.
    setImportant(style, 'display', 'inline-block');
    appendBaselineSpacer(placeholder, offset, size.height);
  }
};

// An inline element of text keeps its line fragments, as line spacers, unless it holds block boxes.
const placeInline = (placeholder, node) => {
  const style = placeholder.style;
  const scale = contentScale(node);
  const content = collectInlineContent(node, scale, { blocks: [], atomicInlines: [] });
  if (content.blocks.length) {
    // Block boxes inside an inline element break its line, as a block placeholder does, and make up
    // its height.
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
    return;
  }

  setImportant(style, 'display', 'inline');
  // The line fragments include the element's padding and border, and the ::before and ::after content
  // in its lines, which its class would add to the placeholder a second time.
  setImportant(style, 'padding', '0');
  setImportant(style, 'border-width', '0');
  const pseudoElements = ['before', 'after'].filter((pseudo) => {
    const pseudoStyle = window.getComputedStyle(node, '::' + pseudo);
    return !/^(none|normal|)$/.test(pseudoStyle.content) && pseudoStyle.display !== 'none' && !isOutOfFlow(pseudoStyle);
  });
  if (pseudoElements.length) {
    placeholder.setAttribute('bb-no-content', pseudoElements.join(' '));
    const rule = placeholder.ownerDocument.createElement('style');
    rule.textContent = pseudoElements
      .map((pseudo) => `[bb-no-content~=${pseudo}]::${pseudo}{content:none!important}`)
      .join('');
    placeholder.appendChild(rule);
  }
  appendLineSpacers(
    placeholder,
    Array.from(node.getClientRects(), (rect) => inLayoutPixels(rect, scale)),
    content.atomicInlines
  );
};

// A blocked element (rr-block, gl-block, or the blockClass / blockSelector replay options) is
// captured the way rrweb records it in replays: as an empty element of the same tag and size, so
// none of its text, attributes, children, shadow tree or images reach the snapshot. It keeps its
// class for the page's CSS, but not its id, which rrweb leaves out too and which can hold a name or an
// email address. It renders blank. Where the boxes inside it are laid out with the page around it
// (the children of a display: contents element, the rows and cells of a table part), each of them
// gets an inner placeholder of its tag and size, without class. placeholderDocument has no window,
// so building placeholders runs no custom element constructor and loads nothing.
const createBlockedPlaceholder = (node, placeholderDocument, isInnerBox, isInTableGrid) => {
  const placeholder = placeholderDocument.createElementNS(node.namespaceURI, node.localName);
  if (!isInnerBox && node.hasAttribute('class')) {
    placeholder.setAttribute('class', node.getAttribute('class'));
  }
  copyGridAttributes(node, placeholder);

  if (!placeholder.style || /^(br|wbr)$/.test(node.localName)) {
    return placeholder;
  }

  try {
    const computedStyle = window.getComputedStyle(node);
    const style = placeholder.style;
    const display = computedStyle.display;
    if (isInTableGrid && /^table-/.test(display)) {
      placeGridPart(placeholder, node, computedStyle);
      return placeholder;
    }

    PLACEHOLDER_LAYOUT_PROPERTIES.forEach((property) =>
      setImportant(style, property, computedStyle.getPropertyValue(property))
    );
    setImportant(style, 'visibility', 'hidden');

    if (display === 'none' || display === 'contents' || TABLE_PART_DISPLAY.test(display)) {
      setImportant(style, 'display', display);
      if (display !== 'none') {
        appendInnerPlaceholders(placeholder, node, display !== 'contents');
      }
    } else if (node instanceof HTMLElement && isTextInline(computedStyle)) {
      placeInline(placeholder, node);
    } else {
      placeBox(placeholder, node, computedStyle);
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
