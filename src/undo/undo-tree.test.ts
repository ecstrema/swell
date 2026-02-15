import { describe, it, expect, beforeEach } from 'vitest';
import { UndoTree, UndoableOperation } from './undo-tree.js';

// Test state that operations will modify
interface TestState {
    value: number;
}

// Helper to create test operations
function createTestOperation(
    state: TestState,
    newValue: number,
    description: string
): UndoableOperation {
    const oldValue = state.value;
    
    return {
        do: () => {
            state.value = newValue;
        },
        undo: () => {
            state.value = oldValue;
        },
        redo: () => {
            state.value = newValue;
        },
        getDescription: () => description
    };
}

describe('UndoTree', () => {
    let tree: UndoTree;
    let testState: TestState;

    beforeEach(() => {
        tree = new UndoTree();
        testState = { value: 0 };
    });

    describe('Basic Operations', () => {
        it('should start with empty tree', () => {
            expect(tree.size()).toBe(0);
            expect(tree.getCurrentId()).toBeNull();
            expect(tree.getRootId()).toBeNull();
        });

        it('should add initial operation', () => {
            const id = tree.addOperation(createTestOperation(testState, 1, 'Set to 1'));
            expect(tree.size()).toBe(1);
            expect(tree.getCurrentId()).toBe(id);
            expect(tree.getRootId()).toBe(id);
            expect(testState.value).toBe(1); // Operation was executed
        });

        it('should add multiple operations', () => {
            tree.addOperation(createTestOperation(testState, 1, 'Set to 1'));
            tree.addOperation(createTestOperation(testState, 2, 'Set to 2'));
            tree.addOperation(createTestOperation(testState, 3, 'Set to 3'));
            
            expect(tree.size()).toBe(3);
            expect(testState.value).toBe(3);
        });
    });

    describe('Undo/Redo', () => {
        it('should undo to previous state', () => {
            tree.addOperation(createTestOperation(testState, 1, 'Set to 1'));
            tree.addOperation(createTestOperation(testState, 2, 'Set to 2'));
            
            expect(testState.value).toBe(2);
            
            const success = tree.undo();
            expect(success).toBe(true);
            expect(testState.value).toBe(1);
        });

        it('should redo to next state', () => {
            tree.addOperation(createTestOperation(testState, 1, 'Set to 1'));
            tree.addOperation(createTestOperation(testState, 2, 'Set to 2'));
            tree.undo();
            
            expect(testState.value).toBe(1);
            
            const success = tree.redo();
            expect(success).toBe(true);
            expect(testState.value).toBe(2);
        });

        it('should return false when undoing at root', () => {
            tree.addOperation(createTestOperation(testState, 1, 'Set to 1'));
            const success = tree.undo();
            expect(success).toBe(false);
        });

        it('should return false when redoing with no children', () => {
            tree.addOperation(createTestOperation(testState, 1, 'Set to 1'));
            const success = tree.redo();
            expect(success).toBe(false);
        });

        it('should check canUndo correctly', () => {
            expect(tree.canUndo()).toBe(false);
            
            tree.addOperation(createTestOperation(testState, 1, 'Set to 1'));
            expect(tree.canUndo()).toBe(false);
            
            tree.addOperation(createTestOperation(testState, 2, 'Set to 2'));
            expect(tree.canUndo()).toBe(true);
        });

        it('should check canRedo correctly', () => {
            tree.addOperation(createTestOperation(testState, 1, 'Set to 1'));
            tree.addOperation(createTestOperation(testState, 2, 'Set to 2'));
            
            expect(tree.canRedo()).toBe(false);
            
            tree.undo();
            expect(tree.canRedo()).toBe(true);
        });
    });

    describe('Branching', () => {
        it('should create new branch when adding operation after undo', () => {
            tree.addOperation(createTestOperation(testState, 1, 'Set to 1'));
            tree.addOperation(createTestOperation(testState, 2, 'Set to 2'));
            tree.addOperation(createTestOperation(testState, 3, 'Set to 3'));
            
            // Undo twice (back to node 1)
            tree.undo();
            tree.undo();
            
            // Add new operation - this should create a branch
            tree.addOperation(createTestOperation(testState, 10, 'Set to 10'));
            
            expect(tree.size()).toBe(4); // 1, 2, 3, and 10
            expect(testState.value).toBe(10);
            
            // The root node (value 1) should have two children now: node 2 and node 10
            const node1 = tree.getNode(tree.getRootId()!);
            expect(node1!.children.length).toBe(2);
        });

        it('should reuse last branch when redoing', () => {
            tree.addOperation(createTestOperation(testState, 1, 'Set to 1'));
            tree.addOperation(createTestOperation(testState, 2, 'Set to 2'));
            tree.undo();
            
            // Add new branch
            tree.addOperation(createTestOperation(testState, 10, 'Set to 10'));
            
            // Go back and redo - should go to the most recent branch (10)
            tree.undo();
            const success = tree.redo();
            
            expect(success).toBe(true);
            expect(testState.value).toBe(10);
        });

        it('should handle multiple branches', () => {
            tree.addOperation(createTestOperation(testState, 1, 'Set to 1'));
            tree.addOperation(createTestOperation(testState, 2, 'Set to 2'));
            
            // Create first branch from node 1
            tree.undo();
            tree.addOperation(createTestOperation(testState, 10, 'Branch 1'));
            
            // Create second branch from node 1
            tree.undo();
            tree.addOperation(createTestOperation(testState, 20, 'Branch 2'));
            
            // Create third branch from node 1
            tree.undo();
            tree.addOperation(createTestOperation(testState, 30, 'Branch 3'));
            
            expect(tree.size()).toBe(5); // 1, 2, 10, 20, 30
            
            // Root node (value 1) should have 4 children: 2, 10, 20, 30
            const node1 = tree.getNode(tree.getRootId()!);
            expect(node1!.children.length).toBe(4);
        });
    });

    describe('Navigation', () => {
        it('should navigate to specific node', () => {
            const id1 = tree.addOperation(createTestOperation(testState, 1, 'Set to 1'));
            tree.addOperation(createTestOperation(testState, 2, 'Set to 2'));
            tree.addOperation(createTestOperation(testState, 3, 'Set to 3'));
            
            expect(testState.value).toBe(3);
            
            const success = tree.navigateTo(id1);
            expect(success).toBe(true);
            expect(testState.value).toBe(1);
            expect(tree.getCurrentId()).toBe(id1);
        });

        it('should return false when navigating to non-existent node', () => {
            tree.addOperation(createTestOperation(testState, 1, 'Set to 1'));
            const success = tree.navigateTo('invalid-id');
            expect(success).toBe(false);
        });

        it('should get current path', () => {
            const id1 = tree.addOperation(createTestOperation(testState, 1, 'Set to 1'));
            const id2 = tree.addOperation(createTestOperation(testState, 2, 'Set to 2'));
            const id3 = tree.addOperation(createTestOperation(testState, 3, 'Set to 3'));
            
            const path = tree.getCurrentPath();
            expect(path).toEqual([id1, id2, id3]);
        });
    });

    describe('Node Information', () => {
        it('should store node description and timestamp', () => {
            const id = tree.addOperation(createTestOperation(testState, 1, 'Test description'));
            const node = tree.getNode(id);
            
            expect(node?.operation.getDescription()).toBe('Test description');
            expect(node?.timestamp).toBeGreaterThan(0);
        });

        it('should maintain parent-child relationships', () => {
            const id1 = tree.addOperation(createTestOperation(testState, 1, 'Set to 1'));
            const id2 = tree.addOperation(createTestOperation(testState, 2, 'Set to 2'));
            
            const node1 = tree.getNode(id1);
            const node2 = tree.getNode(id2);
            
            expect(node1?.children).toContain(id2);
            expect(node2?.parentId).toBe(id1);
        });
    });

    describe('Clear', () => {
        it('should clear all nodes', () => {
            tree.addOperation(createTestOperation(testState, 1, 'Set to 1'));
            tree.addOperation(createTestOperation(testState, 2, 'Set to 2'));
            
            tree.clear();
            
            expect(tree.size()).toBe(0);
            expect(tree.getCurrentId()).toBeNull();
            expect(tree.getRootId()).toBeNull();
        });
    });

    describe('Get All Nodes', () => {
        it('should return all nodes', () => {
            tree.addOperation(createTestOperation(testState, 1, 'Set to 1'));
            tree.addOperation(createTestOperation(testState, 2, 'Set to 2'));
            tree.addOperation(createTestOperation(testState, 3, 'Set to 3'));
            
            const nodes = tree.getAllNodes();
            expect(nodes.size).toBe(3);
        });
    });
});
