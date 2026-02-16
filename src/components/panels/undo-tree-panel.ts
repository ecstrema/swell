import { css } from "../../utils/css-utils.js";
import { UndoTree, UndoTreeNode } from "../../undo/undo-tree.js";
import undoTreePanelCss from "./undo-tree-panel.css?inline";

/**
 * UndoTreePanel displays the undo tree as a visual tree structure
 * Users can click on nodes to navigate to different states
 */
export class UndoTreePanel extends HTMLElement {
    private undoTree: UndoTree | null = null;
    private contentContainer: HTMLElement;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot!.adoptedStyleSheets = [css(undoTreePanelCss)];

        this.shadowRoot!.innerHTML = `
            <div class="undo-tree-container">
                <div class="header">
                    <h3>Undo History</h3>
                </div>
                <div class="tree-content"></div>
            </div>
        `;

        this.contentContainer = this.shadowRoot!.querySelector('.tree-content')!;
        
        // Initial render
        this.render();
    }

    /**
     * Set the undo tree to display
     */
    setUndoTree(tree: UndoTree): void {
        this.undoTree = tree;
        this.render();
    }

    /**
     * Refresh the tree display
     */
    refresh(): void {
        this.render();
    }

    /**
     * Render the tree structure
     */
    private render(): void {
        if (!this.undoTree) {
            this.contentContainer.innerHTML = '<div class="empty-state">No undo history</div>';
            return;
        }

        const rootId = this.undoTree.getRootId();
        if (!rootId) {
            this.contentContainer.innerHTML = '<div class="empty-state">No undo history</div>';
            return;
        }

        const currentId = this.undoTree.getCurrentId();
        this.contentContainer.innerHTML = '';
        
        // Render tree starting from root
        const treeElement = this.renderNode(rootId, currentId);
        if (treeElement) {
            this.contentContainer.appendChild(treeElement);
        }
    }

    /**
     * Render a single node and its children
     */
    private renderNode(nodeId: string, currentId: string | null): HTMLElement | null {
        const node = this.undoTree?.getNode(nodeId);
        if (!node) return null;

        const nodeElement = document.createElement('div');
        nodeElement.className = 'tree-node';

        const nodeContent = document.createElement('div');
        nodeContent.className = 'node-content';
        if (nodeId === currentId) {
            nodeContent.classList.add('current');
        }

        const nodeLabel = document.createElement('span');
        nodeLabel.className = 'node-label';
        nodeLabel.textContent = node.operation.getDescription();
        
        const nodeTime = document.createElement('span');
        nodeTime.className = 'node-time';
        nodeTime.textContent = this.formatTimestamp(node.timestamp);

        nodeContent.appendChild(nodeLabel);
        nodeContent.appendChild(nodeTime);
        
        // Add click handler
        nodeContent.addEventListener('click', () => {
            this.handleNodeClick(nodeId);
        });

        nodeElement.appendChild(nodeContent);

        // Render children
        if (node.children.length > 0) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'node-children';

            for (const childId of node.children) {
                const childElement = this.renderNode(childId, currentId);
                if (childElement) {
                    childrenContainer.appendChild(childElement);
                }
            }

            nodeElement.appendChild(childrenContainer);
        }

        return nodeElement;
    }

    /**
     * Handle node click - navigate to that state
     */
    private handleNodeClick(nodeId: string): void {
        this.dispatchEvent(new CustomEvent('node-select', {
            detail: { nodeId },
            bubbles: true,
            composed: true
        }));
    }

    /**
     * Format timestamp for display
     */
    private formatTimestamp(timestamp: number): string {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - timestamp;

        // If less than a minute ago
        if (diff < 60000) {
            return 'just now';
        }

        // If less than an hour ago
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `${minutes}m ago`;
        }

        // If today
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        // Otherwise show date
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
}

if (!customElements.get('undo-tree-panel')) {
    customElements.define('undo-tree-panel', UndoTreePanel);
}
