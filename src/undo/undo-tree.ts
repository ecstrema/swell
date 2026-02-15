/**
 * Represents a single node in the undo tree
 */
export interface UndoTreeNode<T> {
    id: string;
    state: T;
    description: string;
    timestamp: number;
    parentId: string | null;
    children: string[]; // IDs of child nodes
}

/**
 * UndoTree manages a tree-based undo/redo system.
 * 
 * Features:
 * - When undoing and then doing new operations, creates a new branch
 * - When redoing, reuses the last branch
 * - Maintains full history as a tree structure
 */
export class UndoTree<T> {
    private nodes: Map<string, UndoTreeNode<T>> = new Map();
    private rootId: string | null = null;
    private currentId: string | null = null;
    private nextNodeId: number = 0;

    constructor() {
        // Initialize with an empty state
    }

    /**
     * Get the current node ID
     */
    getCurrentId(): string | null {
        return this.currentId;
    }

    /**
     * Get a node by ID
     */
    getNode(id: string): UndoTreeNode<T> | undefined {
        return this.nodes.get(id);
    }

    /**
     * Get the current node
     */
    getCurrentNode(): UndoTreeNode<T> | null {
        if (!this.currentId) return null;
        return this.nodes.get(this.currentId) || null;
    }

    /**
     * Get all nodes in the tree
     */
    getAllNodes(): Map<string, UndoTreeNode<T>> {
        return new Map(this.nodes);
    }

    /**
     * Get the root node ID
     */
    getRootId(): string | null {
        return this.rootId;
    }

    /**
     * Add a new state to the tree
     * If we're not at the latest node, this creates a new branch
     */
    addState(state: T, description: string): string {
        const nodeId = this.generateNodeId();
        const node: UndoTreeNode<T> = {
            id: nodeId,
            state,
            description,
            timestamp: Date.now(),
            parentId: this.currentId,
            children: []
        };

        this.nodes.set(nodeId, node);

        // Update parent's children list
        if (this.currentId) {
            const parent = this.nodes.get(this.currentId);
            if (parent && !parent.children.includes(nodeId)) {
                parent.children.push(nodeId);
            }
        } else {
            // This is the root node
            this.rootId = nodeId;
        }

        this.currentId = nodeId;
        return nodeId;
    }

    /**
     * Undo - move to parent node
     * Returns the state of the parent node, or null if at root
     */
    undo(): T | null {
        if (!this.currentId) return null;

        const current = this.nodes.get(this.currentId);
        if (!current || !current.parentId) return null;

        const parent = this.nodes.get(current.parentId);
        if (!parent) return null;

        this.currentId = current.parentId;
        return parent.state;
    }

    /**
     * Redo - move forward in the tree
     * When redoing, reuse the last branch (rightmost/most recent child)
     * Returns the state of the child node, or null if no children
     */
    redo(): T | null {
        if (!this.currentId) return null;

        const current = this.nodes.get(this.currentId);
        if (!current || current.children.length === 0) return null;

        // Reuse the last branch (most recent child)
        const childId = current.children[current.children.length - 1];
        const child = this.nodes.get(childId);
        if (!child) return null;

        this.currentId = childId;
        return child.state;
    }

    /**
     * Navigate to a specific node by ID
     * Returns the state of that node, or null if not found
     */
    navigateTo(nodeId: string): T | null {
        const node = this.nodes.get(nodeId);
        if (!node) return null;

        this.currentId = nodeId;
        return node.state;
    }

    /**
     * Check if we can undo
     */
    canUndo(): boolean {
        if (!this.currentId) return false;
        const current = this.nodes.get(this.currentId);
        return current !== undefined && current.parentId !== null;
    }

    /**
     * Check if we can redo
     */
    canRedo(): boolean {
        if (!this.currentId) return false;
        const current = this.nodes.get(this.currentId);
        return current !== undefined && current.children.length > 0;
    }

    /**
     * Clear the entire tree
     */
    clear(): void {
        this.nodes.clear();
        this.rootId = null;
        this.currentId = null;
        this.nextNodeId = 0;
    }

    /**
     * Get the number of nodes in the tree
     */
    size(): number {
        return this.nodes.size;
    }

    /**
     * Generate a unique node ID
     */
    private generateNodeId(): string {
        return `node-${this.nextNodeId++}`;
    }

    /**
     * Get the path from root to current node
     */
    getCurrentPath(): string[] {
        const path: string[] = [];
        let nodeId = this.currentId;

        while (nodeId) {
            path.unshift(nodeId);
            const node = this.nodes.get(nodeId);
            if (!node || !node.parentId) break;
            nodeId = node.parentId;
        }

        return path;
    }
}
