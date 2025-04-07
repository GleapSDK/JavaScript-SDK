import { GleapSession, GleapTranslationManager } from "./Gleap"; // Adjust path if needed

// Enum for request states
const RequestStatus = {
  PENDING: "pending",
  SUCCESS: "success",
  ERROR: "error",
};

class ChecklistNetworkManager {
  static instance = null;

  /** @private {Map<string, Promise<string>>} outboundId -> Promise<internalId> */
  validationRequests = new Map();
  /** @private {Map<string, { status: RequestStatus, internalId?: string, error?: any }>} */
  validationCache = new Map(); // Caches final results (success/error)

  /** @private {Map<string, Promise<any>>} internalId -> Promise<checklistData> */
  fetchRequests = new Map();
  /** @private {Map<string, { status: RequestStatus, data?: any, error?: any }>} */
  fetchCache = new Map(); // Caches final results (success/error)

  // Private constructor for Singleton
  constructor() {
    if (ChecklistNetworkManager.instance) {
      return ChecklistNetworkManager.instance;
    }
    ChecklistNetworkManager.instance = this;
  }

  /**
   * Gets the singleton instance of the ChecklistNetworkManager.
   * @returns {ChecklistNetworkManager} The singleton instance.
   */
  static getInstance() {
    if (!ChecklistNetworkManager.instance) {
      ChecklistNetworkManager.instance = new ChecklistNetworkManager();
    }
    return ChecklistNetworkManager.instance;
  }

  clearCache() {
    this.validationCache.clear();
    this.fetchCache.clear();
    this.validationRequests.clear();
    this.fetchRequests.clear();
  }

  /**
   * @private
   * Gets common query parameters for API requests.
   * @returns {string} Query parameter string.
   */
  _getQueryParams() {
    const gleapSessionInstance = GleapSession.getInstance();
    const session = gleapSessionInstance?.session;
    const lang =
      GleapTranslationManager.getInstance().getActiveLanguage() || "en";
    return `gleapId=${session?.gleapId || ""}&gleapHash=${
      session?.gleapHash || ""
    }&lang=${lang}`;
  }

  /**
   * @private
   * Gets the API base URL.
   * @returns {string | null} The API URL or null if not configured.
   */
  _getApiUrl() {
    const gleapSessionInstance = GleapSession.getInstance();
    return gleapSessionInstance?.apiUrl || null;
  }

  /**
   * @private
   * Makes an XMLHttpRequest and returns a Promise.
   * @param {string} method - HTTP method.
   * @param {string} url - The request URL.
   * @param {object|null} data - Data to send in the request body.
   * @returns {Promise<any>} Promise resolving with parsed JSON response on success, rejecting on error.
   */
  _makeRequest(method, url, data) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(method, url);

      const gleapSessionInstance = GleapSession.getInstance();
      gleapSessionInstance?.injectSession(xhr); // Inject session headers

      if (data) {
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      }

      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              // Handle potential empty success responses (e.g., 204)
              const responseData = xhr.responseText
                ? JSON.parse(xhr.responseText)
                : null;
              resolve(responseData);
            } catch (err) {
              reject({
                status: xhr.status,
                statusText: "JSON Parse Error",
                responseText: xhr.responseText,
                error: err,
              });
            }
          } else {
            reject({
              status: xhr.status,
              statusText: xhr.statusText,
              responseText: xhr.responseText,
            });
          }
        }
      };

      xhr.onerror = () => {
        reject({ status: 0, statusText: "Network Error", responseText: null });
      };

      xhr.send(data ? JSON.stringify(data) : null);
    });
  }

  /**
   * Validates an outbound checklist ID, returning a Promise for the internal ID.
   * Manages caching and deduplicates requests.
   * @param {string} outboundId - The public/outbound checklist ID.
   * @returns {Promise<string>} A promise that resolves with the internal checklist ID.
   */
  validateChecklist(outboundId) {
    // 1. Check cache for final result (success or error)
    const cachedResult = this.validationCache.get(outboundId);
    if (cachedResult) {
      if (cachedResult.status === RequestStatus.SUCCESS) {
        return Promise.resolve(cachedResult.internalId);
      } else {
        return Promise.reject(cachedResult.error);
      }
    }

    // 2. Check for an ongoing request
    if (this.validationRequests.has(outboundId)) {
      return this.validationRequests.get(outboundId);
    }
    
    // 3. Start a new request
    const apiUrl = this._getApiUrl();
    if (!apiUrl) {
      const error = new Error(
        "ChecklistNetworkManager: Gleap API URL not configured."
      );
      this.validationCache.set(outboundId, {
        status: RequestStatus.ERROR,
        error,
      });
      return Promise.reject(error);
    }

    const url = `${apiUrl}/outbound/checklists?${this._getQueryParams()}`;
    const requestPromise = this._makeRequest("POST", url, { outboundId })
      .then((responseData) => {
        if (responseData && responseData.id) {
          this.validationCache.set(outboundId, {
            status: RequestStatus.SUCCESS,
            internalId: responseData.id,
          });
          return responseData.id;
        } else {
          const error = new Error("Validation response missing checklist ID.");
          this.validationCache.set(outboundId, {
            status: RequestStatus.ERROR,
            error: responseData || error,
          });
          throw error; // Rethrow to be caught by catch block
        }
      })
      .catch((error) => {
        // Store the error object itself in the cache
        this.validationCache.set(outboundId, {
          status: RequestStatus.ERROR,
          error,
        });
        throw error; // Re-throw so callers can catch it
      })
      .finally(() => {
        // Remove from pending requests map once done (success or fail)
        this.validationRequests.delete(outboundId);
      });

    // Store the promise for potential concurrent requests
    this.validationRequests.set(outboundId, requestPromise);
    return requestPromise;
  }

  /**
   * Fetches the full checklist data using the internal ID, returning a Promise.
   * Manages caching and deduplicates requests.
   * @param {string} internalId - The internal checklist ID.
   * @returns {Promise<object>} A promise that resolves with the full checklist data.
   */
  fetchChecklist(internalId) {
    // 1. Check cache for final result (success or error)
    const cachedResult = this.fetchCache.get(internalId);
    if (cachedResult) {
      if (cachedResult.status === RequestStatus.SUCCESS) {
        // Return a deep copy to prevent mutation issues if multiple components use it
        return Promise.resolve(JSON.parse(JSON.stringify(cachedResult.data)));
      } else {
        return Promise.reject(cachedResult.error);
      }
    }

    // 2. Check for an ongoing request
    if (this.fetchRequests.has(internalId)) {
      // Return a promise that resolves with a deep copy
      return this.fetchRequests
        .get(internalId)
        .then((data) => JSON.parse(JSON.stringify(data)));
    }

    // 3. Start a new request
    const apiUrl = this._getApiUrl();
    if (!apiUrl) {
      const error = new Error(
        "ChecklistNetworkManager: Gleap API URL not configured."
      );
      this.fetchCache.set(internalId, { status: RequestStatus.ERROR, error });
      return Promise.reject(error);
    }

    const url = `${apiUrl}/outbound/checklists/${internalId}?convertTipTap=true&${this._getQueryParams()}`;
    const requestPromise = this._makeRequest("GET", url, null)
      .then((responseData) => {
        if (responseData) {
          // Cache the successful data
          this.fetchCache.set(internalId, {
            status: RequestStatus.SUCCESS,
            data: responseData,
          });
          // Return a deep copy of the data
          return JSON.parse(JSON.stringify(responseData));
        } else {
          // Should not happen with successful GET usually, but handle defensively
          const error = new Error(
            "Empty response received for checklist fetch."
          );
          this.fetchCache.set(internalId, {
            status: RequestStatus.ERROR,
            error: responseData || error,
          });
          throw error;
        }
      })
      .catch((error) => {
        this.fetchCache.set(internalId, { status: RequestStatus.ERROR, error });
        throw error; // Re-throw so callers can catch it
      })
      .finally(() => {
        // Remove from pending requests map once done (success or fail)
        this.fetchRequests.delete(internalId);
      });

    this.fetchRequests.set(internalId, requestPromise);
    // Return a promise that resolves with a deep copy
    return requestPromise.then((data) => JSON.parse(JSON.stringify(data)));
  }
}

export default ChecklistNetworkManager;
