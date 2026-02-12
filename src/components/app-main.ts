import { addFile, openFileDialog, getHierarchy, getFiles, removeFile } from "../backend.js";
import "./menu/menu-bar.ts";
import "./tab-bar.ts";
import "./files-tree.ts";
import "./settings-page.ts";
import { TabBar } from "./tab-bar.ts";
import { FileDisplay } from "./file-display.ts";
import { FilesTree, HierarchyRoot } from "./files-tree.ts";
import { CommandPalette } from "./command-palette.js";
import { CommandRegistry, ShortcutManager, defaultShortcuts } from "../shortcuts/index.js";
import { SettingsPage } from "./settings-page.js";
import { themeManager } from "../theme-manager.js";
import { DockManager } from "./docking/dock-manager.js";
import { DockLayout } from "./docking/types.js";
import { css } from "../utils/css-utils.js";
import appMainCss from "./app-main.css?inline";
import "./docking/index.js";



export class AppMain extends HTMLElement {
    private state = {
        activeFileId: null as string | null
    };

    private fileResources = new Map<string, { element: FileDisplay, hierarchy: HierarchyRoot | null }>();

    // Docking system
    private dockManager: DockManager;
    private hierarchyTree: FilesTree;
    private fileViewContainer: HTMLElement;

    // Shortcut system
    private commandRegistry: CommandRegistry;
    private shortcutManager: ShortcutManager;
    private commandPalette: CommandPalette | null = null;
    private settingsPage: SettingsPage | null = null;

    constructor() {
        super();

        // Initialize shortcut system
        this.commandRegistry = new CommandRegistry();
        this.shortcutManager = new ShortcutManager(this.commandRegistry);

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
                        activeId: 'file-view-pane',
                        children: [
                            {
                                id: 'file-view-pane',
                                title: 'File View',
                                contentId: 'file-view',
                                closable: false
                            }
                        ]
                    }
                ]
            }
        };
    }

    connectedCallback() {
        const filePickerBtn = this.fileViewContainer.querySelector('#file-picker-btn') as HTMLButtonElement;

        // Initialize shortcut system
        this.initializeShortcuts();

        // Initialize command palette
        this.initializeCommandPalette();

        // Initialize settings page
        this.initializeSettingsPage();

        // Listeners
        this.addEventListener('file-open-request', () => this.handleFileOpen());

        // Listen for settings open request
        this.addEventListener('settings-open-request', () => {
            if (this.settingsPage) {
                this.settingsPage.show();
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
            if (action && this.commandRegistry.has(action)) {
                this.commandRegistry.execute(action);
            }
        });

        this.addEventListener('tab-select', (e: any) => {
            this.setActiveFile(e.detail.id);
        });

        this.addEventListener('tab-close', (e: any) => {
            this.closeFile(e.detail.id);
        });

        if (filePickerBtn) {
            filePickerBtn.addEventListener('click', () => this.handleFileOpen());
        }

        this.refreshFiles();
    }

    disconnectedCallback() {
        // Clean up shortcut system
        this.shortcutManager.deactivate();

        // Clean up command palette
        if (this.commandPalette && this.commandPalette.parentNode) {
            this.commandPalette.parentNode.removeChild(this.commandPalette);
        }

        // Clean up settings page
        if (this.settingsPage && this.settingsPage.parentNode) {
            this.settingsPage.parentNode.removeChild(this.settingsPage);
        }
    }

    /**
     * Initialize the shortcut system with commands and bindings
     */
    private initializeShortcuts() {
        // Register commands that can be triggered by shortcuts or menu items
        this.commandRegistry.register({
            id: 'file-open',
            label: 'Open File',
            handler: () => this.handleFileOpen()
        });

        this.commandRegistry.register({
            id: 'file-quit',
            label: 'Quit',
            handler: async () => {
                // Only available in Tauri, not on web
                const { isTauri } = await import('../backend.js');
                if (isTauri) {
                    const { getCurrentWindow } = await import('@tauri-apps/api/window');
                    await getCurrentWindow().close();
                }
            }
        });

        this.commandRegistry.register({
            id: 'edit-undo',
            label: 'Undo',
            handler: () => {
                console.log('Undo action triggered');
                // Undo logic could be added here
            }
        });

        this.commandRegistry.register({
            id: 'view-zoom-in',
            label: 'Zoom In',
            handler: () => {
                console.log('Zoom in action triggered');
                // Zoom in logic could be added here
            }
        });

        this.commandRegistry.register({
            id: 'view-zoom-out',
            label: 'Zoom Out',
            handler: () => {
                console.log('Zoom out action triggered');
                // Zoom out logic could be added here
            }
        });

        // Register command palette command
        this.commandRegistry.register({
            id: 'command-palette-toggle',
            label: 'Open Command Palette',
            handler: () => {
                if (this.commandPalette) {
                    this.commandPalette.toggle();
                }
            }
        });

        // Register default shortcuts (currently empty, but ready for future use)
        this.shortcutManager.registerMany(defaultShortcuts);

        // Register keyboard shortcut to open command palette (Ctrl+K or Cmd+K)
        this.shortcutManager.register({
            shortcut: 'Ctrl+K',
            commandId: 'command-palette-toggle'
        });

        // Activate the shortcut system
        this.shortcutManager.activate();
    }

    /**
     * Initialize the command palette
     */
    private initializeCommandPalette() {
        this.commandPalette = new CommandPalette(this.commandRegistry);
        document.body.appendChild(this.commandPalette);
    }

    /**
     * Initialize the settings page
     */
    private initializeSettingsPage() {
        this.settingsPage = new SettingsPage();
        document.body.appendChild(this.settingsPage);
    }

    async refreshFiles() {
        try {
            const files = await getFiles();

            // Remove closed files
            for (const [id, value] of this.fileResources) {
                if (!files.includes(id)) {
                    value.element.remove();
                    this.fileResources.delete(id);
                }
            }

            // Add new files
            const contentArea = this.fileViewContainer.querySelector('#files-container');
            for (const id of files) {
                if (!this.fileResources.has(id)) {

                    const fileDisplay = new FileDisplay();
                    fileDisplay.filename = id;
                    fileDisplay.style.display = 'none';

                    if (contentArea) contentArea.appendChild(fileDisplay);

                    // Load hierarchy
                    let hierarchy = null;
                    try {
                        hierarchy = await getHierarchy(id);
                    } catch (e) {
                        console.error("Error loading hierarchy for", id, e);
                    }

                    this.fileResources.set(id, {
                        element: fileDisplay,
                        hierarchy: hierarchy
                    });
                }
            }

            // Handle active file state
            const fileIds = Array.from(this.fileResources.keys());

            if (this.state.activeFileId && !this.fileResources.has(this.state.activeFileId)) {
                this.state.activeFileId = null;
            }

            if (!this.state.activeFileId && fileIds.length > 0) {
                this.setActiveFile(fileIds[fileIds.length - 1]);
            } else if (this.state.activeFileId) {
                this.setActiveFile(this.state.activeFileId);
            } else {
                this.render();
            }
        } catch (e) {
            console.error("Error refreshing files:", e);
        }
    }

    async handleFileOpen() {
        try {
            const file = await openFileDialog();
            if (file) {
                const result = await addFile(file);
                await this.refreshFiles();
                this.setActiveFile(result);
            }
        } catch (err) {
            console.error("Error loading file:", err);
        }
    }

    setActiveFile(id: string) {
        if (!this.fileResources.has(id)) return;

        this.state.activeFileId = id;

        // Update content visibility
        for (const [fileId, config] of this.fileResources) {
             config.element.style.display = fileId === id ? 'block' : 'none';
        }

        const activeRes = this.fileResources.get(id);

        // Update Tree View
        if (this.hierarchyTree) {
            this.hierarchyTree.filename = id;
            this.hierarchyTree.data = activeRes ? activeRes.hierarchy : null;
        }

        this.render();
    }

    async closeFile(id: string) {
        try {
            await removeFile(id);
            await this.refreshFiles();
        } catch (e) {
            console.error(e);
        }
    }

    render() {
        // Elements from the docked container
        const tabBar = this.fileViewContainer.querySelector('#tabs') as TabBar;
        const emptyState = this.fileViewContainer.querySelector('#empty-state') as HTMLElement;

        const fileIds = Array.from(this.fileResources.keys());
        const hasFiles = fileIds.length > 0;

        // Update Tabs
        if (tabBar) {
            tabBar.tabs = fileIds.map(id => ({
                id: id,
                label: id.split(/[/\\]/).pop() || id,
                active: id === this.state.activeFileId
            }));

            // Visibility
            tabBar.style.display = hasFiles ? 'block' : 'none';
        }

        // Empty state visibility
        if (emptyState) {
            emptyState.style.display = hasFiles ? 'none' : 'flex';
        }
    }
}

if (!customElements.get('app-main')) {
    customElements.define('app-main', AppMain);
}
