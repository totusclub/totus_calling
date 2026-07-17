import { ORDERS_BASE_URL } from './orders-api';

const API_BASE =
    process.env.NEXT_PUBLIC_CALLBACK_API_BASE ||
    process.env.NEXT_PUBLIC_PAGES_API_BASE ||
    ORDERS_BASE_URL;

export interface FooterSocialLink {
    id: number;
    title: string;
    icon: string;
    url: string;
    sort_order: number;
    is_active: boolean;
}

async function parseJson<T>(response: Response): Promise<T> {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error((data as any)?.message || `Request failed: ${response.status}`);
    }
    return data as T;
}

export async function getFooterSocialLinks(): Promise<FooterSocialLink[]> {
    const response = await fetch(`${API_BASE}/api/admin/footer-social`, { cache: 'no-store' });
    const data = await parseJson<{ data: FooterSocialLink[] }>(response);
    return Array.isArray(data.data) ? data.data : [];
}

export async function getFooterSocialIcons(): Promise<string[]> {
    const response = await fetch(`${API_BASE}/api/admin/footer-social/icons`, { cache: 'no-store' });
    const data = await parseJson<{ data: string[] }>(response);
    return Array.isArray(data.data) ? data.data : [];
}

export async function createFooterSocialLink(input: {
    title: string;
    icon: string;
    url: string;
    sort_order: number;
    is_active: boolean;
}): Promise<FooterSocialLink> {
    const response = await fetch(`${API_BASE}/api/admin/footer-social`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    const data = await parseJson<{ data: FooterSocialLink }>(response);
    return data.data;
}

export async function updateFooterSocialLink(
    id: number,
    input: {
        title: string;
        icon: string;
        url: string;
        sort_order: number;
        is_active: boolean;
    },
): Promise<FooterSocialLink> {
    const response = await fetch(`${API_BASE}/api/admin/footer-social/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    const data = await parseJson<{ data: FooterSocialLink }>(response);
    return data.data;
}

export async function deleteFooterSocialLink(id: number): Promise<void> {
    const response = await fetch(`${API_BASE}/api/admin/footer-social/${id}`, { method: 'DELETE' });
    await parseJson(response);
}
