import { expect, test } from '@playwright/test';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';

import { ROUTES } from '../../src/lib/constants';

import type { Page } from '@playwright/test';

interface StructuredData {
    '@context': string;
    '@graph': {
        '@type': string;
        'itemListElement'?: unknown[];
        'name'?: string;
        'url'?: string;
    }[];
}

const DESCRIPTION_MAX = 160;
const DESCRIPTION_MIN = 120;
const HERO_LETTER_COUNT = 'Figure'.length + 'Zero'.length;
const POLL = { timeout: 10_000 } as const;
const PROD_ORIGIN = 'https://figurezeroproject.com';

const testimonyJournals = getTestimonyJournals();

function getRevealedLetterCount(page: Page) {
    return page.locator('[data-letter]').evaluateAll(letters => letters.filter(letter => letter.style.opacity === '1').length);
}

function getTestimonyJournals() {
    const source = readFileSync(join(process.cwd(), 'src', 'sections', 'Testimonies.astro'), 'utf-8');

    return [...source.matchAll(/journal: '([^']*)'/g)].map(([, journal]) => journal);
}

test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
});

test.describe('index page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('loads with the bare figure zero project title', async ({ page }) => {
        await expect(page).toHaveTitle('Figure Zero Project');
    });

    test('renders every home section with visible content', async ({ page }) => {
        expect(testimonyJournals.length).toBeGreaterThan(0);

        await expect(page.locator('#hero-title')).toBeVisible();
        await expect(page.locator('#hero-title')).toHaveAttribute('aria-label', 'Figure Zero');

        await expect(page.locator('section[aria-label="What is the Figure Zero Project?"] h2')).toContainText('Figure Zero Project?');
        await expect(page.locator('section[aria-label="What is the Figure Zero Project?"]')).toContainText('student-run organization');

        await expect(page.locator('section[aria-label="Vision and mission"] h2')).toHaveText(['Vision', 'Mission']);

        await expect(page.locator('#story-title')).toHaveText('It started on a FaceTime call.');

        await expect(page.locator('section[aria-label="Testimonies"] cite')).toHaveText(testimonyJournals);
    });

    test('reveals every hero letter once the motion script runs', async ({ page }) => {
        await expect(page.locator('[data-letter]')).toHaveCount(HERO_LETTER_COUNT);

        await expect.poll(() => getRevealedLetterCount(page), POLL).toBe(HERO_LETTER_COUNT);
    });

    test('exposes a meta description of the expected length naming the project', async ({ page }) => {
        const description = await page.locator('meta[name="description"]').getAttribute('content');

        expect(description).not.toBeNull();

        const text = String(description);

        expect(text).toContain('Figure Zero Project');
        expect(text.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
        expect(text.length).toBeGreaterThanOrEqual(DESCRIPTION_MIN);
    });

    test('embeds parseable json-ld website data without a breadcrumb', async ({ page }) => {
        const raw = await page.locator('script[type="application/ld+json"]').textContent();

        const data = JSON.parse(String(raw)) as StructuredData;

        const breadcrumb = data['@graph'].find(node => node['@type'] === 'BreadcrumbList');
        const itemList = data['@graph'].find(node => node['@type'] === 'ItemList');
        const website = data['@graph'].find(node => node['@type'] === 'WebSite');

        expect(breadcrumb).toBeUndefined();
        expect(data['@context']).toBe('https://schema.org');
        expect(itemList?.itemListElement).toHaveLength(ROUTES.length);
        expect(website?.name).toBe('Figure Zero Project');
        expect(website?.url).toContain(PROD_ORIGIN);
    });

    test('points the canonical link at the site root', async ({ page }) => {
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${PROD_ORIGIN}/`);
    });

    test('fits the default viewport without horizontal overflow', async ({ page }) => {
        const metrics = await page.evaluate(() => ({
            clientWidth: document.documentElement.clientWidth,
            scrollWidth: document.documentElement.scrollWidth,
        }));

        expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
    });
});

test.describe('index page console', () => {
    test('loads without console errors', async ({ page }) => {
        const errors: string[] = [];

        page.on('console', (message) => {
            if (message.type() === 'error') errors.push(message.text());
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        expect(errors).toEqual([]);
    });
});
