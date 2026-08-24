import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, test } from 'vitest';

import DoodleScribble from '../../src/components/DoodleScribble.astro';

describe('DoodleScribble', () => {
    let html: string;

    beforeAll(async () => {
        const container = await AstroContainer.create();

        html = await container.renderToString(DoodleScribble);
    });

    test('renders the decorative scribble svg', () => {
        expect(html).toContain('<svg class="absolute inset-0 h-full w-full pointer-events-none"');
        expect(html).toContain('aria-hidden="true"');
        expect(html).toContain('preserveAspectRatio="none"');
        expect(html).toContain('viewBox="0 0 300 200"');
    });

    test('draws one continuous stroked path', () => {
        expect(html).toContain('class="doodle-scribble__stroke fill-none stroke-2 stroke-charcoal"');
        expect(html.split('<path').length - 1).toBe(1);
    });

    test('stays self-contained', () => {
        expect(html).not.toContain('href=');
        expect(html).not.toContain('src=');
    });
});
