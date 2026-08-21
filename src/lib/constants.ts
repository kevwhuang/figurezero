export const CLASS_ERROR_LINK = 'active:translate-y-0.5 after:-inset-4 after:absolute hover:border-taupe hover:text-taupe inline-block relative pb-1 border-b font-sans text-label tracking-[0.16em] uppercase border-charcoal text-charcoal duration-(--duration-fast) ease-[ease] transition-[border-color,color,translate]';
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
export const SHELL_PAD = 'clamp(24px, calc(5.3333px + 5.8333vw), 80px)';
export const THEME_KEY = 'figurezero_theme';

export const COLOR_SCHEME_QUERIES = {
    dark: '(prefers-color-scheme: dark)',
    light: '(prefers-color-scheme: light)',
} as const;

export const ROUTES = [
    { href: '/', label: 'Home' },
    { href: '/team', label: 'Team' },
    { href: '/portfolio', label: 'Portfolio' },
] as const;

export const THEME_COLORS = {
    dark: '#191510',
    light: '#faf8f3',
} as const;
