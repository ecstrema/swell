# Undo Batch Operations

## Overview

The undo system supports batching multiple operations together so they can be undone/redone as a single unit. This is useful when multiple related changes should be treated as one logical operation.

## Usage

### Basic Batch Operation

```typescript
// Get the undo manager instance
const undoManager = appMain.undoManager;

// Start a batch
undoManager.startBatch('Add multiple signals');

// Execute multiple operations
undoManager.execute(addSignalOperation1);
undoManager.execute(addSignalOperation2);
undoManager.execute(addSignalOperation3);

// End the batch
undoManager.endBatch();

// Now all three operations can be undone with a single undo
undoManager.undo(); // Undoes all three signals at once
```

### Error Handling

If an error occurs during batching, you can cancel the batch:

```typescript
try {
    undoManager.startBatch('Complex operation');
    undoManager.execute(operation1);
    undoManager.execute(operation2);
    
    if (somethingWentWrong) {
        undoManager.cancelBatch(); // Undoes all operations in the batch
        return;
    }
    
    undoManager.endBatch();
} catch (error) {
    if (undoManager.isBatching()) {
        undoManager.cancelBatch();
    }
    throw error;
}
```

### Signal Add/Remove Operations

Signal add and remove operations in FileDisplay are automatically undoable. Each signal change is recorded as an individual undoable operation.

```typescript
// In FileDisplay, these operations are automatically wrapped:
// - Adding a signal (via checkbox toggle)
// - Removing a signal (via checkbox toggle)

// To batch multiple signal operations, use the UndoManager directly:
undoManager.startBatch('Add signal group');
// User clicks multiple checkboxes
// Each checkbox creates an undoable operation
undoManager.endBatch();
// All signals added can now be undone together
```

## API Reference

### UndoManager Methods

#### `startBatch(description: string): void`
Start batching operations. All operations executed between `startBatch()` and `endBatch()` will be grouped.

- **Parameters:**
  - `description`: Human-readable description for the batch operation
- **Throws:** Error if a batch is already in progress

#### `endBatch(): void`
End batching and register all batched operations as a single undoable operation.

- **Throws:** Error if no batch is in progress

#### `isBatching(): boolean`
Check if batching is currently active.

- **Returns:** `true` if a batch is in progress, `false` otherwise

#### `cancelBatch(): void`
Cancel the current batch and undo all operations that were added to it. Useful for error handling.

## Implementation Details

### CompositeOperation

Internally, batched operations are stored in a `CompositeOperation` that implements the `UndoableOperation` interface:

```typescript
class CompositeOperation {
    do(): void {
        // Execute all operations in order
    }
    
    undo(): void {
        // Undo all operations in reverse order
    }
    
    redo(): void {
        // Redo all operations in order
    }
}
```

### Execution Behavior

- Operations added during batching are **executed immediately** when `execute()` is called
- When `endBatch()` is called, the composite operation is added to the undo tree without re-executing
- When the batch is undone, all operations are undone in reverse order
- When the batch is redone, all operations are redone in the original order

### Undo Tree Integration

- Each batch creates a single node in the undo tree
- The node's description includes the number of operations: `"Add multiple signals (3 operations)"`
- The undo tree can be visualized in the Undo History panel
- Users can navigate to any point in the history by clicking nodes in the tree

## Examples

### Example 1: Bulk Signal Operations

```typescript
function addSignalGroup(signals: string[]) {
    undoManager.startBatch(`Add ${signals.length} signals`);
    
    for (const signal of signals) {
        undoManager.execute(createAddSignalOperation(signal));
    }
    
    undoManager.endBatch();
}
```

### Example 2: Complex Multi-Step Operation

```typescript
function reorganizeSignals() {
    undoManager.startBatch('Reorganize signals');
    
    // Remove old signals
    undoManager.execute(removeSignalOperation('old1'));
    undoManager.execute(removeSignalOperation('old2'));
    
    // Add new signals
    undoManager.execute(addSignalOperation('new1'));
    undoManager.execute(addSignalOperation('new2'));
    
    undoManager.endBatch();
}
```

### Example 3: Nested Operations (Not Supported)

Batches cannot be nested. Attempting to start a new batch while one is in progress will throw an error:

```typescript
undoManager.startBatch('Outer batch');
undoManager.startBatch('Inner batch'); // ❌ Throws Error!
```

## Testing

The batch operation functionality is thoroughly tested in:
- `src/undo/composite-operation.test.ts`: Tests for the CompositeOperation class
- `src/undo/undo-manager.test.ts`: Tests for batch lifecycle and behavior
- `src/undo/undo-tree.test.ts`: Tests for undo tree with batched operations
