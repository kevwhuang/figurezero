import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { basename, join } from 'node:path';
import { beforeAll, describe, expect, test } from 'vitest';
import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync } from 'node:fs';

import Team from '../../src/sections/Team.astro';
import { SHELL_PAD } from '../../src/lib/constants';

interface TeamEntry {
    bio?: string;
    group: string;
    image: string;
    name: string;
    program?: string;
}

const GROUPS = [
    { key: 'artists', label: 'Artists' },
    { key: 'investigators', label: 'Science investigators' },
    { key: 'interns', label: 'Summer interns' },
] as const;

const MEMBER_IMAGE_WIDTH = 400;
const MEMBER_SIZES = `(max-width: 768px) calc(100vw - 2 * ${SHELL_PAD}), min(30vw, 360px)`;
const MEMBER_SRCSET_WIDTHS = [220, 400, 440, 800] as const;
const PRESIDENT_IMAGE_WIDTH = 600;
const PRESIDENT_SIZES = `(max-width: 1024px) calc(100vw - 2 * ${SHELL_PAD}), 560px`;
const PRESIDENT_SRCSET_WIDTHS = [420, 600, 1_200] as const;
const RISE_REVEAL_COUNT = 2;
const TEAM_DIR = fileURLToPath(new URL('../../src/content/team', import.meta.url));

const members = readdirSync(TEAM_DIR)
    .filter(file => file.endsWith('.json'))
    .map(file => JSON.parse(readFileSync(join(TEAM_DIR, file), 'utf-8')) as TeamEntry)
    .sort((memberA, memberB) => memberA.name.localeCompare(memberB.name));

const groupedMembers = members.filter(member => member.group !== 'co-presidents');
const presidents = members.filter(member => member.group === 'co-presidents');

const programmedMembers = groupedMembers.filter((member): member is TeamEntry & { program: string } => member.program !== undefined);

function escapeText(value: string) {
    return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll('\'', '&#39;');
}

function getSectionSlice(html: string, label: string) {
    const start = html.indexOf(`aria-label="${label}"`);

    return html.slice(start, html.indexOf('</section>', start));
}

function getSrcsetWidths(image: string) {
    return [...(image.match(/srcset="([^"]*)"/)?.[1] ?? '').matchAll(/ (\d+)w/g)].map(match => Number(match[1]));
}

describe('Team', () => {
    let html: string;

    beforeAll(async () => {
        const container = await AstroContainer.create();

        html = await container.renderToString(Team);
    });

    test('labels the section with the team heading', () => {
        expect(html).toMatch(/<section[^>]*aria-labelledby="team-title"/);
        expect(html.split('id="team-title"').length - 1).toBe(1);
    });

    test('renders the kicker and title with rise reveals', () => {
        expect(html).toMatch(/<h1[^>]*id="team-title"[^>]*data-rise[^>]*>Our <em[^>]*>team<\/em><\/h1>/);
        expect(html).toMatch(/<p[^>]*class="eyebrow eyebrow--kicker[^"]*"[^>]*data-rise[^>]*>The people behind the project<\/p>/);
        expect(html.split('data-rise').length - 1).toBe(RISE_REVEAL_COUNT);
    });

    test('renders one co-president article per entry', () => {
        const slice = getSectionSlice(html, 'Co-presidents');

        expect(html).toMatch(/<section[^>]*aria-label="Co-presidents"/);
        expect(slice).toMatch(/<h2[^>]*data-scroll[^>]*>Co-presidents<\/h2>/);
        expect(slice.split('<article').length - 1).toBe(presidents.length);
    });

    test('renders each co-president name, program, and bio', () => {
        const slice = getSectionSlice(html, 'Co-presidents');

        const names = [...slice.matchAll(/<h3[^>]*>([^<]*)<\/h3>/g)].map(match => match[1]);

        expect(names).toEqual(presidents.map(president => escapeText(president.name)));

        for (const president of presidents) {
            expect(slice, president.name).toContain(`>${escapeText(president.bio ?? '')}</p>`);
            expect(slice, president.name).toContain(`>${escapeText(president.program ?? '')}</p>`);
        }
    });

    test('alternates the co-president scroll directions', () => {
        const slice = getSectionSlice(html, 'Co-presidents');

        const directions = slice.split('<article')
            .slice(1)
            .map(article => [...article.matchAll(/data-scroll="(left|right)"/g)].map(match => match[1]));

        expect(directions).toEqual(presidents.map((_, index) => (index % 2 === 0 ? ['left', 'right'] : ['right', 'left'])));
    });

    test('renders the group sections in order with sorted member names', () => {
        const positions = GROUPS.map(group => html.indexOf(`aria-label="${group.label}"`));

        expect(positions).not.toContain(-1);
        expect(positions).toEqual([...positions].sort((positionA, positionB) => positionA - positionB));

        for (const group of GROUPS) {
            const expected = members.filter(member => member.group === group.key).map(member => escapeText(member.name));
            const slice = getSectionSlice(html, group.label);

            const names = [...slice.matchAll(/class="font-display text-body wrap-anywhere"[^>]*>([^<]*)<\/p>/g)].map(match => match[1]);

            expect(names, group.label).toEqual(expected);
            expect(slice, group.label).toMatch(new RegExp(`<h2[^>]*data-scroll[^>]*>${group.label}</h2>`));
        }
    });

    test('renders each member program under the name card', () => {
        expect(html.split('class="font-display text-body wrap-anywhere"').length - 1).toBe(groupedMembers.length);
        expect(html.split('text-meta wrap-anywhere text-taupe').length - 1).toBe(programmedMembers.length);

        for (const member of programmedMembers) {
            expect(html, member.name).toContain(`>${escapeText(member.program)}</p>`);
        }
    });

    test('hides every portrait from assistive tech', () => {
        const images = [...html.matchAll(/<img[^>]*>/g)];

        expect(html).not.toContain('alt="');
        expect(images.length).toBe(members.length);

        for (const [index, image] of images.entries()) {
            expect(image[0], `image ${index}`).toMatch(/ alt[ >]/);
        }
    });

    test('resolves each portrait from the content image path', () => {
        for (const member of members) {
            expect(html, member.name).toContain(basename(member.image));
        }
    });

    test('sizes each co-president portrait for the wide frame', () => {
        const slice = getSectionSlice(html, 'Co-presidents');

        const images = [...slice.matchAll(/<img[^>]*>/g)].map(match => match[0]);

        expect(images.length).toBe(presidents.length);

        for (const [index, image] of images.entries()) {
            expect(getSrcsetWidths(image), `president ${index}`).toEqual([...PRESIDENT_SRCSET_WIDTHS]);
            expect(image, `president ${index}`).toContain(`sizes="${PRESIDENT_SIZES}"`);
            expect(image, `president ${index}`).toContain(`width="${PRESIDENT_IMAGE_WIDTH}"`);
        }
    });

    test('sizes each member portrait for the grid', () => {
        for (const group of GROUPS) {
            const groupMembers = members.filter(member => member.group === group.key);
            const slice = getSectionSlice(html, group.label);

            const images = [...slice.matchAll(/<img[^>]*>/g)].map(match => match[0]);

            expect(images.length, group.label).toBe(groupMembers.length);

            for (const [index, image] of images.entries()) {
                expect(getSrcsetWidths(image), `${group.label} ${index}`).toEqual([...MEMBER_SRCSET_WIDTHS]);
                expect(image, `${group.label} ${index}`).toContain(`sizes="${MEMBER_SIZES}"`);
                expect(image, `${group.label} ${index}`).toContain(`width="${MEMBER_IMAGE_WIDTH}"`);
            }
        }
    });

    test('lazy-loads every portrait', () => {
        expect(html).not.toContain('fetchpriority');
        expect(html).not.toContain('loading="eager"');
        expect(html.split('loading="lazy"').length - 1).toBe(members.length);
    });

    test('staggers each group grid reveal', () => {
        expect(html).toMatch(/<ul[^>]*data-scroll="zoom" data-scroll-stagger="0\.1"/);
        expect(html.split('data-scroll="zoom" data-scroll-stagger="0.1"').length - 1).toBe(GROUPS.length);
    });
});
