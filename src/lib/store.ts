import { THEME_KEY } from '@lib/constants';

function clearTheme() {
    try {
        localStorage.removeItem(THEME_KEY);
    } catch {
        return;
    }
}

export function loadTheme(): Theme | null {
    try {
        const raw = localStorage.getItem(THEME_KEY);

        if (raw === null) return null;

        const theme = JSON.parse(raw)?.theme;

        if (theme !== 'dark' && theme !== 'light') {
            clearTheme();

            return null;
        }

        if (raw !== JSON.stringify({ theme })) saveTheme(theme);

        return theme;
    } catch {
        clearTheme();

        return null;
    }
}

export function saveTheme(theme: Theme): void {
    try {
        localStorage.setItem(THEME_KEY, JSON.stringify({ theme }));
    } catch {
        return;
    }
}
