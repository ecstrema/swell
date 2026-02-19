import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DockManager } from './dock-manager.js';
import { DockLayout, DockBox, DockStack } from './types.js';

describe('DockManager - Box Simplification', () => {
    let dockManager: DockManager;

    beforeEach(() => {
        dockManager = new DockManager();
        document.body.appendChild(dockManager);

        // Register mock content
        dockManager.registerContent('test-content', 'Test Content', () => {
            const div = document.createElement('div');
            div.textContent = 'Test Content';
            return div;
        });
    });

    afterEach(() => {
        if (dockManager.parentNode) {
            dockManager.parentNode.removeChild(dockManager);
        }
    });

    describe('nested box simplification', () => {
        it('should simplify nested box with single stack child', () => {
            const layout: DockLayout = {
                root: {
                    type: 'box',
                    id: 'outer-box',
                    direction: 'row',
                    weight: 1,
                    children: [
                        {
                            type: 'box',
                            id: 'inner-box',
                            direction: 'column',
                            weight: 1,
                            children: [
                                {
                                    type: 'stack',
                                    id: 'stack-1',
                                    weight: 1,
                                    activeId: 'pane-1',
                                    children: [
                                        { id: 'pane-1', title: 'Pane 1', contentId: 'test-content', closable: true }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            };

            dockManager.layout = layout;

            // cleanupEmptyStacks now also simplifies nested boxes
            const result = dockManager.cleanupEmptyStacks();

            // No empty stacks, so no cleanup reported
            expect(result).toBe(false);
            // But the nested box should be simplified away
            expect(layout.root.type).toBe('stack');
            expect(layout.root.id).toBe('stack-1');
        });

        it('should simplify when inner box becomes empty after cleanup', () => {
            const layout: DockLayout = {
                root: {
                    type: 'box',
                    id: 'outer-box',
                    direction: 'row',
                    weight: 1,
                    children: [
                        {
                            type: 'box',
                            id: 'inner-box',
                            direction: 'column',
                            weight: 0.5,
                            children: [
                                {
                                    type: 'stack',
                                    id: 'empty-stack',
                                    weight: 1,
                                    activeId: null,
                                    children: []
                                }
                            ]
                        },
                        {
                            type: 'stack',
                            id: 'remaining-stack',
                            weight: 0.5,
                            activeId: 'pane-1',
                            children: [
                                { id: 'pane-1', title: 'Pane 1', contentId: 'test-content', closable: true }
                            ]
                        }
                    ]
                }
            };

            dockManager.layout = layout;

            dockManager.cleanupEmptyStacks();

            // Inner box should be simplified away, remaining-stack should be root
            expect(layout.root.type).toBe('stack');
            expect(layout.root.id).toBe('remaining-stack');
        });

        it('should simplify deeply nested boxes', () => {
            const layout: DockLayout = {
                root: {
                    type: 'box',
                    id: 'level-1',
                    direction: 'row',
                    weight: 1,
                    children: [
                        {
                            type: 'box',
                            id: 'level-2',
                            direction: 'column',
                            weight: 1,
                            children: [
                                {
                                    type: 'box',
                                    id: 'level-3',
                                    direction: 'row',
                                    weight: 1,
                                    children: [
                                        {
                                            type: 'stack',
                                            id: 'only-stack',
                                            weight: 1,
                                            activeId: 'pane-1',
                                            children: [
                                                { id: 'pane-1', title: 'Pane 1', contentId: 'test-content', closable: true }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            };

            dockManager.layout = layout;

            // cleanupEmptyStacks now also simplifies nested boxes
            dockManager.cleanupEmptyStacks();

            // All nested boxes should be simplified away, leaving just the stack
            expect(layout.root.type).toBe('stack');
            expect(layout.root.id).toBe('only-stack');
        });

        it('should simplify when dragging tab causes empty nested box', () => {
            // Create a layout where dragging a tab from inner box to outer stack
            // would leave the inner box empty
            const layout: DockLayout = {
                root: {
                    type: 'box',
                    id: 'outer-box',
                    direction: 'row',
                    weight: 1,
                    children: [
                        {
                            type: 'box',
                            id: 'inner-box',
                            direction: 'column',
                            weight: 0.5,
                            children: [
                                {
                                    type: 'stack',
                                    id: 'source-stack',
                                    weight: 1,
                                    activeId: 'pane-1',
                                    children: [
                                        { id: 'pane-1', title: 'Pane 1', contentId: 'test-content', closable: true }
                                    ]
                                }
                            ]
                        },
                        {
                            type: 'stack',
                            id: 'target-stack',
                            weight: 0.5,
                            activeId: 'pane-2',
                            children: [
                                { id: 'pane-2', title: 'Pane 2', contentId: 'test-content', closable: true }
                            ]
                        }
                    ]
                }
            };

            dockManager.layout = layout;

            // Simulate moving pane-1 from source-stack to target-stack
            const sourceStack = ((layout.root as DockBox).children[0] as DockBox).children[0] as DockStack;
            const targetStack = (layout.root as DockBox).children[1] as DockStack;
            const pane = sourceStack.children[0];

            // Remove from source
            sourceStack.children = [];
            sourceStack.activeId = null;

            // Add to target
            targetStack.children.push(pane);
            targetStack.activeId = pane.id;

            // Now cleanup
            dockManager.cleanupEmptyStacks();

            // The inner box should be simplified away
            expect(layout.root.type).toBe('stack');
            expect(layout.root.id).toBe('target-stack');
        });

        it('repeated alternating splits should not create deep single-child box chains', () => {
            const layout: DockLayout = {
                root: {
                    type: 'box',
                    id: 'root-box',
                    direction: 'row',
                    weight: 1,
                    children: [
                        {
                            type: 'stack',
                            id: 'left-stack',
                            weight: 0.6,
                            activeId: 'pane-a',
                            children: [
                                { id: 'pane-a', title: 'A', contentId: 'a', closable: true }
                            ]
                        },
                        {
                            type: 'stack',
                            id: 'target-stack',
                            weight: 0.4,
                            activeId: 'pane-b',
                            children: [
                                { id: 'pane-b', title: 'B', contentId: 'b', closable: true }
                            ]
                        }
                    ]
                }
            };

            dockManager.registerContent('a', 'A', (id) => document.createElement('div'));
            dockManager.registerContent('b', 'B', (id) => document.createElement('div'));

            dockManager.layout = layout;

            // Repeatedly split the target stack with alternating directions — mimic user drops
            const targetStack = (layout.root as DockBox).children[1] as DockStack;
            const mgr: any = dockManager as any;

            // perform several alternating splits; splitStack is private so use cast
            mgr.splitStack(targetStack, { id: 'x1', title: 'X1', contentId: 'x1', closable: true }, 'left');
            mgr.splitStack(targetStack, { id: 'x2', title: 'X2', contentId: 'x2', closable: true }, 'top');
            mgr.splitStack(targetStack, { id: 'x3', title: 'X3', contentId: 'x3', closable: true }, 'left');
            mgr.splitStack(targetStack, { id: 'x4', title: 'X4', contentId: 'x4', closable: true }, 'top');

            // After splits, assert there are no box nodes with a single child anywhere in the tree
            function assertNoSingleChildBoxes(node: any) {
                if (node.type === 'box') {
                    expect(node.children.length).toBeGreaterThan(1);
                    for (const c of node.children) assertNoSingleChildBoxes(c);
                }
            }

            assertNoSingleChildBoxes(layout.root as any);
        });
    });

    describe('manual simplification trigger', () => {
        it('should simplify nested boxes even without empty stacks when called', () => {
            const layout: DockLayout = {
                root: {
                    type: 'box',
                    id: 'outer-box',
                    direction: 'row',
                    weight: 1,
                    children: [
                        {
                            type: 'box',
                            id: 'inner-box',
                            direction: 'column',
                            weight: 1,
                            children: [
                                {
                                    type: 'stack',
                                    id: 'only-stack',
                                    weight: 1,
                                    activeId: 'pane-1',
                                    children: [
                                        { id: 'pane-1', title: 'Pane 1', contentId: 'test-content', closable: true }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            };

            dockManager.layout = layout;

            // Use simplifyLayout to simplify nested boxes
            dockManager.simplifyLayout();

            // The nested box should be simplified away
            expect(layout.root.type).toBe('stack');
            expect(layout.root.id).toBe('only-stack');
        });

        it('should simplify deeply nested boxes when simplifyLayout is called', () => {
            const layout: DockLayout = {
                root: {
                    type: 'box',
                    id: 'level-1',
                    direction: 'row',
                    weight: 1,
                    children: [
                        {
                            type: 'box',
                            id: 'level-2',
                            direction: 'column',
                            weight: 1,
                            children: [
                                {
                                    type: 'box',
                                    id: 'level-3',
                                    direction: 'row',
                                    weight: 1,
                                    children: [
                                        {
                                            type: 'stack',
                                            id: 'only-stack',
                                            weight: 1,
                                            activeId: 'pane-1',
                                            children: [
                                                { id: 'pane-1', title: 'Pane 1', contentId: 'test-content', closable: true }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            };

            dockManager.layout = layout;

            // Use simplifyLayout to simplify nested boxes
            dockManager.simplifyLayout();

            // All nested boxes should be simplified away, leaving just the stack
            expect(layout.root.type).toBe('stack');
            expect(layout.root.id).toBe('only-stack');
            expect(layout.root.weight).toBe(1);
        });

        it('should not simplify boxes with multiple children', () => {
            const layout: DockLayout = {
                root: {
                    type: 'box',
                    id: 'outer-box',
                    direction: 'row',
                    weight: 1,
                    children: [
                        {
                            type: 'box',
                            id: 'inner-box',
                            direction: 'column',
                            weight: 0.5,
                            children: [
                                {
                                    type: 'stack',
                                    id: 'stack-1',
                                    weight: 1,
                                    activeId: 'pane-1',
                                    children: [
                                        { id: 'pane-1', title: 'Pane 1', contentId: 'test-content', closable: true }
                                    ]
                                }
                            ]
                        },
                        {
                            type: 'stack',
                            id: 'stack-2',
                            weight: 0.5,
                            activeId: 'pane-2',
                            children: [
                                { id: 'pane-2', title: 'Pane 2', contentId: 'test-content', closable: true }
                            ]
                        }
                    ]
                }
            };

            dockManager.layout = layout;

            // Use simplifyLayout
            dockManager.simplifyLayout();

            // Inner box should be simplified away, but outer box should remain with 2 children
            const root = layout.root as DockBox;
            expect(root.type).toBe('box');
            expect(root.id).toBe('outer-box');
            expect(root.children.length).toBe(2);
            expect(root.children[0].type).toBe('stack');
            expect(root.children[0].id).toBe('stack-1');
            expect(root.children[1].type).toBe('stack');
            expect(root.children[1].id).toBe('stack-2');
        });
    });
});
