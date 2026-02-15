import { UndoTree, UndoableOperation } from '../undo/undo-tree.js';

/**
 * Manages undo/redo operations for the application
 * Coordinates between the UI and the undo tree using the command pattern
 */
export class UndoManager {
    private undoTree: UndoTree;
    private onChange: (() => void) | null = null;

    constructor() {
        this.undoTree = new UndoTree();
    }

    /**
     * Get the underlying undo tree
     */
    getUndoTree(): UndoTree {
        return this.undoTree;
    }

    /**
     * Register a callback to be called when the tree changes
     */
    setOnChange(callback: () => void): void {
        this.onChange = callback;
    }

    /**
     * Execute and record a new operation
     */
    execute(operation: UndoableOperation): void {
        this.undoTree.addOperation(operation);
        this.notifyChange();
    }

    /**
     * Undo the current operation
     * Returns true if successful, false otherwise
     */
    undo(): boolean {
        const success = this.undoTree.undo();
        if (success) {
            this.notifyChange();
        }
        return success;
    }

    /**
     * Redo the next operation
     * Returns true if successful, false otherwise
     */
    redo(): boolean {
        const success = this.undoTree.redo();
        if (success) {
            this.notifyChange();
        }
        return success;
    }

    /**
     * Navigate to a specific node
     * Returns true if successful, false otherwise
     */
    navigateTo(nodeId: string): boolean {
        const success = this.undoTree.navigateTo(nodeId);
        if (success) {
            this.notifyChange();
        }
        return success;
    }

    /**
     * Check if undo is available
     */
    canUndo(): boolean {
        return this.undoTree.canUndo();
    }

    /**
     * Check if redo is available
     */
    canRedo(): boolean {
        return this.undoTree.canRedo();
    }

    /**
     * Clear all history
     */
    clear(): void {
        this.undoTree.clear();
        this.notifyChange();
    }

    /**
     * Notify listeners that the tree has changed
     */
    private notifyChange(): void {
        if (this.onChange) {
            this.onChange();
        }
    }
}
