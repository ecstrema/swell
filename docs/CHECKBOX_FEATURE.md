# Checkbox Feature for Netlist

## Overview

This feature adds visual checkboxes to the signal hierarchy tree (Files Tree) that indicate which signals are currently selected and displayed in the waveform viewer.

## User Experience

### Before
- Users had no visual indication in the hierarchy tree of which signals were already selected
- It was easy to accidentally try to add the same signal multiple times
- No quick way to see at a glance which signals from the hierarchy were being displayed

### After
- Each signal in the hierarchy tree now has a checkbox next to it
- Checkboxes are automatically checked when a signal is selected
- Checkboxes are unchecked when viewing a different file or when the application state changes
- Provides immediate visual feedback about the current netlist state

## Implementation Details

### Components Modified

#### 1. TreeView Component (`src/components/tree-view.ts`)
- Added `showCheckboxes` boolean config option to enable checkbox rendering
- Added `isChecked` function config option to determine checked state for each node
- Modified `createLeafElement()` to render checkboxes when enabled
- Checkboxes use `.leaf-checkbox` CSS class for styling
- Click events on checkboxes are stopped from propagating to prevent triggering leaf click handlers

**CSS Changes** (`src/components/tree-view.css`):
```css
.leaf-node {
    display: flex;
    align-items: center;
    gap: 6px;
}

.leaf-checkbox {
    cursor: pointer;
    margin: 0;
    flex-shrink: 0;
}
```

#### 2. FilesTree Component (`src/components/files-tree.ts`)
- Added `selectedSignalRefs` property (Set<number>) to track selected signal references
- Added getter/setter for `selectedSignalRefs` to update the tree when selections change
- Modified constructor to call `updateConfig()` which sets up checkbox configuration
- Checkboxes are enabled by default for signal variables in the hierarchy

#### 3. FileDisplay Component (`src/components/file-display.ts`)
- Added `getSelectedSignalRefs()` public method to retrieve current signal references
- Modified `updateSelectedSignalsTree()` to dispatch `selected-signals-changed` custom event
- Event includes filename and array of signal refs (excluding timelines)
- Dispatched whenever a signal is added to the netlist

#### 4. AppMain Component (`src/components/app-main.ts`)
- Added event listener for `selected-signals-changed` events
- Updates `hierarchyTree.selectedSignalRefs` when signals change
- Modified `setActiveFile()` to sync checkbox state when switching between files
- Ensures checkboxes reflect the correct state for each file's netlist

### Event Flow

```
User clicks signal in FilesTree
  ↓
FilesTree dispatches 'signal-select' event
  ↓
FileDisplay handles event, adds signal to selectedSignals[]
  ↓
FileDisplay calls updateSelectedSignalsTree()
  ↓
FileDisplay dispatches 'selected-signals-changed' event
  ↓
AppMain handles event, updates FilesTree.selectedSignalRefs
  ↓
FilesTree re-renders with updated checkbox states
```

### Tests Added

New test file: `src/components/files-tree.test.ts`
- Tests checkbox rendering for signals
- Tests checkbox state updates when selected signals change
- Tests multiple netlist scenarios
- Tests getting selected signal refs
- Tests signal-select event dispatching

**Test Coverage:**
- 7 new tests for FilesTree component
- All existing tests continue to pass (133 total tests passing)

## Technical Considerations

### State Management
- Selected signals are tracked per-file in FileDisplay
- FilesTree receives selected signal refs as a property
- State is synchronized when switching between files
- Checkboxes are visual indicators only and don't control selection

### Performance
- Checkbox state is computed using Set.has() for O(1) lookup
- Tree re-renders only when data or selected signals change
- No performance impact on existing functionality

### Accessibility
- Checkboxes use standard HTML input type="checkbox"
- Maintain existing keyboard navigation and screen reader support
- Click handling properly separated (checkbox clicks don't trigger signal selection)

## Future Enhancements

Potential improvements for future iterations:
1. Allow checkbox clicks to toggle signal selection (currently read-only)
2. Add "select all" / "deselect all" functionality
3. Add indeterminate state for parent scopes with partially selected children
4. Persist checkbox visibility preference in settings
5. Add visual styling variations (e.g., different checkbox styles for different themes)

## Backwards Compatibility

✅ All changes are backwards compatible
- Existing TreeView usage without checkbox config continues to work
- No breaking changes to public APIs
- All existing tests pass without modification
