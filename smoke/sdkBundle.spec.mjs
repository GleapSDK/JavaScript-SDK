// The browser bundle as a customer's page loads it from the CDN: a plain <script> tag, no bundler.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const HOST = 'https://customer.example';
const NONCE = 'smoke-nonce';
const BROWSER_BUNDLE = `${ROOT}build/browser/index.js`;
const ESM_BUNDLE = `${ROOT}build/esm/index.mjs`;

// Declared in index.d.ts, but no Gleap method of that name exists. Remove a name once it does.
const DECLARED_BUT_MISSING = ['setLiveSite'];

const declaredFunctions = () => {
  const types = readFileSync(`${ROOT}index.d.ts`, 'utf8');
  const namespace = types.slice(types.indexOf('export namespace Gleap {'));
  return [...new Set([...namespace.matchAll(/^ {2}function (\w+)\s*[(<]/gm)].map(([, name]) => name))];
};

const hostPage = ({ csp, scriptTag }) => ({
  status: 200,
  contentType: 'text/html',
  headers: csp ? { 'Content-Security-Policy': csp } : {},
  body: `<!doctype html><html><head><meta charset="utf-8"><title>Host</title></head><body><h1>Host page</h1>
<script nonce="${NONCE}">window.__keysBefore = [...Object.keys(window), '__keysBefore', '__violations']; window.__violations = [];
document.addEventListener('securitypolicyviolation', (e) => window.__violations.push(e.violatedDirective + ' ' + e.blockedURI));</script>
${scriptTag}</body></html>`,
});

// The host page and the bundle are served here; everything else (the Gleap API, the messenger) is aborted.
const servePage = async (page, { csp, scriptTag = `<script nonce="${NONCE}" src="${HOST}/sdk.js"></script>` } = {}) => {
  const problems = [];
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) problems.push(`console.error: ${message.text()}`);
  });
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== HOST) return route.abort();
    if (url.pathname === '/sdk.js') return route.fulfill({ path: BROWSER_BUNDLE, contentType: 'text/javascript' });
    if (url.pathname === '/sdk.mjs') return route.fulfill({ path: ESM_BUNDLE, contentType: 'text/javascript' });
    return route.fulfill(hostPage({ csp, scriptTag }));
  });
  await page.goto(`${HOST}/`);
  return problems;
};

test('the CDN bundle defines window.Gleap and nothing else, without an error', async ({ page }) => {
  const problems = await servePage(page);

  const added = await page.evaluate(() => Object.keys(window).filter((key) => !window.__keysBefore.includes(key)));
  expect(added).toEqual(['Gleap']);
  expect(problems).toEqual([]);
});

test('every function index.d.ts declares exists on window.Gleap', async ({ page }) => {
  await servePage(page);

  const missing = await page.evaluate((names) => names.filter((name) => typeof window.Gleap[name] !== 'function'), declaredFunctions());
  expect(missing).toEqual(DECLARED_BUT_MISSING);
});

test('initialize under a strict nonce CSP that allows the Gleap hosts, with them unreachable: no violation, no page error', async ({ page }) => {
  const gleap = 'https://*.gleap.io wss://*.gleap.io';
  const csp = `default-src 'none'; script-src 'nonce-${NONCE}' 'strict-dynamic'; style-src 'nonce-${NONCE}'; img-src 'self' data: ${gleap}; connect-src 'self' ${gleap}; frame-src 'self' ${gleap}`;
  const problems = await servePage(page, { csp });

  const sessionFailed = page.waitForEvent('requestfailed', (request) => request.url().startsWith('https://api.gleap.io/'));
  await page.evaluate(() => window.Gleap.initialize('smoke-test-project'));
  await sessionFailed;
  // One frame later the SDK has handled the failure.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));

  expect(await page.evaluate(() => window.__violations)).toEqual([]);
  expect(problems.filter((problem) => problem.startsWith('pageerror'))).toEqual([]);
});

test('the ESM bundle exports the same Gleap as the CDN bundle', async ({ page }) => {
  await servePage(page, {
    scriptTag: `<script nonce="${NONCE}" src="${HOST}/sdk.js"></script>
<script nonce="${NONCE}" type="module">import Gleap from '${HOST}/sdk.mjs'; window.__esm = Object.getOwnPropertyNames(Gleap).sort();</script>`,
  });

  await page.waitForFunction(() => window.__esm);
  const [esm, cdn] = await page.evaluate(() => [window.__esm, Object.getOwnPropertyNames(window.Gleap).sort()]);
  expect(esm).toEqual(cdn);
});

test('the npm entry points load in Node without a DOM, as in server-side rendering', async () => {
  const require = createRequire(import.meta.url);
  const commonJs = require(`${ROOT}build/cjs/index.js`);
  const { default: esm } = await import(ESM_BUNDLE);

  expect(typeof commonJs.initialize).toBe('function');
  expect(typeof esm.initialize).toBe('function');
});
