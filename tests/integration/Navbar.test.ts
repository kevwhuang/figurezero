import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, test } from 'vitest';

import Navbar from '../../src/sections/Navbar.astro';
import { ROUTES, THEME_COLORS, THEME_KEY } from '../../src/lib/constants';

const NAV_TOGGLE_PATTERN = /<button[^>]*aria-controls="navbar-menu"[^>]*aria-expanded="false"[^>]*aria-label="Toggle navigation"[^>]*data-nav-toggle[^>]*type="button"/;

describe('Navbar', () => {
    let html: string;

    beforeAll(async () => {
        const container = await AstroContainer.create();

        html = await container.renderToString(Navbar);
    });

    test('renders the header as a navbar landmark', () => {
        expect(html).toMatch(/^<header class="navbar /);
        expect(html.split('<header').length - 1).toBe(1);
    });

    test('renders the brand link home with the logo and wordmark', () => {
        expect(html).toMatch(/<a[^>]*aria-label="Figure Zero Project home"[^>]*href="\/"/);
        expect(html).toMatch(/<svg[^>]*aria-hidden="true"[^>]*viewBox="0 0 800 800"/);
        expect(html).toContain('>Figure Zero Project</span>');
        expect(html.split('viewBox="0 0 800 800"').length - 1).toBe(1);
    });

    test('labels the primary nav menu for assistive tech', () => {
        expect(html).toMatch(/<nav id="navbar-menu"[^>]*aria-label="Primary"[^>]*data-nav-menu/);
        expect(html.split('id="navbar-menu"').length - 1).toBe(1);
    });

    test('renders a nav link for every route without a current-page marker', () => {
        const links = [...html.matchAll(/<a class="navbar__link [^"]*" href="([^"]*)"[^>]*>([^<]*)<\/a>/g)]
            .map(match => ({ href: match[1], label: match[2] }));

        expect(html).not.toContain('aria-current');
        expect(links).toEqual([...ROUTES]);
    });

    test('renders the theme toggle unpressed with the theme icon', () => {
        expect(html).toMatch(/<button[^>]*aria-label="Dark theme"[^>]*aria-pressed="false"[^>]*data-theme-toggle[^>]*type="button"/);
        expect(html).toMatch(/data-theme-toggle[^>]*><svg[^>]*aria-hidden="true"[^>]*viewBox="0 0 24 24"/);
        expect(html).toContain('icon-theme__stroke');
        expect(html).toContain('text-[light-dark(currentcolor,transparent)]');
        expect(html).toContain('text-[light-dark(transparent,currentcolor)]');
    });

    test('renders the mobile menu toggle collapsed with the menu icon', () => {
        expect(html).toMatch(NAV_TOGGLE_PATTERN);
        expect(html).toMatch(/data-nav-toggle[^>]*><svg[^>]*aria-hidden="true"[^>]*viewBox="0 0 24 24"/);
        expect(html).toContain('icon-menu__stroke--bottom');
        expect(html).toContain('icon-menu__stroke--top');
        expect(html).toContain('opacity-[calc(1_-_var(--icon-menu-open,0))]');
    });

    test('nests the theme toggle in the menu and the nav toggle after it', () => {
        const brandIndex = html.indexOf('aria-label="Figure Zero Project home"');
        const lastLinkIndex = html.lastIndexOf('class="navbar__link');
        const menuCloseIndex = html.indexOf('</nav>');
        const menuOpenIndex = html.indexOf('<nav id="navbar-menu"');
        const navToggleIndex = html.indexOf('data-nav-toggle');
        const themeToggleIndex = html.indexOf('data-theme-toggle');

        expect(brandIndex).toBeGreaterThan(-1);
        expect(html.split('</nav>').length - 1).toBe(1);
        expect(lastLinkIndex).toBeGreaterThan(menuOpenIndex);
        expect(menuCloseIndex).toBeGreaterThan(themeToggleIndex);
        expect(menuOpenIndex).toBeGreaterThan(brandIndex);
        expect(navToggleIndex).toBeGreaterThan(menuCloseIndex);
        expect(themeToggleIndex).toBeGreaterThan(lastLinkIndex);
    });

    test('inlines exactly one theme boot script with the theme constants', () => {
        expect(html).toContain(`const themeColors = ${JSON.stringify(THEME_COLORS)};`);
        expect(html).toContain(`const themeKey = ${JSON.stringify(THEME_KEY)};`);
        expect(html.split('<script>').length - 1).toBe(1);
    });

    test('hooks exactly one bundled navbar script', () => {
        expect(html.split('Navbar.astro?astro&type=script').length - 1).toBe(1);
    });
});
