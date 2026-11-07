import { cookieDomainFor, eraseGleapCookie, flattenCompany, formatRelativeTime, setGleapCookie } from './GleapHelper';

describe('formatRelativeTime — the notification meta line', () => {
  const agoBy = (ms) => new Date(Date.now() - ms).toISOString();

  test('a just-sent notification reads as "now", not "in 0 seconds"', () => {
    expect(formatRelativeTime(agoBy(0), 'en')).toBe('now');
  });

  test('minutes and hours pick their own unit instead of rounding to zero', () => {
    expect(formatRelativeTime(agoBy(5 * 60 * 1000), 'en')).toBe('5 minutes ago');
    expect(formatRelativeTime(agoBy(3 * 60 * 60 * 1000), 'en')).toBe('3 hours ago');
    expect(formatRelativeTime(agoBy(3 * 24 * 60 * 60 * 1000), 'en')).toBe('3 days ago');
  });

  // Second-level precision reads as noise on a bubble the user is looking at.
  test('anything under a minute collapses to "now"', () => {
    expect(formatRelativeTime(agoBy(42 * 1000), 'en')).toBe('now');
    expect(formatRelativeTime(agoBy(59 * 1000), 'en')).toBe('now');
    expect(formatRelativeTime(agoBy(61 * 1000), 'en')).toBe('1 minute ago');
  });

  test('it localizes off the passed locale', () => {
    expect(formatRelativeTime(agoBy(5 * 60 * 1000), 'de')).toBe('vor 5 Minuten');
  });

  // A scheduled outbound can carry a sendAt a moment ahead of the client clock;
  // "in 1 minute" on a notification the user is looking at would be nonsense.
  test('a future timestamp is clamped to "now"', () => {
    expect(formatRelativeTime(new Date(Date.now() + 90 * 1000).toISOString(), 'en')).toBe('now');
  });

  test('an unusable locale falls back to the browser default instead of dropping the label', () => {
    expect(formatRelativeTime(agoBy(5 * 60 * 1000), 'not-a-locale')).not.toBe('');
  });

  // Callers drop the separator on '', so these must never return a placeholder.
  test.each([
    ['undefined', undefined],
    ['null', null],
    ['empty string', ''],
    ['an unparsable date', 'not a date'],
  ])('%s yields an empty label', (_name, value) => {
    expect(formatRelativeTime(value, 'en')).toBe('');
  });
});

describe('flattenCompany — no-op cases (must stay byte-identical)', () => {
  test('userData without a company key is returned by reference', () => {
    const userData = { name: 'Tobias', email: 'tobias@gleap.io' };
    expect(flattenCompany(userData)).toBe(userData);
  });

  test('empty object is returned by reference', () => {
    const userData = {};
    expect(flattenCompany(userData)).toBe(userData);
  });

  test('existing flat companyId / companyName keep working unchanged', () => {
    const userData = { name: 'Tobias', companyId: 'acme-1', companyName: 'Acme' };
    const out = flattenCompany(userData);
    expect(out).toBe(userData);
    expect(out).toEqual({ name: 'Tobias', companyId: 'acme-1', companyName: 'Acme' });
  });
});

describe('flattenCompany — the raw company key never leaks through', () => {
  // Regression: `company: null` used to fall through the guard, reach the server
  // as an unset, and make the client dedup re-fire identify on every call.
  test('company: null is stripped and adds nothing', () => {
    const out = flattenCompany({ name: 'Tobias', company: null });
    expect(out).toEqual({ name: 'Tobias' });
    expect('company' in out).toBe(false);
  });

  test('company: undefined is stripped', () => {
    const out = flattenCompany({ name: 'Tobias', company: undefined });
    expect(out).toEqual({ name: 'Tobias' });
    expect('company' in out).toBe(false);
  });

  test('company as a string does not leak into customData', () => {
    const out = flattenCompany({ name: 'Tobias', company: 'Acme' });
    expect(out).toEqual({ name: 'Tobias' });
    expect('company' in out).toBe(false);
  });

  test('company as a number does not leak into customData', () => {
    const out = flattenCompany({ name: 'Tobias', company: 12345 });
    expect(out).toEqual({ name: 'Tobias' });
    expect('company' in out).toBe(false);
  });

  test('company as an empty object is stripped without adding fields', () => {
    const out = flattenCompany({ name: 'Tobias', company: {} });
    expect(out).toEqual({ name: 'Tobias' });
  });

  test('company as an array is stripped without adding fields', () => {
    const out = flattenCompany({ name: 'Tobias', company: ['Acme'] });
    expect(out).toEqual({ name: 'Tobias' });
  });
});

describe('flattenCompany — mapping to flat fields', () => {
  test('{ id } only maps to companyId', () => {
    expect(flattenCompany({ company: { id: 'acme-1' } })).toEqual({ companyId: 'acme-1' });
  });

  test('{ id, name } maps to both', () => {
    expect(flattenCompany({ company: { id: 'acme-1', name: 'Acme' } })).toEqual({
      companyId: 'acme-1',
      companyName: 'Acme',
    });
  });

  test('other userData fields are preserved alongside the mapping', () => {
    expect(
      flattenCompany({
        name: 'Tobias',
        email: 'tobias@gleap.io',
        customData: { plan: 'pro' },
        company: { id: 'acme-1', name: 'Acme' },
      })
    ).toEqual({
      name: 'Tobias',
      email: 'tobias@gleap.io',
      customData: { plan: 'pro' },
      companyId: 'acme-1',
      companyName: 'Acme',
    });
  });

  test('unknown extra keys on company are ignored, not copied over', () => {
    expect(flattenCompany({ company: { id: 'acme-1', name: 'Acme', plan: 'enterprise', seats: 42 } })).toEqual({
      companyId: 'acme-1',
      companyName: 'Acme',
    });
  });

  test('company object wins over a flat companyId', () => {
    expect(flattenCompany({ companyId: 'old', company: { id: 'new' } })).toEqual({
      companyId: 'new',
    });
  });
});

describe('flattenCompany — numeric ids must not silently drop the link', () => {
  // Regression: a numeric id used to yield companyName with NO companyId, so the
  // contact displayed a company it was not linked to and vanished from the
  // Organisations list (which filters on `exists: companyId`).
  test('numeric id is coerced to a string', () => {
    expect(flattenCompany({ company: { id: 12345, name: 'Acme' } })).toEqual({
      companyId: '12345',
      companyName: 'Acme',
    });
  });

  test('numeric id of 0 is still a valid id', () => {
    expect(flattenCompany({ company: { id: 0, name: 'Acme' } })).toEqual({
      companyId: '0',
      companyName: 'Acme',
    });
  });

  test('bigint id is coerced to a string', () => {
    expect(flattenCompany({ company: { id: BigInt('90071992547409911'), name: 'Acme' } })).toEqual({
      companyId: '90071992547409911',
      companyName: 'Acme',
    });
  });

  test('numeric name is coerced to a string', () => {
    expect(flattenCompany({ company: { id: 'acme-1', name: 7 } })).toEqual({
      companyId: 'acme-1',
      companyName: '7',
    });
  });

  // The server matches companyId byte-for-byte, so an untrimmed id would create
  // a second company for every contact whose integration pads the value.
  test('surrounding whitespace is trimmed off id and name', () => {
    expect(flattenCompany({ company: { id: '  acme-inc \n', name: '  Acme Inc. ' } })).toEqual({
      companyId: 'acme-inc',
      companyName: 'Acme Inc.',
    });
  });
});

describe('flattenCompany — unusable ids drop the name too', () => {
  // A name without a link is worse than nothing: the dashboard would show a
  // company the contact is not actually associated with.
  const unusable = [
    ['object id', { id: { toString: () => 'nope' }, name: 'Acme' }],
    ['array id', { id: ['a', 'b'], name: 'Acme' }],
    ['null id', { id: null, name: 'Acme' }],
    ['undefined id', { id: undefined, name: 'Acme' }],
    ['missing id', { name: 'Acme' }],
    ['empty string id', { id: '', name: 'Acme' }],
    ['whitespace-only id', { id: '   ', name: 'Acme' }],
    ['boolean id', { id: true, name: 'Acme' }],
    ['NaN id', { id: NaN, name: 'Acme' }],
    ['Infinity id', { id: Infinity, name: 'Acme' }],
  ];

  test.each(unusable)('%s persists neither companyId nor companyName', (_label, company) => {
    const out = flattenCompany({ name: 'Tobias', company });
    expect(out).toEqual({ name: 'Tobias' });
    expect(out.companyId).toBeUndefined();
    expect(out.companyName).toBeUndefined();
  });

  test('an unusable id never stringifies to "[object Object]"', () => {
    expect(flattenCompany({ company: { id: {} } }).companyId).toBeUndefined();
  });

  test('an unusable id leaves an existing flat companyName untouched', () => {
    expect(flattenCompany({ companyName: 'Acme', company: { id: null } })).toEqual({
      companyName: 'Acme',
    });
  });
});

describe('flattenCompany — must never mutate the caller and never throw', () => {
  test('the input object is not mutated', () => {
    const company = { id: 12345, name: 'Acme' };
    const userData = { name: 'Tobias', company };
    const snapshot = JSON.stringify(userData);

    const out = flattenCompany(userData);

    expect(out).not.toBe(userData);
    expect(JSON.stringify(userData)).toBe(snapshot);
    expect(userData.company).toBe(company);
    expect(userData.companyId).toBeUndefined();
  });

  test('the nested company object itself is not mutated', () => {
    const company = { id: 'acme-1', name: 'Acme' };
    flattenCompany({ company });
    expect(company).toEqual({ id: 'acme-1', name: 'Acme' });
  });

  const hostile = [
    ['undefined', undefined],
    ['null', null],
    ['empty string', ''],
    ['string', 'not-an-object'],
    ['number', 42],
    ['boolean', false],
    ['array', []],
    ['function', () => {}],
  ];

  test.each(hostile)('%s input does not throw', (_label, input) => {
    expect(() => flattenCompany(input)).not.toThrow();
    expect(flattenCompany(input)).toBe(input);
  });

  test('a throwing getter on company does not break the widget', () => {
    const userData = { name: 'Tobias' };
    Object.defineProperty(userData, 'company', {
      enumerable: true,
      get() {
        throw new Error('boom');
      },
    });

    expect(() => flattenCompany(userData)).not.toThrow();
  });

  test('a throwing getter on company.id does not break the widget', () => {
    const company = {};
    Object.defineProperty(company, 'id', {
      enumerable: true,
      get() {
        throw new Error('boom');
      },
    });

    expect(() => flattenCompany({ name: 'Tobias', company })).not.toThrow();
  });

  test('a company object with a null prototype is handled', () => {
    const company = Object.create(null);
    company.id = 'acme-1';
    company.name = 'Acme';
    expect(flattenCompany({ company })).toEqual({ companyId: 'acme-1', companyName: 'Acme' });
  });
});

describe('setGleapCookie', () => {
  const written = (protocol, credential) => {
    const previous = { window: global.window, document: global.document };
    global.window = { location: { host: 'app.example.com', protocol } };
    global.document = { cookie: '' };
    setGleapCookie('name', 'value', 1, credential);
    const cookie = global.document.cookie;
    global.window = previous.window;
    global.document = previous.document;
    return cookie;
  };

  test('a credential cookie gets SameSite=Lax, and Secure on https', () => {
    expect(written('https:', true)).toMatch(/; SameSite=Lax; Secure$/);
    expect(written('http:', true)).toMatch(/; SameSite=Lax$/);
  });

  test('other cookies keep their attributes', () => {
    const cookie = written('https:', false);
    expect(cookie).not.toContain('SameSite');
    expect(cookie).not.toContain('Secure');
  });
});

describe('cookie domain', () => {
  const onHost = (host, write) => {
    const previous = { window: global.window, document: global.document };
    global.window = { location: { host, protocol: 'https:' } };
    global.document = { cookie: '' };
    write();
    const cookie = global.document.cookie;
    global.window = previous.window;
    global.document = previous.document;
    return cookie;
  };

  test.each([
    ['app.example.com', 'example.com'],
    ['app.example.com:8443', 'example.com'],
    ['www.shop.example.co.uk', 'example.co.uk'],
    ['localhost', 'localhost'],
    ['localhost:3000', 'localhost'],
    ['127.0.0.1', null],
    ['127.0.0.1:8080', null],
    ['192.168.1.20', null],
    ['[::1]', null],
    ['[::1]:8080', null],
    ['[2001:db8::7]:443', null],
    ['::1', null],
    ['', null],
  ])('cookieDomainFor(%p) is %p', (host, domain) => {
    expect(cookieDomainFor(host)).toBe(domain);
  });

  test.each(['127.0.0.1:8080', '[::1]:8080'])('on %s the cookie is host-only and erasing it works the same way', (host) => {
    const written = onHost(host, () => setGleapCookie('gleap-grant-key', 'grant', 1, true));
    expect(written).toMatch(/^gleap-grant-key=grant; expires=[^;]+; path=\/; SameSite=Lax; Secure$/);
    expect(written.toLowerCase()).not.toContain('domain');

    const erased = onHost(host, () => eraseGleapCookie('gleap-grant-key'));
    expect(erased).toBe('gleap-grant-key=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT');
  });

  test('a domain host and localhost keep their Domain attribute', () => {
    expect(onHost('app.example.com', () => setGleapCookie('session-key', 'v', 365))).toContain(
      '; path=/; domain=example.com'
    );
    expect(onHost('app.example.com', () => eraseGleapCookie('session-key'))).toMatch(/; Domain=example\.com$/);
    expect(onHost('localhost:3000', () => setGleapCookie('session-key', 'v', 365))).toContain('; path=/; domain=localhost');
    expect(onHost('localhost:3000', () => eraseGleapCookie('session-key'))).toMatch(/; Domain=localhost$/);
  });
});
