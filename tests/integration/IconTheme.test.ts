import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, test } from 'vitest';

import IconTheme from '../../src/components/IconTheme.astro';

const FILLED_PATH_COUNT = 2;
const THEME_GROUP_COUNT = 2;
const THEME_PATH_COUNT = 3;

describe('IconTheme', () => {
    let html: string;

    beforeAll(async () => {
        const container = await AstroContainer.create();

        html = await container.renderToString(IconTheme);
    });

    test('renders the decorative theme icon svg', () => {
        expect(html).toContain('<svg class="block size-6 pointer-events-none"');
        expect(html).toContain('aria-hidden="true"');
        expect(html).toContain('viewBox="0 0 24 24"');
    });

    test('swaps two groups through light-dark text colours', () => {
        expect(html).toContain('class="text-[light-dark(currentcolor,transparent)] duration-(--duration-fast) ease-[ease] transition-[color]"');
        expect(html).toContain('class="text-[light-dark(transparent,currentcolor)] duration-(--duration-fast) ease-[ease] transition-[color]"');
        expect(html.split('<g').length - 1).toBe(THEME_GROUP_COUNT);
    });

    test('draws the moon, the sun disc, and the ray strokes', () => {
        expect(html).toContain('class="icon-theme__stroke fill-none stroke-[2] stroke-current"');
        expect(html.split('<path').length - 1).toBe(THEME_PATH_COUNT);
        expect(html.split('class="fill-current"').length - 1).toBe(FILLED_PATH_COUNT);
    });

    test('stays self-contained', () => {
        expect(html).not.toContain('href=');
        expect(html).not.toContain('src=');
    });
});
