# Shortcut System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interaction                        │
└────────────┬──────────────────────────────────┬─────────────────┘
             │                                  │
             │ Keyboard Press                   │ Menu Click
             │ (e.g., Ctrl+O)                  │
             │                                  │
             v                                  v
┌────────────────────────────┐      ┌──────────────────────────┐
│     ShortcutManager        │      │      MenuBar Component   │
│  - Listens for keydown     │      │  - Dispatches menu-action│
│  - Matches key combos      │      │    events                │
│  - Finds command ID        │      └────────────┬─────────────┘
└────────────┬───────────────┘                   │
             │                                   │
             │ Execute command                   │
             │                                   │
             v                                   v
        ┌────────────────────────────────────────────┐
        │         CommandRegistry                    │
        │  - Stores all application commands        │
        │  - Maps command IDs to handlers           │
        │  - Executes commands                      │
        └────────────────┬───────────────────────────┘
                         │
                         │ Invoke handler
                         │
                         v
        ┌────────────────────────────────────────────┐
        │          Application Logic                 │
        │  - handleFileOpen()                       │
        │  - handleZoomIn()                         │
        │  - handleUndo()                           │
        │  - etc.                                   │
        └────────────────────────────────────────────┘


                    Data Flow Details
                    ─────────────────

┌────────────────────────┐
│   ShortcutBinding      │
│  {                     │
│    shortcut: {         │
│      key: 'o',         │
│      ctrl: true        │
│    },                  │
│    commandId:          │
│      'file-open'       │
│  }                     │
└───────────┬────────────┘
            │
            │ Maps to
            v
┌────────────────────────┐
│      Command           │
│  {                     │
│    id: 'file-open',    │
│    label: 'Open File', │
│    handler: () => {...}│
│  }                     │
└────────────────────────┘


                Integration Points
                ──────────────────

┌─────────────────────────────────────────────────────────┐
│                    AppMain Component                    │
│                                                         │
│  ┌───────────────────┐       ┌──────────────────────┐ │
│  │ CommandRegistry   │       │  ShortcutManager     │ │
│  │                   │◄──────┤                      │ │
│  │ - file-open       │       │  - Ctrl+O → file-open│ │
│  │ - file-quit       │       │  - (more shortcuts)  │ │
│  │ - edit-undo       │       │                      │ │
│  │ - view-zoom-in    │       │  [Currently empty]   │ │
│  │ - view-zoom-out   │       │                      │ │
│  └───────────────────┘       └──────────────────────┘ │
│           ▲                           │                │
│           │                           │                │
│           │ Execute                   │ Activate       │
│           │                           │                │
│  ┌────────┴──────────────────────────▼──────────────┐ │
│  │         initializeShortcuts()                    │ │
│  │  - Registers commands                            │ │
│  │  - Registers shortcuts                           │ │
│  │  - Activates keyboard listening                  │ │
│  └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Component Relationships

### CommandRegistry (Core)
- **Purpose**: Central command management
- **Dependencies**: None
- **Used By**: ShortcutManager, AppMain, MenuBar

### ShortcutManager (Keyboard Handler)
- **Purpose**: Keyboard event detection and mapping
- **Dependencies**: CommandRegistry
- **Used By**: AppMain

### AppMain (Orchestrator)
- **Purpose**: Application lifecycle and integration
- **Dependencies**: CommandRegistry, ShortcutManager
- **Initializes**: Both components, registers all commands

## Extension Points

### Adding a New Shortcut
```
1. Register Command:
   commandRegistry.register({
     id: 'my-action',
     label: 'My Action',
     handler: () => {...}
   })

2. Add Shortcut Binding:
   shortcutManager.register({
     shortcut: { key: 'm', ctrl: true },
     commandId: 'my-action'
   })

3. Or add to default-shortcuts.ts for permanent shortcuts
```

### Future Enhancements
- User preferences storage
- Shortcut customization UI
- Context-aware shortcuts
- Shortcut hints in menus
- Conflict detection
