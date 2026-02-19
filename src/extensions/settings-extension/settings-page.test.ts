// Tests for settings page component

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SettingsPage } from './settings-page';
import { settingsRegister } from './settings-register';

// Mock backend before importing
vi.mock('../../backend/index.js', () => ({
    isTauri: false,
    invoke: vi.fn()
}));

vi.mock('../../../backend/pkg/backend', () => ({
    default: vi.fn()
}));

vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn()
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
    open: vi.fn()
}));

// Mock localStorage for testing
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value;
        },
        clear: () => {
            store = {};
        }
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
});

describe('SettingsPage', () => {
    let settingsPage: SettingsPage;

    beforeEach(() => {
        localStorageMock.clear();
        settingsPage = new SettingsPage();
        document.body.appendChild(settingsPage);
    });

    it('should create settings page element', () => {
        expect(settingsPage).toBeInstanceOf(SettingsPage);
        expect(settingsPage.shadowRoot).not.toBeNull();
    });

    it('should render settings container with sidebar and content', () => {
        const container = settingsPage.shadowRoot!.querySelector('.settings-container');
        expect(container).not.toBeNull();

        const sidebar = settingsPage.shadowRoot!.querySelector('.settings-sidebar');
        expect(sidebar).not.toBeNull();

        const content = settingsPage.shadowRoot!.querySelector('.settings-content');
        expect(content).not.toBeNull();
    });

    it('should render tree view in sidebar', () => {
        const treeContainer = settingsPage.shadowRoot!.querySelector('#settings-tree');
        expect(treeContainer).not.toBeNull();

        const treeView = treeContainer!.querySelector('tree-view');
        expect(treeView).not.toBeNull();
    });

    it('should generate tree data from settings', () => {
        const treeData = settingsPage.generateTreeData();

        expect(treeData.length).toBeGreaterThan(0);

        // Check that categories exist
        const categories = treeData.map(node => node.name);
        expect(categories).toContain('Application');
        expect(categories).toContain('Interface');

        // Check that each category has children (settings)
        treeData.forEach(category => {
            expect(category.children).toBeDefined();
            expect(category.children!.length).toBeGreaterThan(0);
        });
    });

    it('should render settings categories', () => {
        const categories = settingsPage.shadowRoot!.querySelectorAll('.settings-category');
        expect(categories.length).toBeGreaterThan(0);
    });

    it('should render category titles', () => {
        const categoryTitles = settingsPage.shadowRoot!.querySelectorAll('.category-title');
        expect(categoryTitles.length).toBeGreaterThan(0);

        const titles = Array.from(categoryTitles).map(el => el.textContent?.trim());
        expect(titles).toContain('Application');
        expect(titles).toContain('Interface');
    });

    it('should scroll to setting when tree item is clicked', async () => {
        // Create a spy for scrollIntoView
        const scrollIntoViewMock = vi.fn();
        Element.prototype.scrollIntoView = scrollIntoViewMock;

        const settingPath = 'Application/Color Theme';
        settingsPage.scrollToSetting(settingPath);

        // scrollIntoView should be called
        expect(scrollIntoViewMock).toHaveBeenCalled();
    });

    it('should add highlight class when scrolling to setting', async () => {
        vi.useFakeTimers();

        const settingPath = 'Application/Color Theme';
        const settingId = settingPath.replace(/\//g, '-');
        const settingElement = settingsPage.shadowRoot!.getElementById(settingId);

        expect(settingElement).not.toBeNull();
        const settingRow = settingElement!.closest('.setting-row');
        expect(settingRow).not.toBeNull();

        settingsPage.scrollToSetting(settingPath);

        // Check that highlight class is added
        expect(settingRow?.classList.contains('highlight')).toBe(true);

        // Fast-forward time by 1 second
        vi.advanceTimersByTime(1000);

        // Check that highlight class is removed after timeout
        expect(settingRow?.classList.contains('highlight')).toBe(false);

        vi.useRealTimers();
    });

    it('should have tree data with correct structure', () => {
        const treeData = settingsPage.generateTreeData();

        treeData.forEach(categoryNode => {
            // Check category node structure
            expect(categoryNode.name).toBeDefined();
            expect(categoryNode.id).toContain('category-');
            expect(categoryNode.children).toBeDefined();

            // Check children (setting) nodes
            categoryNode.children!.forEach(settingNode => {
                expect(settingNode.name).toBeDefined();
                expect(settingNode.id).toBeDefined();
                expect(settingNode.children).toBeUndefined();
            });
        });
    });

    it('should map setting paths correctly in tree data', () => {
        const treeData = settingsPage.generateTreeData();
        const allSettings = settingsRegister.getAll();

        // Flatten all setting IDs from tree
        const treeSettingIds = treeData.flatMap(category =>
            category.children?.map(child => child.id) || []
        );

        // Check that all registered settings are in the tree
        allSettings.forEach(setting => {
            expect(treeSettingIds).toContain(setting.path);
        });
    });

    it('should show filter input in tree view', () => {
        const treeView = settingsPage.shadowRoot!.querySelector('tree-view');
        expect(treeView).not.toBeNull();

        // Check that the tree view has filter enabled
        const filterInputEl = treeView!.shadowRoot!.querySelector('filter-input');
        expect(filterInputEl).not.toBeNull();

        const filterContainer = treeView!.shadowRoot!.querySelector('#filter-container');
        expect(filterContainer).not.toBeNull();

        // Filter container should be visible (display: block)
        const computedStyle = window.getComputedStyle(filterContainer as Element);
        expect(computedStyle.display).not.toBe('none');
    });
});
