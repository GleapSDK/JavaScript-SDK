// What every page of every customer pays for: the bundle it downloads and the packages inside it. Raise a budget or add
// a package only in the PR that needs it, and say why there.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants } from 'node:zlib';

import { expect, test } from '@playwright/test';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
// Brotli at the highest quality, as the CDN serves it, with a few KB of headroom over the size when last raised.
const BUDGETS_KB = {
  'build/browser/index.js': 180,
  'build/embed/survey-embed.js': 2,
};

for (const [file, budget] of Object.entries(BUDGETS_KB)) {
  test(`${file} stays within ${budget} KB brotli`, () => {
    const compressed = brotliCompressSync(readFileSync(`${ROOT}${file}`), { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } });
    expect(compressed.length / 1024).toBeLessThanOrEqual(budget);
  });
}

// webpack bundles any package it can resolve, also one that is only in node_modules as another package's dependency.
test('src imports only the runtime dependencies package.json declares', () => {
  const declared = Object.keys(JSON.parse(readFileSync(`${ROOT}package.json`, 'utf8')).dependencies);
  const sources = readdirSync(`${ROOT}src`, { recursive: true }).filter((path) => /\.m?js$/.test(path) && !/\.test\.m?js$/.test(path));
  const imported = sources.flatMap((path) =>
    [...readFileSync(`${ROOT}src/${path}`, 'utf8').matchAll(/^\s*(?:import|export)\b[^'"]*?from\s+['"]([^'"./][^'"]*)['"]/gm)].map(([, specifier]) =>
      specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0]
    )
  );
  expect([...new Set(imported)].filter((name) => !declared.includes(name)).sort()).toEqual([]);
});
