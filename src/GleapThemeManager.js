import { GleapConfigManager } from './Gleap';

export const COLOR_SCHEME_DEFAULT = 'default';
export const COLOR_SCHEME_AUTO = 'auto';
export const COLOR_SCHEME_LIGHT = 'light';
export const COLOR_SCHEME_DARK = 'dark';

const COLOR_SCHEMES = [COLOR_SCHEME_AUTO, COLOR_SCHEME_LIGHT, COLOR_SCHEME_DARK];

// Base (light) palette keys and their dark palette counterparts, set in the dashboard.
const PALETTE_KEYS = [
  ['headerColor', 'darkHeaderColor'],
  ['headerColor2', 'darkHeaderColor2'],
  ['headerColor3', 'darkHeaderColor3'],
  ['color', 'darkColor'],
  ['backgroundColor', 'darkBackgroundColor'],
];

// Header logo, header background image and composer glow, and their dark
// counterparts from the dashboard. A present dark value is used as-is ('' means
// none in dark mode); configs saved before these existed keep the base value.
const DARK_ASSET_KEYS = [
  ['logo', 'darkLogo'],
  ['bgImage', 'darkBgImage'],
  ['aurora', 'darkAurora'],
];

// Attributes the common theming setups (Tailwind, Bootstrap, MUI, daisyUI, GitHub
// Primer, next-themes, …) put on <html>/<body> to mark the active theme.
const THEME_ATTRIBUTES = [
  'data-theme',
  'data-bs-theme',
  'data-color-scheme',
  'data-color-mode',
  'data-mode',
  'data-mui-color-scheme',
];
const DARK_CLASSES = ['dark', 'dark-mode', 'dark-theme', 'theme-dark'];
const LIGHT_CLASSES = ['light', 'light-mode', 'light-theme', 'theme-light'];

// A CSS background transition would make the first computed-style read right
// after a theme toggle return an in-between colour, so re-check once it settled.
const SETTLE_RECHECK_MS = 500;

/**
 * Parses #rgb, #rrggbb, #rrggbbaa, rgb() and rgba() into { r, g, b, a }.
 */
export const parseColor = (color) => {
  if (typeof color !== 'string') {
    return null;
  }
  const value = color.trim().toLowerCase();

  let match = value.match(/^#([0-9a-f]{3})$/);
  if (match) {
    const [r, g, b] = match[1].split('').map((c) => parseInt(c + c, 16));
    return { r, g, b, a: 1 };
  }

  match = value.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/);
  if (match) {
    return {
      r: parseInt(match[1].substr(0, 2), 16),
      g: parseInt(match[1].substr(2, 2), 16),
      b: parseInt(match[1].substr(4, 2), 16),
      a: match[2] ? parseInt(match[2], 16) / 255 : 1,
    };
  }

  match = value.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/);
  if (match) {
    let a = 1;
    if (match[4] !== undefined) {
      a = match[4].endsWith('%') ? parseFloat(match[4]) / 100 : parseFloat(match[4]);
    }
    return { r: parseFloat(match[1]), g: parseFloat(match[2]), b: parseFloat(match[3]), a };
  }

  return null;
};

const yiq = ({ r, g, b }) => (r * 299 + g * 587 + b * 114) / 1000;

/**
 * The widget styles derive hover/shade colours and alpha suffixes from the
 * colors, which only works for #rrggbb. Returns that form for #rgb/#rrggbb, else null.
 */
const normalizeHexColor = (color) => {
  if (typeof color !== 'string' || !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color.trim())) {
    return null;
  }
  const parsed = parseColor(color);
  return '#' + [parsed.r, parsed.g, parsed.b].map((c) => c.toString(16).padStart(2, '0')).join('');
};

const normalizeColorScheme = (colorScheme) =>
  COLOR_SCHEMES.indexOf(colorScheme) !== -1 ? colorScheme : COLOR_SCHEME_DEFAULT;

// Marks <gleap-checklist> elements without an explicit `dark` attribute as dark.
const CHECKLIST_DARK_ATTRIBUTE = 'data-gleap-dark';

const schemeFromString = (value) => {
  if (typeof value !== 'string') {
    return null;
  }
  const lower = value.toLowerCase();
  if (lower.indexOf('dark') !== -1) {
    return COLOR_SCHEME_DARK;
  }
  if (lower.indexOf('light') !== -1) {
    return COLOR_SCHEME_LIGHT;
  }
  return null;
};

const schemeFromMarkers = (element) => {
  if (!element) {
    return null;
  }

  for (let i = 0; i < THEME_ATTRIBUTES.length; i++) {
    const scheme = schemeFromString(element.getAttribute(THEME_ATTRIBUTES[i]));
    if (scheme) {
      return scheme;
    }
  }

  const classList = element.classList;
  if (classList) {
    if (DARK_CLASSES.some((c) => classList.contains(c))) {
      return COLOR_SCHEME_DARK;
    }
    if (LIGHT_CLASSES.some((c) => classList.contains(c))) {
      return COLOR_SCHEME_LIGHT;
    }
  }

  return null;
};

const getComputed = (element) => {
  try {
    return element && window.getComputedStyle ? window.getComputedStyle(element) : null;
  } catch (e) {
    return null;
  }
};

const schemeFromCSSColorScheme = (element) => {
  const style = getComputed(element);
  const value = style ? (style.colorScheme || style.getPropertyValue('color-scheme') || '').toLowerCase() : '';
  // "light dark" only states support for both, not which one is active.
  const hasDark = value.indexOf('dark') !== -1;
  const hasLight = value.indexOf('light') !== -1;
  if (hasDark && !hasLight) {
    return COLOR_SCHEME_DARK;
  }
  if (hasLight && !hasDark) {
    return COLOR_SCHEME_LIGHT;
  }
  return null;
};

const schemeFromBackground = (element) => {
  const style = getComputed(element);
  const parsed = parseColor(style ? style.backgroundColor : null);
  if (!parsed || parsed.a < 0.5) {
    return null;
  }
  return yiq(parsed) < 128 ? COLOR_SCHEME_DARK : COLOR_SCHEME_LIGHT;
};

const prefersDarkQuery = () => {
  try {
    return typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null;
  } catch (e) {
    return null;
  }
};

/**
 * Detects whether the host page currently shows a dark or light UI. Explicit
 * theme markers win over the page's actual background, which wins over the OS
 * preference (the page may deliberately ignore it).
 */
export const detectHostColorScheme = () => {
  if (typeof document === 'undefined') {
    return COLOR_SCHEME_LIGHT;
  }

  const root = document.documentElement;
  const body = document.body;

  const scheme =
    schemeFromMarkers(root) ||
    schemeFromMarkers(body) ||
    schemeFromCSSColorScheme(root) ||
    schemeFromBackground(body) ||
    schemeFromBackground(root);
  if (scheme) {
    return scheme;
  }

  const query = prefersDarkQuery();
  return query && query.matches ? COLOR_SCHEME_DARK : COLOR_SCHEME_LIGHT;
};

export default class GleapThemeManager {
  // Runtime override set via Gleap.setColorScheme. 'default' defers to the
  // color scheme configured in the dashboard (flowConfig.colorScheme). Only
  // applies while dark / light mode is enabled in the dashboard.
  colorScheme = COLOR_SCHEME_DEFAULT;
  lightBackgroundColor = null;
  darkBackgroundColor = null;
  detectedScheme = null;
  mutationObserver = null;
  mediaQuery = null;
  settleTimeout = null;

  // GleapThemeManager singleton
  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new GleapThemeManager();
    }
    return this.instance;
  }

  /**
   * Sets the widget color scheme, overriding the dashboard setting. Only takes
   * effect while dark / light mode is enabled in the dashboard.
   * @param {'default'|'auto'|'light'|'dark'} colorScheme - 'default' uses the dashboard setting,
   * 'auto' follows the host page, 'light'/'dark' force a scheme.
   * @param {{ lightBackgroundColor?: string, darkBackgroundColor?: string }} options - Background
   * colors (#rgb/#rrggbb) that override the dashboard background in light / dark mode.
   */
  setColorScheme(colorScheme, options = {}) {
    this.colorScheme = normalizeColorScheme(colorScheme);
    this.lightBackgroundColor = normalizeHexColor(options?.lightBackgroundColor);
    this.darkBackgroundColor = normalizeHexColor(options?.darkBackgroundColor);

    this.updateWatching();
    this.notifyChange();
  }

  /**
   * The raw (unthemed) flow config as delivered by the server.
   */
  getDashboardConfig() {
    try {
      return GleapConfigManager.getInstance().rawFlowConfig || null;
    } catch (e) {
      return null;
    }
  }

  /**
   * The configured scheme: 'default' (never themed) while dark / light mode is
   * disabled in the dashboard (colorScheme missing, unknown or 'default'), else
   * the runtime override, else the dashboard setting.
   */
  getColorScheme(flowConfig = this.getDashboardConfig()) {
    const dashboardScheme = normalizeColorScheme(flowConfig?.colorScheme);
    if (dashboardScheme === COLOR_SCHEME_DEFAULT) {
      return COLOR_SCHEME_DEFAULT;
    }
    if (this.colorScheme !== COLOR_SCHEME_DEFAULT) {
      return this.colorScheme;
    }
    return dashboardScheme;
  }

  /**
   * Whether there are dark colors to use: a valid dark palette color from the
   * dashboard or a runtime dark background. Without one there is no dark mode.
   */
  hasDarkPalette(flowConfig = this.getDashboardConfig()) {
    if (this.darkBackgroundColor) {
      return true;
    }
    return !!flowConfig && PALETTE_KEYS.some(([, darkKey]) => normalizeHexColor(flowConfig[darkKey]) !== null);
  }

  /**
   * The scheme the widget should render in, or null to keep the dashboard colors.
   * Null while dark / light mode is disabled in the dashboard, even with a
   * runtime scheme. Dark is only active when there is a dark palette.
   */
  getActiveColorScheme(flowConfig = this.getDashboardConfig()) {
    const colorScheme = this.getColorScheme(flowConfig);
    let scheme = null;
    if (colorScheme === COLOR_SCHEME_AUTO) {
      scheme = this.detectedScheme || detectHostColorScheme();
    } else if (colorScheme === COLOR_SCHEME_LIGHT || colorScheme === COLOR_SCHEME_DARK) {
      scheme = colorScheme;
    }
    if (scheme === COLOR_SCHEME_DARK && !this.hasDarkPalette(flowConfig)) {
      return null;
    }
    return scheme;
  }

  /**
   * Returns the flow config with the palette of the active scheme applied.
   * The base colors are the light palette. Dark mode replaces each base color
   * with its dark counterpart from the dashboard (darkHeaderColor…, darkColor,
   * darkBackgroundColor) when that is set; the runtime backgrounds win. It also
   * uses the dark logo, header image and composer glow (darkLogo, darkBgImage,
   * darkAurora) when those are present.
   */
  applyToFlowConfig(flowConfig) {
    const scheme = this.getActiveColorScheme(flowConfig);
    if (!flowConfig || !scheme) {
      return flowConfig;
    }

    if (scheme === COLOR_SCHEME_LIGHT) {
      if (!this.lightBackgroundColor) {
        return flowConfig;
      }
      return {
        ...flowConfig,
        backgroundColor: this.lightBackgroundColor,
      };
    }

    const themed = { ...flowConfig };
    PALETTE_KEYS.forEach(([key, darkKey]) => {
      const darkValue = normalizeHexColor(flowConfig[darkKey]);
      if (darkValue) {
        themed[key] = darkValue;
      }
    });
    if (this.darkBackgroundColor) {
      themed.backgroundColor = this.darkBackgroundColor;
    }
    DARK_ASSET_KEYS.forEach(([key, darkKey]) => {
      const darkValue = flowConfig[darkKey];
      if (darkValue !== undefined && darkValue !== null) {
        themed[key] = darkValue;
      }
    });
    return themed;
  }

  /**
   * Maps the AI chatbar style to the active scheme, keeping its glow choice.
   */
  applyToChatbarStyle(style) {
    const scheme = this.getActiveColorScheme();
    if (!scheme) {
      return style;
    }
    const glow = !style || style === 'light-glow' || style === 'dark-glow';
    if (scheme === COLOR_SCHEME_DARK) {
      return glow ? 'dark-glow' : 'dark';
    }
    return glow ? 'light-glow' : 'light';
  }

  /**
   * Applies the active scheme to a <gleap-checklist>. An explicit `dark`
   * attribute set by the host always wins.
   */
  applyToChecklist(element) {
    if (!element) {
      return;
    }
    if (this.getActiveColorScheme() === COLOR_SCHEME_DARK) {
      element.setAttribute(CHECKLIST_DARK_ATTRIBUTE, '');
    } else {
      element.removeAttribute(CHECKLIST_DARK_ATTRIBUTE);
    }
  }

  /**
   * Applies the active scheme to all checklists. With `rerender`, loaded
   * checklists are rendered again so they pick up the current UI color.
   */
  applyToChecklists(rerender = false) {
    if (typeof document === 'undefined') {
      return;
    }
    const checklists = document.querySelectorAll('gleap-checklist');
    for (let i = 0; i < checklists.length; i++) {
      const checklist = checklists[i];
      this.applyToChecklist(checklist);
      if (rerender && checklist._hasLoaded && checklist.checklistData && typeof checklist.renderChecklist === 'function') {
        try {
          checklist.renderChecklist(checklist.checklistData);
        } catch (e) {}
      }
    }
  }

  /**
   * Starts or stops following the host page, depending on the configured scheme.
   */
  updateWatching() {
    if (this.getColorScheme() === COLOR_SCHEME_AUTO) {
      if (!this.mutationObserver && !this.mediaQuery) {
        this.detectedScheme = detectHostColorScheme();
      }
      this.startWatching();
    } else {
      this.stopWatching();
    }
  }

  checkHostColorScheme = () => {
    if (this.getColorScheme() !== COLOR_SCHEME_AUTO) {
      return;
    }
    const scheme = detectHostColorScheme();
    if (scheme !== this.detectedScheme) {
      this.detectedScheme = scheme;
      this.notifyChange();
    }
  };

  onHostChange = () => {
    this.checkHostColorScheme();
    clearTimeout(this.settleTimeout);
    this.settleTimeout = setTimeout(this.checkHostColorScheme, SETTLE_RECHECK_MS);
  };

  startWatching() {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    if (!this.mediaQuery) {
      this.mediaQuery = prefersDarkQuery();
      if (this.mediaQuery) {
        if (this.mediaQuery.addEventListener) {
          this.mediaQuery.addEventListener('change', this.onHostChange);
        } else if (this.mediaQuery.addListener) {
          this.mediaQuery.addListener(this.onHostChange);
        }
      }
    }

    if (!this.mutationObserver && typeof MutationObserver !== 'undefined') {
      this.mutationObserver = new MutationObserver(this.onHostChange);
      const observeOptions = { attributes: true, attributeFilter: ['class', 'style', ...THEME_ATTRIBUTES] };
      this.mutationObserver.observe(document.documentElement, observeOptions);
      const observeBody = () => {
        if (this.mutationObserver && document.body) {
          this.mutationObserver.observe(document.body, observeOptions);
          this.checkHostColorScheme();
        }
      };
      if (document.body) {
        observeBody();
      } else {
        document.addEventListener('DOMContentLoaded', observeBody, { once: true });
      }
    }
  }

  stopWatching() {
    clearTimeout(this.settleTimeout);
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
    if (this.mediaQuery) {
      if (this.mediaQuery.removeEventListener) {
        this.mediaQuery.removeEventListener('change', this.onHostChange);
      } else if (this.mediaQuery.removeListener) {
        this.mediaQuery.removeListener(this.onHostChange);
      }
      this.mediaQuery = null;
    }
    this.detectedScheme = null;
  }

  notifyChange() {
    this.applyToChecklists();
    try {
      GleapConfigManager.getInstance().refreshColorScheme();
    } catch (e) {}
  }
}
