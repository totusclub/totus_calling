'use client';

/**
 * Раздел «Чат поддержки» панели агента: список диалогов слева, диалог справа.
 *
 * Данные — REST lib/support-chat-api.ts; реалтайм — lib/support-chat-socket.ts
 * (второй сокет, не связанный с сокетом звонков). Фолбэк без сокета —
 * поллинг списка каждые 30 с и открытого диалога каждые 10 с.
 * Выбранный диалог хранится в query `?chat=<id>`.
 */

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import Icon from '@/components/Icon';
import { useSupportChat } from '@/components/SupportChatProvider';
import DialogList, { type DialogFilter } from '@/components/chat/DialogList';
import ChatPane from '@/components/chat/ChatPane';
import { mergeMessages } from '@/components/chat/utils';
import { getStoredUser } from '@/lib/auth-api';
import {
    assignChat,
    chatUserName,
    describeSupportError,
    getChat,
    getMessages,
    listChats,
    markRead,
    sendMessage,
    setChatStatus,
    type SupportChat,
    type SupportMessage,
} from '@/lib/support-chat-api';
import { emitSupport, onSupportEvent } from '@/lib/support-chat-socket';
import { initWebRTCWithLoyaltyId, startOutgoingVoiceCallByLoyaltyId } from '@/lib/webrtc-service';
import { t, text, layout, cardStyle } from '@/lib/theme';

const PAGE_SIZE = 50;
const LIST_POLL_MS = 30_000;
const CHAT_POLL_MS = 10_000;
const TYPING_TTL_MS = 6_000;

function makeClientMsgId(): string {
    return `agent-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function ChatPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { refreshSummary } = useSupportChat();

    const selectedId = useMemo(() => {
        const raw = searchParams.get('chat');
        const n = raw ? Number(raw) : NaN;
        return Number.isFinite(n) && n > 0 ? n : null;
    }, [searchParams]);

    const me = useMemo(() => (typeof window !== 'undefined' ? getStoredUser() : null), []);
    const myId = me?.id ?? null;

    /* ── Список диалогов ──────────────────────────────────────────────────── */
    const [filter, setFilter] = useState<DialogFilter>('all');
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [chats, setChats] = useState<SupportChat[]>([]);
    const [total, setTotal] = useState(0);
    const [listLoading, setListLoading] = useState(true);
    const [listError, setListError] = useState<string | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const listReqRef = useRef(0);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
        return () => clearTimeout(timer);
    }, [query]);

    const listParams = useCallback(
        (offset: number) => ({
            status: filter === 'mine' ? ('all' as const) : filter,
            assigned: filter === 'mine' ? ('me' as const) : undefined,
            q: debouncedQuery || undefined,
            limit: PAGE_SIZE,
            offset,
        }),
        [filter, debouncedQuery]
    );

    const loadList = useCallback(
        async (silent = false) => {
            const reqId = ++listReqRef.current;
            if (!silent) setListLoading(true);
            try {
                const res = await listChats(listParams(0));
                if (reqId !== listReqRef.current) return;
                setChats((prev) => {
                    // при тихом обновлении сохраняем уже подгруженные страницы ниже первой
                    if (!silent || prev.length <= res.data.length) return res.data;
                    const ids = new Set(res.data.map((c) => c.id));
                    return [...res.data, ...prev.slice(res.data.length).filter((c) => !ids.has(c.id))];
                });
                setTotal(res.total);
                setListError(null);
            } catch (e) {
                if (reqId !== listReqRef.current) return;
                setListError(describeSupportError(e));
            } finally {
                if (reqId === listReqRef.current) setListLoading(false);
            }
        },
        [listParams]
    );

    useEffect(() => {
        loadList();
        const timer = setInterval(() => loadList(true), LIST_POLL_MS);
        return () => clearInterval(timer);
    }, [loadList]);

    const loadMore = async () => {
        if (loadingMore) return;
        setLoadingMore(true);
        try {
            const res = await listChats(listParams(chats.length));
            setChats((prev) => {
                const ids = new Set(prev.map((c) => c.id));
                return [...prev, ...res.data.filter((c) => !ids.has(c.id))];
            });
            setTotal(res.total);
        } catch (e) {
            setListError(describeSupportError(e));
        } finally {
            setLoadingMore(false);
        }
    };

    /** Обновить/добавить диалог в списке (наверх при новом сообщении). */
    const upsertChat = useCallback((chat: SupportChat, toTop = false) => {
        setChats((prev) => {
            const idx = prev.findIndex((c) => c.id === chat.id);
            if (idx === -1) return toTop ? [chat, ...prev] : prev;
            const merged = { ...prev[idx], ...chat, user: chat.user || prev[idx].user };
            if (!toTop) {
                const next = prev.slice();
                next[idx] = merged;
                return next;
            }
            return [merged, ...prev.slice(0, idx), ...prev.slice(idx + 1)];
        });
    }, []);

    /* ── Открытый диалог ──────────────────────────────────────────────────── */
    const [chat, setChat] = useState<SupportChat | null>(null);
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const [chatLoading, setChatLoading] = useState(false);
    const [chatError, setChatError] = useState<string | null>(null);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [typing, setTyping] = useState(false);
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [actionBusy, setActionBusy] = useState(false);
    const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const chatReqRef = useRef(0);

    const applyRead = useCallback(
        async (id: number, lastMessageId?: number | null) => {
            try {
                const res = await markRead(id, lastMessageId);
                emitSupport('support:read', { chatId: id, lastMessageId: lastMessageId || undefined });
                if (res?.chat) upsertChat({ ...res.chat, staffUnread: 0 });
                else setChats((prev) => prev.map((c) => (c.id === id ? { ...c, staffUnread: 0 } : c)));
                refreshSummary();
            } catch {
                /* прочтение — не критично */
            }
        },
        [upsertChat, refreshSummary]
    );

    const loadChat = useCallback(
        async (id: number, silent = false) => {
            const reqId = ++chatReqRef.current;
            if (!silent) {
                setChatLoading(true);
                setChatError(null);
            }
            try {
                const res = await getChat(id, PAGE_SIZE);
                if (reqId !== chatReqRef.current) return;
                setChat(res.chat);
                setMessages((prev) => (silent ? mergeMessages(prev, res.messages) : res.messages));
                if (!silent) setHasMore(res.hasMore);
                upsertChat(res.chat);
                if (res.chat.staffUnread > 0 || !silent) {
                    const last = res.messages.length ? res.messages[res.messages.length - 1].id : res.chat.lastMessageId;
                    applyRead(id, last);
                }
            } catch (e) {
                if (reqId !== chatReqRef.current) return;
                if (!silent) setChatError(describeSupportError(e));
            } finally {
                if (reqId === chatReqRef.current && !silent) setChatLoading(false);
            }
        },
        [upsertChat, applyRead]
    );

    // Открытие диалога: загрузка, подписка на typing, поллинг; при уходе — отписка
    useEffect(() => {
        if (!selectedId) {
            setChat(null);
            setMessages([]);
            setHasMore(false);
            setTyping(false);
            setSendError(null);
            setActionError(null);
            return;
        }
        setMessages([]);
        setTyping(false);
        setSendError(null);
        setActionError(null);
        loadChat(selectedId);
        emitSupport('support:subscribe', { chatId: selectedId });
        const timer = setInterval(() => loadChat(selectedId, true), CHAT_POLL_MS);
        return () => {
            clearInterval(timer);
            emitSupport('support:unsubscribe', { chatId: selectedId });
        };
    }, [selectedId, loadChat]);

    // Переподключение сокета — заново подписаться на открытый диалог
    useEffect(() => {
        return onSupportEvent('support:connection', (ok) => {
            if (ok && selectedId) {
                emitSupport('support:subscribe', { chatId: selectedId });
                loadChat(selectedId, true);
            }
        });
    }, [selectedId, loadChat]);

    /* ── Реалтайм ──────────────────────────────────────────────────────────── */
    useEffect(() => {
        const offMessage = onSupportEvent('support:message', ({ chat: c, message }) => {
            const isOpen = c.id === selectedId;
            if (isOpen) {
                setMessages((prev) => mergeMessages(prev, [message]));
                setChat((prev) => ({ ...(prev || c), ...c, user: c.user || prev?.user || null }));
                if (message.senderRole === 'user') {
                    setTyping(false);
                    // мы смотрим диалог — сразу отмечаем прочитанным
                    applyRead(c.id, message.id);
                    upsertChat({ ...c, staffUnread: 0 }, true);
                    return;
                }
            }
            upsertChat(c, true);
        });

        const offUpdated = onSupportEvent('support:chat-updated', ({ chat: c }) => {
            upsertChat(c);
            if (c.id === selectedId) setChat((prev) => ({ ...(prev || c), ...c, user: c.user || prev?.user || null }));
        });

        const offRead = onSupportEvent('support:read', ({ chatId, by, lastMessageId, chat: c }) => {
            if (c) upsertChat(c);
            if (chatId !== selectedId) return;
            if (c) setChat((prev) => ({ ...(prev || c), ...c, user: c.user || prev?.user || null }));
            if (by === 'user') {
                const now = new Date().toISOString();
                setMessages((prev) =>
                    prev.map((m) =>
                        m.senderRole !== 'user' && !m.readAt && (!lastMessageId || m.id <= lastMessageId)
                            ? { ...m, readAt: now }
                            : m
                    )
                );
            }
        });

        const offTyping = onSupportEvent('support:typing', ({ chatId, from, typing: on }) => {
            if (from !== 'user' || chatId !== selectedId) return;
            setTyping(on);
            if (typingTimer.current) clearTimeout(typingTimer.current);
            if (on) typingTimer.current = setTimeout(() => setTyping(false), TYPING_TTL_MS);
        });

        return () => {
            offMessage();
            offUpdated();
            offRead();
            offTyping();
            if (typingTimer.current) clearTimeout(typingTimer.current);
        };
    }, [selectedId, upsertChat, applyRead]);

    /* ── Действия ──────────────────────────────────────────────────────────── */
    const selectChat = (c: SupportChat) => {
        if (c.id === selectedId) return;
        router.replace(`/chat?chat=${c.id}`);
    };

    const loadHistory = async () => {
        if (!selectedId || loadingHistory || messages.length === 0) return;
        setLoadingHistory(true);
        try {
            const res = await getMessages(selectedId, { before: messages[0].id, limit: PAGE_SIZE });
            setMessages((prev) => mergeMessages(prev, res.messages));
            setHasMore(res.hasMore);
        } catch (e) {
            setChatError(describeSupportError(e));
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleSend = async (body: string): Promise<boolean> => {
        if (!selectedId) return false;
        setSending(true);
        setSendError(null);
        try {
            const res = await sendMessage(selectedId, body, makeClientMsgId());
            setMessages((prev) => mergeMessages(prev, [res.message]));
            setChat((prev) => ({ ...(prev || res.chat), ...res.chat, user: res.chat.user || prev?.user || null }));
            upsertChat(res.chat, true);
            return true;
        } catch (e) {
            setSendError(describeSupportError(e));
            return false;
        } finally {
            setSending(false);
        }
    };

    const handleTyping = (on: boolean) => {
        if (selectedId) emitSupport('support:typing', { chatId: selectedId, typing: on });
    };

    const runAction = async (fn: () => Promise<{ ok: boolean; chat: SupportChat }>) => {
        setActionBusy(true);
        setActionError(null);
        try {
            const res = await fn();
            setChat((prev) => ({ ...(prev || res.chat), ...res.chat, user: res.chat.user || prev?.user || null }));
            upsertChat(res.chat);
            refreshSummary();
        } catch (e) {
            setActionError(describeSupportError(e));
        } finally {
            setActionBusy(false);
        }
    };

    const handleAssign = (unassign: boolean) => {
        if (!selectedId) return;
        runAction(() => assignChat(selectedId, unassign));
    };

    const handleStatus = (status: 'open' | 'closed') => {
        if (!selectedId) return;
        runAction(() => setChatStatus(selectedId, status));
    };

    // Звонок: WebRTC-сервис — общий модуль, инициализация идемпотентна; карточку
    // звонка показывает главная страница, поэтому после старта переходим на неё.
    const handleCall = () => {
        const loyaltyId = chat?.user?.loyaltyId;
        if (!chat || !loyaltyId) return;
        const myLoyaltyId = me?.loyaltyId || (me as any)?.loyalty_id;
        if (!myLoyaltyId) {
            alert('Ошибка: loyalty_id не установлен. Пожалуйста, войдите снова.');
            return;
        }
        if (loyaltyId === myLoyaltyId) {
            alert('Вы не можете позвонить себе');
            return;
        }
        try {
            initWebRTCWithLoyaltyId(myLoyaltyId);
        } catch (e) {
            alert('Ошибка инициализации WebRTC: ' + (e instanceof Error ? e.message : String(e)));
            return;
        }
        const name = chatUserName(chat);
        // Не ждём ответа: промис живёт до ответа/сброса, состояние читает главная
        startOutgoingVoiceCallByLoyaltyId(loyaltyId, name).catch((e: any) => {
            console.error('Failed to start call from chat', e);
        });
        // Небольшая задержка — чтобы initWebRTC успел зарегистрировать устройство
        setTimeout(() => router.push('/'), 300);
    };

    /* ── Рендер ────────────────────────────────────────────────────────────── */
    return (
        <div
            style={{
                minHeight: '100vh',
                background: t.bg,
                padding: '32px 32px 32px',
                display: 'flex',
                justifyContent: 'center',
            }}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: layout.contentMax,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 24,
                }}
            >
                <AppHeader subtitle="Чат поддержки: диалоги пользователей сайта и приложения" />

                <div
                    style={{
                        ...cardStyle,
                        padding: 0,
                        overflow: 'hidden',
                        display: 'grid',
                        gridTemplateColumns: 'minmax(280px, 360px) minmax(0, 1fr)',
                        height: 'calc(100vh - 200px)',
                        minHeight: 520,
                    }}
                >
                    <div style={{ borderRight: `1px solid ${t.border}`, minHeight: 0, minWidth: 0 }}>
                        <DialogList
                            chats={chats}
                            total={total}
                            loading={listLoading}
                            error={listError}
                            selectedId={selectedId}
                            filter={filter}
                            query={query}
                            hasMore={chats.length < total}
                            loadingMore={loadingMore}
                            onFilterChange={setFilter}
                            onQueryChange={setQuery}
                            onSelect={selectChat}
                            onLoadMore={loadMore}
                        />
                    </div>

                    <div style={{ minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                        {!selectedId ? (
                            <EmptyPane text="Выберите диалог" hint="Список слева: непрочитанные — первыми" />
                        ) : chatError && !chat ? (
                            <EmptyPane text={chatError} />
                        ) : !chat ? (
                            <EmptyPane text={chatLoading ? 'Загрузка диалога…' : 'Диалог не найден'} />
                        ) : (
                            <ChatPane
                                chat={chat}
                                messages={messages}
                                hasMore={hasMore}
                                loadingMore={loadingHistory}
                                typing={typing}
                                sending={sending}
                                sendError={sendError}
                                actionError={actionError || chatError}
                                actionBusy={actionBusy}
                                myId={myId}
                                onLoadMore={loadHistory}
                                onSend={handleSend}
                                onTyping={handleTyping}
                                onCall={handleCall}
                                onAssign={handleAssign}
                                onStatus={handleStatus}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function EmptyPane({ text: title, hint }: { text: string; hint?: string }) {
    return (
        <div
            style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: 32,
                color: t.textTertiary,
                textAlign: 'center',
            }}
        >
            <Icon name="chat" size={40} />
            <div style={{ ...text.cardTitle, color: t.textSecondary }}>{title}</div>
            {hint && <div style={text.caption}>{hint}</div>}
        </div>
    );
}

export default function ChatPage() {
    // useSearchParams требует Suspense-границу при статической сборке Next 14
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', background: t.bg }} />}>
            <ChatPageInner />
        </Suspense>
    );
}
