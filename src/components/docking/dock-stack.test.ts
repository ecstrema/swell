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
