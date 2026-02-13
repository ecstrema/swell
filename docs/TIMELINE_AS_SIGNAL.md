# Timeline as Signal Feature

## Overview

This document describes the implementation of the "Timeline as Signal" feature, which makes the timeline component behave like a regular signal in the waveform viewer.

## Changes Made

### 1. Timeline is Now a Signal

The timeline is now treated as a special type of signal that appears in the signal list, just like regular waveform signals.

**Key Changes:**
- Timeline appears as the first signal by default when a file is opened
- Timeline is displayed in the waveforms container alongside other signals
- Timeline is listed in the selected signals tree on the left panel

### 2. Multiple Timeline Support

Users can now add multiple timeline instances to better analyze different time ranges.

**Features:**
- Each timeline is independent with its own zoom/pan state
- Timelines are automatically named: "Timeline", "Timeline 2", "Timeline 3", etc.
- All timelines synchronize with the visible time range when signals are loaded

### 3. Add Timeline Button

A new button has been added at the bottom of the selected signals tree to allow users to add additional timelines.

**Location:** Bottom of the left panel (signals tree container)
**Label:** "+ Add Timeline"
**Behavior:** Clicking the button adds a new timeline to the signal list

## Implementation Details

### File: `src/components/file-display.ts`

#### Interface Changes

```typescript
interface SelectedSignal {
  name: string;
  ref: number;
  canvas?: HTMLCanvasElement;     // For regular signals
  timeline?: Timeline;             // For timeline signals
  isTimeline?: boolean;            // Flag to identify timeline signals
}
```

#### Key Methods

**`addTimelineSignal()`**
- Creates a new Timeline instance
- Assigns a unique name and negative ref ID (to avoid conflicts with signal refs)
- Initializes time range if already loaded
- Adds to the selectedSignals array

**`handleAddTimeline()`**
- Event handler for the "Add Timeline" button
- Calls `addTimelineSignal()` and triggers a re-render

**Updated Methods:**
- `handleZoomCommand()` - Now applies zoom to all timeline signals
- `initializeTimeRange()` - Updates all timeline signals when time range is detected
- `setVisibleRange()` - Filters out timelines when repainting signals
- `render()` - Renders both timeline and canvas elements in the signal list

### File: `src/components/file-display.css`

#### New Styles

```css
.signals-tree-container {
  display: flex;
  flex-direction: column;
}

.add-timeline-btn {
  margin: 1rem;
  padding: 0.5rem 1rem;
  background-color: var(--color-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.timeline-item {
  padding: 0;
  border: none;
  background-color: transparent;
}
```

## User Experience

### Before
- Timeline was displayed as a separate component above the signals
- Only one timeline could exist
- Timeline was not listed in the signals tree

### After
- Timeline appears as the first signal in the list
- Multiple timelines can be added
- Timeline is listed in the signals tree like other signals
- "Add Timeline" button provides easy access to add more timelines

## Testing

All tests pass (96 tests total):
- Added test to verify default timeline presence
- Added test to verify "Add Timeline" button exists
- All existing tests continue to pass

### Test Coverage

```typescript
it('should have a default timeline signal', () => {
  const shadowRoot = element.shadowRoot;
  const timeline = shadowRoot?.querySelector('timeline-view');
  expect(timeline).toBeTruthy();
});

it('should have an "Add Timeline" button', () => {
  const shadowRoot = element.shadowRoot;
  const addButton = shadowRoot?.querySelector('.add-timeline-btn');
  expect(addButton).toBeTruthy();
  expect(addButton?.textContent).toContain('Add Timeline');
});
```

## Future Enhancements

Potential improvements for future iterations:
- Allow removing individual timelines
- Allow reordering timelines and signals via drag-and-drop
- Sync zoom across all timelines option
- Named timeline markers
- Timeline color customization
