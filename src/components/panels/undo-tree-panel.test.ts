import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UndoTreePanel } from './undo-tree-panel.js';
import { UndoTree, UndoableOperation } from '../../undo/undo-tree.js';

// Helper to create test operations
function createTestOperation(
    state: { value: number },
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

describe('UndoTreePanel', () => {
    let panel: UndoTreePanel;
    let tree: UndoTree;
    let testState: { value: number };

    beforeEach(() => {
        panel = new UndoTreePanel();
        document.body.appendChild(panel);
        tree = new UndoTree();
        testState = { value: 0 };
    });

    afterEach(() => {
        if (panel.parentNode) {
            panel.parentNode.removeChild(panel);
        }
    });

    it('should create the element', () => {
        expect(panel).toBeInstanceOf(HTMLElement);
        expect(panel.shadowRoot).not.toBeNull();
    });

    it('should display empty state when no tree is set', () => {
        const content = panel.shadowRoot!.querySelector('.tree-content');
        expect(content?.textContent).toContain('No undo history');
    });

    it('should display tree structure', () => {
        tree.addOperation(createTestOperation(testState, 1, 'First state'));
        tree.addOperation(createTestOperation(testState, 2, 'Second state'));
        tree.addOperation(createTestOperation(testState, 3, 'Third state'));

        panel.setUndoTree(tree);

        const nodes = panel.shadowRoot!.querySelectorAll('.node-content');
        expect(nodes.length).toBe(3);
    });

    it('should highlight current node', () => {
        tree.addOperation(createTestOperation(testState, 1, 'First state'));
        tree.addOperation(createTestOperation(testState, 2, 'Second state'));
        tree.addOperation(createTestOperation(testState, 3, 'Third state'));

        panel.setUndoTree(tree);

        const currentNodes = panel.shadowRoot!.querySelectorAll('.node-content.current');
        expect(currentNodes.length).toBe(1);
        expect(currentNodes[0].textContent).toContain('Third state');
    });

    it('should update highlight after undo', () => {
        tree.addOperation(createTestOperation(testState, 1, 'First state'));
        tree.addOperation(createTestOperation(testState, 2, 'Second state'));
        tree.addOperation(createTestOperation(testState, 3, 'Third state'));

        panel.setUndoTree(tree);

        // Undo
        tree.undo();
        panel.refresh();

        const currentNodes = panel.shadowRoot!.querySelectorAll('.node-content.current');
        expect(currentNodes.length).toBe(1);
        expect(currentNodes[0].textContent).toContain('Second state');
    });

    it('should display branching structure', () => {
        tree.addOperation(createTestOperation(testState, 1, 'Root'));
        tree.addOperation(createTestOperation(testState, 2, 'Branch A'));
        tree.undo();
        tree.addOperation(createTestOperation(testState, 3, 'Branch B'));

        panel.setUndoTree(tree);

        const childrenContainers = panel.shadowRoot!.querySelectorAll('.node-children');
        expect(childrenContainers.length).toBeGreaterThan(0);

        const nodes = panel.shadowRoot!.querySelectorAll('.node-content');
        expect(nodes.length).toBe(3); // Root, Branch A, Branch B
    });

    it('should emit node-select event on click', async () => {
        tree.addOperation(createTestOperation(testState, 1, 'First state'));
        tree.addOperation(createTestOperation(testState, 2, 'Second state'));

        panel.setUndoTree(tree);

        let eventFired = false;
        let eventNodeId: string | null = null;

        panel.addEventListener('node-select', (e: Event) => {
            eventFired = true;
            eventNodeId = (e as CustomEvent).detail.nodeId;
        });

        const firstNode = panel.shadowRoot!.querySelector('.node-content') as HTMLElement;
        firstNode.click();

        expect(eventFired).toBe(true);
        expect(eventNodeId).not.toBeNull();
    });

    it('should display node descriptions', () => {
        tree.addOperation(createTestOperation(testState, 1, 'Test Description'));

        panel.setUndoTree(tree);

        const label = panel.shadowRoot!.querySelector('.node-label');
        expect(label?.textContent).toBe('Test Description');
    });

    it('should display timestamps', () => {
        tree.addOperation(createTestOperation(testState, 1, 'First state'));

        panel.setUndoTree(tree);

        const time = panel.shadowRoot!.querySelector('.node-time');
        expect(time).not.toBeNull();
        expect(time?.textContent).toBeTruthy();
    });
});
