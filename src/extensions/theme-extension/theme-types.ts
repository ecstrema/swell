/**
 * Theme types and validation for Swell color themes
 */

import { scope, type } from 'arktype';

// Create a scope to define the theme schema
const themeSchemas = scope({
    /**
     * Swell color theme schema
     * All colors are optional - themes only need to define colors they override
     */
    SwellColorTheme: {
        'name': 'string',
        'type?': "'light' | 'dark'",
        'colors': {
            // Background colors
            'bg?': 'string',
            'bg-surface?': 'string',
            'bg-hover?': 'string',
            'bg-active?': 'string',

            // Text colors
            'text?': 'string',
            'text-muted?': 'string',

            // Border color
            'border?': 'string',

            // Primary/accent colors
            'primary?': 'string',
            'primary-hover?': 'string',

            // Waveform specific
            'waveform?': 'string',
            'waveform-alt-bg?': 'string',

            // Button colors
            'button-bg?': 'string',
            'button-border?': 'string',
            'button-text?': 'string',
            'button-border-hover?': 'string',

            // Menu colors
            'menu-bg?': 'string',
            'menu-item-hover?': 'string',
            'menu-dropdown-bg?': 'string',
            'menu-border?': 'string',
            'menu-shadow?': 'string',

            // Scrollbar colors
            'scrollbar-track?': 'string',
            'scrollbar-thumb?': 'string',
            'scrollbar-thumb-hover?': 'string'
        }
    }
});

const exported = themeSchemas.export();

/**
 * Swell color theme schema validation using arktype
 */
export const SwellColorThemeSchema = exported.SwellColorTheme;

export type SwellColorTheme = typeof SwellColorThemeSchema.infer;

/**
 * Apply theme colors to CSS custom properties
 */
export function applyThemeColors(colors: Record<string, string>): void {
    const root = document.documentElement;

    for (const [key, value] of Object.entries(colors)) {
        // Convert key to CSS variable name
        // e.g., "bg" -> "--color-bg", "menu-bg" -> "--menu-bg"
        const cssVar = key.startsWith('menu') || key.startsWith('scrollbar')
            ? `--${key}`
            : `--color-${key}`;
        root.style.setProperty(cssVar, value);
    }
}

/**
 * Clear all theme-related CSS custom properties
 */
export function clearThemeColors(): void {
    const root = document.documentElement;

    // List of all theme-related CSS variables
    const themeVars = [
        '--color-bg', '--color-bg-surface', '--color-bg-hover', '--color-bg-active',
        '--color-text', '--color-text-muted',
        '--color-border',
        '--color-primary', '--color-primary-hover',
        '--color-waveform', '--color-waveform-alt-bg',
        '--color-button-bg', '--color-button-border', '--color-button-text', '--color-button-border-hover',
        '--menu-bg', '--menu-item-hover', '--menu-dropdown-bg', '--menu-border', '--menu-shadow',
        '--scrollbar-track', '--scrollbar-thumb', '--scrollbar-thumb-hover'
    ];

    for (const cssVar of themeVars) {
        root.style.removeProperty(cssVar);
    }
}
