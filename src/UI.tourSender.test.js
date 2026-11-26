/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest';
import { injectStyledCSS } from './UI';

describe('product tour sender image', () => {
  afterEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  it('centers a non-square sender photo inside its round frame', () => {
    injectStyledCSS('#485BFF', '#485BFF', '#485BFF', 20, '#ffffff', 20, 20, 'BUTTON_NONE');
    const image = document.createElement('div');
    image.className = 'gleap-tour-sender-image';
    image.style.backgroundImage = "url('https://example.com/wide.png')";
    document.body.appendChild(image);

    const style = window.getComputedStyle(image);

    expect(style.backgroundSize).toBe('cover');
    expect(['center', 'center center', '50% 50%']).toContain(style.backgroundPosition);
  });
});
