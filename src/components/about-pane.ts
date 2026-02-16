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
                </div>
            </div>
        `;
    }
}

customElements.define('about-pane', AboutPane);
