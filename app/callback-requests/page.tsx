'use client';

import { useEffect, useMemo, useState } from 'react';
import PageShell from '@/components/PageShell';
import AdminNav from '@/components/AdminNav';
import {
    deleteCallbackRequest,
    formatCallbackDate,
    formatCallbackPhone,
    getCallbackRequests,
    type CallbackRequest,
} from '@/lib/callback-requests-api';
import { cardStyle, inputStyle } from '@/components/admin/home/styles';

export default function CallbackRequestsPage() {
    const [requests, setRequests] = useState<CallbackRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const load = async () => {
        try {
            setLoading(true);
            const data = await getCallbackRequests();
            setRequests(data);
        } catch (error) {
            console.error(error);
            alert('Не удалось загрузить заявки с главной страницы');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return requests;
        return requests.filter((item) => {
            const phone = item.phone_display || formatCallbackPhone(item.phone);
            return phone.toLowerCase().includes(q) || String(item.id).includes(q);
        });
    }, [requests, search]);

    const handleDelete = async (item: CallbackRequest) => {
        if (!confirm(`Удалить заявку ${formatCallbackPhone(item.phone)}?`)) return;
        try {
            await deleteCallbackRequest(item.id);
            setRequests((prev) => prev.filter((row) => row.id !== item.id));
        } catch (error) {
            console.error(error);
            alert('Не удалось удалить заявку');
        }
    };

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
                            Заявки на звонок
                        </h1>
                        <p style={{ margin: '8px 0 0', color: '#9ca3af', fontSize: 14, maxWidth: 680 }}>
                            Номера телефонов, оставленные на главной странице сайта в блоке «Перезвоните мне».
                        </p>
                    </div>
                    <div
                        style={{
                            padding: '10px 14px',
                            borderRadius: 14,
                            background: 'rgba(254,115,46,0.12)',
                            border: '1px solid rgba(254,115,46,0.35)',
                            color: '#fdba74',
                            fontSize: 14,
                            fontWeight: 600,
                        }}
                    >
                        Всего: {requests.length}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Поиск по телефону или ID"
                        style={{ ...inputStyle, flex: '1 1 240px', minWidth: 220 }}
                    />
                    <button
                        onClick={load}
                        style={{
                            padding: '12px 18px',
                            borderRadius: 12,
                            border: 'none',
                            background: '#FE732E',
                            color: '#fff',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        Обновить
                    </button>
                </div>

                {loading ? (
                    <p style={{ color: '#9ca3af' }}>Загрузка...</p>
                ) : filtered.length === 0 ? (
                    <p style={{ color: '#9ca3af' }}>Заявок пока нет.</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(55,65,81,0.8)' }}>
                                    {['ID', 'Телефон', 'Дата', 'Действия'].map((title) => (
                                        <th
                                            key={title}
                                            style={{
                                                textAlign: 'left',
                                                padding: '12px 10px',
                                                color: '#9ca3af',
                                                fontSize: 12,
                                                fontWeight: 600,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.04em',
                                            }}
                                        >
                                            {title}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((item) => (
                                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(31,41,55,0.8)' }}>
                                        <td style={{ padding: '14px 10px', color: '#e5e7eb' }}>#{item.id}</td>
                                        <td style={{ padding: '14px 10px', color: '#f9fafb', fontWeight: 600 }}>
                                            <a
                                                href={`tel:+${item.phone}`}
                                                style={{ color: '#f9fafb', textDecoration: 'none' }}
                                            >
                                                {item.phone_display || formatCallbackPhone(item.phone)}
                                            </a>
                                        </td>
                                        <td style={{ padding: '14px 10px', color: '#9ca3af', fontSize: 14 }}>
                                            {formatCallbackDate(item.created_at)}
                                        </td>
                                        <td style={{ padding: '14px 10px' }}>
                                            <button
                                                onClick={() => handleDelete(item)}
                                                style={{
                                                    padding: '8px 12px',
                                                    borderRadius: 10,
                                                    border: '1px solid rgba(239,68,68,0.4)',
                                                    background: 'rgba(239,68,68,0.1)',
                                                    color: '#fca5a5',
                                                    cursor: 'pointer',
                                                    fontSize: 13,
                                                }}
                                            >
                                                Удалить
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </PageShell>
    );
}
