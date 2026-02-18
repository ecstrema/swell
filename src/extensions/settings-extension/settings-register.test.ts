// Tests for settings register callback functionality

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettingsRegister, SettingValue } from './settings-register';

describe('SettingsRegister Callbacks', () => {
    let register: SettingsRegister;

    beforeEach(() => {
        register = new SettingsRegister();
        // Register a test setting
        register.register({
            path: 'Test/Setting1',
            description: 'A test setting',
            type: 'string',
            defaultValue: 'default'
        });
    });

    it('should register and trigger callbacks', () => {
        const callback = vi.fn();
        register.onChange('Test/Setting1', callback);

        register.triggerCallbacks('Test/Setting1', 'new-value');

        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith('new-value');
    });

    it('should support multiple callbacks for the same setting', () => {
        const callback1 = vi.fn();
        const callback2 = vi.fn();

        register.onChange('Test/Setting1', callback1);
        register.onChange('Test/Setting1', callback2);

        register.triggerCallbacks('Test/Setting1', 'value');

        expect(callback1).toHaveBeenCalledWith('value');
        expect(callback2).toHaveBeenCalledWith('value');
    });

    it('should return an unsubscribe function', () => {
        const callback = vi.fn();
        const unsubscribe = register.onChange('Test/Setting1', callback);

        register.triggerCallbacks('Test/Setting1', 'first');
        expect(callback).toHaveBeenCalledTimes(1);

        unsubscribe();

        register.triggerCallbacks('Test/Setting1', 'second');
        expect(callback).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('should not trigger callbacks for different setting paths', () => {
        const callback = vi.fn();
        register.onChange('Test/Setting1', callback);

        register.triggerCallbacks('Test/Other', 'value');

        expect(callback).not.toHaveBeenCalled();
    });

    it('should handle callbacks for non-existent settings gracefully', () => {
        const callback = vi.fn();

        // Register callback for a setting that doesn't exist yet
        register.onChange('NonExistent/Setting', callback);

        // Should not throw
        expect(() => {
            register.triggerCallbacks('NonExistent/Setting', 'value');
        }).not.toThrow();

        expect(callback).toHaveBeenCalledWith('value');
    });

    it('should allow re-registering the same callback after unsubscribe', () => {
        const callback = vi.fn();
        const unsubscribe = register.onChange('Test/Setting1', callback);

        unsubscribe();

        register.onChange('Test/Setting1', callback);

        register.triggerCallbacks('Test/Setting1', 'value');

        expect(callback).toHaveBeenCalledTimes(1);
    });
});
