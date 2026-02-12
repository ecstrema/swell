// Settings page component

import { settingsRegister, SettingMetadata, SettingValue } from '../settings/settings-register.js';
import { getSetting, setSetting } from '../settings/settings-storage.js';
import { css } from '../utils/css-utils.js';
import { scrollbarSheet } from '../styles/shared-sheets.js';
import settingsCss from './settings-page.css?inline';

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
                convertedValue = parseFloat(value as string);
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

        this.shadowRoot!.adoptedStyleSheets = [scrollbarSheet, css(settingsCss)];

        this.shadowRoot!.innerHTML = `
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
