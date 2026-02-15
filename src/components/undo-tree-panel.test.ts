import { describe, it, expect, beforeEach } from 'vitest';
import { UndoTreePanel } from './undo-tree-panel.js';
import { UndoTree } from '../undo/undo-tree.js';

describe('UndoTreePanel', () => {
    let panel: UndoTreePanel;
    let tree: UndoTree<{ value: number }>;

    beforeEach(() => {
        panel = new UndoTreePanel();
        document.body.appendChild(panel);
        tree = new UndoTree<{ value: number }>();
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
        tree.addState({ value: 1 }, 'First state');
        tree.addState({ value: 2 }, 'Second state');
        tree.addState({ value: 3 }, 'Third state');

        panel.setUndoTree(tree);

        const nodes = panel.shadowRoot!.querySelectorAll('.node-content');
        expect(nodes.length).toBe(3);
    });

    it('should highlight current node', () => {
        tree.addState({ value: 1 }, 'First state');
        tree.addState({ value: 2 }, 'Second state');
        tree.addState({ value: 3 }, 'Third state');

        panel.setUndoTree(tree);

        const currentNodes = panel.shadowRoot!.querySelectorAll('.node-content.current');
        expect(currentNodes.length).toBe(1);
        expect(currentNodes[0].textContent).toContain('Third state');
    });

    it('should update highlight after undo', () => {
        tree.addState({ value: 1 }, 'First state');
        tree.addState({ value: 2 }, 'Second state');
        tree.addState({ value: 3 }, 'Third state');

        panel.setUndoTree(tree);

        // Undo
        tree.undo();
        panel.refresh();

        const currentNodes = panel.shadowRoot!.querySelectorAll('.node-content.current');
        expect(currentNodes.length).toBe(1);
        expect(currentNodes[0].textContent).toContain('Second state');
    });

    it('should display branching structure', () => {
        tree.addState({ value: 1 }, 'Root');
        tree.addState({ value: 2 }, 'Branch A');
        tree.undo();
        tree.addState({ value: 3 }, 'Branch B');

        panel.setUndoTree(tree);

        const childrenContainers = panel.shadowRoot!.querySelectorAll('.node-children');
        expect(childrenContainers.length).toBeGreaterThan(0);

        const nodes = panel.shadowRoot!.querySelectorAll('.node-content');
        expect(nodes.length).toBe(3); // Root, Branch A, Branch B
    });

    it('should emit node-select event on click', async () => {
        tree.addState({ value: 1 }, 'First state');
        tree.addState({ value: 2 }, 'Second state');

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
        tree.addState({ value: 1 }, 'Test Description');

        panel.setUndoTree(tree);

        const label = panel.shadowRoot!.querySelector('.node-label');
        expect(label?.textContent).toBe('Test Description');
    });

    it('should display timestamps', () => {
        tree.addState({ value: 1 }, 'First state');

        panel.setUndoTree(tree);

        const time = panel.shadowRoot!.querySelector('.node-time');
        expect(time).not.toBeNull();
        expect(time?.textContent).toBeTruthy();
    });
});
