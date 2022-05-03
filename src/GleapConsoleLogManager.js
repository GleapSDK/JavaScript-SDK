import { truncateString } from "./GleapHelper";

export default class GleapConsoleLogManager {
  logArray = [];
  originalConsoleLog;
  logMaxLength = 500;

  // GleapConsoleLogManager singleton
  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new GleapConsoleLogManager();
    }
    return this.instance;
  }

  /**
   * Return the console logs
   * @returns {any[]} logs
   */
  getLogs() {
    return this.logArray;
  }

  /**
   * Revert console log overwrite.
   */
  stop() {
    window.console = this.originalConsoleLog;
  }

  /**
   * Add entry to logs.
   * @param {*} args
   * @param {*} priority
   * @returns
   */
  addLog(args, priority) {
    if (!args || args.length <= 0) {
      return;
    }

    var log = "";
    for (var i = 0; i < args.length; i++) {
      log += args[i] + " ";
    }
    this.logArray.push({
      log: truncateString(log, 1000),
      date: new Date(),
      priority,
    });

    if (this.logArray.length > this.logMaxLength) {
      this.logArray.shift();
    }
  }

  /**
   * Start console log overwrite.
   */
  start() {
    const self = this;
    window.console = (function (origConsole) {
      if (!window.console || !origConsole) {
        origConsole = {};
      }

      self.originalConsoleLog = origConsole;

      return {
        ...origConsole,
        log: function () {
          self.addLog(arguments, "INFO");
          origConsole.log && origConsole.log.apply(origConsole, arguments);
        },
        warn: function () {
          self.addLog(arguments, "WARNING");
          origConsole.warn && origConsole.warn.apply(origConsole, arguments);
        },
        error: function () {
          self.addLog(arguments, "ERROR");
          origConsole.error && origConsole.error.apply(origConsole, arguments);
        },
        info: function (v) {
          self.addLog(arguments, "INFO");
          origConsole.info && origConsole.info.apply(origConsole, arguments);
        },
      };
    })(window.console);
  }
}
