import { getSignalChanges, SignalChange } from '../backend.js';
import { css } from '../utils/css-utils.js';
import { scrollbarSheet } from '../styles/shared-sheets.js';
import fileDisplayCss from './file-display.css?inline';
import { SelectedSignalsTree } from './selected-signals-tree.js';
import { Timeline } from './timeline.js';
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
  private visibleStart: number = 0;
  private visibleEnd: number = 1000000;
  private timeRangeInitialized: boolean = false;
  private timelineCounter: number = 0;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.boundHandleSignalSelect = this.handleSignalSelect.bind(this);
    this.boundHandleCheckboxToggle = this.handleCheckboxToggle.bind(this);
    this.boundHandleRangeChanged = this.handleRangeChanged.bind(this);
    this.boundHandleZoomCommand = this.handleZoomCommand.bind(this);
    this.boundHandleAddTimeline = this.handleAddTimeline.bind(this);
    this.boundHandleSignalsReordered = this.handleSignalsReordered.bind(this);

    this.shadowRoot!.adoptedStyleSheets = [scrollbarSheet, css(fileDisplayCss)];
    
    // Create the selected signals tree
    this.selectedSignalsTree = new SelectedSignalsTree();
    
    // Add a default timeline as the first signal
    this.addTimelineSignal();
    
    this.render();
  }

  get filename(): string {
    return this._filename;
  }

  set filename(val: string) {
    this._filename = val;
    this.render();
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
    
    // Set up ResizeObserver to watch for container size changes
    // This handles dock resizing and other layout changes
    this.resizeObserver = new ResizeObserver(() => {
      this.handleContainerResize();
    });
    
    // Observe the file display element itself for size changes
    this.resizeObserver.observe(this);
  }

  disconnectedCallback() {
    document.removeEventListener('signal-select', this.boundHandleSignalSelect);
    document.removeEventListener('checkbox-toggle', this.boundHandleCheckboxToggle);
    this.removeEventListener('range-changed', this.boundHandleRangeChanged);
    this.removeEventListener('zoom-command', this.boundHandleZoomCommand);
    this.selectedSignalsTree.removeEventListener('signals-reordered', this.boundHandleSignalsReordered);
    
    // Clean up ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
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
  }

  private handleAddTimeline() {
    this.addTimelineSignal();
    this.render();
  }

  private handleSignalsReordered(event: Event) {
    const customEvent = event as CustomEvent;
    const { signals } = customEvent.detail;
    
    // Update the internal signals array to match the new order
    this.selectedSignals = signals;
    
    // Re-render the waveforms in the new order
    this.render();
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
      
      // Now paint with the correct dimensions
      this.paintSignal(canvas, ref);
    });
  }

  private handleContainerResize() {
    // When the container is resized (e.g., dock resize), update all canvas elements
    this.selectedSignals.forEach(signal => {
      if (signal.canvas) {
        const displayWidth = signal.canvas.clientWidth || 800;
        if (signal.canvas.width !== displayWidth) {
          signal.canvas.width = displayWidth;
          this.paintSignal(signal.canvas, signal.ref);
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

  private async paintSignal(canvas: HTMLCanvasElement, signalRef: number) {
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

      // Clear canvas - use theme background color
      ctx.fillStyle = getComputedStyle(this).getPropertyValue('--color-bg-surface') || '#1e1e1e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (changes.length === 0) return;

      // Find time range
      const minTime = changes[0].time;
      const maxTime = changes[changes.length - 1].time;
      const timeRange = maxTime - minTime || 1;

      // Draw waveform - use theme waveform color
      ctx.strokeStyle = getComputedStyle(this).getPropertyValue('--color-waveform') || '#4CAF50';
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
        .filter(signal => !signal.isTimeline && signal.canvas)
        .map(signal => this.paintSignal(signal.canvas!, signal.ref))
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

    // Append timelines and canvases to the waveforms container
    this.signalsContainer = this.shadowRoot.querySelector('#waveforms-container');
    if (this.signalsContainer) {
      this.selectedSignals.forEach(signal => {
        const signalItem = document.createElement('div');
        signalItem.className = signal.isTimeline ? 'signal-item timeline-item' : 'signal-item';

        if (signal.isTimeline && signal.timeline) {
          signalItem.appendChild(signal.timeline);
        } else if (signal.canvas) {
          signalItem.appendChild(signal.canvas);
        }

        this.signalsContainer!.appendChild(signalItem);
      });
    }
  }
}

if (!customElements.get('file-display')) {
  customElements.define('file-display', FileDisplay);
}
