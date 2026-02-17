import { describe, it, expect, beforeEach } from 'vitest';
import { UndoManager } from './undo-manager.js';
import { UndoableOperation } from './undo-tree.js';

// Test state
interface TestState {
    signals: string[];
}

// Helper to create signal add operation
function createAddSignalOperation(
    state: TestState,
    signalName: string
): UndoableOperation {
    return {
        do: () => {
            state.signals.push(signalName);
        },
        undo: () => {
            const index = state.signals.indexOf(signalName);
            if (index > -1) {
                state.signals.splice(index, 1);
            }
        },
        redo: () => {
            state.signals.push(signalName);
        },
        getDescription: () => `Add signal ${signalName}`
    };
}

// Helper to create signal remove operation
function createRemoveSignalOperation(
    state: TestState,
    signalName: string
): UndoableOperation {
    let savedIndex: number = -1;
    
    return {
        do: () => {
            savedIndex = state.signals.indexOf(signalName);
            if (savedIndex > -1) {
                state.signals.splice(savedIndex, 1);
            }
        },
        undo: () => {
            if (savedIndex > -1) {
                state.signals.splice(savedIndex, 0, signalName);
            }
        },
        redo: () => {
            const index = state.signals.indexOf(signalName);
            if (index > -1) {
                state.signals.splice(index, 1);
            }
        },
        getDescription: () => `Remove signal ${signalName}`
    };
}

describe('UndoManager Batching', () => {
    let undoManager: UndoManager;
    let state: TestState;

    beforeEach(() => {
        undoManager = new UndoManager();
        state = { signals: [] };
    });

    describe('Batch Lifecycle', () => {
        it('should start batch', () => {
            expect(undoManager.isBatching()).toBe(false);
            undoManager.startBatch('Test batch');
            expect(undoManager.isBatching()).toBe(true);
        });

        it('should end batch', () => {
            undoManager.startBatch('Test batch');
            undoManager.execute(createAddSignalOperation(state, 'signal1'));
            undoManager.endBatch();
            expect(undoManager.isBatching()).toBe(false);
        });

        it('should throw error when starting batch while another is active', () => {
            undoManager.startBatch('Batch 1');
            expect(() => undoManager.startBatch('Batch 2')).toThrow('Cannot start a new batch while another is in progress');
        });

        it('should throw error when ending batch without starting', () => {
            expect(() => undoManager.endBatch()).toThrow('No batch in progress');
        });

        it('should cancel batch', () => {
            undoManager.startBatch('Test batch');
            undoManager.execute(createAddSignalOperation(state, 'signal1'));
            undoManager.cancelBatch();
            
            expect(undoManager.isBatching()).toBe(false);
            expect(state.signals).toEqual([]); // Operation not executed
            expect(undoManager.canUndo()).toBe(false); // Nothing in undo tree
        });
    });

    describe('Batching Operations', () => {
        it('should batch multiple operations', () => {
            undoManager.startBatch('Add multiple signals');
            undoManager.execute(createAddSignalOperation(state, 'signal1'));
            undoManager.execute(createAddSignalOperation(state, 'signal2'));
            undoManager.execute(createAddSignalOperation(state, 'signal3'));
            undoManager.endBatch();

            expect(state.signals).toEqual(['signal1', 'signal2', 'signal3']);
            expect(undoManager.getUndoTree().size()).toBe(1); // Only one node for the batch
        });

        it('should not add to tree if batch is empty', () => {
            undoManager.startBatch('Empty batch');
            undoManager.endBatch();

            expect(undoManager.getUndoTree().size()).toBe(0);
            expect(undoManager.canUndo()).toBe(false);
        });

        it('should execute operations immediately when not batching', () => {
            undoManager.execute(createAddSignalOperation(state, 'signal1'));
            
            expect(state.signals).toEqual(['signal1']);
            expect(undoManager.getUndoTree().size()).toBe(1);
        });
    });

    describe('Undo/Redo with Batches', () => {
        it('should undo all batched operations together', () => {
            undoManager.startBatch('Add signals');
            undoManager.execute(createAddSignalOperation(state, 'signal1'));
            undoManager.execute(createAddSignalOperation(state, 'signal2'));
            undoManager.execute(createAddSignalOperation(state, 'signal3'));
            undoManager.endBatch();

            expect(state.signals).toEqual(['signal1', 'signal2', 'signal3']);

            undoManager.undo();
            expect(state.signals).toEqual([]); // All signals removed in one undo
        });

        it('should redo all batched operations together', () => {
            undoManager.startBatch('Add signals');
            undoManager.execute(createAddSignalOperation(state, 'signal1'));
            undoManager.execute(createAddSignalOperation(state, 'signal2'));
            undoManager.endBatch();

            undoManager.undo();
            expect(state.signals).toEqual([]);

            undoManager.redo();
            expect(state.signals).toEqual(['signal1', 'signal2']); // All signals added in one redo
        });

        it('should maintain proper undo/redo for mixed batched and single operations', () => {
            // Single operation
            undoManager.execute(createAddSignalOperation(state, 'signal1'));
            expect(state.signals).toEqual(['signal1']);

            // Batched operations
            undoManager.startBatch('Add multiple signals');
            undoManager.execute(createAddSignalOperation(state, 'signal2'));
            undoManager.execute(createAddSignalOperation(state, 'signal3'));
            undoManager.endBatch();
            expect(state.signals).toEqual(['signal1', 'signal2', 'signal3']);

            // Another single operation
            undoManager.execute(createAddSignalOperation(state, 'signal4'));
            expect(state.signals).toEqual(['signal1', 'signal2', 'signal3', 'signal4']);

            // Undo last single operation
            undoManager.undo();
            expect(state.signals).toEqual(['signal1', 'signal2', 'signal3']);

            // Undo batched operations
            undoManager.undo();
            expect(state.signals).toEqual(['signal1']);

            // Undo first single operation
            undoManager.undo();
            expect(state.signals).toEqual([]);

            // Redo all
            undoManager.redo();
            expect(state.signals).toEqual(['signal1']);
            
            undoManager.redo();
            expect(state.signals).toEqual(['signal1', 'signal2', 'signal3']);
            
            undoManager.redo();
            expect(state.signals).toEqual(['signal1', 'signal2', 'signal3', 'signal4']);
        });
    });

    describe('Complex Batch Scenarios', () => {
        it('should handle batches with mixed add/remove operations', () => {
            state.signals = ['existing1', 'existing2'];

            undoManager.startBatch('Complex operations');
            undoManager.execute(createRemoveSignalOperation(state, 'existing1'));
            undoManager.execute(createAddSignalOperation(state, 'new1'));
            undoManager.execute(createAddSignalOperation(state, 'new2'));
            undoManager.execute(createRemoveSignalOperation(state, 'existing2'));
            undoManager.endBatch();

            expect(state.signals).toEqual(['new1', 'new2']);

            undoManager.undo();
            expect(state.signals).toEqual(['existing1', 'existing2']);
        });

        it('should handle multiple batches', () => {
            // First batch
            undoManager.startBatch('Batch 1');
            undoManager.execute(createAddSignalOperation(state, 'signal1'));
            undoManager.execute(createAddSignalOperation(state, 'signal2'));
            undoManager.endBatch();

            // Second batch
            undoManager.startBatch('Batch 2');
            undoManager.execute(createAddSignalOperation(state, 'signal3'));
            undoManager.execute(createAddSignalOperation(state, 'signal4'));
            undoManager.endBatch();

            expect(state.signals).toEqual(['signal1', 'signal2', 'signal3', 'signal4']);
            expect(undoManager.getUndoTree().size()).toBe(2); // Two batch nodes

            // Undo second batch
            undoManager.undo();
            expect(state.signals).toEqual(['signal1', 'signal2']);

            // Undo first batch
            undoManager.undo();
            expect(state.signals).toEqual([]);
        });
    });
});
