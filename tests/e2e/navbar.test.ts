import { expect, test } from '@playwright/test';

import { ROUTES, THEME_KEY } from '../../src/lib/constants';

import type { Page } from '@playwright/test';

const BACKDROP_OFFSET = 40;
const DESKTOP_VIEWPORT = { height: 720, width: 1_280 } as const;
const MENU_PADDING_OFFSET = 4;
const MOBILE_VIEWPORT = { height: 720, width: 390 } as const;

const VIEWPORT_CENTER_X = MOBILE_VIEWPORT.width / 2;

const [homeRoute, teamRoute, portfolioRoute] = ROUTES;

const navigationSequence = [teamRoute, portfolioRoute, homeRoute] as const;

function getStorageEntries(page: Page) {
    return page.evaluate(() => Object.entries(window.localStorage));
}

async function gotoReady(page: Page, path: string) {
    await page.goto(path);
    await expect(page.locator(`.navbar__link[href="${path}"]`)).toHaveAttribute('aria-current', 'page');
}

function settleFrames(page: Page) {
    return page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
});

test.describe('navbar desktop shrink', () => {
    test.use({ viewport: DESKTOP_VIEWPORT });

    test.beforeEach(async ({ page }) => {
        await gotoReady(page, homeRoute.href);
    });

    test('keeps the menu closed with the toggle shown after shrinking to the mobile viewport', async ({ page }) => {
        const menu = page.locator('[data-nav-menu]');
        const toggle = page.locator('[data-nav-toggle]');

        await expect(menu).toBeVisible();
        await expect(toggle).toBeHidden();

        await page.setViewportSize(MOBILE_VIEWPORT);

        await expect(menu).toBeHidden();
        await expect(toggle).toBeVisible();
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');

        await settleFrames(page);

        await expect(menu).not.toHaveClass(/navbar__menu--instant/);
        await expect(menu).not.toHaveClass(/navbar__menu--open/);
    });
});

test.describe('navbar mobile menu', () => {
    test.use({ viewport: MOBILE_VIEWPORT });

    test.beforeEach(async ({ page }) => {
        await gotoReady(page, homeRoute.href);
    });

    test('toggles the menu and aria-expanded from the menu button', async ({ page }) => {
        const links = page.locator('[data-nav-menu] a');
        const menu = page.locator('[data-nav-menu]');
        const toggle = page.locator('[data-nav-toggle]');

        await expect(menu).toBeHidden();
        await expect(toggle).toBeVisible();
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');

        await toggle.click();

        await expect(links.first()).toBeFocused();
        await expect(menu).toBeVisible();
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');

        await toggle.click();

        await expect(menu).toBeHidden();
        await expect(toggle).toBeFocused();
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });

    test('traps tab focus across the brand, menu links, theme button, and toggle', async ({ page }) => {
        const brand = page.getByRole('link', { name: 'Figure Zero Project home' });
        const links = page.locator('[data-nav-menu] a');
        const theme = page.locator('[data-theme-toggle]');
        const toggle = page.locator('[data-nav-toggle]');

        await toggle.click();

        await expect(links.first()).toBeFocused();

        await page.keyboard.press('Tab');

        await expect(links.nth(1)).toBeFocused();

        await page.keyboard.press('Tab');

        await expect(links.last()).toBeFocused();

        await page.keyboard.press('Tab');

        await expect(theme).toBeFocused();

        await page.keyboard.press('Tab');

        await expect(toggle).toBeFocused();

        await page.keyboard.press('Tab');

        await expect(brand).toBeFocused();

        await page.keyboard.press('Tab');

        await expect(links.first()).toBeFocused();

        await page.keyboard.press('Shift+Tab');

        await expect(brand).toBeFocused();

        await page.keyboard.press('Shift+Tab');

        await expect(toggle).toBeFocused();

        await page.keyboard.press('Shift+Tab');

        await expect(theme).toBeFocused();
    });

    test('pulls tab focus back to the brand link after focus escapes to a footer link', async ({ page }) => {
        const brand = page.getByRole('link', { name: 'Figure Zero Project home' });
        const footerLink = page.locator('footer a').first();
        const links = page.locator('[data-nav-menu] a');
        const toggle = page.locator('[data-nav-toggle]');

        await toggle.click();

        await expect(links.first()).toBeFocused();

        await page.evaluate(() => document.querySelector<HTMLElement>('footer a')?.focus());

        await expect(footerLink).toBeFocused();

        await page.keyboard.press('Tab');

        await expect(brand).toBeFocused();
    });

    test('closes on escape and restores focus to the toggle', async ({ page }) => {
        const links = page.locator('[data-nav-menu] a');
        const menu = page.locator('[data-nav-menu]');
        const toggle = page.locator('[data-nav-toggle]');

        await toggle.click();

        await expect(links.first()).toBeFocused();

        await page.keyboard.press('Escape');

        await expect(menu).toBeHidden();
        await expect(toggle).toBeFocused();
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });

    test('closes on backdrop mousedown below the menu and restores focus to the toggle', async ({ page }) => {
        const links = page.locator('[data-nav-menu] a');
        const menu = page.locator('[data-nav-menu]');
        const toggle = page.locator('[data-nav-toggle]');

        await toggle.click();

        await expect(links.first()).toBeFocused();

        const menuBottom = await menu.evaluate(element => element.getBoundingClientRect().bottom);

        await page.mouse.click(VIEWPORT_CENTER_X, menuBottom + BACKDROP_OFFSET);

        await expect(menu).toBeHidden();
        await expect(page).toHaveURL(homeRoute.href);
        await expect(toggle).toBeFocused();
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });

    test('closes from the backdrop without focus restore after mousedown inside the menu', async ({ page }) => {
        const links = page.locator('[data-nav-menu] a');
        const menu = page.locator('[data-nav-menu]');
        const toggle = page.locator('[data-nav-toggle]');

        await toggle.click();

        await expect(links.first()).toBeFocused();

        const menuTop = await menu.evaluate(element => element.getBoundingClientRect().top);

        await page.mouse.click(VIEWPORT_CENTER_X, menuTop + MENU_PADDING_OFFSET);

        await expect(menu).toBeVisible();
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');

        const menuBottom = await menu.evaluate(element => element.getBoundingClientRect().bottom);

        await page.mouse.click(VIEWPORT_CENTER_X, menuBottom + BACKDROP_OFFSET);

        await expect(menu).toBeHidden();
        await expect(toggle).not.toBeFocused();
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });

    test('closes the menu when a nav link is followed', async ({ page }) => {
        const menu = page.locator('[data-nav-menu]');
        const toggle = page.locator('[data-nav-toggle]');

        await toggle.click();
        await menu.getByRole('link', { name: portfolioRoute.label }).click();

        await expect(menu).toBeHidden();
        await expect(menu.locator(`a[href="${portfolioRoute.href}"]`)).toHaveAttribute('aria-current', 'page');
        await expect(page).toHaveURL(portfolioRoute.href);
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });

    test('closes the menu when the viewport grows past the mobile breakpoint', async ({ page }) => {
        const menu = page.locator('[data-nav-menu]');
        const toggle = page.locator('[data-nav-toggle]');

        await toggle.click();

        await expect(menu).toBeVisible();
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');

        await page.setViewportSize(DESKTOP_VIEWPORT);

        await expect(menu).toBeVisible();
        await expect(menu).not.toHaveClass(/navbar__menu--open/);
        await expect(toggle).toBeHidden();
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });

    test('reopens cleanly after client-router navigation', async ({ page }) => {
        const links = page.locator('[data-nav-menu] a');
        const menu = page.locator('[data-nav-menu]');
        const toggle = page.locator('[data-nav-toggle]');

        await toggle.click();
        await menu.getByRole('link', { name: teamRoute.label }).click();

        await expect(menu).toBeHidden();
        await expect(menu.locator(`a[href="${teamRoute.href}"]`)).toHaveAttribute('aria-current', 'page');
        await expect(page).toHaveURL(teamRoute.href);
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');

        await toggle.click();

        await expect(links.first()).toBeFocused();
        await expect(menu).toBeVisible();
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');

        await page.keyboard.press('Escape');

        await expect(menu).toBeHidden();
        await expect(toggle).toBeFocused();
    });
});

test.describe('navbar navigation', () => {
    test.beforeEach(async ({ page }) => {
        await gotoReady(page, homeRoute.href);
    });

    test('navigates every route through the nav links with aria-current on the active link', async ({ page }) => {
        const menu = page.locator('[data-nav-menu]');

        for (const route of navigationSequence) {
            await menu.getByRole('link', { name: route.label }).click();

            await expect(menu.locator(`a[href="${route.href}"]`), route.label).toHaveAttribute('aria-current', 'page');
            await expect(page, route.label).toHaveURL(route.href);
            await expect(page.getByRole('heading', { level: 1 }), route.href).toBeVisible();

            for (const other of ROUTES) {
                if (other.href === route.href) continue;

                const otherLink = menu.locator(`a[href="${other.href}"]`);

                await expect(otherLink, `${other.label} stale on ${route.href}`).not.toHaveAttribute('aria-current', 'page');
            }
        }
    });

    test('returns home through the brand link', async ({ page }) => {
        await gotoReady(page, teamRoute.href);

        await page.getByRole('link', { name: 'Figure Zero Project home' }).click();

        await expect(page).toHaveURL(homeRoute.href);
        await expect(page.getByRole('heading', { level: 1, name: 'Figure Zero' })).toBeVisible();
        await expect(page.locator(`[data-nav-menu] a[href="${homeRoute.href}"]`)).toHaveAttribute('aria-current', 'page');
    });

    test('marks the team link current on a trailing-slash visit', async ({ page }) => {
        const response = await page.goto(`${teamRoute.href}/`);

        expect(response?.status()).toBe(200);

        await expect(page).toHaveURL(`${teamRoute.href}/`);
        await expect(page.locator(`[data-nav-menu] a[href="${homeRoute.href}"]`)).not.toHaveAttribute('aria-current', 'page');
        await expect(page.locator(`[data-nav-menu] a[href="${portfolioRoute.href}"]`)).not.toHaveAttribute('aria-current', 'page');
        await expect(page.locator(`[data-nav-menu] a[href="${teamRoute.href}"]`)).toHaveAttribute('aria-current', 'page');
    });

    test('writes nothing to storage during pure navigation', async ({ page }) => {
        const initialEntries = await getStorageEntries(page);

        const menu = page.locator('[data-nav-menu]');

        for (const route of navigationSequence) {
            await menu.getByRole('link', { name: route.label }).click();

            await expect(menu.locator(`a[href="${route.href}"]`), route.label).toHaveAttribute('aria-current', 'page');
        }

        const finalEntries = await getStorageEntries(page);

        expect(finalEntries).toEqual(initialEntries);
        expect(finalEntries.map(([key]) => key)).not.toContain(THEME_KEY);
    });
});
