'use client';

/**
 * Правая панель чата поддержки: шапка диалога (контакты, статус, действия),
 * лента сообщений и поле ответа.
 */

import Icon from '@/components/Icon';
import {
    chatStatusLabel,
    chatStatusTone,
    chatUserName,
    orderAdminUrl,
    type SupportChat,
    type SupportMessage,
} from '@/lib/support-chat-api';
import { t, radius, text, button, badge } from '@/lib/theme';
import Composer from './Composer';
import MessageList from './MessageList';
import { initialOf } from './utils';

interface ChatPaneProps {
    chat: SupportChat;
    messages: SupportMessage[];
    hasMore: boolean;
    loadingMore: boolean;
    typing: boolean;
    sending: boolean;
    sendError: string | null;
    actionError: string | null;
    actionBusy: boolean;
    /** id и роль текущего агента — чтобы отличать «мой» диалог. */
    myId: number | null;
    onLoadMore: () => void;
    onSend: (body: string) => Promise<boolean>;
    onTyping: (typing: boolean) => void;
    onCall: () => void;
    onAssign: (unassign: boolean) => void;
    onStatus: (status: 'open' | 'closed') => void;
}

export default function ChatPane({
    chat,
    messages,
    hasMore,
    loadingMore,
    typing,
    sending,
    sendError,
    actionError,
    actionBusy,
    myId,
    onLoadMore,
    onSend,
    onTyping,
    onCall,
    onAssign,
    onStatus,
}: ChatPaneProps) {
    const name = chatUserName(chat);
    const user = chat.user;
    const isMine = myId !== null && chat.assignedId === myId && chat.assignedRole === 'agent';
    const canCall = !!user?.loyaltyId;
    const closed = chat.status === 'closed';

    const contacts: string[] = [];
    if (user?.phone) contacts.push(user.phone);
    if (user?.email) contacts.push(user.email);
    if (user?.loyaltyId) contacts.push(`ID ${user.loyaltyId}`);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
            {/* Шапка диалога */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    flexWrap: 'wrap',
                    padding: '14px 20px',
                    borderBottom: `1px solid ${t.border}`,
                    background: t.surface,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div
                            style={{
                                width: 44,
                                height: 44,
                                borderRadius: radius.pill,
                                background: t.accentSoft,
                                color: t.accent,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 18,
                                fontWeight: 600,
                            }}
                        >
                            {initialOf(name)}
                        </div>
                        {user?.online && (
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
                    <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span
                                style={{
                                    ...text.cardTitle,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {name}
                            </span>
                            <span style={badge(chatStatusTone(chat.status))}>{chatStatusLabel(chat.status)}</span>
                            {user?.online ? (
                                <span style={badge('success')}>Онлайн</span>
                            ) : (
                                <span style={badge('neutral')}>Офлайн</span>
                            )}
                        </div>
                        <div
                            style={{
                                ...text.caption,
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 8,
                                alignItems: 'center',
                                marginTop: 2,
                            }}
                        >
                            {contacts.map((c, i) => (
                                <span key={c} style={{ display: 'inline-flex', gap: 8 }}>
                                    {i > 0 && <span>•</span>}
                                    <span>{c}</span>
                                </span>
                            ))}
                            {chat.orderId && (
                                <span style={{ display: 'inline-flex', gap: 8 }}>
                                    {contacts.length > 0 && <span>•</span>}
                                    <a
                                        href={orderAdminUrl(chat.orderId)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: t.accent, textDecoration: 'none' }}
                                    >
                                        Заказ № {chat.orderId}
                                    </a>
                                </span>
                            )}
                            {chat.assignedName && (
                                <span style={{ display: 'inline-flex', gap: 8 }}>
                                    {(contacts.length > 0 || chat.orderId) && <span>•</span>}
                                    <span>{isMine ? 'Ваш диалог' : `Ведёт: ${chat.assignedName}`}</span>
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        onClick={onCall}
                        disabled={!canCall}
                        title={canCall ? 'Позвонить пользователю' : 'У пользователя нет loyaltyId'}
                        style={{
                            ...button('primary', 'sm'),
                            padding: '8px 14px',
                            ...(canCall ? null : { background: t.surfaceInset, color: t.textDisabled, cursor: 'not-allowed' }),
                        }}
                    >
                        <Icon name="phone" size={16} />
                        Позвонить
                    </button>
                    <button
                        type="button"
                        onClick={() => onAssign(isMine)}
                        disabled={actionBusy}
                        style={{ ...button('secondary', 'sm'), padding: '8px 14px' }}
                    >
                        <Icon name="user" size={16} />
                        {isMine ? 'Снять' : 'Взять себе'}
                    </button>
                    <button
                        type="button"
                        onClick={() => onStatus(closed ? 'open' : 'closed')}
                        disabled={actionBusy}
                        style={{ ...button(closed ? 'secondary' : 'danger', 'sm'), padding: '8px 14px' }}
                    >
                        <Icon name={closed ? 'refresh' : 'close'} size={16} />
                        {closed ? 'Открыть заново' : 'Закрыть'}
                    </button>
                </div>

                {actionError && (
                    <div style={{ ...text.caption, color: t.error, width: '100%' }}>{actionError}</div>
                )}
            </div>

            {/* Лента: key по id диалога — сброс скролла при смене */}
            <MessageList
                key={chat.id}
                messages={messages}
                hasMore={hasMore}
                loadingMore={loadingMore}
                typing={typing}
                userName={name}
                onLoadMore={onLoadMore}
            />

            {closed && (
                <div
                    style={{
                        ...text.caption,
                        padding: '8px 20px',
                        background: t.surfaceInset,
                        borderTop: `1px solid ${t.border}`,
                    }}
                >
                    Диалог закрыт. Ваш ответ переведёт его в «Ждёт пользователя», новое сообщение пользователя откроет заново.
                </div>
            )}

            <Composer sending={sending} error={sendError} onSend={onSend} onTyping={onTyping} />
        </div>
    );
}
