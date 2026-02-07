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
A configuration file (`default-shortcuts.ts`) where default keyboard shortcuts can be defined.

Currently, no default shortcuts are set, but the infrastructure is ready for future additions.

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

2. **Add a shortcut binding** in `default-shortcuts.ts`:
```typescript
export const defaultShortcuts: ShortcutBinding[] = [
    {
        shortcut: { key: 'o', ctrl: true },
        commandId: 'file-open'
    },
    // Add your shortcut here
    {
        shortcut: { key: 'm', ctrl: true, shift: true },
        commandId: 'my-action'
    }
];
```

## Keyboard Shortcut Format

Shortcuts are defined with the following properties:

- `key`: The key to press (lowercase, e.g., 'o', 'w', 'enter')
- `ctrl`: Boolean, whether Ctrl (or Cmd on Mac) should be pressed
- `alt`: Boolean, whether Alt should be pressed
- `shift`: Boolean, whether Shift should be pressed
- `meta`: Boolean, whether Meta key should be pressed

Example:
```typescript
{
    key: 'w',
    ctrl: true,
    shift: false,
    alt: false
}
```

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
