export class FileDisplay extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  set filename(val: string) {
    if (this.shadowRoot) {
      this.shadowRoot.innerHTML = `
        <style>
          :host {
              display: block;
              padding: 2rem;
              color: var(--color-text);
          }
        </style>
        <p>Current File: <strong>${val}</strong></p>
      `;
    }
  }
}

if (!customElements.get('file-display')) {
  customElements.define('file-display', FileDisplay);
}
