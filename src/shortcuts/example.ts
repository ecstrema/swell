/**
 * Example usage of the shortcut system
 * 
 * This file demonstrates how to use the shortcut system programmatically.
 */

import { CommandRegistry, ShortcutManager, type Command, type ShortcutBinding } from './index.js';

// Example: Creating and using the shortcut system
function exampleUsage() {
    // 1. Create a command registry
    const registry = new CommandRegistry();

    // 2. Register some commands
    const openFileCommand: Command = {
        id: 'file-open',
        label: 'Open File',
        handler: () => {
            console.log('Opening file dialog...');
        }
    };

    const saveFileCommand: Command = {
        id: 'file-save',
        label: 'Save File',
        handler: () => {
            console.log('Saving file...');
        }
    };

    registry.register(openFileCommand);
    registry.register(saveFileCommand);

    // 3. Create shortcut manager
    const shortcuts = new ShortcutManager(registry);

    // 4. Register keyboard shortcuts
    const openShortcut: ShortcutBinding = {
        shortcut: { key: 'o', ctrl: true },
        commandId: 'file-open'
    };

    const saveShortcut: ShortcutBinding = {
        shortcut: { key: 's', ctrl: true },
        commandId: 'file-save'
    };

    shortcuts.register(openShortcut);
    shortcuts.register(saveShortcut);

    // 5. Activate shortcuts
    shortcuts.activate();

    // Now pressing Ctrl+O will trigger the file-open command
    // And pressing Ctrl+S will trigger the file-save command

    // 6. Execute commands programmatically
    registry.execute('file-open');

    // 7. Get all shortcuts for a command
    const openShortcuts = shortcuts.getShortcutsForCommand('file-open');
    console.log('Shortcuts for file-open:', openShortcuts);

    // 8. Format a shortcut for display
    const formattedShortcut = ShortcutManager.formatShortcut(openShortcut.shortcut);
    console.log('Open shortcut:', formattedShortcut); // "Ctrl+O" or "⌘+O" on Mac

    // 9. Clean up when done
    shortcuts.deactivate();
}

// Example: Adding shortcuts with modifiers
function advancedExample() {
    const registry = new CommandRegistry();
    const shortcuts = new ShortcutManager(registry);

    // Command with Shift modifier
    registry.register({
        id: 'file-save-as',
        label: 'Save As...',
        handler: () => console.log('Save as...')
    });

    shortcuts.register({
        shortcut: { key: 's', ctrl: true, shift: true },
        commandId: 'file-save-as'
    });

    // Command with Alt modifier
    registry.register({
        id: 'view-toggle-sidebar',
        label: 'Toggle Sidebar',
        handler: () => console.log('Toggling sidebar...')
    });

    shortcuts.register({
        shortcut: { key: 'b', ctrl: true, alt: true },
        commandId: 'view-toggle-sidebar'
    });

    shortcuts.activate();
}

export { exampleUsage, advancedExample };
