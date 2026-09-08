// REST чата поддержки (calling_api_v2, lib/supportChat.js) для панели агента.
//
// Все запросы идут через authFetch на SERVER_BASE_URL с agent-JWT (см. lib/http.ts).
// Отправка сообщений — только здесь (REST); сокет (lib/support-chat-socket.ts)
// используется для доставки, «печатает…» и отметок о прочтении.
import { authFetch } from './http';
import { SERVER_BASE_URL } from './server';

export type SupportChatStatus = 'open' | 'pending' | 'closed';
export type SupportChatFilter = SupportChatStatus | 'all';
export type SupportSenderRole = 'user' | 'staff' | 'agent' | 'system';

export interface SupportChatUser {
    id: number;
    name: string | null;
    email: string | null;
    phone: string | null;
    loyaltyId: string | null;
    online: boolean;
}

export interface SupportChat {
    id: number;
    userId: number;
    status: SupportChatStatus;
    assignedId: number | null;
    assignedRole: string | null;
    assignedName: string | null;
    subject: string | null;
    orderId: number | string | null;
    lastMessageId: number | null;
    lastMessageAt: string | null;
    lastMessagePreview: string | null;
    userUnread: number;
    staffUnread: number;
    createdAt: string;
    updatedAt: string;
    user: SupportChatUser | null;
}

export interface SupportMessageMeta {
    orderId?: number | string | null;
    orderTitle?: string | null;
    orderSubtitle?: string | null;
    topic?: string | null;
}

export interface SupportMessage {
    id: number;
    chatId: number;
    senderRole: SupportSenderRole;
    senderId: number | null;
    senderName: string | null;
    body: string;
    meta: SupportMessageMeta | null;
    clientMsgId: string | null;
    readAt: string | null;
    createdAt: string;
}

export interface SupportSummary {
    openCount: number;
    pendingCount: number;
    unreadTotal: number;
    unreadChats: number;
}

export interface SupportChatListResult {
    data: SupportChat[];
    total: number;
    limit: number;
    offset: number;
}

export interface SupportChatDetail {
    chat: SupportChat;
    messages: SupportMessage[];
    hasMore: boolean;
}

export interface SupportMessagesPage {
    messages: SupportMessage[];
    hasMore: boolean;
}

export interface ListChatsParams {
    status?: SupportChatFilter;
    q?: string;
    limit?: number;
    offset?: number;
    assigned?: 'me' | 'none';
}

const BASE = `${SERVER_BASE_URL}/api/support`;

/** Ошибка API чата: code — как в ответе сервера, message — уже по-русски. */
export class SupportChatError extends Error {
    code: string;
    status: number;

    constructor(code: string, status: number) {
        super(supportErrorMessage(code, status));
        this.name = 'SupportChatError';
        this.code = code;
        this.status = status;
    }
}

export function supportErrorMessage(code: string, status?: number): string {
    switch (code) {
        case 'rate_limited':
            return 'Слишком много сообщений, подождите минуту';
        case 'message_too_long':
            return 'Сообщение слишком длинное (до 4000 символов)';
        case 'body_required':
            return 'Введите текст сообщения';
        case 'invalid_status':
            return 'Недопустимый статус диалога';
        case 'chat_not_found':
            return 'Диалог не найден';
        case 'chat_id_required':
            return 'Не указан диалог';
        case 'support_chat_not_migrated':
        case 'network':
            return 'Чат временно недоступен';
        default:
            if (status === 401 || status === 403) return 'Нет доступа. Войдите снова';
            return 'Чат временно недоступен';
    }
}

/** Русский текст для любой ошибки (SupportChatError, сеть, прочее). */
export function describeSupportError(e: unknown): string {
    if (e instanceof SupportChatError) return e.message;
    return supportErrorMessage('network');
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    let resp: Response;
    try {
        resp = await authFetch(`${BASE}${path}`, init);
    } catch {
        throw new SupportChatError('network', 0);
    }
    if (!resp.ok) {
        let code = `http_${resp.status}`;
        try {
            const data = await resp.json();
            if (data && typeof data.error === 'string') code = data.error;
        } catch {
            /* тело не JSON */
        }
        throw new SupportChatError(code, resp.status);
    }
    return (await resp.json()) as T;
}

function post<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? {}),
    });
}

export function getSummary(): Promise<SupportSummary> {
    return request<SupportSummary>('/summary');
}

export function listChats(params: ListChatsParams = {}): Promise<SupportChatListResult> {
    const qs = new URLSearchParams();
    qs.set('status', params.status || 'all');
    if (params.q) qs.set('q', params.q);
    qs.set('limit', String(params.limit ?? 50));
    qs.set('offset', String(params.offset ?? 0));
    if (params.assigned) qs.set('assigned', params.assigned);
    return request<SupportChatListResult>(`/chats?${qs.toString()}`);
}

export function getChat(id: number, limit = 50): Promise<SupportChatDetail> {
    return request<SupportChatDetail>(`/chats/${id}?limit=${limit}`);
}

export function getMessages(
    id: number,
    params: { before?: number | null; limit?: number } = {}
): Promise<SupportMessagesPage> {
    const qs = new URLSearchParams();
    if (params.before) qs.set('before', String(params.before));
    qs.set('limit', String(params.limit ?? 50));
    return request<SupportMessagesPage>(`/chats/${id}/messages?${qs.toString()}`);
}

export function sendMessage(
    id: number,
    body: string,
    clientMsgId?: string
): Promise<{ ok: boolean; chat: SupportChat; message: SupportMessage }> {
    return post(`/chats/${id}/messages`, clientMsgId ? { body, clientMsgId } : { body });
}

export function markRead(id: number, lastMessageId?: number | null): Promise<{ ok: boolean; chat: SupportChat }> {
    return post(`/chats/${id}/read`, lastMessageId ? { lastMessageId } : {});
}

export function assignChat(id: number, unassign = false): Promise<{ ok: boolean; chat: SupportChat }> {
    return post(`/chats/${id}/assign`, unassign ? { unassign: true } : {});
}

export function setChatStatus(id: number, status: SupportChatStatus): Promise<{ ok: boolean; chat: SupportChat }> {
    return post(`/chats/${id}/status`, { status });
}

/* ── Хелперы отображения ───────────────────────────────────────────────── */

export function chatUserName(chat: SupportChat | null | undefined): string {
    const u = chat?.user;
    if (!u) return 'Пользователь';
    return u.name || u.email || u.phone || (u.loyaltyId ? `ID ${u.loyaltyId}` : 'Пользователь');
}

export function chatStatusLabel(status: SupportChatStatus): string {
    switch (status) {
        case 'open':
            return 'Ждёт ответа';
        case 'pending':
            return 'Ждёт пользователя';
        case 'closed':
            return 'Закрыт';
        default:
            return status;
    }
}

export function chatStatusTone(status: SupportChatStatus): 'accent' | 'warning' | 'neutral' {
    if (status === 'open') return 'accent';
    if (status === 'pending') return 'warning';
    return 'neutral';
}

/** Ссылка на заказ в админке из meta сообщения или из диалога. */
export function orderAdminUrl(orderId: number | string): string {
    return `https://admin.totus.club/orders/${encodeURIComponent(String(orderId))}`;
}
