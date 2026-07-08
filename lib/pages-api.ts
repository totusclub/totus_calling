import type { FooterSection } from './footer-pages-catalog';

export const PAGES_API_BASE =
    process.env.NEXT_PUBLIC_PAGES_API_BASE || 'https://api.totus.club';

// export const PAGES_API_BASE = 'http://192.168.1.100:4444'

export interface CmsPage {
    id?: number;
    name: string;
    slug: string;
    seo_title?: string;
    seo_desc?: string;
    seo_keywords?: string;
    section?: FooterSection | string;
    breadcrumb_label?: string;
    mobile_header_title?: string;
    content?: string;
    created_at?: string;
    updated_at?: string;
}

export interface SaveCmsPageInput {
    id?: number;
    name: string;
    slug: string;
    seo_title: string;
    seo_desc: string;
    seo_keywords: string;
    section: FooterSection | string;
    breadcrumb_label: string;
    mobile_header_title: string;
    content: string;
}

async function parseJson<T>(response: Response): Promise<T> {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message =
            data?.error ||
            (response.status === 413
                ? 'Image is too large for the server. Try a smaller file.'
                : `Request failed: ${response.status}`);
        throw new Error(message);
    }
    return data as T;
}

async function compressImageForUpload(
    file: File,
    options?: { maxWidth?: number; maxBytes?: number },
): Promise<File> {
    const maxWidth = options?.maxWidth ?? 1920;
    const maxBytes = options?.maxBytes ?? 4 * 1024 * 1024;

    if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') {
        return file;
    }

    if (file.size <= maxBytes && !/(png|webp|bmp)/i.test(file.type)) {
        return file;
    }

    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return file;
    }

    const objectUrl = URL.createObjectURL(file);

    try {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to read image'));
            img.src = objectUrl;
        });

        const scale = Math.min(1, maxWidth / image.width);
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return file;

        ctx.drawImage(image, 0, 0, width, height);

        const toBlob = (type: string, quality?: number) =>
            new Promise<Blob>((resolve, reject) => {
                canvas.toBlob(
                    (blob) => (blob ? resolve(blob) : reject(new Error('Compression failed'))),
                    type,
                    quality,
                );
            });

        let quality = 0.88;
        let blob = await toBlob('image/jpeg', quality);

        while (blob.size > maxBytes && quality > 0.45) {
            quality -= 0.08;
            blob = await toBlob('image/jpeg', quality);
        }

        const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
        return new File([blob], `${baseName}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now(),
        });
    } catch {
        return file;
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

export async function uploadEditorImage(file: File): Promise<string> {
    const prepared = await compressImageForUpload(file);
    const formData = new FormData();
    formData.append('file', prepared);

    const response = await fetch(`${PAGES_API_BASE}/api/content/upload-image`, {
        method: 'POST',
        body: formData,
    });
    const data = await parseJson<{ uploaded?: boolean; url?: string }>(response);
    if (!data.url) {
        throw new Error('Upload failed: no image URL returned');
    }
    return data.url;
}

export async function getAllCmsPages(): Promise<CmsPage[]> {
    const response = await fetch(`${PAGES_API_BASE}/api/admin/pages`, {
        cache: 'no-store',
    });
    const data = await parseJson<CmsPage[]>(response);
    return Array.isArray(data) ? data : [];
}

export async function getCmsPageBySlug(slug: string): Promise<CmsPage | null> {
    const response = await fetch(
        `${PAGES_API_BASE}/api/admin/pages/slug/${encodeURIComponent(slug)}`,
        { cache: 'no-store' },
    );
    if (response.status === 404) return null;
    return parseJson<CmsPage>(response);
}

export async function saveCmsPage(input: SaveCmsPageInput): Promise<CmsPage> {
    const response = await fetch(`${PAGES_API_BASE}/api/admin/pages/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    return parseJson<CmsPage>(response);
}

export function hasPublishedContent(page: CmsPage | null | undefined): boolean {
    return Boolean(page?.content && String(page.content).trim().length > 0);
}
