import { ORDERS_BASE_URL } from './orders-api';

const PARTNERS_API_BASE =
    process.env.NEXT_PUBLIC_CALLBACK_API_BASE ||
    process.env.NEXT_PUBLIC_PAGES_API_BASE ||
    ORDERS_BASE_URL;

export interface HomePartner {
    id: number;
    name: string;
    image: string;
    url: string;
    sort_order: number;
    created_at?: string;
    updated_at?: string;
}

async function parseJson<T>(response: Response): Promise<T> {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error((data as any)?.message || `Request failed: ${response.status}`);
    }
    return data as T;
}

export async function getHomePartners(): Promise<HomePartner[]> {
    const response = await fetch(`${PARTNERS_API_BASE}/api/admin/home-partners`, { cache: 'no-store' });
    const data = await parseJson<{ data: HomePartner[] }>(response);
    return Array.isArray(data.data) ? data.data : [];
}

export async function createHomePartner(input: {
    name: string;
    url: string;
    sort_order: number;
    image: File;
}): Promise<HomePartner> {
    const formData = new FormData();
    formData.append('name', input.name);
    formData.append('url', input.url);
    formData.append('sort_order', String(input.sort_order));
    formData.append('image', input.image);

    const response = await fetch(`${PARTNERS_API_BASE}/api/admin/home-partners`, {
        method: 'POST',
        body: formData,
    });
    const data = await parseJson<{ data: HomePartner }>(response);
    return data.data;
}

export async function updateHomePartner(
    id: number,
    input: { name: string; url: string; sort_order: number; image?: File | null },
): Promise<HomePartner> {
    const formData = new FormData();
    formData.append('name', input.name);
    formData.append('url', input.url);
    formData.append('sort_order', String(input.sort_order));
    if (input.image) {
        formData.append('image', input.image);
    }

    const response = await fetch(`${PARTNERS_API_BASE}/api/admin/home-partners/${id}`, {
        method: 'PUT',
        body: formData,
    });
    const data = await parseJson<{ data: HomePartner }>(response);
    return data.data;
}

export async function deleteHomePartner(id: number): Promise<void> {
    const response = await fetch(`${PARTNERS_API_BASE}/api/admin/home-partners/${id}`, {
        method: 'DELETE',
    });
    await parseJson(response);
}
