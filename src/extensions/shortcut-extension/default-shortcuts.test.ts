import { describe, it, expect } from 'vitest';
import { defaultShortcuts } from './default-shortcuts.js';

describe('Default Shortcuts', () => {
    it('should load default shortcuts from JSON file', () => {
        expect(defaultShortcuts).toBeDefined();
        expect(Array.isArray(defaultShortcuts)).toBe(true);
    });

    it('should contain valid shortcut bindings', () => {
        for (const binding of defaultShortcuts) {
            expect(binding).toHaveProperty('shortcut');
            expect(binding).toHaveProperty('commandId');
            expect(typeof binding.shortcut).toBe('string');
            expect(typeof binding.commandId).toBe('string');
            expect(binding.shortcut.length).toBeGreaterThan(0);
            expect(binding.commandId.length).toBeGreaterThan(0);
        }
    });

    it('should have expected default shortcuts', () => {
        // Check for some expected shortcuts
        const commandIds = defaultShortcuts.map(s => s.commandId);

        expect(commandIds).toContain('core/file/open');
        expect(commandIds).toContain('core/file/quit');
        expect(commandIds).toContain('core/edit/undo');
        expect(commandIds).toContain('core/edit/redo');
        expect(commandIds).toContain('core/command-palette/toggle');
        expect(commandIds).toContain('core/settings/open');
    });

    it('should not contain duplicate shortcuts', () => {
        const shortcuts = defaultShortcuts.map(s => s.shortcut);
        const uniqueShortcuts = new Set(shortcuts);

        expect(shortcuts.length).toBe(uniqueShortcuts.size);
    });
});
