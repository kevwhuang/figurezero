import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, test } from 'vitest';

import Purpose from '../../src/sections/Purpose.astro';

const ORDINAL_PATTERN = /<span[^>]*class="font-display text-meta select-none"[^>]*aria-hidden="true"[^>]*>(\d\d)<\/span>/g;

const PURPOSE_ITEMS = [
    { direction: 'left', label: 'Vision', ordinal: '01' },
    { direction: 'right', label: 'Mission', ordinal: '02' },
] as const;

const STAR_STROKE_COUNT = 3;

describe('Purpose', () => {
    let html: string;

    beforeAll(async () => {
        const container = await AstroContainer.create();

        html = await container.renderToString(Purpose);
    });

    test('labels the section for assistive tech', () => {
        expect(html).toMatch(/<section[^>]*aria-label="Vision and mission"/);
    });

    test('renders one ordered list item per purpose with directional scroll hooks', () => {
        expect(html.split('<li').length - 1).toBe(PURPOSE_ITEMS.length);
        expect(html.split('<ol').length - 1).toBe(1);

        for (const item of PURPOSE_ITEMS) {
            expect(html, item.label).toMatch(new RegExp(`<li[^>]*data-scroll="${item.direction}"`));
        }
    });

    test('renders the vision and mission headings in order', () => {
        for (const item of PURPOSE_ITEMS) {
            expect(html, item.label).toMatch(new RegExp(`<h2[^>]*class="purpose__label[^"]*"[^>]*>${item.label}</h2>`));
        }

        const positions = PURPOSE_ITEMS.map(item => html.indexOf(`>${item.label}</h2>`));

        expect(positions).toEqual([...positions].sort((positionA, positionB) => positionA - positionB));
    });

    test('hides the ordinal ornaments from assistive tech', () => {
        const ordinals = [...html.matchAll(ORDINAL_PATTERN)].map(match => match[1]);

        expect(ordinals).toEqual(PURPOSE_ITEMS.map(item => item.ordinal));
    });

    test('underlines human creativity inside the vision copy', () => {
        expect(html).toContain('human creativity<svg');
        expect(html.indexOf('doodle-underline__stroke')).toBeLessThan(html.indexOf('>Mission</h2>'));
        expect(html.indexOf('doodle-underline__stroke')).toBeGreaterThan(html.indexOf('>Vision</h2>'));
        expect(html.split('doodle-underline__stroke').length - 1).toBe(1);
    });

    test('hides the doodle star from assistive tech and small screens', () => {
        expect(html).toMatch(/<div[^>]*class="purpose__doodle-star[^"]*max-lg:hidden"[^>]*aria-hidden="true"/);
        expect(html.split('doodle-star__stroke').length - 1).toBe(STAR_STROKE_COUNT);
    });
});
