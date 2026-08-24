import { describe, expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { collections } from '../../src/content.config';

interface Entry {
    data: Record<string, unknown>;
    name: string;
    raw: string;
    stem: string;
}

interface SchemaParser {
    safeParse: (data: unknown) => { error?: { message: string }; success: boolean };
}

const CURLY_APOSTROPHE_PATTERN = /[\u2018\u2019]/;
const GROUPS = ['artists', 'co-presidents', 'interns', 'investigators'] as const;
const JSON_INDENT = 4;
const PORTFOLIO_FIELDS = ['artist', 'college', 'image', 'title'] as const;
const PORTFOLIO_ID_PATTERN = /^[1-9]\d*$/;
const PRESIDENT_COUNT = 2;
const TEAM_FIELDS = ['bio', 'group', 'image', 'name', 'program'] as const;
const TEAM_OPTIONAL_FIELDS = ['bio', 'program'] as const;
const TEAM_REQUIRED_FIELDS = ['group', 'image', 'name'] as const;

const contentRoot = join(process.cwd(), 'src/content');
const portfolioParser = collections.portfolio.schema as SchemaParser;
const srcRoot = join(process.cwd(), 'src');
const teamParser = collections.team.schema as SchemaParser;

const portfolio = loadCollection(contentRoot, 'portfolio');
const team = loadCollection(contentRoot, 'team');

const allEntries = [...portfolio, ...team];
const coPresidents = team.filter(({ data }) => data.group === 'co-presidents');

function buildPortfolioEntry(overrides: Record<string, unknown> = {}) {
    return {
        artist: 'Ada Lovelace',
        college: 'University of Example',
        image: '/images/portfolio/example_journal.webp',
        title: 'Example Journal of Science',
        ...overrides,
    };
}

function buildTeamMember(overrides: Record<string, unknown> = {}) {
    return {
        bio: 'Ada studies computation and sketches journal covers on weekends.',
        group: GROUPS[0],
        image: '/images/team/ada_lovelace.webp',
        name: 'Ada Lovelace',
        program: 'University of Example, Computer Science',
        ...overrides,
    };
}

function expectKnownFields(entries: Entry[], fields: readonly string[]) {
    expect(entries.length).toBeGreaterThan(0);

    for (const { data, name } of entries) {
        for (const key of Object.keys(data)) {
            expect(fields, `${name} ${key}`).toContain(key);
        }
    }
}

function expectNonEmptyString(value: unknown, message: string) {
    expect(typeof value, message).toBe('string');
    expect(String(value).trim(), message).not.toBe('');
}

function expectNonEmptyStringFields(entries: Entry[], fields: readonly string[]) {
    expect(entries.length).toBeGreaterThan(0);

    for (const { data, name } of entries) {
        for (const field of fields) {
            expectNonEmptyString(data[field], `${name} ${field}`);
        }
    }
}

function expectSchemaSuccess(entries: Entry[], parser: SchemaParser) {
    expect(entries.length).toBeGreaterThan(0);
    expect(typeof parser.safeParse).toBe('function');

    for (const { data, name } of entries) {
        const result = parser.safeParse(data);

        expect(result.success, `${name}${result.error ? ` ${result.error.message}` : ''}`).toBe(true);
    }
}

function expectUniqueImageReferences(entries: Entry[], root: string, directory: string) {
    const imageFiles = readdirSync(join(root, directory));
    const references = entries.map(({ data }) => String(data.image));

    const uniqueReferences = new Set(references);

    expect(imageFiles.length).toBeGreaterThan(0);
    expect(references.length).toBe(imageFiles.length);
    expect(uniqueReferences.size).toBe(references.length);

    for (const file of imageFiles) {
        expect(uniqueReferences.has(`/${directory}/${file}`), file).toBe(true);
    }
}

function loadCollection(root: string, collection: string) {
    const directory = join(root, collection);

    return readdirSync(directory)
        .filter(file => file.endsWith('.json'))
        .sort()
        .map((file) => {
            const raw = readFileSync(join(directory, file), 'utf-8');

            return {
                data: JSON.parse(raw) as Record<string, unknown>,
                name: `${collection}/${file}`,
                raw,
                stem: file.replace('.json', ''),
            };
        });
}

function slugifyName(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
}

describe('json files', () => {
    test('files end without a trailing newline', () => {
        expect(allEntries.length).toBeGreaterThan(0);

        for (const { name, raw } of allEntries) {
            expect(raw.endsWith('\n'), name).toBe(false);
        }
    });

    test('files contain no curly apostrophes', () => {
        for (const { name, raw } of allEntries) {
            expect(CURLY_APOSTROPHE_PATTERN.test(raw), name).toBe(false);
        }
    });

    test('files round-trip through JSON.parse and four-space stringify', () => {
        for (const { data, name, raw } of allEntries) {
            expect(JSON.stringify(data, null, JSON_INDENT), name).toBe(raw);
        }
    });
});

describe('portfolio', () => {
    test('every entry has required non-empty string fields', () => {
        expectNonEmptyStringFields(portfolio, PORTFOLIO_FIELDS);
    });

    test('ids count the entries upward from one', () => {
        for (const { stem } of portfolio) {
            expect(stem).toMatch(PORTFOLIO_ID_PATTERN);
        }

        const ids = portfolio.map(({ stem }) => Number(stem)).sort((first, second) => first - second);

        expect(ids).toEqual(portfolio.map((_, index) => index + 1));
    });

    test('every image exists on disk', () => {
        for (const { data, name } of portfolio) {
            expect(existsSync(join(srcRoot, String(data.image))), name).toBe(true);
        }
    });

    test('every portfolio image file is referenced by exactly one entry', () => {
        expectUniqueImageReferences(portfolio, srcRoot, 'images/portfolio');
    });
});

describe('schemas', () => {
    test('every portfolio file parses against the portfolio collection schema', () => {
        expectSchemaSuccess(portfolio, portfolioParser);
    });

    test('every team file parses against the team collection schema', () => {
        expectSchemaSuccess(team, teamParser);
    });

    test('every portfolio file uses only keys the portfolio schema declares', () => {
        expectKnownFields(portfolio, PORTFOLIO_FIELDS);
    });

    test('every team file uses only keys the team schema declares', () => {
        expectKnownFields(team, TEAM_FIELDS);
    });

    test('accepts the crafted portfolio and team baselines', () => {
        expect(portfolioParser.safeParse(buildPortfolioEntry()).success).toBe(true);
        expect(teamParser.safeParse(buildTeamMember()).success).toBe(true);
    });

    test('accepts every known group', () => {
        for (const group of GROUPS) {
            expect(teamParser.safeParse(buildTeamMember({ group })).success, group).toBe(true);
        }
    });

    test('accepts a team member with bio and program omitted', () => {
        expect(teamParser.safeParse(buildTeamMember({ bio: undefined, program: undefined })).success).toBe(true);
    });

    test('rejects a portfolio entry missing its title', () => {
        expect(portfolioParser.safeParse(buildPortfolioEntry({ title: undefined })).success).toBe(false);
    });

    test('rejects a portfolio entry with a non-string image', () => {
        expect(portfolioParser.safeParse(buildPortfolioEntry({ image: 42 })).success).toBe(false);
    });

    test('rejects a portfolio entry with a numeric artist', () => {
        expect(portfolioParser.safeParse(buildPortfolioEntry({ artist: 7 })).success).toBe(false);
    });

    test('rejects a team member missing its name', () => {
        expect(teamParser.safeParse(buildTeamMember({ name: undefined })).success).toBe(false);
    });

    test('rejects a team member with an unknown group', () => {
        expect(teamParser.safeParse(buildTeamMember({ group: 'alumni' })).success).toBe(false);
    });

    test('rejects a team member with a numeric bio', () => {
        expect(teamParser.safeParse(buildTeamMember({ bio: 7 })).success).toBe(false);
    });
});

describe('team', () => {
    test('every entry has required non-empty string fields', () => {
        expectNonEmptyStringFields(team, TEAM_REQUIRED_FIELDS);
    });

    test('optional bio and program are non-empty strings when present', () => {
        for (const { data, name } of team) {
            for (const field of TEAM_OPTIONAL_FIELDS) {
                if (!(field in data)) continue;

                expectNonEmptyString(data[field], `${name} ${field}`);
            }
        }
    });

    test('both co-presidents carry a bio and a program', () => {
        expect(coPresidents).toHaveLength(PRESIDENT_COUNT);

        for (const { data, name } of coPresidents) {
            for (const field of TEAM_OPTIONAL_FIELDS) {
                expect(typeof data[field], `${name} ${field}`).toBe('string');
            }
        }
    });

    test('every group has at least one member', () => {
        for (const group of GROUPS) {
            expect(team.filter(({ data }) => data.group === group).length, group).toBeGreaterThan(0);
        }
    });

    test('ids are the snake_case slug of the name', () => {
        expect(slugifyName('Yuheng (Yolanda) Huang')).toBe('yuheng_yolanda_huang');

        for (const { data, name, stem } of team) {
            expect(stem, name).toBe(slugifyName(String(data.name)));
        }
    });

    test('every image exists on disk and pins the entry stem', () => {
        for (const { data, name, stem } of team) {
            expect(data.image, name).toBe(`/images/team/${stem}.webp`);
            expect(existsSync(join(srcRoot, String(data.image))), name).toBe(true);
        }
    });

    test('every team image file is referenced by exactly one entry', () => {
        expectUniqueImageReferences(team, srcRoot, 'images/team');
    });
});
