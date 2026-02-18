import { DockManager } from "../extensions/dock-extension/dock-manager.js";
import { DockLayout, DockStack, DockNode } from "../extensions/dock-extension/types.js";

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

        // Just render - don't cleanup, as that might remove the main stack
        // before the sidebar is hidden. The sidebar visibility update will
        // handle rendering after the final layout state is determined.
        this.dockManager.render();
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
                    activeId: 'netlist-pane',
                    children: [
                        {
                            id: 'netlist-pane',
                            title: 'Netlist',
                            contentId: 'netlist',
                            closable: false
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
                activeId: 'netlist-pane',
                children: [
                    {
                        id: 'netlist-pane',
                        title: 'Netlist',
                        contentId: 'netlist',
                        closable: false
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

    /**
     * Find the sidebar stack
     */
    private findSidebarStack(): DockStack | null {
        const layout = this.dockManager.layout;
        if (!layout || layout.root.type !== 'box') return null;

        const rootBox = layout.root;
        for (const child of rootBox.children) {
            if (child.type === 'stack' && child.id === 'sidebar-stack') {
                return child;
            }
        }
        return null;
    }

    /**
     * Toggle undo history pane visibility in the sidebar
     * @returns new visibility state (true = visible, false = hidden)
     */
    toggleUndoPaneVisibility(): boolean {
        const sidebarStack = this.findSidebarStack();
        if (!sidebarStack) return false;

        const undoPaneIndex = sidebarStack.children.findIndex(
            p => p.id === 'undo-tree-pane'
        );

        if (undoPaneIndex === -1) {
            // Undo pane is hidden, add it
            sidebarStack.children.push({
                id: 'undo-tree-pane',
                title: 'Undo History',
                contentId: 'undo-tree',
                closable: true
            });
            this.dockManager.render();
            return true;
        } else {
            // Undo pane is visible, remove it
            sidebarStack.children.splice(undoPaneIndex, 1);
            // If the active pane was the undo pane, switch to another pane
            if (sidebarStack.activeId === 'undo-tree-pane') {
                sidebarStack.activeId = sidebarStack.children.length > 0 ? sidebarStack.children[0].id : null;
            }
            this.dockManager.render();
            return false;
        }
    }

    /**
     * Check if undo history pane is currently visible in the sidebar
     */
    isUndoPaneVisible(): boolean {
        const sidebarStack = this.findSidebarStack();
        if (!sidebarStack) return false;

        return sidebarStack.children.some(p => p.id === 'undo-tree-pane');
    }

    /**
     * Activate a pane in the biggest stack by its registered content id.
     * If the pane already exists, activates it. Otherwise, adds it to the biggest stack.
     * The pane title and closable flag come from the content registry (set during registerContent).
     * @param id The content id (registered via DockExtension.registerContent)
     */
    activatePane(id: string): void {
        const layout = this.dockManager.layout;
        if (!layout) {
            console.warn('No layout available to activate pane');
            return;
        }

        // First check if the pane already exists anywhere in the layout
        const existingStack = this.findStackContainingPane(layout.root, id);
        if (existingStack) {
            // Pane exists, just activate it
            existingStack.activeId = id;
            this.dockManager.layout = layout; // Trigger re-render
            return;
        }

        // Look up pane metadata from the content registry
        const info = this.dockManager.getContentInfo(id);
        if (!info) {
            console.warn(`No content registered for id: ${id}`);
            return;
        }

        // Pane doesn't exist, add it to the biggest stack
        const biggestStack = this.findBiggestStack(layout.root);
        if (!biggestStack) {
            console.warn('Could not find any stack to activate pane');
            return;
        }

        // Add pane to the biggest stack
        biggestStack.children.push({
            id: id,
            title: info.title,
            contentId: id,
            closable: info.closable
        });

        // Activate the pane
        biggestStack.activeId = id;
        this.dockManager.layout = layout; // Trigger re-render
    }

    /**
     * Find the stack containing a specific pane
     */
    private findStackContainingPane(node: DockNode, paneId: string): DockStack | null {
        if (node.type === 'stack') {
            if (node.children.some(p => p.id === paneId)) {
                return node;
            }
            return null;
        }

        if (node.type === 'box') {
            for (const child of node.children) {
                const result = this.findStackContainingPane(child, paneId);
                if (result) return result;
            }
        }

        return null;
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

        // Clean up empty stacks and redistribute their space
        const didCleanup = this.dockManager.cleanupEmptyStacks();

        // If cleanup didn't happen, trigger re-render to show placeholder
        if (!didCleanup) {
            this.dockManager.layout = layout;
        }
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
