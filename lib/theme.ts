import type { CSSProperties } from 'react';

/**
 * Токены дизайн-системы TOTUS для инлайновых стилей.
 *
 * Значения — ссылки на CSS-переменные из app/globals.css, поэтому смена темы
 * работает без перерисовки React: меняется только атрибут data-theme на <html>.
 * Хардкодить цвета в компонентах нельзя — только через этот модуль.
 */
export const t = {
    bg: 'var(--bg)',
    surface: 'var(--surface)',
    surfaceInset: 'var(--surface-inset)',
    surfaceHover: 'var(--surface-hover)',
    border: 'var(--border)',
    borderStrong: 'var(--border-strong)',

    textPrimary: 'var(--text-primary)',
    textSecondary: 'var(--text-secondary)',
    textTertiary: 'var(--text-tertiary)',
    textDisabled: 'var(--text-disabled)',
    textOnAccent: 'var(--text-on-accent)',

    accent: 'var(--accent)',
    accentHover: 'var(--accent-hover)',
    accentSoft: 'var(--accent-soft)',
    accentBorder: 'var(--accent-border)',

    success: 'var(--success)',
    successSoft: 'var(--success-soft)',
    info: 'var(--info)',
    infoSoft: 'var(--info-soft)',
    warning: 'var(--warning)',
    warningSoft: 'var(--warning-soft)',
    error: 'var(--error)',
    errorSoft: 'var(--error-soft)',

    shadowCard: 'var(--shadow-card)',
    shadowRaised: 'var(--shadow-raised)',
} as const;

/** Радиусы дизайн-системы: Firm, Firm 2, Smooth, Circular. */
export const radius = { sm: 8, md: 12, lg: 16, pill: 200 } as const;

export const layout = { sidebar: 260, contentMax: 1280 } as const;

/** Типографика: одна роль на размер, никаких 24/700 вперемешку с 28/700. */
export const text = {
    pageTitle: { fontSize: 32, lineHeight: '40px', fontWeight: 400, color: t.textPrimary },
    sectionTitle: { fontSize: 20, lineHeight: '28px', fontWeight: 600, color: t.textPrimary },
    cardTitle: { fontSize: 16, lineHeight: '24px', fontWeight: 600, color: t.textPrimary },
    body: { fontSize: 14, lineHeight: '20px', fontWeight: 400, color: t.textSecondary },
    caption: { fontSize: 13, lineHeight: '18px', fontWeight: 400, color: t.textTertiary },
    mono: { fontSize: 12, lineHeight: '16px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
} satisfies Record<string, CSSProperties>;

/* ── Готовые примитивы ─────────────────────────────────────────────────── */

export const cardStyle: CSSProperties = {
    padding: 24,
    borderRadius: radius.lg,
    background: t.surface,
    border: `1px solid ${t.border}`,
    boxShadow: t.shadowCard,
};

export const inputStyle: CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: radius.md,
    border: `1px solid ${t.border}`,
    background: t.surface,
    color: t.textPrimary,
    fontSize: 14,
    fontFamily: 'inherit',
    boxSizing: 'border-box',
};

export const textareaStyle: CSSProperties = {
    ...inputStyle,
    minHeight: 120,
    resize: 'vertical',
};

export const sectionBox: CSSProperties = {
    marginBottom: 24,
    padding: 20,
    borderRadius: radius.md,
    border: `1px solid ${t.border}`,
    background: t.surfaceInset,
};

export const sectionTitle: CSSProperties = { margin: '0 0 6px', ...text.sectionTitle };
export const sectionDesc: CSSProperties = { margin: '0 0 16px', ...text.caption };

export const rowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.sm,
    border: `1px solid ${t.border}`,
    background: t.surface,
};

type ButtonKind = 'primary' | 'secondary' | 'tertiary' | 'danger';

/** Кнопка по спецификации компонента Button из библиотеки. */
export function button(kind: ButtonKind = 'primary', size: 'lg' | 'md' | 'sm' = 'md'): CSSProperties {
    const pad = size === 'lg' ? '14px 24px' : size === 'sm' ? '6px 12px' : '10px 18px';
    const fontSize = size === 'sm' ? 13 : 14;
    const base: CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: pad,
        fontSize,
        fontWeight: 600,
        fontFamily: 'inherit',
        lineHeight: '20px',
        borderRadius: radius.sm,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'background 0.15s, color 0.15s, border-color 0.15s',
    };
    if (kind === 'primary') {
        return { ...base, background: t.accent, color: t.textOnAccent, border: '1px solid transparent' };
    }
    if (kind === 'secondary') {
        return { ...base, background: t.surface, color: t.textPrimary, border: `1px solid ${t.border}` };
    }
    if (kind === 'danger') {
        return { ...base, background: t.errorSoft, color: t.error, border: `1px solid transparent` };
    }
    return { ...base, background: 'transparent', color: t.textSecondary, border: '1px solid transparent' };
}

type Tone = 'neutral' | 'success' | 'info' | 'warning' | 'error' | 'accent';

/** Плашка статуса. */
export function badge(tone: Tone = 'neutral'): CSSProperties {
    const map: Record<Tone, [string, string]> = {
        neutral: [t.surfaceInset, t.textSecondary],
        success: [t.successSoft, t.success],
        info: [t.infoSoft, t.info],
        warning: [t.warningSoft, t.warning],
        error: [t.errorSoft, t.error],
        accent: [t.accentSoft, t.accent],
    };
    const [background, color] = map[tone];
    return {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: radius.pill,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: '16px',
        background,
        color,
    };
}
