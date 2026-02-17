import { getSignalChanges, SignalChange, getHierarchy } from '../../../backend/index.js';
import { css } from '../../../utils/css-utils.js';
import { setupCanvasForHighDPI } from '../../../utils/canvas-utils.js';
import { scrollbarSheet } from '../../../styles/shared-sheets.js';
import fileDisplayCss from './file-display.css?inline';
import { SelectedSignalsTree } from '../trees/selected-signals-tree.js';
import { Timeline } from '../../../components/timeline/timeline.js';
import { Minimap } from '../../../components/minimap/minimap.js';
import { saveFileState, loadFileState, FileState, Item, ItemSignal, ItemTimeline } from '../../../utils/file-state-storage.js';
import { getSetting } from '../../settings-extension/settings-extension.js';
import { UndoableOperation } from '../../extensions/undo-extension/undo-extension.js';
import '../trees/selected-signals-tree.js';
import '../../../components/timeline/timeline.js';
import '../../../components/minimap/minimap.js';
import '../../../components/panels/resizable-panel.js';
import '../../../components/primitives/split-button.js';

interface SelectedSignal {
  name: string;
  ref: number;
  path?: string; // Full hierarchical path (e.g., "top.module.signal")
  showFullPath?: boolean; // Whether to display the full path or just the name
  canvas?: HTMLCanvasElement;
  timeline?: Timeline;
  minimap?: Minimap;
  isTimeline?: boolean;
  isMinimap?: boolean;
}

interface HierarchyNode {
  name: string;
  var_ref?: number;
  children?: HierarchyNode[];
}

// Constants for ref numbering
// Signal refs are positive integers from the waveform file
// Timeline refs are negative starting from -1
// Minimap refs use an offset to avoid conflicts with both
const MINIMAP_REF_OFFSET = -1000;

export class FileDisplay extends HTMLElement {
  private _filename: string = '';
  private selectedSignals: SelectedSignal[] = [];
  private signalsContainer: HTMLDivElement | null = null;
  private selectedSignalsTree: SelectedSignalsTree;
  private minimap: Minimap;
  private boundHandleSignalSelect: (event: Event) => void;
  private boundHandleCheckboxToggle: (event: Event) => void;
  private boundHandleRangeChanged: (event: Event) => void;
  private boundHandleMinimapRangeChanged: (event: Event) => void;
  private boundHandleZoomCommand: (event: Event) => void;
  private boundHandleAddTimeline: () => void;
  private boundHandleAddMinimap: () => void;
  private boundHandleSignalsReordered: (event: Event) => void;
  private boundHandleThemeChanged: (event: Event) => void;
  private boundHandleSignalPathToggled: (event: Event) => void;
  private visibleStart: number = 0;
  private visibleEnd: number = 1000000;
  private timeRangeInitialized: boolean = false;
  private timelineCounter: number = 0;
  private minimapCounter: number = 0;
  private resizeObserver: ResizeObserver | null = null;
  private saveStateTimeout: number | null = null;
  private stateRestored: boolean = false;
  private alternatingRowPattern: number = 3;
  private executeUndoableOperation: ((operation: UndoableOperation) => void) | null = null;
  private boundHandleSignalCanvasWheel: (e: WheelEvent) => void;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.boundHandleSignalSelect = this.handleSignalSelect.bind(this);
    this.boundHandleCheckboxToggle = this.handleCheckboxToggle.bind(this);
    this.boundHandleRangeChanged = this.handleRangeChanged.bind(this);
    this.boundHandleMinimapRangeChanged = this.handleMinimapRangeChanged.bind(this);
    this.boundHandleZoomCommand = this.handleZoomCommand.bind(this);
    this.boundHandleAddTimeline = this.handleAddTimeline.bind(this);
    this.boundHandleAddMinimap = this.handleAddMinimap.bind(this);
    this.boundHandleSignalsReordered = this.handleSignalsReordered.bind(this);
    this.boundHandleThemeChanged = this.handleThemeChanged.bind(this);
    this.boundHandleSignalPathToggled = this.handleSignalPathToggled.bind(this);
    this.boundHandleSignalCanvasWheel = this.handleSignalCanvasWheel.bind(this);

    this.shadowRoot!.adoptedStyleSheets = [scrollbarSheet, css(fileDisplayCss)];
    
    // Create the selected signals tree
    this.selectedSignalsTree = new SelectedSignalsTree();
    
    // Create the minimap
    this.minimap = new Minimap();
    
    // Add a default timeline as the first signal
    this.addTimelineSignal();
    
    // Load alternating row pattern setting
    this.loadAlternatingRowPattern();
    
    this.render();
  }

  get filename(): string {
    return this._filename;
  }

  set filename(val: string) {
    const oldFilename = this._filename;
    this._filename = val;
    this.render();
    
    // Restore state when filename is set (if connected and not already restored)
    if (val && val !== oldFilename && this.isConnected && !this.stateRestored) {
      this.restoreFileState();
    }
  }

  /**
   * Set callback for executing undoable operations
   */
  setUndoableOperationExecutor(executor: (operation: UndoableOperation) => void) {
    this.executeUndoableOperation = executor;
  }

  /**
   * Get the current state of selected signals and view
   * Used for explicit state file save operations
   */
  getCurrentState(): FileState {
    const items: Item[] = this.selectedSignals.map(signal => {
      if (signal.isTimeline) {
        return {
          _type: 'timeline' as const,
          name: signal.name
        };
      } else if (signal.isMinimap) {
        return {
          _type: 'minimap' as const,
          name: signal.name
        };
      } else {
        return {
          _type: 'signal' as const,
          ref: signal.ref,
          name: signal.name,
          path: signal.path,
          showFullPath: signal.showFullPath
        };
      }
    });
    
    return {
      version: 'V0.1',
      items,
      visibleStart: this.visibleStart,
      visibleEnd: this.visibleEnd,
      timestamp: Date.now()
    };
  }

  /**
   * Apply a loaded state to this file display
   * Used for explicit state file load operations
   */
  async applyState(state: FileState): Promise<void> {
    try {
      // Check version compatibility
      if (state.version !== 'V0.1') {
        throw new Error(`Unsupported state version: ${state.version}`);
      }
      
      console.log(`Applying state to ${this._filename}:`, state);
      
      // Restore visible range
      if (state.visibleStart !== 0 || state.visibleEnd !== 1000000) {
        this.visibleStart = state.visibleStart;
        this.visibleEnd = state.visibleEnd;
        this.timeRangeInitialized = true;
      }
      
      // Load the hierarchy to validate signals still exist
      const hierarchy = await getHierarchy(this._filename);
      if (!hierarchy) {
        throw new Error('Could not load hierarchy to apply state');
      }
      
      // Helper to find signals by ref in the hierarchy and compute their path
      const findSignalByRef = (node: HierarchyNode, targetRef: number, currentPath: string[] = []): { name: string; ref: number; path: string } | null => {
        const newPath = [...currentPath, node.name];
        
        if (node.var_ref === targetRef) {
          return { name: node.name, ref: targetRef, path: newPath.join('.') };
        }
        if (node.children) {
          for (const child of node.children) {
            const found = findSignalByRef(child, targetRef, newPath);
            if (found) return found;
          }
        }
        return null;
      };
      
      // Clear current signals
      this.selectedSignals = [];
      this.timelineCounter = 0;
      this.minimapCounter = 0;
      
      // Restore items from the flat list
      for (const item of state.items) {
        if (item._type === 'timeline') {
          this.addTimelineSignal();
        } else if (item._type === 'minimap') {
          this.addMinimapSignal();
        } else if (item._type === 'signal') {
          // Verify signal still exists in hierarchy
          const found = findSignalByRef(hierarchy, item.ref);
          if (found) {
            // Add the signal with computed path
            this.addSignal(item.name, item.ref, found.path);
            
            // Restore showFullPath preference if it was saved
            if (item.showFullPath !== undefined) {
              const signal = this.selectedSignals.find(s => s.ref === item.ref);
              if (signal) {
                signal.showFullPath = item.showFullPath;
              }
            }
          } else {
            console.warn(`Signal ${item.name} (ref: ${item.ref}) not found in hierarchy`);
          }
        }
      }
      
      // Update minimap and all timeline/minimap signals with the restored range
      if (this.timeRangeInitialized) {
        this.minimap.totalRange = { start: this.visibleStart, end: this.visibleEnd };
        this.minimap.visibleRange = { start: this.visibleStart, end: this.visibleEnd };
        
        this.selectedSignals.forEach(signal => {
          if (signal.isTimeline && signal.timeline) {
            signal.timeline.totalRange = { start: this.visibleStart, end: this.visibleEnd };
            signal.timeline.visibleRange = { start: this.visibleStart, end: this.visibleEnd };
          }
          if (signal.isMinimap && signal.minimap) {
            signal.minimap.totalRange = { start: this.visibleStart, end: this.visibleEnd };
            signal.minimap.visibleRange = { start: this.visibleStart, end: this.visibleEnd };
          }
        });
      }
      
      this.render();
      
      // Save state automatically after applying
      this.scheduleStateSave();
    } catch (err) {
      console.error('Failed to apply state:', err);
      throw err;
    }
  }

  connectedCallback() {
    // Listen for netlist events
    document.addEventListener('signal-select', this.boundHandleSignalSelect);
    
    // Listen for checkbox toggle events
    document.addEventListener('checkbox-toggle', this.boundHandleCheckboxToggle);
    
    // Listen for timeline range changes
    this.addEventListener('range-changed', this.boundHandleRangeChanged);
    
    // Listen for minimap range changes
    this.minimap.addEventListener('range-changed', this.boundHandleMinimapRangeChanged);
    
    // Listen for zoom commands
    this.addEventListener('zoom-command', this.boundHandleZoomCommand);
    
    // Listen for signals reordered event from the tree
    this.selectedSignalsTree.addEventListener('signals-reordered', this.boundHandleSignalsReordered);
    
    // Listen for signal path toggled event from the tree
    this.selectedSignalsTree.addEventListener('signal-path-toggled', this.boundHandleSignalPathToggled);
    
    // Listen for theme changes
    window.addEventListener('theme-changed', this.boundHandleThemeChanged);
    
    // Set up ResizeObserver to watch for container size changes
    // This handles dock resizing and other layout changes
    this.resizeObserver = new ResizeObserver(() => {
      this.handleContainerResize();
    });
    
    // Observe the file display element itself for size changes
    this.resizeObserver.observe(this);
    
    // Restore saved state for this file
    this.restoreFileState();
  }

  disconnectedCallback() {
    document.removeEventListener('signal-select', this.boundHandleSignalSelect);
    document.removeEventListener('checkbox-toggle', this.boundHandleCheckboxToggle);
    this.removeEventListener('range-changed', this.boundHandleRangeChanged);
    this.minimap.removeEventListener('range-changed', this.boundHandleMinimapRangeChanged);
    this.removeEventListener('zoom-command', this.boundHandleZoomCommand);
    this.selectedSignalsTree.removeEventListener('signals-reordered', this.boundHandleSignalsReordered);
    this.selectedSignalsTree.removeEventListener('signal-path-toggled', this.boundHandleSignalPathToggled);
    window.removeEventListener('theme-changed', this.boundHandleThemeChanged);
    
    // Clean up ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    
    // Save state before disconnecting
    this.saveCurrentState();
    
    // Clear any pending save timeout
    if (this.saveStateTimeout !== null) {
      clearTimeout(this.saveStateTimeout);
      this.saveStateTimeout = null;
    }
  }

  private handleRangeChanged(event: Event) {
    const customEvent = event as CustomEvent;
    const { start, end } = customEvent.detail;
    this.setVisibleRange(start, end);
    
    // Synchronize all other timelines and minimaps in the same file
    // Skip the component that triggered the event to avoid circular updates
    this.selectedSignals.forEach(signal => {
      if (signal.isTimeline && signal.timeline && signal.timeline !== event.target) {
        signal.timeline.visibleRange = { start, end };
      }
      if (signal.isMinimap && signal.minimap && signal.minimap !== event.target) {
        signal.minimap.visibleRange = { start, end };
      }
    });
    
    // Also synchronize the bottom minimap if it's not the source
    if (this.minimap && this.minimap !== event.target) {
      this.minimap.visibleRange = { start, end };
    }
    
    // Save state after range changes
    this.debouncedSaveState();
  }

  private handleZoomCommand(event: Event) {
    const customEvent = event as CustomEvent;
    const { action } = customEvent.detail;
    
    // Apply zoom to all timeline signals
    this.selectedSignals.forEach(signal => {
      if (signal.isTimeline && signal.timeline) {
        switch (action) {
          case 'zoom-in':
            signal.timeline.zoomIn();
            break;
          case 'zoom-out':
            signal.timeline.zoomOut();
            break;
          case 'zoom-fit':
            signal.timeline.zoomToFit();
            break;
        }
      }
    });
  }

  private handleMinimapRangeChanged(event: Event) {
    const customEvent = event as CustomEvent;
    const { start, end } = customEvent.detail;
    this.setVisibleRange(start, end);
    
    // Synchronize all timelines with minimap range
    this.selectedSignals.forEach(signal => {
      if (signal.isTimeline && signal.timeline) {
        signal.timeline.visibleRange = { start, end };
      }
      if (signal.isMinimap && signal.minimap && signal.minimap !== event.target) {
        signal.minimap.visibleRange = { start, end };
      }
    });
    
    // Also synchronize the bottom minimap if it's not the source
    if (this.minimap && this.minimap !== event.target) {
      this.minimap.visibleRange = { start, end };
    }
    
    // Save state after range changes
    this.debouncedSaveState();
  }

  private addTimelineSignal() {
    this.timelineCounter++;
    const timeline = new Timeline();
    const name = `Timeline ${this.timelineCounter}`;
    
    // Set up time range if already initialized
    if (this.timeRangeInitialized) {
      timeline.totalRange = { start: this.visibleStart, end: this.visibleEnd };
      timeline.visibleRange = { start: this.visibleStart, end: this.visibleEnd };
    }
    
    // Use negative refs for timelines to avoid conflicts with signal refs
    // Signal refs are always positive integers from the waveform file
    this.selectedSignals.push({
      name,
      ref: -this.timelineCounter,
      isTimeline: true,
      timeline
    });
    
    this.updateSelectedSignalsTree();
    
    // Save state after adding timeline
    this.debouncedSaveState();
  }

  private addMinimapSignal() {
    this.minimapCounter++;
    const minimap = new Minimap();
    const name = `Minimap ${this.minimapCounter}`;
    
    // Set up time range if already initialized
    if (this.timeRangeInitialized) {
      minimap.totalRange = { start: this.visibleStart, end: this.visibleEnd };
      minimap.visibleRange = { start: this.visibleStart, end: this.visibleEnd };
    }
    
    // Use negative refs for minimaps to avoid conflicts with signal refs and timelines
    // Signal refs are always positive integers from the waveform file
    // Timeline refs are negative starting from -1
    this.selectedSignals.push({
      name,
      ref: MINIMAP_REF_OFFSET - this.minimapCounter,
      isMinimap: true,
      minimap
    });
    
    this.updateSelectedSignalsTree();
    
    // Save state after adding minimap
    this.debouncedSaveState();
  }

  private handleAddTimeline() {
    this.addTimelineSignal();
    this.render();
  }

  private handleAddMinimap() {
    this.addMinimapSignal();
    this.render();
  }

  private handleSignalsReordered(event: Event) {
    const customEvent = event as CustomEvent;
    const { signals } = customEvent.detail;
    
    // Map the reordered signal refs to existing SelectedSignal objects (with canvas/timeline)
    // The signals from the event only contain name and ref, not the DOM elements
    const reorderedSignals = signals.map((s: { name: string; ref: number }) => {
      const existingSignal = this.selectedSignals.find(sig => sig.ref === s.ref);
      return existingSignal || s; // Fallback to basic signal if not found (shouldn't happen)
    });
    
    // Update the internal signals array to match the new order
    this.selectedSignals = reorderedSignals;
    
    // Reorder DOM elements without recreating them
    // This avoids clearing innerHTML and preserves the existing elements
    if (this.signalsContainer) {
      this.selectedSignals.forEach(signal => {
        const element = signal.isTimeline ? signal.timeline : signal.canvas;
        if (element && element.parentElement === this.signalsContainer) {
          // Remove and re-append to move to the end, building the correct order
          this.signalsContainer!.appendChild(element);
        }
      });
    }
    
    // Repaint signal canvases with their new indices for correct alternating backgrounds
    this.selectedSignals.forEach((signal, index) => {
      if (signal.canvas) {
        this.paintSignal(signal.canvas, signal.ref, index);
      }
    });
    
    // Save state after reordering
    this.debouncedSaveState();
  }

  private handleThemeChanged(event: Event) {
    // When theme changes, repaint all signal canvases
    // Timelines handle their own theme changes via their own theme-changed listener
    this.selectedSignals.forEach((signal, index) => {
      if (signal.canvas) {
        this.paintSignal(signal.canvas, signal.ref, index);
      }
    });
  }
  
  /**
   * Handle wheel events on signal canvases
   * Implements zoom with Ctrl+wheel and horizontal pan with plain wheel
   */
  private handleSignalCanvasWheel(e: WheelEvent) {
    e.preventDefault();
    
    const currentRange = this.visibleEnd - this.visibleStart;
    
    // Check if Ctrl key is pressed (or Cmd on Mac)
    if (e.ctrlKey || e.metaKey) {
      // Ctrl+Wheel: Zoom in/out
      const zoomFactor = 1.2;
      let newRange: number;
      
      if (e.deltaY < 0) {
        // Zoom in
        newRange = currentRange / zoomFactor;
      } else {
        // Zoom out
        newRange = currentRange * zoomFactor;
      }
      
      // Clamp to reasonable minimum (1 time unit - the waveform uses nanoseconds)
      if (newRange < 1) {
        newRange = 1;
      }
      
      const center = (this.visibleStart + this.visibleEnd) / 2;
      let newStart = center - newRange / 2;
      let newEnd = center + newRange / 2;
      
      // Clamp to valid bounds (don't go below 0)
      if (newStart < 0) {
        newStart = 0;
        newEnd = newStart + newRange;
      }
      
      this.setVisibleRange(newStart, newEnd);
    } else {
      // Plain Wheel: Pan left/right (horizontal scroll)
      const panFactor = 0.1; // 10% of visible range
      const panDistance = currentRange * panFactor * Math.sign(e.deltaY);
      
      let newStart = this.visibleStart + panDistance;
      let newEnd = this.visibleEnd + panDistance;
      
      // Don't pan before 0
      if (newStart < 0) {
        newStart = 0;
        newEnd = newStart + currentRange;
      }
      
      this.setVisibleRange(newStart, newEnd);
    }
  }
  
  private handleSignalPathToggled(event: Event) {
    const customEvent = event as CustomEvent;
    const { ref, showFullPath } = customEvent.detail;
    
    // Find and update the signal
    const signal = this.selectedSignals.find(s => s.ref === ref);
    if (signal) {
      signal.showFullPath = showFullPath;
      
      // Update the tree display
      this.updateSelectedSignalsTree();
      
      // Save state to persist the preference
      this.debouncedSaveState();
    }
  }

  private handleSignalSelect(event: Event) {
    const customEvent = event as CustomEvent;
    const { name, ref, filename, path } = customEvent.detail;

    // Only handle events for this file - signals are independent per file
    if (filename !== this._filename) {
      return;
    }

    this.addSignal(name, ref, path);
  }

  private handleCheckboxToggle(event: Event) {
    const customEvent = event as CustomEvent;
    const { name, ref, filename, path, checked } = customEvent.detail;

    // Only handle events for this file - signals are independent per file
    if (filename !== this._filename) {
      return;
    }

    if (checked) {
      this.addSignalUndoable(name, ref, path);
    } else {
      this.removeSignalUndoable(ref);
    }
  }

  /**
   * Add a signal with undo support
   */
  private addSignalUndoable(name: string, ref: number, path?: string) {
    // Check if signal is already selected
    if (this.selectedSignals.some(s => s.ref === ref)) {
      return;
    }

    if (this.executeUndoableOperation) {
      const operation = {
        do: () => {
          this.addSignal(name, ref, path);
        },
        undo: () => {
          this.removeSignal(ref);
        },
        redo: () => {
          this.addSignal(name, ref, path);
        },
        getDescription: () => `Add signal ${name}`
      };
      this.executeUndoableOperation(operation);
    } else {
      // Fallback if undo system not available
      this.addSignal(name, ref, path);
    }
  }

  /**
   * Remove a signal with undo support
   */
  private removeSignalUndoable(ref: number) {
    // Find the signal to remove
    const signalIndex = this.selectedSignals.findIndex(s => s.ref === ref);
    if (signalIndex === -1) {
      return;
    }

    const signal = this.selectedSignals[signalIndex];
    const name = signal.name;
    const path = signal.path;
    const showFullPath = signal.showFullPath;
    const savedIndex = signalIndex;

    if (this.executeUndoableOperation) {
      const operation = {
        do: () => {
          this.removeSignal(ref);
        },
        undo: () => {
          // Restore signal at its original position
          this.addSignalAtIndex(name, ref, savedIndex, path, showFullPath);
        },
        redo: () => {
          this.removeSignal(ref);
        },
        getDescription: () => `Remove signal ${name}`
      };
      this.executeUndoableOperation(operation);
    } else {
      // Fallback if undo system not available
      this.removeSignal(ref);
    }
  }

  private addSignal(name: string, ref: number, path?: string) {
    // Check if signal is already selected
    if (this.selectedSignals.some(s => s.ref === ref)) {
      return;
    }

    // Create a new canvas for this signal
    const canvas = document.createElement('canvas');
    // Set a reasonable default width - will be updated after render
    canvas.width = 800;
    canvas.height = 32;
    
    // Add wheel event listener for zoom and pan
    canvas.addEventListener('wheel', this.boundHandleSignalCanvasWheel);

    this.selectedSignals.push({ 
      name, 
      ref, 
      path, 
      showFullPath: false, // Default to showing just the name
      canvas, 
      isTimeline: false 
    });
    
    // Update the selected signals tree
    this.updateSelectedSignalsTree();
    
    this.render();

    // Paint the signal after the canvas is properly sized in the DOM
    this.setupAndPaintCanvas(canvas, ref);
    
    // Save state after adding signal
    this.debouncedSaveState();
  }

  /**
   * Add a signal at a specific index (used for undo/redo)
   */
  private addSignalAtIndex(name: string, ref: number, index: number, path?: string, showFullPath?: boolean) {
    // Check if signal is already selected
    if (this.selectedSignals.some(s => s.ref === ref)) {
      return;
    }

    // Create a new canvas for this signal
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 32;
    
    // Add wheel event listener for zoom and pan
    canvas.addEventListener('wheel', this.boundHandleSignalCanvasWheel);

    // Insert at the specified index
    this.selectedSignals.splice(index, 0, { 
      name, 
      ref, 
      path, 
      showFullPath: showFullPath ?? false, 
      canvas, 
      isTimeline: false 
    });
    
    // Update the selected signals tree
    this.updateSelectedSignalsTree();
    
    this.render();

    // Paint the signal after the canvas is properly sized in the DOM
    this.setupAndPaintCanvas(canvas, ref);
    
    // Save state after adding signal
    this.debouncedSaveState();
  }

  private removeSignal(ref: number) {
    // Find the signal to remove
    const signalIndex = this.selectedSignals.findIndex(s => s.ref === ref);
    
    if (signalIndex === -1) {
      return;
    }

    // Remove wheel event listener from canvas if it exists
    const signal = this.selectedSignals[signalIndex];
    if (signal.canvas) {
      signal.canvas.removeEventListener('wheel', this.boundHandleSignalCanvasWheel);
    }

    // Remove the signal
    this.selectedSignals.splice(signalIndex, 1);
    
    // Update the selected signals tree
    this.updateSelectedSignalsTree();
    
    // Re-render to update the display
    this.render();
    
    // Save state after removing signal
    this.debouncedSaveState();
  }

  private updateSelectedSignalsTree() {
    this.selectedSignalsTree.signals = this.selectedSignals.map(s => ({
      name: s.name,
      ref: s.ref,
      path: s.path,
      showFullPath: s.showFullPath
    }));
    
    // Dispatch event to notify that selected signals have changed
    this.dispatchEvent(new CustomEvent('selected-signals-changed', {
      detail: {
        filename: this._filename,
        signalRefs: this.selectedSignals.filter(s => !s.isTimeline).map(s => s.ref)
      },
      bubbles: true,
      composed: true
    }));
  }

  private setupAndPaintCanvas(canvas: HTMLCanvasElement, ref: number) {
    // Use requestAnimationFrame to ensure the canvas is laid out and sized
    requestAnimationFrame(() => {
      // Update canvas with high-DPI support to match its display width
      const displayWidth = canvas.clientWidth || 800;
      const displayHeight = canvas.clientHeight || 32;
      setupCanvasForHighDPI(canvas, displayWidth, displayHeight);
      
      // Find the index of this signal in the array
      const signalIndex = this.selectedSignals.findIndex(s => s.ref === ref);
      
      // Now paint with the correct dimensions
      this.paintSignal(canvas, ref, signalIndex >= 0 ? signalIndex : 0);
    });
  }

  private handleContainerResize() {
    // When the container is resized (e.g., dock resize), update all canvas and timeline elements
    this.selectedSignals.forEach((signal, index) => {
      if (signal.canvas) {
        const displayWidth = signal.canvas.clientWidth || 800;
        const displayHeight = signal.canvas.clientHeight || 32;
        
        // Only update and repaint if dimensions have actually changed
        const currentStyleWidth = parseInt(signal.canvas.style.width) || 0;
        const currentStyleHeight = parseInt(signal.canvas.style.height) || 0;
        
        if (currentStyleWidth !== displayWidth || currentStyleHeight !== displayHeight) {
          setupCanvasForHighDPI(signal.canvas, displayWidth, displayHeight);
          this.paintSignal(signal.canvas, signal.ref, index);
        }
      } else if (signal.timeline) {
        // Trigger resize on timeline components
        signal.timeline.resize();
      }
    });
  }

  private parseSignalValue(value: string): number {
    // Try to parse as binary first, then decimal, default to 0
    const binaryValue = parseInt(value, 2);
    if (!isNaN(binaryValue)) return binaryValue;

    const decimalValue = parseInt(value, 10);
    if (!isNaN(decimalValue)) return decimalValue;

    return 0;
  }

  private async initializeTimeRange(signalRef: number) {
    if (this.timeRangeInitialized || !this._filename) return;

    try {
      // Use a large but reasonable upper bound to detect actual time range
      // 1e15 nanoseconds = ~11.5 days which is reasonable for waveform simulations
      const changes = await getSignalChanges(this._filename, signalRef, 0, 1e15);
      
      if (changes.length > 0) {
        this.visibleStart = changes[0].time;
        this.visibleEnd = changes[changes.length - 1].time;
        this.timeRangeInitialized = true;
        
        // Update minimap with total range
        this.minimap.totalRange = { start: this.visibleStart, end: this.visibleEnd };
        this.minimap.visibleRange = { start: this.visibleStart, end: this.visibleEnd };
        
        // Update all timeline signals with total and visible ranges
        this.selectedSignals.forEach(signal => {
          if (signal.isTimeline && signal.timeline) {
            signal.timeline.totalRange = { start: this.visibleStart, end: this.visibleEnd };
            signal.timeline.visibleRange = { start: this.visibleStart, end: this.visibleEnd };
          }
        });
      }
    } catch (error) {
      console.error('Error initializing time range:', error);
    }
  }

  private async loadAlternatingRowPattern() {
    try {
      const pattern = await getSetting('Waveform/Alternating Row Pattern') as number;
      if (pattern !== undefined) {
        this.alternatingRowPattern = pattern;
      }
    } catch (error) {
      console.error('Failed to load alternating row pattern setting:', error);
    }
  }

  private async paintSignal(canvas: HTMLCanvasElement, signalRef: number, signalIndex: number = 0) {
    if (!this._filename) return;

    try {
      // Initialize time range from first signal if not yet done
      await this.initializeTimeRange(signalRef);

      // Fetch signal changes using the current visible range
      const changes = await getSignalChanges(
        this._filename, 
        signalRef, 
        this.visibleStart, 
        this.visibleEnd
      );

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Use CSS pixel dimensions for drawing calculations
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      // Get computed styles once for performance
      const computedStyle = getComputedStyle(this);

      // Determine if this row should have alternating background
      const shouldAlternate = Math.floor(signalIndex / this.alternatingRowPattern) % 2 === 1;

      // Clear canvas - use alternating background if applicable
      if (shouldAlternate) {
        ctx.fillStyle = computedStyle.getPropertyValue('--color-waveform-alt-bg') || '#f0f0f0';
      } else {
        ctx.fillStyle = computedStyle.getPropertyValue('--color-bg-surface') || '#ffffff';
      }
      ctx.fillRect(0, 0, width, height);

      if (changes.length === 0) return;

      // Find time range
      const minTime = changes[0].time;
      const maxTime = changes[changes.length - 1].time;
      const timeRange = maxTime - minTime || 1;

      // Draw waveform - use theme waveform color
      ctx.strokeStyle = computedStyle.getPropertyValue('--color-waveform') || '#4CAF50';
      ctx.lineWidth = 2;
      ctx.beginPath();

      changes.forEach((change, index) => {
        const x = ((change.time - minTime) / timeRange) * width;
        const numValue = this.parseSignalValue(change.value);

        // Normalize to canvas height
        const y = height - (numValue > 0 ? height * 0.8 : height * 0.2);

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          // Draw horizontal line to current time, then vertical to new value
          const prevChange = changes[index - 1];
          const prevX = ((prevChange.time - minTime) / timeRange) * width;
          const prevNumValue = this.parseSignalValue(prevChange.value);
          const prevY = height - (prevNumValue > 0 ? height * 0.8 : height * 0.2);

          ctx.lineTo(x, prevY); // Horizontal line
          ctx.lineTo(x, y);     // Vertical line
        }
      });

      ctx.stroke();
    } catch (error) {
      console.error('Error painting signal:', error);
    }
  }

  /**
   * Updates the visible time range and repaints all signals.
   * This method can be called by zoom/pan controls to update the viewport.
   * @param start - Start time of the visible range
   * @param end - End time of the visible range
   */
  public async setVisibleRange(start: number, end: number): Promise<void> {
    // Validate input
    if (start < 0 || end < 0) {
      throw new Error(`Invalid time range: start (${start}) and end (${end}) must be non-negative`);
    }
    if (start >= end) {
      throw new Error(`Invalid time range: start (${start}) must be less than end (${end})`);
    }

    this.visibleStart = start;
    this.visibleEnd = end;
    
    // Update minimap visible range
    this.minimap.visibleRange = { start, end };
    
    // Repaint all non-timeline signals with the new range, awaiting all operations
    await Promise.all(
      this.selectedSignals
        .map((signal, index) => ({ signal, index }))
        .filter(({ signal }) => !signal.isTimeline && signal.canvas)
        .map(({ signal, index }) => this.paintSignal(signal.canvas!, signal.ref, index))
    );
  }

  /**
   * Gets the current visible time range.
   * @returns Object with start and end times
   */
  public getVisibleRange(): { start: number; end: number } {
    return {
      start: this.visibleStart,
      end: this.visibleEnd
    };
  }

  /**
   * Gets the refs of currently selected signals (excluding timelines).
   * @returns Array of signal refs
   */
  public getSelectedSignalRefs(): number[] {
    return this.selectedSignals
      .filter(signal => !signal.isTimeline)
      .map(signal => signal.ref);
  }

  /**
   * Save the current file state (debounced to avoid excessive saves)
   */
  private debouncedSaveState() {
    // Clear any existing timeout
    if (this.saveStateTimeout !== null) {
      clearTimeout(this.saveStateTimeout);
    }
    
    // Set a new timeout to save after 500ms of inactivity
    this.saveStateTimeout = window.setTimeout(() => {
      this.saveCurrentState();
      this.saveStateTimeout = null;
    }, 500);
  }

  /**
   * Save the current state immediately
   */
  private saveCurrentState() {
    if (!this._filename) return;
    
    // Convert selectedSignals array to Item[] format
    const items: Item[] = this.selectedSignals.map(signal => {
      if (signal.isTimeline) {
        return {
          _type: 'timeline' as const,
          name: signal.name
        };
      } else {
        return {
          _type: 'signal' as const,
          ref: signal.ref,
          name: signal.name
        };
      }
    });
    
    const state: FileState = {
      version: 'V0.1',
      items,
      visibleStart: this.visibleStart,
      visibleEnd: this.visibleEnd,
      timestamp: Date.now()
    };
    
    saveFileState(this._filename, state).catch(err => {
      console.error('Failed to save file state:', err);
    });
  }

  /**
   * Restore the file state from storage
   */
  private async restoreFileState() {
    if (!this._filename || this.stateRestored) return;
    
    try {
      const state = await loadFileState(this._filename);
      if (!state) {
        // No saved state for this file
        return;
      }
      
      // Check version compatibility
      if (state.version !== 'V0.1') {
        console.warn(`Unsupported state version: ${state.version}`);
        return;
      }
      
      console.log(`Restoring state for ${this._filename}:`, state);
      
      // Mark as restored to prevent multiple restorations
      this.stateRestored = true;
      
      // Restore visible range if it was initialized
      if (state.visibleStart !== 0 || state.visibleEnd !== 1000000) {
        this.visibleStart = state.visibleStart;
        this.visibleEnd = state.visibleEnd;
        this.timeRangeInitialized = true;
      }
      
      // Load the hierarchy to validate signals still exist
      const hierarchy = await getHierarchy(this._filename);
      if (!hierarchy) {
        console.warn('Could not load hierarchy to restore signals');
        return;
      }
      
      // Helper to find signals by ref in the hierarchy
      const findSignalByRef = (node: HierarchyNode, targetRef: number): { name: string; ref: number } | null => {
        if (node.var_ref === targetRef) {
          return { name: node.name, ref: targetRef };
        }
        if (node.children) {
          for (const child of node.children) {
            const found = findSignalByRef(child, targetRef);
            if (found) return found;
          }
        }
        return null;
      };
      
      // Clear the default timeline that was added in constructor
      this.selectedSignals = [];
      this.timelineCounter = 0;
      
      // Restore items from the flat list
      for (const item of state.items) {
        if (item._type === 'timeline') {
          this.addTimelineSignal();
        } else if (item._type === 'signal') {
          // Verify signal still exists in hierarchy
          const found = findSignalByRef(hierarchy, item.ref);
          if (found) {
            this.addSignal(item.name, item.ref);
          } else {
            console.warn(`Signal ${item.name} (ref: ${item.ref}) not found in hierarchy`);
          }
        }
        // Note: ItemGroup support can be added in future when needed
      }
      
      // Update minimap and all timeline/minimap signals with the restored range
      if (this.timeRangeInitialized) {
        this.minimap.totalRange = { start: this.visibleStart, end: this.visibleEnd };
        this.minimap.visibleRange = { start: this.visibleStart, end: this.visibleEnd };
        
        this.selectedSignals.forEach(signal => {
          if (signal.isTimeline && signal.timeline) {
            signal.timeline.totalRange = { start: this.visibleStart, end: this.visibleEnd };
            signal.timeline.visibleRange = { start: this.visibleStart, end: this.visibleEnd };
          }
          if (signal.isMinimap && signal.minimap) {
            signal.minimap.totalRange = { start: this.visibleStart, end: this.visibleEnd };
            signal.minimap.visibleRange = { start: this.visibleStart, end: this.visibleEnd };
          }
        });
      }
      
      this.render();
    } catch (err) {
      console.error('Failed to restore file state:', err);
    }
  }


  private render() {
    if (!this.shadowRoot) return;

    this.shadowRoot.innerHTML = `
      <div class="display-container">
        <div class="command-bar">
          <button id="add-timeline-btn" class="command-button">+ Add Timeline</button>
          <button id="add-minimap-btn" class="command-button">+ Add Minimap</button>
        </div>
        <div class="grid-scroll-container">
          <div class="grid-container" id="grid-container"></div>
        </div>
      </div>
    `;

    // Set up command bar button listeners
    const addTimelineBtn = this.shadowRoot.querySelector('#add-timeline-btn');
    const addMinimapBtn = this.shadowRoot.querySelector('#add-minimap-btn');
    if (addTimelineBtn) {
      addTimelineBtn.addEventListener('click', this.boundHandleAddTimeline);
    }
    if (addMinimapBtn) {
      addMinimapBtn.addEventListener('click', this.boundHandleAddMinimap);
    }

    // Get grid container
    const gridContainer = this.shadowRoot.querySelector('#grid-container');
    
    if (gridContainer) {
      // Add all the signals (timelines, minimaps, and signal canvases) as individual rows
      this.selectedSignals.forEach(signal => {
        // Create row container
        const row = document.createElement('div');
        row.className = 'signal-row';
        
        // Create label element
        const label = document.createElement('div');
        label.className = 'signal-label';
        label.textContent = signal.name;
        // Store ref for potential future features (e.g., click to highlight, context menu)
        label.dataset.ref = signal.ref.toString();
        row.appendChild(label);
        
        // Create canvas container and add corresponding canvas/timeline/minimap
        const canvasContainer = document.createElement('div');
        canvasContainer.className = 'signal-canvas-container';
        if (signal.isTimeline && signal.timeline) {
          canvasContainer.appendChild(signal.timeline);
        } else if (signal.isMinimap && signal.minimap) {
          canvasContainer.appendChild(signal.minimap);
        } else if (signal.canvas) {
          canvasContainer.appendChild(signal.canvas);
        }
        row.appendChild(canvasContainer);
        
        gridContainer.appendChild(row);
      });
      
      // Add the fixed minimap at the bottom
      if (this.selectedSignals.length > 0) {
        const row = document.createElement('div');
        row.className = 'signal-row';
        
        const minimapLabel = document.createElement('div');
        minimapLabel.className = 'signal-label';
        minimapLabel.textContent = 'Overview';
        row.appendChild(minimapLabel);
        
        const canvasContainer = document.createElement('div');
        canvasContainer.className = 'signal-canvas-container';
        canvasContainer.appendChild(this.minimap);
        row.appendChild(canvasContainer);
        
        gridContainer.appendChild(row);
      }
    }
    
    // Store reference to the grid container for signal access
    this.signalsContainer = gridContainer as HTMLDivElement;
  }
}

if (!customElements.get('file-display')) {
  customElements.define('file-display', FileDisplay);
}
