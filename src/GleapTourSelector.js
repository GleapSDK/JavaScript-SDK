import unique from './unique-selector/src/unique-selector';

/**
 * Ids and class names that frameworks generate at runtime or at build time.
 *
 * They look unique while recording a tour, but they change on the next mount
 * (mount-order counters) or on the next deploy (build hashes). A tour step that
 * stores one of them can never be resolved again, which silently ends the tour.
 *
 * Matched against the finished selector fragment, so `#input-v-34`, `.css-1a2b3c`
 * and `[id=":r3:"]` are all tested in the form they would be stored in.
 *
 * Must stay flagless: a /g/ regex keeps `lastIndex` between `.test()` calls.
 */

// Runtime generated ids. Only ever applied to id selectors: several of these
// names are perfectly stable as class names (`.mat-elevation-z8`, `.cdk-visually-hidden`).
const GENERATED_ID_PATTERNS = [
  // Vue 3 `useId()` (`v-34`, and derived ids such as `input-v-34`).
  'v-\\d+',
  // React 18 `useId()` and the libraries building on top of it.
  ':r[0-9a-z]+:',
  '(?:radix|headlessui|reach|floating-ui)-',
  // Component libraries with mount counters.
  'mui-\\d+',
  '(?:mat|cdk)-[a-z-]+-?\\d+',
  '(?:downshift|react-select|tippy|uid|uuid)-\\d+',
  'ember\\d+',
  'BVID__\\d+',
  'ext-gen\\d+',
  'yui_\\d',
  // Raw uuids.
  '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}',
];

// Class names produced by a bundler. They change with every deploy.
const GENERATED_CLASS_PATTERNS = [
  // emotion
  'css-[a-z0-9]*\\d[a-z0-9]*',
  // styled-components
  'sc-(?=[a-zA-Z0-9]*[A-Z])[a-zA-Z0-9]{5,}',
  // styled-jsx
  'jsx-\\d+',
];

// CSS modules: `Button_root__2Hs3q`. The trailing hash has to look like base64
// (digit plus upper case) so hand written BEM such as `.footer__col3` survives.
const CSS_MODULE_HASH = '__(?=[A-Za-z0-9]{4,}$)(?=[A-Za-z0-9]*[0-9])(?=[A-Za-z0-9]*[A-Z])[A-Za-z0-9]+$';

// A generated token either starts the name or follows a separator, so that
// `#navv-3` or `.mat-header` are not mistaken for generated ones.
const separated = (patterns) => `(?:[^"]*[^a-zA-Z0-9])?(?:${patterns.join('|')})`;

export const UNSTABLE_SELECTOR_PATTERN = new RegExp(
  [
    `^(?:#|\\[id=")${separated(GENERATED_ID_PATTERNS)}`,
    `^\\.${separated(GENERATED_CLASS_PATTERNS)}`,
    `^\\.[^.]*${CSS_MODULE_HASH}`,
  ].join('|')
);

/**
 * Checks that a selector points at exactly the element it was built for.
 */
const resolvesToElement = (selector, element) => {
  if (!selector || selector === '*') {
    return false;
  }

  try {
    const matches = document.querySelectorAll(selector);
    return matches.length === 1 && matches[0] === element;
  } catch (e) {
    return false;
  }
};

// A counter that has already run past single digits. `#step-1` next to
// `#step-2` is hand written; `#input-v-34` next to `#input-v-38` is not.
const COUNTER_LIKE_NUMBER = /\d{2,}/;

const idShape = (id) => id.replace(/\d+/g, '#');

const idFragment = (id) => (id.match(/(?:^\d|:)/) ? `[id="${id}"]` : `#${id}`);

const escapeForRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Finds ids that are counters, without knowing the framework that made them.
 *
 * If two elements carry ids of the same shape but a different number, that
 * number is being handed out at runtime and will differ on the next mount.
 * This is what catches generators the pattern list above has never heard of.
 *
 * @return { Array } the generated ids currently in the document
 */
const collectGeneratedIds = () => {
  const idsByShape = {};
  const elements = document.querySelectorAll('[id]');

  for (let i = 0; i < elements.length; i++) {
    const id = elements[i].getAttribute('id');
    if (!id || !COUNTER_LIKE_NUMBER.test(id)) {
      continue;
    }

    const shape = idShape(id);
    if (!idsByShape[shape]) {
      idsByShape[shape] = [];
    }
    if (idsByShape[shape].indexOf(id) < 0) {
      idsByShape[shape].push(id);
    }
  }

  return Object.keys(idsByShape).reduce(
    (generated, shape) => (idsByShape[shape].length > 1 ? generated.concat(idsByShape[shape]) : generated),
    []
  );
};

// Attributes that describe what an element *is*. Deliberately no `aria-label`
// or `placeholder`: those hold user facing text, so they change with the app
// language and a tour recorded in English would break for everyone else.
const SEMANTIC_ATTRIBUTES = ['data-testid', 'data-test-id', 'data-test', 'data-cy', 'data-qa', 'name'];

const semanticCandidates = (element) => {
  const tag = (element.tagName || '').toLowerCase();

  return SEMANTIC_ATTRIBUTES.reduce((candidates, attribute) => {
    const value = typeof element.getAttribute === 'function' ? element.getAttribute(attribute) : null;
    if (!value || UNSTABLE_SELECTOR_PATTERN.test(`#${value}`)) {
      return candidates;
    }

    const escaped = value.replace(/["\\]/g, '\\$&');
    return candidates.concat([`${tag}[${attribute}="${escaped}"]`, `[${attribute}="${escaped}"]`]);
  }, []);
};

/**
 * Builds the selector stored on a tour step.
 *
 * Walks a ladder from the most durable anchor to the least: a stable id, then
 * what the element is (test hooks, `name`), then classes, and only as a last
 * resort its position in the DOM. Every rung is validated against the live
 * document, and if nothing holds up the previous behaviour is kept, so the
 * result is never worse than before.
 *
 * @param { Element } element the picked element
 * @param { Function } uniqueFn selector generator, injectable for tests
 * @return { String } selector
 */
export const buildStableSelector = (element, uniqueFn = unique) => {
  const fallback = uniqueFn(element);
  const candidates = [];

  try {
    const generatedIds = collectGeneratedIds();
    const id = typeof element.getAttribute === 'function' ? element.getAttribute('id') : null;

    if (id && generatedIds.indexOf(id) < 0 && !UNSTABLE_SELECTOR_PATTERN.test(idFragment(id))) {
      candidates.push(idFragment(id));
    }

    candidates.push.apply(candidates, semanticCandidates(element));

    // Generated ids are dropped document wide, so ancestors cannot reintroduce
    // one further up the chain either.
    const excluded = generatedIds.map((generatedId) => escapeForRegExp(idFragment(generatedId)));
    const excludeRegex = excluded.length
      ? new RegExp(`${UNSTABLE_SELECTOR_PATTERN.source}|^(?:${excluded.join('|')})$`)
      : UNSTABLE_SELECTOR_PATTERN;

    candidates.push(uniqueFn(element, { excludeRegex }));
  } catch (e) {
    // Keep whatever made it into the ladder and fall back below.
  }

  for (let i = 0; i < candidates.length; i++) {
    if (resolvesToElement(candidates[i], element)) {
      return candidates[i];
    }
  }

  return fallback;
};
