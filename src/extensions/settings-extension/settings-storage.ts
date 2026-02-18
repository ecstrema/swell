// Settings storage layer for reading/writing settings to JSON file

import { isTauri } from '../../backend/index.js';
import { invoke } from '@tauri-apps/api/core';
import { settingsRegister, SettingValue } from './settings-register.js';

const SETTINGS_FILE = 'settings.json';

/**
 * Get a setting value
 */
export async function getSetting(path: string): Promise<SettingValue | undefined> {
    if (isTauri) {
        try {
            return await invoke('get_setting', { path });
        } catch (e) {
            console.error(`Failed to get setting ${path}:`, e);
            // Return default value on error
            const metadata = settingsRegister.get(path);
            return metadata?.defaultValue;
        }
    } else {
        // Web mode: use localStorage
        try {
            const settingsJson = localStorage.getItem(SETTINGS_FILE);
            if (settingsJson) {
                const settings = JSON.parse(settingsJson);
                return getNestedValue(settings, path);
            }
        } catch (e) {
            console.error(`Failed to get setting ${path}:`, e);
        }
        // Return default value
        const metadata = settingsRegister.get(path);
        return metadata?.defaultValue;
    }
}

/**
 * Set a setting value
 */
export async function setSetting(path: string, value: SettingValue): Promise<void> {
    if (isTauri) {
        try {
            await invoke('set_setting', { path, value: JSON.stringify(value) });
            // Trigger callbacks after successful save
            settingsRegister.triggerCallbacks(path, value);
        } catch (e) {
            console.error(`Failed to set setting ${path}:`, e);
            throw e;
        }
    } else {
        // Web mode: use localStorage
        try {
            const settingsJson = localStorage.getItem(SETTINGS_FILE);
            const settings = settingsJson ? JSON.parse(settingsJson) : {};
            setNestedValue(settings, path, value);
            localStorage.setItem(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            // Trigger callbacks after successful save
            settingsRegister.triggerCallbacks(path, value);
        } catch (e) {
            console.error(`Failed to set setting ${path}:`, e);
            throw e;
        }
    }
}

/**
 * Get all settings
 */
export async function getAllSettings(): Promise<Record<string, any>> {
    if (isTauri) {
        try {
            return await invoke('get_all_settings');
        } catch (e) {
            console.error('Failed to get all settings:', e);
            return {};
        }
    } else {
        // Web mode: use localStorage
        try {
            const settingsJson = localStorage.getItem(SETTINGS_FILE);
            return settingsJson ? JSON.parse(settingsJson) : {};
        } catch (e) {
            console.error('Failed to get all settings:', e);
            return {};
        }
    }
}

/**
 * Helper to get nested value from object using path like "Application/Color Theme"
 */
function getNestedValue(obj: Record<string, any>, path: string): SettingValue | undefined {
    const parts = path.split('/');
    let current = obj;
    for (const part of parts) {
        if (current && typeof current === 'object' && part in current) {
            current = current[part];
        } else {
            return undefined;
        }
    }
    return current;
}

/**
 * Helper to set nested value in object using path like "Application/Color Theme"
 */
function setNestedValue(obj: Record<string, any>, path: string, value: SettingValue): void {
    const parts = path.split('/');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!(part in current) || typeof current[part] !== 'object') {
            current[part] = {};
        }
        current = current[part];
    }
    current[parts[parts.length - 1]] = value;
}
