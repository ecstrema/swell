import { css } from "../utils/css-utils.js";
import { scrollbarSheet } from "../styles/shared-sheets.js";
import treeViewCss from "./tree-view.css?inline";
import { getSetting } from "../settings/settings-storage.js";

export interface TreeNode {
    name: string;
    id: string | number;
    children?: TreeNode[];
}

export interface TreeViewConfig {
    /**
     * Called when a leaf node (node without children) is clicked
     */
    onLeafClick?: (node: TreeNode) => void;
    
    /**
     * Determines if a node should be rendered as expandable (with children)
     */
    hasChildren?: (node: TreeNode) => boolean;
    
    /**
     * Custom CSS class for leaf nodes
     */
    leafNodeClass?: string;
    
    /**
     * Custom CSS class for scope/branch nodes
     */
    scopeNodeClass?: string;
}

/**
 * Generic tree view component that can be reused for different types of hierarchical data.
 * This component renders a hierarchical tree structure with expandable/collapsible nodes.
 */
export class TreeView extends HTMLElement {
    private _data: TreeNode[] = [];
    private _config: TreeViewConfig = {};
    private container: HTMLDivElement;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        this.shadowRoot!.adoptedStyleSheets = [scrollbarSheet, css(treeViewCss)];

        this.shadowRoot!.innerHTML = `
        <div id="tree-container"></div>
        `;

        this.container = this.shadowRoot!.querySelector('#tree-container') as HTMLDivElement;
        
        // Load initial indent setting
        this.loadIndentSetting();
        
        // Listen for setting changes
        this.addEventListener('setting-changed', (e: Event) => {
            const customEvent = e as CustomEvent;
            const { path, value } = customEvent.detail;
            
            if (path === 'Interface/Tree Indent') {
                this.updateIndent(value);
            }
        });
    }
    
    private async loadIndentSetting() {
        const indent = await getSetting('Interface/Tree Indent');
        if (indent !== undefined) {
            this.updateIndent(indent);
        }
    }
    
    private updateIndent(value: number) {
        if (this.shadowRoot) {
            this.shadowRoot.host.style.setProperty('--tree-indent', `${value}px`);
        }
    }

    set data(data: TreeNode[]) {
        this._data = data;
        this.render();
    }

    get data() {
        return this._data;
    }

    set config(config: TreeViewConfig) {
        this._config = config;
        this.render();
    }

    get config() {
        return this._config;
    }

    render() {
        this.container.innerHTML = '';

        if (!this._data || this._data.length === 0) {
            this.container.innerHTML = '<div class="empty-msg">No items</div>';
            return;
        }

        this._data.forEach(node => {
            this.container.appendChild(this.createNodeElement(node));
        });
    }

    private createNodeElement(node: TreeNode): HTMLElement {
        const hasChildren = this._config.hasChildren 
            ? this._config.hasChildren(node)
            : (node.children && node.children.length > 0);

        if (hasChildren) {
            return this.createBranchElement(node);
        } else {
            return this.createLeafElement(node);
        }
    }

    private createBranchElement(node: TreeNode): HTMLElement {
        const details = document.createElement('details');
        details.className = this._config.scopeNodeClass || 'tree-node';
        details.open = true;

        const summary = document.createElement('summary');
        summary.textContent = node.name;
        details.appendChild(summary);

        // Recursively add children
        if (node.children) {
            node.children.forEach(child => {
                details.appendChild(this.createNodeElement(child));
            });
        }

        return details;
    }

    private createLeafElement(node: TreeNode): HTMLElement {
        const div = document.createElement('div');
        div.className = this._config.leafNodeClass || 'leaf-node';
        div.textContent = node.name;
        div.dataset.id = String(node.id);

        if (this._config.onLeafClick) {
            div.addEventListener('click', () => {
                this._config.onLeafClick!(node);
            });
        }

        return div;
    }
}

if (!customElements.get('tree-view')) {
    customElements.define('tree-view', TreeView);
}
