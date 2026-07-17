'use client';

import { usePathname, useRouter } from 'next/navigation';

const LINKS = [
    { href: '/', label: 'Звонки', icon: '📞' },
    { href: '/users', label: 'Пользователи', icon: '👥' },
    { href: '/orders', label: 'Заказы', icon: '🧳' },
    { href: '/lt-orders', label: 'Level Travel', icon: '🌍' },
    { href: '/pages', label: 'Страницы', icon: '📄' },
    { href: '/home-content', label: 'Главная', icon: '🏠' },
    { href: '/callback-requests', label: 'Заявки на звонок', icon: '📱' },
];

export default function AdminNav() {
    const pathname = usePathname();
    const router = useRouter();

    const isActive = (href: string) => {
        if (href === '/') return pathname === '/';
        return pathname === href || pathname.startsWith(`${href}/`);
    };

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: 8,
                borderRadius: 999,
                background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(2,6,23,0.95))',
                border: '1px solid rgba(55,65,81,0.6)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
                backdropFilter: 'blur(20px)',
                width: 'fit-content',
            }}
        >
            {LINKS.map((link) => {
                const active = isActive(link.href);
                return (
                    <button
                        key={link.href}
                        onClick={() => router.push(link.href)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '10px 18px',
                            borderRadius: 999,
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 14,
                            fontWeight: 600,
                            color: active ? '#f9fafb' : '#9ca3af',
                            background: active ? '#FE732E' : 'transparent',
                            boxShadow: active ? '0 8px 24px rgba(254,115,46,0.45)' : 'none',
                            transition: 'all 0.2s',
                            whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={(e) => {
                            if (!active) e.currentTarget.style.color = '#e5e7eb';
                        }}
                        onMouseLeave={(e) => {
                            if (!active) e.currentTarget.style.color = '#9ca3af';
                        }}
                    >
                        <span style={{ fontSize: 16 }}>{link.icon}</span>
                        {link.label}
                    </button>
                );
            })}
        </div>
    );
}
