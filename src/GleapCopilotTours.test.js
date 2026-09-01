/**
 * @jest-environment jsdom
 */
import GleapCopilotTours from './GleapCopilotTours';

// Stub the barrel so the real GleapCopilotTours loads without the rest of the SDK.
jest.mock('./Gleap', () => ({
  __esModule: true,
  default: {},
  GleapConfigManager: {
    getInstance: jest.fn(() => ({ flowConfig: { color: '#485BFF' } })),
  },
  GleapTranslationManager: { translateText: jest.fn((key) => key) },
}));

jest.mock('./GleapHelper', () => ({ applyGleapCSPNonce: jest.fn() }));
jest.mock('./GleapInputFiller', () => ({ typeIntoElement: jest.fn() }));
jest.mock('./UI', () => ({
  calculateContrast: jest.fn(() => '#ffffff'),
  loadIcon: jest.fn(() => '<svg></svg>'),
}));

const localStorageKey = 'gleap-tour-data';

const buildConfig = (overrides = {}) => ({
  tourType: 'cobrowse',
  playVoice: true,
  showUnmuteModal: false,
  allowClose: true,
  gradient: false,
  kaiAvatar: 'https://example.com/kai.png',
  kaiSlug: 'Kai joined',
  steps: [{ selector: '', message: 'Hello there', type: 'post', mode: 'BUTTON', voice: 'https://example.com/1.mp3' }],
  ...overrides,
});

// Audio double: `playBehaviour` decides how the play() promise settles, mirroring what Chrome does
// for the silent autoplay probe (reject when blocked, never settle when allowed).
let createdAudioSources;
let playBehaviour;

const installAudioDouble = () => {
  createdAudioSources = [];
  playBehaviour = 'resolve';

  window.Audio = jest.fn(function (src) {
    createdAudioSources.push(src);
    this.muted = false;
    this.pause = jest.fn();
    this.addEventListener = jest.fn();
    this.play = jest.fn(() => {
      if (playBehaviour === 'reject') return Promise.reject(new DOMException('blocked', 'NotAllowedError'));
      if (playBehaviour === 'never') return new Promise(() => {});
      return Promise.resolve();
    });
  });
};

const newTour = (config = buildConfig(), tourId = 'tour-1') => {
  const tours = new GleapCopilotTours();
  tours.productTourId = tourId;
  tours.productTourData = config;
  tours.currentActiveIndex = 0;
  return tours;
};

// start() awaits the autoplay probe (a real promise) before touching the DOM, so let the
// microtask queue drain between advancing the fake timers.
const flush = async (ms = 0) => {
  if (ms > 0) jest.advanceTimersByTime(ms);
  await Promise.resolve();
  await Promise.resolve();
};

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  installAudioDouble();
  // jsdom implements neither, and the pointer positioning calls both.
  window.scrollTo = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
});

describe('audio state across page changes', () => {
  it('persists the mute state with the uncompleted tour', () => {
    const tours = newTour();
    tours.audioMuted = true;

    tours.storeUncompletedTour();

    expect(JSON.parse(localStorage.getItem(localStorageKey)).audioMuted).toBe(true);
  });

  it('persists immediately when the visitor hits mute, before the tour advances', () => {
    const tours = newTour();

    tours.toggleAudio(true);

    expect(JSON.parse(localStorage.getItem(localStorageKey)).audioMuted).toBe(true);
  });

  it('reads back the stored state only for the same tour', () => {
    localStorage.setItem(localStorageKey, JSON.stringify({ tourId: 'tour-1', audioMuted: true }));

    expect(newTour(buildConfig(), 'tour-1').loadStoredAudioMuted()).toBe(true);
    expect(newTour(buildConfig(), 'tour-2').loadStoredAudioMuted()).toBeUndefined();
  });

  it('stays muted after a page change instead of asking the browser again', async () => {
    jest.useFakeTimers();
    localStorage.setItem(localStorageKey, JSON.stringify({ tourId: 'tour-1', audioMuted: true }));
    const tours = newTour();

    tours.start();
    await flush();

    expect(tours.audioMuted).toBe(true);
    // The autoplay probe would have unmuted the tour - it must not run on a resume.
    expect(window.Audio).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('does not re-prompt with the unmute modal after a page change', async () => {
    jest.useFakeTimers();
    localStorage.setItem(localStorageKey, JSON.stringify({ tourId: 'tour-1', audioMuted: true }));
    const tours = newTour(buildConfig({ showUnmuteModal: true }));

    tours.start();
    await flush();

    expect(document.querySelector('.gleap-audio-unmute-modal')).toBeNull();
    jest.useRealTimers();
  });

  it('falls back to the autoplay probe on a fresh start', async () => {
    jest.useFakeTimers();
    playBehaviour = 'reject';
    const tours = newTour();

    tours.start();
    await flush();

    expect(tours.audioMuted).toBe(true);
    jest.useRealTimers();
  });
});

describe('autoplay probe', () => {
  it('starts the tour even when play() never settles', async () => {
    jest.useFakeTimers();
    playBehaviour = 'never';
    const tours = newTour();

    tours.start();
    await flush(500);

    expect(tours.audioMuted).toBe(false);
    expect(document.getElementById('copilot-joined-container')).not.toBeNull();
    jest.useRealTimers();
  });
});

describe('read text aloud', () => {
  it('skips the stored voice clip when the setting is off', async () => {
    jest.useFakeTimers();
    const tours = newTour(buildConfig({ playVoice: false }));
    tours.audioMuted = false;
    tours.setupCopilotTour();

    tours.renderNextStep();
    await flush(100);

    expect(createdAudioSources).not.toContain('https://example.com/1.mp3');
    jest.useRealTimers();
  });

  it('plays the stored voice clip when the setting is on', async () => {
    jest.useFakeTimers();
    const tours = newTour();
    tours.audioMuted = false;
    tours.setupCopilotTour();

    tours.renderNextStep();
    await flush(100);

    expect(createdAudioSources).toContain('https://example.com/1.mp3');
    jest.useRealTimers();
  });
});

describe('step message flattening', () => {
  const bubbleText = async (message) => {
    jest.useFakeTimers();
    const tours = newTour(buildConfig({ steps: [{ selector: '', message, type: 'post', mode: 'BUTTON' }] }));
    tours.setupCopilotTour();

    tours.renderNextStep();
    await flush(100);

    const text = document.getElementById('copilot-info-bubble-content').textContent;
    jest.useRealTimers();
    return text;
  };

  it('puts a heading and the paragraph below it on separate lines', async () => {
    const text = await bubbleText('<h2>Willkommen bei Wikimanual!</h2><p>In zwei Minuten zeige ich dir alles.</p>');

    expect(text).toBe('Willkommen bei Wikimanual!\nIn zwei Minuten zeige ich dir alles.');
  });

  it('turns consecutive paragraphs and hard breaks into line breaks', async () => {
    const text = await bubbleText('<p>Erster Absatz.</p><p>Zweiter Absatz.<br>Nach dem Umbruch.</p>');

    expect(text).toBe('Erster Absatz.\nZweiter Absatz.\nNach dem Umbruch.');
  });

  it('keeps an intentional trailing hard break as one blank line, never more', async () => {
    const text = await bubbleText('<p>Erster Absatz.<br></p><p></p><p>Zweiter Absatz.</p>');

    expect(text).toBe('Erster Absatz.\n\nZweiter Absatz.');
  });

  it('trims the empty paragraphs TipTap leaves behind at the end', async () => {
    const text = await bubbleText('<h2>Quizseite</h2><p>Alles gebündelt.</p><p></p><p></p>');

    expect(text).toBe('Quizseite\nAlles gebündelt.');
  });

  it('collapses the space separators older servers inject between blocks', async () => {
    // Server-delivered HTML carries a space after each block boundary (Server PR #1500)
    // so pre-16.4.7 SDKs do not glue blocks; the newline flattening must absorb it.
    const text = await bubbleText('<h2>Listing</h2> <p>A Listing represents the property.</p> ');

    expect(text).toBe('Listing\nA Listing represents the property.');
  });

  it('keeps inline markup glued to the words around it', async () => {
    const text = await bubbleText('<p>Klicke auf <strong>Weiter</strong>, um zu starten.</p>');

    expect(text).toBe('Klicke auf Weiter, um zu starten.');
  });
});

describe('teardown', () => {
  it('does not wipe a resumable tour when mute is hit during the fade-out', () => {
    const tours = newTour();
    tours.storeUncompletedTour();
    // disable() runs cleanup(), which drops the tour 800ms before the mute button is removed.
    tours.disable();

    tours.toggleAudio(true);

    expect(localStorage.getItem(localStorageKey)).not.toBeNull();
  });
});
