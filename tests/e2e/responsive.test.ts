import { expect, test } from '@playwright/test';
import { join } from 'node:path';
import { readdirSync } from 'node:fs';

import { ROUTES } from '../../src/lib/constants';

import type { Page } from '@playwright/test';

const MOBILE_BREAKPOINT = 768;
const SCRIPT_TIMEOUT = 20_000;
const VIEWPORT_HEIGHT = 800;
const WIDTHS = [320, 375, 767, 768, 769, 1_023, 1_024, 1_025, 1_280, 1_440] as const;

const pagePaths = readdirSync(join(process.cwd(), 'src/pages'))
    .filter(file => file.endsWith('.astro'))
    .map(file => file.replace(/\.astro$/, ''))
    .map(name => (name === 'index' ? '/' : `/${name}`))
    .sort();

function getHiddenScrollElementCount(page: Page) {
    return page.evaluate(() => [...document.querySelectorAll('[data-scroll]')].filter((element) => {
        const style = getComputedStyle(element);

        return style.opacity === '0' || style.visibility === 'hidden';
    }).length);
}

function getViewportMetrics(page: Page) {
    return page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
    }));
}

test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
});

test.describe('responsive layout', () => {
    for (const path of pagePaths) {
        test(`${path} fits every width with breakpoint-correct nav chrome, visible footer, and revealed scroll content`, async ({ page }) => {
            await page.setViewportSize({ height: VIEWPORT_HEIGHT, width: WIDTHS[0] });
            await page.goto(path);
            await page.locator('main').waitFor();

            for (const width of WIDTHS) {
                await page.setViewportSize({ height: VIEWPORT_HEIGHT, width });

                const metrics = await getViewportMetrics(page);

                expect(metrics.scrollWidth, `horizontal overflow at width ${width}`).toBeLessThanOrEqual(metrics.clientWidth);

                if (width < MOBILE_BREAKPOINT) {
                    await expect(page.locator('#navbar-menu'), `closed menu at width ${width}`).toBeHidden();
                    await expect(page.locator('[data-nav-toggle]'), `menu toggle at width ${width}`).toBeVisible();
                } else {
                    await expect(page.locator('[data-nav-toggle]'), `menu toggle at width ${width}`).toBeHidden();

                    for (const route of ROUTES) {
                        await expect(page.locator(`.navbar__link[href="${route.href}"]`), `${route.label} link at width ${width}`).toBeVisible();
                    }
                }

                await expect(page.locator('footer'), `footer at width ${width}`).toBeVisible();

                await expect
                    .poll(() => getHiddenScrollElementCount(page), {
                        message: `hidden [data-scroll] content at width ${width}`,
                        timeout: SCRIPT_TIMEOUT,
                    })
                    .toBe(0);
            }
        });
    }
});
