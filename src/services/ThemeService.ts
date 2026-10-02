import { PrimaryColorOption, CompanySettings } from '../types/theme';

export const PRIMARY_COLOR_OPTIONS: PrimaryColorOption[] = [
  {
    id: 'orange',
    name: 'Orange',
    hex: '#FA8223',
    hover: '#E66E10',
    active: '#CC5D05',
    light: '#FFF6EE',
    border: '#FED7AA',
    text: '#C25304',
    foreground: '#FFFFFF',
    ring: 'rgba(250, 130, 35, 0.35)',
  },
  {
    id: 'dark-blue',
    name: 'Dark Blue',
    hex: '#263183',
    hover: '#1D2667',
    active: '#161D4F',
    light: '#EEF1F9',
    border: '#C5CBEC',
    text: '#263183',
    foreground: '#FFFFFF',
    ring: 'rgba(38, 49, 131, 0.35)',
  },
  {
    id: 'red',
    name: 'Red',
    hex: '#EC1B27',
    hover: '#D40F1B',
    active: '#B60A14',
    light: '#FEF2F2',
    border: '#FECACA',
    text: '#BE121C',
    foreground: '#FFFFFF',
    ring: 'rgba(236, 27, 39, 0.35)',
  },
  {
    id: 'light-blue',
    name: 'Light Blue',
    hex: '#6AAED3',
    hover: '#559EC7',
    active: '#468CB3',
    light: '#F0F7FB',
    border: '#BEE0F0',
    text: '#24658B',
    foreground: '#FFFFFF',
    ring: 'rgba(106, 174, 211, 0.35)',
  },
  {
    id: 'black',
    name: 'Black',
    hex: '#161511',
    hover: '#282723',
    active: '#0D0C0A',
    light: '#F4F4F3',
    border: '#D5D4D2',
    text: '#161511',
    foreground: '#FFFFFF',
    ring: 'rgba(22, 21, 17, 0.35)',
  },
];

export const DEFAULT_PRIMARY_COLOR = PRIMARY_COLOR_OPTIONS.find((c) => c.hex === '#6AAED3')!;

export const ERP_PRIMARY_COLOR_STORAGE_KEY = 'erp-primary-color';
const COMPANY_SETTINGS_STORAGE_KEY = 'dns_erp_company_settings';
const THEME_CHANGE_EVENT = 'dns_erp_theme_changed';

type ThemeListener = (color: PrimaryColorOption) => void;

export class ThemeService {
  private currentColor: PrimaryColorOption;
  private listeners: Set<ThemeListener> = new Set();

  constructor() {
    this.currentColor = this.loadSavedColor();
    this.applyTheme(this.currentColor);
    this.initSync();
  }

  private loadSavedColor(): PrimaryColorOption {
    try {
      // 1. Primary canonical storage key: erp-primary-color
      const savedHex = localStorage.getItem(ERP_PRIMARY_COLOR_STORAGE_KEY);
      if (savedHex) {
        const match = PRIMARY_COLOR_OPTIONS.find(
          (c) => c.hex.toLowerCase() === savedHex.trim().toLowerCase()
        );
        if (match) {
          return match;
        }
      }

      // 2. Legacy fallback: dns_erp_company_settings
      const raw = localStorage.getItem(COMPANY_SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed: CompanySettings = JSON.parse(raw);
        if (parsed && parsed.primaryColor) {
          const match = PRIMARY_COLOR_OPTIONS.find(
            (c) => c.hex.toLowerCase() === parsed.primaryColor.toLowerCase()
          );
          if (match) {
            // Migrate to canonical key
            localStorage.setItem(ERP_PRIMARY_COLOR_STORAGE_KEY, match.hex);
            return match;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to parse primary color from storage:', e);
    }
    return DEFAULT_PRIMARY_COLOR;
  }

  private initSync() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === ERP_PRIMARY_COLOR_STORAGE_KEY || event.key === COMPANY_SETTINGS_STORAGE_KEY) {
          const newColor = this.loadSavedColor();
          if (newColor.hex !== this.currentColor.hex) {
            this.currentColor = newColor;
            this.applyTheme(newColor);
            this.notify();
          }
        }
      });

      window.addEventListener(THEME_CHANGE_EVENT, (event: any) => {
        if (event.detail && event.detail.hex) {
          const match = PRIMARY_COLOR_OPTIONS.find(
            (c) => c.hex.toLowerCase() === event.detail.hex.toLowerCase()
          );
          if (match && match.hex !== this.currentColor.hex) {
            this.currentColor = match;
            this.applyTheme(match);
            this.notify();
          }
        }
      });
    }
  }

  /**
   * Applies CSS variables to document.documentElement
   */
  public applyTheme(color: PrimaryColorOption) {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    // Central primary theme variables required by specification
    root.style.setProperty('--primary', color.hex);
    root.style.setProperty('--primary-hover', color.hover);
    root.style.setProperty('--primary-active', color.active);
    root.style.setProperty('--primary-foreground', color.foreground);
    root.style.setProperty('--primary-light', color.light);
    root.style.setProperty('--primary-border', color.border);

    // Aliases for comprehensive cross-component compatibility
    root.style.setProperty('--primary-color', color.hex);
    root.style.setProperty('--primary-text', color.text);
    root.style.setProperty('--primary-ring', color.ring);
  }

  public getPrimaryColor(): PrimaryColorOption {
    return this.currentColor;
  }

  public getAllPrimaryColors(): PrimaryColorOption[] {
    return PRIMARY_COLOR_OPTIONS;
  }

  /**
   * Saves and broadcasts a new primary color.
   * Only users with the DIRECTOR role are authorized.
   */
  public setPrimaryColor(
    hex: string,
    userRole?: string
  ): { success: boolean; error?: string; color?: PrimaryColorOption } {
    // 1. Role permission enforcement
    if (userRole !== 'DIRECTOR') {
      return {
        success: false,
        error: 'Access denied: Only users with the Director role can modify the primary color.',
      };
    }

    // 2. Validate against the 5 predefined colors
    const matched = PRIMARY_COLOR_OPTIONS.find(
      (c) => c.hex.toLowerCase() === hex.trim().toLowerCase()
    );

    if (!matched) {
      return {
        success: false,
        error: `Invalid color value. Must be one of: ${PRIMARY_COLOR_OPTIONS.map((c) => `${c.name} (${c.hex})`).join(', ')}.`,
      };
    }

    // 3. Persist to canonical localStorage key: erp-primary-color and company settings
    const settings: CompanySettings = {
      primaryColor: matched.hex,
      updatedAt: new Date().toISOString(),
      updatedBy: 'DIRECTOR',
    };

    try {
      localStorage.setItem(ERP_PRIMARY_COLOR_STORAGE_KEY, matched.hex);
      localStorage.setItem(COMPANY_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save theme settings to storage:', e);
      return {
        success: false,
        error: 'Storage failure: Unable to persist theme settings.',
      };
    }

    // 4. Update in-memory state & apply directly to DOM
    this.currentColor = matched;
    this.applyTheme(matched);

    // 5. Notify listeners and dispatch custom event for instant cross-component updates
    this.notify();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(THEME_CHANGE_EVENT, {
          detail: { hex: matched.hex, id: matched.id },
        })
      );
    }

    return {
      success: true,
      color: matched,
    };
  }

  public subscribe(listener: ThemeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentColor);
      } catch (err) {
        console.error('Error in theme listener:', err);
      }
    });
  }
}

export const themeService = new ThemeService();
