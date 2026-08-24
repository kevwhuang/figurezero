import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, test } from 'vitest';
import { fileURLToPath } from 'node:url';
import { readdirSync } from 'node:fs';

import Collaborations from '../../src/sections/Collaborations.astro';
import { SHELL_PAD } from '../../src/lib/constants';

const COLLABORATION_NAMES = [
    'Canadian Journal of Undergraduate Research',
    'Columbia Undergraduate Science Journal',
    'McGill Journal of Medicine',
    'McMaster Journal of Disabilities',
    'POCUS Journal',
    'Undergraduate Journal of Experimental Microbiology and Immunology',
    'University of Toronto Journal of Public Health',
    'University of Toronto Medical Journal',
] as const;

const COLUMN_GAP = 'clamp(20px, calc(13.3333px + 2.0833vw), 40px)';
const IMAGE_WIDTH = 400;
const LOGOS_DIR = fileURLToPath(new URL('../../src/images/logos', import.meta.url));
const SRCSET_WIDTHS = [400, 640, 800, 1_000, 1_280] as const;

const LOGO_SIZES = `(max-width: 768px) calc(100vw - 2 * ${SHELL_PAD}), (max-width: 1024px) calc((100vw - 2 * ${SHELL_PAD} - ${COLUMN_GAP}) / 2), 360px`;

const logoFiles = readdirSync(LOGOS_DIR).filter(file => file.endsWith('.webp'));
const logoModules = import.meta.glob<{ default: { width: number } }>('../../src/images/logos/*.webp', { eager: true });

const logoWidths = logoFiles.map(file => logoModules[`../../src/images/logos/${file}`].default.width);

function getClampedWidths(widths: readonly number[], imageWidth: number) {
    const cappedWidths = widths.filter(width => width <= imageWidth);

    return [...new Set(widths.some(width => width > imageWidth) ? [...cappedWidths, imageWidth] : cappedWidths)];
}

function getSrcsetWidths(image: string) {
    return [...(image.match(/srcset="([^"]*)"/)?.[1] ?? '').matchAll(/ (\d+)w/g)].map(match => Number(match[1]));
}

describe('Collaborations', () => {
    let html: string;

    beforeAll(async () => {
        const container = await AstroContainer.create();

        html = await container.renderToString(Collaborations);
    });

    test('labels the section with the collaborations heading', () => {
        expect(html).toMatch(/<h2[^>]*id="collaborations-title"[^>]*data-scroll/);
        expect(html).toMatch(/<section[^>]*aria-labelledby="collaborations-title"/);
        expect(html.split('id="collaborations-title"').length - 1).toBe(1);
    });

    test('renders the heading with a doodle wave', () => {
        const headingStart = html.indexOf('<h2 id="collaborations-title"');
        const strokeIndex = html.indexOf('doodle-wave__stroke');

        const headingEnd = html.indexOf('</h2>', headingStart);

        expect(headingStart).toBeGreaterThan(-1);
        expect(html).toContain('The journals we have ');
        expect(html).toContain('worked with<svg');
        expect(html.split('doodle-wave__stroke').length - 1).toBe(1);
        expect(strokeIndex).toBeLessThan(headingEnd);
        expect(strokeIndex).toBeGreaterThan(headingStart);
    });

    test('renders one journal card per logo asset', () => {
        expect(COLLABORATION_NAMES.length).toBe(logoFiles.length);
        expect(html.split('<figure').length - 1).toBe(logoFiles.length);
        expect(html.split('data-image-component="true"').length - 1).toBe(logoFiles.length);
    });

    test('renders the journal names in order', () => {
        const names = [...html.matchAll(/<figcaption[^>]*>([^<]*)<\/figcaption>/g)].map(match => match[1]);

        expect(names).toEqual([...COLLABORATION_NAMES]);
    });

    test('resolves each logo from the assets directory', () => {
        for (const file of logoFiles) {
            expect(html, file).toContain(file);
        }
    });

    test('caps srcset widths at the image width', () => {
        expect(getClampedWidths([2, 4, 8], 6)).toEqual([2, 4, 6]);
    });

    test('sizes each logo for the responsive grid', () => {
        const images = [...html.matchAll(/<img[^>]*>/g)].map(match => match[0]);

        expect(images.length).toBe(logoFiles.length);

        for (const [index, image] of images.entries()) {
            expect(getSrcsetWidths(image), `image ${index}`).toEqual(getClampedWidths(SRCSET_WIDTHS, logoWidths[index]));
            expect(image, `image ${index}`).toContain(`sizes="${LOGO_SIZES}"`);
            expect(image, `image ${index}`).toContain(`width="${IMAGE_WIDTH}"`);
        }
    });

    test('lazy-loads every logo', () => {
        expect(html).not.toContain('loading="eager"');
        expect(html.split('loading="lazy"').length - 1).toBe(logoFiles.length);
    });

    test('hides every logo from assistive tech', () => {
        const images = [...html.matchAll(/<img[^>]*>/g)];

        expect(html).not.toContain('alt="');
        expect(images.length).toBe(logoFiles.length);

        for (const [index, image] of images.entries()) {
            expect(image[0], `image ${index}`).toMatch(/ alt[ >]/);
        }
    });

    test('staggers the grid reveal', () => {
        expect(html).toMatch(/<ul[^>]*data-scroll data-scroll-stagger="0\.1"/);
        expect(html.split('data-scroll-stagger').length - 1).toBe(1);
    });
});
