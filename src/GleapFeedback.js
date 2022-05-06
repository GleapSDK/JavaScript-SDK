import { startScreenCapture } from "./ScreenCapture";
import { ScreenRecorder } from "./ScreenRecorder";
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
    outbound = undefined;
    screenshotData = undefined;
    webReplay = undefined;
    screenRecordingUrl = undefined;

    constructor(type, priority, formData, isSilent, excludeData) {
        this.type = type;
        this.priority = priority;
        this.formData = formData;
        this.isSilent = isSilent;
        this.excludeData = excludeData;
    }

    takeSnapshot() {
        this.customData = GleapCustomDataManager.getInstance().getCustomData();
        this.metaData = GleapMetaDataManager.getInstance().getMetaData();
        this.consoleLog = GleapConsoleLogManager.getInstance().getLogs();
        this.networkLogs = GleapNetworkIntercepter.getInstance().getRequests();
        this.customEventLog = GleapStreamedEvent.getInstance().getEventArray();

        var dataPromises = [];

        // Prepare replay
        var replayDataPromise = GleapReplayRecorder.getInstance().getReplayData().then((replayData) => {
            if (replayData) {
                this.webReplay = replayData;
            }
        });
        dataPromises.push(replayDataPromise);

        // Prepare screen recording
        if (Gleap.getInstance().screenRecordingData != null) {
            var recordingUrlPromise = ScreenRecorder.uploadScreenRecording(Gleap.getInstance().screenRecordingData).then((recordingUrl) => {
                if (recordingUrl) {
                    this.screenRecordingUrl = recordingUrl;
                }
            });
            dataPromises.push(recordingUrlPromise);
        }

        // Prepare screenshot
        if (!(this.excludeData && this.excludeData.screenshot)) {
            var screenshotDataPromise = startScreenCapture(Gleap.getInstance().isLiveMode()).then((screenshotData) => {
                if (screenshotData) {
                    screenshotData["x"] = Gleap.getInstance().snapshotPosition.x;
                    screenshotData["y"] = Gleap.getInstance().snapshotPosition.y;
                    this.screenshotData = screenshotData;
                }
            });
            dataPromises.push(screenshotDataPromise);
        }

        console.log(dataPromises);

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
            outbound: this.outbound,
            screenshotData: this.screenshotData,
            webReplay: this.webReplay,
            screenRecordingUrl: this.screenRecordingUrl
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
            const self = this;
            const http = new XMLHttpRequest();
            http.open("POST", GleapSession.getInstance().apiUrl + "/bugs");
            http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
            GleapSession.getInstance().injectSession(http);
            http.onerror = (error) => {
                reject();
            };
            http.upload.onprogress = function (e) {
                /*if (self.silentBugReport) {
                  self.closeGleap();
                  return;
                }*/
            };
            http.onreadystatechange = function (e) {
                if (http.readyState === XMLHttpRequest.DONE) {
                    if (http.status === 200 || http.status === 201) {
                        //self.notifyEvent("feedback-sent");
                        //self.showSuccessAndClose();
                        resolve();
                    } else {
                        //self.showError(http.status);
                        reject();
                    }
                }
            };

            this.takeSnapshot().then(() => {
                console.log("Sending feedback");
                const dataToSend = this.getData();
                http.send(JSON.stringify(dataToSend));
            });
        });
    }
}
