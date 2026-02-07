import { getSignalChanges, SignalChange } from '../backend.js';

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

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.boundHandleSignalSelect = this.handleSignalSelect.bind(this);
    this.render();
  }

  set filename(val: string) {
    this._filename = val;
    this.render();
  }

  get filename(): string {
    return this._filename;
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
    const { name, ref } = customEvent.detail;
    
    // Check if signal is already selected
    if (this.selectedSignals.some(s => s.ref === ref)) {
      return;
    }

    // Create a new canvas for this signal
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 100;
    
    this.selectedSignals.push({ name, ref, canvas });
    this.render();
    
    // Load and paint the signal
    this.paintSignal(canvas, ref);
  }

  private parseSignalValue(value: string): number {
    // Try to parse as binary first, then decimal, default to 0
    const binaryValue = parseInt(value, 2);
    if (!isNaN(binaryValue)) return binaryValue;
    
    const decimalValue = parseInt(value, 10);
    if (!isNaN(decimalValue)) return decimalValue;
    
    return 0;
  }

  private async paintSignal(canvas: HTMLCanvasElement, signalRef: number) {
    if (!this._filename) return;

    try {
      // Fetch signal changes (using a reasonable time range)
      // For now, we'll use 0 to 1000000 as a default range
      const changes = await getSignalChanges(this._filename, signalRef, 0, 1000000);
      
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

  private render() {
    if (!this.shadowRoot) return;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
            display: block;
            padding: 2rem;
            color: var(--color-text);
            background-color: var(--color-bg-surface);
            overflow-y: auto;
        }
        .file-header {
            margin-bottom: 1rem;
            font-size: 0.9em;
            color: var(--color-text-muted);
        }
        .signals-container {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        .signal-item {
            border: 1px solid var(--color-border);
            border-radius: 4px;
            padding: 1rem;
            background-color: var(--color-bg);
        }
        .signal-name {
            margin-bottom: 0.5rem;
            font-weight: bold;
            font-family: monospace;
        }
        canvas {
            width: 100%;
            height: 100px;
            border: 1px solid var(--color-border);
            border-radius: 2px;
        }
        .empty-message {
            color: var(--color-text-muted);
            font-style: italic;
            text-align: center;
            margin-top: 2rem;
        }
      </style>
      <div class="file-header">
        Current File: <strong>${this._filename}</strong>
      </div>
      <div class="signals-container" id="signals-container">
        ${this.selectedSignals.length === 0 
          ? '<div class="empty-message">Select signals from the left panel to display them here</div>' 
          : ''}
      </div>
    `;

    // Append canvases to the container
    this.signalsContainer = this.shadowRoot.querySelector('#signals-container');
    if (this.signalsContainer) {
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
