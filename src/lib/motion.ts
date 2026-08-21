import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { REDUCED_MOTION_QUERY } from '@lib/constants';

type ScrollVariant = 'left' | 'right' | 'up' | 'zoom';

const DOODLE_OPACITY = 0.15;
const ENTRANCE_DURATION = 0.6;
const ENTRANCE_EASE = 'power3.out';
const ENTRANCE_OFFSET = 24;
const LETTER_OFFSET_PERCENT = 60;
const LETTER_STAGGER = 0.05;
const POP_DELAY = 0.1;
const POP_EASE = 'back.out(1.7)';
const POP_SCALE = 0.6;
const RISE_STAGGER = 0.1;
const SCROLL_START = 'top 85%';
const ZOOM_SCALE = 0.9;

const SCROLL_VARIANTS = {
    left: { x: -ENTRANCE_OFFSET },
    right: { x: ENTRANCE_OFFSET },
    up: { y: ENTRANCE_OFFSET },
    zoom: { scale: ZOOM_SCALE, y: ENTRANCE_OFFSET },
} as const satisfies Record<ScrollVariant, gsap.TweenVars>;

function initEntranceAnimations(selector: string, toVariables: gsap.TweenVars) {
    const elements = document.querySelectorAll<HTMLElement>(selector);

    if (elements.length === 0) return;

    gsap.fromTo(elements, {
        opacity: 0,
        y: ENTRANCE_OFFSET,
    }, {
        duration: ENTRANCE_DURATION,
        ease: ENTRANCE_EASE,
        opacity: 1,
        y: 0,
        ...toVariables,
    });
}

function initLetterAnimations() {
    document.querySelectorAll<HTMLElement>('[data-letters]').forEach((container) => {
        const letters = container.querySelectorAll<HTMLElement>('[data-letter]');
        const pops = container.querySelectorAll<HTMLElement>('[data-pop]');
        const timeline = gsap.timeline();

        if (letters.length > 0) {
            timeline.fromTo(letters, {
                opacity: 0,
                yPercent: LETTER_OFFSET_PERCENT,
            }, {
                duration: ENTRANCE_DURATION,
                ease: ENTRANCE_EASE,
                opacity: 1,
                stagger: LETTER_STAGGER,
                yPercent: 0,
            });
        }

        if (pops.length > 0) {
            timeline.fromTo(pops, {
                opacity: 0,
                scale: POP_SCALE,
            }, {
                delay: POP_DELAY,
                duration: ENTRANCE_DURATION,
                ease: POP_EASE,
                opacity: 1,
                scale: 1,
            });
        }
    });
}

function initScrollAnimations() {
    document.querySelectorAll<HTMLElement>('[data-scroll]').forEach((element) => {
        const requestedVariant = element.dataset.scroll ?? '';
        const stagger = Number.parseFloat(element.dataset.scrollStagger || '0');

        const variant = isScrollVariant(requestedVariant) ? requestedVariant : 'up';

        const fromVariables = {
            opacity: 0,
            ...SCROLL_VARIANTS[variant],
        };

        const toVariables = {
            clearProps: 'transform',
            duration: ENTRANCE_DURATION,
            ease: ENTRANCE_EASE,
            opacity: 1,
            scale: 1,
            x: 0,
            y: 0,
        };

        if (stagger > 0) {
            gsap.set(element, { opacity: 1 });
            gsap.set(element.children, fromVariables);

            ScrollTrigger.batch(element.children, {
                onEnter: batch => gsap.to(batch, { ...toVariables, stagger }),
                once: true,
                start: SCROLL_START,
            });
        } else {
            gsap.fromTo(element, fromVariables, {
                ...toVariables,
                scrollTrigger: {
                    start: SCROLL_START,
                    trigger: element,
                },
            });
        }
    });
}

function isScrollVariant(variant: string): variant is ScrollVariant {
    return Object.hasOwn(SCROLL_VARIANTS, variant);
}

gsap.registerPlugin(ScrollTrigger);

export async function initMotion(): Promise<void> {
    const prefersReducedMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches;

    ScrollTrigger.getAll().forEach(trigger => trigger.kill());

    if (prefersReducedMotion) {
        document.querySelectorAll<HTMLElement>('[data-letter], [data-pop], [data-rise], [data-scroll]').forEach((element) => {
            element.style.opacity = '1';
        });

        document.querySelectorAll<HTMLElement>('[data-doodle]').forEach((element) => {
            element.style.opacity = String(DOODLE_OPACITY);
        });
    } else {
        initEntranceAnimations('[data-doodle]', { opacity: DOODLE_OPACITY });
        initEntranceAnimations('[data-rise]', { stagger: RISE_STAGGER });
        initLetterAnimations();
        initScrollAnimations();
    }

    await document.fonts.ready;

    if (!prefersReducedMotion) ScrollTrigger.refresh();
    if (window.location.hash) document.getElementById(window.location.hash.slice(1))?.scrollIntoView();
}
