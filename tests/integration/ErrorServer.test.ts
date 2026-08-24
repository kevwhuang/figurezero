import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, test } from 'vitest';

import ErrorServer from '../../src/sections/ErrorServer.astro';
import { CLASS_ERROR_LINK } from '../../src/lib/constants';

describe('ErrorServer', () => {
    let html: string;

    beforeAll(async () => {
        const container = await AstroContainer.create();

        html = await container.renderToString(ErrorServer);
    });

    test('labels the section with the error heading', () => {
        expect(html).toMatch(/<section[^>]*aria-labelledby="error-server-title"/);
        expect(html.split('id="error-server-title"').length - 1).toBe(1);
    });

    test('renders the status code as the heading', () => {
        expect(html).toMatch(/<h1[^>]*id="error-server-title"[^>]*>500<\/h1>/);
    });

    test('explains the server failure', () => {
        expect(html).toContain('>Something went wrong. Please try again.</p>');
    });

    test('links back home with the shared error link classes', () => {
        expect(html).toContain(`<a class="${CLASS_ERROR_LINK}" href="/">Back to home</a>`);
    });

    test('wraps the content in a scroll reveal', () => {
        const wrapperStart = html.indexOf('<div class="shell text-center" data-scroll>');

        const wrapper = html.slice(wrapperStart, html.indexOf('</div>', wrapperStart));

        expect(wrapperStart).toBeGreaterThan(-1);
        expect(wrapper).toContain('Back to home');
        expect(wrapper).toContain('id="error-server-title"');
    });
});
