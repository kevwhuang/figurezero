import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

type ScrollVariant = 'fade' | 'left' | 'right' | 'up' | 'zoom';

const DOODLE_OPACITY = 0.14;
const ENTRANCE_EASE = 'power3.out';
const LETTER_DURATION = 0.8;
const LETTER_OFFSET_PERCENT = 60;
const LETTER_STAGGER = 0.045;
const POP_DELAY = 0.1;
const POP_DURATION = 0.7;
const POP_EASE = 'back.out(1.7)';
const POP_SCALE = 0.6;
const RISE_DURATION = 0.8;
const RISE_OFFSET = 40;
const RISE_STAGGER = 0.12;
const SCROLL_DURATION = 0.9;
const SCROLL_EASE = 'power2.out';

const SCROLL_EASES = {
    fade: SCROLL_EASE,
    left: SCROLL_EASE,
    right: SCROLL_EASE,
    up: SCROLL_EASE,
    zoom: 'back.out(1.4)',
} as const satisfies Record<ScrollVariant, string>;

const SCROLL_OFFSET = 26;
const SCROLL_START = 'top 85%';
const ZOOM_SCALE = 0.92;

const SCROLL_VARIANTS = {
    fade: {},
    left: { x: -SCROLL_OFFSET },
    right: { x: SCROLL_OFFSET },
    up: { y: SCROLL_OFFSET },
    zoom: { scale: ZOOM_SCALE, y: SCROLL_OFFSET },
} as const satisfies Record<ScrollVariant, gsap.TweenVars>;

function initLetterAnimations() {
    document.querySelectorAll<HTMLElement>('[data-letters]').forEach((container) => {
        const letters = container.querySelectorAll<HTMLElement>('[data-letter]');
        const pops = container.querySelectorAll<HTMLElement>('[data-pop]');

        if (letters.length > 0) {
            gsap.fromTo(letters, {
                opacity: 0,
                yPercent: LETTER_OFFSET_PERCENT,
            }, {
                duration: LETTER_DURATION,
                ease: ENTRANCE_EASE,
                opacity: 1,
                stagger: LETTER_STAGGER,
                yPercent: 0,
            });
        }

        if (pops.length > 0) {
            gsap.fromTo(pops, {
                opacity: 0,
                scale: POP_SCALE,
            }, {
                delay: (letters.length - 1) * LETTER_STAGGER + LETTER_DURATION + POP_DELAY,
                duration: POP_DURATION,
                ease: POP_EASE,
                opacity: 1,
                scale: 1,
            });
        }
    });
}

function initDoodleAnimations() {
    const doodles = document.querySelectorAll<HTMLElement>('[data-doodle]');

    if (doodles.length === 0) return;

    gsap.fromTo(doodles, {
        opacity: 0,
        y: RISE_OFFSET,
    }, {
        duration: RISE_DURATION,
        ease: ENTRANCE_EASE,
        opacity: DOODLE_OPACITY,
        y: 0,
    });
}

function initRiseAnimations() {
    const elements = document.querySelectorAll<HTMLElement>('[data-rise]');

    if (elements.length === 0) return;

    gsap.fromTo(elements, {
        opacity: 0,
        y: RISE_OFFSET,
    }, {
        duration: RISE_DURATION,
        ease: ENTRANCE_EASE,
        opacity: 1,
        stagger: RISE_STAGGER,
        y: 0,
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
            duration: SCROLL_DURATION,
            ease: SCROLL_EASES[variant],
            opacity: 1,
            scale: 1,
            scrollTrigger: {
                start: SCROLL_START,
                trigger: element,
            },
            x: 0,
            y: 0,
        };

        if (stagger > 0) {
            gsap.set(element, { opacity: 1 });
            gsap.fromTo(element.children, fromVariables, { ...toVariables, stagger });
        } else gsap.fromTo(element, fromVariables, toVariables);
    });
}

function isScrollVariant(variant: string): variant is ScrollVariant {
    return Object.hasOwn(SCROLL_VARIANTS, variant);
}

gsap.registerPlugin(ScrollTrigger);

export async function initMotion(): Promise<void> {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    ScrollTrigger.getAll().forEach(trigger => trigger.kill());

    if (prefersReducedMotion) {
        document.querySelectorAll<HTMLElement>('[data-letter], [data-pop], [data-rise], [data-scroll]').forEach((element) => {
            element.style.opacity = '1';
        });

        document.querySelectorAll<HTMLElement>('[data-doodle]').forEach((element) => {
            element.style.opacity = String(DOODLE_OPACITY);
        });
    } else {
        initDoodleAnimations();
        initLetterAnimations();
        initRiseAnimations();
        initScrollAnimations();
    }

    await document.fonts.ready;

    if (!prefersReducedMotion) ScrollTrigger.refresh();
    if (window.location.hash) document.getElementById(window.location.hash.slice(1))?.scrollIntoView();
}
