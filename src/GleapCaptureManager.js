import Gleap, {
  GleapConfigManager,
  GleapFrameManager,
  GleapReplayRecorder,
  GleapSession,
  GleapTranslationManager,
} from './Gleap';
import {
  buildLogsBundle,
  claimCaptureRequest,
  completeCaptureRequest,
  normalizeInclude,
  postCaptureLogs,
  reportCaptureEvent,
  uploadCaptureFile,
} from './GleapCaptureApi';
import { CaptureTimeline, DisplayRecording, PageRecording, requestDisplayStream } from './GleapCaptureRecorder';
import { captureScreenshot, requestTabStream, stopStream } from './GleapCaptureScreenshot';
import {
  CAPTURE_MAX_RECORDING_SEC,
  CAPTURE_PLATFORM,
  CAPTURE_SDK_TYPE,
  getCaptureConfig,
  getRecordingMethod,
  getSdkVersion,
  hasDisplayMedia,
  hasUserMedia,
  isCaptureSupported,
  isDesktopChromium,
  isRemoteLogCollectionEnabled,
  setCaptureEnabled,
  setRemoteLogCollectionEnabled,
} from './GleapCaptureSettings';
import GleapCaptureUI, { resolveCaptureLabels } from './GleapCaptureUI';

// Capture requests on the web (contract §7): the Messenger asks for a screenshot or a recording
// (capture-start), this page shows the capture bar, captures, and hands the result back (screenshot:
// capture-image, annotated and sent by the Messenger) or uploads and completes it itself
// (recordings). Log requests arrive on the SDK websocket and are answered without the customer.
// Idle until a request arrives: no timers, listeners or UI.

const STORAGE_KEY = 'gleap-capture-session';
const DEVICE_KEY = 'gleap-capture-device';
// A bar restored after a page load is dropped when the request is older than this.
const RESUME_MAX_AGE_MS = 30 * 60 * 1000;
const WATCHDOG_MS = 1000;
const MAX_HANDLED_LOG_REQUESTS = 100;
// Gleap UI hidden while the customer captures the page (the widget itself is hidden by the frame manager).
const HIDDEN_GLEAP_UI_SELECTOR = '.bb-feedback-button, .gleap-notification-container, .gleap-chatbar';

const readStorage = (key) => {
  try {
    return window.sessionStorage.getItem(key);
  } catch (exp) {
    return null;
  }
};

const writeStorage = (key, value) => {
  try {
    if (value === null) {
      window.sessionStorage.removeItem(key);
    } else {
      window.sessionStorage.setItem(key, value);
    }
  } catch (exp) {}
};

const randomHex = (bytes) => {
  try {
    const values = new Uint8Array(bytes);
    window.crypto.getRandomValues(values);
    return Array.prototype.map.call(values, (value) => (value < 16 ? '0' : '') + value.toString(16)).join('');
  } catch (exp) {
    let text = '';
    for (let i = 0; i < bytes * 2; i++) {
      text += Math.floor(Math.random() * 16).toString(16);
    }
    return text;
  }
};

const clampDuration = (value) => {
  const seconds = parseInt(value, 10);
  if (isNaN(seconds)) {
    return 60;
  }
  return Math.max(5, Math.min(CAPTURE_MAX_RECORDING_SEC, seconds));
};

// A short reason for capture-state / the event log: "NotAllowedError", "upload-failed-500", ...
const errorReason = (error) => {
  if (!error) {
    return 'unknown';
  }
  const name = error.name && error.name !== 'Error' ? error.name : '';
  const message = error.message ? String(error.message) : name ? '' : String(error);
  return (name && message ? name + ': ' + message : name || message).slice(0, 120);
};

const isOk = (status) => status >= 200 && status < 300;

let sessionCounter = 0;

export default class GleapCaptureManager {
  session = null;
  ui = null;
  watchdog = null;
  hiddenElements = [];
  handledLogRequests = [];
  logsPostedFor = [];
  deviceId = null;

  // GleapCaptureManager singleton
  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new GleapCaptureManager();
    }
    return this.instance;
  }

  /**
   * Gleap.setCaptureEnabled: false reports no capture capabilities (the Messenger offers uploads
   * only) and ends a capture in progress.
   */
  setCaptureEnabled(enabled) {
    setCaptureEnabled(enabled);
    if (!enabled) {
      writeStorage(STORAGE_KEY, null);
      if (this.session) {
        this.cancelSession(this.session, 'disabled');
      }
    }
    // Only a Messenger that is already connected needs to hear it; it asks again on every load.
    try {
      if (GleapFrameManager.instance) {
        GleapFrameManager.instance.sendCaptureCapabilities();
      }
    } catch (exp) {}
  }

  /**
   * Gleap.setRemoteLogCollectionEnabled: false answers log requests with "unsupported".
   */
  setRemoteLogCollectionEnabled(enabled) {
    setRemoteLogCollectionEnabled(enabled);
  }

  getDeviceId() {
    if (this.deviceId) {
      return this.deviceId;
    }
    let deviceId = readStorage(DEVICE_KEY);
    if (!deviceId || !/^web-[0-9a-f]{32}$/.test(deviceId)) {
      deviceId = 'web-' + randomHex(16);
      writeStorage(DEVICE_KEY, deviceId);
    }
    this.deviceId = deviceId;
    return deviceId;
  }

  privacyOptions() {
    try {
      return GleapReplayRecorder.getInstance().customOptions || {};
    } catch (exp) {
      return {};
    }
  }

  maskSelectors() {
    const selectors = getCaptureConfig().maskSelectors;
    return Array.isArray(selectors) ? selectors.filter((selector) => typeof selector === 'string') : [];
  }

  // ----- Messenger bridge -------------------------------------------------------------------------

  /**
   * capture-start, capture-cancel, capture-editor and capture-done from the Messenger.
   */
  handleMessengerMessage(message) {
    try {
      const data = message && message.data && typeof message.data === 'object' ? message.data : {};
      switch (message && message.name) {
        case 'capture-start':
          this.onCaptureStart(data);
          break;
        case 'capture-cancel':
          this.onCaptureCancel(data);
          break;
        case 'capture-editor':
          this.setEditorOpen(!!data.open);
          break;
        case 'capture-done':
          this.onCaptureDone(data);
          break;
        default:
          break;
      }
    } catch (exp) {}
  }

  sendState(requestId, state, extra) {
    try {
      GleapFrameManager.getInstance().sendMessage({
        name: 'capture-state',
        data: Object.assign({ requestId, state }, extra),
      });
    } catch (exp) {}
  }

  setEditorOpen(open) {
    try {
      GleapFrameManager.getInstance().setCaptureEditorOpen(open);
    } catch (exp) {}
  }

  onCaptureStart(data) {
    const requestId = typeof data.requestId === 'string' ? data.requestId : null;
    const kind = data.kind === 'screenshot' || data.kind === 'recording' ? data.kind : null;
    if (!requestId || !kind) {
      return;
    }
    if (!isCaptureSupported()) {
      this.sendState(requestId, 'unsupported', { error: 'capture-disabled' });
      reportCaptureEvent(requestId, 'unsupported', 'capture-disabled');
      return;
    }

    const current = this.session;
    if (current) {
      // Nothing interrupts an upload that is already on its way.
      if (current.phase === 'uploading') {
        return;
      }
      if (current.requestId !== requestId) {
        this.cancelSession(current, 'replaced', true);
      } else {
        this.endSession(current, { restore: false });
      }
    }

    this.setEditorOpen(false);
    this.startSession({
      requestId,
      kind,
      ticketShareToken: typeof data.ticketShareToken === 'string' ? data.ticketShareToken : null,
      options: data.options,
      labels: data.labels,
      resumed: false,
      phase: 'bar',
    });
  }

  onCaptureCancel(data) {
    const session = this.session;
    if (session && (!data.requestId || data.requestId === session.requestId)) {
      this.endSession(session, { restore: true });
      this.sendState(session.requestId, 'cancelled');
    }
    this.setEditorOpen(false);
  }

  onCaptureDone(data) {
    const session = this.session;
    if (session && (!data.requestId || data.requestId === session.requestId)) {
      this.endSession(session, { restore: true });
    }
    this.setEditorOpen(false);
  }

  /**
   * The widget iframe went away (Gleap.destroy, a language change): a capture in progress reopens the
   * conversation when it is done.
   */
  onWidgetDestroyed() {
    const session = this.session;
    if (!session) {
      return;
    }
    if (session.phase === 'editor') {
      this.endSession(session, { restore: false });
      return;
    }
    session.resumed = true;
  }

  destroy() {
    if (this.session) {
      this.endSession(this.session, { restore: false });
    }
    this.setEditorOpen(false);
  }

  // ----- Session ----------------------------------------------------------------------------------

  normalizeOptions(options) {
    const source = options && typeof options === 'object' ? options : {};
    return {
      annotate: source.annotate !== false,
      maxDurationSec: clampDuration(source.maxDurationSec),
      audio: source.audio === true,
      attachLogs: source.attachLogs !== false,
      include: normalizeInclude(source.include),
    };
  }

  startSession(params) {
    const flowConfig = GleapConfigManager.getInstance().getFlowConfig() || {};
    const session = {
      key: ++sessionCounter,
      requestId: params.requestId,
      kind: params.kind,
      ticketShareToken: params.ticketShareToken || null,
      options: this.normalizeOptions(params.options),
      labels: resolveCaptureLabels(params.labels),
      rawLabels: params.labels && typeof params.labels === 'object' ? params.labels : null,
      resumed: !!params.resumed,
      phase: params.phase,
      interrupted: params.phase === 'interrupted',
      micOn: false,
      startedAt: Date.now(),
      lastTick: -1,
      lastProgressSent: 0,
    };
    this.session = session;

    let rtl = false;
    try {
      rtl = !!GleapTranslationManager.getInstance().isRTLLayout;
    } catch (exp) {}
    this.ui = new GleapCaptureUI({
      labels: params.labels,
      primaryColor: flowConfig.color,
      rtl,
      onAction: (action) => this.onUiAction(session, action),
    });
    this.ui.autoFocus = !session.resumed;

    if (!session.resumed) {
      GleapFrameManager.getInstance().setCaptureHidden(true);
    }
    this.hideGleapUi();
    this.startWatchdog();
    this.renderBar(session);
    this.persist(session);
    this.sendState(session.requestId, 'bar');
  }

  renderBar(session) {
    if (!this.ui) {
      return;
    }
    if (session.kind === 'screenshot') {
      this.ui.showScreenshotBar(false);
    } else {
      this.ui.showRecordBar({ busy: false, mic: this.micState(session), interrupted: session.interrupted });
    }
  }

  micState(session) {
    const allowed =
      session.options.audio === true &&
      getCaptureConfig().allowMicrophone === true &&
      getRecordingMethod() === 'display' &&
      hasUserMedia();
    return allowed ? { available: true, on: session.micOn } : null;
  }

  /**
   * Ends a session: stops recordings and uploads, removes the capture UI and shows Gleap's UI again.
   * restore: show the widget again (or, after a page load, open the conversation).
   */
  endSession(session, { restore }) {
    if (!session || this.session !== session) {
      return;
    }
    this.session = null;
    try {
      if (session.recording) {
        session.recording.cancel();
      }
    } catch (exp) {}
    try {
      if (session.timeline) {
        session.timeline.stop();
      }
    } catch (exp) {}
    try {
      if (session.upload) {
        session.upload.abort();
      }
    } catch (exp) {}
    session.recording = null;
    session.timeline = null;
    session.upload = null;
    session.result = null;

    this.stopWatchdog();
    if (this.ui) {
      this.ui.destroy();
      this.ui = null;
    }
    this.showGleapUi();
    writeStorage(STORAGE_KEY, null);

    if (restore) {
      this.restoreWidget(session);
    } else if (!session.resumed) {
      try {
        GleapFrameManager.getInstance().setCaptureHidden(false, false);
      } catch (exp) {}
    }
  }

  restoreWidget(session) {
    try {
      if (session.resumed) {
        this.openConversation(session.ticketShareToken);
      } else {
        GleapFrameManager.getInstance().setCaptureHidden(false, true);
      }
    } catch (exp) {}
  }

  openConversation(shareToken) {
    if (shareToken) {
      Gleap.openConversation(shareToken, true);
    } else {
      Gleap.open();
    }
  }

  /**
   * The customer cancelled (or the capture can't go on): releases the request.
   */
  cancelSession(session, reason, silent) {
    // Once the screenshot is in the Messenger's editor, the request is the Messenger's to finish.
    const handedOver = session.phase === 'editor';
    this.endSession(session, { restore: !silent });
    if (!handedOver) {
      this.sendState(session.requestId, 'cancelled');
      reportCaptureEvent(session.requestId, 'released', reason);
    }
  }

  /**
   * The capture failed ('failed'), was declined ('declined') or can't run here ('unsupported'): the
   * Messenger falls back to uploading a file.
   */
  failSession(session, state, reason) {
    if (!session || this.session !== session) {
      return;
    }
    this.endSession(session, { restore: true });
    this.sendState(session.requestId, state, { error: reason });
    reportCaptureEvent(session.requestId, state === 'declined' || state === 'unsupported' ? state : 'failed', reason);
  }

  onUiAction(session, action) {
    if (this.session !== session) {
      return;
    }
    try {
      switch (action) {
        case 'capture':
          this.takeScreenshot(session);
          break;
        case 'start':
          this.startRecording(session);
          break;
        case 'stop':
          if (session.recording) {
            session.recording.stop();
          }
          break;
        case 'mic':
          this.toggleMicrophone(session);
          break;
        case 'send':
          this.sendRecording(session);
          break;
        case 'retake':
          this.retakeRecording(session);
          break;
        case 'cancel':
          this.cancelSession(session, 'cancelled');
          break;
        default:
          break;
      }
    } catch (error) {
      this.failSession(session, 'failed', errorReason(error));
    }
  }

  // ----- Screenshot -------------------------------------------------------------------------------

  takeScreenshot(session) {
    if (session.kind !== 'screenshot' || session.phase !== 'bar') {
      return;
    }
    const config = getCaptureConfig();
    // Called inside the Capture click: the tab capture needs that user activation.
    const useTab = config.webScreenshotMethod !== 'dom-only' && isDesktopChromium() && hasDisplayMedia();
    const streamPromise = useTab ? requestTabStream() : null;

    session.phase = 'capturing';
    this.ui.showScreenshotBar(true);
    this.sendState(session.requestId, 'capturing');

    // The logs as they are at the moment of the capture.
    let logsBundle = null;
    if (session.options.attachLogs && this.logsPostedFor.indexOf(session.requestId) === -1) {
      try {
        logsBundle = buildLogsBundle({ include: session.options.include, deviceId: this.getDeviceId() });
      } catch (exp) {}
    }

    const active = () => this.session === session;
    captureScreenshot({
      streamPromise,
      privacyOptions: this.privacyOptions(),
      maskSelectors: this.maskSelectors(),
      isActive: active,
      setUiHidden: (hidden) => {
        if (active()) {
          this.setCaptureUiHidden(hidden);
        }
      },
    })
      .then((image) => {
        if (active()) {
          this.onScreenshotReady(session, image, logsBundle);
        }
      })
      .catch((error) => {
        if (active()) {
          this.failSession(session, 'failed', errorReason(error));
        }
      });
  }

  onScreenshotReady(session, image, logsBundle) {
    const frameManager = GleapFrameManager.getInstance();
    const message = {
      name: 'capture-image',
      data: {
        requestId: session.requestId,
        dataUrl: image.dataUrl,
        width: image.width,
        height: image.height,
        method: image.method,
        platform: CAPTURE_PLATFORM,
        sdkType: CAPTURE_SDK_TYPE,
        sdkVersion: getSdkVersion(),
      },
    };

    // The Messenger's editor takes it from here (capture-editor, capture-done).
    session.phase = 'editor';
    writeStorage(STORAGE_KEY, null);
    this.stopWatchdog();
    if (this.ui) {
      this.ui.destroy();
      this.ui = null;
    }
    this.showGleapUi();

    if (session.resumed) {
      // After a page load the Messenger is not open yet: it opens on the conversation and then gets
      // the image (queued until it is ready).
      this.openConversation(session.ticketShareToken);
      frameManager.sendMessage(message, true);
    } else {
      frameManager.sendMessage(message, true);
      frameManager.setCaptureHidden(false, true);
    }

    if (logsBundle) {
      this.postLogs(session.requestId, logsBundle);
    }
  }

  postLogs(requestId, bundle) {
    if (this.logsPostedFor.indexOf(requestId) !== -1) {
      return;
    }
    this.logsPostedFor.push(requestId);
    if (this.logsPostedFor.length > MAX_HANDLED_LOG_REQUESTS) {
      this.logsPostedFor.shift();
    }
    postCaptureLogs(requestId, bundle).catch(() => {});
  }

  // Hides the capture bar and Gleap's UI for the moment a tab frame is taken.
  setCaptureUiHidden(hidden) {
    if (this.ui) {
      this.ui.setVisible(!hidden);
    }
    if (hidden) {
      this.hideGleapUi();
    }
  }

  // ----- Recording --------------------------------------------------------------------------------

  startRecording(session) {
    if (session.kind !== 'recording' || (session.phase !== 'bar' && session.phase !== 'interrupted')) {
      return;
    }
    const active = () => this.session === session;
    const maxDurationSec = session.options.maxDurationSec;
    const onTick = (seconds) => {
      if (!active() || seconds === session.lastTick) {
        return;
      }
      session.lastTick = seconds;
      if (this.ui) {
        this.ui.updateTimer(seconds);
      }
      this.sendState(session.requestId, 'recording', { elapsedSec: seconds });
    };
    const onStop = (result) => {
      if (active()) {
        this.onRecordingStopped(session, result);
      }
    };
    const onError = (error) => {
      if (active()) {
        this.failSession(session, 'failed', errorReason(error));
      }
    };

    if (getRecordingMethod() === 'display') {
      // Called inside the Start click: getDisplayMedia needs that user activation.
      const streamPromise = requestDisplayStream(isDesktopChromium());
      session.phase = 'starting';
      this.ui.showRecordBar({ busy: true, mic: this.micState(session), interrupted: session.interrupted });
      streamPromise
        .then((stream) => {
          if (!active()) {
            stopStream(stream);
            return null;
          }
          const recording = new DisplayRecording({ maxDurationSec, onTick, onStop, onError });
          session.recording = recording;
          return recording.start(stream, !!this.micState(session) && session.micOn).then((started) => {
            if (active()) {
              this.onRecordingStarted(session, recording.startedAt, started.hasMicrophone);
            } else {
              recording.cancel();
            }
          });
        })
        .catch((error) => {
          if (!active()) {
            return;
          }
          const declined = error && (error.name === 'NotAllowedError' || error.name === 'SecurityError');
          this.failSession(session, declined ? 'declined' : 'failed', errorReason(error));
        });
      return;
    }

    const recording = new PageRecording({
      maxDurationSec,
      privacyOptions: this.privacyOptions(),
      maskSelectors: this.maskSelectors(),
      onTick,
      onStop,
      onError,
    });
    session.recording = recording;
    recording.start();
    this.onRecordingStarted(session, recording.startedAt, false);
  }

  onRecordingStarted(session, startedAt, hasMicrophone) {
    session.phase = 'recording';
    session.interrupted = false;
    session.hasMicrophone = !!hasMicrophone;
    session.lastTick = 0;
    session.timeline = new CaptureTimeline({
      privacyOptions: this.privacyOptions(),
      isOwnElement: (node) => !!(this.ui && this.ui.isOwnElement(node)),
    });
    session.timeline.start(startedAt);
    this.ui.showRecordingBar({
      mic: session.hasMicrophone ? { available: true, on: session.micOn } : null,
      maxSec: session.options.maxDurationSec,
    });
    this.persist(session);
    this.sendState(session.requestId, 'recording', { elapsedSec: 0 });
  }

  // Before the start it decides whether the microphone is asked for; while recording it mutes.
  toggleMicrophone(session) {
    if (session.phase !== 'recording' && session.phase !== 'bar' && session.phase !== 'interrupted') {
      return;
    }
    session.micOn = !session.micOn;
    if (session.phase === 'recording' && session.recording && session.recording.setMicrophoneEnabled) {
      session.recording.setMicrophoneEnabled(session.micOn);
    }
    this.ui.setMicOn(session.micOn);
  }

  onRecordingStopped(session, result) {
    session.recording = null;
    session.result = result;
    session.timelineEntries = session.timeline ? session.timeline.stop(result.endedAt) : [];
    const interactions = session.timeline ? session.timeline.interactions : 0;
    session.timeline = null;
    session.phase = 'preview';
    this.ui.showPreview({
      video: result.type.indexOf('video/') === 0 ? result.blob : null,
      durationMs: result.durationMs,
      interactions,
    });
    this.persist(session);
    this.sendState(session.requestId, 'preview');
  }

  retakeRecording(session) {
    if (session.phase !== 'preview') {
      return;
    }
    session.result = null;
    session.uploadedUrl = null;
    session.timelineEntries = null;
    session.phase = 'bar';
    session.interrupted = false;
    this.renderBar(session);
    this.persist(session);
    this.sendState(session.requestId, 'bar');
  }

  sendRecording(session) {
    const result = session.result;
    if (session.phase !== 'preview' || !result) {
      return;
    }
    const active = () => this.session === session;
    session.phase = 'uploading';
    this.ui.setUploading(0);
    this.sendState(session.requestId, 'uploading', { progress: 0 });

    // Logs for the recording window go along (in parallel with the upload).
    if (session.options.attachLogs) {
      try {
        this.postLogs(
          session.requestId,
          buildLogsBundle({
            include: session.options.include,
            windowStart: result.startedAt,
            windowEnd: result.endedAt,
            deviceId: this.getDeviceId(),
          })
        );
      } catch (exp) {}
    }

    const onProgress = (progress) => {
      if (!active()) {
        return;
      }
      if (this.ui) {
        this.ui.setUploading(progress);
      }
      const now = Date.now();
      if (now - session.lastProgressSent > 250 || progress >= 1) {
        session.lastProgressSent = now;
        this.sendState(session.requestId, 'uploading', { progress: Math.round(progress * 100) / 100 });
      }
    };

    let uploaded;
    if (session.uploadedUrl) {
      uploaded = Promise.resolve(session.uploadedUrl);
    } else {
      session.upload = uploadCaptureFile(result.blob, result.fileName, onProgress);
      uploaded = session.upload.promise;
    }

    uploaded
      .then((url) => {
        if (!active()) {
          return null;
        }
        session.upload = null;
        session.uploadedUrl = url;
        const file = {
          url,
          name: result.fileName,
          type: result.type,
          size: result.blob.size,
          durationMs: result.durationMs,
        };
        if (result.width > 0 && result.height > 0) {
          file.width = result.width;
          file.height = result.height;
        }
        return completeCaptureRequest(session.requestId, {
          files: [file],
          method: result.method,
          platform: CAPTURE_PLATFORM,
          sdkType: CAPTURE_SDK_TYPE,
          sdkVersion: getSdkVersion(),
          deviceId: this.getDeviceId(),
          annotations: [],
          timeline: session.timelineEntries || [],
          recordingStartedAt: new Date(result.startedAt).toISOString(),
          recordingEndedAt: new Date(result.endedAt).toISOString(),
        }).then((response) => {
          if (!active()) {
            return;
          }
          if (isOk(response.status)) {
            this.endSession(session, { restore: true });
            this.sendState(session.requestId, 'done');
          } else if (response.status === 409 || response.status === 410) {
            // Answered on another device, or withdrawn / expired meanwhile.
            this.endSession(session, { restore: true });
            this.sendState(session.requestId, 'failed', {
              error: response.status === 409 ? 'already-completed' : 'request-closed',
            });
          } else {
            this.onUploadFailed(session, 'complete-' + response.status);
          }
        });
      })
      .catch((error) => {
        if (active()) {
          this.onUploadFailed(session, errorReason(error));
        }
      });
  }

  onUploadFailed(session, reason) {
    session.upload = null;
    session.phase = 'preview';
    if (this.ui) {
      this.ui.setPreviewError(session.labels.failed);
    }
    this.sendState(session.requestId, 'preview', { error: reason });
  }

  // ----- Gleap UI, watchdog, page loads -----------------------------------------------------------

  hideGleapUi() {
    try {
      const elements = document.querySelectorAll(HIDDEN_GLEAP_UI_SELECTOR);
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        if (this.hiddenElements.indexOf(element) === -1) {
          this.hiddenElements.push(element);
        }
        element.style.setProperty('visibility', 'hidden', 'important');
      }
    } catch (exp) {}
  }

  showGleapUi() {
    this.hiddenElements.forEach((element) => {
      try {
        element.style.removeProperty('visibility');
      } catch (exp) {}
    });
    this.hiddenElements = [];
  }

  // While a capture UI is up: keeps it attached (pages that replace the body) and Gleap's UI hidden.
  startWatchdog() {
    this.stopWatchdog();
    this.watchdog = setInterval(() => {
      try {
        if (this.ui) {
          this.ui.ensureAttached();
        }
        this.hideGleapUi();
      } catch (exp) {}
    }, WATCHDOG_MS);
  }

  stopWatchdog() {
    if (this.watchdog) {
      clearInterval(this.watchdog);
      this.watchdog = null;
    }
  }

  /**
   * Keeps the request across page loads of this tab (multi-page sites): the bar comes back after
   * the next load; a recording that was running shows "Recording stopped because the page changed".
   */
  persist(session) {
    if (this.session !== session) {
      return;
    }
    let phase = null;
    if (session.phase === 'bar' || session.phase === 'capturing' || session.phase === 'starting') {
      phase = session.interrupted ? 'recording' : 'bar';
    } else if (
      session.kind === 'recording' &&
      ['recording', 'preview', 'uploading', 'interrupted'].indexOf(session.phase) !== -1
    ) {
      phase = 'recording';
    }
    if (!phase) {
      writeStorage(STORAGE_KEY, null);
      return;
    }
    let gleapId = null;
    let sdkKey = null;
    try {
      const gleapSession = GleapSession.getInstance();
      gleapId = gleapSession.session ? gleapSession.session.gleapId : null;
      sdkKey = gleapSession.sdkKey;
    } catch (exp) {}
    try {
      writeStorage(
        STORAGE_KEY,
        JSON.stringify({
          v: 1,
          requestId: session.requestId,
          kind: session.kind,
          ticketShareToken: session.ticketShareToken,
          options: session.options,
          labels: session.rawLabels,
          phase,
          gleapId,
          sdkKey,
          at: Date.now(),
        })
      );
    } catch (exp) {}
  }

  /**
   * After a page load: shows the bar of a capture that was in progress on the previous page.
   */
  resumeFromStorage() {
    try {
      if (this.session) {
        return;
      }
      const raw = readStorage(STORAGE_KEY);
      if (!raw) {
        return;
      }
      let stored = null;
      try {
        stored = JSON.parse(raw);
      } catch (exp) {}
      const gleapSession = GleapSession.getInstance();
      const valid =
        stored &&
        stored.v === 1 &&
        typeof stored.requestId === 'string' &&
        (stored.kind === 'screenshot' || stored.kind === 'recording') &&
        typeof stored.at === 'number' &&
        Date.now() - stored.at < RESUME_MAX_AGE_MS &&
        gleapSession.session &&
        stored.gleapId === gleapSession.session.gleapId &&
        stored.sdkKey === gleapSession.sdkKey;
      if (!valid || !isCaptureSupported()) {
        writeStorage(STORAGE_KEY, null);
        return;
      }
      this.startSession({
        requestId: stored.requestId,
        kind: stored.kind,
        ticketShareToken: stored.ticketShareToken,
        options: stored.options,
        labels: stored.labels,
        resumed: true,
        phase: stored.kind === 'recording' && stored.phase === 'recording' ? 'interrupted' : 'bar',
      });
    } catch (exp) {}
  }

  // ----- Background log requests (SDK websocket) --------------------------------------------------

  /**
   * A `capture-request` pushed on the SDK websocket. Only kind 'logs' comes this way; it is answered
   * once per request id on this page, whatever the widget shows.
   */
  handleServerRequest(data) {
    try {
      if (!data || data.kind !== 'logs' || typeof data.id !== 'string') {
        return;
      }
      const requestId = data.id;
      if (this.handledLogRequests.indexOf(requestId) !== -1) {
        return;
      }
      this.handledLogRequests.push(requestId);
      if (this.handledLogRequests.length > MAX_HANDLED_LOG_REQUESTS) {
        this.handledLogRequests.shift();
      }
      if (data.expiresAt && Date.parse(data.expiresAt) < Date.now()) {
        return;
      }
      const options = data.options && typeof data.options === 'object' ? data.options : {};
      GleapConfigManager.getInstance().onConfigLoaded(() => {
        this.collectLogs(requestId, options).catch(() => {});
      });
    } catch (exp) {}
  }

  collectLogs(requestId, options) {
    if (!isRemoteLogCollectionEnabled()) {
      return reportCaptureEvent(requestId, 'unsupported', 'disabled-by-app');
    }
    if (getCaptureConfig().backgroundLogs === false) {
      return reportCaptureEvent(requestId, 'unsupported', 'disabled-by-project');
    }

    const deviceId = this.getDeviceId();
    return claimCaptureRequest(requestId, {
      deviceId,
      platform: CAPTURE_PLATFORM,
      sdkType: CAPTURE_SDK_TYPE,
      sdkVersion: getSdkVersion(),
    }).then((claim) => {
      // 410: already final. Another tab or device claimed it a moment ago: that one answers.
      if (!isOk(claim.status) || (claim.data && claim.data.claimedElsewhere)) {
        return null;
      }
      return Promise.resolve()
        .then(() => postCaptureLogs(requestId, buildLogsBundle({ include: options.include, deviceId })))
        .then(
          (response) => (isOk(response.status) ? null : reportCaptureEvent(requestId, 'failed', 'logs-' + response.status)),
          (error) => reportCaptureEvent(requestId, 'failed', errorReason(error))
        );
    });
  }
}
