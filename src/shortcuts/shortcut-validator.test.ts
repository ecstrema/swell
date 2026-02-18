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
                    {
                        shortcut: 'Ctrl+O',
                        commandId: 'core/file/open',
                        description: 'Open file'
                    },
                    {
                        shortcut: 'Ctrl+W',
                        commandId: 'file-close'
                    }
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
            const config = {
                shortcuts: [
                    {
                        commandId: 'core/file/open'
                    }
                ]
            };

            expect(() => validateShortcutsConfig(config)).toThrow(ShortcutValidationError);
            expect(() => validateShortcutsConfig(config)).toThrow('missing \'shortcut\' field');
        });

        it('should reject shortcuts missing commandId field', () => {
            const config = {
                shortcuts: [
                    {
                        shortcut: 'Ctrl+O'
                    }
                ]
            };

            expect(() => validateShortcutsConfig(config)).toThrow(ShortcutValidationError);
            expect(() => validateShortcutsConfig(config)).toThrow('missing \'commandId\' field');
        });

        it('should reject shortcuts with empty string values', () => {
            const config1 = {
                shortcuts: [
                    {
                        shortcut: '',
                        commandId: 'core/file/open'
                    }
                ]
            };

            expect(() => validateShortcutsConfig(config1)).toThrow(ShortcutValidationError);

            const config2 = {
                shortcuts: [
                    {
                        shortcut: 'Ctrl+O',
                        commandId: ''
                    }
                ]
            };

            expect(() => validateShortcutsConfig(config2)).toThrow(ShortcutValidationError);
        });

        it('should reject shortcuts with non-string values', () => {
            const config1 = {
                shortcuts: [
                    {
                        shortcut: 123,
                        commandId: 'core/file/open'
                    }
                ]
            };

            expect(() => validateShortcutsConfig(config1)).toThrow(ShortcutValidationError);

            const config2 = {
                shortcuts: [
                    {
                        shortcut: 'Ctrl+O',
                        commandId: null
                    }
                ]
            };

            expect(() => validateShortcutsConfig(config2)).toThrow(ShortcutValidationError);
        });

        it('should reject shortcuts with invalid description type', () => {
            const config = {
                shortcuts: [
                    {
                        shortcut: 'Ctrl+O',
                        commandId: 'core/file/open',
                        description: 123
                    }
                ]
            };

            expect(() => validateShortcutsConfig(config)).toThrow(ShortcutValidationError);
            expect(() => validateShortcutsConfig(config)).toThrow('invalid \'description\' field');
        });

        it('should accept shortcuts with valid optional description', () => {
            const config = {
                shortcuts: [
                    {
                        shortcut: 'Ctrl+O',
                        commandId: 'core/file/open',
                        description: 'Open a file'
                    }
                ]
            };

            const result = validateShortcutsConfig(config);
            expect(result.shortcuts[0].description).toBe('Open a file');
        });

        it('should accept shortcuts without description', () => {
            const config = {
                shortcuts: [
                    {
                        shortcut: 'Ctrl+O',
                        commandId: 'core/file/open'
                    }
                ]
            };

            const result = validateShortcutsConfig(config);
            expect(result.shortcuts[0].description).toBeUndefined();
        });

        it('should trim whitespace from string fields', () => {
            const config = {
                shortcuts: [
                    {
                        shortcut: '  Ctrl+O  ',
                        commandId: '  core/file/open  ',
                        description: '  Open a file  '
                    }
                ]
            };

            const result = validateShortcutsConfig(config);
            expect(result.shortcuts[0].shortcut).toBe('Ctrl+O');
            expect(result.shortcuts[0].commandId).toBe('core/file/open');
            expect(result.shortcuts[0].description).toBe('Open a file');
        });
    });

    describe('convertToShortcutBindings', () => {
        it('should convert valid config to shortcut bindings', () => {
            const config = {
                shortcuts: [
                    {
                        shortcut: 'Ctrl+O',
                        commandId: 'core/file/open',
                        description: 'Open file'
                    },
                    {
                        shortcut: 'Ctrl+W',
                        commandId: 'file-close'
                    }
                ]
            };

            const bindings = convertToShortcutBindings(config);

            expect(bindings).toHaveLength(2);
            expect(bindings[0]).toEqual({
                shortcut: 'Ctrl+O',
                commandId: 'core/file/open'
            });
            expect(bindings[1]).toEqual({
                shortcut: 'Ctrl+W',
                commandId: 'file-close'
            });
            // Description should not be in the output
            expect('description' in bindings[0]).toBe(false);
        });

        it('should handle empty shortcuts array', () => {
            const config = {
                shortcuts: []
            };

            const bindings = convertToShortcutBindings(config);
            expect(bindings).toEqual([]);
        });
    });

    describe('loadShortcutsFromJSON', () => {
        it('should load shortcuts from valid JSON string', () => {
            const json = JSON.stringify({
                shortcuts: [
                    {
                        shortcut: 'Ctrl+O',
                        commandId: 'core/file/open'
                    },
                    {
                        shortcut: 'Ctrl+W',
                        commandId: 'file-close',
                        description: 'Close file'
                    }
                ]
            });

            const bindings = loadShortcutsFromJSON(json);

            expect(bindings).toHaveLength(2);
            expect(bindings[0]).toEqual({
                shortcut: 'Ctrl+O',
                commandId: 'core/file/open'
            });
            expect(bindings[1]).toEqual({
                shortcut: 'Ctrl+W',
                commandId: 'file-close'
            });
        });

        it('should reject invalid JSON', () => {
            const invalidJson = '{ "shortcuts": [invalid json] }';

            expect(() => loadShortcutsFromJSON(invalidJson)).toThrow(ShortcutValidationError);
            expect(() => loadShortcutsFromJSON(invalidJson)).toThrow('Invalid JSON');
        });

        it('should reject JSON with invalid structure', () => {
            const json = JSON.stringify({
                shortcuts: [
                    {
                        shortcut: 'Ctrl+O'
                        // missing commandId
                    }
                ]
            });

            expect(() => loadShortcutsFromJSON(json)).toThrow(ShortcutValidationError);
        });

        it('should handle empty shortcuts array', () => {
            const json = JSON.stringify({
                shortcuts: []
            });

            const bindings = loadShortcutsFromJSON(json);
            expect(bindings).toEqual([]);
        });
    });
});
