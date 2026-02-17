import { restoreSession, getStartupFiles } from "../../backend/index.js";
import "../menu/menu-bar.ts";
import { MenuBar } from "../menu/menu-bar.js";
import "../trees/files-tree.ts";
import { FilesTree } from "../trees/files-tree.js";
import { themeManager } from "../../theme/index.js";
import { DockManager } from "../docking/dock-manager.js";
import { DockStack } from "../docking/types.js";
import { css } from "../../utils/css-utils.js";
import { updateDocumentTitle } from "../../utils/title-utils.js";
import appMainCss from "./app-main.css?inline";
import "../docking/index.js";
import { FileManager } from "../file-manager/file-manager.js";
import { CommandManager } from "../command/command-manager.js";
import { DockLayoutHelper } from "../dock-layout-helper.js";
import { PaneManager } from "../panels/pane-manager.js";
import { UndoManager } from "../../undo/undo-manager.js";
import { UndoableOperation } from "../../undo/undo-tree.js";
import { saveStateToFile, loadStateFromFile } from "../../utils/state-file-io.js";
import { dockStatePersistence } from "../docking/dock-state-persistence.js";

// Setting paths
const SETTING_SIGNAL_SELECTION_VISIBLE = 'Interface/Signal Selection Visible';
const SETTING_UNDO_HISTORY_VISIBLE = 'Interface/Undo History Visible';



export class AppMain extends HTMLElement {
    // Managers
    private fileManager: FileManager;
    private commandManager: CommandManager;
    private dockLayoutHelper: DockLayoutHelper;
    private paneManager: PaneManager;
    private undoManager: UndoManager;

    // Docking system
    private dockManager: DockManager;
    private hierarchyTree: FilesTree;
    private fileViewContainer: HTMLElement;
    private menuBar: MenuBar | null = null;

    constructor() {
        super();

        // Initialize managers
        this.fileManager = new FileManager();
        this.commandManager = new CommandManager();
        this.undoManager = new UndoManager();

        this.attachShadow({ mode: 'open' });
        this.shadowRoot!.adoptedStyleSheets = [css(appMainCss)];

        this.shadowRoot!.innerHTML = `
        <app-menu-bar></app-menu-bar>

        <div class="container">
            <div id="workspace">
                <dock-manager id="main-dock"></dock-manager>
            </div>
        </div>
        `;

        this.dockManager = this.shadowRoot!.getElementById('main-dock') as DockManager;
        
        // Initialize dock helpers after dock manager is created
        this.dockLayoutHelper = new DockLayoutHelper(this.dockManager);
        this.paneManager = new PaneManager(this.dockManager, this.dockLayoutHelper);

        // Initialize docked elements
        this.hierarchyTree = new FilesTree();
        this.hierarchyTree.id = 'hierarchy-tree';

        this.fileViewContainer = document.createElement('div');
        this.fileViewContainer.className = 'dockable-content';
        this.fileViewContainer.innerHTML = `
            <app-tab-bar id="tabs"></app-tab-bar>
            <main id="content-area" style="flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative;">
                <div id="empty-state" class="empty-state">
                    <h1>Wave View</h1>
                    <div class="row">
                        <button id="file-picker-btn">Open File</button>
                    </div>
                </div>
                <div id="files-container"></div>
            </main>
        `;

        // Register components for the docking system
        this.dockManager.registerContent('signal-selection', () => this.hierarchyTree);
        this.dockManager.registerContent('file-view', () => this.fileViewContainer);

        // Set up dock state persistence - save state whenever layout changes
        this.dockManager.onLayoutChange((layout) => {
            dockStatePersistence.saveState(layout);
        });

        // Set initial layout (will be replaced by saved state if available)
        this.dockManager.layout = {
            root: {
                type: 'box',
                id: 'root-box',
                direction: 'row',
                weight: 1,
                children: [
                    {
                        type: 'stack',
                        id: 'main-stack',
                        weight: 100,
                        activeId: null,
                        children: []
                    }
                ]
            }
        };
    }

    async connectedCallback() {
        // Restore dock layout from saved state
        await this.restoreDockLayout();

        // Restore session (web only - Tauri handles this on startup)
        await restoreSession();

        // Handle startup files from command-line arguments (Tauri only)
        await this.handleStartupFiles();

        // Initialize extensions
        await this.initializeExtensions();

        // Initialize shortcut system
        this.initializeShortcuts();

        // Pass shortcut manager to menu bar and store reference
        const menuBar = this.shadowRoot!.querySelector('app-menu-bar');
        if (menuBar instanceof MenuBar) {
            this.menuBar = menuBar;
            menuBar.setShortcutManager(this.commandManager.getShortcutManager());
        }

        // Initialize command palette
        this.commandManager.initializeCommandPalette();

        // Add demo undo tree command
        this.initializeDemoUndoTree();

        // Listeners
        this.addEventListener('file-open-request', () => this.handleFileOpen());

        // Listen for open example request - execute the command which will show the selection palette
        this.addEventListener('open-example-request', () => {
            this.commandManager.getCommandRegistry().execute('open-example');
        });

        // Listen for file picker button click in empty state
        const filePickerBtn = this.fileViewContainer.querySelector('#file-picker-btn');
        if (filePickerBtn) {
            filePickerBtn.addEventListener('click', () => this.handleFileOpen());
        }

        // Listen for settings open request - execute the settings command
        this.addEventListener('settings-open-request', () => {
            this.commandManager.getCommandRegistry().execute('core/view/show-settings');
        });

        // Listen for about open request - execute the about command
        this.addEventListener('about-open-request', () => {
            this.commandManager.getCommandRegistry().execute('core/view/show-about');
        });

        // Listen for undo tree panel open request - execute the undo tree command
        this.addEventListener('undo-tree-open-request', () => {
            this.commandManager.getCommandRegistry().execute('core/view/show-undo-tree');
        });

        // Listen for undo tree node selection
        this.addEventListener('node-select', (e: Event) => {
            const customEvent = e as CustomEvent<{ nodeId: string }>;
            this.undoManager.navigateTo(customEvent.detail.nodeId);
        });

        // Listen for setting changes to update theme
        this.addEventListener('setting-changed', (e: Event) => {
            const customEvent = e as CustomEvent;
            const { path, value } = customEvent.detail;

            // Handle theme changes
            if (path === 'Application/Color Theme') {
                themeManager.setTheme(value);
            }
        });

        // Listen for menu actions and route them through command registry
        this.addEventListener('menu-action', (e: Event) => {
            const customEvent = e as CustomEvent;
            const action = customEvent.detail;
            if (action && this.commandManager.getCommandRegistry().has(action)) {
                this.commandManager.getCommandRegistry().execute(action);
            }
        });

        // Listen for pane close events from dock stack
        this.addEventListener('pane-close', (e: any) => {
            const paneId = e.detail.id;
            
            // Handle settings pane close
            if (paneId === 'settings-pane') {
                this.paneManager.closePane('settings-pane');
                return;
            }
            
            // Handle about pane close
            if (paneId === 'about-pane') {
                this.paneManager.closePane('about-pane');
                return;
            }
            
            // Handle undo tree pane close
            if (paneId === 'undo-tree-pane') {
                this.paneManager.closePane('undo-tree-pane');
                return;
            }
            
            // Extract file ID from pane ID (format: "file-pane-{fileId}")
            if (paneId.startsWith('file-pane-')) {
                const fileId = paneId.substring('file-pane-'.length);
                this.closeFile(fileId);
            }
        });

        // Listen for pane select events from dock stack
        this.addEventListener('pane-select', (e: any) => {
            const paneId = e.detail.id;
            // Extract file ID from pane ID (format: "file-pane-{fileId}")
            if (paneId.startsWith('file-pane-')) {
                const fileId = paneId.substring('file-pane-'.length);
                this.setActiveFile(fileId);
            }
        });

        // Listen for selected signals changes to update hierarchy tree checkboxes
        this.addEventListener('selected-signals-changed', (e: Event) => {
            const customEvent = e as CustomEvent<{ filename: string; signalRefs: number[] }>;
            const { filename, signalRefs } = customEvent.detail;
            // Only update if this is for the active file
            if (filename === this.fileManager.getActiveFileId()) {
                this.hierarchyTree.selectedSignalRefs = signalRefs;
            }
        });

        await this.refreshFiles();
    }

    disconnectedCallback() {
        // Clean up command manager (includes shortcuts and command palette)
        this.commandManager.deactivate();
        
        // Cancel any pending dock state saves
        dockStatePersistence.cancelPendingSave();
    }

    /**
     * Restore saved dock layout from persistent storage
     */
    private async restoreDockLayout() {
        const savedLayout = await dockStatePersistence.loadState();
        if (savedLayout) {
            console.log('Restoring saved dock layout');
            this.dockManager.setLayoutSilent(savedLayout);
        }
    }

    /**
     * Initialize extensions
     */
    private async initializeExtensions() {
        // Provide app APIs to extensions
        this.commandManager.setAppAPIs({
            getUndoManager: () => this.undoManager,
            getFileManager: () => this.fileManager,
            getPaneManager: () => this.paneManager,
            getDockManager: () => this.dockManager,
        });

        // Initialize extensions in the command manager
        await this.commandManager.initializeExtensions();

        // Register pages from extensions with the dock manager
        const extensionRegistry = this.commandManager.getExtensionRegistry();
        const pages = extensionRegistry.getPages();
        
        for (const page of pages) {
            // Register each page's factory with the dock manager
            this.dockManager.registerContent(page.id, page.factory);
        }

        // Update the show commands command to actually open the commands view
        this.commandManager.getCommandRegistry().register({
            id: 'core/commands/show',
            label: 'Show All Commands',
            description: 'Display all registered commands with their shortcuts',
            handler: () => {
                // Activate the commands view pane
                this.activateCommandsViewPane();
            },
        });
    }

    /**
     * Initialize the shortcut system with commands and bindings
     */
    private initializeShortcuts() {
        this.commandManager.initializeShortcuts({
            onFileOpen: () => this.handleFileOpen(),
            onFileQuit: async () => {
                // Only available in Tauri, not on web
                const { isTauri } = await import('../../backend/index.js');
                if (isTauri) {
                    const { getCurrentWindow } = await import('@tauri-apps/api/window');
                    await getCurrentWindow().close();
                }
            },
            onZoomIn: () => {
                // Dispatch zoom-in event for the active file display
                this.dispatchZoomCommand('zoom-in');
            },
            onZoomOut: () => {
                // Dispatch zoom-out event for the active file display
                this.dispatchZoomCommand('zoom-out');
            },
            onZoomFit: () => {
                // Dispatch zoom-fit event for the active file display
                this.dispatchZoomCommand('zoom-fit');
            },
            onToggleSignalSelection: () => {
                this.toggleSignalSelection();
            },
        });

        // Register save/load state commands
        this.commandManager.getCommandRegistry().register({
            id: 'file-save-state',
            label: 'Save State As...',
            handler: () => this.handleSaveState()
        });

        this.commandManager.getCommandRegistry().register({
            id: 'file-load-state',
            label: 'Load State...',
            handler: () => this.handleLoadState()
        });

        // Set up undo manager change listener to update the panel
        this.undoManager.setOnChange(() => {
            this.undoTreePanel.refresh();
        });

        // Register "Open Example..." command that uses selection mode
        this.registerOpenExampleCommand();
    }

    /**
     * Register command for opening example files using selection mode
     */
    private registerOpenExampleCommand() {
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

        // Register a single command that opens the selection palette
        this.commandManager.getCommandRegistry().register({
            id: 'open-example',
            label: 'Open Example...',
            handler: async () => {
                const commandPalette = this.commandManager.getCommandPalette();
                if (!commandPalette) return;

                try {
                    const options = examples.map(ex => ({
                        id: ex.filename,
                        label: ex.filename,
                        description: ex.description,
                        value: ex.filename
                    }));

                    const selectedFilename = await commandPalette.showSelection(
                        options,
                        'Select an example file...'
                    );

                    await this.handleOpenExample(selectedFilename);
                } catch (error) {
                    // User cancelled or error occurred
                    console.log('Example selection cancelled');
                }
            }
        });
    }

    /**
     * Initialize demo undo tree with sample data
     * This demonstrates the branching undo functionality
     */
    private initializeDemoUndoTree() {
        // The command is now registered in command-manager as 'view-show-undo-tree'
        // No need to register it here
    }

    /**
     * Populate the undo tree with demo data to show branching
     */
    private populateDemoUndoTree() {
        // Create demo operations that track state changes
        let demoState = { step: 0, value: 'Empty' };

        // Helper to create demo operations
        const createDemoOperation = (newStep: number, newValue: string, description: string): UndoableOperation => {
            const oldStep = demoState.step;
            const oldValue = demoState.value;
            
            return {
                do: () => {
                    demoState = { step: newStep, value: newValue };
                    console.log(`Do: ${description}`, demoState);
                },
                undo: () => {
                    demoState = { step: oldStep, value: oldValue };
                    console.log(`Undo: ${description}`, demoState);
                },
                redo: () => {
                    demoState = { step: newStep, value: newValue };
                    console.log(`Redo: ${description}`, demoState);
                },
                getDescription: () => description
            };
        };

        // Create initial states
        this.undoManager.execute(createDemoOperation(1, 'Initial state', 'Initial state'));
        this.undoManager.execute(createDemoOperation(2, 'Added signal A', 'Add signal A'));
        this.undoManager.execute(createDemoOperation(3, 'Modified signal A', 'Modify signal A'));
        
        // Create a branch
        this.undoManager.undo();
        this.undoManager.execute(createDemoOperation(4, 'Added signal B', 'Add signal B'));
        
        // Create another branch
        this.undoManager.undo();
        this.undoManager.execute(createDemoOperation(5, 'Removed signal A', 'Remove signal A'));
        
        console.log('Demo undo tree populated with branching structure');
    }

    async refreshFiles() {
        const { fileIds, activeFileId } = await this.fileManager.refreshFiles(
            // onFileAdded callback
            async (id: string) => {
                const fileDisplay = this.fileManager.getFileResources(id)?.element;
                if (fileDisplay) {
                    // Set up undo operation executor for the file display
                    fileDisplay.setUndoableOperationExecutor((operation) => {
                        this.executeOperation(operation);
                    });

                    // Register the file display as content in the dock manager
                    this.dockManager.registerContent(`file-${id}`, () => fileDisplay);

                    // Add the file as a new pane in the main stack
                    this.dockLayoutHelper.addDockPane(id);
                }
            },
            // onFileRemoved callback
            (id: string) => {
                this.dockLayoutHelper.removeDockPane(id);
            }
        );

        // Set active file if changed
        if (activeFileId) {
            this.setActiveFile(activeFileId);
        }

        // Update layout to show/hide sidebar based on file count and user preference
        if (fileIds.length > 0) {
            // Get user preference for signal selection visibility
            let signalSelectionVisible = true;
            let undoHistoryVisible = false; // Default to false - don't show undo history automatically
            try {
                const { getSetting } = await import('../../settings/settings-storage.js');
                signalSelectionVisible = (await getSetting(SETTING_SIGNAL_SELECTION_VISIBLE)) ?? true;
                undoHistoryVisible = (await getSetting(SETTING_UNDO_HISTORY_VISIBLE)) ?? false;
            } catch (error) {
                console.warn('Failed to load visibility settings:', error);
            }
            
            // Only show sidebar if user wants it visible
            if (signalSelectionVisible) {
                this.dockLayoutHelper.updateSidebarVisibility(true);
            }
            
            // Restore undo history visibility if user had it open
            if (undoHistoryVisible && this.dockLayoutHelper.isSidebarVisible()) {
                // Only restore undo pane if sidebar is visible and undo pane is not already there
                // The sidebar visibility check ensures undo history respects signal selection visibility
                if (!this.dockLayoutHelper.isUndoPaneVisible()) {
                    // toggleUndoPaneVisibility() will add the pane since it's currently not visible
                    this.dockLayoutHelper.toggleUndoPaneVisibility();
                }
            }
            
            // Update menu checkbox to reflect current state
            if (this.menuBar) {
                this.menuBar.updateMenuItemChecked('toggle-signal-selection', this.dockLayoutHelper.isSidebarVisible());
                this.menuBar.updateMenuItemChecked('toggle-undo-history', this.dockLayoutHelper.isUndoPaneVisible());
            }
        } else {
            // Hide sidebar when no files are open
            this.dockLayoutHelper.updateSidebarVisibility(false);
        }
    }

    async handleFileOpen() {
        const fileId = await this.fileManager.handleFileOpen();
        if (fileId) {
            await this.refreshFiles();
            this.setActiveFile(fileId);
        }
    }

    async handleOpenExample(filename: string) {
        const fileId = await this.fileManager.handleOpenExample(filename);
        if (fileId) {
            await this.refreshFiles();
            this.setActiveFile(fileId);
        }
    }

    async handleStartupFiles() {
        try {
            const startupFiles = await getStartupFiles();
            if (startupFiles.length > 0) {
                console.log(`Opening ${startupFiles.length} file(s) from command-line arguments:`, startupFiles);
                
                for (const filePath of startupFiles) {
                    const fileId = await this.fileManager.openFilePath(filePath);
                    if (fileId) {
                        console.log(`Successfully opened: ${filePath}`);
                    } else {
                        console.error(`Failed to open file: ${filePath}`);
                    }
                }
                
                // Refresh the file list to display the newly opened files
                // This will be called by refreshFiles in connectedCallback
            }
        } catch (err) {
            console.error("Error handling startup files:", err);
        }
    }

    setActiveFile(id: string) {
        if (!this.fileManager.hasFile(id)) return;

        this.fileManager.setActiveFileId(id);

        const activeRes = this.fileManager.getFileResources(id);

        // Update Tree View
        if (this.hierarchyTree) {
            this.hierarchyTree.filename = id;
            this.hierarchyTree.data = activeRes ? activeRes.hierarchy : null;
            
            // Update selected signals checkboxes
            if (activeRes) {
                const selectedRefs = activeRes.element.getSelectedSignalRefs();
                this.hierarchyTree.selectedSignalRefs = selectedRefs;
            }
        }

        // Update document title
        updateDocumentTitle(id);

        // Set the active pane in the dock stack
        this.dockLayoutHelper.setActivePane(`file-pane-${id}`);
    }

    async closeFile(id: string) {
        await this.fileManager.closeFile(id);
        await this.refreshFiles();
    }

    activateCommandsViewPane() {
        // Activate the pane first
        this.paneManager.activatePane('commands-view-pane', 'Keyboard Shortcuts', 'commands-view', true);
        
        // Then wire up the commands view with dependencies
        // Need to wait a tick for the element to be in the DOM
        setTimeout(() => {
            const findCommandsView = (root: any): any => {
                let cv = root.querySelector('commands-view');
                if (cv) return cv;
                
                const children = root.querySelectorAll('*');
                for (const child of children) {
                    if (child.shadowRoot) {
                        cv = findCommandsView(child.shadowRoot);
                        if (cv) return cv;
                    }
                }
                return null;
            };
            
            const commandsView = findCommandsView(this.shadowRoot);
            if (commandsView) {
                commandsView.setCommandRegistry(this.commandManager.getCommandRegistry());
                commandsView.setShortcutManager(this.commandManager.getShortcutManager());
            }
        }, 0);
    }

    /**
     * Execute an undoable operation
     * This is the public API for other parts of the app to record operations
     */
    executeOperation(operation: UndoableOperation) {
        this.undoManager.execute(operation);
    }

    /**
     * Handle save state command
     */
    async handleSaveState() {
        const activeFileId = this.fileManager.getActiveFileId();
        if (!activeFileId) {
            console.warn('No active file to save state');
            return;
        }

        const activeRes = this.fileManager.getFileResources(activeFileId);
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
    async handleLoadState() {
        try {
            const loaded = await loadStateFromFile();
            if (!loaded) {
                // User cancelled
                return;
            }

            const { filename, state } = loaded;

            // Check if the file is currently open
            const fileId = this.fileManager.getFileIdFromFilename(filename);
            if (!fileId) {
                alert(`The waveform file "${filename}" is not currently open. Please open it first.`);
                return;
            }

            const fileRes = this.fileManager.getFileResources(fileId);
            if (!fileRes) {
                console.warn('File resources not found');
                return;
            }

            // Apply the state to the file display
            await fileRes.element.applyState(state);
            
            // Switch to the file if it's not active
            if (this.fileManager.getActiveFileId() !== fileId) {
                this.setActiveFile(fileId);
            }

            console.log('State loaded successfully');
        } catch (err) {
            console.error('Failed to load state:', err);
            alert(`Failed to load state: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    }

    /**
     * Dispatch zoom command to the active file display
     */
    private dispatchZoomCommand(action: 'zoom-in' | 'zoom-out' | 'zoom-fit') {
        const activeFileId = this.fileManager.getActiveFileId();
        if (!activeFileId) return;
        
        const activeRes = this.fileManager.getFileResources(activeFileId);
        if (!activeRes) return;
        
        const event = new CustomEvent('zoom-command', {
            detail: { action },
            bubbles: false,
            composed: false
        });
        
        activeRes.element.dispatchEvent(event);
    }

    /**
     * Toggle the signal selection view visibility
     */
    private async toggleSignalSelection() {
        const newVisibility = this.dockLayoutHelper.toggleSidebarVisibility();
        
        // Update the menu checkbox state
        if (this.menuBar) {
            this.menuBar.updateMenuItemChecked('toggle-signal-selection', newVisibility);
        }
        
        // Persist the setting
        try {
            const { setSetting } = await import('../../settings/settings-storage.js');
            await setSetting(SETTING_SIGNAL_SELECTION_VISIBLE, newVisibility);
        } catch (error) {
            console.warn('Failed to persist signal selection visibility setting:', error);
        }
    }

    /**
     * Toggle the undo history pane visibility
     */
    private async toggleUndoHistory() {
        const newVisibility = this.dockLayoutHelper.toggleUndoPaneVisibility();
        
        // Update the menu checkbox state
        if (this.menuBar) {
            this.menuBar.updateMenuItemChecked('toggle-undo-history', newVisibility);
        }
        
        // Persist the setting
        try {
            const { setSetting } = await import('../../settings/settings-storage.js');
            await setSetting(SETTING_UNDO_HISTORY_VISIBLE, newVisibility);
        } catch (error) {
            console.warn('Failed to persist undo history visibility setting:', error);
        }
    }
}

if (!customElements.get('app-main')) {
    customElements.define('app-main', AppMain);
}
