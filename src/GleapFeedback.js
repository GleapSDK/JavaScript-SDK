import { startScreenCapture } from "./ScreenCapture";
import { GleapScreenRecorder } from "./GleapScreenRecorder";
import Gleap, { GleapConsoleLogManager, GleapStreamedEvent, GleapSession, GleapReplayRecorder, GleapCustomDataManager, GleapMetaDataManager, GleapNetworkIntercepter } from "./Gleap";

export default class GleapFeedback {
    excludeData = {};
    type = "BUG";
    priority = "LOW";
    customData = {};
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

        var dataPromises = [];

        // Assign replays
        var webReplay = gleapInstance.getGlobalDataItem("webReplay");
        if (webReplay !== null) {
            this.webReplay = webReplay;
        }

        // Prepare screen recording
        var screenRecordingData = gleapInstance.getGlobalDataItem("screenRecordingData");
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
                    const snapshotPosition = gleapInstance.getGlobalDataItem("snapshotPosition");
                    screenshotData["x"] = snapshotPosition.x;
                    screenshotData["y"] = snapshotPosition.y;
                    this.screenshotData = screenshotData;
                }
            });
            dataPromises.push(screenshotDataPromise);
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
            formData: this.formData,
            isSilent: this.isSilent,
            outbound: this.outboundId,
            screenshotData: this.screenshotData,
            webReplay: this.webReplay,
            screenRecordingUrl: this.screenRecordingUrl,
            spamToken: this.spamToken,
        };

        const keysToExclude = Object.keys(this.excludeData);
        for (let i = 0; i < keysToExclude.length; i++) {
            const keyToExclude = keysToExclude[i];
            if (this.excludeData[keyToExclude] === true) {
                delete feedbackData[keyToExclude];

                if (keyToExclude === "screenshot") {
                    delete feedbackData.screenshotData;
                }

                if (keyToExclude === "replays") {
                    delete feedbackData.webReplay;
                }
            }
        }

        return feedbackData;
    }

    sendFeedback() {
        return new Promise((resolve, reject) => {
            this.takeSnapshot().then(() => {
                const dataToSend = this.getData();

                const http = new XMLHttpRequest();
                http.open("POST", GleapSession.getInstance().apiUrl + "/bugs/v2");
                http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
                GleapSession.getInstance().injectSession(http);
                http.onerror = (error) => {
                    reject();
                };
                http.onreadystatechange = function (e) {
                    if (http.readyState === XMLHttpRequest.DONE) {
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
            }).catch((exp) => {
                reject();
            });
        });
    }
}
