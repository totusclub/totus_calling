'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PageShell from '@/components/PageShell';
import AdminNav from '@/components/AdminNav';
import {
    getClientOrders,
    getClientOrder,
    getAllOrders,
    getOrderAuthToken,
    getPackageData,
    getOrderId,
    getOrderPrice,
    formatPeriod,
    formatPrice,
} from '@/lib/orders-api';

const cardStyle: React.CSSProperties = {
    padding: 24,
    borderRadius: 24,
    background: 'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(2,6,23,0.97))',
    border: '1px solid rgba(55,65,81,0.6)',
    boxShadow: '0 24px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(15,23,42,0.8)',
    backdropFilter: 'blur(20px)',
};

const PAGE_LIMIT = 5;

function LtOrdersContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [pageNumber, setPageNumber] = useState(0);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [token, setToken] = useState<string | null>(null);
    const [searchId, setSearchId] = useState('');
    const [searchActive, setSearchActive] = useState(false);

    // Resolve the single Level Travel auth token to use: from the URL, or the
    // first order that has one saved.
    const resolveToken = async (): Promise<string | null> => {
        const urlToken = searchParams.get('token');
        if (urlToken) return urlToken;
        const all = await getAllOrders();
        for (const order of all) {
            const t = getOrderAuthToken(order);
            if (t) return t;
        }
        return null;
    };

    const load = async (page = 0, knownToken?: string) => {
        try {
            setLoading(true);
            setError(null);
            setSearchActive(false);
            const activeToken = knownToken || token || (await resolveToken());
            if (!activeToken) {
                setError('Не найден auth_token Level Travel');
                setOrders([]);
                setLoaded(true);
                return;
            }
            if (activeToken !== token) setToken(activeToken);
            const { orders: list } = await getClientOrders(activeToken, page, PAGE_LIMIT);
            setOrders(list);
            setPageNumber(page);
            setLoaded(true);
        } catch (e: any) {
            console.error('Failed to load Level Travel orders:', e);
            setError(e?.message || 'Не удалось загрузить заказы Level Travel');
            setOrders([]);
            setLoaded(true);
        } finally {
            setLoading(false);
        }
    };

    const searchByOrderId = async () => {
        const id = searchId.trim();
        if (!id) {
            load(0);
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const activeToken = token || (await resolveToken());
            if (!activeToken) {
                setError('Не найден auth_token Level Travel');
                setOrders([]);
                setLoaded(true);
                return;
            }
            if (activeToken !== token) setToken(activeToken);
            const found = await getClientOrder(id, activeToken, false);
            setOrders(found ? [found] : []);
            setSearchActive(true);
            setLoaded(true);
        } catch (e: any) {
            console.error('Failed to search Level Travel order:', e);
            setError(e?.message || `Заказ № ${id} не найден`);
            setOrders([]);
            setSearchActive(true);
            setLoaded(true);
        } finally {
            setLoading(false);
        }
    };

    const clearSearch = () => {
        setSearchId('');
        load(0);
    };

    useEffect(() => {
        load(0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
                    }}
                >
                    <div>
                        <h1 style={{ margin: 0, color: '#f9fafb', fontSize: 24, fontWeight: 700, marginBottom: 6 }}>
                            Заказы Level Travel
                        </h1>
                        <div style={{ fontSize: 13, color: '#9ca3af', fontWeight: 500 }}>
                            Заказы напрямую из Level Travel (GET /client/orders)
                        </div>
                    </div>
                    {!searchActive && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button
                                onClick={() => load(Math.max(0, pageNumber - 1))}
                                disabled={loading || pageNumber === 0}
                                style={{
                                    padding: '8px 14px',
                                    borderRadius: 999,
                                    border: '1px solid rgba(55,65,81,0.8)',
                                    background: 'rgba(15,23,42,0.95)',
                                    color: pageNumber === 0 ? '#4b5563' : '#e5e7eb',
                                    cursor: loading || pageNumber === 0 ? 'not-allowed' : 'pointer',
                                    fontSize: 13,
                                    fontWeight: 600,
                                }}
                            >
                                ← Назад
                            </button>
                            <span style={{ color: '#9ca3af', fontSize: 13 }}>Стр. {pageNumber + 1}</span>
                            <button
                                onClick={() => load(pageNumber + 1)}
                                disabled={loading || orders.length < PAGE_LIMIT}
                                style={{
                                    padding: '8px 14px',
                                    borderRadius: 999,
                                    border: '1px solid rgba(55,65,81,0.8)',
                                    background: 'rgba(15,23,42,0.95)',
                                    color: orders.length < PAGE_LIMIT ? '#4b5563' : '#e5e7eb',
                                    cursor: loading || orders.length < PAGE_LIMIT ? 'not-allowed' : 'pointer',
                                    fontSize: 13,
                                    fontWeight: 600,
                                }}
                            >
                                Вперёд →
                            </button>
                            <button
                                onClick={() => load(pageNumber)}
                                disabled={loading}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: 999,
                                    border: '1px solid rgba(254,115,46,0.5)',
                                    background: 'rgba(254,115,46,0.12)',
                                    color: '#FE732E',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    fontSize: 13,
                                    fontWeight: 700,
                                }}
                            >
                                {loading ? 'Загрузка...' : 'Обновить'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Search by order id */}
                <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
                    <input
                        value={searchId}
                        onChange={(e) => setSearchId(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && searchByOrderId()}
                        placeholder="Поиск по номеру заказа..."
                        inputMode="numeric"
                        style={{
                            flex: '1 1 260px',
                            minWidth: 200,
                            padding: '12px 16px',
                            borderRadius: 12,
                            border: '1px solid rgba(55,65,81,0.6)',
                            background: 'rgba(2,6,23,0.6)',
                            color: '#f9fafb',
                            fontSize: 14,
                            outline: 'none',
                        }}
                    />
                    <button
                        onClick={searchByOrderId}
                        disabled={loading}
                        style={{
                            padding: '12px 22px',
                            borderRadius: 12,
                            border: 'none',
                            background: loading ? 'rgba(31,41,55,0.8)' : '#FE732E',
                            color: loading ? '#6b7280' : '#f9fafb',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: 14,
                            fontWeight: 700,
                            boxShadow: loading ? 'none' : '0 12px 32px rgba(254,115,46,0.45)',
                        }}
                    >
                        Найти
                    </button>
                    {searchActive && (
                        <button
                            onClick={clearSearch}
                            disabled={loading}
                            style={{
                                padding: '12px 18px',
                                borderRadius: 12,
                                border: '1px solid rgba(55,65,81,0.8)',
                                background: 'rgba(15,23,42,0.95)',
                                color: '#e5e7eb',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontSize: 14,
                                fontWeight: 600,
                            }}
                        >
                            Сбросить
                        </button>
                    )}
                </div>

                {error && <div style={{ color: '#ef4444', fontSize: 13, marginTop: 16 }}>{error}</div>}
            </div>

            {loaded && !error && (
                <div style={cardStyle}>
                    <div style={{ color: '#f9fafb', fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
                        {searchActive
                            ? `Результат поиска: ${orders.length}`
                            : `Заказов на странице: ${orders.length}`}
                    </div>

                    {orders.length === 0 ? (
                        <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
                            Заказы не найдены
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: 12 }}>
                            {orders.map((order, idx) => {
                                const pkg = getPackageData(order) || order.package || order;
                                const orderId = getOrderId(order);
                                const statusLabel = order.status_for_client || order.state || '—';
                                const hotelName = pkg?.hotel?.name || '';
                                const location = pkg?.hotel
                                    ? [pkg.hotel.city, pkg.hotel.country].filter(Boolean).join(', ')
                                    : '';
                                const period = formatPeriod(pkg);
                                const price =
                                    formatPrice(order.full_price ?? order.price ?? pkg?.price ?? pkg?.full_price) ||
                                    getOrderPrice(order);

                                return (
                                    <div
                                        key={`${orderId}-${idx}`}
                                        onClick={() => orderId != null && router.push(`/orders/${orderId}`)}
                                        style={{
                                            padding: '18px 20px',
                                            borderRadius: 18,
                                            border: '1px solid rgba(55,65,81,0.6)',
                                            background: 'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(2,6,23,0.97))',
                                            cursor: orderId != null ? 'pointer' : 'default',
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
                                                    background: '#FE732E',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {statusLabel}
                                            </span>
                                        </div>
                                        {price && (
                                            <div style={{ color: '#f9fafb', fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
                                                {price}
                                            </div>
                                        )}
                                        {(hotelName || location) && (
                                            <div style={{ color: '#e5e7eb', fontSize: 14, marginBottom: 4 }}>
                                                {[hotelName, location].filter(Boolean).join(', ')}
                                            </div>
                                        )}
                                        {period && <div style={{ color: '#9ca3af', fontSize: 13 }}>{period}</div>}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </PageShell>
    );
}

export default function LtOrdersPage() {
    return (
        <Suspense fallback={<PageShell><div style={{ color: '#9ca3af', padding: 24 }}>Загрузка...</div></PageShell>}>
            <LtOrdersContent />
        </Suspense>
    );
}
