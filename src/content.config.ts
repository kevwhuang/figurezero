import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const portfolio = defineCollection({
    loader: glob({ base: './src/content/portfolio', pattern: '**/*.json' }),
    schema: z.object({
        artist: z.string(),
        image: z.string(),
        school: z.string(),
        title: z.string(),
    }),
});

const team = defineCollection({
    loader: glob({ base: './src/content/team', pattern: '**/*.json' }),
    schema: z.object({
        bio: z.string().optional(),
        group: z.enum(['artists', 'co-presidents', 'interns', 'investigators']),
        image: z.string(),
        name: z.string(),
        program: z.string().optional(),
    }),
});

export const collections = { portfolio, team };
