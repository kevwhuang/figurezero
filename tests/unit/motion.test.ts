import { afterEach, describe, expect, test, vi } from 'vitest';

import { REDUCED_MOTION_QUERY } from '../../src/lib/constants';

import type { Mock } from 'vitest';

interface ContainerStub {
    querySelectorAll: (selector: string) => ElementStub[];
}

interface ElementOptions {
    children?: ElementStub[];
    scroll?: string;
    scrollStagger?: string;
}

interface ElementStub {
    children: ElementStub[];
    dataset: { scroll?: string; scrollStagger?: string };
    style: { opacity: string };
}

interface Killable {
    kill: Mock;
}

interface MotionOptions {
    fontsReady?: Promise<void>;
    hash?: string;
    prefersReducedMotion?: boolean;
    selectors?: Record<string, ContainerStub[] | ElementStub[]>;
}

interface TimelineStub {
    fromTo: Mock;
}

const BATCH_STAGGER = 0.2;
const DOODLE_OPACITY = 0.15;
const DOODLE_SELECTOR = '[data-doodle]';
const ENTRANCE_DURATION = 0.6;
const ENTRANCE_EASE = 'power3.out';
const ENTRANCE_OFFSET = 24;
const LETTERS_SELECTOR = '[data-letters]';
const LETTER_OFFSET_PERCENT = 60;
const LETTER_SELECTOR = '[data-letter]';
const LETTER_STAGGER = 0.05;

const NON_BATCHING_STAGGER_CASES = [
    { label: 'a non-numeric value', scrollStagger: 'abc' },
    { label: 'an empty string', scrollStagger: '' },
    { label: 'an explicit zero', scrollStagger: '0' },
] as const;

const POP_DELAY = 0.1;
const POP_EASE = 'back.out(1.7)';
const POP_SCALE = 0.6;
const POP_SELECTOR = '[data-pop]';
const REVEAL_SELECTOR = '[data-letter], [data-pop], [data-rise], [data-scroll]';
const RISE_SELECTOR = '[data-rise]';
const RISE_STAGGER = 0.1;
const SCROLL_SELECTOR = '[data-scroll]';
const SCROLL_START = 'top 85%';
const STAGGER_SET_COUNT = 2;
const TIMELINE_TWEEN_COUNT = 2;
const VISIBLE_OPACITY = '1';
const ZOOM_SCALE = 0.9;

const SCROLL_VARIANT_CASES = [
    { from: { opacity: 0, y: ENTRANCE_OFFSET }, name: 'default', scroll: undefined },
    { from: { opacity: 0, x: -ENTRANCE_OFFSET }, name: 'left', scroll: 'left' },
    { from: { opacity: 0, x: ENTRANCE_OFFSET }, name: 'right', scroll: 'right' },
    { from: { opacity: 0, y: ENTRANCE_OFFSET }, name: 'up', scroll: 'up' },
    { from: { opacity: 0, scale: ZOOM_SCALE, y: ENTRANCE_OFFSET }, name: 'zoom', scroll: 'zoom' },
    { from: { opacity: 0, y: ENTRANCE_OFFSET }, name: 'unrecognized', scroll: 'wobble' },
] as const;

const { gsapStub, scrollTriggerStub, state } = vi.hoisted(() => {
    const state = {
        scrollTriggers: [] as Killable[],
        timelines: [] as TimelineStub[],
    };

    const gsapStub = {
        fromTo: vi.fn<(targets: unknown, from: Record<string, unknown>, to: Record<string, unknown>) => void>(),
        registerPlugin: vi.fn(),
        set: vi.fn<(targets: unknown, vars: Record<string, unknown>) => void>(),
        timeline: vi.fn(() => {
            const timeline = { fromTo: vi.fn() };

            state.timelines.push(timeline);

            return timeline;
        }),
        to: vi.fn<(targets: unknown, vars: Record<string, unknown>) => void>(),
    };

    const scrollTriggerStub = {
        batch: vi.fn<(targets: unknown, options: { onEnter: (batch: unknown) => void; once: boolean; start: string }) => void>(),
        getAll: vi.fn(() => state.scrollTriggers),
        refresh: vi.fn(),
    };

    return { gsapStub, scrollTriggerStub, state };
});

function buildContainer(letters: ElementStub[] = [], pops: ElementStub[] = []) {
    return {
        querySelectorAll: vi.fn((selector: string) => {
            if (selector === LETTER_SELECTOR) return letters;
            if (selector === POP_SELECTOR) return pops;

            return [];
        }),
    };
}

function buildElement({ children = [], scroll, scrollStagger }: ElementOptions = {}) {
    return { children, dataset: { scroll, scrollStagger }, style: { opacity: '' } };
}

function buildKillable() {
    return { kill: vi.fn() };
}

async function loadMotion({ fontsReady = Promise.resolve(), hash = '', prefersReducedMotion = false, selectors = {} }: MotionOptions = {}) {
    state.scrollTriggers = [];
    state.timelines = [];
    vi.clearAllMocks();
    vi.resetModules();

    const hashTarget = { scrollIntoView: vi.fn() };

    const windowStub = {
        location: { hash },
        matchMedia: vi.fn((query: string) => ({ matches: prefersReducedMotion && query === REDUCED_MOTION_QUERY })),
    };

    const documentStub = {
        fonts: { ready: fontsReady },
        getElementById: vi.fn((id: string) => `#${id}` === hash ? hashTarget : null),
        querySelectorAll: vi.fn((selector: string) => selectors[selector] ?? []),
    };

    vi.stubGlobal('document', documentStub);
    vi.stubGlobal('window', windowStub);

    const { initMotion } = await import('../../src/lib/motion');

    return { documentStub, hashTarget, initMotion, windowStub };
}

vi.mock('gsap', () => ({ default: gsapStub }));
vi.mock('gsap/ScrollTrigger', () => ({ ScrollTrigger: scrollTriggerStub }));

afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
});

describe('initMotion', () => {
    test('reveals animated targets inline and dims doodles under reduced motion without registering a tween', async () => {
        const doodles = [buildElement(), buildElement()];
        const targets = [buildElement(), buildElement(), buildElement()];

        const { initMotion, windowStub } = await loadMotion({
            prefersReducedMotion: true,
            selectors: { [DOODLE_SELECTOR]: doodles, [REVEAL_SELECTOR]: targets },
        });

        await initMotion();

        expect(windowStub.matchMedia).toHaveBeenCalledExactlyOnceWith(REDUCED_MOTION_QUERY);

        for (const [index, target] of targets.entries()) {
            expect(target.style.opacity, `target ${index}`).toBe(VISIBLE_OPACITY);
        }

        for (const [index, doodle] of doodles.entries()) {
            expect(doodle.style.opacity, `doodle ${index}`).toBe(String(DOODLE_OPACITY));
        }

        expect(gsapStub.fromTo).not.toHaveBeenCalled();
        expect(gsapStub.set).not.toHaveBeenCalled();
        expect(gsapStub.timeline).not.toHaveBeenCalled();
        expect(gsapStub.to).not.toHaveBeenCalled();
        expect(scrollTriggerStub.batch).not.toHaveBeenCalled();
    });

    test('skips the scroll trigger refresh under reduced motion', async () => {
        const { initMotion } = await loadMotion({ prefersReducedMotion: true });

        await initMotion();

        expect(scrollTriggerStub.refresh).not.toHaveBeenCalled();
    });

    test('fades every doodle up to its resting opacity when motion is allowed', async () => {
        const doodles = [buildElement(), buildElement()];

        const { initMotion } = await loadMotion({ selectors: { [DOODLE_SELECTOR]: doodles } });

        await initMotion();

        expect(gsapStub.fromTo).toHaveBeenCalledExactlyOnceWith(doodles, { opacity: 0, y: ENTRANCE_OFFSET }, {
            duration: ENTRANCE_DURATION,
            ease: ENTRANCE_EASE,
            opacity: DOODLE_OPACITY,
            y: 0,
        });
    });

    test('raises data-rise elements together with a stagger between siblings', async () => {
        const rises = [buildElement(), buildElement()];

        const { initMotion } = await loadMotion({ selectors: { [RISE_SELECTOR]: rises } });

        await initMotion();

        expect(gsapStub.fromTo).toHaveBeenCalledExactlyOnceWith(rises, { opacity: 0, y: ENTRANCE_OFFSET }, {
            duration: ENTRANCE_DURATION,
            ease: ENTRANCE_EASE,
            opacity: 1,
            stagger: RISE_STAGGER,
            y: 0,
        });
    });

    test('tumbles data-letter spans into view through a per-container timeline', async () => {
        const letterSets = [[buildElement(), buildElement()], [buildElement()]];

        const containers = letterSets.map(letters => buildContainer(letters));

        const { initMotion } = await loadMotion({ selectors: { [LETTERS_SELECTOR]: containers } });

        await initMotion();

        expect(gsapStub.timeline).toHaveBeenCalledTimes(containers.length);

        for (const [index, letters] of letterSets.entries()) {
            expect(state.timelines[index].fromTo, `container ${index}`).toHaveBeenCalledExactlyOnceWith(letters, {
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
    });

    test('pops data-pop elements in with a back ease after a short delay', async () => {
        const pops = [buildElement()];

        const container = buildContainer([], pops);

        const { initMotion } = await loadMotion({ selectors: { [LETTERS_SELECTOR]: [container] } });

        await initMotion();

        const [timeline] = state.timelines;

        expect(timeline.fromTo).toHaveBeenCalledExactlyOnceWith(pops, { opacity: 0, scale: POP_SCALE }, {
            delay: POP_DELAY,
            duration: ENTRANCE_DURATION,
            ease: POP_EASE,
            opacity: 1,
            scale: 1,
        });
    });

    test('sequences the letter tween before the pop tween on a single timeline', async () => {
        const letters = [buildElement()];
        const pops = [buildElement()];

        const container = buildContainer(letters, pops);

        const { initMotion } = await loadMotion({ selectors: { [LETTERS_SELECTOR]: [container] } });

        await initMotion();

        expect(gsapStub.timeline).toHaveBeenCalledTimes(1);

        const [timeline] = state.timelines;

        expect(timeline.fromTo).toHaveBeenCalledTimes(TIMELINE_TWEEN_COUNT);
        expect(timeline.fromTo.mock.calls[0][0]).toBe(letters);
        expect(timeline.fromTo.mock.calls[1][0]).toBe(pops);
    });

    test('creates a timeline without tweens for a letters container with nothing to animate', async () => {
        const container = buildContainer();

        const { initMotion } = await loadMotion({ selectors: { [LETTERS_SELECTOR]: [container] } });

        await initMotion();

        expect(gsapStub.timeline).toHaveBeenCalledTimes(1);

        const [timeline] = state.timelines;

        expect(timeline.fromTo).not.toHaveBeenCalled();
    });

    for (const { from, name, scroll } of SCROLL_VARIANT_CASES) {
        test(`tweens a ${name} data-scroll element in from its variant offset on a scroll trigger`, async () => {
            const element = buildElement({ scroll });

            const { initMotion } = await loadMotion({ selectors: { [SCROLL_SELECTOR]: [element] } });

            await initMotion();

            expect(gsapStub.fromTo).toHaveBeenCalledExactlyOnceWith(element, from, {
                clearProps: 'transform',
                duration: ENTRANCE_DURATION,
                ease: ENTRANCE_EASE,
                opacity: 1,
                scale: 1,
                scrollTrigger: { start: SCROLL_START, trigger: element },
                x: 0,
                y: 0,
            });

            expect(gsapStub.set).not.toHaveBeenCalled();
            expect(gsapStub.to).not.toHaveBeenCalled();
        });
    }

    for (const { label, scrollStagger } of NON_BATCHING_STAGGER_CASES) {
        test(`tweens a data-scroll element without batching when its stagger is ${label}`, async () => {
            const element = buildElement({ children: [buildElement()], scrollStagger });

            const { initMotion } = await loadMotion({ selectors: { [SCROLL_SELECTOR]: [element] } });

            await initMotion();

            expect(gsapStub.fromTo).toHaveBeenCalledExactlyOnceWith(element, { opacity: 0, y: ENTRANCE_OFFSET }, {
                clearProps: 'transform',
                duration: ENTRANCE_DURATION,
                ease: ENTRANCE_EASE,
                opacity: 1,
                scale: 1,
                scrollTrigger: { start: SCROLL_START, trigger: element },
                x: 0,
                y: 0,
            });

            expect(gsapStub.set).not.toHaveBeenCalled();
            expect(scrollTriggerStub.batch).not.toHaveBeenCalled();
        });
    }

    test('reveals a staggered container and batch-tweens its hidden children once on enter', async () => {
        const children = [buildElement(), buildElement()];

        const element = buildElement({ children, scrollStagger: String(BATCH_STAGGER) });

        const { initMotion } = await loadMotion({ selectors: { [SCROLL_SELECTOR]: [element] } });

        await initMotion();

        expect(gsapStub.set).toHaveBeenCalledTimes(STAGGER_SET_COUNT);
        expect(gsapStub.set).toHaveBeenNthCalledWith(1, element, { opacity: 1 });
        expect(gsapStub.set).toHaveBeenNthCalledWith(2, children, { opacity: 0, y: ENTRANCE_OFFSET });

        expect(scrollTriggerStub.batch).toHaveBeenCalledExactlyOnceWith(children, {
            onEnter: expect.any(Function),
            once: true,
            start: SCROLL_START,
        });

        expect(gsapStub.fromTo).not.toHaveBeenCalled();
        expect(gsapStub.to).not.toHaveBeenCalled();

        const batched = [children[0]];

        scrollTriggerStub.batch.mock.calls[0][1].onEnter(batched);

        expect(gsapStub.to).toHaveBeenCalledExactlyOnceWith(batched, {
            clearProps: 'transform',
            duration: ENTRANCE_DURATION,
            ease: ENTRANCE_EASE,
            opacity: 1,
            scale: 1,
            stagger: BATCH_STAGGER,
            x: 0,
            y: 0,
        });
    });

    test('kills every scroll trigger returned by getAll', async () => {
        const { initMotion } = await loadMotion();

        const triggers = [buildKillable(), buildKillable()];

        state.scrollTriggers = triggers;

        await initMotion();

        for (const [index, trigger] of triggers.entries()) {
            expect(trigger.kill, `trigger ${index}`).toHaveBeenCalledTimes(1);
        }
    });

    test('kills stale scroll triggers even under reduced motion', async () => {
        const { initMotion } = await loadMotion({ prefersReducedMotion: true });

        const triggers = [buildKillable(), buildKillable()];

        state.scrollTriggers = triggers;

        await initMotion();

        for (const [index, trigger] of triggers.entries()) {
            expect(trigger.kill, `trigger ${index}`).toHaveBeenCalledTimes(1);
        }
    });

    test('refreshes scroll triggers after the document fonts promise resolves', async () => {
        const { promise: fontsReady, resolve: resolveFonts } = Promise.withResolvers<void>();

        const { initMotion } = await loadMotion({ fontsReady });

        const pending = initMotion();

        expect(scrollTriggerStub.refresh).not.toHaveBeenCalled();

        resolveFonts();

        await pending;

        expect(scrollTriggerStub.refresh).toHaveBeenCalledTimes(1);
    });

    test('defers the hash target scroll until the document fonts promise resolves', async () => {
        const { promise: fontsReady, resolve: resolveFonts } = Promise.withResolvers<void>();

        const { hashTarget, initMotion } = await loadMotion({ fontsReady, hash: '#story' });

        const pending = initMotion();

        expect(hashTarget.scrollIntoView).not.toHaveBeenCalled();

        resolveFonts();

        await pending;

        expect(hashTarget.scrollIntoView).toHaveBeenCalledTimes(1);
    });

    test('scrolls the element matching the location hash into view', async () => {
        const { documentStub, hashTarget, initMotion } = await loadMotion({ hash: '#story' });

        await initMotion();

        expect(documentStub.getElementById).toHaveBeenCalledExactlyOnceWith('story');
        expect(hashTarget.scrollIntoView).toHaveBeenCalledTimes(1);
    });

    test('scrolls the hash target into view even under reduced motion', async () => {
        const { documentStub, hashTarget, initMotion } = await loadMotion({ hash: '#story', prefersReducedMotion: true });

        await initMotion();

        expect(documentStub.getElementById).toHaveBeenCalledExactlyOnceWith('story');
        expect(hashTarget.scrollIntoView).toHaveBeenCalledTimes(1);
    });

    test('finishes without scrolling when the hash matches no element', async () => {
        const { documentStub, hashTarget, initMotion } = await loadMotion({ hash: '#missing' });

        documentStub.getElementById.mockReturnValue(null);

        await expect(initMotion()).resolves.toBeUndefined();

        expect(documentStub.getElementById).toHaveBeenCalledExactlyOnceWith('missing');
        expect(hashTarget.scrollIntoView).not.toHaveBeenCalled();
    });

    test('scrolls nothing when the location hash is empty', async () => {
        const { documentStub, hashTarget, initMotion } = await loadMotion();

        await initMotion();

        expect(documentStub.getElementById).not.toHaveBeenCalled();
        expect(hashTarget.scrollIntoView).not.toHaveBeenCalled();
    });

    test('registers no tweens when the page has no animated elements', async () => {
        const { initMotion } = await loadMotion();

        await initMotion();

        expect(gsapStub.fromTo).not.toHaveBeenCalled();
        expect(gsapStub.set).not.toHaveBeenCalled();
        expect(gsapStub.timeline).not.toHaveBeenCalled();
        expect(gsapStub.to).not.toHaveBeenCalled();
        expect(scrollTriggerStub.batch).not.toHaveBeenCalled();
    });
});

describe('module scope', () => {
    test('registers the scroll trigger plugin with gsap', async () => {
        await loadMotion();

        expect(gsapStub.registerPlugin).toHaveBeenCalledExactlyOnceWith(scrollTriggerStub);
    });
});
