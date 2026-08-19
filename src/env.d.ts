/// <reference types="astro/client" />

declare module 'eslint-plugin-jsx-a11y';

type Theme = 'dark' | 'light';

interface ImportMetaEnv {
    readonly SUPABASE_PUBLISHABLE_KEY: string;
    readonly SUPABASE_URL: string;
}
