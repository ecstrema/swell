import { DockManager } from "./docking/dock-manager.js";
import { DockLayout, DockStack, DockNode } from "./docking/types.js";

// Layout constants
const SIDEBAR_DEFAULT_WEIGHT = 20;

/**
 * Helper utilities for managing docking layout and panes
 */
export class DockLayoutHelper {
    private dockManager: DockManager;

    constructor(dockManager: DockManager) {
        this.dockManager = dockManager;
    }

    /**
     * Find the main stack in the layout
     */
    findMainStack(): DockStack | null {
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

    /**
     * Find the biggest stack in the layout (by weight)
     */
    findBiggestStack(node: DockNode): DockStack | null {
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

    /**
     * Add a file pane to the main stack
     */
    addDockPane(fileId: string): void {
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

    /**
     * Remove a file pane from the main stack
     */
    removeDockPane(fileId: string): void {
        const mainStack = this.findMainStack();
        if (!mainStack) return;

        const paneId = `file-pane-${fileId}`;
        mainStack.children = mainStack.children.filter(p => p.id !== paneId);

        if (mainStack.activeId === paneId) {
            mainStack.activeId = mainStack.children.length > 0 ? mainStack.children[0].id : null;
        }

        // Clean up empty stacks and redistribute their space (includes render)
        this.dockManager.cleanupEmptyStacks();
    }

    /**
     * Update sidebar visibility based on whether files are open
     */
    updateSidebarVisibility(hasFiles: boolean): void {
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
                    weight: SIDEBAR_DEFAULT_WEIGHT,
                    activeId: 'signal-selection-pane',
                    children: [
                        {
                            id: 'signal-selection-pane',
                            title: 'Signal Selection',
                            contentId: 'signal-selection',
                            closable: false
                        },
                        {
                            id: 'undo-tree-pane',
                            title: 'Undo History',
                            contentId: 'undo-tree',
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
     * Set the active pane in the main stack
     */
    setActivePane(paneId: string): void {
        const mainStack = this.findMainStack();
        if (mainStack) {
            mainStack.activeId = paneId;
            this.dockManager.render();
        }
    }

    /**
     * Toggle sidebar visibility
     * @returns new visibility state (true = visible, false = hidden)
     */
    toggleSidebarVisibility(): boolean {
        const layout = this.dockManager.layout;
        if (!layout || layout.root.type !== 'box') return false;

        const rootBox = layout.root;
        const sidebarIndex = rootBox.children.findIndex(
            child => child.type === 'stack' && child.id === 'sidebar-stack'
        );

        if (sidebarIndex === -1) {
            // Sidebar is hidden, show it
            const sidebarStack: DockStack = {
                type: 'stack',
                id: 'sidebar-stack',
                weight: SIDEBAR_DEFAULT_WEIGHT,
                activeId: 'signal-selection-pane',
                children: [
                    {
                        id: 'signal-selection-pane',
                        title: 'Signal Selection',
                        contentId: 'signal-selection',
                        closable: false
                    },
                    {
                        id: 'undo-tree-pane',
                        title: 'Undo History',
                        contentId: 'undo-tree',
                        closable: true
                    }
                ]
            };
            rootBox.children.unshift(sidebarStack);
            this.dockManager.render();
            return true;
        } else {
            // Sidebar is visible, hide it
            rootBox.children.splice(sidebarIndex, 1);
            this.dockManager.render();
            return false;
        }
    }

    /**
     * Check if sidebar is currently visible
     */
    isSidebarVisible(): boolean {
        const layout = this.dockManager.layout;
        if (!layout || layout.root.type !== 'box') return false;

        const rootBox = layout.root;
        return rootBox.children.some(
            child => child.type === 'stack' && child.id === 'sidebar-stack'
        );
    }
}
