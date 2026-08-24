import { describe, expect, test } from 'vitest';
import { join } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';

import { CLASS_ERROR_LINK, COLOR_SCHEME_QUERIES, REDUCED_MOTION_QUERY, ROUTES, SHELL_PAD, THEME_COLORS, THEME_KEY } from '../../src/lib/constants';

const ALL_CAPS_WORD_PATTERN = /[A-Z]{2,}/;
const CLAMP_PATTERN = /^clamp\(.+\)$/;
const COLOR_CREAM_PATTERN = /--color-cream:\s*light-dark\((#[0-9a-f]{6}),\s*(#[0-9a-f]{6})\)/;
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/;
const SHELL_PAD_PATTERN = /--shell-pad:\s*([^;]+);/;
const THEME_KEY_PATTERN = /^figurezero_[a-z_]+$/;

const globalCss = readFileSync(join(process.cwd(), 'src/global.css'), 'utf-8');
const pageFiles = readdirSync(join(process.cwd(), 'src/pages')).filter(file => file.endsWith('.astro'));

const creamEndpoints = globalCss.match(COLOR_CREAM_PATTERN);
const shellPadValue = globalCss.match(SHELL_PAD_PATTERN)?.[1];

describe('CLASS_ERROR_LINK', () => {
    test('is a non-empty utility string without doubled spaces', () => {
        expect(typeof CLASS_ERROR_LINK).toBe('string');
        expect(CLASS_ERROR_LINK.trim()).not.toBe('');
        expect(CLASS_ERROR_LINK).not.toContain('  ');
    });

    test('expands the hit area through an absolute after pseudo-element', () => {
        expect(CLASS_ERROR_LINK).toContain('after:-inset-4');
        expect(CLASS_ERROR_LINK).toContain('after:absolute');
    });

    test('uppercases through a utility instead of typed all-caps words', () => {
        expect(CLASS_ERROR_LINK).toContain('uppercase');
        expect(CLASS_ERROR_LINK).not.toMatch(ALL_CAPS_WORD_PATTERN);
    });
});

describe('COLOR_SCHEME_QUERIES', () => {
    test('maps dark and light to exact prefers-color-scheme queries', () => {
        expect(COLOR_SCHEME_QUERIES).toEqual({
            dark: '(prefers-color-scheme: dark)',
            light: '(prefers-color-scheme: light)',
        });
    });
});

describe('REDUCED_MOTION_QUERY', () => {
    test('is the exact prefers-reduced-motion reduce query', () => {
        expect(REDUCED_MOTION_QUERY).toBe('(prefers-reduced-motion: reduce)');
    });
});

describe('ROUTES', () => {
    test('lists home, team, and portfolio in semantic order', () => {
        expect(ROUTES).toEqual([
            { href: '/', label: 'Home' },
            { href: '/team', label: 'Team' },
            { href: '/portfolio', label: 'Portfolio' },
        ]);
    });

    test('backs every href with a page file', () => {
        for (const { href } of ROUTES) {
            expect(pageFiles, href).toContain(href === '/' ? 'index.astro' : `${href.slice(1)}.astro`);
        }
    });
});

describe('SHELL_PAD', () => {
    test('equals the --shell-pad clamp declared in global.css', () => {
        expect(SHELL_PAD).toBe(shellPadValue);
        expect(shellPadValue).toBeDefined();
        expect(shellPadValue).toMatch(CLAMP_PATTERN);
    });
});

describe('THEME_COLORS', () => {
    test('uses six-digit lowercase hex values', () => {
        for (const [scheme, color] of Object.entries(THEME_COLORS)) {
            expect(color, scheme).toMatch(HEX_COLOR_PATTERN);
        }
    });

    test('equals the light-dark endpoints of --color-cream in global.css', () => {
        expect(creamEndpoints).not.toBeNull();
        expect(THEME_COLORS).toEqual({ dark: creamEndpoints?.[2], light: creamEndpoints?.[1] });
    });
});

describe('THEME_KEY', () => {
    test('namespaces the storage key under figurezero', () => {
        expect(THEME_KEY).toMatch(THEME_KEY_PATTERN);
    });
});
