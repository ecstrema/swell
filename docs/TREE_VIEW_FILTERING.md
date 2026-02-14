# Tree View Filtering

## Overview

Tree view components in Swell now support optional filtering, allowing users to quickly find specific items in hierarchical or flat lists. The filter is enabled via a configuration option and provides real-time, case-insensitive search functionality.

## Features

- **Optional Filter Input**: Enable filtering by setting `showFilter: true` in the tree view configuration
- **Case-Insensitive Search**: Matches node names regardless of case
- **Smart Hierarchical Filtering**: 
  - Shows parent nodes that contain matching children
  - When a parent matches, all its children are shown
  - When only children match, parent is shown with filtered children only
- **Real-Time Updates**: Results update as you type
- **Sticky Filter Bar**: Filter input stays at the top while scrolling
- **Empty State Handling**: Shows "No matching items" when no results found
- **Works with All Tree Types**: Compatible with `TreeView`, `FilesTree`, and `SelectedSignalsTree` components

## Usage

### Enabling Filtering

To enable filtering on any tree view component, set `showFilter: true` in the configuration:

```typescript
// Basic TreeView
const treeView = document.createElement('tree-view');
treeView.config = {
  showFilter: true,
  // ... other config options
};
treeView.data = myTreeData;
```

```typescript
// FilesTree (hierarchical signal tree)
const filesTree = document.createElement('files-tree');
filesTree.config = {
  ...filesTree.config,
  showFilter: true
};
filesTree.hierarchyData = myHierarchyData;
```

```typescript
// SelectedSignalsTree (flat list)
const selectedSignalsTree = document.createElement('selected-signals-tree');
selectedSignalsTree.config = {
  ...selectedSignalsTree.config,
  showFilter: true
};
selectedSignalsTree.signals = mySignals;
```

### Filtering Behavior

The filtering behavior is intelligent and context-aware:

1. **Leaf Node Matching**: When a leaf node (no children) matches the filter query, it is displayed

2. **Parent Node Matching**: When a parent node matches the filter query, the parent and ALL its children are displayed

3. **Child Node Matching**: When only child nodes match (but not the parent), the parent is displayed along with ONLY the matching children

4. **Nested Matching**: In deeply nested trees, all ancestor nodes are shown if any descendant matches

### Examples

**Example 1: Filtering a flat list**
```typescript
const signals = [
  { name: 'clk', ref: 1 },
  { name: 'reset', ref: 2 },
  { name: 'data_out', ref: 3 },
  { name: 'data_in', ref: 4 }
];

// User types "data" -> shows data_out and data_in only
```

**Example 2: Filtering a hierarchical tree**
```typescript
const hierarchy = {
  name: 'cpu_module',
  scopes: [
    {
      name: 'alu',
      vars: [
        { name: 'result', ref: 1 },
        { name: 'operand_a', ref: 2 }
      ]
    }
  ]
};

// User types "result" -> shows cpu_module > alu > result
// User types "alu" -> shows cpu_module > alu with all children
```

## API

### TreeViewConfig Interface

```typescript
interface TreeViewConfig {
  // ... other properties
  
  /**
   * Whether to show a filter input field above the tree
   */
  showFilter?: boolean;
}
```

## Implementation Details

- The filter input is implemented as a sticky element at the top of the tree view
- Filtering is performed on every input event for immediate feedback
- The filter query is matched case-insensitively using `String.toLowerCase()` and `String.includes()`
- Recursive filtering ensures that deeply nested matches bubble up to show all necessary ancestor nodes
- Event listeners are properly cleaned up in `disconnectedCallback()` to prevent memory leaks

## Visual Examples

### Initial State
When `showFilter: true` is set, a filter input appears at the top of the tree:

![Tree View with Filter](https://github.com/user-attachments/assets/228a70f7-0ce5-4669-92af-f706cac2fd75)

### Filtered State (Simple Match)
Typing "apple" shows only the matching item and its parent:

![Filtered for Apple](https://github.com/user-attachments/assets/a9570220-3c6a-466d-a784-6393159907c8)

### Filtered State (Hierarchical Match)
Typing "data" in a hierarchical tree shows all modules containing signals with "data" in their names:

![Filtered for Data](https://github.com/user-attachments/assets/494874c3-3dd2-4abd-b6d7-d5b07f6777ed)

## Testing

The filtering feature is thoroughly tested with unit tests covering:
- Basic flat list filtering
- Hierarchical tree filtering
- Parent name matching (shows all children)
- Child name matching (shows only matching children)
- Case-insensitive matching
- Empty result handling
- Filter show/hide toggle

All tests can be found in:
- `src/components/tree-view.test.ts`
- `src/components/files-tree.test.ts`
- `src/components/selected-signals-tree.test.ts`

## Performance Considerations

- Filtering is performed on-demand, only when the filter query changes
- The filtering algorithm uses recursion but is optimized to avoid redundant checks
- For very large trees (1000+ nodes), filtering remains responsive due to efficient filtering logic
- No debouncing is currently implemented as performance is sufficient without it
