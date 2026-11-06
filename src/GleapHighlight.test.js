/**
 * @jest-environment jsdom
 */
import {
  checkForHighlightParam,
  clearHighlight,
  findHighlightTarget,
  readHighlightParam,
  scoreLabel,
  showHighlight,
} from './GleapHighlight';

// jsdom has no layout: every element counts as visible unless a test marks it hidden.
const visible = (element) => !element.closest('[data-hidden]');

// A settings page: toggle rows with a heading, a description and a label.
const settingsPage = `
  <nav><a href="/region">Region</a><a href="/publishing">Publishing</a></nav>
  <section>
    <h3>Save as draft on the store</h3>
    <p>When checked, your listing is uploaded to the store as a draft and stops there. You publish the draft yourself.</p>
    <label id="draft-toggle"><input type="checkbox" role="switch" /><span>Save as draft</span></label>
    <h3>Show your listing to your friends</h3>
    <label id="friends-toggle"><input type="checkbox" /><span>Show to friends</span></label>
    <button id="save">Save</button>
    <button id="save-changes">Save changes</button>
    <button aria-label="Manage subscription" id="icon-button"><svg></svg></button>
  </section>
`;

describe('GleapHighlight', () => {
  beforeEach(() => {
    document.body.innerHTML = settingsPage;
  });

  afterEach(() => {
    clearHighlight();
    jest.useRealTimers();
  });

  describe('scoreLabel', () => {
    it('ranks exact over contained over shared words', () => {
      expect(scoreLabel('Save as draft', 'save as  DRAFT')).toBe(100);
      expect(scoreLabel('Save as draft now', 'Save as draft')).toBeGreaterThan(60);
      expect(scoreLabel('Save as draft', 'Post as draft')).toBeGreaterThan(0);
      expect(scoreLabel('Save as draft', 'Post as draft')).toBeLessThan(60);
    });

    it('never matches one shared word in a sentence', () => {
      expect(scoreLabel('When checked, your listing is uploaded to the store as a draft', 'Post as draft')).toBe(0);
      expect(scoreLabel('Region', 'Post as draft')).toBe(0);
      expect(scoreLabel('', 'Save')).toBe(0);
    });
  });

  describe('findHighlightTarget', () => {
    it('finds the exact label and returns its toggle row', () => {
      expect(findHighlightTarget('Save as draft', { isVisible: visible }).id).toBe('draft-toggle');
    });

    it('finds the closest label when the AI named it differently ("Post as draft")', () => {
      expect(findHighlightTarget('Post as draft', { isVisible: visible }).id).toBe('draft-toggle');
    });

    it('prefers the exact button over a longer one', () => {
      expect(findHighlightTarget('Save', { isVisible: visible }).id).toBe('save');
      expect(findHighlightTarget('save changes', { isVisible: visible }).id).toBe('save-changes');
    });

    it('finds an icon button by its aria-label', () => {
      expect(findHighlightTarget('Manage subscription', { isVisible: visible }).id).toBe('icon-button');
    });

    it('skips hidden elements and Gleap’s own UI', () => {
      document.body.innerHTML = `
        <div data-hidden><button id="hidden">Autodelist</button></div>
        <div class="gleap-frame-container"><button id="gleap">Autodelist</button></div>`;
      expect(findHighlightTarget('Autodelist', { isVisible: visible })).toBeNull();
    });

    it('returns null when nothing matches', () => {
      expect(findHighlightTarget('Delete account', { isVisible: visible })).toBeNull();
      expect(findHighlightTarget('', { isVisible: visible })).toBeNull();
    });
  });

  describe('readHighlightParam', () => {
    it('reads the label the Messenger put on the link', () => {
      expect(readHighlightParam('?gleap_highlight=Post+as+draft')).toBe('Post as draft');
      expect(readHighlightParam('?tab=1&gleap_highlight=%20Save%20')).toBe('Save');
      expect(readHighlightParam('?tab=1')).toBeNull();
      expect(readHighlightParam('?gleap_highlight=')).toBeNull();
    });
  });

  describe('showHighlight', () => {
    beforeAll(() => {
      Element.prototype.scrollIntoView = jest.fn();
    });

    it('outlines the element and removes the outline on the next click', () => {
      const element = document.getElementById('save');
      showHighlight(element, { color: '#FF0000' });
      expect(element.scrollIntoView).toHaveBeenCalled();
      expect(document.getElementById('gleap-highlight-overlay')).not.toBeNull();
      expect(document.getElementById('gleap-highlight-styles').textContent).toContain('#FF0000');

      window.dispatchEvent(new Event('pointerdown'));
      expect(document.getElementById('gleap-highlight-overlay')).toBeNull();
    });

    it('fades out on its own', () => {
      jest.useFakeTimers();
      showHighlight(document.getElementById('save'));
      jest.advanceTimersByTime(7000);
      expect(document.getElementById('gleap-highlight-overlay')).toBeNull();
    });
  });

  describe('checkForHighlightParam', () => {
    it('strips the parameter, keeps the rest of the URL and the router state, and waits for the element', () => {
      jest.useFakeTimers();
      document.body.innerHTML = '<div id="app"></div>';
      window.history.replaceState({ route: 'settings' }, '', '/account/settings/publishing?tab=1&gleap_highlight=Post+as+draft#top');

      expect(checkForHighlightParam()).toBe(true);
      expect(window.location.search).toBe('?tab=1');
      expect(window.location.hash).toBe('#top');
      expect(window.history.state).toEqual({ route: 'settings' });
      expect(document.getElementById('gleap-highlight-overlay')).toBeNull();

      // The SPA renders the settings a moment later.
      document.getElementById('app').innerHTML = settingsPage;
      // jsdom has no layout, so the default visibility check fails: let it see everything.
      const original = Element.prototype.getClientRects;
      Element.prototype.getClientRects = () => [{}];
      try {
        jest.advanceTimersByTime(400);
        expect(document.getElementById('gleap-highlight-overlay')).not.toBeNull();
      } finally {
        Element.prototype.getClientRects = original;
      }
    });

    it('does nothing without the parameter', () => {
      window.history.replaceState(null, '', '/account?tab=1');
      expect(checkForHighlightParam()).toBe(false);
    });
  });
});
