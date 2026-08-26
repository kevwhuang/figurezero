import { describe, expect, test } from 'vitest';
import { join } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';

import { resolveImage } from '../../src/lib/utils';

import type { ImageMetadata } from 'astro';

interface ImageEntry {
    image: string;
}

const UNKNOWN_IMAGE = '/images/unknown.webp';

const contentDirectory = join(process.cwd(), 'src/content');

const portfolioEntry = loadFirstEntry(contentDirectory, 'portfolio');
const teamEntry = loadFirstEntry(contentDirectory, 'team');

const portfolioStem = getImageStem(portfolioEntry);
const teamStem = getImageStem(teamEntry);

function expectImageMetadata(image: ImageMetadata, stem: string) {
    expect(typeof image.height).toBe('number');
    expect(typeof image.src).toBe('string');
    expect(typeof image.width).toBe('number');

    expect(image.format).toBe('webp');
    expect(image.height).toBeGreaterThan(0);
    expect(image.src).toContain(stem);
    expect(image.width).toBeGreaterThan(0);
}

function getImageStem(entry: ImageEntry) {
    return entry.image.replace(/^.*\//, '').replace('.webp', '');
}

function loadFirstEntry(directory: string, collection: string) {
    const collectionDirectory = join(directory, collection);

    const [file] = readdirSync(collectionDirectory).filter(name => name.endsWith('.json')).sort();

    return JSON.parse(readFileSync(join(collectionDirectory, file), 'utf-8')) as ImageEntry;
}

describe('resolveImage', () => {
    test('returns metadata for a portfolio entry image', () => {
        expectImageMetadata(resolveImage(portfolioEntry.image), portfolioStem);
    });

    test('returns metadata for a team entry image', () => {
        expectImageMetadata(resolveImage(teamEntry.image), teamStem);
    });

    test('throws an error with the exact message for an unknown path', () => {
        let caught: unknown;

        try {
            resolveImage(UNKNOWN_IMAGE);
        } catch (error) {
            caught = error;
        }

        expect(caught).toBeInstanceOf(Error);
        expect((caught as Error).message).toBe(`Failed to resolve image ${UNKNOWN_IMAGE}.`);
    });
});
