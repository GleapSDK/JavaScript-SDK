import { loadFromGleapCache, saveToGleapCache } from "./GleapHelper";
import Session from "./Session";

export default class AutoConfig {
  static run = (applyFunc) => {
    const cachedConfig = loadFromGleapCache("config");
    if (cachedConfig) {
      applyFunc(cachedConfig, false);
      AutoConfig.loadConfigFromServer(applyFunc, true);
      return Promise.resolve();
    }

    return AutoConfig.loadConfigFromServer(applyFunc, false);
  };

  static loadConfigFromServer = (applyFunc, soft) => {
    return new Promise(function (resolve, reject) {
      const session = Session.getInstance();
      const http = new XMLHttpRequest();
      http.open(
        "GET",
        session.widgetUrl + "/widget/" + session.sdkKey + "/config"
      );
      http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      session.injectSession(http);
      http.onerror = function () {
        reject();
      };
      http.onreadystatechange = function (e) {
        if (http.readyState === XMLHttpRequest.DONE) {
          if (http.status === 200 || http.status === 201) {
            try {
              const config = JSON.parse(http.responseText);
              try {
                saveToGleapCache("config", config);
              } catch (exp) {}
              applyFunc(config, soft);
              return resolve();
            } catch (e) {}
          }
          reject();
        }
      };
      http.send();
    });
  };
}
