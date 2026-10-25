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

/** overlay (default) · push (only with room for the page) · sheet (phones). */
export const sidekickModeOf = ({ requested, viewportWidth }) => {
  if (!(viewportWidth > SIDEKICK_PHONE_MAX_WIDTH)) {
    return 'sheet';
  }
  if (requested === 'push' && viewportWidth - SIDEKICK_WIDTH >= SIDEKICK_PUSH_MIN_PAGE_WIDTH) {
    return 'push';
  }
  return 'overlay';
};

/** A socket `sidekick` message as the SDK uses it, or null. */
export const proactiveSidekickOf = (data) => {
  if (!data || typeof data !== 'object') {
    return null;
  }
  const id = typeof data.id === 'string' && data.id ? data.id.slice(0, 64) : null;
  const message = plain(data.message, 500);
  const trigger = data.trigger && typeof data.trigger === 'object' ? data.trigger : null;
  const triggerKey =
    trigger && typeof trigger.type === 'string' && typeof trigger.id === 'string' ? `${trigger.type}:${trigger.id}`.slice(0, 160) : null;
  if (!id || !message || !triggerKey) {
    return null;
  }
  const agentId = typeof data.agentId === 'string' && /^[a-f0-9]{24}$/i.test(data.agentId) ? data.agentId : null;
  return { id, agentId, message, triggerKey };
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
