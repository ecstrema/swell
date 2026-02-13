import { getSignalChanges, SignalChange } from '../backend.js';
import { css } from '../utils/css-utils.js';
import { scrollbarSheet } from '../styles/shared-sheets.js';
import fileDisplayCss from './file-display.css?inline';
import { SelectedSignalsTree } from './selected-signals-tree.js';
import { Timeline } from './timeline.js';
import './selected-signals-tree.js';
import './timeline.js';

interface SelectedSignal {
  name: string;
  ref: number;
  canvas: HTMLCanvasElement;
}

export class FileDisplay extends HTMLElement {
  private _filename: string = '';
  private selectedSignals: SelectedSignal[] = [];
  private signalsContainer: HTMLDivElement | null = null;
  private selectedSignalsTree: SelectedSignalsTree;
  private timeline: Timeline;
  private boundHandleSignalSelect: (event: Event) => void;
  private boundHandleRangeChanged: (event: Event) => void;
  private boundHandleZoomCommand: (event: Event) => void;
  private visibleStart: number = 0;
  private visibleEnd: number = 1000000;
  private timeRangeInitialized: boolean = false;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.boundHandleSignalSelect = this.handleSignalSelect.bind(this);
    this.boundHandleRangeChanged = this.handleRangeChanged.bind(this);
    this.boundHandleZoomCommand = this.handleZoomCommand.bind(this);

    this.shadowRoot!.adoptedStyleSheets = [scrollbarSheet, css(fileDisplayCss)];
    
    // Create the selected signals tree
    this.selectedSignalsTree = new SelectedSignalsTree();
    
    // Create the timeline
    this.timeline = new Timeline();
    
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
    
    // Listen for timeline range changes
    this.addEventListener('range-changed', this.boundHandleRangeChanged);
    
    // Listen for zoom commands
    this.addEventListener('zoom-command', this.boundHandleZoomCommand);
  }

  disconnectedCallback() {
    document.removeEventListener('signal-select', this.boundHandleSignalSelect);
    this.removeEventListener('range-changed', this.boundHandleRangeChanged);
    this.removeEventListener('zoom-command', this.boundHandleZoomCommand);
  }

  private handleRangeChanged(event: Event) {
    const customEvent = event as CustomEvent;
    const { start, end } = customEvent.detail;
    this.setVisibleRange(start, end);
  }

  private handleZoomCommand(event: Event) {
    const customEvent = event as CustomEvent;
    const { action } = customEvent.detail;
    
    switch (action) {
      case 'zoom-in':
        this.timeline.zoomIn();
        break;
      case 'zoom-out':
        this.timeline.zoomOut();
        break;
      case 'zoom-fit':
        this.timeline.zoomToFit();
        break;
    }
  }

  private handleSignalSelect(event: Event) {
    const customEvent = event as CustomEvent;
    const { name, ref, filename } = customEvent.detail;

    // Only handle events for this file - signals are independent per file
    if (filename !== this._filename) {
      return;
    }

    // Check if signal is already selected
    if (this.selectedSignals.some(s => s.ref === ref)) {
      return;
    }

    // Create a new canvas for this signal
    const canvas = document.createElement('canvas');
    // Set a reasonable default width - will be updated after render
    canvas.width = 800;
    canvas.height = 100;

    this.selectedSignals.push({ name, ref, canvas });
    
    // Update the selected signals tree
    this.updateSelectedSignalsTree();
    
    this.render();

    // Paint the signal after the canvas is properly sized in the DOM
    this.setupAndPaintCanvas(canvas, ref);
  }

  private updateSelectedSignalsTree() {
    this.selectedSignalsTree.signals = this.selectedSignals.map(s => ({
      name: s.name,
      ref: s.ref
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
        
        // Update timeline with total and visible ranges
        this.timeline.totalRange = { start: this.visibleStart, end: this.visibleEnd };
        this.timeline.visibleRange = { start: this.visibleStart, end: this.visibleEnd };
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

      // Clear canvas
      ctx.fillStyle = '#1e1e1e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (changes.length === 0) return;

      // Find time range
      const minTime = changes[0].time;
      const maxTime = changes[changes.length - 1].time;
      const timeRange = maxTime - minTime || 1;

      // Draw waveform
      ctx.strokeStyle = '#4CAF50';
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
      console.error('Invalid time range: values must be non-negative');
      return;
    }
    if (start >= end) {
      console.error('Invalid time range: start must be less than end');
      return;
    }

    this.visibleStart = start;
    this.visibleEnd = end;
    
    // Repaint all signals with the new range, awaiting all operations
    await Promise.all(
      this.selectedSignals.map(signal => 
        this.paintSignal(signal.canvas, signal.ref)
      )
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

  private render() {
    if (!this.shadowRoot) return;

    this.shadowRoot.innerHTML = `
      <div class="file-header">
        Current File: <strong>${this._filename}</strong>
      </div>
      <div id="timeline-container" class="timeline-container"></div>
      <div class="display-container">
        <div id="signals-tree-container" class="signals-tree-container"></div>
        <div class="waveforms-container" id="waveforms-container">
          ${this.selectedSignals.length === 0
            ? '<div class="empty-message">Select signals from the left panel to display them here</div>'
            : ''}
        </div>
      </div>
    `;

    // Insert the timeline
    const timelineContainer = this.shadowRoot.querySelector('#timeline-container');
    if (timelineContainer) {
      timelineContainer.appendChild(this.timeline);
    }

    // Insert the selected signals tree
    const treeContainer = this.shadowRoot.querySelector('#signals-tree-container');
    if (treeContainer) {
      treeContainer.appendChild(this.selectedSignalsTree);
    }

    // Append canvases to the waveforms container
    this.signalsContainer = this.shadowRoot.querySelector('#waveforms-container');
    if (this.signalsContainer) {
      this.selectedSignals.forEach(signal => {
        const signalItem = document.createElement('div');
        signalItem.className = 'signal-item';

        signalItem.appendChild(signal.canvas);

        this.signalsContainer!.appendChild(signalItem);
      });
    }
  }
}

if (!customElements.get('file-display')) {
  customElements.define('file-display', FileDisplay);
}
