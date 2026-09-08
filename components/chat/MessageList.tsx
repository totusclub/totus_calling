'use client';

/**
 * Лента сообщений диалога: разделители дат, пузыри пользователя (слева)
 * и поддержки (справа), карточка заказа из meta, индикатор «печатает…».
 */

import { useEffect, useLayoutEffect, useRef } from 'react';
import Icon from '@/components/Icon';
import { orderAdminUrl, type SupportMessage } from '@/lib/support-chat-api';
import { t, radius, text, button } from '@/lib/theme';
import { formatTime, groupByDay } from './utils';

interface MessageListProps {
    messages: SupportMessage[];
    hasMore: boolean;
    loadingMore: boolean;
    typing: boolean;
    userName: string;
    onLoadMore: () => void;
}

function OrderCard({ meta, mine }: { meta: NonNullable<SupportMessage['meta']>; mine: boolean }) {
    if (!meta.orderId) return null;
    return (
        <a
            href={orderAdminUrl(meta.orderId)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 8,
                padding: '10px 12px',
                borderRadius: radius.sm,
                background: mine ? t.accentHover : t.surface,
                border: `1px solid ${mine ? 'transparent' : t.border}`,
                color: mine ? t.textOnAccent : t.textPrimary,
                textDecoration: 'none',
            }}
        >
            <span
                style={{
                    width: 32,
                    height: 32,
                    flexShrink: 0,
                    borderRadius: radius.sm,
                    background: mine ? t.surface : t.accentSoft,
                    color: t.accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Icon name="luggage" size={18} />
            </span>
            <span style={{ minWidth: 0, flex: 1 }}>
                <span
                    style={{
                        display: 'block',
                        fontSize: 13,
                        lineHeight: '18px',
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {meta.orderTitle || `Заказ № ${meta.orderId}`}
                </span>
                <span
                    style={{
                        display: 'block',
                        fontSize: 12,
                        lineHeight: '16px',
                        opacity: 0.8,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {meta.orderSubtitle || `№ ${meta.orderId} · открыть в админке`}
                </span>
            </span>
            <Icon name="linkExternal" size={16} />
        </a>
    );
}

export default function MessageList({
    messages,
    hasMore,
    loadingMore,
    typing,
    userName,
    onLoadMore,
}: MessageListProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const lastIdRef = useRef<number | null>(null);
    const prependRef = useRef<{ height: number; top: number } | null>(null);

    // Перед подгрузкой истории вверх запоминаем высоту, чтобы не «прыгал» скролл
    const handleLoadMore = () => {
        const el = scrollRef.current;
        if (el) prependRef.current = { height: el.scrollHeight, top: el.scrollTop };
        onLoadMore();
    };

    useLayoutEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const lastId = messages.length ? messages[messages.length - 1].id : null;

        if (prependRef.current) {
            el.scrollTop = el.scrollHeight - prependRef.current.height + prependRef.current.top;
            prependRef.current = null;
        } else if (lastId !== lastIdRef.current) {
            // новое сообщение или другой диалог — вниз
            const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
            const firstRender = lastIdRef.current === null;
            if (firstRender || nearBottom || (lastId !== null && lastIdRef.current !== null && lastId > lastIdRef.current)) {
                el.scrollTop = el.scrollHeight;
            }
        }
        lastIdRef.current = lastId;
    }, [messages]);

    useEffect(() => {
        if (!typing) return;
        const el = scrollRef.current;
        if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 160) el.scrollTop = el.scrollHeight;
    }, [typing]);

    const groups = groupByDay(messages);

    return (
        <div
            ref={scrollRef}
            style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                padding: '16px 20px',
                background: t.bg,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
            }}
        >
            {hasMore && (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button
                        type="button"
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        style={{
                            ...button('tertiary', 'sm'),
                            color: loadingMore ? t.textTertiary : t.textSecondary,
                            cursor: loadingMore ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {loadingMore ? 'Загрузка…' : 'Показать более ранние'}
                    </button>
                </div>
            )}

            {messages.length === 0 && !loadingMore && (
                <div style={{ ...text.body, color: t.textTertiary, textAlign: 'center', padding: 24 }}>
                    Сообщений пока нет
                </div>
            )}

            {groups.map((group) => (
                <div key={group.key} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Разделитель даты */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0' }}>
                        <span style={{ flex: 1, height: 1, background: t.border }} />
                        <span style={{ ...text.caption, fontWeight: 600 }}>{group.label}</span>
                        <span style={{ flex: 1, height: 1, background: t.border }} />
                    </div>

                    {group.messages.map((m) => {
                        if (m.senderRole === 'system') {
                            return (
                                <div key={m.id} style={{ ...text.caption, textAlign: 'center', padding: '4px 0' }}>
                                    {m.body}
                                </div>
                            );
                        }
                        const mine = m.senderRole !== 'user';
                        return (
                            <div
                                key={m.id}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: mine ? 'flex-end' : 'flex-start',
                                }}
                            >
                                {mine && (
                                    <span style={{ ...text.caption, marginBottom: 2, paddingRight: 4 }}>
                                        {m.senderName || 'Поддержка Totus'}
                                    </span>
                                )}
                                <div
                                    style={{
                                        maxWidth: '72%',
                                        padding: '10px 14px',
                                        borderRadius: radius.lg,
                                        borderBottomRightRadius: mine ? 4 : radius.lg,
                                        borderBottomLeftRadius: mine ? radius.lg : 4,
                                        background: mine ? t.accent : t.surfaceInset,
                                        color: mine ? t.textOnAccent : t.textPrimary,
                                        border: mine ? '1px solid transparent' : `1px solid ${t.border}`,
                                        fontSize: 14,
                                        lineHeight: '20px',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                    }}
                                >
                                    {m.meta && m.meta.orderId ? <OrderCard meta={m.meta} mine={mine} /> : null}
                                    {m.body}
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'flex-end',
                                            gap: 4,
                                            marginTop: 4,
                                            fontSize: 11,
                                            lineHeight: '14px',
                                            opacity: 0.75,
                                        }}
                                    >
                                        {formatTime(m.createdAt)}
                                        {mine && m.readAt && (
                                            <span title="Прочитано" style={{ display: 'inline-flex' }}>
                                                <Icon name="check" size={12} style={{ marginRight: -7 }} />
                                                <Icon name="check" size={12} />
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ))}

            {typing && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                        style={{
                            padding: '8px 14px',
                            borderRadius: radius.lg,
                            borderBottomLeftRadius: 4,
                            background: t.surfaceInset,
                            border: `1px solid ${t.border}`,
                            ...text.caption,
                            fontStyle: 'italic',
                        }}
                    >
                        {userName} печатает…
                    </div>
                </div>
            )}
        </div>
    );
}
