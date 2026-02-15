/**
 * Shortcut system for Swell
 * 
 * This module provides a flexible keyboard shortcut system that can:
 * - Detect keyboard shortcuts
 * - Map shortcuts to commands
 * - Execute commands through a central registry
 * - Be extended with custom shortcuts
 * 
 * Usage:
 * ```typescript
 * import { CommandRegistry, ShortcutManager } from './shortcuts/index.js';
 * 
 * const registry = new CommandRegistry();
 * const shortcuts = new ShortcutManager(registry);
 * 
 * // Register commands
 * registry.register({
 *   id: 'file-open',
 *   label: 'Open File',
 *   handler: () => console.log('Opening file...')
 * });
 * 
 * // Register shortcuts
 * shortcuts.register({
 *   shortcut: { key: 'o', ctrl: true },
 *   commandId: 'file-open'
 * });
 * 
 * // Activate the shortcut system
 * shortcuts.activate();
 * ```
 */

export { CommandRegistry } from "./command-registry.js";
export { ShortcutManager } from "./shortcut-manager.js";
export { defaultShortcuts } from "./default-shortcuts.js";
export { 
    loadShortcutsFromJSON, 
    validateShortcutsConfig,
    convertToShortcutBindings,
    ShortcutValidationError
} from "./shortcut-validator.js";
export { 
    renderShortcutWithIcons, 
    renderShortcutWithIconsAsHTML,
    getShortcutStyles
} from "./shortcut-icons.js";
export type { Command, KeyboardShortcut, ShortcutBinding } from "./types.js";
export type { RawShortcutBinding, ShortcutsConfig } from "./shortcut-validator.js";
