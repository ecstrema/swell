import { themeManager } from "../theme-manager.js";

export interface Settings {
    defaultZoom: number;
    showGrid: boolean;
    gridSpacing: number;
}

export const DEFAULT_SETTINGS: Settings = {
    defaultZoom: 1.0,
    showGrid: true,
    gridSpacing: 10,
};

export class SettingsPage extends HTMLElement {
    private settings: Settings = { ...DEFAULT_SETTINGS };

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.loadSettings();
        this.render();
    }

    private loadSettings() {
        const saved = localStorage.getItem('swell-settings');
        if (saved) {
            try {
                this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
            } catch (e) {
                console.error('Failed to load settings:', e);
            }
        }
    }

    private saveSettings() {
        localStorage.setItem('swell-settings', JSON.stringify(this.settings));
        this.dispatchEvent(new CustomEvent('settings-changed', {
            bubbles: true,
            composed: true,
            detail: this.settings
        }));
    }

    private handleThemeChange(event: Event) {
        const select = event.target as HTMLSelectElement;
        const theme = select.value as 'light' | 'dark' | 'auto';
        themeManager.setTheme(theme);
        this.render();
    }

    private handleZoomChange(event: Event) {
        const input = event.target as HTMLInputElement;
        this.settings.defaultZoom = parseFloat(input.value);
        this.saveSettings();
        this.render();
    }

    private handleGridToggle(event: Event) {
        const input = event.target as HTMLInputElement;
        this.settings.showGrid = input.checked;
        this.saveSettings();
        this.render();
    }

    private handleGridSpacingChange(event: Event) {
        const input = event.target as HTMLInputElement;
        this.settings.gridSpacing = parseInt(input.value);
        this.saveSettings();
        this.render();
    }

    render() {
        if (this.shadowRoot) {
            this.shadowRoot.innerHTML = `
                <style>
                    :host {
                        display: block;
                        padding: 2rem;
                        color: var(--color-text);
                        font-family: var(--font-family, sans-serif);
                        max-width: 800px;
                    }
                    h1 {
                        font-size: 2rem;
                        margin-bottom: 2rem;
                        color: var(--color-text);
                    }
                    .settings-section {
                        margin-bottom: 2rem;
                        padding: 1.5rem;
                        background-color: var(--color-bg-surface);
                        border: 1px solid var(--color-border);
                        border-radius: 8px;
                    }
                    .settings-section h2 {
                        font-size: 1.25rem;
                        margin-top: 0;
                        margin-bottom: 1rem;
                        color: var(--color-text);
                    }
                    .setting-item {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        margin-bottom: 1rem;
                        padding: 0.5rem 0;
                    }
                    .setting-item:last-child {
                        margin-bottom: 0;
                    }
                    .setting-label {
                        flex: 1;
                        font-weight: 500;
                    }
                    .setting-description {
                        flex: 1;
                        font-size: 0.875rem;
                        color: var(--color-text-muted);
                        margin-top: 0.25rem;
                    }
                    .setting-control {
                        flex: 0 0 auto;
                        min-width: 200px;
                        text-align: right;
                    }
                    select {
                        padding: 0.5rem;
                        border: 1px solid var(--color-border);
                        border-radius: 4px;
                        background-color: var(--color-bg-surface);
                        color: var(--color-text);
                        font-family: inherit;
                        font-size: 0.875rem;
                        min-width: 150px;
                    }
                    input[type="number"],
                    input[type="range"] {
                        padding: 0.5rem;
                        border: 1px solid var(--color-border);
                        border-radius: 4px;
                        background-color: var(--color-bg-surface);
                        color: var(--color-text);
                        font-family: inherit;
                        font-size: 0.875rem;
                    }
                    input[type="range"] {
                        width: 150px;
                        margin-right: 0.5rem;
                    }
                    input[type="checkbox"] {
                        width: 20px;
                        height: 20px;
                        cursor: pointer;
                    }
                    .value-display {
                        display: inline-block;
                        min-width: 50px;
                        font-weight: 500;
                        color: var(--color-primary);
                    }
                    .setting-group {
                        display: flex;
                        flex-direction: column;
                        align-items: flex-start;
                        flex: 1;
                    }
                </style>

                <h1>Settings</h1>

                <div class="settings-section">
                    <h2>Appearance</h2>
                    <div class="setting-item">
                        <div class="setting-group">
                            <div class="setting-label">Theme</div>
                            <div class="setting-description">Choose the application theme</div>
                        </div>
                        <div class="setting-control">
                            <select id="theme-select">
                                <option value="auto" ${themeManager.getTheme() === 'auto' ? 'selected' : ''}>Auto (System)</option>
                                <option value="light" ${themeManager.getTheme() === 'light' ? 'selected' : ''}>Light</option>
                                <option value="dark" ${themeManager.getTheme() === 'dark' ? 'selected' : ''}>Dark</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="settings-section">
                    <h2>Waveform Display</h2>
                    <div class="setting-item">
                        <div class="setting-group">
                            <div class="setting-label">Default Zoom Level</div>
                            <div class="setting-description">Set the default zoom level for waveform display</div>
                        </div>
                        <div class="setting-control">
                            <input type="range" id="zoom-slider" min="0.1" max="5.0" step="0.1" value="${this.settings.defaultZoom}">
                            <span class="value-display">${this.settings.defaultZoom.toFixed(1)}x</span>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-group">
                            <div class="setting-label">Show Grid</div>
                            <div class="setting-description">Display grid lines in waveform view</div>
                        </div>
                        <div class="setting-control">
                            <input type="checkbox" id="grid-toggle" ${this.settings.showGrid ? 'checked' : ''}>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-group">
                            <div class="setting-label">Grid Spacing</div>
                            <div class="setting-description">Distance between grid lines (in pixels)</div>
                        </div>
                        <div class="setting-control">
                            <input type="range" id="grid-spacing-slider" min="5" max="50" step="5" value="${this.settings.gridSpacing}" ${!this.settings.showGrid ? 'disabled' : ''}>
                            <span class="value-display">${this.settings.gridSpacing}px</span>
                        </div>
                    </div>
                </div>
            `;

            // Add event listeners
            const themeSelect = this.shadowRoot.getElementById('theme-select') as HTMLSelectElement;
            if (themeSelect) {
                themeSelect.addEventListener('change', (e) => this.handleThemeChange(e));
            }

            const zoomSlider = this.shadowRoot.getElementById('zoom-slider') as HTMLInputElement;
            if (zoomSlider) {
                zoomSlider.addEventListener('input', (e) => this.handleZoomChange(e));
            }

            const gridToggle = this.shadowRoot.getElementById('grid-toggle') as HTMLInputElement;
            if (gridToggle) {
                gridToggle.addEventListener('change', (e) => this.handleGridToggle(e));
            }

            const gridSpacingSlider = this.shadowRoot.getElementById('grid-spacing-slider') as HTMLInputElement;
            if (gridSpacingSlider) {
                gridSpacingSlider.addEventListener('input', (e) => this.handleGridSpacingChange(e));
            }
        }
    }

    // Public API to get current settings
    getSettings(): Settings {
        return { ...this.settings };
    }
}

if (!customElements.get('settings-page')) {
    customElements.define('settings-page', SettingsPage);
}
