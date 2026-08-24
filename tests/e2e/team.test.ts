import { expect, test } from '@playwright/test';
import { join } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';

import { ROUTES } from '../../src/lib/constants';

import type { Locator } from '@playwright/test';

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

interface TeamMember {
    bio?: string;
    group: string;
    name: string;
    program?: string;
}

const DESCRIPTION_MAX = 160;
const DESCRIPTION_MIN = 120;

const GROUP_LABELS = [
    { key: 'artists', label: 'Artists' },
    { key: 'investigators', label: 'Science investigators' },
    { key: 'interns', label: 'Summer interns' },
] as const;

const POLL = { timeout: 10_000 } as const;
const PROD_ORIGIN = 'https://figurezeroproject.com';

const breadcrumbRoutes = ROUTES.filter(route => ['/', '/team'].includes(route.href));
const members = getTeamMembers();

const groupKeys = [...new Set(members.map(member => member.group))].filter(group => group !== 'co-presidents');
const presidents = members.filter(member => member.group === 'co-presidents');

function getInlineOpacity(locator: Locator) {
    return locator.evaluate(element => element.style.opacity);
}

function getTeamMembers() {
    const teamRoot = join(process.cwd(), 'src', 'content', 'team');

    return readdirSync(teamRoot)
        .filter(file => file.endsWith('.json'))
        .map(file => JSON.parse(readFileSync(join(teamRoot, file), 'utf-8')) as TeamMember)
        .sort((memberA, memberB) => memberA.name.localeCompare(memberB.name));
}

test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
});

test.describe('team page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/team');
    });

    test('loads with the team title', async ({ page }) => {
        await expect(page).toHaveTitle('Team \u2014 Figure Zero Project');
    });

    test('renders the our team heading', async ({ page }) => {
        await expect(page.locator('#team-title')).toBeVisible();
        await expect(page.locator('#team-title')).toHaveText('Our team');
    });

    test('renders the four group headings in order', async ({ page }) => {
        const headings = ['Co-presidents', ...GROUP_LABELS.map(group => group.label)];

        await expect(page.locator('section[aria-labelledby="team-title"] h2')).toHaveText(headings);
    });

    test('renders every team member from the content collection', async ({ page }) => {
        expect(members.length).toBeGreaterThan(0);

        await expect(page.locator('section[aria-label="Co-presidents"] article')).toHaveCount(presidents.length);
        await expect(page.locator('section[aria-labelledby="team-title"] li')).toHaveCount(members.length);

        for (const key of groupKeys) {
            const label = GROUP_LABELS.find(group => group.key === key)?.label;

            expect(label, key).toBeDefined();

            const groupLabel = String(label);
            const groupMembers = members.filter(member => member.group === key);

            const names = page.locator(`section[aria-label="${groupLabel}"] figcaption > p:first-child`);

            await expect(names, groupLabel).toHaveText(groupMembers.map(member => member.name));
        }
    });

    test('shows the co-president names, programs, and bios', async ({ page }) => {
        expect(presidents.length).toBeGreaterThan(0);

        await expect.poll(() => getInlineOpacity(page.locator('#team-title')), POLL).toBe('1');

        for (const [index, president] of presidents.entries()) {
            expect(president.bio, president.name).toBeDefined();
            expect(president.program, president.name).toBeDefined();

            const article = page.locator('section[aria-label="Co-presidents"] article').nth(index);

            await expect(article.locator('h3'), president.name).toHaveText(president.name);
            await expect(article.locator('p').nth(0), president.name).toHaveText(String(president.program));
            await expect(article.locator('p').nth(1), president.name).toBeVisible();
            await expect(article.locator('p').nth(1), president.name).toHaveText(String(president.bio));
        }
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

    test('points the canonical link at the slashless team url', async ({ page }) => {
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${PROD_ORIGIN}/team`);
    });

    test('fits the default viewport without horizontal overflow', async ({ page }) => {
        const metrics = await page.evaluate(() => ({
            clientWidth: document.documentElement.clientWidth,
            scrollWidth: document.documentElement.scrollWidth,
        }));

        expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
    });
});

test.describe('team page console', () => {
    test('loads without console errors', async ({ page }) => {
        const errors: string[] = [];

        page.on('console', (message) => {
            if (message.type() === 'error') errors.push(message.text());
        });

        await page.goto('/team');
        await page.waitForLoadState('networkidle');

        expect(errors).toEqual([]);
    });
});
