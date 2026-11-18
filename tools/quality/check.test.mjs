// The shared core's cases, then what only this repo's config decides. Runs with the unit tests (npm test).
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, describe, expect, it, vi } from 'vitest';

import { config, LIMITS } from './config.mjs';
import { defineCoreCases } from './core.cases.mjs';
import { checkChange, checkChanges } from './rules.mjs';

// Many cases start git, node and npm in a temp repo, which takes seconds on a busy machine.
vi.setConfig({ testTimeout: 60_000 });

const TOOL_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TOOL_DIR, '../..');

defineCoreCases({
  describe,
  it,
  afterAll,
  config,
  LIMITS,
  checkChange,
  checkChanges,
  toolDir: TOOL_DIR,
  repoRoot: REPO_ROOT,
  toolRelative: 'tools/quality',
  // Modules here are PascalCase, like src/GleapTourSelector.js.
  pathFor: (name) => `src/${name.replace(/[^/]+$/, (file) => file[0].toUpperCase() + file.slice(1))}.ts`,
});

// Detection is tested with every rule at full strength. The core cases pin which rules only warn.
const strict = { ...config, warningRules: new Set(), legacySizeGrowthWarns: false };
const report = (change, pathExists = () => true) =>
  checkChange({ change: { isNewPath: change.before == null, newFolders: [], ...change }, config: strict, pathExists });
const rulesOf = (change, pathExists) => report(change, pathExists).violations.map(({ rule }) => rule);

const logic = 'export const run = (value) => value + 1;';

describe('scope', () => {
  for (const path of ['src/Gleap.js', 'src/GleapTourSelector.js', 'src/index.js', 'src/UI.js']) {
    it(`checks ${path}`, () => expect(config.isInScope(path)).toBe(true));
  }
  for (const path of [
    'src/GleapTours.test.js',
    'src/unique-selector/src/getID.js',
    'smoke/sdkBundle.spec.mjs',
    'index.d.ts',
    'webpack.config.js',
    'build/browser/index.js',
    'published/latest/index.js',
    'demo/main.js',
    'tools/quality/rules.mjs',
  ]) {
    it(`leaves out ${path}`, () => expect(config.isInScope(path)).toBe(false));
  }
});

describe('file names', () => {
  it('accepts a PascalCase module and the package entry', () => {
    expect(rulesOf({ path: 'src/GleapTourSelector.js', after: logic })).toEqual([]);
    const entry = "import Gleap from './Gleap';\nexport default Gleap;";
    expect(rulesOf({ path: 'src/index.js', before: entry, after: `${entry}\n` })).toEqual([]);
  });
  for (const path of ['src/tourSelector.js', 'src/gleap-tour-selector.js', 'src/Gleap_Tours.js']) {
    it(`wants ${path} in PascalCase`, () => expect(rulesOf({ path, after: logic })).toContain('file-name'));
  }
});

describe('default exports', () => {
  it('a new module takes named exports', () => {
    expect(rulesOf({ path: 'src/GleapThing.js', after: 'const thing = 1;\nexport default thing;' })).toContain('default-export');
  });
  it('an existing default export stays', () => {
    const before = 'class GleapThing {}\nexport default GleapThing;';
    expect(rulesOf({ path: 'src/GleapThing.js', before, after: `${before}\nexport const extra = 1;` })).toEqual([]);
  });
});

describe('plain JavaScript', () => {
  const classWith = (body) => `export class GleapThing {\n${body}\n}`;
  it('measures a static method of a class', () => {
    const method = (lines) => `  static run() {\n${Array.from({ length: lines - 2 }, (_, i) => `    step${i}();`).join('\n')}\n  }`;
    expect(rulesOf({ path: 'src/GleapThing.js', before: classWith(method(90)), after: classWith(method(101)) })).toEqual(['function-lines']);
  });
  it('wants an options object from the third parameter on', () => {
    expect(rulesOf({ path: 'src/GleapThing.js', after: classWith('  static open(a, b, c) {}') })).toContain('params');
  });
  it('compares a message name with a constant', () => {
    const after = "export const isOpen = (data) => data.name === 'open';";
    expect(rulesOf({ path: 'src/GleapThing.js', after })).toContain('string-compare');
  });
  it('leaves DOM values alone', () => {
    const after = "export const isEnter = (event) => event.key === 'Enter' || event.target.tagName === 'INPUT';";
    expect(rulesOf({ path: 'src/GleapThing.js', after })).toEqual([]);
  });
});

describe('needs-test', () => {
  it('wants <Name>.test.js next to new logic', () => {
    expect(rulesOf({ path: 'src/GleapThing.js', after: logic }, () => false)).toEqual(['needs-test']);
    expect(rulesOf({ path: 'src/GleapThing.js', after: logic }, (path) => path === 'src/GleapThing.test.js')).toEqual([]);
  });
});
