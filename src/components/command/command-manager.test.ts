import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CommandManager } from './command-manager.js';

describe('CommandManager', () => {
    let commandManager: CommandManager;
    let reloadMock: ReturnType<typeof vi.fn>;

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
            onToggleNetlist: vi.fn(),
            onToggleUndoHistory: vi.fn(),
            onShowSettings: vi.fn(),
            onShowAbout: vi.fn(),
            onShowUndoTree: vi.fn()
        };
        
        commandManager.initializeShortcuts(mockHandlers);
    });

    describe('Clear Local Storage Command', () => {
        it('should register clear local storage command', () => {
            const registry = commandManager.getCommandRegistry();
            const command = registry.get('core/settings/clear-local-storage');
            
            expect(command).toBeDefined();
            expect(command?.label).toBe('Clear Local Storage');
        });

        it('should clear localStorage when confirmed', () => {
            // Set up test data in localStorage
            localStorage.setItem('test-key', 'test-value');
            localStorage.setItem('app-theme', 'dark');
            expect(localStorage.length).toBeGreaterThan(0);
            
            // Mock window.confirm to return true
            const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
            
            // Mock window.alert
            const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
            
            // Execute the command
            const registry = commandManager.getCommandRegistry();
            const command = registry.get('core/settings/clear-local-storage');
            command?.handler();
            
            // Verify confirm was called with the right message
            expect(confirmSpy).toHaveBeenCalledWith(
                'Are you sure you want to clear all local storage? This will reset all settings, theme preferences, and file states.'
            );
            
            // Verify localStorage was cleared
            expect(localStorage.length).toBe(0);
            
            // Verify alert was shown
            expect(alertSpy).toHaveBeenCalledWith(
                'Local storage has been cleared. The page will now reload.'
            );
            
            // Verify page reload was triggered
            expect(reloadMock).toHaveBeenCalled();
            
            // Clean up
            confirmSpy.mockRestore();
            alertSpy.mockRestore();
        });

        it('should not clear localStorage when cancelled', () => {
            // Set up test data in localStorage
            localStorage.setItem('test-key', 'test-value');
            const initialLength = localStorage.length;
            
            // Mock window.confirm to return false
            const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
            
            // Mock window.alert
            const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
            
            // Execute the command
            const registry = commandManager.getCommandRegistry();
            const command = registry.get('core/settings/clear-local-storage');
            command?.handler();
            
            // Verify confirm was called
            expect(confirmSpy).toHaveBeenCalled();
            
            // Verify localStorage was NOT cleared
            expect(localStorage.length).toBe(initialLength);
            expect(localStorage.getItem('test-key')).toBe('test-value');
            
            // Verify alert was NOT shown
            expect(alertSpy).not.toHaveBeenCalled();
            
            // Verify page was NOT reloaded
            expect(reloadMock).not.toHaveBeenCalled();
            
            // Clean up
            confirmSpy.mockRestore();
            alertSpy.mockRestore();
        });
    });

    describe('Command Registry', () => {
        it('should return command registry', () => {
            const registry = commandManager.getCommandRegistry();
            expect(registry).toBeDefined();
        });

        it('should register all standard commands', () => {
            const registry = commandManager.getCommandRegistry();
            
            expect(registry.get('core/file/open')).toBeDefined();
            expect(registry.get('core/file/quit')).toBeDefined();
            expect(registry.get('core/view/zoom-in')).toBeDefined();
            expect(registry.get('core/view/zoom-out')).toBeDefined();
            expect(registry.get('core/view/zoom-fit')).toBeDefined();
            expect(registry.get('core/view/toggle-netlist')).toBeDefined();
            expect(registry.get('core/command-palette/toggle')).toBeDefined();
        });
    });
});
