import { restoreSession } from "../../backend/index.js";
import "../../extensions/menu-extension/menu-bar.ts";
import { MenuBar } from "../../extensions/menu-extension/menu-bar.js";
import "../../extensions/waveform-file-extension/trees/files-tree.ts";
import { FilesTree } from "../../extensions/waveform-file-extension/trees/files-tree.js";
import { themeManager } from "../../theme/index.js";
import { DockManager } from "../../extensions/dock-extension/dock-manager.js";
import { DockStack } from "../../extensions/dock-extension/types.js";
import { css } from "../../utils/css-utils.js";
import { updateDocumentTitle } from "../../utils/title-utils.js";
import appMainCss from "./app-main.css?inline";
import "../../extensions/dock-extension/index.js";
import { FileManager } from "../../extensions/waveform-file-extension/file-manager/file-manager.js";
import { CommandManager } from "../command/command-manager.js";
import { DockLayoutHelper } from "../dock-layout-helper.js";
import { PaneManager } from "../panels/pane-manager.js";
import { UndoManager } from "../../extensions/undo-extension/undo-extension.js";
import { dockStatePersistence } from "../../extensions/dock-extension/dock-state-persistence.js";

// Setting paths
const SETTING_NETLIST_VISIBLE = 'Interface/Netlist Visible';
const SETTING_UNDO_HISTORY_VISIBLE = 'Interface/Undo History Visible';

export class AppMain extends HTMLElement {
    // Managers
    private fileManager: FileManager;
    private commandManager: CommandManager;
    private dockLayoutHelper: DockLayoutHelper;
    private paneManager: PaneManager;
    private undoManager: UndoManager | null = null;

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
        // Note: undoManager will be obtained from the undo extension during initialization

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
        this.dockManager.registerContent('netlist', () => this.hierarchyTree);
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

        // Initialize extensions
        await this.initializeExtensions();

        // Handle startup files from command-line arguments (Tauri only)
        await this.handleStartupFiles();

        // Pass shortcut manager to menu bar and store reference
        const menuBar = this.shadowRoot!.querySelector('app-menu-bar');
        if (menuBar instanceof MenuBar) {
            this.menuBar = menuBar;
            menuBar.setShortcutManager(this.commandManager.getShortcutManager());
        }

        // Initialize command palette
        this.commandManager.initializeCommandPalette();

        // Set up event listeners for cross-cutting concerns that require coordination
        this.setupEventListeners();

        // Listen for file picker button click in empty state
        const filePickerBtn = this.fileViewContainer.querySelector('#file-picker-btn');
        if (filePickerBtn) {
            filePickerBtn.addEventListener('click', () => this.handleFileOpen());
        }

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
        const extensionRegistry = this.commandManager.getExtensionRegistry();
        
        // Provide app APIs to extensions BEFORE registering them
        this.commandManager.setAppAPIs({
            getUndoManager: () => this.undoManager,
            getFileManager: () => this.fileManager,
            getPaneManager: () => this.paneManager,
            getDockManager: () => this.dockManager,
        });
        
        // Import and register all default extensions
        const { getAllExtensions } = await import('../../extensions/all-extensions.js');
        const extensions = getAllExtensions();
        
        for (const extension of extensions) {
            await extensionRegistry.register(extension);
        }
        
        // Get the undo manager from the undo extension
        const undoAPI = await extensionRegistry.getExtension<any>('core/undo');
        if (undoAPI && undoAPI.getUndoManager) {
            this.undoManager = undoAPI.getUndoManager();
        } else {
            console.warn('Undo manager not available from undo extension');
        }

        // Update app APIs now that undoManager is available
        this.commandManager.setAppAPIs({
            getUndoManager: () => this.undoManager,
            getFileManager: () => this.fileManager,
            getPaneManager: () => this.paneManager,
            getDockManager: () => this.dockManager,
        });

        // Register pages from extensions with the dock manager
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
     * Set up event listeners for cross-cutting concerns that require coordination
     * Most event handling is now delegated to extensions
     */
    private setupEventListeners() {
        // Listen for file open request from extensions
        this.addEventListener('file-open-request', () => this.handleFileOpen());

        // Listen for open example request - execute the command which will show the selection palette
        this.addEventListener('open-example-request', (e: Event) => {
            const customEvent = e as CustomEvent<{ examples?: any[] }>;
            this.handleOpenExampleRequest(customEvent.detail.examples);
        });

        // Listen for file activate request from extensions
        window.addEventListener('file-activate-request', (e: Event) => {
            const customEvent = e as CustomEvent<{ fileId: string }>;
            this.setActiveFile(customEvent.detail.fileId);
        });

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
            if (this.undoManager) {
                this.undoManager.navigateTo(customEvent.detail.nodeId);
            }
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
    }

    /**
     * Handle open example request with command palette
     */
    private async handleOpenExampleRequest(examples?: any[]) {
        // Use default examples if not provided
        const exampleFiles = examples || [
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

        const commandPalette = this.commandManager.getCommandPalette();
        if (!commandPalette) return;

        try {
            const options = exampleFiles.map((ex: any) => ({
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
            // Get user preference for netlist visibility
            let netlistVisible = true;
            let undoHistoryVisible = false; // Default to false - don't show undo history automatically
            try {
                const { getSetting } = await import('../../extensions/settings-extension/settings-extension.js');
                netlistVisible = (await getSetting(SETTING_NETLIST_VISIBLE)) ?? true;
                undoHistoryVisible = (await getSetting(SETTING_UNDO_HISTORY_VISIBLE)) ?? false;
            } catch (error) {
                console.warn('Failed to load visibility settings:', error);
            }

            // Only show sidebar if user wants it visible
            if (netlistVisible) {
                this.dockLayoutHelper.updateSidebarVisibility(true);
            }

            // Restore undo history visibility if user had it open
            if (undoHistoryVisible && this.dockLayoutHelper.isSidebarVisible()) {
                // Only restore undo pane if sidebar is visible and undo pane is not already there
                // The sidebar visibility check ensures undo history respects netlist visibility
                if (!this.dockLayoutHelper.isUndoPaneVisible()) {
                    // toggleUndoPaneVisibility() will add the pane since it's currently not visible
                    this.dockLayoutHelper.toggleUndoPaneVisibility();
                }
            }

            // Update menu checkbox to reflect current state
            if (this.menuBar) {
                this.menuBar.updateMenuItemChecked('toggle-netlist', this.dockLayoutHelper.isSidebarVisible());
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
        // Delegate to waveform file extension
        const waveformAPI = await this.commandManager.getExtensionRegistry().getExtension<any>('core/waveform-file');
        if (waveformAPI && waveformAPI.handleStartupFiles) {
            await waveformAPI.handleStartupFiles();
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
        if (this.undoManager) {
            this.undoManager.execute(operation);
        }
    }
}

if (!customElements.get('app-main')) {
    customElements.define('app-main', AppMain);
}
