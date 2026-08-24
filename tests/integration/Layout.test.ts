import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, test } from 'vitest';

import Layout from '../../src/Layout.astro';
import { COLOR_SCHEME_QUERIES, ROUTES, THEME_COLORS } from '../../src/lib/constants';

interface LayoutProps {
    description: string;
    noindex?: boolean;
    title: string;
}

interface StructuredData {
    '@context': string;
    '@graph': {
        '@type': string;
        'author'?: { '@type': string; 'name': string };
        'inLanguage'?: string;
        'itemListElement'?: unknown[];
        'name'?: string;
        'url'?: string;
    }[];
}

const BASE_GRAPH_NODE_COUNT = 2;
const DESCRIPTION = 'Figure Zero Project pairs student artists with scientific journals to create original cover illustrations.';
const SITE = 'https://figurezeroproject.com';
const SLOT = '<section data-slot="page">Slot content</section>';
const THEME_COLOR_META_COUNT = 2;
const TITLE = 'Team \u2014 Figure Zero Project';

const breadcrumbRoute = ROUTES[1];

const expectedNavigation = ROUTES.map((route, index) => ({
    '@type': 'SiteNavigationElement',
    'name': route.label,
    'position': index + 1,
    'url': `${SITE}${route.href}`,
}));

const expectedBreadcrumbs = [ROUTES[0], breadcrumbRoute].map((route, index) => ({
    '@type': 'ListItem',
    'item': `${SITE}${route.href}`,
    'name': route.label,
    'position': index + 1,
}));

function getStructuredData(markup: string) {
    const match = markup.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);

    return match ? JSON.parse(match[1]) as StructuredData : null;
}

async function renderLayout(overrides: Partial<LayoutProps> = {}, request?: Request) {
    const container = await AstroContainer.create({ astroConfig: { site: SITE } });

    return container.renderToString(Layout, {
        partial: false,
        props: { description: DESCRIPTION, title: TITLE, ...overrides },
        request,
        slots: { default: SLOT },
    });
}

describe('Layout', () => {
    let html: string;

    beforeAll(async () => {
        html = await renderLayout();
    });

    test('renders the full page skeleton', () => {
        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('</body></html>');
        expect(html).toContain('</head>');
        expect(html).toContain('<body class="flex flex-col min-h-svh antialiased font-serif bg-cream text-charcoal">');
        expect(html).toContain('<head>');
        expect(html).toContain('<html lang="en-CA">');
    });

    test('declares the charset and viewport metas', () => {
        expect(html).toContain('<meta charset="utf-8">');
        expect(html).toContain('<meta content="width=device-width, initial-scale=1" name="viewport">');
    });

    test('renders the title prop as the document title', () => {
        expect(html).toContain(`<title>${TITLE}</title>`);
    });

    test('wires the description prop into meta tags', () => {
        expect(html).toContain(`<meta content="${DESCRIPTION}" name="description">`);
        expect(html).toContain(`<meta content="${DESCRIPTION}" name="twitter:description">`);
        expect(html).toContain(`<meta content="${DESCRIPTION}" property="og:description">`);
    });

    test('mirrors the title into social metas', () => {
        expect(html).toContain(`<meta content="${TITLE}" name="twitter:title">`);
        expect(html).toContain(`<meta content="${TITLE}" property="og:title">`);
    });

    test('renders canonical and site identity tags', () => {
        expect(html).toContain(`<link href="${SITE}/" rel="canonical">`);
        expect(html).toContain(`<meta content="${SITE}/" property="og:url">`);
        expect(html).toContain('<meta content="Figure Zero Project" property="og:site_name">');
        expect(html).toContain('<meta content="Yolanda Huang" name="author">');
        expect(html).toContain('<meta content="en_CA" property="og:locale">');
        expect(html).toContain('<meta content="summary_large_image" name="twitter:card">');
        expect(html).toContain('<meta content="website" property="og:type">');
    });

    test('points the social images at the site og asset', () => {
        expect(html).toContain(`<meta content="${SITE}/og.png" name="twitter:image">`);
        expect(html).toContain(`<meta content="${SITE}/og.png" property="og:image">`);
    });

    test('gates the two theme-color metas by colour scheme', () => {
        expect(html).toContain(`<meta content="${THEME_COLORS.dark}" media="${COLOR_SCHEME_QUERIES.dark}" name="theme-color">`);
        expect(html).toContain(`<meta content="${THEME_COLORS.light}" media="${COLOR_SCHEME_QUERIES.light}" name="theme-color">`);
        expect(html.split('name="theme-color">').length - 1).toBe(THEME_COLOR_META_COUNT);
    });

    test('links the favicon and touch icon', () => {
        expect(html).toContain('<link href="/apple-touch-icon.png" rel="apple-touch-icon">');
        expect(html).toContain('<link href="/favicon.png" rel="icon" type="image/png">');
    });

    test('embeds valid json-ld describing the site', () => {
        const jsonLd = getStructuredData(html);

        const itemList = jsonLd?.['@graph'].find(node => node['@type'] === 'ItemList');
        const website = jsonLd?.['@graph'].find(node => node['@type'] === 'WebSite');

        expect(jsonLd).not.toBeNull();
        expect(html.split('<script type="application/ld+json">').length - 1).toBe(1);
        expect(itemList?.itemListElement).toEqual(expectedNavigation);
        expect(jsonLd?.['@context']).toBe('https://schema.org');
        expect(website?.author).toEqual({ '@type': 'Person', 'name': 'Yolanda Huang' });
        expect(website?.inLanguage).toBe('en-CA');
        expect(website?.name).toBe('Figure Zero Project');
        expect(website?.url).toBe(`${SITE}/`);
    });

    test('omits the breadcrumb list on the home route', () => {
        const jsonLd = getStructuredData(html);

        expect(jsonLd?.['@graph'].map(node => node['@type'])).toEqual(['ItemList', 'WebSite']);
    });

    test('omits the breadcrumb list when the route matches no navigation entry', async () => {
        const unmatched = await renderLayout({}, new Request(`${SITE}/no-such-route`));

        const jsonLd = getStructuredData(unmatched);

        expect(jsonLd?.['@graph'].map(node => node['@type'])).toEqual(['ItemList', 'WebSite']);
    });

    test('adds the breadcrumb list and slashless canonical when the route matches a non-home navigation entry', async () => {
        const routed = await renderLayout({}, new Request(`${SITE}${breadcrumbRoute.href}`));

        const jsonLd = getStructuredData(routed);

        const breadcrumb = jsonLd?.['@graph'].find(node => node['@type'] === 'BreadcrumbList');

        expect(breadcrumb?.itemListElement).toEqual(expectedBreadcrumbs);
        expect(jsonLd?.['@graph']).toHaveLength(BASE_GRAPH_NODE_COUNT + 1);
        expect(routed).not.toContain(`${SITE}${breadcrumbRoute.href}/`);
        expect(routed).toContain(`<link href="${SITE}${breadcrumbRoute.href}" rel="canonical">`);
        expect(routed).toContain(`<meta content="${SITE}${breadcrumbRoute.href}" property="og:url">`);
    });

    test('enables the client router', () => {
        expect(html).toContain('<meta name="astro-view-transitions-enabled" content="true">');
        expect(html).toContain('<meta name="astro-view-transitions-fallback" content="animate">');
        expect(html.split('ClientRouter.astro?astro&type=script').length - 1).toBe(1);
    });

    test('attaches exactly one page-load script hook', () => {
        expect(html.split('Layout.astro?astro&type=script').length - 1).toBe(1);
    });

    test('renders slot content inside the main landmark', () => {
        expect(html).toContain('<main class="flex flex-1 flex-col">');
        expect(html).toContain(SLOT);
        expect(html.indexOf(SLOT)).toBeLessThan(html.indexOf('</main>'));
        expect(html.indexOf(SLOT)).toBeGreaterThan(html.indexOf('<main'));
    });

    test('orders the navbar, slot content, and footer inside the body', () => {
        const bodyIndex = html.indexOf('<body');
        const footerIndex = html.indexOf('<footer');
        const headerIndex = html.indexOf('<header class="navbar');
        const slotIndex = html.indexOf(SLOT);

        expect(footerIndex).toBeGreaterThan(slotIndex);
        expect(headerIndex).toBeGreaterThan(bodyIndex);
        expect(html.indexOf('</body>')).toBeGreaterThan(footerIndex);
        expect(slotIndex).toBeGreaterThan(headerIndex);
    });

    describe('robots directives', () => {
        test('serves index, follow by default', () => {
            expect(html).toContain('<meta content="index, follow" name="robots">');
            expect(html).not.toContain('noindex');
        });

        test('serves noindex, nofollow for the noindex variant', async () => {
            const noindexed = await renderLayout({ noindex: true });

            expect(noindexed).toContain('<meta content="noindex, nofollow" name="robots">');
            expect(noindexed).not.toContain('content="index, follow"');
        });
    });
});
