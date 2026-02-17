/**
 * Settings Extension
 * 
 * Provides the settings page and commands to show/hide it.
 * Contains the settings register and exports an API for other extensions to use.
 */

import { Extension, ExtensionContext } from "../types.js";
import { SettingsPage } from "./settings-page.js";
import { settingsRegister, SettingMetadata } from "./settings-register.js";

// Re-export types and functions that external code needs
export type { SettingMetadata, SettingValue } from "./settings-register.js";
export { settingsRegister } from "./settings-register.js";
export { getSetting, setSetting } from "./settings-storage.js";

// Ensure the custom element is registered
if (!customElements.get('settings-page')) {
    customElements.define('settings-page', SettingsPage);
}

/**
 * API provided by the settings extension
 */
export interface SettingsAPI {
    /**
     * Register a new setting
     */
    registerSetting(setting: SettingMetadata): void;
}

export class SettingsExtension implements Extension {
    readonly metadata = {
        id: 'core/settings',
        name: 'Settings Extension',
        description: 'Provides settings page and configuration interface',
    };

    async activate(context: ExtensionContext): Promise<SettingsAPI> {
        const paneManager = context.app.getPaneManager?.();
        const dockManager = context.app.getDockManager?.();

        if (!paneManager || !dockManager) {
            console.warn('Settings extension: PaneManager or DockManager not available');
            // Still return API even if UI can't be registered
            return {
                registerSetting: (setting: SettingMetadata) => settingsRegister.register(setting),
            };
        }

        // Register the settings page
        context.registerPage({
            id: 'settings',
            title: 'Settings',
            icon: '⚙️',
            factory: () => {
                const settingsPage = new SettingsPage();
                settingsPage.id = 'settings-panel';
                return settingsPage;
            },
        });

        // Register content with dock manager
        dockManager.registerContent('settings', () => {
            const settingsPage = new SettingsPage();
            settingsPage.id = 'settings-panel';
            return settingsPage;
        });

        // Register command to show settings
        context.registerCommand({
            id: 'core/view/show-settings',
            label: 'Show Settings',
            description: 'Open the settings page',
            handler: () => {
                paneManager.activatePane('settings-pane', 'Settings', 'settings', true);
            },
        });

        // Register shortcut to show settings
        context.registerShortcut({
            shortcut: 'Ctrl+,',
            commandId: 'core/view/show-settings',
        });

        // Register menu item
        context.registerMenu({
            type: 'submenu',
            label: 'View',
            items: [
                {
                    type: 'item',
                    label: 'Settings',
                    action: 'core/view/show-settings',
                },
            ],
        });

        // Return the API for other extensions to use
        return {
            registerSetting: (setting: SettingMetadata) => settingsRegister.register(setting),
        };
    }
}
