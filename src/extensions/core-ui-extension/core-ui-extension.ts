/**
 * Core UI Extension
 * 
 * Manages UI coordination and view commands.
 * Handles netlist visibility, zoom commands, and theme updates.
 */

import { Extension, ExtensionContext } from "../types.js";

// Setting paths
const SETTING_NETLIST_VISIBLE = 'Interface/Netlist Visible';
const SETTING_UNDO_HISTORY_VISIBLE = 'Interface/Undo History Visible';

export class CoreUIExtension implements Extension {
    readonly metadata = {
        id: 'core/ui',
        name: 'Core UI Extension',
        description: 'Manages UI coordination and view commands',
    };

    private context: ExtensionContext | null = null;

    async activate(context: ExtensionContext): Promise<void> {
        this.context = context;

        // Register zoom commands
        this.registerZoomCommands(context);

        // Register netlist toggle command
        this.registerNetlistToggleCommand(context);

        // Register undo history toggle (enhanced version that also handles sidebar)
        this.registerUndoHistoryToggleCommand(context);

        // Register quit command (Tauri only)
        this.registerQuitCommand(context);
        
        // Listen for window-level zoom events and dispatch to active file
        this.setupZoomEventHandling(context);
    }

    /**
     * Register zoom commands
     */
    private registerZoomCommands(context: ExtensionContext): void {
        context.registerCommand({
            id: 'core/view/zoom-in',
            label: 'Zoom In',
            description: 'Zoom in on the active waveform',
            handler: () => {
                const event = new CustomEvent('zoom-command', {
                    detail: { action: 'zoom-in' },
                    bubbles: true
                });
                window.dispatchEvent(event);
            },
        });

        context.registerCommand({
            id: 'core/view/zoom-out',
            label: 'Zoom Out',
            description: 'Zoom out on the active waveform',
            handler: () => {
                const event = new CustomEvent('zoom-command', {
                    detail: { action: 'zoom-out' },
                    bubbles: true
                });
                window.dispatchEvent(event);
            },
        });

        context.registerCommand({
            id: 'core/view/zoom-fit',
            label: 'Zoom to Fit',
            description: 'Fit the entire waveform in view',
            handler: () => {
                const event = new CustomEvent('zoom-command', {
                    detail: { action: 'zoom-fit' },
                    bubbles: true
                });
                window.dispatchEvent(event);
            },
        });

        // Register shortcuts for zoom
        context.registerShortcuts([
            {
                shortcut: 'Ctrl+=',
                commandId: 'core/view/zoom-in',
            },
            {
                shortcut: 'Ctrl+-',
                commandId: 'core/view/zoom-out',
            },
            {
                shortcut: 'Ctrl+0',
                commandId: 'core/view/zoom-fit',
            },
        ]);

        // Register menu items
        context.registerMenu({
            type: 'submenu',
            label: 'View',
            items: [
                {
                    type: 'item',
                    label: 'Zoom In',
                    action: 'core/view/zoom-in',
                },
                {
                    type: 'item',
                    label: 'Zoom Out',
                    action: 'core/view/zoom-out',
                },
                {
                    type: 'item',
                    label: 'Zoom to Fit',
                    action: 'core/view/zoom-fit',
                },
            ],
        });
    }

    /**
     * Register netlist toggle command
     */
    private registerNetlistToggleCommand(context: ExtensionContext): void {
        context.registerCommand({
            id: 'core/view/toggle-netlist',
            label: 'Toggle Netlist View',
            description: 'Show or hide the netlist/hierarchy view',
            handler: () => this.toggleNetlist(),
        });

        context.registerShortcut({
            shortcut: 'Ctrl+Shift+H',
            commandId: 'core/view/toggle-netlist',
        });

        context.registerMenu({
            type: 'submenu',
            label: 'View',
            items: [
                {
                    type: 'separator',
                },
                {
                    type: 'item',
                    label: 'Toggle Netlist',
                    action: 'core/view/toggle-netlist',
                    checked: true, // Default to checked
                },
            ],
        });
    }

    /**
     * Register enhanced undo history toggle command
     */
    private registerUndoHistoryToggleCommand(context: ExtensionContext): void {
        // Note: Basic undo history is already registered in UndoExtension
        // This adds the enhanced version that also handles sidebar visibility
        context.registerCommand({
            id: 'core/view/toggle-undo-history-enhanced',
            label: 'Toggle Undo History (Enhanced)',
            description: 'Toggle undo history visibility with sidebar management',
            handler: () => this.toggleUndoHistory(),
        });
    }

    /**
     * Register quit command (Tauri only)
     */
    private registerQuitCommand(context: ExtensionContext): void {
        context.registerCommand({
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

        // Register shortcut (Ctrl+Q on Linux/Windows, Cmd+Q on Mac is handled by OS)
        context.registerShortcut({
            shortcut: 'Ctrl+Q',
            commandId: 'core/file/quit',
        });

        // Register menu item
        context.registerMenu({
            type: 'submenu',
            label: 'File',
            items: [
                {
                    type: 'separator',
                },
                {
                    type: 'item',
                    label: 'Quit',
                    action: 'core/file/quit',
                },
            ],
        });
    }

    /**
     * Set up zoom event handling - dispatch zoom commands to the active file display
     */
    private setupZoomEventHandling(context: ExtensionContext): void {
        window.addEventListener('zoom-command', (e: Event) => {
            const customEvent = e as CustomEvent<{ action: 'zoom-in' | 'zoom-out' | 'zoom-fit' }>;
            this.dispatchZoomCommand(customEvent.detail.action);
        });
    }

    /**
     * Dispatch zoom command to the active file display
     */
    private dispatchZoomCommand(action: 'zoom-in' | 'zoom-out' | 'zoom-fit'): void {
        if (!this.context) return;

        const fileManager = this.context.app.getFileManager?.();
        if (!fileManager) return;

        const activeFileId = fileManager.getActiveFileId();
        if (!activeFileId) return;

        const activeRes = fileManager.getFileResources(activeFileId);
        if (!activeRes) return;

        const event = new CustomEvent('zoom-command', {
            detail: { action },
            bubbles: false,
            composed: false
        });

        activeRes.element.dispatchEvent(event);
    }

    /**
     * Toggle the netlist view visibility
     */
    private async toggleNetlist(): Promise<void> {
        if (!this.context) return;

        const dockManager = this.context.app.getDockManager?.();
        if (!dockManager) return;

        // Import DockLayoutHelper to access the sidebar toggle logic
        const { DockLayoutHelper } = await import('../../components/dock-layout-helper.js');
        const dockLayoutHelper = new DockLayoutHelper(dockManager);
        
        const newVisibility = dockLayoutHelper.toggleSidebarVisibility();

        // Update the menu checkbox state - get menu bar from app-main shadow root
        const appMain = document.querySelector('app-main');
        if (appMain && appMain.shadowRoot) {
            const menuBar = appMain.shadowRoot.querySelector('app-menu-bar');
            if (menuBar && typeof (menuBar as any).updateMenuItemChecked === 'function') {
                (menuBar as any).updateMenuItemChecked('toggle-netlist', newVisibility);
            }
        }

        // Persist the setting
        try {
            const { setSetting } = await import('../settings-extension/settings-extension.js');
            await setSetting(SETTING_NETLIST_VISIBLE, newVisibility);
        } catch (error) {
            console.warn('Failed to persist netlist visibility setting:', error);
        }
    }

    /**
     * Toggle the undo history pane visibility
     */
    private async toggleUndoHistory(): Promise<void> {
        if (!this.context) return;

        const dockManager = this.context.app.getDockManager?.();
        if (!dockManager) return;

        // Import DockLayoutHelper to access the undo pane toggle logic
        const { DockLayoutHelper } = await import('../../components/dock-layout-helper.js');
        const dockLayoutHelper = new DockLayoutHelper(dockManager);
        
        const newVisibility = dockLayoutHelper.toggleUndoPaneVisibility();

        // Update the menu checkbox state - get menu bar from app-main shadow root
        const appMain = document.querySelector('app-main');
        if (appMain && appMain.shadowRoot) {
            const menuBar = appMain.shadowRoot.querySelector('app-menu-bar');
            if (menuBar && typeof (menuBar as any).updateMenuItemChecked === 'function') {
                (menuBar as any).updateMenuItemChecked('toggle-undo-history', newVisibility);
            }
        }

        // Persist the setting
        try {
            const { setSetting } = await import('../settings-extension/settings-extension.js');
            await setSetting(SETTING_UNDO_HISTORY_VISIBLE, newVisibility);
        } catch (error) {
            console.warn('Failed to persist undo history visibility setting:', error);
        }
    }
}
