import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, test } from 'vitest';

import IconMenu from '../../src/components/IconMenu.astro';

const MENU_STROKE_BOTTOM_CLASS = 'class="icon-menu__stroke icon-menu__stroke--bottom fill-none stroke-[2] stroke-current origin-center transform-fill"';
const MENU_STROKE_COUNT = 3;
const MENU_STROKE_TOP_CLASS = 'class="icon-menu__stroke icon-menu__stroke--top fill-none stroke-[2] stroke-current origin-center transform-fill"';

describe('IconMenu', () => {
    let html: string;

    beforeAll(async () => {
        const container = await AstroContainer.create();

        html = await container.renderToString(IconMenu);
    });

    test('renders the decorative menu icon svg', () => {
        expect(html).toContain('<svg class="size-6 pointer-events-none"');
        expect(html).toContain('aria-hidden="true"');
        expect(html).toContain('viewBox="0 0 24 24"');
    });

    test('draws three menu strokes with top and bottom modifiers', () => {
        expect(html).toContain(MENU_STROKE_BOTTOM_CLASS);
        expect(html).toContain(MENU_STROKE_TOP_CLASS);
        expect(html.split('<path').length - 1).toBe(MENU_STROKE_COUNT);
    });

    test('fades the middle stroke through the open custom property', () => {
        expect(html).toMatch(/<path[^>]*icon-menu__stroke fill-none[^>]*opacity-\[calc\(1_-_var\(--icon-menu-open,0\)\)\]/);
        expect(html.split('opacity-[calc(1_-_var(--icon-menu-open,0))]').length - 1).toBe(1);
    });

    test('stays self-contained', () => {
        expect(html).not.toContain('href=');
        expect(html).not.toContain('src=');
    });
});
