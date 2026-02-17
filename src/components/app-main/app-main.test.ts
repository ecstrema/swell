import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AppMain } from './app-main.js';
import * as backend from '../../backend/index.js';

// Mock the backend module
vi.mock('../../backend/index.js', () => ({
    addFile: vi.fn(),
    openFileDialog: vi.fn(() => Promise.resolve(null)),
    getHierarchy: vi.fn(),
    getFiles: vi.fn(() => Promise.resolve([])),
    removeFile: vi.fn(),
    restoreSession: vi.fn(() => Promise.resolve()),
    getStartupFiles: vi.fn(() => Promise.resolve([])),
    isTauri: false,
    loadExampleFile: vi.fn()
}));

// Mock settings storage
vi.mock('../settings/settings-storage.js', () => ({
    getSetting: vi.fn(() => Promise.resolve(true)),
    setSetting: vi.fn(() => Promise.resolve())
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

describe('AppMain - Empty State File Picker', () => {
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

    it('should call openFileDialog when file picker button is clicked', async () => {
        // Wait for component to be fully initialized
        await vi.waitFor(() => {
            const dockManager = appMain.shadowRoot!.querySelector('dock-manager');
            return dockManager && (dockManager as any).layout;
        });

        // The fileViewContainer is registered with dock-manager but not in shadow root
        // We need to query it from the component's property
        const fileViewContainer = (appMain as any).fileViewContainer as HTMLElement;
        expect(fileViewContainer).toBeTruthy();

        const filePickerBtn = fileViewContainer.querySelector('#file-picker-btn') as HTMLButtonElement;
        expect(filePickerBtn).toBeTruthy();
        expect(filePickerBtn.textContent).toBe('Open File');

        // Click the button
        filePickerBtn.click();

        // Verify that openFileDialog was called
        await vi.waitFor(() => {
            expect(backend.openFileDialog).toHaveBeenCalled();
        });
    });
});

describe('AppMain - File Opening', () => {
    let appMain: AppMain;

    beforeEach(() => {
        appMain = new AppMain();
        document.body.appendChild(appMain);
        vi.clearAllMocks();
    });

    afterEach(() => {
        if (appMain.parentNode) {
            appMain.parentNode.removeChild(appMain);
        }
    });

    it('should successfully open example files without settings errors', async () => {
        // Wait for initial setup
        await vi.waitFor(() => {
            const dockManager = appMain.shadowRoot!.querySelector('dock-manager');
            return dockManager && (dockManager as any).layout;
        });

        // Mock that a file is opened
        const mockFile = 'test.vcd';
        vi.mocked(backend.loadExampleFile).mockResolvedValue(mockFile);
        vi.mocked(backend.getFiles).mockResolvedValue([mockFile]);
        vi.mocked(backend.getHierarchy).mockResolvedValue({
            name: 'root',
            children: []
        });

        // Directly call handleOpenExample instead of triggering the event
        // (since the event now opens the selection palette)
        await (appMain as any).handleOpenExample('test.vcd');

        // Verify the file was loaded
        expect(backend.loadExampleFile).toHaveBeenCalledWith('test.vcd');
        expect(backend.getFiles).toHaveBeenCalled();
    });

    it('should handle refreshFiles after opening a file', async () => {
        // Wait for initial setup
        await vi.waitFor(() => {
            const dockManager = appMain.shadowRoot!.querySelector('dock-manager');
            return dockManager && (dockManager as any).layout;
        });

        // Mock that a file is opened
        const mockFile = 'test.vcd';
        vi.mocked(backend.addFile).mockResolvedValue(mockFile);
        vi.mocked(backend.getFiles).mockResolvedValue([mockFile]);
        vi.mocked(backend.getHierarchy).mockResolvedValue({
            name: 'root',
            children: []
        });

        // Call handleFileOpen
        await (appMain as any).handleFileOpen();

        // Verify the files were refreshed successfully
        await vi.waitFor(() => {
            expect(backend.getFiles).toHaveBeenCalled();
        }, { timeout: 1000 });
    });
});
