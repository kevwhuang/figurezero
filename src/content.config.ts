import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

import { CONTENT_DIR } from '@lib/constants';

const collaborations = defineCollection({
    loader: glob({ base: `./${CONTENT_DIR}/collaborations`, pattern: '**/*.json' }),
    schema: z.object({
        image: z.string(),
        name: z.string(),
    }),
});

const members = defineCollection({
    loader: glob({ base: `./${CONTENT_DIR}/members`, pattern: '**/*.json' }),
    schema: z.object({
        bio: z.string().optional(),
        group: z.enum(['artists', 'co-presidents', 'interns', 'investigators']),
        image: z.string(),
        name: z.string(),
        program: z.string().optional(),
    }),
});

const testimonies = defineCollection({
    loader: glob({ base: `./${CONTENT_DIR}/testimonies`, pattern: '**/*.json' }),
    schema: z.object({
        image: z.string(),
        journal: z.string(),
        quote: z.string(),
    }),
});

const works = defineCollection({
    loader: glob({ base: `./${CONTENT_DIR}/works`, pattern: '**/*.json' }),
    schema: z.object({
        artist: z.string(),
        image: z.string(),
        school: z.string(),
        title: z.string(),
    }),
});

export const collections = { collaborations, members, testimonies, works };
