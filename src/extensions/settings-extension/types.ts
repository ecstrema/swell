// Types for settings-extension (moved from settings-register.ts)

export type SettingValue = string | number | boolean;

export type SettingType = 'enum' | 'boolean' | 'string' | 'number';

export type SettingChangeCallback = (value: SettingValue) => void;

export interface EnumOption {
    value: string;
    label: string;
}

export interface SettingMetadata {
    id: string;
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

export interface SettingsTree {
    id: string;
    content: (SettingsTree | SettingMetadata)[];
}
