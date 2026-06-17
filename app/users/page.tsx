'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageShell from '@/components/PageShell';
import AdminNav from '@/components/AdminNav';
import { getAllUsers, getUserDisplayName, type User } from '@/lib/users-api';

const cardStyle: React.CSSProperties = {
    padding: 24,
    borderRadius: 24,
    background: 'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(2,6,23,0.97))',
    border: '1px solid rgba(55,65,81,0.6)',
    boxShadow: '0 24px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(15,23,42,0.8)',
    backdropFilter: 'blur(20px)',
};

export default function UsersPage() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    const loadUsers = async () => {
        try {
            setLoading(true);
            const all = await getAllUsers();
            setUsers(all);
        } catch (e) {
            console.error('Failed to load users:', e);
            alert('Не удалось загрузить список пользователей');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return users;
        return users.filter((u) => {
            const haystack = [
                getUserDisplayName(u),
                u.email,
                u.phone,
                u.loyaltyId,
                String(u.id),
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return haystack.includes(q);
        });
    }, [users, search]);

    const onlineCount = users.filter((u) => u.online).length;

    return (
        <PageShell>
            <AdminNav />

            <div style={cardStyle}>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12,
                        flexWrap: 'wrap',
                        marginBottom: 20,
                    }}
                >
                    <div>
                        <h1 style={{ margin: 0, color: '#f9fafb', fontSize: 24, fontWeight: 700, marginBottom: 6 }}>
                            Пользователи
                        </h1>
                        <div style={{ fontSize: 13, color: '#9ca3af', fontWeight: 500 }}>
                            Всего: {users.length} · Онлайн: {onlineCount}
                        </div>
                    </div>
                    <button
                        onClick={loadUsers}
                        disabled={loading}
                        style={{
                            padding: '10px 18px',
                            borderRadius: 999,
                            border: '1px solid rgba(55,65,81,0.8)',
                            backgroundColor: 'rgba(15,23,42,0.95)',
                            color: '#e5e7eb',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: 13,
                            fontWeight: 600,
                        }}
                    >
                        {loading ? 'Обновление...' : 'Обновить'}
                    </button>
                </div>

                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Поиск по имени, email, телефону, ID..."
                    style={{
                        width: '100%',
                        padding: '14px 18px',
                        borderRadius: 14,
                        border: '1px solid rgba(55,65,81,0.6)',
                        background: 'rgba(2,6,23,0.6)',
                        color: '#f9fafb',
                        fontSize: 14,
                        marginBottom: 20,
                        outline: 'none',
                    }}
                />

                {filtered.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
                        {loading ? 'Загрузка...' : 'Пользователи не найдены'}
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: 10 }}>
                        {filtered.map((user) => (
                            <div
                                key={user.id}
                                style={{
                                    padding: '16px 18px',
                                    borderRadius: 18,
                                    border: '1px solid rgba(55,65,81,0.6)',
                                    background: 'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(2,6,23,0.97))',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 16,
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
                                    <div
                                        style={{
                                            width: 44,
                                            height: 44,
                                            borderRadius: 999,
                                            flexShrink: 0,
                                            background: user.online
                                                ? 'conic-gradient(from 180deg, #22c55e, #16a34a, #15803d, #22c55e)'
                                                : 'linear-gradient(135deg, rgba(55,65,81,0.8), rgba(31,41,55,0.8))',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#e5e7eb',
                                            fontWeight: 700,
                                            fontSize: 18,
                                        }}
                                    >
                                        {getUserDisplayName(user).charAt(0).toUpperCase()}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                            <strong
                                                style={{
                                                    color: '#f9fafb',
                                                    fontSize: 16,
                                                    fontWeight: 700,
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                }}
                                            >
                                                {getUserDisplayName(user)}
                                            </strong>
                                            <span
                                                style={{
                                                    padding: '3px 9px',
                                                    borderRadius: 999,
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    backgroundColor: user.online ? 'rgba(34,197,94,0.15)' : 'rgba(55,65,81,0.7)',
                                                    color: user.online ? '#bbf7d0' : '#e5e7eb',
                                                    border: `1px solid ${user.online ? 'rgba(34,197,94,0.5)' : 'rgba(55,65,81,0.9)'}`,
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {user.online ? 'Онлайн' : 'Офлайн'}
                                            </span>
                                            {user.access === 1 || user.access === true ? (
                                                <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>Заблок.</span>
                                            ) : null}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: 12,
                                                color: '#9ca3af',
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                gap: 8,
                                                alignItems: 'center',
                                            }}
                                        >
                                            <span>ID: <strong style={{ color: '#FE732E' }}>{user.loyaltyId}</strong></span>
                                            <span style={{ opacity: 0.5 }}>•</span>
                                            <span>#{user.id}</span>
                                            {user.phone && (
                                                <>
                                                    <span style={{ opacity: 0.5 }}>•</span>
                                                    <span>{user.phone}</span>
                                                </>
                                            )}
                                            {user.email && (
                                                <>
                                                    <span style={{ opacity: 0.5 }}>•</span>
                                                    <span>{user.email}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => router.push(`/orders?userId=${user.id}`)}
                                    style={{
                                        padding: '10px 18px',
                                        borderRadius: 999,
                                        border: '1px solid rgba(254,115,46,0.5)',
                                        background: 'rgba(254,115,46,0.12)',
                                        color: '#FE732E',
                                        cursor: 'pointer',
                                        fontSize: 13,
                                        fontWeight: 700,
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    Заказы →
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </PageShell>
    );
}
