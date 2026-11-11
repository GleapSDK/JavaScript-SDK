import { startScreenCapture } from './ScreenCapture';
import { GleapScreenRecorder } from './GleapScreenRecorder';
import Gleap, {
  GleapConsoleLogManager,
  GleapStreamedEvent,
  GleapSession,
  GleapCustomDataManager,
  GleapMetaDataManager,
  GleapNetworkIntercepter,
  GleapReplayRecorder,
  GleapTagManager,
} from './Gleap';

// The screenshot is a best-effort extra on a report the user is actively waiting to send, but
// nothing in the capture path had an upper bound — so any slow step held the submission, and the
// sending spinner, open indefinitely. Cap it: a report that arrives without a screenshot beats a
// spinner that never ends. Generous on purpose — a 20k-element page captures in ~1.5s.
const SCREENSHOT_CAPTURE_TIMEOUT_MS = 15000;

const dataUrlToFile = (dataUrl, fileName) => {
  const [header, base64] = dataUrl.split(',');
  const type = (/^data:([^;]+)/.exec(header) || [])[1] || 'image/jpeg';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], fileName, { type });
};

// Resolves early if the wrapped promise overruns. Rejection is passed through untouched, so a
// genuinely failed capture still surfaces as a failed send exactly as before.
const resolveAfterTimeout = (promise, timeoutMs, label) =>
  new Promise((resolve, reject) => {
    var settled = false;

    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      console.warn('Gleap: ' + label + ' timed out after ' + timeoutMs + 'ms. Sending the report without it.');
      resolve();
    }, timeoutMs);

    promise.then(
      (value) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        reject(error);
      }
    );
  });

// Attachments a report can live without, heaviest first. When the API (or a proxy in front of it)
// answers 413, the report is resent without them instead of failing: same reasoning as above, a
// report that arrives without its replay beats one that never arrives.
const OVERSIZE_FALLBACKS = [['webReplay'], ['screenshotData', 'networkLogs']];

export default class GleapFeedback {
  excludeData = {};
  type = 'BUG';
  priority = 'LOW';
  customData = {};
  ticketAttributes = {};
  metaData = {};
  consoleLog = [];
  networkLogs = [];
  customEventLog = [];
  formData = {};
  isSilent = false;
  outboundId = undefined;
  screenshotData = undefined;
  // The marked screenshot as an uploaded image (see forgetSentCaptures); screenshotData otherwise.
  screenshotUrl = undefined;
  screenshotImage = undefined;
  webReplay = undefined;
  screenRecordingUrl = undefined;
  // The form's recording this report uploads (see forgetSentCaptures).
  screenRecordingData = undefined;
  spamToken = undefined;

  constructor(type, priority, formData, isSilent, excludeData, outboundId, spamToken) {
    this.type = type;
    this.priority = priority;
    this.formData = formData;
    this.isSilent = isSilent;
    this.excludeData = excludeData;
    this.outboundId = outboundId;
    this.spamToken = spamToken;
  }

  takeSnapshot() {
    const gleapInstance = Gleap.getInstance();
    this.customData = GleapCustomDataManager.getInstance().getCustomData();
    this.metaData = GleapMetaDataManager.getInstance().getMetaData();
    this.consoleLog = GleapConsoleLogManager.getInstance().getLogs();
    this.networkLogs = GleapNetworkIntercepter.getInstance().getRequests();
    this.customEventLog = GleapStreamedEvent.getInstance().getEventArray();
    this.ticketAttributes = GleapCustomDataManager.getInstance().getTicketAttributes();

    var dataPromises = [];

    // Assign replays
    var webReplay = gleapInstance.getGlobalDataItem('webReplay');
    if (webReplay !== null) {
      this.webReplay = webReplay;
    }

    // Prepare screen recording. It was made in the feedback form, so a silent (crash) report never
    // takes it along.
    var screenRecordingData = this.isSilent ? null : gleapInstance.getGlobalDataItem('screenRecordingData');
    if (screenRecordingData != null) {
      this.screenRecordingData = screenRecordingData;
      var recordingUrlPromise = GleapScreenRecorder.uploadFile(screenRecordingData).then((recordingUrl) => {
        if (recordingUrl) {
          this.screenRecordingUrl = recordingUrl;
        }
      });
      dataPromises.push(recordingUrlPromise);
    }

    // Prepare screenshot
    if (!(this.excludeData && this.excludeData.screenshot)) {
      // The DOM, rendered on the server. The replay options go along so form fields are masked the
      // same way as in replays.
      const captureDom = () =>
        startScreenCapture(gleapInstance.isLiveMode(), GleapReplayRecorder.getInstance().customOptions).then(
          (screenshotData) => {
            if (screenshotData) {
              const snapshotPosition = gleapInstance.getGlobalDataItem('snapshotPosition');
              screenshotData['x'] = snapshotPosition.x;
              screenshotData['y'] = snapshotPosition.y;
              this.screenshotData = screenshotData;
            }
          }
        );
      // The screenshot the user marked, when the form took it from the tab (GleapMarkerManager): it
      // goes out as an image. Without one (no tab capture in this browser, declined, a report sent
      // without marking, a silent report) or when its upload fails, the DOM is rendered instead.
      const screenshotImage = this.isSilent ? null : gleapInstance.getGlobalDataItem('screenshotImage');
      const screenshotPromise = screenshotImage
        ? GleapScreenRecorder.uploadFile(dataUrlToFile(screenshotImage.dataUrl, 'screenshot.jpg'))
            .then((screenshotUrl) => {
              if (!screenshotUrl) {
                throw new Error('no-screenshot-url');
              }
              this.screenshotImage = screenshotImage;
              this.screenshotUrl = screenshotUrl;
            })
            .catch(captureDom)
        : captureDom();
      dataPromises.push(resolveAfterTimeout(screenshotPromise, SCREENSHOT_CAPTURE_TIMEOUT_MS, 'screenshot capture'));
    }

    return Promise.all(dataPromises);
  }

  getData() {
    var feedbackData = {
      type: this.type,
      priority: this.priority,
      customData: this.customData,
      metaData: this.metaData,
      consoleLog: this.consoleLog,
      networkLogs: this.networkLogs,
      customEventLog: this.customEventLog,
      // Merge ticket attributes and form data.
      formData: {
        ...this.ticketAttributes,
        ...this.formData,
      },
      isSilent: this.isSilent,
      outbound: this.outboundId,
      screenshotData: this.screenshotData,
      screenshotUrl: this.screenshotUrl,
      webReplay: this.webReplay,
      screenRecordingUrl: this.screenRecordingUrl,
      spamToken: this.spamToken,
    };

    const tags = GleapTagManager.getInstance().getTags();
    if (tags && tags.length > 0) {
      feedbackData.tags = tags;
    }

    if (this.excludeData) {
      const keysToExclude = Object.keys(this.excludeData);
      for (let i = 0; i < keysToExclude.length; i++) {
        const keyToExclude = keysToExclude[i];
        if (this.excludeData[keyToExclude] === true) {
          if (feedbackData[keyToExclude]) {
            delete feedbackData[keyToExclude];
          }

          if (keyToExclude === 'screenshot') {
            delete feedbackData.screenshotData;
            delete feedbackData.screenshotUrl;
          }

          if (keyToExclude === 'replays') {
            delete feedbackData.webReplay;
          }
        }
      }
    }

    return feedbackData;
  }

  getTicketData() {
    return new Promise((resolve, reject) => {
      this.takeSnapshot()
        .then(() => {
          const dataToSend = this.getData();
          resolve(dataToSend);
        })
        .catch((exp) => {
          console.log('Failed to take snapshot', exp);
          reject();
        });
    });
  }

  // The recording and the marked screenshot went out with this report: a later report must not
  // upload them again.
  forgetSentCaptures() {
    try {
      const gleapInstance = Gleap.getInstance();
      ['screenRecordingData', 'screenshotImage'].forEach((key) => {
        if (this[key] && gleapInstance.getGlobalDataItem(key) === this[key]) {
          gleapInstance.setGlobalDataItem(key, null);
        }
      });
    } catch (exp) {}
  }

  sendFeedback() {
    const self = this;
    return new Promise((resolve, reject) => {
      this.takeSnapshot()
        .then(() => {
          const dataToSend = this.getData();

          const send = (fallbackIndex) => {
            const http = new XMLHttpRequest();
            http.open('POST', GleapSession.getInstance().apiUrl + '/bugs/v2');
            http.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
            GleapSession.getInstance().injectSession(http);
            http.onerror = (error) => {
              reject();
            };
            http.onreadystatechange = function (e) {
              if (http.readyState === 4) {
                if (http.status === 200 || http.status === 201) {
                  self.forgetSentCaptures();
                  try {
                    const feedback = JSON.parse(http.responseText);
                    resolve(feedback);
                  } catch (exp) {
                    reject();
                  }
                } else if (http.status === 413 && fallbackIndex < OVERSIZE_FALLBACKS.length) {
                  OVERSIZE_FALLBACKS[fallbackIndex].forEach((key) => delete dataToSend[key]);
                  send(fallbackIndex + 1);
                } else {
                  reject();
                }
              }
            };
            http.send(JSON.stringify(dataToSend));
          };
          send(0);
        })
        .catch((exp) => {
          console.log('Failed to take snapshot', exp);
          reject();
        });
    });
  }
}
