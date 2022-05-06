import Gleap from "./Gleap";
import GleapConsoleLogManager from "./GleapConsoleLogManager";
import GleapCustomDataManager from "./GleapCustomDataManager";
import GleapMetaDataManager from "./GleapMetaDataManager";
import GleapNetworkIntercepter from "./GleapNetworkIntercepter";
import GleapReplayRecorder from "./GleapReplayRecorder";
import GleapSession from "./GleapSession";
import { startScreenCapture } from "./ScreenCapture";
import { ScreenRecorder } from "./ScreenRecorder";
import StreamedEvent from "./StreamedEvent";

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
    screenshotUrl = undefined;
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

    async takeSnapshot() {
        this.customData = GleapCustomDataManager.getInstance().getCustomData();
        this.metaData = GleapMetaDataManager.getInstance().getMetaData();
        this.consoleLog = GleapConsoleLogManager.getInstance().getLogs();
        this.networkLogs = GleapNetworkIntercepter.getInstance.getRequests();
        this.customEventLog = StreamedEvent.getInstance().getEventArray();

        /*this.screenshotUrl = screenshotUrl;
        this.screenshotData = screenshotData;*/

        // Prepare replay
        try {
            let replayData = await GleapReplayRecorder.getInstance().getReplayData();
            if (replayData) {
                this.webReplay = replayData;
            }
        } catch (exp) {
            console.log("Error getting replay data", exp);
        }

        // Prepare screen recording
        if (Gleap.getInstance().screenRecordingData != null) {
            try {
                let recordingUrl = await ScreenRecorder.uploadScreenRecording(Gleap.getInstance().screenRecordingData);
                if (recordingUrl) {
                    this.screenRecordingUrl = recordingUrl;
                }
            } catch (exp) {
                console.log("Error uploading screen recording", exp);
            }
        }

        // Prepare screenshot
        if (!(this.excludeData && this.excludeData.screenshot)) {
            try {
                const screenshotData = startScreenCapture(this.isLiveMode());
                if (screenshotData) {
                    data["x"] = self.snapshotPosition.x;
                    data["y"] = self.snapshotPosition.y;
                }
            } catch (exp) {
                console.log("Error taking screenshot", exp);
            }
        }
    }

    getData() {
        var bugReportData = {
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
            screenshotUrl: this.screenshotUrl,
            screenshotData: this.screenshotData,
            webReplay: this.webReplay,
            screenRecordingUrl: this.screenRecordingUrl
        };

        const keysToExclude = Object.keys(this.excludeData);
        for (let i = 0; i < keysToExclude.length; i++) {
            const keyToExclude = keysToExclude[i];
            if (this.excludeData[keyToExclude] === true) {
                delete bugReportData[keyToExclude];

                if (keyToExclude === "screenshot") {
                    delete bugReportData.screenshotData;
                    delete bugReportData.screenshotUrl;
                }

                if (keyToExclude === "replays") {
                    delete bugReportData.webReplay;
                }
            }
        }

        return bugReportData;
    }

    sendFeedback() {
        const self = this;
        const http = new XMLHttpRequest();
        http.open("POST", GleapSession.getInstance().apiUrl + "/bugs");
        http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        GleapSession.getInstance().injectSession(http);
        http.onerror = (error) => {
            /*if (self.silentBugReport) {
                self.closeGleap();
                return;
            }

            self.showError();*/
        };
        http.upload.onprogress = function (e) {
            /*if (self.silentBugReport) {
              self.closeGleap();
              return;
            }*/
        };
        http.onreadystatechange = function (e) {
            /*if (self.silentBugReport) {
                self.closeGleap();
                return;
            }*/

            if (http.readyState === XMLHttpRequest.DONE) {
                if (http.status === 200 || http.status === 201) {
                    //self.notifyEvent("feedback-sent");
                    //self.showSuccessAndClose();
                } else {
                    //self.showError(http.status);
                }
            }
        };

        http.send(JSON.stringify(this.getData()));
    }
}
