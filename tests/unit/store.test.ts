import { afterEach, describe, expect, test, vi } from 'vitest';

import { THEME_KEY } from '../../src/lib/constants';
import { loadTheme, saveTheme } from '../../src/lib/store';

const CANONICAL_PAYLOADS = [
    { raw: '{"theme":"dark"}', theme: 'dark' },
    { raw: '{"theme":"light"}', theme: 'light' },
] as const;

const INVALID_PAYLOADS = [
    { label: 'is malformed json', raw: '{"theme":' },
    { label: 'stores a bare boolean', raw: 'true' },
    { label: 'stores a bare number', raw: '7' },
    { label: 'stores a bare theme string', raw: '"dark"' },
    { label: 'stores a boolean theme', raw: '{"theme":true}' },
    { label: 'stores a json null', raw: 'null' },
    { label: 'stores an object without a theme', raw: '{}' },
    { label: 'stores an unrecognized theme', raw: '{"theme":"purple"}' },
    { label: 'stores an uppercase theme', raw: '{"theme":"DARK"}' },
    { label: 'stores the theme inside an array', raw: '["dark"]' },
] as const;

const NONCANONICAL_PAYLOADS = [
    { canonical: '{"theme":"dark"}', label: 'carries an extra property', raw: '{"theme":"dark","x":1}', theme: 'dark' },
    { canonical: '{"theme":"light"}', label: 'is padded with whitespace', raw: '{ "theme": "light" }', theme: 'light' },
] as const;

function buildStorage(seed?: string) {
    const entries = new Map<string, string>();

    if (seed !== undefined) entries.set(THEME_KEY, seed);

    return {
        getItem: vi.fn((key: string) => entries.get(key) ?? null),
        removeItem: vi.fn((key: string) => {
            entries.delete(key);
        }),
        setItem: vi.fn((key: string, value: string) => {
            entries.set(key, value);
        }),
    };
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('loadTheme', () => {
    test('returns null when no theme is stored', () => {
        const storage = buildStorage();

        vi.stubGlobal('localStorage', storage);

        expect(loadTheme()).toBeNull();
        expect(storage.removeItem).not.toHaveBeenCalled();
        expect(storage.setItem).not.toHaveBeenCalled();
    });

    for (const { raw, theme } of CANONICAL_PAYLOADS) {
        test(`returns a stored ${theme} theme without rewriting it`, () => {
            const storage = buildStorage(raw);

            vi.stubGlobal('localStorage', storage);

            expect(loadTheme()).toBe(theme);
            expect(storage.removeItem).not.toHaveBeenCalled();
            expect(storage.setItem).not.toHaveBeenCalled();
        });
    }

    for (const { canonical, label, raw, theme } of NONCANONICAL_PAYLOADS) {
        test(`rewrites a stored payload that ${label} back to canonical json`, () => {
            const storage = buildStorage(raw);

            vi.stubGlobal('localStorage', storage);

            expect(loadTheme()).toBe(theme);
            expect(storage.removeItem).not.toHaveBeenCalled();
            expect(storage.setItem).toHaveBeenCalledExactlyOnceWith(THEME_KEY, canonical);
        });
    }

    test('returns the stored theme even when rewriting it to canonical json throws', () => {
        const storage = buildStorage('{ "theme": "light" }');

        storage.setItem.mockImplementation(() => {
            throw new Error('Denied.');
        });

        vi.stubGlobal('localStorage', storage);

        expect(loadTheme()).toBe('light');
        expect(storage.removeItem).not.toHaveBeenCalled();
        expect(storage.setItem).toHaveBeenCalledExactlyOnceWith(THEME_KEY, '{"theme":"light"}');
    });

    for (const { label, raw } of INVALID_PAYLOADS) {
        test(`clears a stored payload that ${label} and returns null`, () => {
            const storage = buildStorage(raw);

            vi.stubGlobal('localStorage', storage);

            expect(loadTheme()).toBeNull();
            expect(storage.removeItem).toHaveBeenCalledExactlyOnceWith(THEME_KEY);
            expect(storage.setItem).not.toHaveBeenCalled();
        });
    }

    test('returns null when reading storage throws', () => {
        const storage = buildStorage();

        storage.getItem.mockImplementation(() => {
            throw new Error('Denied.');
        });

        vi.stubGlobal('localStorage', storage);

        expect(loadTheme()).toBeNull();
        expect(storage.removeItem).toHaveBeenCalledExactlyOnceWith(THEME_KEY);
    });

    test('returns null when clearing an invalid payload throws', () => {
        const storage = buildStorage('{"theme":"purple"}');

        storage.removeItem.mockImplementation(() => {
            throw new Error('Denied.');
        });

        vi.stubGlobal('localStorage', storage);

        expect(loadTheme()).toBeNull();
    });
});

describe('saveTheme', () => {
    for (const { raw, theme } of CANONICAL_PAYLOADS) {
        test(`writes the ${theme} theme as canonical json`, () => {
            const storage = buildStorage();

            vi.stubGlobal('localStorage', storage);

            saveTheme(theme);

            expect(storage.setItem).toHaveBeenCalledExactlyOnceWith(THEME_KEY, raw);
        });
    }

    test('returns undefined silently when writing storage throws', () => {
        const storage = buildStorage();

        storage.setItem.mockImplementation(() => {
            throw new Error('Denied.');
        });

        vi.stubGlobal('localStorage', storage);

        expect(saveTheme('dark')).toBeUndefined();
    });
});
