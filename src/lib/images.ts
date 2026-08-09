import type { ImageMetadata } from 'astro';

const IMAGES = import.meta.glob<ImageMetadata>('/src/images/**/*.webp', { eager: true, import: 'default' });

export function getImage(path: string): ImageMetadata {
    const image = IMAGES[`/src${path}`];

    if (!image) throw new Error(`Unknown image: ${path}`);

    return image;
}
