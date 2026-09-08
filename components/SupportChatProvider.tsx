'use client';

/**
 * Глобальное состояние чата поддержки для панели агента:
 * счётчик непрочитанного (бейдж в навигации, заголовок вкладки),
 * подключение сокета после входа, звук и системное уведомление
 * о новом сообщении пользователя, когда вкладка не активна.
 *
 * Без сохранённого агента (страница входа) провайдер ничего не делает.
 */

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { getStoredUser } from '@/lib/auth-api';
import { getSummary, chatUserName, type SupportSummary } from '@/lib/support-chat-api';
import {
    connectSupportSocket,
    disconnectSupportSocket,
    isSupportSocketConnected,
    onSupportEvent,
} from '@/lib/support-chat-socket';

const APP_TITLE = 'Totus Web Calling';
const SUMMARY_POLL_MS = 30_000;
const NOTIFY_THROTTLE_MS = 4_000;

interface SupportChatContextValue {
    summary: SupportSummary | null;
    unreadTotal: number;
    connected: boolean;
    /** Перечитать summary с сервера (после markRead и т. п.). */
    refreshSummary: () => Promise<void>;
    /** Локально подправить unreadTotal, не дожидаясь сервера. */
    adjustUnread: (delta: number) => void;
}

const SupportChatContext = createContext<SupportChatContextValue>({
    summary: null,
    unreadTotal: 0,
    connected: false,
    refreshSummary: async () => {},
    adjustUnread: () => {},
});

export function useSupportChat(): SupportChatContextValue {
    return useContext(SupportChatContext);
}

/** Короткий сигнал через WebAudio — без внешних файлов. */
function playPing() {
    try {
        const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
        osc.onended = () => {
            ctx.close().catch(() => {});
        };
    } catch {
        /* автоплей запрещён или нет WebAudio — молча */
    }
}

export default function SupportChatProvider({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const [summary, setSummary] = useState<SupportSummary | null>(null);
    const [unreadTotal, setUnreadTotal] = useState(0);
    const [connected, setConnected] = useState(false);
    const lastNotifyRef = useRef(0);

    const isLoggedIn = pathname !== '/login' && typeof window !== 'undefined' && !!getStoredUser();

    const refreshSummary = useCallback(async () => {
        if (!getStoredUser()) return;
        try {
            const s = await getSummary();
            setSummary(s);
            setUnreadTotal(s.unreadTotal || 0);
        } catch {
            /* 503 до миграции / сеть — оставляем прежнее значение */
        }
    }, []);

    const adjustUnread = useCallback((delta: number) => {
        setUnreadTotal((n) => Math.max(0, n + delta));
    }, []);

    // Сокет + первичный summary + поллинг-фолбэк
    useEffect(() => {
        if (!isLoggedIn) {
            disconnectSupportSocket();
            setConnected(false);
            return;
        }

        connectSupportSocket();
        setConnected(isSupportSocketConnected());
        refreshSummary();

        if ('Notification' in window && Notification.permission === 'default') {
            try {
                const p: unknown = Notification.requestPermission();
                if (p instanceof Promise) p.catch(() => {});
            } catch {
                /* старые браузеры */
            }
        }

        const offConn = onSupportEvent('support:connection', (ok) => {
            setConnected(ok);
            if (ok) refreshSummary();
        });

        const offMessage = onSupportEvent('support:message', ({ chat, message }) => {
            if (message.senderRole !== 'user') return;
            // Список/диалог сами обновятся через свои подписки; тут — счётчик и уведомление.
            refreshSummary();

            const hidden = document.visibilityState === 'hidden' || !document.hasFocus();
            const now = Date.now();
            if (!hidden || now - lastNotifyRef.current < NOTIFY_THROTTLE_MS) return;
            lastNotifyRef.current = now;

            playPing();
            if ('Notification' in window && Notification.permission === 'granted') {
                try {
                    const n = new Notification(chatUserName(chat), {
                        body: message.body.length > 120 ? `${message.body.slice(0, 120)}…` : message.body,
                        tag: `support-chat-${chat.id}`,
                    });
                    n.onclick = () => {
                        window.focus();
                        window.location.href = `/chat?chat=${chat.id}`;
                        n.close();
                    };
                } catch {
                    /* Notification недоступен (например, iOS Safari) */
                }
            }
        });

        const offUpdated = onSupportEvent('support:chat-updated', () => refreshSummary());
        const offRead = onSupportEvent('support:read', ({ by }) => {
            if (by === 'staff') refreshSummary();
        });

        const timer = setInterval(refreshSummary, SUMMARY_POLL_MS);
        const onVisible = () => {
            if (document.visibilityState === 'visible') refreshSummary();
        };
        document.addEventListener('visibilitychange', onVisible);

        return () => {
            offConn();
            offMessage();
            offUpdated();
            offRead();
            clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [isLoggedIn, refreshSummary]);

    // Заголовок вкладки «(N) Totus Web Calling»
    useEffect(() => {
        if (typeof document === 'undefined') return;
        document.title = unreadTotal > 0 ? `(${unreadTotal}) ${APP_TITLE}` : APP_TITLE;
    }, [unreadTotal]);

    const value = useMemo<SupportChatContextValue>(
        () => ({ summary, unreadTotal, connected, refreshSummary, adjustUnread }),
        [summary, unreadTotal, connected, refreshSummary, adjustUnread]
    );

    return <SupportChatContext.Provider value={value}>{children}</SupportChatContext.Provider>;
}
