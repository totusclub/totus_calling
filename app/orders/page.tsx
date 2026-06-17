'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PageShell from '@/components/PageShell';
import AdminNav from '@/components/AdminNav';
import {
    getAllOrders,
    getUserOrders,
    getPackageData,
    getOrderId,
    getOrderPrice,
    getStatusLabel,
    getStatusColor,
    formatOrderDate,
    formatPeriod,
    collectTourists,
    isOrderAwaitingPayment,
    type OrderWithUser,
} from '@/lib/orders-api';
import { getUserById, getUserDisplayName, type User } from '@/lib/users-api';

const cardStyle: React.CSSProperties = {
    padding: 24,
    borderRadius: 24,
    background: 'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(2,6,23,0.97))',
    border: '1px solid rgba(55,65,81,0.6)',
    boxShadow: '0 24px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(15,23,42,0.8)',
    backdropFilter: 'blur(20px)',
};

function OrdersContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const userIdParam = searchParams.get('userId');

    const [orders, setOrders] = useState<OrderWithUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [filterUser, setFilterUser] = useState<User | null>(null);
    const [search, setSearch] = useState('');

    const load = async () => {
        try {
            setLoading(true);
            if (userIdParam) {
                const uid = Number(userIdParam);
                const [list, user] = await Promise.all([
                    getUserOrders(uid),
                    getUserById(uid).catch(() => null),
                ]);
                setFilterUser(user);
                setOrders(list.map((o): OrderWithUser => ({ ...o, _user: user })));
            } else {
                setFilterUser(null);
                const all = await getAllOrders();
                setOrders(all);
            }
        } catch (e) {
            console.error('Failed to load orders:', e);
            alert('Не удалось загрузить заказы');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userIdParam]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return orders;
        return orders.filter((o) => {
            const pkg = getPackageData(o);
            const haystack = [
                getOrderId(o),
                getStatusLabel(o),
                pkg?.hotel?.name,
                pkg?.hotel?.city,
                pkg?.hotel?.country,
                o._user ? getUserDisplayName(o._user) : '',
                o._user?.email,
                o._user?.loyaltyId,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return haystack.includes(q);
        });
    }, [orders, search]);

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
                            {filterUser ? `Заказы — ${getUserDisplayName(filterUser)}` : 'Все заказы'}
                        </h1>
                        <div style={{ fontSize: 13, color: '#9ca3af', fontWeight: 500 }}>
                            Всего заказов: {orders.length}
                            {filterUser && (
                                <>
                                    {' '}· ID: <strong style={{ color: '#FE732E' }}>{filterUser.loyaltyId}</strong>
                                </>
                            )}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {userIdParam && (
                            <button
                                onClick={() => router.push('/orders')}
                                style={{
                                    padding: '10px 18px',
                                    borderRadius: 999,
                                    border: '1px solid rgba(55,65,81,0.8)',
                                    backgroundColor: 'rgba(15,23,42,0.95)',
                                    color: '#e5e7eb',
                                    cursor: 'pointer',
                                    fontSize: 13,
                                    fontWeight: 600,
                                }}
                            >
                                ← Все заказы
                            </button>
                        )}
                        <button
                            onClick={load}
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
                </div>

                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Поиск по № заказа, отелю, клиенту..."
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

                {loading && orders.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
                        Загрузка заказов...
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
                        Заказы не найдены
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: 12 }}>
                        {filtered.map((order) => {
                            const pkg = getPackageData(order);
                            const orderId = getOrderId(order);
                            const statusColor = getStatusColor(pkg, order);
                            const statusLabel = getStatusLabel(order);
                            const hotelName = pkg?.hotel?.name || '';
                            const location = pkg?.hotel
                                ? [pkg.hotel.city, pkg.hotel.country].filter(Boolean).join(', ')
                                : '';
                            const period = formatPeriod(pkg);
                            const tourists = collectTourists(order, pkg);
                            const awaiting = isOrderAwaitingPayment(order);

                            return (
                                <div
                                    key={`${orderId}-${order.id}`}
                                    onClick={() => router.push(`/orders/${orderId}`)}
                                    style={{
                                        padding: '18px 20px',
                                        borderRadius: 18,
                                        border: '1px solid rgba(55,65,81,0.6)',
                                        borderBottom: `2px solid ${statusColor}90`,
                                        background: 'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(2,6,23,0.97))',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.35)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            gap: 12,
                                            marginBottom: 8,
                                        }}
                                    >
                                        <div style={{ color: '#f9fafb', fontSize: 16, fontWeight: 600 }}>
                                            Тур <span style={{ color: '#9ca3af' }}>№ {orderId}</span>
                                        </div>
                                        <span
                                            style={{
                                                padding: '4px 12px',
                                                borderRadius: 999,
                                                fontSize: 12,
                                                fontWeight: 600,
                                                color: '#fff',
                                                background: statusColor,
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {statusLabel}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                                        <span style={{ color: '#f9fafb', fontSize: 15, fontWeight: 700 }}>
                                            {getOrderPrice(order)}
                                        </span>
                                        {awaiting && (
                                            <span style={{ fontSize: 12, color: '#FE732E', fontWeight: 600 }}>
                                                Ожидает оплаты
                                            </span>
                                        )}
                                        <span style={{ color: '#6b7280', fontSize: 13 }}>
                                            От {formatOrderDate((order as any)?.c_date || pkg?.created_at)}
                                        </span>
                                    </div>

                                    {(hotelName || location) && (
                                        <div style={{ color: '#e5e7eb', fontSize: 14, marginBottom: 4 }}>
                                            {[hotelName, location].filter(Boolean).join(', ')}
                                        </div>
                                    )}
                                    {period && (
                                        <div style={{ color: '#9ca3af', fontSize: 13, marginBottom: 4 }}>{period}</div>
                                    )}
                                    {tourists && (
                                        <div style={{ color: '#9ca3af', fontSize: 13 }}>Туристы: {tourists}</div>
                                    )}

                                    {order._user && (
                                        <div
                                            style={{
                                                marginTop: 10,
                                                paddingTop: 10,
                                                borderTop: '1px solid rgba(55,65,81,0.4)',
                                                fontSize: 12,
                                                color: '#9ca3af',
                                                display: 'flex',
                                                gap: 8,
                                                flexWrap: 'wrap',
                                            }}
                                        >
                                            <span>Клиент: <strong style={{ color: '#e5e7eb' }}>{getUserDisplayName(order._user)}</strong></span>
                                            <span style={{ opacity: 0.5 }}>•</span>
                                            <span>ID: <strong style={{ color: '#FE732E' }}>{order._user.loyaltyId}</strong></span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </PageShell>
    );
}

export default function OrdersPage() {
    return (
        <Suspense fallback={<PageShell><div style={{ color: '#9ca3af', padding: 24 }}>Загрузка...</div></PageShell>}>
            <OrdersContent />
        </Suspense>
    );
}
