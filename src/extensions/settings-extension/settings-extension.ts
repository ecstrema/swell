/**
 * Settings Extension
 *
 * Provides the settings page and commands to show/hide it.
 * Contains the settings register and exports an API for other extensions to use.
 */

import { Extension } from "../types.js";
import { SettingsPage } from "./settings-page.js";
import { settingsRegister, SettingMetadata } from "./settings-register.js";
import { DockExtension } from "../dock-extension/dock-extension.js";
import { CommandExtension } from "../command-extension/command-extension.js";
import { MenuExtension } from "../menu-extension/menu-extension.js";

// Re-export types and functions that external code needs
export type { SettingMetadata, SettingValue } from "./settings-register.js";
export { settingsRegister } from "./settings-register.js";
import { getSetting as getSettingStorage, setSetting as setSettingStorage } from "./settings-storage.js";
export { getSetting, setSetting } from "./settings-storage.js";

// Ensure the custom element is registered
if (!customElements.get('settings-page')) {
    customElements.define('settings-page', SettingsPage);
}

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
    private settingsPage: SettingsPage | null = null;

    constructor(dependencies: Map<string, Extension>) {
        this.dockExtension = dependencies.get(DockExtension.metadata.id) as DockExtension;
        this.commandExtension = dependencies.get(CommandExtension.metadata.id) as CommandExtension;
        this.menuExtension = dependencies.get(MenuExtension.metadata.id) as MenuExtension;
    }

    async activate(): Promise<void> {
        this.registerSettingsCommand();
        this.registerSettingsMenu();
    }

    /**
     * Register a new setting
     */
    registerSetting(setting: SettingMetadata): void {
        settingsRegister.register(setting);
    }

    /**
     * Get a setting value
     */
    async getSetting(path: string): Promise<any> {
        return getSettingStorage(path);
    }

    /**
     * Set a setting value
     */
    async setSetting(path: string, value: any): Promise<void> {
        return setSettingStorage(path, value);
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
             this.commandExtension.executeCommand('core/settings/open');
        }, {
             id: 'settings',
        });
    }

    private openSettings(): void {
        const layoutHelper = this.dockExtension.getDockLayoutHelper();
        if (layoutHelper) {
             layoutHelper.activatePane('settings-panel', 'Settings', 'settings', true);
        }
    }
}
