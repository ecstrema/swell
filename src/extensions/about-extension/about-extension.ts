/**
 * About Extension
 *
 * Provides the about page with application information.
 * Demonstrates dependency on the settings extension.
 */

import { Extension } from "../types.js";
import { AboutPane } from "./about-pane.js";
import { SettingsExtension } from "../settings-extension/settings-extension.js";
import { DockExtension } from "../dock-extension/dock-extension.js";
import { CommandExtension } from "../command-extension/command-extension.js";
import { MenuExtension } from "../menu-extension/menu-extension.js";

// Ensure the custom element is registered
if (!customElements.get('about-pane')) {
    customElements.define('about-pane', AboutPane);
}

export class AboutExtension implements Extension {
    static readonly metadata = {
        id: 'core/about',
        name: 'About Extension',
        description: 'Provides application information and about page',
    };
    static readonly dependencies = [SettingsExtension, DockExtension, CommandExtension, MenuExtension];

    private settingsExtension: SettingsExtension;
    private dockExtension: DockExtension;
    private commandExtension: CommandExtension;
    private menuExtension: MenuExtension;

    constructor(dependencies: Map<string, Extension>) {
        this.settingsExtension = dependencies.get(SettingsExtension.metadata.id) as SettingsExtension;
        this.dockExtension = dependencies.get(DockExtension.metadata.id) as DockExtension;
        this.commandExtension = dependencies.get(CommandExtension.metadata.id) as CommandExtension;
        this.menuExtension = dependencies.get(MenuExtension.metadata.id) as MenuExtension;
    }

    async activate(): Promise<void> {
        this.dockExtension.registerContent('about', 'About', () => {
            const aboutPane = new AboutPane();
            aboutPane.id = 'about-pane';
            return aboutPane;
        });

        // Register a setting for the about page
        this.settingsExtension.registerSetting({
            path: 'About/Show Version Info',
            description: 'Show detailed version information in the about page',
            type: 'boolean',
            defaultValue: true,
        });

        // Register command to show about
        this.commandExtension.registerCommand({
            id: 'core/view/show-about',
            label: 'Show About',
            description: 'Show application information',
            handler: () => {
                const layoutHelper = this.dockExtension.getDockLayoutHelper();
                if (layoutHelper) {
                    layoutHelper.activatePane('about');
                }
            },
        });

        // Register menu item
        this.menuExtension.registerMenuItem('Help/About', () => {
             this.commandExtension.execute('core/view/show-about');
        }, {
             id: 'about',
        });
    }
}
