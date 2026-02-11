// Tests for settings system

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock backend before importing
vi.mock('../backend.js', () => ({
    isTauri: false,
    invoke: vi.fn()
}));

vi.mock('../../backend/pkg/backend', () => ({
    default: vi.fn()
}));

vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn()
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
    open: vi.fn()
}));

import { settingsRegister, SettingsRegister } from './settings-register';
import { getSetting, setSetting } from './settings-storage';

// Mock localStorage for testing
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value;
        },
        clear: () => {
            store = {};
        }
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
});

describe('Settings Register', () => {
    it('should register and retrieve settings', () => {
        const register = new SettingsRegister();
        
        register.register({
            path: 'Test/Setting',
            description: 'A test setting',
            type: 'string',
            defaultValue: 'test'
        });
        
        const setting = register.get('Test/Setting');
        expect(setting).toBeDefined();
        expect(setting?.type).toBe('string');
        expect(setting?.defaultValue).toBe('test');
    });

    it('should group settings by category', () => {
        const register = new SettingsRegister();
        
        register.register({
            path: 'App/Setting1',
            description: 'Setting 1',
            type: 'string',
            defaultValue: 'test1'
        });
        
        register.register({
            path: 'App/Setting2',
            description: 'Setting 2',
            type: 'string',
            defaultValue: 'test2'
        });
        
        register.register({
            path: 'Editor/Setting1',
            description: 'Editor Setting',
            type: 'boolean',
            defaultValue: true
        });
        
        const grouped = register.getGrouped();
        expect(grouped.size).toBe(2);
        expect(grouped.get('App')?.length).toBe(2);
        expect(grouped.get('Editor')?.length).toBe(1);
    });

    it('should have default color theme setting', () => {
        const setting = settingsRegister.get('Application/Color Theme');
        expect(setting).toBeDefined();
        expect(setting?.type).toBe('enum');
        expect(setting?.enumOptions).toEqual(['light', 'dark', 'system']);
    });
});

describe('Settings Storage', () => {
    beforeEach(() => {
        localStorageMock.clear();
    });

    it('should save and retrieve string setting', async () => {
        await setSetting('Test/StringSetting', 'hello');
        const value = await getSetting('Test/StringSetting');
        expect(value).toBe('hello');
    });

    it('should save and retrieve boolean setting', async () => {
        await setSetting('Test/BooleanSetting', true);
        const value = await getSetting('Test/BooleanSetting');
        expect(value).toBe(true);
    });

    it('should save and retrieve enum setting', async () => {
        await setSetting('Application/Color Theme', 'dark');
        const value = await getSetting('Application/Color Theme');
        expect(value).toBe('dark');
    });

    it('should return default value when setting not found', async () => {
        const value = await getSetting('Application/Color Theme');
        // Should return default value from register
        expect(value).toBe('system');
    });

    it('should handle nested paths correctly', async () => {
        await setSetting('Level1/Level2/Setting', 'nested-value');
        const value = await getSetting('Level1/Level2/Setting');
        expect(value).toBe('nested-value');
    });
});
