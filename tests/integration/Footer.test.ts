import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, test } from 'vitest';

import Footer from '../../src/sections/Footer.astro';
import { ROUTES } from '../../src/lib/constants';

const EMAIL = 'figure.zero.project@gmail.com';
const INSTAGRAM = 'figure.zero.project';

describe('Footer', () => {
    let html: string;

    beforeAll(async () => {
        const container = await AstroContainer.create();

        html = await container.renderToString(Footer);
    });

    test('renders a single footer landmark', () => {
        expect(html).toMatch(/^<footer /);
        expect(html.split('<footer').length - 1).toBe(1);
    });

    test('renders the logo as a labeled image', () => {
        expect(html).toMatch(/<span[^>]*class="footer__logo[^"]*"[^>]*aria-label="Figure Zero Project"[^>]*role="img"/);
        expect(html).toMatch(/role="img"[^>]*><svg[^>]*aria-hidden="true"[^>]*viewBox="0 0 800 800"/);
    });

    test('renders a navigation link for every route in order', () => {
        const navStart = html.indexOf('<nav aria-label="Navigation"');

        const navigation = html.slice(navStart, html.indexOf('</nav>'));

        const links = [...navigation.matchAll(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g)].map(match => ({ href: match[1], label: match[2] }));

        expect(navStart).toBeGreaterThan(-1);
        expect(links).toEqual([...ROUTES]);
    });

    test('renders the contact address with the exact mailto link', () => {
        expect(html).toMatch(/<address class="not-italic" aria-label="Contact"/);
        expect(html).toContain(`>${EMAIL}</a>`);
        expect(html).toContain(`href="mailto:${EMAIL}"`);
    });

    test('renders the instagram link over https in a new tab', () => {
        expect(html).toContain(`>@${INSTAGRAM}</a>`);
        expect(html).toContain(`href="https://instagram.com/${INSTAGRAM}" rel="noopener" target="_blank"`);
    });

    test('renders the copyright line', () => {
        expect(html).toMatch(/<p class="eyebrow text-right max-md:text-left"[^>]*>&copy; 2026 Figure Zero Project<\/p>/);
    });
});
