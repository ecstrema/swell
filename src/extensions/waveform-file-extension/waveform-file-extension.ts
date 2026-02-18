/**
 * Waveform File Extension
 *
 * Provides functionality for loading, displaying, and managing waveform files.
 * Includes file displays, file manager, and signal trees.
 */

import { Extension } from "../types.js";
import { CommandExtension } from "../command-extension/command-extension.js";
import { MenuExtension } from "../menu-extension/menu-extension.js";
import { FileManager } from "./file-manager/file-manager.js";
import { saveStateToFile, loadStateFromFile } from "../../utils/state-file-io.js";
import { getStartupFiles } from "../../backend/index.js";
import "./file-display/file-display.js";
import "./trees/files-tree.js";
import "./trees/selected-signals-tree.js";

export class WaveformFileExtension implements Extension {
    static readonly metadata = {
        id: 'core/waveform-file',
        name: 'Waveform File Extension',
        description: 'Provides waveform file loading, display, and management',
    };
    static readonly dependencies = [CommandExtension, MenuExtension];

    private commandExtension: CommandExtension;
    private menuExtension: MenuExtension;
    private fileManager: FileManager;

    constructor(dependencies: Map<string, Extension>) {
        this.commandExtension = dependencies.get(CommandExtension.metadata.id) as CommandExtension;
        this.menuExtension = dependencies.get(MenuExtension.metadata.id) as MenuExtension;
        // Create the file manager
        this.fileManager = new FileManager();
    }

    getFileManager(): FileManager {
        return this.fileManager;
    }

    async activate(): Promise<void> {
        // Register file-related commands
        this.registerFileCommands();

        // Register zoom commands
        this.registerZoomCommands();

        // Register menu items
        this.registerFileMenus();

        // Listen for window-level zoom events and dispatch to active file
        this.setupZoomEventHandling();
    }

    /**
     * Register file-related commands
     */
    private registerFileCommands(): void {
        // Register file open command (dispatches event for app-main to handle coordination)
        this.commandExtension.registerCommand({
            id: 'file-open',
            label: 'Open File...',
            description: 'Open a waveform file',
            handler: () => this.dispatchFileOpenRequest(),
        });

        // Register open example command
        this.registerOpenExampleCommand();

        // Register save/load state commands
        this.commandExtension.registerCommand({
            id: 'file-save-state',
            label: 'Save State As...',
            description: 'Save the current waveform state',
            handler: () => this.handleSaveState(),
        });

        this.commandExtension.registerCommand({
            id: 'file-load-state',
            label: 'Load State...',
            description: 'Load a saved waveform state',
            handler: () => this.handleLoadState(),
        });

        // Register shortcuts
        this.commandExtension.registerShortcuts([
            {
                shortcut: 'Ctrl+O',
                commandId: 'file-open',
            },
        ]);
    }

    /**
     * Register file-related menus
     */
    private registerFileMenus(): void {
        this.menuExtension.registerMenuItem('File/Open File...', () => {
             this.commandExtension.executeCommand('file-open');
        }, { id: 'file-open' });

        this.menuExtension.registerMenuItem('File/Open Example...', () => {
             // Dispatch event for examples dialog
             window.dispatchEvent(new CustomEvent('open-example-request'));
        }, { id: 'open-example' });

        this.menuExtension.registerMenuItem('File/-', undefined, { type: 'separator' });

        this.menuExtension.registerMenuItem('File/Save State As...', () => {
             this.handleSaveState();
        }, { id: 'file-save-state' });

        this.menuExtension.registerMenuItem('File/Load State...', () => {
             this.handleLoadState();
        }, { id: 'file-load-state' });
    }

    /**
     * Register zoom commands for waveform viewing
     */
    private registerZoomCommands(): void {
        this.commandExtension.registerCommand({
            id: 'core/view/zoom-in',
            label: 'Zoom In',
            description: 'Zoom in on the active waveform',
            handler: () => this.dispatchZoomCommand('zoom-in'),
        });

        this.commandExtension.registerCommand({
            id: 'core/view/zoom-out',
            label: 'Zoom Out',
            description: 'Zoom out on the active waveform',
            handler: () => this.dispatchZoomCommand('zoom-out'),
        });

        this.commandExtension.registerCommand({
            id: 'core/view/zoom-fit',
            label: 'Zoom to Fit',
            description: 'Fit the entire waveform in view',
            handler: () => this.dispatchZoomCommand('zoom-fit'),
        });

        // Register shortcuts for zoom
        this.commandExtension.registerShortcuts([
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

        this.menuExtension.registerMenuItem('View/Zoom/Zoom In', () => {
             this.dispatchZoomCommand('zoom-in');
        }, { id: 'zoom-in', commandId: 'core/view/zoom-in' });

        this.menuExtension.registerMenuItem('View/Zoom/Zoom Out', () => {
             this.dispatchZoomCommand('zoom-out');
        }, { id: 'zoom-out', commandId: 'core/view/zoom-out' });

        this.menuExtension.registerMenuItem('View/Zoom/Zoom to Fit', () => {
             this.dispatchZoomCommand('zoom-fit');
        }, { id: 'zoom-fit', commandId: 'core/view/zoom-fit' });
    }

    /**
     * Register open example command
     */
    private registerOpenExampleCommand(): void {
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

        this.commandExtension.registerCommand({
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
        return this.fileManager;
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
    private setupZoomEventHandling(): void {
        window.addEventListener('zoom-command', (e: Event) => {
            const customEvent = e as CustomEvent<{ action: 'zoom-in' | 'zoom-out' | 'zoom-fit' }>;
            this.dispatchZoomCommand(customEvent.detail.action);
        });
    }

    /**
     * Dispatch zoom command to the active file display
     */
    private dispatchZoomCommand(action: 'zoom-in' | 'zoom-out' | 'zoom-fit'): void {
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
