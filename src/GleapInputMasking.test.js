/**
 * @jest-environment jsdom
 */

import GleapReplayRecorder from './GleapReplayRecorder';
import { startScreenCapture } from './ScreenCapture';

// Every test captures one page both ways, with the real screenshot capture and the real rrweb
// recorder, and checks that neither lets a masked value through. An ordinary field is always part
// of the page, so a capture that recorded no values at all could not pass.
const ORDINARY = 'Jane Doe';

// What a user typing into a field looks like to the page. React additionally mirrors every
// keystroke into the value attribute, password fields included.
const type = (el, text, { mirrorToAttribute = false } = {}) => {
  el.value = text;
  if (mirrorToAttribute) {
    el.setAttribute('value', text);
  }
  el.dispatchEvent(new Event('input', { bubbles: true }));
};

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

// Fields get a value before recording starts (it lands in rrweb's full snapshot), then another
// one while it runs (rrweb input and attribute events). Both must be masked.
const capture = async (html, replayOptions, fill) => {
  document.body.innerHTML = html + '<input id="ordinary" type="text">';
  const $ = (selector) => document.querySelector(selector);

  type($('#ordinary'), ORDINARY);
  await fill($, 'before-');

  const recorder = new GleapReplayRecorder();
  recorder.setOptions(replayOptions);
  recorder.start();

  await fill($, 'during-');
  await tick();

  const screenshot = (await startScreenCapture(true, replayOptions)).html;
  const replay = JSON.stringify([].concat(...recorder.segments));
  recorder.stop();

  return { screenshot, replay };
};

const expectHiddenInBoth = ({ screenshot, replay }, ...secrets) => {
  for (const secret of secrets) {
    expect(screenshot).not.toContain(secret);
    expect(replay).not.toContain(secret);
  }
  expect(screenshot).toContain(ORDINARY);
  expect(replay).toContain(ORDINARY);
};

const expectVisibleInBoth = ({ screenshot, replay }, value) => {
  expect(screenshot).toContain(value);
  expect(replay).toContain(value);
};

describe('form fields are masked the same way in screenshots and replays', () => {
  test('password fields, including the value React mirrors into the attribute', async () => {
    const result = await capture('<input id="pw" type="password">', {}, ($, prefix) =>
      type($('#pw'), prefix + 'hunter2', { mirrorToAttribute: true })
    );

    expectHiddenInBoth(result, 'hunter2');
  });

  test('a password field turned into a text field by a "show password" toggle', async () => {
    const result = await capture('<input id="pw" type="password">', {}, async ($, prefix) => {
      if (prefix === 'during-') {
        $('#pw').setAttribute('type', 'text');
        // rrweb flags the field (data-rr-is-password) when its mutation observer runs, which in a
        // browser happens right after the click on the toggle, before the next keystroke.
        await tick();
      }
      type($('#pw'), prefix + 'hunter2');
    });

    expectHiddenInBoth(result, 'hunter2');
  });

  test.each([
    ['current-password', 'text'],
    ['new-password', 'text'],
    ['one-time-code', 'text'],
    ['cc-number', 'tel'],
    ['cc-csc', 'text'],
    ['section-checkout billing cc-number', 'text'],
  ])('fields with autocomplete="%s"', async (autocomplete, inputType) => {
    const result = await capture(`<input id="secret" type="${inputType}" autocomplete="${autocomplete}">`, {}, ($, prefix) =>
      type($('#secret'), prefix + '4242424242424242')
    );

    expectHiddenInBoth(result, '4242424242424242');
  });

  test.each([
    ['rr-mask on the field', '<input id="secret" class="rr-mask">'],
    ['gl-mask on the field', '<input id="secret" class="gl-mask">'],
    ['gleap-ignore="value" on the field', '<input id="secret" gleap-ignore="value">'],
    ['rr-mask on a surrounding form', '<form class="rr-mask"><div><input id="secret"></div></form>'],
    ['rr-mask on a textarea', '<textarea id="secret" class="rr-mask"></textarea>'],
  ])('%s', async (name, html) => {
    const result = await capture(html, {}, ($, prefix) =>
      type($('#secret'), prefix + 'private note', { mirrorToAttribute: true })
    );

    expectHiddenInBoth(result, 'private note');
  });

  test('a field inside an rr-block area', async () => {
    const result = await capture('<div class="rr-block"><input id="secret"></div>', {}, ($, prefix) =>
      type($('#secret'), prefix + 'private note', { mirrorToAttribute: true })
    );

    expectHiddenInBoth(result, 'private note');
  });

  test("the site's own maskTextClass (string or RegExp) and maskTextSelector", async () => {
    const html = '<input id="a" class="secret"><div class="pii-block"><input id="b"></div><input id="c" data-private>';
    const fill = ($, prefix) => {
      type($('#a'), prefix + 'value-a');
      type($('#b'), prefix + 'value-b');
      type($('#c'), prefix + 'value-c');
    };

    expectHiddenInBoth(
      await capture(html, { maskTextClass: 'secret', maskTextSelector: '[data-private]' }, fill),
      'value-a',
      'value-c'
    );
    expectHiddenInBoth(await capture(html, { maskTextClass: /^pii-/ }, fill), 'value-b');
  });

  test('ordinary fields stay readable by default, as they always were in replays', async () => {
    const result = await capture('<input id="email" type="email"><textarea id="note"></textarea>', {}, ($, prefix) => {
      type($('#email'), prefix + 'jane@example.com');
      type($('#note'), prefix + 'steps to reproduce');
    });

    expectVisibleInBoth(result, 'during-jane@example.com');
    expectVisibleInBoth(result, 'during-steps to reproduce');
  });

  test('maskAllInputs masks every typed value, in screenshots too', async () => {
    const result = await capture(
      '<input id="email" type="email"><textarea id="note"></textarea><input id="agree" type="checkbox"><input type="submit" value="Send report">',
      { maskAllInputs: true },
      ($, prefix) => {
        type($('#email'), prefix + 'jane@example.com');
        type($('#note'), prefix + 'steps to reproduce');
        $('#agree').checked = true;
      }
    );

    for (const value of ['jane@example.com', 'steps to reproduce', ORDINARY]) {
      expect(result.screenshot).not.toContain(value);
      expect(result.replay).not.toContain(value);
    }
    // Button labels are not user input, and checkboxes keep their state.
    expectVisibleInBoth(result, 'Send report');
    expect(result.screenshot).toContain('bb-data-checked');
  });

  test('maskInputOptions masks the listed kinds, and cannot unmask passwords', async () => {
    const result = await capture(
      '<input id="email" type="email"><input id="pw" type="password">',
      { maskInputOptions: { email: true, password: false } },
      ($, prefix) => {
        type($('#email'), prefix + 'jane@example.com');
        type($('#pw'), prefix + 'hunter2', { mirrorToAttribute: true });
      }
    );

    expectHiddenInBoth(result, 'jane@example.com', 'hunter2');
  });

  test("the site's maskInputFn formats the fields its options mask, but never decides about passwords", async () => {
    const replayOptions = {
      maskInputOptions: { text: true },
      maskInputFn: (text, element) => (element.hasAttribute('data-private') ? '[private]' : text),
    };
    const result = await capture(
      '<input id="private" type="text" data-private><input id="pw" type="password">',
      replayOptions,
      ($, prefix) => {
        type($('#private'), prefix + 'private note');
        type($('#pw'), prefix + 'hunter2');
      }
    );

    expectHiddenInBoth(result, 'private note', 'hunter2');
    expectVisibleInBoth(result, '[private]');
  });

  test('fields inside a web component, marked from outside of it', async () => {
    const result = await capture('<div class="rr-mask" id="host-wrapper"><div id="host"></div></div>', {}, ($, prefix) => {
      const host = $('#host');
      const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });
      if (!shadow.firstChild) {
        shadow.innerHTML = '<input id="inner"><input id="inner-pw" type="password">';
      }
      type(shadow.getElementById('inner'), prefix + 'private note');
      type(shadow.getElementById('inner-pw'), prefix + 'hunter2');
    });

    expectHiddenInBoth(result, 'private note', 'hunter2');
  });
});

// Screenshots leave out blocked elements and mask text as rrweb does in replays (see
// ScreenCapture.test.js for what the screenshot keeps of them).
describe('blocked elements and masked text stay out of screenshots and replays alike', () => {
  test.each([
    ['rr-block', '<div class="rr-block"><p>jane@example.com</p><img src="/avatar/jane.png"></div>', {}],
    ['blockClass', '<div class="private"><p>jane@example.com</p></div>', { blockClass: 'private' }],
    ['blockSelector', '<div data-private><p>jane@example.com</p></div>', { blockSelector: '[data-private]' }],
    ['rr-mask', '<p class="rr-mask">jane@example.com</p>', {}],
    ['maskTextClass', '<p class="secret">jane@example.com</p>', { maskTextClass: 'secret' }],
    ['maskTextSelector', '<p data-private>jane@example.com</p>', { maskTextSelector: '[data-private]' }],
  ])('the content of %s elements', async (name, html, replayOptions) => {
    const result = await capture(html, replayOptions, () => {});

    expectHiddenInBoth(result, 'jane@example.com', 'avatar');
  });
});
