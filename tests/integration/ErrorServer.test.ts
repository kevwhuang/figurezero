import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, test } from 'vitest';

import ErrorServer from '../../src/sections/ErrorServer.astro';

describe('ErrorServer', () => {
    test('renders 500 heading', async () => {
        const container = await AstroContainer.create();

        const html = await container.renderToString(ErrorServer);

        expect(html).toMatch(/<h1[^>]*>\s*<span[^>]*>\s*500\s*<svg[\s\S]*?<\/span>\s*<\/h1>/);
    });
});
