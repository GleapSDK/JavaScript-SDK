import { loadFromGleapCache, saveToGleapCache } from "./GleapHelper";
import Session from "./Session";

export default class AutoConfig {
  static run = () => {
    const cachedConfig = loadFromGleapCache("config");
    if (cachedConfig) {
      AutoConfig.loadConfigFromServer();
      return Promise.resolve(cachedConfig);
    }

    return AutoConfig.loadConfigFromServer();
  };

  static loadConfigFromServer = () => {
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
              return resolve(config);
            } catch (e) {}
          }
          reject();
        }
      };
      http.send();
    });
  };
}
