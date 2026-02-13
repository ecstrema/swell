import { getSignalChanges, SignalChange } from '../backend.js';
import { css } from '../utils/css-utils.js';
import { scrollbarSheet } from '../styles/shared-sheets.js';
import fileDisplayCss from './file-display.css?inline';

interface SelectedSignal {
  name: string;
  ref: number;
  canvas: HTMLCanvasElement;
}

export class FileDisplay extends HTMLElement {
  private _filename: string = '';
  private selectedSignals: SelectedSignal[] = [];
  private signalsContainer: HTMLDivElement | null = null;
  private boundHandleSignalSelect: (event: Event) => void;
  private visibleStart: number = 0;
  private visibleEnd: number = 1000000;
  private timeRangeInitialized: boolean = false;
  private fullRangeStart: number = 0;
  private fullRangeEnd: number = 1000000;
  private timelineCanvas: HTMLCanvasElement | null = null;
  private scrollbar: HTMLInputElement | null = null;
  private scrollbarContainer: HTMLDivElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.boundHandleSignalSelect = this.handleSignalSelect.bind(this);

    this.shadowRoot!.adoptedStyleSheets = [scrollbarSheet, css(fileDisplayCss)];
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
  }

  disconnectedCallback() {
    document.removeEventListener('signal-select', this.boundHandleSignalSelect);
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
    this.render();

    // Paint the signal after the canvas is properly sized in the DOM
    this.setupAndPaintCanvas(canvas, ref);
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
        this.fullRangeStart = changes[0].time;
        this.fullRangeEnd = changes[changes.length - 1].time;
        this.visibleStart = this.fullRangeStart;
        this.visibleEnd = this.fullRangeEnd;
        this.timeRangeInitialized = true;
        this.drawTimeline();
        this.updateScrollbar();
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
    
    // Update UI elements
    this.drawTimeline();
    this.updateScrollbar();
    
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

  /**
   * Gets the full time range of all signals.
   * @returns Object with start and end times of the full range
   */
  public getFullRange(): { start: number; end: number } {
    return {
      start: this.fullRangeStart,
      end: this.fullRangeEnd
    };
  }

  /**
   * Zoom in by a given factor, centered on the middle of the visible range.
   * @param factor - The zoom factor (e.g., 2.0 means zoom in by 2x)
   */
  public async zoomIn(factor: number = 2.0): Promise<void> {
    const currentRange = this.visibleEnd - this.visibleStart;
    const newRange = currentRange / factor;
    const center = (this.visibleStart + this.visibleEnd) / 2;
    
    const newStart = center - newRange / 2;
    const newEnd = center + newRange / 2;
    
    await this.setVisibleRange(newStart, newEnd);
  }

  /**
   * Zoom out by a given factor, centered on the middle of the visible range.
   * @param factor - The zoom factor (e.g., 2.0 means zoom out by 2x)
   */
  public async zoomOut(factor: number = 2.0): Promise<void> {
    const currentRange = this.visibleEnd - this.visibleStart;
    const newRange = currentRange * factor;
    const center = (this.visibleStart + this.visibleEnd) / 2;
    
    let newStart = center - newRange / 2;
    let newEnd = center + newRange / 2;
    
    // Clamp to full range
    if (newStart < this.fullRangeStart) {
      newStart = this.fullRangeStart;
    }
    if (newEnd > this.fullRangeEnd) {
      newEnd = this.fullRangeEnd;
    }
    
    // If we've reached the full range, just show it all
    if (newStart <= this.fullRangeStart && newEnd >= this.fullRangeEnd) {
      await this.zoomAll();
      return;
    }
    
    await this.setVisibleRange(newStart, newEnd);
  }

  /**
   * Zoom to show the full time range of all signals.
   */
  public async zoomAll(): Promise<void> {
    await this.setVisibleRange(this.fullRangeStart, this.fullRangeEnd);
  }

  /**
   * Format a time value for display (in nanoseconds).
   */
  private formatTime(time: number): string {
    // Format time in appropriate units
    if (time < 1000) {
      return `${time.toFixed(0)} ns`;
    } else if (time < 1000000) {
      return `${(time / 1000).toFixed(2)} µs`;
    } else if (time < 1000000000) {
      return `${(time / 1000000).toFixed(2)} ms`;
    } else {
      return `${(time / 1000000000).toFixed(2)} s`;
    }
  }

  /**
   * Calculate nice tick intervals for the timeline.
   */
  private calculateTickInterval(range: number): { interval: number; unit: string; divisor: number } {
    // Define nice intervals in nanoseconds with their units
    const intervals = [
      { value: 1, unit: 'ns', divisor: 1 },
      { value: 2, unit: 'ns', divisor: 1 },
      { value: 5, unit: 'ns', divisor: 1 },
      { value: 10, unit: 'ns', divisor: 1 },
      { value: 20, unit: 'ns', divisor: 1 },
      { value: 50, unit: 'ns', divisor: 1 },
      { value: 100, unit: 'ns', divisor: 1 },
      { value: 200, unit: 'ns', divisor: 1 },
      { value: 500, unit: 'ns', divisor: 1 },
      { value: 1000, unit: 'µs', divisor: 1000 },
      { value: 2000, unit: 'µs', divisor: 1000 },
      { value: 5000, unit: 'µs', divisor: 1000 },
      { value: 10000, unit: 'µs', divisor: 1000 },
      { value: 20000, unit: 'µs', divisor: 1000 },
      { value: 50000, unit: 'µs', divisor: 1000 },
      { value: 100000, unit: 'µs', divisor: 1000 },
      { value: 200000, unit: 'µs', divisor: 1000 },
      { value: 500000, unit: 'µs', divisor: 1000 },
      { value: 1000000, unit: 'ms', divisor: 1000000 },
      { value: 2000000, unit: 'ms', divisor: 1000000 },
      { value: 5000000, unit: 'ms', divisor: 1000000 },
      { value: 10000000, unit: 'ms', divisor: 1000000 },
      { value: 20000000, unit: 'ms', divisor: 1000000 },
      { value: 50000000, unit: 'ms', divisor: 1000000 },
      { value: 100000000, unit: 'ms', divisor: 1000000 },
      { value: 200000000, unit: 'ms', divisor: 1000000 },
      { value: 500000000, unit: 'ms', divisor: 1000000 },
      { value: 1000000000, unit: 's', divisor: 1000000000 },
      { value: 2000000000, unit: 's', divisor: 1000000000 },
      { value: 5000000000, unit: 's', divisor: 1000000000 },
      { value: 10000000000, unit: 's', divisor: 1000000000 },
    ];

    // Aim for roughly 5-10 major ticks
    const targetTicks = 7;
    const targetInterval = range / targetTicks;

    // Find the closest nice interval
    for (let i = 0; i < intervals.length; i++) {
      if (intervals[i].value >= targetInterval) {
        return { interval: intervals[i].value, unit: intervals[i].unit, divisor: intervals[i].divisor };
      }
    }

    // Fallback to largest interval
    return intervals[intervals.length - 1];
  }

  /**
   * Draw the timeline with ticks and labels.
   */
  private drawTimeline(): void {
    if (!this.timelineCanvas) return;

    const canvas = this.timelineCanvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match display size
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Set styles
    ctx.fillStyle = getComputedStyle(canvas).color || '#000';
    ctx.strokeStyle = getComputedStyle(canvas).color || '#000';
    ctx.font = '11px monospace';

    const range = this.visibleEnd - this.visibleStart;
    const { interval, unit, divisor } = this.calculateTickInterval(range);

    // Draw horizontal line
    const lineY = height - 20;
    ctx.beginPath();
    ctx.moveTo(0, lineY);
    ctx.lineTo(width, lineY);
    ctx.lineWidth = 1;
    ctx.stroke();

    // Calculate first tick position
    const firstTick = Math.ceil(this.visibleStart / interval) * interval;

    // Draw ticks and labels
    for (let time = firstTick; time <= this.visibleEnd; time += interval) {
      const x = ((time - this.visibleStart) / range) * width;

      // Draw tick
      ctx.beginPath();
      ctx.moveTo(x, lineY);
      ctx.lineTo(x, lineY + 5);
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw label
      const decimalPlaces = unit === 'ns' ? 0 : 2; // Use 2 decimals for µs, ms, s; no decimals for ns
      const label = (time / divisor).toFixed(decimalPlaces);
      const text = `${label} ${unit}`;
      const textWidth = ctx.measureText(text).width;
      ctx.fillText(text, x - textWidth / 2, lineY - 5);
    }

    // Draw minor ticks (5 subdivisions between major ticks)
    const minorInterval = interval / 5;
    const relativeEpsilon = interval * 0.01; // Use 1% of interval as epsilon for floating-point comparison
    for (let time = Math.ceil(this.visibleStart / minorInterval) * minorInterval; time <= this.visibleEnd; time += minorInterval) {
      // Skip major ticks using relative epsilon
      if (Math.abs(time % interval) < relativeEpsilon) continue;

      const x = ((time - this.visibleStart) / range) * width;

      // Draw smaller tick
      ctx.beginPath();
      ctx.moveTo(x, lineY);
      ctx.lineTo(x, lineY + 3);
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }

  /**
   * Update scrollbar position and visibility based on current range.
   */
  private updateScrollbar(): void {
    if (!this.scrollbar || !this.scrollbarContainer) return;
    
    const fullRange = this.fullRangeEnd - this.fullRangeStart;
    const visibleRange = this.visibleEnd - this.visibleStart;
    
    // Hide scrollbar if showing full range
    const isFullRange = Math.abs(this.visibleStart - this.fullRangeStart) < 0.01 * fullRange &&
                        Math.abs(this.visibleEnd - this.fullRangeEnd) < 0.01 * fullRange;
    
    if (isFullRange) {
      this.scrollbarContainer.style.display = 'none';
    } else {
      this.scrollbarContainer.style.display = 'block';
      
      // Calculate scrollbar position (0-100)
      const position = ((this.visibleStart - this.fullRangeStart) / (fullRange - visibleRange)) * 100;
      this.scrollbar.value = position.toString();
    }
  }

  /**
   * Handle scrollbar input.
   */
  private handleScrollbarInput = (event: Event): void => {
    const target = event.target as HTMLInputElement;
    const position = parseFloat(target.value);
    
    const fullRange = this.fullRangeEnd - this.fullRangeStart;
    const visibleRange = this.visibleEnd - this.visibleStart;
    
    // Calculate new start based on scrollbar position
    const newStart = this.fullRangeStart + (position / 100) * (fullRange - visibleRange);
    const newEnd = newStart + visibleRange;
    
    this.setVisibleRange(newStart, newEnd);
  };

  private render() {
    if (!this.shadowRoot) return;

    this.shadowRoot.innerHTML = `
      <div class="file-header">
        Current File: <strong>${this._filename}</strong>
      </div>
      <div class="scrollbar-container" id="scrollbar-container">
        <input type="range" class="scrollbar" id="scrollbar" min="0" max="100" step="0.1" value="0" />
      </div>
      <div class="signals-container" id="signals-container">
        ${this.selectedSignals.length === 0
          ? '<div class="empty-message">Select signals from the left panel to display them here</div>'
          : ''}
      </div>
    `;

    // Get references to elements
    this.scrollbarContainer = this.shadowRoot.querySelector('#scrollbar-container');
    this.scrollbar = this.shadowRoot.querySelector('#scrollbar');
    
    // Add scrollbar event listener
    if (this.scrollbar) {
      this.scrollbar.addEventListener('input', this.handleScrollbarInput);
    }
    
    // Update scrollbar
    this.updateScrollbar();

    // Append signals to the container
    this.signalsContainer = this.shadowRoot.querySelector('#signals-container');
    if (this.signalsContainer) {
      // Add timeline as first item if there are signals
      if (this.selectedSignals.length > 0) {
        const timelineItem = document.createElement('div');
        timelineItem.className = 'signal-item timeline-item';

        const timelineName = document.createElement('div');
        timelineName.className = 'signal-name';
        timelineName.textContent = 'Timeline';

        this.timelineCanvas = document.createElement('canvas');
        this.timelineCanvas.className = 'timeline-canvas';

        timelineItem.appendChild(timelineName);
        timelineItem.appendChild(this.timelineCanvas);

        this.signalsContainer.appendChild(timelineItem);

        // Draw timeline
        this.drawTimeline();
      }

      // Append signal canvases
      this.selectedSignals.forEach(signal => {
        const signalItem = document.createElement('div');
        signalItem.className = 'signal-item';

        const signalName = document.createElement('div');
        signalName.className = 'signal-name';
        signalName.textContent = signal.name;

        signalItem.appendChild(signalName);
        signalItem.appendChild(signal.canvas);

        this.signalsContainer!.appendChild(signalItem);
      });
    }
  }
}

if (!customElements.get('file-display')) {
  customElements.define('file-display', FileDisplay);
}
