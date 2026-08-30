'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'totus-calling-theme';

/**
 * Скрипт выполняется до первой отрисовки и ставит data-theme на <html>,
 * чтобы страница не мигала светлой темой перед переключением на тёмную.
 */
export const themeBootstrapScript = `(function(){try{var k='${THEME_STORAGE_KEY}';var s=localStorage.getItem(k);var m=window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.setAttribute('data-theme',s==='dark'||s==='light'?s:(m?'dark':'light'));}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

type ThemeContextValue = { theme: Theme; setTheme: (t: Theme) => void; toggle: () => void };

const ThemeContext = createContext<ThemeContextValue>({
    theme: 'light',
    setTheme: () => {},
    toggle: () => {},
});

export function useTheme() {
    return useContext(ThemeContext);
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('light');

    // Синхронизируемся с тем, что уже поставил bootstrap-скрипт.
    useEffect(() => {
        const current = document.documentElement.getAttribute('data-theme');
        if (current === 'dark' || current === 'light') setThemeState(current);
    }, []);

    // Следим за системной темой, пока пользователь не выбрал вручную.
    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const onChange = (e: MediaQueryListEvent) => {
            if (localStorage.getItem(THEME_STORAGE_KEY)) return;
            const next: Theme = e.matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', next);
            setThemeState(next);
        };
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    const setTheme = useCallback((next: Theme) => {
        document.documentElement.setAttribute('data-theme', next);
        try {
            localStorage.setItem(THEME_STORAGE_KEY, next);
        } catch {
            /* приватный режим — тема продержится до перезагрузки */
        }
        setThemeState(next);
    }, []);

    const toggle = useCallback(() => {
        setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    }, [setTheme]);

    return <ThemeContext.Provider value={{ theme, setTheme, toggle }}>{children}</ThemeContext.Provider>;
}
