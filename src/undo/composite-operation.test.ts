import { describe, it, expect, beforeEach } from 'vitest';
import { CompositeOperation } from './composite-operation.js';
import { UndoableOperation } from './undo-tree.js';

// Test state
interface TestState {
    value: number;
}

// Helper to create simple test operations
function createTestOperation(
    state: TestState,
    delta: number,
    description: string
): UndoableOperation {
    return {
        do: () => {
            state.value += delta;
        },
        undo: () => {
            state.value -= delta;
        },
        redo: () => {
            state.value += delta;
        },
        getDescription: () => description
    };
}

describe('CompositeOperation', () => {
    let state: TestState;
    let composite: CompositeOperation;

    beforeEach(() => {
        state = { value: 0 };
        composite = new CompositeOperation('Test composite');
    });

    describe('Construction', () => {
        it('should create empty composite', () => {
            expect(composite.getOperationCount()).toBe(0);
            expect(composite.getDescription()).toBe('Test composite');
        });
    });

    describe('Adding Operations', () => {
        it('should add operations', () => {
            composite.addOperation(createTestOperation(state, 5, 'Add 5'));
            expect(composite.getOperationCount()).toBe(1);

            composite.addOperation(createTestOperation(state, 10, 'Add 10'));
            expect(composite.getOperationCount()).toBe(2);
        });

        it('should update description with operation count', () => {
            composite.addOperation(createTestOperation(state, 5, 'Add 5'));
            expect(composite.getDescription()).toBe('Test composite (1 operations)');

            composite.addOperation(createTestOperation(state, 10, 'Add 10'));
            expect(composite.getDescription()).toBe('Test composite (2 operations)');
        });
    });

    describe('Executing Operations', () => {
        it('should execute all operations in order', () => {
            composite.addOperation(createTestOperation(state, 5, 'Add 5'));
            composite.addOperation(createTestOperation(state, 10, 'Add 10'));
            composite.addOperation(createTestOperation(state, -3, 'Subtract 3'));

            composite.do();

            expect(state.value).toBe(12); // 0 + 5 + 10 - 3
        });

        it('should handle empty composite', () => {
            expect(() => composite.do()).not.toThrow();
            expect(state.value).toBe(0);
        });
    });

    describe('Undoing Operations', () => {
        it('should undo all operations in reverse order', () => {
            composite.addOperation(createTestOperation(state, 5, 'Add 5'));
            composite.addOperation(createTestOperation(state, 10, 'Add 10'));
            composite.addOperation(createTestOperation(state, -3, 'Subtract 3'));

            composite.do();
            expect(state.value).toBe(12);

            composite.undo();
            expect(state.value).toBe(0); // All operations undone
        });

        it('should handle empty composite', () => {
            expect(() => composite.undo()).not.toThrow();
            expect(state.value).toBe(0);
        });
    });

    describe('Redoing Operations', () => {
        it('should redo all operations in order', () => {
            composite.addOperation(createTestOperation(state, 5, 'Add 5'));
            composite.addOperation(createTestOperation(state, 10, 'Add 10'));

            composite.do();
            composite.undo();
            expect(state.value).toBe(0);

            composite.redo();
            expect(state.value).toBe(15); // 0 + 5 + 10
        });

        it('should handle empty composite', () => {
            expect(() => composite.redo()).not.toThrow();
            expect(state.value).toBe(0);
        });
    });

    describe('Complex Scenarios', () => {
        it('should handle multiple do/undo/redo cycles', () => {
            composite.addOperation(createTestOperation(state, 10, 'Add 10'));
            composite.addOperation(createTestOperation(state, 20, 'Add 20'));

            composite.do();
            expect(state.value).toBe(30);

            composite.undo();
            expect(state.value).toBe(0);

            composite.redo();
            expect(state.value).toBe(30);

            composite.undo();
            expect(state.value).toBe(0);
        });

        it('should maintain order with many operations', () => {
            for (let i = 1; i <= 5; i++) {
                composite.addOperation(createTestOperation(state, i, `Add ${i}`));
            }

            composite.do();
            expect(state.value).toBe(15); // 1+2+3+4+5

            composite.undo();
            expect(state.value).toBe(0);
        });
    });
});
