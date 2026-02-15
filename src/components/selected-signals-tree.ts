import { TreeView, TreeNode } from "./tree-view.js";
import { css } from "../utils/css-utils.js";
import selectedSignalsTreeCss from "./selected-signals-tree.css?inline";
import "./tree-view.js";

export interface SelectedSignal {
    name: string;
    ref: number;
}

/**
 * SelectedSignalsTree component displays a list of currently selected signals.
 * It uses the generic TreeView to show a flat list of selected signals with drag-and-drop support.
 */
export class SelectedSignalsTree extends TreeView {
    private _signals: SelectedSignal[] = [];

    constructor() {
        super();
        
        // Add SelectedSignalsTree-specific styling
        if (this.shadowRoot) {
            const existingSheets = Array.from(this.shadowRoot.adoptedStyleSheets);
            this.shadowRoot.adoptedStyleSheets = [...existingSheets, css(selectedSignalsTreeCss)];
        }
        
        // Configure the tree view for selected signals display with drag-and-drop
        this.config = {
            onLeafClick: (node: TreeNode) => {
                // Optional: could dispatch events for signal interaction
                // For now, signals are just displayed
            },
            leafNodeClass: 'signal-node',
            scopeNodeClass: 'tree-node',
            draggableLeaves: true,
            onDrop: (draggedNode: TreeNode, targetNode: TreeNode, position: 'before' | 'after') => {
                this.handleSignalReorder(draggedNode, targetNode, position);
            }
        };
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
        const draggedIndex = this._signals.findIndex(s => s.ref === draggedNode.id);
        const targetIndex = this._signals.findIndex(s => s.ref === targetNode.id);
        
        if (draggedIndex === -1 || targetIndex === -1) {
            return;
        }
        
        // Remove the dragged signal from its current position
        const [draggedSignal] = this._signals.splice(draggedIndex, 1);
        
        // Calculate the new insertion index
        // If we removed an item before the target, we need to adjust the target index
        let insertIndex = targetIndex;
        if (draggedIndex < targetIndex) {
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
        const treeNodes: TreeNode[] = this._signals.map(signal => ({
            name: signal.name,
            id: signal.ref
        }));

        super.data = treeNodes;
    }
}

if (!customElements.get('selected-signals-tree')) {
    customElements.define('selected-signals-tree', SelectedSignalsTree);
}
