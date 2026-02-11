import Gleap from './Gleap';

export default class GleapEventManager {
  eventListeners = {};

  // GleapEventManager singleton
  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new GleapEventManager();
    }
    return this.instance;
  }

  /**
   * Notify all registrants for event.
   */
  static notifyEvent(event, data = {}) {
    if (event === 'flow-started') {
      const gleapInstance = Gleap.getInstance();
      gleapInstance.setGlobalDataItem('webReplay', null);
      gleapInstance.setGlobalDataItem('screenRecordingData', null);
      gleapInstance.takeCurrentReplay();
    }

    const eventListeners = this.getInstance().eventListeners[event];
    if (eventListeners) {
      for (var i = 0; i < eventListeners.length; i++) {
        const eventListener = eventListeners[i];
        if (eventListener) {
          eventListener(data);
        }
      }
    }
  }

  /**
   * Register events for Gleap.
   * @param {*} eventName
   * @param {*} callback
   */
  static on(eventName, callback) {
    const instance = this.getInstance();
    if (!instance.eventListeners[eventName]) {
      instance.eventListeners[eventName] = [];
    }
    instance.eventListeners[eventName].push(callback);
  }
}
