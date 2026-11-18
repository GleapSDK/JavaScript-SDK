// The JavaScript SDK half of the quality check: limits, scope and names from .claude/rules/code-conventions.md.
import { basename, dirname } from 'node:path';

export const LIMITS = {
  // A new file over fileLines is a warning, over newFileLines an error. An existing file over fileLines may not grow.
  fileLines: 400,
  newFileLines: 700,
  functionLines: 80,
  componentLines: 150,
  jsxReturnLines: 60,
  positionalParams: 2,
  // Growth up to this in a file or function already over its limit is a note, not a failure.
  smallGrowthLines: 10,
  lineChars: 160,
  // This share of a new file found in what the change removed elsewhere makes it moved code.
  movedShare: 0.9,
  // This share of a file in literal tables makes it data, with no line limit.
  dataShare: 0.9,
  dataMinLines: 50,
};

const SOURCE_EXTENSION = /\.[cm]?[jt]sx?$/;
// src/unique-selector is a vendored copy of a library: it keeps upstream's shape.
const OUT_OF_SCOPE = [/\.(test|spec)\.[cm]?[jt]sx?$/, /\.d\.[cm]?ts$/, /\.generated\.[cm]?[jt]sx?$/, /^src\/unique-selector\//];
const FIXTURE = [/(^|\/)(__fixtures__|fixtures)\//, /\.fixtures?\.[cm]?[jt]sx?$/];

const PASCAL_CASE = /^[A-Z][A-Za-z0-9]*$/;
const CAMEL_CASE = /^[a-z][A-Za-z0-9]*$/;

// Modules are PascalCase like the rest of src (GleapTourSelector.js). src/index.js is the package entry.
const fileNameProblem = ({ path }) => {
  const name = basename(path).replace(SOURCE_EXTENSION, '');
  if (PASCAL_CASE.test(name) || path === 'src/index.js') return null;
  return 'a module file is PascalCase and names what it holds, like GleapTourSelector.js';
};

const folderNameProblem = (folder) =>
  CAMEL_CASE.test(basename(folder)) || PASCAL_CASE.test(basename(folder)) ? null : 'a new folder is camelCase or PascalCase';

const testCandidates = ({ path, facts }) => {
  if (!facts.functions.size) return null;
  return [`${path.replace(SOURCE_EXTENSION, '')}.test.js`];
};

const EVENT = /(^|\.)(e|ev|evt|event|\w*Event)$/;
const URL_LIKE = /(^|\.)(location|url|uri|base|parsed|link|\w*(Url|URL|Uri|Location))$|^new URL\(/;
const ELEMENT = /(^|\.)(target|currentTarget|relatedTarget|activeElement|current|el|element|node|\w*(Element|Node|Target|Ref))$/;
const KEY_PROPERTIES = new Set(['key', 'code']);
const KEY_VALUES = new Set(
  'Enter Escape Esc Tab Space Backspace Delete ArrowUp ArrowDown ArrowLeft ArrowRight Home End PageUp PageDown Shift Control Alt Meta'.split(' ').concat(' ')
);
const DOM_PROPERTIES = new Map([
  ['key', EVENT],
  ['code', EVENT],
  ['inputType', EVENT],
  ['pointerType', EVENT],
  ['tagName', ELEMENT],
  ['nodeName', ELEMENT],
  ['localName', ELEMENT],
  ['type', EVENT],
  ['visibilityState', /(^|\.)document$/],
  ['readyState', /(^|\.)(document|ws|socket|xhr|\w*(Socket|Source|Xhr|XHR|Request))$/],
  ['origin', new RegExp(`${EVENT.source}|${URL_LIKE.source}`)],
  ['protocol', URL_LIKE],
  ['hostname', URL_LIKE],
  ['host', URL_LIKE],
  ['pathname', URL_LIKE],
]);

export const config = {
  limits: LIMITS,
  isInScope: (path) => /^src\/.*\.[cm]?[jt]sx?$/.test(path) && !OUT_OF_SCOPE.some((pattern) => pattern.test(path)),
  // Fixtures have no line limit and no name or test rule. Every other rule still applies to them.
  isFixture: (path) => FIXTURE.some((pattern) => pattern.test(path)),
  registryFiles: new Set(),
  isModelFile: () => false,
  isParamsExemptFile: () => false,
  genericFileNames: new Set(['index', 'types', 'utils', 'helpers', 'controller', 'model']),
  // No second system to ban yet. A new runtime package fails smoke/bundleCost.spec.mjs instead.
  extraCounters: [],
  bannedImports: [],
  // Message names and server values are compared as strings all over the SDK: string-compare warns until that changes.
  // long-line and needs-test warn only until the check is required. Comment stamps only warn while old comments still
  // carry them for new ones to copy.
  warningRules: new Set(['string-compare', 'type-assertion', 'long-line', 'needs-test', 'comment-attribution', 'comment-date']),
  // Until the check is required, growth of old code warns too. A new file over newFileLines still fails.
  legacySizeGrowthWarns: true,
  stringExemptions: {
    // `typeof` and the empty string are exempt in the core. Everything here needs a DOM or URL receiver.
    isExempt: ({ name, receiver, value }) => (KEY_PROPERTIES.has(name) && KEY_VALUES.has(value)) || Boolean(receiver && DOM_PROPERTIES.get(name)?.test(receiver)),
  },
  // The package entry exports Gleap as its default: `import Gleap from 'gleap'` and the CDN's window.Gleap need it.
  // Existing default exports stay until their codemod, so only a rising count fails.
  defaultExports: { isExemptFile: (path) => path === 'src/index.js' || /\.config\.[cm]?[jt]sx?$/.test(path) },
  fixes: {
    'default-export': 'Use a named export: a default export has no canonical name, so agents cannot find or rename it reliably.',
    'string-compare':
      'Compare with a named constant: one frozen object per set of values (Object.freeze({ OPEN: \'open\' })), next to the code that owns them. Search for an existing one first.',
  },
  // No components and no domains: the SDK is one flat src/.
  isNewComponentBlock: () => false,
  isDomainImport: () => false,
  fileNameProblem,
  folderNameProblem,
  testCandidates,
};
