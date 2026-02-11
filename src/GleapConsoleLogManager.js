import { truncateString } from './GleapHelper';

export default class GleapConsoleLogManager {
  logArray = [];
  disabled = false;
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
    this.disabled = true;
    if (this.originalConsoleLog) {
      window.console = this.originalConsoleLog;
    }
  }

  /**
   * Add message with log level to logs.
   * @param {*} message
   * @param {*} logLevel
   * @returns
   */
  addLog(message, logLevel = 'INFO') {
    if (!message || message.length <= 0) {
      return;
    }

    this.logArray.push({
      log: truncateString(message, 1000),
      date: new Date(),
      priority: logLevel,
    });

    if (this.logArray.length > this.logMaxLength) {
      this.logArray.shift();
    }
  }

  /**
   * Add entry to logs.
   * @param {*} args
   * @param {*} logLevel
   * @returns
   */
  addLogWithArgs(args, logLevel) {
    if (!args || args.length <= 0) {
      return;
    }

    var log = '';
    try {
      for (var i = 0; i < args.length; i++) {
        log += args[i] + ' ';
      }
    } catch (exp) {}

    this.addLog(log, logLevel);
  }

  /**
   * Start console log overwrite.
   */
  start() {
    if (this.disabled) {
      return;
    }

    const self = this;
    window.console = (function (origConsole) {
      if (!window.console || !origConsole) {
        origConsole = {};
      }

      self.originalConsoleLog = origConsole;

      return {
        ...origConsole,
        log: function () {
          self.addLogWithArgs(arguments, 'INFO');
          origConsole.log && origConsole.log.apply(origConsole, arguments);
        },
        warn: function () {
          self.addLogWithArgs(arguments, 'WARNING');
          origConsole.warn && origConsole.warn.apply(origConsole, arguments);
        },
        error: function () {
          self.addLogWithArgs(arguments, 'ERROR');
          origConsole.error && origConsole.error.apply(origConsole, arguments);
        },
        info: function (v) {
          self.addLogWithArgs(arguments, 'INFO');
          origConsole.info && origConsole.info.apply(origConsole, arguments);
        },
      };
    })(window.console);
  }
}
