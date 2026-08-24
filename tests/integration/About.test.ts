import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, test } from 'vitest';

import About from '../../src/sections/About.astro';

const ARROW_STROKE_COUNT = 3;

const BODY_PARAGRAPHS = [
    'Many journals do not have graphic designers for their covers and illustrations',
    'While students benefit by building robust and meaningful portfolios',
] as const;

const BODY_PARAGRAPH_CLASS = 'leading-[1.7] text-body text-pretty text-umber';
const STATEMENT_DOODLE_COUNT = 2;

describe('About', () => {
    let html: string;

    beforeAll(async () => {
        const container = await AstroContainer.create();

        html = await container.renderToString(About);
    });

    test('labels the section for assistive tech', () => {
        expect(html).toMatch(/<section[^>]*aria-label="What is the Figure Zero Project\?"/);
    });

    test('renders the eyebrow heading with a scroll hook', () => {
        expect(html).toMatch(/<h2[^>]*class="eyebrow[^"]*"[^>]*data-scroll[^>]*>What is the<br[^>]*>Figure Zero Project\?<\/h2>/);
    });

    test('doodles the statement keywords with two inline svgs', () => {
        const statementMatch = html.match(/<p[^>]*class="about__statement[^"]*"[^>]*data-scroll[^>]*>([\s\S]*?)<\/p>/);

        expect(statementMatch).not.toBeNull();

        const statement = statementMatch?.[1] ?? '';

        expect(statement).toContain('We are a student-run organization committed to making science more');
        expect(statement).toContain('accessible<svg');
        expect(statement).toContain('engaging</em><svg');
        expect(statement.split('<svg').length - 1).toBe(STATEMENT_DOODLE_COUNT);
        expect(statement.split('doodle-underline__stroke').length - 1).toBe(1);
        expect(statement.split('doodle-wave__stroke').length - 1).toBe(1);
    });

    test('renders two body paragraphs inside the staggered grid', () => {
        const gridMatch = html.match(/<div[^>]*data-scroll="left" data-scroll-stagger="0\.2"[^>]*>([\s\S]*?)<\/div>/);

        expect(gridMatch).not.toBeNull();

        const grid = gridMatch?.[1] ?? '';

        expect(grid.split(`class="${BODY_PARAGRAPH_CLASS}"`).length - 1).toBe(BODY_PARAGRAPHS.length);

        for (const paragraph of BODY_PARAGRAPHS) {
            expect(grid, paragraph).toContain(paragraph);
        }

        expect(grid).toContain('cover page&mdash;Figure Zero');
    });

    test('hides the doodle arrow from assistive tech and small screens', () => {
        expect(html).toMatch(/<div[^>]*class="about__doodle-arrow[^"]*max-lg:hidden"[^>]*aria-hidden="true"/);
        expect(html).not.toContain('data-doodle');
        expect(html.split('doodle-arrow__stroke').length - 1).toBe(ARROW_STROKE_COUNT);
    });
});
