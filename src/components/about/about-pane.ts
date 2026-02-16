import { css } from "../../utils/css-utils.js";
import aboutPaneCss from "./about-pane.css?inline";
import { formatTimeAgo, formatDateTime } from "../../utils/time-utils.js";
import GithubIcon from '~icons/mdi/github?raw';

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
                                <span class="icon">${GithubIcon}</span>
                                ecstrema/swell
                            </a>
                        </span>
                    </div>
                </div>
                
                <div class="dependencies-section">
                    <p class="appreciation">
                        This work wouldn't be possible without these amazing open source projects:
                    </p>
                    
                    <details class="dependencies-details" open>
                        <summary>Libraries & Tools Used</summary>
                        <div class="dependencies-list">
                            <div class="dependency-item">
                                <a href="https://github.com/ekiwi/wellen" 
                                   target="_blank" 
                                   rel="noopener noreferrer"
                                   class="dependency-link">
                                    <span class="icon">${GithubIcon}</span>
                                    <span class="dependency-info">
                                        <strong>wellen</strong>
                                        <span class="dependency-desc">Waveform parsing library (VCD, FST, GHW)</span>
                                    </span>
                                </a>
                            </div>
                            
                            <div class="dependency-item">
                                <a href="https://github.com/ekiwi/shosho" 
                                   target="_blank" 
                                   rel="noopener noreferrer"
                                   class="dependency-link">
                                    <span class="icon">${GithubIcon}</span>
                                    <span class="dependency-info">
                                        <strong>ShoSho</strong>
                                        <span class="dependency-desc">Canvas-based waveform rendering library</span>
                                    </span>
                                </a>
                            </div>
                            
                            <div class="dependency-item">
                                <a href="https://github.com/tauri-apps/tauri" 
                                   target="_blank" 
                                   rel="noopener noreferrer"
                                   class="dependency-link">
                                    <span class="icon">${GithubIcon}</span>
                                    <span class="dependency-info">
                                        <strong>Tauri</strong>
                                        <span class="dependency-desc">Cross-platform desktop app framework</span>
                                    </span>
                                </a>
                            </div>
                            
                            <div class="dependency-item">
                                <a href="https://github.com/oven-sh/bun" 
                                   target="_blank" 
                                   rel="noopener noreferrer"
                                   class="dependency-link">
                                    <span class="icon">${GithubIcon}</span>
                                    <span class="dependency-info">
                                        <strong>Bun</strong>
                                        <span class="dependency-desc">Fast JavaScript runtime and toolkit</span>
                                    </span>
                                </a>
                            </div>
                            
                            <div class="dependency-item">
                                <a href="https://github.com/rustwasm/wasm-pack" 
                                   target="_blank" 
                                   rel="noopener noreferrer"
                                   class="dependency-link">
                                    <span class="icon">${GithubIcon}</span>
                                    <span class="dependency-info">
                                        <strong>wasm-pack</strong>
                                        <span class="dependency-desc">Build tool for Rust + WebAssembly</span>
                                    </span>
                                </a>
                            </div>
                            
                            <div class="dependency-item">
                                <a href="https://github.com/vitejs/vite" 
                                   target="_blank" 
                                   rel="noopener noreferrer"
                                   class="dependency-link">
                                    <span class="icon">${GithubIcon}</span>
                                    <span class="dependency-info">
                                        <strong>Vite</strong>
                                        <span class="dependency-desc">Next generation frontend build tool</span>
                                    </span>
                                </a>
                            </div>
                            
                            <div class="dependency-item">
                                <a href="https://github.com/rustwasm/wasm-bindgen" 
                                   target="_blank" 
                                   rel="noopener noreferrer"
                                   class="dependency-link">
                                    <span class="icon">${GithubIcon}</span>
                                    <span class="dependency-info">
                                        <strong>wasm-bindgen</strong>
                                        <span class="dependency-desc">Bindings between Rust and JavaScript</span>
                                    </span>
                                </a>
                            </div>
                        </div>
                    </details>
                </div>
            </div>
        `;
    }
}

customElements.define('about-pane', AboutPane);
