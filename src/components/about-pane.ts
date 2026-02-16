import { css } from "../utils/css-utils.js";
import aboutPaneCss from "./about-pane.css?inline";
import { formatTimeAgo, formatDateTime } from "../utils/time-utils.js";

export class AboutPane extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot!.adoptedStyleSheets = [css(aboutPaneCss)];
    }

    connectedCallback() {
        this.render();
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
            <div class="about-container">
                <div class="about-header">
                    <h1 class="about-title">Swell</h1>
                    <p class="about-version">Version ${version}</p>
                </div>
                <div class="about-content">
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
            </div>
        `;
    }
}

customElements.define('about-pane', AboutPane);
