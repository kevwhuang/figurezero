import { expect, test } from '@playwright/test';

import { COLOR_SCHEME_QUERIES, THEME_COLORS, THEME_KEY } from '../../src/lib/constants';

import type { Page } from '@playwright/test';

type ViewTransitionWindow = Window & { viewTransitionCalls?: number };

const MALFORMED_RECORDS = [
    { label: 'a non-object payload', raw: '"dark"' },
    { label: 'an unknown theme value', raw: '{"theme":"purple"}' },
    { label: 'malformed json', raw: '{bad json}' },
] as const;

const MOBILE_VIEWPORT = { height: 720, width: 390 } as const;
const NON_CANONICAL_DARK = '{"theme":"dark","legacy":true}';

const SCHEME_CASES = [
    { pressed: 'false', scheme: 'light' },
    { pressed: 'true', scheme: 'dark' },
] as const;

const STORAGE_POLL = { timeout: 5_000 } as const;
const STORED_DARK = '{"theme":"dark"}';
const STORED_LIGHT = '{"theme":"light"}';

function buildMetaSnapshot(theme?: Theme) {
    return [
        { content: THEME_COLORS[theme ?? 'dark'], media: COLOR_SCHEME_QUERIES.dark },
        { content: THEME_COLORS[theme ?? 'light'], media: COLOR_SCHEME_QUERIES.light },
    ];
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

function getMetaColors(page: Page) {
    return page.evaluate(() => {
        const metas = [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')];

        return metas.map(meta => ({ content: meta.content, media: meta.media }));
    });
}

function getStoredRecord(page: Page) {
    return page.evaluate(key => localStorage.getItem(key), THEME_KEY);
}

function getThemeToggle(page: Page) {
    return page.locator('[data-theme-toggle]');
}

async function gotoReady(page: Page, path = '/') {
    await page.goto(path);
    await expect(page.locator(`.navbar__link[href="${path}"]`)).toHaveAttribute('aria-current', 'page');
}

function seedTheme(page: Page, raw: string) {
    return page.addInitScript(([key, value]) => {
        if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
    }, [THEME_KEY, raw] as const);
}

function settleFrames(page: Page) {
    return page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
});

test.describe('cross-tab sync', () => {
    test('applies a theme stored from a second tab', async ({ context, page }) => {
        await gotoReady(page);

        await expect(page.locator('html')).not.toHaveAttribute('data-theme');

        const secondPage = await context.newPage();

        await secondPage.goto('/');
        await secondPage.evaluate(([key, value]) => localStorage.setItem(key, value), [THEME_KEY, STORED_DARK] as const);

        await expect(getThemeToggle(page)).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
        expect(await getMetaColors(page)).toEqual(buildMetaSnapshot('dark'));

        await secondPage.close();
    });

    test('drops the choice when a second tab clears storage', async ({ context, page }) => {
        await seedTheme(page, STORED_DARK);
        await gotoReady(page);

        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

        const secondPage = await context.newPage();

        await secondPage.goto('/');
        await secondPage.evaluate(() => localStorage.clear());

        await expect(getThemeToggle(page)).toHaveAttribute('aria-pressed', 'false');
        await expect(page.locator('html')).not.toHaveAttribute('data-theme');

        await secondPage.close();
    });
});

test.describe('default resolution', () => {
    test('renders without a data-theme attribute or storage writes when no choice is stored', async ({ page }) => {
        await gotoReady(page);

        await expect(page.locator('html')).not.toHaveAttribute('data-theme');
        expect(await getMetaColors(page)).toEqual(buildMetaSnapshot());

        expect(await getStoredRecord(page)).toBeNull();
    });

    for (const { pressed, scheme } of SCHEME_CASES) {
        test(`mirrors the resolved ${scheme} scheme on the toggle pressed state`, async ({ page }) => {
            await page.emulateMedia({ colorScheme: scheme });
            await gotoReady(page);

            await expect(getThemeToggle(page)).toHaveAttribute('aria-pressed', pressed);
            await expect(page.locator('html')).not.toHaveAttribute('data-theme');
        });
    }
});

test.describe('malformed storage', () => {
    for (const { label, raw } of MALFORMED_RECORDS) {
        test(`clears a stored record with ${label} and falls back to the system default`, async ({ page }) => {
            await seedTheme(page, raw);

            const errors = createErrorLog(page);

            await gotoReady(page);

            await expect(getThemeToggle(page)).toHaveAttribute('aria-pressed', 'false');
            await expect(page.locator('html')).not.toHaveAttribute('data-theme');
            expect(await getMetaColors(page)).toEqual(buildMetaSnapshot());

            await expect.poll(() => getStoredRecord(page), STORAGE_POLL).toBeNull();

            expect(errors).toEqual([]);
        });
    }
});

test.describe('mobile menu theme row', () => {
    test.use({ viewport: MOBILE_VIEWPORT });

    test('flips the theme from the menu theme row while the menu stays open', async ({ page }) => {
        await gotoReady(page);

        const menu = page.locator('[data-nav-menu]');
        const menuToggle = page.locator('[data-nav-toggle]');

        await menuToggle.click();

        await expect(menu).toBeVisible();
        await expect(menuToggle).toHaveAttribute('aria-expanded', 'true');

        await getThemeToggle(page).click();

        await expect(getThemeToggle(page)).toHaveAttribute('aria-pressed', 'true');
        await expect(menu).toBeVisible();
        await expect(menuToggle).toHaveAttribute('aria-expanded', 'true');
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

        await expect.poll(() => getStoredRecord(page), STORAGE_POLL).toBe(STORED_DARK);
    });
});

test.describe('same-tab cache', () => {
    test('keeps the toggled theme when a same-tab write stores a light record and toggles light from the cached dark', async ({ page }) => {
        await gotoReady(page);
        await getThemeToggle(page).click();

        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

        await expect.poll(() => getStoredRecord(page), STORAGE_POLL).toBe(STORED_DARK);

        await page.evaluate(([key, value]) => localStorage.setItem(key, value), [THEME_KEY, STORED_LIGHT] as const);
        await settleFrames(page);

        await expect(getThemeToggle(page)).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
        expect(await getMetaColors(page)).toEqual(buildMetaSnapshot('dark'));

        expect(await getStoredRecord(page)).toBe(STORED_LIGHT);

        await getThemeToggle(page).click();

        await expect(getThemeToggle(page)).toHaveAttribute('aria-pressed', 'false');
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

        await expect.poll(() => getStoredRecord(page), STORAGE_POLL).toBe(STORED_LIGHT);
    });
});

test.describe('stored choice', () => {
    test('applies a stored dark choice and keeps the canonical record', async ({ page }) => {
        await seedTheme(page, STORED_DARK);
        await gotoReady(page);

        await expect(getThemeToggle(page)).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
        expect(await getMetaColors(page)).toEqual(buildMetaSnapshot('dark'));

        expect(await getStoredRecord(page)).toBe(STORED_DARK);
    });

    test('rewrites a non-canonical record while applying its theme', async ({ page }) => {
        await seedTheme(page, NON_CANONICAL_DARK);
        await gotoReady(page);

        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

        await expect.poll(() => getStoredRecord(page), STORAGE_POLL).toBe(STORED_DARK);
    });

    test('keeps a stored light choice when the system scheme is dark', async ({ page }) => {
        await page.emulateMedia({ colorScheme: 'dark' });
        await seedTheme(page, STORED_LIGHT);
        await gotoReady(page);

        await expect(getThemeToggle(page)).toHaveAttribute('aria-pressed', 'false');
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
        expect(await getMetaColors(page)).toEqual(buildMetaSnapshot('light'));
    });
});

test.describe('system scheme change', () => {
    test('updates the pressed state when the scheme changes without a stored choice', async ({ page }) => {
        await gotoReady(page);

        await expect(getThemeToggle(page)).toHaveAttribute('aria-pressed', 'false');

        await page.emulateMedia({ colorScheme: 'dark' });

        await expect(getThemeToggle(page)).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('html')).not.toHaveAttribute('data-theme');
        expect(await getMetaColors(page)).toEqual(buildMetaSnapshot());
    });
});

test.describe('theme toggle', () => {
    test('sets the theme attribute, metas, and storage record on click', async ({ page }) => {
        await gotoReady(page);
        await getThemeToggle(page).click();

        await expect(getThemeToggle(page)).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
        expect(await getMetaColors(page)).toEqual(buildMetaSnapshot('dark'));

        await expect.poll(() => getStoredRecord(page), STORAGE_POLL).toBe(STORED_DARK);
    });

    test('flips back to a light choice on a second click', async ({ page }) => {
        await gotoReady(page);
        await getThemeToggle(page).click();

        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

        await getThemeToggle(page).click();

        await expect(getThemeToggle(page)).toHaveAttribute('aria-pressed', 'false');
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
        expect(await getMetaColors(page)).toEqual(buildMetaSnapshot('light'));

        await expect.poll(() => getStoredRecord(page), STORAGE_POLL).toBe(STORED_LIGHT);
    });

    test('restores the toggled choice after a reload', async ({ page }) => {
        await gotoReady(page);
        await getThemeToggle(page).click();

        await expect.poll(() => getStoredRecord(page), STORAGE_POLL).toBe(STORED_DARK);

        await page.reload();

        await expect(getThemeToggle(page)).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
        expect(await getMetaColors(page)).toEqual(buildMetaSnapshot('dark'));
    });

    test('keeps the toggled choice across client-router navigation', async ({ page }) => {
        await gotoReady(page);
        await getThemeToggle(page).click();

        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

        await page.locator('.navbar__link[href="/team"]').click();

        await expect(getThemeToggle(page)).toHaveAttribute('aria-pressed', 'true');
        await expect(page).toHaveURL('/team');
        await expect(page.locator('.navbar__link[href="/team"]')).toHaveAttribute('aria-current', 'page');
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
        expect(await getMetaColors(page)).toEqual(buildMetaSnapshot('dark'));

        await expect.poll(() => getStoredRecord(page), STORAGE_POLL).toBe(STORED_DARK);
    });
});

test.describe('theme toggle under no preference', () => {
    test.beforeEach(async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'no-preference' });
    });

    test('sets the theme attribute, metas, and storage record through a view transition on click', async ({ page }) => {
        await page.addInitScript(() => {
            const original = Document.prototype.startViewTransition;

            (window as ViewTransitionWindow).viewTransitionCalls = 0;

            Document.prototype.startViewTransition = function (this: Document, callback) {
                const viewTransitionWindow = window as ViewTransitionWindow;

                viewTransitionWindow.viewTransitionCalls = (viewTransitionWindow.viewTransitionCalls ?? 0) + 1;

                return original.call(this, callback);
            };
        });

        await gotoReady(page);

        expect(await page.evaluate(() => typeof document.startViewTransition)).toBe('function');

        await getThemeToggle(page).click();

        await expect(getThemeToggle(page)).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
        expect(await getMetaColors(page)).toEqual(buildMetaSnapshot('dark'));

        await expect.poll(() => getStoredRecord(page), STORAGE_POLL).toBe(STORED_DARK);

        expect(await page.evaluate(() => (window as ViewTransitionWindow).viewTransitionCalls)).toBe(1);
    });

    test('applies the toggled theme when startViewTransition is deleted before load', async ({ page }) => {
        await page.addInitScript(() => {
            delete (Document.prototype as Partial<Document>).startViewTransition;
        });

        await gotoReady(page);

        expect(await page.evaluate(() => typeof document.startViewTransition)).toBe('undefined');

        await getThemeToggle(page).click();

        await expect(getThemeToggle(page)).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
        expect(await getMetaColors(page)).toEqual(buildMetaSnapshot('dark'));

        await expect.poll(() => getStoredRecord(page), STORAGE_POLL).toBe(STORED_DARK);
    });
});
