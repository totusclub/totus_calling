'use client';

/**
 * Левая панель чата поддержки: поиск, фильтры-пилюли и список диалогов.
 */

import Icon from '@/components/Icon';
import { chatUserName, type SupportChat, type SupportChatFilter } from '@/lib/support-chat-api';
import { t, radius, text, inputStyle, button, badge } from '@/lib/theme';
import { initialOf, listTime } from './utils';

export type DialogFilter = SupportChatFilter | 'mine';

const FILTERS: { key: DialogFilter; label: string }[] = [
    { key: 'all', label: 'Все' },
    { key: 'open', label: 'Открытые' },
    { key: 'pending', label: 'Ждут пользователя' },
    { key: 'closed', label: 'Закрытые' },
    { key: 'mine', label: 'Мои' },
];

interface DialogListProps {
    chats: SupportChat[];
    total: number;
    loading: boolean;
    error: string | null;
    selectedId: number | null;
    filter: DialogFilter;
    query: string;
    hasMore: boolean;
    loadingMore: boolean;
    onFilterChange: (f: DialogFilter) => void;
    onQueryChange: (q: string) => void;
    onSelect: (chat: SupportChat) => void;
    onLoadMore: () => void;
}

export default function DialogList({
    chats,
    total,
    loading,
    error,
    selectedId,
    filter,
    query,
    hasMore,
    loadingMore,
    onFilterChange,
    onQueryChange,
    onSelect,
    onLoadMore,
}: DialogListProps) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
            {/* Поиск */}
            <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${t.border}` }}>
                <div style={{ position: 'relative' }}>
                    <span
                        style={{
                            position: 'absolute',
                            left: 12,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: t.textTertiary,
                            display: 'flex',
                        }}
                    >
                        <Icon name="search" size={18} />
                    </span>
                    <input
                        type="search"
                        value={query}
                        onChange={(e) => onQueryChange(e.target.value)}
                        placeholder="Имя, email, телефон, ID"
                        aria-label="Поиск диалогов"
                        style={{ ...inputStyle, padding: '10px 12px 10px 40px' }}
                    />
                </div>

                {/* Фильтры */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                    {FILTERS.map((f) => {
                        const active = f.key === filter;
                        return (
                            <button
                                key={f.key}
                                type="button"
                                onClick={() => onFilterChange(f.key)}
                                aria-pressed={active}
                                style={{
                                    ...badge(active ? 'accent' : 'neutral'),
                                    padding: '6px 12px',
                                    border: `1px solid ${active ? t.accentBorder : 'transparent'}`,
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                }}
                            >
                                {f.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Список */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                {error && (
                    <div style={{ ...text.caption, color: t.error, padding: '12px 16px' }}>{error}</div>
                )}

                {chats.length === 0 ? (
                    <div style={{ ...text.body, color: t.textTertiary, padding: 24, textAlign: 'center' }}>
                        {loading ? 'Загрузка диалогов…' : 'Диалогов нет'}
                    </div>
                ) : (
                    chats.map((chat) => {
                        const active = chat.id === selectedId;
                        const name = chatUserName(chat);
                        const unread = chat.staffUnread || 0;
                        return (
                            <button
                                key={chat.id}
                                type="button"
                                onClick={() => onSelect(chat)}
                                aria-current={active ? 'true' : undefined}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: 12,
                                    padding: '12px 16px',
                                    border: 'none',
                                    borderLeft: `3px solid ${active ? t.accent : 'transparent'}`,
                                    borderBottom: `1px solid ${t.border}`,
                                    background: active ? t.accentSoft : 'transparent',
                                    color: t.textPrimary,
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                    transition: 'background 0.15s',
                                }}
                                onMouseEnter={(e) => {
                                    if (!active) e.currentTarget.style.background = t.surfaceHover;
                                }}
                                onMouseLeave={(e) => {
                                    if (!active) e.currentTarget.style.background = 'transparent';
                                }}
                            >
                                {/* Аватар-инициал + точка «онлайн» */}
                                <div style={{ position: 'relative', flexShrink: 0 }}>
                                    <div
                                        style={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: radius.pill,
                                            background: t.accentSoft,
                                            color: t.accent,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 16,
                                            fontWeight: 600,
                                        }}
                                    >
                                        {initialOf(name)}
                                    </div>
                                    {chat.user?.online && (
                                        <span
                                            title="Онлайн"
                                            style={{
                                                position: 'absolute',
                                                right: -1,
                                                bottom: -1,
                                                width: 12,
                                                height: 12,
                                                borderRadius: radius.pill,
                                                background: t.success,
                                                border: `2px solid ${t.surface}`,
                                            }}
                                        />
                                    )}
                                </div>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span
                                            style={{
                                                ...text.cardTitle,
                                                fontSize: 14,
                                                lineHeight: '20px',
                                                fontWeight: unread > 0 ? 700 : 600,
                                                flex: 1,
                                                minWidth: 0,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {name}
                                        </span>
                                        <span style={{ ...text.caption, flexShrink: 0 }}>
                                            {listTime(chat.lastMessageAt || chat.updatedAt)}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                                        <span
                                            style={{
                                                ...text.caption,
                                                color: unread > 0 ? t.textPrimary : t.textTertiary,
                                                flex: 1,
                                                minWidth: 0,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {chat.lastMessagePreview || 'Нет сообщений'}
                                        </span>
                                        {unread > 0 ? (
                                            <span
                                                style={{
                                                    ...badge('accent'),
                                                    background: t.accent,
                                                    color: t.textOnAccent,
                                                    padding: '1px 7px',
                                                    minWidth: 20,
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {unread > 99 ? '99+' : unread}
                                            </span>
                                        ) : chat.status === 'closed' ? (
                                            <span style={{ ...badge('neutral'), padding: '1px 7px', flexShrink: 0 }}>
                                                Закрыт
                                            </span>
                                        ) : null}
                                    </div>
                                </div>
                            </button>
                        );
                    })
                )}

                {hasMore && chats.length > 0 && (
                    <div style={{ padding: 12, display: 'flex', justifyContent: 'center' }}>
                        <button
                            type="button"
                            onClick={onLoadMore}
                            disabled={loadingMore}
                            style={{
                                ...button('secondary', 'sm'),
                                cursor: loadingMore ? 'not-allowed' : 'pointer',
                                color: loadingMore ? t.textTertiary : t.textPrimary,
                            }}
                        >
                            {loadingMore ? 'Загрузка…' : `Показать ещё (${Math.max(0, total - chats.length)})`}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
