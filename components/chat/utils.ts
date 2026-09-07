// Хелперы дат/времени для чата поддержки (панель агента).

import type { SupportMessage } from '@/lib/support-chat-api';

const MONTHS = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

function startOfDay(d: Date): number {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function parseDate(value: string | null | undefined): Date | null {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
}

/** «14:05» */
export function formatTime(value: string | null | undefined): string {
    const d = parseDate(value);
    if (!d) return '';
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Разделитель в ленте: «Сегодня» / «Вчера» / «7 сентября» / «7 сентября 2025». */
export function dayLabel(value: string | null | undefined): string {
    const d = parseDate(value);
    if (!d) return '';
    const now = new Date();
    const day = startOfDay(d);
    const today = startOfDay(now);
    const diffDays = Math.round((today - day) / 86_400_000);
    if (diffDays === 0) return 'Сегодня';
    if (diffDays === 1) return 'Вчера';
    const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
    return d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

/** Время в списке диалогов: сегодня — «14:05», вчера — «Вчера», иначе — «07.09». */
export function listTime(value: string | null | undefined): string {
    const d = parseDate(value);
    if (!d) return '';
    const now = new Date();
    const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
    if (diffDays === 0) return formatTime(value);
    if (diffDays === 1) return 'Вчера';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return d.getFullYear() === now.getFullYear() ? `${dd}.${mm}` : `${dd}.${mm}.${String(d.getFullYear()).slice(2)}`;
}

export type MessageGroup = { key: string; label: string; messages: SupportMessage[] };

/** Группировка сообщений по дням (вход — от старых к новым). */
export function groupByDay(messages: SupportMessage[]): MessageGroup[] {
    const groups: MessageGroup[] = [];
    for (const m of messages) {
        const d = parseDate(m.createdAt);
        const key = d ? String(startOfDay(d)) : 'unknown';
        const last = groups[groups.length - 1];
        if (last && last.key === key) {
            last.messages.push(m);
        } else {
            groups.push({ key, label: dayLabel(m.createdAt), messages: [m] });
        }
    }
    return groups;
}

/** Первая буква имени для аватара. */
export function initialOf(name: string | null | undefined): string {
    const s = (name || '').trim();
    return s ? s.charAt(0).toUpperCase() : '?';
}

/** Слить пришедшие сообщения с имеющимися без дублей, отсортировать по id. */
export function mergeMessages(existing: SupportMessage[], incoming: SupportMessage[]): SupportMessage[] {
    if (incoming.length === 0) return existing;
    const map = new Map<number, SupportMessage>();
    for (const m of existing) map.set(m.id, m);
    for (const m of incoming) map.set(m.id, m);
    return Array.from(map.values()).sort((a, b) => a.id - b.id);
}
