import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, test } from 'vitest';

import DoodleEllipse from '../../src/components/DoodleEllipse.astro';

describe('DoodleEllipse', () => {
    let html: string;

    beforeAll(async () => {
        const container = await AstroContainer.create();

        html = await container.renderToString(DoodleEllipse);
    });

    test('renders the decorative ellipse svg', () => {
        expect(html).toContain('<svg class="absolute left-[-6%] top-[-14%] h-[128%] w-[112%] pointer-events-none"');
        expect(html).toContain('aria-hidden="true"');
        expect(html).toContain('preserveAspectRatio="none"');
        expect(html).toContain('viewBox="0 0 260 80"');
    });

    test('draws one tilted stroked ellipse', () => {
        expect(html).toMatch(/<ellipse[^>]*cx="130"[^>]*cy="40"[^>]*rx="122"[^>]*ry="32"[^>]*transform="rotate\(-2 130 40\)"/);
        expect(html).toContain('class="doodle-ellipse__stroke fill-none stroke-2 stroke-charcoal"');
        expect(html.split('<ellipse').length - 1).toBe(1);
        expect(html.split('<path').length - 1).toBe(0);
    });

    test('stays self-contained', () => {
        expect(html).not.toContain('href=');
        expect(html).not.toContain('src=');
    });
});
