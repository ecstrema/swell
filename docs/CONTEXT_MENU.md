# Context Menu Component

A reusable, right-click context menu component for the Swell waveform viewer.

## Features

- **Customizable menu items** with labels and click handlers
- **Disabled items** that cannot be clicked
- **Separator lines** for organizing menu items
- **Automatic positioning** that adjusts when menu would go off-screen
- **Keyboard support** (Escape to close)
- **Clean styling** using CSS custom properties for theming
- **Shadow DOM encapsulation** for style isolation

## Usage

### Basic Example

```typescript
import { ContextMenu, ContextMenuItem } from './components/context-menu.js';

// Create the context menu element
const contextMenu = new ContextMenu();
document.body.appendChild(contextMenu);

// Define menu items
const items: ContextMenuItem[] = [
    {
        id: 'copy',
        label: 'Copy',
        handler: () => {
            console.log('Copy clicked');
        }
    },
    {
        id: 'paste',
        label: 'Paste',
        handler: () => {
            console.log('Paste clicked');
        }
    },
    {
        id: 'sep1',
        separator: true  // Add a separator line
    },
    {
        id: 'delete',
        label: 'Delete',
        disabled: true,  // This item is disabled
        handler: () => {
            console.log('This will not be called');
        }
    }
];

// Set the items
contextMenu.items = items;

// Show the menu at specific coordinates (typically from a contextmenu event)
const element = document.getElementById('my-element');
element.addEventListener('contextmenu', (e) => {
    e.preventDefault(); // Prevent default browser context menu
    contextMenu.open(e.clientX, e.clientY);
});
```

### Using in HTML

```html
<!-- Add the context menu to your page -->
<context-menu id="my-menu"></context-menu>

<script type="module">
    import { ContextMenu } from './components/context-menu.js';
    
    const menu = document.getElementById('my-menu');
    
    menu.items = [
        { id: 'item1', label: 'Item 1', handler: () => alert('Item 1') },
        { id: 'item2', label: 'Item 2', handler: () => alert('Item 2') }
    ];
    
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        menu.open(e.clientX, e.clientY);
    });
</script>
```

## API

### ContextMenuItem Interface

```typescript
interface ContextMenuItem {
    id: string;           // Unique identifier for the menu item
    label: string;        // Display text for the menu item
    disabled?: boolean;   // Whether the item is disabled (default: false)
    separator?: boolean;  // Whether this is a separator line (default: false)
    handler?: () => void; // Function to call when item is clicked
}
```

### ContextMenu Methods

#### `open(x: number, y: number): void`

Opens the context menu at the specified screen coordinates.

**Parameters:**
- `x` - X coordinate (typically from `event.clientX`)
- `y` - Y coordinate (typically from `event.clientY`)

**Example:**
```typescript
contextMenu.open(100, 200);
```

The menu will automatically adjust its position if it would extend beyond the viewport edges.

#### `close(): void`

Closes the context menu.

**Example:**
```typescript
contextMenu.close();
```

#### `toggle(x: number, y: number): void`

Toggles the context menu visibility at the specified coordinates.

**Parameters:**
- `x` - X coordinate
- `y` - Y coordinate

**Example:**
```typescript
contextMenu.toggle(event.clientX, event.clientY);
```

### Properties

#### `items: ContextMenuItem[]`

Gets or sets the menu items. When set, the menu is automatically re-rendered.

**Example:**
```typescript
// Get current items
const currentItems = contextMenu.items;

// Set new items
contextMenu.items = [
    { id: 'new-item', label: 'New Item', handler: () => {} }
];
```

## Styling

The context menu uses CSS custom properties for theming:

```css
--color-bg-surface      /* Background color of the menu */
--color-border          /* Border color */
--color-border-subtle   /* Separator line color */
--color-text            /* Text color */
--color-text-muted      /* Disabled item text color */
--color-bg-hover        /* Hover background color */
```

## Events

The context menu automatically handles the following:

- **Click outside**: Closes the menu
- **Escape key**: Closes the menu
- **Menu item click**: Calls the handler and closes the menu

## Best Practices

1. **Prevent default browser menu**: Always call `e.preventDefault()` when opening the context menu from a `contextmenu` event
2. **Provide meaningful IDs**: Use descriptive IDs for menu items to make debugging easier
3. **Handle edge cases**: The component automatically adjusts position when near viewport edges
4. **Clean up handlers**: If creating menus dynamically, ensure handlers don't create memory leaks

## Examples

### Dynamic Menu Based on Context

```typescript
function showContextMenu(event: MouseEvent, target: Element) {
    event.preventDefault();
    
    const items: ContextMenuItem[] = [];
    
    if (target.classList.contains('editable')) {
        items.push(
            { id: 'cut', label: 'Cut', handler: () => cut(target) },
            { id: 'copy', label: 'Copy', handler: () => copy(target) },
            { id: 'paste', label: 'Paste', handler: () => paste(target) }
        );
    }
    
    if (target.classList.contains('deletable')) {
        if (items.length > 0) {
            items.push({ id: 'sep1', separator: true });
        }
        items.push({ id: 'delete', label: 'Delete', handler: () => delete(target) });
    }
    
    contextMenu.items = items;
    contextMenu.open(event.clientX, event.clientY);
}
```

### Menu with Keyboard Shortcuts Display

```typescript
const items: ContextMenuItem[] = [
    { id: 'undo', label: 'Undo       Ctrl+Z', handler: undo },
    { id: 'redo', label: 'Redo       Ctrl+Y', handler: redo },
    { id: 'sep1', separator: true },
    { id: 'cut', label: 'Cut        Ctrl+X', handler: cut },
    { id: 'copy', label: 'Copy       Ctrl+C', handler: copy },
    { id: 'paste', label: 'Paste      Ctrl+V', handler: paste }
];
```

## Tests

The context menu component includes comprehensive tests covering:

- Basic rendering and visibility
- Opening, closing, and toggling
- Menu item rendering and interaction
- Disabled items
- Separators
- Positioning
- Dynamic item updates

Run tests with:
```bash
npm test -- context-menu
```
