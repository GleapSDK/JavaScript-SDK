import { gleapDataParser } from "./GleapHelper";

export default class GleapCustomDataManager {
  customData = {};
  ticketAttributes = {};

  // GleapCustomDataManager singleton
  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new GleapCustomDataManager();
    }
    return this.instance;
  }

  /**
   * Returns the custom data object
   * @returns {*}
   */
  getCustomData() {
    return this.customData;
  }

  /**
   * Set custom data that will be attached to the bug-report.
   * @param {*} data
   */
  attachCustomData(data) {
    this.customData = Object.assign(
      this.customData,
      gleapDataParser(data)
    );
  }

  /**
   * Add one key value pair to the custom data object
   * @param {*} key The key of the custom data entry you want to add.
   * @param {*} value The custom data you want to add.
   */
  setCustomData(key, value) {
    this.customData[key] = value;
  }

  /**
   * Remove one key value pair of the custom data object
   * @param {*} key The key of the custom data entry you want to remove.
   */
  removeCustomData(key) {
    delete this.customData[key];
  }

  /**
   * Clear the custom data
   */
  clearCustomData() {
    this.customData = {};
  }

  /**
   * This method is used to set ticket attributes programmatically.
   * @param {*} key The key of the attribute you want to add.
   * @param {*} value The value to set.
   */
  setTicketAttribute(key, value) {
    this.ticketAttributes[key] = value;
  }

  /**
   * This method is used to unset ticket attributes programmatically.
   * @param {*} key The key of the attribute you want to unset.
   */
  unsetTicketAttribute(key) {
    delete this.ticketAttributes[key];
  }

  /**
   * This method is used to clear ticket attributes programmatically.
   */
  clearTicketAttributes() {
    this.ticketAttributes = {};
  }

  getTicketAttributes() {
    return this.ticketAttributes;
  }
}
