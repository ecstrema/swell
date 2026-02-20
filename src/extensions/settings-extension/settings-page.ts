// Settings page component

import type { SettingsExtension } from './settings-extension.js';
import { SettingMetadata, SettingsTree, SettingValue } from './types.js';
import { css } from '../../utils/css-utils.js';
import { scrollbarSheet } from '../../styles/shared-sheets.js';
import settingsCss from './settings-page.css?inline';
import { TreeView, TreeNode } from '../waveform-file-extension/trees/tree-view.js';

export class SettingsPage extends HTMLElement {
    private static readonly HIGHLIGHT_DURATION_MS = 1000;
    private treeView: TreeView | null = null;
    private settingsExtension: SettingsExtension;

    constructor(settingsExtension: SettingsExtension) {
        super();
        this.settingsExtension = settingsExtension;
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this.loadSettings();
    }

    async loadSettings() {
        const allSettingsMetadata = this.settingsExtension.getAllMetadata();

        for (const setting of allSettingsMetadata) {
            const value = this.settingsExtension.getValue(setting.id);
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

            this.settingsExtension.setValue(path, convertedValue);
        } catch (e) {
            console.error(`Failed to save setting ${path}:`, e);
            alert(`Failed to save setting: ${e}`);
        }
    }

    renderSetting(setting: SettingMetadata): string {
        const { id: path, description, type } = setting;
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
        const treeData: TreeNode[] = [];
        const settingsTreeData = this.settingsExtension.getSettingsTree();

        const convertToTreeNodes = (node: SettingsTree): TreeNode => {
            if (node.content.length === 0) {
                return { id: node.id, name: node.id, children: [] };
            }

            const children = node.content.map(item => {
                if ('type' in item) {
                    // It's a setting metadata
                    return { id: item.id, name: item.id.split('/').pop() || item.id, children: [] };
                } else {
                    // It's a category
                    return convertToTreeNodes(item);
                }
            });

            return { id: node.id, name: node.id, children };
        };

        for (const child of settingsTreeData.content) {
            treeData.push(convertToTreeNodes(child as SettingsTree));
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
        this.shadowRoot!.adoptedStyleSheets = [scrollbarSheet, css(settingsCss)];

        this.shadowRoot!.innerHTML = `
            <div class="settings-container">
                <div class="settings-sidebar">
                    <div id="settings-tree"></div>
                </div>
                <div class="settings-content">
                </div>
            </div>
        `;

        // Load settings and generate content
        const settingsTree = this.settingsExtension.getSettingsTree();
        const contentContainer = this.shadowRoot!.querySelector('.settings-content');
        if (contentContainer) {
            const renderContent = (node: SettingsTree) => {
                let html = '';
                for (const item of node.content) {
                    if ('type' in item) {
                        // It's a setting metadata
                        html += this.renderSetting(item);
                    } else {
                        // It's a category
                        html += `<div class="settings-category">
                            <div class="category-title">${item.id}</div>
                            ${renderContent(item)}
                        </div>`;
                    }
                }
                return html;
            };
            contentContainer.innerHTML = renderContent(settingsTree);
        }

        // Create and configure tree view
        this.treeView = new TreeView(this.settingsExtension);
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
        };

        // Add tree view to the sidebar
        const treeContainer = this.shadowRoot!.getElementById('settings-tree');
        if (treeContainer) {
            treeContainer.appendChild(this.treeView);
        }

        // Add change listeners to all inputs
        const allSettings = this.settingsExtension.getAllMetadata();
        for (const setting of allSettings) {
            const input = this.shadowRoot!.querySelector(`[data-path="${setting.id}"]`) as HTMLInputElement | HTMLSelectElement;
            if (input) {
                if (input.type === 'checkbox') {
                    input.addEventListener('change', () => {
                        this.handleSettingChange(setting.id, (input as HTMLInputElement).checked, setting);
                    });
                } else {
                    input.addEventListener('change', () => {
                        this.handleSettingChange(setting.id, input.value, setting);
                    });
                }
            }
        }
    }
}

if (!customElements.get('settings-page')) {
    customElements.define('settings-page', SettingsPage);
}
