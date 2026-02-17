/**
 * Settings Extension
 * 
 * Provides the settings page and commands to show/hide it.
 */

import { Extension, ExtensionContext } from "../types.js";
import { SettingsPage } from "../../components/settings-page/settings-page.js";

// Ensure the custom element is registered
if (!customElements.get('settings-page')) {
    customElements.define('settings-page', SettingsPage);
}

export class SettingsExtension implements Extension {
    readonly metadata = {
        id: 'core/settings',
        name: 'Settings Extension',
        description: 'Provides settings page and configuration interface',
        version: '1.0.0',
    };

    async activate(context: ExtensionContext): Promise<void> {
        const paneManager = context.app.getPaneManager?.();
        const dockManager = context.app.getDockManager?.();

        if (!paneManager || !dockManager) {
            console.warn('Settings extension: PaneManager or DockManager not available');
            return;
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
    }
}
