import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, test } from 'vitest';

import Story from '../../src/sections/Story.astro';
import { SHELL_PAD } from '../../src/lib/constants';

const BODY_PARAGRAPHS = [
    'The Figure Zero Project was founded by two high school friends, Leslie and Yolanda.',
    'Although they eventually found themselves pursuing science',
] as const;

const IMAGE_HEIGHT = 800;
const IMAGE_WIDTH = 600;
const SRCSET_WIDTHS = [420, 600, 900, 1_200] as const;

describe('Story', () => {
    let html: string;

    beforeAll(async () => {
        const container = await AstroContainer.create();

        html = await container.renderToString(Story);
    });

    test('wires the section to a rendered heading id via aria-labelledby', () => {
        expect(html).toMatch(/<h2 id="story-title"[^>]*data-scroll="left"/);
        expect(html).toMatch(/<section[^>]*aria-labelledby="story-title"/);
    });

    test('renders the our story eyebrow with a scroll hook', () => {
        expect(html).toMatch(/<p[^>]*class="eyebrow mb-12"[^>]*data-scroll="left"[^>]*>Our story<\/p>/);
    });

    test('circles the facetime phrase inside the heading', () => {
        const headingStart = html.indexOf('<h2 id="story-title"');
        const strokeIndex = html.indexOf('doodle-ellipse__stroke');

        const headingEnd = html.indexOf('</h2>', headingStart);

        expect(headingStart).toBeGreaterThan(-1);
        expect(html).toContain('FaceTime call.<svg');
        expect(html).toContain('It started on a <span');
        expect(html.split('doodle-ellipse__stroke').length - 1).toBe(1);
        expect(strokeIndex).toBeLessThan(headingEnd);
        expect(strokeIndex).toBeGreaterThan(headingStart);
    });

    test('renders two body paragraphs with a scroll hook', () => {
        const bodyMatch = html.match(/<div[^>]*class="story__body[^"]*"[^>]*data-scroll="left"[^>]*>([\s\S]*?)<\/div>/);

        expect(bodyMatch).not.toBeNull();

        const body = bodyMatch?.[1] ?? '';

        expect(body.split('<p ').length - 1).toBe(BODY_PARAGRAPHS.length);

        for (const paragraph of BODY_PARAGRAPHS) {
            expect(body, paragraph).toContain(paragraph);
        }
    });

    test('renders the founders photo with responsive attributes', () => {
        const imageMatch = html.match(/<img[^>]*>/);

        expect(imageMatch).not.toBeNull();

        const image = imageMatch?.[0] ?? '';

        const srcset = image.match(/srcset="([^"]*)"/)?.[1] ?? '';

        const widths = [...srcset.matchAll(/ (\d+)w/g)].map(match => Number(match[1]));

        expect(image).toContain('alt="Leslie and Yolanda"');
        expect(image).not.toContain('fetchpriority');
        expect(image).toContain(`height="${IMAGE_HEIGHT}"`);
        expect(image).toContain('loading="lazy"');
        expect(image).toContain(`sizes="(max-width: 1024px) calc(100vw - 2 * ${SHELL_PAD}), 560px"`);
        expect(image).toContain(`width="${IMAGE_WIDTH}"`);
        expect(widths).toEqual([...SRCSET_WIDTHS]);
    });

    test('reveals the figure from the right on scroll', () => {
        expect(html).toMatch(/<figure[^>]*data-scroll="right"/);
    });

    test('hides the doodle scribble from assistive tech and small screens', () => {
        expect(html).toMatch(/<div[^>]*class="story__doodle[^"]*max-lg:hidden"[^>]*aria-hidden="true"/);
        expect(html.split('doodle-scribble__stroke').length - 1).toBe(1);
    });
});
