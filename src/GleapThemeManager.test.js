/**
 * @jest-environment jsdom
 */

const mockRefreshColorScheme = jest.fn();
const mockSetStyles = jest.fn();
const mockSendConfigUpdate = jest.fn();
const mockChatbarSendConfigUpdate = jest.fn();
const mockChatbar = { comReady: false, _sendConfigUpdate: mockChatbarSendConfigUpdate };
const mockSendModalData = jest.fn();

jest.mock('./Gleap', () => ({
  __esModule: true,
  default: { setStyles: (...args) => mockSetStyles(...args) },
  GleapConfigManager: {
    getInstance: () => {
      // The real config manager is used by the integration tests below.
      const RealConfigManager = jest.requireActual('./GleapConfigManager').default;
      return mockUseRealConfigManager
        ? RealConfigManager.getInstance()
        : { refreshColorScheme: mockRefreshColorScheme, rawFlowConfig: mockDashboardConfig };
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
  GleapModalManager: { getInstance: () => ({ sendModalData: mockSendModalData }) },
  GleapSession: { getInstance: () => ({}) },
}));

let mockUseRealConfigManager = false;
// The dashboard config the (mocked) config manager delivers. Dark / light mode is
// enabled by default, so a runtime scheme applies.
let mockDashboardConfig = null;

import GleapThemeManager, { detectHostColorScheme, parseColor } from './GleapThemeManager';
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
  mockDashboardConfig = { colorScheme: 'light' };
  mockChatbar.comReady = false;
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('parseColor', () => {
  test('parses hex and rgb(a) colors', () => {
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseColor('#18181B')).toEqual({ r: 24, g: 24, b: 27, a: 1 });
    expect(parseColor('rgba(0, 0, 0, 0)')).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    expect(parseColor('rgb(10 20 30 / 50%)')).toEqual({ r: 10, g: 20, b: 30, a: 0.5 });
    expect(parseColor('transparent')).toBeNull();
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
  // Dark / light mode is enabled in the dashboard, so a runtime scheme applies.
  const lightConfig = { colorScheme: 'light', backgroundColor: '#FFFFFF', color: '#485BFF', headerColor: '#485BFF' };
  const paletteConfig = {
    colorScheme: 'light',
    backgroundColor: '#FFFFFF',
    color: '#111111',
    headerColor: '#AA0000',
    headerColor2: '#00AA00',
    headerColor3: '#0000AA',
    darkBackgroundColor: '#0B1020',
    darkColor: '#8AB4F8',
    darkHeaderColor: '#220000',
    darkHeaderColor2: '#002200',
    darkHeaderColor3: '#000022',
  };

  test('keeps the dashboard colors by default', () => {
    const manager = GleapThemeManager.getInstance();
    expect(manager.applyToFlowConfig(lightConfig)).toBe(lightConfig);
    expect(manager.applyToFlowConfig(paletteConfig)).toBe(paletteConfig);
    expect(manager.applyToFlowConfig(null)).toBeNull();
  });

  test('dark mode applies the full dark palette', () => {
    const manager = GleapThemeManager.getInstance();
    manager.setColorScheme('dark');
    expect(manager.getActiveColorScheme(paletteConfig)).toBe('dark');
    expect(manager.applyToFlowConfig(paletteConfig)).toEqual({
      ...paletteConfig,
      backgroundColor: '#0b1020',
      color: '#8ab4f8',
      headerColor: '#220000',
      headerColor2: '#002200',
      headerColor3: '#000022',
    });
    // The dashboard config itself is untouched.
    expect(paletteConfig.backgroundColor).toBe('#FFFFFF');
  });

  test('dark mode with a partial palette keeps the base colors for missing keys', () => {
    const manager = GleapThemeManager.getInstance();
    manager.setColorScheme('dark');
    const partial = { ...lightConfig, headerColor2: '#00AA00', darkBackgroundColor: '#123', darkHeaderColor2: '#000022' };
    expect(manager.applyToFlowConfig(partial)).toEqual({
      ...partial,
      backgroundColor: '#112233',
      headerColor2: '#000022',
    });

    // Keys that are missing in the base config are only added when the dark value is set.
    const themed = manager.applyToFlowConfig({ colorScheme: 'light', darkColor: '#FFF' });
    expect(themed.color).toBe('#ffffff');
    expect('backgroundColor' in themed).toBe(false);
    expect('headerColor' in themed).toBe(false);
  });

  test('ignores invalid dark palette colors', () => {
    const manager = GleapThemeManager.getInstance();
    manager.setColorScheme('dark');
    const config = {
      ...lightConfig,
      headerColor2: '#00AA00',
      darkBackgroundColor: 'rgb(1, 2, 3)',
      darkColor: 'blue',
      darkHeaderColor: '#12345',
      darkHeaderColor2: '#0f0',
    };
    expect(manager.applyToFlowConfig(config)).toEqual({ ...config, headerColor2: '#00ff00' });

    // Only invalid dark values: no dark palette, so no dark mode.
    const invalidOnly = { ...lightConfig, darkBackgroundColor: 'rgb(1, 2, 3)', darkColor: '', darkHeaderColor: null };
    expect(manager.hasDarkPalette(invalidOnly)).toBe(false);
    expect(manager.getActiveColorScheme(invalidOnly)).toBeNull();
    expect(manager.applyToFlowConfig(invalidOnly)).toBe(invalidOnly);
  });

  test('dark mode without a dark palette keeps the dashboard colors', () => {
    const manager = GleapThemeManager.getInstance();
    manager.setColorScheme('dark');
    expect(manager.hasDarkPalette(lightConfig)).toBe(false);
    expect(manager.getActiveColorScheme(lightConfig)).toBeNull();
    expect(manager.applyToFlowConfig(lightConfig)).toBe(lightConfig);

    // The same for a dark host in auto mode and a dark dashboard setting.
    manager.setColorScheme('auto');
    prefersDark = true;
    manager.checkHostColorScheme();
    expect(manager.getActiveColorScheme(lightConfig)).toBeNull();
    expect(manager.applyToFlowConfig(lightConfig)).toBe(lightConfig);

    manager.setColorScheme('default');
    const dashboardDark = { ...lightConfig, colorScheme: 'dark' };
    expect(manager.getActiveColorScheme(dashboardDark)).toBeNull();
    expect(manager.applyToFlowConfig(dashboardDark)).toBe(dashboardDark);
  });

  test('a runtime dark background alone enables dark mode and swaps only the background', () => {
    const manager = GleapThemeManager.getInstance();
    manager.setColorScheme('dark', { darkBackgroundColor: '#123' });
    expect(manager.hasDarkPalette(lightConfig)).toBe(true);
    expect(manager.getActiveColorScheme(lightConfig)).toBe('dark');
    expect(manager.applyToFlowConfig(lightConfig)).toEqual({ ...lightConfig, backgroundColor: '#112233' });

    // An invalid runtime background is ignored.
    manager.setColorScheme('dark', { darkBackgroundColor: 'rgb(1, 2, 3)' });
    expect(manager.getActiveColorScheme(lightConfig)).toBeNull();
  });

  test('the runtime dark background wins over the dashboard dark background', () => {
    const manager = GleapThemeManager.getInstance();
    manager.setColorScheme('dark', { darkBackgroundColor: '#333333' });
    expect(manager.applyToFlowConfig(paletteConfig)).toEqual({
      ...paletteConfig,
      backgroundColor: '#333333',
      color: '#8ab4f8',
      headerColor: '#220000',
      headerColor2: '#002200',
      headerColor3: '#000022',
    });

    manager.setColorScheme('dark', { darkBackgroundColor: 'rgb(1, 2, 3)' });
    expect(manager.applyToFlowConfig(paletteConfig).backgroundColor).toBe('#0b1020');
  });

  test('light mode keeps the base palette unless a runtime background is set', () => {
    const manager = GleapThemeManager.getInstance();
    manager.setColorScheme('light');
    expect(manager.getActiveColorScheme(paletteConfig)).toBe('light');
    expect(manager.applyToFlowConfig(paletteConfig)).toBe(paletteConfig);
    // A dashboard lightBackgroundColor is not used.
    const withLightBackground = { ...lightConfig, lightBackgroundColor: '#F5F5F7' };
    expect(manager.applyToFlowConfig(withLightBackground)).toBe(withLightBackground);

    manager.setColorScheme('light', { lightBackgroundColor: '#F5F5F7', darkBackgroundColor: '#000000' });
    expect(manager.applyToFlowConfig(paletteConfig)).toEqual({ ...paletteConfig, backgroundColor: '#f5f5f7' });
  });

  test('follows the dashboard setting', () => {
    const manager = GleapThemeManager.getInstance();
    const dashboardDark = { ...lightConfig, colorScheme: 'dark', darkBackgroundColor: '#222' };
    expect(manager.getColorScheme(dashboardDark)).toBe('dark');
    expect(manager.applyToFlowConfig(dashboardDark).backgroundColor).toBe('#222222');

    const dashboardAuto = { ...paletteConfig, colorScheme: 'auto' };
    expect(manager.applyToFlowConfig(dashboardAuto)).toBe(dashboardAuto);
    prefersDark = true;
    expect(manager.applyToFlowConfig(dashboardAuto).backgroundColor).toBe('#0b1020');

    expect(manager.applyToFlowConfig({ ...paletteConfig, colorScheme: 'sepia' }).backgroundColor).toBe('#FFFFFF');
  });

  test('the runtime scheme overrides the dashboard', () => {
    const manager = GleapThemeManager.getInstance();
    const dashboard = { ...paletteConfig, colorScheme: 'light' };

    manager.setColorScheme('dark');
    expect(manager.applyToFlowConfig(dashboard).headerColor).toBe('#220000');

    // 'default' removes the override again.
    manager.setColorScheme('default');
    expect(manager.getColorScheme(dashboard)).toBe('light');
    expect(manager.applyToFlowConfig(dashboard)).toBe(dashboard);
  });

  test('the runtime scheme applies when the dashboard follows the host app', () => {
    const manager = GleapThemeManager.getInstance();
    const dashboardAuto = { ...paletteConfig, colorScheme: 'auto' };
    manager.setColorScheme('dark');
    expect(manager.getActiveColorScheme(dashboardAuto)).toBe('dark');
    expect(manager.applyToFlowConfig(dashboardAuto).backgroundColor).toBe('#0b1020');
  });

  test('never themes while dark / light mode is disabled in the dashboard', () => {
    const manager = GleapThemeManager.getInstance();
    const assets = { logo: 'l.png', darkLogo: 'd.png', bgImage: 'b.png', darkBgImage: '', aurora: { seed: 1 }, darkAurora: { seed: 2 } };
    const disabledConfigs = [
      { ...paletteConfig, ...assets, colorScheme: 'default' },
      { ...paletteConfig, ...assets, colorScheme: 'sepia' },
      { ...paletteConfig, ...assets, colorScheme: undefined },
    ];

    manager.setColorScheme('dark', { darkBackgroundColor: '#333333' });
    disabledConfigs.forEach((config) => {
      expect(manager.getColorScheme(config)).toBe('default');
      expect(manager.getActiveColorScheme(config)).toBeNull();
      expect(manager.applyToFlowConfig(config)).toBe(config);
    });

    manager.setColorScheme('light', { lightBackgroundColor: '#F5F5F7' });
    disabledConfigs.forEach((config) => expect(manager.applyToFlowConfig(config)).toBe(config));

    prefersDark = true;
    manager.setColorScheme('auto', { darkBackgroundColor: '#333333' });
    disabledConfigs.forEach((config) => expect(manager.applyToFlowConfig(config)).toBe(config));
  });

  describe('dark logo, header image and composer glow', () => {
    const aurora = { colors: ['#1', '#2', '#3', '#4', '#5'], source: 'logo', seed: 1 };
    const darkAurora = { colors: ['#a', '#b', '#c', '#d', '#e'], source: 'custom', seed: 2 };
    const assetConfig = {
      ...paletteConfig,
      logo: 'https://cdn/logo.png',
      bgImage: 'https://cdn/bg.png',
      aurora,
    };

    test('dark mode uses the present dark values as-is', () => {
      const manager = GleapThemeManager.getInstance();
      manager.setColorScheme('dark');
      const config = { ...assetConfig, darkLogo: 'https://cdn/logo-dark.png', darkBgImage: 'https://cdn/bg-dark.png', darkAurora };
      const themed = manager.applyToFlowConfig(config);
      expect(themed.logo).toBe('https://cdn/logo-dark.png');
      expect(themed.bgImage).toBe('https://cdn/bg-dark.png');
      // The glow object is replaced as a whole, not merged.
      expect(themed.aurora).toBe(darkAurora);
      expect(manager.applyToFlowConfig({ ...assetConfig, darkAurora: { seed: 3 } }).aurora).toEqual({ seed: 3 });
      expect(themed.headerColor).toBe('#220000');
      // The dashboard config itself is untouched.
      expect(config.logo).toBe('https://cdn/logo.png');
      expect(config.aurora).toBe(aurora);

      // An empty string means no logo / no image in dark mode.
      const empty = manager.applyToFlowConfig({ ...assetConfig, darkLogo: '', darkBgImage: '' });
      expect(empty.logo).toBe('');
      expect(empty.bgImage).toBe('');
      expect(empty.aurora).toBe(aurora);
    });

    test('absent dark values keep the base values', () => {
      const manager = GleapThemeManager.getInstance();
      manager.setColorScheme('dark');
      const themed = manager.applyToFlowConfig(assetConfig);
      expect(themed.logo).toBe('https://cdn/logo.png');
      expect(themed.bgImage).toBe('https://cdn/bg.png');
      expect(themed.aurora).toBe(aurora);

      const nulls = manager.applyToFlowConfig({ ...assetConfig, darkLogo: null, darkBgImage: undefined, darkAurora: null });
      expect(nulls.logo).toBe('https://cdn/logo.png');
      expect(nulls.bgImage).toBe('https://cdn/bg.png');
      expect(nulls.aurora).toBe(aurora);
    });

    test('dark mode without a dark color palette keeps the base values', () => {
      const manager = GleapThemeManager.getInstance();
      manager.setColorScheme('dark');
      const config = { ...lightConfig, logo: 'l.png', darkLogo: 'd.png', bgImage: 'b.png', darkBgImage: '', aurora, darkAurora };
      expect(manager.applyToFlowConfig(config)).toBe(config);
    });

    test('light mode keeps the base values', () => {
      const manager = GleapThemeManager.getInstance();
      const config = { ...assetConfig, darkLogo: 'd.png', darkBgImage: '', darkAurora };
      manager.setColorScheme('light');
      expect(manager.applyToFlowConfig(config)).toBe(config);

      manager.setColorScheme('light', { lightBackgroundColor: '#F5F5F7' });
      const themed = manager.applyToFlowConfig(config);
      expect(themed.logo).toBe('https://cdn/logo.png');
      expect(themed.bgImage).toBe('https://cdn/bg.png');
      expect(themed.aurora).toBe(aurora);
    });
  });

  test('an unknown scheme resets to the dashboard colors', () => {
    const manager = GleapThemeManager.getInstance();
    manager.setColorScheme('dark');
    manager.setColorScheme('sepia');
    expect(manager.colorScheme).toBe('default');
    expect(manager.getColorScheme(paletteConfig)).toBe('light');
    expect(manager.applyToFlowConfig(paletteConfig)).toBe(paletteConfig);
  });
});

describe('chatbar and checklist', () => {
  test('maps the chatbar style to the active scheme, keeping the glow', () => {
    const manager = GleapThemeManager.getInstance();
    // Dark / light mode disabled in the dashboard: the style is kept, even with a runtime scheme.
    mockDashboardConfig = {};
    expect(manager.applyToChatbarStyle('light')).toBe('light');
    expect(manager.applyToChatbarStyle(undefined)).toBeUndefined();
    manager.setColorScheme('dark', { darkBackgroundColor: '#18181b' });
    expect(manager.applyToChatbarStyle('light')).toBe('light');
    expect(manager.applyToChatbarStyle(undefined)).toBeUndefined();

    mockDashboardConfig = { colorScheme: 'auto' };
    expect(manager.applyToChatbarStyle('light')).toBe('dark');
    expect(manager.applyToChatbarStyle('light-glow')).toBe('dark-glow');
    expect(manager.applyToChatbarStyle(undefined)).toBe('dark-glow');

    manager.setColorScheme('light');
    expect(manager.applyToChatbarStyle('dark')).toBe('light');
    expect(manager.applyToChatbarStyle('dark-glow')).toBe('light-glow');
  });

  test('keeps the chatbar style in dark mode without a dark palette', () => {
    const manager = GleapThemeManager.getInstance();
    manager.setColorScheme('dark');
    expect(manager.applyToChatbarStyle('light')).toBe('light');
    expect(manager.applyToChatbarStyle(undefined)).toBeUndefined();
  });

  test('marks checklists dark while the dark scheme is active', () => {
    const checklist = document.createElement('gleap-checklist');
    document.body.appendChild(checklist);
    const manager = GleapThemeManager.getInstance();

    manager.setColorScheme('dark', { darkBackgroundColor: '#18181b' });
    expect(checklist.hasAttribute('data-gleap-dark')).toBe(true);

    manager.setColorScheme('light');
    expect(checklist.hasAttribute('data-gleap-dark')).toBe(false);

    // No dark palette: the checklist is not marked dark.
    manager.setColorScheme('dark');
    expect(checklist.hasAttribute('data-gleap-dark')).toBe(false);

    // Dark / light mode disabled in the dashboard: not marked dark either.
    manager.setColorScheme('dark', { darkBackgroundColor: '#18181b' });
    expect(checklist.hasAttribute('data-gleap-dark')).toBe(true);
    mockDashboardConfig = { colorScheme: 'default' };
    manager.applyToChecklists();
    expect(checklist.hasAttribute('data-gleap-dark')).toBe(false);
    checklist.remove();
  });
});

describe('auto color scheme', () => {
  test('follows host theme toggles and OS changes', async () => {
    const manager = GleapThemeManager.getInstance();
    manager.setColorScheme('auto', { darkBackgroundColor: '#18181b' });
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

  test('does not follow the host while dark / light mode is disabled in the dashboard', () => {
    mockDashboardConfig = { colorScheme: 'default', darkBackgroundColor: '#18181b' };
    const manager = GleapThemeManager.getInstance();
    prefersDark = true;
    manager.setColorScheme('auto', { darkBackgroundColor: '#18181b' });
    expect(mediaListeners).toHaveLength(0);
    expect(manager.getActiveColorScheme()).toBeNull();
  });
});

describe('GleapConfigManager integration', () => {
  const serverConfig = () => ({
    flowConfig: {
      colorScheme: 'light',
      backgroundColor: '#FFFFFF',
      color: '#485BFF',
      headerColor: '#485BFF',
      darkBackgroundColor: '#18181B',
      darkColor: '#8AB4F8',
      darkHeaderColor: '#101010',
    },
  });

  test('applies the scheme to the loaded config and pushes changes to the widget', async () => {
    mockUseRealConfigManager = true;
    mockChatbar.comReady = true;
    const configManager = GleapConfigManager.getInstance();
    configManager.applyConfig(serverConfig());
    expect(configManager.getFlowConfig().backgroundColor).toBe('#FFFFFF');
    jest.clearAllMocks();

    // Still light (light host), so nothing is re-sent.
    GleapThemeManager.getInstance().setColorScheme('auto');
    expect(mockSendConfigUpdate).not.toHaveBeenCalled();
    expect(mockChatbarSendConfigUpdate).not.toHaveBeenCalled();

    document.documentElement.setAttribute('data-theme', 'dark');
    await Promise.resolve();
    expect(configManager.getFlowConfig().backgroundColor).toBe('#18181b');
    expect(configManager.rawFlowConfig.backgroundColor).toBe('#FFFFFF');
    expect(mockSetStyles).toHaveBeenCalledWith(
      '#8ab4f8',
      '#101010',
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
    expect(mockSendModalData).toHaveBeenCalledTimes(1);

    // A server refresh keeps the active scheme.
    configManager.applyConfig(serverConfig());
    expect(configManager.getFlowConfig().backgroundColor).toBe('#18181b');
  });

  test('applies the dashboard color scheme and follows the host when it is auto', async () => {
    mockUseRealConfigManager = true;
    const configManager = GleapConfigManager.getInstance();
    configManager.applyConfig({ flowConfig: { ...serverConfig().flowConfig, colorScheme: 'auto', darkBackgroundColor: '#101828' } });
    expect(configManager.getFlowConfig().backgroundColor).toBe('#FFFFFF');
    jest.clearAllMocks();

    document.documentElement.classList.add('dark');
    await Promise.resolve();
    expect(configManager.getFlowConfig().backgroundColor).toBe('#101828');
    expect(mockSendConfigUpdate).toHaveBeenCalledTimes(1);

    // A runtime override wins over the dashboard setting.
    GleapThemeManager.getInstance().setColorScheme('light');
    expect(configManager.getFlowConfig().backgroundColor).toBe('#FFFFFF');
    document.documentElement.classList.remove('dark');
    await Promise.resolve();
    expect(mockSendConfigUpdate).toHaveBeenCalledTimes(2);
  });

  test('stays on the dashboard colors when there is no dark palette', async () => {
    mockUseRealConfigManager = true;
    mockChatbar.comReady = true;
    const configManager = GleapConfigManager.getInstance();
    const flowConfig = { backgroundColor: '#FFFFFF', color: '#485BFF', headerColor: '#485BFF', colorScheme: 'dark' };
    configManager.applyConfig({ flowConfig });
    expect(configManager.getFlowConfig()).toBe(flowConfig);
    const checklist = document.createElement('gleap-checklist');
    document.body.appendChild(checklist);
    jest.clearAllMocks();

    GleapThemeManager.getInstance().setColorScheme('dark');
    expect(configManager.getFlowConfig()).toBe(flowConfig);
    expect(mockSetStyles).not.toHaveBeenCalled();
    expect(mockSendConfigUpdate).not.toHaveBeenCalled();
    expect(mockChatbarSendConfigUpdate).not.toHaveBeenCalled();
    expect(checklist.hasAttribute('data-gleap-dark')).toBe(false);
    checklist.remove();
  });

  test('ignores the runtime scheme while dark / light mode is disabled in the dashboard', () => {
    mockUseRealConfigManager = true;
    mockChatbar.comReady = true;
    const configManager = GleapConfigManager.getInstance();
    const flowConfig = { ...serverConfig().flowConfig, colorScheme: 'default', darkLogo: 'd.png' };
    configManager.applyConfig({ flowConfig });
    const checklist = document.createElement('gleap-checklist');
    document.body.appendChild(checklist);
    jest.clearAllMocks();

    GleapThemeManager.getInstance().setColorScheme('dark', { darkBackgroundColor: '#000000' });
    expect(configManager.getFlowConfig()).toBe(flowConfig);
    expect(mockSetStyles).not.toHaveBeenCalled();
    expect(mockSendConfigUpdate).not.toHaveBeenCalled();
    expect(mockChatbarSendConfigUpdate).not.toHaveBeenCalled();
    expect(checklist.hasAttribute('data-gleap-dark')).toBe(false);

    // Enabling it in the dashboard applies the runtime scheme.
    configManager.applyConfig({ flowConfig: { ...flowConfig, colorScheme: 'auto' } });
    expect(configManager.getFlowConfig().backgroundColor).toBe('#000000');
    expect(configManager.getFlowConfig().logo).toBe('d.png');
    expect(checklist.hasAttribute('data-gleap-dark')).toBe(true);
    checklist.remove();
  });

  test('pushes the dark palette even when the background does not change', () => {
    mockUseRealConfigManager = true;
    const configManager = GleapConfigManager.getInstance();
    configManager.applyConfig({
      flowConfig: {
        colorScheme: 'light',
        backgroundColor: '#111111',
        color: '#485BFF',
        headerColor: '#485BFF',
        darkColor: '#8AB4F8',
        darkHeaderColor: '#000000',
      },
    });
    const checklist = document.createElement('gleap-checklist');
    checklist._hasLoaded = true;
    checklist.checklistData = { id: 'c1' };
    checklist.renderChecklist = jest.fn();
    document.body.appendChild(checklist);
    jest.clearAllMocks();

    GleapThemeManager.getInstance().setColorScheme('dark');
    const flowConfig = configManager.getFlowConfig();
    expect(flowConfig.backgroundColor).toBe('#111111');
    expect(flowConfig.headerColor).toBe('#000000');
    expect(mockSetStyles).toHaveBeenCalledTimes(1);
    expect(mockSetStyles.mock.calls[0][1]).toBe('#000000');
    expect(mockSendConfigUpdate).toHaveBeenCalledTimes(1);
    expect(checklist.hasAttribute('data-gleap-dark')).toBe(true);
    // The UI color changed, so the checklist is re-rendered.
    expect(checklist.renderChecklist).toHaveBeenCalledWith({ id: 'c1' });
    checklist.remove();
  });

  test('a scheme change on unchanged colors still updates the chatbar', () => {
    mockUseRealConfigManager = true;
    mockChatbar.comReady = true;
    const configManager = GleapConfigManager.getInstance();
    configManager.applyConfig({
      flowConfig: { colorScheme: 'light', backgroundColor: '#111111', color: '#485BFF', headerColor: '#485BFF', darkBackgroundColor: '#111111' },
    });
    jest.clearAllMocks();

    GleapThemeManager.getInstance().setColorScheme('dark');
    expect(configManager.getFlowConfig().backgroundColor).toBe('#111111');
    expect(mockSetStyles).not.toHaveBeenCalled();
    expect(mockChatbarSendConfigUpdate).toHaveBeenCalledTimes(1);

    GleapThemeManager.getInstance().setColorScheme('dark');
    expect(mockChatbarSendConfigUpdate).toHaveBeenCalledTimes(1);
  });

  test('a scheme change that only swaps the logo, header image or glow re-pushes the widget config', () => {
    mockUseRealConfigManager = true;
    mockChatbar.comReady = true;
    const configManager = GleapConfigManager.getInstance();
    const aurora = { colors: ['#1', '#2', '#3', '#4', '#5'], source: 'logo', seed: 1 };
    configManager.applyConfig({
      flowConfig: {
        colorScheme: 'light',
        backgroundColor: '#111111',
        color: '#485BFF',
        headerColor: '#485BFF',
        darkBackgroundColor: '#111111',
        logo: 'l.png',
        bgImage: 'b.png',
        aurora,
        darkLogo: 'd.png',
        darkBgImage: '',
        darkAurora: { ...aurora, seed: 2 },
      },
    });
    jest.clearAllMocks();

    GleapThemeManager.getInstance().setColorScheme('dark');
    const flowConfig = configManager.getFlowConfig();
    expect(flowConfig.logo).toBe('d.png');
    expect(flowConfig.bgImage).toBe('');
    expect(flowConfig.aurora.seed).toBe(2);
    // The colors did not change, so only the configs are re-sent.
    expect(mockSetStyles).not.toHaveBeenCalled();
    expect(mockSendModalData).not.toHaveBeenCalled();
    expect(mockSendConfigUpdate).toHaveBeenCalledTimes(1);
    expect(mockChatbarSendConfigUpdate).toHaveBeenCalledTimes(1);

    // Re-applying the same scheme sends nothing.
    GleapThemeManager.getInstance().setColorScheme('dark');
    expect(mockSendConfigUpdate).toHaveBeenCalledTimes(1);

    GleapThemeManager.getInstance().setColorScheme('light');
    expect(configManager.getFlowConfig().logo).toBe('l.png');
    expect(configManager.getFlowConfig().aurora).toBe(aurora);
    expect(mockSendConfigUpdate).toHaveBeenCalledTimes(2);
  });
});
