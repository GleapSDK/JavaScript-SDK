import { applyGleapCSPNonce } from './GleapHelper';

// The capture bar, the recording review and the hand-off effects (shutter flash, the result flying
// into the Messenger's card) shown in the host page while a customer answers a capture request.
// Capture UI v2 (design-handoffs/capture-ui): a small frosted pill at the bottom centre that follows
// the page's light or dark scheme, a round shutter, Enter / Esc on desktop, pause while recording.
//
// Everything lives in a shadow root under one zero-size host element: page styles can't reach it,
// its styles can't reach the page, and replays and screenshots leave it out (rr-block / gl-block; a
// 0x0 placeholder in replays).

export const CAPTURE_ROOT_CLASS = 'gleap-capture-root';

// English fallbacks for the host labels the Messenger sends in capture-start.labels (contract §11).
// A Messenger that predates a key leaves it out; the English text shows then.
export const DEFAULT_CAPTURE_LABELS = {
  barScreenshotHint: 'Go to the screen, then capture',
  barCapture: 'Capture',
  barCancel: 'Cancel',
  barRecordHint: 'Go to where it happens, then start',
  barStart: 'Start recording',
  barStop: 'Stop',
  barRecording: 'Recording',
  barDragHint: 'Drag to move',
  barCaptureKeys: '{enter} to capture · {esc} to cancel',
  barStartKeys: '{enter} to start · {esc} to cancel',
  barPause: 'Pause',
  barResume: 'Resume',
  barPaused: 'Paused',
  microphone: 'Microphone',
  previewTitle: 'Send this recording?',
  previewSend: 'Send',
  previewRetake: 'Retake',
  previewDiscard: 'Discard',
  previewPlay: 'Play',
  previewWithAudio: 'with audio',
  previewNoAudio: 'no audio',
  uploading: 'Uploading…',
  recordingInterrupted: 'Recording stopped because the page changed.',
  recordAgain: 'Record again',
  permissionDenied: 'Screen capture was blocked. You can upload a file instead.',
  notSupported: "Screen capture isn't available here. You can upload a file instead.",
  failed: "That didn't work. Please try again or upload a file.",
  recordPage: 'Record this page',
  recordPageHint: "Screen sharing didn't start. You can record this page instead.",
};

/**
 * The labels to show: the Messenger's (strings only) over the English defaults.
 */
export const resolveCaptureLabels = (labels) => {
  const resolved = Object.assign({}, DEFAULT_CAPTURE_LABELS);
  if (labels && typeof labels === 'object') {
    Object.keys(DEFAULT_CAPTURE_LABELS).forEach((key) => {
      const value = labels[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        resolved[key] = value.slice(0, 300);
      }
    });
  }
  return resolved;
};

export const formatDuration = (seconds) => {
  const total = Math.max(0, Math.floor(seconds || 0));
  const rest = total % 60;
  return Math.floor(total / 60) + ':' + (rest < 10 ? '0' : '') + rest;
};

const prefersReducedMotion = () => {
  try {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (exp) {
    return false;
  }
};

// Relative luminance of an rgb()/rgba() colour, or null when it's (nearly) transparent.
const luminanceOf = (color) => {
  const match = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?/i.exec(color || '');
  if (!match) {
    return null;
  }
  if (match[4] !== undefined) {
    const alpha = match[4].indexOf('%') !== -1 ? parseFloat(match[4]) / 100 : parseFloat(match[4]);
    if (alpha < 0.5) {
      return null;
    }
  }
  const channel = (value) => {
    const v = parseFloat(value) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(match[1]) + 0.7152 * channel(match[2]) + 0.0722 * channel(match[3]);
};

const hexLuminance = (hex) =>
  luminanceOf(
    'rgb(' +
      parseInt(hex.substr(1, 2), 16) +
      ',' +
      parseInt(hex.substr(3, 2), 16) +
      ',' +
      parseInt(hex.substr(5, 2), 16) +
      ')'
  );

/**
 * Whether the page looks dark: its body / root background first, then its declared color-scheme,
 * then the system setting.
 */
export const isPageDark = () => {
  try {
    const candidates = [document.body, document.documentElement];
    for (let i = 0; i < candidates.length; i++) {
      if (candidates[i]) {
        const luminance = luminanceOf(window.getComputedStyle(candidates[i]).backgroundColor);
        if (luminance !== null) {
          return luminance < 0.2;
        }
      }
    }
    const scheme = window.getComputedStyle(document.documentElement).colorScheme || '';
    if (/\bdark\b/.test(scheme) && !/\blight\b/.test(scheme)) {
      return true;
    }
    if (/\blight\b/.test(scheme) && !/\bdark\b/.test(scheme)) {
      return false;
    }
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  } catch (exp) {
    return false;
  }
};

const FONT = 'system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
const RING_RADIUS = 21.75;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

// Light and dark tokens; `.dark` on the root switches them. The accent (project colour) only marks
// the shutter and Send.
const STYLES =
  ':host{all:initial}' +
  '.root{--ink:#0b0b0f;--ink-2:#3c4048;--muted:#6b7280;--surface:#fff;--recess:#f3f4f6;--recess-2:#e9ebef;' +
  '--line:rgba(15,17,22,.08);--hover:rgba(15,17,22,.06);--glass:rgba(255,255,255,.72);--glass-ring:rgba(15,17,22,.1);' +
  '--glass-shadow:0 14px 36px -10px rgba(15,17,22,.28),0 2px 6px rgba(15,17,22,.06);--rec:#e5484d;--error:#c4262e}' +
  '.root.dark{--ink:#ededf0;--ink-2:#c5c7ce;--muted:#9a9ca6;--surface:#17181c;--recess:#212227;--recess-2:#2a2b31;' +
  '--line:rgba(255,255,255,.08);--hover:rgba(255,255,255,.08);--glass:rgba(32,33,38,.66);--glass-ring:rgba(255,255,255,.12);' +
  '--glass-shadow:0 16px 40px -10px rgba(0,0,0,.7),0 2px 6px rgba(0,0,0,.3);--error:#ff9a9d}' +
  '.pill,.sheet{font:14px/1.45 ' +
  FONT +
  ';color:var(--ink);letter-spacing:normal;text-align:start;-webkit-font-smoothing:antialiased;box-sizing:border-box;pointer-events:auto}' +
  '.pill *,.sheet *{box-sizing:border-box}' +
  '.glass{background:var(--glass);-webkit-backdrop-filter:blur(20px) saturate(1.7);backdrop-filter:blur(20px) saturate(1.7);box-shadow:0 0 0 1px var(--glass-ring),var(--glass-shadow)}' +
  // The pill
  '.pill{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);width:max-content;max-width:calc(100vw - 32px);display:flex;align-items:center;gap:6px;padding:6px 6px 6px 18px;border-radius:999px;cursor:grab;touch-action:none;-webkit-user-select:none;user-select:none;animation:pill-in .32s cubic-bezier(.2,.8,.2,1) both}' +
  '.pill.dragging{cursor:grabbing}' +
  '.pill.moved{transform:none;animation:none}' +
  '.pill.rec{padding-left:16px}' +
  '.txt{display:flex;flex-direction:column;gap:3px;min-width:0;padding-right:8px}' +
  '.h{font-size:14px;font-weight:500;letter-spacing:-.005em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:min(440px,calc(100vw - 200px))}' +
  '.k{font-size:11.5px;color:var(--muted);white-space:nowrap;display:flex;align-items:center;gap:4px}' +
  'kbd{font:500 10.5px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;padding:2px 5px;border-radius:5px;background:var(--hover);box-shadow:inset 0 0 0 1px var(--line);color:var(--ink-2)}' +
  '.sep{flex:none;width:1px;height:22px;margin:0 2px;background:var(--line)}' +
  'button{-webkit-appearance:none;appearance:none;margin:0;border:0;padding:0;font:inherit;color:inherit;background:none;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
  'button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}' +
  'button[disabled]{opacity:.45;cursor:default}' +
  'svg{display:block;flex:none;width:18px;height:18px}' +
  '.ic{flex:none;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;color:var(--ink)}' +
  '.ic:hover:not([disabled]){background:var(--hover)}' +
  '.ic[aria-pressed=false]{color:var(--muted)}' +
  '.ic.x{color:var(--muted)}.ic.x:hover{color:var(--ink)}' +
  '.text-btn{flex:none;height:36px;padding:0 14px;border-radius:999px;font-size:13px;font-weight:600;white-space:nowrap;background:var(--accent);color:var(--on-accent)}' +
  // The shutter: a ring with the action's core (camera, red dot, stop square)
  '.shutter{position:relative;flex:none;width:46px;height:46px;border-radius:50%;display:grid;place-items:center;box-shadow:inset 0 0 0 2px color-mix(in srgb,var(--ink) 80%,transparent)}' +
  '@supports not (color:color-mix(in srgb,red 50%,blue)){.shutter{box-shadow:inset 0 0 0 2px var(--ink)}}' +
  '.core{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:var(--accent);color:var(--on-accent);transition:transform .14s ease}' +
  '.shutter:hover:not([aria-disabled=true]) .core{transform:scale(.92)}' +
  '.shutter:active:not([aria-disabled=true]) .core{transform:scale(.84)}' +
  '.shutter.start .core{width:30px;height:30px;background:var(--rec);color:#fff}' +
  '.shutter.stop .core{width:16px;height:16px;border-radius:4px;background:var(--rec)}' +
  '.shutter[aria-busy=true] .core{transform:none}' +
  '.ring{position:absolute;top:0;left:0;width:46px;height:46px;transform:rotate(-90deg)}' +
  '.ring circle{fill:none;stroke:var(--rec);stroke-width:2.5;stroke-linecap:round;transition:stroke-dashoffset .25s linear}' +
  '.spin{flex:none;width:16px;height:16px;border-radius:50%;border:2px solid currentColor;border-right-color:transparent;animation:spin .8s linear infinite}' +
  // Recording
  '.rec-state{display:flex;align-items:center;gap:10px;padding-right:6px;white-space:nowrap}' +
  '.dot{flex:none;width:10px;height:10px;border-radius:50%;background:var(--rec);box-shadow:0 0 0 4px rgba(229,72,77,.22);animation:pulse 1.4s ease-in-out infinite}' +
  '.dot.paused{animation:none;background:var(--muted);box-shadow:0 0 0 4px var(--hover)}' +
  '.time{font-size:14px;font-weight:600;font-variant-numeric:tabular-nums}' +
  '.time span{color:var(--muted);font-weight:400}' +
  '.label{font-size:12.5px;color:var(--muted)}' +
  // The review sheet
  '.sheet{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);width:min(380px,calc(100vw - 24px));max-height:calc(100vh - 40px);display:flex;flex-direction:column;padding:8px;border-radius:24px;animation:pill-in .3s cubic-bezier(.2,.8,.2,1) both}' +
  '.sheet-head{display:flex;align-items:center;gap:8px;padding:6px 4px 10px 10px}' +
  '.sheet-head .txt{flex:1;padding:0}' +
  '.sheet-title{font-size:15px;font-weight:600}' +
  '.sheet-sub{font-size:12.5px;color:var(--muted);font-variant-numeric:tabular-nums}' +
  '.media{position:relative;flex:none;aspect-ratio:16/10;border-radius:16px;overflow:hidden;background:#0b0b0f;box-shadow:0 0 0 1px var(--line)}' +
  '.media video{display:block;width:100%;height:100%;object-fit:contain;background:#0b0b0f}' +
  '.media.summary{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:var(--recess);color:var(--ink-2)}' +
  '.media.summary>svg{width:36px;height:36px;opacity:.8}' +
  '.facts{display:flex;gap:14px;font-variant-numeric:tabular-nums;font-size:13px}' +
  '.facts span{display:inline-flex;align-items:center;gap:6px}' +
  '.facts svg{width:15px;height:15px}' +
  '.play{position:absolute;top:0;right:0;bottom:0;left:0;display:grid;place-items:center;width:100%;height:100%;border-radius:0;background:linear-gradient(to top,rgba(11,11,15,.35),rgba(11,11,15,.05))}' +
  '.play span{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.92);color:#0b0b0f;box-shadow:0 6px 16px -6px rgba(0,0,0,.5)}' +
  '.chip{position:absolute;left:8px;bottom:8px;display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 9px;border-radius:999px;background:rgba(11,11,15,.72);color:#fff;font-size:11.5px;font-weight:600;font-variant-numeric:tabular-nums;pointer-events:none}' +
  '.chip svg{width:11px;height:11px}' +
  '.meter{height:4px;margin:8px 4px 0;border-radius:99px;background:var(--recess);overflow:hidden}' +
  '.meter div{height:100%;width:0;border-radius:99px;background:var(--accent);transition:width .2s}' +
  '.status{padding:8px 6px 0;font-size:12.5px;color:var(--muted)}' +
  '.status.error{color:var(--error)}' +
  '.actions{display:flex;gap:8px;padding:8px 0 0}' +
  '.btn{flex:1;height:42px;display:inline-flex;align-items:center;justify-content:center;gap:6px;border-radius:14px;font-size:14px;font-weight:600;white-space:nowrap}' +
  '.btn.p{background:var(--accent);color:var(--on-accent)}' +
  '.btn.p:hover:not([disabled]){filter:brightness(1.08)}' +
  '.btn.g{background:var(--hover);color:var(--ink)}' +
  '.btn.g:hover:not([disabled]){background:var(--recess-2)}' +
  '.btn svg{width:16px;height:16px}' +
  '.btn[aria-busy=true]{opacity:1;cursor:default}' +
  // Hand-off effects
  '.flash{position:fixed;top:0;right:0;bottom:0;left:0;background:#fff;pointer-events:none;opacity:0;animation:flash .34s ease-out both}' +
  '.flyer{position:fixed;left:0;top:0;overflow:hidden;pointer-events:none;transform-origin:0 0;box-shadow:0 24px 50px -18px rgba(15,17,22,.55),0 0 0 1px rgba(15,17,22,.07)}' +
  '.flyer img{display:block;width:100%;height:100%;object-fit:cover;object-position:top center}' +
  '@keyframes pill-in{from{opacity:0;transform:translateX(-50%) translateY(14px) scale(.96)}}' +
  '@keyframes pill-in-m{from{opacity:0;transform:translateY(14px)}}' +
  '@keyframes pulse{50%{box-shadow:0 0 0 7px rgba(229,72,77,0);opacity:.75}}' +
  '@keyframes spin{to{transform:rotate(360deg)}}' +
  '@keyframes flash{12%{opacity:.9}100%{opacity:0}}' +
  // Touch screens have no Enter / Esc to show
  '@media (hover:none){.k{display:none}}' +
  // Phones: a full-width pill (still a pill) and a full-width sheet
  '@media (max-width:600px){' +
  '.pill,.pill.moved{left:12px!important;right:12px;top:auto!important;bottom:calc(14px + env(safe-area-inset-bottom,0px));width:auto;max-width:none;transform:none;padding-left:16px;cursor:default;animation-name:pill-in-m}' +
  '.pill.moved{animation:none}' +
  '.txt{flex:1}.h{max-width:none}.k{display:none}' +
  '.pill.rec .rec-state{flex:1}' +
  '.sheet{left:12px;right:12px;bottom:calc(14px + env(safe-area-inset-bottom,0px));width:auto;transform:none;animation-name:pill-in-m}}' +
  // Reduced motion: no entrances, pulses or flights; the flash is a soft fade
  '@media (prefers-reduced-motion:reduce){.pill,.sheet,.dot{animation:none}.core,.ring circle,.meter div{transition:none}.spin{animation-duration:2.4s}.flash{animation-duration:.2s;opacity:0}}';

// 24x24 icons as one path each; built with DOM calls (no innerHTML), so Trusted Types pages work too.
const ICONS = {
  camera: [
    'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3zM12 16.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z',
  ],
  x: ['M18 6 6 18M6 6l12 12'],
  mic: ['M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3ZM5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21'],
  micOff: ['M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3ZM5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M4 4l16 16'],
  pause: ['M8 5h2.2a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1ZM13.8 5H16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-2.2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z', 'fill'],
  play: ['M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z', 'fill'],
  arrowUp: ['M12 19V5M5 12l7-7 7 7'],
  record: ['M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z'],
  page: [
    'M6.5 3h11A2.5 2.5 0 0 1 20 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18.5v-13A2.5 2.5 0 0 1 6.5 3ZM8 8h8M8 12h8M8 16h5',
  ],
  clock: ['M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17ZM12 7.5V12l3 2'],
  pointer: ['M6 3.5 18.5 12l-5.6 1.3-2.7 5.2Z'],
};

const SVG_NS = 'http://www.w3.org/2000/svg';

const icon = (name) => {
  const [d, variant] = ICONS[name];
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', d);
  if (variant === 'fill') {
    path.setAttribute('fill', 'currentColor');
  } else {
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
  }
  svg.appendChild(path);
  return svg;
};

const el = (tag, className, children) => {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  (children || []).forEach((child) => {
    if (child !== null && child !== undefined) {
      element.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    }
  });
  return element;
};

// "{enter} to capture · {esc} to cancel" with the keys as key caps.
const keyHint = (text) => {
  const hint = el('span', 'k');
  String(text)
    .split(/(\{enter\}|\{esc\})/)
    .forEach((part) => {
      if (part === '{enter}') {
        hint.appendChild(el('kbd', null, ['Enter']));
      } else if (part === '{esc}') {
        hint.appendChild(el('kbd', null, ['Esc']));
      } else if (part) {
        hint.appendChild(document.createTextNode(part));
      }
    });
  hint.setAttribute('aria-hidden', 'true');
  return hint;
};

// The page's own shadow host styles: through the CSSOM, so a CSP without 'unsafe-inline' still
// applies them.
const HOST_STYLES = {
  position: 'fixed',
  top: '0',
  left: '0',
  width: '0',
  height: '0',
  overflow: 'visible',
  'z-index': '2147483647',
  display: 'block',
  margin: '0',
  padding: '0',
  border: '0',
  transform: 'none',
  // The privacy veil blurs rr-block / gl-block elements; never this one.
  filter: 'none',
  'pointer-events': 'none',
};

// A zero-size host with a shadow root and the styles; returns { host, root }.
const createLayer = (primaryColor, rtl) => {
  const host = document.createElement('div');
  host.className = CAPTURE_ROOT_CLASS + ' rr-block gl-block';
  Object.keys(HOST_STYLES).forEach((property) => host.style.setProperty(property, HOST_STYLES[property], 'important'));
  const shadow = host.attachShadow({ mode: 'open' });
  let styled = false;
  try {
    if (typeof CSSStyleSheet === 'function' && 'adoptedStyleSheets' in shadow) {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(STYLES);
      shadow.adoptedStyleSheets = [sheet];
      styled = true;
    }
  } catch (exp) {}
  if (!styled) {
    const style = document.createElement('style');
    applyGleapCSPNonce(style);
    style.textContent = STYLES;
    shadow.appendChild(style);
  }
  const root = el('div', 'root');
  root.setAttribute('dir', rtl ? 'rtl' : 'ltr');
  applyTheme(root, primaryColor);
  shadow.appendChild(root);
  return { host, root };
};

// Light or dark like the page; the project colour as accent (near-black flips to near-white on a
// dark page, as the Messenger does).
const applyTheme = (root, primaryColor) => {
  const dark = isPageDark();
  root.classList.toggle('dark', dark);
  const hex = /^#[0-9a-f]{6}$/i.test(primaryColor || '') ? primaryColor : '#485BFF';
  const luminance = hexLuminance(hex) || 0;
  if (dark && luminance < 0.03) {
    root.style.setProperty('--accent', '#f2f2f4');
    root.style.setProperty('--on-accent', '#0b0b0f');
  } else {
    root.style.setProperty('--accent', hex);
    root.style.setProperty('--on-accent', luminance > 0.45 ? '#0b0b0f' : '#ffffff');
  }
};

const attach = (host) => {
  try {
    if (host && !host.isConnected) {
      (document.body || document.documentElement).appendChild(host);
    }
  } catch (exp) {}
};

/**
 * The page "shrinks into the editor": a short white flash right after the screenshot is taken
 * (never part of it). A plain fade with reduced motion.
 */
export const flashCapture = () => {
  try {
    const { host, root } = createLayer(null, false);
    root.appendChild(el('div', 'flash'));
    attach(host);
    setTimeout(() => {
      try {
        host.remove();
      } catch (exp) {}
    }, 420);
  } catch (exp) {}
};

/**
 * The sent result flies from `from` into the Messenger card's slot `to` (both viewport rects), then
 * `done` runs. Without motion (reduced motion, no Web Animations, a missing rect) `done` runs at once.
 * @param {{src: string, from: object, to: object, radius?: number, done: function()}} flight
 */
export const flyCapture = ({ src, from, to, radius, done }) => {
  const finish = () => {
    try {
      done();
    } catch (exp) {}
  };
  const valid = (rect) => rect && rect.width > 0 && rect.height > 0 && isFinite(rect.x) && isFinite(rect.y);
  if (prefersReducedMotion() || !src || !valid(from) || !valid(to) || typeof Element.prototype.animate !== 'function') {
    finish();
    return;
  }
  let host = null;
  try {
    const layer = createLayer(null, false);
    host = layer.host;
    const flyer = el('div', 'flyer');
    const image = document.createElement('img');
    image.alt = '';
    image.src = src;
    flyer.appendChild(image);
    flyer.style.width = from.width + 'px';
    flyer.style.height = from.height + 'px';
    flyer.style.borderRadius = '14px';
    layer.root.appendChild(flyer);
    attach(host);
    const sx = to.width / from.width;
    const sy = to.height / from.height;
    const endRadius = ((radius || 16) * from.width) / Math.max(1, to.width);
    const animation = flyer.animate(
      [
        { transform: 'translate(' + from.x + 'px,' + from.y + 'px) scale(1)', borderRadius: '14px' },
        {
          transform:
            'translate(' +
            (from.x + (to.x - from.x) * 0.55) +
            'px,' +
            (Math.min(from.y, to.y) - 30) +
            'px) scale(' +
            (0.5 + 0.5 * sx) +
            ')',
          borderRadius: '16px',
          offset: 0.55,
        },
        {
          transform: 'translate(' + to.x + 'px,' + to.y + 'px) scale(' + sx + ',' + sy + ')',
          borderRadius: endRadius + 'px',
        },
      ],
      { duration: 620, easing: 'cubic-bezier(0.3, 0.7, 0.2, 1)', fill: 'forwards' }
    );
    let landed = false;
    const land = () => {
      if (landed) {
        return;
      }
      landed = true;
      finish();
      try {
        flyer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'forwards' }).onfinish = () => {
          try {
            host.remove();
          } catch (exp) {}
        };
      } catch (exp) {
        host.remove();
      }
    };
    animation.onfinish = land;
    // A tab in the background doesn't run animations: land anyway.
    setTimeout(land, 1200);
  } catch (exp) {
    try {
      if (host) {
        host.remove();
      }
    } catch (e) {}
    finish();
  }
};

export default class GleapCaptureUI {
  host = null;
  root = null;
  pill = null;
  timer = null;
  ring = null;
  dot = null;
  pausedLabel = null;
  pauseButton = null;
  maxSec = 0;
  micButton = null;
  progress = null;
  status = null;
  previewButtons = null;
  previewMedia = null;
  previewVideo = null;
  previewUrl = null;
  meter = null;
  // Where the customer dragged the pill to (desktop), kept across state changes.
  position = null;
  cleanupDrag = null;
  cleanupKeys = null;
  // Off for a bar restored after a page load, so it doesn't take the focus from the page.
  autoFocus = true;

  constructor({ labels, primaryColor, rtl, onAction }) {
    this.labels = resolveCaptureLabels(labels);
    this.onAction = onAction;
    this.rtl = !!rtl;
    this.primaryColor = /^#[0-9a-f]{6}$/i.test(primaryColor || '') ? primaryColor : '#485BFF';
  }

  mount() {
    if (!this.host) {
      const layer = createLayer(this.primaryColor, this.rtl);
      this.host = layer.host;
      this.root = layer.root;
    } else {
      // The page may have switched its theme since.
      applyTheme(this.root, this.primaryColor);
    }
    this.ensureAttached();
  }

  // Re-attaches the UI when the page replaced the body (e.g. Turbo navigation).
  ensureAttached() {
    attach(this.host);
  }

  isOwnElement(node) {
    return !!(this.host && node && (node === this.host || this.host.contains(node)));
  }

  setVisible(visible) {
    if (this.host) {
      this.host.style.setProperty('visibility', visible ? 'visible' : 'hidden', 'important');
    }
  }

  action(name) {
    try {
      if (this.onAction) {
        this.onAction(name);
      }
    } catch (exp) {}
  }

  // A button that runs an action; `aria-disabled` (not `disabled`) keeps a busy button focusable.
  button(className, action, children, label) {
    const button = el('button', className, children);
    button.type = 'button';
    if (label) {
      button.setAttribute('aria-label', label);
      button.title = label;
    }
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      if (!button.disabled && button.getAttribute('aria-disabled') !== 'true') {
        this.action(action);
      }
    });
    return button;
  }

  closeButton(label) {
    return this.button('ic x', 'cancel', [icon('x')], label);
  }

  micToggle(mic, disabled) {
    if (!mic || !mic.available) {
      return null;
    }
    const button = this.button('ic', 'mic', [icon(mic.on ? 'mic' : 'micOff')], this.labels.microphone);
    button.setAttribute('aria-pressed', mic.on ? 'true' : 'false');
    button.disabled = !!disabled;
    this.micButton = button;
    return button;
  }

  // The round shutter: `kind` camera | start | stop; busy shows a spinner in the core.
  shutter(kind, action, label, busy) {
    const core = el('span', 'core', [busy ? el('span', 'spin') : kind === 'camera' ? icon('camera') : null]);
    const children = [core];
    if (kind === 'stop') {
      const ring = document.createElementNS(SVG_NS, 'svg');
      ring.setAttribute('class', 'ring');
      ring.setAttribute('viewBox', '0 0 46 46');
      ring.setAttribute('aria-hidden', 'true');
      const circle = document.createElementNS(SVG_NS, 'circle');
      circle.setAttribute('cx', '23');
      circle.setAttribute('cy', '23');
      circle.setAttribute('r', String(RING_RADIUS));
      circle.setAttribute('stroke-dasharray', String(RING_LENGTH));
      circle.setAttribute('stroke-dashoffset', String(RING_LENGTH));
      ring.appendChild(circle);
      children.unshift(ring);
      this.ring = circle;
    }
    const button = this.button('shutter' + (kind === 'camera' ? '' : ' ' + kind), action, children, label);
    if (busy) {
      button.setAttribute('aria-busy', 'true');
      button.setAttribute('aria-disabled', 'true');
    }
    return button;
  }

  focus(element) {
    try {
      if (this.autoFocus && element) {
        element.focus({ preventScroll: true });
      }
    } catch (exp) {}
  }

  // Removes what is shown (and its listeners and preview URL).
  reset() {
    if (this.cleanupDrag) {
      this.cleanupDrag();
      this.cleanupDrag = null;
    }
    if (this.cleanupKeys) {
      this.cleanupKeys();
      this.cleanupKeys = null;
    }
    if (this.previewUrl) {
      try {
        URL.revokeObjectURL(this.previewUrl);
      } catch (exp) {}
      this.previewUrl = null;
    }
    this.pill = this.timer = this.ring = this.dot = this.pausedLabel = this.pauseButton = null;
    this.micButton = this.progress = this.status = this.previewButtons = this.previewMedia = this.previewVideo = null;
    this.meter = null;
    while (this.root && this.root.firstChild) {
      this.root.removeChild(this.root.firstChild);
    }
  }

  /**
   * Enter runs `enter`, Escape runs `cancel` — only while nothing else on the page has the focus (the
   * page keeps its own Enter / Escape, e.g. in a form or its own dialog).
   */
  listenForKeys(enterAction) {
    const onKeyDown = (event) => {
      try {
        if (event.defaultPrevented || event.isComposing || event.metaKey || event.ctrlKey || event.altKey) {
          return;
        }
        const active = document.activeElement;
        const free = !active || active === document.body || active === document.documentElement || active === this.host;
        if (!free) {
          return;
        }
        const path = event.composedPath ? event.composedPath() : [];
        const onButton = path[0] && path[0].tagName === 'BUTTON';
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          this.action('cancel');
        } else if (event.key === 'Enter' && enterAction && !onButton) {
          event.preventDefault();
          event.stopPropagation();
          this.action(enterAction);
        }
      } catch (exp) {}
    };
    document.addEventListener('keydown', onKeyDown, true);
    this.cleanupKeys = () => document.removeEventListener('keydown', onKeyDown, true);
  }

  /**
   * The pill: content, then buttons. `keys`: Enter's action for the keyboard (null: no keys, e.g.
   * while recording, where the page may use them itself).
   */
  showPill({ label, content, buttons, focusIndex, recording, keys }) {
    this.mount();
    this.reset();
    const pill = el('div', 'pill glass' + (recording ? ' rec' : ''), content.concat(buttons));
    pill.setAttribute('role', 'region');
    pill.setAttribute('aria-label', label);
    pill.title = '';
    this.place(pill);
    this.enableDragging(pill);
    this.root.appendChild(pill);
    this.pill = pill;
    if (keys !== null) {
      this.listenForKeys(keys);
    }
    this.focus(buttons[focusIndex]);
  }

  hint(text, keysText) {
    const children = [el('span', 'h', [text])];
    if (keysText) {
      children.push(keyHint(keysText));
    }
    const hint = el('div', 'txt', children);
    hint.firstChild.title = text;
    return hint;
  }

  place(pill) {
    if (this.position) {
      pill.classList.add('moved');
      pill.style.left = this.position.left + 'px';
      pill.style.top = this.position.top + 'px';
      pill.style.bottom = 'auto';
    }
  }

  // The whole pill drags (not its buttons); phones keep it docked at the bottom.
  enableDragging(pill) {
    let start = null;
    const move = (event) => {
      try {
        if (start) {
          this.position = {
            left: Math.max(8, Math.min(window.innerWidth - pill.offsetWidth - 8, start.left + event.clientX - start.x)),
            top: Math.max(8, Math.min(window.innerHeight - pill.offsetHeight - 8, start.top + event.clientY - start.y)),
          };
          this.place(pill);
        }
      } catch (exp) {}
    };
    const up = () => {
      start = null;
      pill.classList.remove('dragging');
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', up, true);
      window.removeEventListener('pointercancel', up, true);
    };
    const down = (event) => {
      try {
        const path = event.composedPath ? event.composedPath() : [];
        const onButton = path.some((node) => node && node.tagName === 'BUTTON');
        if (event.button || onButton || window.innerWidth <= 600) {
          return;
        }
        event.preventDefault();
        const rect = pill.getBoundingClientRect();
        start = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
        pill.classList.add('dragging');
        window.addEventListener('pointermove', move, true);
        window.addEventListener('pointerup', up, true);
        window.addEventListener('pointercancel', up, true);
      } catch (exp) {}
    };
    pill.addEventListener('pointerdown', down);
    pill.title = this.labels.barDragHint;
    this.cleanupDrag = up;
  }

  /**
   * Screenshot pill: "Go to the screen, then capture" · shutter · ×. `busy` while the screenshot is
   * taken (× still cancels).
   */
  showScreenshotBar(busy) {
    const labels = this.labels;
    const shutter = this.shutter('camera', 'capture', labels.barCapture, busy);
    this.showPill({
      label: labels.barCapture,
      content: [this.hint(labels.barScreenshotHint, labels.barCaptureKeys)],
      buttons: [shutter, this.closeButton(labels.barCancel)],
      focusIndex: 0,
      keys: busy ? null : 'capture',
    });
  }

  /**
   * Recording pill before the start: hint · (microphone) · red shutter · ×. After a page load it
   * says the recording stopped, with the shutter as Record again.
   */
  showRecordBar({ busy, mic, interrupted }) {
    const labels = this.labels;
    const start = interrupted ? labels.recordAgain : labels.barStart;
    const shutter = this.shutter('start', 'start', start, busy);
    const buttons = [this.micToggle(mic, busy), shutter, this.closeButton(labels.barCancel)].filter(Boolean);
    this.showPill({
      label: start,
      content: [this.hint(interrupted ? labels.recordingInterrupted : labels.barRecordHint, labels.barStartKeys)],
      buttons,
      focusIndex: buttons.indexOf(shutter),
      keys: busy ? null : 'start',
    });
  }

  /**
   * Screen sharing didn't start (declined, blocked or unavailable): hint · Record this page · ×.
   */
  showPageRecordingOffer() {
    const labels = this.labels;
    const offer = this.button('text-btn', 'record-page', [labels.recordPage]);
    this.showPill({
      label: labels.recordPage,
      content: [this.hint(labels.recordPageHint)],
      buttons: [offer, this.closeButton(labels.barCancel)],
      focusIndex: 0,
      keys: 'record-page',
    });
  }

  /**
   * While recording: pulsing dot · 0:12 / 2:00 | (microphone) · (pause) · Stop with a ring that fills
   * toward the limit.
   */
  showRecordingBar({ mic, maxSec, canPause }) {
    const labels = this.labels;
    this.maxSec = maxSec;
    const dot = el('span', 'dot');
    dot.setAttribute('aria-hidden', 'true');
    const elapsed = el('b', null, [formatDuration(0)]);
    const time = el('span', 'time', [elapsed, ' ', el('span', null, ['/ ' + formatDuration(maxSec)])]);
    time.setAttribute('role', 'timer');
    const pausedLabel = el('span', 'label', [labels.barPaused]);
    pausedLabel.style.display = 'none';
    const state = el('div', 'rec-state', [dot, pausedLabel, time]);
    const pause = canPause ? this.button('ic', 'pause', [icon('pause')], labels.barPause) : null;
    const stop = this.shutter('stop', 'stop', labels.barStop, false);
    const buttons = [this.micToggle(mic), pause, stop].filter(Boolean);
    this.showPill({
      label: labels.barRecording,
      content: [state, el('span', 'sep')],
      buttons,
      focusIndex: buttons.length - 1,
      recording: true,
      keys: null,
    });
    this.timer = elapsed;
    this.dot = dot;
    this.pausedLabel = pausedLabel;
    this.pauseButton = pause;
  }

  updateTimer(elapsedSec) {
    if (this.timer) {
      this.timer.textContent = formatDuration(elapsedSec);
    }
    if (this.ring && this.maxSec > 0) {
      const share = Math.max(0, Math.min(1, elapsedSec / this.maxSec));
      this.ring.setAttribute('stroke-dashoffset', String(RING_LENGTH * (1 - share)));
    }
  }

  setPaused(paused) {
    if (this.dot) {
      this.dot.classList.toggle('paused', !!paused);
    }
    if (this.pausedLabel) {
      this.pausedLabel.style.display = paused ? '' : 'none';
    }
    const button = this.pauseButton;
    if (button) {
      const label = paused ? this.labels.barResume : this.labels.barPause;
      button.setAttribute('aria-label', label);
      button.title = label;
      button.replaceChild(icon(paused ? 'play' : 'pause'), button.firstChild);
    }
  }

  setMicOn(on) {
    const button = this.micButton;
    if (button) {
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
      button.replaceChild(icon(on ? 'mic' : 'micOff'), button.firstChild);
    }
  }

  /**
   * After Stop: "Send this recording?" — the recording (screen recordings) or a short summary (page
   * recordings), Retake and Send; × discards.
   * @param {{video?: Blob, durationMs: number, interactions?: number, audio?: boolean}} preview
   */
  showPreview(preview) {
    this.mount();
    this.reset();
    const labels = this.labels;
    const duration = formatDuration((preview.durationMs || 0) / 1000);
    let media;
    if (preview.video) {
      const video = document.createElement('video');
      video.playsInline = true;
      video.preload = 'auto';
      video.muted = false;
      // MediaRecorder files often lack a duration: seek to the end once so the controls know it,
      // then back to the first frame (the poster the card gets).
      video.addEventListener(
        'loadedmetadata',
        () => {
          try {
            if (video.duration === Infinity) {
              const rewind = () => {
                video.removeEventListener('timeupdate', rewind);
                video.currentTime = 0.05;
              };
              video.addEventListener('timeupdate', rewind);
              video.currentTime = 1e7;
            } else {
              video.currentTime = 0.05;
            }
          } catch (exp) {}
        },
        { once: true }
      );
      this.previewUrl = URL.createObjectURL(preview.video);
      video.src = this.previewUrl;
      const chip = el('span', 'chip', [icon('play'), duration]);
      const play = el('button', 'play', [el('span', null, [icon('play')])]);
      play.type = 'button';
      play.setAttribute('aria-label', labels.previewPlay);
      play.addEventListener('click', (event) => {
        event.stopPropagation();
        try {
          play.remove();
          chip.remove();
          video.controls = true;
          const started = video.play();
          if (started && started.catch) {
            started.catch(() => {});
          }
        } catch (exp) {}
      });
      media = el('div', 'media', [video, play, chip]);
      this.previewVideo = video;
    } else {
      const facts = el('div', 'facts', [el('span', null, [icon('clock'), duration])]);
      if (typeof preview.interactions === 'number') {
        facts.appendChild(el('span', null, [icon('pointer'), String(preview.interactions)]));
      }
      media = el('div', 'media summary', [icon('page'), facts]);
    }
    this.previewMedia = media;

    const sub =
      duration +
      (typeof preview.audio === 'boolean'
        ? ' · ' + (preview.audio ? labels.previewWithAudio : labels.previewNoAudio)
        : '');
    const title = el('span', 'sheet-title', [labels.previewTitle]);
    title.id = 'gl-title';
    const head = el('div', 'sheet-head', [
      el('div', 'txt', [title, el('span', 'sheet-sub', [sub])]),
      this.closeButton(labels.previewDiscard),
    ]);
    this.status = el('div', 'status');
    this.status.setAttribute('aria-live', 'polite');
    this.status.style.display = 'none';
    const buttons = {
      retake: this.button('btn g', 'retake', [labels.previewRetake]),
      send: this.button('btn p', 'send', [labels.previewSend, icon('arrowUp')]),
    };
    this.previewButtons = buttons;
    const sheet = el('div', 'sheet glass', [
      head,
      media,
      this.status,
      el('div', 'actions', [buttons.retake, buttons.send]),
    ]);
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-labelledby', title.id);
    this.root.appendChild(sheet);
    this.listenForKeys(null);
    this.focus(buttons.send);
  }

  /**
   * Where the recording is shown (the flight into the card starts there), or null.
   */
  getPreviewRect() {
    try {
      if (!this.previewMedia) {
        return null;
      }
      const rect = this.previewMedia.getBoundingClientRect();
      return rect.width > 0 ? { x: rect.left, y: rect.top, width: rect.width, height: rect.height } : null;
    } catch (exp) {
      return null;
    }
  }

  /**
   * The recording's first frame as a small JPEG data: URL (long edge ≤ 480 px), or null.
   */
  getPosterDataUrl() {
    try {
      const video = this.previewVideo;
      if (!video || video.readyState < 2 || !video.videoWidth) {
        return null;
      }
      const scale = Math.min(1, 480 / Math.max(video.videoWidth, video.videoHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.75);
    } catch (exp) {
      // A tainted or unsupported frame: no poster.
      return null;
    }
  }

  /**
   * Upload progress (0..1) in the review; Retake waits and Send shows the progress.
   */
  setUploading(progress) {
    if (!this.status) {
      return;
    }
    const buttons = this.previewButtons;
    buttons.retake.disabled = true;
    buttons.send.setAttribute('aria-disabled', 'true');
    buttons.send.setAttribute('aria-busy', 'true');
    const percent = Math.round(Math.max(0, Math.min(1, progress || 0)) * 100);
    while (buttons.send.firstChild) {
      buttons.send.removeChild(buttons.send.firstChild);
    }
    buttons.send.appendChild(el('span', 'spin'));
    buttons.send.appendChild(document.createTextNode(percent + '%'));
    if (!this.progress) {
      this.status.className = 'status';
      this.status.style.display = 'none';
      this.progress = el('div');
      const track = el('div', 'meter', [this.progress]);
      track.setAttribute('role', 'progressbar');
      track.setAttribute('aria-label', this.labels.uploading);
      this.previewMedia.parentNode.insertBefore(track, this.status);
      this.meter = track;
    }
    this.progress.style.width = percent + '%';
  }

  /**
   * An error in the review; Send tries again.
   */
  setPreviewError(message) {
    if (!this.status) {
      return;
    }
    const buttons = this.previewButtons;
    if (this.meter) {
      try {
        this.meter.remove();
      } catch (exp) {}
      this.meter = null;
    }
    this.progress = null;
    this.status.className = 'status error';
    this.status.style.display = '';
    this.status.textContent = message || this.labels.failed;
    buttons.retake.disabled = false;
    buttons.send.removeAttribute('aria-disabled');
    buttons.send.removeAttribute('aria-busy');
    while (buttons.send.firstChild) {
      buttons.send.removeChild(buttons.send.firstChild);
    }
    buttons.send.appendChild(document.createTextNode(this.labels.previewSend));
    buttons.send.appendChild(icon('arrowUp'));
  }

  destroy() {
    this.reset();
    try {
      if (this.host) {
        this.host.remove();
      }
    } catch (exp) {}
    this.host = this.root = this.onAction = null;
  }
}
