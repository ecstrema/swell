import { getSignalChanges, SignalChange, getHierarchy } from '../backend.js';
import { css } from '../utils/css-utils.js';
import { scrollbarSheet } from '../styles/shared-sheets.js';
import fileDisplayCss from './file-display.css?inline';
import { SelectedSignalsTree } from './selected-signals-tree.js';
import { Timeline } from './timeline.js';
import { saveFileState, loadFileState, FileState, Item, ItemSignal, ItemTimeline } from '../utils/file-state-storage.js';
import { getSetting } from '../settings/settings-storage.js';
import './selected-signals-tree.js';
import './timeline.js';
import './resizable-panel.js';

interface SelectedSignal {
  name: string;
  ref: number;
  canvas?: HTMLCanvasElement;
  timeline?: Timeline;
  isTimeline?: boolean;
}

interface HierarchyNode {
  name: string;
  var_ref?: number;
  children?: HierarchyNode[];
}

export class FileDisplay extends HTMLElement {
  private _filename: string = '';
  private selectedSignals: SelectedSignal[] = [];
  private signalsContainer: HTMLDivElement | null = null;
  private selectedSignalsTree: SelectedSignalsTree;
  private boundHandleSignalSelect: (event: Event) => void;
  private boundHandleCheckboxToggle: (event: Event) => void;
  private boundHandleRangeChanged: (event: Event) => void;
  private boundHandleZoomCommand: (event: Event) => void;
  private boundHandleAddTimeline: () => void;
  private boundHandleSignalsReordered: (event: Event) => void;
  private boundHandleThemeChanged: (event: Event) => void;
  private visibleStart: number = 0;
  private visibleEnd: number = 1000000;
  private timeRangeInitialized: boolean = false;
  private timelineCounter: number = 0;
  private resizeObserver: ResizeObserver | null = null;
  private saveStateTimeout: number | null = null;
  private stateRestored: boolean = false;
  private alternatingRowPattern: number = 3;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.boundHandleSignalSelect = this.handleSignalSelect.bind(this);
    this.boundHandleCheckboxToggle = this.handleCheckboxToggle.bind(this);
    this.boundHandleRangeChanged = this.handleRangeChanged.bind(this);
    this.boundHandleZoomCommand = this.handleZoomCommand.bind(this);
    this.boundHandleAddTimeline = this.handleAddTimeline.bind(this);
    this.boundHandleSignalsReordered = this.handleSignalsReordered.bind(this);
    this.boundHandleThemeChanged = this.handleThemeChanged.bind(this);

    this.shadowRoot!.adoptedStyleSheets = [scrollbarSheet, css(fileDisplayCss)];
    
    // Create the selected signals tree
    this.selectedSignalsTree = new SelectedSignalsTree();
    
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
      } else {
        return {
          _type: 'signal' as const,
          ref: signal.ref,
          name: signal.name
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
      
      // Clear current signals
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
      }
      
      // Update all timeline signals with the restored range
      if (this.timeRangeInitialized) {
        this.selectedSignals.forEach(signal => {
          if (signal.isTimeline && signal.timeline) {
            signal.timeline.totalRange = { start: this.visibleStart, end: this.visibleEnd };
            signal.timeline.visibleRange = { start: this.visibleStart, end: this.visibleEnd };
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
    // Listen for signal selection events
    document.addEventListener('signal-select', this.boundHandleSignalSelect);
    
    // Listen for checkbox toggle events
    document.addEventListener('checkbox-toggle', this.boundHandleCheckboxToggle);
    
    // Listen for timeline range changes
    this.addEventListener('range-changed', this.boundHandleRangeChanged);
    
    // Listen for zoom commands
    this.addEventListener('zoom-command', this.boundHandleZoomCommand);
    
    // Listen for signals reordered event from the tree
    this.selectedSignalsTree.addEventListener('signals-reordered', this.boundHandleSignalsReordered);
    
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
    this.removeEventListener('zoom-command', this.boundHandleZoomCommand);
    this.selectedSignalsTree.removeEventListener('signals-reordered', this.boundHandleSignalsReordered);
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
    
    // Synchronize all other timelines in the same file
    this.selectedSignals.forEach(signal => {
      if (signal.isTimeline && signal.timeline && signal.timeline !== event.target) {
        signal.timeline.visibleRange = { start, end };
      }
    });
    
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

  private handleAddTimeline() {
    this.addTimelineSignal();
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

  private handleSignalSelect(event: Event) {
    const customEvent = event as CustomEvent;
    const { name, ref, filename } = customEvent.detail;

    // Only handle events for this file - signals are independent per file
    if (filename !== this._filename) {
      return;
    }

    this.addSignal(name, ref);
  }

  private handleCheckboxToggle(event: Event) {
    const customEvent = event as CustomEvent;
    const { name, ref, filename, checked } = customEvent.detail;

    // Only handle events for this file - signals are independent per file
    if (filename !== this._filename) {
      return;
    }

    if (checked) {
      this.addSignal(name, ref);
    } else {
      this.removeSignal(ref);
    }
  }

  private addSignal(name: string, ref: number) {
    // Check if signal is already selected
    if (this.selectedSignals.some(s => s.ref === ref)) {
      return;
    }

    // Create a new canvas for this signal
    const canvas = document.createElement('canvas');
    // Set a reasonable default width - will be updated after render
    canvas.width = 800;
    canvas.height = 24;

    this.selectedSignals.push({ name, ref, canvas, isTimeline: false });
    
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
      ref: s.ref
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
      // Update canvas width to match its display width
      const displayWidth = canvas.clientWidth || 800;
      canvas.width = displayWidth;
      
      // Find the index of this signal in the array
      const signalIndex = this.selectedSignals.findIndex(s => s.ref === ref);
      
      // Now paint with the correct dimensions
      this.paintSignal(canvas, ref, signalIndex >= 0 ? signalIndex : 0);
    });
  }

  private handleContainerResize() {
    // When the container is resized (e.g., dock resize), update all canvas elements
    this.selectedSignals.forEach((signal, index) => {
      if (signal.canvas) {
        const displayWidth = signal.canvas.clientWidth || 800;
        if (signal.canvas.width !== displayWidth) {
          signal.canvas.width = displayWidth;
          this.paintSignal(signal.canvas, signal.ref, index);
        }
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
      ctx.fillRect(0, 0, canvas.width, canvas.height);

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
        const x = ((change.time - minTime) / timeRange) * canvas.width;
        const numValue = this.parseSignalValue(change.value);

        // Normalize to canvas height
        const y = canvas.height - (numValue > 0 ? canvas.height * 0.8 : canvas.height * 0.2);

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          // Draw horizontal line to current time, then vertical to new value
          const prevChange = changes[index - 1];
          const prevX = ((prevChange.time - minTime) / timeRange) * canvas.width;
          const prevNumValue = this.parseSignalValue(prevChange.value);
          const prevY = canvas.height - (prevNumValue > 0 ? canvas.height * 0.8 : canvas.height * 0.2);

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
      
      // Update all timeline signals with the restored range
      if (this.timeRangeInitialized) {
        this.selectedSignals.forEach(signal => {
          if (signal.isTimeline && signal.timeline) {
            signal.timeline.totalRange = { start: this.visibleStart, end: this.visibleEnd };
            signal.timeline.visibleRange = { start: this.visibleStart, end: this.visibleEnd };
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
        <app-resizable-panel 
          direction="horizontal" 
          initial-size="250px" 
          min-size="200px" 
          max-size="600px">
          <div slot="panel" class="signals-tree-container" id="signals-tree-container"></div>
          <div slot="content" class="waveforms-container" id="waveforms-container">
            ${this.selectedSignals.length === 0
              ? '<div class="empty-message">Select signals from the left panel to display them here</div>'
              : ''}
          </div>
        </app-resizable-panel>
      </div>
    `;

    // Insert the selected signals tree
    const treeContainer = this.shadowRoot.querySelector('#signals-tree-container');
    if (treeContainer) {
      treeContainer.appendChild(this.selectedSignalsTree);
      
      // Add "Add Timeline" button at the bottom of the tree
      const addTimelineBtn = document.createElement('button');
      addTimelineBtn.className = 'add-timeline-btn';
      addTimelineBtn.textContent = '+ Add Timeline';
      addTimelineBtn.addEventListener('click', this.boundHandleAddTimeline);
      treeContainer.appendChild(addTimelineBtn);
    }

    // Append timelines and canvases directly to the waveforms container
    // No wrapper divs - just the canvas/timeline elements themselves
    this.signalsContainer = this.shadowRoot.querySelector('#waveforms-container');
    if (this.signalsContainer) {
      this.selectedSignals.forEach(signal => {
        if (signal.isTimeline && signal.timeline) {
          this.signalsContainer!.appendChild(signal.timeline);
        } else if (signal.canvas) {
          this.signalsContainer!.appendChild(signal.canvas);
        }
      });
    }
  }
}

if (!customElements.get('file-display')) {
  customElements.define('file-display', FileDisplay);
}
