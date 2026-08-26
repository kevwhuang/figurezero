import netlify from '@astrojs/netlify';
import react from '@astrojs/react';
import robots from 'astro-robots-txt';
import sitemap from '@astrojs/sitemap';
import tailwind from '@tailwindcss/vite';
import { defineConfig, fontProviders } from 'astro/config';

export default defineConfig({
    adapter: netlify(),
    build: {
        format: 'file',
    },
    devToolbar: {
        enabled: false,
    },
    fonts: [
        {
            cssVariable: '--font-archivo',
            display: 'block',
            name: 'Archivo',
            provider: fontProviders.fontsource(),
            styles: ['normal'],
            subsets: ['latin'],
            weights: [400, 600],
        },
        {
            cssVariable: '--font-bodoni-moda',
            display: 'block',
            fallbacks: ['Georgia', 'serif'],
            name: 'Bodoni Moda',
            provider: fontProviders.fontsource(),
            styles: ['normal', 'italic'],
            subsets: ['latin'],
            weights: ['400 900'],
        },
        {
            cssVariable: '--font-playfair-display',
            display: 'block',
            fallbacks: ['Georgia', 'serif'],
            name: 'Playfair Display',
            provider: fontProviders.fontsource(),
            styles: ['normal', 'italic'],
            subsets: ['latin'],
            weights: ['400 900'],
        },
        {
            cssVariable: '--font-source-serif-4',
            display: 'block',
            fallbacks: ['Georgia', 'serif'],
            name: 'Source Serif 4',
            provider: fontProviders.fontsource(),
            styles: ['normal'],
            subsets: ['latin'],
            weights: ['200 900'],
        },
    ],
    integrations: [
        react(),
        robots(),
        sitemap({ lastmod: new Date() }),
    ],
    site: 'https://figurezeroproject.com',
    trailingSlash: 'never',
    vite: {
        plugins: [tailwind()],
    },
});
