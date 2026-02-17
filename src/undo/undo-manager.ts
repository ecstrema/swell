import { UndoTree, UndoableOperation } from '../undo/undo-tree.js';
import { CompositeOperation } from './composite-operation.js';

/**
 * Manages undo/redo operations for the application
 * Coordinates between the UI and the undo tree using the command pattern
 */
export class UndoManager {
    private undoTree: UndoTree;
    private onChange: (() => void) | null = null;
    private currentBatch: CompositeOperation | null = null;

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
     * If batching is active, executes immediately and adds to the current batch
     */
    execute(operation: UndoableOperation): void {
        if (this.currentBatch) {
            // Execute the operation immediately
            operation.do();
            // Add to the current batch for undo/redo
            this.currentBatch.addOperation(operation);
        } else {
            // Execute immediately and add to tree
            this.undoTree.addOperation(operation);
            this.notifyChange();
        }
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
     * Start batching operations
     * All operations executed between startBatch() and endBatch() will be grouped
     * @param description Human-readable description for the batch
     * @throws Error if a batch is already in progress
     */
    startBatch(description: string): void {
        if (this.currentBatch) {
            throw new Error('Cannot start a new batch while another is in progress');
        }
        this.currentBatch = new CompositeOperation(description);
    }

    /**
     * End batching and add all batched operations as a single undoable operation
     * If no operations were batched, does nothing
     * @throws Error if no batch is in progress
     */
    endBatch(): void {
        if (!this.currentBatch) {
            throw new Error('No batch in progress');
        }

        // Only add to tree if there are operations in the batch
        // Note: Operations have already been executed via execute()
        if (this.currentBatch.getOperationCount() > 0) {
            // Add the composite to the tree WITHOUT executing (already done)
            // We need to manually add it to avoid executing twice
            const nodeId = this.undoTree.addOperationWithoutExecuting(this.currentBatch);
            this.notifyChange();
        }

        this.currentBatch = null;
    }

    /**
     * Check if batching is currently active
     */
    isBatching(): boolean {
        return this.currentBatch !== null;
    }

    /**
     * Cancel the current batch and undo all operations that were added to it
     * Useful for error handling or canceling a batch operation
     */
    cancelBatch(): void {
        if (this.currentBatch) {
            // Undo all operations that were added to the batch
            this.currentBatch.undo();
        }
        this.currentBatch = null;
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
