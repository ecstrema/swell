import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DockStackComponent } from './dock-stack.js';
import { DockManager } from './dock-manager.js';

describe('DockStack - Empty State Button', () => {
    let dockStack: DockStackComponent;
    let dockManager: DockManager;

    beforeEach(() => {
        dockStack = new DockStackComponent();
        dockManager = new DockManager();
        dockStack.manager = dockManager;
        document.body.appendChild(dockStack);
    });

    afterEach(() => {
        if (dockStack.parentNode) {
            dockStack.parentNode.removeChild(dockStack);
        }
    });

    it('should show empty state with open file button when no children exist', () => {
        // Set an empty stack
        dockStack.node = {
            type: 'stack',
            id: 'test-stack',
            weight: 1,
            activeId: null,
            children: []
        };

        // Verify empty state is shown
        const emptyPlaceholder = dockStack.shadowRoot!.querySelector('.empty-placeholder');
        expect(emptyPlaceholder).toBeTruthy();

        // Verify button exists
        const openFileBtn = dockStack.shadowRoot!.querySelector('#open-file-btn') as HTMLButtonElement;
        expect(openFileBtn).toBeTruthy();
        expect(openFileBtn.textContent).toBe('open a file');
    });

    it('should dispatch file-open-request event when button is clicked', () => {
        // Set an empty stack
        dockStack.node = {
            type: 'stack',
            id: 'test-stack',
            weight: 1,
            activeId: null,
            children: []
        };

        // Listen for the event
        const eventListener = vi.fn();
        dockStack.addEventListener('file-open-request', eventListener);

        // Click the button
        const openFileBtn = dockStack.shadowRoot!.querySelector('#open-file-btn') as HTMLButtonElement;
        openFileBtn.click();

        // Verify event was dispatched
        expect(eventListener).toHaveBeenCalled();
    });

    it('should not show button when children exist', () => {
        // Set a stack with children
        dockStack.node = {
            type: 'stack',
            id: 'test-stack',
            weight: 1,
            activeId: 'pane-1',
            children: [
                {
                    id: 'pane-1',
                    title: 'Test Pane',
                    contentId: 'test-content',
                    closable: true
                }
            ]
        };

        // Register mock content
        dockManager.registerContent('test-content', () => {
            const div = document.createElement('div');
            div.textContent = 'Test Content';
            return div;
        });

        // Re-render with content
        dockStack.node = {
            type: 'stack',
            id: 'test-stack',
            weight: 1,
            activeId: 'pane-1',
            children: [
                {
                    id: 'pane-1',
                    title: 'Test Pane',
                    contentId: 'test-content',
                    closable: true
                }
            ]
        };

        // Verify empty state is not shown
        const emptyPlaceholder = dockStack.shadowRoot!.querySelector('.empty-placeholder');
        expect(emptyPlaceholder).toBeNull();

        // Verify button does not exist
        const openFileBtn = dockStack.shadowRoot!.querySelector('#open-file-btn');
        expect(openFileBtn).toBeNull();
    });
});

describe('DockStack - Tab Dragging', () => {
    let dockStack: DockStackComponent;
    let dockManager: DockManager;

    beforeEach(() => {
        dockStack = new DockStackComponent();
        dockManager = new DockManager();
        dockStack.manager = dockManager;
        document.body.appendChild(dockStack);
    });

    afterEach(() => {
        if (dockStack.parentNode) {
            dockStack.parentNode.removeChild(dockStack);
        }
    });

    it('should make tabs draggable', () => {
        // Register mock content
        dockManager.registerContent('test-content', () => {
            const div = document.createElement('div');
            div.textContent = 'Test Content';
            return div;
        });

        // Set a stack with children
        dockStack.node = {
            type: 'stack',
            id: 'test-stack',
            weight: 1,
            activeId: 'pane-1',
            children: [
                {
                    id: 'pane-1',
                    title: 'Test Pane',
                    contentId: 'test-content',
                    closable: true
                }
            ]
        };

        // Verify tab is draggable
        const tab = dockStack.shadowRoot!.querySelector('.tab') as HTMLElement;
        expect(tab).toBeTruthy();
        expect(tab.getAttribute('draggable')).toBe('true');
    });

    it('should call manager handleDragStart when tab drag starts', () => {
        // Register mock content
        dockManager.registerContent('test-content', () => {
            const div = document.createElement('div');
            div.textContent = 'Test Content';
            return div;
        });

        // Spy on handleDragStart
        const handleDragStartSpy = vi.spyOn(dockManager, 'handleDragStart');

        // Set a stack with children
        const node = {
            type: 'stack' as const,
            id: 'test-stack',
            weight: 1,
            activeId: 'pane-1',
            children: [
                {
                    id: 'pane-1',
                    title: 'Test Pane',
                    contentId: 'test-content',
                    closable: true
                }
            ]
        };
        dockStack.node = node;

        // Trigger dragstart event using MouseEvent as fallback for jsdom
        const tab = dockStack.shadowRoot!.querySelector('.tab') as HTMLElement;
        const dragEvent = new MouseEvent('dragstart', { 
            bubbles: true,
            cancelable: true,
        });
        // Mock dataTransfer property
        Object.defineProperty(dragEvent, 'dataTransfer', {
            value: {
                effectAllowed: '',
                setData: vi.fn(),
            },
            writable: true
        });
        tab.dispatchEvent(dragEvent);

        // Verify handleDragStart was called with correct arguments
        expect(handleDragStartSpy).toHaveBeenCalledWith(node.children[0], node);
    });

    it('should add dragging class during drag', () => {
        // Register mock content
        dockManager.registerContent('test-content', () => {
            const div = document.createElement('div');
            div.textContent = 'Test Content';
            return div;
        });

        // Set a stack with children
        dockStack.node = {
            type: 'stack',
            id: 'test-stack',
            weight: 1,
            activeId: 'pane-1',
            children: [
                {
                    id: 'pane-1',
                    title: 'Test Pane',
                    contentId: 'test-content',
                    closable: true
                }
            ]
        };

        // Get tab element
        const tab = dockStack.shadowRoot!.querySelector('.tab') as HTMLElement;

        // Trigger dragstart event using MouseEvent as fallback for jsdom
        const dragStartEvent = new MouseEvent('dragstart', { 
            bubbles: true,
            cancelable: true,
        });
        // Mock dataTransfer property
        Object.defineProperty(dragStartEvent, 'dataTransfer', {
            value: {
                effectAllowed: '',
                setData: vi.fn(),
            },
            writable: true
        });
        tab.dispatchEvent(dragStartEvent);

        // Verify dragging class is added
        expect(tab.classList.contains('dragging')).toBe(true);

        // Trigger dragend event
        const dragEndEvent = new MouseEvent('dragend', { 
            bubbles: true,
            cancelable: true
        });
        tab.dispatchEvent(dragEndEvent);

        // Verify dragging class is removed
        expect(tab.classList.contains('dragging')).toBe(false);
    });
});
