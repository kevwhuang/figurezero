import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, test } from 'vitest';

import Hero from '../../src/sections/Hero.astro';

const FIGURE_WORD = 'Figure';
const ZERO_WORD = 'Zero';

function getLetters(markup: string) {
    return [...markup.matchAll(/<span class="inline-block" data-letter[^>]*>([^<])<\/span>/g)].map(match => match[1]);
}

describe('Hero', () => {
    let html: string;

    beforeAll(async () => {
        const container = await AstroContainer.create();

        html = await container.renderToString(Hero);
    });

    test('labels the section by its headline for assistive tech', () => {
        expect(html).toMatch(/<h1 id="hero-title"/);
        expect(html).toMatch(/<section[^>]*aria-labelledby="hero-title"/);
        expect(html.split('id="hero-title"').length - 1).toBe(1);
    });

    test('exposes the headline as one accessible label over marked letter rows', () => {
        expect(html).toMatch(new RegExp(`<h1 id="hero-title"[^>]*aria-label="${FIGURE_WORD} ${ZERO_WORD}"[^>]*data-letters`));
        expect(html.split('data-letters').length - 1).toBe(1);
    });

    test('splits the headline into letter spans across two hidden rows', () => {
        const rowStart = html.indexOf('<span class="hero__row');

        expect(rowStart).toBeGreaterThan(-1);
        expect(getLetters(html.slice(0, rowStart))).toEqual([...FIGURE_WORD]);
        expect(getLetters(html.slice(rowStart))).toEqual([...ZERO_WORD]);
        expect(html).toMatch(/<span class="block" aria-hidden="true"/);
        expect(html).toMatch(/<span class="hero__row flex items-end" aria-hidden="true"/);
    });

    test('marks the logo wrapper for the pop animation', () => {
        expect(html).toMatch(/<span class="hero__logo[^"]*"[^>]*data-pop/);
        expect(html).toMatch(/data-pop[^>]*><svg[^>]*aria-hidden="true"[^>]*viewBox="0 0 800 800"/);
        expect(html.split('data-pop').length - 1).toBe(1);
    });

    test('renders the doodle ellipse hidden from assistive tech', () => {
        expect(html).toMatch(/<div class="hero__doodle[^"]*"[^>]*aria-hidden="true"[^>]*data-doodle/);
        expect(html).toMatch(/data-doodle[^>]*><svg[^>]*aria-hidden="true"[^>]*preserveAspectRatio="none"[^>]*viewBox="0 0 260 80"/);
        expect(html).toContain('doodle-ellipse__stroke');
        expect(html.split('data-doodle').length - 1).toBe(1);
    });
});
