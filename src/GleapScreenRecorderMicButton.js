/**
 * What the toolbar's mic button shows (GleapScreenRecorder.micButtonState).
 */
export const MIC_BUTTON = Object.freeze({
  // The project doesn't allow the microphone, or this recording started without it.
  HIDDEN: 'hidden',
  // Asked for, but the browser gave none.
  UNAVAILABLE: 'unavailable',
  ON: 'on',
  OFF: 'off',
});

const CROSSED_CLASS = 'bb-capture-toolbar-item--inactivecross';

const TOOLTIP_KEYS = Object.freeze({
  [MIC_BUTTON.ON]: 'mute',
  [MIC_BUTTON.OFF]: 'unmute',
  [MIC_BUTTON.UNAVAILABLE]: 'browserNotSupported',
});

/**
 * Shows the feedback form toolbar's mic button for one of MIC_BUTTON's states.
 * @param {HTMLElement} item the mic button
 * @param {{state: string, tooltip: HTMLElement|null, inactiveClass: string, translate: function(string): string}} options
 * @returns {void}
 */
export const renderMicButton = (item, { state, tooltip, inactiveClass, translate }) => {
  item.style.display = state === MIC_BUTTON.HIDDEN ? 'none' : '';
  if (state === MIC_BUTTON.HIDDEN) {
    return;
  }
  const usable = state === MIC_BUTTON.ON || state === MIC_BUTTON.OFF;
  item.classList.toggle(inactiveClass, !usable);
  item.classList.toggle(CROSSED_CLASS, state !== MIC_BUTTON.ON);
  if (tooltip) {
    tooltip.textContent = translate(TOOLTIP_KEYS[state] || TOOLTIP_KEYS[MIC_BUTTON.UNAVAILABLE]);
  }
};
