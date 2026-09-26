/**
 * @jest-environment jsdom
 */

const mockRefreshColorScheme = jest.fn();
const mockSetStyles = jest.fn();
const mockSendConfigUpdate = jest.fn();
const mockChatbarSendConfigUpdate = jest.fn();
const mockChatbar = { comReady: false, _sendConfigUpdate: mockChatbarSendConfigUpdate };

jest.mock('./Gleap', () => ({
  __esModule: true,
  default: { setStyles: (...args) => mockSetStyles(...args) },
  GleapConfigManager: {
    getInstance: () => {
      // The real config manager is used by the integration tests below.
      const RealConfigManager = jest.requireActual('./GleapConfigManager').default;
      return mockUseRealConfigManager ? RealConfigManager.getInstance() : { refreshColorScheme: mockRefreshColorScheme };
    },
  },
  GleapFrameManager: { getInstance: () => ({ sendConfigUpdate: mockSendConfigUpdate }) },
  GleapFeedbackButtonManager: { getInstance: () => ({ updateFeedbackButtonState: jest.fn() }) },
  GleapNotificationManager: { getInstance: () => ({ updateContainerStyle: jest.fn() }) },
  GleapReplayRecorder: { getInstance: () => ({ startIfNotRunning: jest.fn(), stop: jest.fn() }) },
  GleapNetworkIntercepter: {
    getInstance: () => ({ start: jest.fn(), setLoadAllResources: jest.fn(), setFilters: jest.fn(), setBlacklist: jest.fn() }),
  },
  GleapTranslationManager: { getInstance: () => ({ updateRTLSupport: jest.fn(), getActiveLanguage: () => 'en' }) },
  GleapAiChatbarManager: { getInstance: () => mockChatbar },
  GleapSession: { getInstance: () => ({}) },
}));

let mockUseRealConfigManager = false;

import GleapThemeManager, { detectHostColorScheme, isDarkWidgetBackground, parseColor } from './GleapThemeManager';
import GleapConfigManager from './GleapConfigManager';

let prefersDark = false;
let mediaListeners = [];

const setPrefersDark = (value) => {
  prefersDark = value;
  mediaListeners.forEach((listener) => listener({ matches: value }));
};

const resetDocument = () => {
  const html = document.documentElement;
  Array.from(html.attributes).forEach((attr) => html.removeAttribute(attr.name));
  Array.from(document.body.attributes).forEach((attr) => document.body.removeAttribute(attr.name));
};

beforeEach(() => {
  jest.useFakeTimers();
  prefersDark = false;
  mediaListeners = [];
  window.matchMedia = jest.fn(() => ({
    get matches() {
      return prefersDark;
    },
    addEventListener: (_, listener) => mediaListeners.push(listener),
    removeEventListener: (_, listener) => {
      mediaListeners = mediaListeners.filter((l) => l !== listener);
    },
  }));
  resetDocument();
  if (GleapThemeManager.instance) {
    GleapThemeManager.instance.stopWatching();
  }
  GleapThemeManager.instance = undefined;
  GleapConfigManager.instance = undefined;
  mockUseRealConfigManager = false;
  mockChatbar.comReady = false;
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('parseColor / isDarkWidgetBackground', () => {
  test('parses hex and rgb(a) colors', () => {
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseColor('#18181B')).toEqual({ r: 24, g: 24, b: 27, a: 1 });
    expect(parseColor('rgba(0, 0, 0, 0)')).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    expect(parseColor('rgb(10 20 30 / 50%)')).toEqual({ r: 10, g: 20, b: 30, a: 0.5 });
    expect(parseColor('transparent')).toBeNull();
  });

  test('uses the widget dark-mode threshold', () => {
    expect(isDarkWidgetBackground('#ffffff')).toBe(false);
    expect(isDarkWidgetBackground('#1c1c1e')).toBe(true);
    expect(isDarkWidgetBackground('#485BFF')).toBe(true);
  });
});

describe('detectHostColorScheme', () => {
  test('falls back to the OS preference', () => {
    expect(detectHostColorScheme()).toBe('light');
    prefersDark = true;
    expect(detectHostColorScheme()).toBe('dark');
  });

  test('theme classes and attributes win over the OS preference', () => {
    prefersDark = true;
    document.documentElement.classList.add('light');
    expect(detectHostColorScheme()).toBe('light');

    resetDocument();
    prefersDark = false;
    document.documentElement.setAttribute('data-theme', 'dracula-dark');
    expect(detectHostColorScheme()).toBe('dark');

    resetDocument();
    document.body.classList.add('dark-mode');
    expect(detectHostColorScheme()).toBe('dark');

    resetDocument();
    document.documentElement.setAttribute('data-bs-theme', 'dark');
    expect(detectHostColorScheme()).toBe('dark');
  });

  test('reads the CSS color-scheme and the page background', () => {
    document.documentElement.style.colorScheme = 'dark';
    expect(detectHostColorScheme()).toBe('dark');

    resetDocument();
    document.documentElement.style.colorScheme = 'light dark';
    document.body.style.backgroundColor = 'rgb(17, 17, 17)';
    expect(detectHostColorScheme()).toBe('dark');

    resetDocument();
    prefersDark = true;
    document.body.style.backgroundColor = '#fafafa';
    expect(detectHostColorScheme()).toBe('light');
  });
});

describe('applyToFlowConfig', () => {
  const lightConfig = { backgroundColor: '#FFFFFF', color: '#485BFF' };
  const darkConfig = { backgroundColor: '#101010', color: '#485BFF' };

  test('keeps the dashboard colors by default', () => {
    const manager = GleapThemeManager.getInstance();
    expect(manager.applyToFlowConfig(lightConfig)).toBe(lightConfig);
    expect(manager.applyToFlowConfig(darkConfig)).toBe(darkConfig);
  });

  test('switches the background only when it does not match the scheme', () => {
    const manager = GleapThemeManager.getInstance();

    manager.setColorScheme('dark');
    expect(manager.applyToFlowConfig(lightConfig)).toEqual({ ...lightConfig, backgroundColor: '#18181b' });
    expect(manager.applyToFlowConfig(darkConfig)).toBe(darkConfig);
    expect(lightConfig.backgroundColor).toBe('#FFFFFF');

    manager.setColorScheme('light');
    expect(manager.applyToFlowConfig(darkConfig)).toEqual({ ...darkConfig, backgroundColor: '#ffffff' });
    expect(manager.applyToFlowConfig(lightConfig)).toBe(lightConfig);
  });

  test('uses custom backgrounds and ignores unusable ones', () => {
    const manager = GleapThemeManager.getInstance();

    manager.setColorScheme('dark', { darkBackgroundColor: '#123' });
    expect(manager.applyToFlowConfig(lightConfig).backgroundColor).toBe('#112233');

    manager.setColorScheme('dark', { darkBackgroundColor: 'rgb(1, 2, 3)' });
    expect(manager.applyToFlowConfig(lightConfig).backgroundColor).toBe('#18181b');

    manager.setColorScheme('light', { lightBackgroundColor: '#F5F5F7' });
    expect(manager.applyToFlowConfig(darkConfig).backgroundColor).toBe('#f5f5f7');
  });

  test('an unknown scheme resets to the dashboard colors', () => {
    const manager = GleapThemeManager.getInstance();
    manager.setColorScheme('dark');
    manager.setColorScheme('sepia');
    expect(manager.getColorScheme()).toBe('default');
    expect(manager.applyToFlowConfig(lightConfig)).toBe(lightConfig);
  });
});

describe('auto color scheme', () => {
  test('follows host theme toggles and OS changes', async () => {
    const manager = GleapThemeManager.getInstance();
    manager.setColorScheme('auto');
    expect(manager.getActiveColorScheme()).toBe('light');
    expect(mockRefreshColorScheme).toHaveBeenCalledTimes(1);

    document.documentElement.classList.add('dark');
    await Promise.resolve();
    expect(manager.getActiveColorScheme()).toBe('dark');
    expect(mockRefreshColorScheme).toHaveBeenCalledTimes(2);

    // Unrelated mutations don't trigger a refresh.
    document.body.style.overflow = 'hidden';
    await Promise.resolve();
    jest.runAllTimers();
    expect(mockRefreshColorScheme).toHaveBeenCalledTimes(2);

    document.documentElement.classList.remove('dark');
    await Promise.resolve();
    expect(manager.getActiveColorScheme()).toBe('light');

    setPrefersDark(true);
    expect(manager.getActiveColorScheme()).toBe('dark');
    expect(mockRefreshColorScheme).toHaveBeenCalledTimes(4);
  });

  test('stops watching when switching away from auto', async () => {
    const manager = GleapThemeManager.getInstance();
    manager.setColorScheme('auto');
    manager.setColorScheme('default');
    expect(mediaListeners).toHaveLength(0);

    mockRefreshColorScheme.mockClear();
    document.documentElement.classList.add('dark');
    await Promise.resolve();
    jest.runAllTimers();
    expect(mockRefreshColorScheme).not.toHaveBeenCalled();
  });
});

describe('GleapConfigManager integration', () => {
  const serverConfig = () => ({ flowConfig: { backgroundColor: '#FFFFFF', color: '#485BFF', headerColor: '#485BFF' } });

  test('applies the scheme to the loaded config and pushes changes to the widget', async () => {
    mockUseRealConfigManager = true;
    mockChatbar.comReady = true;
    const configManager = GleapConfigManager.getInstance();
    configManager.applyConfig(serverConfig());
    expect(configManager.getFlowConfig().backgroundColor).toBe('#FFFFFF');
    jest.clearAllMocks();

    GleapThemeManager.getInstance().setColorScheme('auto');
    expect(mockSendConfigUpdate).not.toHaveBeenCalled();

    document.documentElement.setAttribute('data-theme', 'dark');
    await Promise.resolve();
    expect(configManager.getFlowConfig().backgroundColor).toBe('#18181b');
    expect(configManager.rawFlowConfig.backgroundColor).toBe('#FFFFFF');
    expect(mockSetStyles).toHaveBeenCalledWith(
      '#485BFF',
      '#485BFF',
      '#485BFF',
      '#18181b',
      20,
      20,
      20,
      undefined,
      undefined,
      undefined
    );
    expect(mockSendConfigUpdate).toHaveBeenCalledTimes(1);
    expect(mockChatbarSendConfigUpdate).toHaveBeenCalledTimes(1);

    // A server refresh keeps the active scheme.
    configManager.applyConfig(serverConfig());
    expect(configManager.getFlowConfig().backgroundColor).toBe('#18181b');
  });
});
