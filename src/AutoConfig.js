import Gleap from "./Gleap";
import Session from "./Session";

export default class AutoConfig {
  static run = () => {
    return new Promise(function (resolve) {
      const session = Session.getInstance();
      const http = new XMLHttpRequest();
      http.open(
        "GET",
        session.widgetUrl + "/widget/" + session.sdkKey + "/config"
      );
      http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      session.injectSession(http);
      http.onerror = function () {
        resolve();
      };
      http.onreadystatechange = function (e) {
        if (http.readyState === XMLHttpRequest.DONE) {
          if (http.status === 200 || http.status === 201) {
            try {
              const instance = Gleap.getInstance();
              const config = JSON.parse(http.responseText);
              const flowConfig = config.flowConfig;
              const projectActions = config.projectActions;

              if (flowConfig.logo && flowConfig.logo.length > 0) {
                Gleap.setLogoUrl(flowConfig.logo);
              }

              if (flowConfig.color) {
                Gleap.setStyles({
                  primaryColor: flowConfig.color,
                  headerColor: flowConfig.headerColor,
                  buttonColor: flowConfig.buttonColor,
                  borderRadius: flowConfig.borderRadius,
                  backgroundColor: flowConfig.backgroundColor
                    ? flowConfig.backgroundColor
                    : "#FFFFFF",
                });
              }

              if (flowConfig.hideBranding) {
                Gleap.enablePoweredBy();
              }

              if (flowConfig.enableReplays) {
                Gleap.enableReplays(flowConfig.enableReplays);
              }

              Gleap.enableShortcuts(flowConfig.enableShortcuts ? true : false);

              if (flowConfig.enableNetworkLogs) {
                Gleap.enableNetworkLogger();
              }

              if (flowConfig.networkLogPropsToIgnore) {
                Gleap.setNetworkLogFilters(flowConfig.networkLogPropsToIgnore);
              }

              if (!flowConfig.enableConsoleLogs) {
                Gleap.disableConsoleLogOverwrite();
              }

              if (
                typeof flowConfig.enableCrashDetector !== "undefined" &&
                flowConfig.enableCrashDetector
              ) {
                Gleap.enableCrashDetector(true, flowConfig.enableCrashDetector);
              }

              if (
                typeof flowConfig.enableRageClickDetector !== "undefined" &&
                flowConfig.enableRageClickDetector
              ) {
                Gleap.enableRageClickDetector(
                  flowConfig.enableRageClickDetector
                );
              }

              if (flowConfig.customTranslations) {
                Gleap.setCustomTranslation(flowConfig.customTranslations);
              }

              if (
                typeof flowConfig.feedbackButtonPosition !== "undefined" &&
                flowConfig.feedbackButtonPosition.length > 0
              ) {
                Gleap.setButtonType(flowConfig.feedbackButtonPosition);
              }

              if (
                typeof flowConfig.widgetButtonText !== "undefined" &&
                flowConfig.widgetButtonText.length > 0
              ) {
                Gleap.setFeedbackButtonText(flowConfig.widgetButtonText);
              }

              if (
                typeof flowConfig.hideWavingHandAfterName !== "undefined" &&
                flowConfig.hideWavingHandAfterName
              ) {
                Gleap.setWelcomeIcon("");
              }

              if (
                typeof flowConfig.hideUsersName !== "undefined" &&
                flowConfig.hideUsersName
              ) {
                Gleap.setShowUserName(false);
              }

              if (
                flowConfig.widgetInfoTitle &&
                flowConfig.widgetInfoTitle.length > 0
              ) {
                Gleap.setWidgetInfo({
                  title: flowConfig.widgetInfoTitle,
                });
              }

              if (
                flowConfig.widgetInfoSubtitle &&
                flowConfig.widgetInfoSubtitle.length > 0
              ) {
                Gleap.setWidgetInfo({
                  subtitle: flowConfig.widgetInfoSubtitle,
                });
              }

              if (
                flowConfig.widgetInfoDialogSubtitle &&
                flowConfig.widgetInfoDialogSubtitle.length > 0
              ) {
                Gleap.setWidgetInfo({
                  dialogSubtitle: flowConfig.widgetInfoDialogSubtitle,
                });
              }

              if (
                flowConfig.enableMenu &&
                flowConfig.menuItems &&
                flowConfig.menuItems.length > 0
              ) {
                let menuItems = [];
                for (let i = 0; i < flowConfig.menuItems.length; i++) {
                  let menuItem = flowConfig.menuItems[i];
                  let actionFlow = null;
                  let action = null;

                  if (menuItem.actionType === "OPEN_INTERCOM") {
                    action = function () {
                      if (instance.widgetCallback) {
                        return;
                      }
                      Intercom("showNewMessage");
                    };
                  } else if (menuItem.actionType === "REDIRECT_URL") {
                    if (menuItem.actionOpenInNewTab) {
                      action = function () {
                        if (instance.widgetCallback) {
                          instance.widgetCallback("openExternalURL", {
                            url: menuItem.actionBody,
                          });
                        } else {
                          window.open(menuItem.actionBody, "_blank").focus();
                        }
                      };
                    } else {
                      action = function () {
                        window.location.href = menuItem.actionBody;
                      };
                    }
                  } else if (menuItem.actionType === "CUSTOM_ACTION") {
                    action = function () {
                      console.log(menuItem.actionBody);
                      Gleap.triggerCustomAction(menuItem.actionBody);
                    };
                  } else {
                    actionFlow = menuItem.actionType;
                  }

                  // Action flow
                  if (actionFlow != null || action != null) {
                    var item = {
                      title: menuItem.title,
                      description: menuItem.description,
                      icon: menuItem.icon,
                      color: menuItem.color,
                    };
                    if (actionFlow) {
                      item["actionFlow"] = actionFlow;
                    }
                    if (action) {
                      item["action"] = action;
                    }
                    menuItems.push(item);
                  }
                }

                Gleap.setMenuOptions(menuItems);
              }

              if (projectActions) {
                Gleap.setFeedbackActions(projectActions);
              }

              if (flowConfig.buttonLogo && flowConfig.buttonLogo.length > 0) {
                Gleap.setButtonLogoUrl(flowConfig.buttonLogo);
              }
            } catch (e) {}
          }
          resolve();
        }
      };
      http.send();
    });
  };
}
