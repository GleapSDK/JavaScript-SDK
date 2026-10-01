import { applyGleapCSPNonce } from './GleapHelper';

// The capture bar and the recording preview shown in the host page while a customer answers a
// capture request. Everything lives in a shadow root under one zero-size host element: page styles
// can't reach it, its styles can't reach the page, and replays and screenshots leave it out
// (rr-block / gl-block; a 0x0 placeholder in replays).

export const CAPTURE_ROOT_CLASS = 'gleap-capture-root';

// English fallbacks for the host labels the Messenger sends in capture-start.labels (contract §11).
export const DEFAULT_CAPTURE_LABELS = {
  barScreenshotHint: 'Go to the screen you want to show, then tap Capture.',
  barCapture: 'Capture',
  barCancel: 'Cancel',
  barRecordHint: 'Go to where the issue happens, then start recording.',
  barStart: 'Start recording',
  barStop: 'Stop',
  barRecording: 'Recording',
  microphone: 'Microphone',
  previewTitle: 'Send this recording?',
  previewSend: 'Send',
  previewRetake: 'Retake',
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

// Light text on a dark bar, whatever the page looks like. The primary button takes the project color.
const STYLES =
  ':host{all:initial}' +
  '.bar,.overlay{font:14px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color:#fff;letter-spacing:normal;text-align:start;-webkit-font-smoothing:antialiased;box-sizing:border-box;pointer-events:auto;animation:in .18s ease-out both}' +
  '.bar *,.overlay *{box-sizing:border-box}' +
  '.bar{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);display:flex;align-items:center;gap:8px;width:max-content;max-width:min(680px,calc(100vw - 32px));padding:8px;border-radius:16px;background:rgba(22,22,26,.97);box-shadow:0 12px 40px rgba(0,0,0,.3),0 0 0 1px rgba(255,255,255,.1)}' +
  '.moved{transform:none}' +
  '.grip{flex:none;align-self:stretch;width:18px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.45);cursor:grab;touch-action:none}' +
  '.hint{flex:1 1 auto;min-width:0;padding:0 6px}' +
  '.rec{display:flex;align-items:center;gap:8px;white-space:nowrap}' +
  '.dot{flex:none;width:10px;height:10px;border-radius:50%;background:#ff4d4f;animation:pulse 1.4s ease-in-out infinite}' +
  '.timer{font-variant-numeric:tabular-nums;color:rgba(255,255,255,.85)}' +
  '.actions{flex:none;display:flex;align-items:center;gap:8px}' +
  'button{-webkit-appearance:none;appearance:none;margin:0;border:0;border-radius:10px;min-height:36px;padding:0 14px;display:inline-flex;align-items:center;justify-content:center;gap:6px;font:inherit;font-weight:600;white-space:nowrap;cursor:pointer;color:#fff;background:rgba(255,255,255,.12)}' +
  'button:hover{background:rgba(255,255,255,.2)}' +
  'button:focus-visible{outline:2px solid #fff;outline-offset:2px}' +
  'button[disabled]{opacity:.55;cursor:default}' +
  '.primary,.primary:hover{background:var(--primary);color:var(--on-primary)}' +
  '.stop,.stop:hover{background:#e5484d;color:#fff}' +
  '.icon{width:36px;padding:0}' +
  '.icon[aria-pressed=false]{color:rgba(255,255,255,.55)}' +
  '.spin{flex:none;width:16px;height:16px;border-radius:50%;border:2px solid currentColor;border-right-color:transparent;animation:spin .8s linear infinite}' +
  'svg{flex:none;width:18px;height:18px}' +
  '.overlay{position:fixed;top:0;right:0;bottom:0;left:0;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(8,8,10,.62)}' +
  '.card{width:100%;max-width:760px;max-height:100%;display:flex;flex-direction:column;overflow:hidden;border-radius:16px;background:#16161a;box-shadow:0 24px 60px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.1)}' +
  '.title{padding:16px 20px 12px;font-size:16px;font-weight:600}' +
  '.media{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:#000;color:rgba(255,255,255,.85)}' +
  '.media video{display:block;width:100%;max-height:62vh;background:#000;object-fit:contain}' +
  '.summary{padding:32px 20px;background:rgba(255,255,255,.04)}' +
  '.summary>svg{width:40px;height:40px;opacity:.8}' +
  '.facts{display:flex;gap:14px;font-variant-numeric:tabular-nums}' +
  '.facts span{display:inline-flex;align-items:center;gap:6px}' +
  '.footer{display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:12px 16px 16px}' +
  '.status{flex:1 1 200px;min-width:0;color:rgba(255,255,255,.8)}' +
  '.error{color:#ff9a9d}' +
  '.progress{height:4px;margin-top:8px;overflow:hidden;border-radius:2px;background:rgba(255,255,255,.15)}' +
  '.progress div{height:100%;width:0;background:var(--primary);transition:width .2s}' +
  '.footer .actions{margin-left:auto}' +
  '@keyframes in{from{opacity:0}}@keyframes pulse{50%{opacity:.3}}@keyframes spin{to{transform:rotate(360deg)}}' +
  '@media (prefers-reduced-motion:reduce){.bar,.overlay,.dot{animation:none}.spin{animation-duration:2.4s}.progress div{transition:none}}' +
  '@media (max-width:600px){' +
  '.bar,.moved{left:0!important;right:0;top:auto!important;bottom:0;transform:none;width:auto;max-width:none;flex-wrap:wrap;border-radius:16px 16px 0 0;' +
  'padding:12px calc(12px + env(safe-area-inset-right,0px)) calc(12px + env(safe-area-inset-bottom,0px)) calc(12px + env(safe-area-inset-left,0px))}' +
  '.grip{display:none}.hint{flex:1 1 100%;padding:2px 4px 6px}.recording .hint{flex:1 1 auto}' +
  '.actions{flex:1 1 100%}.recording .actions{flex:0 0 auto}.actions button:not(.icon){flex:1 1 0}' +
  'button{min-height:44px}.icon{width:44px}' +
  '.overlay{padding:0;align-items:flex-end}.card{max-width:none;border-radius:16px 16px 0 0;padding-bottom:env(safe-area-inset-bottom,0px)}' +
  '.media video{max-height:55vh}}';

// 24x24 icons as one path each; built with DOM calls (no innerHTML), so Trusted Types pages work too.
const ICONS = {
  grip: ['M9 6h0M15 6h0M9 12h0M15 12h0M9 18h0M15 18h0', 'dots'],
  camera: [
    'M4 8h3l1.6-2.4a1.5 1.5 0 0 1 1.3-.6h4.2a1.5 1.5 0 0 1 1.3.6L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1ZM12 16.4a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8Z',
  ],
  record: ['M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z'],
  stop: ['M8 7h8a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z', 'fill'],
  mic: ['M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3ZM5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21'],
  micOff: ['M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3ZM5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M4 4l16 16'],
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
    path.setAttribute('stroke-width', variant ? '3.2' : '1.8');
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

export default class GleapCaptureUI {
  host = null;
  root = null;
  timer = null;
  maxSec = 0;
  micButton = null;
  progress = null;
  status = null;
  previewButtons = null;
  previewUrl = null;
  // Where the customer dragged the bar to (desktop), kept across state changes.
  position = null;
  cleanupDrag = null;
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
      const host = document.createElement('div');
      host.className = CAPTURE_ROOT_CLASS + ' rr-block gl-block';
      // Through the CSSOM: a page CSP without 'unsafe-inline' still applies these.
      const hostStyles = {
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
      Object.keys(hostStyles).forEach((property) => host.style.setProperty(property, hostStyles[property], 'important'));

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

      const r = parseInt(this.primaryColor.substr(1, 2), 16);
      const g = parseInt(this.primaryColor.substr(3, 2), 16);
      const b = parseInt(this.primaryColor.substr(5, 2), 16);
      this.root = el('div');
      this.root.setAttribute('dir', this.rtl ? 'rtl' : 'ltr');
      this.root.style.setProperty('--primary', this.primaryColor);
      this.root.style.setProperty('--on-primary', (r * 299 + g * 587 + b * 114) / 1000 >= 160 ? '#000' : '#fff');
      shadow.appendChild(this.root);
      this.host = host;
    }
    this.ensureAttached();
  }

  // Re-attaches the UI when the page replaced the body (e.g. Turbo navigation).
  ensureAttached() {
    try {
      if (this.host && !this.host.isConnected) {
        (document.body || document.documentElement).appendChild(this.host);
      }
    } catch (exp) {}
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

  button(text, action, className, iconName, disabled) {
    const button = el('button', className, [iconName ? icon(iconName) : null, text]);
    button.type = 'button';
    button.disabled = !!disabled;
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      if (!button.disabled) {
        this.action(action);
      }
    });
    return button;
  }

  micToggle(mic, disabled) {
    if (!mic || !mic.available) {
      return null;
    }
    const button = this.button(null, 'mic', 'icon', mic.on ? 'mic' : 'micOff', disabled);
    button.setAttribute('aria-pressed', mic.on ? 'true' : 'false');
    button.setAttribute('aria-label', this.labels.microphone);
    button.title = this.labels.microphone;
    this.micButton = button;
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
    if (this.previewUrl) {
      try {
        URL.revokeObjectURL(this.previewUrl);
      } catch (exp) {}
      this.previewUrl = null;
    }
    this.timer = this.micButton = this.progress = this.status = this.previewButtons = null;
    while (this.root && this.root.firstChild) {
      this.root.removeChild(this.root.firstChild);
    }
  }

  /**
   * A bar: drag grip, a hint (or status) and buttons. Escape in the bar runs `escape` (not while
   * recording: the page may use Escape itself).
   */
  bar(label, content, buttons, focusIndex, recording) {
    this.mount();
    this.reset();
    const grip = el('div', 'grip', [icon('grip')]);
    grip.setAttribute('aria-hidden', 'true');
    const actions = el('div', 'actions', buttons);
    const bar = el('div', 'bar' + (recording ? ' recording' : ''), [grip, content, actions]);
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', label);
    if (!recording) {
      bar.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          this.action('cancel');
        }
      });
    }
    this.place(bar);
    this.enableDragging(bar, grip);
    this.root.appendChild(bar);
    this.focus(buttons[focusIndex]);
  }

  place(bar) {
    if (this.position) {
      bar.classList.add('moved');
      bar.style.left = this.position.left + 'px';
      bar.style.top = this.position.top + 'px';
      bar.style.bottom = 'auto';
    }
  }

  enableDragging(bar, grip) {
    let start = null;
    const move = (event) => {
      if (start) {
        this.position = {
          left: Math.max(8, Math.min(window.innerWidth - bar.offsetWidth - 8, start.left + event.clientX - start.x)),
          top: Math.max(8, Math.min(window.innerHeight - bar.offsetHeight - 8, start.top + event.clientY - start.y)),
        };
        this.place(bar);
      }
    };
    const up = () => {
      start = null;
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', up, true);
      window.removeEventListener('pointercancel', up, true);
    };
    const down = (event) => {
      if (event.button) {
        return;
      }
      event.preventDefault();
      const rect = bar.getBoundingClientRect();
      start = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
      window.addEventListener('pointermove', move, true);
      window.addEventListener('pointerup', up, true);
      window.addEventListener('pointercancel', up, true);
    };
    grip.addEventListener('pointerdown', down);
    this.cleanupDrag = up;
  }

  busyButton(text, action, iconName, busy) {
    const button = this.button(busy ? null : text, action, 'primary', busy ? null : iconName, busy);
    if (busy) {
      button.appendChild(el('span', 'spin'));
      button.appendChild(document.createTextNode(text));
      button.setAttribute('aria-busy', 'true');
    }
    return button;
  }

  /**
   * Screenshot bar: hint · Capture · Cancel. `busy` while the screenshot is taken.
   */
  showScreenshotBar(busy) {
    const labels = this.labels;
    this.bar(
      labels.barCapture,
      el('div', 'hint', [labels.barScreenshotHint]),
      [
        this.busyButton(labels.barCapture, 'capture', 'camera', busy),
        this.button(labels.barCancel, 'cancel', null, null, busy),
      ],
      0
    );
  }

  /**
   * Recording bar before the start: hint · Start recording · (microphone) · Cancel. After a page
   * load it says the recording stopped, with Record again.
   */
  showRecordBar({ busy, mic, interrupted }) {
    const labels = this.labels;
    const start = interrupted ? labels.recordAgain : labels.barStart;
    this.bar(
      start,
      el('div', 'hint', [interrupted ? labels.recordingInterrupted : labels.barRecordHint]),
      [
        this.busyButton(start, 'start', 'record', busy),
        this.micToggle(mic, busy),
        this.button(labels.barCancel, 'cancel', null, null, busy),
      ].filter(Boolean),
      0
    );
  }

  /**
   * Screen sharing didn't start (declined, blocked or unavailable): hint · Record this page · Cancel.
   */
  showPageRecordingOffer() {
    const labels = this.labels;
    this.bar(
      labels.recordPage,
      el('div', 'hint', [labels.recordPageHint]),
      [this.button(labels.recordPage, 'record-page', 'primary', 'record'), this.button(labels.barCancel, 'cancel')],
      0
    );
  }

  /**
   * While recording: red dot · Recording 0:12 / 1:00 · (microphone) · Stop.
   */
  showRecordingBar({ mic, maxSec }) {
    const labels = this.labels;
    this.maxSec = maxSec;
    const timer = el('span', 'timer', [formatDuration(0) + ' / ' + formatDuration(maxSec)]);
    timer.setAttribute('role', 'timer');
    const buttons = [this.micToggle(mic), this.button(labels.barStop, 'stop', 'stop', 'stop')].filter(Boolean);
    this.bar(
      labels.barRecording,
      el('div', 'hint rec', [el('span', 'dot'), labels.barRecording, timer]),
      buttons,
      buttons.length - 1,
      true
    );
    this.timer = timer;
  }

  updateTimer(elapsedSec) {
    if (this.timer) {
      this.timer.textContent = formatDuration(elapsedSec) + ' / ' + formatDuration(this.maxSec);
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
   * After Stop: the video (screen recordings) or a short summary (page recordings), with
   * Cancel · Retake · Send.
   * @param {{video?: Blob, durationMs: number, interactions?: number}} preview
   */
  showPreview(preview) {
    this.mount();
    this.reset();
    const labels = this.labels;
    let media;
    if (preview.video) {
      const video = document.createElement('video');
      video.controls = true;
      video.playsInline = true;
      video.preload = 'auto';
      // MediaRecorder files often lack a duration: seek to the end once so the controls know it.
      video.addEventListener(
        'loadedmetadata',
        () => {
          try {
            if (video.duration === Infinity) {
              const rewind = () => {
                video.removeEventListener('timeupdate', rewind);
                video.currentTime = 0;
              };
              video.addEventListener('timeupdate', rewind);
              video.currentTime = 1e7;
            }
          } catch (exp) {}
        },
        { once: true }
      );
      this.previewUrl = URL.createObjectURL(preview.video);
      video.src = this.previewUrl;
      media = el('div', 'media', [video]);
    } else {
      const facts = el('div', 'facts', [
        el('span', null, [icon('clock'), formatDuration((preview.durationMs || 0) / 1000)]),
      ]);
      if (typeof preview.interactions === 'number') {
        facts.appendChild(el('span', null, [icon('pointer'), String(preview.interactions)]));
      }
      media = el('div', 'media summary', [icon('page'), facts]);
    }

    this.status = el('div', 'status');
    this.status.setAttribute('aria-live', 'polite');
    const buttons = {
      cancel: this.button(labels.barCancel, 'cancel'),
      retake: this.button(labels.previewRetake, 'retake'),
      send: this.button(labels.previewSend, 'send', 'primary'),
    };
    this.previewButtons = buttons;
    const title = el('div', 'title', [labels.previewTitle]);
    title.id = 'gl-title';
    const card = el('div', 'card', [
      title,
      media,
      el('div', 'footer', [this.status, el('div', 'actions', [buttons.cancel, buttons.retake, buttons.send])]),
    ]);
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-labelledby', title.id);
    this.root.appendChild(el('div', 'overlay', [card]));
    this.focus(buttons.send);
  }

  /**
   * Upload progress (0..1) in the preview; Retake and Send wait meanwhile.
   */
  setUploading(progress) {
    if (!this.status) {
      return;
    }
    this.previewButtons.retake.disabled = this.previewButtons.send.disabled = true;
    if (!this.progress) {
      this.status.className = 'status';
      this.status.textContent = this.labels.uploading;
      this.progress = el('div');
      const track = el('div', 'progress', [this.progress]);
      track.setAttribute('role', 'progressbar');
      this.status.appendChild(track);
    }
    this.progress.style.width = Math.round(Math.max(0, Math.min(1, progress || 0)) * 100) + '%';
  }

  /**
   * An error in the preview; Send tries again.
   */
  setPreviewError(message) {
    if (this.status) {
      this.progress = null;
      this.status.className = 'status error';
      this.status.textContent = message || this.labels.failed;
      this.previewButtons.retake.disabled = this.previewButtons.send.disabled = false;
    }
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
