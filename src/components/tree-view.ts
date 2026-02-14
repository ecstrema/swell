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
    
    /**
     * Function to determine if a leaf node should show a checkbox as checked
     */
    isChecked?: (node: TreeNode) => boolean;
    
    /**
     * Whether to show checkboxes for leaf nodes
     */
    showCheckboxes?: boolean;
}

/**
 * Generic tree view component that can be reused for different types of hierarchical data.
 * This component renders a hierarchical tree structure with expandable/collapsible nodes.
 */
export class TreeView extends HTMLElement {
    private static readonly INDENT_SETTING_PATH = 'Interface/Tree Indent';
    
    private _data: TreeNode[] = [];
    private _config: TreeViewConfig = {};
    private container: HTMLDivElement;
    private indentLoadPromise: Promise<void> | null = null;
    private boundSettingChangeHandler: (e: Event) => void;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        this.shadowRoot!.adoptedStyleSheets = [scrollbarSheet, css(treeViewCss)];

        this.shadowRoot!.innerHTML = `
        <div id="tree-container"></div>
        `;

        this.container = this.shadowRoot!.querySelector('#tree-container') as HTMLDivElement;
        
        // Bind setting change handler
        this.boundSettingChangeHandler = (e: Event) => {
            const customEvent = e as CustomEvent;
            const { path, value } = customEvent.detail;
            
            if (path === TreeView.INDENT_SETTING_PATH) {
                this.updateIndent(value);
            }
        };
    }
    
    connectedCallback() {
        // Add event listener when connected
        this.addEventListener('setting-changed', this.boundSettingChangeHandler);
        
        // Load indent setting when component is connected to the DOM
        if (!this.indentLoadPromise) {
            this.indentLoadPromise = this.loadIndentSetting();
        }
    }
    
    disconnectedCallback() {
        // Remove event listener when disconnected to prevent memory leaks
        this.removeEventListener('setting-changed', this.boundSettingChangeHandler);
        
        // Clear promise to allow reloading when reconnected
        this.indentLoadPromise = null;
    }
    
    private async loadIndentSetting() {
        try {
            const indent = await getSetting(TreeView.INDENT_SETTING_PATH);
            if (indent !== undefined) {
                this.updateIndent(indent);
            }
        } catch (e) {
            // Silently fail in test environments or when settings aren't available
            // The default CSS value will be used
        }
    }
    
    private updateIndent(value: number) {
        this.style.setProperty('--tree-indent', `${value}px`);
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
        // Always apply base leaf-node class, then add custom class if specified
        div.className = this._config.leafNodeClass 
            ? `leaf-node ${this._config.leafNodeClass}`
            : 'leaf-node';
        div.dataset.id = String(node.id);

        // Add checkbox if enabled
        if (this._config.showCheckboxes) {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'leaf-checkbox';
            checkbox.checked = this._config.isChecked ? this._config.isChecked(node) : false;
            // Prevent checkbox click from triggering leaf click
            checkbox.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            div.appendChild(checkbox);
        }

        // Always add text span for node name
        const textSpan = document.createElement('span');
        textSpan.textContent = node.name;
        div.appendChild(textSpan);

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
