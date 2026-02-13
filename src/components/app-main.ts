import { addFile, openFileDialog, getHierarchy, getFiles, removeFile, restoreSession } from "../backend.js";
import "./menu/menu-bar.ts";
import "./files-tree.ts";
import "./settings-page.ts";
import { FileDisplay } from "./file-display.ts";
import { FilesTree, HierarchyRoot } from "./files-tree.ts";
import { CommandPalette } from "./command-palette.js";
import { CommandRegistry, ShortcutManager, defaultShortcuts } from "../shortcuts/index.js";
import { SettingsPage } from "./settings-page.js";
import { themeManager } from "../theme-manager.js";
import { DockManager } from "./docking/dock-manager.js";
import { DockLayout, DockStack } from "./docking/types.js";
import { css } from "../utils/css-utils.js";
import { updateDocumentTitle } from "../utils/title-utils.js";
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
    private settingsPage!: SettingsPage;

    // Shortcut system
    private commandRegistry: CommandRegistry;
    private shortcutManager: ShortcutManager;
    private commandPalette: CommandPalette | null = null;

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
        this.initializeCommandPalette();

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

        // Listen for pane close events from dock stack
        this.addEventListener('pane-close', (e: any) => {
            const paneId = e.detail.id;
            
            // Handle settings pane close
            if (paneId === 'settings-pane') {
                this.closeSettingsPane();
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
        // Clean up shortcut system
        this.shortcutManager.deactivate();

        // Clean up command palette
        if (this.commandPalette && this.commandPalette.parentNode) {
            this.commandPalette.parentNode.removeChild(this.commandPalette);
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
                // Dispatch zoom-in event for the active file display
                this.dispatchZoomCommand('zoom-in');
            }
        });

        this.commandRegistry.register({
            id: 'view-zoom-out',
            label: 'Zoom Out',
            handler: () => {
                // Dispatch zoom-out event for the active file display
                this.dispatchZoomCommand('zoom-out');
            }
        });

        this.commandRegistry.register({
            id: 'view-zoom-fit',
            label: 'Zoom to Fit',
            handler: () => {
                // Dispatch zoom-fit event for the active file display
                this.dispatchZoomCommand('zoom-fit');
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

    async refreshFiles() {
        try {
            const files = await getFiles();

            // Remove closed files
            for (const [id, value] of this.fileResources) {
                if (!files.includes(id)) {
                    this.removeDockPane(id);
                    value.element.remove();
                    this.fileResources.delete(id);
                }
            }

            // Add new files
            for (const id of files) {
                if (!this.fileResources.has(id)) {

                    const fileDisplay = new FileDisplay();
                    fileDisplay.filename = id;

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

                    // Register the file display as content in the dock manager
                    this.dockManager.registerContent(`file-${id}`, () => fileDisplay);

                    // Add the file as a new pane in the main stack
                    this.addDockPane(id);
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
                // No active file - reset title to default
                updateDocumentTitle(null);
            }

            // Update layout to show/hide sidebar based on file count
            this.updateSidebarVisibility(fileIds.length > 0);
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

        const activeRes = this.fileResources.get(id);

        // Update Tree View
        if (this.hierarchyTree) {
            this.hierarchyTree.filename = id;
            this.hierarchyTree.data = activeRes ? activeRes.hierarchy : null;
        }

        // Update document title
        updateDocumentTitle(id);

        // Set the active pane in the dock stack
        const mainStack = this.findMainStack();
        if (mainStack) {
            mainStack.activeId = `file-pane-${id}`;
            this.dockManager.render();
        }
    }

    private findMainStack() {
        const layout = this.dockManager.layout;
        if (!layout) return null;

        const root = layout.root;
        if (root.type === 'box') {
            for (const child of root.children) {
                if (child.type === 'stack' && child.id === 'main-stack') {
                    return child;
                }
            }
        }
        return null;
    }

    activateSettingsPane() {
        // Find the biggest stack and open settings there
        const layout = this.dockManager.layout;
        if (!layout) {
            console.warn('No layout available to activate settings pane');
            return;
        }

        const biggestStack = this.findBiggestStack(layout.root);
        if (!biggestStack) {
            console.warn('Could not find any stack to activate settings pane');
            return;
        }

        // Check if settings pane already exists in this stack
        const settingsPaneExists = biggestStack.children.some(p => p.id === 'settings-pane');
        
        if (!settingsPaneExists) {
            // Add settings pane to the biggest stack
            biggestStack.children.push({
                id: 'settings-pane',
                title: 'Settings',
                contentId: 'settings',
                closable: true
            });
        }

        // Activate the settings pane
        biggestStack.activeId = 'settings-pane';
        this.dockManager.layout = layout; // Trigger re-render
    }

    private findBiggestStack(node: DockNode): DockStack | null {
        if (node.type === 'stack') {
            return node;
        }

        if (node.type === 'box') {
            let biggestStack: DockStack | null = null;
            let biggestWeight = -Infinity;

            for (const child of node.children) {
                const stack = this.findBiggestStack(child);
                if (stack && stack.weight > biggestWeight) {
                    biggestWeight = stack.weight;
                    biggestStack = stack;
                }
            }

            return biggestStack;
        }

        return null;
    }

    private closeSettingsPane() {
        const layout = this.dockManager.layout;
        if (!layout) return;

        // Find and remove settings pane from all stacks
        this.removeSettingsPaneFromNode(layout.root);
        this.dockManager.layout = layout; // Trigger re-render
    }

    private removeSettingsPaneFromNode(node: DockNode): void {
        if (node.type === 'stack') {
            node.children = node.children.filter(p => p.id !== 'settings-pane');
            if (node.activeId === 'settings-pane') {
                node.activeId = node.children.length > 0 ? node.children[0].id : null;
            }
        } else if (node.type === 'box') {
            for (const child of node.children) {
                this.removeSettingsPaneFromNode(child);
            }
        }
    }
    
    private addDockPane(fileId: string) {
        const mainStack = this.findMainStack();
        if (!mainStack) return;

        const filename = fileId.split(/[/\\]/).pop() || fileId;
        const pane = {
            id: `file-pane-${fileId}`,
            title: filename,
            contentId: `file-${fileId}`,
            closable: true
        };

        mainStack.children.push(pane);
        mainStack.activeId = pane.id;
        this.dockManager.render();
    }

    private removeDockPane(fileId: string) {
        const mainStack = this.findMainStack();
        if (!mainStack) return;

        const paneId = `file-pane-${fileId}`;
        mainStack.children = mainStack.children.filter(p => p.id !== paneId);

        if (mainStack.activeId === paneId) {
            mainStack.activeId = mainStack.children.length > 0 ? mainStack.children[0].id : null;
        }

        this.dockManager.render();
    }

    async closeFile(id: string) {
        try {
            await removeFile(id);
            await this.refreshFiles();
        } catch (e) {
            console.error(e);
        }
    }

    private updateSidebarVisibility(hasFiles: boolean) {
        const layout = this.dockManager.layout;
        if (!layout || layout.root.type !== 'box') return;

        const rootBox = layout.root;
        const sidebarIndex = rootBox.children.findIndex(
            child => child.type === 'stack' && child.id === 'sidebar-stack'
        );
        const mainStackIndex = rootBox.children.findIndex(
            child => child.type === 'stack' && child.id === 'main-stack'
        );

        if (hasFiles) {
            // Show sidebar if hidden
            if (sidebarIndex === -1 && mainStackIndex !== -1) {
                const sidebarStack: DockStack = {
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
                        },
                        {
                            id: 'settings-pane',
                            title: 'Settings',
                            contentId: 'settings',
                            closable: true
                        }
                    ]
                };
                rootBox.children.unshift(sidebarStack);
                this.dockManager.render();
            }
        } else {
            // Hide sidebar if visible
            if (sidebarIndex !== -1) {
                rootBox.children.splice(sidebarIndex, 1);
                this.dockManager.render();
            }
        }
    }

    /**
     * Dispatch zoom command to the active file display
     */
    private dispatchZoomCommand(action: 'zoom-in' | 'zoom-out' | 'zoom-fit') {
        if (!this.state.activeFileId) return;
        
        const activeRes = this.fileResources.get(this.state.activeFileId);
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
