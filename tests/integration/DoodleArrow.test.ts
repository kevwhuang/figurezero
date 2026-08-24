import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, test } from 'vitest';

import DoodleArrow from '../../src/components/DoodleArrow.astro';

const ARROW_STROKE_COUNT = 3;

describe('DoodleArrow', () => {
    let html: string;

    beforeAll(async () => {
        const container = await AstroContainer.create();

        html = await container.renderToString(DoodleArrow);
    });

    test('renders the decorative arrow svg', () => {
        expect(html).toContain('<svg class="absolute inset-0 h-full w-full pointer-events-none"');
        expect(html).toContain('aria-hidden="true"');
        expect(html).toContain('preserveAspectRatio="none"');
        expect(html).toContain('viewBox="0 0 200 120"');
    });

    test('draws three stroked arrow paths', () => {
        expect(html.split('<path').length - 1).toBe(ARROW_STROKE_COUNT);
        expect(html.split('class="doodle-arrow__stroke fill-none stroke-2 stroke-charcoal"').length - 1).toBe(ARROW_STROKE_COUNT);
    });

    test('stays self-contained', () => {
        expect(html).not.toContain('href=');
        expect(html).not.toContain('src=');
    });
});
