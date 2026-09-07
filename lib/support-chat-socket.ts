// Отдельный socket.io-клиент для чата поддержки (события support:*).
//
// Не трогает сокет звонков из lib/webrtc-service.ts — тот не экспортируется и
// живёт своей жизнью (registerDevice / offer / answer / …). Здесь — второе
// соединение с тем же namespace voip.totus.club: по agent-JWT сервер сам кладёт
// сокет в комнаты `u:<userId>` и `support:staff`.
//
// auth задан функцией: socket.io вызывает её при каждом (пере)подключении,
// поэтому после refresh access-токена новое соединение уйдёт уже с новым токеном.
// Отправка сообщений — через REST (lib/support-chat-api.ts); сокет — только
// доставка, «печатает…» и отметки о прочтении.
import io, { Socket } from 'socket.io-client';
import { SERVER_BASE_URL } from './server';
import { getAccessToken } from './http';
import type { SupportChat, SupportMessage } from './support-chat-api';

export interface SupportMessageEvent {
    chat: SupportChat;
    message: SupportMessage;
}

export interface SupportChatUpdatedEvent {
    chat: SupportChat;
}

export interface SupportReadEvent {
    chatId: number;
    by: 'user' | 'staff';
    lastMessageId: number | null;
    chat: SupportChat;
}

export interface SupportTypingEvent {
    chatId: number;
    from: 'user' | 'staff';
    typing: boolean;
}

export interface SupportServerEvents {
    'support:message': SupportMessageEvent;
    'support:chat-updated': SupportChatUpdatedEvent;
    'support:read': SupportReadEvent;
    'support:typing': SupportTypingEvent;
    /** Служебные: состояние соединения (payload — connected). */
    'support:connection': boolean;
}

export type SupportServerEventName = keyof SupportServerEvents;

export type SupportClientEventName =
    | 'support:subscribe'
    | 'support:unsubscribe'
    | 'support:typing'
    | 'support:read';

type Handler<E extends SupportServerEventName> = (payload: SupportServerEvents[E]) => void;

let socket: Socket | null = null;
const handlers: { [E in SupportServerEventName]?: Set<Handler<E>> } = {};

function dispatch<E extends SupportServerEventName>(event: E, payload: SupportServerEvents[E]) {
    const set = handlers[event] as Set<Handler<E>> | undefined;
    if (!set) return;
    set.forEach((h) => {
        try {
            h(payload);
        } catch (e) {
            console.error('[support-chat] handler error', event, e);
        }
    });
}

const RELAYED: Exclude<SupportServerEventName, 'support:connection'>[] = [
    'support:message',
    'support:chat-updated',
    'support:read',
    'support:typing',
];

/** Подключить сокет чата (идемпотентно). Без токена ничего не делает. */
export function connectSupportSocket(): Socket | null {
    if (typeof window === 'undefined') return null;
    if (socket) {
        if (!socket.connected) socket.connect();
        return socket;
    }
    if (!getAccessToken()) return null;

    socket = io(SERVER_BASE_URL, {
        transports: ['websocket'],
        // функция — токен читается заново при каждом (пере)подключении
        auth: (cb) => cb({ token: getAccessToken() || undefined }),
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
    });

    socket.on('connect', () => dispatch('support:connection', true));
    socket.on('disconnect', () => dispatch('support:connection', false));
    socket.on('connect_error', (e: Error) => {
        console.warn('[support-chat] connect_error', e?.message);
    });
    RELAYED.forEach((event) => {
        socket?.on(event, (payload: any) => dispatch(event, payload));
    });
    return socket;
}

/** Отключить и забыть сокет (выход из панели). Подписчики остаются. */
export function disconnectSupportSocket(): void {
    if (!socket) return;
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
}

export function isSupportSocketConnected(): boolean {
    return !!socket && socket.connected;
}

/** Подписка на событие сервера; возвращает функцию отписки. */
export function onSupportEvent<E extends SupportServerEventName>(event: E, handler: Handler<E>): () => void {
    let set = handlers[event] as Set<Handler<E>> | undefined;
    if (!set) {
        set = new Set<Handler<E>>();
        (handlers as any)[event] = set;
    }
    set.add(handler);
    return () => {
        set?.delete(handler);
    };
}

/** Отправить событие серверу (с необязательным ack). Без соединения — тихо пропускает. */
export function emitSupport(
    event: SupportClientEventName,
    payload: Record<string, unknown>,
    ack?: (result: any) => void
): boolean {
    if (!socket || !socket.connected) return false;
    if (ack) socket.emit(event, payload, ack);
    else socket.emit(event, payload);
    return true;
}
