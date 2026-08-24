import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, test } from 'vitest';

import DoodleWave from '../../src/components/DoodleWave.astro';

describe('DoodleWave', () => {
    let html: string;

    beforeAll(async () => {
        const container = await AstroContainer.create();

        html = await container.renderToString(DoodleWave);
    });

    test('renders the decorative wave svg', () => {
        expect(html).toContain('<svg class="-bottom-2 absolute left-0 h-3 w-full pointer-events-none"');
        expect(html).toContain('aria-hidden="true"');
        expect(html).toContain('preserveAspectRatio="none"');
        expect(html).toContain('viewBox="0 0 200 14"');
    });

    test('draws one stroked wave path', () => {
        expect(html).toContain('class="doodle-wave__stroke fill-none stroke-[1.5] stroke-charcoal"');
        expect(html.split('<path').length - 1).toBe(1);
    });

    test('stays self-contained', () => {
        expect(html).not.toContain('href=');
        expect(html).not.toContain('src=');
    });
});
