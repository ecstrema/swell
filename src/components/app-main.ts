import { restoreSession, getStartupFiles } from "../backend.js";
import "./menu/menu-bar.ts";
import { MenuBar } from "./menu/menu-bar.js";
import "./files-tree.ts";
import "./settings-page.ts";
import "./about-pane.ts";
import "./undo-tree-panel.ts";
import { FilesTree } from "./files-tree.ts";
import { SettingsPage } from "./settings-page.js";
import { AboutPane } from "./about-pane.js";
import { UndoTreePanel } from "./undo-tree-panel.js";
import { themeManager } from "../theme-manager.js";
import { DockManager } from "./docking/dock-manager.js";
import { DockStack } from "./docking/types.js";
import { css } from "../utils/css-utils.js";
import { updateDocumentTitle } from "../utils/title-utils.js";
import appMainCss from "./app-main.css?inline";
import "./docking/index.js";
import { FileManager } from "./file-manager.js";
import { CommandManager } from "./command-manager.js";
import { DockLayoutHelper } from "./dock-layout-helper.js";
import { PaneManager } from "./pane-manager.js";
import { UndoManager } from "../undo/undo-manager.js";
import { UndoableOperation } from "../undo/undo-tree.js";




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
    private settingsPage!: SettingsPage;
    private aboutPane!: AboutPane;
    private undoTreePanel!: UndoTreePanel;

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

        this.settingsPage = new SettingsPage();
        this.settingsPage.id = 'settings-panel';

        this.undoTreePanel = new UndoTreePanel();
        this.undoTreePanel.id = 'undo-tree-panel';
        this.undoTreePanel.setUndoTree(this.undoManager.getUndoTree());

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
        this.dockManager.registerContent('settings', () => this.settingsPage);
        this.dockManager.registerContent('about', () => this.aboutPane);
        this.dockManager.registerContent('undo-tree', () => this.undoTreePanel);

        // Set initial layout (sidebar will be added when files are opened)
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
        // Restore session (web only - Tauri handles this on startup)
        await restoreSession();

        // Handle startup files from command-line arguments (Tauri only)
        await this.handleStartupFiles();

        // Initialize shortcut system
        this.initializeShortcuts();

        // Pass shortcut manager to menu bar
        const menuBar = this.shadowRoot!.querySelector('app-menu-bar');
        if (menuBar instanceof MenuBar) {
            menuBar.setShortcutManager(this.commandManager.getShortcutManager());
        }

        // Initialize command palette
        this.commandManager.initializeCommandPalette();

        // Initialize about pane
        this.initializeAboutPane();

        // Add demo undo tree command
        this.initializeDemoUndoTree();

        // Listeners
        this.addEventListener('file-open-request', () => this.handleFileOpen());

        // Listen for open example request
        this.addEventListener('open-example-request', (e: Event) => {
            const customEvent = e as CustomEvent<string>;
            this.handleOpenExample(customEvent.detail);
        });

        // Listen for file picker button click in empty state
        const filePickerBtn = this.fileViewContainer.querySelector('#file-picker-btn');
        if (filePickerBtn) {
            filePickerBtn.addEventListener('click', () => this.handleFileOpen());
        }

        // Listen for settings open request - activate the settings tab
        this.addEventListener('settings-open-request', () => {
            this.activateSettingsPane();
        });

        // Listen for about open request
        this.addEventListener('about-open-request', () => {
            this.activateAboutPane();
        });

        // Listen for undo tree panel open request
        this.addEventListener('undo-tree-open-request', () => {
            this.activateUndoTreePane();
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
    }

    /**
     * Initialize the shortcut system with commands and bindings
     */
    private initializeShortcuts() {
        this.commandManager.initializeShortcuts({
            onFileOpen: () => this.handleFileOpen(),
            onFileQuit: async () => {
                // Only available in Tauri, not on web
                const { isTauri } = await import('../backend.js');
                if (isTauri) {
                    const { getCurrentWindow } = await import('@tauri-apps/api/window');
                    await getCurrentWindow().close();
                }
            },
            onEditUndo: () => {
                this.undoManager.undo();
            },
            onEditRedo: () => {
                this.undoManager.redo();
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
            }
        });

        // Set up undo manager change listener to update the panel
        this.undoManager.setOnChange(() => {
            this.undoTreePanel.refresh();
        });
    }

    /**
     * Initialize the about pane
     */
    private initializeAboutPane() {
        this.aboutPane = new AboutPane();
    }

    /**
     * Initialize demo undo tree with sample data
     * This demonstrates the branching undo functionality
     */
    private initializeDemoUndoTree() {
        // Register a command to populate demo data
        this.commandManager.getCommandRegistry().register({
            id: 'view-undo-tree',
            label: 'View Undo History',
            handler: () => {
                // Populate with demo data if empty
                if (this.undoManager.getUndoTree().size() === 0) {
                    this.populateDemoUndoTree();
                }
                this.activateUndoTreePane();
            }
        });
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

        // Update layout to show/hide sidebar based on file count
        this.dockLayoutHelper.updateSidebarVisibility(fileIds.length > 0);
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

    activateSettingsPane() {
        this.paneManager.activatePane('settings-pane', 'Settings', 'settings', true);
    }

    activateAboutPane() {
        this.paneManager.activatePane('about-pane', 'About', 'about', true);
    }

    activateUndoTreePane() {
        this.paneManager.activatePane('undo-tree-pane', 'Undo History', 'undo-tree', true);
    }

    /**
     * Execute an undoable operation
     * This is the public API for other parts of the app to record operations
     */
    executeOperation(operation: UndoableOperation) {
        this.undoManager.execute(operation);
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
}

if (!customElements.get('app-main')) {
    customElements.define('app-main', AppMain);
}
