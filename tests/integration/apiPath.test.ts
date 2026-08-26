import { describe, expect, test } from 'vitest';

import { ALL, prerender } from '../../src/pages/api/[...path]';

type RouteContext = Parameters<typeof ALL>[0];

const METHODS = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT'] as const;

function createContext(method: string, path: string) {
    return {
        clientAddress: '127.0.0.1',
        request: new Request(`http://localhost/api/${path}`, { method }),
    } as RouteContext;
}

async function expectNotFoundJson(response: Response, method: string) {
    expect(response.status, method).toBe(404);

    const result: Record<string, unknown> = await response.json();

    expect(result, method).toEqual({ error: 'Not found.' });
}

describe('api path', () => {
    test('opts out of prerendering', () => {
        expect(prerender).toBe(false);
    });

    test('responds 404 with the json error to every method', async () => {
        for (const method of METHODS) {
            const response = await ALL(createContext(method, 'anything/nested'));

            await expectNotFoundJson(response, method);
        }
    });

    test('sets a json content type header', async () => {
        const response = await ALL(createContext('GET', 'x'));

        expect(response.headers.get('content-type')).toContain('application/json');
    });
});
