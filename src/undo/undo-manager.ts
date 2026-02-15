import { UndoTree } from '../undo/undo-tree.js';

/**
 * Interface for objects that can be saved/restored
 */
export interface UndoableState {
    /**
     * Get a serializable representation of the current state
     */
    captureState(): any;

    /**
     * Restore state from a captured representation
     */
    restoreState(state: any): void;
}

/**
 * Manages undo/redo operations for the application
 * Coordinates between the UI and the undo tree
 */
export class UndoManager<T = any> {
    private undoTree: UndoTree<T>;
    private onChange: (() => void) | null = null;

    constructor() {
        this.undoTree = new UndoTree<T>();
    }

    /**
     * Get the underlying undo tree
     */
    getUndoTree(): UndoTree<T> {
        return this.undoTree;
    }

    /**
     * Register a callback to be called when the tree changes
     */
    setOnChange(callback: () => void): void {
        this.onChange = callback;
    }

    /**
     * Record a new state
     */
    recordState(state: T, description: string): void {
        this.undoTree.addState(state, description);
        this.notifyChange();
    }

    /**
     * Undo to previous state
     * Returns the previous state or null if at root
     */
    undo(): T | null {
        const state = this.undoTree.undo();
        this.notifyChange();
        return state;
    }

    /**
     * Redo to next state
     * Returns the next state or null if no children
     */
    redo(): T | null {
        const state = this.undoTree.redo();
        this.notifyChange();
        return state;
    }

    /**
     * Navigate to a specific node
     */
    navigateTo(nodeId: string): T | null {
        const state = this.undoTree.navigateTo(nodeId);
        this.notifyChange();
        return state;
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
     * Get the current state
     */
    getCurrentState(): T | null {
        const node = this.undoTree.getCurrentNode();
        return node ? node.state : null;
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
