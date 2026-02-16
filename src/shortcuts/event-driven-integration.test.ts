import { describe, it, expect, vi } from 'vitest';
import { CommandRegistry, ShortcutManager } from './index.js';

describe('Event-Driven Command System Integration', () => {
    it('should emit command-specific events when shortcuts trigger commands', async () => {
        const registry = new CommandRegistry();
        const manager = new ShortcutManager(registry);
        
        let eventFired = false;
        let handlerCalled = false;
        
        // Set up event listener for specific command (the event-driven way)
        registry.addEventListener('test-action', () => {
            eventFired = true;
        });
        
        // Register command with stub handler
        registry.register({
            id: 'test-action',
            label: 'Test Action',
            handler: () => {
                handlerCalled = true;
            }
        });
        
        // Register shortcut
        manager.register({
            shortcut: 'Ctrl+T',
            commandId: 'test-action'
        });
        
        // Execute command directly (simulating shortcut trigger)
        await registry.execute('test-action');
        
        // Verify both event and handler were triggered
        expect(eventFired).toBe(true);
        expect(handlerCalled).toBe(true);
    });
    
    it('should support multiple listeners for the same command', async () => {
        const registry = new CommandRegistry();
        const callLog: string[] = [];
        
        // Multiple listeners for the same command event
        registry.addEventListener('multi-listener-cmd', () => {
            callLog.push('listener-1');
        });
        
        registry.addEventListener('multi-listener-cmd', () => {
            callLog.push('listener-2');
        });
        
        registry.addEventListener('multi-listener-cmd', () => {
            callLog.push('listener-3');
        });
        
        // Register command
        registry.register({
            id: 'multi-listener-cmd',
            label: 'Multi Listener Command',
            handler: () => {
                callLog.push('handler');
            }
        });
        
        // Execute command
        await registry.execute('multi-listener-cmd');
        
        // Verify all listeners were called before handler
        expect(callLog).toEqual(['listener-1', 'listener-2', 'listener-3', 'handler']);
    });
    
    it('should allow conditional handling based on application state', async () => {
        const registry = new CommandRegistry();
        let state = { editMode: false };
        let editActionExecuted = false;
        
        // Event listener that respects application state
        registry.addEventListener('edit-action', () => {
            if (state.editMode) {
                editActionExecuted = true;
            }
        });
        
        // Register command
        registry.register({
            id: 'edit-action',
            label: 'Edit Action',
            handler: () => {}
        });
        
        // Execute when edit mode is disabled
        await registry.execute('edit-action');
        expect(editActionExecuted).toBe(false);
        
        // Enable edit mode
        state.editMode = true;
        
        // Execute when edit mode is enabled
        await registry.execute('edit-action');
        expect(editActionExecuted).toBe(true);
    });
    
    it('should work with JSON-loaded shortcuts', () => {
        // This test verifies that shortcuts can be loaded from JSON
        // and the event-driven system works with them
        const registry = new CommandRegistry();
        const manager = new ShortcutManager(registry);
        
        // Simulate loading shortcuts from JSON
        const jsonShortcuts = [
            { shortcut: 'Ctrl+O', commandId: 'file-open' },
            { shortcut: 'Ctrl+S', commandId: 'file-save' },
            { shortcut: 'Ctrl+Z', commandId: 'edit-undo' }
        ];
        
        // Register commands
        for (const binding of jsonShortcuts) {
            registry.register({
                id: binding.commandId,
                label: binding.commandId,
                handler: () => {}
            });
            
            manager.register(binding);
        }
        
        // Verify all shortcuts are registered
        const bindings = manager.getBindings();
        expect(bindings.length).toBe(3);
        expect(bindings.map(b => b.commandId)).toEqual(['file-open', 'file-save', 'edit-undo']);
    });
});
