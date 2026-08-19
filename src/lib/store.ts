import { THEME_KEY } from '@lib/constants';

export function loadTheme(): Theme | null {
    try {
        const raw = localStorage.getItem(THEME_KEY);

        if (!raw) return null;

        const stored = JSON.parse(raw);

        const theme = stored?.theme;

        if (theme === 'dark' || theme === 'light') return theme;

        localStorage.removeItem(THEME_KEY);
    } catch {
        try {
            localStorage.removeItem(THEME_KEY);
        } catch {
            return null;
        }
    }

    return null;
}

export function saveTheme(theme: Theme): void {
    try {
        localStorage.setItem(THEME_KEY, JSON.stringify({ theme }));
    } catch {
        return;
    }
}
