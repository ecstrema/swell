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
 * It uses the generic TreeView to show a flat list of selected signals.
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
        
        // Configure the tree view for selected signals display
        this.config = {
            onLeafClick: (node: TreeNode) => {
                // Optional: could dispatch events for signal interaction
                // For now, signals are just displayed
            },
            leafNodeClass: 'signal-node',
            scopeNodeClass: 'tree-node'
        };
    }

    set signals(signals: SelectedSignal[]) {
        this._signals = signals;
        this.updateTreeData();
    }

    get signals() {
        return this._signals;
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
