import { describe, it, expect, beforeEach } from 'vitest';
import { UndoTree } from './undo-tree.js';

interface TestState {
    value: number;
}

describe('UndoTree', () => {
    let tree: UndoTree<TestState>;

    beforeEach(() => {
        tree = new UndoTree<TestState>();
    });

    describe('Basic Operations', () => {
        it('should start with empty tree', () => {
            expect(tree.size()).toBe(0);
            expect(tree.getCurrentId()).toBeNull();
            expect(tree.getRootId()).toBeNull();
        });

        it('should add initial state', () => {
            const id = tree.addState({ value: 1 }, 'Initial state');
            expect(tree.size()).toBe(1);
            expect(tree.getCurrentId()).toBe(id);
            expect(tree.getRootId()).toBe(id);
        });

        it('should add multiple states', () => {
            tree.addState({ value: 1 }, 'State 1');
            tree.addState({ value: 2 }, 'State 2');
            tree.addState({ value: 3 }, 'State 3');
            
            expect(tree.size()).toBe(3);
            const current = tree.getCurrentNode();
            expect(current?.state.value).toBe(3);
        });
    });

    describe('Undo/Redo', () => {
        it('should undo to previous state', () => {
            tree.addState({ value: 1 }, 'State 1');
            tree.addState({ value: 2 }, 'State 2');
            
            const state = tree.undo();
            expect(state?.value).toBe(1);
            expect(tree.getCurrentNode()?.state.value).toBe(1);
        });

        it('should redo to next state', () => {
            tree.addState({ value: 1 }, 'State 1');
            tree.addState({ value: 2 }, 'State 2');
            tree.undo();
            
            const state = tree.redo();
            expect(state?.value).toBe(2);
            expect(tree.getCurrentNode()?.state.value).toBe(2);
        });

        it('should return null when undoing at root', () => {
            tree.addState({ value: 1 }, 'State 1');
            const state = tree.undo();
            expect(state).toBeNull();
        });

        it('should return null when redoing with no children', () => {
            tree.addState({ value: 1 }, 'State 1');
            const state = tree.redo();
            expect(state).toBeNull();
        });

        it('should check canUndo correctly', () => {
            expect(tree.canUndo()).toBe(false);
            
            tree.addState({ value: 1 }, 'State 1');
            expect(tree.canUndo()).toBe(false);
            
            tree.addState({ value: 2 }, 'State 2');
            expect(tree.canUndo()).toBe(true);
        });

        it('should check canRedo correctly', () => {
            tree.addState({ value: 1 }, 'State 1');
            tree.addState({ value: 2 }, 'State 2');
            
            expect(tree.canRedo()).toBe(false);
            
            tree.undo();
            expect(tree.canRedo()).toBe(true);
        });
    });

    describe('Branching', () => {
        it('should create new branch when adding state after undo', () => {
            tree.addState({ value: 1 }, 'State 1');
            tree.addState({ value: 2 }, 'State 2');
            tree.addState({ value: 3 }, 'State 3');
            
            // Undo twice (back to node 1)
            tree.undo();
            tree.undo();
            
            // Add new state - this should create a branch
            tree.addState({ value: 10 }, 'State 10');
            
            expect(tree.size()).toBe(4); // 1, 2, 3, and 10
            expect(tree.getCurrentNode()?.state.value).toBe(10);
            
            // The root node (value 1) should have two children now: node 2 and node 10
            const node1 = tree.getNode(tree.getRootId()!);
            expect(node1!.children.length).toBe(2);
        });

        it('should reuse last branch when redoing', () => {
            tree.addState({ value: 1 }, 'State 1');
            tree.addState({ value: 2 }, 'State 2');
            tree.undo();
            
            // Add new branch
            tree.addState({ value: 10 }, 'State 10');
            
            // Go back and redo - should go to the most recent branch (10)
            tree.undo();
            const state = tree.redo();
            
            expect(state?.value).toBe(10);
        });

        it('should handle multiple branches', () => {
            tree.addState({ value: 1 }, 'State 1');
            tree.addState({ value: 2 }, 'State 2');
            
            // Create first branch from node 1
            tree.undo();
            tree.addState({ value: 10 }, 'Branch 1');
            
            // Create second branch from node 1
            tree.undo();
            tree.addState({ value: 20 }, 'Branch 2');
            
            // Create third branch from node 1
            tree.undo();
            tree.addState({ value: 30 }, 'Branch 3');
            
            expect(tree.size()).toBe(5); // 1, 2, 10, 20, 30
            
            // Root node (value 1) should have 4 children: 2, 10, 20, 30
            const node1 = tree.getNode(tree.getRootId()!);
            expect(node1!.children.length).toBe(4);
        });
    });

    describe('Navigation', () => {
        it('should navigate to specific node', () => {
            const id1 = tree.addState({ value: 1 }, 'State 1');
            tree.addState({ value: 2 }, 'State 2');
            const id3 = tree.addState({ value: 3 }, 'State 3');
            
            const state = tree.navigateTo(id1);
            expect(state?.value).toBe(1);
            expect(tree.getCurrentId()).toBe(id1);
        });

        it('should return null when navigating to non-existent node', () => {
            tree.addState({ value: 1 }, 'State 1');
            const state = tree.navigateTo('invalid-id');
            expect(state).toBeNull();
        });

        it('should get current path', () => {
            const id1 = tree.addState({ value: 1 }, 'State 1');
            const id2 = tree.addState({ value: 2 }, 'State 2');
            const id3 = tree.addState({ value: 3 }, 'State 3');
            
            const path = tree.getCurrentPath();
            expect(path).toEqual([id1, id2, id3]);
        });
    });

    describe('Node Information', () => {
        it('should store node description and timestamp', () => {
            const id = tree.addState({ value: 1 }, 'Test description');
            const node = tree.getNode(id);
            
            expect(node?.description).toBe('Test description');
            expect(node?.timestamp).toBeGreaterThan(0);
        });

        it('should maintain parent-child relationships', () => {
            const id1 = tree.addState({ value: 1 }, 'State 1');
            const id2 = tree.addState({ value: 2 }, 'State 2');
            
            const node1 = tree.getNode(id1);
            const node2 = tree.getNode(id2);
            
            expect(node1?.children).toContain(id2);
            expect(node2?.parentId).toBe(id1);
        });
    });

    describe('Clear', () => {
        it('should clear all nodes', () => {
            tree.addState({ value: 1 }, 'State 1');
            tree.addState({ value: 2 }, 'State 2');
            
            tree.clear();
            
            expect(tree.size()).toBe(0);
            expect(tree.getCurrentId()).toBeNull();
            expect(tree.getRootId()).toBeNull();
        });
    });

    describe('Get All Nodes', () => {
        it('should return all nodes', () => {
            tree.addState({ value: 1 }, 'State 1');
            tree.addState({ value: 2 }, 'State 2');
            tree.addState({ value: 3 }, 'State 3');
            
            const nodes = tree.getAllNodes();
            expect(nodes.size).toBe(3);
        });
    });
});
