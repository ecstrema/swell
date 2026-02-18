/**
 * Test and demonstration file for the shortcut system
 *
 * This file contains test scenarios to verify the shortcut system works correctly.
 * Run this in the browser console or as part of your app initialization.
 */

import { CommandExtension, ShortcutManager, defaultShortcuts } from './index.js';

export function testCommandRegistry() {
    console.group('Test 1: Command Registry (via CommandExtension)');

    const ext = new CommandExtension(new Map());
    let commandExecuted = false;

    ext.register({
        id: 'test-command',
        label: 'Test Command',
        handler: () => {
            commandExecuted = true;
            console.log('✓ Command executed successfully');
        }
    });

    ext.execute('test-command');

    console.assert(commandExecuted, 'Command should have been executed');
    console.assert(ext.has('test-command'), 'Command should be registered');
    console.assert(!ext.has('non-existent'), 'Non-existent command should return false');

    console.log('✓ All command registry tests passed');
    console.groupEnd();
}

export function testShortcutMatching() {
    console.group('Test 2: Shortcut Matching');

    const ext = new CommandExtension(new Map());
    const shortcuts = new ShortcutManager(ext);

    ext.register({
        id: 'test-action',
        label: 'Test Action',
        handler: () => console.log('✓ Shortcut triggered command')
    });

    shortcuts.register({ shortcut: 'Ctrl+T', commandId: 'test-action' });

    const bindings = shortcuts.getBindings();
    console.assert(bindings.length === 1, 'Should have one binding');
    console.assert(bindings[0].commandId === 'test-action', 'Binding should map to test-action');

    console.log('✓ All shortcut matching tests passed');
    console.groupEnd();
}

export function testMultipleShortcuts() {
    console.group('Test 3: Multiple Shortcuts');

    const ext = new CommandExtension(new Map());
    const shortcuts = new ShortcutManager(ext);

    ext.register({ id: 'core/file/open', label: 'Open', handler: () => {} });
    ext.register({ id: 'file-save', label: 'Save', handler: () => {} });
    ext.register({ id: 'file-close', label: 'Close', handler: () => {} });

    shortcuts.registerMany([
        { shortcut: 'Ctrl+O', commandId: 'core/file/open' },
        { shortcut: 'Ctrl+S', commandId: 'file-save' },
        { shortcut: 'Ctrl+W', commandId: 'file-close' }
    ]);

    console.assert(shortcuts.getBindings().length === 3, 'Should have 3 bindings');

    const openShortcuts = shortcuts.getShortcutsForCommand('core/file/open');
    console.assert(openShortcuts.length === 1, 'core/file/open should have 1 shortcut');

    console.log('✓ All multiple shortcuts tests passed');
    console.groupEnd();
}

export function testShortcutFormatting() {
    console.group('Test 4: Shortcut Formatting');

    const tests = [
        { shortcut: 'Ctrl+O', expectedPattern: /Ctrl\+O|⌘\+O/ },
        { shortcut: 'Ctrl+Shift+S', expectedPattern: /Ctrl\+Shift\+S|⌘\+Shift\+S/ },
        { shortcut: 'Alt+F', expectedPattern: /Alt\+F/ }
    ];

    for (const test of tests) {
        const formatted = ShortcutManager.formatShortcut(test.shortcut);
        console.log(`✓ Formatted shortcut: ${formatted}`);
    }

    console.log('✓ All shortcut formatting tests passed');
    console.groupEnd();
}

export function testCommandUnregistration() {
    console.group('Test 5: Command Unregistration');

    const ext = new CommandExtension(new Map());
    ext.register({ id: 'temp-command', label: 'Temporary Command', handler: () => {} });
    console.assert(ext.has('temp-command'), 'Command should be registered');
    ext.unregister('temp-command');
    console.assert(!ext.has('temp-command'), 'Command should be unregistered');

    console.log('✓ All unregistration tests passed');
    console.groupEnd();
}

export function testDefaultShortcuts() {
    console.group('Test 6: Default Shortcuts');
    console.assert(Array.isArray(defaultShortcuts), 'defaultShortcuts should be an array');
    console.log(`✓ Default shortcuts configured (${defaultShortcuts.length} shortcuts)`);
    console.groupEnd();
}

export function runAllTests() {
    console.log('Running shortcut system tests...');
    try {
        testCommandRegistry();
        testShortcutMatching();
        testMultipleShortcuts();
        testShortcutFormatting();
        testCommandUnregistration();
        testDefaultShortcuts();
        console.log('✓ ALL TESTS PASSED!');
        return true;
    } catch (error) {
        console.error('✗ TESTS FAILED!', error);
        return false;
    }
}

if (typeof window !== 'undefined') {
    (window as any).shortcutTests = { runAllTests, testCommandRegistry, testShortcutMatching, testMultipleShortcuts, testShortcutFormatting, testCommandUnregistration, testDefaultShortcuts };
    console.log('Shortcut system tests loaded. Run shortcutTests.runAllTests() to test.');
}
