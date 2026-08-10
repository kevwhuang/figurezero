import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

type ScrollVariant = 'fade' | 'left' | 'right' | 'up' | 'zoom';

const LETTER_DURATION = 0.8;
const LETTER_OFFSET = 60;
const LETTER_STAGGER = 0.045;
const POP_DELAY = 0.3;
const POP_DURATION = 0.7;
const POP_SCALE = 0.6;
const RISE_DURATION = 0.8;
const RISE_OFFSET = 40;
const RISE_STAGGER = 0.12;
const SCROLL_DURATION = 0.9;

const SCROLL_EASES: Record<ScrollVariant, string> = {
    fade: 'power2.out',
    left: 'power2.out',
    right: 'power2.out',
    up: 'power2.out',
    zoom: 'back.out(1.4)',
};

const SCROLL_OFFSET = 26;
const SCROLL_START = 'top 85%';

const SCROLL_VARIANTS: Record<ScrollVariant, gsap.TweenVars> = {
    fade: {},
    left: { x: -SCROLL_OFFSET },
    right: { x: SCROLL_OFFSET },
    up: { y: SCROLL_OFFSET },
    zoom: { scale: 0.92, y: 12 },
};

function initLetterAnimations() {
    document.querySelectorAll<HTMLElement>('[data-letters]').forEach((container) => {
        const letters = container.querySelectorAll<HTMLElement>('[data-letter]');
        const pops = container.querySelectorAll<HTMLElement>('[data-pop]');

        if (letters.length > 0) {
            gsap.fromTo(letters, {
                opacity: 0,
                yPercent: LETTER_OFFSET,
            }, {
                duration: LETTER_DURATION,
                ease: 'power3.out',
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
                delay: POP_DELAY,
                duration: POP_DURATION,
                ease: 'back.out(1.7)',
                opacity: 1,
                scale: 1,
            });
        }
    });
}

function initRiseAnimations() {
    document.querySelectorAll<HTMLElement>('[data-rise]').forEach((element, index) => {
        gsap.fromTo(element, {
            opacity: 0,
            y: RISE_OFFSET,
        }, {
            delay: index * RISE_STAGGER,
            duration: RISE_DURATION,
            ease: 'power3.out',
            opacity: 1,
            y: 0,
        });
    });
}

function initScrollAnimations() {
    document.querySelectorAll<HTMLElement>('[data-scroll]').forEach((element) => {
        const scroll = element.dataset.scroll || 'up';
        const stagger = Number.parseFloat(element.dataset.scrollStagger || '0');
        const variant = Object.hasOwn(SCROLL_VARIANTS, scroll) ? scroll as ScrollVariant : 'up';

        const from: gsap.TweenVars = {
            opacity: 0,
            ...SCROLL_VARIANTS[variant],
        };

        const to: gsap.TweenVars = {
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
            gsap.fromTo(element.children, from, { ...to, stagger });
        } else gsap.fromTo(element, from, to);
    });
}

gsap.registerPlugin(ScrollTrigger);

export async function initMotion(): Promise<void> {
    ScrollTrigger.getAll().forEach(trigger => trigger.kill());

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
        document.querySelectorAll<HTMLElement>('[data-letter], [data-pop], [data-rise], [data-scroll]').forEach((element) => {
            element.style.opacity = '1';
        });
    } else {
        initLetterAnimations();
        initRiseAnimations();
        initScrollAnimations();
    }

    await document.fonts.ready;

    if (!prefersReducedMotion) ScrollTrigger.refresh();

    if (window.location.hash) document.getElementById(window.location.hash.slice(1))?.scrollIntoView();
}
