import { expect, test } from '@playwright/test';
import { join } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';

import { ROUTES } from '../../src/lib/constants';

import type { APIRequestContext } from '@playwright/test';

const BASE_URL = 'https://figurezeroproject.com';

const PAGES = [
    { path: '/', status: 200, title: 'Figure Zero Project' },
    { path: '/team', status: 200, title: 'Team \u2014 Figure Zero Project' },
    { path: '/portfolio', status: 200, title: 'Portfolio \u2014 Figure Zero Project' },
    { path: '/404', status: 200, title: 'Page Not Found \u2014 Figure Zero Project' },
    { path: '/500', status: 500, title: 'Server Error \u2014 Figure Zero Project' },
] as const;

const PROBE_TIMEOUT = 15_000;
const PUBLIC_PATHS = ['/', '/team', '/portfolio'] as const;

const SECURITY_HEADER_NAMES = [
    'content-security-policy',
    'permissions-policy',
    'referrer-policy',
    'strict-transport-security',
    'x-content-type-options',
    'x-frame-options',
] as const;

const TEST_TIMEOUT = 60_000;

const canonicalUrls = ROUTES.map(route => `${BASE_URL}${route.href}`.replace(/\/$/, ''));
const contentRoot = join(process.cwd(), 'src/content');
const netlifyConfig = readFileSync(join(process.cwd(), 'netlify.toml'), 'utf-8');

const assetCacheControl = getHeaderValue(netlifyConfig, 'cache-control').replaceAll(', ', ',');
const portfolioEntries = getEntries(contentRoot, 'portfolio');
const securityHeaderNames = getHeaderNames(netlifyConfig, '/*');
const teamEntries = getEntries(contentRoot, 'team');

const memberCardCount = teamEntries.filter(entry => entry.group !== 'co-presidents').length;
const portfolioTitles = portfolioEntries.map(entry => String(entry.title));
const teamNames = teamEntries.map(entry => String(entry.name));

let isProdReachable = false;

function getEntries(root: string, collection: string) {
    return readdirSync(join(root, collection))
        .filter(file => file.endsWith('.json'))
        .map(file => JSON.parse(readFileSync(join(root, collection, file), 'utf-8')) as Record<string, unknown>);
}

function getHeaderNames(config: string, scope: string) {
    const section = config.split('[[headers]]').find(block => block.includes(`for = '${scope}'`));

    if (section === undefined) throw new Error(`missing headers block for ${scope} in netlify.toml`);

    return [...section.matchAll(/^([\w-]+) = /gm)]
        .map(match => match[1] ?? '')
        .filter(name => name !== 'for');
}

function getHeaderValue(config: string, name: string) {
    const match = config.match(new RegExp(`^${name} = (['"])(.+)\\1$`, 'm'));

    if (match === null) throw new Error(`missing ${name} in netlify.toml`);

    return match[2];
}

async function getHtml(api: APIRequestContext, path: string, expectedStatus = 200) {
    const response = await api.get(`${BASE_URL}${path}`);

    expect(response.headers()['content-type'], path).toContain('text/html');
    expect(response.status(), path).toBe(expectedStatus);

    return response.text();
}

function getLocations(xml: string) {
    return [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map(match => match[1] ?? '');
}

test.describe.configure({ timeout: TEST_TIMEOUT });

test.beforeAll(async ({ request }) => {
    try {
        const response = await request.get(`${BASE_URL}/`, { timeout: PROBE_TIMEOUT });

        isProdReachable = response.ok();
    } catch {
        isProdReachable = false;
    }
});

test.beforeEach(() => {
    test.skip(!isProdReachable, `production origin ${BASE_URL} is unreachable`);
});

test.describe('production api', () => {
    test('returns a json 404 for an unknown api path', async ({ request }) => {
        const response = await request.get(`${BASE_URL}/api/x`);

        expect(response.headers()['content-type']).toContain('application/json');
        expect(response.status()).toBe(404);

        const body: Record<string, unknown> = await response.json();

        expect(body).toEqual({ error: 'Not found' });
    });
});

test.describe('production assets', () => {
    test('serves the social preview image as png', async ({ request }) => {
        const response = await request.get(`${BASE_URL}/og.png`);

        expect(response.headers()['content-type']).toContain('image/png');
        expect(response.status()).toBe(200);
    });

    test('serves robots.txt pointing at the sitemap index', async ({ request }) => {
        const response = await request.get(`${BASE_URL}/robots.txt`);

        expect(response.headers()['content-type']).toContain('text/plain');
        expect(response.status()).toBe(200);
        expect(await response.text()).toContain(`Sitemap: ${BASE_URL}/sitemap-index.xml`);
    });

    test('serves the sitemap index as xml', async ({ request }) => {
        const response = await request.get(`${BASE_URL}/sitemap-index.xml`);

        expect(response.headers()['content-type']).toContain('xml');
        expect(response.status()).toBe(200);
        expect(await response.text()).toContain('<sitemapindex');
    });

    test('lists exactly the slashless canonical page urls across the sitemap', async ({ request }) => {
        const indexResponse = await request.get(`${BASE_URL}/sitemap-index.xml`);

        expect(indexResponse.status()).toBe(200);

        const indexXml = await indexResponse.text();

        expect(indexXml).toContain('<sitemapindex');

        const locations: string[] = [];

        for (const sitemapUrl of getLocations(indexXml)) {
            const response = await request.get(sitemapUrl);

            expect(response.status(), sitemapUrl).toBe(200);
            locations.push(...getLocations(await response.text()));
        }

        expect(locations.sort()).toEqual([...canonicalUrls].sort());
    });
});

test.describe('production headers', () => {
    test('sends the security headers declared in netlify.toml on the home page', async ({ request }) => {
        const response = await request.get(`${BASE_URL}/`);

        const headers = response.headers();

        expect(securityHeaderNames).toEqual([...SECURITY_HEADER_NAMES]);

        for (const name of securityHeaderNames) {
            expect(headers[name], name).toBe(getHeaderValue(netlifyConfig, name));
        }
    });

    test('sends the immutable cache-control declared in netlify.toml on a hashed asset', async ({ request }) => {
        const html = await getHtml(request, '/');

        const [assetPath] = html.match(/\/_astro\/[^"]+/) ?? [];

        expect(assetCacheControl).toContain('immutable');
        expect(assetPath).toBeDefined();

        const response = await request.get(`${BASE_URL}${assetPath}`);

        expect(response.headers()['cache-control']).toBe(assetCacheControl);
        expect(response.status()).toBe(200);
    });
});

test.describe('production indexing', () => {
    for (const path of PUBLIC_PATHS) {
        test(`keeps ${path} indexable`, async ({ request }) => {
            const html = await getHtml(request, path);

            expect(html).toContain('content="index, follow"');
            expect(html).not.toContain('noindex');
        });
    }

    test('marks the 404 page noindex', async ({ request }) => {
        const html = await getHtml(request, '/404');

        expect(html).not.toContain('content="index, follow"');
        expect(html).toContain('content="noindex, nofollow"');
    });
});

test.describe('production pages', () => {
    for (const { path, status, title } of PAGES) {
        test(`serves ${path} with status ${status} and its committed title`, async ({ request }) => {
            const html = await getHtml(request, path, status);

            expect(html).toContain(`<title>${title}</title>`);
        });
    }

    test('returns 404 for an unknown page', async ({ request }) => {
        const response = await request.get(`${BASE_URL}/this-page-does-not-exist`);

        expect(response.headers()['content-type']).toContain('text/html');
        expect(response.status()).toBe(404);
    });

    test('lists every committed team member on the team page', async ({ request }) => {
        const html = await getHtml(request, '/team');

        for (const name of teamNames) {
            expect(html, name).toContain(`>${name}<`);
        }

        expect(html.split('<figcaption').length - 1).toBeGreaterThanOrEqual(memberCardCount);
    });

    test('lists every committed work on the portfolio page', async ({ request }) => {
        const html = await getHtml(request, '/portfolio');

        for (const workTitle of portfolioTitles) {
            expect(html, workTitle).toContain(workTitle);
        }

        expect(html.split('<article').length - 1).toBeGreaterThanOrEqual(portfolioTitles.length);
    });
});

test.describe('production redirects', () => {
    test('redirects the trailing slash team path to its canonical url with a 301', async ({ request }) => {
        const response = await request.get(`${BASE_URL}/team/`, { maxRedirects: 0 });

        expect(response.headers().location).toBe('/team');
        expect(response.status()).toBe(301);
    });
});
