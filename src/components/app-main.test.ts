import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AppMain } from './app-main.js';
import * as backend from '../backend.js';

// Mock the backend module
vi.mock('../backend.js', () => ({
    addFile: vi.fn(),
    openFileDialog: vi.fn(),
    getHierarchy: vi.fn(),
    getFiles: vi.fn(() => Promise.resolve([])),
    removeFile: vi.fn(() => Promise.resolve()),
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

describe('AppMain - File Close Command', () => {
    let appMain: AppMain;

    beforeEach(() => {
        appMain = new AppMain();
        document.body.appendChild(appMain);
    });

    afterEach(() => {
        if (appMain.parentNode) {
            appMain.parentNode.removeChild(appMain);
        }
        vi.clearAllMocks();
    });

    it('should register file-close command', async () => {
        // Wait for component to initialize
        await vi.waitFor(() => {
            const dockManager = appMain.shadowRoot!.querySelector('dock-manager');
            return dockManager && (dockManager as any).layout;
        });

        // Access the private commandRegistry through any type
        const commandRegistry = (appMain as any).commandRegistry;
        expect(commandRegistry.has('file-close')).toBe(true);
    });

    it('should close active file when file-close command is executed', async () => {
        // Wait for component to initialize
        await vi.waitFor(() => {
            const dockManager = appMain.shadowRoot!.querySelector('dock-manager');
            return dockManager && (dockManager as any).layout;
        });

        // Set an active file
        (appMain as any).state.activeFileId = 'test-file.vcd';

        // Execute the file-close command
        const commandRegistry = (appMain as any).commandRegistry;
        await commandRegistry.execute('file-close');

        // Verify removeFile was called with the active file
        expect(backend.removeFile).toHaveBeenCalledWith('test-file.vcd');
    });

    it('should not throw error when file-close is executed with no active file', async () => {
        // Wait for component to initialize
        await vi.waitFor(() => {
            const dockManager = appMain.shadowRoot!.querySelector('dock-manager');
            return dockManager && (dockManager as any).layout;
        });

        // Ensure no active file
        (appMain as any).state.activeFileId = null;

        // Execute the file-close command should not throw
        const commandRegistry = (appMain as any).commandRegistry;
        await expect(commandRegistry.execute('file-close')).resolves.not.toThrow();

        // Verify removeFile was not called
        expect(backend.removeFile).not.toHaveBeenCalled();
    });
});
