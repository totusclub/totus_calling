'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageShell from '@/components/PageShell';
import AdminNav from '@/components/AdminNav';
import {
    FOOTER_PAGE_CATALOG,
    PUBLIC_SITE_URL,
    SECTION_LABELS,
} from '@/lib/footer-pages-catalog';
import { getAllCmsPages, hasPublishedContent, type CmsPage } from '@/lib/pages-api';

const cardStyle: React.CSSProperties = {
    padding: 24,
    borderRadius: 24,
    background: 'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(2,6,23,0.97))',
    border: '1px solid rgba(55,65,81,0.6)',
    boxShadow: '0 24px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(15,23,42,0.8)',
    backdropFilter: 'blur(20px)',
};

export default function CmsPagesListPage() {
    const router = useRouter();
    const [pages, setPages] = useState<CmsPage[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        getAllCmsPages()
            .then(setPages)
            .catch((error) => {
                console.error(error);
                alert('Не удалось загрузить страницы из CMS');
            })
            .finally(() => setLoading(false));
    }, []);

    const pagesBySlug = useMemo(() => {
        const map: Record<string, CmsPage> = {};
        for (const page of pages) {
            if (page.slug) map[page.slug] = page;
        }
        return map;
    }, [pages]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return FOOTER_PAGE_CATALOG;
        return FOOTER_PAGE_CATALOG.filter((item) => {
            const haystack = [item.title, item.slug, item.group, item.breadcrumbLabel]
                .join(' ')
                .toLowerCase();
            return haystack.includes(q);
        });
    }, [search]);

    const publishedCount = FOOTER_PAGE_CATALOG.filter((item) =>
        hasPublishedContent(pagesBySlug[item.slug]),
    ).length;

    const grouped = useMemo(() => {
        const groups: Record<string, typeof FOOTER_PAGE_CATALOG> = {};
        for (const item of filtered) {
            if (!groups[item.group]) groups[item.group] = [];
            groups[item.group].push(item);
        }
        return groups;
    }, [filtered]);

    return (
        <PageShell>
            <AdminNav />

            <div style={cardStyle}>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 16,
                        flexWrap: 'wrap',
                        marginBottom: 24,
                    }}
                >
                    <div>
                        <h1 style={{ margin: 0, color: '#f9fafb', fontSize: 28, fontWeight: 700 }}>
                            Страницы сайта
                        </h1>
                        <p style={{ margin: '8px 0 0', color: '#9ca3af', fontSize: 14, maxWidth: 680 }}>
                            Редактируйте только страницы из футера сайта Totus Club (11 страниц). Изменения
                            появятся на сайте после сохранения.
                        </p>
                    </div>
                    <div
                        style={{
                            padding: '10px 14px',
                            borderRadius: 14,
                            background: 'rgba(254,115,46,0.12)',
                            border: '1px solid rgba(254,115,46,0.35)',
                            color: '#fdba74',
                            fontSize: 13,
                            fontWeight: 600,
                        }}
                    >
                        Опубликовано: {publishedCount} / {FOOTER_PAGE_CATALOG.length}
                    </div>
                </div>

                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Поиск по названию или slug..."
                    style={{
                        width: '100%',
                        marginBottom: 24,
                        padding: '14px 16px',
                        borderRadius: 14,
                        border: '1px solid rgba(75,85,99,0.55)',
                        background: 'rgba(2,6,23,0.75)',
                        color: '#f9fafb',
                        fontSize: 14,
                        outline: 'none',
                    }}
                />

                {filtered.length === 0 ? (
                    <div style={{ color: '#9ca3af', padding: 24 }}>Страницы не найдены</div>
                ) : (
                    Object.entries(grouped).map(([groupName, items]) => (
                        <div key={groupName} style={{ marginBottom: 28 }}>
                            <h2
                                style={{
                                    margin: '0 0 14px',
                                    color: '#e5e7eb',
                                    fontSize: 16,
                                    fontWeight: 700,
                                }}
                            >
                                {groupName}
                            </h2>
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                    gap: 14,
                                }}
                            >
                                {items.map((item) => {
                                    const cmsPage = pagesBySlug[item.slug];
                                    const published = hasPublishedContent(cmsPage);
                                    return (
                                        <div
                                            key={item.slug}
                                            style={{
                                                padding: 18,
                                                borderRadius: 18,
                                                border: '1px solid rgba(55,65,81,0.55)',
                                                background: 'rgba(15,23,42,0.55)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 12,
                                            }}
                                        >
                                            <div>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        gap: 8,
                                                        alignItems: 'flex-start',
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            color: '#f9fafb',
                                                            fontSize: 16,
                                                            fontWeight: 700,
                                                        }}
                                                    >
                                                        {item.title}
                                                    </div>
                                                    <span
                                                        style={{
                                                            fontSize: 11,
                                                            fontWeight: 700,
                                                            padding: '4px 8px',
                                                            borderRadius: 999,
                                                            whiteSpace: 'nowrap',
                                                            color: published ? '#86efac' : '#fcd34d',
                                                            background: published
                                                                ? 'rgba(34,197,94,0.12)'
                                                                : 'rgba(250,204,21,0.12)',
                                                        }}
                                                    >
                                                        {published ? 'Опубликовано' : 'Не опубликовано'}
                                                    </span>
                                                </div>
                                                <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 6 }}>
                                                    /{item.slug} · {SECTION_LABELS[item.section]}
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => router.push(`/pages/${item.slug}`)}
                                                    style={{
                                                        padding: '10px 14px',
                                                        borderRadius: 12,
                                                        border: 'none',
                                                        background: '#FE732E',
                                                        color: '#fff',
                                                        fontWeight: 700,
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    Редактировать
                                                </button>
                                                <a
                                                    href={`${PUBLIC_SITE_URL}${item.publicPath}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    style={{
                                                        padding: '10px 14px',
                                                        borderRadius: 12,
                                                        border: '1px solid rgba(75,85,99,0.55)',
                                                        color: '#e5e7eb',
                                                        textDecoration: 'none',
                                                        fontWeight: 600,
                                                        fontSize: 14,
                                                    }}
                                                >
                                                    Открыть на сайте
                                                </a>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </PageShell>
    );
}
