import { DockManager } from "./docking/dock-manager.js";
import { DockLayout, DockStack, DockNode } from "./docking/types.js";
import { DockLayoutHelper } from "./dock-layout-helper.js";

/**
 * Generic manager for activating and closing panes (settings, about, etc.)
 */
export class PaneManager {
    private dockManager: DockManager;
    private layoutHelper: DockLayoutHelper;

    constructor(dockManager: DockManager, layoutHelper: DockLayoutHelper) {
        this.dockManager = dockManager;
        this.layoutHelper = layoutHelper;
    }

    /**
     * Activate a pane in the biggest stack
     * @param paneId The pane ID
     * @param title The pane title
     * @param contentId The content ID registered with the dock manager
     * @param closable Whether the pane can be closed
     */
    activatePane(paneId: string, title: string, contentId: string, closable: boolean = true): void {
        const layout = this.dockManager.layout;
        if (!layout) {
            console.warn('No layout available to activate pane');
            return;
        }

        const biggestStack = this.layoutHelper.findBiggestStack(layout.root);
        if (!biggestStack) {
            console.warn('Could not find any stack to activate pane');
            return;
        }

        // Check if pane already exists in this stack
        const paneExists = biggestStack.children.some(p => p.id === paneId);
        
        if (!paneExists) {
            // Add pane to the biggest stack
            biggestStack.children.push({
                id: paneId,
                title: title,
                contentId: contentId,
                closable: closable
            });
        }

        // Activate the pane
        biggestStack.activeId = paneId;
        this.dockManager.layout = layout; // Trigger re-render
    }

    /**
     * Close a pane and remove it from all stacks
     * @param paneId The pane ID to close
     */
    closePane(paneId: string): void {
        const layout = this.dockManager.layout;
        if (!layout) return;

        // Find and remove pane from all stacks
        this.removePaneFromNode(layout.root, paneId);
        this.dockManager.layout = layout; // Trigger re-render
    }

    /**
     * Recursively remove a pane from a dock node and its children
     */
    private removePaneFromNode(node: DockNode, paneId: string): void {
        if (node.type === 'stack') {
            node.children = node.children.filter(p => p.id !== paneId);
            if (node.activeId === paneId) {
                node.activeId = node.children.length > 0 ? node.children[0].id : null;
            }
        } else if (node.type === 'box') {
            for (const child of node.children) {
                this.removePaneFromNode(child, paneId);
            }
        }
    }
}
