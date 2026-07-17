'use client';

import { useEffect } from 'react';
import PageShell from '@/components/PageShell';
import AdminNav from '@/components/AdminNav';
import HeroBannersSection from '@/components/admin/home/HeroBannersSection';
import ContentSection from '@/components/admin/home/ContentSection';
import PartnersSection from '@/components/admin/home/PartnersSection';
import FaqSection from '@/components/admin/home/FaqSection';
import FooterSocialSection from '@/components/admin/home/FooterSocialSection';
import { cardStyle } from '@/components/admin/home/styles';

const NAV_ITEMS = [
    { id: 'hero-banners', label: 'Hero и баннеры' },
    { id: 'titles', label: 'Заголовки' },
    { id: 'hotels', label: 'Отели' },
    { id: 'destinations', label: 'Направления' },
    { id: 'partners', label: 'Партнёры' },
    { id: 'faq', label: 'FAQ' },
    { id: 'footer-social', label: 'Соцсети' },
];

export default function HomeContentPage() {
    useEffect(() => {
        const hash = window.location.hash.replace('#', '');
        if (!hash) return;
        const el = document.getElementById(hash);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, []);

    const scrollTo = (id: string) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.history.replaceState(null, '', `#${id}`);
    };

    return (
        <PageShell>
            <AdminNav />

            <div style={cardStyle}>
                <div style={{ marginBottom: 24 }}>
                    <h1 style={{ margin: 0, color: '#f9fafb', fontSize: 28, fontWeight: 700 }}>
                        Главная страница
                    </h1>
                    <p style={{ margin: '8px 0 0', color: '#9ca3af', fontSize: 14, maxWidth: 720 }}>
                        Все секции главной страницы сайта в одном месте — в том же порядке, что на сайте.
                    </p>
                </div>

                <div
                    style={{
                        display: 'flex',
                        gap: 8,
                        flexWrap: 'wrap',
                        marginBottom: 24,
                        padding: 12,
                        borderRadius: 14,
                        border: '1px solid rgba(55,65,81,0.5)',
                        background: 'rgba(2,6,23,0.4)',
                    }}
                >
                    {NAV_ITEMS.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => scrollTo(item.id)}
                            style={{
                                padding: '8px 14px',
                                borderRadius: 999,
                                border: '1px solid rgba(55,65,81,0.7)',
                                background: 'rgba(15,23,42,0.8)',
                                color: '#e5e7eb',
                                fontSize: 13,
                                cursor: 'pointer',
                            }}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                <HeroBannersSection />
                <ContentSection />
                <PartnersSection />
                <FaqSection />
                <FooterSocialSection />
            </div>
        </PageShell>
    );
}
