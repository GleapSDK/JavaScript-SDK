/**
 * @jest-environment jsdom
 */
import { querySelectorSafe, querySelectorAllSafe, matchesSelectorSafe } from './GleapSafeSelector';
import { buildStableSelector, withShadowHosts } from './GleapTourSelector';

// A widget mounted the way Vue's `defineCustomElement` or a manual
// `attachShadow` mount does it: an anonymous host with the app in its shadow root.
const mountWidget = () => {
  document.body.innerHTML = '<div id="widget-container"><div></div></div><button class="save">Outside</button>';
  const host = document.querySelector('#widget-container > div');
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML =
    '<div class="app"><button class="save">Save</button><button data-gleap-tour="undo">Undo</button>' +
    '<div class="nested-host"></div></div>';
  const nestedShadow = shadow.querySelector('.nested-host').attachShadow({ mode: 'open' });
  nestedShadow.innerHTML = '<span class="deep">Deep</span>';
  return { host, shadow, nestedShadow };
};

describe('shadow DOM selectors', () => {
  it('does not find shadow content with a plain selector', () => {
    mountWidget();
    expect(querySelectorSafe('.app')).toBe(null);
    expect(querySelectorAllSafe('button.save').length).toBe(1);
  });

  it('resolves `host >>> inner` through an open shadow root', () => {
    const { shadow } = mountWidget();
    const save = shadow.querySelector('.save');
    expect(querySelectorSafe('#widget-container > div >>> button.save')).toBe(save);
    expect(querySelectorAllSafe('#widget-container > div >>> button')).toHaveLength(2);
    expect(querySelectorAllSafe('#widget-container>div>>>button.save')[0]).toBe(save);
  });

  it('resolves nested shadow roots', () => {
    const { nestedShadow } = mountWidget();
    expect(querySelectorSafe('#widget-container > div >>> .nested-host >>> .deep')).toBe(
      nestedShadow.querySelector('.deep')
    );
  });

  it('returns nothing for a missing host, a host without shadow root or a broken part', () => {
    mountWidget();
    expect(querySelectorSafe('#nope >>> .save')).toBe(null);
    expect(querySelectorSafe('#widget-container >>> .save')).toBe(null);
    expect(querySelectorAllSafe('#widget-container > div >>> ')).toEqual([]);
    expect(querySelectorAllSafe('>>> .save')).toEqual([]);
  });

  it('matches an element against a shadow path', () => {
    const { shadow } = mountWidget();
    const save = shadow.querySelector('.save');
    expect(matchesSelectorSafe(save, '#widget-container > div >>> .save')).toBe(true);
    expect(matchesSelectorSafe(save, '#other >>> .save')).toBe(false);
    expect(matchesSelectorSafe(document.querySelector('body > .save'), '#widget-container > div >>> .save')).toBe(false);
  });

  it('builds a selector for a picked shadow element that resolves back to it', () => {
    const { shadow, nestedShadow } = mountWidget();
    [shadow.querySelector('.save'), shadow.querySelector('.app'), nestedShadow.querySelector('.deep')].forEach(
      (element) => {
        const selector = buildStableSelector(element);
        expect(selector).toContain('>>>');
        expect(querySelectorAllSafe(selector)).toEqual([element]);
      }
    );
  });

  it('leaves selectors for regular elements untouched', () => {
    mountWidget();
    const outside = document.querySelector('body > .save');
    const selector = buildStableSelector(outside);
    expect(selector).not.toContain('>>>');
    expect(document.querySelector(selector)).toBe(outside);
  });

  it('prefixes a data-gleap-tour anchor with its shadow hosts', () => {
    const { shadow } = mountWidget();
    const undo = shadow.querySelector('[data-gleap-tour="undo"]');
    const selector = withShadowHosts(undo, '[data-gleap-tour="undo"]');
    expect(selector).toBe('#widget-container > div >>> [data-gleap-tour="undo"]');
    expect(querySelectorSafe(selector)).toBe(undo);
  });
});
