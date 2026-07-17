import { ORDERS_BASE_URL } from './orders-api';

const CALLBACK_API_BASE =
    process.env.NEXT_PUBLIC_CALLBACK_API_BASE ||
    process.env.NEXT_PUBLIC_PAGES_API_BASE ||
    ORDERS_BASE_URL;

export interface CallbackRequest {
    id: number;
    phone: string;
    phone_display?: string;
    created_at: string;
}

async function parseJson<T>(response: Response): Promise<T> {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data?.message || `Request failed: ${response.status}`);
    }
    return data as T;
}

export async function getCallbackRequests(): Promise<CallbackRequest[]> {
    const response = await fetch(`${CALLBACK_API_BASE}/api/admin/callback-requests`, {
        cache: 'no-store',
    });
    const data = await parseJson<{ data: CallbackRequest[] }>(response);
    return Array.isArray(data.data) ? data.data : [];
}

export async function deleteCallbackRequest(id: number): Promise<void> {
    const response = await fetch(`${CALLBACK_API_BASE}/api/admin/callback-requests/${id}`, {
        method: 'DELETE',
    });
    await parseJson(response);
}

export function formatCallbackPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 11) return phone;
    return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
}

export function formatCallbackDate(value?: string | null): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
