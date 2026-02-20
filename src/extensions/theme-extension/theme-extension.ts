/**
 * Theme Extension
 *
 * Provides theme support with CSS variable mapping.
 * Registers settings for theme selection and applies theme colors dynamically.
 */

import { type } from 'arktype';
import { Extension, ExtensionConstructor } from "../types.js";
import { SettingsExtension } from "../settings-extension/settings-extension.js";
import { SwellColorThemeSchema, applyThemeColors, clearThemeColors, SwellColorTheme } from "./theme-types.js";

// Import default themes
import defaultLightTheme from "./themes/default-light.json" with { type: "json" };
import defaultDarkTheme from "./themes/default-dark.json" with { type: "json" };

// Setting paths
const SETTING_CURRENT_THEME = 'Theme/Current';
const SETTING_DEFAULT_LIGHT_THEME = 'Theme/Default Light';
const SETTING_DEFAULT_DARK_THEME = 'Theme/Default Dark';

/**
 * Built-in themes
 */
const builtinThemes: Map<string, SwellColorTheme> = new Map([
    ['default-light', defaultLightTheme as SwellColorTheme],
    ['default-dark', defaultDarkTheme as SwellColorTheme]
]);

export class ThemeExtension implements Extension {
    static readonly metadata = {
        id: 'core/theme',
        name: 'Theme Extension',
        description: 'Provides VSCode-compatible theme support',
    };
    static readonly dependencies: ExtensionConstructor[] = [SettingsExtension];

    private settingsExtension: SettingsExtension;
    private currentTheme: string = 'default-light';
    private prefersDarkQuery: MediaQueryList | null = null;
    private systemThemeChangeHandler: ((e: MediaQueryListEvent) => void) | null = null;

    constructor(dependencies: Map<string, Extension>) {
        this.settingsExtension = dependencies.get(SettingsExtension.metadata.id) as SettingsExtension;
    }

    async activate(): Promise<void> {
        // Register theme settings
        this.registerSettings();

        // Set up system theme listener
        this.setupSystemThemeListener();

        // Load and apply initial theme
        await this.loadInitialTheme();

        // Listen for theme setting changes
        this.settingsExtension?.onSettingChange(SETTING_CURRENT_THEME, (value) => {
            this.applyTheme(value as string);
        });
    }

    private registerSettings(): void {
        // Current theme setting - can be a specific theme or "system"
        this.settingsExtension?.registerSetting({
            id: SETTING_CURRENT_THEME,
            description: 'Current color theme. Use "system" to follow system preference.',
            type: 'enum',
            defaultValue: 'system',
            enumOptions: ['system', 'default-light', 'default-dark'],
            options: [
                { value: 'system', label: 'System' },
                { value: 'default-light', label: 'Default Light' },
                { value: 'default-dark', label: 'Default Dark' }
            ]
        });

        // Default light theme (for system mode)
        this.settingsExtension?.registerSetting({
            id: SETTING_DEFAULT_LIGHT_THEME,
            description: 'Theme to use when system preference is light',
            type: 'enum',
            defaultValue: 'default-light',
            enumOptions: ['default-light'],
            options: [
                { value: 'default-light', label: 'Default Light' }
            ]
        });

        // Default dark theme (for system mode)
        this.settingsExtension?.registerSetting({
            id: SETTING_DEFAULT_DARK_THEME,
            description: 'Theme to use when system preference is dark',
            type: 'enum',
            defaultValue: 'default-dark',
            enumOptions: ['default-dark'],
            options: [
                { value: 'default-dark', label: 'Default Dark' }
            ]
        });
    }

    private setupSystemThemeListener(): void {
        this.prefersDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');

        this.systemThemeChangeHandler = (e: MediaQueryListEvent) => {
            if (this.currentTheme === 'system') {
                this.applySystemTheme();
            }
        };

        this.prefersDarkQuery.addEventListener('change', this.systemThemeChangeHandler);
    }

    private async loadInitialTheme(): Promise<void> {
        try {
            const savedTheme = await this.settingsExtension.getValue(SETTING_CURRENT_THEME);
            this.currentTheme = (savedTheme as string) || 'system';
            await this.applyTheme(this.currentTheme);
        } catch (error) {
            console.error('Failed to load initial theme:', error);
            // Fallback to system theme
            this.applySystemTheme();
        }
    }

    /**
     * Apply a theme by ID
     */
    private async applyTheme(themeId: string): Promise<void> {
        this.currentTheme = themeId;

        if (themeId === 'system') {
            this.applySystemTheme();
            return;
        }

        const theme = builtinThemes.get(themeId);
        if (!theme) {
            console.error(`Theme not found: ${themeId}`);
            return;
        }

        this.applyThemeColors(theme);
    }

    /**
     * Apply the appropriate theme based on system preference
     */
    private async applySystemTheme(): Promise<void> {
        const isDark = this.prefersDarkQuery?.matches ?? false;

        // Get the configured default light/dark themes
        let defaultThemeId: string;
        if (isDark) {
            const savedDark = await this.settingsExtension.getValue(SETTING_DEFAULT_DARK_THEME);
            defaultThemeId = (savedDark as string) || 'default-dark';
        } else {
            const savedLight = await this.settingsExtension.getValue(SETTING_DEFAULT_LIGHT_THEME);
            defaultThemeId = (savedLight as string) || 'default-light';
        }

        const theme = builtinThemes.get(defaultThemeId);
        if (!theme) {
            console.error(`Default theme not found: ${defaultThemeId}`);
            return;
        }

        this.applyThemeColors(theme);
    }

    /**
     * Validate and apply theme colors to CSS variables
     */
    private applyThemeColors(theme: SwellColorTheme): void {
        // Validate theme with arktype
        const result = SwellColorThemeSchema(theme);
        if (result instanceof type.errors) {
            console.error('Invalid theme format:', result.summary);
            return;
        }

        // Clear previous theme colors
        clearThemeColors();

        // Apply new theme colors
        if (result.colors) {
            applyThemeColors(result.colors);
        }

        // Also set a data attribute for CSS selectors
        const themeType = result.type || 'light';
        document.documentElement.setAttribute('data-theme', themeType);
    }

    /**
     * Register a custom theme
     */
    registerTheme(id: string, theme: SwellColorTheme): void {
        // Validate theme
        const result = SwellColorThemeSchema(theme);
        if (result instanceof type.errors) {
            throw new Error(`Invalid theme format: ${result.summary}`);
        }

        builtinThemes.set(id, theme);
    }

    /**
     * Get list of available themes
     */
    getAvailableThemes(): string[] {
        return Array.from(builtinThemes.keys());
    }

    /**
     * Get current theme ID
     */
    getCurrentTheme(): string {
        return this.currentTheme;
    }
}
