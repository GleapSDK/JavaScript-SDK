/**
 * @jest-environment jsdom
 */
import { UNSTABLE_SELECTOR_PATTERN, buildStableSelector } from './GleapTourSelector';

const resolvesToElement = (selector, element) => {
  const matches = document.querySelectorAll(selector);
  return matches.length === 1 && matches[0] === element;
};

describe('UNSTABLE_SELECTOR_PATTERN', () => {
  it('is not stateful (a /g/ flag would make .test() alternate)', () => {
    expect(UNSTABLE_SELECTOR_PATTERN.global).toBe(false);
    expect(UNSTABLE_SELECTOR_PATTERN.test('#input-v-34')).toBe(true);
    expect(UNSTABLE_SELECTOR_PATTERN.test('#input-v-34')).toBe(true);
  });

  it('flags framework generated ids', () => {
    [
      '#input-v-34', // Vue 3 useId() (this ticket)
      '#v-12',
      '[id=":r3:"]', // React useId()
      '[id="radix-:r7:"]',
      '#headlessui-menu-button-4',
      '#mui-4',
      '#ember123',
      '#__BVID__42',
      '#cdk-overlay-3',
      '#mat-input-7',
      '#downshift-2-input',
      '#react-select-3-input',
      '#tippy-9',
      '#ext-gen1024',
      '#a3f1c0de-1c9e-4b7a-9f21-6d0f0d2e77aa',
    ].forEach((selector) => {
      expect([selector, UNSTABLE_SELECTOR_PATTERN.test(selector)]).toEqual([selector, true]);
    });
  });

  it('flags build-hashed class names', () => {
    ['.css-1a2b3c', '.sc-hKgILt', '.jsx-1234567', '.Button_root__2Hs3q'].forEach((selector) => {
      expect([selector, UNSTABLE_SELECTOR_PATTERN.test(selector)]).toEqual([selector, true]);
    });
  });

  it('leaves author written selectors alone', () => {
    [
      '#project-name',
      '#app',
      '#input-email',
      '#nav-v2',
      '#navv-3',
      '#step-1',
      '.v-field',
      '.v-input__control',
      '.btn-primary',
      '.pb-3',
      '.bg-primary',
      // Stable class names that share a prefix with an id generator.
      '.mat-elevation-z8',
      '.cdk-visually-hidden',
      '.v-input',
      // Hand written BEM with a number is not a CSS modules hash.
      '.footer__col3',
      '[data-gleap-tour="project-name"]',
    ].forEach((selector) => {
      expect([selector, UNSTABLE_SELECTOR_PATTERN.test(selector)]).toEqual([selector, false]);
    });
  });
});

describe('buildStableSelector', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('does not use a Vue generated id, but still resolves to the picked element', () => {
    // Rebuilt from the Reduzer "Create Project Details" dialog.
    document.body.innerHTML = `
      <div class="v-overlay__content">
        <form class="v-form">
          <div class="v-row">
            <div class="v-col">
              <div class="v-input v-text-field">
                <div class="v-input__control">
                  <div class="v-field">
                    <input id="input-v-34" class="v-field__input" type="text" />
                  </div>
                </div>
              </div>
            </div>
            <div class="v-col">
              <div class="v-input v-text-field">
                <div class="v-input__control">
                  <div class="v-field">
                    <input id="input-v-38" class="v-field__input" type="text" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>`;
    const element = document.getElementById('input-v-34');

    const selector = buildStableSelector(element);

    expect(selector).not.toContain('input-v-34');
    expect(resolvesToElement(selector, element)).toBe(true);
  });

  it('keeps a stable, author written id', () => {
    document.body.innerHTML = '<form><input id="project-name" /></form>';
    const element = document.getElementById('project-name');

    expect(buildStableSelector(element)).toBe('#project-name');
  });

  it('never returns a selector that does not resolve to the picked element', () => {
    document.body.innerHTML = `
      <div id="app">
        <div class="css-1a2b3c"><button id="v-4" class="sc-hKgILt">A</button></div>
        <div class="css-1a2b3c"><button id="v-9" class="sc-hKgILt">B</button></div>
      </div>`;

    document.querySelectorAll('button').forEach((element) => {
      const selector = buildStableSelector(element);
      expect([selector, resolvesToElement(selector, element)]).toEqual([selector, true]);
    });
  });

  it('detects a counter id from an unknown framework by its repeating shape', () => {
    // No pattern in the list knows `x-`. The sibling with the same shape but a
    // different number is what gives it away.
    document.body.innerHTML = `
      <form>
        <input id="field-x-34" name="projectName" />
        <input id="field-x-38" name="location" />
      </form>`;
    const element = document.getElementById('field-x-34');

    const selector = buildStableSelector(element);

    expect(selector).not.toContain('field-x-34');
    expect(resolvesToElement(selector, element)).toBe(true);
  });

  it('keeps hand written enumerated ids', () => {
    document.body.innerHTML = '<div><section id="step-1">a</section><section id="step-2">b</section></div>';

    expect(buildStableSelector(document.getElementById('step-1'))).toBe('#step-1');
  });

  it('prefers what the element is over where it sits', () => {
    document.body.innerHTML = `
      <form class="v-form">
        <div class="v-field"><input id="input-v-34" class="v-field__input" name="projectName" /></div>
        <div class="v-field"><input id="input-v-38" class="v-field__input" name="location" /></div>
      </form>`;
    const element = document.getElementById('input-v-34');

    expect(buildStableSelector(element)).toBe('input[name="projectName"]');
  });

  it('prefers an explicit test hook over the name', () => {
    document.body.innerHTML = '<form><input id="v-3" data-testid="project-name" name="projectName" /></form>';

    expect(buildStableSelector(document.querySelector('input'))).toBe('input[data-testid="project-name"]');
  });

  it('ignores localized attributes, they change with the app language', () => {
    document.body.innerHTML = '<form><input id="input-v-34" aria-label="Project name" placeholder="Project name" /></form>';
    const element = document.getElementById('input-v-34');

    const selector = buildStableSelector(element);

    expect(selector).not.toContain('aria-label');
    expect(selector).not.toContain('placeholder');
    expect(resolvesToElement(selector, element)).toBe(true);
  });

  it('does not trip over quotes in an attribute value', () => {
    document.body.innerHTML = '<form><input name=\'the "main" field\' /></form>';
    const element = document.querySelector('input');

    const selector = buildStableSelector(element);

    expect(resolvesToElement(selector, element)).toBe(true);
  });

  it('falls back to the original selector when excluding leaves nothing usable', () => {
    document.body.innerHTML = '<div><span id="v-1">only child</span></div>';
    const element = document.getElementById('v-1');
    // Force the "stable" attempt to fail so the fallback path is exercised.
    const selector = buildStableSelector(element, (el, options) => (options?.excludeRegex ? null : '#v-1'));

    expect(selector).toBe('#v-1');
  });
});
