import { addFile, openFileDialog, getHierarchy } from "../backend.js";
import "./menu/menu-bar.ts";
import "./tab-bar.ts";
import "./files-tree.ts";
import { TabBar } from "./tab-bar.ts";
import { FileDisplay } from "./file-display.ts";
import { FilesTree, HierarchyRoot } from "./files-tree.ts";

interface OpenedFile {
  id: string;
  name: string;
  element: FileDisplay;
  hierarchy: HierarchyRoot | null;
}

export class AppMain extends HTMLElement {
    private state = {
        files: [] as OpenedFile[],
        activeFileId: null as string | null
    };

    private tabBar: TabBar | null = null;
    private filesTree: FilesTree | null = null;
    private contentArea: HTMLElement | null = null;
    private emptyState: HTMLElement | null = null;
    private sidebar: HTMLElement | null = null;
    private workspace: HTMLElement | null = null;

    constructor() {
        super();
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
            
            <div class="workspace">
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
                </main>
            </div>
        </div>
        `;
    }

    connectedCallback() {
        this.tabBar = this.shadowRoot!.querySelector('#tabs') as TabBar;
        this.filesTree = this.shadowRoot!.querySelector('#hierarchy-tree') as FilesTree;
        this.contentArea = this.shadowRoot!.querySelector('#files-container') as HTMLElement;
        this.emptyState = this.shadowRoot!.querySelector('#empty-state') as HTMLElement;
        this.sidebar = this.shadowRoot!.querySelector('#sidebar') as HTMLElement;
        this.workspace = this.shadowRoot!.querySelector('.workspace') as HTMLElement;
        
        const filePickerBtn = this.shadowRoot!.querySelector('#file-picker-btn') as HTMLButtonElement;
        
        // Listeners
        this.addEventListener('file-open-request', () => this.handleFileOpen());
        
        this.shadowRoot!.addEventListener('tab-select', (e: any) => {
            this.setActiveFile(e.detail.id);
        });
        
        this.shadowRoot!.addEventListener('tab-close', (e: any) => {
            this.closeFile(e.detail.id);
        });

        if (filePickerBtn) {
            filePickerBtn.addEventListener('click', () => this.handleFileOpen());
        }
        
        this.render();
    }

    async handleFileOpen() {
        try {
            const file = await openFileDialog();
            if (file) {
                const result = await addFile(file);
                
                // Check if already open
                const existing = this.state.files.find(f => f.id === result);
                if (existing) {
                    this.setActiveFile(existing.id);
                    return;
                }

                const fileDisplay = new FileDisplay();
                fileDisplay.filename = result;
                fileDisplay.style.display = 'none';

                this.contentArea!.appendChild(fileDisplay);

                // Load hierarchy
                const hierarchy = await getHierarchy(result);
                console.log("Hierarchy for", result, ":", hierarchy);

                const newFile: OpenedFile = {
                    id: result,
                    name: result.split(/[/\\]/).pop() || result,
                    element: fileDisplay,
                    hierarchy: hierarchy
                };

                this.state.files.push(newFile);
                
                this.setActiveFile(newFile.id);
            }
        } catch (err) {
            console.error("Error loading file:", err);
        }
    }

    setActiveFile(id: string) {
        this.state.activeFileId = id;
        
        const activeFile = this.state.files.find(f => f.id === id);
        
        // Update content visibility
        this.state.files.forEach(f => {
             f.element.style.display = f.id === id ? 'block' : 'none';
        });
        
        // Update Tree View
        if (this.filesTree) {
            this.filesTree.data = activeFile ? activeFile.hierarchy : null;
        }

        this.render();
    }

    closeFile(id: string) {
        const index = this.state.files.findIndex(f => f.id === id);
        if (index === -1) return;

        const file = this.state.files[index];
        file.element.remove();
        this.state.files.splice(index, 1);

        if (this.state.activeFileId === id) {
            if (this.state.files.length > 0) {
                this.setActiveFile(this.state.files[this.state.files.length - 1].id);
            } else {
                this.setActiveFile(''); // Will trigger null activeFile logic in setActiveFile
                this.state.activeFileId = null;
                this.render();
            }
        } else {
            this.render();
        }
    }

    render() {
        // Update Tabs
        if (this.tabBar) {
            this.tabBar.tabs = this.state.files.map(f => ({
                id: f.id,
                label: f.name,
                active: f.id === this.state.activeFileId
            }));
            
            // Visibility
            this.tabBar.style.display = this.state.files.length > 0 ? 'block' : 'none';
        }

        // Empty state & Sidebar
        const hasFiles = this.state.files.length > 0;
        
        if (this.emptyState) {
            this.emptyState.style.display = hasFiles ? 'none' : 'flex';
        }
        
        if (this.sidebar) {
            this.sidebar.style.display = hasFiles ? 'flex' : 'none';
        }
    }
}

if (!customElements.get('app-main')) {
    customElements.define('app-main', AppMain);
}
