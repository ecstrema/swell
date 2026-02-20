import { css } from '../../../../utils/css-utils.js';
import { setupCanvasForHighDPI } from '../../../../utils/canvas-utils.js';
import timelineCss from './timeline.css?inline';

/**
 * Timeline component that displays a time axis with tick marks and labels.
 * Supports zoom and pan functionality for waveform navigation.
 */
export class Timeline extends HTMLElement {
  private _startTime: number = 0;
  private _endTime: number = 1000000;
  private _totalStartTime: number = 0;
  private _totalEndTime: number = 1000000;
  private canvas: HTMLCanvasElement | null = null;
  private boundHandleResize: () => void;
  private boundHandleWheel: (e: WheelEvent) => void;
  private boundHandleThemeChanged: (event: Event) => void;
  private resizeObserver: ResizeObserver | null = null;
  private dragStartX: number | null = null;
  private dragCurrentX: number | null = null;
  private isDragging: boolean = false;
  private boundHandleMouseDown: (e: MouseEvent) => void;
  private boundHandleMouseMove: (e: MouseEvent) => void;
  private boundHandleMouseUp: (e: MouseEvent) => void;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [css(timelineCss)];
    this.boundHandleResize = this.handleResize.bind(this);
    this.boundHandleWheel = this.handleWheel.bind(this);
    this.boundHandleThemeChanged = this.handleThemeChanged.bind(this);
    this.boundHandleMouseDown = this.handleMouseDown.bind(this);
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandleMouseUp = this.handleMouseUp.bind(this);
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();

    // Listen for theme changes
    window.addEventListener('theme-changed', this.boundHandleThemeChanged);
  }

  disconnectedCallback() {
    this.removeEventListeners();

    // Remove theme change listener
    window.removeEventListener('theme-changed', this.boundHandleThemeChanged);

    // Reset drag state if component is disconnected while dragging
    if (this.isDragging) {
      window.removeEventListener('mousemove', this.boundHandleMouseMove);
      window.removeEventListener('mouseup', this.boundHandleMouseUp);
      this.isDragging = false;
      this.dragStartX = null;
      this.dragCurrentX = null;
    }

    // Clean up ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  /**
   * Set the visible time range
   */
  set visibleRange(range: { start: number; end: number }) {
    this._startTime = range.start;
    this._endTime = range.end;
    this.updateCanvas();
  }

  /**
   * Get the visible time range
   */
  get visibleRange(): { start: number; end: number } {
    return { start: this._startTime, end: this._endTime };
  }

  /**
   * Set the total time range (entire waveform)
   */
  set totalRange(range: { start: number; end: number }) {
    this._totalStartTime = range.start;
    this._totalEndTime = range.end;
    this.updateCanvas();
  }

  /**
   * Get the total time range
   */
  get totalRange(): { start: number; end: number } {
    return { start: this._totalStartTime, end: this._totalEndTime };
  }

  /**
   * Zoom in by a factor (default 2x)
   */
  zoomIn(factor: number = 2): void {
    const currentRange = this._endTime - this._startTime;

    // Prevent zooming if range is invalid or too small
    if (currentRange <= 0) {
      console.warn('Cannot zoom: invalid time range');
      return;
    }

    const newRange = currentRange / factor;

    // Set minimum zoom range to 1 nanosecond
    if (newRange < 1) {
      console.warn('Cannot zoom in further: minimum zoom reached');
      return;
    }

    const center = (this._startTime + this._endTime) / 2;

    let newStart = center - newRange / 2;
    let newEnd = center + newRange / 2;

    // Clamp to total range
    if (newStart < this._totalStartTime) {
      newStart = this._totalStartTime;
      newEnd = newStart + newRange;
    }
    if (newEnd > this._totalEndTime) {
      newEnd = this._totalEndTime;
      newStart = newEnd - newRange;
    }

    // Validate final range
    if (newStart >= newEnd) {
      console.warn('Cannot zoom: would create invalid range');
      return;
    }

    this.setVisibleRange(newStart, newEnd);
  }

  /**
   * Zoom out by a factor (default 2x)
   */
  zoomOut(factor: number = 2): void {
    const currentRange = this._endTime - this._startTime;

    // Prevent zooming if range is invalid
    if (currentRange <= 0) {
      console.warn('Cannot zoom: invalid time range');
      return;
    }

    const totalRange = this._totalEndTime - this._totalStartTime;
    const newRange = Math.min(currentRange * factor, totalRange);
    const center = (this._startTime + this._endTime) / 2;

    let newStart = center - newRange / 2;
    let newEnd = center + newRange / 2;

    // Clamp to total range
    if (newStart < this._totalStartTime) {
      newStart = this._totalStartTime;
      newEnd = newStart + newRange;
    }
    if (newEnd > this._totalEndTime) {
      newEnd = this._totalEndTime;
      newStart = newEnd - newRange;
    }

    // Validate final range
    if (newStart >= newEnd) {
      console.warn('Cannot zoom: would create invalid range');
      return;
    }

    this.setVisibleRange(newStart, newEnd);
  }

  /**
   * Zoom to fit the entire waveform
   */
  zoomToFit(): void {
    this.setVisibleRange(this._totalStartTime, this._totalEndTime);
  }

  /**
   * Pan (shift) the visible range left or right
   * @param direction - Negative to pan left (earlier in time), positive to pan right (later in time)
   * @param factor - Multiplier for pan distance (default 0.1 = 10% of visible range)
   */
  pan(direction: number, factor: number = 0.1): void {
    const currentRange = this._endTime - this._startTime;

    // Prevent panning if range is invalid
    if (currentRange <= 0) {
      console.warn('Cannot pan: invalid time range');
      return;
    }

    // Calculate pan distance based on visible range
    const panDistance = currentRange * factor * Math.sign(direction);

    let newStart = this._startTime + panDistance;
    let newEnd = this._endTime + panDistance;

    // Clamp to total range
    if (newStart < this._totalStartTime) {
      newStart = this._totalStartTime;
      newEnd = newStart + currentRange;
    }
    if (newEnd > this._totalEndTime) {
      newEnd = this._totalEndTime;
      newStart = newEnd - currentRange;
    }

    // Validate final range
    if (newStart >= newEnd) {
      console.warn('Cannot pan: would create invalid range');
      return;
    }

    this.setVisibleRange(newStart, newEnd);
  }

  /**
   * Set visible range and dispatch event
   */
  private setVisibleRange(start: number, end: number): void {
    this._startTime = start;
    this._endTime = end;
    this.updateCanvas();

    // Dispatch event for other components to listen to
    this.dispatchEvent(new CustomEvent('range-changed', {
      detail: { start, end },
      bubbles: true,
      composed: true
    }));
  }

  private render() {
    this.shadowRoot!.innerHTML = `
      <div class="timeline-container">
        <canvas class="timeline-canvas"></canvas>
      </div>
    `;

    this.canvas = this.shadowRoot!.querySelector('.timeline-canvas');

    if (this.canvas) {
      // Set canvas size to match container with high-DPI support
      requestAnimationFrame(() => {
        if (this.canvas) {
          const rect = this.canvas.getBoundingClientRect();
          setupCanvasForHighDPI(this.canvas, rect.width, rect.height);
          this.updateCanvas();
        }
      });
    }
  }

  private setupEventListeners() {
    // Canvas wheel zoom
    if (this.canvas) {
      this.canvas.addEventListener('wheel', this.boundHandleWheel);
      this.canvas.addEventListener('mousedown', this.boundHandleMouseDown);
    }

    // Window resize
    window.addEventListener('resize', this.boundHandleResize);

    // Set up ResizeObserver to watch for container size changes
    // This handles dock resizing and other layout changes
    this.resizeObserver = new ResizeObserver(() => {
      this.handleResize();
    });

    // Observe the timeline element itself for size changes
    this.resizeObserver.observe(this);
  }

  private removeEventListeners() {
    // Remove canvas listeners
    if (this.canvas) {
      this.canvas.removeEventListener('wheel', this.boundHandleWheel);
      this.canvas.removeEventListener('mousedown', this.boundHandleMouseDown);
    }

    // Remove window listeners
    window.removeEventListener('resize', this.boundHandleResize);
  }

  private handleWheel(e: WheelEvent) {
    e.preventDefault();

    // Check if Ctrl key is pressed (or Cmd on Mac)
    if (e.ctrlKey || e.metaKey) {
      // Ctrl+Wheel: Zoom in/out
      if (e.deltaY < 0) {
        this.zoomIn(1.2);
      } else {
        this.zoomOut(1.2);
      }
    } else {
      // Plain Wheel: Pan left/right (horizontal scroll)
      // deltaY > 0 means scroll down/right, < 0 means scroll up/left
      // We'll pan in the direction of the scroll
      this.pan(e.deltaY, 0.1);
    }
  }

  private handleResize() {
    this.resize();
  }

  /**
   * Public method to manually trigger a resize and redraw of the timeline canvas.
   * Can be called by parent components when they detect a resize event.
   */
  public resize() {
    if (this.canvas) {
      const rect = this.canvas.getBoundingClientRect();
      setupCanvasForHighDPI(this.canvas, rect.width, rect.height);
      this.updateCanvas();
    }
  }

  private handleThemeChanged(event: Event) {
    // Repaint the canvas when theme changes
    this.updateCanvas();
  }

  private handleMouseDown(e: MouseEvent) {
    if (!this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    this.dragStartX = e.clientX - rect.left;
    this.dragCurrentX = this.dragStartX;
    this.isDragging = true;

    // Add window-level listeners for drag
    window.addEventListener('mousemove', this.boundHandleMouseMove);
    window.addEventListener('mouseup', this.boundHandleMouseUp);

    this.updateCanvas();
  }

  private handleMouseMove(e: MouseEvent) {
    if (!this.isDragging || !this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    this.dragCurrentX = e.clientX - rect.left;

    // Clamp to canvas bounds
    this.dragCurrentX = Math.max(0, Math.min(this.dragCurrentX, rect.width));

    this.updateCanvas();
  }

  private handleMouseUp(e: MouseEvent) {
    if (!this.isDragging || !this.canvas || this.dragStartX === null) return;

    const rect = this.canvas.getBoundingClientRect();
    const dragEndX = e.clientX - rect.left;

    // Remove window-level listeners
    window.removeEventListener('mousemove', this.boundHandleMouseMove);
    window.removeEventListener('mouseup', this.boundHandleMouseUp);

    // Calculate time range from drag
    const width = rect.width;
    const timeRange = this._endTime - this._startTime;

    const startX = Math.min(this.dragStartX, dragEndX);
    const endX = Math.max(this.dragStartX, dragEndX);

    // Only zoom if drag is significant (more than 5 pixels)
    if (Math.abs(endX - startX) > 5) {
      const startTime = this._startTime + (startX / width) * timeRange;
      const endTime = this._startTime + (endX / width) * timeRange;

      this.setVisibleRange(startTime, endTime);
    }

    // Reset drag state
    this.isDragging = false;
    this.dragStartX = null;
    this.dragCurrentX = null;

    this.updateCanvas();
  }

  private updateCanvas() {
    if (!this.canvas) return;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    // Use CSS pixel dimensions for drawing calculations
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;

    // Clear canvas
    ctx.fillStyle = getComputedStyle(this).getPropertyValue('--color-bg') || '#1e1e1e';
    ctx.fillRect(0, 0, width, height);

    // Draw time axis
    ctx.strokeStyle = getComputedStyle(this).getPropertyValue('--color-border') || '#444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height - 1);
    ctx.lineTo(width, height - 1);
    ctx.stroke();

    // Calculate tick spacing
    const timeRange = this._endTime - this._startTime;
    const pixelsPerTime = width / timeRange;

    // Determine appropriate tick interval
    const minTickSpacing = 80; // pixels
    const targetNumTicks = width / minTickSpacing;
    const roughInterval = timeRange / targetNumTicks;

    // Round to nice number
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughInterval)));
    const normalizedInterval = roughInterval / magnitude;
    let niceInterval;
    if (normalizedInterval <= 1) niceInterval = magnitude;
    else if (normalizedInterval <= 2) niceInterval = 2 * magnitude;
    else if (normalizedInterval <= 5) niceInterval = 5 * magnitude;
    else niceInterval = 10 * magnitude;

    // Draw ticks and labels
    ctx.fillStyle = getComputedStyle(this).getPropertyValue('--color-text') || '#fff';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';

    const firstTick = Math.ceil(this._startTime / niceInterval) * niceInterval;
    for (let time = firstTick; time <= this._endTime; time += niceInterval) {
      const x = ((time - this._startTime) / timeRange) * width;

      // Draw tick mark
      ctx.beginPath();
      ctx.moveTo(x, height - 1);
      ctx.lineTo(x, height - 10);
      ctx.stroke();

      // Draw label
      const label = this.formatTime(time);
      ctx.fillText(label, x, height - 15);
    }

    // Draw selection overlay if dragging
    if (this.isDragging && this.dragStartX !== null && this.dragCurrentX !== null) {
      const startX = Math.min(this.dragStartX, this.dragCurrentX);
      const endX = Math.max(this.dragStartX, this.dragCurrentX);
      const selectionWidth = endX - startX;

      // Draw semi-transparent selection rectangle
      ctx.fillStyle = 'rgba(100, 150, 255, 0.2)';
      ctx.fillRect(startX, 0, selectionWidth, height);

      // Draw selection borders
      ctx.strokeStyle = 'rgba(100, 150, 255, 0.8)';
      ctx.lineWidth = 1;
      ctx.strokeRect(startX, 0, selectionWidth, height);
    }
  }

  /**
   * Format time value for display
   */
  private formatTime(time: number): string {
    // Determine appropriate unit based on magnitude
    if (time >= 1e9) {
      // Seconds
      return (time / 1e9).toFixed(2) + 's';
    } else if (time >= 1e6) {
      // Milliseconds
      return (time / 1e6).toFixed(2) + 'ms';
    } else if (time >= 1e3) {
      // Microseconds
      return (time / 1e3).toFixed(2) + 'μs';
    } else if (time >= 1) {
      // Nanoseconds
      return time.toFixed(0) + 'ns';
    } else {
      // Picoseconds (values less than 1 nanosecond)
      return (time * 1000).toFixed(2) + 'ps';
    }
  }
}

if (!customElements.get('timeline-view')) {
  customElements.define('timeline-view', Timeline);
}
