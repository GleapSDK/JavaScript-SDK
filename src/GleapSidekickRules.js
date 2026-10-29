// The sidekick's rules (decision 13): what the page tells the agent and when a
// proactive open may show. Pure: no DOM, no managers, so the tests can pin them.

export const SIDEKICK_WIDTH = 400;
// Push only when the page keeps at least this much room next to the panel.
export const SIDEKICK_PUSH_MIN_PAGE_WIDTH = 720;
// At or below this width the panel is a full-screen sheet.
export const SIDEKICK_PHONE_MAX_WIDTH = 600;

// Mirrors the server's caps (Server copilotContext.logic CONTEXT_LIMITS / APP_CONTEXT_LIMITS):
// the server sanitises again, this keeps the request small.
export const SIDEKICK_CONTEXT_LIMITS = {
  route: 300,
  title: 140,
  dataEntries: 30,
  dataChars: 24000,
  stepNumber: 999,
};

// A proactive open the customer closed without writing stays quiet this long.
export const SIDEKICK_DISMISS_MS = 24 * 60 * 60 * 1000;
// Never while the person types: wait for this long without keys, at most TYPING_MAX_WAIT_MS.
export const SIDEKICK_TYPING_IDLE_MS = 4000;
export const SIDEKICK_TYPING_MAX_WAIT_MS = 30000;
// A hidden tab waits this long for the person to come back.
export const SIDEKICK_HIDDEN_MAX_WAIT_MS = 60000;

const STEP_ID = /^[A-Za-z0-9_-]{1,64}$/;
const SENDER_NAME_MAX = 80;
const MESSAGE_MAX = 500;

const plain = (value, max) => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const text = value.replace(/\s+/g, ' ').trim();
  if (!text) {
    return undefined;
  }
  return text.length > max ? text.slice(0, max) : text;
};

/**
 * The page's address as the agent sees it: origin + path. The query and the
 * fragment (tokens, emails, ids ride there) never leave the page.
 */
export const sidekickRouteOf = (href) => {
  try {
    const url = new URL(href);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return undefined;
    }
    return plain(url.origin + url.pathname, SIDEKICK_CONTEXT_LIMITS.route);
  } catch (e) {
    return undefined;
  }
};

const stepNumberOf = (value) =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= SIDEKICK_CONTEXT_LIMITS.stepNumber
    ? value
    : undefined;

/** The onboarding step: a string is its title; an object keeps id, title, index (1-based), total. */
export const sidekickStepOf = (step) => {
  if (typeof step === 'string') {
    const title = plain(step, SIDEKICK_CONTEXT_LIMITS.title);
    return title ? { title } : undefined;
  }
  if (!step || typeof step !== 'object' || Array.isArray(step)) {
    return undefined;
  }
  const id = typeof step.id === 'string' && STEP_ID.test(step.id.trim()) ? step.id.trim() : undefined;
  const title = plain(step.title, SIDEKICK_CONTEXT_LIMITS.title);
  const index = stepNumberOf(step.index);
  const total = stepNumberOf(step.total);
  const out = {};
  if (id) out.id = id;
  if (title) out.title = title;
  if (index !== undefined) out.index = index;
  if (total !== undefined) out.total = total;
  return Object.keys(out).length ? out : undefined;
};

/** What the app knows (plan, seats, a record id…): JSON-safe entries until the limits. */
export const sidekickDataOf = (data) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return undefined;
  }
  const out = {};
  let count = 0;
  let size = 0;
  for (const key of Object.keys(data)) {
    if (count >= SIDEKICK_CONTEXT_LIMITS.dataEntries) {
      break;
    }
    let json;
    try {
      json = JSON.stringify(data[key]);
    } catch (e) {
      continue;
    }
    if (typeof json !== 'string') {
      continue;
    }
    if (size + key.length + json.length > SIDEKICK_CONTEXT_LIMITS.dataChars) {
      break;
    }
    size += key.length + json.length;
    count += 1;
    out[key] = JSON.parse(json);
  }
  return count ? out : undefined;
};

const STRUCTURED_KEYS = ['title', 'step', 'data'];

/**
 * The app's sidekick context: `{ title?, step?, data? }`. An object with none
 * of those keys is taken as `data` (like Gleap.startAgent's bare context).
 * null/undefined clears it.
 */
export const normalizeSidekickContext = (context) => {
  if (!context || typeof context !== 'object' || Array.isArray(context)) {
    return null;
  }
  const structured = STRUCTURED_KEYS.some((key) => Object.prototype.hasOwnProperty.call(context, key));
  const source = structured ? context : { data: context };
  const out = {};
  const title = plain(source.title, SIDEKICK_CONTEXT_LIMITS.title);
  const step = sidekickStepOf(source.step);
  const data = sidekickDataOf(source.data);
  if (title) out.title = title;
  if (step) out.step = step;
  if (data) out.data = data;
  return Object.keys(out).length ? out : null;
};

/** The envelope the panel sends with every message (`surface: 'sidekick'`, one shape with Kai Copilot). */
export const buildSidekickEnvelope = ({ href, documentTitle, context }) => {
  const envelope = { surface: 'sidekick' };
  const route = sidekickRouteOf(href);
  const title = (context && context.title) || plain(documentTitle, SIDEKICK_CONTEXT_LIMITS.title);
  if (route || title) {
    envelope.page = {};
    if (route) envelope.page.route = route;
    if (title) envelope.page.title = title;
  }
  if (context && context.step) envelope.step = context.step;
  if (context && context.data) envelope.app = context.data;
  return envelope;
};

/**
 * push (default): the page moves aside and stays usable, no dim · overlay: the panel over a dimmed
 * page · sheet (phones: full screen, never a push).
 * requested: 'push' (the app asked for it: pushes wherever there is room), 'overlay', or anything
 * else (the default: pushes unless pushRisk says the page should not be pushed).
 */
export const sidekickModeOf = ({ requested, viewportWidth, pushRisk }) => {
  if (!(viewportWidth > SIDEKICK_PHONE_MAX_WIDTH)) {
    return 'sheet';
  }
  if (requested === 'overlay') {
    return 'overlay';
  }
  if (viewportWidth - SIDEKICK_WIDTH < SIDEKICK_PUSH_MIN_PAGE_WIDTH) {
    return 'overlay';
  }
  if (requested !== 'push' && pushRisk) {
    return 'overlay';
  }
  return 'push';
};

/**
 * Why the default should not push this page, or null. Only a page inside a frame: its "viewport" is
 * a box of someone else's page, which does not get narrower. (An explicit mode 'push' still pushes.)
 */
export const pushRiskOf = ({ inIframe }) => (inIframe ? 'iframe' : null);

/**
 * How a fixed element that spans the viewport (a header, footer, cookie bar, a full-screen layer)
 * follows the push, or null to leave it: it keeps its left edge and gets narrower by the panel, on
 * the panel's side. `computedWidth` is getComputedStyle(element).width (border-box after the
 * adjustment sets box-sizing: border-box, so the rect width is used).
 *   rect: its box before the push · side: where the panel is ('right' | 'left').
 */
export const fixedBarAdjustmentOf = ({ rect, viewportWidth, side, panelWidth = SIDEKICK_WIDTH }) => {
  if (!rect || !(viewportWidth > 0) || !(rect.width > 0)) {
    return null;
  }
  const spans = (rect.left <= 2 && rect.right >= viewportWidth - 2) || rect.width >= viewportWidth * 0.9;
  if (!spans) {
    return null;
  }
  const width = Math.round(rect.width - panelWidth);
  if (width <= 0) {
    return null;
  }
  return side === 'left'
    ? { left: Math.round(rect.left + panelWidth), width }
    : { left: Math.round(rect.left), width };
};

/** A sender to show on a sidekick card: { name, profileImageUrl? } (https images only), or null. */
export const sidekickSenderOf = (sender) => {
  if (!sender || typeof sender !== 'object') {
    return null;
  }
  const name = plain(sender.name, SENDER_NAME_MAX);
  if (!name) {
    return null;
  }
  const image = typeof sender.profileImageUrl === 'string' ? sender.profileImageUrl.trim() : '';
  let profileImageUrl;
  try {
    if (image && new URL(image).protocol === 'https:') {
      profileImageUrl = image;
    }
  } catch (e) {}
  return profileImageUrl ? { name, profileImageUrl } : { name };
};

const AGENT_ID = /^[a-f0-9]{24}$/i;

/**
 * Gleap.showSidekickMessage's options as the card uses them, or null when there is no message:
 * { agentId (24-hex or null = Kai Support), message (plain, ≤500), sender (or null: the bot persona) }.
 */
export const sidekickCardOf = (options) => {
  if (!options || typeof options !== 'object') {
    return null;
  }
  const message = plain(options.message, MESSAGE_MAX);
  if (!message) {
    return null;
  }
  const agentId = typeof options.agentId === 'string' && AGENT_ID.test(options.agentId.trim()) ? options.agentId.trim() : null;
  return { agentId, message, sender: sidekickSenderOf(options.sender) };
};

/**
 * The key a dismissed card is remembered by (24 h, every tab of this browser): the trigger for a
 * server card, the agent and the text for one the app showed by code.
 */
export const sidekickCardKeyOf = ({ triggerKey, agentId, message }) => {
  if (typeof triggerKey === 'string' && triggerKey) {
    return triggerKey;
  }
  let hash = 0;
  const text = `${agentId || 'kai'}|${message || ''}`;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) | 0;
  }
  return `code:${agentId || 'kai'}:${(hash >>> 0).toString(36)}`;
};

/**
 * A socket `sidekick` message as the SDK uses it, or null. `display` is 'card' (a message card
 * above the launcher that opens the panel when clicked) or 'open' (the panel opens at once);
 * a message without it is an open (what the server sent before cards existed).
 */
export const proactiveSidekickOf = (data) => {
  if (!data || typeof data !== 'object') {
    return null;
  }
  const id = typeof data.id === 'string' && data.id ? data.id.slice(0, 64) : null;
  const message = plain(data.message, MESSAGE_MAX);
  const trigger = data.trigger && typeof data.trigger === 'object' ? data.trigger : null;
  const triggerKey =
    trigger && typeof trigger.type === 'string' && typeof trigger.id === 'string' ? `${trigger.type}:${trigger.id}`.slice(0, 160) : null;
  if (!id || !message || !triggerKey) {
    return null;
  }
  const agentId = typeof data.agentId === 'string' && AGENT_ID.test(data.agentId) ? data.agentId : null;
  const display = data.display === 'card' ? 'card' : 'open';
  return { id, agentId, message, triggerKey, display, sender: sidekickSenderOf(data.sender) };
};

/**
 * Whether a proactive open may show now, or why not: the page allows it, at
 * most one per page view, nothing else open, not dismissed in the last day.
 * (Typing and a hidden tab wait instead: see the manager.)
 */
export const proactiveRefusalOf = ({ enabled, shownThisPageView, busy, dismissedAt, now }) => {
  if (!enabled) return 'disabled';
  if (shownThisPageView) return 'page_view';
  if (busy) return 'busy';
  if (typeof dismissedAt === 'number' && now - dismissedAt < SIDEKICK_DISMISS_MS) return 'dismissed';
  return null;
};
