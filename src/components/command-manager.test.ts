import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CommandManager } from './command-manager.js';

describe('CommandManager', () => {
    let commandManager: CommandManager;
    let reloadMock: ReturnType<typeof vi.fn>;
    let confirmDialog: any;
    let alertDialog: any;

    beforeEach(() => {
        // Mock window.location.reload
        reloadMock = vi.fn();
        Object.defineProperty(window, 'location', {
            value: { reload: reloadMock },
            writable: true
        });

        commandManager = new CommandManager();
        
        // Mock handlers for initialization
        const mockHandlers = {
            onFileOpen: vi.fn(),
            onFileQuit: vi.fn(),
            onEditUndo: vi.fn(),
            onEditRedo: vi.fn(),
            onZoomIn: vi.fn(),
            onZoomOut: vi.fn(),
            onZoomFit: vi.fn(),
            onToggleSignalSelection: vi.fn()
        };
        
        commandManager.initializeCommandPalette();
        commandManager.initializeShortcuts(mockHandlers);
        
        // Get references to the dialogs
        confirmDialog = document.body.querySelector('confirm-dialog');
        alertDialog = document.body.querySelector('alert-dialog');
    });

    afterEach(() => {
        // Clean up
        if (commandManager) {
            commandManager.deactivate();
        }
    });

    describe('Clear Local Storage Command', () => {
        it('should register clear local storage command', () => {
            const registry = commandManager.getCommandRegistry();
            const command = registry.get('settings-clear-local-storage');
            
            expect(command).toBeDefined();
            expect(command?.label).toBe('Clear Local Storage');
        });

        it('should clear localStorage when confirmed', async () => {
            // Set up test data in localStorage
            localStorage.setItem('test-key', 'test-value');
            localStorage.setItem('app-theme', 'dark');
            expect(localStorage.length).toBeGreaterThan(0);
            
            // Mock the confirm dialog to return true
            const showSpy = vi.spyOn(confirmDialog, 'show').mockResolvedValue(true);
            
            // Mock the alert dialog
            const alertShowSpy = vi.spyOn(alertDialog, 'show').mockResolvedValue(undefined);
            
            // Execute the command
            const registry = commandManager.getCommandRegistry();
            const command = registry.get('settings-clear-local-storage');
            await command?.handler();
            
            // Verify confirm dialog was called with the right message
            expect(showSpy).toHaveBeenCalledWith({
                title: 'Clear Local Storage',
                message: 'Are you sure you want to clear all local storage? This will reset all settings, theme preferences, and file states.',
                confirmLabel: 'Clear',
                cancelLabel: 'Cancel',
                danger: true
            });
            
            // Verify localStorage was cleared
            expect(localStorage.length).toBe(0);
            
            // Verify alert was shown
            expect(alertShowSpy).toHaveBeenCalledWith({
                title: 'Success',
                message: 'Local storage has been cleared. The page will now reload.'
            });
            
            // Verify page reload was triggered
            expect(reloadMock).toHaveBeenCalled();
            
            // Clean up
            showSpy.mockRestore();
            alertShowSpy.mockRestore();
        });

        it('should not clear localStorage when cancelled', async () => {
            // Set up test data in localStorage
            localStorage.setItem('test-key', 'test-value');
            const initialLength = localStorage.length;
            
            // Mock the confirm dialog to return false
            const showSpy = vi.spyOn(confirmDialog, 'show').mockResolvedValue(false);
            
            // Mock the alert dialog
            const alertShowSpy = vi.spyOn(alertDialog, 'show').mockResolvedValue(undefined);
            
            // Execute the command
            const registry = commandManager.getCommandRegistry();
            const command = registry.get('settings-clear-local-storage');
            await command?.handler();
            
            // Verify confirm dialog was called
            expect(showSpy).toHaveBeenCalled();
            
            // Verify localStorage was NOT cleared
            expect(localStorage.length).toBe(initialLength);
            expect(localStorage.getItem('test-key')).toBe('test-value');
            
            // Verify alert was NOT shown
            expect(alertShowSpy).not.toHaveBeenCalled();
            
            // Verify page was NOT reloaded
            expect(reloadMock).not.toHaveBeenCalled();
            
            // Clean up
            showSpy.mockRestore();
            alertShowSpy.mockRestore();
        });
    });

    describe('Command Registry', () => {
        it('should return command registry', () => {
            const registry = commandManager.getCommandRegistry();
            expect(registry).toBeDefined();
        });

        it('should register all standard commands', () => {
            const registry = commandManager.getCommandRegistry();
            
            expect(registry.get('file-open')).toBeDefined();
            expect(registry.get('file-quit')).toBeDefined();
            expect(registry.get('edit-undo')).toBeDefined();
            expect(registry.get('edit-redo')).toBeDefined();
            expect(registry.get('view-zoom-in')).toBeDefined();
            expect(registry.get('view-zoom-out')).toBeDefined();
            expect(registry.get('view-zoom-fit')).toBeDefined();
            expect(registry.get('view-toggle-signal-selection')).toBeDefined();
            expect(registry.get('command-palette-toggle')).toBeDefined();
        });
    });
});
