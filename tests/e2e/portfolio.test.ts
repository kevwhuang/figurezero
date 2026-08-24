import { expect, test } from '@playwright/test';
import { join } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';

import { ROUTES } from '../../src/lib/constants';

interface PortfolioWork {
    artist: string;
    college: string;
    title: string;
}

interface StructuredData {
    '@context': string;
    '@graph': {
        '@type': string;
        'itemListElement'?: {
            '@type': string;
            'item': string;
            'name': string;
            'position': number;
        }[];
    }[];
}

const DESCRIPTION_MAX = 160;
const DESCRIPTION_MIN = 120;
const ORDINAL_WIDTH = 2;
const PROD_ORIGIN = 'https://figurezeroproject.com';

const breadcrumbRoutes = ROUTES.filter(route => ['/', '/portfolio'].includes(route.href));
const collaborationNames = getCollaborationNames();
const logoCount = readdirSync(join(process.cwd(), 'src', 'images', 'logos')).filter(file => file.endsWith('.webp')).length;
const works = getPortfolioWorks();

const ordinals = works.map((_, index) => String(index + 1).padStart(ORDINAL_WIDTH, '0'));

function getCollaborationNames() {
    const source = readFileSync(join(process.cwd(), 'src', 'sections', 'Collaborations.astro'), 'utf-8');

    return [...source.matchAll(/name: '([^']*)'/g)].map(([, name]) => name);
}

function getPortfolioWorks() {
    const portfolioRoot = join(process.cwd(), 'src', 'content', 'portfolio');

    return readdirSync(portfolioRoot)
        .filter(file => file.endsWith('.json'))
        .map(file => JSON.parse(readFileSync(join(portfolioRoot, file), 'utf-8')) as PortfolioWork)
        .sort((workA, workB) => workA.title.localeCompare(workB.title));
}

test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
});

test.describe('portfolio page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/portfolio');
    });

    test('loads with the portfolio title', async ({ page }) => {
        await expect(page).toHaveTitle('Portfolio \u2014 Figure Zero Project');
    });

    test('renders the portfolio heading', async ({ page }) => {
        await expect(page.locator('#works-title')).toBeVisible();
        await expect(page.locator('#works-title')).toHaveAttribute('aria-label', 'The Portfolio');
    });

    test('renders one article per portfolio entry with title, artist, and college', async ({ page }) => {
        expect(works.length).toBeGreaterThan(0);

        const articles = page.locator('section[aria-labelledby="works-title"] article');

        await expect(articles).toHaveCount(works.length);
        await expect(articles.locator('h2')).toHaveText(works.map(work => work.title));

        for (const [index, work] of works.entries()) {
            await expect(articles.nth(index), work.title).toContainText(work.artist);
            await expect(articles.nth(index), work.title).toContainText(work.college);
        }
    });

    test('numbers the works with ascending zero-padded ordinals', async ({ page }) => {
        await expect(page.locator('.works__index')).toHaveText(ordinals);
    });

    test('renders every collaboration logo with its caption', async ({ page }) => {
        expect(collaborationNames).toContain('POCUS Journal');
        expect(collaborationNames).toHaveLength(logoCount);

        await expect(page.locator('#collaborations-title')).toContainText('worked with');
        await expect(page.locator('section[aria-labelledby="collaborations-title"] figcaption')).toHaveText(collaborationNames);
        await expect(page.locator('section[aria-labelledby="collaborations-title"] li')).toHaveCount(logoCount);
    });

    test('exposes a meta description of the expected length', async ({ page }) => {
        const description = await page.locator('meta[name="description"]').getAttribute('content');

        expect(description).not.toBeNull();

        const text = String(description);

        expect(text.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
        expect(text.length).toBeGreaterThanOrEqual(DESCRIPTION_MIN);
    });

    test('embeds parseable json-ld breadcrumb data', async ({ page }) => {
        const raw = await page.locator('script[type="application/ld+json"]').textContent();

        const data = JSON.parse(String(raw)) as StructuredData;

        const breadcrumb = data['@graph'].find(node => node['@type'] === 'BreadcrumbList');

        expect(breadcrumb?.itemListElement).toEqual(breadcrumbRoutes.map((route, index) => ({
            '@type': 'ListItem',
            'item': new URL(route.href, PROD_ORIGIN).href,
            'name': route.label,
            'position': index + 1,
        })));

        expect(data['@context']).toBe('https://schema.org');
    });

    test('points the canonical link at the slashless portfolio url', async ({ page }) => {
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${PROD_ORIGIN}/portfolio`);
    });

    test('fits the default viewport without horizontal overflow', async ({ page }) => {
        const metrics = await page.evaluate(() => ({
            clientWidth: document.documentElement.clientWidth,
            scrollWidth: document.documentElement.scrollWidth,
        }));

        expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
    });
});

test.describe('portfolio page console', () => {
    test('loads without console errors', async ({ page }) => {
        const errors: string[] = [];

        page.on('console', (message) => {
            if (message.type() === 'error') errors.push(message.text());
        });

        await page.goto('/portfolio');
        await page.waitForLoadState('networkidle');

        expect(errors).toEqual([]);
    });
});
