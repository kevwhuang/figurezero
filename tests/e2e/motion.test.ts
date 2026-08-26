import { expect, test } from '@playwright/test';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';

import type { Locator, Page } from '@playwright/test';

const ABOUT_GRID_SELECTOR = 'section[aria-label="What is the Figure Zero Project?"] [data-scroll-stagger]';
const ABOUT_HEADING_SELECTOR = 'section[aria-label="What is the Figure Zero Project?"] h2[data-scroll]';
const ANIMATED_SELECTOR = '[data-letter], [data-pop], [data-rise], [data-scroll]';
const DOODLE_OPACITY = '0.15';
const HASH_TOP_TOLERANCE = 2;
const HIDDEN_TRANSFORM_LEFT = 'matrix(1, 0, 0, 1, -24, 0)';
const HIDDEN_TRANSFORM_RIGHT = 'matrix(1, 0, 0, 1, 24, 0)';
const HIDDEN_TRANSFORM_UP = 'matrix(1, 0, 0, 1, 0, 24)';
const HIDDEN_TRANSFORM_ZOOM = 'matrix(0.9, 0, 0, 0.9, 0, 24)';
const HIDEABLE_SELECTOR = '[data-doodle], [data-letter], [data-pop], [data-rise], [data-scroll], [data-scroll-stagger] > *';
const PAGE_PATHS = ['/', '/404', '/500', '/portfolio', '/team'] as const;
const POLL = { timeout: 10_000 } as const;
const SETTLED_TRANSFORM = 'matrix(1, 0, 0, 1, 0, 0)';
const SETTLE_TIMEOUT = 10_000;
const STAGGER_GRID_SELECTOR = 'ul[data-scroll-stagger]';
const STORY_FIGURE_SELECTOR = 'section[aria-labelledby="story-title"] figure[data-scroll]';
const STORY_TITLE_SELECTOR = '#story-title';
const TESTIMONY_SELECTOR = 'section[aria-label="Testimonies"] figure[data-scroll]';
const UNTWEENED_TRANSFORM = 'none';

const headerHeight = getHeaderHeight();

function areAllRevealed(page: Page, selector: string) {
    return page.locator(selector).evaluateAll(elements => elements.every(element => getComputedStyle(element).opacity === '1'));
}

function areDoodlesDimmed(page: Page) {
    return page.locator('[data-doodle]').evaluateAll(
        (elements, opacity) => elements.every(element => element instanceof HTMLElement && element.style.opacity === opacity),
        DOODLE_OPACITY,
    );
}

function areInlineShown(page: Page) {
    return page.locator(ANIMATED_SELECTOR).evaluateAll(
        elements => elements.every(element => element instanceof HTMLElement && element.style.opacity === '1'),
    );
}

function createErrorLog(page: Page) {
    const errors: string[] = [];

    page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
    });

    page.on('pageerror', (error) => {
        errors.push(error.message);
    });

    return errors;
}

async function expectAnimatedContentShown(page: Page) {
    expect(await page.locator('[data-scroll]').count()).toBeGreaterThan(0);

    await expect.poll(() => areDoodlesDimmed(page), POLL).toBe(true);
    await expect.poll(() => areInlineShown(page), POLL).toBe(true);
    await expect.poll(() => getHiddenCount(page), POLL).toBe(0);
}

async function expectHashAlignedBelowHeader(page: Page) {
    const errors = createErrorLog(page);

    await page.goto('/#story-title');

    const storyTitle = page.locator(STORY_TITLE_SELECTOR);

    await expect.poll(() => getDistanceFromHeader(storyTitle), POLL).toBeLessThanOrEqual(HASH_TOP_TOLERANCE);
    await expect.poll(() => getViewportTop(storyTitle), POLL).toBeGreaterThanOrEqual(0);

    expect(errors).toEqual([]);
}

function getDistanceFromHeader(locator: Locator) {
    return locator.evaluate((element, height) => Math.abs(element.getBoundingClientRect().top - height), headerHeight);
}

function getHeaderHeight() {
    const styles = readFileSync(join(process.cwd(), 'src/global.css'), 'utf-8');

    const match = styles.match(/--header-height: (\d+)px/);

    if (match === null) throw new Error('Missing --header-height in src/global.css.');

    return Number(match[1]);
}

function getHiddenCount(page: Page) {
    return page.locator(HIDEABLE_SELECTOR).evaluateAll(elements => elements.filter(element => getComputedStyle(element).opacity === '0').length);
}

function getInlineOpacity(locator: Locator) {
    return locator.evaluate(element => element.style.opacity);
}

function getOpacity(locator: Locator) {
    return locator.evaluate(element => getComputedStyle(element).opacity);
}

function getTransform(locator: Locator) {
    return locator.evaluate(element => getComputedStyle(element).transform);
}

function getViewportTop(locator: Locator) {
    return locator.evaluate(element => element.getBoundingClientRect().top);
}

function sampleStaggerSettle(locator: Locator) {
    return locator.evaluate(async (element, timeout) => {
        const children = [...element.children];
        const settledAt = new Map<number, number>();
        const start = performance.now();

        let sawPartialReveal = false;

        children[children.length - 1]?.scrollIntoView({ behavior: 'instant', block: 'center' });

        while (settledAt.size < children.length && performance.now() - start < timeout) {
            children.forEach((child, index) => {
                if (!settledAt.has(index) && getComputedStyle(child).opacity === '1') settledAt.set(index, performance.now());
            });

            if (settledAt.size > 0 && settledAt.size < children.length) sawPartialReveal = true;

            await new Promise((resolve) => {
                requestAnimationFrame(resolve);
            });
        }

        return {
            childCount: children.length,
            firstTime: settledAt.get(0) ?? -1,
            lastTime: settledAt.get(children.length - 1) ?? -1,
            sawPartialReveal,
            settledCount: settledAt.size,
        };
    }, SETTLE_TIMEOUT);
}

function scrollToCenter(locator: Locator) {
    return locator.evaluate((element) => {
        element.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
}

test.describe('entrance motion', () => {
    test('reveals the hero letters and logo on load without scrolling', async ({ page }) => {
        await page.goto('/');

        const letters = page.locator('[data-letter]');
        const logo = page.locator('[data-pop]');

        expect(await letters.count()).toBeGreaterThan(1);

        await expect.poll(() => areAllRevealed(page, '[data-letter]'), POLL).toBe(true);
        await expect.poll(() => getOpacity(logo), POLL).toBe('1');
        await expect.poll(() => getTransform(letters.first()), POLL).toBe(SETTLED_TRANSFORM);
        await expect.poll(() => getTransform(logo), POLL).toBe(SETTLED_TRANSFORM);
    });

    test('fades the hero doodle to its resting opacity', async ({ page }) => {
        await page.goto('/');

        const doodle = page.locator('[data-doodle]');

        await expect.poll(() => getOpacity(doodle), POLL).toBe(DOODLE_OPACITY);

        expect(await getInlineOpacity(doodle)).toBe(DOODLE_OPACITY);
    });

    test('raises the team page kicker and heading to full opacity on load', async ({ page }) => {
        await page.goto('/team');

        const rises = page.locator('[data-rise]');

        expect(await rises.count()).toBeGreaterThan(1);

        await expect.poll(() => areAllRevealed(page, '[data-rise]'), POLL).toBe(true);
        await expect.poll(() => getTransform(rises.first()), POLL).toBe(SETTLED_TRANSFORM);
        await expect.poll(() => getTransform(rises.last()), POLL).toBe(SETTLED_TRANSFORM);
    });
});

test.describe('entrance motion under reduced motion', () => {
    test.beforeEach(async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
    });

    test('shows the hero letters logo and doodle immediately without tweened transforms', async ({ page }) => {
        await page.goto('/');

        const letters = page.locator('[data-letter]');
        const logo = page.locator('[data-pop]');

        await expect.poll(() => areAllRevealed(page, '[data-letter], [data-pop]'), POLL).toBe(true);
        await expect.poll(() => getInlineOpacity(letters.first()), POLL).toBe('1');

        expect(await getInlineOpacity(page.locator('[data-doodle]'))).toBe(DOODLE_OPACITY);
        expect(await getTransform(letters.first())).toBe(UNTWEENED_TRANSFORM);
        expect(await getTransform(logo)).toBe(UNTWEENED_TRANSFORM);
    });

    test('shows the team page kicker and heading immediately', async ({ page }) => {
        await page.goto('/team');

        const rises = page.locator('[data-rise]');

        await expect.poll(() => areAllRevealed(page, '[data-rise]'), POLL).toBe(true);
        await expect.poll(() => getInlineOpacity(rises.first()), POLL).toBe('1');

        expect(await getTransform(rises.first())).toBe(UNTWEENED_TRANSFORM);
    });
});

test.describe('scroll motion', () => {
    test('keeps below-fold sections hidden until scrolled into view', async ({ page }) => {
        await page.goto('/');

        const aboutHeading = page.locator(ABOUT_HEADING_SELECTOR);
        const testimony = page.locator(TESTIMONY_SELECTOR).first();

        await expect.poll(() => areAllRevealed(page, '[data-letter]'), POLL).toBe(true);
        await expect.poll(() => getTransform(aboutHeading), POLL).toBe(HIDDEN_TRANSFORM_UP);

        expect(await getOpacity(aboutHeading)).toBe('0');
        expect(await getOpacity(testimony)).toBe('0');

        await scrollToCenter(aboutHeading);

        await expect.poll(() => getOpacity(aboutHeading), POLL).toBe('1');
        await expect.poll(() => getTransform(aboutHeading), POLL).toBe(UNTWEENED_TRANSFORM);

        expect(await getOpacity(testimony)).toBe('0');

        await scrollToCenter(testimony);

        await expect.poll(() => getOpacity(testimony), POLL).toBe('1');
        await expect.poll(() => getTransform(testimony), POLL).toBe(UNTWEENED_TRANSFORM);
    });

    test('keeps the story figure offset right until scrolled into view', async ({ page }) => {
        await page.goto('/');

        const storyFigure = page.locator(STORY_FIGURE_SELECTOR);

        await expect.poll(() => areAllRevealed(page, '[data-letter]'), POLL).toBe(true);
        await expect.poll(() => getTransform(storyFigure), POLL).toBe(HIDDEN_TRANSFORM_RIGHT);

        expect(await getOpacity(storyFigure)).toBe('0');

        await scrollToCenter(storyFigure);

        await expect.poll(() => getOpacity(storyFigure), POLL).toBe('1');
        await expect.poll(() => getTransform(storyFigure), POLL).toBe(UNTWEENED_TRANSFORM);
    });

    test('scrolls the story title below the sticky header on a hash deep link', async ({ page }) => {
        await expectHashAlignedBelowHeader(page);
    });

    test('sets stagger children to their variant offsets while the parent stays visible', async ({ page }) => {
        await page.goto('/');

        const grid = page.locator(ABOUT_GRID_SELECTOR);
        const paragraphs = page.locator(`${ABOUT_GRID_SELECTOR} > *`);

        await expect.poll(() => getInlineOpacity(grid), POLL).toBe('1');
        await expect.poll(() => getTransform(paragraphs.first()), POLL).toBe(HIDDEN_TRANSFORM_LEFT);

        expect(await paragraphs.count()).toBeGreaterThan(1);
        expect(await getOpacity(paragraphs.first())).toBe('0');
        expect(await getOpacity(paragraphs.last())).toBe('0');
        expect(await getTransform(grid)).toBe(UNTWEENED_TRANSFORM);

        await scrollToCenter(grid);

        await expect.poll(() => areAllRevealed(page, `${ABOUT_GRID_SELECTOR} > *`), POLL).toBe(true);
        await expect.poll(() => getTransform(paragraphs.first()), POLL).toBe(UNTWEENED_TRANSFORM);
    });

    test('reveals the team grid children progressively once scrolled into view', async ({ page }) => {
        await page.goto('/team');

        const grid = page.locator(STAGGER_GRID_SELECTOR).last();

        const firstCard = grid.locator('li').first();

        await expect.poll(() => areAllRevealed(page, '[data-rise]'), POLL).toBe(true);
        await expect.poll(() => getInlineOpacity(grid), POLL).toBe('1');
        await expect.poll(() => getTransform(firstCard), POLL).toBe(HIDDEN_TRANSFORM_ZOOM);

        expect(await getOpacity(firstCard)).toBe('0');

        const settle = await sampleStaggerSettle(grid);

        expect(settle.childCount).toBeGreaterThan(1);
        expect(settle.lastTime).toBeGreaterThan(settle.firstTime);
        expect(settle.sawPartialReveal).toBe(true);
        expect(settle.settledCount).toBe(settle.childCount);

        await expect.poll(() => getTransform(firstCard), POLL).toBe(UNTWEENED_TRANSFORM);
    });

    test('re-initializes animations after client router navigation', async ({ page }) => {
        await page.goto('/');

        await expect.poll(() => areAllRevealed(page, '[data-letter]'), POLL).toBe(true);

        await page.locator('.navbar__link[href="/team"]').click();
        await expect(page).toHaveURL('/team');

        const copresidentsHeading = page.locator('section[aria-label="Co-presidents"] h2[data-scroll]');

        await expect.poll(() => areAllRevealed(page, '[data-rise]'), POLL).toBe(true);
        await expect.poll(() => getTransform(copresidentsHeading), POLL).toBe(HIDDEN_TRANSFORM_UP);

        expect(await getOpacity(copresidentsHeading)).toBe('0');

        await scrollToCenter(copresidentsHeading);

        await expect.poll(() => getOpacity(copresidentsHeading), POLL).toBe('1');

        await page.locator('.navbar__link[href="/"]').click();
        await expect(page).toHaveURL('/');

        const aboutHeading = page.locator(ABOUT_HEADING_SELECTOR);

        await expect.poll(() => areAllRevealed(page, '[data-letter]'), POLL).toBe(true);
        await expect.poll(() => getTransform(aboutHeading), POLL).toBe(HIDDEN_TRANSFORM_UP);

        expect(await getOpacity(aboutHeading)).toBe('0');
    });
});

test.describe('scroll motion under reduced motion', () => {
    test.beforeEach(async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
    });

    for (const path of PAGE_PATHS) {
        test(`reveals every animated element immediately on ${path}`, async ({ page }) => {
            await page.goto(path);

            await expectAnimatedContentShown(page);
        });
    }

    test('scrolls the story title below the sticky header on a hash deep link', async ({ page }) => {
        await expectHashAlignedBelowHeader(page);
    });
});
