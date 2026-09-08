'use client';

/**
 * Горизонтальные вкладки панели агента: «Звонки» и «Чат поддержки».
 * Бейдж непрочитанного берётся из SupportChatProvider.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon, { type IconName } from './Icon';
import { useSupportChat } from './SupportChatProvider';
import { t, radius, badge } from '@/lib/theme';

const TABS: { href: string; label: string; icon: IconName }[] = [
    { href: '/', label: 'Звонки', icon: 'phone' },
    { href: '/chat', label: 'Чат поддержки', icon: 'chat' },
];

export default function AppNav() {
    const pathname = usePathname() || '/';
    const { unreadTotal } = useSupportChat();

    return (
        <nav
            aria-label="Разделы"
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: 4,
                borderRadius: radius.md,
                background: t.surfaceInset,
            }}
        >
            {TABS.map((tab) => {
                const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
                const unread = tab.href === '/chat' ? unreadTotal : 0;
                return (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        aria-current={active ? 'page' : undefined}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 14px',
                            borderRadius: radius.sm,
                            background: active ? t.surface : 'transparent',
                            border: `1px solid ${active ? t.border : 'transparent'}`,
                            boxShadow: active ? t.shadowCard : 'none',
                            color: active ? t.textPrimary : t.textSecondary,
                            fontSize: 14,
                            lineHeight: '20px',
                            fontWeight: 600,
                            textDecoration: 'none',
                            whiteSpace: 'nowrap',
                            transition: 'background 0.15s, color 0.15s, border-color 0.15s',
                        }}
                    >
                        <Icon name={tab.icon} size={18} />
                        {tab.label}
                        {unread > 0 && (
                            <span style={{ ...badge('accent'), padding: '2px 8px', minWidth: 20, justifyContent: 'center' }}>
                                {unread > 99 ? '99+' : unread}
                            </span>
                        )}
                    </Link>
                );
            })}
        </nav>
    );
}
