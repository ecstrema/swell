import { css } from '../utils/css-utils.js';
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
  private scrollbarThumb: HTMLElement | null = null;
  private zoomInBtn: HTMLElement | null = null;
  private zoomOutBtn: HTMLElement | null = null;
  private zoomFitBtn: HTMLElement | null = null;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartScrollLeft = 0;
  private boundHandleResize: () => void;
  private boundHandleScrollbarMouseDown: (e: MouseEvent) => void;
  private boundHandleScrollbarMouseMove: (e: MouseEvent) => void;
  private boundHandleScrollbarMouseUp: () => void;
  private boundHandleWheel: (e: WheelEvent) => void;
  private boundZoomIn: () => void;
  private boundZoomOut: () => void;
  private boundZoomToFit: () => void;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [css(timelineCss)];
    this.boundHandleResize = this.handleResize.bind(this);
    this.boundHandleScrollbarMouseDown = this.handleScrollbarMouseDown.bind(this);
    this.boundHandleScrollbarMouseMove = this.handleScrollbarMouseMove.bind(this);
    this.boundHandleScrollbarMouseUp = this.handleScrollbarMouseUp.bind(this);
    this.boundHandleWheel = this.handleWheel.bind(this);
    this.boundZoomIn = () => this.zoomIn();
    this.boundZoomOut = () => this.zoomOut();
    this.boundZoomToFit = () => this.zoomToFit();
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  disconnectedCallback() {
    this.removeEventListeners();
    
    // Clean up ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    
    // Clean up document-level listeners in case they're still active
    if (this.isDragging) {
      document.removeEventListener('mousemove', this.boundHandleScrollbarMouseMove);
      document.removeEventListener('mouseup', this.boundHandleScrollbarMouseUp);
      this.isDragging = false;
    }
  }

  /**
   * Set the visible time range
   */
  set visibleRange(range: { start: number; end: number }) {
    this._startTime = range.start;
    this._endTime = range.end;
    this.updateCanvas();
    this.updateScrollbar();
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
    this.updateScrollbar();
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
   * Set visible range and dispatch event
   */
  private setVisibleRange(start: number, end: number): void {
    this._startTime = start;
    this._endTime = end;
    this.updateCanvas();
    this.updateScrollbar();
    
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
        <div class="timeline-controls">
          <button id="zoom-in-btn" title="Zoom In">+</button>
          <button id="zoom-out-btn" title="Zoom Out">−</button>
          <button id="zoom-fit-btn" title="Zoom to Fit">⟷</button>
        </div>
        <div class="timeline-wrapper">
          <canvas class="timeline-canvas"></canvas>
          <div class="scrollbar">
            <div class="scrollbar-track">
              <div class="scrollbar-thumb"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.canvas = this.shadowRoot!.querySelector('.timeline-canvas');
    this.scrollbarThumb = this.shadowRoot!.querySelector('.scrollbar-thumb');
    
    if (this.canvas) {
      // Set canvas size to match container
      requestAnimationFrame(() => {
        if (this.canvas) {
          const rect = this.canvas.getBoundingClientRect();
          this.canvas.width = rect.width;
          this.canvas.height = rect.height;
          this.updateCanvas();
        }
      });
    }
  }

  private setupEventListeners() {
    // Zoom buttons
    this.zoomInBtn = this.shadowRoot!.querySelector('#zoom-in-btn');
    this.zoomOutBtn = this.shadowRoot!.querySelector('#zoom-out-btn');
    this.zoomFitBtn = this.shadowRoot!.querySelector('#zoom-fit-btn');
    
    this.zoomInBtn?.addEventListener('click', this.boundZoomIn);
    this.zoomOutBtn?.addEventListener('click', this.boundZoomOut);
    this.zoomFitBtn?.addEventListener('click', this.boundZoomToFit);
    
    // Scrollbar dragging
    if (this.scrollbarThumb) {
      this.scrollbarThumb.addEventListener('mousedown', this.boundHandleScrollbarMouseDown);
    }
    
    // Canvas wheel zoom
    if (this.canvas) {
      this.canvas.addEventListener('wheel', this.boundHandleWheel);
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
    // Remove zoom button listeners
    this.zoomInBtn?.removeEventListener('click', this.boundZoomIn);
    this.zoomOutBtn?.removeEventListener('click', this.boundZoomOut);
    this.zoomFitBtn?.removeEventListener('click', this.boundZoomToFit);
    
    // Remove scrollbar listeners
    if (this.scrollbarThumb) {
      this.scrollbarThumb.removeEventListener('mousedown', this.boundHandleScrollbarMouseDown);
    }
    
    // Remove canvas listeners
    if (this.canvas) {
      this.canvas.removeEventListener('wheel', this.boundHandleWheel);
    }
    
    // Remove window listeners
    window.removeEventListener('resize', this.boundHandleResize);
  }

  private handleScrollbarMouseDown(e: MouseEvent) {
    e.preventDefault();
    this.isDragging = true;
    this.dragStartX = e.clientX;
    const thumbRect = this.scrollbarThumb!.getBoundingClientRect();
    this.dragStartScrollLeft = thumbRect.left;
    
    document.addEventListener('mousemove', this.boundHandleScrollbarMouseMove);
    document.addEventListener('mouseup', this.boundHandleScrollbarMouseUp);
  }

  private handleScrollbarMouseMove(e: MouseEvent) {
    if (!this.isDragging) return;
    
    const track = this.shadowRoot!.querySelector('.scrollbar-track') as HTMLElement;
    if (!track) return;
    
    const trackRect = track.getBoundingClientRect();
    const thumbRect = this.scrollbarThumb!.getBoundingClientRect();
    const deltaX = e.clientX - this.dragStartX;
    const newLeft = this.dragStartScrollLeft + deltaX - trackRect.left;
    
    // Calculate new scroll position as percentage
    const maxLeft = trackRect.width - thumbRect.width;
    const percentage = Math.max(0, Math.min(1, newLeft / maxLeft));
    
    // Calculate new visible range
    const totalRange = this._totalEndTime - this._totalStartTime;
    const visibleRange = this._endTime - this._startTime;
    const maxStart = this._totalEndTime - visibleRange;
    const newStart = this._totalStartTime + (maxStart - this._totalStartTime) * percentage;
    
    this.setVisibleRange(newStart, newStart + visibleRange);
  }

  private handleScrollbarMouseUp() {
    this.isDragging = false;
    document.removeEventListener('mousemove', this.boundHandleScrollbarMouseMove);
    document.removeEventListener('mouseup', this.boundHandleScrollbarMouseUp);
  }

  private handleWheel(e: WheelEvent) {
    e.preventDefault();
    
    if (e.deltaY < 0) {
      // Zoom in
      this.zoomIn(1.2);
    } else {
      // Zoom out
      this.zoomOut(1.2);
    }
  }

  private handleResize() {
    if (this.canvas) {
      const rect = this.canvas.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
      this.updateCanvas();
    }
  }

  private updateCanvas() {
    if (!this.canvas) return;
    
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    
    const width = this.canvas.width;
    const height = this.canvas.height;
    
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
  }

  private updateScrollbar() {
    if (!this.scrollbarThumb) return;
    
    const totalRange = this._totalEndTime - this._totalStartTime;
    const visibleRange = this._endTime - this._startTime;
    
    // Calculate thumb width as percentage of visible range
    const thumbWidth = Math.max(20, (visibleRange / totalRange) * 100);
    this.scrollbarThumb.style.width = thumbWidth + '%';
    
    // Calculate thumb position
    const scrollableRange = totalRange - visibleRange;
    const scrollPosition = scrollableRange > 0 
      ? ((this._startTime - this._totalStartTime) / scrollableRange) * (100 - thumbWidth)
      : 0;
    this.scrollbarThumb.style.left = scrollPosition + '%';
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
