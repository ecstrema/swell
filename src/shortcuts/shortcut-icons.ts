/**
 * Utility for rendering keyboard shortcuts with icons from Iconify
 */

import KeyboardIcon from '~icons/mdi/keyboard?raw';
import KeyboardCommandKeyIcon from '~icons/mdi/apple-keyboard-command?raw';
import KeyboardShiftIcon from '~icons/mdi/apple-keyboard-shift?raw';
import KeyboardControlIcon from '~icons/mdi/apple-keyboard-control?raw';
import KeyboardOptionIcon from '~icons/mdi/apple-keyboard-option?raw';
import PlusIcon from '~icons/mdi/plus?raw';

import { KeyboardShortcut } from './types.js';
import { ShortcutManager } from './shortcut-manager.js';

/**
 * Map of modifier keys to their icon SVGs
 */
const modifierIcons: Record<string, string> = {
    'Meta': KeyboardCommandKeyIcon,
    'Cmd': KeyboardCommandKeyIcon,
    '⌘': KeyboardCommandKeyIcon,
    'Control': KeyboardControlIcon,
    'Ctrl': KeyboardControlIcon,
    '⌃': KeyboardControlIcon,
    'Shift': KeyboardShiftIcon,
    '⇧': KeyboardShiftIcon,
    'Alt': KeyboardOptionIcon,
    'Option': KeyboardOptionIcon,
    '⌥': KeyboardOptionIcon,
};

/**
 * Get the platform-specific modifier key symbol
 */
function getPlatformModifier(): 'Cmd' | 'Ctrl' {
    return navigator.platform.toLowerCase().includes('mac') ? 'Cmd' : 'Ctrl';
}

/**
 * Creates an HTML element with an icon SVG
 */
function createIconElement(iconSvg: string, className: string = ''): HTMLElement {
    const span = document.createElement('span');
    span.className = `shortcut-icon ${className}`;
    span.innerHTML = iconSvg;
    return span;
}

/**
 * Creates an HTML element for a key
 */
function createKeyElement(key: string, isModifier: boolean = false): HTMLElement {
    const keyElement = document.createElement('span');
    keyElement.className = isModifier ? 'shortcut-modifier' : 'shortcut-key';
    
    // Check if this key has an icon
    const icon = modifierIcons[key];
    if (icon) {
        const iconSpan = createIconElement(icon, isModifier ? 'modifier-icon' : 'key-icon');
        keyElement.appendChild(iconSpan);
    } else {
        // For regular keys, just show the text
        const textSpan = document.createElement('span');
        textSpan.className = 'key-text';
        textSpan.textContent = key;
        keyElement.appendChild(textSpan);
    }
    
    return keyElement;
}

/**
 * Renders a keyboard shortcut with icons as an HTML element
 * @param shortcut The keyboard shortcut to render
 * @returns HTML element containing the rendered shortcut
 */
export function renderShortcutWithIcons(shortcut: KeyboardShortcut): HTMLElement {
    const container = document.createElement('span');
    container.className = 'keyboard-shortcut';
    
    // Format the shortcut to get the parts
    const formatted = ShortcutManager.formatShortcut(shortcut);
    
    // Split by + to get individual keys
    const parts = formatted.split('+').map(p => p.trim());
    
    parts.forEach((part, index) => {
        // Determine if this is a modifier key
        const isModifier = index < parts.length - 1 || modifierIcons[part] !== undefined;
        
        // Create key element
        const keyElement = createKeyElement(part, isModifier);
        container.appendChild(keyElement);
        
        // Add separator (plus icon) between keys
        if (index < parts.length - 1) {
            const separator = document.createElement('span');
            separator.className = 'shortcut-separator';
            separator.textContent = '+';
            container.appendChild(separator);
        }
    });
    
    return container;
}

/**
 * Renders a keyboard shortcut with icons as an HTML string
 * @param shortcut The keyboard shortcut to render
 * @returns HTML string containing the rendered shortcut
 */
export function renderShortcutWithIconsAsHTML(shortcut: KeyboardShortcut): string {
    const element = renderShortcutWithIcons(shortcut);
    return element.outerHTML;
}

/**
 * Gets CSS styles for shortcut display
 * This should be added to the component's stylesheet
 */
export function getShortcutStyles(): string {
    return `
        .keyboard-shortcut {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 0.85em;
            color: var(--text-secondary, #888);
        }
        
        .shortcut-modifier,
        .shortcut-key {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 2px;
            padding: 2px 6px;
            background: var(--bg-tertiary, #f0f0f0);
            border: 1px solid var(--border-color, #ddd);
            border-radius: 3px;
            font-size: 0.9em;
            font-family: system-ui, -apple-system, sans-serif;
            min-width: 20px;
        }
        
        .shortcut-modifier {
            font-weight: 500;
        }
        
        .shortcut-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 14px;
            height: 14px;
        }
        
        .shortcut-icon svg {
            width: 100%;
            height: 100%;
            fill: currentColor;
        }
        
        .modifier-icon {
            width: 16px;
            height: 16px;
        }
        
        .key-text {
            display: inline-block;
            line-height: 1;
        }
        
        .shortcut-separator {
            color: var(--text-tertiary, #aaa);
            font-size: 0.8em;
            margin: 0 2px;
        }
    `;
}
