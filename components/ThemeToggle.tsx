'use client';

import Icon from './Icon';
import { useTheme } from './ThemeProvider';
import { radius, t } from '@/lib/theme';

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
    const { theme, toggle } = useTheme();
    const dark = theme === 'dark';

    return (
        <button
            type="button"
            onClick={toggle}
            title={dark ? 'Светлая тема' : 'Тёмная тема'}
            aria-label={dark ? 'Включить светлую тему' : 'Включить тёмную тему'}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: compact ? 36 : '100%',
                height: 36,
                padding: compact ? 0 : '0 12px',
                borderRadius: radius.sm,
                border: `1px solid ${t.border}`,
                background: 'transparent',
                color: t.textSecondary,
                fontSize: 13,
                fontFamily: 'inherit',
                fontWeight: 500,
                cursor: 'pointer',
            }}
        >
            <Icon name={dark ? 'brightness' : 'moon'} size={18} />
            {!compact && <span>{dark ? 'Светлая тема' : 'Тёмная тема'}</span>}
        </button>
    );
}
