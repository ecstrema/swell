/**
 * Core UI Extension
 *
 * Manages UI coordination and view commands.
 */

import { Extension } from "../types.js";
import { DockExtension } from "../dock-extension/dock-extension.js";
import { CommandExtension } from "../command-extension/command-extension.js";
import { MenuExtension } from "../menu-extension/menu-extension.js";

export class CoreUIExtension implements Extension {
    static readonly metadata = {
        id: 'core/ui',
        name: 'Core UI Extension',
        description: 'Manages UI coordination and view commands',
    };
    static readonly dependencies = [DockExtension, CommandExtension, MenuExtension];

    private dockExtension: DockExtension;
    private commandExtension: CommandExtension;
    private menuExtension: MenuExtension;

    constructor(dependencies: Map<string, Extension>) {
        this.dockExtension = dependencies.get(DockExtension.metadata.id) as DockExtension;
        this.commandExtension = dependencies.get(CommandExtension.metadata.id) as CommandExtension;
        this.menuExtension = dependencies.get(MenuExtension.metadata.id) as MenuExtension;
    }

    async activate(): Promise<void> {
        // Register netlist toggle command
        this.registerNetlistToggleCommand();

        // Register quit command (Tauri only)
        this.registerQuitCommand();
    }

    /**
     * Register netlist toggle command
     */
    private registerNetlistToggleCommand(): void {
        this.commandExtension.registerCommand({
            id: 'core/view/toggle-netlist',
            label: 'Toggle Netlist View',
            description: 'Show or hide the netlist/hierarchy view',
            handler: () => this.toggleNetlist(),
        });

        this.menuExtension.registerMenuItem('View/-', undefined, { type: 'separator' });
        this.menuExtension.registerMenuItem('View/Toggle Netlist', () => {
             this.toggleNetlist();
        }, {
             type: 'checkbox',
             checked: true,
             id: 'toggle-netlist',
             commandId: 'core/view/toggle-netlist'
        });
    }

    /**
     * Register quit command (Tauri only)
     */
    private registerQuitCommand(): void {
        this.commandExtension.registerCommand({
            id: 'core/file/quit',
            label: 'Quit',
            description: 'Quit the application',
            handler: async () => {
                // Only available in Tauri
                const { isTauri } = await import('../../backend/index.js');
                if (isTauri) {
                    const { getCurrentWindow } = await import('@tauri-apps/api/window');
                    await getCurrentWindow().close();
                }
            },
        });

        // Register menu item
        this.menuExtension.registerMenuItem('File/-', undefined, { type: 'separator' });
        this.menuExtension.registerMenuItem('File/Quit', () => {
             this.commandExtension.execute('core/file/quit');
        });
    }

    /**
     * Toggle the netlist view visibility
     */
    private toggleNetlist(): void {
        const layoutHelper = this.dockExtension.getDockLayoutHelper();
        if (!layoutHelper) return;

        const newVisibility = layoutHelper.toggleSidebarVisibility();

        // Update the menu checkbox state
        this.menuExtension.updateMenuItem('toggle-netlist', { checked: newVisibility });
    }
}
