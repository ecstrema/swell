import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Store } from './persisted-store';

vi.mock('../backend/index.js', () => ({ isTauri: false }));

describe('persisted-store (web / localStorage)', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('stores and retrieves values', async () => {
        const s = new Store('test-store');
        if (typeof (s as any).init === 'function') await (s as any).init();
        await s.set('a', 1);
        expect(await s.get('a')).toBe(1);
        expect(await s.has('a')).toBe(true);
        expect(await s.length()).toBe(1);

        await s.set('b', { x: 2 });
        const keys = await s.keys();
        expect(keys.sort()).toEqual(['a', 'b'].sort());

        const entries = await s.entries();
        expect(entries.find(([k]) => k === 'b')![1]).toEqual({ x: 2 });
    });

    it('persists across instances (localStorage backing)', async () => {
        const s1 = new Store('persist-me');
        if (typeof (s1 as any).init === 'function') await (s1 as any).init();
        await s1.set('k', 'v');

        const s2 = new Store('persist-me');
        if (typeof (s2 as any).init === 'function') await (s2 as any).init();
        expect(await s2.get('k')).toBe('v');
    });

    it('delete / clear behave correctly and fire callbacks', async () => {
        const s = new Store('cb-store');
        if (typeof (s as any).init === 'function') await (s as any).init();
        const changeSpy = vi.fn();
        const keySpy = vi.fn();
        s.onChange(changeSpy);
        s.onKeyChange('x', keySpy);

        await s.set('x', 10);
        expect(keySpy).toHaveBeenCalledWith(10);
        expect(changeSpy).toHaveBeenCalled();

        await s.delete('x');
        expect(await s.get('x')).toBeUndefined();

        await s.set('a', 1);
        await s.clear();
        expect(await s.length()).toBe(0);
    });
});
