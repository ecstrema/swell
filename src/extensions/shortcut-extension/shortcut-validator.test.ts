import { describe, it, expect } from 'vitest';
import {
    loadShortcutsFromJSON,
    validateShortcutsConfig,
    convertToShortcutBindings,
    ShortcutValidationError
} from './shortcut-validator.js';

describe('Shortcut Validator', () => {
    describe('validateShortcutsConfig', () => {
        it('should validate a valid shortcuts configuration', () => {
            const config = {
                shortcuts: [
                    { shortcut: 'Ctrl+O', commandId: 'core/file/open' },
                    { shortcut: 'Ctrl+W', commandId: 'file-close' }
                ]
            };

            const result = validateShortcutsConfig(config);
            expect(result).toEqual(config);
            expect(result.shortcuts).toHaveLength(2);
        });

        it('should reject non-object input', () => {
            expect(() => validateShortcutsConfig(null)).toThrow(ShortcutValidationError);
            expect(() => validateShortcutsConfig(undefined)).toThrow(ShortcutValidationError);
            expect(() => validateShortcutsConfig('string')).toThrow(ShortcutValidationError);
            expect(() => validateShortcutsConfig(123)).toThrow(ShortcutValidationError);
        });

        it('should reject config without shortcuts field', () => {
            expect(() => validateShortcutsConfig({})).toThrow(ShortcutValidationError);
            expect(() => validateShortcutsConfig({})).toThrow('missing "shortcuts" field');
        });

        it('should reject config where shortcuts is not an array', () => {
            expect(() => validateShortcutsConfig({ shortcuts: 'not-array' })).toThrow(ShortcutValidationError);
            expect(() => validateShortcutsConfig({ shortcuts: {} })).toThrow(ShortcutValidationError);
        });

        it('should reject shortcuts missing shortcut field', () => {
            const config = { shortcuts: [{ commandId: 'core/file/open' }] };
            expect(() => validateShortcutsConfig(config)).toThrow(ShortcutValidationError);
            expect(() => validateShortcutsConfig(config)).toThrow("missing 'shortcut' field");
        });

        it('should reject shortcuts missing commandId field', () => {
            const config = { shortcuts: [{ shortcut: 'Ctrl+O' }] };
            expect(() => validateShortcutsConfig(config)).toThrow(ShortcutValidationError);
            expect(() => validateShortcutsConfig(config)).toThrow("missing 'commandId' field");
        });

        it('should reject shortcuts with empty string values', () => {
            expect(() => validateShortcutsConfig({ shortcuts: [{ shortcut: '', commandId: 'core/file/open' }] }))
                .toThrow(ShortcutValidationError);
            expect(() => validateShortcutsConfig({ shortcuts: [{ shortcut: 'Ctrl+O', commandId: '' }] }))
                .toThrow(ShortcutValidationError);
        });

        it('should reject shortcuts with non-string values', () => {
            expect(() => validateShortcutsConfig({ shortcuts: [{ shortcut: 123, commandId: 'core/file/open' }] }))
                .toThrow(ShortcutValidationError);
            expect(() => validateShortcutsConfig({ shortcuts: [{ shortcut: 'Ctrl+O', commandId: null }] }))
                .toThrow(ShortcutValidationError);
        });

        it('should trim whitespace from string fields', () => {
            const config = { shortcuts: [{ shortcut: '  Ctrl+O  ', commandId: '  core/file/open  ' }] };
            const result = validateShortcutsConfig(config);
            expect(result.shortcuts[0].shortcut).toBe('Ctrl+O');
            expect(result.shortcuts[0].commandId).toBe('core/file/open');
        });
    });

    describe('convertToShortcutBindings', () => {
        it('should convert valid config to shortcut bindings', () => {
            const config = {
                shortcuts: [
                    { shortcut: 'Ctrl+O', commandId: 'core/file/open' },
                    { shortcut: 'Ctrl+W', commandId: 'file-close' }
                ]
            };

            const bindings = convertToShortcutBindings(config);
            expect(bindings).toHaveLength(2);
            expect(bindings[0]).toEqual({ shortcut: 'Ctrl+O', commandId: 'core/file/open' });
            expect(bindings[1]).toEqual({ shortcut: 'Ctrl+W', commandId: 'file-close' });
        });

        it('should handle empty shortcuts array', () => {
            expect(convertToShortcutBindings({ shortcuts: [] })).toEqual([]);
        });
    });

    describe('loadShortcutsFromJSON', () => {
        it('should load shortcuts from valid JSON string', () => {
            const json = JSON.stringify({
                shortcuts: [
                    { shortcut: 'Ctrl+O', commandId: 'core/file/open' },
                    { shortcut: 'Ctrl+W', commandId: 'file-close' }
                ]
            });

            const bindings = loadShortcutsFromJSON(json);
            expect(bindings).toHaveLength(2);
            expect(bindings[0]).toEqual({ shortcut: 'Ctrl+O', commandId: 'core/file/open' });
            expect(bindings[1]).toEqual({ shortcut: 'Ctrl+W', commandId: 'file-close' });
        });

        it('should reject invalid JSON', () => {
            const invalidJson = '{ "shortcuts": [invalid json] }';
            expect(() => loadShortcutsFromJSON(invalidJson)).toThrow(ShortcutValidationError);
            expect(() => loadShortcutsFromJSON(invalidJson)).toThrow('Invalid JSON');
        });

        it('should reject JSON with invalid structure', () => {
            const json = JSON.stringify({ shortcuts: [{ shortcut: 'Ctrl+O' /* missing commandId */ }] });
            expect(() => loadShortcutsFromJSON(json)).toThrow(ShortcutValidationError);
        });

        it('should handle empty shortcuts array', () => {
            const json = JSON.stringify({ shortcuts: [] });
            expect(loadShortcutsFromJSON(json)).toEqual([]);
        });
    });
});
