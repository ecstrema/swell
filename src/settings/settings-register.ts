// Settings registry for managing application settings metadata

export type SettingType = 'enum' | 'boolean' | 'string' | 'number';

export interface EnumOption {
    value: string;
    label: string;
}

export interface SettingMetadata {
    path: string;
    description: string;
    type: SettingType;
    defaultValue: any;
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
}

// Global settings register instance
export const settingsRegister = new SettingsRegister();

// Register default settings
settingsRegister.register({
    path: 'Application/Color Theme',
    description: 'Choose the color theme for the application',
    type: 'enum',
    defaultValue: 'system',
    enumOptions: ['light', 'dark', 'system'],
    options: [
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' },
        { value: 'system', label: 'System' }
    ]
});
