// Settings page component

import { settingsRegister, SettingMetadata, SettingValue } from '../settings/settings-register.js';
import { getSetting, setSetting } from '../settings/settings-storage.js';

export class SettingsPage extends HTMLElement {
    private isVisible: boolean = false;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this.loadSettings();
    }

    async loadSettings() {
        const grouped = settingsRegister.getGrouped();
        
        for (const [category, settings] of grouped) {
            for (const setting of settings) {
                try {
                    const value = await getSetting(setting.path);
                    const actualValue = value !== undefined ? value : setting.defaultValue;
                    this.updateInputValue(setting.path, actualValue);
                } catch (e) {
                    console.error(`Failed to load setting ${setting.path}:`, e);
                }
            }
        }
    }

    updateInputValue(path: string, value: SettingValue | undefined) {
        const input = this.shadowRoot?.querySelector(`[data-path="${path}"]`) as HTMLInputElement | HTMLSelectElement;
        if (!input) return;

        if (input.type === 'checkbox') {
            (input as HTMLInputElement).checked = !!value;
        } else {
            input.value = value?.toString() || '';
        }
    }

    async handleSettingChange(path: string, value: SettingValue, metadata: SettingMetadata) {
        try {
            // Convert value based on type
            let convertedValue = value;
            if (metadata.type === 'number') {
                convertedValue = parseFloat(value);
            } else if (metadata.type === 'boolean') {
                convertedValue = value === true || value === 'true';
            }

            await setSetting(path, convertedValue);
            
            // Trigger change event for components that might need to react
            this.dispatchEvent(new CustomEvent('setting-changed', {
                bubbles: true,
                composed: true,
                detail: { path, value: convertedValue }
            }));
        } catch (e) {
            console.error(`Failed to save setting ${path}:`, e);
            alert(`Failed to save setting: ${e}`);
        }
    }

    show() {
        this.isVisible = true;
        this.style.display = 'flex';
        this.loadSettings();
    }

    hide() {
        this.isVisible = false;
        this.style.display = 'none';
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    renderSetting(setting: SettingMetadata): string {
        const { path, description, type } = setting;
        const id = path.replace(/\//g, '-');

        switch (type) {
            case 'enum':
                return `
                    <div class="setting-row">
                        <label for="${id}">
                            <div class="setting-label">${path.split('/').pop()}</div>
                            <div class="setting-description">${description}</div>
                        </label>
                        <select id="${id}" data-path="${path}" class="setting-input">
                            ${setting.options?.map(opt => 
                                `<option value="${opt.value}">${opt.label}</option>`
                            ).join('') || ''}
                        </select>
                    </div>
                `;
            
            case 'boolean':
                return `
                    <div class="setting-row">
                        <label for="${id}">
                            <div class="setting-label">${path.split('/').pop()}</div>
                            <div class="setting-description">${description}</div>
                        </label>
                        <input type="checkbox" id="${id}" data-path="${path}" class="setting-input">
                    </div>
                `;
            
            case 'number':
                return `
                    <div class="setting-row">
                        <label for="${id}">
                            <div class="setting-label">${path.split('/').pop()}</div>
                            <div class="setting-description">${description}</div>
                        </label>
                        <input type="number" id="${id}" data-path="${path}" class="setting-input"
                            ${setting.min !== undefined ? `min="${setting.min}"` : ''}
                            ${setting.max !== undefined ? `max="${setting.max}"` : ''}
                            ${setting.step !== undefined ? `step="${setting.step}"` : ''}>
                    </div>
                `;
            
            case 'string':
            default:
                return `
                    <div class="setting-row">
                        <label for="${id}">
                            <div class="setting-label">${path.split('/').pop()}</div>
                            <div class="setting-description">${description}</div>
                        </label>
                        <input type="text" id="${id}" data-path="${path}" class="setting-input">
                    </div>
                `;
        }
    }

    render() {
        const grouped = settingsRegister.getGrouped();

        this.shadowRoot!.innerHTML = `
            <style>
                :host {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 1000;
                    align-items: center;
                    justify-content: center;
                }

                .settings-dialog {
                    background: var(--color-bg-surface);
                    border: 1px solid var(--color-border);
                    border-radius: 8px;
                    width: 90%;
                    max-width: 700px;
                    max-height: 80vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                }

                .settings-header {
                    padding: 20px;
                    border-bottom: 1px solid var(--color-border);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .settings-title {
                    font-size: 20px;
                    font-weight: 600;
                    color: var(--color-text);
                }

                .close-button {
                    background: transparent;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: var(--color-text);
                    padding: 0;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 4px;
                }

                .close-button:hover {
                    background: var(--color-bg-hover);
                }

                .settings-content {
                    padding: 20px;
                    overflow-y: auto;
                    flex: 1;
                }

                .settings-category {
                    margin-bottom: 30px;
                }

                .category-title {
                    font-size: 16px;
                    font-weight: 600;
                    color: var(--color-text);
                    margin-bottom: 15px;
                    padding-bottom: 8px;
                    border-bottom: 1px solid var(--color-border);
                }

                .setting-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 0;
                    gap: 20px;
                }

                .setting-row label {
                    flex: 1;
                    cursor: pointer;
                }

                .setting-label {
                    font-weight: 500;
                    color: var(--color-text);
                    margin-bottom: 4px;
                }

                .setting-description {
                    font-size: 13px;
                    color: var(--color-text-secondary, #888);
                }

                .setting-input {
                    min-width: 200px;
                    padding: 6px 10px;
                    border: 1px solid var(--color-border);
                    border-radius: 4px;
                    background: var(--color-bg);
                    color: var(--color-text);
                    font-family: inherit;
                    font-size: 14px;
                }

                input[type="checkbox"].setting-input {
                    min-width: auto;
                    width: 20px;
                    height: 20px;
                    cursor: pointer;
                }

                select.setting-input {
                    cursor: pointer;
                }

                .setting-input:focus {
                    outline: 2px solid var(--color-button-border-hover);
                    outline-offset: 1px;
                }
            </style>

            <div class="settings-dialog">
                <div class="settings-header">
                    <div class="settings-title">Settings</div>
                    <button class="close-button" id="close-btn">×</button>
                </div>
                <div class="settings-content">
                    ${Array.from(grouped.entries()).map(([category, settings]) => `
                        <div class="settings-category">
                            <div class="category-title">${category}</div>
                            ${settings.map(setting => this.renderSetting(setting)).join('')}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        // Add event listeners
        const closeBtn = this.shadowRoot!.getElementById('close-btn');
        closeBtn?.addEventListener('click', () => this.hide());

        // Click outside to close
        this.addEventListener('click', (e) => {
            if (e.target === this) {
                this.hide();
            }
        });

        // Add change listeners to all inputs
        const allSettings = settingsRegister.getAll();
        for (const setting of allSettings) {
            const input = this.shadowRoot!.querySelector(`[data-path="${setting.path}"]`) as HTMLInputElement | HTMLSelectElement;
            if (input) {
                if (input.type === 'checkbox') {
                    input.addEventListener('change', () => {
                        this.handleSettingChange(setting.path, (input as HTMLInputElement).checked, setting);
                    });
                } else {
                    input.addEventListener('change', () => {
                        this.handleSettingChange(setting.path, input.value, setting);
                    });
                }
            }
        }
    }
}

if (!customElements.get('settings-page')) {
    customElements.define('settings-page', SettingsPage);
}
