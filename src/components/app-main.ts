import { restoreSession } from "../backend.js";
import "./menu/menu-bar.ts";
import "./files-tree.ts";
import "./settings-page.ts";
import "./about-pane.ts";
import { FilesTree } from "./files-tree.ts";
import { SettingsPage } from "./settings-page.js";
import { AboutPane } from "./about-pane.js";
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




export class AppMain extends HTMLElement {
    // Managers
    private fileManager: FileManager;
    private commandManager: CommandManager;
    private dockLayoutHelper: DockLayoutHelper;
    private paneManager: PaneManager;

    // Docking system
    private dockManager: DockManager;
    private hierarchyTree: FilesTree;
    private fileViewContainer: HTMLElement;
    private settingsPage!: SettingsPage;
    private aboutPane!: AboutPane;

    constructor() {
        super();

        // Initialize managers
        this.fileManager = new FileManager();
        this.commandManager = new CommandManager();

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

        // Set initial layout
        this.dockManager.layout = {
            root: {
                type: 'box',
                id: 'root-box',
                direction: 'row',
                weight: 1,
                children: [
                    {
                        type: 'stack',
                        id: 'sidebar-stack',
                        weight: 20,
                        activeId: 'signal-selection-pane',
                        children: [
                            {
                                id: 'signal-selection-pane',
                                title: 'Signal Selection',
                                contentId: 'signal-selection',
                                closable: false
                            }
                        ]
                    },
                    {
                        type: 'stack',
                        id: 'main-stack',
                        weight: 80,
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

        // Initialize shortcut system
        this.initializeShortcuts();

        // Initialize command palette
        this.commandManager.initializeCommandPalette();

        // Initialize about pane
        this.initializeAboutPane();

        // Listeners
        this.addEventListener('file-open-request', () => this.handleFileOpen());

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
                console.log('Undo action triggered');
                // Undo logic could be added here
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
    }

    /**
     * Initialize the about pane
     */
    private initializeAboutPane() {
        this.aboutPane = new AboutPane();
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

    setActiveFile(id: string) {
        if (!this.fileManager.hasFile(id)) return;

        this.fileManager.setActiveFileId(id);

        const activeRes = this.fileManager.getFileResources(id);

        // Update Tree View
        if (this.hierarchyTree) {
            this.hierarchyTree.filename = id;
            this.hierarchyTree.data = activeRes ? activeRes.hierarchy : null;
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
