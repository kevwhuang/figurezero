import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, test } from 'vitest';

import ErrorNotFound from '../../src/sections/ErrorNotFound.astro';
import { CLASS_ERROR_LINK } from '../../src/lib/constants';

describe('ErrorNotFound', () => {
    let html: string;

    beforeAll(async () => {
        const container = await AstroContainer.create();

        html = await container.renderToString(ErrorNotFound);
    });

    test('labels the section with the error heading', () => {
        expect(html).toMatch(/<section[^>]*aria-labelledby="error-not-found-title"/);
        expect(html.split('id="error-not-found-title"').length - 1).toBe(1);
    });

    test('renders the status code as the heading', () => {
        expect(html).toMatch(/<h1[^>]*id="error-not-found-title"[^>]*>404<\/h1>/);
    });

    test('explains the missing page', () => {
        expect(html).toContain('>This page does not exist.</p>');
    });

    test('links back home with the shared error link classes', () => {
        expect(html).toContain(`<a class="${CLASS_ERROR_LINK}" href="/">Back to home</a>`);
    });

    test('wraps the content in a scroll reveal', () => {
        const wrapperStart = html.indexOf('<div class="shell text-center" data-scroll>');

        const wrapper = html.slice(wrapperStart, html.indexOf('</div>', wrapperStart));

        expect(wrapperStart).toBeGreaterThan(-1);
        expect(wrapper).toContain('Back to home');
        expect(wrapper).toContain('id="error-not-found-title"');
    });
});
