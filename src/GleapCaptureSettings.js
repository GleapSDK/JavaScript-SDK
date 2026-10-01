import { GleapConfigManager } from './Gleap';

// Capture requests (screenshots, screen recordings and log collection asked for by teammates, AI
// agents or workflows): the local switches and what this browser can do. Kept free of heavy imports,
// as the websocket and the Messenger bridge read it on every connect.

export const CAPTURE_SDK_TYPE = 'JAVASCRIPT';
export const CAPTURE_PLATFORM = 'web';
// The longest recording any request can ask for (contract: maxDurationSec is clamped to 5..180).
export const CAPTURE_MAX_RECORDING_SEC = 180;

// Module state, so the switches work before Gleap.initialize.
let captureEnabled = true;
let remoteLogCollectionEnabled = true;

export const setCaptureEnabled = (enabled) => {
  captureEnabled = !!enabled;
};

export const setRemoteLogCollectionEnabled = (enabled) => {
  remoteLogCollectionEnabled = !!enabled;
};

export const isRemoteLogCollectionEnabled = () => remoteLogCollectionEnabled;

export const getSdkVersion = () => {
  try {
    return typeof SDK_VERSION !== 'undefined' ? SDK_VERSION : '';
  } catch (exp) {
    return '';
  }
};

/**
 * The project's capture settings (flowConfig.capture), {} when there are none.
 */
export const getCaptureConfig = () => {
  try {
    const flowConfig = GleapConfigManager.getInstance().getFlowConfig();
    if (flowConfig && flowConfig.capture && typeof flowConfig.capture === 'object') {
      return flowConfig.capture;
    }
  } catch (exp) {}
  return {};
};

export const hasDisplayMedia = () => {
  try {
    return (
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getDisplayMedia === 'function'
    );
  } catch (exp) {
    return false;
  }
};

export const hasUserMedia = () => {
  try {
    return (
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function'
    );
  } catch (exp) {
    return false;
  }
};

const hasMediaRecorder = () => typeof window !== 'undefined' && typeof window.MediaRecorder === 'function';

/**
 * Desktop Chromium (Chrome, Edge, Brave, Opera, ...), where getDisplayMedia can offer the current
 * tab with one click (preferCurrentTab).
 */
export const isDesktopChromium = () => {
  try {
    const nav = navigator;
    const uaData = nav.userAgentData;
    if (uaData && Array.isArray(uaData.brands)) {
      return !uaData.mobile && uaData.brands.some((brand) => brand && /Chromium/i.test(brand.brand));
    }
    const ua = nav.userAgent || '';
    return /\bChrome\/\d+/.test(ua) && !/Android|Mobile|CriOS|EdgiOS|FxiOS/i.test(ua);
  } catch (exp) {
    return false;
  }
};

/**
 * 'display' (getDisplayMedia + MediaRecorder, desktop browsers) or 'rrweb' (a page recording,
 * phones and tablets).
 */
export const getRecordingMethod = () => (hasDisplayMedia() && hasMediaRecorder() ? 'display' : 'rrweb');

/**
 * Whether this page can take screenshots and recordings for capture requests at all.
 */
export const isCaptureSupported = () => {
  if (!captureEnabled) {
    return false;
  }
  try {
    return (
      typeof window !== 'undefined' &&
      typeof document !== 'undefined' &&
      typeof HTMLCanvasElement !== 'undefined' &&
      typeof Element !== 'undefined' &&
      typeof Element.prototype.attachShadow === 'function'
    );
  } catch (exp) {
    return false;
  }
};

/**
 * The `capture-capabilities` message data for the Messenger (contract §7). With capture disabled
 * everything is false, so the Messenger only offers "Upload a file".
 */
export const getCaptureCapabilities = () => {
  const capabilities = {
    version: 1,
    platform: CAPTURE_PLATFORM,
    sdkType: CAPTURE_SDK_TYPE,
    sdkVersion: getSdkVersion(),
    screenshot: false,
    recording: false,
    annotate: false,
  };
  if (!isCaptureSupported()) {
    return capabilities;
  }

  const recordingMethod = getRecordingMethod();
  capabilities.screenshot = true;
  capabilities.recording = true;
  capabilities.annotate = true;
  capabilities.recordingMethod = recordingMethod;
  capabilities.maxRecordingSec = CAPTURE_MAX_RECORDING_SEC;
  capabilities.microphone = recordingMethod === 'display' && getCaptureConfig().allowMicrophone === true && hasUserMedia();
  return capabilities;
};

/**
 * The capability flags the SDK websocket announces (`&caps=`).
 */
export const getWebSocketCaps = () => {
  const caps = [];
  if (isCaptureSupported()) {
    caps.push('capture.screenshot', 'capture.recording');
  }
  if (remoteLogCollectionEnabled) {
    caps.push('capture.logs');
  }
  return caps;
};
