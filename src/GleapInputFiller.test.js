/**
 * @jest-environment jsdom
 */
import { resolveInputTarget, setInputValue, typeIntoElement } from './GleapInputFiller';

const realInputValue = (element) =>
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').get.call(element);

describe('resolveInputTarget', () => {
  it('returns the element itself for inputs and textareas', () => {
    const input = document.createElement('input');
    const textarea = document.createElement('textarea');

    expect(resolveInputTarget(input)).toBe(input);
    expect(resolveInputTarget(textarea)).toBe(textarea);
  });

  it('digs out the inner input when a wrapper was picked', () => {
    // Vuetify: the picker often lands on `.v-field`, not on the `<input>` itself.
    const field = document.createElement('div');
    field.className = 'v-field';
    field.innerHTML = `<div class="v-field__field"><label>Location</label><input class="v-field__input" /></div>`;

    expect(resolveInputTarget(field)).toBe(field.querySelector('input'));
  });

  it('ignores hidden inputs when digging into a wrapper', () => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<input type="hidden" /><input type="text" class="real" />`;

    expect(resolveInputTarget(wrapper)).toBe(wrapper.querySelector('.real'));
  });

  it('supports contenteditable elements', () => {
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');

    expect(resolveInputTarget(editable)).toBe(editable);
  });

  it('skips inputs that cannot hold typed text', () => {
    ['checkbox', 'radio', 'file', 'range', 'submit', 'button', 'color'].forEach((type) => {
      const input = document.createElement('input');
      input.setAttribute('type', type);
      expect([type, resolveInputTarget(input)]).toEqual([type, null]);
    });
  });

  it('picks the text field, not a checkbox that happens to come first', () => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<input type="checkbox" /><input type="email" class="real" />`;

    expect(resolveInputTarget(wrapper)).toBe(wrapper.querySelector('.real'));
  });

  it('returns null when there is nothing fillable', () => {
    const div = document.createElement('div');
    div.innerHTML = '<span>nope</span>';

    expect(resolveInputTarget(div)).toBeNull();
    expect(resolveInputTarget(null)).toBeNull();
  });
});

describe('setInputValue', () => {
  it('sets the value and dispatches a bubbling input event', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    const events = [];
    document.body.addEventListener('input', (e) => events.push(e));

    setInputValue(input, 'Oslo');

    expect(input.value).toBe('Oslo');
    expect(events).toHaveLength(1);
    expect(events[0].bubbles).toBe(true);
  });

  it('writes through the native setter so framework-controlled inputs update', () => {
    // React (and any lib that shadows `value` on the instance) only picks up
    // changes made through the prototype setter.
    const input = document.createElement('input');
    let shadowed = '';
    Object.defineProperty(input, 'value', {
      get: () => shadowed,
      set: (v) => {
        shadowed = v;
      },
      configurable: true,
    });

    setInputValue(input, 'My first project in Reduzer');

    expect(realInputValue(input)).toBe('My first project in Reduzer');
    expect(shadowed).toBe('');
  });

  it('fills contenteditable elements via textContent', () => {
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    document.body.appendChild(editable);
    const events = [];
    editable.addEventListener('input', (e) => events.push(e));

    setInputValue(editable, 'Hello');

    expect(editable.textContent).toBe('Hello');
    expect(events).toHaveLength(1);
  });
});

describe('typeIntoElement', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = '';
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('types the exact value and fires one input event per character plus a final change', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    const inputEvents = [];
    const changeEvents = [];
    input.addEventListener('input', (e) => inputEvents.push(e.target.value));
    input.addEventListener('change', (e) => changeEvents.push(e.target.value));
    const onDone = jest.fn();

    typeIntoElement(input, 'Oslo', { charDelay: 100, onDone });
    jest.advanceTimersByTime(1000);

    expect(input.value).toBe('Oslo');
    expect(inputEvents).toEqual(['O', 'Os', 'Osl', 'Oslo']);
    expect(changeEvents).toEqual(['Oslo']);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('replaces pre-filled content instead of appending to it', () => {
    const input = document.createElement('input');
    input.value = 'stale';
    document.body.appendChild(input);

    typeIntoElement(input, 'new', { charDelay: 100 });
    jest.advanceTimersByTime(1000);

    expect(input.value).toBe('new');
  });

  it('types into the inner input when a wrapper was picked', () => {
    const field = document.createElement('div');
    field.className = 'v-field';
    field.innerHTML = '<input class="v-field__input" />';
    document.body.appendChild(field);

    typeIntoElement(field, 'Oslo', { charDelay: 100 });
    jest.advanceTimersByTime(1000);

    expect(field.querySelector('input').value).toBe('Oslo');
  });

  it('still calls onDone when there is nothing to type into, so the tour never stalls', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    const onDone = jest.fn();

    typeIntoElement(div, 'Oslo', { charDelay: 100, onDone });
    jest.advanceTimersByTime(1000);

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('never strands the tour when writing the value throws', () => {
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    document.body.appendChild(editable);
    Object.defineProperty(editable, 'textContent', {
      set: () => {
        throw new Error('editor refused the write');
      },
      get: () => '',
      configurable: true,
    });
    const onDone = jest.fn();

    expect(() => {
      typeIntoElement(editable, 'Oslo', { charDelay: 100, onDone });
      jest.advanceTimersByTime(1000);
    }).not.toThrow();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('handles an empty value without hanging', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    const onDone = jest.fn();

    typeIntoElement(input, '', { charDelay: 100, onDone });
    jest.advanceTimersByTime(1000);

    expect(input.value).toBe('');
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
