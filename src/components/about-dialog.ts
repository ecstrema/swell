import { css } from "../utils/css-utils.js";
import aboutDialogCss from "./about-dialog.css?inline";
import { formatTimeAgo, formatDateTime } from "../utils/time-utils.js";

export class AboutDialog extends HTMLElement {
    private _escapeHandler?: (e: KeyboardEvent) => void;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot!.adoptedStyleSheets = [css(aboutDialogCss)];
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    private render() {
        // Get build commit from environment variable (injected at build time)
        const buildCommit = import.meta.env.VITE_BUILD_COMMIT || 'development';
        const version = import.meta.env.VITE_VERSION || '0.1.0';
        const buildTimestamp = import.meta.env.VITE_BUILD_TIMESTAMP;

        // Calculate time ago text and tooltip
        let buildTimeHtml = '';
        if (buildTimestamp) {
            const timeAgo = formatTimeAgo(buildTimestamp);
            const exactDate = formatDateTime(buildTimestamp);
            buildTimeHtml = `
                <div class="info-row">
                    <span class="info-label">Built:</span>
                    <span class="info-value build-time" title="${exactDate}">${timeAgo}</span>
                </div>
            `;
        }

        this.shadowRoot!.innerHTML = `
            <div class="dialog">
                <div class="dialog-header">
                    <h1 class="dialog-title">Swell</h1>
                    <p class="dialog-version">Version ${version}</p>
                </div>
                <div class="dialog-content">
                    <p>A modern waveform viewer for digital design verification.</p>
                    <div class="info-row">
                        <span class="info-label">Build Commit:</span>
                        <span class="info-value">${buildCommit.substring(0, 8)}</span>
                    </div>
                    ${buildTimeHtml}
                    <div class="info-row">
                        <span class="info-label">GitHub:</span>
                        <span class="info-value">
                            <a href="https://github.com/ecstrema/swell" 
                               class="github-link" 
                               target="_blank" 
                               rel="noopener noreferrer">
                                ecstrema/swell
                            </a>
                        </span>
                    </div>
                    <details class="libraries-section">
                        <summary>Libraries Used</summary>
                        <ul class="libraries-list">
                            <li><a href="https://tauri.app/" target="_blank" rel="noopener noreferrer">Tauri</a> - Desktop application framework</li>
                            <li><a href="https://vite.dev/" target="_blank" rel="noopener noreferrer">Vite</a> - Frontend build tool</li>
                            <li><a href="https://bun.sh/" target="_blank" rel="noopener noreferrer">Bun</a> - JavaScript runtime and package manager</li>
                            <li><a href="https://rustwasm.github.io/wasm-pack/" target="_blank" rel="noopener noreferrer">wasm-pack</a> - Rust to WebAssembly compiler</li>
                            <li><a href="https://github.com/ekiwi/wellen" target="_blank" rel="noopener noreferrer">wellen</a> - Waveform parsing library</li>
                            <li><a href="https://github.com/SalvatorePreviti/shosho" target="_blank" rel="noopener noreferrer">ShoSho</a> - Keyboard shortcuts library</li>
                            <li><a href="https://rustwasm.github.io/wasm-bindgen/" target="_blank" rel="noopener noreferrer">wasm-bindgen</a> - Rust and WebAssembly bindings</li>
                        </ul>
                    </details>
                </div>
                <div class="dialog-footer">
                    <button class="close-btn">Close</button>
                </div>
            </div>
        `;
    }

    private setupEventListeners() {
        // Close dialog when clicking outside
        this.addEventListener('click', (e) => {
            if (e.target === this) {
                this.close();
            }
        });

        // Close button
        const closeBtn = this.shadowRoot!.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.close();
            });
        }

        // Close on Escape key
        this._escapeHandler = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && this.classList.contains('open')) {
                this.close();
            }
        };
        document.addEventListener('keydown', this._escapeHandler);
    }

    disconnectedCallback() {
        // Clean up event listener
        if (this._escapeHandler) {
            document.removeEventListener('keydown', this._escapeHandler);
        }
    }

    open() {
        this.classList.add('open');
    }

    close() {
        this.classList.remove('open');
    }

    toggle() {
        if (this.classList.contains('open')) {
            this.close();
        } else {
            this.open();
        }
    }
}

customElements.define('about-dialog', AboutDialog);
