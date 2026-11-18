/**
 * @vitest-environment jsdom
 */
import { test, expect, beforeEach } from 'vitest';
import { MIC_BUTTON, renderMicButton } from './GleapScreenRecorderMicButton';

const INACTIVE = 'bb-capture-editor-item-inactive';
const CROSSED = 'bb-capture-toolbar-item--inactivecross';

let item;
let tooltip;
const render = (state) =>
  renderMicButton(item, { state, tooltip, inactiveClass: INACTIVE, translate: (key) => `t:${key}` });

beforeEach(() => {
  document.body.innerHTML =
    '<div class="bb-capture-toolbar-item" data-type="mic"><span class="bb-tooltip-audio-recording"></span></div>';
  item = document.querySelector('[data-type="mic"]');
  tooltip = document.querySelector('.bb-tooltip-audio-recording');
});

test('hidden: the button is not shown at all', () => {
  render(MIC_BUTTON.HIDDEN);
  expect(item.style.display).toBe('none');
});

test('off: shown crossed out, the tooltip offers to unmute', () => {
  render(MIC_BUTTON.OFF);
  expect(item.style.display).toBe('');
  expect(item.classList.contains(INACTIVE)).toBe(false);
  expect(item.classList.contains(CROSSED)).toBe(true);
  expect(tooltip.textContent).toBe('t:unmute');
});

test('on: shown without the cross, the tooltip offers to mute', () => {
  render(MIC_BUTTON.OFF);
  render(MIC_BUTTON.ON);
  expect(item.classList.contains(INACTIVE)).toBe(false);
  expect(item.classList.contains(CROSSED)).toBe(false);
  expect(tooltip.textContent).toBe('t:mute');
});

test('unavailable: shown inactive and crossed out', () => {
  render(MIC_BUTTON.UNAVAILABLE);
  expect(item.classList.contains(INACTIVE)).toBe(true);
  expect(item.classList.contains(CROSSED)).toBe(true);
  expect(tooltip.textContent).toBe('t:browserNotSupported');
});

test('shown again after being hidden', () => {
  render(MIC_BUTTON.HIDDEN);
  render(MIC_BUTTON.OFF);
  expect(item.style.display).toBe('');
});

test('a tooltip that is not there is skipped', () => {
  tooltip = null;
  expect(() => render(MIC_BUTTON.ON)).not.toThrow();
  expect(item.classList.contains(CROSSED)).toBe(false);
});
