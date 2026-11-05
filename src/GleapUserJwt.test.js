import { decodeUserJwt, identifyRefusalOf } from './GleapUserJwt';

const b64url = (value) => Buffer.from(value).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const jwtOf = (payload) => `${b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${b64url(JSON.stringify(payload))}.c2lnbmF0dXJl`;

describe('decodeUserJwt', () => {
  it('reads userId and exp', () => {
    expect(decodeUserJwt(jwtOf({ userId: 'user-1', email: 'a@b.c', exp: 1700000000 }))).toEqual({ userId: 'user-1', exp: 1700000000 });
  });

  it('accepts user_id and numbers, returning a string', () => {
    expect(decodeUserJwt(jwtOf({ user_id: 42 }))).toEqual({ userId: '42', exp: null });
    expect(decodeUserJwt(jwtOf({ userId: 7, user_id: 'ignored' })).userId).toBe('7');
  });

  it('decodes UTF-8 payloads', () => {
    expect(decodeUserJwt(jwtOf({ userId: 'jürgen-😀' })).userId).toBe('jürgen-😀');
  });

  it.each([
    ['not a string', 123],
    ['two segments', 'abc.def'],
    ['four segments', 'a.b.c.d'],
    ['an empty segment', `${b64url('{}')}..sig`],
    ['non-base64url characters', 'a+b.c/d.e'],
    ['a payload that is not JSON', `a.${b64url('nope')}.c`],
    ['no userId', jwtOf({ email: 'a@b.c' })],
    ['an empty userId', jwtOf({ userId: '' })],
    ['an object userId', jwtOf({ userId: { $ne: null } })],
  ])('refuses %s', (_, token) => {
    expect(decodeUserJwt(token)).toBeNull();
  });

  it('refuses tokens over 4096 characters', () => {
    const big = jwtOf({ userId: 'user-1', pad: 'x'.repeat(3100) });
    expect(big.length).toBeGreaterThan(4096);
    expect(decodeUserJwt(big)).toBeNull();
  });
});

describe('identifyRefusalOf', () => {
  it('finds the code in a 401 body only', () => {
    const body = JSON.stringify({ status: 401, detail: { value: 'token_expired' } });
    expect(identifyRefusalOf(401, body)).toBe('token_expired');
    expect(identifyRefusalOf(401, '{"details":{"value":"token_invalid"}}')).toBe('token_invalid');
    expect(identifyRefusalOf(401, '{"details":{"value":"signature_required"}}')).toBeNull();
    expect(identifyRefusalOf(403, body)).toBeNull();
  });
});
