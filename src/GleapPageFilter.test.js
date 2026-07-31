import { checkPageRules, checkPageFilter } from './GleapPageFilter';

const url = (path) => `https://app.example.com${path}`;

describe('checkPageFilter (single condition primitives)', () => {
  test('missing params pass (lenient)', () => {
    expect(checkPageFilter('', '/x', 'contains')).toBe(true);
    expect(checkPageFilter(url('/x'), '', 'contains')).toBe(true);
    expect(checkPageFilter(url('/x'), '/x', '')).toBe(true);
  });

  test('contains / notcontains', () => {
    expect(checkPageFilter(url('/dashboard'), '/dashboard', 'contains')).toBe(true);
    expect(checkPageFilter(url('/dashboard'), '/onboarding', 'contains')).toBe(false);
    expect(checkPageFilter(url('/dashboard'), '/onboarding', 'notcontains')).toBe(true);
    expect(checkPageFilter(url('/onboarding'), '/onboarding', 'notcontains')).toBe(false);
  });

  test('is / isnot use exact (trailing-slash-insensitive) match', () => {
    expect(checkPageFilter(url('/a/'), url('/a'), 'is')).toBe(true);
    expect(checkPageFilter(url('/a'), url('/b'), 'isnot')).toBe(true);
    expect(checkPageFilter(url('/a'), url('/a'), 'isnot')).toBe(false);
  });

  test('unknown / unsupported types resolve to false', () => {
    expect(checkPageFilter(url('/a'), '/a', 'empty')).toBe(false);
    expect(checkPageFilter(url('/a'), '/a', 'notempty')).toBe(false);
  });
});

describe('checkPageRules — no-op / single-rule (must be unchanged by the fix)', () => {
  test('no rules => show', () => {
    expect(checkPageRules(url('/anything'), {})).toBe(true);
    expect(checkPageRules(url('/anything'), { pageRules: [] })).toBe(true);
  });

  test('legacy single pageFilter fallback', () => {
    expect(checkPageRules(url('/onboarding'), { pageFilter: '/onboarding', pageFilterType: 'notcontains' })).toBe(false);
    expect(checkPageRules(url('/dashboard'), { pageFilter: '/onboarding', pageFilterType: 'notcontains' })).toBe(true);
  });

  test('single positive rule', () => {
    expect(checkPageRules(url('/members/home'), { pageRules: [{ pageFilter: 'members', pageFilterType: 'contains' }] })).toBe(true);
    expect(checkPageRules(url('/public'), { pageRules: [{ pageFilter: 'members', pageFilterType: 'contains' }] })).toBe(false);
  });

  test('single negative rule', () => {
    expect(checkPageRules(url('/onboarding'), { pageRules: [{ pageFilter: '/onboarding', pageFilterType: 'notcontains' }] })).toBe(false);
    expect(checkPageRules(url('/dashboard'), { pageRules: [{ pageFilter: '/onboarding', pageFilterType: 'notcontains' }] })).toBe(true);
  });
});

describe('checkPageRules — all-positive multi-rule (OR preserved, no regression)', () => {
  const rules = [
    { pageFilter: '/dashboard', pageFilterType: 'contains' },
    { pageFilter: '/settings', pageFilterType: 'contains' },
  ];
  test('shows if ANY positive matches', () => {
    expect(checkPageRules(url('/dashboard'), { pageRules: rules })).toBe(true);
    expect(checkPageRules(url('/settings'), { pageRules: rules })).toBe(true);
  });
  test('hidden if NONE match', () => {
    expect(checkPageRules(url('/billing'), { pageRules: rules })).toBe(false);
  });
});

describe('checkPageRules — all-negative multi-rule (THE BUG: was tautology, now AND)', () => {
  // Ticket #137150 ROASForm config.
  const rules = [
    { pageFilter: '/signup', pageFilterType: 'notcontains' },
    { pageFilter: '/register', pageFilterType: 'notcontains' },
    { pageFilter: '/onboarding', pageFilterType: 'notcontains' },
    { pageFilter: '/login', pageFilterType: 'notcontains' },
  ];
  test('SUPPRESSED on every excluded page (previously always showed)', () => {
    expect(checkPageRules(url('/onboarding?step=1'), { pageRules: rules })).toBe(false);
    expect(checkPageRules(url('/signup'), { pageRules: rules })).toBe(false);
    expect(checkPageRules(url('/register'), { pageRules: rules })).toBe(false);
    expect(checkPageRules(url('/login'), { pageRules: rules })).toBe(false);
  });
  test('shown on non-excluded pages', () => {
    expect(checkPageRules(url('/dashboard'), { pageRules: rules })).toBe(true);
    expect(checkPageRules(url('/forms/123'), { pageRules: rules })).toBe(true);
  });
});

describe('checkPageRules — blank rules are dropped (server parity)', () => {
  // The dashboard's "+ Add page rule" inserts `{ pageFilter: '' }` immediately,
  // so a blank rule is a normal transient (and sometimes permanent) state.
  // The server ignores those rules entirely; the SDK must do the same, or
  // checkPageFilter's lenient "missing param" guard turns the blank rule into a
  // positive match and the action shows everywhere.
  test('a blank positive rule does not widen a real positive rule', () => {
    const rules = [
      { pageFilter: '/dashboard', pageFilterType: 'contains' },
      { pageFilter: '', pageFilterType: 'contains' },
    ];
    expect(checkPageRules(url('/dashboard'), { pageRules: rules })).toBe(true);
    expect(checkPageRules(url('/billing'), { pageRules: rules })).toBe(false);
  });

  test('a whitespace-only rule is kept and never matches (server keeps it too)', () => {
    // Server parity by construction: the server only checks length, so `'   '`
    // survives as a condition that never matches a URL and the action is never
    // sent; the SDK keeps the rule and it never matches either.
    const rules = [
      { pageFilter: '/dashboard', pageFilterType: 'contains' },
      { pageFilter: '   ', pageFilterType: 'contains' },
    ];
    expect(checkPageRules(url('/dashboard'), { pageRules: rules })).toBe(true);
    expect(checkPageRules(url('/billing'), { pageRules: rules })).toBe(false);
    // Alone, it suppresses everywhere — the client-side mirror of "never sent".
    expect(checkPageRules(url('/anything'), {
      pageRules: [{ pageFilter: '   ', pageFilterType: 'contains' }],
    })).toBe(false);
    // Negative direction agrees as well: no URL contains '   ', so the
    // exclusion passes on both sides.
    expect(checkPageRules(url('/anything'), {
      pageRules: [{ pageFilter: '   ', pageFilterType: 'notcontains' }],
    })).toBe(true);
  });

  test('a blank rule does not disarm exclusions', () => {
    const rules = [
      { pageFilter: '', pageFilterType: 'contains' },
      { pageFilter: '/onboarding', pageFilterType: 'notcontains' },
    ];
    expect(checkPageRules(url('/onboarding'), { pageRules: rules })).toBe(false);
    expect(checkPageRules(url('/dashboard'), { pageRules: rules })).toBe(true);
  });

  test('a blank negative rule does not suppress everything', () => {
    const rules = [
      { pageFilter: '/onboarding', pageFilterType: 'notcontains' },
      { pageFilter: '', pageFilterType: 'notcontains' },
    ];
    expect(checkPageRules(url('/dashboard'), { pageRules: rules })).toBe(true);
    expect(checkPageRules(url('/onboarding'), { pageRules: rules })).toBe(false);
  });

  test('an all-empty rule set falls through to "no rules => show"', () => {
    expect(checkPageRules(url('/anything'), {
      pageRules: [
        { pageFilter: '', pageFilterType: 'contains' },
        { pageFilter: '', pageFilterType: 'notcontains' },
      ],
    })).toBe(true);
  });

  test('legacy single pageFilter: empty means no rule, whitespace-only never matches', () => {
    expect(checkPageRules(url('/anything'), { pageFilter: '', pageFilterType: 'contains' })).toBe(true);
    expect(checkPageRules(url('/anything'), { pageFilter: '   ', pageFilterType: 'contains' })).toBe(false);
  });
});

describe('checkPageRules — mixed multi-rule (positive scope minus exclusions)', () => {
  // Mirrors real live configs: CSAT "members" survey, Tess onboarding modal, Zeevou banner.
  test('CSAT: contains members AND excludes auth/dev pages', () => {
    const rules = [
      { pageFilter: '/login', pageFilterType: 'notcontains' },
      { pageFilter: '/signup', pageFilterType: 'notcontains' },
      { pageFilter: '/profile/retention', pageFilterType: 'notcontains' },
      { pageFilter: 'ewnova.dev', pageFilterType: 'notcontains' },
      { pageFilter: 'members', pageFilterType: 'contains' },
    ];
    expect(checkPageRules('https://app.ewnova.com/members/home', { pageRules: rules })).toBe(true);
    expect(checkPageRules('https://app.ewnova.com/members/login', { pageRules: rules })).toBe(false); // excluded
    expect(checkPageRules('https://app.ewnova.com/public', { pageRules: rules })).toBe(false); // not a member page
    expect(checkPageRules('https://ewnova.dev/members/home', { pageRules: rules })).toBe(false); // dev host excluded
  });

  test('Tess: contains chat AND not payment', () => {
    const rules = [
      { pageFilter: 'payment', pageFilterType: 'notcontains' },
      { pageFilter: 'chat', pageFilterType: 'contains' },
    ];
    expect(checkPageRules(url('/chat/room'), { pageRules: rules })).toBe(true);
    expect(checkPageRules(url('/chat/payment'), { pageRules: rules })).toBe(false);
    expect(checkPageRules(url('/home'), { pageRules: rules })).toBe(false);
  });

  test('HaltH (#141052): notcontains Extend is case-insensitive via the regex fallback', () => {
    // The live config excludes "Extend" while the real URLs carry
    // ?mode=extend — the substring check misses, the /i regex must catch it.
    const notification = {
      actionType: 'notification',
      pageRules: [{ pageFilter: 'Extend', pageFilterType: 'notcontains' }],
    };
    expect(checkPageRules('https://business.halth.com/insurance?mode=extend', notification)).toBe(false);
    expect(checkPageRules('https://business.halth.com/dashboard', notification)).toBe(true);
  });

  test('Zeevou: contains app host AND isnot signup wizard (exact)', () => {
    // Positive and exclusion rules share the same host+protocol so the positive
    // rule matches the excluded URL too — this ensures the suppression on the
    // wizard page is driven by the `isnot` deny-list, not by the positive
    // rule failing.
    const rules = [
      { pageFilter: 'https://app.zeevou.com/', pageFilterType: 'contains' },
      { pageFilter: 'https://app.zeevou.com/wizard/signup', pageFilterType: 'isnot' },
    ];
    // In scope, not the wizard: positive passes, exclusion passes -> show.
    expect(checkPageRules('https://app.zeevou.com/rates', { pageRules: rules })).toBe(true);
    // The wizard page: positive rule ALSO matches (contains host), so only the
    // isnot exclusion can suppress it. Proves the deny-list drives suppression.
    expect(checkPageRules('https://app.zeevou.com/wizard/signup', { pageRules: rules })).toBe(false);
    // Out of scope entirely: positive fails -> hidden.
    expect(checkPageRules('https://other.com/rates', { pageRules: rules })).toBe(false);
  });
});
