import { TreeView, TreeNode } from "./tree-view.js";
import { css } from "../../utils/css-utils.js";
import selectedSignalsTreeCss from "./selected-signals-tree.css?inline";
import { ContextMenu } from "../primitives/context-menu.js";
import "./tree-view.js";
import "../primitives/context-menu.js";

export interface SelectedSignal {
    name: string;
    ref: number;
    path?: string; // Full hierarchical path
    showFullPath?: boolean; // Whether to display the full path or just the name
}

/**
 * SelectedSignalsTree component displays a list of currently selected signals.
 * It uses the generic TreeView to show a flat list of selected signals with drag-and-drop support.
 */
export class SelectedSignalsTree extends TreeView {
    private _signals: SelectedSignal[] = [];
    private contextMenu: ContextMenu;

    constructor() {
        super();
        
        // Add SelectedSignalsTree-specific styling
        if (this.shadowRoot) {
            const existingSheets = Array.from(this.shadowRoot.adoptedStyleSheets);
            this.shadowRoot.adoptedStyleSheets = [...existingSheets, css(selectedSignalsTreeCss)];
        }
        
        // Create context menu
        this.contextMenu = document.createElement('context-menu') as ContextMenu;
        document.body.appendChild(this.contextMenu);
        
        // Configure the tree view for selected signals display with drag-and-drop
        this.config = {
            onLeafClick: (node: TreeNode) => {
                // Optional: could dispatch events for signal interaction
                // For now, signals are just displayed
            },
            leafNodeClass: 'signal-node',
            scopeNodeClass: 'tree-node',
            draggableLeaves: true,
            textAlign: 'right',
            onDrop: (draggedNode: TreeNode, targetNode: TreeNode, position: 'before' | 'after') => {
                this.handleSignalReorder(draggedNode, targetNode, position);
            }
        };
    }
    
    connectedCallback() {
        super.connectedCallback();
        
        // Add right-click handler to the shadow root container
        const container = this.shadowRoot?.querySelector('#tree-container');
        if (container) {
            container.addEventListener('contextmenu', this.handleContextMenu.bind(this));
        }
    }
    
    disconnectedCallback() {
        super.disconnectedCallback();
        
        // Clean up context menu
        if (this.contextMenu && this.contextMenu.parentNode) {
            this.contextMenu.parentNode.removeChild(this.contextMenu);
        }
    }
    
    private handleContextMenu(event: MouseEvent) {
        event.preventDefault();
        
        // Find the clicked signal node
        const target = event.target as HTMLElement;
        const leafNode = target.closest('.leaf-node') as HTMLElement;
        
        if (!leafNode) {
            return;
        }
        
        const signalRef = parseInt(leafNode.dataset.id || '0', 10);
        const signal = this._signals.find(s => s.ref === signalRef);
        
        if (!signal) {
            return;
        }
        
        // Show context menu with toggle option
        this.contextMenu.items = [
            {
                id: 'toggle-path',
                label: signal.showFullPath ? 'Show Name Only' : 'Show Full Path',
                action: () => {
                    this.toggleSignalPath(signalRef);
                }
            }
        ];
        
        this.contextMenu.open(event.clientX, event.clientY);
    }
    
    private toggleSignalPath(signalRef: number) {
        const signal = this._signals.find(s => s.ref === signalRef);
        if (!signal) {
            return;
        }
        
        // Toggle the showFullPath flag
        signal.showFullPath = !signal.showFullPath;
        
        // Dispatch event to notify parent component
        this.dispatchEvent(new CustomEvent('signal-path-toggled', {
            detail: {
                ref: signalRef,
                showFullPath: signal.showFullPath
            },
            bubbles: true,
            composed: true
        }));
        
        // Update the display
        this.updateTreeData();
    }

    set signals(signals: SelectedSignal[]) {
        this._signals = signals;
        this.updateTreeData();
    }

    get signals() {
        return this._signals;
    }

    private handleSignalReorder(draggedNode: TreeNode, targetNode: TreeNode, position: 'before' | 'after') {
        // Find indices of dragged and target signals
        const draggedSignalIndex = this._signals.findIndex(s => s.ref === draggedNode.id);
        const targetSignalIndex = this._signals.findIndex(s => s.ref === targetNode.id);
        
        if (draggedSignalIndex === -1 || targetSignalIndex === -1) {
            return;
        }
        
        // Remove the dragged signal from its current position
        const [draggedSignal] = this._signals.splice(draggedSignalIndex, 1);
        
        // Calculate the new insertion index
        // If we removed an item before the target, we need to adjust the target index
        let insertIndex = targetSignalIndex;
        if (draggedSignalIndex < targetSignalIndex) {
            insertIndex--;
        }
        
        // Insert after or before based on position
        if (position === 'after') {
            insertIndex++;
        }
        
        this._signals.splice(insertIndex, 0, draggedSignal);
        
        // Dispatch event to notify parent component about the reorder
        this.dispatchEvent(new CustomEvent('signals-reordered', {
            detail: {
                signals: this._signals
            },
            bubbles: true,
            composed: true
        }));
        
        // Update the tree display
        this.updateTreeData();
    }

    private updateTreeData() {
        // Convert signals to tree nodes (flat list, no hierarchy)
        const treeNodes: TreeNode[] = this._signals.map(signal => {
            return {
                name: signal.name,
                id: signal.ref
            };
        });

        super.data = treeNodes;
        
        // After the tree is rendered, we need to update the text display for signals with full paths
        // Use requestAnimationFrame to ensure DOM is updated
        requestAnimationFrame(() => {
            this.updateSignalDisplays();
        });
    }
    
    /**
     * Update the display of signal names to show path with dimmed styling
     */
    private updateSignalDisplays() {
        const container = this.shadowRoot?.querySelector('#tree-container');
        if (!container) {
            return;
        }
        
        this._signals.forEach(signal => {
            if (!signal.showFullPath || !signal.path) {
                return;
            }
            
            // Find the leaf node for this signal
            const leafNode = container.querySelector(`.leaf-node[data-id="${signal.ref}"]`);
            if (!leafNode) {
                return;
            }
            
            // Find the text span
            const textSpan = leafNode.querySelector('span:not(.tree-icon-button *)') as HTMLElement;
            if (!textSpan) {
                return;
            }
            
            // Split path into prefix and name
            const pathParts = signal.path.split('.');
            if (pathParts.length > 1) {
                const pathPrefix = pathParts.slice(0, -1).join('.');
                
                // Replace text content with structured HTML
                textSpan.innerHTML = '';
                
                const dimmedSpan = document.createElement('span');
                dimmedSpan.className = 'signal-path-dimmed';
                dimmedSpan.textContent = pathPrefix + '.';
                
                const nameSpan = document.createElement('span');
                nameSpan.className = 'signal-name';
                nameSpan.textContent = signal.name;
                
                textSpan.appendChild(dimmedSpan);
                textSpan.appendChild(nameSpan);
            }
        });
    }
}

if (!customElements.get('selected-signals-tree')) {
    customElements.define('selected-signals-tree', SelectedSignalsTree);
}
