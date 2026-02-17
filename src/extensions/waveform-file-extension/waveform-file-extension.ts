/**
 * Waveform File Extension
 * 
 * Provides functionality for loading, displaying, and managing waveform files.
 * Includes file displays, file manager, and signal trees.
 */

import { Extension, ExtensionContext } from "../types.js";
import { FileManager } from "./file-manager/file-manager.js";
import { saveStateToFile, loadStateFromFile } from "../../utils/state-file-io.js";
import { getStartupFiles } from "../../backend/index.js";
import "./file-display/file-display.js";
import "./trees/files-tree.js";
import "./trees/selected-signals-tree.js";

/**
 * API provided by the waveform file extension
 */
export interface WaveformFileAPI {
    /**
     * Get the file manager instance
     */
    getFileManager(): FileManager | null;
    
    /**
     * Handle startup files (called by app-main on startup)
     */
    handleStartupFiles(): Promise<void>;
}

export class WaveformFileExtension implements Extension {
    readonly metadata = {
        id: 'core/waveform-file',
        name: 'Waveform File Extension',
        description: 'Provides waveform file loading, display, and management',
    };

    private fileManager: FileManager | null = null;
    private context: ExtensionContext | null = null;

    async activate(context: ExtensionContext): Promise<WaveformFileAPI> {
        this.context = context;
        
        // The file manager is created by app-main
        // This extension ensures the custom elements are registered
        
        // Register file-related commands
        this.registerFileCommands(context);
        
        // Register zoom commands
        this.registerZoomCommands(context);
        
        // Register menu items
        this.registerFileMenus(context);
        
        // Listen for window-level zoom events and dispatch to active file
        this.setupZoomEventHandling(context);
        
        return {
            getFileManager: () => this.fileManager,
            handleStartupFiles: () => this.handleStartupFiles(),
        };
    }

    /**
     * Set the file manager instance (called by app-main after creating it)
     */
    setFileManager(fileManager: FileManager): void {
        this.fileManager = fileManager;
    }

    /**
     * Register file-related commands
     */
    private registerFileCommands(context: ExtensionContext): void {
        // Register file open command (dispatches event for app-main to handle coordination)
        context.registerCommand({
            id: 'file-open',
            label: 'Open File...',
            description: 'Open a waveform file',
            handler: () => this.dispatchFileOpenRequest(),
        });

        // Register open example command
        this.registerOpenExampleCommand(context);

        // Register save/load state commands
        context.registerCommand({
            id: 'file-save-state',
            label: 'Save State As...',
            description: 'Save the current waveform state',
            handler: () => this.handleSaveState(),
        });

        context.registerCommand({
            id: 'file-load-state',
            label: 'Load State...',
            description: 'Load a saved waveform state',
            handler: () => this.handleLoadState(),
        });

        // Register shortcuts
        context.registerShortcuts([
            {
                shortcut: 'Ctrl+O',
                commandId: 'file-open',
            },
        ]);
    }

    /**
     * Register file-related menus
     */
    private registerFileMenus(context: ExtensionContext): void {
        context.registerMenu({
            type: 'submenu',
            label: 'File',
            items: [
                {
                    type: 'item',
                    label: 'Open File...',
                    action: 'file-open',
                },
                {
                    type: 'item',
                    label: 'Open Example...',
                    action: 'open-example',
                },
                {
                    type: 'separator',
                },
                {
                    type: 'item',
                    label: 'Save State As...',
                    action: 'file-save-state',
                },
                {
                    type: 'item',
                    label: 'Load State...',
                    action: 'file-load-state',
                },
            ],
        });
    }

    /**
     * Register zoom commands for waveform viewing
     */
    private registerZoomCommands(context: ExtensionContext): void {
        context.registerCommand({
            id: 'core/view/zoom-in',
            label: 'Zoom In',
            description: 'Zoom in on the active waveform',
            handler: () => this.dispatchZoomCommand('zoom-in'),
        });

        context.registerCommand({
            id: 'core/view/zoom-out',
            label: 'Zoom Out',
            description: 'Zoom out on the active waveform',
            handler: () => this.dispatchZoomCommand('zoom-out'),
        });

        context.registerCommand({
            id: 'core/view/zoom-fit',
            label: 'Zoom to Fit',
            description: 'Fit the entire waveform in view',
            handler: () => this.dispatchZoomCommand('zoom-fit'),
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
     * Register open example command
     */
    private registerOpenExampleCommand(context: ExtensionContext): void {
        // Define example files with their descriptions
        const examples = [
            {
                filename: 'simple.vcd',
                description: 'Basic VCD waveform example with simple signals'
            },
            {
                filename: 'simple.ghw',
                description: 'Basic GHDL waveform with simple signals'
            },
            {
                filename: 'counter.vcd',
                description: 'VCD waveform showing a counter circuit'
            },
            {
                filename: 'example.fst',
                description: 'FST (Fast Signal Trace) format example'
            },
            {
                filename: 'time_test.ghw',
                description: 'GHDL waveform for testing time-based features'
            }
        ];

        context.registerCommand({
            id: 'open-example',
            label: 'Open Example...',
            description: 'Open an example waveform file',
            handler: async () => {
                // Get access to app's command palette through a workaround
                // This isn't ideal but necessary given current architecture
                const event = new CustomEvent('open-example-request', {
                    bubbles: true,
                    detail: { examples }
                });
                window.dispatchEvent(event);
            },
        });
    }

    /**
     * Get the file manager from app APIs
     */
    private getFileManager(): FileManager | null {
        // First try the stored reference
        if (this.fileManager) {
            return this.fileManager;
        }
        
        // Fall back to app APIs
        if (this.context?.app.getFileManager) {
            return this.context.app.getFileManager();
        }
        
        return null;
    }

    /**
     * Handle save state command
     */
    private async handleSaveState(): Promise<void> {
        const fileManager = this.getFileManager();
        if (!fileManager) {
            console.warn('File manager not available');
            return;
        }

        const activeFileId = fileManager.getActiveFileId();
        if (!activeFileId) {
            console.warn('No active file to save state');
            return;
        }

        const activeRes = fileManager.getFileResources(activeFileId);
        if (!activeRes) {
            console.warn('Active file resources not found');
            return;
        }

        try {
            const state = activeRes.element.getCurrentState();
            await saveStateToFile(activeFileId, state);
            console.log('State saved successfully');
        } catch (err) {
            console.error('Failed to save state:', err);
            alert(`Failed to save state: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    }

    /**
     * Handle load state command
     */
    private async handleLoadState(): Promise<void> {
        const fileManager = this.getFileManager();
        if (!fileManager) {
            console.warn('File manager not available');
            return;
        }

        try {
            const loaded = await loadStateFromFile();
            if (!loaded) {
                // User cancelled
                return;
            }

            const { filename, state } = loaded;

            // Check if the file is currently open
            const fileId = fileManager.getFileIdFromFilename(filename);
            if (!fileId) {
                alert(`The waveform file "${filename}" is not currently open. Please open it first.`);
                return;
            }

            const fileRes = fileManager.getFileResources(fileId);
            if (!fileRes) {
                console.warn('File resources not found');
                return;
            }

            // Apply the state to the file display
            await fileRes.element.applyState(state);

            // Dispatch event to notify app-main to activate the file
            if (fileManager.getActiveFileId() !== fileId) {
                const event = new CustomEvent('file-activate-request', {
                    bubbles: true,
                    detail: { fileId }
                });
                window.dispatchEvent(event);
            }

            console.log('State loaded successfully');
        } catch (err) {
            console.error('Failed to load state:', err);
            alert(`Failed to load state: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    }

    /**
     * Dispatch file open request event (for app-main to handle coordination)
     */
    private dispatchFileOpenRequest(): void {
        const event = new CustomEvent('file-open-request', { bubbles: true });
        window.dispatchEvent(event);
    }

    /**
     * Handle startup files from command-line arguments
     */
    async handleStartupFiles(): Promise<void> {
        const fileManager = this.getFileManager();
        if (!fileManager) {
            console.warn('File manager not available');
            return;
        }

        try {
            const startupFiles = await getStartupFiles();
            if (startupFiles.length > 0) {
                console.log(`Opening ${startupFiles.length} file(s) from command-line arguments:`, startupFiles);

                for (const filePath of startupFiles) {
                    const fileId = await fileManager.openFilePath(filePath);
                    if (fileId) {
                        console.log(`Successfully opened: ${filePath}`);
                    } else {
                        console.error(`Failed to open file: ${filePath}`);
                    }
                }
            }
        } catch (err) {
            console.error("Error handling startup files:", err);
        }
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

        const fileManager = this.getFileManager();
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
}
