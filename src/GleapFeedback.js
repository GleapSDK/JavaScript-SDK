import GleapSession from "./GleapSession";

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

    constructor(type, priority, customData, metaData, consoleLog, networkLogs, customEventLog, formData, isSilent, screenshotUrl, screenshotData, webReplay, screenRecordingUrl) {
        this.type = type;
        this.priority = priority;
        this.customData = customData;
        this.metaData = metaData;
        this.consoleLog = consoleLog;
        this.networkLogs = networkLogs;
        this.customEventLog = customEventLog;
        this.formData = formData;
        this.isSilent = isSilent;
        this.screenshotUrl = screenshotUrl;
        this.screenshotData = screenshotData;
        this.webReplay = webReplay;
        this.screenRecordingUrl = screenRecordingUrl;
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
