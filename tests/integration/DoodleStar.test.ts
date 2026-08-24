import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, test } from 'vitest';

import DoodleStar from '../../src/components/DoodleStar.astro';

const STAR_STROKE_COUNT = 3;

describe('DoodleStar', () => {
    let html: string;

    beforeAll(async () => {
        const container = await AstroContainer.create();

        html = await container.renderToString(DoodleStar);
    });

    test('renders the decorative star svg', () => {
        expect(html).toContain('<svg class="absolute inset-0 h-full w-full pointer-events-none"');
        expect(html).toContain('aria-hidden="true"');
        expect(html).not.toContain('preserveAspectRatio');
        expect(html).toContain('viewBox="0 0 40 40"');
    });

    test('draws three stroked star strokes', () => {
        expect(html.split('<path').length - 1).toBe(STAR_STROKE_COUNT);
        expect(html.split('class="doodle-star__stroke fill-none stroke-[2.5] stroke-charcoal"').length - 1).toBe(STAR_STROKE_COUNT);
    });

    test('stays self-contained', () => {
        expect(html).not.toContain('href=');
        expect(html).not.toContain('src=');
    });
});
