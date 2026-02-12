# Shortcut System

The Swell application includes a flexible keyboard shortcut system that allows mapping keyboard combinations to commands.

## Architecture

The shortcut system consists of three main components:

### 1. CommandRegistry
A central registry for all application commands. Commands can be triggered by:
- Keyboard shortcuts
- Menu items
- Direct programmatic calls

```typescript
import { CommandRegistry } from './shortcuts/index.js';

const registry = new CommandRegistry();

// Register a command
registry.register({
  id: 'file-open',
  label: 'Open File',
  handler: () => console.log('Opening file...')
});

// Execute a command
await registry.execute('file-open');
```

### 2. ShortcutManager
Manages keyboard shortcuts and maps them to commands through the CommandRegistry.

```typescript
import { ShortcutManager } from './shortcuts/index.js';

const shortcuts = new ShortcutManager(registry);

// Register a shortcut
shortcuts.register({
  shortcut: { key: 'o', ctrl: true },
  commandId: 'file-open'
});

// Activate listening for keyboard events
shortcuts.activate();

// Later, deactivate if needed
shortcuts.deactivate();
```

### 3. Default Shortcuts
Default keyboard shortcuts are defined in a JSON configuration file (`default-shortcuts.json`) and loaded automatically at startup. The JSON file is validated to ensure all shortcuts are properly formatted before being loaded.

The current default shortcuts include:
- `Ctrl+O` - Open file dialog
- `Ctrl+W` - Close current file  
- `Ctrl+Q` - Quit application
- `Ctrl+Z` - Undo last action
- `Ctrl+Shift+=` - Zoom in
- `Ctrl+-` - Zoom out

## JSON Configuration Format

The default shortcuts are defined in `default-shortcuts.json` with the following structure:

```json
{
  "shortcuts": [
    {
      "shortcut": "Ctrl+O",
      "commandId": "file-open",
      "description": "Open file dialog"
    }
  ]
}
```

Each shortcut object must have:
- `shortcut` (required): The keyboard combination as a string (e.g., "Ctrl+O", "Ctrl+Shift+K")
- `commandId` (required): The ID of the command to execute
- `description` (optional): A human-readable description of what the shortcut does

The JSON file is validated when loaded, ensuring:
- The file is valid JSON
- All required fields are present
- Field values are the correct types
- No empty strings are used

If validation fails, an error is logged and the application continues with an empty shortcuts array.

## Adding New Shortcuts

To add new shortcuts:

1. **Register a command** in `app-main.ts`:
```typescript
this.commandRegistry.register({
    id: 'my-action',
    label: 'My Action',
    handler: () => this.myActionHandler()
});
```

2. **Add a shortcut binding** in `default-shortcuts.json`:
```json
{
  "shortcuts": [
    {
      "shortcut": "Ctrl+M",
      "commandId": "my-action",
      "description": "My custom action"
    }
  ]
}
```

## Keyboard Shortcut Format

Shortcuts are defined as strings using the shosho library format:

- Use `+` to combine keys: `Ctrl+S`, `Ctrl+Shift+K`
- Modifiers: `Ctrl`, `Alt`, `Shift`, `Meta`
- Special keys: `Enter`, `Escape`, `Tab`, `Space`, `Backspace`, `Delete`
- Arrow keys: `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`
- Function keys: `F1`, `F2`, etc.
- Regular keys: Use uppercase for the key (`A`, `B`, etc.)

Examples:
- `Ctrl+S` - Ctrl and S
- `Ctrl+Shift+K` - Ctrl, Shift, and K
- `Alt+Enter` - Alt and Enter
- `Meta+ArrowUp` - Meta/Command and Arrow Up

## Current Commands

The following commands are currently registered:

- `file-open` - Opens the file picker dialog
- `file-quit` - Quits the application
- `edit-undo` - Undo operation (placeholder)
- `view-zoom-in` - Zoom in (placeholder)
- `view-zoom-out` - Zoom out (placeholder)

## Integration with Menu System

The shortcut system is integrated with the existing menu system. Menu actions automatically trigger commands through the CommandRegistry, so:

1. Menu items dispatch `menu-action` events with their action ID
2. The AppMain component routes these events to the CommandRegistry
3. The same commands can be triggered by shortcuts or menu clicks

## Future Enhancements

Possible future improvements:

1. **Custom shortcut configuration** - Allow users to customize shortcuts
2. **Shortcut display in menus** - Show shortcut hints next to menu items
3. **Conflict detection** - Detect and warn about conflicting shortcuts
4. **Context-aware shortcuts** - Different shortcuts depending on active component
5. **Shortcut persistence** - Save custom shortcuts to user preferences
