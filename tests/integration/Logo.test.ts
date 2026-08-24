import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, test } from 'vitest';

import Logo from '../../src/components/Logo.astro';

const LOGO_PATH_COUNT = 2;
const LOGO_STROKE_COUNT = 3;

describe('Logo', () => {
    let html: string;

    beforeAll(async () => {
        const container = await AstroContainer.create();

        html = await container.renderToString(Logo);
    });

    test('renders the decorative logo svg', () => {
        expect(html).toContain('<svg class="block h-full w-full pointer-events-none"');
        expect(html).toContain('aria-hidden="true"');
        expect(html).toContain('viewBox="0 0 800 800"');
    });

    test('draws the circle and two strokes with the logo class', () => {
        expect(html.split('<circle').length - 1).toBe(1);
        expect(html.split('<path').length - 1).toBe(LOGO_PATH_COUNT);
        expect(html.split('class="logo__stroke fill-none stroke-[54.5] stroke-current"').length - 1).toBe(LOGO_STROKE_COUNT);
    });

    test('stays self-contained', () => {
        expect(html).not.toContain('href=');
        expect(html).not.toContain('src=');
    });
});
