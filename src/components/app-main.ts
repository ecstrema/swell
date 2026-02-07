import { addFile, openFileDialog, getHierarchy, getFiles, removeFile } from "../backend.js";
import "./menu/menu-bar.ts";
import "./tab-bar.ts";
import "./files-tree.ts";
import "./settings-page.ts";
import { TabBar } from "./tab-bar.ts";
import { FileDisplay } from "./file-display.ts";
import { FilesTree, HierarchyRoot } from "./files-tree.ts";
import { SettingsPage } from "./settings-page.ts";
import { CommandRegistry, ShortcutManager, defaultShortcuts } from "../shortcuts/index.ts";



export class AppMain extends HTMLElement {
    private state = {
        activeFileId: null as string | null,
        showingSettings: false
    };

    private fileResources = new Map<string, { element: FileDisplay, hierarchy: HierarchyRoot | null }>();
    private settingsPage: SettingsPage | null = null;
    
    // Shortcut system
    private commandRegistry: CommandRegistry;
    private shortcutManager: ShortcutManager;

    constructor() {
        super();
        
        // Initialize shortcut system
        this.commandRegistry = new CommandRegistry();
        this.shortcutManager = new ShortcutManager(this.commandRegistry);
        
        this.attachShadow({ mode: 'open' });
        this.shadowRoot!.innerHTML = `
        <style>
            :host {
                display: block;
                height: 100vh;
                display: flex;
                flex-direction: column;
                background-color: var(--color-bg);
                color: var(--color-text);
                font-family: var(--font-family, sans-serif);
            }
            .container {
                flex: 1;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }
            .workspace {
                display: flex;
                flex: 1;
                overflow: hidden;
            }
            #sidebar {
                width: 250px;
                background-color: var(--color-bg-surface);
                border-right: 1px solid var(--color-border);
                display: flex;
                flex-direction: column;
            }
            #content-area {
                flex: 1;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                background-color: var(--color-bg-surface);
                position: relative;
            }
            .empty-state {
                flex: 1;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                text-align: center;
                padding-bottom: 20vh;
            }
            .row {
                display: flex;
                justify-content: center;
                margin-top: 1rem;
            }

            /* Button Styles imported/adapted from global styles */
            button {
                border-radius: 8px;
                border: 1px solid var(--color-button-border);
                padding: 0.6em 1.2em;
                font-size: 1em;
                font-weight: 500;
                font-family: inherit;
                color: var(--color-button-text);
                background-color: var(--color-button-bg);
                transition: border-color 0.25s;
                box-shadow: 0 2px 2px var(--menu-shadow);
                cursor: pointer;
            }
            button:hover {
                border-color: var(--color-button-border-hover);
                background-color: var(--color-bg-hover);
            }
            button:active {
                border-color: var(--color-button-border-hover);
                background-color: var(--color-bg-active);
            }
        </style>

        <app-menu-bar></app-menu-bar>

        <div class="container">
            <app-tab-bar id="tabs"></app-tab-bar>

            <div class="workspace" id="workspace">
                 <div id="sidebar">
                     <files-tree id="hierarchy-tree"></files-tree>
                 </div>
                 <main id="content-area">
                    <div id="empty-state" class="empty-state">
                        <h1>Wave View</h1>
                        <div class="row">
                            <button id="file-picker-btn">Open File</button>
                        </div>
                    </div>
                    <div id="files-container"></div>
                    <div id="settings-container" style="display: none;"></div>
                </main>
            </div>
        </div>
        `;
    }

    connectedCallback() {
        const filePickerBtn = this.shadowRoot!.getElementById('file-picker-btn') as HTMLButtonElement;

        // Initialize shortcut system
        this.initializeShortcuts();

        // Listeners
        this.addEventListener('file-open-request', () => this.handleFileOpen());
        this.addEventListener('settings-open-request', () => this.openSettings());

        // Listen for menu actions and route them through command registry
        this.addEventListener('menu-action', (e: Event) => {
            const customEvent = e as CustomEvent;
            const action = customEvent.detail;
            if (action && this.commandRegistry.has(action)) {
                this.commandRegistry.execute(action);
            }
        });

        this.shadowRoot!.addEventListener('tab-select', (e: any) => {
            if (e.detail.id === 'settings') {
                this.openSettings();
            } else {
                this.setActiveFile(e.detail.id);
            }
        });

        this.shadowRoot!.addEventListener('tab-close', (e: any) => {
            if (e.detail.id === 'settings') {
                this.closeSettings();
            } else {
                this.closeFile(e.detail.id);
            }
        });

        if (filePickerBtn) {
            filePickerBtn.addEventListener('click', () => this.handleFileOpen());
        }

        this.refreshFiles();
    }

    disconnectedCallback() {
        // Clean up shortcut system
        this.shortcutManager.deactivate();
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
            handler: () => {
                console.log('Quit action triggered');
                // Tauri quit logic could be added here
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

        // Register default shortcuts (currently empty, but ready for future use)
        this.shortcutManager.registerMany(defaultShortcuts);

        // Activate the shortcut system
        this.shortcutManager.activate();
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
            const contentArea = this.shadowRoot!.getElementById('files-container');
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
        this.state.showingSettings = false;

        // Update content visibility
        for (const [fileId, config] of this.fileResources) {
             config.element.style.display = fileId === id ? 'block' : 'none';
        }

        const activeRes = this.fileResources.get(id);

        // Update Tree View - using getElementById/querySelector
        const filesTree = this.shadowRoot!.getElementById('hierarchy-tree') as FilesTree;
        if (filesTree) {
            filesTree.data = activeRes ? activeRes.hierarchy : null;
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

    openSettings() {
        this.state.showingSettings = true;
        this.state.activeFileId = null;

        // Create settings page if it doesn't exist
        if (!this.settingsPage) {
            const settingsContainer = this.shadowRoot!.getElementById('settings-container');
            if (settingsContainer) {
                this.settingsPage = new SettingsPage();
                settingsContainer.appendChild(this.settingsPage);
            }
        }

        this.render();
    }

    closeSettings() {
        this.state.showingSettings = false;

        // Switch to the last file if any
        const fileIds = Array.from(this.fileResources.keys());
        if (fileIds.length > 0) {
            this.setActiveFile(fileIds[fileIds.length - 1]);
        } else {
            this.render();
        }
    }

    render() {
        // Elements
        const tabBar = this.shadowRoot!.getElementById('tabs') as TabBar;
        const emptyState = this.shadowRoot!.getElementById('empty-state') as HTMLElement;
        const sidebar = this.shadowRoot!.getElementById('sidebar') as HTMLElement;
        const filesContainer = this.shadowRoot!.getElementById('files-container') as HTMLElement;
        const settingsContainer = this.shadowRoot!.getElementById('settings-container') as HTMLElement;

        const fileIds = Array.from(this.fileResources.keys());
        const hasFiles = fileIds.length > 0;
        const hasContent = hasFiles || this.state.showingSettings;

        // Update Tabs
        if (tabBar) {
            const fileTabs = fileIds.map(id => ({
                id: id,
                label: id.split(/[/\\]/).pop() || id,
                active: id === this.state.activeFileId && !this.state.showingSettings
            }));

            const settingsTabs = this.state.showingSettings ? [{
                id: 'settings',
                label: 'Settings',
                active: true
            }] : [];

            tabBar.tabs = [...fileTabs, ...settingsTabs];

            // Visibility
            tabBar.style.display = hasContent ? 'block' : 'none';
        }

        // Content visibility
        if (filesContainer) {
            filesContainer.style.display = this.state.showingSettings ? 'none' : 'block';
        }

        if (settingsContainer) {
            settingsContainer.style.display = this.state.showingSettings ? 'block' : 'none';
        }

        // Empty state & Sidebar
        if (emptyState) {
            emptyState.style.display = hasContent ? 'none' : 'flex';
        }

        if (sidebar) {
            // Hide sidebar when showing settings
            sidebar.style.display = (hasFiles && !this.state.showingSettings) ? 'flex' : 'none';
        }
    }
}

if (!customElements.get('app-main')) {
    customElements.define('app-main', AppMain);
}
