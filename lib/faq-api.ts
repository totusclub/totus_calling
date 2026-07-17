import { ORDERS_BASE_URL } from './orders-api';

const FAQ_API_BASE =
    process.env.NEXT_PUBLIC_CALLBACK_API_BASE ||
    process.env.NEXT_PUBLIC_PAGES_API_BASE ||
    ORDERS_BASE_URL;

export interface FaqItem {
    id: number;
    question: string;
    answer: string;
    c_date?: string;
}

async function parseJson<T>(response: Response): Promise<T> {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error((data as any)?.message || `Request failed: ${response.status}`);
    }
    return data as T;
}

export async function getFaqItems(): Promise<FaqItem[]> {
    const response = await fetch(`${FAQ_API_BASE}/api/admin/faq`, { cache: 'no-store' });
    const data = await parseJson<{ data: FaqItem[] }>(response);
    return Array.isArray(data.data) ? data.data : [];
}

export async function createFaqItem(input: { question: string; answer: string }): Promise<FaqItem> {
    const response = await fetch(`${FAQ_API_BASE}/api/admin/faq`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    const data = await parseJson<{ data: FaqItem }>(response);
    return data.data;
}

export async function updateFaqItem(input: { id: number; question: string; answer: string }): Promise<FaqItem> {
    const response = await fetch(`${FAQ_API_BASE}/api/admin/faq`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    const data = await parseJson<{ data: FaqItem }>(response);
    return data.data;
}

export async function deleteFaqItem(id: number): Promise<void> {
    const response = await fetch(`${FAQ_API_BASE}/api/admin/faq/${id}`, { method: 'DELETE' });
    await parseJson(response);
}
