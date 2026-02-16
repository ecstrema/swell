# Event-Driven Command System - Examples

This document provides practical examples of using the event-driven command system in Swell.

## Basic Example: Command with Event Listener

```typescript
import { CommandRegistry, ShortcutManager } from './shortcuts/index.js';

// 1. Create a command registry
const registry = new CommandRegistry();

// 2. Set up an event listener to react to the specific command
registry.addEventListener('save-file', () => {
    console.log('Saving file...');
    // Actual save logic here
});

// 3. Register the command (with a stub handler)
registry.register({
    id: 'save-file',
    label: 'Save File',
    handler: () => {
        // The event listener will handle the actual logic
    }
});

// 4. Execute the command (can be triggered by shortcut, menu, or code)
await registry.execute('save-file');
```

## Example: Multiple Listeners for One Command

Multiple components can react to the same command event:

```typescript
// Component A: Update UI
registry.addEventListener('file-open', () => {
    updateStatusBar('Opening file...');
});

// Component B: Log analytics
registry.addEventListener('file-open', () => {
    analytics.track('file_open_command');
});

// Component C: Perform actual file open
registry.addEventListener('file-open', () => {
    if (customEvent.detail.commandId === 'file-open') {
        openFilePicker();
    }
});
```

## Example: Complete Integration with Shortcuts

```typescript
import { CommandRegistry, ShortcutManager, defaultShortcuts } from './shortcuts/index.js';

class MyApp {
    private commandRegistry: CommandRegistry;
    private shortcutManager: ShortcutManager;
    
    constructor() {
        this.commandRegistry = new CommandRegistry();
        this.shortcutManager = new ShortcutManager(this.commandRegistry);
        
        this.setupCommands();
        this.setupEventListeners();
        this.setupShortcuts();
    }
    
    private setupCommands() {
        // Register all commands
        const commands = [
            { id: 'file-open', label: 'Open File' },
            { id: 'file-save', label: 'Save File' },
            { id: 'edit-undo', label: 'Undo' },
            { id: 'edit-redo', label: 'Redo' }
        ];
        
        for (const cmd of commands) {
            this.commandRegistry.register({
                id: cmd.id,
                label: cmd.label,
                handler: () => {
                    // Stub handler - real work done in event listeners
                }
            });
        }
    }
    
    private setupEventListeners() {
        // Listen to specific command events
        this.commandRegistry.addEventListener('file-open', () => {
            this.handleFileOpen();
        });
        
        this.commandRegistry.addEventListener('file-save', () => {
            this.handleFileSave();
        });
        
        this.commandRegistry.addEventListener('edit-undo', () => {
            this.handleUndo();
        });
        
        this.commandRegistry.addEventListener('edit-redo', () => {
            this.handleRedo();
        });
    }
    
    private setupShortcuts() {
        // Load shortcuts from JSON configuration
        this.shortcutManager.registerMany(defaultShortcuts);
        
        // Or register shortcuts manually
        this.shortcutManager.register({
            shortcut: 'Ctrl+S',
            commandId: 'file-save'
        });
        
        // Activate keyboard listening
        this.shortcutManager.activate();
    }
    
    private handleFileOpen() {
        console.log('Opening file...');
    }
    
    private handleFileSave() {
        console.log('Saving file...');
    }
    
    private handleUndo() {
        console.log('Undo...');
    }
    
    private handleRedo() {
        console.log('Redo...');
    }
}
```

## Example: Conditional Event Handling

```typescript
class ConditionalHandler {
    private isEditMode = false;
    
    constructor(registry: CommandRegistry) {
        // Only handle certain commands in edit mode
        registry.addEventListener('command-execute', (event: Event) => {
            const customEvent = event as CustomEvent<{ commandId: string }>;
            const { commandId } = customEvent.detail;
            
            if (commandId === 'edit-undo' || commandId === 'edit-redo') {
                if (!this.isEditMode) {
                    console.log('Not in edit mode, ignoring command');
                    return;
                }
                
                this.handleEditCommand(commandId);
            }
        });
    }
    
    private handleEditCommand(commandId: string) {
        // Handle edit commands
    }
    
    public enableEditMode() {
        this.isEditMode = true;
    }
    
    public disableEditMode() {
        this.isEditMode = false;
    }
}
```

## Example: Testing with Events

```typescript
import { describe, it, expect } from 'vitest';
import { CommandRegistry } from './command-registry.js';

describe('Event-driven commands', () => {
    it('should emit event when command is executed', async () => {
        const registry = new CommandRegistry();
        let eventFired = false;
        let receivedCommandId = '';
        
        // Set up event listener
        registry.addEventListener('command-execute', (event: Event) => {
            eventFired = true;
            const customEvent = event as CustomEvent<{ commandId: string }>;
            receivedCommandId = customEvent.detail.commandId;
        });
        
        // Register command
        registry.register({
            id: 'test-command',
            label: 'Test',
            handler: () => {}
        });
        
        // Execute command
        await registry.execute('test-command');
        
        // Verify event was emitted
        expect(eventFired).toBe(true);
        expect(receivedCommandId).toBe('test-command');
    });
});
```

## Example: Loading Shortcuts from JSON

The `default-shortcuts.json` file defines shortcuts that are automatically loaded:

```json
{
  "shortcuts": [
    {
      "shortcut": "Ctrl+O",
      "commandId": "file-open",
      "description": "Open file dialog"
    },
    {
      "shortcut": "Ctrl+S",
      "commandId": "file-save",
      "description": "Save current file"
    },
    {
      "shortcut": "Ctrl+Z",
      "commandId": "edit-undo",
      "description": "Undo last action"
    },
    {
      "shortcut": "Ctrl+Shift+Z",
      "commandId": "edit-redo",
      "description": "Redo last action"
    }
  ]
}
```

These shortcuts are loaded automatically in `CommandManager.initializeShortcuts()`:

```typescript
import { defaultShortcuts } from './shortcuts/index.js';

// In CommandManager
initializeShortcuts(): void {
    // ... register commands ...
    
    // Load shortcuts from JSON
    this.shortcutManager.registerMany(defaultShortcuts);
    
    this.shortcutManager.activate();
}
```

## Benefits of Event-Driven Approach

1. **Loose Coupling**: Commands don't need to know about their handlers
2. **Flexibility**: Multiple handlers can react to the same command
3. **Testability**: Easy to mock event listeners in tests
4. **Extensibility**: New handlers can be added without modifying existing code
5. **VSCode-like**: Familiar pattern for developers who know VSCode's command system

## Migration from Old Pattern

**Old pattern** (tightly coupled):
```typescript
commandManager.initializeShortcuts({
    onFileOpen: () => this.handleFileOpen(),
    onFileSave: () => this.handleFileSave(),
    // ... more handlers
});
```

**New pattern** (event-driven):
```typescript
// Initialize commands and shortcuts
commandManager.initializeShortcuts();

// Set up event listeners
commandRegistry.addEventListener('command-execute', (event: Event) => {
    const { commandId } = (event as CustomEvent<{ commandId: string }>).detail;
    
    switch (commandId) {
        case 'file-open':
            this.handleFileOpen();
            break;
        case 'file-save':
            this.handleFileSave();
            break;
    }
});
```

The new pattern is more flexible and follows modern event-driven architecture principles.
