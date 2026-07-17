'use client';

import { useEffect, useMemo, useState } from 'react';
import { deleteCallbackRequest, formatCallbackDate, formatCallbackPhone, getCallbackRequests, type CallbackRequest } from '@/lib/callback-requests-api';
import { inputStyle, sectionBox, sectionDesc, sectionTitle } from './styles';

export default function CallbackRequestsSection() {
    const [requests, setRequests] = useState<CallbackRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const load = () => {
        setLoading(true);
        getCallbackRequests().then(setRequests).catch(() => alert('Не удалось загрузить заявки')).finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return requests;
        return requests.filter((item) => {
            const phone = item.phone_display || formatCallbackPhone(item.phone);
            return phone.toLowerCase().includes(q) || String(item.id).includes(q);
        });
    }, [requests, search]);

    return (
        <section id="callbacks" style={sectionBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                <div>
                    <h3 style={sectionTitle}>Заявки на звонок</h3>
                    <p style={{ ...sectionDesc, marginBottom: 0 }}>Номера из блока «Перезвоните мне». Всего: {requests.length}</p>
                </div>
                <button onClick={load} style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #555', background: 'transparent', color: '#fff', cursor: 'pointer' }}>Обновить</button>
            </div>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по телефону" style={{ ...inputStyle, marginBottom: 14 }} />
            {loading ? <p style={{ color: '#9ca3af' }}>Загрузка...</p> : filtered.length === 0 ? <p style={{ color: '#9ca3af' }}>Заявок нет.</p> : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(55,65,81,0.8)' }}>
                                {['ID', 'Телефон', 'Дата', ''].map((title) => (
                                    <th key={title} style={{ textAlign: 'left', padding: '10px 8px', color: '#9ca3af', fontSize: 12 }}>{title}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((item) => (
                                <tr key={item.id} style={{ borderBottom: '1px solid rgba(31,41,55,0.8)' }}>
                                    <td style={{ padding: '12px 8px', color: '#e5e7eb' }}>#{item.id}</td>
                                    <td style={{ padding: '12px 8px', color: '#f9fafb', fontWeight: 600 }}>
                                        <a href={`tel:+${item.phone}`} style={{ color: '#f9fafb', textDecoration: 'none' }}>{item.phone_display || formatCallbackPhone(item.phone)}</a>
                                    </td>
                                    <td style={{ padding: '12px 8px', color: '#9ca3af', fontSize: 14 }}>{formatCallbackDate(item.created_at)}</td>
                                    <td style={{ padding: '12px 8px' }}>
                                        <button onClick={async () => { if (!confirm('Удалить?')) return; await deleteCallbackRequest(item.id); setRequests((prev) => prev.filter((row) => row.id !== item.id)); }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.1)', color: '#fca5a5' }}>Удалить</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
