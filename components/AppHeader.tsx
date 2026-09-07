'use client';

/**
 * Общая шапка панели агента: логотип, заголовок, вкладки разделов,
 * переключатель темы и «Выйти». Используется на главной и в чате поддержки.
 */

import { useRouter } from 'next/navigation';
import { removeUser } from '@/lib/auth-api';
import { disconnectSupportSocket } from '@/lib/support-chat-socket';
import AppNav from './AppNav';
import BrandLogo from './BrandLogo';
import Icon from './Icon';
import ThemeToggle from './ThemeToggle';
import { text, cardStyle, button } from '@/lib/theme';

export default function AppHeader({
    subtitle = 'Панель звонков для агентов в реальном времени',
}: {
    subtitle?: string;
}) {
    const router = useRouter();

    const handleLogout = () => {
        if (confirm('Вы уверены, что хотите выйти?')) {
            disconnectSupportSocket();
            removeUser();
            router.push('/login');
        }
    };

    return (
        <div
            style={{
                ...cardStyle,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                flexWrap: 'wrap',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <BrandLogo height={28} />
                <div>
                    <div style={text.sectionTitle}>Totus Web Calling</div>
                    <div style={text.caption}>{subtitle}</div>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <AppNav />
                <ThemeToggle compact />
                <button type="button" onClick={handleLogout} style={button('secondary')}>
                    <Icon name="logout" size={18} />
                    Выйти
                </button>
            </div>
        </div>
    );
}
