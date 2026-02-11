# Command Palette

## Overview

The command palette provides a searchable UI for quickly accessing commands in the application. It can be opened with `Ctrl+K` (or `Cmd+K` on Mac).

## Features

- **Quick Access**: Open with keyboard shortcut (`Ctrl+K` or `Cmd+K`)
- **Fuzzy Search**: Type to filter commands by label or ID
- **Keyboard Navigation**: 
  - Arrow keys (`↑`/`↓`) to navigate through results
  - `Enter` to execute the selected command
  - `Esc` to close the palette
- **Mouse Support**: Click on commands to execute them
- **Visual Feedback**: Selected command is highlighted
- **Responsive**: Works with the application's light/dark theme

## Usage

The command palette is automatically integrated into the application. When the app loads, it:

1. Reads all commands from the `CommandRegistry`
2. Displays them in a searchable overlay
3. Executes commands when selected

### Opening the Command Palette

- Press `Ctrl+K` (Windows/Linux) or `Cmd+K` (Mac)
- The palette will appear as an overlay

### Searching for Commands

- Start typing in the search box
- Commands are filtered by label or ID
- The first matching command is automatically selected

### Executing Commands

- Navigate to the desired command using arrow keys
- Press `Enter` to execute
- Or click on the command with your mouse
- The palette closes automatically after execution

### Closing the Palette

- Press `Esc`
- Click outside the palette
- Or execute a command (auto-closes)

## Architecture

The command palette consists of two main components:

### CommandPalette Component (`command-palette.ts`)

A Web Component that provides the UI for the command palette:

```typescript
import { CommandPalette } from './components/command-palette.js';

const palette = new CommandPalette(commandRegistry);
document.body.appendChild(palette);

// Open programmatically
palette.open();

// Close programmatically
palette.close();

// Toggle visibility
palette.toggle();
```

### Integration with Command Registry

The palette automatically syncs with the `CommandRegistry`:

```typescript
import { CommandRegistry } from './shortcuts/command-registry.js';

const registry = new CommandRegistry();

// Register a command
registry.register({
    id: 'my-command',
    label: 'My Awesome Command',
    handler: () => {
        console.log('Command executed!');
    }
});

// The command automatically appears in the palette
```

## Styling

The command palette respects the application's CSS variables for theming:

- `--color-bg-surface` - Background color
- `--color-border` - Border colors
- `--color-text` - Text color
- `--color-text-muted` - Muted text (e.g., command IDs)
- `--color-bg-hover` - Hover state background

## Testing

Tests are included in `command-palette.test.ts` and cover:

- Opening and closing the palette
- Searching and filtering commands
- Keyboard navigation
- Command execution
- Overlay interaction

Run tests with:

```bash
npm test -- command-palette
```

## Implementation Details

### File Structure

- `src/components/command-palette.ts` - Main component implementation
- `src/components/command-palette.test.ts` - Test suite
- `src/components/app-main.ts` - Integration into the main app

### Key Methods

- `open()` - Opens the palette and focuses the search input
- `close()` - Closes the palette and clears the search
- `toggle()` - Toggles the palette visibility
- `handleSearch()` - Filters commands based on search query
- `handleKeyDown()` - Handles keyboard navigation
- `executeSelected()` - Executes the currently selected command

### Keyboard Shortcuts

The palette is registered as a command itself:

```typescript
commandRegistry.register({
    id: 'command-palette-toggle',
    label: 'Open Command Palette',
    handler: () => palette.toggle()
});

shortcutManager.register({
    shortcut: 'Ctrl+K',
    commandId: 'command-palette-toggle'
});
```

## Future Enhancements

Potential improvements for the command palette:

1. **Recent Commands**: Show recently used commands at the top
2. **Command Categories**: Group commands by category
3. **Fuzzy Matching**: More sophisticated search algorithm
4. **Command Arguments**: Support commands with parameters
5. **Keyboard Shortcuts Display**: Show shortcuts next to commands
6. **Command History**: Navigate through previously executed commands
7. **Custom Styling**: Allow themes to customize palette appearance
