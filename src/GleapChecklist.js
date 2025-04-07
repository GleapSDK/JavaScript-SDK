/**
 * Gleap Checklist Web Component
 *
 * Displays an interactive checklist fetched from the Gleap API.
 * Allows users to view steps, mark them as done, trigger actions,
 * and automatically updates based on external events. Includes localization support
 * via GleapTranslationManager.
 *
 * Waits for a Gleap session to be available before initializing and
 * reloads when the session changes (via 'session-updated' event).
 *
 * @element gleap-checklist
 *
 * @attr {string} checklistId - The outbound ID of the checklist to display. Required.
 * @attr {boolean} [info=true] - Whether to display the info section (title, description, sender).
 * @attr {boolean} [progressbar=true] - Whether to display the progress bar.
 * @attr {boolean} [dark=false] - Apply dark mode styling.
 * @attr {boolean} [floating=false] - When set to "true", shows a small bubble that expands on hover.
 *
 * @cssprop --color-bg - Background color.
 * @cssprop --color-font-title - Title text color.
 * @cssprop --color-font-text - Body text color.
 * @cssprop --color-font-light - Lighter text color.
 * @cssprop --color-primary - Primary accent color.
 * @cssprop --color-primary-light - Light primary color shade.
 * @cssprop --color-primary-contrast - Text color for primary buttons.
 * @cssprop --color-border - Border color.
 * @cssprop --color-gray-light - Light gray background/border color.
 * @cssprop --color-gray-lighter - Even lighter gray background.
 * @cssprop --color-gray-dark - Darker gray text/icon color.
 * @cssprop --color-success - Success color (e.g., for completed items).
 * @cssprop --color-success-light - Contrast color for success elements.
 * @cssprop --radius-sm - Small border radius.
 * @cssprop --radius-lg - Large border radius.
 * @cssprop --radius-full - Full (pill) border radius.
 * @cssprop --shadow-sm - Small box shadow.
 * @cssprop --shadow-md - Medium box shadow.
 * @cssprop --animation-duration - Duration for animations (e.g., accordion).
 * @cssprop --animation-timing - Timing function for animations.
 */
import ChecklistNetworkManager from "./ChecklistNetworkManager";
import Gleap, {
  GleapConfigManager,
  GleapSession,
  GleapTranslationManager,
} from "./Gleap";

if (
  typeof customElements !== "undefined" &&
  typeof HTMLElement !== "undefined" &&
  typeof window !== "undefined"
) {
  class GleapChecklist extends HTMLElement {
    /** @private {number} */
    activeStep = -1;
    /** @private {object|null} */
    checklistData = null;
    /** @private {boolean} */
    _isInitialLoad = false;
    /** @private {boolean} */
    _initialActiveSet = false;
    /** @private {boolean} Flag indicating if the component has loaded data at least once. */
    _hasLoaded = false;
    /** @private {boolean} Flag indicating if a Gleap session is currently considered active by the component. */
    _isSessionReady = false;

    /** @private {Function} */
    _boundHandleChecklistUpdate = this.handleChecklistUpdate.bind(this);
    /** @private {Function} */
    _boundHandleSessionUpdate = this.handleSessionUpdate.bind(this);

    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      // Ensure NetworkManager instance is created only if Gleap is available
      try {
        if (
          typeof GleapSession !== "undefined" &&
          typeof ChecklistNetworkManager !== "undefined"
        ) {
          this._networkManager = ChecklistNetworkManager.getInstance();
        } else {
          this._networkManager = null;
        }
      } catch (e) {
        this._networkManager = null;
      }
    }

    // --- Observed Attributes ---
    static get observedAttributes() {
      return ["checklistId", "info", "progressbar", "dark", "floating"];
    }

    // --- Lifecycle Callbacks ---

    connectedCallback() {
      // Add listeners regardless of initial session state
      window.addEventListener(
        "checkListUpdate",
        this._boundHandleChecklistUpdate
      );

      window.addEventListener(
        "session-updated",
        this._boundHandleSessionUpdate
      );

      window.addEventListener(
        "resize",
        (this._boundResizeHandler = this.handleResize.bind(this))
      );

      // Attempt initial load only if session is already available
      this._checkSessionAndLoad();
    }

    disconnectedCallback() {
      window.removeEventListener(
        "checkListUpdate",
        this._boundHandleChecklistUpdate
      );
      window.removeEventListener(
        "session-updated",
        this._boundHandleSessionUpdate
      );

      window.removeEventListener("resize", this._boundResizeHandler);

      // Reset state on disconnect
      this.checklistData = null;
      this.activeStep = -1;
      this._hasLoaded = false;
      this._isSessionReady = false;
      this._initialActiveSet = false;
      this.renderResponse(); // Clear content
    }

    handleResize() {
      this.updateActiveTaskMaxHeight();
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue !== newValue) {
        // Only reload/render if a session is ready and checklistId changed,
        // or if other attributes change *after* initial load.
        if (name === "checklistId" && this._isSessionReady) {
          this.loadChecklist();
        } else if (name !== "checklistId" && this._hasLoaded) {
          // Ensure data exists before trying to re-render display attribute changes
          if (this.checklistData) {
            this.renderChecklist(this.checklistData);
          }
        }
      }
    }

    // --- Session Handling ---

    /**
     * Checks for an active Gleap session and triggers loading if available.
     * Renders a waiting or cleared state if no session is found.
     * @private
     */
    _checkSessionAndLoad() {
      const gleapSessionInstance = this._getGleapSessionInstance();
      const hasChecklistId = this.getAttribute("checklistId");

      if (gleapSessionInstance.ready && hasChecklistId) {
        this._isSessionReady = true;

        // Ensure network manager is instantiated
        this._networkManager = ChecklistNetworkManager.getInstance();
        this.loadChecklist();
      } else {
        this._isSessionReady = false;
        this._hasLoaded = false;
        this.checklistData = null;
        this.activeStep = -1; // Reset active step
        this._initialActiveSet = false;
        this.renderResponse();
      }
    }

    /**
     * Handles the 'session-updated' event dispatched on the window.
     * Clears cache and re-evaluates session state.
     * @private
     */
    handleSessionUpdate() {
      this._checkSessionAndLoad();
    }

    /**
     * Safely gets the GleapSession instance.
     * @returns {GleapSession|null}
     * @private
     */
    _getGleapSessionInstance() {
      try {
        return typeof GleapSession !== "undefined"
          ? GleapSession.getInstance()
          : null;
      } catch (e) {
        return null;
      }
    }

    // --- Getters for Configuration ---
    get infoEnabled() {
      const attr = this.getAttribute("info");
      return attr === null || attr.toLowerCase() !== "false";
    }

    get progressbarEnabled() {
      const attr = this.getAttribute("progressbar");
      return attr === null || attr.toLowerCase() !== "false";
    }

    get floatingEnabled() {
      return this.getAttribute("floating") === "true";
    }

    // --- Translation Helpers ---
    _translate(key, defaultValue = "") {
      return GleapTranslationManager.translateText(key) || defaultValue;
    }

    _translateWithVars(key, vars, defaultValue = "") {
      return (
        GleapTranslationManager.translateTextWithVars(key, vars) || defaultValue
      );
    }

    // --- SVG Icon ---
    getCheckIcon() {
      return `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block;">
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M20.7071 5.29289C21.0976 5.68342 21.0976 6.31658 20.7071 6.70711L9.70711 17.7071C9.31658 18.0976 8.68342 18.0976 8.29289 17.7071L3.29289 12.7071C2.90237 12.3166 2.90237 11.6834 3.29289 11.2929C3.68342 10.9024 4.31658 10.9024 4.70711 11.2929L9 15.5858L19.2929 5.29289C19.6834 4.90237 20.3166 4.90237 20.7071 5.29289Z" fill="currentColor"/>
                </svg>`;
    }

    // --- Data Loading and Handling ---
    loadChecklist() {
      if (!this._isSessionReady || !this._networkManager) {
        return;
      }
      const checklistId = this.getAttribute("checklistId");
      if (checklistId) {
        this.activeStep = -1;
        this._initialActiveSet = false;
        this.validateChecklist(checklistId);
      } else {
        this.renderResponse();
        this.checklistData = null;
        this._hasLoaded = false;
      }
    }

    getQueryParams() {
      const gleapSessionInstance = this._getGleapSessionInstance();
      if (!gleapSessionInstance?.session) {
        return "";
      }
      const session = gleapSessionInstance.session;
      let lang = "en";
      try {
        if (typeof GleapTranslationManager !== "undefined") {
          lang =
            GleapTranslationManager.getInstance().getActiveLanguage() || "en";
        }
      } catch (e) {
        /* Use default lang */
      }
      return `gleapId=${session.gleapId || ""}&gleapHash=${
        session.gleapHash || ""
      }&lang=${lang}`;
    }

    makeRequest(method, url, data, callback) {
      const gleapSessionInstance = this._getGleapSessionInstance();
      if (!gleapSessionInstance?.session) {
        const mockXhr = {
          readyState: 4,
          status: 0,
          responseText: "Session unavailable",
          _isMock: true,
        };
        callback(mockXhr);
        return;
      }
      const xhr = new XMLHttpRequest();
      xhr.open(method, url);
      try {
        gleapSessionInstance.injectSession(xhr);
      } catch (e) {
        // Failed to inject session
      }
      if (data) {
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      }
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          callback(xhr);
        }
      };
      xhr.onerror = () => {
        callback(xhr);
      };
      xhr.send(data ? JSON.stringify(data) : null);
    }

    validateChecklist(outboundId) {
      if (!this._isSessionReady || !this._networkManager) {
        return;
      }
      this.checklistData = null;
      this._hasLoaded = false;
      this.renderResponse();
      this._networkManager
        .validateChecklist(outboundId)
        .then((internalId) => {
          if (!this.isConnected || !this._isSessionReady || !internalId) {
            return;
          }
          this.fetchChecklist(internalId);
        })
        .catch((error) => {
          this.renderResponse();
          this.checklistData = null;
          this._hasLoaded = false;
        });
    }

    fetchChecklist(checklistId) {
      if (!this._isSessionReady || !this._networkManager) {
        return;
      }
      this._isInitialLoad = !this._hasLoaded;
      this._networkManager
        .fetchChecklist(checklistId)
        .then((data) => {
          if (!this.isConnected || !this._isSessionReady || !data) {
            this._hasLoaded = false;
            this.checklistData = null;
            this._checkSessionAndLoad();
            return;
          }
          this.checklistData = data;
          this._hasLoaded = true;
          if (data.status === "done") {
            this.renderResponse();
            return;
          }
          if (this._isInitialLoad && !this._initialActiveSet) {
            const steps = data.outbound?.config?.steps || [];
            const completedSteps = data.completedSteps || [];
            const firstIncompleteIndex = steps.findIndex(
              (step) => !completedSteps.includes(step.id)
            );
            this.activeStep =
              firstIncompleteIndex >= 0 ? firstIncompleteIndex : -1;
            if (this.activeStep !== -1) {
              this._initialActiveSet = true;
            }
          }
          this.renderChecklist(this.checklistData);
        })
        .catch((error) => {
          this.renderResponse();
          this.checklistData = null;
          this._hasLoaded = false;
        });
    }

    updateChecklist(id, data) {
      const gleapSessionInstance = this._getGleapSessionInstance();
      if (!gleapSessionInstance?.session) {
        return;
      }
      const apiUrl = gleapSessionInstance.apiUrl;
      if (!apiUrl) {
        return;
      }
      const session = gleapSessionInstance.session;
      const gleapId = session?.gleapId ?? "";
      const gleapHash = session?.gleapHash ?? "";
      let lang = "en";
      try {
        if (typeof GleapTranslationManager !== "undefined") {
          lang =
            GleapTranslationManager.getInstance().getActiveLanguage() || "en";
        }
      } catch (e) {
        /* Use default */
      }
      let url = `${apiUrl}/outbound/checklists/${id}`;
      if (data.checkedStep) {
        url += `/increment/${data.checkedStep}`;
      }
      url += `?gleapId=${gleapId}&gleapHash=${gleapHash}&lang=${lang}`;
      this.makeRequest("PUT", url, data, (xhr) => {
        if (xhr._isMock) return;
        if (!(xhr.status === 200 || xhr.status === 204)) {
          // Update failed
        }
      });
    }

    // --- External Update Handling ---
    handleChecklistUpdate(event) {
      if (!this._hasLoaded || !this.checklistData) {
        return;
      }
      const updateData = event.detail;
      if (!updateData || updateData.id !== this.checklistData.id) {
        return;
      }
      const previousCompletedSteps = [
        ...(this.checklistData.completedSteps || []),
      ];
      let dataChanged = false;
      let activeStepCompleted = false;
      const currentlyActiveStepIndex = this.activeStep;
      if (
        updateData.completedSteps &&
        JSON.stringify(updateData.completedSteps) !==
          JSON.stringify(previousCompletedSteps)
      ) {
        this.checklistData.completedSteps = [...updateData.completedSteps];
        dataChanged = true;
        if (currentlyActiveStepIndex !== -1) {
          const activeStepId =
            this.checklistData.outbound?.config?.steps?.[
              currentlyActiveStepIndex
            ]?.id;
          if (
            activeStepId &&
            this.checklistData.completedSteps.includes(activeStepId) &&
            !previousCompletedSteps.includes(activeStepId)
          ) {
            activeStepCompleted = true;
          }
        }
      }
      if (
        updateData.status &&
        updateData.status !== this.checklistData.status
      ) {
        this.checklistData.status = updateData.status;
        dataChanged = true;
      }
      if (activeStepCompleted) {
        const steps = this.checklistData.outbound?.config?.steps || [];
        let nextActiveStep = -1;
        for (let i = currentlyActiveStepIndex + 1; i < steps.length; i++) {
          if (!this.checklistData.completedSteps.includes(steps[i].id)) {
            nextActiveStep = i;
            break;
          }
        }
        if (this.activeStep !== nextActiveStep) {
          this.setActiveStep(nextActiveStep);
        }
        dataChanged = true;
      }
      if (dataChanged) {
        this.renderChecklist(this.checklistData);
      }
    }

    // --- Rendering Logic ---
    renderResponse() {
      this.shadowRoot.innerHTML = "";
    }

    renderInfoSection(outbound) {
      if (!this.infoEnabled || !outbound) return "";
      const subject =
        outbound.subject ||
        this._translate("checklistDefaultTitle", "Checklist");
      const message = outbound.message || "";
      let senderHtml = "";
      if (outbound.sender?.profileImageUrl) {
        senderHtml = `
          <div part="sender" class="checklists-sender">
            <img part="sender-image" src="${
              outbound.sender.profileImageUrl
            }" alt="${
          outbound.sender.firstName || "Sender"
        }'s profile picture" style="object-fit: cover;" />
            <span part="sender-name">${outbound.sender.firstName || ""}</span>
          </div>`;
      }
      return `
        <div part="info" class="checklists-info">
          ${
            subject
              ? `<div part="info-title" class="checklists-title">${subject}</div>`
              : ""
          }
          ${
            message
              ? `<div part="info-description" class="checklists-description">${message}</div>`
              : ""
          }
          ${senderHtml}
        </div>`;
    }

    renderProgressSection(steps = [], completedSteps = []) {
      if (!this.progressbarEnabled || !steps.length) return "";
      const totalSteps = steps.length;
      const doneSteps = completedSteps.length;
      const progress = totalSteps > 0 ? (doneSteps / totalSteps) * 100 : 0;
      let duration = 0;
      steps.forEach((step) => {
        if (!completedSteps.includes(step.id) && step.duration > 0) {
          duration += step.duration;
        }
      });
      const progressLabel = this._translateWithVars(
        "taskProgress",
        { a: doneSteps, b: totalSteps },
        `${doneSteps} of ${totalSteps} done`
      );
      const durationLabel =
        duration > 0
          ? this._translateWithVars(
              "aboutMinutes",
              { a: duration },
              `About ${duration} min left`
            )
          : "";
      return `
        <div part="progress-labels" class="checklist-progress-labels">
          <div part="progress-label-primary" class="checklist-progress-label">${progressLabel}</div>
          ${
            durationLabel
              ? `<div part="progress-label-secondary" class="checklist-progress-label">${durationLabel}</div>`
              : ""
          }
        </div>
        <div part="progress-bar" class="checklist-progress-bar">
          <div part="progress-bar-progress" class="checklist-progress-bar-progress" style="width: ${progress}%;"></div>
        </div>`;
    }

    renderTasks(steps = [], completedSteps = []) {
      if (!steps || steps.length === 0)
        return `<p>${this._translate(
          "noStepsDefined",
          "No steps defined."
        )}</p>`;
      return steps
        .map((step, index) => {
          const isTaskDone = completedSteps.includes(step.id);
          const isActive = this.activeStep === index;
          const badge = isTaskDone
            ? `<span part="task-badge" class="checklist-task-header--badge checklist-task-header--badge-done">${this.getCheckIcon()}</span>`
            : `<span part="task-badge" class="checklist-task-header--badge">${
                index + 1
              }</span>`;
          const stepTitle =
            step.title ||
            this._translateWithVars(
              "stepDefaultTitle",
              { index: index + 1 },
              `Step ${index + 1}`
            );
          const stepDescription = step.description || "";
          const actionButtonText =
            step.actionTitle || this._translate("actionDefaultTitle", "Action");
          const actionHtml =
            step.action && step.action !== "none"
              ? `<div part="task-action" class="checklist-task-body-action" data-action-index="${index}">
                    <button type="button" class="action-button form-send-button">${actionButtonText}</button>
                 </div>`
              : "";
          const markDoneLabel = this._translate("markAsDone", "Mark as done");
          const markDoneHtml =
            step.allowMarkDone && !isTaskDone
              ? `<div part="task-mark-done" class="checklist-task-body-markdone" data-markdone-index="${index}">
                    ${this.getCheckIcon()}
                    <div class="checklist-task-body-markdone-label">${markDoneLabel}</div>
                 </div>`
              : "";
          const taskClasses = [
            "checklist-task",
            isTaskDone ? "checklist-task--done" : "",
            isActive ? "checklist-task--active" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return `
            <div part="task" class="${taskClasses}" data-task-index="${index}">
              <div part="task-header" class="checklist-task-header" role="button" aria-expanded="${isActive}" aria-controls="task-body-${index}">
                ${badge}
                <div part="task-header-title" class="checklist-task-header--title">${stepTitle}</div>
                <span part="task-header-chevron" class="checklist-task-header--chevron">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </span>
              </div>
              <div part="task-body" class="checklist-task-body" id="task-body-${index}">
                <div part="task-body-inner" class="checklist-task-body-inner">
                  ${
                    stepDescription
                      ? `<div part="task-body-content" class="checklist-task-body-content">${stepDescription}</div>`
                      : ""
                  }
                  ${actionHtml}
                  ${markDoneHtml}
                </div>
              </div>
            </div>`;
        })
        .join("");
    }

    renderChecklist(data) {
      if (!this._hasLoaded || !data || !data.outbound) {
        this._checkSessionAndLoad();
        return;
      }
      const { outbound } = data;
      const steps = outbound.config?.steps || [];
      const completedSteps = data.completedSteps || [];
      const isDone =
        data.status === "done" ||
        (steps.length > 0 && completedSteps.length >= steps.length);
      let content = "";
      if (isDone) {
        const successTitle =
          outbound.config?.successTitle ||
          this._translate("successDefaultTitle", "");
        const successMessage =
          outbound.config?.successMessage ||
          this._translate("successDefaultMessage", "");
        content = `
          <div part="content" class="checklists-content checklists-content--done">
            <div part="success-icon" class="checklists-success-icon">
              <span part="success-icon-circle" class="checklists-success-icon--circle">${this.getCheckIcon()}</span>
            </div>
            <div part="success-title" class="checklists-title">${successTitle}</div>
            <div part="success-description" class="checklists-description">${successMessage}</div>
          </div>`;
        if (this.activeStep !== -1) this.activeStep = -1;
      } else {
        content = `
          <div part="content" class="checklists-content">
            ${this.renderInfoSection(outbound)}
            ${this.renderProgressSection(steps, completedSteps)}
            <div part="tasks" class="checklist-tasks">${this.renderTasks(
              steps,
              completedSteps
            )}</div>
          </div>`;
      }

      const flowConfig = GleapConfigManager.getInstance().getFlowConfig();
      const primaryColor = flowConfig.color ? flowConfig.color : "#485BFF";

      const styles = `
        <style>
          :host {
            display: block;
            --color-bg: #ffffff;
            --color-font-title: #1f2937;
            --color-font-text: #4b5563;
            --color-font-light: #6b7280;
            --color-primary: ${primaryColor};
            --color-primary-light: ${primaryColor}22;
            --color-primary-contrast: #ffffff;
            --color-border: #e5e7eb;
            --color-gray-light: #f3f4f6;
            --color-gray-lighter: #f9fafb;
            --color-gray-dark: #6b7280;
            --color-success: #10b981;
            --color-success-light: #ffffff;
            --radius-sm: 4px;
            --radius-lg: 12px;
            --radius-full: 9999px;
            --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
            --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
            --animation-duration: 0.2s;
            --animation-timing: ease-in-out;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
            box-sizing: border-box;
          }
          :host([dark]) {
            --color-bg: #1f2937;
            --color-font-title: #f9fafb;
            --color-font-text: #d1d5db;
            --color-font-light: #9ca3af;
            --color-primary: ${primaryColor};
            --color-primary-light: ${primaryColor}22;
            --color-primary-contrast: #ffffff;
            --color-border: #374151;
            --color-gray-light: #374151;
            --color-gray-lighter: #111827;
            --color-gray-dark: #9ca3af;
            --color-success: #34d399;
            --color-success-light: #1f2937;
          }
          *, *:before, *:after { box-sizing: inherit; }
          .checklists-content { color: var(--color-font-text); }
          .checklists-content--done { text-align: center; }
          .checklists-info { margin-bottom: 24px; text-align: center; }
          .checklists-title { font-size: 1.25rem; font-weight: 600; margin-bottom: 8px; color: var(--color-font-title); }
          .checklists-description { font-size: 0.9rem; margin-bottom: 16px; color: var(--color-font-text); line-height: 1.5; }
          .checklists-sender { display: flex; align-items: center; justify-content: center; gap: 8px; }
          .checklists-sender img { width: 28px; height: 28px; border-radius: var(--radius-full); object-fit: cover; }
          .checklists-sender span { font-size: 0.875rem; color: var(--color-font-light); font-weight: 500; }
          .checklists-success-icon { margin-bottom: 16px; line-height: 0; }
          .checklists-success-icon--circle { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: var(--radius-full); background-color: var(--color-success); color: var(--color-success-light); font-size: 22px; }
          .checklist-progress-labels { display: flex; justify-content: space-between; margin-bottom: 8px; }
          .checklist-progress-label { font-size: 0.75rem; color: var(--color-font-light); font-weight: 500; }
          .checklist-progress-bar { width: 100%; height: 6px; background-color: var(--color-gray-light); border-radius: var(--radius-full); overflow: hidden; margin-bottom: 20px; }
          .checklist-progress-bar-progress { height: 100%; background-color: var(--color-primary); transition: width var(--animation-duration) var(--animation-timing); border-radius: var(--radius-full); }
          .checklist-tasks { display: flex; flex-direction: column; gap: 12px; }
          .checklist-task { border: 1px solid var(--color-border); border-radius: var(--radius-lg); background-color: var(--color-bg); box-shadow: var(--shadow-sm); overflow: hidden; transition: background-color var(--animation-duration) var(--animation-timing), border-color var(--animation-duration) var(--animation-timing); }
          .checklist-task-header { display: flex; align-items: center; padding: 12px 16px; cursor: pointer; gap: 12px; position: relative; }
          .checklist-task-header:hover { background: var(--color-gray-lighter); }
          .checklist-task-header--badge { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: var(--radius-full); background-color: var(--color-primary-light); color: var(--color-primary); font-size: 0.875rem; font-weight: 600; flex-shrink: 0; transition: background-color var(--animation-duration) var(--animation-timing), color var(--animation-duration) var(--animation-timing); line-height: 1; }
          .checklist-task-header--badge svg { width: 16px; height: 16px; }
          .checklist-task-header--title { flex-grow: 1; font-size: 0.9rem; font-weight: 500; color: var(--color-font-title); transition: font-weight var(--animation-duration) var(--animation-timing), color var(--animation-duration) var(--animation-timing), text-decoration var(--animation-duration) var(--animation-timing); }
          .checklist-task-header--chevron { color: var(--color-font-light); transition: transform var(--animation-duration) var(--animation-timing); flex-shrink: 0; margin-left: auto; }
          .checklist-task-header--chevron svg { display: block; width: 18px; height: 18px; }
          .checklist-task-body {
            overflow: hidden;
            transition: max-height var(--animation-duration) var(--animation-timing), opacity var(--animation-duration) var(--animation-timing);
            max-height: 0;
            opacity: 0;
          }
          .checklist-task--active .checklist-task-body {
            max-height: var(--task-body-active-height, 200px);
            opacity: 1;
          }
          .checklist-task-body-inner { padding: 4px 16px 20px 56px; font-size: 0.875rem; color: var(--color-font-text); line-height: 1.5; }
          .checklist-task-body-content { margin-bottom: 16px; }
          .checklist-task-body-content p:first-child { margin-top: 0; }
          .checklist-task-body-content p:last-child { margin-bottom: 0; }
          .checklist-task-body-action { margin-top: 16px; }
          .action-button { display: inline-flex; align-items: center; justify-content: center; background-color: var(--color-primary); color: var(--color-primary-contrast); padding: 10px 18px; font-size: 0.875rem; font-weight: 500; border-radius: var(--radius-lg); border: none; text-align: center; cursor: pointer; transition: background-color var(--animation-duration) var(--animation-timing), box-shadow var(--animation-duration) var(--animation-timing); box-shadow: var(--shadow-sm); }
          .action-button:hover { background-color: color-mix(in srgb, var(--color-primary) 90%, black); box-shadow: var(--shadow-md); }
          .action-button:focus { outline: 2px solid color-mix(in srgb, var(--color-primary) 50%, transparent); outline-offset: 2px; }
          .checklist-task-body-markdone { margin-top: 20px; border-top: 1px solid var(--color-border); padding: 16px 0 0px 0; display: flex; align-items: center; cursor: pointer; color: var(--color-primary); transition: color var(--animation-duration) var(--animation-timing); }
          .checklist-task-body-markdone:hover { color: color-mix(in srgb, var(--color-primary) 80%, black); }
          .checklist-task-body-markdone svg { width: 18px; height: 18px; margin-right: 6px; flex-shrink: 0; font-size: 18px; }
          .checklist-task-body-markdone-label { font-size: 0.875rem; font-weight: 500; line-height: 1; }
          .checklist-task--active .checklist-task-header--title { font-weight: 600; }
          .checklist-task--active .checklist-task-header--chevron { transform: rotate(180deg); }
          .checklist-task--active .checklist-task-header:hover { background: linear-gradient(180deg, var(--color-gray-lighter), transparent); }
          .checklist-task--done { background-color: var(--color-gray-lighter); border-color: var(--color-gray-light); box-shadow: none; }
          .checklist-task--done .checklist-task-header--badge { background-color: var(--color-success); color: var(--color-success-light); }
          .checklist-task--done .checklist-task-header--title { color: var(--color-font-light); }
          .checklist-task--done .checklist-task-body-inner { color: var(--color-font-light); }

          /* -------------------------
             Floating style addition
             Only applies if floating="true"
             ------------------------- */
          :host([floating="true"]) .checklists-content {
            position: relative;
          }
          :host([floating="true"]) .checklist-tasks {
            position: absolute;
            bottom: 0;
            left: 0;
            z-index: 1000;
            display: none;
            padding: 0px;
            background-color: var(--color-bg);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-md);
            overflow: hidden;
          }
          :host([floating="true"]) .checklists-content:hover .checklist-tasks {
            display: block !important;
          }
          :host([floating="true"]) .checklists-info {
            display: none;
          }
          :host([floating="true"]) .checklist-task {
            border-radius: 0px;
            border: none;
            border-bottom: 1px solid var(--color-border);
          }
          :host([floating="true"]) .checklist-task:last-child {
            border-bottom: none;
          }
        </style>
      `;
      this.shadowRoot.innerHTML = styles + content;
      this.addTaskEventListeners();
      if (this.activeStep !== -1) {
        this.toggleTask(this.activeStep, true);
      }
    }

    updateActiveTaskMaxHeight() {
      if (this.activeStep !== -1) {
        const taskBodyInner = this.shadowRoot.querySelector(
          `.checklist-task[data-task-index="${this.activeStep}"] .checklist-task-body-inner`
        );
        const container = this.shadowRoot.querySelector(
          `.checklist-task[data-task-index="${this.activeStep}"] .checklist-task-body`
        );
        if (taskBodyInner && container) {
          const height = taskBodyInner.offsetHeight;
          container.style.setProperty(
            "--task-body-active-height",
            `${height}px`
          );
        }
      }
    }

    // --- Event Listener Setup ---
    addTaskEventListeners() {
      const tasks = this.shadowRoot.querySelectorAll(".checklist-task");
      tasks.forEach((task) => {
        const header = task.querySelector(".checklist-task-header");
        const index = parseInt(task.getAttribute("data-task-index"), 10);
        if (header) {
          header.addEventListener("click", () => {
            const newActiveStep = this.activeStep === index ? -1 : index;
            this.setActiveStep(newActiveStep);
          });
        }
        const markDoneBtn = task.querySelector(".checklist-task-body-markdone");
        if (markDoneBtn) {
          markDoneBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (!this.checklistData?.outbound?.config?.steps) return;
            const step = this.checklistData.outbound.config.steps[index];
            if (!step) return;
            const previouslyActiveStep = this.activeStep;
            if (!this.checklistData.completedSteps)
              this.checklistData.completedSteps = [];
            if (!this.checklistData.completedSteps.includes(step.id)) {
              this.checklistData.completedSteps.push(step.id);
              const allSteps = this.checklistData.outbound.config.steps;
              let nextActiveStep = -1;
              if (previouslyActiveStep === index) {
                for (let i = index + 1; i < allSteps.length; i++) {
                  if (
                    !this.checklistData.completedSteps.includes(allSteps[i].id)
                  ) {
                    nextActiveStep = i;
                    break;
                  }
                }
                this.setActiveStep(nextActiveStep);
              }
              setTimeout(() => {
                this.renderChecklist(this.checklistData);
              }, 300);
              const updateData = { checkedStep: step.id };
              if (
                allSteps.length > 0 &&
                this.checklistData.completedSteps.length >= allSteps.length
              ) {
                this.checklistData.status = "done";
                updateData.status = "done";
              }
              this.updateChecklist(this.checklistData.id, updateData);
            }
          });
        }
        const actionBtn = task.querySelector(
          ".checklist-task-body-action .action-button"
        );
        if (actionBtn) {
          actionBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (
              !this.checklistData?.outbound?.config?.steps ||
              typeof Gleap === "undefined"
            )
              return;
            const step = this.checklistData.outbound.config.steps[index];
            if (!step || !step.action || step.action === "none") return;
            try {
              if (step.action === "BOT") Gleap.startBot(step.botId);
              else if (step.action === "CUSTOM_ACTION")
                Gleap.triggerCustomAction(step.actionBody);
              else if (step.action === "REDIRECT_URL")
                Gleap.openURL(step.actionBody, !!step.actionOpenInNewTab);
              else if (step.action === "FEEDBACK_FLOW")
                Gleap.startFeedbackFlow(step.formId);
              else if (step.action === "NEWS_ARTICLE")
                Gleap.openNewsArticle(step.articleId);
              else if (step.action === "HELP_ARTICLE")
                Gleap.openHelpCenterArticle(step.articleId);
              else if (step.action === "CHECKLIST")
                Gleap.startChecklist(step.checklistId);
            } catch (gleapError) {}
          });
        }
      });
    }

    // --- Animation and State Management ---
    setActiveStep(index) {
      const previousActiveStep = this.activeStep;
      this.activeStep = index;
      const tasksToToggle = [];
      if (previousActiveStep !== -1 && previousActiveStep !== this.activeStep) {
        tasksToToggle.push({ index: previousActiveStep, open: false });
      }
      if (this.activeStep !== -1 && this.activeStep !== previousActiveStep) {
        tasksToToggle.push({ index: this.activeStep, open: true });
      }
      tasksToToggle.forEach(({ index, open }) => {
        this.toggleTask(index, open);
      });
    }

    toggleTask(index, forceOpen = null) {
      const taskElement = this.shadowRoot.querySelector(
        `.checklist-task[data-task-index="${index}"]`
      );
      if (!taskElement) return;
      const header = taskElement.querySelector(".checklist-task-header");
      if (!header) return;
      const isOpen = taskElement.classList.contains("checklist-task--active");
      const shouldOpen = forceOpen !== null ? forceOpen : !isOpen;
      if (shouldOpen && !isOpen) {
        taskElement.classList.add("checklist-task--active");
        header.setAttribute("aria-expanded", "true");
        const taskBodyInner = taskElement.querySelector(
          ".checklist-task-body-inner"
        );
        if (taskBodyInner) {
          const height = taskBodyInner.offsetHeight;
          const taskBody = taskElement.querySelector(".checklist-task-body");
          if (taskBody) {
            taskBody.style.setProperty(
              "--task-body-active-height",
              `${height}px`
            );
          }
        }
      } else if (!shouldOpen && isOpen) {
        taskElement.classList.remove("checklist-task--active");
        header.setAttribute("aria-expanded", "false");
      }
    }
  }

  if (
    typeof customElements !== "undefined" &&
    !customElements.get("gleap-checklist")
  ) {
    customElements.define("gleap-checklist", GleapChecklist);
  }
}
