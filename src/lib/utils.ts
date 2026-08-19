import type { ImageMetadata } from 'astro';

const IMAGES = import.meta.glob<ImageMetadata>('/src/images/**/*.webp', { eager: true, import: 'default' });

export function resolveImage(path: string): ImageMetadata {
    const image = IMAGES[`/src${path}`];

    if (!image) throw new Error(`figurezero: failed to resolve image ${path}`);

    return image;
}
