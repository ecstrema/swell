import { css } from '../../utils/css-utils.js';
import { setupCanvasForHighDPI } from '../../utils/canvas-utils.js';
import minimapCss from './minimap.css?inline';

/**
 * Minimap component that displays the entire timeline range with a scrollbar
 * to navigate the visible range shown in the main timeline.
 */
export class Minimap extends HTMLElement {
  private _startTime: number = 0;
  private _endTime: number = 1000000;
  private _visibleStart: number = 0;
  private _visibleEnd: number = 1000000;
  private canvas: HTMLCanvasElement | null = null;
  private boundHandleResize: () => void;
  private boundHandleCanvasClick: (e: MouseEvent) => void;
  private boundHandleThemeChanged: (event: Event) => void;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [css(minimapCss)];
    this.boundHandleResize = this.handleResize.bind(this);
    this.boundHandleCanvasClick = this.handleCanvasClick.bind(this);
    this.boundHandleThemeChanged = this.handleThemeChanged.bind(this);
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
    
    // Clean up ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  /**
   * Set the total time range (entire waveform) displayed in the minimap
   */
  set totalRange(range: { start: number; end: number }) {
    this._startTime = range.start;
    this._endTime = range.end;
    this.updateCanvas();
  }

  /**
   * Get the total time range
   */
  get totalRange(): { start: number; end: number } {
    return { start: this._startTime, end: this._endTime };
  }

  /**
   * Set the visible time range (what's shown in the main timeline)
   */
  set visibleRange(range: { start: number; end: number }) {
    this._visibleStart = range.start;
    this._visibleEnd = range.end;
    this.updateCanvas();
  }

  /**
   * Get the visible time range
   */
  get visibleRange(): { start: number; end: number } {
    return { start: this._visibleStart, end: this._visibleEnd };
  }

  private render() {
    this.shadowRoot!.innerHTML = `
      <div class="minimap-container">
        <canvas class="minimap-canvas"></canvas>
      </div>
    `;

    this.canvas = this.shadowRoot!.querySelector('.minimap-canvas');
    this.scrollbarThumb = null; // No longer using scrollbar thumb
    
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
    // Canvas click to jump to position
    if (this.canvas) {
      this.canvas.addEventListener('click', this.boundHandleCanvasClick);
    }
    
    // Window resize
    window.addEventListener('resize', this.boundHandleResize);
    
    // Set up ResizeObserver to watch for container size changes
    this.resizeObserver = new ResizeObserver(() => {
      this.handleResize();
    });
    
    // Observe the minimap element itself for size changes
    this.resizeObserver.observe(this);
  }

  private removeEventListeners() {
    // Remove canvas listeners
    if (this.canvas) {
      this.canvas.removeEventListener('click', this.boundHandleCanvasClick);
    }
    
    // Remove window listeners
    window.removeEventListener('resize', this.boundHandleResize);
  }

  // Scrollbar methods removed - no longer needed as per requirements
  // The minimap should not have a separate scrollbar, only the canvas

  private handleCanvasClick(e: MouseEvent) {
    if (!this.canvas) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    
    // Calculate the time at the clicked position
    const totalRange = this._endTime - this._startTime;
    const clickedTime = this._startTime + (totalRange * percentage);
    
    // Center the visible range on the clicked time
    const visibleRange = this._visibleEnd - this._visibleStart;
    let newStart = clickedTime - (visibleRange / 2);
    let newEnd = clickedTime + (visibleRange / 2);
    
    // Clamp to total range
    if (newStart < this._startTime) {
      newStart = this._startTime;
      newEnd = newStart + visibleRange;
    }
    if (newEnd > this._endTime) {
      newEnd = this._endTime;
      newStart = newEnd - visibleRange;
    }
    
    this.setVisibleRange(newStart, newEnd);
  }

  private handleResize() {
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

  private setVisibleRange(start: number, end: number): void {
    this._visibleStart = start;
    this._visibleEnd = end;
    this.updateCanvas();
    
    // Dispatch event for other components (like timeline) to listen to
    this.dispatchEvent(new CustomEvent('range-changed', {
      detail: { start, end },
      bubbles: true,
      composed: true
    }));
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
    
    // Draw visible range highlight
    const totalRange = this._endTime - this._startTime;
    if (totalRange > 0) {
      const visibleStartX = ((this._visibleStart - this._startTime) / totalRange) * width;
      const visibleEndX = ((this._visibleEnd - this._startTime) / totalRange) * width;
      
      ctx.fillStyle = 'rgba(100, 150, 255, 0.2)';
      ctx.fillRect(visibleStartX, 0, visibleEndX - visibleStartX, height);
      
      // Draw visible range borders
      ctx.strokeStyle = 'rgba(100, 150, 255, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(visibleStartX, 0);
      ctx.lineTo(visibleStartX, height);
      ctx.moveTo(visibleEndX, 0);
      ctx.lineTo(visibleEndX, height);
      ctx.stroke();
    }
    
    // Calculate tick spacing for the entire range
    const pixelsPerTime = width / totalRange;
    
    // Determine appropriate tick interval
    const minTickSpacing = 60; // pixels
    const targetNumTicks = width / minTickSpacing;
    const roughInterval = totalRange / targetNumTicks;
    
    // Round to nice number
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughInterval)));
    const normalizedInterval = roughInterval / magnitude;
    let niceInterval;
    if (normalizedInterval <= 1) niceInterval = magnitude;
    else if (normalizedInterval <= 2) niceInterval = 2 * magnitude;
    else if (normalizedInterval <= 5) niceInterval = 5 * magnitude;
    else niceInterval = 10 * magnitude;
    
    // Draw ticks and labels for entire range
    ctx.fillStyle = getComputedStyle(this).getPropertyValue('--color-text-muted') || '#999';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    
    const firstTick = Math.ceil(this._startTime / niceInterval) * niceInterval;
    for (let time = firstTick; time <= this._endTime; time += niceInterval) {
      const x = ((time - this._startTime) / totalRange) * width;
      
      // Draw tick mark
      ctx.strokeStyle = getComputedStyle(this).getPropertyValue('--color-border') || '#444';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, height - 1);
      ctx.lineTo(x, height - 8);
      ctx.stroke();
      
      // Draw label
      const label = this.formatTime(time);
      ctx.fillText(label, x, height - 12);
    }
  }

  // updateScrollbar method removed - no longer needed as per requirements

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

if (!customElements.get('minimap-view')) {
  customElements.define('minimap-view', Minimap);
}
