import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AppMain } from './app-main.js';

// Mock the backend module
vi.mock('../backend.js', () => ({
    addFile: vi.fn(),
    openFileDialog: vi.fn(),
    getHierarchy: vi.fn(),
    getFiles: vi.fn(() => Promise.resolve([])),
    removeFile: vi.fn(),
    restoreSession: vi.fn(() => Promise.resolve()),
    isTauri: false
}));

describe('AppMain - Sidebar Visibility', () => {
    let appMain: AppMain;

    beforeEach(() => {
        appMain = new AppMain();
        document.body.appendChild(appMain);
    });

    afterEach(() => {
        if (appMain.parentNode) {
            appMain.parentNode.removeChild(appMain);
        }
    });

    it('should hide signal selection pane when no files are open', async () => {
        // Wait for refreshFiles to complete (it's called in connectedCallback)
        await vi.waitFor(() => {
            const dockManager = appMain.shadowRoot!.querySelector('dock-manager');
            return dockManager && (dockManager as any).layout;
        });

        const dockManager = appMain.shadowRoot!.querySelector('dock-manager');
        expect(dockManager).toBeTruthy();

        const layout = (dockManager as any).layout;
        expect(layout).toBeTruthy();
        expect(layout.root.type).toBe('box');

        // Check that sidebar-stack is not in the layout when no files are open
        const sidebarStack = layout.root.children.find(
            (child: any) => child.type === 'stack' && child.id === 'sidebar-stack'
        );
        
        expect(sidebarStack).toBeUndefined();
    });

    it('should have main-stack in layout', async () => {
        // Wait for refreshFiles to complete (it's called in connectedCallback)
        await vi.waitFor(() => {
            const dockManager = appMain.shadowRoot!.querySelector('dock-manager');
            return dockManager && (dockManager as any).layout;
        });

        const dockManager = appMain.shadowRoot!.querySelector('dock-manager');
        const layout = (dockManager as any).layout;

        // Main stack should always be present
        const mainStack = layout.root.children.find(
            (child: any) => child.type === 'stack' && child.id === 'main-stack'
        );
        
        expect(mainStack).toBeDefined();
        expect(mainStack.id).toBe('main-stack');
    });
});
