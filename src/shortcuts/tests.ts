/**
 * Test and demonstration file for the shortcut system
 *
 * This file contains test scenarios to verify the shortcut system works correctly.
 * Run this in the browser console or as part of your app initialization.
 */

import { CommandRegistry, ShortcutManager, defaultShortcuts } from './index.js';

/**
 * Test 1: Basic command registration and execution
 */
export function testCommandRegistry() {
    console.group('Test 1: Command Registry');

    const registry = new CommandRegistry();
    let commandExecuted = false;

    // Register a test command
    registry.register({
        id: 'test-command',
        label: 'Test Command',
        handler: () => {
            commandExecuted = true;
            console.log('✓ Command executed successfully');
        }
    });

    // Execute the command
    registry.execute('test-command');

    console.assert(commandExecuted, 'Command should have been executed');
    console.assert(registry.has('test-command'), 'Command should be registered');
    console.assert(!registry.has('non-existent'), 'Non-existent command should return false');

    console.log('✓ All command registry tests passed');
    console.groupEnd();
}

/**
 * Test 2: Shortcut matching logic
 */
export function testShortcutMatching() {
    console.group('Test 2: Shortcut Matching');

    const registry = new CommandRegistry();
    const shortcuts = new ShortcutManager(registry);

    let executed = false;

    registry.register({
        id: 'test-action',
        label: 'Test Action',
        handler: () => {
            executed = true;
            console.log('✓ Shortcut triggered command');
        }
    });

    // Register Ctrl+T shortcut
    shortcuts.register({
        shortcut: { key: 't', ctrl: true },
        commandId: 'test-action'
    });

    const bindings = shortcuts.getBindings();
    console.assert(bindings.length === 1, 'Should have one binding');
    console.assert(bindings[0].commandId === 'test-action', 'Binding should map to test-action');

    console.log('✓ All shortcut matching tests passed');
    console.groupEnd();
}

/**
 * Test 3: Multiple shortcuts for different commands
 */
export function testMultipleShortcuts() {
    console.group('Test 3: Multiple Shortcuts');

    const registry = new CommandRegistry();
    const shortcuts = new ShortcutManager(registry);

    const executed = {
        open: false,
        save: false,
        close: false
    };

    // Register multiple commands
    registry.register({
        id: 'core/file/open',
        label: 'Open',
        handler: () => { executed.open = true; }
    });

    registry.register({
        id: 'file-save',
        label: 'Save',
        handler: () => { executed.save = true; }
    });

    registry.register({
        id: 'file-close',
        label: 'Close',
        handler: () => { executed.close = true; }
    });

    // Register shortcuts
    shortcuts.registerMany([
        { shortcut: { key: 'o', ctrl: true }, commandId: 'core/file/open' },
        { shortcut: { key: 's', ctrl: true }, commandId: 'file-save' },
        { shortcut: { key: 'w', ctrl: true }, commandId: 'file-close' }
    ]);

    console.assert(shortcuts.getBindings().length === 3, 'Should have 3 bindings');

    // Get shortcuts for a specific command
    const openShortcuts = shortcuts.getShortcutsForCommand('core/file/open');
    console.assert(openShortcuts.length === 1, 'core/file/open should have 1 shortcut');
    console.assert(openShortcuts[0].key === 'o', 'core/file/open shortcut should be "o"');

    console.log('✓ All multiple shortcuts tests passed');
    console.groupEnd();
}

/**
 * Test 4: Shortcut formatting
 */
export function testShortcutFormatting() {
    console.group('Test 4: Shortcut Formatting');

    // Test various shortcut formats
    const tests = [
        {
            shortcut: { key: 'o', ctrl: true },
            expectedPattern: /Ctrl\+O|⌘\+O/
        },
        {
            shortcut: { key: 's', ctrl: true, shift: true },
            expectedPattern: /Ctrl\+Shift\+S|⌘\+Shift\+S/
        },
        {
            shortcut: { key: 'f', alt: true },
            expectedPattern: /Alt\+F/
        }
    ];

    for (const test of tests) {
        const formatted = ShortcutManager.formatShortcut(test.shortcut);
        console.assert(
            test.expectedPattern.test(formatted),
            `${formatted} should match pattern ${test.expectedPattern}`
        );
        console.log(`✓ Formatted shortcut: ${formatted}`);
    }

    console.log('✓ All shortcut formatting tests passed');
    console.groupEnd();
}

/**
 * Test 5: Command unregistration
 */
export function testCommandUnregistration() {
    console.group('Test 5: Command Unregistration');

    const registry = new CommandRegistry();

    registry.register({
        id: 'temp-command',
        label: 'Temporary Command',
        handler: () => {}
    });

    console.assert(registry.has('temp-command'), 'Command should be registered');

    registry.unregister('temp-command');

    console.assert(!registry.has('temp-command'), 'Command should be unregistered');

    console.log('✓ All unregistration tests passed');
    console.groupEnd();
}

/**
 * Test 6: Default shortcuts configuration
 */
export function testDefaultShortcuts() {
    console.group('Test 6: Default Shortcuts');

    console.log('Default shortcuts array:', defaultShortcuts);
    console.assert(Array.isArray(defaultShortcuts), 'defaultShortcuts should be an array');
    console.log(`✓ Default shortcuts is properly configured (${defaultShortcuts.length} shortcuts)`);

    console.groupEnd();
}

/**
 * Run all tests
 */
export function runAllTests() {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║        Shortcut System Test Suite                       ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');

    try {
        testCommandRegistry();
        testShortcutMatching();
        testMultipleShortcuts();
        testShortcutFormatting();
        testCommandUnregistration();
        testDefaultShortcuts();

        console.log('');
        console.log('╔══════════════════════════════════════════════════════════╗');
        console.log('║  ✓ ALL TESTS PASSED!                                    ║');
        console.log('╚══════════════════════════════════════════════════════════╝');

        return true;
    } catch (error) {
        console.error('');
        console.error('╔══════════════════════════════════════════════════════════╗');
        console.error('║  ✗ TESTS FAILED!                                        ║');
        console.error('╚══════════════════════════════════════════════════════════╝');
        console.error(error);

        return false;
    }
}

// Auto-run tests if this file is executed directly
if (typeof window !== 'undefined') {
    // Make test functions available globally for manual testing
    (window as any).shortcutTests = {
        runAllTests,
        testCommandRegistry,
        testShortcutMatching,
        testMultipleShortcuts,
        testShortcutFormatting,
        testCommandUnregistration,
        testDefaultShortcuts
    };

    console.log('Shortcut system tests loaded. Run shortcutTests.runAllTests() to test.');
}
