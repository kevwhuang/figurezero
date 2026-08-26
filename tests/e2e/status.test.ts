import { expect, test } from '@playwright/test';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';

import { ROUTES } from '../../src/lib/constants';

import type { APIResponse } from '@playwright/test';

const API_PATHS = ['/api', '/api/', '/api/deep/path', '/api/x'] as const;
const IMAGE_PATHS = ['/apple-touch-icon.png', '/favicon.png', '/og.png'] as const;

const SECURITY_HEADER_NAMES = [
    'content-security-policy',
    'permissions-policy',
    'referrer-policy',
    'strict-transport-security',
    'x-content-type-options',
    'x-frame-options',
] as const;

const SITE = 'https://figurezeroproject.com';

const pagePaths = ROUTES.map(route => route.href);
const securityHeaders = getSecurityHeaders();

async function expectJsonNotFound(response: APIResponse) {
    expect(response.headers()['content-type']).toContain('application/json');
    expect(response.status()).toBe(404);

    const body: Record<string, unknown> = await response.json();

    expect(body).toEqual({ error: 'Not found.' });
}

function getSecurityHeaders() {
    const config = readFileSync(join(process.cwd(), 'netlify.toml'), 'utf-8');

    const section = config.split('[[headers]]').find(block => block.includes(`for = '/*'`));

    if (section === undefined) throw new Error('Missing headers block for /* in netlify.toml.');

    return [...section.matchAll(/^([a-z-]+) = (['"])(.*)\2$/gm)]
        .map(match => [match[1] ?? '', match[3] ?? ''] as const)
        .filter(([name]) => name !== 'for');
}

test.describe('api', () => {
    for (const path of API_PATHS) {
        test(`returns a json 404 for ${path} on get`, async ({ request }) => {
            await expectJsonNotFound(await request.get(path));
        });

        test(`returns a json 404 for ${path} on post`, async ({ request }) => {
            await expectJsonNotFound(await request.post(path, { data: {} }));
        });
    }
});

test.describe('assets', () => {
    for (const path of IMAGE_PATHS) {
        test(`serves ${path} as a png image`, async ({ request }) => {
            const response = await request.get(path);

            expect(response.headers()['content-type']).toContain('image/png');
            expect(response.status()).toBe(200);
        });
    }

    test('serves robots.txt as plain text mentioning the sitemap', async ({ request }) => {
        const response = await request.get('/robots.txt');

        test.skip(response.status() === 404, 'robots.txt is generated at build time and absent on the dev server');

        expect(response.headers()['content-type']).toContain('text/plain');
        expect(response.status()).toBe(200);

        expect(await response.text()).toContain(`Sitemap: ${SITE}/sitemap-index.xml`);
    });

    test('serves the sitemap index as xml', async ({ request }) => {
        const response = await request.get('/sitemap-index.xml');

        test.skip(response.status() === 404, 'the sitemap is generated at build time and absent on the dev server');

        expect(response.headers()['content-type']).toContain('xml');
        expect(response.status()).toBe(200);
    });
});

test.describe('pages', () => {
    test('serves the public pages as html', async ({ request }) => {
        for (const path of pagePaths) {
            const response = await request.get(path);

            expect(response.headers()['content-type'], path).toContain('text/html');
            expect(response.status(), path).toBe(200);
        }
    });

    test('serves the 404 page as html with a 404 status', async ({ request }) => {
        const response = await request.get('/404');

        expect(response.headers()['content-type']).toContain('text/html');
        expect(response.status()).toBe(404);
    });

    test('serves the 500 page as html with a 500 status', async ({ request }) => {
        const response = await request.get('/500');

        expect(response.headers()['content-type']).toContain('text/html');
        expect(response.status()).toBe(500);

        expect(await response.text()).toContain('<title>Server Error \u2014 Figure Zero Project</title>');
    });

    test('returns 404 for an unknown page', async ({ request }) => {
        const response = await request.get('/this-page-does-not-exist');

        expect(response.headers()['content-type']).toContain('text/html');
        expect(response.status()).toBe(404);
    });

    test('serves the hardened security headers', async ({ request }) => {
        const response = await request.get('/');

        const headers = response.headers();

        expect(securityHeaders.map(([name]) => name)).toEqual([...SECURITY_HEADER_NAMES]);

        for (const [name, value] of securityHeaders) {
            expect(headers[name], name).toBe(value);
        }
    });

    test('serves a trailing slash path as html on the dev server', async ({ request }) => {
        const response = await request.get('/team/');

        expect(response.headers()['content-type']).toContain('text/html');
        expect(response.status()).toBe(200);
    });
});
