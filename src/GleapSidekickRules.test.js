import {
  SIDEKICK_CONTEXT_LIMITS,
  SIDEKICK_DISMISS_MS,
  buildSidekickEnvelope,
  normalizeSidekickContext,
  proactiveRefusalOf,
  proactiveSidekickOf,
  sidekickModeOf,
  sidekickRouteOf,
} from './GleapSidekickRules';

describe('the page address the sidekick sends', () => {
  test('query and fragment never leave the page (tokens, emails and ids ride there)', () => {
    expect(sidekickRouteOf('https://app.example.com/settings/billing?session=s3cr3t&email=a@b.c#access_token=x')).toBe(
      'https://app.example.com/settings/billing'
    );
    expect(sidekickRouteOf('http://localhost:4450/onboarding/step-2#/invite?token=1')).toBe('http://localhost:4450/onboarding/step-2');
  });

  test('only web pages, and bounded', () => {
    expect(sidekickRouteOf('file:///Users/me/secret.html')).toBeUndefined();
    expect(sidekickRouteOf('javascript:alert(1)')).toBeUndefined();
    expect(sidekickRouteOf('not a url')).toBeUndefined();
    expect(sidekickRouteOf('https://a.example.com/' + 'p'.repeat(1000)).length).toBeLessThanOrEqual(SIDEKICK_CONTEXT_LIMITS.route);
  });
});

describe('the app context', () => {
  test('{ title, step, data }; a plain object is its data (as startAgent)', () => {
    expect(normalizeSidekickContext({ plan: 'Pro', seats: 12 })).toEqual({ data: { plan: 'Pro', seats: 12 } });
    expect(
      normalizeSidekickContext({ title: '  Billing ', step: { id: 'invite', title: 'Invite your team', index: 3, total: 5 }, data: { plan: 'Pro' } })
    ).toEqual({ title: 'Billing', step: { id: 'invite', title: 'Invite your team', index: 3, total: 5 }, data: { plan: 'Pro' } });
    expect(normalizeSidekickContext({ step: 'Connect your inbox' })).toEqual({ step: { title: 'Connect your inbox' } });
    expect(normalizeSidekickContext(null)).toBeNull();
    expect(normalizeSidekickContext(['a'])).toBeNull();
  });

  test('bad step ids and numbers are dropped; data stays JSON and bounded', () => {
    expect(normalizeSidekickContext({ step: { id: '../x', index: 1.5, total: 5000 } })).toBeNull();
    const many = Object.fromEntries(Array.from({ length: 50 }, (_, index) => [`k${index}`, index]));
    expect(Object.keys(normalizeSidekickContext({ data: many }).data).length).toBe(SIDEKICK_CONTEXT_LIMITS.dataEntries);
    const big = normalizeSidekickContext({ data: { a: 'x'.repeat(20000), b: 'y'.repeat(20000), fn: () => 1 } });
    expect(Object.keys(big.data)).toEqual(['a']);
  });

  test('the envelope: one shape with Kai Copilot (surface sidekick, page, step, app)', () => {
    expect(
      buildSidekickEnvelope({
        href: 'https://app.example.com/onboarding?token=t#x',
        documentTitle: 'Onboarding · Example',
        context: normalizeSidekickContext({ step: { id: 'invite', index: 3, total: 5 }, data: { plan: 'trial' } }),
      })
    ).toEqual({
      surface: 'sidekick',
      page: { route: 'https://app.example.com/onboarding', title: 'Onboarding · Example' },
      step: { id: 'invite', index: 3, total: 5 },
      app: { plan: 'trial' },
    });
    // The app's own title wins over the document's.
    expect(buildSidekickEnvelope({ href: 'https://a.example.com/', documentTitle: 'Doc', context: { title: 'Mine' } }).page.title).toBe('Mine');
  });
});

describe('layout', () => {
  test('overlay by default, push only with room for the page, a sheet on phones', () => {
    expect(sidekickModeOf({ requested: undefined, viewportWidth: 1440 })).toBe('overlay');
    expect(sidekickModeOf({ requested: 'push', viewportWidth: 1440 })).toBe('push');
    expect(sidekickModeOf({ requested: 'push', viewportWidth: 1000 })).toBe('overlay');
    expect(sidekickModeOf({ requested: 'push', viewportWidth: 390 })).toBe('sheet');
    expect(sidekickModeOf({ requested: undefined, viewportWidth: 600 })).toBe('sheet');
  });
});

describe('proactive opens', () => {
  const now = Date.UTC(2026, 9, 25, 9, 0, 0);
  const ok = { enabled: true, shownThisPageView: false, busy: false, dismissedAt: null, now };

  test('a well-formed socket message only', () => {
    expect(
      proactiveSidekickOf({ id: 'a1', agentId: '6adca6ce3d7fdf51b1584f08', message: ' Want me to do it? ', trigger: { type: 'agent_event', id: 'x:y' } })
    ).toEqual({ id: 'a1', agentId: '6adca6ce3d7fdf51b1584f08', message: 'Want me to do it?', triggerKey: 'agent_event:x:y' });
    expect(proactiveSidekickOf({ id: 'a1', agentId: null, message: 'Hi', trigger: { type: 'skill', id: 's1' } }).agentId).toBeNull();
    expect(proactiveSidekickOf({ id: 'a1', agentId: '../../x', message: 'Hi', trigger: { type: 'skill', id: 's1' } }).agentId).toBeNull();
    expect(proactiveSidekickOf({ id: 'a1', message: '', trigger: { type: 'skill', id: 's1' } })).toBeNull();
    expect(proactiveSidekickOf({ id: 'a1', message: 'Hi' })).toBeNull();
  });

  test('once per page view, never over something else, never when the page said no', () => {
    expect(proactiveRefusalOf(ok)).toBeNull();
    expect(proactiveRefusalOf({ ...ok, enabled: false })).toBe('disabled');
    expect(proactiveRefusalOf({ ...ok, shownThisPageView: true })).toBe('page_view');
    expect(proactiveRefusalOf({ ...ok, busy: true })).toBe('busy');
  });

  test('closed without writing: quiet for a day', () => {
    expect(proactiveRefusalOf({ ...ok, dismissedAt: now - 60 * 1000 })).toBe('dismissed');
    expect(proactiveRefusalOf({ ...ok, dismissedAt: now - SIDEKICK_DISMISS_MS - 1 })).toBeNull();
  });
});
