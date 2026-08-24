import { expect, test } from '@playwright/test';
import { join } from 'node:path';
import { readdirSync } from 'node:fs';

import { ROUTES } from '../../src/lib/constants';

import type { Page } from '@playwright/test';

const HOME_TITLE = 'Figure Zero Project';
const MAX_TAB_PRESSES = 12;
const SCRIPT_TIMEOUT = 20_000;
const TITLE_PATTERN = /^.+ \u2014 Figure Zero Project$/;

const focusTargets = [
    { name: 'brand link', selector: 'a[aria-label="Figure Zero Project home"]' },
    ...ROUTES.map(route => ({ name: `${route.label.toLowerCase()} nav link`, selector: `.navbar__link[href="${route.href}"]` })),
    { name: 'theme toggle', selector: '[data-theme-toggle]' },
];

const pagePaths = readdirSync(join(process.cwd(), 'src/pages'))
    .filter(file => file.endsWith('.astro'))
    .map(file => file.replace(/\.astro$/, ''))
    .map(name => (name === 'index' ? '/' : `/${name}`))
    .sort();

function getOutline(page: Page, selector: string) {
    return page.locator(selector).evaluate((element) => {
        const style = getComputedStyle(element);

        return `${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor}`;
    });
}

function getStructure(page: Page) {
    return page.evaluate(() => ({
        ambiguousLabelIds: [...document.querySelectorAll('[aria-labelledby]')]
            .flatMap(element => (element.getAttribute('aria-labelledby') || '').split(/\s+/))
            .filter(id => id && document.querySelectorAll(`[id="${id}"]`).length !== 1),
        footerParent: document.querySelector('footer')?.parentElement?.tagName,
        h1Count: document.querySelectorAll('h1').length,
        headerParent: document.querySelector('header')?.parentElement?.tagName,
        headingLevels: [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].map(heading => Number(heading.tagName.slice(1))),
        mainCount: document.querySelectorAll('main, [role="main"]').length,
        missingAltCount: [...document.querySelectorAll('img')].filter(image => !image.hasAttribute('alt')).length,
        nestedLandmarkCount: document.querySelectorAll('main footer, main header').length,
        unlabeledSectionCount: [...document.querySelectorAll('section')]
            .filter(section => !section.hasAttribute('aria-label') && !section.hasAttribute('aria-labelledby'))
            .length,
    }));
}

test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
});

test.describe('document structure', () => {
    for (const path of pagePaths) {
        test(`${path} exposes one main, one h1, sibling landmarks, ordered headings, labelled sections, and alt text`, async ({ page }) => {
            await page.goto(path);
            await page.locator('main').waitFor();

            const structure = await getStructure(page);

            const skippedLevels = structure.headingLevels.filter((level, index) => level > (structure.headingLevels[index - 1] ?? 0) + 1);

            expect(skippedLevels).toEqual([]);
            expect(structure.ambiguousLabelIds).toEqual([]);
            expect(structure.footerParent).toBe('BODY');
            expect(structure.h1Count).toBe(1);
            expect(structure.headerParent).toBe('BODY');
            expect(structure.mainCount).toBe(1);
            expect(structure.missingAltCount).toBe(0);
            expect(structure.nestedLandmarkCount).toBe(0);
            expect(structure.unlabeledSectionCount).toBe(0);
        });
    }
});

test.describe('keyboard navigation', () => {
    test('tab from body reaches the brand link, nav links, and theme toggle with visible focus styles', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('.navbar__link[href="/"]')).toHaveAttribute('aria-current', 'page', { timeout: SCRIPT_TIMEOUT });

        const baseline: Record<string, string> = {};
        const remaining = new Map(focusTargets.map(target => [target.selector, target.name] as const));

        for (const target of focusTargets) {
            baseline[target.selector] = await getOutline(page, target.selector);
        }

        for (let press = 0; press < MAX_TAB_PRESSES && remaining.size > 0; press++) {
            await page.keyboard.press('Tab');

            for (const selector of [...remaining.keys()]) {
                const isFocused = await page.locator(selector).evaluate(element => element === document.activeElement);

                if (!isFocused) continue;

                const focusedOutline = await getOutline(page, selector);

                expect(focusedOutline, `focus indicator on ${remaining.get(selector)}`).not.toMatch(/^none /);
                expect(focusedOutline, `focus indicator on ${remaining.get(selector)}`).not.toBe(baseline[selector]);
                remaining.delete(selector);
            }
        }

        expect([...remaining.values()]).toEqual([]);
    });
});

test.describe('page titles', () => {
    test('titles are unique, bare on home, and suffixed with an em dash elsewhere', async ({ page }) => {
        const titles: string[] = [];

        for (const path of pagePaths) {
            await page.goto(path);
            titles.push(await page.title());
        }

        expect(new Set(titles).size).toBe(titles.length);
        expect(titles[pagePaths.indexOf('/')]).toBe(HOME_TITLE);

        for (const [index, title] of titles.entries()) {
            if (pagePaths[index] === '/') continue;

            expect(title, `title suffix on ${pagePaths[index]}`).toMatch(TITLE_PATTERN);
        }
    });
});
