import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DockManager } from './dock-manager.js';
import { DockLayout, DockStack } from './types.js';

describe('DockManager - Layout Cleanup and Simplification', () => {
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

    describe('cleanupEmptyStacks', () => {
        it('should remove empty stack when multiple stacks exist', () => {
            const layout: DockLayout = {
                root: {
                    type: 'box',
                    id: 'root-box',
                    direction: 'row',
                    weight: 1,
                    children: [
                        {
                            type: 'stack',
                            id: 'stack-1',
                            weight: 0.5,
                            activeId: null,
                            children: []  // Empty stack - should be removed
                        },
                        {
                            type: 'stack',
                            id: 'stack-2',
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

            // stack-1 is empty, should be removed
            const result = dockManager.cleanupEmptyStacks();

            expect(result).toBe(true);
            // stack-1 should be removed since it's empty, stack-2 becomes root
            expect(layout.root.type).toBe('stack');
            expect(layout.root.id).toBe('stack-2');
        });

        it('should keep last remaining empty stack', () => {
            const layout: DockLayout = {
                root: {
                    type: 'box',
                    id: 'root-box',
                    direction: 'row',
                    weight: 1,
                    children: [
                        {
                            type: 'stack',
                            id: 'stack-1',
                            weight: 1,
                            activeId: null,
                            children: []
                        }
                    ]
                }
            };

            dockManager.layout = layout;

            const result = dockManager.cleanupEmptyStacks();

            // Should return false because there's only one stack (no empty stacks to clean)
            expect(result).toBe(false);
            // Layout simplifies to just the stack (which is empty for placeholder)
            expect(layout.root.type).toBe('stack');
            expect((layout.root as DockStack).children.length).toBe(0);
        });

        it('should simplify nested boxes with single child', () => {
            const layout: DockLayout = {
                root: {
                    type: 'box',
                    id: 'root-box',
                    direction: 'row',
                    weight: 1,
                    children: [
                        {
                            type: 'box',
                            id: 'nested-box',
                            direction: 'column',
                            weight: 1,
                            children: [
                                {
                                    type: 'stack',
                                    id: 'stack-1',
                                    weight: 1,
                                    activeId: null,
                                    children: []  // Empty - will be cleaned up
                                }
                            ]
                        },
                        {
                            type: 'stack',
                            id: 'stack-2',
                            weight: 1,
                            activeId: 'pane-1',
                            children: [
                                { id: 'pane-1', title: 'Pane 1', contentId: 'test-content', closable: true }
                            ]
                        }
                    ]
                }
            };

            dockManager.layout = layout;

            // stack-1 is empty, nested-box will become empty after cleanup
            dockManager.cleanupEmptyStacks();

            // nested-box should be simplified away, stack-2 should remain as root
            expect(layout.root.type).toBe('stack');
            expect(layout.root.id).toBe('stack-2');
        });

        it('should handle deeply nested empty boxes', () => {
            const layout: DockLayout = {
                root: {
                    type: 'box',
                    id: 'root-box',
                    direction: 'row',
                    weight: 1,
                    children: [
                        {
                            type: 'box',
                            id: 'level-1-box',
                            direction: 'column',
                            weight: 0.5,
                            children: [
                                {
                                    type: 'box',
                                    id: 'level-2-box',
                                    direction: 'row',
                                    weight: 1,
                                    children: [
                                        {
                                            type: 'stack',
                                            id: 'empty-stack',
                                            weight: 1,
                                            activeId: null,
                                            children: []
                                        }
                                    ]
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

            // All nested boxes should be cleaned up, leaving just the remaining stack
            expect(layout.root.type).toBe('stack');
            expect(layout.root.id).toBe('remaining-stack');
        });

        it('should redistribute weight after cleanup', () => {
            const layout: DockLayout = {
                root: {
                    type: 'box',
                    id: 'root-box',
                    direction: 'row',
                    weight: 1,
                    children: [
                        {
                            type: 'stack',
                            id: 'stack-1',
                            weight: 0.3,
                            activeId: null,
                            children: []
                        },
                        {
                            type: 'stack',
                            id: 'stack-2',
                            weight: 0.3,
                            activeId: 'pane-1',
                            children: [
                                { id: 'pane-1', title: 'Pane 1', contentId: 'test-content', closable: true }
                            ]
                        },
                        {
                            type: 'stack',
                            id: 'stack-3',
                            weight: 0.4,
                            activeId: null,
                            children: []
                        }
                    ]
                }
            };

            dockManager.layout = layout;

            dockManager.cleanupEmptyStacks();

            // Only stack-2 should remain as root
            expect(layout.root.type).toBe('stack');
            expect(layout.root.id).toBe('stack-2');
            expect(layout.root.weight).toBe(1);
        });
    });

    describe('handlePaneClose', () => {
        it('should close pane and cleanup empty stacks', () => {
            const layout: DockLayout = {
                root: {
                    type: 'box',
                    id: 'root-box',
                    direction: 'row',
                    weight: 1,
                    children: [
                        {
                            type: 'stack',
                            id: 'stack-1',
                            weight: 0.5,
                            activeId: 'pane-1',
                            children: [
                                { id: 'pane-1', title: 'Pane 1', contentId: 'test-content', closable: true }
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

            // Simulate pane-close event
            dockManager.dispatchEvent(new CustomEvent('pane-close', {
                detail: { id: 'pane-1' },
                bubbles: true,
                composed: true
            }));

            // stack-1 should be removed, stack-2 should become root
            expect(layout.root.type).toBe('stack');
            expect(layout.root.id).toBe('stack-2');
        });

        it('should handle closing the active pane', () => {
            const layout: DockLayout = {
                root: {
                    type: 'box',
                    id: 'root-box',
                    direction: 'row',
                    weight: 1,
                    children: [
                        {
                            type: 'stack',
                            id: 'stack-1',
                            weight: 1,
                            activeId: 'pane-1',
                            children: [
                                { id: 'pane-1', title: 'Pane 1', contentId: 'test-content', closable: true },
                                { id: 'pane-2', title: 'Pane 2', contentId: 'test-content', closable: true }
                            ]
                        }
                    ]
                }
            };

            dockManager.layout = layout;

            // Close the active pane
            dockManager.dispatchEvent(new CustomEvent('pane-close', {
                detail: { id: 'pane-1' },
                bubbles: true,
                composed: true
            }));

            // Stack should remain with pane-2 as active
            // Layout simplifies from box-with-single-stack to just the stack
            const stack = layout.root as DockStack;
            expect(stack.type).toBe('stack');
            expect(stack.children.length).toBe(1);
            expect(stack.activeId).toBe('pane-2');
        });

        it('should keep stack when closing pane but other panes remain', () => {
            const layout: DockLayout = {
                root: {
                    type: 'box',
                    id: 'root-box',
                    direction: 'row',
                    weight: 1,
                    children: [
                        {
                            type: 'stack',
                            id: 'stack-1',
                            weight: 0.5,
                            activeId: 'pane-1',
                            children: [
                                { id: 'pane-1', title: 'Pane 1', contentId: 'test-content', closable: true },
                                { id: 'pane-2', title: 'Pane 2', contentId: 'test-content', closable: true }
                            ]
                        },
                        {
                            type: 'stack',
                            id: 'stack-2',
                            weight: 0.5,
                            activeId: 'pane-3',
                            children: [
                                { id: 'pane-3', title: 'Pane 3', contentId: 'test-content', closable: true }
                            ]
                        }
                    ]
                }
            };

            dockManager.layout = layout;

            // Close pane-1
            dockManager.dispatchEvent(new CustomEvent('pane-close', {
                detail: { id: 'pane-1' },
                bubbles: true,
                composed: true
            }));

            // Both stacks should remain
            const root = layout.root as DockStack;
            // Root is now a container `stack` (direction present)
            expect(root.type).toBe('stack');
            expect((root as any).direction).toBeDefined();
            expect(root.children.length).toBe(2);

            const stack1 = root.children[0] as DockStack;
            expect(stack1.children.length).toBe(1);
            expect(stack1.activeId).toBe('pane-2');
        });
    });

    describe('simplifyBoxes', () => {
        it('should collapse box with single stack child', () => {
            const layout: DockLayout = {
                root: {
                    type: 'box',
                    id: 'root-box',
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
            };

            dockManager.layout = layout;

            // cleanupEmptyStacks now also simplifies nested boxes
            const result = dockManager.cleanupEmptyStacks();

            // No empty stacks, so no cleanup reported
            expect(result).toBe(false);
            // But the box is simplified away, leaving just the stack
            expect(layout.root.type).toBe('stack');
            expect(layout.root.id).toBe('only-stack');
        });

        it('should not collapse root box when it has multiple children', () => {
            const layout: DockLayout = {
                root: {
                    type: 'box',
                    id: 'root-box',
                    direction: 'row',
                    weight: 1,
                    children: [
                        {
                            type: 'stack',
                            id: 'stack-1',
                            weight: 0.5,
                            activeId: 'pane-1',
                            children: [
                                { id: 'pane-1', title: 'Pane 1', contentId: 'test-content', closable: true }
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

            const result = dockManager.cleanupEmptyStacks();

            expect(result).toBe(false); // No cleanup needed
            expect(layout.root.type).toBe('box');
            expect(((layout.root as DockStack).children as DockStack[]).length).toBe(2);
        });
    });

    describe('edge cases', () => {
        it('should handle closing non-existent pane gracefully', () => {
            const layout: DockLayout = {
                root: {
                    type: 'box',
                    id: 'root-box',
                    direction: 'row',
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
            };

            dockManager.layout = layout;

            // Try to close a pane that doesn't exist
            dockManager.dispatchEvent(new CustomEvent('pane-close', {
                detail: { id: 'non-existent-pane' },
                bubbles: true,
                composed: true
            }));

            // Layout should remain unchanged (but simplified to just the stack)
            const stack = layout.root as DockStack;
            expect(stack.type).toBe('stack');
            expect(stack.children.length).toBe(1);
            expect(stack.activeId).toBe('pane-1');
        });

        it('should handle empty layout gracefully', () => {
            dockManager.layout = {
                root: {
                    type: 'stack',
                    id: 'empty-root',
                    weight: 1,
                    activeId: null,
                    children: []
                }
            };

            // Should not throw
            const result = dockManager.cleanupEmptyStacks();
            expect(result).toBe(false);
        });

        it('should handle root being a stack', () => {
            const layout: DockLayout = {
                root: {
                    type: 'stack',
                    id: 'root-stack',
                    weight: 1,
                    activeId: 'pane-1',
                    children: [
                        { id: 'pane-1', title: 'Pane 1', contentId: 'test-content', closable: true }
                    ]
                }
            };

            dockManager.layout = layout;

            // Close the only pane
            dockManager.dispatchEvent(new CustomEvent('pane-close', {
                detail: { id: 'pane-1' },
                bubbles: true,
                composed: true
            }));

            // Root stack should remain but be empty (placeholder should show)
            expect(layout.root.type).toBe('stack');
            expect((layout.root as DockStack).children.length).toBe(0);
        });

        it('should render active pane for every non-empty stack after complex splits (no empty areas)', () => {
            // Recreate the user's final layout state (deeply nested after splits/resizes)
            const layout: DockLayout = {
                root: {
                    type: 'box',
                    id: 'root',
                    direction: 'row',
                    weight: 100,
                    children: [
                        {
                            type: 'stack',
                            id: 'main-stack',
                            weight: 40,
                            activeId: 'settings',
                            children: [
                                { id: 'settings', title: 'Settings', contentId: 'settings', closable: true }
                            ]
                        },
                        {
                            id: 'box-dua0iezvi',
                            type: 'box',
                            direction: 'column',
                            weight: 40,
                            children: [
                                {
                                    id: 'box-gwsqnhmpw',
                                    type: 'box',
                                    direction: 'row',
                                    weight: 1.25,
                                    children: [
                                        {
                                            id: 'stack-lu6sq29xy',
                                            type: 'stack',
                                            weight: 0.625,
                                            children: [
                                                { id: 'commands-view', title: 'Keyboard Shortcuts', contentId: 'commands-view', closable: true }
                                            ],
                                            activeId: 'commands-view'
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            };

            // Register content builders used by the layout
            dockManager.registerContent('settings', 'Settings', (id) => {
                const el = document.createElement('div');
                el.textContent = 'settings:' + id;
                return el;
            });
            dockManager.registerContent('commands-view', 'Keyboard Shortcuts', (id) => {
                const el = document.createElement('div');
                el.textContent = 'commands:' + id;
                return el;
            });

            dockManager.layout = layout;

            // Walk the model and assert every non-empty stack has valid activeId
            function walk(node: any) {
                // Container stacks have a `direction` property; leaf stacks (panes) do not.
                if ((node as any).direction === undefined) {
                    // Leaf stack
                    if (node.children.length > 0) {
                        expect(node.activeId).toBeTruthy();
                        expect(node.children.some((c: any) => c.id === node.activeId)).toBe(true);

                        // Find the rendered host element that has a matching `.node.id`.
                        function findHostByNodeId(root: ShadowRoot | Element, id: string): HTMLElement | null {
                            for (const child of Array.from(root.children) as HTMLElement[]) {
                                const n = (child as any).node;
                                if (n && n.id === id) return child;

                                // Search inside shadowRoot of child (custom elements)
                                if ((child as any).shadowRoot) {
                                    const found = findHostByNodeId((child as any).shadowRoot, id);
                                    if (found) return found;
                                }

                                // Also search normal DOM descendants
                                if (child.children && child.children.length > 0) {
                                    const found2 = findHostByNodeId(child as Element, id);
                                    if (found2) return found2;
                                }
                            }
                            return null;
                        }

                        const el = findHostByNodeId(dockManager.shadowRoot!, node.id);
                        expect(el).toBeTruthy();
                        const activeContent = (el as HTMLElement).shadowRoot!.querySelector('.pane-content.active');
                        expect(activeContent).toBeTruthy();
                    }
                } else {
                    // Container stack - recurse
                    for (const c of node.children) walk(c);
                }
            }

            walk(layout.root as any);
        });
    });
});
