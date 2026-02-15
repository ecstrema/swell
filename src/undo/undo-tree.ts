/**
 * Interface for undoable operations
 * Each operation must implement do, undo, and redo methods
 */
export interface UndoableOperation {
    /**
     * Execute the operation
     */
    do(): void;

    /**
     * Reverse the operation
     */
    undo(): void;

    /**
     * Re-execute the operation (can use cached results from original do())
     */
    redo(): void;

    /**
     * Human-readable description of the operation
     */
    getDescription(): string;
}

/**
 * Represents a single node in the undo tree
 */
export interface UndoTreeNode {
    id: string;
    operation: UndoableOperation;
    timestamp: number;
    parentId: string | null;
    children: string[]; // IDs of child nodes
}

/**
 * UndoTree manages a tree-based undo/redo system using the command pattern.
 * 
 * Features:
 * - When undoing and then doing new operations, creates a new branch
 * - When redoing, reuses the last branch and can leverage cached results
 * - Maintains full history as a tree structure without storing complete states
 * - Each node contains an operation with do/undo/redo methods
 */
export class UndoTree {
    private nodes: Map<string, UndoTreeNode> = new Map();
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
    getNode(id: string): UndoTreeNode | undefined {
        return this.nodes.get(id);
    }

    /**
     * Get the current node
     */
    getCurrentNode(): UndoTreeNode | null {
        if (!this.currentId) return null;
        return this.nodes.get(this.currentId) || null;
    }

    /**
     * Get all nodes in the tree
     */
    getAllNodes(): Map<string, UndoTreeNode> {
        return new Map(this.nodes);
    }

    /**
     * Get the root node ID
     */
    getRootId(): string | null {
        return this.rootId;
    }

    /**
     * Add a new operation to the tree and execute it
     * If we're not at the latest node, this creates a new branch
     */
    addOperation(operation: UndoableOperation): string {
        const nodeId = this.generateNodeId();
        const node: UndoTreeNode = {
            id: nodeId,
            operation,
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

        // Execute the operation
        operation.do();

        this.currentId = nodeId;
        return nodeId;
    }

    /**
     * Undo - move to parent node and call undo on current operation
     * Returns true if undo was successful, false otherwise
     */
    undo(): boolean {
        if (!this.currentId) return false;

        const current = this.nodes.get(this.currentId);
        if (!current || !current.parentId) return false;

        // Call undo on the current operation
        current.operation.undo();

        this.currentId = current.parentId;
        return true;
    }

    /**
     * Redo - move forward in the tree and call redo on the operation
     * When redoing, reuse the last branch (rightmost/most recent child)
     * The redo method can use cached results from the original do()
     * Returns true if redo was successful, false otherwise
     */
    redo(): boolean {
        if (!this.currentId) return false;

        const current = this.nodes.get(this.currentId);
        if (!current || current.children.length === 0) return false;

        // Reuse the last branch (most recent child)
        const childId = current.children[current.children.length - 1];
        const child = this.nodes.get(childId);
        if (!child) return false;

        // Call redo on the operation (can use cached results)
        child.operation.redo();

        this.currentId = childId;
        return true;
    }

    /**
     * Navigate to a specific node by ID
     * Applies all operations from current node to target node
     * Returns true if navigation was successful, false otherwise
     */
    navigateTo(nodeId: string): boolean {
        const targetNode = this.nodes.get(nodeId);
        if (!targetNode) return false;

        // Find the common ancestor
        const currentPath = this.getCurrentPath();
        const targetPath = this.getPathToNode(nodeId);

        // Find divergence point
        let commonIndex = 0;
        while (
            commonIndex < currentPath.length &&
            commonIndex < targetPath.length &&
            currentPath[commonIndex] === targetPath[commonIndex]
        ) {
            commonIndex++;
        }

        // Undo back to common ancestor
        for (let i = currentPath.length - 1; i >= commonIndex; i--) {
            const node = this.nodes.get(currentPath[i]);
            if (node) {
                node.operation.undo();
            }
        }

        // Redo forward to target
        for (let i = commonIndex; i < targetPath.length; i++) {
            const node = this.nodes.get(targetPath[i]);
            if (node) {
                node.operation.redo();
            }
        }

        this.currentId = nodeId;
        return true;
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

    /**
     * Get the path from root to a specific node
     */
    private getPathToNode(nodeId: string): string[] {
        const path: string[] = [];
        let currentNodeId: string | null = nodeId;

        while (currentNodeId) {
            path.unshift(currentNodeId);
            const node = this.nodes.get(currentNodeId);
            if (!node || !node.parentId) break;
            currentNodeId = node.parentId;
        }

        return path;
    }
}
