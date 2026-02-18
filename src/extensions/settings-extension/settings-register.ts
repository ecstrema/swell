// Settings registry for managing application settings metadata

export type SettingValue = string | number | boolean;

export type SettingType = 'enum' | 'boolean' | 'string' | 'number';

export type SettingChangeCallback = (value: SettingValue) => void;

export interface EnumOption {
    value: string;
    label: string;
}

export interface SettingMetadata {
    path: string;
    description: string;
    type: SettingType;
    defaultValue: SettingValue;
    // For enum type
    enumOptions?: string[];
    // For displaying enum options with custom labels
    options?: EnumOption[];
    // For number type
    min?: number;
    max?: number;
    step?: number;
}

/**
 * Registry for application settings
 * Allows components to register and query settings metadata
 */
export class SettingsRegister {
    private settings: Map<string, SettingMetadata> = new Map();
    private callbacks: Map<string, Set<SettingChangeCallback>> = new Map();

    /**
     * Register a setting with its metadata
     */
    register(setting: SettingMetadata): void {
        this.settings.set(setting.path, setting);
    }

    /**
     * Get metadata for a specific setting
     */
    get(path: string): SettingMetadata | undefined {
        return this.settings.get(path);
    }

    /**
     * Get all registered settings
     */
    getAll(): SettingMetadata[] {
        return Array.from(this.settings.values());
    }

    /**
     * Check if a setting exists
     */
    has(path: string): boolean {
        return this.settings.has(path);
    }

    /**
     * Get settings grouped by category (top-level path segment)
     */
    getGrouped(): Map<string, SettingMetadata[]> {
        const grouped = new Map<string, SettingMetadata[]>();

        for (const setting of this.settings.values()) {
            const category = setting.path.split('/')[0];
            if (!grouped.has(category)) {
                grouped.set(category, []);
            }
            grouped.get(category)!.push(setting);
        }

        return grouped;
    }

    /**
     * Register a callback to be invoked when a setting changes
     * @param path The setting path to watch
     * @param callback The callback to invoke when the setting changes
     * @returns A function to unregister the callback
     */
    onChange(path: string, callback: SettingChangeCallback): () => void {
        if (!this.callbacks.has(path)) {
            this.callbacks.set(path, new Set());
        }
        this.callbacks.get(path)!.add(callback);

        // Return unsubscribe function
        return () => {
            this.callbacks.get(path)?.delete(callback);
        };
    }

    /**
     * Trigger all callbacks registered for a setting path
     * Called when a setting value changes
     */
    triggerCallbacks(path: string, value: SettingValue): void {
        const callbacks = this.callbacks.get(path);
        if (callbacks) {
            for (const callback of callbacks) {
                callback(value);
            }
        }
    }
}

// Global settings register instance
export const settingsRegister = new SettingsRegister();

// Register default settings
settingsRegister.register({
    path: 'Interface/Tree Indent',
    description: 'Indentation in pixels for tree hierarchy levels',
    type: 'number',
    defaultValue: 20,
    min: 0,
    max: 60,
    step: 1
});

settingsRegister.register({
    path: 'Waveform/Alternating Row Pattern',
    description: 'Number of rows in alternating background pattern (e.g., 3 means 3 on, 3 off)',
    type: 'number',
    defaultValue: 3,
    min: 1,
    max: 10,
    step: 1
});
