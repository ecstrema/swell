/**
 * Theme Manager
 * Handles theme switching and persistence
 */

type Theme = 'light' | 'dark' | 'auto' | 'system';

const THEME_STORAGE_KEY = 'app-theme';

export class ThemeManager {
  private static instance: ThemeManager;
  private currentTheme: Theme = 'auto';

  private constructor() {
    this.loadTheme();
    this.applyTheme();
  }

  static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  private loadTheme(): void {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    if (savedTheme && ['light', 'dark', 'auto', 'system'].includes(savedTheme)) {
      this.currentTheme = savedTheme;
    }
  }

  private saveTheme(): void {
    localStorage.setItem(THEME_STORAGE_KEY, this.currentTheme);
  }

  private applyTheme(): void {
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('theme-light', 'theme-dark');
    
    // Apply new theme class if not auto/system
    if (this.currentTheme === 'light') {
      root.classList.add('theme-light');
    } else if (this.currentTheme === 'dark') {
      root.classList.add('theme-dark');
    }
    // If auto or system, no class is added and CSS media query takes over
  }

  setTheme(theme: Theme): void {
    this.currentTheme = theme;
    this.saveTheme();
    this.applyTheme();
  }

  getTheme(): Theme {
    return this.currentTheme;
  }

  toggleTheme(): void {
    // Cycle through: auto -> light -> dark -> auto
    if (this.currentTheme === 'auto') {
      this.setTheme('light');
    } else if (this.currentTheme === 'light') {
      this.setTheme('dark');
    } else {
      this.setTheme('auto');
    }
  }
}

// Initialize theme on load
export const themeManager = ThemeManager.getInstance();
