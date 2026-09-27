import { REDACTED_VALUE, sanitizeNetworkLogs } from './GleapNetworkLogSanitizer';
import GleapNetworkIntercepter from './GleapNetworkIntercepter';

const entry = (overrides) => ({
  date: '2026-09-27T10:00:00.000Z',
  type: 'POST',
  url: 'https://app.example.com/api/login',
  duration: 12,
  success: true,
  request: { headers: {}, payload: '' },
  response: { status: 200, statusText: 'OK', headers: {}, responseText: '' },
  ...overrides,
});

const sanitizeOne = (log, propsToIgnore, blacklist) => {
  const result = sanitizeNetworkLogs([log], { propsToIgnore, blacklist });
  return result[0];
};

describe('sanitizeNetworkLogs blacklist', () => {
  test("drops the SDK's own traffic and every url containing a blacklist entry", () => {
    const logs = [
      entry({ url: 'https://api.gleap.io/bugs/v2' }),
      entry({ url: 'https://api.us.gleap.ai/sessions' }),
      entry({ url: 'https://tracking.example.com/collect' }),
      entry({ url: 'https://app.example.com/api/data' }),
    ];

    const urls = sanitizeNetworkLogs(logs, { blacklist: ['tracking.example.com', ''] }).map((log) => log.url);

    expect(urls).toEqual(['https://app.example.com/api/data']);
  });

  test('matches the blacklist against the url before its query params are redacted', () => {
    const logs = [entry({ url: 'https://app.example.com/api?token=abc' })];

    expect(sanitizeNetworkLogs(logs, { propsToIgnore: ['token'], blacklist: ['token=abc'] })).toEqual([]);
  });
});

describe('sanitizeNetworkLogs headers', () => {
  test('removes headers named like a prop from request and response, whatever the casing', () => {
    const log = entry({
      request: { headers: { 'X-Api-Key': 'secret', Accept: 'application/json' }, payload: '' },
      response: { status: 200, statusText: 'OK', headers: { 'x-session-id': 'abc', 'content-type': 'text/plain' } },
    });

    const result = sanitizeOne(log, ['x-api-key', 'X-SESSION-ID']);

    expect(result.request.headers).toEqual({ Accept: 'application/json' });
    expect(result.response.headers).toEqual({ 'content-type': 'text/plain' });
  });

  test('always masks credential headers, and a prop removes them entirely', () => {
    const log = entry({
      request: {
        headers: { Authorization: 'Bearer abc', 'Proxy-Authorization': 'Basic xyz', COOKIE: 'sid=1', Accept: '*/*' },
        payload: '',
      },
      response: { status: 200, statusText: 'OK', headers: { 'Set-Cookie': 'sid=2' } },
    });

    expect(sanitizeOne(log, []).request.headers).toEqual({
      Authorization: REDACTED_VALUE,
      'Proxy-Authorization': REDACTED_VALUE,
      COOKIE: REDACTED_VALUE,
      Accept: '*/*',
    });
    expect(sanitizeOne(log, []).response.headers).toEqual({ 'Set-Cookie': REDACTED_VALUE });
    expect(sanitizeOne(log, ['authorization']).request.headers).toEqual({
      'Proxy-Authorization': REDACTED_VALUE,
      COOKIE: REDACTED_VALUE,
      Accept: '*/*',
    });
  });

  test('redacts the JSON string and [name, value] header shapes of attached logs', () => {
    const log = entry({
      request: { headers: JSON.stringify({ authorization: 'Bearer abc', 'x-token': '1' }), payload: '' },
      response: {
        status: 200,
        statusText: 'OK',
        headers: [
          ['Set-Cookie', 'sid=2'],
          ['X-Token', '2'],
        ],
      },
    });

    const result = sanitizeOne(log, ['x-token']);

    expect(JSON.parse(result.request.headers)).toEqual({ authorization: REDACTED_VALUE });
    expect(result.response.headers).toEqual({ 'Set-Cookie': REDACTED_VALUE });
  });
});

describe('sanitizeNetworkLogs bodies', () => {
  test('removes JSON keys at any depth, in objects inside arrays too, case-insensitively', () => {
    const log = entry({
      request: {
        headers: { 'Content-Type': 'application/json' },
        payload: JSON.stringify({ Password: 'a', profile: { password: 'b', name: 'Ann' } }),
      },
      response: {
        status: 200,
        statusText: 'OK',
        headers: {},
        responseText: JSON.stringify([{ users: [{ PASSWORD: 'c', id: 1 }] }]),
      },
    });

    const result = sanitizeOne(log, ['password']);

    expect(JSON.parse(result.request.payload)).toEqual({ profile: { name: 'Ann' } });
    expect(JSON.parse(result.response.responseText)).toEqual([{ users: [{ id: 1 }] }]);
  });

  test('treats a dotted prop as a path from the root and as a whole key', () => {
    const payload = JSON.stringify({
      User: { Password: 'a', name: 'Ann' },
      items: [{ user: { password: 'b' } }],
      password: 'c',
      'user.password': 'd',
    });
    const log = entry({ request: { headers: {}, payload } });

    const result = sanitizeOne(log, ['user.password']);

    expect(JSON.parse(result.request.payload)).toEqual({
      User: { name: 'Ann' },
      items: [{ user: { password: 'b' } }],
      password: 'c',
    });
  });

  test('returns unchanged and unparseable bodies untouched instead of re-encoding them', () => {
    const formatted = '{ "id": 1,\n  "name": "Ann" }';
    const truncated = '{"password":"a","name":"Ann"' + '\n… [truncated, more than 150000 bytes]';
    const log = entry({
      request: { headers: {}, payload: formatted },
      response: { status: 200, statusText: 'OK', headers: {}, responseText: truncated },
    });

    const result = sanitizeOne(log, ['password']);

    expect(result.request.payload).toBe(formatted);
    expect(result.response.responseText).toBe(truncated);
    expect(sanitizeOne(entry({ request: { headers: {}, payload: 'plain text' } }), ['x']).request.payload).toBe(
      'plain text'
    );
  });

  test('removes params from form-urlencoded bodies, with or without a content type', () => {
    const withHeader = entry({
      request: {
        headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        payload: 'user=ann%40example.com&PassWord=secret&remember=on+please',
      },
    });
    const withoutHeader = entry({ request: { headers: {}, payload: 'password=secret&next=%2Fhome' } });

    expect(sanitizeOne(withHeader, ['password']).request.payload).toBe('user=ann%40example.com&remember=on+please');
    expect(sanitizeOne(withoutHeader, ['password']).request.payload).toBe('next=%2Fhome');
  });

  test('drops a body nested too deeply to redact instead of sending it as is', () => {
    const deep = '['.repeat(600) + '{"password":"a"}' + ']'.repeat(600);
    const log = entry({ request: { headers: {}, payload: deep } });

    expect(sanitizeOne(log, ['password']).request.payload).toBe('[body not captured]');
  });
});

describe('sanitizeNetworkLogs urls and entries', () => {
  test('removes query params named like a prop and keeps the rest of the url', () => {
    const log = entry({ url: 'https://app.example.com/cb?Token=abc&state=x%20y#section' });

    expect(sanitizeOne(log, ['token']).url).toBe('https://app.example.com/cb?state=x%20y#section');
    expect(sanitizeOne(entry({ url: 'https://app.example.com/cb?token=abc' }), ['token']).url).toBe(
      'https://app.example.com/cb'
    );
    expect(sanitizeOne(log, ['other']).url).toBe(log.url);
  });

  test('keeps failed entries and never mutates its input', () => {
    const failed = entry({ success: false, response: { errorText: 'TypeError: Failed to fetch' } });
    const log = entry({
      request: { headers: { Authorization: 'Bearer abc' }, payload: '{"password":"a"}' },
    });
    const snapshot = JSON.stringify([failed, log]);

    const result = sanitizeNetworkLogs([failed, log], { propsToIgnore: ['password'] });

    expect(result[0]).toEqual(failed);
    expect(result[1].request.payload).toBe('{}');
    expect(JSON.stringify([failed, log])).toBe(snapshot);
  });
});

describe('GleapNetworkIntercepter redaction settings', () => {
  test('unions the project and SDK lists without growing on repeated applies', () => {
    const intercepter = new GleapNetworkIntercepter();

    intercepter.setRemoteFilters(['password', 'token']);
    intercepter.setRemoteFilters(['password', 'token']);
    intercepter.setFilters(['token', 'secret']);
    intercepter.setFilters(['secret']);
    intercepter.setRemoteBlacklist(['tracking.example.com']);
    intercepter.setRemoteBlacklist(['tracking.example.com']);
    intercepter.setBlacklist(['ads.example.com']);

    expect(intercepter.getFilters()).toEqual(['password', 'token', 'secret']);
    expect(intercepter.getBlacklist()).toEqual(['gleap.io', 'gleap.ai', 'tracking.example.com', 'ads.example.com']);

    intercepter.setRemoteFilters(undefined);
    expect(intercepter.getFilters()).toEqual(['secret']);
  });

  test('redacts captured and attached entries with the settings at the time the logs are read', () => {
    const intercepter = new GleapNetworkIntercepter();
    intercepter.requests = {
      1: entry({ request: { headers: { Token: 'a', Accept: '*/*' }, payload: '{"token":"a","id":1}' } }),
    };
    intercepter.setExternalRequests([
      entry({ url: 'https://app.example.com/native?token=b', request: { headers: {}, payload: '{"token":"b"}' } }),
      entry({ url: 'https://tracking.example.com/collect' }),
    ]);

    intercepter.setRemoteFilters(['token']);
    intercepter.setBlacklist(['tracking.example.com']);
    const logs = intercepter.getRequests();

    expect(logs.map((log) => log.url)).toEqual(['https://app.example.com/api/login', 'https://app.example.com/native']);
    expect(logs[0].request).toEqual({ headers: { Accept: '*/*' }, payload: '{"id":1}' });
    expect(logs[1].request.payload).toBe('{}');
    expect(intercepter.requests[1].request.payload).toBe('{"token":"a","id":1}');
  });
});
