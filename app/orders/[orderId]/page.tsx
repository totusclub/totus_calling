'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageShell from '@/components/PageShell';
import AdminNav from '@/components/AdminNav';
import {
    getOrder,
    getOrderDocuments,
    getClientOrder,
    getOrderAuthToken,
    collectLtDocuments,
    getPackageData,
    getOrderId,
    getOrderPrice,
    getStatusLabel,
    getStatusColor,
    formatOrderDate,
    formatPeriod,
    formatPrice,
    isOrderAwaitingPayment,
    type Order,
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

const sectionTitle: React.CSSProperties = {
    color: '#9ca3af',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: 600,
    marginBottom: 8,
};

type Doc = { name?: string; url: string };

// Build a stable identity for a document so the same file from different sources
// (local /uploads copy vs remote Level Travel URL) is treated as one.
function docKey(doc: Doc): string {
    const url = String(doc.url || '').toLowerCase();
    const attachmentMatch = url.match(/\/attachment\/(\d+)/);
    if (attachmentMatch) return `attachment:${attachmentMatch[1]}`;
    if (url.includes('agreement.pdf') || url.includes('agreement_code=')) return 'agreement_doc';
    if (url.includes('license_agreement')) return 'agreement_license';

    // last path segment without query string
    const fileName = url.split('?')[0].split('/').filter(Boolean).pop() || '';
    if (fileName) return `file:${fileName}`;

    const name = String(doc.name || '').trim().toLowerCase();
    if (name) return `name:${name}`;
    return `url:${url}`;
}

// Merge + de-duplicate documents, preferring locally-stored copies (/uploads).
function dedupeDocuments(docs: Doc[]): Doc[] {
    const map = new Map<string, Doc>();
    for (const doc of docs) {
        if (!doc?.url) continue;
        const key = docKey(doc);
        const existing = map.get(key);
        if (!existing) {
            map.set(key, doc);
            continue;
        }
        // Prefer the local (already downloaded) copy over a remote one.
        const existingLocal = existing.url.includes('/uploads/');
        const incomingLocal = doc.url.includes('/uploads/');
        if (!existingLocal && incomingLocal) {
            map.set(key, doc);
        }
    }
    return Array.from(map.values());
}

// Safely turn any value (including objects like {id,name,logo}) into something renderable.
function renderValue(value: React.ReactNode): React.ReactNode {
    if (value === null || value === undefined || value === '') return '—';
    if (React.isValidElement(value)) return value;
    if (typeof value === 'object') {
        const obj: any = value;
        return obj.name ?? obj.title ?? obj.label ?? obj.value ?? JSON.stringify(obj);
    }
    return value as React.ReactNode;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 16,
                padding: '12px 0',
                borderBottom: '1px solid rgba(55,65,81,0.4)',
            }}
        >
            <span style={{ color: '#9ca3af', fontSize: 14 }}>{label}</span>
            <span style={{ color: '#f9fafb', fontSize: 14, fontWeight: 500, textAlign: 'right' }}>{renderValue(value)}</span>
        </div>
    );
}

export default function OrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const orderIdParam = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;

    const [order, setOrder] = useState<Order | null>(null);
    const [owner, setOwner] = useState<User | null>(null);
    const [documents, setDocuments] = useState<Array<{ name?: string; url: string }>>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Live Level Travel data
    const [ltOrder, setLtOrder] = useState<any>(null);
    const [ltLoading, setLtLoading] = useState(false);
    const [ltError, setLtError] = useState<string | null>(null);
    const [showRaw, setShowRaw] = useState(false);

    const loadLevelTravel = async (sourceOrder: Order | null) => {
        const base = sourceOrder || order;
        if (!base || !orderIdParam) return;
        const token = getOrderAuthToken(base);
        if (!token) {
            setLtError('Для этого заказа не сохранён auth_token Level Travel');
            return;
        }
        try {
            setLtLoading(true);
            setLtError(null);
            const lt = await getClientOrder(orderIdParam, token, false);
            setLtOrder(lt);
            const ltDocs = collectLtDocuments(lt);
            if (ltDocs.length) {
                setDocuments((prev) => dedupeDocuments([...prev, ...ltDocs]));
            }
        } catch (e: any) {
            console.error('Failed to load Level Travel order:', e);
            setLtError(e?.message || 'Не удалось загрузить данные Level Travel');
        } finally {
            setLtLoading(false);
        }
    };

    useEffect(() => {
        const load = async () => {
            if (!orderIdParam) return;
            try {
                setLoading(true);
                setError(null);
                setLtOrder(null);
                setLtError(null);
                setDocuments([]);
                const data = await getOrder(orderIdParam);
                if ((data as any)?.error) {
                    throw new Error((data as any).error);
                }
                setOrder(data);

                getOrderDocuments(orderIdParam)
                    .then((docs) => setDocuments((prev) => dedupeDocuments([...prev, ...(docs as Doc[])])))
                    .catch(() => { /* keep whatever is already loaded */ });

                const uid = (data as any)?.user_id;
                if (uid != null) {
                    getUserById(Number(uid)).then(setOwner).catch(() => setOwner(null));
                }

                // Auto-load full Level Travel data when an auth token is available.
                loadLevelTravel(data);
            } catch (e: any) {
                console.error('Failed to load order:', e);
                setError(e?.message || 'Не удалось загрузить заказ');
            } finally {
                setLoading(false);
            }
        };
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderIdParam]);

    // Prefer live Level Travel data when available, fall back to DB package.
    const ltPkg = ltOrder ? (ltOrder.package || ltOrder) : null;
    const pkg = ltPkg || getPackageData(order || undefined);
    const lt = ltOrder || (order as any)?.package || {};
    const statusColor = order ? getStatusColor(pkg, order) : '#FE732E';
    const statusLabel = (ltOrder && (ltOrder.status_for_client || ltOrder.state)) || getStatusLabel(order || undefined);
    const hotelName = pkg?.hotel?.name || '';
    const destination = [pkg?.hotel?.city, pkg?.hotel?.country].filter(Boolean).join(', ');
    const tourists: any[] = pkg?.tourists || lt?.tourists || ltOrder?.tourists || [];
    const client = lt?.client || pkg?.client || ltOrder?.client;
    const awaiting = order ? isOrderAwaitingPayment(order) : false;
    const ltPrice = ltOrder
        ? formatPrice(ltOrder.full_price ?? ltOrder.price ?? ltPkg?.price ?? ltPkg?.full_price)
        : null;

    return (
        <PageShell>
            <AdminNav />

            <button
                onClick={() => router.back()}
                style={{
                    width: 'fit-content',
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
                ← Назад
            </button>

            {loading ? (
                <div style={{ ...cardStyle, color: '#9ca3af', textAlign: 'center' }}>Загрузка заказа...</div>
            ) : error ? (
                <div style={{ ...cardStyle, color: '#ef4444', textAlign: 'center' }}>{error}</div>
            ) : !order ? (
                <div style={{ ...cardStyle, color: '#9ca3af', textAlign: 'center' }}>Заказ не найден</div>
            ) : (
                <>
                    {/* Header / summary */}
                    <div style={cardStyle}>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 12,
                                flexWrap: 'wrap',
                                marginBottom: 16,
                            }}
                        >
                            <h1 style={{ margin: 0, color: '#f9fafb', fontSize: 24, fontWeight: 700 }}>
                                Тур № {getOrderId(order)}
                            </h1>
                            <span
                                style={{
                                    padding: '6px 16px',
                                    borderRadius: 999,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: '#fff',
                                    background: statusColor,
                                }}
                            >
                                {statusLabel}
                            </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                            <div style={{ color: '#f9fafb', fontSize: 28, fontWeight: 700 }}>{getOrderPrice(order)}</div>
                            {awaiting ? (
                                <span style={{ color: '#FE732E', fontSize: 14, fontWeight: 600 }}>Ожидает оплаты</span>
                            ) : (
                                <span style={{ color: '#22c55e', fontSize: 14, fontWeight: 600 }}>Оплачено</span>
                            )}
                        </div>
                        <div style={{ color: '#6b7280', fontSize: 13, marginTop: 6 }}>
                            Создан: {formatOrderDate((order as any)?.c_date || pkg?.created_at)}
                            {(order as any)?.pay_status ? ` · pay_status: ${(order as any).pay_status}` : ''}
                        </div>
                    </div>

                    {/* Level Travel live data */}
                    <div style={cardStyle}>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 12,
                                flexWrap: 'wrap',
                                marginBottom: ltOrder || ltError ? 14 : 0,
                            }}
                        >
                            <div>
                                <div style={{ ...sectionTitle, marginBottom: 4 }}>Данные Level Travel</div>
                                <div style={{ fontSize: 13, color: '#6b7280' }}>
                                    {ltLoading
                                        ? 'Загрузка из Level Travel...'
                                        : ltOrder
                                            ? 'Актуальные данные получены напрямую из Level Travel'
                                            : 'Полная информация о заказе из Level Travel'}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {getOrderAuthToken(order) && (
                                    <button
                                        onClick={() =>
                                            router.push(`/lt-orders?token=${encodeURIComponent(getOrderAuthToken(order) || '')}`)
                                        }
                                        style={{
                                            padding: '10px 18px',
                                            borderRadius: 999,
                                            border: '1px solid rgba(55,65,81,0.8)',
                                            background: 'rgba(15,23,42,0.95)',
                                            color: '#e5e7eb',
                                            cursor: 'pointer',
                                            fontSize: 13,
                                            fontWeight: 700,
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        Все заказы клиента в LT →
                                    </button>
                                )}
                                <button
                                    onClick={() => loadLevelTravel(order)}
                                    disabled={ltLoading}
                                    style={{
                                        padding: '10px 18px',
                                        borderRadius: 999,
                                        border: '1px solid rgba(254,115,46,0.5)',
                                        background: 'rgba(254,115,46,0.12)',
                                        color: '#FE732E',
                                        cursor: ltLoading ? 'not-allowed' : 'pointer',
                                        fontSize: 13,
                                        fontWeight: 700,
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {ltLoading ? 'Загрузка...' : ltOrder ? 'Обновить из LT' : 'Загрузить из LT'}
                                </button>
                            </div>
                        </div>

                        {ltError && !ltOrder && (
                            <div style={{ color: '#ef4444', fontSize: 13, marginTop: 12 }}>{ltError}</div>
                        )}

                        {ltOrder && (
                            <>
                                <InfoRow label="LT order id" value={ltOrder.id} />
                                <InfoRow label="Состояние (state)" value={ltOrder.state} />
                                <InfoRow label="Статус для клиента" value={ltOrder.status_for_client} />
                                <InfoRow label="Стоимость (LT)" value={ltPrice} />
                                <InfoRow
                                    label="Оплачено"
                                    value={ltOrder.is_paid === true ? 'Да' : ltOrder.is_paid === false ? 'Нет' : undefined}
                                />
                                <InfoRow
                                    label="Вложений (документов)"
                                    value={Array.isArray(ltOrder.attachments) ? ltOrder.attachments.length : 0}
                                />

                                <button
                                    onClick={() => setShowRaw((v) => !v)}
                                    style={{
                                        marginTop: 14,
                                        padding: '8px 14px',
                                        borderRadius: 999,
                                        border: '1px solid rgba(55,65,81,0.8)',
                                        background: 'rgba(15,23,42,0.95)',
                                        color: '#e5e7eb',
                                        cursor: 'pointer',
                                        fontSize: 12,
                                        fontWeight: 600,
                                    }}
                                >
                                    {showRaw ? 'Скрыть полный JSON' : 'Показать полный JSON'}
                                </button>
                                {showRaw && (
                                    <pre
                                        style={{
                                            marginTop: 12,
                                            padding: 16,
                                            borderRadius: 14,
                                            background: 'rgba(2,6,23,0.85)',
                                            border: '1px solid rgba(55,65,81,0.4)',
                                            color: '#cbd5e1',
                                            fontSize: 12,
                                            lineHeight: 1.5,
                                            maxHeight: 400,
                                            overflow: 'auto',
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                        }}
                                    >
                                        {JSON.stringify(ltOrder, null, 2)}
                                    </pre>
                                )}
                            </>
                        )}
                    </div>

                    {/* Tour info */}
                    <div style={cardStyle}>
                        <div style={sectionTitle}>Информация о туре</div>
                        <InfoRow label="Отель" value={hotelName} />
                        <InfoRow label="Курорт" value={destination} />
                        <InfoRow label="Период" value={formatPeriod(pkg)} />
                        <InfoRow label="Ночей" value={pkg?.nights_count} />
                        <InfoRow label="Тип номера" value={pkg?.room_type} />
                        <InfoRow label="Питание" value={pkg?.pansion_description || pkg?.meal} />
                        <InfoRow label="Туроператор" value={pkg?.operator || 'Level.Travel'} />
                    </div>

                    {/* Client */}
                    {(client || owner) && (
                        <div style={cardStyle}>
                            <div style={sectionTitle}>Клиент</div>
                            {owner && (
                                <InfoRow
                                    label="Пользователь"
                                    value={
                                        <button
                                            onClick={() => router.push(`/orders?userId=${owner.id}`)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#FE732E',
                                                cursor: 'pointer',
                                                fontSize: 14,
                                                fontWeight: 600,
                                                padding: 0,
                                            }}
                                        >
                                            {getUserDisplayName(owner)} (ID {owner.loyaltyId}) →
                                        </button>
                                    }
                                />
                            )}
                            {client && (
                                <>
                                    <InfoRow label="Имя" value={[client?.name, client?.surname].filter(Boolean).join(' ')} />
                                    <InfoRow label="Email" value={client?.email} />
                                    <InfoRow label="Телефон" value={client?.phone} />
                                </>
                            )}
                        </div>
                    )}

                    {/* Tourists */}
                    {tourists.length > 0 && (
                        <div style={cardStyle}>
                            <div style={sectionTitle}>Туристы ({tourists.length})</div>
                            <div style={{ display: 'grid', gap: 10 }}>
                                {tourists.map((t, idx) => (
                                    <div
                                        key={t?.id ?? idx}
                                        style={{
                                            padding: '12px 14px',
                                            borderRadius: 14,
                                            background: 'rgba(2,6,23,0.6)',
                                            border: '1px solid rgba(55,65,81,0.4)',
                                        }}
                                    >
                                        <div style={{ color: '#f9fafb', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                                            {[t?.surname, t?.name].filter(Boolean).join(' ') || `Турист ${idx + 1}`}
                                        </div>
                                        <div style={{ color: '#9ca3af', fontSize: 13, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                            {t?.birthday && <span>Дата рожд.: {t.birthday}</span>}
                                            {t?.passport && <span>Паспорт: {t.passport}</span>}
                                            {t?.passport_expires_on && <span>Действ. до: {t.passport_expires_on}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Documents */}
                    {documents.length > 0 && (
                        <div style={cardStyle}>
                            <div style={sectionTitle}>Документы</div>
                            <div style={{ display: 'grid', gap: 8 }}>
                                {documents.map((doc, idx) => (
                                    <a
                                        key={idx}
                                        href={doc.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 10,
                                            padding: '12px 14px',
                                            borderRadius: 14,
                                            background: 'rgba(2,6,23,0.6)',
                                            border: '1px solid rgba(55,65,81,0.4)',
                                            color: '#e5e7eb',
                                            textDecoration: 'none',
                                            fontSize: 14,
                                        }}
                                    >
                                        <span style={{ fontSize: 18 }}>📄</span>
                                        {doc.name || `Документ ${idx + 1}`}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </PageShell>
    );
}
