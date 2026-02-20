/**
 * Settings Extension
 *
 * Provides the settings page and commands to show/hide it.
 * Contains the settings register and exports an API for other extensions to use.
 */

import { Extension } from "../types.js";
import { SettingsPage } from "./settings-page.js";
import { SettingMetadata, SettingValue, SettingChangeCallback, SettingsTree } from "./types.js";
import { DockExtension } from "../dock-extension/dock-extension.js";
import { CommandExtension } from "../command-extension/command-extension.js";
import { MenuExtension } from "../menu-extension/menu-extension.js";
import { Store } from "../../utils/persisted-store.js";

// Re-export types for external consumption
export type { SettingMetadata, SettingValue, SettingChangeCallback } from "./types.js";


export class SettingsExtension implements Extension {
    static readonly metadata = {
        id: 'core/settings',
        name: 'Settings Extension',
        description: 'Provides settings page and configuration interface',
    };
    static readonly dependencies = [DockExtension, CommandExtension, MenuExtension];

    private dockExtension: DockExtension;
    private commandExtension: CommandExtension;
    private menuExtension: MenuExtension;

    // In-memory settings registry (moved from SettingsRegister)
    private settings: Map<string, SettingMetadata> = new Map();
    private values = new Store("settings.json");
    private callbacks: Map<string, Set<SettingChangeCallback>> = new Map();

    constructor(dependencies: Map<string, Extension>) {
        this.dockExtension = dependencies.get(DockExtension.metadata.id) as DockExtension;
        this.commandExtension = dependencies.get(CommandExtension.metadata.id) as CommandExtension;
        this.menuExtension = dependencies.get(MenuExtension.metadata.id) as MenuExtension;
    }

    async activate(): Promise<void> {
        // Register the settings page as dock content
        this.dockExtension.registerContent('settings', 'Settings', () => new SettingsPage(this));

        this.registerSettingsCommand();
        this.registerSettingsMenu();
    }

    async getValue<T extends SettingValue = SettingValue>(id: string): Promise<T | undefined> {
        const value = await this.values.get(id);
        if (value !== undefined) return value as T;
        const setting = this.settings.get(id);
        return setting?.defaultValue as T | undefined;
    }

    async setValue(id: string, value: SettingValue): Promise<void> {
        await this.values.set(id, value);
        this.triggerCallbacks(id, value);
    }

    /**
     * Register a new setting (public API)
     */
    registerSetting(setting: SettingMetadata): void {
        this.settings.set(setting.id, setting);
        // Initialize value to default if not already set
        if (!this.values.has(setting.id) && setting.defaultValue !== undefined) {
            this.values.set(setting.id, setting.defaultValue);
        }
    }

    /**
     * Registry-style APIs (previously in SettingsRegister)
     */
    getMetadata(id: string): SettingMetadata | undefined {
        return this.settings.get(id);
    }

    getAllMetadata(): SettingMetadata[] {
        return Array.from(this.settings.values());
    }

    settingExists(id: string): boolean {
        return this.settings.has(id);
    }

    onSettingChange(settingId: string, callback: (value: any) => void): () => void {
        if (!this.callbacks.has(settingId)) this.callbacks.set(settingId, new Set());
        this.callbacks.get(settingId)!.add(callback as SettingChangeCallback);
        return () => {
            this.callbacks.get(settingId)?.delete(callback as SettingChangeCallback);
        };
    }

    getSettingsTree(): SettingsTree {
        const root: SettingsTree = { id: 'root', content: [] };

        for (const setting of this.getAllMetadata()) {
            const segments = setting.id.split('/').filter(Boolean);
            let currentNode = root;

            for (const segment of segments) {
                // find or create the child node for this path segment
                let child = currentNode.content.find(c => !('type' in c) && c.id === segment) as SettingsTree | undefined;
                if (!child) {
                    child = { id: segment, content: [] };
                    currentNode.content.push(child);
                }
                currentNode = child;
            }

            // place the metadata at the leaf node
            currentNode.content.push(setting);
        }

        return root;
    }

    private triggerCallbacks(settingId: string, value: SettingValue): void {
        const callbacks = this.callbacks.get(settingId);
        if (callbacks) {
            for (const cb of callbacks) cb(value);
        }
    }

    private registerSettingsCommand(): void {
        this.commandExtension.registerCommand({
            id: 'core/settings/open',
            label: 'Open Settings',
            description: 'Open the application settings',
            handler: () => this.openSettings(),
        });
    }

    private registerSettingsMenu(): void {
        this.menuExtension.registerMenuItem('File/-', undefined, { type: 'separator' });
        this.menuExtension.registerMenuItem('File/Settings...', () => {
             this.commandExtension.execute('core/settings/open');
        }, {
             id: 'settings',
        });
    }

    private openSettings(): void {
        const layoutHelper = this.dockExtension.getDockLayoutHelper();
        if (layoutHelper) {
             layoutHelper.activatePane('settings');
        }
    }
}
