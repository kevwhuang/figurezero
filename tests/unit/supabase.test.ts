import { afterEach, describe, expect, test, vi } from 'vitest';

afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});

describe('supabase', () => {
    test('importing the module yields a client without any network call', async () => {
        const fetchStub = vi.fn();

        vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'test-publishable-key');
        vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
        vi.stubGlobal('fetch', fetchStub);

        const { supabase } = await import('../../src/lib/supabase');

        const builder = supabase.from('covers');

        expect(fetchStub).not.toHaveBeenCalled();
        expect(typeof builder.insert).toBe('function');
        expect(typeof builder.select).toBe('function');
        expect(typeof supabase.auth.getSession).toBe('function');
        expect(typeof supabase.auth.signInWithPassword).toBe('function');
    });
});
