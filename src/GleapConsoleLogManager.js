import { formatError, formatLogArgs, formatValue } from './GleapLogFormatter';

const CONSOLE_METHOD_LEVELS = {
  log: 'INFO',
  info: 'INFO',
  debug: 'INFO',
  warn: 'WARNING',
  error: 'ERROR',
};

const MAX_LOG_LENGTH = 1000;
const MAX_ERROR_LOG_LENGTH = 5000;
const TRUNCATION_MARKER = '… [truncated]';

// Slightly above the longest entry we keep, so truncation is detected after formatting.
const FORMAT_BUDGET = MAX_ERROR_LOG_LENGTH + 1;

const truncateLog = (message, logLevel) => {
  const limit = logLevel === 'ERROR' ? MAX_ERROR_LOG_LENGTH : MAX_LOG_LENGTH;
  if (message.length <= limit) {
    return message;
  }
  return message.slice(0, limit - TRUNCATION_MARKER.length) + TRUNCATION_MARKER;
};

const locationSuffix = (event) => {
  if (!event.filename) {
    return '';
  }
  return ' (' + event.filename + ':' + (event.lineno || 0) + ':' + (event.colno || 0) + ')';
};

export default class GleapConsoleLogManager {
  logArray = [];
  disabled = false;
  started = false;
  originalConsoleMethods = {};
  consoleWrappers = {};
  capturing = false;
  errorListener = null;
  rejectionListener = null;
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
    return this.logArray.slice();
  }

  /**
   * Revert console log overwrite.
   */
  stop() {
    this.disabled = true;
    this.started = false;

    // Restore a console method only where our wrapper is still installed: when another tool
    // wrapped it after us, replacing it would drop that tool's wrapper. Ours then just forwards.
    try {
      const target = typeof window !== 'undefined' ? window.console : undefined;
      if (target) {
        const methods = Object.keys(this.consoleWrappers);
        for (let i = 0; i < methods.length; i++) {
          const method = methods[i];
          if (target[method] === this.consoleWrappers[method]) {
            target[method] = this.originalConsoleMethods[method];
          }
        }
      }
    } catch (exp) {}
    this.consoleWrappers = {};
    this.originalConsoleMethods = {};

    try {
      if (this.errorListener) {
        window.removeEventListener('error', this.errorListener);
      }
      if (this.rejectionListener) {
        window.removeEventListener('unhandledrejection', this.rejectionListener);
      }
    } catch (exp) {}
    this.errorListener = null;
    this.rejectionListener = null;
  }

  /**
   * Add message with log level to logs.
   * @param {*} message
   * @param {*} logLevel
   * @returns
   */
  addLog(message, logLevel = 'INFO') {
    if (message === undefined || message === null) {
      return;
    }

    if (typeof message !== 'string') {
      message = formatValue(message, FORMAT_BUDGET);
    }

    if (message.length <= 0) {
      return;
    }

    this.logArray.push({
      log: truncateLog(message, logLevel),
      date: new Date().toISOString(),
      priority: logLevel,
    });

    while (this.logArray.length > this.logMaxLength) {
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

    this.addLog(formatLogArgs(args, FORMAT_BUDGET), logLevel);
  }

  // Runs inside the console wrappers and the global error listeners. A value that logs while
  // it is being formatted (a getter calling console.log) must not recurse into the buffer.
  capture(callback) {
    if (this.disabled || this.capturing) {
      return;
    }
    this.capturing = true;
    try {
      callback();
    } catch (exp) {
    } finally {
      this.capturing = false;
    }
  }

  wrapConsoleMethod(target, method, captureCall) {
    const original = target[method];
    if (typeof original !== 'function' || original.__gleapConsoleWrapper) {
      return;
    }

    const wrapper = function () {
      captureCall(arguments);
      return original.apply(target, arguments);
    };
    wrapper.__gleapConsoleWrapper = true;

    this.originalConsoleMethods[method] = original;
    this.consoleWrappers[method] = wrapper;
    target[method] = wrapper;
  }

  /**
   * Start console log overwrite: patches the console methods in place (the console object
   * itself stays the same) and records uncaught errors and unhandled promise rejections.
   */
  start() {
    if (this.disabled || this.started || typeof window === 'undefined') {
      return;
    }
    this.started = true;

    const self = this;
    const target = window.console;
    if (target) {
      const methods = Object.keys(CONSOLE_METHOD_LEVELS);
      for (let i = 0; i < methods.length; i++) {
        const method = methods[i];
        this.wrapConsoleMethod(target, method, (args) => {
          self.capture(() => self.addLogWithArgs(args, CONSOLE_METHOD_LEVELS[method]));
        });
      }

      // console.assert logs only when the assertion fails.
      this.wrapConsoleMethod(target, 'assert', (args) => {
        if (args.length > 0 && args[0]) {
          return;
        }
        self.capture(() => {
          const details = formatLogArgs(Array.prototype.slice.call(args, 1), FORMAT_BUDGET);
          self.addLog('Assertion failed' + (details ? ': ' + details : ''), 'ERROR');
        });
      });
    }

    try {
      this.errorListener = (event) => {
        self.capture(() => self.addUncaughtError(event));
      };
      this.rejectionListener = (event) => {
        self.capture(() => {
          const reason = event ? event.reason : undefined;
          self.addLog('Unhandled promise rejection: ' + formatValue(reason, FORMAT_BUDGET), 'ERROR');
        });
      };
      window.addEventListener('error', this.errorListener);
      window.addEventListener('unhandledrejection', this.rejectionListener);
    } catch (exp) {}
  }

  addUncaughtError(event) {
    // Failed resource loads (<img>, <script>) dispatch a plain Event that does not bubble to
    // window; only runtime errors arrive here as an ErrorEvent.
    if (!event || (typeof ErrorEvent !== 'undefined' && !(event instanceof ErrorEvent))) {
      return;
    }

    const error = event.error;
    let text;
    if (error && typeof error === 'object' && typeof error.stack === 'string' && error.stack.length > 0) {
      text = formatError(error);
    } else if (error !== undefined && error !== null) {
      // A thrown string or object, or an error without a stack: add where it was thrown.
      text = formatValue(error, FORMAT_BUDGET) + locationSuffix(event);
    } else {
      // Cross-origin scripts only report "Script error.". Chrome prefixes messages with "Uncaught".
      text = String(event.message || 'Script error.').replace(/^Uncaught\s+/, '') + locationSuffix(event);
    }

    this.addLog('Uncaught ' + text, 'ERROR');
  }
}
