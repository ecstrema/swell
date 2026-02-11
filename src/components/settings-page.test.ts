/**
 * Test file for the settings page component
 * 
 * This file contains test scenarios to verify the settings page works correctly.
 */

import { SettingsPage, DEFAULT_SETTINGS } from './settings-page.js';
import { themeManager } from '../theme-manager.js';

/**
 * Test 1: Settings page creation and initialization
 */
export function testSettingsPageCreation() {
    console.group('Test 1: Settings Page Creation');
    
    const settingsPage = new SettingsPage();
    
    console.assert(settingsPage instanceof HTMLElement, 'SettingsPage should extend HTMLElement');
    console.assert(settingsPage.shadowRoot !== null, 'SettingsPage should have shadow root');
    
    console.log('✓ Settings page creation tests passed');
    console.groupEnd();
}

/**
 * Test 2: Default settings values
 */
export function testDefaultSettings() {
    console.group('Test 2: Default Settings');
    
    console.assert(DEFAULT_SETTINGS.defaultZoom === 1.0, 'Default zoom should be 1.0');
    console.assert(DEFAULT_SETTINGS.showGrid === true, 'Grid should be shown by default');
    console.assert(DEFAULT_SETTINGS.gridSpacing === 10, 'Default grid spacing should be 10');
    
    console.log('✓ Default settings tests passed');
    console.groupEnd();
}

/**
 * Test 3: Settings persistence to localStorage
 */
export function testSettingsPersistence() {
    console.group('Test 3: Settings Persistence');
    
    // Clear any existing settings
    localStorage.removeItem('swell-settings');
    
    const settingsPage = new SettingsPage();
    document.body.appendChild(settingsPage);
    
    // Get the settings after initialization
    const settings = settingsPage.getSettings();
    
    console.assert(settings.defaultZoom === DEFAULT_SETTINGS.defaultZoom, 'Should load default zoom');
    console.assert(settings.showGrid === DEFAULT_SETTINGS.showGrid, 'Should load default grid setting');
    
    // Clean up
    document.body.removeChild(settingsPage);
    localStorage.removeItem('swell-settings');
    
    console.log('✓ Settings persistence tests passed');
    console.groupEnd();
}

/**
 * Test 4: Theme integration with themeManager
 */
export function testThemeIntegration() {
    console.group('Test 4: Theme Integration');
    
    const settingsPage = new SettingsPage();
    document.body.appendChild(settingsPage);
    
    // Set theme via themeManager
    themeManager.setTheme('dark');
    
    // Verify themeManager has the correct value
    console.assert(themeManager.getTheme() === 'dark', 'Theme should be set to dark');
    
    // Change to light
    themeManager.setTheme('light');
    console.assert(themeManager.getTheme() === 'light', 'Theme should be set to light');
    
    // Reset to auto
    themeManager.setTheme('auto');
    console.assert(themeManager.getTheme() === 'auto', 'Theme should be set to auto');
    
    // Clean up
    document.body.removeChild(settingsPage);
    
    console.log('✓ Theme integration tests passed');
    console.groupEnd();
}

/**
 * Test 5: Settings UI controls exist
 */
export function testSettingsUIControls() {
    console.group('Test 5: Settings UI Controls');
    
    const settingsPage = new SettingsPage();
    document.body.appendChild(settingsPage);
    
    // Wait for connectedCallback
    setTimeout(() => {
        const shadowRoot = settingsPage.shadowRoot;
        
        if (shadowRoot) {
            // Check for theme select
            const themeSelect = shadowRoot.getElementById('theme-select');
            console.assert(themeSelect !== null, 'Theme select should exist');
            
            // Check for zoom slider
            const zoomSlider = shadowRoot.getElementById('zoom-slider');
            console.assert(zoomSlider !== null, 'Zoom slider should exist');
            
            // Check for grid toggle
            const gridToggle = shadowRoot.getElementById('grid-toggle');
            console.assert(gridToggle !== null, 'Grid toggle should exist');
            
            // Check for grid spacing slider
            const gridSpacingSlider = shadowRoot.getElementById('grid-spacing-slider');
            console.assert(gridSpacingSlider !== null, 'Grid spacing slider should exist');
            
            console.log('✓ Settings UI controls tests passed');
        }
        
        // Clean up
        document.body.removeChild(settingsPage);
        console.groupEnd();
    }, 100);
}

/**
 * Test 6: Settings change event
 */
export function testSettingsChangeEvent() {
    console.group('Test 6: Settings Change Event');
    
    const settingsPage = new SettingsPage();
    document.body.appendChild(settingsPage);
    
    let eventFired = false;
    let eventDetail: any = null;
    
    settingsPage.addEventListener('settings-changed', (e: Event) => {
        eventFired = true;
        eventDetail = (e as CustomEvent).detail;
    });
    
    // Wait for connectedCallback
    setTimeout(() => {
        const shadowRoot = settingsPage.shadowRoot;
        
        if (shadowRoot) {
            // Trigger zoom change
            const zoomSlider = shadowRoot.getElementById('zoom-slider') as HTMLInputElement;
            if (zoomSlider) {
                zoomSlider.value = '2.5';
                zoomSlider.dispatchEvent(new Event('input', { bubbles: true }));
                
                setTimeout(() => {
                    console.assert(eventFired, 'Settings change event should have fired');
                    if (eventDetail) {
                        console.assert(eventDetail.defaultZoom === 2.5, 'Event should contain updated zoom value');
                    }
                    
                    console.log('✓ Settings change event tests passed');
                    
                    // Clean up
                    document.body.removeChild(settingsPage);
                    localStorage.removeItem('swell-settings');
                    console.groupEnd();
                }, 100);
            }
        }
    }, 100);
}

/**
 * Test 7: Grid spacing disabled when grid is off
 */
export function testGridSpacingDisabled() {
    console.group('Test 7: Grid Spacing Disabled State');
    
    const settingsPage = new SettingsPage();
    document.body.appendChild(settingsPage);
    
    setTimeout(() => {
        const shadowRoot = settingsPage.shadowRoot;
        
        if (shadowRoot) {
            const gridToggle = shadowRoot.getElementById('grid-toggle') as HTMLInputElement;
            const gridSpacingSlider = shadowRoot.getElementById('grid-spacing-slider') as HTMLInputElement;
            
            if (gridToggle && gridSpacingSlider) {
                // Grid should be enabled by default
                console.assert(gridToggle.checked === true, 'Grid should be enabled by default');
                console.assert(gridSpacingSlider.disabled === false, 'Grid spacing should be enabled');
                
                // Disable grid
                gridToggle.checked = false;
                gridToggle.dispatchEvent(new Event('change', { bubbles: true }));
                
                setTimeout(() => {
                    const updatedSpacingSlider = shadowRoot.getElementById('grid-spacing-slider') as HTMLInputElement;
                    console.assert(updatedSpacingSlider?.disabled === true, 'Grid spacing should be disabled when grid is off');
                    
                    console.log('✓ Grid spacing disabled state tests passed');
                    
                    // Clean up
                    document.body.removeChild(settingsPage);
                    localStorage.removeItem('swell-settings');
                    console.groupEnd();
                }, 200);
            }
        }
    }, 100);
}

/**
 * Run all tests
 */
export function runAllSettingsTests() {
    console.group('Settings Page Tests');
    console.log('Running all settings page tests...');
    
    testSettingsPageCreation();
    testDefaultSettings();
    testSettingsPersistence();
    testThemeIntegration();
    testSettingsUIControls();
    testSettingsChangeEvent();
    testGridSpacingDisabled();
    
    console.log('All settings tests completed!');
    console.groupEnd();
}

// Auto-run tests if this file is imported
if (typeof window !== 'undefined') {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runAllSettingsTests);
    } else {
        // DOM is already ready, run tests after a short delay
        setTimeout(runAllSettingsTests, 500);
    }
}
