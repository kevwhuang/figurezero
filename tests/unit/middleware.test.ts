import { describe, expect, test, vi } from 'vitest';

import { onRequest } from '../../src/middleware';

import type { APIContext, MiddlewareNext } from 'astro';

function createContext(pathname: string) {
    const rewritten = new Response('rewritten');

    const rewrite = vi.fn(async () => rewritten);

    const context = { rewrite, url: new URL(`http://localhost:8888${pathname}`) } as unknown as APIContext;

    return { context, rewrite, rewritten };
}

describe('onRequest', () => {
    test('passes the /500 path straight through even with a 5xx response', async () => {
        const { context, rewrite } = createContext('/500');
        const errorPage = new Response(null, { status: 503 });

        const next: MiddlewareNext = vi.fn(async () => errorPage);

        const response = await onRequest(context, next);

        expect(response).toBe(errorPage);
        expect(rewrite).not.toHaveBeenCalled();
    });

    test('propagates a rejection from next on the /500 path itself', async () => {
        const { context, rewrite } = createContext('/500');
        const failure = new Error('boom');

        const next: MiddlewareNext = vi.fn(async () => {
            throw failure;
        });

        await expect(onRequest(context, next)).rejects.toBe(failure);

        expect(rewrite).not.toHaveBeenCalled();
    });

    test('passes a 200 page response through without rewriting', async () => {
        const { context, rewrite } = createContext('/team');
        const page = new Response('ok', { status: 200 });

        const next: MiddlewareNext = vi.fn(async () => page);

        const response = await onRequest(context, next);

        expect(response).toBe(page);
        expect(rewrite).not.toHaveBeenCalled();
    });

    test('passes a 499 page response through without rewriting', async () => {
        const { context, rewrite } = createContext('/team');
        const page = new Response(null, { status: 499 });

        const next: MiddlewareNext = vi.fn(async () => page);

        const response = await onRequest(context, next);

        expect(response).toBe(page);
        expect(rewrite).not.toHaveBeenCalled();
    });

    test('rewrites page responses with status 500 or above to /500', async () => {
        for (const status of [500, 503]) {
            const { context, rewrite, rewritten } = createContext('/team');
            const next: MiddlewareNext = vi.fn(async () => new Response(null, { status }));

            const response = await onRequest(context, next);

            expect(response, `status ${status}`).toBe(rewritten);
            expect(rewrite, `status ${status}`).toHaveBeenCalledWith('/500');
        }
    });

    test('passes api 500 responses through without rewriting', async () => {
        for (const status of [500, 503]) {
            const { context, rewrite } = createContext('/api/covers');
            const failure = new Response(null, { status });

            const next: MiddlewareNext = vi.fn(async () => failure);

            const response = await onRequest(context, next);

            expect(response, `status ${status}`).toBe(failure);
            expect(rewrite, `status ${status}`).not.toHaveBeenCalled();
        }
    });

    test('returns a json 500 when next throws on an api path', async () => {
        const { context, rewrite } = createContext('/api/covers');

        const next: MiddlewareNext = vi.fn(async () => {
            throw new Error('boom');
        });

        const response = await onRequest(context, next) as Response;

        expect(response).toBeInstanceOf(Response);
        expect(response.status).toBe(500);

        await expect(response.json()).resolves.toEqual({ error: 'Internal server error' });

        expect(rewrite).not.toHaveBeenCalled();
    });

    test('rewrites to /500 when next throws on a page path', async () => {
        const { context, rewrite, rewritten } = createContext('/team');

        const next: MiddlewareNext = vi.fn(async () => {
            throw new Error('boom');
        });

        const response = await onRequest(context, next);

        expect(response).toBe(rewritten);
        expect(rewrite).toHaveBeenCalledWith('/500');
    });

    test('rewrites to /500 when next throws on /api without a trailing slash', async () => {
        const { context, rewrite, rewritten } = createContext('/api');

        const next: MiddlewareNext = vi.fn(async () => {
            throw new Error('boom');
        });

        const response = await onRequest(context, next);

        expect(response).toBe(rewritten);
        expect(rewrite).toHaveBeenCalledWith('/500');
    });
});
