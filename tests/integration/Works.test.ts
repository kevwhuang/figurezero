import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { basename, join } from 'node:path';
import { beforeAll, describe, expect, test } from 'vitest';
import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync } from 'node:fs';

import Works from '../../src/sections/Works.astro';
import { SHELL_PAD } from '../../src/lib/constants';

interface PortfolioEntry {
    artist: string;
    college: string;
    image: string;
    title: string;
}

const ELLIPSE_STROKE_COUNT = 2;
const IMAGE_WIDTH = 700;
const ORDINAL_WIDTH = 2;
const PORTFOLIO_DIR = fileURLToPath(new URL('../../src/content/portfolio', import.meta.url));
const RISE_REVEAL_COUNT = 2;
const SRCSET_WIDTHS = [420, 700, 940, 1_200] as const;

const works = readdirSync(PORTFOLIO_DIR)
    .filter(file => file.endsWith('.json'))
    .map(file => JSON.parse(readFileSync(join(PORTFOLIO_DIR, file), 'utf-8')) as PortfolioEntry)
    .sort((workA, workB) => workA.title.localeCompare(workB.title));

function escapeText(value: string) {
    return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll('\'', '&#39;');
}

function getSrcsetWidths(image: string) {
    return [...(image.match(/srcset="([^"]*)"/)?.[1] ?? '').matchAll(/ (\d+)w/g)].map(match => Number(match[1]));
}

describe('Works', () => {
    let html: string;

    beforeAll(async () => {
        const container = await AstroContainer.create();

        html = await container.renderToString(Works);
    });

    test('labels the section with the works heading', () => {
        expect(html).toMatch(/<section[^>]*aria-labelledby="works-title"/);
        expect(html.split('id="works-title"').length - 1).toBe(1);
    });

    test('renders the kicker and portfolio title with rise reveals', () => {
        expect(html).toMatch(/<h1[^>]*id="works-title"[^>]*aria-label="The Portfolio"[^>]*data-rise/);
        expect(html).toMatch(/<p[^>]*class="eyebrow eyebrow--kicker[^"]*"[^>]*data-rise[^>]*>Images of our past work<\/p>/);
        expect(html.split('data-rise').length - 1).toBe(RISE_REVEAL_COUNT);
    });

    test('renders one article per work sorted by title', () => {
        const titles = [...html.matchAll(/works__name[^>]*>([^<]*)<\/h2>/g)].map(match => match[1]);

        expect(html.split('<article').length - 1).toBe(works.length);
        expect(titles).toEqual(works.map(work => escapeText(work.title)));
    });

    test('numbers the works with padded ordinals hidden from assistive tech', () => {
        const ordinals = [...html.matchAll(/works__index[^>]*>(\d+)</g)].map(match => match[1]);

        expect(html).toMatch(/<p[^>]*works__index[^>]*aria-hidden="true"/);
        expect(html.split('works__index').length - 1).toBe(works.length);
        expect(ordinals).toEqual(works.map((_, index) => String(index + 1).padStart(ORDINAL_WIDTH, '0')));
    });

    test('describes each cover and eager-loads only the first', () => {
        const alts = [...html.matchAll(/alt="([^"]*)"/g)].map(match => match[1]);
        const eagerImage = html.match(/<img[^>]*loading="eager"[^>]*>/);

        expect(eagerImage).not.toBeNull();
        expect(alts).toEqual(works.map(work => `${escapeText(work.title)} cover illustration`));
        expect(eagerImage?.[0]).toContain(`alt="${escapeText(works[0].title)} cover illustration"`);
        expect(eagerImage?.[0]).toContain('fetchpriority="high"');
        expect(html.split('fetchpriority="high"').length - 1).toBe(1);
        expect(html.split('loading="eager"').length - 1).toBe(1);
        expect(html.split('loading="lazy"').length - 1).toBe(works.length - 1);
    });

    test('renders the artist and college for each work', () => {
        for (const work of works) {
            expect(html, work.title).toContain(`>${escapeText(work.artist)}<br`);
            expect(html, work.title).toContain(`>${escapeText(work.college)}</p>`);
        }
    });

    test('resolves each cover from the content image path', () => {
        for (const work of works) {
            expect(html, work.title).toContain(basename(work.image));
        }
    });

    test('sizes each cover for the wide frame', () => {
        const images = [...html.matchAll(/<img[^>]*>/g)].map(match => match[0]);

        expect(images.length).toBe(works.length);

        for (const [index, image] of images.entries()) {
            expect(getSrcsetWidths(image), `image ${index}`).toEqual([...SRCSET_WIDTHS]);
            expect(image, `image ${index}`).toContain(`sizes="(max-width: 1024px) calc(100vw - 2 * ${SHELL_PAD}), 560px"`);
            expect(image, `image ${index}`).toContain(`width="${IMAGE_WIDTH}"`);
        }
    });

    test('alternates the scroll directions', () => {
        const directions = html.split('<article')
            .slice(1)
            .map(article => [...article.matchAll(/data-scroll="(left|right)"/g)].map(match => match[1]));

        expect(directions).toEqual(works.map((_, index) => (index % 2 === 0 ? ['left', 'right'] : ['right', 'left'])));
    });

    test('draws the doodle ellipse in the heading and first work only', () => {
        const firstArticle = html.indexOf('<article');
        const firstEllipse = html.indexOf('doodle-ellipse__stroke');
        const lastEllipse = html.lastIndexOf('doodle-ellipse__stroke');
        const listStart = html.indexOf('<ol');

        const secondArticle = html.indexOf('<article', firstArticle + 1);

        expect(firstEllipse).toBeLessThan(listStart);
        expect(html).toMatch(/<div[^>]*works__doodle[^>]*aria-hidden="true"/);
        expect(html.split('doodle-ellipse__stroke').length - 1).toBe(ELLIPSE_STROKE_COUNT);
        expect(html.split('works__doodle').length - 1).toBe(1);
        expect(lastEllipse).toBeGreaterThan(listStart);
        expect(lastEllipse).toBeLessThan(secondArticle);
    });
});
