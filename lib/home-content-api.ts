import { ORDERS_BASE_URL } from './orders-api';

const API_BASE =
    process.env.NEXT_PUBLIC_CALLBACK_API_BASE ||
    process.env.NEXT_PUBLIC_PAGES_API_BASE ||
    ORDERS_BASE_URL;

export interface HomeSections {
    id?: number;
    recommended_title: string;
    destinations_title: string;
}

export interface HomeRecommendedHotel {
    id: number;
    hotel_id: number;
    name: string;
    rate: number;
    city: string;
    price: number;
    review: number;
    image: string;
    sort_order: number;
}

export interface HomePopularDestination {
    id: number;
    name: string;
    image: string;
    to_country: string;
    sort_order: number;
}

async function parseJson<T>(response: Response): Promise<T> {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error((data as any)?.message || `Request failed: ${response.status}`);
    }
    return data as T;
}

export async function getHomeSections(): Promise<HomeSections> {
    const response = await fetch(`${API_BASE}/api/admin/home-sections`, { cache: 'no-store' });
    const data = await parseJson<{ data: HomeSections }>(response);
    return data.data;
}

export async function saveHomeSections(input: {
    recommended_title: string;
    destinations_title: string;
}): Promise<HomeSections> {
    const response = await fetch(`${API_BASE}/api/admin/home-sections`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    const data = await parseJson<{ data: HomeSections }>(response);
    return data.data;
}

export async function getHomeHotels(): Promise<HomeRecommendedHotel[]> {
    const response = await fetch(`${API_BASE}/api/admin/home-hotels`, { cache: 'no-store' });
    const data = await parseJson<{ data: HomeRecommendedHotel[] }>(response);
    return Array.isArray(data.data) ? data.data : [];
}

export async function createHomeHotel(input: {
    hotel_id: number;
    name: string;
    rate: number;
    city: string;
    price: number;
    review: number;
    sort_order: number;
    image?: File | null;
    imageUrl?: string;
}): Promise<HomeRecommendedHotel> {
    const formData = new FormData();
    formData.append('hotel_id', String(input.hotel_id));
    formData.append('name', input.name);
    formData.append('rate', String(input.rate));
    formData.append('city', input.city);
    formData.append('price', String(input.price));
    formData.append('review', String(input.review));
    formData.append('sort_order', String(input.sort_order));
    if (input.image) formData.append('image', input.image);
    else if (input.imageUrl) formData.append('image_url', input.imageUrl);

    const response = await fetch(`${API_BASE}/api/admin/home-hotels`, {
        method: 'POST',
        body: formData,
    });
    const data = await parseJson<{ data: HomeRecommendedHotel }>(response);
    return data.data;
}

export async function updateHomeHotel(
    id: number,
    input: {
        hotel_id: number;
        name: string;
        rate: number;
        city: string;
        price: number;
        review: number;
        sort_order: number;
        image?: File | null;
        imageUrl?: string;
    },
): Promise<HomeRecommendedHotel> {
    const formData = new FormData();
    formData.append('hotel_id', String(input.hotel_id));
    formData.append('name', input.name);
    formData.append('rate', String(input.rate));
    formData.append('city', input.city);
    formData.append('price', String(input.price));
    formData.append('review', String(input.review));
    formData.append('sort_order', String(input.sort_order));
    if (input.image) formData.append('image', input.image);
    else if (input.imageUrl) formData.append('image_url', input.imageUrl);

    const response = await fetch(`${API_BASE}/api/admin/home-hotels/${id}`, {
        method: 'PUT',
        body: formData,
    });
    const data = await parseJson<{ data: HomeRecommendedHotel }>(response);
    return data.data;
}

export async function deleteHomeHotel(id: number): Promise<void> {
    const response = await fetch(`${API_BASE}/api/admin/home-hotels/${id}`, { method: 'DELETE' });
    await parseJson(response);
}

export async function getHomeDestinations(): Promise<HomePopularDestination[]> {
    const response = await fetch(`${API_BASE}/api/admin/home-destinations`, { cache: 'no-store' });
    const data = await parseJson<{ data: HomePopularDestination[] }>(response);
    return Array.isArray(data.data) ? data.data : [];
}

export async function createHomeDestination(input: {
    name: string;
    to_country: string;
    sort_order: number;
    image?: File | null;
    imageUrl?: string;
}): Promise<HomePopularDestination> {
    const formData = new FormData();
    formData.append('name', input.name);
    formData.append('to_country', input.to_country);
    formData.append('sort_order', String(input.sort_order));
    if (input.image) formData.append('image', input.image);
    else if (input.imageUrl) formData.append('image_url', input.imageUrl);

    const response = await fetch(`${API_BASE}/api/admin/home-destinations`, {
        method: 'POST',
        body: formData,
    });
    const data = await parseJson<{ data: HomePopularDestination }>(response);
    return data.data;
}

export async function updateHomeDestination(
    id: number,
    input: {
        name: string;
        to_country: string;
        sort_order: number;
        image?: File | null;
        imageUrl?: string;
    },
): Promise<HomePopularDestination> {
    const formData = new FormData();
    formData.append('name', input.name);
    formData.append('to_country', input.to_country);
    formData.append('sort_order', String(input.sort_order));
    if (input.image) formData.append('image', input.image);
    else if (input.imageUrl) formData.append('image_url', input.imageUrl);

    const response = await fetch(`${API_BASE}/api/admin/home-destinations/${id}`, {
        method: 'PUT',
        body: formData,
    });
    const data = await parseJson<{ data: HomePopularDestination }>(response);
    return data.data;
}

export async function deleteHomeDestination(id: number): Promise<void> {
    const response = await fetch(`${API_BASE}/api/admin/home-destinations/${id}`, {
        method: 'DELETE',
    });
    await parseJson(response);
}
