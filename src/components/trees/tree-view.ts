import { css } from "../../utils/css-utils.js";
import { scrollbarSheet } from "../../styles/shared-sheets.js";
import treeViewCss from "./tree-view.css?inline";
import { getSetting } from "../../settings/settings-storage.js";
import ChevronRightIcon from '~icons/mdi/chevron-right?raw';

export interface TreeNode {
    name: string;
    id: string | number;
    children?: TreeNode[];
}

export interface TreeIconButton {
    /**
     * SVG icon to display (raw SVG string from unplugin-icons)
     */
    icon: string;
    
    /**
     * Tooltip text to display on hover
     */
    tooltip: string;
    
    /**
     * Called when the icon button is clicked
     */
    onClick: (node: TreeNode, event: MouseEvent) => void;
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
    
    /**
     * Whether to show a filter input field above the tree
     */
    showFilter?: boolean;
    
    /**
     * Called when a checkbox is clicked
     */
    onCheckboxChange?: (node: TreeNode, checked: boolean) => void;
    
    /**
     * Whether leaf nodes should be draggable
     */
    draggableLeaves?: boolean;
    
    /**
     * Called when a drag operation starts on a leaf node
     */
    onDragStart?: (node: TreeNode, element: HTMLElement) => void;
    
    /**
     * Called when a dragged item is over another leaf node
     */
    onDragOver?: (draggedNode: TreeNode, targetNode: TreeNode, position: 'before' | 'after') => void;
    
    /**
     * Called when a dragged item is dropped on another leaf node
     */
    onDrop?: (draggedNode: TreeNode, targetNode: TreeNode, position: 'before' | 'after') => void;
    
    /**
     * Called when a drag operation ends
     */
    onDragEnd?: () => void;
    
    /**
     * Icon buttons to display on the right side of leaf nodes
     */
    leafIconButtons?: (node: TreeNode) => TreeIconButton[];
    
    /**
     * Icon buttons to display on the right side of branch/scope nodes
     */
    branchIconButtons?: (node: TreeNode) => TreeIconButton[];
    
    /**
     * Text alignment for leaf nodes. Defaults to 'left'
     */
    textAlign?: 'left' | 'right';
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
    private filterInput: HTMLInputElement | null = null;
    private filterQuery: string = '';
    private indentLoadPromise: Promise<void> | null = null;
    private boundSettingChangeHandler: (e: Event) => void;
    private boundFilterInputHandler: () => void;
    private draggedNode: TreeNode | null = null;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        this.shadowRoot!.adoptedStyleSheets = [scrollbarSheet, css(treeViewCss)];

        this.shadowRoot!.innerHTML = `
        <div id="filter-container" class="filter-container" style="display: none;">
            <input type="text" id="filter-input" class="filter-input" placeholder="Filter..." />
        </div>
        <div id="tree-container"></div>
        `;

        this.container = this.shadowRoot!.querySelector('#tree-container') as HTMLDivElement;
        this.filterInput = this.shadowRoot!.querySelector('#filter-input') as HTMLInputElement;
        
        // Bind filter input handler
        this.boundFilterInputHandler = () => {
            this.filterQuery = this.filterInput?.value.toLowerCase() || '';
            this.render();
        };
        
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
        // Add event listeners when connected
        this.addEventListener('setting-changed', this.boundSettingChangeHandler);
        this.filterInput?.addEventListener('input', this.boundFilterInputHandler);
        
        // Initialize text alignment based on config (do this after element is connected)
        // This ensures the element has been properly initialized before we try to set styles
        if (this._config) {
            this.updateTextAlign(this._config.textAlign || 'left');
        } else {
            this.updateTextAlign('left'); // Default if config hasn't been set yet
        }
        
        // Load indent setting when component is connected to the DOM
        if (!this.indentLoadPromise) {
            this.indentLoadPromise = this.loadIndentSetting();
        }
    }
    
    disconnectedCallback() {
        // Remove event listeners when disconnected to prevent memory leaks
        this.removeEventListener('setting-changed', this.boundSettingChangeHandler);
        this.filterInput?.removeEventListener('input', this.boundFilterInputHandler);
        
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
    
    private updateTextAlign(value: 'left' | 'right') {
        if (value === 'right') {
            this.style.setProperty('--tree-leaf-justify', 'flex-end');
            this.style.setProperty('--tree-leaf-direction', 'row-reverse');
        } else {
            this.style.setProperty('--tree-leaf-justify', 'flex-start');
            this.style.setProperty('--tree-leaf-direction', 'row');
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
        
        // Update filter visibility
        const filterContainer = this.shadowRoot!.querySelector('#filter-container') as HTMLDivElement;
        if (filterContainer) {
            filterContainer.style.display = this._config?.showFilter ? 'block' : 'none';
        }
        
        // Reset filter when config changes
        if (this.filterInput) {
            this.filterInput.value = '';
            this.filterQuery = '';
        }
        
        // Update text alignment - but only if element is connected
        // Otherwise, it will be set in connectedCallback
        if (this.isConnected && this._config) {
            this.updateTextAlign(this._config.textAlign || 'left');
        }
        
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

        // Apply filtering if query exists
        const nodesToRender = this.filterQuery ? this.filterNodes(this._data) : this._data;

        if (nodesToRender.length === 0) {
            this.container.innerHTML = '<div class="empty-msg">No matching items</div>';
            return;
        }

        nodesToRender.forEach(node => {
            this.container.appendChild(this.createNodeElement(node));
        });
    }

    /**
     * Filter nodes recursively based on the query
     * Returns nodes that match or have matching descendants
     */
    private filterNodes(nodes: TreeNode[]): TreeNode[] {
        const filtered: TreeNode[] = [];

        for (const node of nodes) {
            const nameMatches = node.name.toLowerCase().includes(this.filterQuery);
            const hasChildren = this._config.hasChildren 
                ? this._config.hasChildren(node)
                : (node.children && node.children.length > 0);

            if (hasChildren && node.children) {
                // Filter children recursively
                const filteredChildren = this.filterNodes(node.children);
                
                // Include node if it matches or has matching children
                if (nameMatches || filteredChildren.length > 0) {
                    filtered.push({
                        ...node,
                        children: nameMatches ? node.children : filteredChildren
                    });
                }
            } else if (nameMatches) {
                // Leaf node matches
                filtered.push(node);
            }
        }

        return filtered;
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
        
        // Add chevron icon
        const chevronSpan = document.createElement('span');
        chevronSpan.className = 'tree-chevron';
        chevronSpan.innerHTML = ChevronRightIcon;
        summary.appendChild(chevronSpan);
        
        // Create a wrapper for content (text + icon buttons)
        const summaryContent = document.createElement('div');
        summaryContent.className = 'summary-content';
        
        // Add node name text
        const textSpan = document.createElement('span');
        textSpan.textContent = node.name;
        summaryContent.appendChild(textSpan);
        
        // Add icon buttons if configured
        if (this._config.branchIconButtons) {
            const buttons = this._config.branchIconButtons(node);
            if (buttons && buttons.length > 0) {
                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'icon-button-container';
                
                buttons.forEach(btnConfig => {
                    const button = document.createElement('button');
                    button.className = 'tree-icon-button';
                    button.innerHTML = btnConfig.icon;
                    button.title = btnConfig.tooltip;
                    button.setAttribute('aria-label', btnConfig.tooltip);
                    
                    // Stop propagation to prevent details toggle
                    button.addEventListener('click', (e: MouseEvent) => {
                        e.stopPropagation();
                        btnConfig.onClick(node, e);
                    });
                    
                    buttonContainer.appendChild(button);
                });
                
                summaryContent.appendChild(buttonContainer);
            }
        }
        
        summary.appendChild(summaryContent);
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

        // Make the element draggable if configured
        if (this._config.draggableLeaves) {
            div.draggable = true;
            
            // Drag start
            div.addEventListener('dragstart', (e: DragEvent) => {
                this.draggedNode = node;
                div.classList.add('dragging');
                
                if (e.dataTransfer) {
                    e.dataTransfer.effectAllowed = 'move';
                    // Add custom type identifier for tree items
                    e.dataTransfer.setData('application/x-swell-tree-item', String(node.id));
                    e.dataTransfer.setData('text/plain', String(node.id));
                }
                
                if (this._config.onDragStart) {
                    this._config.onDragStart(node, div);
                }
            });
            
            // Drag over
            div.addEventListener('dragover', (e: DragEvent) => {
                if (!this.draggedNode || this.draggedNode.id === node.id) {
                    return;
                }
                
                // Only accept tree item drags (check types if available)
                const hasTypes = e.dataTransfer?.types !== undefined;
                if (hasTypes) {
                    const isTreeItem = e.dataTransfer?.types.includes('application/x-swell-tree-item') ?? false;
                    if (!isTreeItem) {
                        return;
                    }
                }
                
                e.preventDefault();
                e.stopPropagation();
                
                const rect = div.getBoundingClientRect();
                const midpoint = rect.top + rect.height / 2;
                const position = e.clientY < midpoint ? 'before' : 'after';
                
                // Remove previous indicators from all leaf nodes
                const allLeaves = this.container.querySelectorAll('.leaf-node');
                allLeaves.forEach(leaf => {
                    (leaf as HTMLElement).classList.remove('drag-over-top', 'drag-over-bottom');
                });
                
                // Add indicator
                if (position === 'before') {
                    div.classList.add('drag-over-top');
                } else {
                    div.classList.add('drag-over-bottom');
                }
                
                if (this._config.onDragOver) {
                    this._config.onDragOver(this.draggedNode, node, position);
                }
            });
            
            // Drag leave
            div.addEventListener('dragleave', () => {
                div.classList.remove('drag-over-top', 'drag-over-bottom');
            });
            
            // Drop
            div.addEventListener('drop', (e: DragEvent) => {
                if (!this.draggedNode || this.draggedNode.id === node.id) {
                    return;
                }
                
                // Only accept tree item drags (check types if available)
                const hasTypes = e.dataTransfer?.types !== undefined;
                if (hasTypes) {
                    const isTreeItem = e.dataTransfer?.types.includes('application/x-swell-tree-item') ?? false;
                    if (!isTreeItem) {
                        return;
                    }
                }
                
                e.preventDefault();
                e.stopPropagation();
                
                const rect = div.getBoundingClientRect();
                const midpoint = rect.top + rect.height / 2;
                const position = e.clientY < midpoint ? 'before' : 'after';
                
                // Remove indicators
                div.classList.remove('drag-over-top', 'drag-over-bottom');
                
                if (this._config.onDrop) {
                    this._config.onDrop(this.draggedNode, node, position);
                }
            });
            
            // Drag end
            div.addEventListener('dragend', () => {
                div.classList.remove('dragging', 'drag-over-top', 'drag-over-bottom');
                
                // Remove indicators from all leaf nodes
                const allLeaves = this.container.querySelectorAll('.leaf-node');
                allLeaves.forEach(leaf => {
                    (leaf as HTMLElement).classList.remove('drag-over-top', 'drag-over-bottom');
                });
                
                this.draggedNode = null;
                
                if (this._config.onDragEnd) {
                    this._config.onDragEnd();
                }
            });
        }

        // Add checkbox if enabled
        if (this._config.showCheckboxes) {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'leaf-checkbox';
            checkbox.checked = this._config.isChecked ? this._config.isChecked(node) : false;
            // Prevent checkbox click from triggering leaf click
            checkbox.addEventListener('click', (e) => {
                e.stopPropagation();
                // Call the checkbox change handler if provided
                if (this._config.onCheckboxChange) {
                    this._config.onCheckboxChange(node, checkbox.checked);
                }
            });
            div.appendChild(checkbox);
        }

        // Always add text span for node name
        const textSpan = document.createElement('span');
        textSpan.textContent = node.name;
        div.appendChild(textSpan);
        
        // Add icon buttons if configured
        if (this._config.leafIconButtons) {
            const buttons = this._config.leafIconButtons(node);
            if (buttons && buttons.length > 0) {
                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'icon-button-container';
                
                buttons.forEach(btnConfig => {
                    const button = document.createElement('button');
                    button.className = 'tree-icon-button';
                    button.innerHTML = btnConfig.icon;
                    button.title = btnConfig.tooltip;
                    button.setAttribute('aria-label', btnConfig.tooltip);
                    
                    // Stop propagation to prevent leaf click
                    button.addEventListener('click', (e: MouseEvent) => {
                        e.stopPropagation();
                        btnConfig.onClick(node, e);
                    });
                    
                    buttonContainer.appendChild(button);
                });
                
                div.appendChild(buttonContainer);
            }
        }

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
