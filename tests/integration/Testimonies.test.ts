import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, test } from 'vitest';

import Testimonies from '../../src/sections/Testimonies.astro';

const TESTIMONIES = [
    {
        journal: 'Canadian Journal of Undergraduate Research',
        paragraphs: [
            'Working with the Figure Zero Project team on our Volume 10, Issue 2 was a fantastic experience and reminded us that research does not end when it is written; it finds new life when it is shared. With professionalism, care, and remarkable creative sensitivity, their team was a joy to work with and produced a beautiful original cover illustration that perfectly captured the spirit of our publication.',
            'Their work honoured the care and curiosity behind our authors\' research, strengthened the identity of our journal, and revealed what becomes possible when research and human creativity meet with purpose. We are grateful for a collaboration that not only enriched our journal but also affirmed the lasting power of artists and researchers coming together to make knowledge seen, felt, and remembered, and look forward to working with their artists again.',
        ],
    },
    {
        journal: 'University of Toronto Journal of Public Health',
        paragraphs: [
            'Working with the Figure Zero Project team was such a positive and collaborative experience. Leslie, Yolanda, and their artists were thoughtful, creative, and incredibly receptive to our vision, and they brought the theme of our issue to life beautifully. We would be delighted to work with them again on a future issue.',
        ],
    },
] as const;

function escapeText(value: string) {
    return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll('\'', '&#39;');
}

describe('Testimonies', () => {
    let html: string;

    beforeAll(async () => {
        const container = await AstroContainer.create();

        html = await container.renderToString(Testimonies);
    });

    test('labels the section for assistive tech', () => {
        expect(html).toMatch(/<section[^>]*aria-label="Testimonies"/);
    });

    test('renders the eyebrow heading with a scroll hook', () => {
        expect(html).toMatch(/<h2[^>]*class="eyebrow[^"]*"[^>]*data-scroll[^>]*>Testimonies<\/h2>/);
    });

    test('renders one figure per testimony with a scroll hook', () => {
        expect(html.split('<figure').length - 1).toBe(TESTIMONIES.length);
        expect(html.split('<figure data-scroll').length - 1).toBe(TESTIMONIES.length);
    });

    test('renders each quote paragraph inside its blockquote', () => {
        const blockquotes = [...html.matchAll(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/g)].map(match => match[1]);

        expect(blockquotes.map(blockquote => blockquote.split('<p ').length - 1)).toEqual(TESTIMONIES.map(testimony => testimony.paragraphs.length));

        for (const testimony of TESTIMONIES) {
            for (const [index, paragraph] of testimony.paragraphs.entries()) {
                expect(html, `${testimony.journal} paragraph ${index}`).toContain(`>${escapeText(paragraph)}</p>`);
            }
        }
    });

    test('wraps each quote in screen-reader quotation marks', () => {
        const marks = [...html.matchAll(/<span class="sr-only"[^>]*>(&ldquo;|&rdquo;)<\/span>/g)].map(match => match[1]);

        expect(marks).toEqual(TESTIMONIES.flatMap(() => ['&ldquo;', '&rdquo;']));
    });

    test('hides the ornamental quotation marks from assistive tech', () => {
        const ornaments = [...html.matchAll(/<div[^>]*select-none"[^>]*aria-hidden="true"[^>]*>(&ldquo;|&rdquo;)<\/div>/g)].map(match => match[1]);

        expect(ornaments).toEqual(TESTIMONIES.flatMap(() => ['&ldquo;', '&rdquo;']));
    });

    test('cites each journal in document order', () => {
        const citations = [...html.matchAll(/<cite class="not-italic"[^>]*>([^<]+)<\/cite>/g)].map(match => match[1]);

        expect(citations).toEqual(TESTIMONIES.map(testimony => testimony.journal));
        expect(html.split('&mdash; <cite').length - 1).toBe(TESTIMONIES.length);
    });

    test('hides the doodle scribble from assistive tech and small screens', () => {
        expect(html).toMatch(/<div[^>]*class="testimonies__doodle[^"]*max-lg:hidden"[^>]*aria-hidden="true"/);
        expect(html.split('doodle-scribble__stroke').length - 1).toBe(1);
    });
});
