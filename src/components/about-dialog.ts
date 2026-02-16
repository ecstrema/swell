import { css } from "../utils/css-utils.js";
import aboutDialogCss from "./about-dialog.css?inline";
import { formatTimeAgo, formatDateTime } from "../utils/time-utils.js";

export class AboutDialog extends HTMLElement {
    private dialog: HTMLDialogElement | null = null;

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
            <dialog>
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
                </div>
                <div class="dialog-footer">
                    <button class="close-btn">Close</button>
                </div>
            </dialog>
        `;
        this.dialog = this.shadowRoot!.querySelector('dialog');
    }

    private setupEventListeners() {
        if (!this.dialog) return;

        // Close button
        const closeBtn = this.shadowRoot!.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.close();
            });
        }

        // Handle ESC key (built-in to <dialog>)
        this.dialog.addEventListener('cancel', (e) => {
            e.preventDefault();
            this.close();
        });

        // Handle backdrop click
        this.dialog.addEventListener('click', (e) => {
            const rect = this.dialog!.getBoundingClientRect();
            const isInDialog = (
                rect.top <= e.clientY &&
                e.clientY <= rect.top + rect.height &&
                rect.left <= e.clientX &&
                e.clientX <= rect.left + rect.width
            );
            if (!isInDialog) {
                this.close();
            }
        });
    }

    open() {
        if (this.dialog) {
            this.dialog.showModal();
        }
    }

    close() {
        if (this.dialog) {
            this.dialog.close();
        }
    }

    toggle() {
        if (this.dialog && this.dialog.open) {
            this.close();
        } else {
            this.open();
        }
    }
}

customElements.define('about-dialog', AboutDialog);
