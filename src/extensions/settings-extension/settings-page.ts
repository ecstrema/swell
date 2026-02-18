// Settings page component

import { settingsRegister, SettingMetadata, SettingValue } from './settings-register.js';
import { getSetting, setSetting } from './settings-storage.js';
import { css } from '../../utils/css-utils.js';
import { scrollbarSheet } from '../../styles/shared-sheets.js';
import settingsCss from './settings-page.css?inline';
import { TreeView, TreeNode } from '../waveform-file-extension/trees/tree-view.js';

export class SettingsPage extends HTMLElement {
    private static readonly HIGHLIGHT_DURATION_MS = 1000;
    private treeView: TreeView | null = null;

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

    /**
     * Generate tree data from settings categories and individual settings
     */
    generateTreeData(): TreeNode[] {
        const grouped = settingsRegister.getGrouped();
        const treeData: TreeNode[] = [];

        for (const [category, settings] of grouped) {
            const categoryNode: TreeNode = {
                name: category,
                id: `category-${category}`,
                children: settings.map(setting => ({
                    name: setting.path.split('/').pop() || setting.path,
                    id: setting.path,
                    children: undefined
                }))
            };
            treeData.push(categoryNode);
        }

        return treeData;
    }

    /**
     * Scroll to a specific setting in the settings content area
     */
    scrollToSetting(settingPath: string) {
        const settingId = settingPath.replace(/\//g, '-');
        const settingElement = this.shadowRoot!.getElementById(settingId);

        if (settingElement) {
            // Find the setting row that contains this element
            const settingRow = settingElement.closest('.setting-row');
            if (settingRow) {
                settingRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Add a brief highlight effect
                settingRow.classList.add('highlight');
                setTimeout(() => {
                    settingRow.classList.remove('highlight');
                }, SettingsPage.HIGHLIGHT_DURATION_MS);
            }
        }
    }

    render() {
        const grouped = settingsRegister.getGrouped();

        this.shadowRoot!.adoptedStyleSheets = [scrollbarSheet, css(settingsCss)];

        this.shadowRoot!.innerHTML = `
            <div class="settings-container">
                <div class="settings-sidebar">
                    <div id="settings-tree"></div>
                </div>
                <div class="settings-content">
                    ${Array.from(grouped.entries()).map(([category, settings]) => `
                        <div class="settings-category" id="category-${category}">
                            <div class="category-title">${category}</div>
                            ${settings.map(setting => this.renderSetting(setting)).join('')}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        // Create and configure tree view
        this.treeView = new TreeView();
        this.treeView.data = this.generateTreeData();
        this.treeView.config = {
            onLeafClick: (node: TreeNode) => {
                // When a leaf node (individual setting) is clicked, scroll to it
                // TreeNode id is always a string for settings (setting path)
                if (typeof node.id === 'string') {
                    this.scrollToSetting(node.id);
                }
            },
            showFilter: true,
            showCheckboxes: false
        };

        // Add tree view to the sidebar
        const treeContainer = this.shadowRoot!.getElementById('settings-tree');
        if (treeContainer) {
            treeContainer.appendChild(this.treeView);
        }

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
