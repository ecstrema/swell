# Checkbox Feature - Visual Example

## Before (without checkboxes)

```
Signal Selection Panel         │  Waveform Display
────────────────────────────────┼──────────────────────────
File Hierarchy:                │  Selected Signals:
                               │  
▼ top                          │  • Timeline 1
  • clk                        │  • clk
  • reset                      │  • data_out
  ▼ module1                    │  
    • data_in                  │  [Waveforms displayed here]
    • data_out                 │
    • enable                   │
  ▼ module2                    │
    • output                   │
```

**Problem**: No way to tell that `clk` and `data_out` are already selected!

---

## After (with checkboxes) ✨

```
Signal Selection Panel         │  Waveform Display
────────────────────────────────┼──────────────────────────
File Hierarchy:                │  Selected Signals:
                               │  
▼ top                          │  • Timeline 1
  ☑ clk                        │  • clk
  ☐ reset                      │  • data_out
  ▼ module1                    │  
    ☐ data_in                  │  [Waveforms displayed here]
    ☑ data_out                 │
    ☐ enable                   │
  ▼ module2                    │
    ☐ output                   │
```

**Solution**: Checkboxes clearly show which signals are selected!

---

## Feature Highlights

### Visual Feedback
- ☑ **Checked** = Signal is currently selected and displayed
- ☐ **Unchecked** = Signal is available but not selected

### Automatic Updates
- Checkboxes update immediately when you click a signal
- State is preserved when switching between files
- Works with multiple files open simultaneously

### User Benefits
1. **At-a-glance visibility**: See which signals are selected without scrolling the waveform area
2. **Prevents duplicates**: Avoids trying to add the same signal twice
3. **Better orientation**: Easy to track your selections in complex hierarchies
4. **Multi-file support**: Each file maintains its own checkbox state

---

## Technical Flow

```
User clicks "clk" signal
        ↓
FilesTree dispatches 'signal-select' event
        ↓
FileDisplay adds signal to selectedSignals[]
        ↓
FileDisplay dispatches 'selected-signals-changed' event
        ↓
AppMain updates FilesTree.selectedSignalRefs = [1, 4]
        ↓
TreeView re-renders with checkbox for "clk" checked ☑
```

---

## Code Example

### Using the Feature in FilesTree

```typescript
// Set selected signal refs
filesTree.selectedSignalRefs = [1, 4, 7];

// Get selected signal refs
const selected = filesTree.selectedSignalRefs;
console.log(selected); // [1, 4, 7]
```

### TreeView Configuration

```typescript
config = {
    showCheckboxes: true,
    isChecked: (node) => selectedRefs.has(node.id),
    onLeafClick: (node) => handleSignalSelect(node)
}
```

---

## Browser Compatibility

✅ Works in all modern browsers
✅ Uses standard HTML checkbox input
✅ Fully accessible
✅ No external dependencies
