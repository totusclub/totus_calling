import { ORDERS_BASE_URL } from './orders-api';

const BANNERS_API_BASE =
    process.env.NEXT_PUBLIC_CALLBACK_API_BASE ||
    process.env.NEXT_PUBLIC_PAGES_API_BASE ||
    ORDERS_BASE_URL;

export interface HomeBanner {
    id?: number;
    position: number;
    image: string;
    url: string;
    updated_at?: string;
}

async function parseJson<T>(response: Response): Promise<T> {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error((data as any)?.message || `Request failed: ${response.status}`);
    }
    return data as T;
}

export async function getHomeBanners(): Promise<HomeBanner[]> {
    const response = await fetch(`${BANNERS_API_BASE}/api/admin/home-banners`, { cache: 'no-store' });
    const data = await parseJson<{ data: HomeBanner[] }>(response);
    return Array.isArray(data.data) ? data.data : [];
}

export async function saveHomeBanner(
    position: number,
    input: { url: string; image?: File | null },
): Promise<HomeBanner> {
    const formData = new FormData();
    formData.append('url', input.url ?? '');
    if (input.image) {
        formData.append('image', input.image);
    }

    const response = await fetch(`${BANNERS_API_BASE}/api/admin/home-banners/${position}`, {
        method: 'PUT',
        body: formData,
    });
    const data = await parseJson<{ data: HomeBanner }>(response);
    return data.data;
}

export interface HomeHero {
    id?: number;
    title: string;
    image: string;
    updated_at?: string;
}

export async function getHomeHero(): Promise<HomeHero> {
    const response = await fetch(`${BANNERS_API_BASE}/api/admin/home-hero`, { cache: 'no-store' });
    const data = await parseJson<{ data: HomeHero }>(response);
    return data.data;
}

export async function saveHomeHero(input: {
    title: string;
    image?: File | null;
}): Promise<HomeHero> {
    const formData = new FormData();
    formData.append('title', input.title);
    if (input.image) {
        formData.append('image', input.image);
    }

    const response = await fetch(`${BANNERS_API_BASE}/api/admin/home-hero`, {
        method: 'PUT',
        body: formData,
    });
    const data = await parseJson<{ data: HomeHero }>(response);
    return data.data;
}
