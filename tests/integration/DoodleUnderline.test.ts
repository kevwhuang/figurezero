import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, test } from 'vitest';

import DoodleUnderline from '../../src/components/DoodleUnderline.astro';

describe('DoodleUnderline', () => {
    let html: string;

    beforeAll(async () => {
        const container = await AstroContainer.create();

        html = await container.renderToString(DoodleUnderline);
    });

    test('renders the decorative underline svg', () => {
        expect(html).toContain('<svg class="-bottom-2 absolute left-0 w-full pointer-events-none"');
        expect(html).toContain('aria-hidden="true"');
        expect(html).not.toContain('preserveAspectRatio');
        expect(html).toContain('viewBox="0 0 200 12"');
    });

    test('draws one stroked underline path', () => {
        expect(html).toContain('class="doodle-underline__stroke fill-none stroke-[1.5] stroke-charcoal"');
        expect(html.split('<path').length - 1).toBe(1);
    });

    test('stays self-contained', () => {
        expect(html).not.toContain('href=');
        expect(html).not.toContain('src=');
    });
});
