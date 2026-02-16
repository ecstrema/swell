import { describe, it, expect, beforeEach } from 'vitest';
import { PaneManager } from './pane-manager.js';
import { DockManager } from './docking/dock-manager.js';
import { DockLayoutHelper } from './dock-layout-helper.js';
import { DockLayout, DockBox, DockStack } from './docking/types.js';

describe('PaneManager - Close Empty Docks', () => {
    let dockManager: DockManager;
    let layoutHelper: DockLayoutHelper;
    let paneManager: PaneManager;

    beforeEach(() => {
        dockManager = new DockManager();
        layoutHelper = new DockLayoutHelper(dockManager);
        paneManager = new PaneManager(dockManager, layoutHelper);
    });

    it('should remove empty dock when last pane is closed in a multi-dock layout', () => {
        // Create a layout with 2 stacks side-by-side (row)
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
                            {
                                id: 'pane-1',
                                title: 'Pane 1',
                                contentId: 'content-1',
                                closable: true
                            }
                        ]
                    },
                    {
                        type: 'stack',
                        id: 'stack-2',
                        weight: 1,
                        activeId: 'pane-2',
                        children: [
                            {
                                id: 'pane-2',
                                title: 'Pane 2',
                                contentId: 'content-2',
                                closable: true
                            }
                        ]
                    }
                ]
            }
        };

        dockManager.layout = layout;

        // Close the only pane in stack-1
        paneManager.closePane('pane-1');

        // Verify stack-1 is removed from the layout
        const updatedLayout = dockManager.layout;
        expect(updatedLayout).toBeTruthy();
        
        if (updatedLayout!.root.type === 'box') {
            // Should only have stack-2 left
            expect(updatedLayout!.root.children.length).toBe(1);
            expect(updatedLayout!.root.children[0].id).toBe('stack-2');
        } else {
            // If the root was simplified to just stack-2
            expect(updatedLayout!.root.type).toBe('stack');
            expect(updatedLayout!.root.id).toBe('stack-2');
        }
    });

    it('should keep dock when closing pane if other panes remain', () => {
        // Create a layout with 1 stack containing 2 panes
        const layout: DockLayout = {
            root: {
                type: 'stack',
                id: 'main-stack',
                weight: 1,
                activeId: 'pane-1',
                children: [
                    {
                        id: 'pane-1',
                        title: 'Pane 1',
                        contentId: 'content-1',
                        closable: true
                    },
                    {
                        id: 'pane-2',
                        title: 'Pane 2',
                        contentId: 'content-2',
                        closable: true
                    }
                ]
            }
        };

        dockManager.layout = layout;

        // Close one pane
        paneManager.closePane('pane-1');

        // Verify stack still exists with the remaining pane
        const updatedLayout = dockManager.layout;
        expect(updatedLayout).toBeTruthy();
        expect(updatedLayout!.root.type).toBe('stack');
        expect(updatedLayout!.root.id).toBe('main-stack');
        
        const stack = updatedLayout!.root as DockStack;
        expect(stack.children.length).toBe(1);
        expect(stack.children[0].id).toBe('pane-2');
        expect(stack.activeId).toBe('pane-2');
    });

    it('should not remove dock when closing pane if only one dock exists', () => {
        // Create a layout with 1 stack containing 1 pane
        const layout: DockLayout = {
            root: {
                type: 'stack',
                id: 'main-stack',
                weight: 1,
                activeId: 'pane-1',
                children: [
                    {
                        id: 'pane-1',
                        title: 'Pane 1',
                        contentId: 'content-1',
                        closable: true
                    }
                ]
            }
        };

        dockManager.layout = layout;

        // Close the only pane
        paneManager.closePane('pane-1');

        // Verify stack still exists but is now empty
        const updatedLayout = dockManager.layout;
        expect(updatedLayout).toBeTruthy();
        expect(updatedLayout!.root.type).toBe('stack');
        expect(updatedLayout!.root.id).toBe('main-stack');
        
        const stack = updatedLayout!.root as DockStack;
        expect(stack.children.length).toBe(0);
        expect(stack.activeId).toBeNull();
    });

    it('should collapse parent box when empty dock is removed', () => {
        // Create a nested layout: box > [box > [stack1, stack2], stack3]
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
                                activeId: 'pane-1',
                                children: [
                                    {
                                        id: 'pane-1',
                                        title: 'Pane 1',
                                        contentId: 'content-1',
                                        closable: true
                                    }
                                ]
                            },
                            {
                                type: 'stack',
                                id: 'stack-2',
                                weight: 1,
                                activeId: 'pane-2',
                                children: [
                                    {
                                        id: 'pane-2',
                                        title: 'Pane 2',
                                        contentId: 'content-2',
                                        closable: true
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        type: 'stack',
                        id: 'stack-3',
                        weight: 1,
                        activeId: 'pane-3',
                        children: [
                            {
                                id: 'pane-3',
                                title: 'Pane 3',
                                contentId: 'content-3',
                                closable: true
                            }
                        ]
                    }
                ]
            }
        };

        dockManager.layout = layout;

        // Close pane-1, leaving stack-1 empty
        paneManager.closePane('pane-1');

        // Verify layout is cleaned up
        const updatedLayout = dockManager.layout;
        expect(updatedLayout).toBeTruthy();
        expect(updatedLayout!.root.type).toBe('box');
        
        const rootBox = updatedLayout!.root as DockBox;
        // Should have stack-2 (from collapsed nested-box) and stack-3
        expect(rootBox.children.length).toBe(2);
        
        // Check that nested-box was collapsed to stack-2
        const firstChild = rootBox.children[0];
        expect(firstChild.type).toBe('stack');
        expect(firstChild.id).toBe('stack-2');
        // stack-2 should inherit nested-box's weight
        expect(firstChild.weight).toBe(1);
        
        // Check that stack-3 is still there
        expect(rootBox.children[1].id).toBe('stack-3');
    });
});
