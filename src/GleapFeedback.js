import { startScreenCapture } from './ScreenCapture';
import { GleapScreenRecorder } from './GleapScreenRecorder';
import Gleap, {
  GleapConsoleLogManager,
  GleapStreamedEvent,
  GleapSession,
  GleapCustomDataManager,
  GleapMetaDataManager,
  GleapNetworkIntercepter,
  GleapTagManager,
} from './Gleap';

// The screenshot is a best-effort extra on a report the user is actively waiting to send, but
// nothing in the capture path had an upper bound — so any slow step held the submission, and the
// sending spinner, open indefinitely. Cap it: a report that arrives without a screenshot beats a
// spinner that never ends. Generous on purpose — a 20k-element page captures in ~1.5s.
const SCREENSHOT_CAPTURE_TIMEOUT_MS = 15000;

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
  webReplay = undefined;
  screenRecordingUrl = undefined;
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

    // Prepare screen recording
    var screenRecordingData = gleapInstance.getGlobalDataItem('screenRecordingData');
    if (screenRecordingData != null) {
      var recordingUrlPromise = GleapScreenRecorder.uploadScreenRecording(screenRecordingData).then((recordingUrl) => {
        if (recordingUrl) {
          this.screenRecordingUrl = recordingUrl;
        }
      });
      dataPromises.push(recordingUrlPromise);
    }

    // Prepare screenshot
    if (!(this.excludeData && this.excludeData.screenshot)) {
      var screenshotDataPromise = startScreenCapture(gleapInstance.isLiveMode()).then((screenshotData) => {
        if (screenshotData) {
          const snapshotPosition = gleapInstance.getGlobalDataItem('snapshotPosition');
          screenshotData['x'] = snapshotPosition.x;
          screenshotData['y'] = snapshotPosition.y;
          this.screenshotData = screenshotData;
        }
      });
      dataPromises.push(
        resolveAfterTimeout(screenshotDataPromise, SCREENSHOT_CAPTURE_TIMEOUT_MS, 'screenshot capture')
      );
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

  sendFeedback() {
    return new Promise((resolve, reject) => {
      this.takeSnapshot()
        .then(() => {
          const dataToSend = this.getData();

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
                try {
                  const feedback = JSON.parse(http.responseText);
                  resolve(feedback);
                } catch (exp) {
                  reject();
                }
              } else {
                reject();
              }
            }
          };
          http.send(JSON.stringify(dataToSend));
        })
        .catch((exp) => {
          console.log('Failed to take snapshot', exp);
          reject();
        });
    });
  }
}
